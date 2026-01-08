# 제12부: 고급 Core 모듈 (Advanced Core Modules)

---

## 12.1 우선순위-전이 통합 모듈 (Priority-Transfer Integration Module)

> **최종 업데이트**: 2026-01-05
> **코드 위치**: `src/core/priority-transfer.ts`
> **상태**: 활성화

---

### 맥락 및 목적 (Context & Purpose)

이 모듈은 언어 학습의 근본적인 질문에 답하기 위해 존재합니다: **학습자가 이미 알고 있는 모국어 지식을 바탕으로 특정 단어가 얼마나 더 쉽거나 어려워질 것인가?**

우선순위-전이 모듈은 LOGOS의 두 가지 핵심 시스템을 연결합니다: **전이 계수 분석 (transfer coefficient analysis)** (학습자의 모국어가 목표 언어와 얼마나 유사한지 측정)과 **학습 대기열 (learning queue)** (학습자가 다음에 무엇을 공부해야 하는지 결정). 이 연결 없이는 시스템이 모든 학습자를 동일하게 취급하여, 일본어 화자에 비해 영어 어휘를 배우는 데 독일어 화자가 가진 막대한 이점을 무시하게 됩니다.

**비즈니스 필요성**: 각 학습자의 언어적 배경을 존중하는 개인화된 학습 경로. 영어 의학 어휘를 배우는 스페인어 화자는 "cardio-"나 "-itis"와 같은 라틴어 동원어(cognate)를 활용할 수 있습니다 - 시스템은 이 이점을 인식하고 이러한 "쉬운 승리"의 우선순위를 낮추어 더 많은 연습이 필요한 진정으로 어려운 어휘에 집중해야 합니다.

**사용 시점**: 시스템이 학습자가 다음에 무엇을 공부해야 할지 계산할 때마다. 다음 상황에서 발생합니다:
- 세션 초기화 (학습 대기열 구축)
- 응답 후 실시간 우선순위 재계산
- 새 어휘 도입 시 일괄 처리
- 사용자 분석 (전이 강점/약점 표시)

---

### 미시적 관점: 직접적 관계 (Microscale: Direct Relationships)

#### 의존성 (Dependencies - What This Needs)

- `src/core/transfer.ts`: **getTransferCoefficients()** - L1과 L2 언어 계열 간의 원시 언어적 유사성 점수를 가져옴 (어휘적, 음운론적, 형태론적, 통사론적, 화용론적)
- `src/core/transfer.ts`: **calculateTransferGain()** - 구성요소별 전이를 비용 계산을 위한 0-1 이득 점수로 변환
- `src/core/transfer.ts`: **getLanguageFamily()** - 모국어가 어떤 언어 계열(게르만어, 로망스어, 슬라브어 등)에 속하는지 결정
- `src/core/transfer.ts`: **TransferCoefficients, LanguageFamily** - 전이 데이터 구조에 대한 타입 정의

#### 종속 모듈 (Dependents - What Needs This)

현재 이 모듈은 다음에서 사용되도록 설계되었습니다:
- **세션 계획 서비스** - 모든 사용 가능한 항목의 순위를 매기기 위해 `calculateFullPriority()` 호출
- **대기열 구축 로직** - 효율적인 대량 처리를 위해 `batchCalculateTransfer()` 사용
- **사용자 분석 대시보드** - 학습자에게 L1 이점을 보여주기 위해 `getTransferSummary()` 표시
- **IRT 매개변수 조정** - 난이도 추정에 `calculateCostWithTransfer()` 통합

#### 데이터 흐름 (Data Flow)

```
User Profile (native language, target language)
    |
    v
TransferContext created (languages + object type + domain)
    |
    v
getTransferCoefficients() fetches L1-L2 similarity matrix
    |
    v
calculateTransferGain() converts to 0-1 gain score
    |
    v
Priority adjusted: high transfer = LOWER priority (already easy)
                   low/negative transfer = HIGHER priority (needs attention)
    |
    v
Final priority returned with explanation for transparency
```

---

### 거시적 관점: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어 (Architectural Layer)

이 모듈은 LOGOS 아키텍처의 **알고리즘 코어 레이어 (Algorithm Core Layer)**에 위치합니다:

```
Layer 1: Renderer (React UI) - Shows study items to user
    |
Layer 2: IPC Bridge - Communicates between UI and main process
    |
Layer 3: Services (state-priority.service.ts) - Orchestrates priority decisions
    |
Layer 4: Algorithm Core (THIS MODULE) - Pure mathematical calculations
    |
Layer 5: Data Layer (transfer.ts, priority.ts) - Raw linguistic data
```

이 모듈은 부작용(side effect)이 없고, 데이터베이스 접근이 없으며, 상태 변경이 없는 **순수 계산 (pure computation)** 입니다. 입력을 받아 출력을 반환하므로 테스트와 예측이 매우 용이합니다.

#### 큰 그림의 영향 (Big Picture Impact)

우선순위-전이 모듈은 **언어학적으로 인식하는 적응형 학습 (linguistically-aware adaptive learning)**을 가능하게 합니다. 이것이 없으면 LOGOS는 두 가지 중요한 문제를 갖게 됩니다:

1. **학습 시간 낭비**: 학습자가 동원어(L1과 거의 동일한 단어)와 진정으로 어려운 어휘에 동일한 시간을 소비하게 됩니다. 프랑스어 화자는 "communication"을 배우는 데 20번의 반복이 필요하지 않습니다 - L1 앵커가 없는 단어에 그 반복이 필요합니다.

2. **간섭 누락**: 일부 L1 패턴은 실제로 L2 학습을 *방해*합니다 (부정적 전이). 일본어의 SOV 어순은 영어의 SVO 구조와 간섭을 일으킵니다. 이 모듈은 이러한 간섭이 발생하기 쉬운 항목을 감지하고 우선순위를 높입니다.

**시스템 전체 가치**:
- 진정한 학습 필요에 우선순위를 두어 평균 숙달 시간 단축
- "쉬운" 항목에 대한 불필요한 작업을 줄여 학습자 동기 부여 향상
- 언어적 배경에 기반한 개인화된 추천 가능
- 설명 가능한 AI 제공 (모든 우선순위 결정에 사람이 읽을 수 있는 이유가 있음)

#### 임계 경로 분석 (Critical Path Analysis)

**중요도 수준**: 높음

이 모듈은 **선택적이지만 혁신적**입니다. 시스템은 이것 없이도 작동할 수 있지만 (기본 우선순위 계산 사용), 학습 효율성이 크게 감소합니다:

- **실패 시**: 시스템이 언어 불가지론적 우선순위로 폴백하여 모든 학습자를 동일하게 취급
- **실패 모드**: 우아한 성능 저하 - 충돌 없음, 단지 덜 개인화된 학습
- **성능 영향**: 최소 - 항목당 O(1) 복잡도의 순수 수학적 연산
- **복구**: 손상될 상태 없음, 올바른 L1/L2 구성으로 단순히 재시작

---

### 기술 개념 (Technical Concepts - Plain English)

#### 전이 계수 (Transfer Coefficient)

**기술적 정의**: 특정 구성요소(어휘적, 음운론적, 통사론적 등)에 대한 두 언어 간의 언어적 유사성 정도를 나타내는 -1에서 +1까지의 숫자 값.

**쉬운 설명**: 모국어와 학습 중인 언어 사이의 "유사성 점수". +1은 거의 동일함을 의미하고 (네덜란드어 어휘와 영어), -1은 적극적으로 혼란스러움을 의미하며 (일본어 어순과 영어), 0은 중립을 의미합니다 (도움도 방해도 없음).

**사용 이유**: 언어 교사들이 직관적으로 알고 있는 것 - 특정 언어 쌍이 다른 것보다 배우기 쉽다는 것 - 을 수치화하기 위해.

#### 전이 이득 (Transfer Gain)

**기술적 정의**: -1에서 +1의 전이 계수를 0-1 스케일로 이동시켜 계산된, 긍정적 L1-L2 전이로 인한 비용 감소를 나타내는 정규화된 0-1 값.

**쉬운 설명**: 학습 난이도에 대한 "할인". 0.8의 이득은 모국어 배경 때문에 이 항목이 80% 더 쉽다는 것을 의미하므로, 시스템이 반복 연습에 더 적은 시간을 할애할 수 있습니다.

**사용 이유**: 우선순위 공식에는 양수가 필요하므로, 원시 유사성 점수를 "학습 비용 감소" 계수로 변환합니다.

#### 숙달 계수 g(m) - 역 U자 곡선 (Mastery Factor - Inverted U-Curve)

**기술적 정의**: 근접 발달 영역(Zone of Proximal Development) 이론에 기반한 함수로, 중간 숙달도(40-50%)에서 우선순위가 최고점에 달하고 초보자(기초 부족)와 고급 항목(이미 숙달)에서는 감소합니다.

**쉬운 설명**: 학습을 위한 "골디락스 존". 막 시작한 항목(너무 어려움)과 이미 숙달한 항목(너무 쉬움)은 낮은 우선순위를 받습니다. 학습의 최적 지점(도전적이지만 달성 가능한)에 있는 항목이 가장 높은 우선순위를 받습니다.

**사용 이유**: 수십 년간의 교육 심리학 연구에 기반 - 학습자는 현재 수준보다 약간 높은 자료에서 가장 빠르게 진전합니다.

#### 스캐폴딩 갭 (Scaffolding Gap)

**기술적 정의**: 힌트/단서가 있을 때와 없을 때의 학습자 수행 차이로, 얼마나 많은 독립적 숙달이 달성되었는지를 나타냅니다.

**쉬운 설명**: "힌트로 답할 수 있다"와 "힌트 없이 답할 수 있다" 사이의 격차. 큰 격차는 보조 바퀴에 의존하고 있으며 더 많은 독립적 연습이 필요하다는 것을 의미합니다.

**사용 이유**: 진정한 학습과 패턴 매칭을 구별합니다. 항상 힌트가 필요한 학생은 진정으로 내면화하지 못한 것입니다.

#### 병목 부스트 (Bottleneck Boost)

**기술적 정의**: 학습 의존성 그래프의 위상 분석을 통해 계산된, 선행 조건 차단자로 식별된 항목에 적용되는 우선순위 증가.

**쉬운 설명**: 다른 학습을 열어주는 기초 항목에 대한 추가 우선순위. "run"을 모르면 "running"을 배울 수 없다면, "run"은 진행을 차단하고 있으므로 우선순위 부스트를 받습니다.

**사용 이유**: 학습자가 시간이 지남에 따라 복합되는 격차를 축적하는 대신 견고한 기초 위에 구축하도록 보장합니다.

#### 일괄 처리 (Batch Processing)

**기술적 정의**: 중복 계수 조회를 줄이고 계산 효율성을 향상시키기 위해 공유 컨텍스트로 단일 함수 호출에서 여러 항목을 처리하는 것.

**쉬운 설명**: 독일어-영어 유사성 테이블을 500번 (단어당 한 번) 조회하는 대신, 한 번 조회하고 500개 단어 모두에 일괄 적용합니다.

**사용 이유**: 성능 최적화. 수천 개의 어휘 항목을 처리할 때 반복 조회를 피하면 시스템의 응답성이 향상됩니다.

---

### 변경 이력 (Change History)

#### 2026-01-05 - 초기 문서화

- **변경 내용**: 우선순위-전이 모듈에 대한 내러티브 문서 생성
- **이유**: LOGOS 코드베이스에 대한 Shadow Map 문서화 시스템 구현
- **영향**: 미래 개발자들이 전이 조정 우선순위 계산의 이유를 이해할 수 있게 함

---

### 공식 참조 (Formula Reference)

이 모듈에서 구현된 완전한 우선순위 공식:

```
S_eff(w) = S_base(w) x g(m) x (1 + T_penalty) + Urgency + Bottleneck
```

여기서:
- **S_base(w)**: 기본 FRE 점수 (빈도 + 관계적 + 맥락적 가중 합)
- **g(m)**: 숙달 계수 (ZPD 이론의 역 U자 곡선)
- **T_penalty**: 전이 조정 (L1-L2 유사성에 따라 -0.25에서 +0.25)
- **Urgency**: 간격 반복 스케줄링 압력
- **Bottleneck**: 의존성 그래프 우선순위 부스트

그리고 비용 공식:
```
Cost = BaseDifficulty - TransferGain + ExposureNeed
```

---

### 설계 결정 (Design Decisions)

#### 왜 높은 전이에 대해 우선순위를 낮추는가?

직관에 반하는 통찰: 배우기 *쉬운* 항목은 *낮은* 우선순위를 가져야 합니다. 시스템은 완료 순서가 아닌 학습 효율성을 최적화합니다. 동원어는 학습 순서에 관계없이 빠르게 학습되므로, 시스템은 진정으로 반복이 필요한 항목에 주의를 집중합니다.

#### 왜 전이 가중치로 0.25를 사용하는가?

`TRANSFER_PRIORITY_WEIGHT = 0.25` 상수는 전이 효과를 눈에 띄지만 압도적이지 않게 만들기 위해 선택되었습니다. 0.25에서 최대 양의 전이는 우선순위를 12.5% 낮추고, 최대 음의 전이는 12.5% 높입니다. 이것은 전이를 여러 요인 중 하나로 유지하며, 빈도와 긴급성을 주요 동인으로 존중합니다.

#### 왜 순수 함수인가?

이 모듈의 모든 함수는 순수합니다 (부작용 없음, 결정론적 출력). 이 설계는 다음을 가능하게 합니다:
- 모의 객체 없이 쉬운 단위 테스트
- 경쟁 조건 없는 병렬 처리
- 예측 가능한 디버깅 (동일한 입력은 항상 동일한 출력 생성)
- 상태 손상 없는 개발 중 핫 리로딩

---

## 12.2 사용자-객체 관계 그래프 모듈 (User-Object Relationship Graph Module)

> **최종 업데이트**: 2026-01-06
> **코드 위치**: `src/core/user-object-graph.ts`
> **상태**: 활성화

---

### 맥락 및 목적 (Context & Purpose)

이 모듈은 언어 학습자와 그들이 접하는 각 개별 언어 객체(단어, 패턴, 표현) 사이의 진화하는 관계를 추적하고 분석하기 위해 존재합니다. "본 적 있음/없음"만 추적하는 단순한 플래시카드 시스템과 달리, 이 모듈은 **언어 습득의 다차원적 특성**을 포착합니다.

**해결하는 핵심 문제**:

전통적인 어휘 학습 앱은 단어를 이진 상태로 취급합니다: 단어를 알거나 모르거나. 실제 언어 지식은 훨씬 더 미묘합니다. 학습자는 다음과 같을 수 있습니다:
- 읽을 때는 단어를 인식하지만 쓸 때는 생산하지 못함
- 의학 맥락에서는 단어를 이해하지만 일상 대화에서는 이해하지 못함
- 단어를 정확하게 듣지만 일관되게 철자를 틀림

이 모듈은 각 사용자와 각 언어 객체 사이에 **관계 그래프 (relationship graph)**를 구축하여 이러한 비대칭성을 포착하고, 학습자가 성공했는지 *여부*뿐만 아니라 *어떻게*, *언제*, *어떤 맥락에서* 성공했는지를 기록합니다.

**비즈니스 필요성**: 개인화된 언어 학습은 다양한 기술 차원에 걸친 각 학습자의 고유한 강점과 약점을 이해해야 합니다. 세분화된 만남 데이터 없이는 시스템이 다음에 무엇을 연습할지에 대해 지능적인 결정을 내릴 수 없습니다.

**사용 시점**:
- 학습자가 과제를 완료할 때마다 (언어 객체와의 모든 상호작용)
- 학습 세션 추천을 생성할 때
- 학습자를 위한 진행 시각화를 구축할 때
- 목표 연습이 필요한 항목을 계산할 때

---

### 학술적 기초 (Academic Foundations)

이 모듈은 교육 데이터 마이닝 및 지식 추적의 세 가지 주요 연구 기반 위에 구축되었습니다:

#### 딥 지식 추적 (Deep Knowledge Tracing, DKT) - Piech et al., 2015

**기술적 정의**: DKT는 **장단기 기억 네트워크 (Long Short-Term Memory, LSTM)** (긴 시퀀스에 걸쳐 정보를 기억할 수 있는 신경망의 일종)를 사용하여 학생들이 문제를 연습함에 따라 지식이 시간에 따라 어떻게 진화하는지 모델링합니다.

**쉬운 설명**: 단순히 "정답 대 오답"을 세는 대신, DKT는 각 연습 시도가 학생이 알고 있는 것을 변화시킨다는 것을 인식합니다. 이것은 게임에서 승패만 추적하는 것이 아니라 각 경기 후 선수의 기술 수준이 어떻게 변하는지 추적하는 것과 같습니다.

**사용 이유**: DKT는 순차적 학습 패턴이 중요하다는 것을 보여주었습니다. 이 모듈은 유사한 철학을 구현합니다: 단어와의 각 만남은 고립되지 않고 학습 궤적의 일부입니다.

#### DyGKT - 지식 추적을 위한 동적 그래프 학습 (Dynamic Graph Learning for Knowledge Tracing, 2024)

**기술적 정의**: DyGKT는 학습자-개념 관계를 **이질적 동적 그래프 (heterogeneous dynamic graph)**로 모델링하며, 노드는 학생, 질문, 지식 개념을 나타내고 엣지는 시간에 따라 진화하는 상호작용을 포착합니다.

**쉬운 설명**: 당신, 배우고 있는 모든 단어, 그리고 기본 개념(문법 규칙, 발음 패턴) 사이의 연결망을 상상해 보세요. DyGKT는 연습하면서 이 망이 어떻게 변하는지 추적합니다. 일부 연결은 더 강해지고 다른 연결은 격차를 드러냅니다.

**사용 이유**: DyGKT는 우리의 다차원 추적에 영감을 주었습니다. 우리는 단순히 "사용자가 단어 X를 안다"가 아니라 "사용자가 X를 시각적으로 인식하고, X를 청각적으로 생산하는 데 어려움을 겪으며, X를 주로 의학 맥락에서 보았다"를 추적합니다.

#### 지식 관계 순위 (Knowledge Relation Rank, PMC 2023)

**기술적 정의**: 이 연구는 다양한 유형의 참여(읽기, 쓰기, 듣기)가 다른 가중치를 가진 다른 유형의 지식 엣지를 생성하는 **이질적 학습 상호작용 (heterogeneous learning interactions)**을 모델링합니다.

**쉬운 설명**: 단어를 10번 읽어서 배우는 것은 대화에서 두 번 사용하는 것과 다른 종류의 지식을 만듭니다. 이 연구는 이러한 차이를 정량화합니다.

**사용 이유**: 해석 대 생산 비율과 양식별 성공률을 근본적으로 다른 유형의 지식으로 추적하기로 한 우리의 결정을 검증합니다.

---

### 미시적 관점: 직접적 관계 (Microscale: Direct Relationships)

#### 의존성 (Dependencies - What This Module Needs)

| 파일 | 임포트 | 목적 |
|------|--------|---------|
| `src/core/types.ts` | `TaskType`, `TaskFormat`, `TaskModality` | 과제 분류를 위한 타입 정의 - 코드베이스 전체에서 일관된 어휘 보장 |

**내부 의존성**:
- 외부 라이브러리 의존성 없이 순수 TypeScript만 사용
- JavaScript의 네이티브 `Date`, `Math`, `Map` 객체에 의존

#### 종속 모듈 (Dependents - What Needs This Module)

**참고**: 이 모듈은 새로 구현되었으며 아직 완전히 통합되지 않았습니다. 예상 소비자는 다음과 같습니다:

| 예상 소비자 | 이 모듈을 어떻게 사용할 것인가 |
|-------------------|----------------------------|
| `src/main/services/learning-session.ts` | 세션 계획을 위한 현재 사용자-객체 상태를 가져오기 위해 `buildRelationshipStats()` 호출 |
| `src/main/services/task-selector.ts` | 노출 격차를 찾고 균형 잡힌 연습을 추천하기 위해 `buildRelationshipProfile()` 사용 |
| `src/renderer/components/ProgressDashboard.tsx` | 차트와 그래프를 위해 `generateVisualizationData()` 소비 |
| `src/main/db/operations/mastery.ts` | 연습 결과를 기록할 때 `createEncounter()`와 `updateStatsWithEncounter()` 호출 |

#### 데이터 흐름 (Data Flow)

```
User completes a task
        |
        v
+-------------------+
| createEncounter() | -- Records raw encounter with full context
+-------------------+
        |
        v
+---------------------------+
| updateStatsWithEncounter()| -- Incrementally updates aggregated statistics
+---------------------------+
        |
        v
+------------------------+
| buildRelationshipStats()| -- (Re)calculates all derived metrics if needed
+------------------------+
        |
        v
+-------------------------+
| buildRelationshipProfile()| -- Adds recommendations based on gaps
+-------------------------+
        |
        v
+---------------------------+
| generateVisualizationData()| -- Formats for UI consumption
+---------------------------+
        |
        v
[UI renders progress charts, session planner uses recommendations]
```

---

### 거시적 관점: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어 (Architectural Layer)

이 모듈은 LOGOS 아키텍처의 **코어 알고리즘 레이어 (Core Algorithm Layer)**에 위치합니다:

```
Layer 0: Shared Types (src/shared/, src/core/types.ts)
            |
Layer 1: Core Algorithms (src/core/) <-- YOU ARE HERE
            |
Layer 2: Main Process Services (src/main/services/)
            |
Layer 3: IPC Handlers (src/main/ipc/)
            |
Layer 4: Renderer/UI (src/renderer/)
```

**아키텍처 원칙**: 이 모듈은 **순수 (pure)**합니다 - 부작용이 없고, I/O를 수행하지 않으며, 데이터베이스에 직접 접근하지 않습니다. 데이터를 받고, 파생 값을 계산하고, 결과를 반환합니다. 이것은 다음을 가능하게 합니다:
- 격리된 상태에서 테스트 가능
- 다양한 맥락에서 재사용 가능
- Electron 메인/렌더러 프로세스 문제로부터 자유로움

#### 큰 그림의 영향 (Big Picture Impact)

이 모듈은 LOGOS에서 **개인화된 학습의 기초**입니다. 이것은 다음을 가능하게 합니다:

| 기능 | 이 모듈이 어떻게 가능하게 하는가 |
|---------|---------------------------|
| **스마트 세션 계획** | 연습이 부족한 기술 차원을 식별 (예: "사용자가 더 많은 청각 생산 연습이 필요함") |
| **균형 잡힌 학습** | 불균형한 연습을 방지하기 위해 해석/생산 비율 추적 |
| **도메인 맥락화** | 각 단어가 어떤 도메인에서 보였는지 기록하여 도메인별 연습 가능 |
| **진행 시각화** | UI를 위한 레이더 차트, 타임라인, 분포 데이터 생성 |
| **학습 비용 추정** | 과거 패턴을 기반으로 미래 항목에 얼마나 많은 노력이 필요할지 예측 |
| **전이 학습 최적화** | 파생 효과 계산 - 단어 X를 배우면 관련 단어 Y, Z에 이점 |

#### 임계 경로 분석 (Critical Path Analysis)

**중요도 수준**: 높음 (기초)

**이 모듈이 실패하면**:
- 학습 세션이 "멍청해짐" - 무작위 또는 단순한 항목 선택
- 사용자가 불균형한 방식으로 연습 (모두 읽기, 생산 없음)
- 진행 대시보드가 일반적이거나 오해의 소지가 있는 정보 표시
- 시스템이 어려움을 겪는 학습자를 식별하거나 그들의 필요에 적응할 수 없음

**실패 모드**:
1. **데이터 손실**: 만남이 기록되지 않으면 관계 프로필이 오래됨
2. **계산 오류**: 잘못된 성공률이 나쁜 추천으로 이어짐
3. **성능 문제**: 통계 재계산이 너무 느리면 세션이 지연됨

**백업 전략**: 모듈은 전체 재계산 (`buildRelationshipStats()`)과 증분 업데이트 (`updateStatsWithEncounter()`) 모두를 지원하여 불일치 상태에서 복구 가능.

---

### 기술 개념 (Technical Concepts - Plain English)

#### 만남 (Encounter)

**기술적 정의**: 사용자와 언어 객체 간의 단일 상호작용에 대한 타임스탬프가 찍힌 기록으로, 전체 맥락(과제 유형, 양식, 도메인)과 결과(성공, 응답 시간, 큐 레벨)를 포착합니다.

**쉬운 설명**: 단어를 연습할 때마다 우리는 다음을 기록합니다: "오후 3시 42분에 Maria가 의학 독해 과제에서 'diagnosis'를 보고 힌트 없이 2.3초 만에 정답을 맞췄습니다." 이것이 하나의 만남입니다.

**추적 이유**: 개별 만남은 학습 패턴을 이해하기 위한 원재료입니다. 이것이 없으면 우리는 궤적이 아닌 최종 상태만 알 수 있습니다.

#### 해석 대 생산 (Interpretation vs. Production)

**기술적 정의**: **해석 과제 (interpretation tasks)** (수용적 기술)는 언어 입력을 인식하거나 이해해야 합니다 (독해, 듣기, 매칭). **생산 과제 (production tasks)** (생성적 기술)는 언어 출력을 생성해야 합니다 (말하기, 쓰기, 자유 응답).

**쉬운 설명**:
- *해석* = "보거나 들을 때 이해할 수 있다" (군중 속에서 친구의 얼굴을 알아보는 것처럼)
- *생산* = "기억에서 만들어낼 수 있다" (기억으로 친구의 얼굴을 그리는 것처럼)

**추적 이유**: 학습자는 종종 비대칭적인 기술을 가지고 있습니다. 누군가 1000개의 단어를 이해할 수 있지만 대화에서는 200개만 사용할 수 있습니다. 이 비율을 추적하면 어느 방향으로 연습을 밀어야 하는지 알 수 있습니다.

#### 양식 균형 - 섀넌 엔트로피 (Modality Balance - Shannon Entropy)

**기술적 정의**: 양식 분포(시각, 청각, 혼합)의 **정규화된 섀넌 엔트로피 (normalized Shannon entropy)**를 계산하여 연습이 감각 채널에 얼마나 고르게 분포되었는지 측정합니다. 1.0 값은 완벽하게 균형 잡힘; 0.0은 단일 양식만을 의미합니다.

**쉬운 설명**: 단어를 읽기만 하고 듣지 않으면 양식 균형이 0입니다 (편중됨). 읽기, 듣기, 혼합 연습을 균등하게 하면 균형이 1에 접근합니다 (고름). 우리는 "다음 만남 양식이 얼마나 놀라울지"를 측정하는 정보 이론 공식을 사용합니다 - 높은 놀라움은 높은 균형을 의미합니다.

**추적 이유**: 다중 양식 노출은 더 견고한 기억을 만듭니다. "hospital"만 읽은 사람은 악센트가 있는 발음을 들었을 때 인식하지 못할 수 있습니다.

#### 해석/생산 비율 (Interpretation/Production Ratio)

**기술적 정의**: `interpretationEncounters / totalEncounters`로 계산된 0과 1 사이의 값. 0.5 값은 균형 잡힌 연습을 나타냅니다; 0.5 이상의 값은 해석 중심 연습을 나타냅니다.

**쉬운 설명**: 이것은 "모든 연습 중 얼마나 수동적(이해)이고 얼마나 능동적(생성)이었는가?"에 답합니다. 단어에 대해 8개의 인식 과제와 2개의 쓰기 과제를 수행했다면 비율은 0.8입니다 - 수동적 학습에 크게 편중되어 있습니다.

**추적 이유**: 생산은 더 어렵고 더 강한 기억 흔적을 만듭니다. 누군가의 비율이 너무 높으면 더 많은 생산 과제를 추천합니다.

#### 학습 비용 추정 (Learning Cost Estimation)

**기술적 정의**: 숙달을 달성하는 데 필요한 노력을 추정하는 복합 점수(0-1)로, 다음을 결합합니다:
- 기본 IRT 난이도 (항목이 심리측정적으로 얼마나 어려운지)
- 역사적 성공률 (사용자가 어떻게 수행했는지)
- 노출 요인 (숙달 없이 얼마나 많은 시도가 있었는지)

**쉬운 설명**: "이 사람이 이 단어를 진정으로 배우는 데 얼마나 많은 작업이 필요할까?" 사용자가 계속 실패하는 흔한 단어는 더 많은 비용이 듭니다 (그들이 어려워하고 있음). 한 번도 본 적 없는 희귀한 단어는 처음에는 비용이 적습니다 (미지의 영역).

**추적 이유**: 연습 우선순위를 정하는 데 도움이 됩니다. 고비용 항목은 포기하기보다 특별한 주의(스캐폴딩, 추가 연습)가 필요할 수 있습니다.

#### 파생 효과 점수 - 전이 학습 (Derived Effect Score - Transfer Learning)

**기술적 정의**: **전이 학습 (transfer learning)**을 통해 하나의 언어 객체를 배우는 것이 관련 객체에 얼마나 이점을 주는지 측정합니다. 전이 계수와 네트워크 중심성(객체가 다른 것들과 얼마나 연결되어 있는지)을 사용하여 계산됩니다.

**쉬운 설명**: 접두사 "un-"을 배우면 수백 개의 단어(unhappy, unlikely, unusual)에 도움이 됩니다. 희귀한 기술 용어를 배우면 그것 자체에만 도움이 됩니다. 이 점수는 그 승수 효과를 포착합니다 - 일부 지식은 다른 지식을 열기 때문에 더 "전략적"입니다.

**추적 이유**: 시스템이 높은 레버리지 학습에 우선순위를 둘 수 있게 합니다. 어근 단어와 일반적인 패턴을 공부하면 연쇄적인 이점이 있습니다.

#### 지식 강도 (Knowledge Strength)

**기술적 정의**: 다음을 결합하는 가중 복합 점수:
- 성공률 (40%)
- 인출 유창성 (20%)
- 양식 균형 (10%)
- 범주 균형 (10%)
- 최신성 감쇠 (20%)

최신성 구성요소에 대해 30일 반감기의 지수 감쇠를 사용합니다.

**쉬운 설명**: "이 사람이 지금 이 단어를 정말로 얼마나 잘 알고 있는가?" 단순히 맞추는 것에 관한 것이 아닙니다 - 다음에 관한 것입니다:
- 일관되게 맞추기
- 빠르게 맞추기 (유창성)
- 다양한 형식에서 맞추기
- 수동적 과제와 능동적 과제 모두에서 맞추기
- 최근에 연습했기 (기억은 희미해짐)

**추적 이유**: 단일 지표는 오해의 소지가 있을 수 있습니다. 누군가 100% 정확도를 가질 수 있지만 쉬운 인식 과제에서만일 수 있습니다. 이 복합 지표는 진정하고 견고한 지식을 보여줍니다.

#### 인출 유창성 (Retrieval Fluency)

**기술적 정의**: 응답 시간을 유창성 점수에 매핑하는 **시그모이드 함수 (sigmoid function)**를 사용합니다. 함수는 2000ms에서 중간점을 가지며, 더 빠른 응답은 더 높은 유창성 점수(1.0에 접근)를 산출하고 더 느린 응답은 더 낮은 점수(0.0에 접근)를 산출합니다.

**쉬운 설명**: "기억에서 이 단어에 얼마나 빨리 접근할 수 있는가?" 결국 정답을 맞추더라도 기본 단어를 회상하는 데 10초가 걸리면 기억이 약하다는 것을 시사합니다. 즉각적인 회상(1초 미만)은 강하고 자동적인 지식을 시사합니다.

**추적 이유**: 유창성은 "결국 알아냈다"와 "확실히 안다"를 구별합니다. 실제 생활에서 언어 사용은 빠른 접근이 필요합니다 - 말하면서 5초 동안 머뭇거리면 대화 흐름이 깨집니다.

---

### 주요 함수 설명 (Key Functions Explained)

#### `classifyTaskCategory(taskType: string): TaskCategory`

**하는 일**: 과제 유형 문자열(예: "recognition" 또는 "free_response")을 받아 "interpretation" 또는 "production"으로 분류합니다.

**존재 이유**: 코드베이스의 다른 부분들이 다른 과제 유형 이름을 사용합니다. 이 함수는 언어 습득 이론에 기반한 일관된 분류를 제공합니다.

**폴백 로직**: 알려지지 않은 과제 유형이 전달되면 함수는 패턴 매칭("recognition"을 포함하는가? "production"을 포함하는가?)을 사용하여 최선의 추측을 하며, 더 안전한 가정으로 "interpretation"을 기본값으로 합니다.

#### `calculateModalityBalance(encounters: ObjectEncounter[]): number`

**하는 일**: 섀넌 엔트로피를 사용하여 만남이 시각, 청각, 혼합 양식에 얼마나 고르게 분포되어 있는지 계산합니다.

**수학**:
1. 양식별 만남 수 세기
2. 수를 확률로 변환
3. 엔트로피 계산: `H = -sum(p * log2(p))`
4. 가능한 최대 엔트로피로 정규화 (3개 범주에 대해 `log2(3)`)

**왜 엔트로피**: 엔트로피는 자연스럽게 "퍼짐"을 포착합니다. 모든 만남이 시각적이면 엔트로피는 0입니다 (불확실성 없음). 완벽하게 균형 잡히면 엔트로피는 최대입니다 (다음 양식에 대한 최대 불확실성).

#### `updateStatsWithEncounter(currentStats, encounter): ObjectRelationshipStats`

**하는 일**: 새 만남이 기록될 때 전체 기록에서 재계산하지 않고 집계된 통계를 점진적으로 업데이트합니다.

**왜 증분**: 매번 처음부터 모든 통계를 재계산하는 것은 비용이 많이 듭니다 (O(n), n = 총 만남). 증분 업데이트는 O(1)입니다 - 기록 크기에 관계없이 일정한 시간.

**러닝 평균 공식**: 성공률에 대해 온라인 평균 업데이트 공식을 사용합니다:
```
new_mean = old_mean + (new_value - old_mean) / n
```

#### `buildRelationshipProfile(stats): ObjectRelationshipProfile`

**하는 일**: 원시 통계를 실행 가능한 추천으로 확장합니다:
- 사용자가 다음에 어떤 과제 범주를 연습해야 하는가?
- 어떤 양식이 부족한가?
- 사용자의 노출에 어떤 격차가 있는가?

**통계와 분리하는 이유**: 통계는 객관적 측정입니다. 프로필은 교육학적 원칙에 기반한 주관적 추천을 포함합니다 (예: "70/30 해석/생산 비율은 불균형함").

---

### 변경 이력 (Change History)

#### 2026-01-06 - 초기 구현

- **변경 내용**: DKT, DyGKT, 지식 관계 순위 원칙을 구현하는 포괄적인 사용자-객체 관계 추적 모듈 생성
- **이유**: 2025 구현 로드맵의 우선순위 1 기능; 모든 개인화 기능을 위한 기초 데이터
- **영향**: 사용자-객체 관계의 다차원 추적 가능; 진행 대시보드를 위한 시각화 데이터 제공; 균형 잡힌 학습 추천 지원

#### 내린 설계 결정

1. **순수 함수**: 이 모듈에서 데이터베이스 접근 없음 - 알고리즘을 테스트 가능하게 유지하고 관심사 분리
2. **증분 업데이트**: `updateStatsWithEncounter()`는 전체 재계산 없이 효율적인 실시간 통계 허용
3. **3양식 모델**: 더 세분화된 양식보다 단순성을 위해 시각/청각/혼합 선택
4. **균형을 위한 섀넌 엔트로피**: 자연스러운 0-1 정규화를 위해 더 단순한 분산보다 정보 이론적 측정 선택
5. **최신성에 대한 30일 반감기**: FSRS 연구를 기반으로 단기 및 장기 기억 고려 사항의 균형

---

### 향후 고려사항 (Future Considerations)

1. **시간적 패턴**: 현재 `avgInterEncounterDays`를 추적하지만 최적 간격 패턴은 분석하지 않음
2. **장르 노출**: 만남에 `genre` 필드가 있지만 통계로 집계되지 않음
3. **사회적 맥락**: 협업 필터링 추가 가능 - "당신과 같은 사용자도 X에서 어려움을 겪었습니다"
4. **신경 지식 추적**: 전체 DKT는 LSTM 통합이 필요함; 현재 구현은 통계적 근사

---

### 관련 문서 (Related Documentation)

- `docs/narrative/src/core/types.md` - 이 모듈에서 사용하는 타입 정의
- `docs/narrative/src/core/transfer.md` - `calculateDerivedEffect()`에서 참조하는 전이 계수 계산
- `docs/narrative/src/core/fsrs.md` - `knowledgeStrength` 계산을 위한 FSRS 스케줄링 통합
- `docs/ALGORITHMIC-FOUNDATIONS.md` - LOGOS 알고리즘 모음의 전체 사양
- `docs/IMPLEMENTATION-PLAN-2025.md` - 이 모듈을 우선순위 1로 보여주는 로드맵

---

## 12.3 G2P-IRT 통합 모듈 (G2P-IRT Integration Module)

> **최종 업데이트**: 2026-01-06
> **코드 위치**: `src/core/g2p-irt.ts`
> **상태**: 활성화

---

### 맥락 및 목적 (Context & Purpose)

이 모듈은 언어 학습에서 중요한 측정 문제를 해결하기 위해 존재합니다: **같은 단어가 맥락에 따라 쉽거나 어려울 수 있을 때 발음 능력을 어떻게 정확하게 평가할 것인가?**

"psychology"라는 단어를 고려해 보세요. 난이도는 다음에 따라 극적으로 변합니다:

- **양식 (Modality)**: 조용히 읽기 (쉬움) vs. 소리 내어 발음하기 (더 어려움)
- **과제 유형**: 올바른 발음 인식하기 (더 쉬움) vs. 생산하기 (더 어려움)
- **시간 압박**: 시간 제한 없는 정확도 (더 쉬움) vs. 빠른 유창성 (더 어려움)
- **학습자의 모국어**: 한국어 화자는 스페인어 화자보다 첫 "ps-" 자음군에서 더 어려움을 겪음
- **음운론적 레이어**: 문자 수준 디코딩 vs. 음절 패턴 vs. 전체 단어 인식

표준 문항반응이론 (Item Response Theory, IRT)은 난이도를 고정 매개변수로 취급합니다. 그러나 발음 난이도는 **맥락 의존적**입니다. 학습자는 강한 알파벳 디코딩 기술을 가지고 있지만 약한 음절 패턴 인식을 가질 수 있습니다. 전통적인 IRT는 이러한 미묘함을 가리는 하나의 능력 점수를 줄 것입니다.

G2P-IRT 통합 모듈은 다음을 구현하여 **언어 분석 (G2P)**과 **심리측정 측정 (IRT)**을 연결합니다:

1. **맥락 의존적 난이도 매개변수** - 같은 단어가 과제 맥락에 따라 다른 IRT 난이도를 가짐
2. **다차원 능력 추적** - 다른 기술(읽기 vs. 말하기, 알파벳 vs. 단어 수준)에 대한 별도의 세타 추정
3. **L1별 조정** - 모국어 전이 효과가 난이도 매개변수를 수정
4. **피셔 정보 기반 선택** - 효율적인 능력 추정을 위한 최적 문항 선택

**학술적 기초**:

- **형식 인식 IRT (Format-aware IRT, EDM 2022)**: 과제 형식이 전체 테스트 설계뿐만 아니라 문항 난이도 매개변수에 영향을 미친다는 연구
- **다차원 IRT (Multidimensional IRT, MIRT)**: 단일 세타 대신 여러 능력 차원을 허용하는 심리측정 모델
- **Ma, B. et al. (2025)**: 간격 반복을 사용한 개인화된 언어 학습 - 발음 학습과 적응형 알고리즘 연결

**비즈니스 필요성**: 맥락 인식 난이도가 없으면 LOGOS는 특정 양식에 대해 너무 쉽거나 너무 어려운 단어를 제시할 것입니다. 학습자는 읽기에서는 뛰어나지만 말하기에서는 어려움을 겪을 수 있지만, 두 가지 모두에서 동일한 단어 난이도를 받게 됩니다. 이것은 연습 시간을 낭비하고 학습자를 좌절시킵니다.

**사용 시점**:

- 학습자의 현재 능력에 대한 최적 문항을 찾기 위한 적응형 과제 선택 중
- 발음 연습 후 능력 추정 업데이트 시
- 어떤 음운론적 레이어(알파벳, 음절, 단어)를 목표로 지시할지 결정할 때
- 잠재적 연습 문항에서 예상 학습 이득 계산 시

---

### 미시적 관점: 직접적 관계 (Microscale: Direct Relationships)

#### 의존성 (Dependencies - What This Needs)

**`src/core/irt.ts`에서:**

- `probability2PL()` - 2-매개변수 로지스틱 모델을 사용하여 응답 확률 계산
- `estimateThetaEAP()` - 사후 기대치 능력 추정 (베이지안 접근법)
- `fisherInformation()` - 문항이 능력에 대해 얼마나 많은 정보를 제공하는지 정량화

**`src/core/g2p.ts`에서:**

- `G2PDifficulty` 타입 - 발음 분석 포함 (불규칙 패턴, 음절 수, 오발음 예측)

**`src/core/types.ts`에서:**

- `TaskType` - 학습 과제 유형 (인식, 생산, 시간 제한)
- `TaskModality` - 입출력 채널 (시각, 청각, 혼합)
- `ThetaEstimate` - 표준 오차가 있는 능력 추정
- `ItemParameter` - IRT 매개변수 (변별도, 난이도)

#### 종속 모듈 (Dependents - What Needs This)

- `src/main/services/task-generation.service.ts`: 학습 효율성을 극대화하는 발음 과제를 선택하기 위해 `selectOptimalG2PItem()` 사용
- `src/main/services/scoring-update.service.ts`: 응답 후 능력 추정을 조정하기 위해 `updateG2PThetaProfile()` 사용
- `src/scheduling/pronunciationScheduler.ts`: 지시 수준을 결정하기 위해 `recommendG2PLayer()` 사용
- `src/analytics/phonologicalProgress.ts`: 레이어 전반에 걸친 학습자 진행 상황을 추적하기 위해 `assessG2PReadiness()` 사용

#### 데이터 흐름 (Data Flow)

```text
G2P Analysis (from g2p.ts)
    |
    v
g2pToIRTParameters() --> converts difficulty score to logit scale
    |                           |
    |                           v
    |                   sets layer thresholds
    |                   builds L1 adjustments from mispronunciation predictions
    |
    v
G2PIRTParameters (base difficulty + context adjustments)
    |
    +------------+------------+
    |            |            |
    v            v            v
Task Context   User Profile  Item Pool
(modality,     (theta per    (candidate
 task type,    dimension)    items)
 timing, L1)
    |            |            |
    v            v            v
getContextualDifficulty() --> effective b parameter
    |
    v
selectOptimalG2PItem() --> Fisher Information maximization
    |
    v
Optimal item selected for learner
    |
    v
User responds --> updateG2PThetaProfile()
    |
    v
Updated theta estimates per dimension
```

---

### 거시적 관점: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어 (Architectural Layer)

이 모듈은 LOGOS 아키텍처에서 **세 시스템의 교차점**에 위치합니다:

```text
Layer 1: User Interface (pronunciation exercises)
    |
Layer 2: Learning Engine (task selection, feedback)
    |
Layer 3: Adaptive Algorithms <-- G2P-IRT INTEGRATION LIVES HERE
    |       - Converts linguistic difficulty to psychometric parameters
    |       - Tracks multiple ability dimensions
    |       - Optimizes item selection
    |
    +-------+-------+
    |               |
    v               v
Layer 4a: G2P      Layer 4b: IRT
(Linguistic        (Psychometric
 Analysis)         Measurement)
    |               |
    v               v
Layer 5: Core Data (vocabulary, learner profiles)
```

G2P-IRT 모듈은 언어학적 도메인과 심리측정 도메인 사이를 번역하는 **브릿지 모듈**입니다. G2P 분석은 "이 단어는 불규칙 패턴과 묵음 문자를 가지고 있다"고 말합니다. IRT는 "이 학습자의 능력 세타 = 0.5"라고 말합니다. G2P-IRT 모듈은 "이 학습자의 능력과 이 단어의 패턴을 고려할 때, 말하기 과제에서 올바른 발음의 확률은 얼마인가?"에 답합니다.

#### 큰 그림의 영향 (Big Picture Impact)

**1. 개인화된 난이도 보정**

이 모듈이 없으면 LOGOS는 정적 난이도 값을 사용할 것입니다. 이것이 있으면 같은 단어가 극적으로 다른 유효 난이도를 가질 수 있습니다:

| 단어 | 읽기 과제 | 말하기 과제 | 말하기 (시간 제한) | 한국어 L1 화자 |
|------|-----------|-------------|-------------------|----------------|
| "psychology" | b = 0.2 | b = 0.8 | b = 1.1 | b = 1.3 |

이것은 모든 맥락에서 과제 난이도를 학습자 능력에 정밀하게 매칭할 수 있게 합니다.

**2. 계층적 기술 진단**

3레이어 모델(알파벳, 음절, 단어)은 학습자가 어디서 어려움을 겪고 있는지 드러냅니다:

- **알파벳 문제**: 학습자가 기본적인 자소-음소 대응을 숙달하지 못함
- **음절 문제**: 학습자가 문자를 디코딩할 수 있지만 음절 패턴에서 어려움을 겪음
- **단어 문제**: 학습자가 패턴을 알지만 전체 단어를 유창하게 인식하지 못함

이 진단은 기본 디코딩 연습이 필요한 학습자에게 고급 단어를 제시하는 대신 적절한 수준으로 지시를 이끕니다.

**3. 효율적인 능력 추정**

피셔 정보 기반 문항 선택은 능력을 정확하게 추정하는 데 더 적은 연습 문항이 필요함을 의미합니다. 무작위 연습 대신 각 문항은 정보 이득을 극대화하도록 선택되어 너무 쉽거나 너무 어려운 문항에 낭비되는 시간을 줄입니다.

**4. L1 인식 적응**

학습자의 모국어에서 오는 전이 문제가 난이도 모델에 내장되어 있습니다. 영어를 연습하는 한국어 화자는 한국어에 존재하는 소리를 포함하는 더 쉬운 문항을 자동으로 받고, 존재하지 않는 소리(/f/, /v/, /th/ 등)에 대해서는 적절하게 도전적인 문항을 받습니다.

#### 임계 경로 분석 (Critical Path Analysis)

**중요도 수준**: 높음 (적응형 발음 시스템)

- **실패 시**: 발음 과제가 정적 난이도 값으로 폴백합니다. 다차원 능력 추적이 손실됩니다 - 학습자는 별도의 읽기/말하기/레이어 추정 대신 하나의 결합된 세타를 받습니다. 문항 선택이 최적화되지 않고 무작위가 됩니다.

- **우아한 성능 저하**: 모든 함수는 프로필이나 매개변수가 없을 때 합리적인 기본값을 반환합니다. 새 사용자는 응답과 함께 업데이트되는 0으로 초기화된 프로필을 받습니다. 누락된 L1 조정은 0으로 기본 설정됩니다 (조정 없음).

- **성능 고려사항**: 피셔 정보 계산은 후보 문항을 반복해야 합니다. 대규모 문항 풀(1000개 이상 문항)의 경우 최적화 전에 대략적인 난이도 범위로 후보를 사전 필터링하는 것을 고려하세요.

---

### 기술 개념 (Technical Concepts - Plain English)

#### 맥락 의존적 난이도 매개변수 (Context-Dependent Difficulty Parameters)

**기술적 정의**: 과제 형식, 양식, 시간 제약 및 학습자 특성의 함수로 변하는 IRT의 문항 난이도 매개변수로, 로짓 스케일의 기본 난이도 값에 가산 조정으로 구현됩니다.

**쉬운 설명**: 단어가 산과 같다고 상상해 보세요. "높이"(난이도)는 고정되어 있지 않습니다 - 어떻게 등반하느냐에 따라 달라집니다. 등산로를 걸어 올라가는 것(읽기)은 암벽 등반(말하기)보다 쉽습니다. 시간 제한을 추가하면 더 어려워집니다. 익숙하지 않은 장비를 들고 있다면(익숙하지 않은 L1 소리) 더 어려워집니다. 이 모듈은 이 모든 요인을 더하여 "유효 높이"를 계산합니다.

**사용 이유**: 단어당 하나의 난이도 숫자로는 충분하지 않습니다. "Psychology"는 조용히 읽기에는 매우 쉽지만 시간 압박 하에서 올바르게 발음하기는 어렵습니다. 맥락 조정 없이는 학습자를 쉬운 과제로 지루하게 하거나 불가능한 과제로 좌절시킬 것입니다.

#### 다차원 IRT (Multidimensional IRT, MIRT)

**기술적 정의**: 다른 기술 차원에 대해 별도의 능력 매개변수(세타)를 추정하는 단차원 문항반응이론의 확장으로, 문항이 각 차원에 다르게 적재될 수 있게 합니다.

**쉬운 설명**: "발음 능력이 10점 만점에 7점"이라고 말하는 대신 "읽기-발음은 8점, 말하기-발음은 5점, 알파벳 디코딩은 9점, 음절 인식은 6점, 전체 단어 유창성은 4점"이라고 말합니다. 이 상세한 프로필은 강한 곳과 연습이 필요한 곳을 보여줍니다.

**사용 이유**: 발음은 하나의 기술이 아닙니다 - 많은 관련 기술입니다. 누군가 개별 문자를 디코딩하는 데는 뛰어나지만 음절 강세 패턴에서 어려움을 겪을 수 있습니다. 단일 세타는 이 구분을 숨길 것입니다.

#### G2P 레이어 계층 (알파벳, 음절, 단어)

**기술적 정의**: 학습자가 개별 문자 디코딩(알파벳)에서 음절 패턴 인식을 거쳐 전체 단어 철자 표현까지 자소-음소 매핑 정밀도의 단계를 통해 진행하는 읽기 습득의 발달 모델.

**쉬운 설명**: 단어 발음을 배우는 것은 악보 읽기를 배우는 것과 같습니다:

- **알파벳 단계**: 개별 음표를 식별할 수 있음 (문자 = 소리)
- **음절 단계**: 일반적인 음표 패턴과 화음을 인식함 (문자 조합 = 소리 패턴)
- **단어 단계**: 개별 음표에 대해 생각하지 않고 전체 악절을 시창함 (전체 단어 = 자동 발음)

대부분의 성인 언어 학습자는 음절 및 단어 수준에서 작업이 필요하지만 일부는 알파벳 복습의 혜택을 받습니다.

**사용 이유**: 음절 패턴을 숙달하지 못한 사람에게 단어 수준 유창성을 가르치는 것은 악기를 조율할 수 없는 사람에게 기타 코드를 가르치는 것과 같습니다. 레이어 계층은 지시가 학습자의 현재 수준에 맞도록 보장합니다.

#### 피셔 정보 기반 문항 선택 (Fisher Information-Based Item Selection)

**기술적 정의**: 현재 능력 추정에서 평가된 피셔 정보 함수를 최대화하기 위해 다음 문항을 선택하는 적응형 테스트 전략으로, 가능한 가장 적은 문항으로 세타 추정의 표준 오차를 최소화합니다.

**쉬운 설명**: 줄자 없이 누군가의 키를 알아내려고 한다고 상상해 보세요. "5피트보다 큰가요?"라고 물을 수 있습니다. 예라면, "6피트보다 큰가요?" 아니라면, "5피트 6인치보다 큰가요?" 각 질문은 불확실성을 절반으로 줄입니다. 피셔 정보는 그 사람에 대해 이미 알고 있는 것을 바탕으로 어떤 질문(어떤 연습 문항)이 불확실성을 가장 많이 줄일지 알려줍니다.

**사용 이유**: 효율적인 평가는 더 빠른 학습을 의미합니다. 학습자가 중급 수준이라는 것을 이미 알고 있다면 초급 단어를 보여주는 것은 그들의 능력에 대해 아무것도 가르쳐주지 않습니다. 피셔 정보 최대화는 모든 연습 문항이 최대 진단 가치를 제공하도록 보장합니다.

#### L1별 난이도 조정 (L1-Specific Difficulty Adjustments)

**기술적 정의**: 학습자의 모국어(L1)와 목표 언어(L2) 간의 대조적 음운론적 분석을 기반으로 한 문항 난이도 매개변수에 대한 가산 수정으로, 예측된 전이 간섭을 반영합니다.

**쉬운 설명**: 첫 번째 언어는 새로운 소리에 도움이 되거나 방해가 되는 "발음 습관"을 만듭니다. 일본어 화자는 일본어에 둘 다 없기 때문에 자연스럽게 "r" 대 "l"에서 어려움을 겪습니다 - 그 사이의 소리가 있습니다. 한국어 화자는 한국어에 "f" 소리가 없기 때문에 "f" 소리에서 어려움을 겪습니다. 우리는 이러한 어려움을 예측하고 그에 따라 단어 난이도를 조정합니다 - "f"가 있는 단어는 한국어 화자에게 스페인어 화자보다 더 어렵습니다.

**사용 이유**: 모든 학습자를 동일하게 취급하는 것은 발음 난이도의 주요 요인을 무시합니다. L1 조정은 LOGOS가 언어적 배경에 관계없이 동등하게 적절한 도전을 제공할 수 있게 합니다.

#### EAP 유사 업데이트를 통한 세타 추정 (Theta Estimation via EAP-like Updates)

**기술적 정의**: 각 응답 후 전체 사후 분포 계산 없이 온라인 학습을 허용하는, 사후 기대치 추정을 근사하는 가중 예측 오류 업데이트를 사용한 점진적 능력 추정.

**쉬운 설명**: 단어를 발음하려고 시도한 후 우리는 능력 추정을 업데이트합니다. 맞았고 어려웠다면 점수가 많이 올라갑니다. 틀렸고 쉬웠다면 점수가 내려갑니다. 이것은 코치가 선수에 대한 평가를 업데이트하는 방식과 같습니다 - 하나의 쉬운 슛 실패는 우려스럽고, 하나의 어려운 슛 실패는 예상됩니다.

**사용 이유**: 모든 응답 후 전체 베이지안 추정은 계산 비용이 많이 듭니다. 이러한 경량 업데이트는 시스템을 응답성 있게 유지하면서 좋은 근사를 제공합니다.

---

### 주요 데이터 구조 (Key Data Structures)

#### G2PIRTParameters

G2P 언어 분석과 IRT 심리측정 매개변수를 결합하는 핵심 구조:

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 고유 문항 식별자 |
| `content` | string | 단어 또는 패턴 |
| `baseDifficulty` | number | 로짓 스케일의 IRT b 매개변수 |
| `discrimination` | number | IRT a 매개변수 (문항이 능력을 얼마나 잘 구별하는지) |
| `guessing` | number | IRT c 매개변수 (MCQ 과제용) |
| `contextAdjustments` | object | 양식, 과제 유형, 시간, 레이어별 수정자 |
| `layerThresholds` | object | 각 G2P 레이어에서 필요한 최소 세타 |
| `l1Adjustments` | Record | 언어별 난이도 수정자 |
| `g2pAnalysis` | G2PDifficulty | 원래 언어 분석 |

#### G2PThetaProfile

별도의 세타를 추적하는 다차원 능력 프로필:

**전체:**

- `thetaPhonological` - 전체 음운론적 능력

**레이어별:**

- `thetaAlphabetic` - 문자-소리 대응
- `thetaSyllable` - 음절 패턴 인식
- `thetaWord` - 전체 단어 인식

**양식별:**

- `thetaReading` - 시각/무음 발음
- `thetaListening` - 청각 이해
- `thetaSpeaking` - 구두 생산
- `thetaWriting` - 철자 생산

각 세타는 더 많은 응답과 함께 감소하는 관련 표준 오차를 가집니다.

#### DEFAULT_CONTEXT_ADJUSTMENTS

경험적으로 도출된 난이도 수정자:

| 맥락 | 조정 | 근거 |
|------|------|------|
| **양식** | | |
| 읽기 | +0.0 | 기준선 |
| 듣기 | +0.3 | 청각 처리가 부하를 추가 |
| 말하기 | +0.6 | 생산이 수용보다 어려움 |
| 쓰기 | +0.4 | 철자 생산이 적당히 더 어려움 |
| **과제 유형** | | |
| 인식 | +0.0 | 기준선 |
| 생산 | +0.5 | 생성이 선택보다 어려움 |
| **시간** | | |
| 시간 제한 없음 | +0.0 | 기준선 |
| 시간 제한 | +0.3 | 시간 압박이 난이도 추가 |
| **레이어** | | |
| 알파벳 | +0.0 | 기준선 (가장 단순한 수준) |
| 음절 | +0.2 | 패턴 복잡성 |
| 단어 | +0.4 | 전체 통합 필요 |

#### L1_DIFFICULTY_ADJUSTMENTS

언어별 전이 난이도:

| L1 | 패턴 | 조정 | 이유 |
|----|------|------|------|
| 한국어 | th_sound | +0.5 | /th/가 한국어 목록에 없음 |
| 한국어 | r_l_distinction | +0.4 | 이음이지 음소가 아님 |
| 한국어 | final_consonant_clusters | +0.3 | 한국어 음절이 단순하게 끝남 |
| 일본어 | r_l_distinction | +0.5 | 일본어에서 병합됨 |
| 일본어 | v_b_distinction | +0.3 | /v/가 일본어에 없음 |
| 중국어 | final_consonants | +0.4 | 만다린은 거의 종성을 허용하지 않음 |
| 중국어 | consonant_clusters | +0.4 | 만다린에서 자음군이 드묾 |
| 스페인어 | short_long_vowels | +0.3 | 스페인어는 장단 대비가 없음 |
| 스페인어 | initial_s_clusters | +0.3 | 스페인어는 삽입 모음 필요 |

---

### 알고리즘 세부사항 (Algorithm Details)

#### 난이도 변환 (G2P에서 IRT로)

`g2pToIRTParameters()` 함수는 G2P 난이도(0-1 스케일)를 IRT 로짓 스케일로 변환합니다:

1. **클램프** 난이도를 [0.01, 0.99]로 무한대 방지
2. **로짓 변환**: `b = ln(difficulty / (1 - difficulty))`
3. **레이어 임계값 설정**:
   - 알파벳: `baseDifficulty - 1.0`
   - 음절: `baseDifficulty - 0.5` (+ 음절 수에 대한 조정)
   - 단어: `baseDifficulty` (+ 불규칙 패턴에 대한 조정)
4. 오발음 예측에서 **L1 조정 구축**

#### 맥락적 난이도 계산

`getContextualDifficulty()` 함수는 유효 난이도를 계산합니다:

```text
effective_b = base_b
            + modality_adjustment
            + task_type_adjustment
            + timing_adjustment
            + layer_adjustment (if specified)
            + l1_adjustment (if applicable)
```

모든 조정은 로짓 스케일에서 가산적입니다. +0.5 조정은 대략 실패 확률을 두 배로 합니다.

#### 맥락에 대한 세타 선택

`selectThetaForContext()` 함수는 여러 세타 추정을 결합합니다:

1. 전체 음운론적 세타로 시작 (100%)
2. 양식별 세타 방향으로 가중 (40%)
3. 레이어별 세타 방향으로 가중 (30%, 레이어가 지정된 경우)

이것은 특정 과제 맥락에 적합한 혼합 추정을 생성합니다.

#### 프로필 업데이트 알고리즘

`updateG2PThetaProfile()` 함수는 오류 기반 학습을 사용합니다:

1. 정답 응답의 예상 확률 계산
2. 예측 오류 계산: `error = actual - expected`
3. 관련 세타 업데이트: `theta_new = theta_old + learning_rate * error * discrimination`
4. 전체 음운론적 세타를 가중 평균으로 업데이트
5. 응답 수에 따라 표준 오차 감소

학습률(0.1)은 응답성과 안정성의 균형을 맞춥니다.

#### 최적 문항 선택

`selectOptimalG2PItem()` 함수는 피셔 정보를 최대화합니다:

1. 학습자에 대한 맥락 적합 세타 계산
2. 각 후보 문항에 대해:
   - 맥락 조정된 난이도 계산
   - 피셔 정보 계산: `I = a^2 * P * (1-P)`
3. 최대 정보를 가진 문항 선택

정보는 문항 난이도가 학습자 능력과 일치할 때 (P = 0.5) 최대화됩니다.

---

### 사용 패턴 (Usage Patterns)

#### 새 사용자 초기화

```typescript
const profile = createInitialG2PThetaProfile(userId);
// All thetas start at 0, all SEs start at 1.5 (high uncertainty)
```

#### G2P 분석을 IRT 매개변수로 변환

```typescript
const g2pAnalysis = analyzeG2PDifficulty('psychology', 'medical');
const irtParams = g2pToIRTParameters(g2pAnalysis, 1.2); // discrimination = 1.2
```

#### 최적 연습 문항 선택

```typescript
const context: G2PTaskContext = {
  modality: 'speaking',
  taskType: 'production',
  isTimed: true,
  targetLayer: 'word',
  userL1: 'korean'
};

const result = selectOptimalG2PItem(candidateItems, userProfile, context);
// result.item = best item for this learner in this context
// result.information = expected information gain
```

#### 응답 후 프로필 업데이트

```typescript
const response: G2PResponse = {
  itemId: 'word_123',
  correct: true,
  responseTimeMs: 2500,
  context: taskContext,
  itemParams: itemIRTParams
};

const updatedProfile = updateG2PThetaProfile(userProfile, response);
```

#### 단어에 대한 준비도 평가

```typescript
const readiness = assessG2PReadiness(userProfile, wordParams);
// readiness.ready: boolean - can attempt word level?
// readiness.recommendedLayer: 'alphabetic' | 'syllable' | 'word'
// readiness.confidenceLevel: 'low' | 'medium' | 'high'
```

---

### 변경 이력 (Change History)

#### 2026-01-06 - 문서 생성

- **변경 내용**: G2P-IRT 통합 모듈에 대한 포괄적인 내러티브 문서 생성
- **이유**: 맥락 인식 발음 난이도 측정에 대한 팀 이해 가능하게 함
- **영향**: 유지보수성 향상 및 적응형 발음 기능에 대한 온보딩 지원

#### 모듈 생성 - 초기 구현

- **변경 내용**: 맥락 의존적 난이도, 다차원 세타 추적, L1 조정, 피셔 정보 기반 문항 선택을 포함한 완전한 G2P-IRT 통합 구현
- **이유**: 표준 IRT가 발음 난이도의 맥락 의존적 특성을 포착할 수 없었음; 언어 분석과 심리측정 측정을 연결할 필요가 있었음
- **영향**: 과제 유형, 양식, 시간, 학습자 배경 및 음운론적 발달 수준에 맞게 조정되는 진정으로 적응형 발음 연습 가능

---

## 12.4 다중 커리큘럼 관리 모듈 (Multi-Curriculum Management Module)

> **최종 업데이트**: 2026-01-06
> **코드 위치**: `src/core/multi-curriculum.ts`
> **상태**: 활성화

---

### 맥락 및 목적 (Context & Purpose)

이 모듈은 적응형 학습의 근본적인 문제를 해결합니다: **효율성을 희생하지 않고 여러 학습 목표를 동시에 추구하도록 어떻게 도울 것인가?** CELBAN 인증을 준비하는 간호사는 병원 행정을 위한 비즈니스 영어와 계속 교육을 위한 학술 영어도 필요할 수 있습니다. 전통적인 학습 시스템은 사용자에게 한 번에 하나의 목표를 선택하도록 강요하지만, 실제 학습자는 다른 마감 기한과 우선순위를 가진 여러 목표를 저글링합니다.

다중 커리큘럼 모듈은 경쟁하는 학습 목표를 관리하기 위해 **파레토 최적 자원 배분 (Pareto-optimal resource allocation)**을 구현합니다. 임의로 시간을 분할하는 대신, 경제학과 운영 연구의 최적화 기법을 사용하여 다른 목표를 해치지 않고는 어떤 목표도 개선할 수 없는 배분을 찾습니다.

**비즈니스 필요성**: LOGOS는 복잡하고 다면적인 언어 학습 요구를 가진 의료 전문가를 대상으로 합니다. 학습자가 다음을 필요로 할 때 단일 "의료 영어" 커리큘럼으로는 충분하지 않습니다:

- 임상 의사소통 기술 (긴급, 인증 마감일)
- 환자 문서 작성 (지속적인 전문적 필요)
- 연구를 위한 학술 읽기 (장기 경력 개발)

이 모듈은 학습자가 마감일, 우선순위, 목표 간 시너지를 존중하는 지능적인 시간 배분으로 모든 목표를 동시에 추구할 수 있게 합니다.

**사용 시점**:

- 활성 학습 목표 간에 시간을 배분하기 위한 세션 계획 중
- 여러 커리큘럼에 이점이 되는 공유 어휘/객체의 우선순위를 정할 때
- 목표가 일정에 뒤처질 때 진행 추적 및 재균형을 위해
- 관련 학습 도메인 간의 전이 이점을 계산할 때

---

### 미시적 관점: 직접적 관계 (Microscale: Direct Relationships)

#### 의존성 (Dependencies - What This Needs)

이 모듈은 다른 LOGOS 모듈에서 직접 임포트가 없는 **순수 알고리즘 모듈**로 설계되었습니다. 이 격리는 다음을 보장합니다:

- 관심사의 깔끔한 분리 (최적화 로직 vs. 데이터 접근)
- 데이터베이스나 서비스 의존성 없이 테스트 가능
- 다른 맥락에서 잠재적 사용을 위한 이식성

**내부 상수**: 모듈은 자체 최적화 매개변수를 정의합니다:

- `MIN_ALLOCATION = 0.05`: 모든 활성 목표가 최소 5%의 세션 시간을 받도록 보장 (목표 방치 방지)
- `MAX_ALLOCATION = 0.8`: 단일 목표를 80%로 제한 (다각화 보장)
- `PARETO_SAMPLES = 20`: 프론티어 계산을 위한 무작위 배분 샘플 수
- `SYNERGY_MULTIPLIER = 1.5`: 목표 간 공유되는 학습 객체에 대한 보너스 계수
- `DOMAIN_SIMILARITY`: 도메인 쌍 간 유사성 점수 매트릭스 (medical-healthcare: 0.8, medical-science: 0.5 등)

#### 종속 모듈 (Dependents - What Needs This)

- `src/main/services/session-planning.service.ts` (예상): 여러 커리큘럼의 균형을 맞추는 세션 계획을 생성하기 위해 `planMultiGoalSession()` 사용

- `src/main/services/goal-management.service.ts` (예상): `createCurriculumGoal()`, `updateGoalFromSession()`, 진행 추적 함수 사용

- `src/renderer/components/goal/MultiGoalDashboard.tsx` (예상): 목표 균형 및 주의 알림 시각화를 위해 `MultiGoalProgress` 소비

- `src/main/ipc/curriculum.ipc.ts` (예상): 다중 커리큘럼 함수를 렌더러 프로세스에 노출

#### 데이터 흐름 (Data Flow)

```text
User defines goals (targetTheta, deadline, weight)
    |
    v
createCurriculumGoal() --> CurriculumGoal objects
    |
    v
computeParetoFrontier(goals, availableMinutes)
    |
    v
Generate allocation samples --> Evaluate each --> Mark dominated solutions
    |
    v
selectParetoOptimalAllocation(frontier, preference)
    |
    v
planMultiGoalSession() --> MultiGoalSessionPlan
    |                        (time allocation, object sequence)
    v
Session execution --> updateGoalFromSession() --> Updated goals
    |
    v
calculateMultiGoalProgress() --> attentionNeeded alerts
    |
    v
balanceGoalProgress() --> Rebalancing recommendations
```

---

### 거시적 관점: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어 (Architectural Layer)

이 모듈은 IRT, FSRS, Priority 모듈과 함께 **코어 알고리즘 레이어**에 위치합니다:

```text
Layer 1: Renderer (React UI)
    |
    v
Layer 2: Main Process (IPC handlers, services)
    |
    v
Layer 3: Core Algorithms <-- You are here (src/core/multi-curriculum.ts)
    |       |
    |       +-- irt.ts (ability estimation)
    |       +-- fsrs.ts (spaced repetition)
    |       +-- priority.ts (item ordering)
    |       +-- transfer.ts (L1-L2 effects)
    |       +-- multi-curriculum.ts (goal management) <-- NEW
    |
    v
Layer 4: Database (Prisma/SQLite)
```

코어 레이어 내에서 multi-curriculum.ts는 **새로운 최적화 하위 그래프**를 생성합니다:

```text
[User Goals] ----+
                 |
                 v
           multi-curriculum.ts
                 |
    +------------+------------+
    |            |            |
    v            v            v
[Pareto]    [Synergy]    [Transfer]
Optimization  Detection   Analysis
    |            |            |
    +------------+------------+
                 |
                 v
           Session Plan
                 |
                 v
           priority.ts (per-goal item ordering)
```

#### 큰 그림의 영향 (Big Picture Impact)

다중 커리큘럼 모듈은 단일 트랙에서 포트폴리오 기반 학습으로의 **패러다임 전환**을 나타냅니다. 이 아키텍처 추가는 다음을 가능하게 합니다:

1. **목표 포트폴리오 관리**: 사용자가 여러 동시 학습 목표를 정의, 추적, 균형 조정
2. **시너지 활용**: 목표 간 공유 어휘(예: "diagnosis"가 의학 및 학술 커리큘럼 모두에 나타남)를 식별하고 최대 효율성을 위해 우선순위 지정
3. **마감일 인식 배분**: 마감일이 다가오는 목표가 자동으로 더 많은 관심을 받음
4. **전이 최대화**: 한 목표의 진행이 지식 전이를 통해 관련 목표를 향상시킬 수 있음

**시스템 종속성**:

- **세션 계획**: 전체 세션 생성 파이프라인이 다중 목표 배분을 통합해야 함
- **진행 추적**: UI 대시보드가 단일 목표 진행뿐만 아니라 포트폴리오 수준 메트릭을 표시해야 함
- **알림 시스템**: 위험에 처한 목표에 대한 주의 알림이 사용자 알림과 통합 필요

#### 임계 경로 분석 (Critical Path Analysis)

**중요도 수준**: 높음 (다중 목표 사용자용)

이 모듈은 **단일 목표 학습자에게는 선택적**이지만 사용자가 여러 활성 커리큘럼을 가질 때 **중요한 인프라**가 됩니다. 이것이 없으면:

- 사용자가 목표 간에 수동으로 전환해야 함 (인지적 오버헤드)
- 공유 어휘 이점 감지 없음 (낭비된 노력)
- 마감일 위험 인식 없음 (놓친 인증 시험)
- 진행 균형 없음 (일부 목표 방치)

**실패 모드**: 이 모듈이 실패하면:

- 폴백: 시스템이 각 목표를 독립적으로 취급 (최적화 손실)
- 영향: 다중 목표 사용자의 학습 효율성 ~20-30% 감소
- 완화: 각 핵심 함수가 빈/잘못된 입력을 우아하게 처리

---

### 주요 타입 설명 (Key Types Explained)

#### CurriculumGoal

**기술적 정의**: 심리측정 매개변수(`targetTheta`, `currentTheta`), 스케줄링 메타데이터(`deadline`, `weight`), 도메인 맥락을 가진 학습 목표의 구조화된 표현.

**쉬운 설명**: CurriculumGoal을 명확한 결승선이 있는 "학습 프로젝트"로 생각하세요. 다음을 알고 있습니다:

- 어디에 도달하려고 하는지 (targetTheta: 원하는 숙련도 수준)
- 지금 어디에 있는지 (currentTheta: 현재 숙련도)
- 언제까지 완료해야 하는지 (deadline: 인증 시험 날짜처럼)
- 이것이 얼마나 중요한지 (weight: 목표 중 0-1 우선순위)
- 어떤 종류의 지식이 관련되는지 (domain: medical, legal, business 등)

#### ParetoSolution

**기술적 정의**: 어떤 목표의 예상 진행을 개선하면 반드시 다른 목표의 진행을 줄이는 비지배 해를 나타내는 배분 공간의 점. 합이 1.0인 배분 비율과 효율성/위험 메트릭 포함.

**쉬운 설명**: 60분의 학습 세션과 세 가지 목표가 있다고 상상해 보세요. ParetoSolution은 그 시간을 나누는 한 가지 특정 방법입니다 (예: 목표 A에 30분, B에 20분, C에 10분). 이것이 특별한 이유는 **효율적**이기 때문입니다 - 모든 목표를 동시에 더 좋게 만드는 다른 분할이 없습니다. 목표 B에 더 많은 시간을 줄 수 있지만 A나 C에서 빼야만 합니다. 파레토 프론티어는 이러한 모든 "한꺼번에 모든 것을 개선할 수 없는" 해의 집합입니다.

#### SharedObject

**기술적 정의**: 다중 목표 관련성에 기반한 계산된 시너지 보너스와 함께 여러 커리큘럼에 나타나는 학습 객체(어휘, 문법 패턴 등).

**쉬운 설명**: 일부 어휘 항목은 "멀티태스커"입니다 - "diagnosis"라는 단어를 배우면 의학 영어와 학술 읽기와 전문 문서화에 도움이 됩니다. SharedObjects는 이러한 고가치 항목을 추적하고 **시너지 보너스**를 계산합니다 - 본질적으로 "이 단어는 한 번 배우면 세 곳에서 도움이 되기 때문에 추가 가치가 있다"고 말합니다.

#### MultiGoalSessionPlan

**기술적 정의**: 목표별 시간 배분, 공유 객체 우선순위가 있는 정렬된 객체 시퀀스, 예상 결과 예측을 포함하는 완전한 세션 사양.

**쉬운 설명**: 이것은 단일 세션에 대한 "학습 일정"입니다. 다음을 알려줍니다:

- 각 목표에 얼마나 많은 시간을 할애할지 (goalTimeAllocation)
- 어떤 특정 항목을 연습하고 어떤 순서로 할지 (objectSequence)
- 어떤 항목이 여러 목표에 도움이 되는 "보너스" 항목인지 (prioritizedSharedObjects)
- 끝날 때 어떤 진행을 기대할 수 있는지 (expectedOutcomes)

---

### 핵심 함수와 그 관계 (Core Functions and Their Relationships)

#### 파레토 최적화 파이프라인

```text
computeParetoFrontier()
    |
    +-- generateRandomAllocation() ----+
    +-- generateEqualAllocation() -----+--> evaluateAllocation()
    +-- generateDeadlineWeightedAllocation() --+--> ParetoSolution[]
    +-- generateProgressWeightedAllocation() --+
    |
    v
markDominatedSolutions() --> Filter dominated solutions
    |
    v
selectParetoOptimalAllocation(frontier, preference)
    |
    +-- selectMostBalanced() ----+
    +-- selectLowestRisk() ------+--> Single optimal ParetoSolution
    +-- selectMaxProgress() -----+
    +-- selectMaxEfficiency() ---+
    +-- selectByCustomWeights() -+
```

**computeParetoFrontier()**: 최적화의 핵심. 여러 후보 배분(무작위 샘플과 균등 분할, 마감일 가중, 진행 가중과 같은 전략적 배분)을 생성하고, 각각을 예상 진행에 대해 평가하고, 지배된 해를 표시하여 파레토 프론티어를 식별합니다.

**selectParetoOptimalAllocation()**: 사용자 선호도에 따라 프론티어에서 하나의 해를 선택합니다:

- `balanced`: 목표 간 진행의 분산 최소화
- `deadline_focused`: 마감일 누락 위험 최소화
- `progress_focused`: 균형에 관계없이 총 진행 최대화
- `synergy_focused`: 공유 객체를 통한 효율성 최대화
- `custom`: 사용자 정의 가중치 적용

#### 진행 및 위험 계산

```text
estimateProgressRate(goal, minutes)
    |
    v
Learning curve model: progress = k * sqrt(t) * adjustments
    |
    v
Expected theta improvement per session
```

```text
calculateDeadlineRisk(goal)
    |
    v
Days remaining --> Required rate --> Compare to baseline --> Sigmoid risk score
    |
    v
Risk: 0 (safe) to 1 (critical)
```

#### 공유 객체 관리

```text
findSharedObjects(objectGoalMap, difficulties, relevance)
    |
    v
For each object in multiple goals:
    - Calculate per-goal benefit
    - Apply synergy bonus (1.5x multiplier)
    - Calculate priority boost
    |
    v
prioritizeWithMultiGoalBenefit(objects, activeGoals, userTheta)
    |
    v
Sort by: weightedBenefit * difficultyMatch * (1 + priorityBoost)
```

#### 전이 분석

```text
calculateGoalTransfers(goals, sharedObjects)
    |
    v
For each goal pair:
    - Count shared objects
    - Calculate domain similarity
    - Compute transfer coefficient
    |
    v
estimateTransferBenefit(goalId, transfers, progressDeltas)
    |
    v
Sum: sourceProgress * transferCoefficient for all incoming transfers
```

---

### 학술적 기초 (Academic Foundations)

#### 파레토 최적화 (다목적 최적화)

**기술적 정의**: 경제학자 빌프레도 파레토의 이름을 딴 파레토 최적성은 다른 목표를 악화시키지 않고는 어떤 목표도 개선할 수 없는 상태를 정의합니다. 파레토 프론티어(또는 파레토 프런트)는 다목적 최적화 문제에서 모든 비지배 해의 집합입니다.

**쉬운 설명**: 다른 폰을 선택한다고 상상해 보세요 - 일부는 더 좋은 카메라를, 일부는 더 좋은 배터리 수명을, 일부는 더 좋은 가격을 가지고 있습니다. 폰이 "파레토 최적"이라면 세 가지 범주 모두에서 더 좋은 다른 폰이 없습니다. "프론티어"는 이러한 모든 "모든 면에서 이길 수 없는" 옵션의 모음입니다. 학습에서 우리의 목표는 각 목표에 대한 진행이고, 다른 목표를 해치지 않고는 한 목표를 개선할 수 없는 배분을 원합니다.

**사용 이유**: 다중 목표 학습은 본질적으로 다목적 문제입니다. 단순히 "모든 것을 최대화"할 수 없습니다 - 목표 A에 더 많은 시간은 목표 B에 더 적은 시간을 의미합니다. 파레토 최적화는 트레이드오프를 탐색하고 효율적인 배분을 선택하는 원칙적인 방법을 제공합니다.

**학술 참조**: Miettinen, K. (1999). *Nonlinear Multiobjective Optimization*. Springer.

#### 커리큘럼 학습 (Curriculum Learning)

**기술적 정의**: 훈련 예제가 무작위가 아닌 의미 있는 순서(일반적으로 쉬운 것에서 어려운 것으로)로 제시되어 학습 효율성과 최종 성능을 향상시키는 기계 학습 패러다임.

**쉬운 설명**: 교사가 산술 전에 미적분을 던지지 않는 것처럼 커리큘럼 학습은 전략적 순서로 자료를 제시합니다. LOGOS의 다중 커리큘럼 모듈은 이를 인터리브되고 균형을 맞춰야 하는 **여러 병렬 커리큘럼**으로 확장합니다.

**학술 참조**: Narvekar, S., Peng, B., Leonetti, M., Sinapov, J., Taylor, M. E., & Stone, P. (2020). Curriculum Learning for Reinforcement Learning Domains: A Framework and Survey. *Journal of Machine Learning Research*, 21(181), 1-50.

#### 학습 곡선 이론 (Learning Curve Theory)

**기술적 정의**: 성능이 연습의 함수로 어떻게 향상되는지 설명하는 모델로, 일반적으로 거듭제곱 법칙(performance = k * practice^a) 또는 오류율의 지수 감쇠를 따릅니다.

**쉬운 설명**: 연습할수록 더 잘하게 됩니다 - 하지만 선형적이지 않습니다. 초기 연습은 큰 이득을, 후기 연습은 더 작은 개선을 줍니다. `estimateProgressRate()` 함수는 제곱근 모델을 사용합니다: `progress = baseRate * sqrt(minutes)`, 수확 체감을 포착합니다.

**사용 이유**: 할당된 시간이 주어졌을 때 학습자가 얼마나 진행할지 예측하여 다른 배분 전략을 비교할 수 있게 합니다.

#### 실러버스 프레임워크 (Syllabus Framework, RLJ 2025)

**기술적 정의**: 커리큘럼 구조를 콘텐츠와 분리하여 학습 경로의 유연한 구성을 가능하게 하는 커리큘럼 학습 시스템 설계를 위한 모듈형 프레임워크.

**쉬운 설명**: 수업 계획을 위한 템플릿 시스템처럼 생각하세요. 프레임워크는 가르칠 정확한 콘텐츠를 지정하지 않고 "목표, 시퀀스, 종속성을 조직하는 방법"을 말합니다. 이 모듈은 그 프레임워크의 "목표 관리" 부분을 구현합니다.

**사용 이유**: 임시 구현보다 커리큘럼 시스템을 위한 원칙적인 설계 패턴을 제공합니다.

---

### 기술 개념 (Technical Concepts - Plain English)

#### 파레토 프론티어 (Pareto Frontier)

**기술적 정의**: 다목적 최적화 문제에서 모든 비지배 해의 집합으로, 최적 트레이드오프 표면을 나타냅니다.

**쉬운 설명**: 휴가를 계획하고 비용, 기간, 목적지 품질을 고려한다면, 파레토 프론티어는 다른 요인을 희생하지 않고는 한 요인을 개선할 수 없는 모든 여행입니다. 평범한 곳으로의 저렴하고 짧은 여행이 프론티어에 있을 수 있고, 놀라운 곳으로의 비싸고 긴 여행도 있을 수 있습니다. 각각이 어떤 면에서는 더 좋기 때문에 어느 쪽도 다른 쪽을 "지배"하지 않습니다.

**사용 이유**: 학습 시간 배분은 다른 목표에 대한 진행을 트레이드오프하는 것을 포함합니다. 프론티어는 시간을 나누는 모든 "효율적인" 방법을 보여줍니다.

#### 비지배 해 (Non-Dominated Solution)

**기술적 정의**: 해 S는 모든 목표에서 최소한 동등하고 최소 하나에서 엄격하게 더 좋은 다른 해 S'가 존재하지 않으면 비지배입니다.

**쉬운 설명**: 해 A는 최소 하나의 목표에서 A가 더 좋고 어떤 목표에서도 나쁘지 않으면 해 B를 "지배"합니다. A가 의학 영어에서 더 많은 진행을 주고 학술 영어에서 같은 진행을 주면 A가 B를 지배합니다. 비지배 해는 이런 일이 절대 일어나지 않는 것들입니다 - 효율적인 프론티어에 있습니다.

**사용 이유**: 지배된 해는 엄격히 낭비적이기 때문에 필터링합니다 - 항상 더 좋은 옵션이 있습니다.

#### 시너지 보너스 (Synergy Bonus)

**기술적 정의**: 단일 노출 다중 목표 진행의 승수적 가치를 반영하여 여러 커리큘럼에 나타나는 학습 객체에 적용되는 추가 이점 계수.

**쉬운 설명**: "prescription"이라는 단어를 한 번 배우면 의료 커뮤니케이션, 환자 문서화, 약국 어휘에 도움이 됩니다. 세 가지 목표를 위해 세 번 배우는 대신 한 번 배웁니다. 시너지 보너스(추가 목표당 1.5배 승수)는 이 효율성 이득을 포착합니다.

**사용 이유**: 여러 목표를 동시에 진전시키는 "높은 레버리지" 어휘의 우선순위를 정하여 학습 효율성을 극대화합니다.

#### 전이 계수 (목표 간) (Transfer Coefficient - Inter-Goal)

**기술적 정의**: 공유 콘텐츠와 도메인 유사성에 기반하여 한 학습 목표의 진행이 다른 목표에 이점을 주는 정도를 나타내는 0과 1 사이의 값.

**쉬운 설명**: 의학 영어와 비즈니스 영어를 배우고 있다면 일부 어휘를 공유합니다 ("appointment", "schedule", "report"). 하나에 대한 진행이 부분적으로 다른 것에 도움이 됩니다. 전이 계수는 얼마나 많은지를 측정합니다: 0은 도움 없음, 1은 완벽한 중복을 의미합니다.

**사용 이유**: 한 도메인에서의 학습이 다른 것을 도울 때 "무료 진행"을 고려하여 진행 예측을 개선합니다.

#### 마감일 위험 점수 (Deadline Risk Score)

**기술적 정의**: 현재 진행률이 주어졌을 때 목표가 마감일을 놓칠 확률을 나타내는 시그모이드 매핑된 0과 1 사이의 값으로, 1 / (1 + e^(-2*(requiredRate/baselineRate - 1)))로 계산됩니다.

**쉬운 설명**: 시험까지 30일이 남았고 70% 완료했다면 아마 안전합니다. 7일이 남았고 20% 완료했다면 문제가 있습니다. 마감일 위험 점수는 이를 0-1 숫자로 변환합니다: 0은 "순조로움," 1은 "거의 확실히 놓칠 것"을 의미합니다.

**사용 이유**: 위험에 처한 목표에 대한 배분을 자동으로 높이고 "주의 필요" 알림을 생성합니다.

#### 균형 점수 (Balance Score)

**기술적 정의**: 진행이 목표 간에 얼마나 균등하게 분포되어 있는지를 측정하는 정규화된 메트릭(1 마이너스 스케일된 표준 편차)으로, 1은 완벽한 균형, 0은 극단적인 불균형을 나타냅니다.

**쉬운 설명**: 세 가지 목표가 80%, 75%, 70% 진행이라면 잘 균형 잡혀 있습니다. 90%, 50%, 10%라면 불균형합니다. 균형 점수는 이를 포트폴리오 건강을 추적하기 위한 단일 숫자로 포착합니다.

**사용 이유**: 하나를 완료하기 전에 다른 것을 시작하기보다 모든 목표에 걸쳐 꾸준한 진행을 선호하는 학습자를 돕습니다.

---

### 변경 이력 (Change History)

#### 2026-01-06 - 문서 생성

- **변경 내용**: 다중 커리큘럼 모듈에 대한 초기 내러티브 문서
- **이유**: Shadow 문서화 시스템 구현
- **영향**: 모든 팀원이 다중 목표 학습 시스템을 이해할 수 있게 함

#### 초기 구현 - 모듈 생성

- **변경 내용**: 다음을 포함하는 완전한 다중 커리큘럼 관리 시스템 생성:
  - 학습 목표를 나타내는 `CurriculumGoal` 타입
  - 배분 옵션을 위한 `ParetoSolution` 타입
  - 시너지 추적을 위한 `SharedObject` 타입
  - 세션 생성을 위한 `MultiGoalSessionPlan` 타입
  - 여러 배분 전략으로 파레토 프론티어 계산
  - 공유 객체 감지 및 우선순위 지정
  - 마감일 위험 분석과 함께 진행 추적
  - 목표 간 전이 이점 계산
  - 목표 생애주기 관리를 위한 유틸리티 함수
- **이유**: 지능적인 자원 배분으로 여러 학습 목표의 동시 추구 가능하게 함
- **영향**: 포트폴리오 기반 학습 접근 방식 잠금 해제, 단일 트랙 언어 학습 애플리케이션과 LOGOS 차별화

---

### 개발자를 위한 통합 노트 (Integration Notes for Developers)

#### 새 배분 전략 추가

새 배분 생성 방법(예: "topic-coverage-weighted")을 추가하려면:

1. 패턴을 따라 새 생성기 함수 생성:

   ```typescript
   function generateTopicWeightedAllocation(goals: CurriculumGoal[]): Record<string, number>
   ```

2. `computeParetoFrontier()`에 배분 추가:

   ```typescript
   solutions.push(evaluateAllocation(goals, generateTopicWeightedAllocation(goals), availableMinutes));
   ```

3. 사용자가 이 전략을 직접 선택할 수 있어야 하는 경우 선택적으로 새 `AllocationPreference` 타입 값 추가.

#### 데이터베이스 연결

모듈은 설계상 순수 TypeScript입니다. 목표와 진행을 영구화하려면:

1. `CurriculumGoal`에 대한 CRUD 작업으로 `src/main/db/repositories/curriculum.repository.ts` 생성
2. 리포지토리 접근을 코어 모듈 함수와 결합하는 서비스 레이어 (`src/main/services/curriculum.service.ts`) 생성
3. `src/main/ipc/curriculum.ipc.ts`에서 IPC 핸들러를 통해 노출

#### 성능 고려사항

- `computeParetoFrontier()`는 O(n * PARETO_SAMPLES)로 스케일링됩니다 (n은 목표 수)
- >10 목표의 경우 PARETO_SAMPLES를 줄이거나 더 스마트한 샘플링 구현 고려
- `findSharedObjects()`는 O(objects * goals)입니다 - 대규모 객체 세트에 대해 캐싱 고려
- 진행 계산은 경량(O(goals))이며 실시간 UI 업데이트에 안전

---

## 12.5 동적 코퍼스 소싱 모듈 (Dynamic Corpus Sourcing Module)

> **최종 업데이트**: 2026-01-06
> **코드 위치**: `src/core/dynamic-corpus.ts`
> **상태**: 활성화

---

### 맥락 및 목적 (Context & Purpose)

이 모듈은 정적 어휘 목록과 실제 언어 사용의 풍부하고 살아있는 세계 사이의 격차를 메우기 위해 존재합니다. 언어 학습 애플리케이션은 전통적으로 사전 패키지된 단어 목록을 제공하지만, 언어 자체는 도메인, 레지스터, 맥락에 걸쳐 끊임없이 진화합니다. 동적 코퍼스 모듈은 LOGOS가 런타임에 외부 코퍼스 API에 접근하여 학습자의 특정 목표에 맞는 어휘를 추출할 수 있게 하여 이 근본적인 한계를 해결합니다.

**비즈니스/사용자 필요성**: CELBAN 시험을 준비하는 간호사는 일반적인 단어 목록이 아닌 실제 의료 문서에 나타나는 의학 용어가 필요합니다. 이민 실무를 위해 공부하는 변호사는 이민법 맥락에서 실제 빈도에 따라 가중치가 부여된 법률 어휘가 필요합니다. 이 모듈은 하나의 크기가 모든 것에 맞는 정적 데이터에만 의존하는 대신 도메인 관련 어휘를 동적으로 소싱하여 LOGOS가 전문 학습자를 서비스할 수 있게 합니다.

**사용 시점**:

- 새 학습 목표가 생성될 때 (초기 어휘 채우기)
- 사용자가 특정 도메인이나 맥락에 대한 어휘를 요청할 때
- 시스템이 기존 어휘를 코퍼스 검증 항목으로 보충해야 할 때
- 메인 코퍼스 파이프라인 서비스가 API 실패를 만날 때 폴백 데이터 소스로

---

### 학술적 기초 (Academic Foundations)

#### 코퍼스 언어학 원칙

모듈은 확립된 코퍼스 언어학 연구에 기반하며, 다음의 원칙을 구현합니다:

**COCA (현대 미국 영어 코퍼스)**: 가장 큰 무료 미국 영어 코퍼스(10억+ 단어)인 COCA는 다섯 가지 장르에 걸쳐 빈도 데이터를 제공합니다: 구어, 소설, 대중 잡지, 신문, 학술 텍스트. 이 모듈의 설계는 COCA의 장르 인식 접근 방식을 반영하여 어휘 추출이 도메인 맥락으로 필터링될 수 있게 합니다.

**OPUS 병렬 코퍼스**: 다국어 병렬 코퍼스 프로젝트인 OPUS는 많은 언어에 걸쳐 정렬된 텍스트를 제공합니다. 모듈의 여러 언어 지원과 교차 언어 분석은 OPUS의 아키텍처에서 영감을 받았습니다.

**Sinclair의 코퍼스 언어학 (1991)**: John Sinclair의 기초 작업은 어휘 선택이 직관이 아닌 실제 사용 패턴에 기반한 *원칙적*이어야 한다고 확립했습니다. 모듈은 임의의 단어 목록보다 빈도 가중, 도메인 관련 어휘를 우선시하여 이를 구현합니다.

**연어 분석**: `CollocationData` 타입과 연어 추출은 Church & Hanks (1990)가 개척하고 후속 코퍼스 언어학 연구에서 정제된 상호 정보(Mutual Information, MI) 및 t-점수와 같은 메트릭을 사용하여 단어 연관 강도를 측정하는 전통을 따릅니다.

---

### 미시적 관점: 직접적 관계 (Microscale: Direct Relationships)

#### 의존성 (Dependencies - What This Needs)

이 모듈은 **순수**하게 설계되었지만 (코어 레이어 내 외부 의존성 없음), 서비스 레이어가 구현하는 인터페이스를 정의합니다:

- **코어 내 없음**: 코어 모듈로서 순수 함수와 타입 정의만 포함합니다. 모든 I/O 작업은 소비자가 처리합니다.

#### 종속 모듈 (Dependents - What Needs This)

- `src/main/services/corpus-sources/corpus-pipeline.service.ts`: 여러 소스에 걸쳐 어휘 채우기를 조정하기 위해 이러한 타입과 함수를 사용하는 메인 오케스트레이션 서비스
- `src/main/services/corpus-sources/registry.ts`: 추가 소스 유형과 접근 방법으로 `CorpusSource` 개념 확장
- `src/main/services/corpus-sources/filter.ts`: 목표에 적절한 소스를 필터링하기 위해 도메인 및 양식 정보 사용
- `src/main/services/pmi.service.ts`: PMI (점별 상호 정보) 점수와 연어를 계산하기 위해 `ExtractedItem` 데이터 소비
- `src/core/priority.ts`: 학습 우선순위 점수를 계산하기 위해 추출된 항목의 빈도 및 도메인 관련성 데이터 사용
- `src/core/types.ts`: `LanguageObject` 타입은 `corpusItemToLanguageObject()` 변환 함수를 통해 `ExtractedItem`과 정렬

#### 데이터 흐름 (Data Flow)

```text
User creates learning goal
    |
    v
Goal specification (domain, modality, benchmark)
    |
    v
[queryCorpus] --> Check cache --> If cached, return immediately
    |                                   |
    | (cache miss)                      |
    v                                   |
[getAvailableSources] --> Filter sources by domain/language
    |
    v
[querySource] --> Dispatch by source type (API/embedded/file)
    |
    +--> API sources: [queryAPISource] --> HTTP requests --> Parse response
    |
    +--> Embedded sources: [queryEmbeddedCorpus] --> Filter static data
    |
    v
[CorpusResult] with ExtractedItems
    |
    v
Cache result --> Return to caller
    |
    v
[corpusItemToLanguageObject] --> Convert to LOGOS internal format
    |
    v
Store in database via corpus-pipeline.service
```

---

### 거시적 관점: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어 (Architectural Layer)

이 모듈은 LOGOS의 3계층 아키텍처의 **코어 레이어**에 위치합니다:

- **레이어 1 (렌더러)**: UI 컴포넌트가 어휘와 학습 콘텐츠 표시
- **레이어 2 (코어)**: **이 모듈** - 코퍼스 상호작용을 위한 순수 알고리즘과 타입 정의
- **레이어 3 (메인/서비스)**: `corpus-pipeline.service.ts`가 실제 API 호출과 데이터베이스 작업 조정

모듈은 LOGOS의 엄격한 관심사 분리를 따릅니다: 코어 모듈은 부작용이나 I/O가 없는 순수 함수만 포함합니다. 실제 API 호출, 캐싱 영속성, 데이터베이스 쓰기는 서비스 레이어에 위임됩니다.

#### 큰 그림의 영향 (Big Picture Impact)

**어휘 채우기 파이프라인**: 이 모듈은 LOGOS가 어휘를 이해하고 소싱하는 방법의 **개념적 기초**입니다. 이것이 없으면 LOGOS는 개별 학습자 목표에 적응할 수 없는 정적, 사전 패키지된 단어 목록으로 제한됩니다.

**도메인별 학습**: 모듈은 적절한 빈도와 난이도 가중으로 도메인(의학, 법률, 기술)별로 어휘를 필터링할 수 있게 하여 전문 언어 학습자(간호사, 변호사, 엔지니어)를 위한 LOGOS의 핵심 가치 제안을 가능하게 합니다.

**우아한 성능 저하**: 내장 어휘 폴백(`EMBEDDED_VOCABULARY` 상수)은 외부 API가 사용 불가능할 때도 시스템이 빈 결과를 반환하지 않도록 보장합니다. 이것은 오프라인 사용과 API 속도 제한 시나리오에 중요합니다.

#### 시스템 종속성 (System Dependencies)

**중요도 수준**: 높음 (인프라)

이것은 목표 기반 학습 패러다임을 가능하게 하는 **기초 구성요소**입니다:

1. **목표 생성 흐름**: 사용자가 새 학습 목표를 생성할 때 코퍼스 파이프라인 서비스가 이 함수들을 사용하여 초기 어휘 채우기
2. **우선순위 계산**: 학습 대기열 순서를 결정하는 FRE (빈도, 관계적, 맥락적) 메트릭은 이 모듈을 통해 소싱된 빈도 및 도메인 관련성 데이터에 의존
3. **IRT 보정**: 문항 난이도 매개변수(`irtDifficulty`)는 적응형 테스트 시스템에 공급되는 빈도 및 도메인 데이터에서 추정

**실패 시**:

- 새 목표에 채울 어휘가 없음
- 우선순위 계산에 빈도 데이터 부족
- 시스템이 내장 데이터로 폴백 (제한적이지만 기능적)

---

### 주요 타입 설명 (Key Types Explained)

#### CorpusSource

**기술적 정의**: 연결 세부사항, 지원 도메인/언어, 속도 제한, 가용성 상태를 포함하여 외부 코퍼스 제공자의 구성을 정의하는 인터페이스.

**쉬운 설명**: 이것을 어휘 소스에 대한 "주소 카드"로 생각하세요. 다른 도서관에 대한 연락처 정보(시간, 위치, 어떤 책을 가지고 있는지)가 있듯이, `CorpusSource`는 어휘 제공자에게 어떻게 연락하는지, 어떤 언어와 도메인을 다루는지, 현재 영업 중인지를 설명합니다.

**사용 이유**: LOGOS는 여러 어휘 소스(COCA, OPUS, 내장 데이터)를 쿼리하고 각 학습 목표에 가장 좋은 것을 선택해야 합니다. 이 타입은 소스를 설명하고 비교하는 방법을 표준화합니다.

```typescript
interface CorpusSource {
  id: string;                    // Unique identifier ("coca", "opus", "embedded_medical")
  name: string;                  // Human-readable ("Corpus of Contemporary American English")
  type: 'api' | 'file' | 'embedded';  // How to access it
  baseUrl?: string;              // For API sources
  domains: string[];             // What subjects it covers
  languages: string[];           // What languages it supports
  rateLimit?: number;            // API throttling (requests per minute)
  isAvailable: boolean;          // Currently working?
  requiresAuth: boolean;         // Needs API key?
  priority: number;              // Higher = preferred when multiple match
}
```

#### CorpusQuery

**기술적 정의**: 도메인, 난이도 범위, 목표 수, 언어, 품사 필터, 제외 목록을 포함하여 어휘 추출 기준을 지정하는 구조화된 쿼리 객체.

**쉬운 설명**: 이것은 어휘에 대한 "쇼핑 목록"입니다. 사전을 무작위로 돌아다니는 대신, 정확히 필요한 것을 지정합니다: "이미 알고 있는 단어를 제외하고, 내 수준에 너무 어렵지 않은, 영어로 된 50개의 의학 명사와 동사를 주세요."

**사용 이유**: 구조화된 쿼리는 일관되고 재현 가능한 어휘 추출을 가능하게 하고 캐싱을 지원합니다 (동일한 쿼리는 캐시된 결과 반환).

```typescript
interface CorpusQuery {
  domain: string;              // Target subject area ("medical", "legal")
  genre?: string;              // Optional sub-category ("nursing", "contracts")
  minFrequency?: number;       // Only high-frequency words (0-1 scale)
  maxDifficulty?: number;      // Cap on complexity
  targetCount: number;         // How many items to return
  language: string;            // Target language code
  posFilter?: string[];        // Part of speech filter (["noun", "verb"])
  excludeIds?: string[];       // Skip already-known items
  keywords?: string[];         // Search terms for filtering
}
```

#### ExtractedItem

**기술적 정의**: 빈도 통계, 도메인 관련성 점수, 사용 맥락, 연어 데이터로 풍부해진 코퍼스 소스에서 추출된 어휘 항목.

**쉬운 설명**: 이것은 검색에서 돌아오는 "어휘 카드"입니다. 단어 자체뿐만 아니라 그것에 대해 배운 모든 유용한 것들입니다: 얼마나 흔한지, 도메인에 얼마나 관련 있는지, 맥락에서 보여주는 예문, 종종 함께 나타나는 단어들.

**사용 이유**: 원시 단어는 효과적인 언어 학습에 충분하지 않습니다. LOGOS는 우선순위 계산을 위한 빈도 데이터, 과제 생성을 위한 맥락, 관계 매핑을 위한 연어가 필요합니다.

```typescript
interface ExtractedItem {
  content: string;             // The word or phrase itself
  frequency: number;           // How common (0=rare, 1=very common)
  domainRelevance: number;     // How specific to the domain (0-1)
  domain: string;              // Which domain it came from
  pos?: string;                // Part of speech (noun, verb, etc.)
  contexts: string[];          // Example sentences
  collocations: CollocationData[];  // Words that co-occur
  estimatedDifficulty: number; // Learning difficulty estimate (0-1)
  sourceId: string;            // Which corpus provided this
  rawFrequency?: number;       // Absolute count (if available)
}
```

#### CorpusResult

**기술적 정의**: 소스 메타데이터, 추출된 항목, 쿼리 성능 통계를 포함하는 코퍼스 쿼리의 완전한 결과 패키지.

**쉬운 설명**: 이것은 어휘 주문에 대한 "영수증"입니다. 어떤 소스가 요청을 채웠는지, 어떤 항목을 받았는지, 얼마나 걸렸는지, 결과가 캐시(빠름)에서 왔는지 새 쿼리(느림)에서 왔는지 알려줍니다.

**사용 이유**: 어휘 항목 자체 외에도 디버깅, 캐시 관리, 소스 품질 평가를 위한 메타데이터가 필요합니다.

```typescript
interface CorpusResult {
  source: CorpusSource;        // Which source provided this
  items: ExtractedItem[];      // The vocabulary items
  metadata: {
    queryTime: number;         // How long the query took (ms)
    totalAvailable: number;    // Total items before filtering
    domainCoverage: number;    // How well we covered the domain (0-1)
    fromCache: boolean;        // Was this a cache hit?
    cacheExpiry?: Date;        // When cache expires
  };
}
```

---

### 핵심 함수 설명 (Core Functions Explained)

#### queryCorpus

**기술적 정의**: 코퍼스 쿼리의 주요 진입점. 우선순위순으로 정렬된 여러 소스를 통한 폴백과 함께 캐시 우선 검색 구현.

**쉬운 설명**: 이것은 모든 어휘 요청을 처리하는 "프론트 데스크" 함수입니다. 먼저 최근에 이 정확한 질문에 답했는지 확인합니다 (캐시). 아니라면 기준에 맞는 어휘를 찾을 때까지 선호도 순서대로 사용 가능한 소스를 살펴봅니다.

**사용 이유**: 쿼리 로직을 중앙 집중화하고, 캐싱이 항상 적용되도록 보장하며, 폴백 체인을 자동으로 구현합니다.

**동작**:

1. 동일한 쿼리에 대해 캐시 확인
2. 캐시 미스 시 도메인에 사용 가능한 소스 식별
3. targetCount에 도달할 때까지 우선순위 순서로 소스 쿼리
4. 성공적인 결과 캐시
5. 모든 소스가 실패하면 내장 어휘로 폴백

#### extractDomainVocabulary

**기술적 정의**: 난이도 필터링과 선택적 연어 집중을 적용하여 학습자의 현재 능력 수준(세타)에 적합한 어휘를 추출하는 상위 수준 함수.

**쉬운 설명**: 이것은 학습 수준을 아는 "개인화된 쇼핑 어시스턴트"입니다. 그냥 아무 의학 어휘를 얻는 대신, 현재 능력 추정을 기반으로 *당신*에게 적절하게 도전적인 의학 어휘를 얻습니다.

**사용 이유**: 난이도 필터링과 소스 간 중복 제거를 통해 원시 코퍼스 데이터와 교육학적으로 적절한 콘텐츠 사이의 격차를 메웁니다.

**매개변수**:

- `domain`: 대상 도메인 ("medical", "legal" 등)
- `targetCount`: 필요한 항목 수
- `userLevel`: 학습자의 현재 세타 (능력) 추정
- `options`: 알려진 항목 제외, 연어에 집중 등

#### getDomainVocabularyStats

**기술적 정의**: 빈도 분포, 평균 단어 길이, 기술 용어 비율을 포함하여 도메인의 어휘 프로필에 대한 집계 통계 계산.

**쉬운 설명**: 이것은 도메인에 대한 "재고 보고서"입니다. 얼마나 많은 어휘가 있는지, 빈도별로 어떻게 분포되어 있는지 (흔한 단어가 많은지? 희귀한 기술 용어가 많은지?), 도메인이 전체적으로 얼마나 "전문화"되어 있는지 알려줍니다.

**사용 이유**: 격차 분석 (학습자가 도메인의 몇 퍼센트를 알고 있는지?)을 가능하게 하고 학습 목표 보정에 도움이 됩니다.

---

### 캐싱 전략 (Caching Strategy)

#### 인메모리 캐시

모듈은 `CorpusCache` 클래스를 통해 간단하지만 효과적인 인메모리 캐시를 구현합니다:

**TTL (Time-To-Live)**: 기본 1시간 (`DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000`)

**쉬운 설명**: 특정 쿼리에 대한 어휘를 가져오면 한 시간 동안 답을 기억합니다. 그 시간 내에 누군가가 같은 질문을 하면 외부 API를 다시 쿼리하는 대신 저장된 답을 즉시 제공합니다.

**최대 크기**: 100개 항목 (`MAX_CACHE_SIZE = 100`)

**쉬운 설명**: 마지막 100개의 쿼리만 기억합니다. 이것은 메모리가 무한정 증가하는 것을 방지합니다. 공간이 부족하면 가장 오래된 캐시된 답을 버립니다.

**제거 정책**: 가장 오래된 것 먼저 (FIFO)

**쿼리 해싱**: 쿼리는 캐시 키 생성을 위해 JSON으로 직렬화됩니다. 의미적으로 관련된 필드만 해시됩니다 (domain, genre, minFrequency, maxDifficulty, targetCount, language, posFilter, keywords).

**캐시 인식 결과**: 캐시된 데이터를 반환할 때 `metadata.fromCache` 플래그가 `true`로 설정되고 `metadata.cacheExpiry`는 캐시된 데이터가 만료될 때를 나타냅니다.

#### 캐싱이 중요한 이유

외부 코퍼스 API는 속도 제한이 있습니다 (예: OPUS: 분당 60개 요청). 캐싱 없이:

- 같은 도메인에 대한 반복적인 목표 생성이 API를 과부하시킴
- UI 새로 고침이 중복 쿼리를 트리거할 수 있음
- 속도 제한 고갈이 사용자 경험을 저하시킴

캐싱으로:

- 동일한 쿼리가 메모리에서 즉시 반환
- 진정으로 새로운 쿼리를 위해 API 할당량 보존
- 과부하 사용 중에도 시스템이 응답성 유지

---

### 폴백 메커니즘 (Fallback Mechanisms)

#### 폴백 체인

모듈은 강력한 폴백 전략을 구현합니다:

1. **주요**: 외부 API 소스 (COCA, BNC, OPUS)
2. **보조**: 내장 어휘 데이터 (`EMBEDDED_VOCABULARY`)
3. **3차**: 일반 일반 어휘 (도메인별 내장 데이터가 없는 경우)

#### 내장 어휘

`EMBEDDED_VOCABULARY` 상수는 주요 도메인에 대한 선별된 어휘를 포함합니다:

- **의학**: diagnosis, prognosis, symptom, administer, contraindication 등
- **비즈니스**: leverage, stakeholder, synergy, benchmark, scalable
- **학술**: hypothesis, methodology, empirical, paradigm, discourse
- **법률**: jurisdiction, plaintiff, liability, stipulate
- **일반**: significant, establish, fundamental

**쉬운 설명**: 내장 어휘를 LOGOS와 함께 제공되는 "비상 백업 사전"으로 생각하세요. 인터넷이 다운되거나 모든 API가 고장나도 학습자는 여전히 필수 도메인 어휘에 접근할 수 있습니다.

#### 폴백이 트리거될 때

1. **API 사용 불가**: 소스가 `isAvailable: false`로 표시되거나 API가 오류 반환
2. **속도 제한 초과**: 너무 많은 요청, API가 연결 거부
3. **빈 결과**: API가 쿼리 기준에 맞는 항목을 반환하지 않음
4. **네트워크 실패**: HTTP 요청이 완전히 실패

---

### 변환 함수: corpusItemToLanguageObject

이 함수는 코퍼스 데이터를 LOGOS의 내부 데이터 모델로 연결합니다.

**하는 일**:

- `ExtractedItem` (코퍼스 형식)을 `LanguageObject` (LOGOS 형식)로 변환
- 연어 강도에서 관계적 밀도 계산
- 0-1 난이도를 IRT 스케일 (-3 to +3)로 변환
- 빈도, 도메인 관련성, 난이도에서 우선순위 점수 계산

**쉬운 설명**: 코퍼스 데이터는 빈도 백분율과 도메인 점수가 있는 "원시" 형식으로 제공됩니다. LOGOS의 학습 알고리즘은 IRT 난이도 매개변수와 우선순위 점수가 있는 특정 형식의 데이터가 필요합니다. 이 함수는 두 형식 사이의 "번역가"입니다.

**변환 세부사항**:

| 코퍼스 필드 | LOGOS 필드 | 변환 |
|-------------|------------|------|
| `estimatedDifficulty` | `irtDifficulty` | `(difficulty - 0.5) * 6`이 0-1을 -3에서 +3으로 매핑 |
| `collocations[].strength` | `relationalDensity` | 강도 합 / 5, 1.0으로 상한 |
| `domainRelevance` | `contextualContribution` | 직접 매핑 |
| 결합 | `priority` | `F * 0.4 + R * 0.4 + (1-D) * 0.2` |

---

### 코퍼스 파이프라인 서비스와의 통합 (Integration with Corpus Pipeline Service)

서비스 레이어의 `corpus-pipeline.service.ts`는 이 모듈의 주요 소비자입니다. 관계는:

#### 이 모듈 (코어)이 제공:

- 타입 정의 (`CorpusSource`, `CorpusQuery`, `ExtractedItem`, `CorpusResult`)
- 순수 함수 (`queryCorpus`, `extractDomainVocabulary`, `getDomainVocabularyStats`)
- 내장 폴백 데이터
- 변환 유틸리티 (`corpusItemToLanguageObject`)

#### 파이프라인 서비스 (서비스 레이어)가 처리:

- 외부 API에 대한 실제 HTTP 요청
- 데이터베이스 작업 (어휘 삽입, 연어 저장)
- 목표 사양 파싱
- 사용자 업로드 처리
- 어휘 생성을 위한 Claude AI 통합
- PMI 계산 조정

#### 왜 이런 분리?

LOGOS는 엄격한 아키텍처 원칙을 따릅니다: **코어 모듈은 순수**합니다. I/O 작업, 데이터베이스 호출, HTTP 요청이 없습니다. 이것은 다음을 가능하게 합니다:

1. **테스트 가능성**: 코어 함수는 네트워크나 데이터베이스를 모킹하지 않고 단위 테스트 가능
2. **이식성**: 코어 알고리즘은 이론적으로 모든 JavaScript 환경에서 실행 가능
3. **예측 가능성**: 같은 입력은 항상 같은 출력 생성 (참조 투명성)

서비스 레이어는 순수 알고리즘과 외부 시스템의 지저분한 현실 사이의 "어댑터" 역할을 합니다.

---

### 변경 이력 (Change History)

#### 2026-01-06 - 문서 생성

- **변경 내용**: dynamic-corpus 모듈에 대한 초기 내러티브 문서
- **이유**: 코드베이스 이해를 위한 Shadow Map 문서화 방법론 지원
- **영향**: 개발자가 코퍼스 통합 아키텍처를 이해할 수 있게 함

#### 초기 구현

- **변경 내용**: 다음을 포함한 동적 코퍼스 소싱 모듈 생성:
  - 다중 소스 코퍼스 쿼리 인터페이스
  - TTL이 있는 인메모리 캐싱
  - 내장 어휘 폴백
  - 도메인별 어휘 추출
  - IRT 난이도 변환
- **이유**: LOGOS를 위한 목표 기반, 도메인별 어휘 채우기 가능하게 함
- **영향**: 개인화되고 코퍼스 검증된 언어 학습 콘텐츠의 기초

---

### 참조 (References)

- Sinclair, J. (1991). *Corpus, Concordance, Collocation*. Oxford University Press.
- Church, K., & Hanks, P. (1990). Word association norms, mutual information, and lexicography. *Computational Linguistics*, 16(1), 22-29.
- Davies, M. (2008-). The Corpus of Contemporary American English (COCA). Available online at https://www.english-corpora.org/coca/
- OPUS Project. Open Parallel Corpus. Available at https://opus.nlpl.eu/

---

## 12.6 AI 기반 온보딩 모듈 (AI-Powered Onboarding Module)

> **최종 업데이트**: 2026-01-06
> **코드 위치**: `src/core/onboarding-ai.ts`
> **상태**: 활성

---

### 맥락 및 목적 (Context & Purpose)

이 모듈은 인간이 언어 학습 목표를 설명하는 혼란스럽고 개인적이며 종종 명확하지 않은 방식을 구조화되고 실행 가능한 학습 계획으로 변환합니다. "캐나다에서 간호사로 일하기 위해 영어를 배워야 해요"와 정밀하게 구성된 학습 시스템 사이의 간극이 엄청나기 때문에 존재합니다 -- 그리고 그 간극을 메우는 것은 전통적으로 광범위한 설문지(사용자에게 지치는 것) 또는 인간 개입(비용이 많이 들고 확장 불가능)을 필요로 합니다.

**비즈니스 필요성**: 언어 학습자들은 스프레드시트가 아닌 머릿속에 목표를 가지고 LOGOS에 옵니다. CELBAN 인증을 목표로 하는 필리핀 출신 간호사는 "캐나다에서 일하기 위해 6개월 안에 간호 영어 시험을 통과해야 해요"라고 생각합니다. "domain: medical, modality: [reading, listening, speaking, writing], benchmark: CELBAN, deadline: 2026-07-06"라고 생각하지 않습니다. 이 모듈은 그 번역을 자동으로 수행하여, 시스템과의 첫 상호작용 중 사용자의 인지적 부담을 최소화합니다.

**사용 시점**:
- 초기 온보딩 중 사용자가 자유 텍스트로 학습 목표를 설명할 때
- 시스템이 모호한 목표에 대해 명확화 질문을 생성해야 할 때
- 인지 부하 관리로 구조화된 온보딩 플로우를 생성할 때
- 파싱된 목표 사양을 기반으로 코퍼스 소스를 제안할 때
- 원시 사용자 입력과 데이터베이스 모델(GoalSpec) 사이의 중간 레이어로

---

### 학술적 기초 (Academic Foundations)

#### 인지 부하 이론 (Cognitive Load Theory, Sweller, 1988)

**기술적**: 인지 부하 이론은 세 가지 유형의 인지 부하를 구분합니다: 내재적(고유한 복잡성), 외재적(잘못된 설계로 인한 것), 그리고 유의미한(학습에 기여하는 것). 이 모듈은 온보딩 중 사용자가 내려야 하는 결정의 수와 복잡성을 줄여 외재적 부하를 최소화합니다.

**쉬운 설명**: 당신의 뇌는 제한된 처리 능력을 가지고 있습니다. 온보딩 중 20개의 질문을 하면, 실제로 학습을 시작하기도 전에 정신적으로 지칠 것입니다. 이 모듈은 단일 자유 텍스트 문장에서 가능한 한 많은 것을 추출한 다음, 진정으로 누락된 정보에 대해서만 후속 질문을 합니다.

**왜 사용하나**: 첫인상이 중요합니다. 지치게 하는 온보딩 과정은 포기로 이어집니다. 자연어 목표를 지능적으로 파싱함으로써, 사용자가 실제 학습 경험에 도달하기 전에 견뎌야 하는 "서류 작업"을 줄입니다.

#### 힉의 법칙 (Hick's Law)

**기술적**: 힉의 법칙에 따르면 결정 시간은 선택지 수에 따라 로그적으로 증가합니다: RT = a + b * log2(n+1). 이 모듈은 결정 시간을 관리 가능하게 유지하기 위해 단계당 최대 4개의 선택지를 강제합니다.

**쉬운 설명**: 50페이지 메뉴가 있는 식당에서는 주문하는 데 한참 걸립니다. 4개의 옵션이 있으면 빠르게 결정합니다. 우리도 같은 원칙을 적용합니다: 각 온보딩 단계는 최대 4개의 선택지를 제공하여, 결정 마비를 줄입니다.

**왜 사용하나**: 상수 `MAX_CHOICES_PER_STEP = 4`는 힉의 법칙을 직접 구현합니다. `estimateCognitiveLoad()` 함수는 `Math.log2(1 + numChoices)`를 사용하여 각 단계가 얼마나 부담스러운지 정량화하여, 시스템이 전체 플로우를 최적화할 수 있게 합니다.

#### 점진적 공개 (Progressive Disclosure)

**기술적**: 점진적 공개는 정보와 옵션이 점진적으로 공개되는 UX 패턴으로, 각 단계에서 관련된 것만 보여줍니다. 이 모듈은 조건부 명확화 질문과 단계 종속성을 통해 이를 구현합니다.

**쉬운 설명**: 우리는 모든 가능한 옵션을 한 번에 쏟아붓지 않습니다. 먼저 목표를 말해주세요. 그런 다음, 도메인을 파악하지 못했다면 질문합니다. 타임라인을 파악하지 못했다면 질문합니다. 각 질문은 이전 답변을 기반으로 합니다.

**왜 사용하나**: `generateClarifyingQuestions()` 함수는 누락되거나 낮은 신뢰도의 엔티티에 대해서만 질문을 생성합니다. 사용자가 "3개월 안에 CELBAN 시험"이라고 말하면, 우리는 이미 도메인(의료), 벤치마크(CELBAN), 타임라인(3개월)을 알고 있으므로 -- 그 질문들을 완전히 건너뜁니다.

---

### 핵심 타입 (Key Types)

#### NaturalLanguageGoal (자연어 목표)

**무엇을 나타내나**: 사용자가 학습 목표를 설명하는 원시, 처리되지 않은 입력.

```typescript
interface NaturalLanguageGoal {
  rawText: string;         // "I want to pass IELTS for medical school"
  userLanguage: string;    // UI 언어: "en", "pt", "ja"
  targetLanguage: string;  // 학습 중인 언어: "en"
}
```

**쉬운 설명**: 이것은 사용자가 목표 입력 필드에 타이핑하거나 말한 그대로입니다. 해석도 없고, 구조도 없습니다 -- 그들의 언어로 된 그들의 말 그대로입니다.

#### ParsedGoal (파싱된 목표)

**무엇을 나타내나**: 데이터베이스 저장 및 시스템 구성을 위한 사용자의 자연어 목표의 구조화된 해석.

```typescript
interface ParsedGoal {
  domain: string;              // "medical", "business", "academic", "general"
  modalities: GoalModality[];  // ["reading", "listening", "speaking", "writing"]
  genre: string;               // "clinical", "research", "nursing"
  purpose: string;             // "certification:IELTS", "professional", "personal"
  benchmark?: string;          // "IELTS", "CELBAN", "TOEFL"
  deadline?: Date;             // 사용자가 목표를 달성해야 하는 시점
  confidence: number;          // 0-1: 파싱이 얼마나 확실한가?
  extractedEntities: ExtractedEntity[];  // 무엇이 어디서 발견되었는가
  originalText: string;        // 참조/디버깅을 위해 보존
}
```

**쉬운 설명**: 이것은 사용자 목표의 "번역된" 버전입니다. "6월까지 캐나다에서 간호 일을 위해 CELBAN을 통과해야 해요"는 domain=medical, benchmark=CELBAN, purpose=certification:CELBAN, deadline=2026-06-01이 됩니다. 신뢰도 점수는 이 해석에 대해 우리가 얼마나 확신하는지 알려줍니다.

#### OnboardingStep (온보딩 단계)

**무엇을 나타내나**: 온보딩 마법사에서 인지적 요구와 종속성에 대한 메타데이터가 있는 단일 상호작용 지점.

```typescript
interface OnboardingStep {
  id: string;                    // "clarify_domain", "target_language"
  type: 'choice' | 'text' | 'confirmation' | 'assessment';
  content: StepContent;          // 질문, 옵션, 예시
  cognitiveLoad: CognitiveLoadLevel;  // "low", "medium", "high"
  required: boolean;             // 진행하려면 반드시 완료해야 하나?
  dependsOn?: string[];          // 먼저 완료해야 하는 단계들
}
```

**쉬운 설명**: 각 단계는 마법사의 페이지와 같습니다. 어떤 질문을 할지, 어떤 종류의 답변을 기대하는지(객관식? 자유 텍스트?), 정신적으로 얼마나 요구되는지, 건너뛸 수 있는지를 알고 있습니다.

#### OnboardingFlow (온보딩 플로우)

**무엇을 나타내나**: 진행 상황을 추적하고 응답을 수집하는 모든 온보딩 단계의 완전한 조율.

```typescript
interface OnboardingFlow {
  id: string;                           // 고유 플로우 식별자
  steps: OnboardingStep[];              // 순서대로 모든 단계
  currentStep: number;                  // 사용자가 현재 있는 위치
  responses: Record<string, string | string[]>;  // 수집된 답변
  estimatedTime: number;                // 예상 총 초
  overallLoad: CognitiveLoadLevel;      // 집계된 인지적 요구
}
```

**쉬운 설명**: 이것은 온보딩의 "게임 상태"입니다. 모든 단계, 현재 위치, 지금까지 답변한 내용, 전체 과정에 얼마나 걸릴지를 알고 있습니다.

---

### 핵심 함수 (Core Functions)

#### parseNaturalLanguageGoal(input: NaturalLanguageGoal): ParsedGoal

**하는 일**: 사용자의 자유 형식 목표 설명을 받아 패턴 매칭과 키워드 인식을 사용하여 구조화된 정보를 추출합니다.

**처리 파이프라인**:
1. 매칭을 위해 텍스트를 소문자로 정규화
2. 도메인 키워드에서 도메인 추출 (medical, legal, business, academic, general)
3. 시험 키워드에서 벤치마크 추출 (CELBAN, IELTS, TOEFL 등)
4. 스킬 키워드에서 모달리티 추출 (reading, writing, listening, speaking)
5. 시간 패턴에서 마감일 추출 (in 3 months, by June, next year)
6. 직접 언급되지 않은 경우 벤치마크에서 도메인 추론
7. 도메인과 텍스트 컨텍스트를 기반으로 장르 추론
8. 컨텍스트 패턴에서 목적 추론
9. 추출된 엔티티에서 신뢰도 계산

**쉬운 설명**: 당신이 쓴 것을 읽고 무슨 의미인지 이해하려고 합니다. "Pass CELBAN next year"는 domain=medical(CELBAN이 의료 시험이므로), benchmark=CELBAN, deadline=2027년 1월인 구조화된 목표가 됩니다.

**중요한 동작**:
- 모달리티가 언급되지 않으면, 모든 모달리티로 기본 설정 (reading, listening, speaking, writing)
- 벤치마크가 도메인을 언급하지만 도메인 키워드가 없으면, 벤치마크에서 도메인 추론
- 더 많은 엔티티가 추출되면 신뢰도 증가 (커버리지 보너스)
- 원본 텍스트는 항상 참조용으로 보존

#### generateClarifyingQuestions(parsed: ParsedGoal): OnboardingStep[]

**하는 일**: 파싱된 목표를 검토하고 누락되거나 불확실한 정보에 대해서만 추가 질문을 생성합니다.

**결정 로직**:
- 도메인 신뢰도 < 0.7 또는 도메인 엔티티가 없음: 분야/도메인에 대해 질문
- 4개 모달리티가 모두 있음 (즉, 지정되지 않음): 스킬 집중에 대해 질문
- 마감일이 없음: 선택적으로 타임라인에 대해 질문

**쉬운 설명**: 목표를 이해하려고 시도한 후, 중요한 것에 대해 확신이 없으면 질문합니다. 하지만 파악하지 못한 것에 대해서만 합니다. "TOEFL"을 언급했다면, 이미 학업 관련인 것을 알고 있으므로 -- 물어볼 필요가 없습니다.

**인지 부하 인식**:
- 도메인 질문: `cognitiveLoad: 'low'` (4개의 간단한 선택지)
- 모달리티 질문: `cognitiveLoad: 'medium'` (다중 선택)
- 타임라인 질문: `cognitiveLoad: 'low'` (4개의 간단한 선택지, 필수 아님)

#### createOnboardingFlow(userLanguage: string): OnboardingFlow

**하는 일**: 모든 단계, 종속성, 인지 부하 추정치가 있는 완전한 기본 온보딩 마법사 구조를 생성합니다.

**기본 플로우 구조**:
1. **target_language** (choice, required, low load): 어떤 언어를 배울지
2. **goal_text** (text, required, medium load): 자유 형식 목표 설명
3. **confirm_goal** (confirmation, required, low load): 파싱된 해석 검토
4. **initial_assessment** (assessment, optional, high load): 빠른 스킬 체크

**쉬운 설명**: 이것은 온보딩의 "템플릿"을 생성합니다. 모든 새 사용자는: 언어 선택, 목표 설명, 올바르게 이해했는지 확인, 선택적으로 시작점을 보기 위한 빠른 테스트를 거칩니다.

**설계 결정**:
- 자유 텍스트 입력은 자연어 파싱을 활용하기 위해 초반에 옴
- 확인 단계는 goal_text에 종속 (확인 전에 파싱해야 함)
- 평가는 높은 인지 부하 때문에 선택적
- 총 예상 시간: 단계 유형별로 계산 (choice=10s, text=30s, confirmation=15s, assessment=120s)

---

### 엔티티 추출 시스템 (Entity Extraction System)

#### 도메인 추출 작동 방식 (How Domain Extraction Works)

**키워드 사전 접근법**: 모듈은 도메인을 특징적인 어휘와 연관시키는 `DOMAIN_KEYWORDS` 맵을 유지합니다.

```
medical: ["medical", "medicine", "doctor", "nurse", "CELBAN", "NCLEX", ...]
legal: ["legal", "law", "lawyer", "attorney", "court", ...]
business: ["business", "corporate", "finance", "MBA", ...]
academic: ["academic", "university", "IELTS", "TOEFL", ...]
general: ["daily", "everyday", "travel", "conversation", ...]
```

**쉬운 설명**: 각 도메인에 대한 어휘 목록이 있습니다. 목표에 "medical" 목록의 어떤 단어가 포함되어 있으면, 도메인을 medical로 태그합니다. 첫 번째 매치가 이기므로, 키워드 순서가 중요합니다.

**추출 세부사항**:
- 도메인 문자열과 신뢰도 0.8의 ExtractedEntity 반환
- 잠재적 하이라이팅을 위한 문자 범위 [start, end] 포함
- 벤치마크 키워드 전에 도메인 키워드 처리

#### 벤치마크 추출 작동 방식 (How Benchmark Extraction Works)

**시험 인식 인식**: `BENCHMARK_KEYWORDS` 맵은 시험 이름을 정규 형식 및 관련 도메인에 연결합니다.

```
celban -> { domain: 'medical', name: 'CELBAN' }
ielts  -> { domain: 'academic', name: 'IELTS' }
toeic  -> { domain: 'business', name: 'TOEIC' }
oet    -> { domain: 'medical', name: 'OET' }
```

**쉬운 설명**: 특정 시험을 언급하면, 우리는 그것을 인식하고 어떤 도메인에 속하는지 압니다. "CELBAN"을 언급하면 목표 시험과 의료 분야임을 모두 알려줍니다.

**추출 세부사항**:
- 벤치마크 이름, 추론된 도메인, 신뢰도 0.95의 ExtractedEntity 반환 (시험 이름은 모호하지 않아서 높음)
- 대소문자 구분 없는 소문자 매칭
- 벤치마크 도메인이 누락된 직접 도메인 추출을 재정의

#### 모달리티 추출 작동 방식 (How Modality Extraction Works)

**스킬 키워드 매핑**: `MODALITY_KEYWORDS` 맵은 각 언어 스킬을 관련 어휘와 연관시킵니다.

```
reading:   ["read", "comprehension", "article", "book", "text"]
listening: ["listen", "audio", "podcast", "conversation"]
speaking:  ["speak", "talk", "pronunciation", "oral"]
writing:   ["write", "essay", "report", "email"]
```

**쉬운 설명**: 행동 단어를 기반으로 어떤 스킬에 관심이 있는지 감지합니다. "I need to improve my speaking and listening"은 그 두 모달리티로 태그됩니다.

**추출 세부사항**:
- 모달리티 배열 반환 (여러 개 매치 가능)
- 같은 모달리티 내 중복 방지
- 감지된 각 모달리티에 대해 신뢰도 0.85
- 빈 결과는 "모든 모달리티"를 의미 (사용자가 선호도를 지정하지 않음)

#### 마감일 추출 작동 방식 (How Deadline Extraction Works)

**시간 패턴 매칭**: `DEADLINE_PATTERNS` 배열은 다양한 마감일 표현에 대한 정규식 패턴을 포함합니다.

지원되는 패턴:
- "in X months/weeks/years" -> 오늘로부터 상대적
- "within X months/weeks/years" -> "in"과 동일
- "by [Month] [Year]" -> 특정 월
- "X months/weeks/years from now/later" -> 상대적 표현
- "next month/year" -> 캘린더 상대적

**쉬운 설명**: 사람들이 마감일을 표현하는 많은 방법을 이해합니다: "in 6 months," "by September 2026," "next year" 등. 이 모든 것을 특정 Date로 변환합니다.

**추출 세부사항**:
- Date 객체와 신뢰도 0.75의 ExtractedEntity 반환 (자연어 날짜가 모호할 수 있어서 중간 수준)
- 패턴이 일치하지 않으면 null로 폴백
- `parseDeadlineMatch()`가 변환 로직 처리

---

### 미시적 관계: 직접 관계 (Microscale: Direct Relationships)

#### 종속성 (Dependencies - 이 모듈이 필요로 하는 것)

이 모듈은 의도적으로 **순수**합니다 -- 외부 종속성이 없습니다. 모든 기능은 다음을 사용하여 자체 포함됩니다:
- 내장 TypeScript/JavaScript 기능
- 내부적으로 정의된 타입 인터페이스
- 내부 상수 사전 (DOMAIN_KEYWORDS, BENCHMARK_KEYWORDS 등)
- 내부 헬퍼 함수

**설계 근거**: `src/core` 모듈로서, 테스트 가능성, 이식성, 명확한 아키텍처 경계를 보장하기 위해 순수하고 종속성이 없어야 합니다.

#### 종속 항목 (Dependents - 이것이 필요한 것)

- **`src/main/ipc/onboarding.ipc.ts`**: 온보딩 완료를 위한 IPC 핸들러는 이 모듈을 사용하여 GoalSpec 레코드로 저장하기 전에 자유 텍스트 목표를 파싱할 수 있습니다. 현재 IPC 핸들러는 사전 구조화된 데이터를 받습니다; 이 모듈이 원시 입력을 전처리할 수 있습니다.

- **`src/renderer/components/onboarding/*`** (잠재적): UI 컴포넌트는 (IPC를 통해) 이 모듈을 호출하여 사용자가 목표를 입력하는 동안 실시간 파싱 피드백을 제공하고, 추출된 엔티티와 신뢰도 수준을 보여줄 수 있습니다.

- **향후 LLM 통합**: 이 모듈은 폴백/기준선으로 설계되었습니다. 프로덕션 시스템은 이 결정론적 버전을 빠르고 개인정보 보호적인 대안으로 유지하면서 LLM 기반 파싱으로 `parseNaturalLanguageGoal()`을 강화할 수 있습니다.

#### 데이터 흐름 (Data Flow)

```
사용자 입력: "I need to pass CELBAN for nursing work in 6 months"
                              |
                              v
              +-------------------------------+
              | parseNaturalLanguageGoal()    |
              +-------------------------------+
                              |
        +---------------------+----------------------+
        |                     |                      |
        v                     v                      v
extractDomain()     extractBenchmark()     extractModalities()
  |                       |                        |
  | "nursing" -> medical  | "CELBAN" 발견          | 키워드 없음
  |                       | domain: medical        | -> 기본 4개 모두
  v                       v                        v
        +---------------------+----------------------+
                              |
                              v
                    extractDeadline()
                              |
                    "6 months" -> Date
                              v
              +-------------------------------+
              | ParsedGoal 조립               |
              | - domain: medical             |
              | - benchmark: CELBAN           |
              | - modalities: 4개 모두        |
              | - deadline: +6개월            |
              | - confidence: 0.85            |
              +-------------------------------+
                              |
                              v
              generateClarifyingQuestions()
                              |
              모달리티에 대해서만 질문
              (도메인과 마감일은 발견됨)
```

---

### 거시적 관계: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어 (Architectural Layer)

이 모듈은 LOGOS 아키텍처의 **레이어 0 (순수 Core)**에 위치합니다:

```
+---------------------------------------------------+
|  레이어 3: 렌더러 (React UI)                       |
|  - OnboardingWizard.tsx                            |
|  - GoalInputField.tsx                              |
+---------------------------------------------------+
                         |
                         | IPC 호출
                         v
+---------------------------------------------------+
|  레이어 2: IPC 브릿지 (Main 프로세스)              |
|  - onboarding.ipc.ts                               |
|  - goal.ipc.ts                                     |
+---------------------------------------------------+
                         |
                         | 함수 호출
                         v
+---------------------------------------------------+
|  레이어 1: 서비스 (비즈니스 로직)                  |
|  - corpus-pipeline.service.ts                      |
|  - goal.service.ts                                 |
+---------------------------------------------------+
                         |
                         | 순수 함수 호출
                         v
+---------------------------------------------------+
|  레이어 0: 순수 Core (이 모듈)                     |  <-- 여기입니다
|  - onboarding-ai.ts                                |
|  - irt.ts, fsrs.ts, pmi.ts                         |
|  - 종속성 없음, 부작용 없음                        |
+---------------------------------------------------+
```

#### 큰 그림 영향 (Big Picture Impact)

onboarding-ai 모듈은 인간 의도와 기계 이해 사이의 **인지 번역가**입니다. 다음을 가능하게 합니다:

| 기능 | 이 모듈이 기여하는 방식 |
|------------|----------------------------|
| **자연어 온보딩** | 사용자가 양식을 채우는 대신 자신의 말로 목표를 설명 |
| **스마트 기본값** | 시스템이 컨텍스트에서 도메인/모달리티를 추론하여 질문 감소 |
| **시험 인식 구성** | 벤치마크 키워드가 자동으로 도메인과 목적 구성 |
| **마감일 기반 페이싱** | 추출된 마감일이 일일 학습 목표 계산에 공급 |
| **코퍼스 소싱** | `suggestCorpusSourcing()`이 목표를 기반으로 어휘 소스 추천 |
| **인지 부하 관리** | 플로우 구성이 UX 연구 원칙을 따름 |
| **신뢰도 투명성** | 시스템이 불확실할 때를 알고 명확화 질문 요청 |

#### 시스템 종속성 (System Dependencies)

**이 모듈 없이**:
- 사용자가 목표를 구성하기 위해 긴 설문지 필요
- 목표 설명에 대한 자연어 이해 없음
- 지능형 명확화 질문 생성 없음
- UX 최적화를 위한 인지 부하 추정 없음
- 자유 텍스트에서 GoalSpec으로의 구조화된 경로 없음

**통합 지점**:
- 출력 `ParsedGoal`이 데이터베이스 `GoalSpec` 모델 필드에 직접 매핑
- `CorpusSourcingPlan`이 `corpus-pipeline.service.ts` 결정에 정보 제공
- `OnboardingFlow` 구조가 렌더러 마법사 컴포넌트와 정렬
- 신뢰도 점수가 추가 UI 명확화 단계를 트리거할 수 있음

---

### 추가 내보내기 함수 (Additional Exported Functions)

#### suggestCorpusSourcing(goal: ParsedGoal): CorpusSourcingPlan

**하는 일**: 파싱된 목표가 주어지면, 적절한 코퍼스 소스, 어휘 집중 영역, 콘텐츠 유형, 초기 어휘 수를 추천합니다.

**도메인별 추천**:
| 도메인 | 소스 | 집중 | 초기 어휘 |
|--------|---------|-------|---------------|
| medical | embedded_medical, opus | 의료 용어, 환자 소통 | 800 |
| business | embedded_business, coca | 비즈니스 용어, 협상 | 600 |
| academic | embedded_academic, coca, bnc | 학술 어휘, 연구 작문 | 700 |
| legal | embedded_legal, opus | 법률 용어, 계약 언어 | 600 |
| general | coca, opus | 일반 어휘, 일상 소통 | 500 |

**쉬운 설명**: 영어를 배우는 목적을 알면, 적절한 학습 자료 소스를 추천할 수 있습니다. 의대생은 임상 사례 연구가 필요합니다; 비즈니스 전문가는 이메일 템플릿과 회의 녹취록이 필요합니다.

#### estimateCognitiveLoad(step: OnboardingStep): number

**하는 일**: 유형, 선택지, 요구 사항을 기반으로 단일 온보딩 단계에 대한 0-1 인지 부하 점수를 계산합니다.

**부하 계산**:
- Choice: `log2(1 + numChoices) / log2(1 + MAX_CHOICES)` (힉의 법칙)
- Text: 0.6 (자유 텍스트는 상당한 정신적 노력 필요)
- Confirmation: 0.3 (검토만, 낮은 요구)
- Assessment: 0.9 (능동적 테스트, 높은 요구)
- 단계가 필수인 경우 +0.1 (압박 추가)

**쉬운 설명**: "이 단계가 얼마나 어려운가"에 숫자를 부여합니다. 단순한 2개 옵션 선택은 쉽습니다(낮은 점수). 자유 형식 설명을 쓰는 것은 더 어렵습니다(중간 점수). 테스트를 보는 것은 요구됩니다(높은 점수).

#### validateParsedGoal(goal: ParsedGoal): ValidationResult

**하는 일**: 파싱된 목표가 진행하기에 충분한 정보를 가지고 있는지 확인하고, 누락된 필드를 식별하고 제안을 제공합니다.

**검증 기준**:
- 신뢰도 < 0.5인 경우 도메인이 지정되어야 함 ('general'만이 아닌)
- 최소 하나의 모달리티가 있어야 함
- 목적은 가치를 더하지만 엄격하게 필수는 아님

**쉬운 설명**: 파싱 후, 의미 있는 학습 계획을 만들기에 충분한 정보가 있는지 다시 확인합니다. 중요한 것이 누락되면 플래그를 지정하고 수정 방법을 제안합니다.

#### updateGoalWithClarifications(goal: ParsedGoal, clarifications: Record<string, string | string[]>): ParsedGoal

**하는 일**: 사용자의 명확화 응답을 기존 파싱된 목표에 병합하여 필드를 업데이트하고 신뢰도를 높입니다.

**쉬운 설명**: 후속 질문을 한 후, 답변을 목표에 통합합니다. 질문했을 때 도메인이 "medical"이라고 말했다면, 그 정보로 목표를 업데이트하고 신뢰도 점수를 높입니다.

#### createGoalFromResponses(responses: Record<string, string | string[]>): ParsedGoal

**하는 일**: 수집된 온보딩 마법사 응답에서 완전한 ParsedGoal을 조립하고, 자유 텍스트를 파싱하고 명확화를 적용합니다.

**쉬운 설명**: 온보딩 중 제공한 모든 답변을 가져와 데이터베이스에 저장되는 최종 완전한 목표 구조를 구축합니다.

---

### 기술 개념 (쉬운 설명) (Technical Concepts - Plain English)

#### 신뢰도 점수가 있는 엔티티 추출 (Entity Extraction with Confidence Scores)

**기술적**: 추출된 각 정보 조각(도메인, 벤치마크, 모달리티, 마감일)에는 시스템의 추출 확신도를 나타내는 0에서 1 사이의 신뢰도 값이 할당됩니다.

**쉬운 설명**: 텍스트에서 정보를 가져올 때, 얼마나 확신하는지도 추적합니다. "CELBAN"을 인식하는 것은 정확한 매치이므로 매우 확실합니다(0.95). 일반 키워드에서 도메인을 감지하는 것은 단어가 모호할 수 있어서 덜 확실합니다(0.8).

**왜 사용하나**: 신뢰도 점수가 명확화 시스템을 구동합니다. 낮은 신뢰도는 후속 질문을 트리거하고; 높은 신뢰도는 불필요한 질문을 건너뛸 수 있게 합니다.

#### 추출된 엔티티의 스팬 추적 (Span Tracking for Extracted Entities)

**기술적**: 각 `ExtractedEntity`는 원본 텍스트에서 엔티티가 발견된 문자 위치를 나타내는 `span: [number, number]` 튜플을 포함합니다.

**쉬운 설명**: 텍스트에서 각 정보 조각을 어디서 발견했는지 정확히 기억합니다. "CELBAN"은 문자 15-21에 있을 수 있습니다. 이것은 우리가 이해한 것을 보여주는 UI의 시각적 하이라이팅을 가능하게 할 수 있습니다.

**왜 사용하나**: 투명성과 디버깅. 사용자(와 개발자)가 각 추출을 트리거한 것이 정확히 무엇인지 볼 수 있습니다.

#### 기본-전체 모달리티 전략 (Default-to-All Modality Strategy)

**기술적**: 입력에서 모달리티 키워드가 감지되지 않으면, 파서는 없음 대신 4개 모달리티 모두를 반환합니다.

**쉬운 설명**: 어떤 스킬에 집중할지 말하지 않으면, 모두 배우고 싶다고 가정합니다: 읽기, 쓰기, 듣기, 말하기. 이것은 명확화 질문으로 좁힐 수 있는 안전한 기본값입니다.

**왜 사용하나**: 기본적으로 커버리지를 최대화합니다. 특정 선호도가 있는 사용자는 언급할 것입니다; 그렇지 않은 사용자는 포괄적인 학습을 받습니다.

#### 온보딩 플로우의 단계 종속성 (Step Dependencies in Onboarding Flows)

**기술적**: `OnboardingStep`의 `dependsOn` 필드는 종속 단계 전에 선행 조건이 완료되도록 단계 실행 순서의 방향성 비순환 그래프(DAG)를 생성합니다.

**쉬운 설명**: 일부 단계는 다른 것이 완료될 때까지 발생할 수 없습니다. 실제로 목표를 입력하기 전에는 파싱된 목표를 확인할 수 없습니다. "confirmation" 단계는 "goal_text" 단계에 종속됩니다.

**왜 사용하나**: 마법사 플로우의 논리적 오류를 방지합니다. UI는 종속성을 사용하여 유효한 탐색을 결정하고 단계를 활성화/비활성화할 수 있습니다.

---

### 변경 이력 (Change History)

#### 2026-01-06 - 초기 문서화

- **변경 내용**: onboarding-ai.ts에 대한 포괄적인 내러티브 문서 생성
- **이유**: CLAUDE.md 사양에 따라 모든 core 모듈에 Shadow 문서화 필요
- **영향**: 온보딩 시스템에서 작업하는 개발자, AI 에이전트, 향후 유지보수자에게 맥락 제공

#### 초기 구현 (문서화 이전)

- **변경 내용**: NLP 파싱, 인지 부하 추정, 플로우 관리가 있는 완전한 AI 기반 온보딩 모듈
- **이유**: 긴 설문지 대신 자연어 목표 입력 가능하게 함
- **영향**: 구조화된 목표 사양을 캡처하면서 온보딩 중 사용자 마찰 감소

---

### 참고 및 관찰 (Notes & Observations)

#### 프로덕션 향상 경로 (Production Enhancement Path)

현재 구현은 키워드/정규식 패턴 매칭을 사용합니다. 프로덕션에서는 다음으로 향상될 수 있습니다:
- 더 미묘한 이해를 위한 LLM 기반 파싱
- 다국어 목표 파싱 (현재 영어 중심 키워드)
- 수정에서 학습 (사용자가 잘못된 파싱을 수정할 때)

모듈의 구조는 이를 예상합니다: `parseNaturalLanguageGoal`은 동일한 인터페이스를 유지하면서 LLM 기반 버전으로 교체될 수 있습니다.

#### Core Index에서 아직 내보내지지 않음 (Not Yet Exported from Core Index)

현재 `src/core/index.ts` 기준으로, 이 모듈은 중앙 core 배럴 파일을 통해 내보내지지 않습니다. 명시적 임포트가 필요할 수 있는 독립형 모듈로 존재합니다:

```typescript
import { parseNaturalLanguageGoal } from '@core/onboarding-ai';
// 이것 대신: import { parseNaturalLanguageGoal } from '@core';
```

이 모듈이 널리 사용되면 `src/core/index.ts`에 내보내기를 추가하는 것을 고려하세요.

#### 벤치마크 커버리지 (Benchmark Coverage)

`BENCHMARK_KEYWORDS` 사전은 현재 다음을 다룹니다:
- 의료: CELBAN, NCLEX, USMLE, OET
- 학술: IELTS, TOEFL, GRE
- 비즈니스: TOEIC, GMAT
- 일반: CELPIP

다른 일반적인 시험(Cambridge, Duolingo, PTE)은 사용자 수요에 따라 추가될 수 있습니다.

#### 언어 쌍 함의 (Language Pair Implications)

이 모듈은 목표를 파싱하지만 L1-L2 전이 고려 사항을 명시적으로 처리하지 않습니다. 파싱된 목표는 언어 쌍별 조정을 처리하는 다른 시스템(예: `transfer.ts`)에 공급됩니다.

---

### 참조 (References)

- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257-285.
- Hick, W. E. (1952). On the rate of gain of information. *Quarterly Journal of Experimental Psychology*, 4(1), 11-26.

