# 문법 모듈 (Grammar Module)

이 문서는 LOGOS 프로젝트의 핵심 문법 모듈에 대한 한국어 번역 문서입니다. 세 개의 원본 파일을 통합하여 작성되었습니다.

---

## index.ts - 문법 모듈 공개 API (Grammar Module Public API)

### 존재 이유 (Why This Exists)

문법 모듈에는 30개 이상의 내보내기(export)가 있는 두 개의 구현 파일이 있습니다. 중앙 인덱스가 없으면 소비자는 각 타입이나 함수가 어느 파일에 있는지 알아야 합니다. 이 인덱스는 내부 구조 세부사항을 숨기면서 완전한 공개 API를 노출하는 단일 가져오기(import) 지점을 제공합니다.

이 패턴은 또한 의도적인 API 설계를 강제합니다: index.ts에 나타나는 것만 안정적인 공개 인터페이스로 간주됩니다. 변경될 수 있는 내부 헬퍼는 해당 구현 파일 내에서 비공개로 유지됩니다.

### 핵심 개념 (Key Concepts)

- **타입 내보내기 (Type Exports)**: 모든 문법 관련 타입은 TypeScript 소비자를 위해 `type` 키워드로 재내보내기됩니다:
  - `GrammarCategory`, `ClauseType`, `SyntacticFunction`: 분류를 위한 열거형(Enum)
  - `CognitiveLoadMetrics`, `SyntacticConstruction`: 핵심 데이터 구조
  - `GrammarLearningSequence`, `ConstructionMasteryState`: 학습 상태 타입
  - `SequenceOptimizationConfig`, `ScoredConstruction`, `SequenceOptimizationResult`, `GrammarSessionPlan`: 최적화기(Optimizer) 타입

- **구문 라이브러리 (Construction Library)**: `CORE_CONSTRUCTIONS`는 20개 이상의 문법 패턴과 메타데이터를 포함하는 읽기 전용 레코드입니다.

- **쿼리 함수 (Query Functions)**: 구문 라이브러리를 필터링하는 유틸리티:
  - `getConstructionsByCategory()`: 문법 카테고리별 필터링
  - `getConstructionsForLevel()`: CEFR 레벨까지의 구문 가져오기
  - `getCoreConstructions()`: 필수 구문만 가져오기
  - `getConstructionsByComplexity()`: 복잡도 범위별 필터링
  - `getAllPrerequisites()`: 구문의 모든 선행조건을 재귀적으로 가져오기
  - `calculateTotalCognitiveLoad()`: 평균 인지 부하 점수 계산

- **최적화기 내보내기 (Optimizer Exports)**: 시퀀스 최적화기와 팩토리:
  - `GrammarSequenceOptimizer`: 메인 클래스
  - `createGrammarOptimizer()`: 선택적 설정이 있는 팩토리
  - `generateGrammarSequence()`: 한 줄짜리 편의 함수
  - `getConstructionsForStage()`: 숙달 단계에 적합한 구문 가져오기

### 설계 결정 (Design Decisions)

**모든 내보내기는 명시적이며 `*`로 재내보내기하지 않습니다**. 이는 내부 헬퍼의 우발적 노출을 방지하고 API 표면을 자체 문서화합니다. index.ts를 읽는 누구나 즉시 완전한 공개 인터페이스를 볼 수 있습니다.

**타입은 `export type` 구문을 사용합니다**. 이는 적절한 트리 쉐이킹(tree-shaking)을 가능하게 하고 어떤 내보내기가 런타임 값인지 컴파일 시간 전용인지 명확하게 합니다.

**두 개의 소스 파일, 하나의 모듈**. `syntactic-construction.ts`(데이터 + 쿼리)와 `grammar-sequence-optimizer.ts`(알고리즘) 간의 분리는 관심사 분리를 반영하지만, 소비자는 통합된 모듈을 봅니다.

### 통합 지점 (Integration Points)

- **`syntactic-construction.ts`에서**: 모든 타입 정의, `CORE_CONSTRUCTIONS` 라이브러리, 쿼리/유틸리티 함수.

- **`grammar-sequence-optimizer.ts`에서**: 최적화기 클래스, 설정 타입, 결과 타입, 팩토리 함수.

- **서비스 계층에서 소비됨**: 메인 프로세스 서비스는 `@/core/grammar`에서 가져와 학습 시퀀스를 생성하고 구문 우선순위를 계산합니다.

- **IPC 핸들러에서 소비됨**: 핸들러는 이 모듈을 사용하여 렌더러 프로세스에 문법 시퀀싱을 노출합니다.

- **Gap 4.1 구현**: 모듈 헤더는 이것이 프로젝트의 갭 분석에서 문법 구성 알고리즘(Grammar Organization Algorithm)의 구현임을 명시적으로 참조합니다.

---

## grammar-sequence-optimizer.ts - 최적 학습 경로 생성 (Optimal Learning Path Generation)

### 존재 이유 (Why This Exists)

언어 학습자는 합리적인 순서로 문법 구문을 습득해야 하지만, 그 순서를 결정하는 것은 간단하지 않습니다. 일부 패턴은 다른 것보다 먼저 배워야 하고(선행조건), 일부는 더 빈번하여 초기에 더 가치 있으며, 학습자는 세션당 제한된 인지 용량을 가집니다. 이 모듈은 선행조건을 준수하고, 고가치 구문을 우선시하며, 인지 과부하를 피하는 최적의 학습 경로를 계산하여 시퀀싱 문제를 해결합니다.

이 알고리즘은 GAPS-AND-CONNECTIONS.md의 Gap 4.1을 해결합니다: 지능적인 시퀀싱 없이는 학습자가 기초가 부족한 구문을 마주하거나, 일반적인 패턴이 미학습 상태로 남아있는 동안 희귀한 패턴에 시간을 낭비하게 됩니다.

### 핵심 개념 (Key Concepts)

- **ScoredConstruction**: 우선순위 점수(0-100+)와 그 점수가 매겨진 이유의 분석이 쌍을 이루는 구문입니다. 빈도, 복잡도, 선행조건 수, 숙달 상태, 인지 부하 하위점수를 포함합니다. 또한 모든 선행조건이 충족되었는지(`readyToLearn`)를 추적합니다.

- **SequenceOptimizationConfig**: 최적화기의 동작을 제어합니다:
  - `targetLevel`: CEFR 상한선 (A1-C2)
  - `maxCognitiveLoad`: 세션 강도 제한 (1-5 척도)
  - `frequencyFirst`: 단순한 것보다 일반적인 패턴을 우선시할지 여부
  - `masteryStates`: 중복 시퀀싱을 피하기 위한 기존 학습자 진도

- **GrammarSessionPlan**: 인지 부하 제한을 준수하는 시간 제한 세션으로 구문을 그룹화합니다. 각 세션은 구문당 ~15분과 권장 과제 유형을 받습니다.

- **우선순위가 있는 위상 정렬 (Topological Sort with Priority)**: 핵심 알고리즘은 칸 알고리즘(Kahn's algorithm)을 사용하여 각 단계에서 사용 가능한 가장 높은 우선순위 구문을 선택하면서 선행조건을 준수합니다. 순환을 순수 우선순위 정렬로 대체하여 우아하게 처리합니다.

- **구문 우선순위 점수 (Syntactic Priority Score)**: 단어가 어떤 구문을 예시하는지와 그 구문에 대한 학습자의 현재 숙달도를 기반으로 문법 학습에 얼마나 가치 있는지 계산합니다.

### 설계 결정 (Design Decisions)

**우선순위 점수는 가산적 구성요소를 사용합니다(곱셈이 아님)**. 한 요소가 약하더라도 구문이 높은 점수를 받을 수 있습니다. 이는 단일 낮은 지표가 그 외에는 좋은 후보를 죽이는 "제로아웃" 상황을 방지합니다. 가중치는: 빈도 (0-30), 복잡도 역수 (0-25), 선행조건 수 역수 (0-20), 숙달 격차 (0-15), 인지 부하 역수 (0-10), 핵심 구문 보너스 (+10), 빈도 우선 모드 (+50% 빈도)입니다.

**세션 계획은 탐욕적 빈 패킹(greedy bin-packing) 접근법을 사용합니다**. 시간이나 인지 부하 제한이 초과될 때까지 현재 세션에 구문이 추가되고, 그 다음 새 세션이 시작됩니다. 이는 간단하지만 효과적인데, 구문이 이미 위상 정렬에서 최적의 순서에 있기 때문입니다.

**빈도 우선 토글은 학습자 목표가 다르기 때문에 존재합니다**. 대화 중심 여행을 준비하는 사람은 빈번한 패턴의 혜택을 받고, 학술 작문을 공부하는 사람은 먼저 복잡성 기초를 쌓는 것이 유익합니다.

**숙달 단계 필터링은 반복을 방지합니다**. 이미 단계 4(숙달됨)에 있는 구문은 우선순위가 낮아집니다. 단계 1-3에 있는 구문은 능동적 학습 구문이 강화의 혜택을 받기 때문에 구문 우선순위 계산에서 1.5배 부스트를 받습니다.

### 통합 지점 (Integration Points)

- **`syntactic-construction.ts`에서 가져오기**: 전체 구문 라이브러리 (`CORE_CONSTRUCTIONS`), 타입 정의 (`SyntacticConstruction`, `GrammarLearningSequence` 등), 유틸리티 (`getAllPrerequisites`, `calculateTotalCognitiveLoad`).

- **`core/types`에서 가져오기**: 학습자 진도 단계(0-4)를 추적하는 `MasteryStage` 타입.

- **과제 생성에서 소비됨**: 세션 계획의 `taskTypes` 배열은 어떤 연습 유형이 생성될지 결정합니다. 카테고리는 과제에 매핑됩니다: verb_system -> tense_transformation, modification -> sentence_combining 등.

- **어휘 통합에서 사용됨**: `computeSyntacticPriority()`는 어휘 항목 순위를 매길 때 호출되도록 설계되어, 학습자가 현재 작업 중인 구문에서 예시로 나타나는 단어를 부스트합니다.

- **`index.ts`를 통해 내보내기됨**: 클래스, 팩토리 함수 (`createGrammarOptimizer`), 편의 헬퍼 (`generateGrammarSequence`, `getConstructionsForStage`)가 모두 외부 소비를 위해 재내보내기됩니다.

---

## syntactic-construction.ts - 문법 패턴 라이브러리 및 타입 정의 (Grammar Pattern Library and Type Definitions)

### 존재 이유 (Why This Exists)

언어 학습 시스템은 문법의 구조화된 표현이 필요합니다. 이 파일은 "구문 구조(syntactic construction)"가 무엇인지 정의하고 복잡도, 빈도, 선행조건별로 구성된 20개 이상의 영어 구문의 큐레이션된 라이브러리를 제공합니다. 이 기초가 없으면 시스템은 가르칠 문법이 없고, 어떤 패턴이 다른 것보다 어려운지 알 방법이 없으며, 수업을 시퀀싱할 기반이 없습니다.

구문 라이브러리는 수십 년의 응용 언어학 연구를 알고리즘이 추론할 수 있는 기계 판독 가능한 형식으로 인코딩합니다.

### 핵심 개념 (Key Concepts)

- **SyntacticConstruction**: 문법 패턴을 나타내는 중심 데이터 타입입니다. 각 구문에는 다음이 포함됩니다:
  - 식별: `id`, `name`, `description`
  - 분류: `category` (clause_structure, verb_system 등), `clauseTypes`, `isCore`
  - 패턴: `pattern` 표기법 (예: "S + V + O"), `examples`
  - 지표: `complexity` (0-1), `frequency` (0-1 코퍼스 정규화)
  - 의존성: `prerequisites`, `enablesLearning`
  - 교수법: `exemplarWords`, `components`, `cognitiveLoad`, `masteryRange`, `cefrLevel`
  - 오류 정보: `commonErrors`, `l1Interference`

- **GrammarCategory**: 영어 문법을 다루는 9개 카테고리:
  - `clause_structure`: 기본 문장 패턴 (SVO, SVC, 의문문, 부정문)
  - `verb_system`: 시제, 상, 법, 태
  - `nominal_system`: 관사, 한정사, 수량사
  - `modification`: 형용사, 부사, 관계절
  - `coordination`: 접속사, 복합 구조
  - `subordination`: 복문, 내포절
  - `information_structure`: 초점, 주제, 분열문
  - `special_constructions`: 존재문, 조건문, 비교문

- **CognitiveLoadMetrics**: 5차원 인지 부하 모델 (각각 1-5 척도):
  - `processingLoad`: 실시간 파싱 난이도
  - `memoryDemand`: 작업 기억 요구사항
  - `attentionRequired`: 사용 중 필요한 집중력
  - `integrationComplexity`: 얼마나 많은 규칙이 결합되어야 하는지
  - `transferDifficulty`: 새로운 맥락에 적용하기

- **CORE_CONSTRUCTIONS**: 라이브러리 자체, 5개 레벨로 구성:
  - 레벨 1 (A1): 기본 절 - SVO, SV, SVC, 예/아니오 의문문, 부정문
  - 레벨 2 (A1-A2): 동사 기초 - 현재 단순/진행, 과거 단순, 미래 will
  - 레벨 3 (A2-B1): 복잡한 구조 - 현재 완료, 수동태, wh-의문문, 관계절
  - 레벨 4 (B1-B2): 고급 - 조건문 (1차, 2차), 간접 화법, 존재 there
  - 레벨 5 (B2-C1): 복잡한 종속 - 내포 의문문, it-분열문, 3차 조건문, 분사절

### 설계 결정 (Design Decisions)

**선행조건은 임의의 의존성이 아닌 DAG(방향 비순환 그래프)를 형성합니다**. 각 구문은 직접적인 선행조건만 나열합니다; `getAllPrerequisites()` 함수가 전이적 폐쇄(transitive closure)를 계산합니다. 이는 데이터를 깔끔하게 유지하고 순환 감지를 간단하게 만듭니다.

**인지 부하는 하나가 아닌 5개 차원을 사용합니다**. 구문이 처리하기는 쉽지만 전이하기는 어려울 수 있습니다(예: 단순 현재). 다른 구문은 높은 기억력을 요구하지만 낮은 주의력을 필요로 할 수 있습니다(예: 수동태 패턴). 5개 차원은 이러한 트레이드오프를 포착합니다; `calculateTotalCognitiveLoad()`는 필요할 때 단일 점수로 평균을 냅니다.

**L1 간섭은 선택적이며 언어별로 키가 지정됩니다**. 모든 구문에 간섭 노트가 있는 것은 아니지만, 일반적인 L1 전이 오류가 문서화된 곳(예: 일본어 SOV가 영어 SVO로 전이)에서는 언어별로 캡처됩니다. 이는 미래의 L1 인식 교육을 가능하게 합니다.

**빈도는 원시 카운트가 아닌 코퍼스 정규화(0-1)됩니다**. 이는 코퍼스 크기를 알 필요 없이 구문 간에 빈도를 비교 가능하게 만듭니다. 값은 원시 BNC/COCA 카운트가 아닌 교육적 빈도 연구에서 나옵니다.

**예시 단어는 문법을 어휘에 연결합니다**. 각 구문은 해당 패턴과 일반적으로 사용되는 단어를 나열합니다. 이는 시스템이 현재 학습 중인 구문을 강화하는 어휘를 선택할 수 있게 합니다.

**라이브러리는 클래스가 아닌 const Record입니다**. 구문은 동작이 있는 런타임 객체가 아닌 정적 참조 데이터입니다. 평범한 레코드가 가장 간단하고 직접 속성 접근을 가능하게 합니다 (`CORE_CONSTRUCTIONS.svo_basic`).

### 통합 지점 (Integration Points)

- **`core/types`에서 가져오기**: 구문 필드 타이핑을 위한 `ComponentType`과 `MasteryStage`.

- **`grammar-sequence-optimizer.ts`에서 소비됨**: 최적화기는 학습 시퀀스를 구축하기 위해 구문, 타입, 유틸리티를 가져옵니다.

- **`index.ts`를 통해 내보내기됨**: 모든 타입, 구문 라이브러리, 쿼리 함수가 모듈의 공개 API로 재내보내기됩니다.

- **어휘 서비스에서 사용됨**: `exemplarWords` 필드는 문법 구문을 어휘 선택에 연결합니다. 학습자가 현재 완료형을 작업 중일 때, "have", "been", "done" 같은 단어가 부스트됩니다.

- **과제 생성에서 사용됨**: `commonErrors`와 `l1Interference` 필드는 오류 수정 및 빈칸 채우기 과제 설계에 정보를 제공합니다.

- **숙달 추적에서 사용됨**: `ConstructionMasteryState` 타입은 인식/생산 정확도와 오류 이력을 포함한 구문별 진도를 추적하기 위해 서비스에서 사용됩니다.
