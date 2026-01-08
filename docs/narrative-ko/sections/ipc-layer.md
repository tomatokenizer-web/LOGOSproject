# IPC 레이어 (IPC Layer)

> LOGOS 프로젝트의 프로세스 간 통신 계층 문서

---

## index.ts - IPC 핸들러 레지스트리 및 오케스트레이션

### 존재 이유

Electron 앱은 메인 프로세스(Node.js, 시스템 전체 접근)와 렌더러 프로세스(브라우저 환경, 샌드박스)로 분리된다. IPC(Inter-Process Communication)가 이 간극을 연결한다. 이 인덱스 파일은 앱 시작 시 모든 IPC 핸들러 등록의 단일 진실 공급원(Single Source of Truth)이다.

### 핵심 개념

- **핸들러 등록(Handler Registration)**: 각 도메인 모듈(goal, learning, session, claude, agent, sync, onboarding)이 `register*Handlers()` 함수를 내보내고, 인덱스가 순차 호출한다.
- **핸들러 해제(Handler Unregistration)**: 테스트나 핫 리로딩 시 정리를 위한 역연산
- **콘솔 로깅**: `[IPC]` 접두어 로그로 디버깅 및 성능 분석 지원
- **재내보내기(Re-exports)**: 개별 핸들러와 contracts 모듈을 재내보내기하여 선택적 임포트 가능

### 설계 결정

- **명시적 등록 순서**: goal, learning, session, claude, agent, sync, onboarding 순서로 등록
- **동기식 등록**: 모든 등록이 동기식으로 진행되어 예측 가능성 보장
- **묵시적 실패**: 개별 등록에 try-catch 없음 - 빠른 실패(fail-fast) 전략
- **무조건 로딩**: 모든 핸들러가 항상 로드됨, 피처 플래그 없음

### 생명주기(Lifecycle)

```
App Start
    |
    v
registerAllHandlers()
    |
    +-> registerGoalHandlers()
    +-> registerLearningHandlers()
    +-> registerSessionHandlers()
    +-> registerClaudeHandlers()
    +-> registerAgentHandlers()
    +-> registerSyncHandlers()
    +-> registerOnboardingHandlers()
    |
    v
App Running (handlers active)
    |
    v
unregisterAllHandlers()
```

### IPC 모듈 요약

| 모듈 | 도메인 | 핵심 책임 |
|------|--------|-----------|
| goal | 학습 목표 | CRUD, 코퍼스 소스, 어휘 채우기 |
| learning | 언어 객체 | 객체 CRUD, 큐 구성, 태스크 생성 |
| session | 학습 세션 | 세션 생명주기, 응답 추적, 분석 |
| claude | AI 통합 | 콘텐츠 생성, 오류 분석, 힌트 |
| agent | 개발 에이전트 | 트리거 감지, 병목 관리 |
| sync | 데이터 동기화 | 클라우드/로컬 동기화 |
| onboarding | 신규 사용자 | 초기 설정 흐름 |

---

## contracts.ts - IPC 계약 모듈

### 컨텍스트 및 목적

Electron 메인 프로세스와 렌더러 프로세스 간의 **통신 계약(Communication Contract)**을 정의한다. UI는 데이터베이스나 파일 시스템에 직접 접근할 수 없으므로 메인 프로세스에 요청해야 한다.

### 데이터 흐름

```
Renderer Process                    Main Process
================                    ============

React Component
      |
      | window.logos.goal.create(data)
      v
[preload.ts contextBridge]
      |
      | ipcRenderer.invoke('goal:create', data)
      v
===== IPC Channel =====
      |
      v
[ipcMain.handle('goal:create', handler)]
      |
      v
Handler function
      |
      v
success(data) or error(message)
      |
      v
IPCResponse<T> back to renderer
```

### 채널 명명 규칙

모든 채널은 `domain:action` 패턴을 따른다:

| 도메인 | 목적 | 예시 |
|--------|------|------|
| `goal:` | 학습 목표 관리 | `goal:create`, `goal:list` |
| `session:` | 학습 세션 제어 | `session:start`, `session:end` |
| `queue:` | 학습 큐 연산 | `queue:get`, `queue:refresh` |
| `object:` | 언어 객체 CRUD | `object:get`, `object:search` |
| `claude:` | AI 콘텐츠 생성 | `claude:generate-task` |
| `sync:` | 오프라인/온라인 동기화 | `sync:status`, `sync:force` |
| `agent:` | 에이전트 조정 | `agent:detect-triggers` |
| `onboarding:` | 신규 사용자 설정 | `onboarding:check-status` |

### 표준 응답 구조

```typescript
interface IPCResponse<T> {
  success: boolean;     // 연산 성공 여부
  data?: T;             // 결과 데이터 (성공 시)
  error?: string;       // 오류 메시지 (실패 시)
}
```

### 헬퍼 함수

- `success<T>(data: T)`: 성공 응답 생성
- `error<T>(message: string)`: 오류 응답 생성
- `registerHandler<K>()`: 타입 안전 핸들러 등록
- `registerDynamicHandler()`: 동적 핸들러 등록

### 검증 유틸리티

- `validateRequired(request, fields)`: 필수 필드 존재 확인
- `validateNonEmpty(value, fieldName)`: 빈 문자열이 아닌지 확인
- `validateRange(value, fieldName, min, max)`: 숫자 범위 확인
- `validateUUID(value, fieldName)`: UUID 형식 확인

---

## agent.ipc.ts - 에이전트 조정 및 병목 관리

### 존재 이유

LOGOS는 다중 에이전트 개발 아키텍처를 사용하며, 전문 에이전트들이 코드베이스의 다른 측면을 담당한다. 이 모듈은 렌더러가 에이전트 트리거 서비스와 상호작용하여 동적 에이전트 조정, 병목 감지, 메타 에이전트 빌더 패턴을 통한 새 에이전트 생성을 가능하게 한다.

### 핵심 개념

- **TriggerContext**: 수행 중인 연산, 파일 위치, 관련 아키텍처 레이어, 보안 민감성 플래그 등을 캡슐화
- **DevelopmentBottleneck**: 개발 차단 요소의 구조화된 표현 (타입, 위치, 차단 원인, 제안된 수정)
- **Meta-Agent-Builder Pattern**: 동일 병목 타입이 반복되면 새 에이전트 사양 생성 - 자가 진화 아키텍처
- **Trigger History**: 에이전트 트리거 기록, 워크플로우 패턴 분석용

### 설계 결정

- **병목 기반 에이전트 생성**: 사전 정의 대신 반복 실패로부터 학습하여 전문가 제안
- **심각도 레벨(Severity Levels)**: `low`, `medium`, `high`, `critical`로 우선순위 지정

### 핸들러 채널

| 채널 | 목적 |
|------|------|
| `agent:detectTriggers` | 컨텍스트 기반 활성화할 에이전트 반환 |
| `agent:registerBottleneck` | 개발 차단 요소 기록 |
| `agent:getBottlenecks` | 미해결 병목 목록 조회 |
| `agent:resolveBottleneck` | 병목 해결 표시 |
| `agent:generateSpec` | 병목에서 에이전트 사양 생성 |

---

## claude.ipc.ts - Claude AI 콘텐츠 생성 및 오류 분석

### 존재 이유

LOGOS는 적응형 언어 학습 플랫폼이며, Claude AI가 지능형 콘텐츠 엔진 역할을 한다. 학습자 수준에 맞는 연습/설명/예제 생성, 오류 분석을 통한 언어 요소별 약점 식별, 단계적 힌트 제공을 담당한다.

### 핵심 개념

- **ContentRequest**: 콘텐츠 타입(`exercise`, `explanation`, `example`), 대상 콘텐츠, 언어 쌍, 난이도 지정
- **ErrorAnalysisRequest**: 학습자 응답 vs 정답을 캡처하여 언어 요소별 오류 분류 (PHON, MORPH, LEX, SYNT, PRAG)
- **HintRequest**: 3단계 힌트 시스템 (레벨 1: 최소 안내, 레벨 2: 구조 제공, 레벨 3: 답 공개)
- **ComponentErrorStats**: 언어 요소별 오류 패턴 집계

### 설계 결정

- **요소 기반 오류 분류**: 단순 정답/오답이 아닌 언어 요소별 분류 - 2차 언어 습득 연구(Nation, 2001) 기반
- **추천 등급화**: 오류율 <20%(낮음), 20-50%(중간), >50%(높음)에 따른 차등 추천
- **신뢰도 스케일링**: 데이터 포인트 증가에 따라 병목 신뢰도 증가 (`0.5 + totalErrors * 0.01`, 최대 0.95)

### 핸들러 채널

| 채널 | 목적 |
|------|------|
| `claude:generateContent` | 학습 객체용 연습/설명/예제 생성 |
| `claude:analyzeError` | 오류 분류 및 분석 저장 |
| `claude:getBottlenecks` | 오류율 기준 언어 요소 순위 반환 |
| `claude:getHint` | 수준별 힌트 제공 |

---

## goal.ipc.ts - 학습 목표 관리 및 코퍼스 소스 통합

### 존재 이유

목표(Goal)는 LOGOS의 조직 원리다. 목표는 학습자가 달성하고자 하는 것을 정의한다: 의료 문헌 읽기, 비즈니스 이메일 작성 등. 이 모듈은 목표의 전체 생명주기(CRUD)와 코퍼스 소스 시스템과의 통합을 통한 어휘 채우기를 담당한다.

### 핵심 개념

- **GoalSpec**: 도메인(medical, legal, business 등), 모달리티(reading, listening 등), 장르, 목적을 결합한 핵심 엔티티
- **Domain / Modality Type Guards**: IPC 경계를 넘어서도 유효한 값만 DB에 도달하도록 런타임 검증
- **Corpus Sources**: 어휘 출처(Wikipedia, 학술 코퍼스, 사용자 업로드)
- **Vocabulary Population Pipeline**: 코퍼스에서 어휘 추출, 빈도/연어 계산, LanguageObject로 DB 삽입

### 설계 결정

- **다중 모달리티 배열**: 모달리티는 JSON 배열로 저장 - 목표가 여러 모달리티 대상 가능
- **기본 사용자 생성**: 인증 구현 전까지 사용자 없으면 기본 생성 - 단일 사용자 모드
- **사용자 업로드 처리**: 사용자가 직접 문서 업로드 가능, 어휘 추출하여 LanguageObject로 삽입

### 핸들러 채널

| 채널 | 목적 |
|------|------|
| `goal:create` | 학습 목표 생성 |
| `goal:get`, `goal:list` | 목표 조회 |
| `goal:update`, `goal:delete` | 목표 수정/삭제 |
| `goal:list-sources` | 코퍼스 소스 목록 |
| `goal:get-recommended-sources` | 목표 적합도 기준 소스 순위 |
| `goal:populate-vocabulary` | 소스에서 어휘 추출 트리거 |
| `goal:upload-corpus` | 사용자 업로드 문서 처리 |

---

## learning.ipc.ts - 학습 객체 관리 및 큐 구성

### 존재 이유

학습 객체(Learning Object)는 LOGOS에서 언어 습득의 원자 단위: 개별 단어, 구문, 문법 패턴, 연어. 이 모듈은 전체 생명주기와 우선순위 기반 학습 큐로의 변환을 담당한다. 적응형 학습 알고리즘이 여기서 구현된다.

### 핵심 개념

- **LanguageObject**: 콘텐츠, 타입(LEX, SYNT, MORPH 등), 빈도, 관계 밀도, 맥락 기여도 포함
- **MasteryState**: 객체별 학습 진행 추적 - 단계(0-4), FSRS 파라미터, 정확도, 다음 복습일
- **Learning Queue / QueueItem**: 우선순위 기반 학습 목록, 긴급도와 최종 점수 포함
- **z(w) Vector Task Matching**: Nation(2001), Lu(2010) 기반 어휘 깊이와 통사 복잡성 연구 참조

### 설계 결정

- **임시 큐(Ephemeral Queue)**: 큐는 DB 상태에서 주문형 계산, 저장 안 함 - 즉각적 마스터리 업데이트 반영
- **세션 크기와 신규 비율**: 기본 20개 항목, 30% 신규 - 인터리빙 학습으로 기억 향상
- **태스크 생성 통합**: 큐가 객체만 반환하지 않고 태스크(프롬프트, 옵션, 힌트, 정답)까지 생성

### 핸들러 채널

| 채널 | 목적 |
|------|------|
| `object:create`, `object:get` | 객체 생성/조회 |
| `object:list`, `object:search` | 목록/검색 |
| `object:import` | 대량 생성 |
| `object:get-mastery` | 마스터리 상태 조회 |
| `queue:get` | 태스크 포함 우선순위 큐 구성 |
| `queue:refresh` | 큐 우선순위 재계산 |

### 큐 구성 파이프라인

```
Objects from DB
       |
       v
buildLearningQueue(objects, userState, masteryMap, now)
       |
       v
getSessionItems(queue, sessionSize, newItemRatio)
       |
       v
For each item: getOrGenerateTaskWithMatching()
       |
       v
Return complete queue with tasks to renderer
```

---

## onboarding.ipc.ts - 온보딩 IPC 핸들러 모듈

### 컨텍스트 및 목적

LOGOS 사용자 온보딩 경험의 백엔드 컨트롤러. 신규 사용자가 언어 학습 목표와 설정을 구성하는 최초 설정 흐름을 처리한다.

### 데이터 흐름

```
Application Launch
        |
        v
Renderer calls 'onboarding:check-status'
        |
        v
[This Module] queries User table
        |
        +--- No user OR zero goals
        |           v
        |    Returns { needsOnboarding: true }
        |
        +--- User exists with goals
                    v
            Returns { needsOnboarding: false, userId }
```

### 핸들러 참조

| 채널 | 목적 | 입력 | 출력 |
|------|------|------|------|
| `onboarding:check-status` | 온보딩 필요 여부 판단 | 없음 | `OnboardingStatus` |
| `onboarding:complete` | 온보딩 완료, 목표 생성 | `OnboardingData` | 생성된 ID들 |
| `onboarding:skip` | 기본값으로 온보딩 건너뛰기 | 없음 | 최소 사용자 ID |
| `onboarding:get-user` | 재개/편집용 사용자 조회 | 없음 | 사용자 프로필 |

### OnboardingData 스키마

```typescript
{
  nativeLanguage: string;    // 필수: 'en-US' 등
  targetLanguage: string;    // 필수: 'ja-JP' 등
  domain: string;            // 필수: 'medical' 등
  modality: string[];        // 필수: ['reading', 'listening']
  purpose: string;           // 필수: 'certification' 등
  benchmark?: string;        // 선택: 'CELBAN' 등
  deadline?: string;         // 선택: ISO 날짜 문자열
  dailyTime: number;         // 일일 학습 시간(분)
}
```

### 헬퍼 함수

- `getDefaultGenre(domain, purpose)`: 도메인과 목적에 따른 적절한 장르/문체 도출
- `getInitialVocabSize(dailyTime, purpose)`: 사용자 투입 시간과 긴급도에 따른 초기 어휘 크기 계산

---

## session.ipc.ts - 세션 생명주기, 응답 처리 및 분석

### 존재 이유

세션은 실제 학습이 일어나는 곳이다. 학습 시작, 태스크 응답, 피드백 수신, 요약으로 마무리하는 연속적 학습 활동을 나타낸다. 각 학습자 응답을 FSRS(스케줄링), IRT(능력 추정), 병목 분석(약점 감지) 알고리즘으로 처리한다.

### 핵심 개념

- **Session Modes**: `learning`(신규+복습 혼합), `training`(집중 연습), `evaluation`(스케줄링 영향 없는 테스트)
- **FSRS (Free Spaced Repetition Scheduler)**: 복습 시점 결정 알고리즘. 응답마다 안정성, 난이도 파라미터 업데이트
- **IRT (Item Response Theory)**: 학습자 능력(theta)과 항목 난이도의 통계 모델. 10개 이상 응답 후 MLE로 재추정
- **Response Timing Analysis**: 빠른 정답은 자동화된 지식, 느린 응답은 노력적 인출, 너무 빠르면 추측 가능성
- **Stage Transitions**: 마스터리 단계 0(신규)~4(번아웃) 전환

### 설계 결정

- **타이밍 인식 평점**: 표준 FSRS에 응답 시간 반영 - 빠른 정답이 높은 평점
- **싱글톤 FSRS 인스턴스**: 일관된 상태 보장
- **이전 세션 자동 종료**: 새 세션 시작 시 기존 활성 세션 자동 종료
- **요소별 Theta 분리**: 언어 요소별 별도 theta 유지 (어휘 theta=1.5, 통사 theta=-0.5 등)

### 핸들러 채널

| 채널 | 목적 |
|------|------|
| `session:start` | 새 세션 시작, 첫 태스크 반환 |
| `session:end` | 세션 종료, 캘리브레이션, 통계 |
| `session:submit-response` | 학습자 응답 처리 (핵심 학습 루프) |
| `session:get-next-task` | 다음 학습 항목 |
| `analytics:get-progress` | 목표별 전체 진행 상황 |
| `analytics:get-bottlenecks` | 요소별 약점 분석 |

### 응답 처리 파이프라인

```
submit-response received
        |
        v
Analyze response timing -> classification
        |
        v
Calculate timing-aware FSRS rating
        |
        v
Create/update MasteryState with FSRS parameters
        |
        v
Determine stage transition (0->1->2->3->4)
        |
        v
Update user theta via IRT
        |
        v
Update priority for the learning object
        |
        v
Update ComponentErrorStats (if error)
        |
        v
Return mastery update, stage change, timing analysis
```

---

## sync.ipc.ts - 동기화 IPC 핸들러 모듈

### 컨텍스트 및 목적

UI와 오프라인 동기화 시스템 간의 통신 브리지. 인터넷 연결이 불안정하거나 없을 때 사용자에게 가시성과 제어를 제공한다.

### 오프라인 우선 아키텍처

언어 학습은 Claude AI와의 상호작용(연습 생성, 오류 분석, 힌트)이 필요하다. 오프라인 시 요청이 큐에 저장되어 나중에 처리된다.

### 데이터 흐름

```
User clicks "Check Status"
        |
        v
Renderer calls 'sync:status'
        |
        v
[This Module] calls OfflineQueueService
        |
        v
Returns { online, pendingItems, processingItems, failedItems, lastSync }
```

```
User clicks "Sync Now"
        |
        v
Renderer calls 'sync:force'
        |
        +--- If offline: Returns error
        |
        +--- If online: Calls queueService.processQueue()
                |
                v
        Returns { processed, remaining, failed }
```

### 핸들러 참조

| 채널 | 목적 | 입력 | 출력 |
|------|------|------|------|
| `sync:status` | 현재 동기화 상태 | 없음 | `{ online, pendingItems, ... }` |
| `sync:force` | 즉시 동기화 트리거 | 없음 | `{ processed, remaining, failed }` |
| `offline:queue-size` | 대기 중 개수만 | 없음 | `{ count }` |
| `sync:queue-stats` | 상세 통계 | 없음 | `OfflineQueueStats` |
| `sync:clear-completed` | 완료 항목 제거 | `{ olderThanHours? }` | `{ cleared }` |
| `sync:retry-failed` | 실패 항목 재시도 | 없음 | `{ retried }` |
| `sync:set-online` | 수동 온/오프라인 전환 | `{ online: boolean }` | `{ online }` |
| `sync:check-connectivity` | Claude API 핑 | 없음 | `{ online }` |

### 시스템 영향

- **우아한 성능 저하(Graceful Degradation)**: 오프라인에서도 학습 계속, 상호작용 큐에 저장
- **사용자 투명성**: 실패 대신 대기/실패 항목 표시
- **개발자 테스트**: `sync:set-online`으로 네트워크 조작 없이 오프라인 시뮬레이션

---

## 아키텍처 레이어 개요

```
+-------------------------------------------+
|  Layer 1: Renderer (React UI Components)  |
|  - UI 컴포넌트, 사용자 인터페이스         |
+-------------------------------------------+
                    |
                    | IPC Invoke/Handle
                    v
+-------------------------------------------+
|  Layer 2: IPC Bridge                      |  <-- 이 문서의 범위
|  - contracts.ts (통신 규약)               |
|  - *.ipc.ts (도메인별 핸들러)             |
+-------------------------------------------+
                    |
                    | Database & Service Calls
                    v
+-------------------------------------------+
|  Layer 3: Business Logic & Data           |
|  - Prisma ORM                             |
|  - Services (Claude, Corpus, etc.)        |
+-------------------------------------------+
```
