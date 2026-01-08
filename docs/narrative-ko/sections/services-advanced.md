# 고급 서비스 (Advanced Services)

> **최종 업데이트**: 2026-01-07
> **상태**: Active

이 문서는 LOGOS의 핵심 고급 서비스들에 대한 한국어 번역입니다.

---

## 제약 조건 전파 서비스 (Constraint Propagation Service)

> **코드 위치**: `src/main/services/constraint-propagation.service.ts`

### 목적 및 배경

이 서비스는 과제 구성(task composition) 중 객체 선택에 대한 **연쇄적 제약 조건 해결(cascading constraint resolution)**을 구현한다. 교사(인간 또는 알고리즘)가 과제에 포함할 언어 객체 하나를 선택하면, 그 선택은 사용 가능한 객체 풀 전체에 파급 효과를 일으킨다. 이 서비스는 해당 파급 효과를 계산하여, 초기 선택의 결과로 어떤 객체가 필수, 금지, 선호, 제한되는지 결정한다.

**비즈니스 필요성**: 언어는 독립적인 부분들의 집합이 아니다. "수동태(passive voice)"를 통사 구조로 선택하면 자동사를 사용할 수 없다. 격식체(formal register)를 선택하면 속어 어휘는 부적절해진다. 이 시스템은 이러한 상호의존성을 이해해야 언어학적으로 일관된 과제를 생성할 수 있다.

**사용 시점**: 과제 구성 중, Layer 1(상태 + 우선순위 서비스)이 *어떤* 객체를 연습할지 식별한 후, 과제가 완전히 조립되기 전에 사용된다.

### 데이터 흐름

```
객체 선택 (트리거)
        |
        v
buildConstraintGraph(goalId)  <- DB의 연어 정보 + 언어 규칙
        |
        v
 조회 인덱스를 갖춘 ConstraintGraph
        |
        v
propagateConstraints(trigger, graph, availableObjects, currentAssignments, slots)
        |
        +---> applyObjectConstraints() - 직접적인 객체 간 엣지
        |
        +---> applyLinguisticRules() - 컴포넌트 수준 규칙 술어
        |
        +---> propagateFromRequired() - 새로 필수가 된 객체로부터의 재귀적 연쇄
        |
        v
 ConstraintPropagation 결과
(required, excluded, restrictions, preferences, modifications)
```

### 아키텍처 계층

이 서비스는 과제 구성 하위 시스템 내 **제약 조건 해결 계층(Constraint Resolution Layer)**에서 작동한다:

- **Layer 1**: 상태 + 우선순위 (무엇을 학습할지) - 학습자 필요에 따라 대상 객체 선택
- **Layer 2a**: 제약 조건 전파 - **이 모듈** - 선택이 언어학적으로 일관되도록 보장
- **Layer 2b**: 과제 생성 - 일관된 객체들을 대화형 과제로 조립
- **Layer 3**: 응답 처리 - 학습자 수행 평가

### 핵심 개념

#### 제약 조건 그래프 (Constraint Graph)

언어 객체(단어, 형태소, 통사 패턴 등)를 노드로, 객체 간 제약 조건을 엣지로 하는 방향 그래프(directed graph) 데이터 구조. 출발점, 도착점, 컴포넌트 쌍별로 인덱싱되어 O(1) 조회가 가능하다.

#### 강한 제약 vs 약한 제약 (Hard vs. Soft Constraints)

- **강한 제약(Hard constraints)**: 문법 규칙과 같다. "수동태는 타동사를 필요로 한다" - 협상의 여지가 없다.
- **약한 제약(Soft constraints)**: 스타일 선호와 같다. "'bread'는 'butter'를 동반어로 선호한다" - 무시할 수 있지만, 원어민은 함께 사용하는 것이 더 자연스럽다고 느낀다.

#### 제약 조건 전파 (연쇄 효과)

도미노가 쓰러지는 것과 같다. 하나의 도미노를 밀면("수동태" 선택), 다른 도미노가 쓰러지고(타동사 필요), 또 다른 도미노가 쓰러지며(과거분사 형태 필요), 더 이상 쓰러질 도미노가 없을 때까지 계속된다.

#### 레지스터 계층 (Register Hierarchy)

5단계 계층(`frozen`, `formal`, `consultative`, `casual`, `intimate`)으로 각각 5-1의 수치 등급을 갖는다. 레지스터 호환성은 서로 한 단계 이내로 정의된다.

#### PMI 기반 연어 강도 (PMI-Based Collocation Strength)

연어 제약은 PMI/NPMI 점수에서 `strength`(0-1)를 도출한다. 일부 단어 쌍은 강하게 끌리고(bread-butter: 매우 높은 PMI), 다른 것들은 약하게 끌리며(bread-fork: 낮은 PMI), 또 다른 것들은 서로 밀어낸다(bread-quantum: 본질적으로 0).

### 주요 함수

| 함수 | 목적 |
|------|------|
| `buildConstraintGraph(goalId)` | DB 연어와 언어 규칙으로부터 제약 그래프 구성 |
| `propagateConstraints(...)` | 주요 전파 진입점 - 선택의 모든 연쇄 효과 계산 |
| `applyObjectConstraints(...)` | 그래프 엣지로부터 직접적인 객체 간 제약 적용 |
| `applyLinguisticRules(...)` | 출발 객체 유형에 기반한 컴포넌트 수준 언어 규칙 적용 |
| `validateAssignments(...)` | 모든 강한 제약이 충족되었는지 사후 검증 |

---

## 통합 과제 파이프라인 서비스 (Integrated Task Pipeline Service)

> **코드 위치**: `src/main/services/integrated-task-pipeline.service.ts`

### 목적 및 배경

이 서비스는 LOGOS의 새로운 유연한 구성 아키텍처를 기존 과제 생성 시스템과 통합하는 **중앙 오케스트레이터(central orchestrator)**로 존재한다. 경제적 최적화, 제약 조건 전파, 사용 공간 추적, 다층 평가, 보정 등 여러 정교한 하위 시스템을 일관되고 프로덕션 준비된 파이프라인으로 조율하는 근본적인 과제를 해결한다.

**비즈니스 필요성**: LOGOS는 여러 요소를 동시에 고려하는 지능적인 과제 생성이 필요하다: 학습자가 무엇을 연습해야 하는지(IRT 능력 추정치 기반), 언어 객체들이 언어학적으로 어떻게 관련되는지(제약 조건), 객체가 이미 어디서 연습되었는지(사용 공간), 여러 언어 컴포넌트를 포함하는 응답을 어떻게 공정하게 평가할지.

**사용 시점**:
- 애플리케이션이 사용자를 위한 학습 과제를 생성해야 할 때마다
- 사용자가 응답을 제출하고 평가/피드백이 필요할 때마다
- 학습 세션에서 다음에 무엇을 제시할지 결정해야 할 때

### 과제 생성 파이프라인

```
요청 수신 (userId, goalId, sessionId)
        |
        v
[1] DB에서 사용자 세타 상태 가져오기
        |
        v
[2] 후보 풀 구축 (경제적 가치를 가진 모든 적격 객체)
        |
        v
[3] 제약 그래프 구축 (언어적 관계)
        |
        v
[4] 상위 후보들의 사용 공간 가져오기 (어디서 연습했는지?)
        |
        v
[5] 적합한 과제 템플릿 찾기 (이 컴포넌트들에 어떤 형식이 작동하는지?)
        |
        v
[6] 최적 템플릿 선택 (후보-슬롯 일치 품질로 점수화)
        |
        v
[7] 사용 맥락 선택 (새 맥락으로 확장 vs. 강화?)
        |
        v
[8] 제약 조건과 함께 과제 구성 (최적 슬롯 채우기)
        |
        v
[9] 다중 객체 명세 구축 (보정 시스템용)
        |
        v
[10] GeneratedTask 형식으로 변환 (하위 호환성)
        |
        v
IntegratedTaskResult 반환
```

### 응답 처리 파이프라인

```
응답 수신 (task, response, timing, context)
        |
        v
[1] 과제 슬롯에서 평가 입력 구축
        |
        v
[2] 배치 평가 (각 객체에 대한 다층 점수화)
        |
        v
[3] 다중 객체 보정 처리 (세타 업데이트)
        |
        v
[4] 사용 이벤트 기록 및 확장 감지
        |
        v
[5] 향상된 피드백 생성 (확장 축하 포함)
        |
        v
IntegratedResponseResult 반환
```

### 아키텍처 계층

이 서비스는 LOGOS 아키텍처의 **애플리케이션 오케스트레이션 계층(Application Orchestration Layer)**에 위치한다:

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
Layer 3: 핵심 알고리즘 (IRT, FSRS, PMI - 순수 함수)
         |
Layer 4: 데이터베이스 리포지토리 & Prisma
```

### 핵심 개념

#### 후보 풀 구축 (Candidate Pool Building)

제한된 여행가방 공간으로 짐을 싸는 것과 같다. 각 항목은 "유용성 점수"와 "무게 비용"을 모두 갖는다. 후보 풀 빌더는 싸갈 수 있는 모든 것을 살펴보고 각 항목의 "파운드당 유용성"을 계산한다.

#### 사용 공간 (Usage Space)

학습자가 언어 객체의 성공적인 사용을 보여준 맥락(도메인 x 레지스터 x 양식 x 장르)의 다차원 표현. 학습 전이 추적과 커버리지 기반 교육과정 계획을 가능하게 한다.

#### 다층 평가 (Multi-Layer Evaluation)

단순히 "맞음 또는 틀림" 대신, 다층 평가는 루브릭을 가진 교사와 같다. 단어를 정확히 썼지만 잘못된 맥락에서 사용했다면 - 철자에 대해서는 부분 점수를 얻지만 용법에서는 감점된다.

#### 레거시 폴백 (Legacy Fallback)

새로운 구성 시스템은 정교하지만 적합한 템플릿이 없거나 후보가 소진되거나 제약 조건이 너무 제한적이면 실패할 수 있다. 레거시 폴백은 백업 발전기와 같다 - 주 전원이 고장 나도 예전의 신뢰할 수 있는 시스템을 사용하여 불이 계속 켜진다.

### 주요 인터페이스

| 인터페이스 | 설명 |
|-----------|------|
| `IntegratedTaskRequest` | 과제 생성 입력 - 세션, 목표, 사용자, 선호도 지정 |
| `IntegratedTaskResult` | 과제 생성 출력 - 생성된 과제, 다중 객체 명세, 제약 전파 세부사항 포함 |
| `IntegratedResponseRequest` | 응답 처리 입력 - 원본 과제, 사용자 응답, 타이밍 정보 포함 |
| `IntegratedResponseResult` | 응답 처리 출력 - 평가 결과, 보정 결과, 사용 공간 확장 포함 |

---

## 다층 평가 서비스 (Multi-Layer Evaluation Service)

> **코드 위치**: `src/main/services/multi-layer-evaluation.service.ts`

### 목적 및 배경

이 모듈은 언어 학습 평가의 근본적인 과제를 해결한다: "정확성"이 흑백이 아닐 때 학습자의 응답을 어떻게 공정하게 평가할 것인가? 실제 언어 사용에서 답변은 부분적으로 정확하거나, 맥락적으로 적절하지만 문법적으로 불완전하거나, 의미적으로 정확하지만 문체적으로 부적절할 수 있다.

이 서비스는 여러 점수화 모드를 갖춘 **객체별 평가(object-specific evaluation)**를 구현하여, LOGOS 시스템이 단순한 합격/불합격 판정 대신 미묘하고 교육적으로 의미 있는 피드백을 제공할 수 있게 한다.

**비즈니스/사용자 필요성**: 학습자는 여러 차원(철자, 문법, 의미, 맥락)에서 응답의 품질을 정확히 반영하는 피드백이 필요하다. 다층 평가 없이는 시스템이 사소한 철자 오류와 개념의 완전한 오해를 구별할 수 없다 - 둘 다 단순히 "틀림"으로 나타날 것이다.

**사용 시점**:
- 사용자가 학습 과제에 응답을 제출할 때마다
- 세션 종료 시 여러 응답의 배치 평가 중
- 평가 결과를 적응 알고리즘의 세타(능력 추정치) 업데이트로 변환할 때

### 데이터 흐름

```
사용자 응답 제출
    |
    v
ObjectEvaluationInput (objectId, response, expected, config)
    |
    v
evaluateObject()가 적절한 모드로 분배:
    |---> evaluateBinary()         --> 단순 정답/오답
    |---> evaluatePartialCredit()  --> 가중 기준의 다층 점수화
    |---> evaluateRangeBased()     --> 허용 변형에 대한 퍼지 매칭
    |---> evaluateRubricBased()    --> 복잡한 총체적/분석적 루브릭 점수화
    |
    v
ObjectEvaluationResult (score, correct, layerScores, feedback, errorType)
    |
    v
evaluationToThetaInput() --> 능력 업데이트를 위한 세타 기여로 변환
    |
    v
다중 객체 보정 서비스 --> 사용자 능력 추정치 업데이트
```

### 아키텍처 계층

이 서비스는 LOGOS 3계층 학습 파이프라인의 **Layer 3 (점수화 + 업데이트)**에 위치한다:

```
Layer 1: 상태 + 우선순위 (다음에 무엇을 가르칠지)
         |
         v
Layer 2: 과제 생성 (어떻게 제시할지)
         |
         v
Layer 3: 이 모듈 - 점수화 + 업데이트 (학습자가 어떻게 했는지?)
         |
         v
Layer 1로 복귀 (업데이트된 능력이 다음 항목 선택에 영향)
```

### 핵심 개념

#### 일반화된 부분 점수 모델 (Generalized Partial Credit Model, GPCM)

시험 문제를 단순히 "맞음" 또는 "틀림"으로 채점하는 대신, 얼마나 근접했는지에 따라 0, 1, 2, 3점을 받을 수 있는 에세이 채점과 같다. 이 모델은 0점에서 1점으로 가는 것이 2점에서 3점으로 가는 것과 다른 기술을 요구할 수 있다는 사실을 수학적으로 설명한다.

#### 다면적 라쉬 측정 (Many-Facet Rasch Measurement, MFRM)

피겨 스케이팅 대회 심사를 상상해보라. 다른 심사위원들이 다른 기준을 갖고, 일부 루틴은 다른 것보다 어렵고, 여러 요소(점프, 스핀, 예술성)를 점수화한다. MFRM은 이러한 모든 차이에도 불구하고 모두의 점수를 공정하게 비교할 수 있도록 조정하는 수학적 심판과 같다.

#### 레벤슈타인 거리 (Levenshtein Distance)

"recieve" 대신 "receive"를 타이핑했다면, 레벤슈타인 거리는 2이다('i'와 'e'를 교환하거나, 'i'를 삭제하고 다른 곳에 삽입). 두 단어를 분리하는 오타나 변경 수를 센다. 이를 사용하여 "근접한" 답변을 감지한다.

#### 평가 계층 (Evaluation Layers)

프레젠테이션을 내용(50%), 전달(30%), 시각 자료(20%)로 별도로 채점한 다음 결합하는 것과 같다. 훌륭한 내용이지만 전달이 좋지 않을 수 있다 - 계층은 각 측면을 독립적으로 보고 해결할 수 있게 한다.

#### 컴포넌트별 기본 평가 계층

| 컴포넌트 | Layer 1 (주요) | Layer 2 | Layer 3 |
|----------|---------------|---------|---------|
| **LEX** (어휘) | 의미 정확성 (50%) | 철자 (30%) | 맥락 적절성 (20%) |
| **MORPH** (단어 형태) | 형태 정확성 (60%) | 철자 (40%) | - |
| **SYNT** (문법) | 구조 (50%) | 일치 (30%) | 어순 (20%) |
| **PRAG** (용법) | 적절성 (40%) | 레지스터 (30%) | 공손성 (30%) |
| **PHON** (발음) | 정확성 (70%) | 이해 가능성 (30%) | - |

### 오류 유형 분류 (Error Type Classification)

단순히 "틀림"이라고 말하는 대신, 어떤 종류의 실수가 이루어졌는지 식별한다:
- **생략(omission)**: 무언가를 빠뜨림
- **대체(substitution)**: 완전히 틀린 단어 사용
- **순서(ordering)**: 어순이 뒤섞임
- **형태(form)**: 올바른 단어지만 틀린 형태, 예: "ran" 대신 "runned"

### 주요 함수

| 함수 | 목적 |
|------|------|
| `evaluateObject(input)` | 주요 진입점. 구성에 따라 적절한 평가 모드로 분배 |
| `evaluateBatch(inputs, config)` | 단일 과제의 여러 객체 평가, 가중 복합 점수 계산 |
| `evaluationToThetaInput(result, role, weight)` | 평가 결과를 세타(능력) 업데이트 시스템으로 연결 |
| `getDefaultLayers(componentType)` | 주어진 언어 컴포넌트 유형의 기본 다층 평가 구성 반환 |

### 학술적 기반

- **Masters, G.N. (1982)**. 부분 점수 채점을 위한 라쉬 모델. *Psychometrika, 47*(2), 149-174.
- **Muraki, E. (1992)**. 일반화된 부분 점수 모델: EM 알고리즘의 적용. *Applied Psychological Measurement, 16*(2), 159-176.
- **Linacre, J.M. (1989)**. *다면적 라쉬 측정*. MESA Press.

---

## 사용 공간 추적 서비스 (Usage Space Tracking Service)

> **코드 위치**: `src/main/services/usage-space-tracking.service.ts`

### 목적 및 배경

이 모듈은 언어 객체의 "사용 공간" - 학습자가 자신의 지식을 성공적으로 보여준 특정 맥락 - 을 추적한다. **한 맥락에서 단어를 아는 것이 모든 맥락에서 아는 것을 보장하지 않기** 때문에 존재한다.

**해결하는 핵심 문제**:

학습자가 일상 대화에서 "administer"라는 단어를 알 때, 그것을 공식적인 의료 보고서에서도 정확하게 사용할 수 있을까? 전통적인 어휘 추적은 "학습자가 이 단어를 아는가?"만 답하지만, LOGOS는 더 깊은 질문을 한다: "학습자가 *실제로 사용할 수 있는* 맥락은 어디인가?"

**비즈니스/사용자 필요성**:

도메인별 인증(간호사를 위한 CELBAN 등)을 준비하는 언어 학습자는 일반 어휘뿐만 아니라 특히 마주치게 될 전문적 맥락에서의 역량을 증명해야 한다. 간호사는 환자 상담, 차트 문서화, 동료 인수인계에서 의료 용어를 사용할 수 있어야 한다 - 세 가지 매우 다른 맥락이다. 이 서비스는 모든 대상 맥락에서의 진행 상황을 추적하고 학습자가 인증 시험에 도달하기 전에 격차를 식별한다.

### 이론적 기반

#### 학습 전이 (Transfer of Learning) - Thorndike, 1901; Singley & Anderson, 1989

자전거 타는 법을 배우면 비슷한 자전거를 탈 수 있지만, 외발자전거는 공유하는 요소가 적기 때문에 추가 학습이 필요하다. 마찬가지로, 환자 맥락에서 "administer medication"을 사용하는 것은 "administer a company"보다 "administer treatment"로 더 쉽게 전이된다.

#### 상황 학습 (Situated Learning) - Lave & Wenger, 1991

조용한 방에서 플래시카드로 의료 용어를 배우는 것은 병원 침대 옆에 서서 그 용어를 사용하는 것과 다르다. 맥락은 지식 자체의 일부이지, 단순한 배경이 아니다.

#### 맥락 의존적 기억 (Context-Dependent Memory) - Godden & Baddeley, 1975

유명한 수중 연구에서, 물속에서 단어를 배운 다이버들은 육지보다 물속에서 더 잘 회상했다. 뇌는 기억을 형성된 장소와 연결한다.

### 데이터 흐름

```
과제 완료
      |
      v
recordUsageEvent()
      |
      +--> 새 맥락인지 확인
      |
      +--> 성공/시도 맥락 업데이트
      |
      +--> 커버리지 비율 재계산
      |
      +--> 확장 후보 식별
      |
      +--> 확장이 발생하면 이벤트 기록
      |
      v
반환: { recorded, expansion, newCoverage }
```

```
과제 생성
      |
      v
selectTaskContext()
      |
      +--> 과제 유형에 적용 가능한 맥락 필터링
      |
      +--> 각 맥락 점수화:
      |    - 대상 맥락인가?
      |    - 이미 숙달되었는가?
      |    - 학습자가 확장 준비가 되었는가?
      |
      v
반환: 최적의 UsageContext
```

### 핵심 개념

#### 사용 맥락 (Usage Context)

특정 커뮤니케이션 상황을 정의하는 도메인(의료, 학술, 개인), 레지스터(격식, 비격식, 기술적), 양식(구어, 문어)의 조합. "친구와 채팅"은 하나의 맥락이고, "의료 차트 작성"은 다른 맥락이다.

#### 커버리지 비율 (Coverage Ratio)

언어 객체가 성공적으로 사용된 대상 맥락의 비율. 목표를 위해 4개의 다른 맥락에서 단어를 알아야 하고 2개에서 성공적으로 보여주었다면, 커버리지 비율은 50%이다.

#### 확장 이벤트 (Expansion Event)

"레벨 업"의 순간 - 학습자가 새로운 상황에서 단어를 사용할 수 있음을 증명할 때. 게임에서 새 영역을 잠금 해제하는 것처럼, 확장 이벤트는 맥락적 능력의 진정한 성장을 표시한다.

#### 맥락 유사성 (Context Similarity)

두 맥락 간의 공유된 특징(도메인, 레지스터, 양식)의 비율을 측정하는 자카드 유사 계수. 의료-문어-기술과 의료-문어-격식은 의료-문어-기술과 개인-구어-비격식보다 더 많은 특징을 공유한다. 높은 유사성은 기술이 더 쉽게 전이됨을 의미한다.

#### 확장 후보 (Expansion Candidates)

아직 숙달되지 않은 대상 맥락으로, 준비 점수(성공적인 맥락과의 유사성 및 이전 시도 성과 기반)로 순위가 매겨진다. 시스템은 학습자가 성공할 가능성이 높지만 여전히 성장 중인 맥락을 선택한다.

### 표준 맥락 참조

서비스는 CEFR 도메인으로 구성된 10개의 사전 구축된 맥락을 정의한다:

| 맥락 ID | 이름 | 도메인 | 레지스터 | 양식 |
|---------|------|--------|----------|------|
| personal-spoken-informal | 일상 대화 | personal | informal | spoken |
| personal-written-informal | 개인 메시지 | personal | informal | written |
| professional-spoken-formal | 전문 회의 | professional | formal | spoken |
| professional-written-formal | 비즈니스 서신 | professional | formal | written |
| professional-written-technical | 기술 문서화 | professional | technical | written |
| medical-spoken-consultative | 환자 상호작용 | medical | consultative | spoken |
| medical-written-technical | 의료 문서화 | medical | technical | written |
| medical-spoken-collegial | 동료 커뮤니케이션 | medical | consultative | spoken |
| academic-written-formal | 학술 글쓰기 | academic | formal | written |
| academic-spoken-formal | 학술 발표 | academic | formal | spoken |

### 주요 함수

| 함수 | 목적 |
|------|------|
| `recordUsageEvent(event)` | 학습자가 과제에서 언어 객체를 사용할 때 기록 |
| `getObjectUsageSpace(objectId)` | 언어 객체의 완전한 사용 공간 검색 |
| `calculateUsageSpaceProgress(goalId)` | 목표의 모든 언어 객체에 걸친 집계 진행 상황 계산 |
| `selectTaskContext(usageSpaces, taskType, preferExpansion)` | 과제를 위한 최적의 맥락 선택 |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-07 | 한국어 통합 번역 문서 생성 |
| 2026-01-06 | 원본 영어 문서 작성 |
