# 서비스 레이어 (Services Layer)

> **최종 업데이트**: 2026-01-07
> **코드 위치**: `src/main/services/`
> **상태**: Active

---

[이전: 태스크 시스템](../05-tasks/) | [다음: IPC 통신](../07-ipc/)

---

## 개요

LOGOS의 서비스 레이어는 적응형 학습 엔진의 핵심 비즈니스 로직을 구현합니다. 문항반응이론(IRT), 간격반복(FSRS), 점별상호정보(PMI), Claude AI 등 여러 알고리즘을 조율하여 개인화된 학습 경험을 제공합니다.

### 3계층 학습 파이프라인

LOGOS의 서비스는 다음 3계층 아키텍처를 따릅니다:

```
사용자 세션 시작
       |
       v
+------------------------------------------+
| 계층 1: 상태 + 우선순위                     |
| (State + Priority Service)                |
| - 학습자 능력(theta) 계산                   |
| - 다음 학습 항목 결정                       |
| - 병목 감지 및 긴급도 계산                   |
+------------------------------------------+
       |
       v
+------------------------------------------+
| 계층 2: 과제 생성                          |
| (Task Generation Service)                 |
| - 숙달 수준에 맞는 과제 형식 선택            |
| - 힌트 수준 결정 (Gap 2.4 알고리즘)          |
| - 유창성/다양성 과제 균형                   |
+------------------------------------------+
       |
       v
+------------------------------------------+
| 계층 3: 채점 + 업데이트                     |
| (Scoring + Update Service)                |
| - 응답 평가 및 부분 점수 부여               |
| - 숙달 상태 갱신 (FSRS, EMA)               |
| - theta 기여도 계산                        |
+------------------------------------------+
       |
       v
계층 1로 피드백 (사이클 반복)
```

---

## 목차

1. [핵심 서비스](#핵심-서비스)
   - [서비스 인덱스](#서비스-인덱스)
   - [상태 + 우선순위 서비스](#상태--우선순위-서비스---계층-1)
   - [과제 생성 서비스](#과제-생성-서비스---계층-2)
   - [채점 + 업데이트 서비스](#채점--업데이트-서비스---계층-3)
2. [유틸리티 서비스](#유틸리티-서비스)
   - [PMI 서비스](#pmi-서비스)
   - [오프라인 큐 서비스](#오프라인-큐-서비스)
   - [에이전트 트리거 서비스](#에이전트-트리거-서비스)
   - [진단 평가 서비스](#진단-평가-서비스)
3. [고급 서비스](#고급-서비스)
   - [제약 조건 전파 서비스](#제약-조건-전파-서비스)
   - [통합 과제 파이프라인 서비스](#통합-과제-파이프라인-서비스)
   - [다층 평가 서비스](#다층-평가-서비스)
   - [사용 공간 추적 서비스](#사용-공간-추적-서비스)

---

## 핵심 서비스

### 서비스 인덱스

> **코드 위치**: `src/main/services/index.ts`

#### 존재 이유

이 인덱스 파일은 모든 서비스 기능을 단일 진입점에서 조직하고 재내보내기(re-export)하는 **중앙 허브** 역할을 합니다. 개발자는 이 파일만 참조하면 사용 가능한 서비스, 타입, 함수를 파악할 수 있습니다.

#### 재내보내기 서비스 모듈

| 모듈 | 목적 |
|------|------|
| `state-priority.service` | 계층 1: 학습자 상태 및 항목 우선순위 |
| `task-generation.service` | 계층 2: 학습 과제 생성 |
| `scoring-update.service` | 계층 3: 응답 평가 및 숙달 갱신 |
| `fluency-versatility.service` | 훈련 모드 균형 |
| `pmi.service` | 어휘 관계 분석 |
| `corpus-sources/*` | 코퍼스 소스 카탈로그, 필터링, 파이프라인 |
| `offline-queue.service` | 오프라인 작업 큐잉 |
| `claude.service` | Claude AI 통합 |

---

### 상태 + 우선순위 서비스 - 계층 1

> **코드 위치**: `src/main/services/state-priority.service.ts`

#### 맥락 및 목적

**학습 스케줄러의 두뇌**입니다. 근본적 질문에 답합니다: *"학습자가 다음에 무엇을 공부해야 하고, 왜?"*

효과적 학습에 필요한 이해:
1. 학습자 현재 위치 (언어 구성요소별 능력 프로필)
2. 최대 학습을 생산할 자료 (근접발달영역 내 항목)
3. 진행을 막는 것 (연쇄 실패 유발 병목 구성요소)
4. 긴급히 복습 필요한 것 (곧 잊혀질 항목)

#### 데이터 흐름

```
사용자 세션 시작
       |
       v
getUserThetaState() --> 능력 프로필 조회 (구성요소별 세타값)
       |
       v
detectBottlenecks() --> 어려움 겪는 구성요소 식별
       |
       v
각 LanguageObject에 대해:
       +---> calculateBasePriority() --> z(w) 벡터: F, R, D, M, P
       +---> calculateMasteryAdjustment() --> g(m) 근접발달영역용
       +---> calculateUrgencyScore() --> 시간 기반 복습 압력
       |
       v
calculateEffectivePriority() --> S_eff(w) = S_base * g(m) + urgency + bottleneck_boost
       |
       v
S_eff(w) 내림차순 큐 정렬 --> 최고 우선순위 항목 반환
```

#### 핵심 개념

##### 세타 상태 (Theta State)

**기술적**: 문항반응이론(IRT)의 능력 파라미터 벡터. 각 언어 구성요소(음운론, 형태론, 어휘, 통사론, 화용론)에 대한 로짓 척도 잠재 능력.

**쉬운 설명**: 비디오 게임의 "스킬 레벨"처럼 카테고리별로 분류됩니다. 어휘에서 레벨 7이지만 문법에서 레벨 3일 수 있습니다.

##### 우선순위 가중치 z(w) 벡터

언어 객체의 5가지 객관적 속성 가중합:
- **F**: 빈도 (0-1), 높을수록 더 흔함
- **R**: 관계 밀도 (0-1), 높을수록 더 많은 연결
- **D**: 도메인 관련성 (0-1), 대상 도메인 출현 정도
- **M**: 형태론적 점수 (0-1), 단어 형성 복잡도
- **P**: 음운론적 난이도 (0-1), 발음 복잡도

##### 근접발달영역 g(m) 조정

**기술적**: 힌트 없는 정확도 40-70% 항목에 최고점, 너무 쉬운(>90%) 또는 너무 어려운(<40%) 항목에 감소.

```
g(m) = stageFactor * accuracyFactor * gapFactor

- stageFactor: 단계 [0,1,2,3,4]에 대해 [1.0, 0.9, 0.7, 0.5, 0.3]
- accuracyFactor: <40% -> 0.8, 40-70% -> 1.0, 70-90% -> 0.6, >90% -> 0.3
- gapFactor: 1 + scaffoldingGap * 0.5
```

##### 긴급성 점수 (Urgency Score)

```
if (연체):
   urgency = min(1.0, 0.5 + 연체시간/48)
else:
   urgency = max(0.1, 0.5 - 기한까지시간/168)
```

48시간+ 연체 항목은 최대 긴급성(1.0). 1주+ 남은 항목은 최소 긴급성(0.1).

---

### 과제 생성 서비스 - 계층 2

> **코드 위치**: `src/main/services/task-generation.service.ts`

#### 맥락 및 목적

계층 1이 **무엇을** 가르칠지 결정하면, 계층 2는 **어떻게** 가르칠지 결정합니다. 학습 큐 항목을 학습자가 실제로 보고 응답하는 구체적 과제로 변환합니다.

#### 데이터 흐름

```
LearningQueueItem (계층 1에서)
       |
       v
generateTaskSpec() - 형식, 힌트 수준, 난이도 결정
       |
       v
generateTask() - 프롬프트, 옵션, 힌트로 전체 과제 생성
       |
       v
cacheTask() - 향후 조회용 저장
       |
       v
GeneratedTask (UI 계층으로)
```

#### 핵심 개념

##### 과제 형식 진행 (Task Format Progression)

숙달 단계 0-4에 따라 난이도 증가:
- MCQ(선다형) -> 빈칸채우기 -> 매칭 -> 순서배열 -> 자유응답

##### 힌트 수준 시스템 (Gap 2.4 알고리즘)

0-3 정수 척도로 비계(scaffolding) 강도 표현. 힌트 있을 때와 없을 때 정확도 차이(scaffolding gap)에서 계산.

| 수준 | 학습자가 보는 것 |
|------|-----------------|
| 0 | 힌트 없음 - 완전 회상 필요 |
| 1 | 최소 힌트: "A로 시작" |
| 2 | 중간 힌트: "7글자, App..." |
| 3 | 완전 비계: "App____" (절반 노출) |

##### 유창성 vs 다양성 과제

- **유창성 과제**: 고-PMI(자주 공기하는) 단어쌍 강화. 속도와 자동화 훈련.
- **다양성 과제**: 새로운 조합 도입. 유연한 적용력 훈련.

#### 구성 옵션

| 옵션 | 타입 | 기본값 | 효과 |
|------|------|--------|------|
| `preferredModality` | 'visual'/'auditory'/'mixed' | 'visual' | 과제 내용 표시 모드 |
| `maxCueLevel` | 0-3 | 3 | 알고리즘이 제안해도 비계 상한 |
| `fluencyRatio` | 0-1 | 0.6 | 유창성 vs 다양성 과제 비율 |
| `difficultyAdjustment` | -1~1 | 0 | IRT 난이도 수동 오프셋 |

---

### 채점 + 업데이트 서비스 - 계층 3

> **코드 위치**: `src/main/services/scoring-update.service.ts`

#### 맥락 및 목적

핵심 질문에 답합니다: *"학습자가 어떻게 했고, 결과로 무엇이 바뀌어야 하는가?"*

적응형 학습 루프를 완성하는 **피드백 처리기**입니다.

#### 데이터 흐름

```
사용자 응답 (텍스트)
       |
       v
evaluateResponse() --> 예상 답과 비교
       |
       +-- 정확히 일치? --> correct: true, partialCredit: 1.0
       +-- 90%+ 유사? --> correct: true, partialCredit: 0.95
       +-- 70%+ 유사? --> correct: false, partialCredit: 0.7
       +-- 그 외 --> analyzeError() --> 오류 유형 분류
       |
       v
recordResponse() --> 세션 이력에 저장
       |
       v
recordExposure() --> 정확도 지표(EMA) 갱신
       |
       v
determineStageTransition() --> 승급/강등 임계값 확인
       |
       v
calculateFSRSUpdate() --> 새 안정성, 난이도, 다음 복습 계산
       |
       v
calculateEffectivePriority() --> 항목 우선순위 재계산
       |
       v
calculateThetaContribution() --> IRT 능력 갱신 (학습 모드 제외)
       |
       v
createErrorAnalysis() --> (오답 시) 오류 분류 및 저장
       |
       v
ResponseOutcome --> 호출자에게 반환
```

#### 핵심 개념

##### 부분 점수 응답 평가

텍스트 정규화(소문자, 공백 제거, 구두점 제거) 후 레벤슈타인(Levenshtein) 기반 유사도 계산. 설정된 임계값에 따라 부분 점수 부여.

##### 오류 유형 분석

- `spelling`: 같은 길이, 몇 문자 차이 - 철자 오류
- `typo`: 길이 1-2 차이 - 오타
- `wrong_word`: 크게 다름 - 잘못된 단어

##### 단계 전환 임계값 (Gap 1.2)

| 현재 단계 | 단계명 | 승급 조건 | 강등 조건 |
|-----------|--------|-----------|-----------|
| 0 | Unknown | 50% | (해당없음) |
| 1 | Recognized | 60% | 30% |
| 2 | Recall | 75% | 40% |
| 3 | Controlled | 90% | 60% |
| 4 | Automatic | (해당없음) | 80% |

##### FSRS 알고리즘 (간격 반복)

| 등급 | 의미 | 트리거 | 효과 |
|------|------|--------|------|
| 1 (Again) | 잊음 | 오답 | 안정성 20%로 리셋, 난이도 증가 |
| 2 (Hard) | 어렵게 기억 | 정답, >10초 | 안정성 1.5x 천천히 증가 |
| 3 (Good) | 정상적으로 기억 | 정답, 5-10초 | 안정성 2.0x 정상 증가 |
| 4 (Easy) | 쉽게 기억 | 정답, <5초 | 안정성 2.5x 빠르게 증가, 난이도 감소 |

##### 세타 기여 규칙

| 모드 | 세타 갱신 동작 | 근거 |
|------|---------------|------|
| Learning | 동결 (갱신 없음) | 힌트 응답이 능력 추정 편향 |
| Training | 50% 가중치 | 응답에 부분적 신뢰 |
| Evaluation | 100% 가중치 | 힌트 없는 응답은 신뢰할 수 있는 지표 |

---

## 유틸리티 서비스

### PMI 서비스

> **코드 위치**: `src/main/services/pmi.service.ts`

#### 맥락 및 목적

원시 통계 분석과 언어 학습 난이도 추정 사이의 간극을 연결합니다. `core/pmi.ts`의 순수 PMI 계산기를 목표 특화 캐싱, 데이터베이스 영속화, LOGOS 적응형 학습 시스템 통합으로 감쌉니다.

#### 데이터 흐름

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

#### 핵심 개념

##### PMI (점별 상호정보량)

**기술적**: 두 단어의 연관 강도를 측정. `PMI(w1, w2) = log2[P(w1,w2) / (P(w1) * P(w2))]`

**쉬운 설명**: "take"를 들었을 때 다음 단어가 "medication"일 때와 "elephant"일 때의 놀람 정도를 정량화합니다. 높은 PMI는 예측 가능한 쌍(낮은 놀람), 낮은 PMI는 예측 불가한 쌍(높은 놀람).

##### 허브 점수 (관계 밀도)

**기술적**: 단어의 모든 유의미한 연어에 대한 양의 PMI 값 합계를 경험적 최댓값(50)으로 나눠 [0, 1]로 정규화.

**쉬운 설명**: "take"는 "medication", "break", "time", "care"와 강하게 연결됩니다. 연결이 많은 단어는 여러 방향에서 강화되므로 배우기 쉽습니다.

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `getWordDifficulty(goalId, word, taskType)` | IRT 난이도(-3 ~ +3), 빈도, PMI 기반 난이도 반환 |
| `getCollocations(goalId, word, topK)` | 상위 K개 연어와 PMI 점수 반환 |
| `getRelationalDensity(goalId, word)` | FRE 공식용 정규화된 허브 점수(0-1) 반환 |
| `updateIRTDifficulties(goalId)` | 목표 내 모든 언어 객체의 irtDifficulty 일괄 업데이트 |

---

### 오프라인 큐 서비스

> **코드 위치**: `src/main/services/offline-queue.service.ts`

#### 맥락 및 목적

LOGOS의 **네트워크 복원력 백본**입니다. 핵심 질문에 답합니다: *"인터넷이 끊기면 어떻게 되고, 돌아왔을 때 어떻게 복구하는가?"*

동기적 "지금 성공해야 함" 작업을 비동기적 "결국 성공할 것" 작업으로 전환합니다.

#### 데이터 흐름

```
사용자가 Claude 작업 요청 (예: 연습문제 생성)
       |
       v
앱이 온라인인가? ----YES----> ClaudeService로 직접 API 호출
       |                              |
       NO                             v
       |                       즉시 결과 반환
       v
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
       +---> 성공? ----> 'completed' 표시, 결과 저장
       +---> 실패? ----> retryCount 증가 (지수 백오프)
```

#### 핵심 영향

1. **우아한 성능 저하(Graceful Degradation)**: 오프라인 시 작업이 실패 대신 큐잉
2. **결과적 일관성(Eventual Consistency)**: 모든 큐잉된 작업이 결국 완료
3. **자동 복구(Automatic Recovery)**: 사용자 개입 없이 온라인 상태 감지 후 백로그 처리

#### 서비스 API

| 함수 | 목적 |
|------|------|
| `enqueue(type, payload, maxRetries)` | 큐에 항목 추가 |
| `getStats()` | 큐 통계 (상태/유형별 개수) |
| `setOnline(online)` | 연결 상태 설정 |
| `processQueue()` | 수동 처리 트리거 |
| `retryFailed()` | 실패 항목을 pending으로 리셋 |

---

### 에이전트 트리거 서비스

> **코드 위치**: `src/main/services/agent-trigger.ts`

#### 맥락 및 목적

AI 지원 개발의 조정 문제를 해결합니다: **멀티 에이전트 시스템이 언제 어떤 전문가를 호출해야 하는지 어떻게 아는가?**

작업 컨텍스트를 분석하여 어떤 에이전트(frontend-specialist, database-specialist, security-specialist 등)를 호출해야 하는지 자동으로 결정합니다.

#### 데이터 흐름

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
```

#### 우선순위 레벨

- `immediate`: 현재 작업 중단 (보안, 치명적 실패)
- `soon`: 다음 가용 슬롯에 큐잉 (문서화, 통합)
- `when_available`: 백로그에 추가 (최적화, 정리)

---

### 진단 평가 서비스

> **코드 위치**: `src/main/services/diagnostic-assessment.service.ts`

#### 맥락 및 목적

온보딩 과정에서 신규 사용자의 **초기 능력 추정**을 처리합니다. 핵심 질문: "새 학습자는 어디서 시작해야 하는가?"

#### 데이터 흐름

```
Onboarding Wizard
      |
      | 사용자 프로필 데이터:
      | - purpose (자격증, 전문직 등)
      | - 일일 학습 시간
      | - 목표 도메인
      v
+--------------------------------+
| estimateInitialTheta()         |
|   +-- getPriorTheta()          |  목적 + 도메인 -> 기본 추정
|   +-- getTimeAdjustment()      |  일일 분 -> 동기 신호
|   +-- getSelfAssessmentAdj()   |  자가 평가 -> 조정
+--------------------------------+
      |
      v (배치 테스트 수행 시)
+--------------------------------+
| estimateThetaFromResponses()   |
|   +-- mleEstimate()            |  Newton-Raphson 최대우도추정
|   +-- calculateStandardError() |  신뢰 구간
+--------------------------------+
      |
      v
ThetaEstimate 객체:
- thetaGlobal: -3 ~ +3
- thetaPhonology, thetaMorphology 등
- estimatedCEFR: A1-C2 매핑
```

#### 사전 추정 기본값

```
목적 기반 사전:
  certification: +0.5   (시험 목표, 기반 있음)
  professional:  +0.3   (업무 맥락)
  academic:      +0.4   (정규 학습)
  personal:       0.0   (취미)

도메인 조정:
  medical/legal: +0.3   (전문 분야)
  business/tech: +0.2
  general:        0.0
```

---

## 고급 서비스

### 제약 조건 전파 서비스

> **코드 위치**: `src/main/services/constraint-propagation.service.ts`

#### 목적 및 배경

과제 구성(task composition) 중 객체 선택에 대한 **연쇄적 제약 조건 해결(cascading constraint resolution)**을 구현합니다.

교사가 "수동태(passive voice)"를 통사 구조로 선택하면 자동사를 사용할 수 없습니다. 격식체를 선택하면 속어 어휘는 부적절해집니다. 이 서비스는 이러한 상호의존성을 계산합니다.

#### 데이터 흐름

```
객체 선택 (트리거)
       |
       v
buildConstraintGraph(goalId)  <- DB의 연어 정보 + 언어 규칙
       |
       v
propagateConstraints(trigger, graph, availableObjects, currentAssignments, slots)
       |
       +---> applyObjectConstraints() - 직접적인 객체 간 엣지
       +---> applyLinguisticRules() - 컴포넌트 수준 규칙 술어
       +---> propagateFromRequired() - 재귀적 연쇄
       |
       v
ConstraintPropagation 결과
(required, excluded, restrictions, preferences, modifications)
```

#### 핵심 개념

##### 강한 제약 vs 약한 제약

- **강한 제약(Hard constraints)**: 문법 규칙. "수동태는 타동사를 필요로 한다" - 협상 불가.
- **약한 제약(Soft constraints)**: 스타일 선호. "'bread'는 'butter'를 동반어로 선호한다" - 무시 가능하지만 자연스러움 감소.

##### 레지스터 계층

5단계: `frozen`, `formal`, `consultative`, `casual`, `intimate`. 호환성은 서로 한 단계 이내.

---

### 통합 과제 파이프라인 서비스

> **코드 위치**: `src/main/services/integrated-task-pipeline.service.ts`

#### 목적 및 배경

LOGOS의 유연한 구성 아키텍처를 기존 과제 생성 시스템과 통합하는 **중앙 오케스트레이터**입니다.

경제적 최적화, 제약 조건 전파, 사용 공간 추적, 다층 평가, 보정 등 여러 하위 시스템을 일관된 파이프라인으로 조율합니다.

#### 아키텍처 계층

```
Layer 0: 사용자 인터페이스 (React renderer)
        |
Layer 1: IPC 핸들러 (main process 진입점)
        |
Layer 2: *** 통합 과제 파이프라인 (이 서비스) *** <-- 오케스트레이터
        |
        +---> task-composition.service (경제적 최적화)
        +---> constraint-propagation.service (언어 규칙)
        +---> usage-space-tracking.service (맥락 커버리지)
        +---> multi-layer-evaluation.service (응답 점수화)
        +---> multi-object-calibration.service (능력 업데이트)
        +---> task-generation.service (레거시 폴백)
        |
Layer 3: 핵심 알고리즘 (IRT, FSRS, PMI)
        |
Layer 4: 데이터베이스 리포지토리 & Prisma
```

#### 핵심 개념

##### 후보 풀 구축

제한된 여행가방 공간으로 짐을 싸는 것과 같습니다. 각 항목은 "유용성 점수"와 "무게 비용"을 모두 갖습니다.

##### 레거시 폴백

새로운 구성 시스템이 실패하면(적합한 템플릿 없음, 후보 소진, 제약 조건 과다) 예전의 신뢰할 수 있는 시스템으로 폴백합니다.

---

### 다층 평가 서비스

> **코드 위치**: `src/main/services/multi-layer-evaluation.service.ts`

#### 목적 및 배경

언어 학습 평가의 근본적 과제를 해결합니다: "정확성"이 흑백이 아닐 때 학습자의 응답을 어떻게 공정하게 평가할 것인가?

단순한 합격/불합격 대신 미묘하고 교육적으로 의미 있는 피드백을 제공합니다.

#### 데이터 흐름

```
사용자 응답 제출
   |
   v
evaluateObject()가 적절한 모드로 분배:
   |---> evaluateBinary()         --> 단순 정답/오답
   |---> evaluatePartialCredit()  --> 다층 점수화
   |---> evaluateRangeBased()     --> 퍼지 매칭
   |---> evaluateRubricBased()    --> 루브릭 점수화
   |
   v
ObjectEvaluationResult (score, correct, layerScores, feedback, errorType)
   |
   v
evaluationToThetaInput() --> 세타 기여로 변환
```

#### 컴포넌트별 기본 평가 계층

| 컴포넌트 | Layer 1 (주요) | Layer 2 | Layer 3 |
|----------|---------------|---------|---------|
| **LEX** (어휘) | 의미 정확성 (50%) | 철자 (30%) | 맥락 적절성 (20%) |
| **MORPH** (단어 형태) | 형태 정확성 (60%) | 철자 (40%) | - |
| **SYNT** (문법) | 구조 (50%) | 일치 (30%) | 어순 (20%) |
| **PRAG** (용법) | 적절성 (40%) | 레지스터 (30%) | 공손성 (30%) |
| **PHON** (발음) | 정확성 (70%) | 이해 가능성 (30%) | - |

#### 오류 유형 분류

- **생략(omission)**: 무언가를 빠뜨림
- **대체(substitution)**: 완전히 틀린 단어 사용
- **순서(ordering)**: 어순이 뒤섞임
- **형태(form)**: 올바른 단어지만 틀린 형태 ("ran" 대신 "runned")

---

### 사용 공간 추적 서비스

> **코드 위치**: `src/main/services/usage-space-tracking.service.ts`

#### 목적 및 배경

언어 객체의 "사용 공간" - 학습자가 자신의 지식을 성공적으로 보여준 특정 맥락 - 을 추적합니다.

**핵심 통찰**: 한 맥락에서 단어를 아는 것이 모든 맥락에서 아는 것을 보장하지 않습니다.

#### 데이터 흐름

```
과제 완료
     |
     v
recordUsageEvent()
     |
     +--> 새 맥락인지 확인
     +--> 성공/시도 맥락 업데이트
     +--> 커버리지 비율 재계산
     +--> 확장 후보 식별
     |
     v
반환: { recorded, expansion, newCoverage }
```

#### 핵심 개념

##### 사용 맥락 (Usage Context)

도메인(의료, 학술, 개인), 레지스터(격식, 비격식, 기술적), 양식(구어, 문어)의 조합.

##### 커버리지 비율

언어 객체가 성공적으로 사용된 대상 맥락의 비율. 4개 맥락 중 2개에서 성공 = 50%.

##### 확장 이벤트

학습자가 새로운 상황에서 단어를 사용할 수 있음을 증명하는 "레벨 업" 순간.

#### 표준 맥락 참조

| 맥락 ID | 이름 | 도메인 | 레지스터 | 양식 |
|---------|------|--------|----------|------|
| personal-spoken-informal | 일상 대화 | personal | informal | spoken |
| professional-spoken-formal | 전문 회의 | professional | formal | spoken |
| medical-spoken-consultative | 환자 상호작용 | medical | consultative | spoken |
| medical-written-technical | 의료 문서화 | medical | technical | written |
| academic-written-formal | 학술 글쓰기 | academic | formal | written |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-07 | 서비스 레이어 통합 문서 생성 |
| 2026-01-06 | 핵심 서비스 문서 작성 |
| 2026-01-05 | PMI, 오프라인 큐 서비스 문서화 |
| 2026-01-04 | 에이전트 트리거 서비스 구현 |

---

[이전: 태스크 시스템](../05-tasks/) | [다음: IPC 통신](../07-ipc/)
