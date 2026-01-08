# IPC 통신 레이어 (Inter-Process Communication)

> **최종 업데이트**: 2026-01-07
> **코드 위치**: `src/main/ipc/`
> **상태**: Active

---

## 개요

Electron 애플리케이션의 핵심인 **프로세스 간 통신(IPC)** 레이어를 설명한다. LOGOS에서 메인 프로세스(Node.js, 시스템 접근 권한)와 렌더러 프로세스(브라우저 샌드박스) 사이의 모든 데이터 교환이 이 레이어를 통해 이루어진다.

### IPC의 역할

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

---

## 컨텍스트 및 목적

### 왜 IPC가 필요한가?

Electron 앱은 **보안을 위해** 두 개의 분리된 프로세스로 동작한다:

1. **메인 프로세스**: Node.js 환경, 파일 시스템과 데이터베이스에 직접 접근 가능
2. **렌더러 프로세스**: 브라우저 환경, 샌드박스 내에서 실행되어 직접 시스템 접근 불가

UI(렌더러)가 데이터를 저장하거나 불러오려면 반드시 메인 프로세스에 **요청**해야 한다. IPC가 이 "요청-응답" 통신을 담당한다.

### 비유로 이해하기

> **비유**: IPC는 은행의 **창구 시스템**과 같다.
> - 고객(렌더러)은 금고(데이터베이스)에 직접 접근할 수 없다
> - 창구 직원(IPC 핸들러)에게 요청을 전달한다
> - 직원이 검증 후 처리하여 결과를 반환한다

---

## 핵심 모듈 요약

| 모듈 | 파일 | 도메인 | 핵심 책임 |
|------|------|--------|-----------|
| [세션](#세션-session) | `session.ipc.ts` | 학습 세션 | 세션 생명주기, 응답 추적, FSRS/IRT 분석 |
| [학습](#학습-learning) | `learning.ipc.ts` | 언어 객체 | 객체 CRUD, 큐 구성, 태스크 생성 |
| [에이전트](#에이전트-agent) | `agent.ipc.ts` | 개발 에이전트 | 트리거 감지, 병목 관리 |
| [Claude](#claude-ai-통합) | `claude.ipc.ts` | AI 통합 | 콘텐츠 생성, 오류 분석, 힌트 |
| [목표](#목표-goal) | `goal.ipc.ts` | 학습 목표 | CRUD, 코퍼스 소스, 어휘 채우기 |
| [온보딩](#온보딩-onboarding) | `onboarding.ipc.ts` | 신규 사용자 | 초기 설정 흐름 |
| [동기화](#동기화-sync) | `sync.ipc.ts` | 데이터 동기화 | 클라우드/로컬 동기화 |

---

## Electron 메인-렌더러 통신 패턴

### 기본 데이터 흐름

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

### 헬퍼 함수 (contracts.ts)

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

## 핸들러 등록 생명주기

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

### 설계 원칙

- **명시적 등록 순서**: goal, learning, session, claude, agent, sync, onboarding 순서로 등록
- **동기식 등록**: 모든 등록이 동기식으로 진행되어 예측 가능성 보장
- **묵시적 실패(Fail-Fast)**: 개별 등록에 try-catch 없음 - 문제 발생 시 즉시 중단
- **무조건 로딩**: 모든 핸들러가 항상 로드됨, 피처 플래그 없음

---

## 세션 (Session)

### 존재 이유

세션은 **실제 학습이 일어나는 곳**이다. 학습 시작부터 태스크 응답, 피드백 수신, 요약 마무리까지의 연속적 학습 활동을 캡슐화한다.

### 핵심 개념

| 개념 | 기술적 정의 | 쉬운 설명 |
|------|-------------|-----------|
| **Session Modes** | `learning`, `training`, `evaluation` | 학습 모드: 혼합 학습, 집중 연습, 평가 테스트 |
| **FSRS** | Free Spaced Repetition Scheduler | 언제 복습할지 결정하는 알고리즘 - 너무 빨리도, 너무 늦지도 않게 |
| **IRT** | Item Response Theory | 학습자 능력과 문제 난이도를 수치화하는 통계 모델 |
| **Response Timing** | 응답 시간 분석 | 빠른 정답 = 자동화된 지식, 느린 응답 = 노력적 인출 |
| **Stage Transitions** | 마스터리 단계 0-4 전환 | 신규(0) -> 학습중(1) -> 복습(2) -> 유지(3) -> 번아웃(4) |

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

### 설계 결정

- **타이밍 인식 평점**: 표준 FSRS에 응답 시간 반영 - 빠른 정답이 높은 평점
- **싱글톤 FSRS 인스턴스**: 일관된 상태 보장
- **이전 세션 자동 종료**: 새 세션 시작 시 기존 활성 세션 자동 종료
- **요소별 Theta 분리**: 언어 요소별 별도 theta 유지 (어휘 theta=1.5, 통사 theta=-0.5 등)

---

## 학습 (Learning)

### 존재 이유

**학습 객체(Learning Object)**는 LOGOS에서 언어 습득의 **원자 단위**다: 개별 단어, 구문, 문법 패턴, 연어. 이 모듈은 전체 생명주기와 우선순위 기반 학습 큐 변환을 담당한다.

### 핵심 개념

| 개념 | 기술적 정의 | 쉬운 설명 |
|------|-------------|-----------|
| **LanguageObject** | 콘텐츠, 타입, 빈도, 관계 밀도 포함 엔티티 | 학습할 언어 항목 하나 (단어, 문법 등) |
| **MasteryState** | 단계(0-4), FSRS 파라미터, 정확도, 다음 복습일 | 이 항목을 얼마나 잘 알고 있는지 추적 |
| **Learning Queue** | 우선순위 기반 학습 목록 | 오늘 공부할 항목 순위 목록 |
| **z(w) Vector** | Nation(2001), Lu(2010) 기반 태스크 매칭 | 학습자 수준에 맞는 태스크 선택 |

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

### 설계 결정

- **임시 큐(Ephemeral Queue)**: 큐는 DB 상태에서 주문형 계산, 저장 안 함 - 즉각적 마스터리 업데이트 반영
- **세션 크기와 신규 비율**: 기본 20개 항목, 30% 신규 - 인터리빙 학습으로 기억 향상
- **태스크 생성 통합**: 큐가 객체만 반환하지 않고 태스크(프롬프트, 옵션, 힌트, 정답)까지 생성

---

## 에이전트 (Agent)

### 존재 이유

LOGOS는 **다중 에이전트 개발 아키텍처**를 사용하며, 전문 에이전트들이 코드베이스의 다른 측면을 담당한다. 이 모듈은 에이전트 트리거 서비스와의 상호작용을 통해 동적 에이전트 조정, 병목 감지, 새 에이전트 생성을 가능하게 한다.

### 핵심 개념

| 개념 | 기술적 정의 | 쉬운 설명 |
|------|-------------|-----------|
| **TriggerContext** | 연산, 파일 위치, 아키텍처 레이어, 보안 플래그 | 어떤 에이전트를 부를지 결정하는 맥락 정보 |
| **DevelopmentBottleneck** | 타입, 위치, 차단 원인, 제안된 수정 | 개발 중 막히는 부분의 구조화된 표현 |
| **Meta-Agent-Builder** | 반복 병목에서 새 에이전트 사양 생성 | 같은 문제가 반복되면 전문가 에이전트 추천 |
| **Severity Levels** | `low`, `medium`, `high`, `critical` | 병목의 심각도 등급 |

### 핸들러 채널

| 채널 | 목적 |
|------|------|
| `agent:detectTriggers` | 컨텍스트 기반 활성화할 에이전트 반환 |
| `agent:registerBottleneck` | 개발 차단 요소 기록 |
| `agent:getBottlenecks` | 미해결 병목 목록 조회 |
| `agent:resolveBottleneck` | 병목 해결 표시 |
| `agent:generateSpec` | 병목에서 에이전트 사양 생성 |

### 설계 결정

- **병목 기반 에이전트 생성**: 사전 정의 대신 반복 실패로부터 학습하여 전문가 제안
- **자가 진화 아키텍처**: 동일 병목 타입이 반복되면 새 에이전트 사양 자동 생성

---

## Claude AI 통합

### 존재 이유

LOGOS의 **지능형 콘텐츠 엔진**. 학습자 수준에 맞는 연습/설명/예제 생성, 오류 분석을 통한 언어 요소별 약점 식별, 단계적 힌트 제공을 담당한다.

### 핵심 개념

| 개념 | 기술적 정의 | 쉬운 설명 |
|------|-------------|-----------|
| **ContentRequest** | 타입, 대상 콘텐츠, 언어 쌍, 난이도 | 어떤 학습 콘텐츠를 만들지 요청 |
| **ErrorAnalysisRequest** | 학습자 응답 vs 정답 비교 | 어디서 틀렸는지 분석 요청 |
| **HintRequest** | 3단계 힌트 시스템 | 레벨 1: 최소 안내 -> 레벨 3: 답 공개 |
| **ComponentErrorStats** | 언어 요소별 오류 패턴 집계 | PHON, MORPH, LEX, SYNT, PRAG별 약점 |

### 핸들러 채널

| 채널 | 목적 |
|------|------|
| `claude:generateContent` | 학습 객체용 연습/설명/예제 생성 |
| `claude:analyzeError` | 오류 분류 및 분석 저장 |
| `claude:getBottlenecks` | 오류율 기준 언어 요소 순위 반환 |
| `claude:getHint` | 수준별 힌트 제공 |

### 설계 결정

- **요소 기반 오류 분류**: 단순 정답/오답이 아닌 언어 요소별 분류 - 2차 언어 습득 연구(Nation, 2001) 기반
- **추천 등급화**: 오류율 <20%(낮음), 20-50%(중간), >50%(높음)에 따른 차등 추천
- **신뢰도 스케일링**: 데이터 포인트 증가에 따라 병목 신뢰도 증가 (`0.5 + totalErrors * 0.01`, 최대 0.95)

---

## 목표 (Goal)

### 존재 이유

**목표(Goal)**는 LOGOS의 **조직 원리**다. 학습자가 달성하고자 하는 것을 정의한다: 의료 문헌 읽기, 비즈니스 이메일 작성 등. 목표의 전체 생명주기(CRUD)와 코퍼스 소스 시스템과의 통합을 담당한다.

### 핵심 개념

| 개념 | 기술적 정의 | 쉬운 설명 |
|------|-------------|-----------|
| **GoalSpec** | 도메인, 모달리티, 장르, 목적 결합 | "의료 분야 읽기 목표" 같은 학습 목표 정의 |
| **Domain / Modality Guards** | 런타임 검증 | IPC 경계에서 유효한 값만 통과 |
| **Corpus Sources** | Wikipedia, 학술 코퍼스, 사용자 업로드 | 어휘를 추출할 텍스트 출처 |
| **Vocabulary Population** | 코퍼스 -> 어휘 추출 -> DB 삽입 | 목표에 맞는 단어 목록 자동 생성 |

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

### 설계 결정

- **다중 모달리티 배열**: 모달리티는 JSON 배열로 저장 - 목표가 여러 모달리티 대상 가능
- **기본 사용자 생성**: 인증 구현 전까지 사용자 없으면 기본 생성 - 단일 사용자 모드
- **사용자 업로드 처리**: 사용자가 직접 문서 업로드 가능, 어휘 추출하여 LanguageObject로 삽입

---

## 온보딩 (Onboarding)

### 존재 이유

신규 사용자가 언어 학습 목표와 설정을 구성하는 **최초 설정 흐름**을 처리한다.

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

### 핸들러 채널

| 채널 | 목적 |
|------|------|
| `onboarding:check-status` | 온보딩 필요 여부 판단 |
| `onboarding:complete` | 온보딩 완료, 목표 생성 |
| `onboarding:skip` | 기본값으로 온보딩 건너뛰기 |
| `onboarding:get-user` | 재개/편집용 사용자 조회 |

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

## 동기화 (Sync)

### 존재 이유

UI와 **오프라인 동기화 시스템** 간의 통신 브리지. 인터넷 연결이 불안정하거나 없을 때 사용자에게 가시성과 제어를 제공한다.

### 오프라인 우선 아키텍처

> **왜 중요한가?** 언어 학습은 Claude AI와의 상호작용(연습 생성, 오류 분석, 힌트)이 필요하다. 오프라인 시 요청이 큐에 저장되어 나중에 처리된다.

### 데이터 흐름

**상태 확인:**
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

**강제 동기화:**
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

### 핸들러 채널

| 채널 | 목적 |
|------|------|
| `sync:status` | 현재 동기화 상태 |
| `sync:force` | 즉시 동기화 트리거 |
| `offline:queue-size` | 대기 중 개수만 |
| `sync:queue-stats` | 상세 통계 |
| `sync:clear-completed` | 완료 항목 제거 |
| `sync:retry-failed` | 실패 항목 재시도 |
| `sync:set-online` | 수동 온/오프라인 전환 |
| `sync:check-connectivity` | Claude API 핑 |

### 시스템 영향

- **우아한 성능 저하(Graceful Degradation)**: 오프라인에서도 학습 계속, 상호작용 큐에 저장
- **사용자 투명성**: 실패 대신 대기/실패 항목 표시
- **개발자 테스트**: `sync:set-online`으로 네트워크 조작 없이 오프라인 시뮬레이션

---

## 기술 용어 해설

| 용어 | 기술적 정의 | 쉬운 설명 |
|------|-------------|-----------|
| **IPC** | Inter-Process Communication | 두 프로세스 간 대화 방법 - 창구에서 요청하고 응답 받기 |
| **핸들러(Handler)** | 특정 채널의 요청을 처리하는 함수 | 창구 직원 - 특정 업무만 담당 |
| **채널(Channel)** | 요청 종류를 구분하는 문자열 식별자 | 창구 번호 - "목표 관련은 1번 창구로" |
| **Invoke/Handle** | 렌더러가 요청(invoke), 메인이 처리(handle) | 요청서 제출 / 처리 결과 반환 |
| **Preload Script** | 렌더러에 노출할 API를 정의하는 스크립트 | 창구에서 처리 가능한 업무 목록 안내판 |
| **Context Bridge** | 안전하게 메인 기능을 렌더러에 노출 | 보안 유리창 - 안전하게만 소통 |
| **FSRS** | Free Spaced Repetition Scheduler | 기억이 사라지기 직전에 복습 알림 |
| **IRT** | Item Response Theory | 학습자 실력과 문제 난이도 수치화 |
| **Theta** | IRT에서 학습자 능력 파라미터 | 학습자의 "실력 점수" |
| **Graceful Degradation** | 부분 실패 시에도 핵심 기능 유지 | 비가 와도 지붕 아래서 계속 영업 |

---

## 마이크로스케일: 직접 관계

### 이 레이어가 의존하는 것

| 파일/모듈 | 용도 |
|-----------|------|
| `src/main/db/prisma.ts` | 데이터베이스 접근 |
| `src/main/services/claude/*` | Claude AI 서비스 호출 |
| `src/main/services/corpus/*` | 코퍼스 처리 서비스 |
| `src/main/services/offline-queue.ts` | 오프라인 큐 관리 |
| `src/core/queue/*` | 학습 큐 알고리즘 |
| `src/core/fsrs/*` | 간격 반복 알고리즘 |
| `src/core/irt/*` | 능력 추정 알고리즘 |

### 이 레이어에 의존하는 것

| 파일/모듈 | 용도 |
|-----------|------|
| `src/renderer/**/*.tsx` | UI 컴포넌트의 모든 데이터 접근 |
| `src/main/preload.ts` | Context Bridge API 정의 |
| `src/main/main.ts` | 핸들러 등록 호출 |

---

## 매크로스케일: 시스템 통합

### 아키텍처 내 위치

IPC 레이어는 LOGOS의 **신경 시스템**이다:
- UI(두뇌)가 결정을 내리면
- IPC(신경)가 신호를 전달하여
- 서비스/DB(근육)가 실행한다

### 빅 픽처 영향

이 레이어 없이는 **어떤 UI 기능도 작동하지 않는다**:
- 목표 생성 불가
- 학습 세션 시작 불가
- AI 콘텐츠 생성 불가
- 진행 상황 저장 불가

### 크리티컬 패스 분석

**중요도**: Critical
- 단일 실패 지점(SPOF)에 해당
- 모든 핸들러는 독립적이지만, 등록 시스템 실패 시 전체 앱 중단
- 개별 핸들러 오류는 해당 기능만 영향

---

## 네비게이션

| 이전 | 현재 | 다음 |
|------|------|------|
| [서비스 레이어](../06-services/) | **IPC 통신 레이어** | [데이터베이스 레이어](../08-database/) |

---

## 변경 이력

### 2026-01-07 - 통합 문서 생성
- **변경 내용**: sections/ipc-layer.md 내용을 07-ipc/README.md로 통합
- **이유**: 네비게이션 구조 개선 및 중복 제거
- **영향**: 단일 진입점으로 IPC 레이어 전체 이해 가능
