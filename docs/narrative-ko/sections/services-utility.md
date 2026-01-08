# 유틸리티 서비스 (Utility Services)

> LOGOS 프로젝트의 핵심 유틸리티 서비스 문서
> 원본: `docs/narrative/src/main/services/`

---

## PMI 서비스 (Pointwise Mutual Information)

> **코드 위치**: `src/main/services/pmi.service.ts`
> **상태**: Active

### 맥락과 목적 (Context & Purpose)

이 서비스는 원시 통계 분석과 언어 학습 난이도 추정 사이의 간극을 연결한다. `core/pmi.ts`의 순수 PMI 계산기를 목표 특화 캐싱, 데이터베이스 영속화, LOGOS 적응형 학습 시스템 통합으로 감싸는 역할을 한다.

**비즈니스 필요성**: 학습자는 난이도별로 정렬된 콘텐츠가 필요하다. 예측 불가능한 맥락에 나타나는 단어(낮은 PMI)는 배우기 어렵고, 익숙한 파트너와 일관되게 나타나는 단어(높은 PMI)는 배우기 쉽다. 이 서비스는 그 난이도를 정량화하여 FRE(Frequency-Relational-contextual) 공식에 반영한다.

**사용 시점**:
- 새 학습 목표의 코퍼스(corpus) 초기 구축 시
- 학습 큐에서 언어 객체의 우선순위 점수 계산 시
- FRE 우선순위 공식의 "R"(관계적 밀도, Relational Density) 컴포넌트 필요 시
- 코퍼스 변경 후 IRT 난이도 파라미터 일괄 업데이트 시

### 데이터 흐름 (Data Flow)

```
Goal Corpus (Language Objects)
        |
        v
getCalculatorForGoal() -- 콘텐츠에서 토큰 배열 구성
        |
        v
PMICalculator.indexCorpus() -- 단어 빈도 + 공기 계산
        |
        v
Cache에 calculator 저장 (30분 TTL)
        |
        +---> getWordDifficulty() --> 단일 단어 난이도
        +---> getCollocations() --> PMI 점수 기반 상위 K 단어 쌍
        +---> getRelationalDensity() --> 정규화된 허브 점수 0-1
        +---> updateIRTDifficulties() --> DB 일괄 업데이트
        +---> storeCollocations() --> Collocation 테이블 영속화
```

### 아키텍처 계층 (Architectural Layer)

이 서비스는 LOGOS 3계층 아키텍처의 **애플리케이션 서비스 계층(Application Services Layer)**에 위치한다:

- **Layer 1**: Renderer (React UI) - 학습 태스크와 우선순위 큐 표시
- **Layer 2**: PMI Service - 언어적 난이도 메트릭 계산
- **Layer 3**: Database (Prisma/SQLite) - 언어 객체와 연어(collocation) 저장

핵심 역할:
1. **캐싱(Caching)**: 목표별 PMI 계산기를 인메모리 유지
2. **오케스트레이션(Orchestration)**: 순수 계산과 DB 업데이트 조율
3. **정규화(Normalization)**: 원시 PMI 값을 IRT 호환 난이도 파라미터로 변환

### 기술 개념 (Technical Concepts)

#### PMI (점별 상호정보량)

**기술적 정의**: 두 단어의 연관 강도를 측정. 관찰된 공기 확률과 독립 가정 하 기대 확률을 비교한다: `PMI(w1, w2) = log2[P(w1,w2) / (P(w1) * P(w2))]`

**쉬운 설명**: "take"를 들었을 때 다음 단어가 "medication"일 때와 "elephant"일 때의 놀람 정도를 정량화한다. 높은 PMI는 예측 가능한 쌍(낮은 놀람), 낮은 PMI는 예측 불가한 쌍(높은 놀람)을 의미한다.

#### 허브 점수 (Hub Score, Relational Density)

**기술적 정의**: 단어의 모든 유의미한 연어에 대한 양의 PMI 값 합계를 경험적 최댓값(50)으로 나눠 [0, 1]로 정규화한다.

**쉬운 설명**: 어떤 단어는 "사교적"이다 - "take"는 "medication," "break," "time," "care"와 강하게 연결된다. 허브 점수는 단어가 어휘 네트워크에서 얼마나 연결되어 있는지 측정한다. 연결이 많은 단어는 여러 방향에서 강화되므로 배우기 쉽다.

#### IRT 난이도 파라미터 (b)

**기술적 정의**: 문항반응이론(Item Response Theory)에서 학습자가 50% 확률로 정답을 맞출 능력 수준. 로짓 척도에서 -3(매우 쉬움) ~ +3(매우 어려움).

**쉬운 설명**: "sushi" 난이도가 -2면 초보자도 맞출 수 있다. "tsundoku"(책을 사고 안 읽는 것) 난이도가 +2면 고급 능력이 필요하다.

### 주요 함수 (Key Functions)

| 함수 | 설명 |
|------|------|
| `getWordDifficulty(goalId, word, taskType)` | IRT 난이도(-3 ~ +3), 빈도, PMI 기반 난이도 반환 |
| `getCollocations(goalId, word, topK)` | 상위 K개 연어와 PMI 점수 반환 |
| `getRelationalDensity(goalId, word)` | FRE 공식용 정규화된 허브 점수(0-1) 반환 |
| `updateIRTDifficulties(goalId)` | 목표 내 모든 언어 객체의 irtDifficulty 일괄 업데이트 |
| `storeCollocations(goalId, minSignificance)` | 유의미한 연어를 Collocation 테이블에 영속화 |
| `clearCalculatorCache(goalId)` | 코퍼스 변경 후 캐시 무효화 |

---

## 오프라인 큐 서비스 (Offline Queue Service)

> **코드 위치**: `src/main/services/offline-queue.service.ts`
> **상태**: Active
> **아키텍처 역할**: 복원력 및 신뢰성 계층 (Resilience & Reliability Layer)

### 맥락과 목적 (Context & Purpose)

이 서비스는 LOGOS의 **네트워크 복원력 백본**이다. 모든 클라우드 연결 데스크톱 앱이 해결해야 할 핵심 질문에 답한다: *"인터넷이 끊기면 어떻게 되고, 돌아왔을 때 어떻게 복구하는가?"*

**핵심 문제**: Claude API 작업은 네트워크 의존적이다. 이 서비스 없이는 네트워크 장애 시 요청 실패, 작업 손실, 사용자 불만이 발생한다. 오프라인 큐 서비스는 동기적 "지금 성공해야 함" 작업을 비동기적 "결국 성공할 것" 작업으로 전환한다.

**비즈니스 필요성**:
- 사용자는 원활한 오프라인-온라인 전환을 기대
- AI 생성 콘텐츠는 연결이 일시적으로 끊겨도 결국 도착해야 함
- 일시적 네트워크 문제로 사용자 액션이 손실되면 안 됨

### 데이터 흐름 (Data Flow)

```
사용자가 Claude 작업 요청 (예: 연습문제 생성)
        |
        v
앱이 온라인인가? ----YES----> ClaudeService로 직접 API 호출
        |                                     |
        NO                                    |
        |                                     v
        v                              즉시 결과 반환
enqueue() ----> SQLite에 영속화 (offlineQueueItem 테이블)
        |
        |  (이후, 온라인 시)
        v
processQueue() 트리거
        |
        v
대기 중인 항목 가져오기 (FIFO, 최대 3개 동시)
        |
        v
각 항목에 대해:
        +---> 'processing'으로 표시
        +---> processItem() ----> 적절한 핸들러로 라우팅
        |           +---> task_generation: Claude 호출 + 결과 캐싱
        |           +---> error_analysis: Claude.analyzeError()
        |           +---> content_generation: Claude.generateContent()
        +---> 성공? ----> 'completed' 표시, 결과 저장
        +---> 실패? -----> retryCount 증가
                    +---> retryCount < maxRetries? ----> 'pending' (재시도)
                    +---> retryCount >= maxRetries? ---> 'failed'
```

### 시스템 통합 (System Integration)

이 서비스는 Claude API 통합을 감싸는 **복원력 계층(Resilience Layer)**에 위치한다:

```
Renderer Process
      |
      v
Main Process IPC Handlers
      |
      v
+---------------------------------------------+
|     RESILIENCE LAYER (이 서비스)             |
|  - 오프라인 시 작업 큐잉                      |
|  - 온라인 시 큐 처리                          |
|  - 지수 백오프로 재시도                       |
+---------------------------------------------+
      |
      v (온라인 시)
Claude API Service
      |
      v
Anthropic Claude API (External)
```

**핵심 영향**:
1. **우아한 성능 저하(Graceful Degradation)**: 오프라인 시 작업이 실패 대신 큐잉됨
2. **결과적 일관성(Eventual Consistency)**: 모든 큐잉된 작업이 결국 완료됨
3. **자동 복구(Automatic Recovery)**: 사용자 개입 없이 온라인 상태 감지 후 백로그 처리
4. **실패 격리(Failure Isolation)**: 단일 API 호출 실패가 전파되지 않음

### 기술 개념 (Technical Concepts)

#### 큐 항목 유형 (Queue Item Types)

작업 카테고리 열거형: `task_generation`, `error_analysis`, `content_generation`, `vocabulary_extraction`. 각 유형은 `processItem()`의 다른 핸들러로 라우팅된다.

#### 큐 항목 상태 (Queue Item Status)

상태 머신: `pending`(처리 대기), `processing`(처리 중), `completed`(성공), `failed`(재시도 소진)

#### 싱글톤 패턴 (Singleton Pattern)

`getOfflineQueueService()`로 앱 전체에서 하나의 인스턴스만 존재. 큐 상태가 모든 호출자 간에 일관되게 유지된다.

#### 동시 처리 (Concurrent Processing, maxConcurrent)

`Promise.allSettled()`로 최대 3개 항목 동시 처리. 처리량과 효율성의 균형.

#### 주기적 처리 (Periodic Processing, checkInterval)

30초마다 `setInterval`이 `processQueue()`를 호출. 명시적 트리거 없이도 큐가 처리됨.

### 서비스 API 참조

| 함수 | 목적 |
|------|------|
| `enqueue(type, payload, maxRetries)` | 큐에 항목 추가 |
| `getStats()` | 큐 통계 (상태/유형별 개수) |
| `setOnline(online)` | 연결 상태 설정 |
| `processQueue()` | 수동 처리 트리거 |
| `retryFailed()` | 실패 항목을 pending으로 리셋 |
| `clearCompleted(olderThanMs)` | 오래된 완료 항목 제거 |

---

## 에이전트 트리거 서비스 (Agent Trigger Service)

> **코드 위치**: `src/main/services/agent-trigger.ts`
> **상태**: Active

### 맥락과 목적 (Context & Purpose)

이 모듈은 AI 지원 개발의 근본적인 조정 문제를 해결한다: **멀티 에이전트 시스템이 언제 어떤 전문가를 호출해야 하는지 어떻게 아는가?**

LOGOS 프로젝트에서는 여러 전문 AI 에이전트(frontend-specialist, database-specialist, security-specialist 등)가 협력한다. 에이전트 트리거 서비스는 작업 컨텍스트를 분석하여 어떤 에이전트를 호출해야 하는지 자동으로 결정한다.

**비즈니스 필요성**: 개발 속도는 적시에 적합한 전문가 참여에 달려있다. 보안에 민감한 변경이 security-specialist를 우회하거나, DB 스키마 변경이 database-specialist를 건너뛰면 기술 부채와 버그가 발생한다.

**사용 시점**:
- 코드 작성/수정 직전 (어떤 에이전트가 검토/기여해야 하는지)
- 개발 차단 발생 시 (어떤 전문가가 해결 가능한지)
- 기존 에이전트가 문제 해결 불가 시 (meta-agent-builder 트리거)

### 데이터 흐름 (Data Flow)

```
Development Context (파일, 계층, 작업)
    |
    v
detectTriggers() 컨텍스트 분석
    |
    +--> 계층 매칭 (ui -> frontend-specialist)
    +--> 파일 패턴 매칭 (*.tsx -> frontend-specialist)
    +--> 보안 플래그 확인 (securitySensitive -> security-specialist)
    +--> 외부 API 확인 (externalApi -> mcp-specialist)
    |
    v
중복 제거되고 우선순위가 지정된 AgentTrigger[] 반환
    |
    v
오케스트레이션 시스템이 권장 에이전트 호출
```

### 아키텍처 계층 (Architectural Layer)

이 서비스는 LOGOS 아키텍처의 **메타 조정 계층(Meta-Coordination Layer)**에 위치한다:

```
Layer 0: 명세 문서 (FINAL-SPEC.md, AGENT-MANIFEST.md)
    |
Layer 1: 이 모듈 - 에이전트 조정/라우팅 결정  <-- 현재 위치
    |
Layer 2: 개별 에이전트 (frontend-specialist, database-specialist 등)
    |
Layer 3: 애플리케이션 코드 (src/main, src/renderer, src/core)
    |
Layer 4: 런타임 (Electron main process, SQLite, Claude API)
```

이것은 에이전트 시스템의 **컨트롤 플레인(control plane)**이다. 직접 작업하지 않고 누가 작업해야 하는지 결정한다.

### 기술 개념 (Technical Concepts)

#### TriggerContext

**기술적 정의**: 작업 컨텍스트를 캡처하는 인터페이스 - 수행 작업, 관련 파일, 영향받는 아키텍처 계층, 특수 조건(보안 민감도, 외부 API 사용) 포함.

**쉬운 설명**: 현재 태스크의 "작업 설명서". "로그인 흐름 수정, auth/login.ts 관련, IPC 계층 영향, 보안 민감" 같은 정보.

#### DevelopmentBottleneck

**기술적 정의**: 개발 차단 요소 - 유형 분류, 위치, 차단 원인, 제안 해결책, 영향받는 에이전트, 심각도, 감지 시간.

**쉬운 설명**: 해결 불가 문제의 "사고 보고서". 어떤 유형의 문제인지, 어디서 발생했는지, 무엇이 진행을 막는지, 얼마나 심각한지 기술한다.

#### 계층-에이전트 매핑 (LAYER_AGENT_MAP)

아키텍처 계층(ui, ipc, db, core, service)을 해당 분야 전문 에이전트에 매핑하는 정적 조회 테이블.

#### 메타 에이전트 빌더 트리거 로직

`shouldTriggerMetaAgent()` 메서드가 새 전문 에이전트 생성 필요성을 판단한다:
1. 병목이 명시적으로 누락된 전문화를 표시할 때
2. 같은 병목 유형이 3회 이상 발생할 때
3. 병목 유형을 처리할 기존 에이전트가 없을 때

#### 우선순위 레벨

- `immediate`: 현재 작업 중단 (보안, 치명적 실패)
- `soon`: 다음 가용 슬롯에 큐잉 (문서화, 통합)
- `when_available`: 백로그에 추가 (최적화, 정리)

---

## 진단 평가 서비스 (Diagnostic Assessment Service)

> **코드 위치**: `src/main/services/diagnostic-assessment.service.ts`
> **상태**: Active

### 맥락과 목적 (Context & Purpose)

이 서비스는 온보딩 과정에서 신규 사용자의 **초기 능력 추정**을 처리한다. 핵심 질문에 답한다: "새 학습자는 어디서 시작해야 하는가?"

**비즈니스 필요성**: 사용자는 즉시 개인화되지 않는 앱을 이탈한다. 환자 커뮤니케이션을 위해 한국어를 배우는 의료 전문가와 여행 문구를 배우는 관광객이 같은 콘텐츠로 시작해서는 안 된다. 이 서비스는 "이 사용자에 대해 아무것도 모름"과 "개인화된 콘텐츠 제공 가능" 사이의 간극을 연결한다.

**사용 시점**:
- 온보딩 마법사 완료 시: 프로필 데이터로 초기 theta 추정
- 선택적 배치 테스트 시: 실제 응답 데이터로 추정치 정제
- 첫 몇 번의 학습 세션 후: 실제 성과 데이터 축적에 따라 theta 업데이트
- 새 학습 목표 추가 시: 다른 도메인에 맞게 시작점 재조정

### 데이터 흐름 (Data Flow)

```
Onboarding Wizard
       |
       | 사용자 프로필 데이터:
       | - purpose (자격증, 전문직 등)
       | - 일일 학습 시간
       | - 목표 도메인
       | - 선택한 모달리티
       | - 선택적: 자가 평가 레벨
       v
+--------------------------------+
| estimateInitialTheta()         |
|   +-- getPriorTheta()          |  목적 + 도메인 -> 기본 추정
|   +-- getTimeAdjustment()      |  일일 분 -> 동기 신호
|   +-- getSelfAssessmentAdj()   |  자가 평가 -> 조정
|   +-- getDefaultComponentThetas()  모달리티 -> 컴포넌트별
|   |                            |
|   v                            |
| [배치 테스트 수행 시]           |
|   +-- estimateThetaFromResponses()  MLE 추정
|       +-- mleEstimate()        |     컴포넌트별 Newton-Raphson
|       +-- calculateStandardError()  신뢰 구간
+--------------------------------+
       |
       v
ThetaEstimate 객체:
- thetaGlobal: -3 ~ +3
- thetaPhonology, thetaMorphology 등
- standardError: 신뢰도 측정치
- estimatedCEFR: A1-C2 매핑
- recommendedDifficulty: 0.1-0.9
       |
       v
DB의 User 레코드 업데이트
       |
       v
첫 세션에서 이 추정치로 초기 항목 선택
```

### 시스템 통합 (System Integration)

이 서비스는 **개인화의 시작점**으로, 다음에 영향을 미친다:

| 하위 시스템 | 영향 |
|-------------|------|
| Task Generation | 첫 항목의 초기 난이도 범위 |
| Item Selection | "너무 쉬움" 또는 "너무 어려움" 항목 판단 |
| FSRS Scheduling | 간격 반복의 초기 안정성 추정 |
| Progress Display | 개선 측정의 기준선 |
| Content Selection | 우선 처리할 코퍼스 소스 |

### 알고리즘 설명 (Algorithm Explanations)

#### 사전 추정 (Prior Estimation) - 베이지안 접근

테스트 응답 전 프로필 데이터 기반 **베이지안 사전 확률(Bayesian prior)** 사용.

```
목적 기반 기본 사전:
  certification: +0.5   (시험 목표, 기반 있음)
  professional:  +0.3   (업무 맥락)
  academic:      +0.4   (정규 학습)
  immigration:   +0.2   (다양함, 보수적)
  personal:       0.0   (취미)

도메인 조정:
  medical/legal: +0.3   (전문 분야)
  business/tech: +0.2
  general:        0.0
  travel:        -0.2   (기본 필요)

시간 투자 조정:
  60+ 분:   +0.2   (진지한 투자)
  30-59 분: +0.1
  15-29 분:  0.0
  < 15 분:  -0.1   (가벼운 학습)

자가 평가 조정:
  advanced:      +0.5
  intermediate:   0.0
  beginner:      -0.5
```

#### 최대우도추정 (MLE) - 배치 테스트

사용자가 배치 테스트 항목을 완료하면 MLE로 추정치를 정제한다.

**원리**: 관찰된 응답 패턴을 가장 가능하게 만드는 theta를 찾는다.

**절차**:
1. theta = 0에서 시작
2. 현재 theta 하에서 각 응답의 확률 계산
3. 기울기(로그우도 1차 미분) 계산
4. 곡률(2차 미분 / 피셔 정보량) 계산
5. Newton-Raphson 업데이트: theta = theta + gradient / |curvature|
6. 수렴(delta < 0.001) 또는 최대 반복까지 반복

**2PL 확률 함수**:
```
P(correct) = 1 / (1 + exp(-a * (theta - b)))

여기서:
  a = 변별도 (단순화를 위해 1.0 고정, Rasch 모델)
  b = 항목 난이도
  theta = 학습자 능력
```

#### 표준오차 (Standard Error)

theta 추정의 신뢰도를 정량화한다.

```
SE = 1 / sqrt(피셔 정보량)
피셔 정보량 = sum of (a^2 * P * (1-P)) for all items
```

**실용적 해석**:
- SE < 0.3: 높은 신뢰도
- SE = 0.5: 중간 신뢰도 (짧은 배치 테스트 전형)
- SE > 1.0: 낮은 신뢰도

#### CEFR 레벨 매핑

theta를 친숙한 능숙도 척도(A1-C2)로 변환한다.

```
theta < -1.5  -> A1 (입문)
-1.5 ~ -0.5   -> A2 (초급)
-0.5 ~ +0.5   -> B1 (중급)
+0.5 ~ +1.5   -> B2 (중상급)
+1.5 ~ +2.5   -> C1 (고급)
theta > +2.5  -> C2 (숙달)
```

### 기술 개념 (Technical Concepts)

#### Theta

**기술적 정의**: IRT의 잠재 능력 파라미터. 일반적으로 모집단에서 평균 0, 표준편차 1로 스케일링.

**쉬운 설명**: 학습자의 숙련도를 나타내는 숫자. 0은 평균, 양수는 평균 이상, 음수는 평균 이하. theta +2.0은 상위 약 2%를 의미한다.

#### 사전 vs 사후 (Prior vs Posterior)

**사전(Prior)**: 프로필 기반 새 사용자 능력에 대한 교육된 추측
**사후(Posterior)**: 실제 질문 답변 후 정제된 추정치

배치 테스트가 사전(추측)을 사후(증거 기반 추정)로 변환한다.

#### Newton-Raphson 반복

**쉬운 설명**: 눈을 가리고 언덕에서 정상을 찾는다고 상상하라. 발밑의 기울기(gradient)와 가파름(curvature)을 느끼고, 오르막 방향으로 기울기/곡률에 비례하는 보폭으로 걷는다. 움직임이 멈출 때까지(정상 도달) 반복한다.

---

## 변경 이력 (Change History)

| 서비스 | 최종 업데이트 | 변경 사항 |
|--------|---------------|-----------|
| PMI Service | 2026-01-05 | 초기 문서화 |
| Offline Queue Service | 2026-01-05 | 초기 문서화 |
| Agent Trigger Service | 2026-01-04 | 초기 구현 및 문서화 |
| Diagnostic Assessment Service | 2026-01-06 | 초기 문서화 |
