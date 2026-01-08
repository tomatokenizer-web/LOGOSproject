# 핵심 언어학 모듈 2부: 의미망, 통사론, 화용론

> **최종 업데이트**: 2026-01-07
> **번역 원본**: semantic-network.md, syntactic.md, pragmatics.md

---

## 의미망 모듈 (Semantic Network Module)

> **코드 위치**: `src/core/semantic-network.ts`
> **상태**: 활성

---

### 맥락 및 목적

이 모듈은 어휘 관계를 위한 **의미망 모델(semantic network model)**을 구현합니다. LOGOS가 단어들이 서로 어떻게 연결되는지 이해할 수 있도록 언어학적 지식을 제공합니다 - 유의어(synonymy), 반의어(antonymy), 상위어(hypernymy, 범주 관계), 연어(collocations)를 통해서 말입니다.

**비즈니스 필요성**: 언어 학습은 고립된 단어를 암기하는 것만이 아닙니다. 학습자는 단어들이 어떻게 연결되는지 이해해야 합니다 - "big"과 "large"가 비슷한 의미라는 것, "hot"이 "cold"의 반대라는 것, "dog"이 "animal"의 한 종류라는 것을. 이러한 의미적 지식은 학습자가 다음을 수행하는 데 도움이 됩니다:
- 맥락에 맞는 올바른 단어 선택 (유의어가 항상 교환 가능한 것은 아님)
- 의미 관계 이해 ("vehicle"을 알면 "car," "bus," "truck"에 도움이 됨)
- 혼동 방지 (반의어, 유사한 철자)
- 자연스러운 표현 구축 (연어)

**사용 시점**:
- 과제 생성: 의미 지식을 테스트하는 연습문제 만들기
- 오답 선택: 실제 구별을 테스트하는 오답 선정
- 어휘 확장: 다음에 학습할 관련 단어 제안
- 난이도 계산: 연결이 많은 단어가 학습하기 더 쉬움
- 네트워크 시각화: 학습자에게 어휘가 어떻게 연결되는지 보여주기

---

### 미시적 규모: 직접 관계 (Microscale: Direct Relationships)

#### 의존성 (이 모듈이 필요로 하는 것)

이 모듈은 외부 의존성 없이 **자체 완결적**입니다. 포함 사항:
- 내장 어휘 데이터 (유의어 그룹, 반의어 쌍, 상위어 계층)
- 파일 내 타입 정의

#### 피의존성 (이 모듈을 필요로 하는 것)

**핵심 모듈:**
- `src/core/priority.ts`: FRE 계산에서 관계 밀도 사용
- `src/core/tasks/distractor-generator.ts`: 오답지에 유의어/반의어 사용
- `src/core/content/content-generator.ts`: 맥락을 위해 의미 필드 사용

**서비스 레이어:**
- `src/main/services/pmi.service.ts`: 의미 관계로 PMI 보완
- `src/main/services/task-generation.service.ts`: 과제 생성에 의미 데이터 사용

**렌더러:**
- `src/renderer/components/analytics/NetworkGraph.tsx`: 의미망 시각화

#### 데이터 흐름

```
사용자가 "happy" 단어를 학습 중
            |
            v
findSynonyms("happy")  -----> ["joyful", "cheerful", "glad", "delighted"]
            |
            v
findAntonyms("happy")  -----> ["sad", "unhappy"]
            |
            v
buildSemanticNetwork("happy", depth=2)
            |
            v
+-------------------------------------------------------+
|  네트워크 시각화:                                      |
|  - 중심: "happy"                                      |
|  - 연결: 유의어, 반의어                               |
|  - 확장: 깊이 2의 관련 단어들                         |
+-------------------------------------------------------+
```

---

### 거시적 규모: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어

이 모듈은 IRT, FSRS, PMI와 함께 **핵심 알고리즘(Core Algorithm)** 레이어에 위치합니다:

```
+-----------------------------------------------+
| 렌더러: NetworkGraph 시각화                    |
+-----------------------------------------------+
                    |
                    v
+-----------------------------------------------+
| 서비스: 과제 생성, PMI 분석                    |
+-----------------------------------------------+
                    |
                    v
+-----------------------------------------------+
| 핵심 알고리즘:                                 |
|   IRT    FSRS    PMI    SEMANTIC-NETWORK      |  <-- 현재 위치
|                          (이 모듈)            |
+-----------------------------------------------+
```

#### 전체적 영향 (Big Picture Impact)

의미망은 LOGOS에 **언어학적 지능(linguistic intelligence)**을 제공합니다:

| 기능 | 의미망이 가능하게 하는 것 |
|------|--------------------------|
| 오답 생성 | 의미적으로 관련된 오답이 실제 지식을 테스트 |
| 어휘 확장 | "X를 알면 다음에 Y를 배우세요" 추천 |
| 난이도 추정 | 네트워크 위치가 학습 난이도에 영향 |
| 맥락 생성 | 의미 필드가 자연스러운 맥락 제공 |
| 오류 분석 | 유의어 혼동이 이해 격차 드러냄 |

**의미망 없이는:**
- 오답이 무작위가 됨 (실제 구별을 테스트하지 않음)
- 어휘 학습이 고립됨 (연결 없음)
- 다음에 무엇을 배울지 제안할 원칙적 방법 없음
- 네트워크 시각화 불가능
- 난이도가 의미 관계를 무시함

#### 임계 경로 분석 (Critical Path Analysis)

**중요도 수준**: 높음 (언어학적 기반)

- **유의어 데이터가 틀리면**: 학습자가 잘못된 의미 정보를 얻음
- **반의어 데이터가 불완전하면**: 중요한 대조가 누락됨
- **계층이 부정확하면**: 범주 관계가 학습자를 오도함

**데이터 품질**: 내장 데이터는 일반적인 영어 어휘를 다룹니다. 도메인 특화 어휘(의료, 법률)의 경우 추가 소스가 필요할 수 있습니다.

---

### 어휘 관계 유형 (Lexical Relation Types)

#### 유의어 (Synonymy) - 같은 의미

**정의**: 서로 대체할 수 있는 비슷한 의미를 가진 단어들.

**데이터 구조**: `SYNONYM_GROUPS`는 의미 도메인별로 유의어를 조직합니다:
```typescript
{
  emotion: [
    ['happy', 'joyful', 'cheerful', 'glad', 'delighted', 'pleased'],
    ['sad', 'unhappy', 'sorrowful', 'melancholy', 'dejected'],
    // ...
  ],
  // ...
}
```

**핵심 통찰**: 유의어는 완벽하게 교환 가능하지 않습니다. "Big"과 "large"는 유의어이지만, "big sister"는 "large sister"가 아닙니다. 이 그룹은 대체 가능성이 아닌 의미적 근접성을 보여줍니다.

#### 반의어 (Antonymy) - 반대 의미

**정의**: 어떤 차원에서 반대 의미를 가진 단어들.

**데이터 구조**: `ANTONYM_PAIRS`를 튜플로:
```typescript
[
  ['good', 'bad'],
  ['hot', 'cold'],
  ['up', 'down'],
  // ...
]
```

**핵심 통찰**: 반의어에는 유형이 있습니다:
- **등급적(Gradable)**: hot-cold (척도상의 정도)
- **상보적(Complementary)**: dead-alive (중간 지대 없음)
- **관계적(Relational)**: buy-sell (반대 역할)

#### 상위어/하위어 (Hypernymy/Hyponymy) - 범주 관계

**정의**: 상위어(Hypernym) = 더 일반적인 범주 ("animal"). 하위어(Hyponym) = 더 구체적인 유형 ("dog").

**데이터 구조**: `HYPERNYM_HIERARCHIES`를 트리 구조로:
```typescript
[
  ['animal', ['dog', 'cat', 'bird', 'fish', ...]],
  ['dog', ['poodle', 'bulldog', 'labrador', ...]],
  // ...
]
```

**핵심 통찰**: 이것은 상속을 생성합니다. "dog"를 알면 이미 "animal"의 일부 속성을 알고 있습니다. 이것이 전이 학습을 가능하게 합니다.

#### 연어 (Collocations) - 단어 파트너십

**정의**: 자연어에서 자주 함께 나타나는 단어들.

**데이터 구조**: `COLLOCATIONS`는 동사를 전형적인 명사 파트너에 매핑합니다:
```typescript
{
  make: ['decision', 'mistake', 'progress', 'effort', ...],
  take: ['time', 'action', 'place', 'risk', ...],
  // ...
}
```

**핵심 통찰**: "Make a decision"은 자연스럽고, "do a decision"은 자연스럽지 않습니다. 원어민은 연어를 직관적으로 알지만, 학습자는 명시적으로 습득해야 합니다.

---

### 핵심 함수 (Core Functions)

#### 조회 함수 (Lookup Functions)

| 함수 | 입력 | 출력 | 목적 |
|------|------|------|------|
| `findSynonyms(word)` | "happy" | ["joyful", "cheerful", ...] | 비슷한 의미의 단어 찾기 |
| `findAntonyms(word)` | "hot" | ["cold"] | 반대 의미의 단어 찾기 |
| `findHypernyms(word)` | "dog" | ["animal"] | 범주 찾기 (더 일반적) |
| `findHyponyms(word)` | "animal" | ["dog", "cat", ...] | 유형 찾기 (더 구체적) |
| `findCollocations(word)` | "make" | ["decision", "mistake", ...] | 전형적 파트너 찾기 |

#### 분석 함수 (Analysis Functions)

##### `calculateSemanticSimilarity(word1, word2)`

여러 척도를 사용하여 두 단어가 얼마나 유사한지 계산합니다:

```typescript
{
  word1: "happy",
  word2: "joyful",
  pathSimilarity: 0.9,      // 유의어/계층 거리 기반
  icSimilarity: 0.81,       // 정보 내용 기반
  distribSimilarity: 0.77,  // 공기(共起) 기반
  combinedScore: 0.83       // 가중 평균
}
```

**쉬운 설명**: 이것은 유사성을 측정하는 여러 방법을 결합합니다. "Happy"와 "joyful"은 유의어이고(높은 경로 유사성), 비슷한 의미를 가지며(높은 IC), 유사한 맥락에서 나타나기(높은 분포적 유사성) 때문에 유사합니다.

##### `buildSemanticNetwork(word, depth)`

관련 단어의 그래프를 구성합니다:

```typescript
{
  nodes: [
    { id: "happy", type: "word", centrality: 1.0 },
    { id: "joyful", type: "word", centrality: 0.5 },
    { id: "sad", type: "word", centrality: 0.5 },
    // ...
  ],
  edges: [
    { source: "happy", target: "joyful", relation: "synonym" },
    { source: "happy", target: "sad", relation: "antonym" },
    // ...
  ],
  stats: { nodeCount: 15, edgeCount: 20, averageDegree: 2.67, density: 0.1 }
}
```

**쉬운 설명**: 한 단어에서 시작하여 모든 관계를 통해 바깥으로 탐색합니다. Depth=1은 직접 이웃을 얻고, Depth=2는 이웃의 이웃을 얻습니다. 결과는 대상 단어를 중심으로 한 미니 네트워크입니다.

##### `calculateNetworkBasedDifficulty(word)`

네트워크 위치를 기반으로 단어를 배우기가 얼마나 어려운지 추정합니다:

```typescript
{
  difficulty: 0.45,  // 0-1 척도
  factors: {
    synonymDensity: 0.6,    // 유의어가 많을수록 = 쉬움 (학습 고리가 많음)
    hierarchyDepth: 0.3,    // 깊을수록 = 어려움 (더 구체적)
    polysemy: 0.2,          // 여러 의미 = 어려움
    abstractness: 0.5       // 추상적 = 구체적보다 어려움
  }
}
```

**쉬운 설명**: 단어는 많은 유의어가 있으면(이해할 방법이 여러 개), 계층에서 너무 깊지 않으면(너무 전문적이지 않음), 단일 의미를 가지면(혼란스럽지 않음), 구체적이면(시각화하기 쉬움) 배우기 쉽습니다.

#### 학습 지원 함수 (Learning Support Functions)

##### `suggestVocabularyExpansion(knownWords, count)`

현재 어휘를 기반으로 다음에 무엇을 배울지 제안합니다:

```typescript
suggestVocabularyExpansion(['happy', 'big', 'run'], 5)
// 반환:
[
  { word: 'joyful', reason: '"happy"의 유의어 - 표현 다양성 확장', priority: 0.8 },
  { word: 'sad', reason: '"happy"의 반대 - 대조 이해 구축', priority: 0.7 },
  { word: 'large', reason: '"big"의 유의어 - 표현 다양성 확장', priority: 0.8 },
  // ...
]
```

**쉬운 설명**: "happy"를 알면 "joyful"을 배우는 것이 효율적입니다(서로 강화함). "sad"를 배우면 대조 이해가 구축됩니다. 제안은 이미 알고 있는 것에 기반하여 얼마나 가치 있는지에 따라 우선순위가 매겨집니다.

##### `findBridgeWords(domain1Words, domain2Words)`

두 의미 도메인을 연결하는 단어를 찾습니다:

```typescript
findBridgeWords(['patient', 'diagnosis'], ['data', 'analysis'])
// 의료와 데이터 분석 맥락 모두에 나타나는 단어 반환
```

**쉬운 설명**: 일부 단어는 여러 도메인에 속합니다. "Analysis"는 의학과 데이터 과학을 연결합니다. "Treatment"는 의학과 심리학을 연결합니다. 브릿지 단어는 학습자가 도메인 간에 지식을 전이하는 데 도움이 됩니다.

---

### 기술 개념 (쉬운 설명) (Technical Concepts - Plain English)

#### 동의어 집합 (Synset - Synonym Set)

**기술적**: 워드넷에서 조직된 것처럼 동일한 기저 개념을 나타내는 어휘 항목(표제어) 집합.

**쉬운 설명**: 같은 것을 의미하는 단어 그룹. "happiness"의 동의어 집합에는 "felicity," "joy" 및 해당 개념을 나타내는 다른 단어가 포함됩니다. 각 동의어 집합은 하나의 의미를 포착합니다 - 여러 의미를 가진 단어는 여러 동의어 집합에 속합니다.

**사용 이유**: 동의어 집합은 단어 의미를 구별하는 데 도움이 됩니다. "Bank"(금융)와 "bank"(강둑)은 다른 동의어 집합입니다. 이것은 관련 없는 의미를 혼동하는 것을 방지합니다.

#### 상위어 / 하위어 (Hypernym / Hyponym)

**기술적**: IS-A 계층에서 상위어는 더 일반적인 용어이고 하위어는 더 구체적인 용어입니다. "Dog" IS-A "animal" (animal = 상위어, dog = 하위어).

**쉬운 설명**: 범주를 위한 가계도와 같습니다. "Animal"이 부모이고 "dog"이 자식입니다. 부모를 알면 자식을 이해하는 데 도움이 됩니다(개는 동물 속성을 가짐). 그 반대도 마찬가지입니다(개를 알면 동물에 대해 뭔가 알게 됨).

**사용 이유**: 범주 관계는 전이를 가능하게 합니다. "vehicle"을 배우면 공유 속성 때문에 "car," "bus," "truck"이 더 쉬워집니다.

#### 연어 (Collocation)

**기술적**: 우연보다 더 자주 함께 나타나는 단어 시퀀스로, 종종 반고정 표현을 형성함.

**쉬운 설명**: 원어민에게 "맞게 들리는" 단어 파트너십. "Heavy rain"(자연스러움), "strong rain"은 아님(부자연스러움). "Make a decision"(자연스러움), "do a decision"은 아님(부자연스러움).

**사용 이유**: 연어는 유창성에 결정적입니다. 올바른 연어를 사용하는 학습자는 자연스럽게 들리고, 그렇지 않은 학습자는 문법이 완벽해도 외국인처럼 들립니다.

#### 의미 유사성 (Semantic Similarity)

**기술적**: 어휘 계층 내 위치, 정보 내용 및/또는 분포 패턴에서 계산된 두 단어가 의미에서 얼마나 가까운지의 척도.

**쉬운 설명**: 두 단어가 얼마나 유사한지 말하는 숫자(0-1). "Big"과 "large" = 0.9(매우 유사). "Big"과 "small" = 0.3(관련되지만 반대). "Big"과 "democracy" = 0.1(관련 없음).

**사용 이유**: 유사성은 오답 선택(유사하지만 틀린 답), 유의어 제안, 어휘 조직에 도움이 됩니다.

#### 네트워크 중심성 (Network Centrality)

**기술적**: 연결의 수와 품질에 기반한 그래프에서 노드의 중요도 척도.

**쉬운 설명**: 어휘 네트워크에서 단어가 얼마나 "중심적"인지. "good," "make," "have"와 같은 높은 중심성 단어는 많은 다른 단어와 연결됩니다. "quixotic"과 같은 낮은 중심성 단어는 더 고립되어 있습니다.

**사용 이유**: 중심 단어는 종종 높은 가치의 학습 대상입니다(많은 관련 단어의 이해를 열어줌).

---

### 데이터 커버리지 (Data Coverage)

#### 유의어 그룹

| 도메인 | 그룹 | 총 단어 |
|--------|------|---------|
| 크기 | 4 그룹 | ~20 단어 |
| 감정 | 5 그룹 | ~30 단어 |
| 움직임 | 3 그룹 | ~15 단어 |
| 발화 | 5 그룹 | ~25 단어 |
| 인지 | 4 그룹 | ~20 단어 |
| 품질 | 5 그룹 | ~25 단어 |
| 양 | 4 그룹 | ~20 단어 |
| 시간 | 4 그룹 | ~20 단어 |

#### 반의어 쌍

- 50개 이상의 일반적인 반의어 쌍
- 형용사, 동사, 일부 명사 포함
- 등급적 및 상보적 반의어 모두

#### 상위어 계층

- 20개 이상의 계층
- 구체 명사 포함 (동물, 차량, 음식)
- 상위어당 5-10개의 하위어

#### 연어

- 10개의 고빈도 동사
- 동사당 10개의 연어
- 학습자가 어려워하는 조합에 초점

---

### 제한사항 및 향후 작업 (Limitations and Future Work)

#### 현재 제한사항

1. **영어만**: 다국어 지원 없음
2. **일반 어휘**: 도메인 특화 용어는 추가 소스 필요
3. **정적 데이터**: 학습이나 적응 없음
4. **얕은 계층**: 대부분 2레벨만
5. **의미 구별 없음**: 다의어가 단일 단위로 처리됨

#### 잠재적 확장

1. **워드넷 통합**: 전체 어휘 데이터베이스 커버리지
2. **도메인 어휘**: 의료, 법률, 기술 하위집합
3. **임베딩 기반 유사성**: 더 넓은 커버리지를 위한 신경 단어 임베딩
4. **다국어 네트워크**: 전이를 위한 L1-L2 매핑
5. **동적 확장**: 사용자 데이터에서 새로운 관계 학습

---

### 학술 참고문헌

- Miller, G.A. (1995). WordNet: A Lexical Database for English
- Fellbaum, C. (1998). WordNet: An Electronic Lexical Database
- Turney, P.D. & Pantel, P. (2010). From Frequency to Meaning
- Mikolov, T. et al. (2013). Distributed Representations of Words and Phrases

---

## 통사적 복잡성 분석 모듈 (Syntactic Complexity Analysis Module)

> **코드 위치**: `src/core/syntactic.ts`
> **상태**: 활성
> **이론적 기반**: ALGORITHMIC-FOUNDATIONS.md 6.2부, THEORETICAL-FOUNDATIONS.md 섹션 2.2 (LanguageObjectVector.syntactic)

---

### 맥락 및 목적

#### 이 모듈이 존재하는 이유

통사적 복잡성 분석 모듈은 다음 질문에 답합니다: **"이 문장은 구조적으로 얼마나 복잡하고, 어떤 CEFR 수준을 요구하는가?"**

다음 두 문장을 고려해보세요:
1. "The patient was admitted." (A2 수준)
2. "Although the patient initially presented with symptoms that suggested a routine infection, subsequent laboratory findings, which were obtained after the physician ordered additional tests, indicated a more complex underlying condition that required immediate intervention." (C1/C2 수준)

둘 다 의료 정보를 전달하지만, 두 번째 문장은 다음으로 인해 훨씬 더 많은 인지 처리를 요구합니다:
- 다중 내포절(multiple embedded clauses) (생각 안의 생각의 층)
- 수동 구문 ("was obtained", "were obtained")
- 긴 의존 거리 (서로 관련된 단어가 멀리 떨어져 있음)
- 높은 종속(subordination) (많은 종속절이 주절에 붙음)

**비즈니스 필요성**: LOGOS는 다른 목표(간호사를 위한 CELBAN, 학자를 위한 IELTS, 비즈니스 영어 등)를 준비하는 다른 숙달 수준의 학습자에게 서비스를 제공합니다. 통사 분석은 다음을 가능하게 합니다:

1. **콘텐츠 난이도 매칭**: 학습자가 자신의 수준에 적합한 문장을 보도록 보장
2. **CEFR 수준 추정**: 모든 텍스트를 A1-C2 숙달 척도에 자동 매핑
3. **과제 난이도 보정**: 더 어려운 통사 = 더 어려운 과제 (IRT 매개변수 조정)
4. **장르 준수**: 의료 SOAP 노트는 비즈니스 이메일과 다른 통사적 기대를 가짐
5. **단순화 안내**: 콘텐츠 제작자에게 낮은 수준을 위해 텍스트를 단순화하는 방법 알려주기

#### 사용 시점

- **LanguageObjectVector 생성**: 모든 문장/텍스트가 `syntactic` 속성에 대해 분석됨
- **콘텐츠 선택**: 학습자의 현재 CEFR 수준으로 사용 가능한 콘텐츠 필터링
- **과제 생성**: 통사적 복잡성 점수에 기반한 과제 난이도 보정
- **장르 감지**: 텍스트가 SOAP, SBAR, 학술, 비즈니스 또는 법률 패턴을 따르는지 식별
- **단순화 제안**: 콘텐츠 적응을 위한 실행 가능한 피드백 제공
- **세타 추정 지원**: 통사적 복잡성이 theta_syntactic 능력 측정에 공급됨
- **숙달 단계 매칭**: 문장 복잡성이 학습자의 현재 단계(0-4)와 일치하도록 보장

---

### 미시적 규모: 직접 관계 (Microscale: Direct Relationships)

#### 의존성 (이 모듈이 필요로 하는 것)

이 모듈은 외부 의존성 없이 **자체 완결적**입니다. 포함 사항:
- 내장 CEFR 복잡성 목표 (`CEFR_COMPLEXITY_TARGETS`)
- 종속 접속사 데이터베이스 (`SUBORDINATORS`)
- 등위 접속사 목록 (`COORDINATORS`)
- 수동태 패턴 감지 (`PASSIVE_AUXILIARIES`)
- 품사 패턴 매칭 (`NOUN_PATTERNS`, `VERB_PATTERNS`)
- 장르 구조 정의 (`GENRE_STRUCTURES`)

#### 피의존성 (이 모듈을 필요로 하는 것)

| 파일 | 사용 |
|------|------|
| `src/core/types.ts` | 이 모듈이 구현하는 `SyntacticComplexity` 인터페이스 정의 |
| `src/core/bottleneck.ts` | 캐스케이드 분석을 위해 컴포넌트 타입 'SYNT' 사용; 통사적 오류 패턴 참조 |
| 과제 생성 시스템 | (예상) `complexityScore`와 `estimatedCEFR`을 사용하여 과제 난이도 보정 |
| 콘텐츠 필터링 | (예상) 적절한 콘텐츠 필터링에 `matchesCEFRLevel()` 사용 |
| Claude 프롬프트 | (예상) 콘텐츠 적응에 `getSimplificationSuggestions()` 사용 |

#### 데이터 흐름

```
텍스트 입력 (예: "Although the patient reported improvement, the physician recommended additional tests.")
    |
    v
analyzeSyntacticComplexity()
    |
    +---> splitSentences(): 텍스트를 개별 문장으로 분할
    |
    +---> 각 문장에 대해:
    |     |
    |     +---> tokenize(): 단어로 분할
    |     |         결과: ['Although', 'the', 'patient', 'reported', ...]
    |     |
    |     +---> analyzeClauseStructure(): 종속절/주절 찾기
    |     |         결과: { mainClauses: 1, subordinateClauses: 1,
    |     |                   subordinateTypes: ['concessive'], coordinationCount: 0 }
    |     |
    |     +---> countPassiveConstructions(): 수동태 감지
    |     |         결과: 0 (이 문장에 수동태 없음)
    |     |
    |     +---> 품사 비율 계산: 명사 vs 동사
    |     |
    |     +---> 의존 깊이 추정: log2(길이) + 종속절
    |     |
    |     v
    |     이 문장의 SyntacticComplexity 메트릭
    |
    +---> averageMetrics(): 모든 문장 메트릭 결합
    |
    +---> calculateComplexityScore(): 가중 조합 (0-1)
    |
    +---> estimateCEFRLevel(): 점수를 A1-C2로 매핑
    |
    v
최종 SyntacticComplexity 결과
    {
      sentenceLength: 11,
      dependencyDepth: 5,
      clauseCount: 2,
      subordinationIndex: 0.5,
      passiveRatio: 0,
      nominalRatio: 0.4,
      averageDependencyDistance: 3.67,
      complexityScore: 0.52,
      estimatedCEFR: 'B2'
    }
```

---

### 거시적 규모: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 역할

이 모듈은 LOGOS 아키텍처의 **언어 분석 레이어(Language Analysis Layer)**에 위치합니다:

```
레이어 1: 사용자 인터페이스 (React)
    |
레이어 2: IPC 통신 (Electron)
    |
레이어 3: 핵심 알고리즘 <-- syntactic.ts가 여기 위치
    |     |- irt.ts (능력 추정)
    |     |- fsrs.ts (간격 반복)
    |     |- pmi.ts (연어)
    |     |- morphology.ts (단어 구조)
    |     |- syntactic.ts (문장 구조) <-- 현재 위치
    |     |- bottleneck.ts (SYNT 컴포넌트에 통사론 사용)
    |     +- priority.ts (스케줄링)
    |
레이어 4: 데이터베이스 (Prisma/SQLite)
```

#### 전체적 영향 (Big Picture Impact)

통사 분석은 네 가지 핵심 LOGOS 기능을 가능하게 합니다:

**1. CEFR 기반 콘텐츠 선택**

유럽공통참조기준(Common European Framework of Reference, CEFR)은 여섯 가지 숙달 수준을 정의합니다:
- A1/A2: 기초 사용자 (단순 문장, 구체적 어휘)
- B1/B2: 독립 사용자 (연결된 담화, 추상적 주제)
- C1/C2: 숙달 사용자 (복잡한 구조, 뉘앙스 있는 표현)

이 모듈은 모든 텍스트를 이러한 수준에 자동으로 매핑합니다:

| CEFR 수준 | 문장 길이 | 절 수 | 종속 지수 | 예시 |
|-----------|-----------|-------|-----------|------|
| A1 | ~8 단어 | 1 절 | 0% | "The doctor sees patients." |
| A2 | ~12 단어 | 1-2 절 | 10% | "The doctor sees patients every day." |
| B1 | ~15 단어 | 2 절 | 20% | "The doctor sees patients who have appointments." |
| B2 | ~20 단어 | 2-3 절 | 30% | "Although the doctor was busy, she saw patients who had urgent concerns." |
| C1 | ~25 단어 | 3 절 | 40% | 다중 종속 수준을 가진 복잡한 내포 구조 |
| C2 | ~30 단어 | 4+ 절 | 50% | 정교한 통사 패턴을 가진 원어민 수준의 복잡성 |

**2. LanguageObjectVector 생성**

LOGOS의 모든 어휘 항목과 문장 패턴은 다차원 벡터 표현을 가집니다:

```
LanguageObjectVector = {
    orthographic: ...,
    phonological: ...,
    morphological: ...,
    syntactic: <-- 이 모듈이 제공 (toSyntacticVector를 통해)
    semantic: ...,
    pragmatic: ...
}
```

`syntactic` 컴포넌트에는 다음이 포함됩니다:
- 품사 분류
- 하위범주화 틀 (예: [+타동사], [+수여동사])
- 논항 구조 패턴 (주어-동사-목적어 등)
- 복잡성 수준 (단순/중간/복잡)
- 필요한 CEFR 수준

**3. 장르별 구조 감지**

전문 도메인은 특정 통사적 관례를 가집니다:

| 장르 | 도메인 | 예상 섹션 | CEFR 범위 | 예시 패턴 |
|------|--------|-----------|-----------|-----------|
| SOAP 노트 | 의료 | 주관적, 객관적, 평가, 계획 | B2-C1 | "Patient reports...", "Vitals:", "Impression:" |
| SBAR 인계 | 의료 | 상황, 배경, 평가, 권고 | B1-B2 | "I am calling about...", "The patient was admitted for..." |
| 학술 초록 | 학술 | 배경, 방법, 결과, 결론 | C1-C2 | "This study examines...", "Results indicate..." |
| 비즈니스 이메일 | 비즈니스 | 인사, 목적, 세부사항, 조치, 마무리 | B1-B2 | "I am writing to...", "Please find attached..." |
| 법률 계약 | 법률 | 당사자, 전문, 조항, 서명 | C1-C2 | "WHEREAS...", "Notwithstanding..." |

`detectGenre()`와 `analyzeGenreCompliance()` 함수는 LOGOS가 다음을 가능하게 합니다:
- 학습자가 작업 중인 텍스트 유형 식별
- 생성된 텍스트가 예상 관례를 따르는지 확인
- 누락된 섹션이나 구조적 개선 제안

**4. IRT를 위한 난이도 보정**

항목반응이론(Item Response Theory, IRT)은 각 학습 항목에 대한 난이도 매개변수가 필요합니다. 통사적 복잡성이 이에 직접 공급됩니다:

```
기본 IRT 난이도 = f(complexityScore, subordinationIndex, passiveRatio, ...)
```

더 높은 통사적 복잡성 = 더 높은 난이도 매개변수 = 더 고급 학습자에게 항목 제시.

#### 임계 경로 분석 (Critical Path Analysis)

**중요도 수준**: 중상

- **실패 시**: 콘텐츠를 학습자 수준에 매칭할 수 없음, 난이도 추정이 덜 정확해짐, 장르 준수 확인 불가
- **대체 동작**: 수준 매칭 없이도 콘텐츠를 제시할 수 있지만, 학습자가 부적절하게 어렵거나 쉬운 자료를 만날 수 있음
- **사용자 대면 영향**: 콘텐츠 매칭이 실패하면 학습자가 좌절(너무 어려움)하거나 지루해(너무 쉬움)할 수 있음
- **연쇄 효과**: 잘못된 CEFR 추정이 과제 생성, 병목 감지, 진행 추적에 영향

---

### 기술 개념 (쉬운 설명) (Technical Concepts - Plain English)

#### 종속 지수 (Subordination Index)

**기술적**: 문장에서 종속절 대 총 절의 비율로, 통사적 내포 깊이를 측정.

**쉬운 설명**: "생각 속의 생각"이 얼마나 있는가? 고려해보세요:
- "The doctor left." = 0% 종속 (하나의 주요 생각)
- "The doctor left because the patient recovered." = 50% 종속 (하나의 주요 생각, 하나의 의존 생각)

더 높은 종속 = 더 복잡한 문장 구조 = 처리하기 더 어려움.

**사용 이유**: 언어 학습자는 내포절에 어려움을 겪습니다. 50% 종속을 가진 문장은 동시에 여러 아이디어를 추적해야 합니다.

#### 의존 깊이 (Dependency Depth)

**기술적**: 의존 트리의 루트에서 모든 리프 노드까지의 최대 경로 길이로, 통사 구조가 얼마나 깊게 중첩되어 있는지 측정.

**쉬운 설명**: 문장을 단어가 "부모" 단어에 연결된 가계도로 상상해보세요. 의존 깊이는 가장 깊은 가지가 몇 세대인지입니다.

- "The cat sat." = 깊이 2 (sat -> cat, sat -> the)
- "The cat that I saw yesterday sat quietly." = 깊이 5+ (많은 부모-자식 관계 수준)

**사용 이유**: 더 깊은 트리는 파싱에 더 많은 작업 기억을 요구합니다. 초급 학습자는 깊이 2-3을 처리할 수 있고, 고급 학습자는 깊이 6-7을 처리할 수 있습니다.

#### 수동태 비율 (Passive Ratio)

**기술적**: 총 동사구 대비 수동태(be + 과거분사)로 구성된 동사구의 비율.

**쉬운 설명**: 문장이 "X가 Y를 했다"(능동)로 구조화되었는가 아니면 "Y가 X에 의해 되었다"(수동)로 구조화되었는가?
- 능동: "The nurse administered the medication."
- 수동: "The medication was administered by the nurse."

수동태는 문법적으로 더 복잡하고 일상 대화에서 덜 일반적입니다.

**사용 이유**: 수동 구문은 학습자에게 더 어렵습니다 왜냐하면:
1. 문법적 주어가 "행위자"가 아님
2. 행위자가 생략될 수 있음 ("The medication was administered.")
3. 누가 무엇을 했는지 이해하기 위해 추가 인지 처리 필요

#### 명사화 비율 (Nominal Ratio)

**기술적**: 명사 대 명사와 동사 합의 비율로, 텍스트에서 명사적 스타일의 정도를 나타냄.

**쉬운 설명**: 텍스트가 "사물 단어"(명사)를 더 많이 사용하는가 아니면 "행동 단어"(동사)를 더 많이 사용하는가?
- 동사적 스타일: "The researcher investigated how patients responded."
- 명사적 스타일: "The researcher's investigation of patient responses..."

학술 및 법률 작문은 더 명사적(명사가 많음)인 경향이 있습니다.

**사용 이유**: 높은 명사화 비율은 격식체/학술적 스타일을 나타내며, 이는 더 높은 CEFR 수준 및 더 큰 처리 난이도와 상관관계가 있습니다.

#### 절 구조 분석 (Clause Structure Analysis)

**기술적**: 주절(독립), 종속절(의존) 및 그 유형(관계, 시간, 조건 등)의 식별과 분류.

**쉬운 설명**: 문장을 "아이디어 덩어리"로 나누고 어떻게 연결되는지 이해하기:
- **주절**: 홀로 문장으로 설 수 있음 ("The doctor arrived.")
- **종속절**: 주절에 의존 ("...because the patient called.")
- **유형**: 왜 의존(인과), 언제 의존(시간), 만약 의존(조건) 등.

**사용 이유**: 다른 종속절 유형은 다른 난이도 수준과 습득 순서를 가집니다. 관계절(who/which/that)은 양보절(although/even though)보다 먼저 학습됩니다.

#### 복잡성 점수 (Complexity Score)

**기술적**: 0-1 척도로 정규화된 여러 통사 메트릭의 가중 조합으로, 직접 CEFR 매핑을 가능하게 함.

**쉬운 설명**: "이 텍스트가 얼마나 복잡한가?"를 요약하는 단일 숫자로, 다음을 결합합니다:
- 문장 길이 (20% 가중치)
- 종속 지수 (20% 가중치)
- 의존 깊이 (15% 가중치)
- 절 수 (15% 가중치)
- 수동태 비율 (10% 가중치)
- 명사화 비율 (10% 가중치)
- 평균 의존 거리 (10% 가중치)

점수 0.1 = A1 수준 (매우 단순)
점수 1.0 = C2 수준 (원어민 수준 복잡성)

**사용 이유**: 하나의 숫자가 일곱 개의 개별 메트릭보다 작업하기 쉽습니다. 가중치는 L2 학습자에게 텍스트를 어렵게 만드는 것에 대한 연구를 반영합니다.

---

### 핵심 함수 설명 (Key Functions Explained)

#### analyzeSyntacticComplexity(text)

**목적**: 텍스트(단일 문장 또는 단락)의 완전한 통사 분석.

**과정**:
1. 텍스트를 개별 문장으로 분할
2. 각 문장 분석:
   - 단어 수 (문장 길이)
   - 절 구조 (주절, 종속절, 등위)
   - 수동태 구문
   - 명사 대 동사 비율
   - 추정 의존 깊이
   - 평균 의존 거리
3. 모든 문장에 걸쳐 메트릭 평균
4. 전체 복잡성 점수 계산 (0-1)
5. CEFR 수준에 매핑 (A1-C2)

**반환**: 모든 메트릭과 추정 CEFR 수준을 가진 `SyntacticComplexity`

#### analyzeClauseStructure(sentence)

**목적**: 문장의 모든 절을 식별하고 분류.

**작동 방식**:
- 종속 접속사 검색: "who", "which", "because", "although", "if", "when" 등
- 각 종속 접속사는 하나의 종속절을 나타냄
- 등위 접속사 수 계산: "and", "but", "or"
- 주절 = 1 (기본) + 등위 수

**반환**: mainClauses, subordinateClauses, subordinateTypes[], coordinationCount를 가진 `ClauseAnalysis`

#### estimateCEFRLevel(metrics)

**목적**: 복잡성 점수를 CEFR 수준에 매핑.

**매핑**:
| 점수 범위 | CEFR 수준 |
|-----------|-----------|
| 0 - 0.15 | A1 |
| 0.15 - 0.30 | A2 |
| 0.30 - 0.50 | B1 |
| 0.50 - 0.70 | B2 |
| 0.70 - 0.85 | C1 |
| 0.85 - 1.00 | C2 |

#### toSyntacticVector(word, context?)

**목적**: LanguageObjectVector를 위한 통사 컴포넌트 생성.

**계산 내용**:
- 품사 (명사, 동사, 형용사 등)
- 하위범주화 틀 ([+타동사], [+자동사], [+수여동사])
- 논항 구조 패턴 (SVO, S-연결동사-보어 등)
- 맥락 기반 복잡성 수준
- 필요한 CEFR 수준

#### getSimplificationSuggestions(text, targetLevel)

**목적**: 텍스트를 더 낮은 CEFR 수준으로 단순화하기 위한 실행 가능한 조언 제공.

**예시 제안**:
- "긴 문장을 짧게 나누세요" (길이가 목표 초과 시)
- "종속절을 단문으로 대체하세요" (종속이 너무 높을 시)
- "수동태를 능동태로 바꾸세요" (수동태 비율이 너무 높을 시)
- "명사화 형태 대신 동사를 더 사용하세요" (명사화 비율이 너무 높을 시)

#### detectGenre(text)

**목적**: 텍스트가 어떤 전문 장르에 속하는지 식별.

**작동 방식**:
- 장르별 섹션 마커 검색 (예: "Subjective:", "WHEREAS")
- 장르별 구문 패턴 검색
- 일치하면 `GenreStructure` 반환, 그렇지 않으면 null

#### analyzeGenreCompliance(text, genre)

**목적**: 텍스트가 예상 장르 관례를 따르는지 확인.

**반환**:
- 준수 점수 (0-1): 예상 섹션이 얼마나 있는지
- 누락된 섹션 목록
- 개선 제안

---

### 품사 추정 (Part-of-Speech Estimation)

#### 휴리스틱 접근법

전체 NLP 라이브러리 없이, POS는 다음을 사용하여 추정됩니다:

1. **폐쇄류 조회**: 한정사, 대명사, 전치사, 접속사, 조동사는 유한 집합
2. **접미사 패턴**:
   - "-ly"는 일반적으로 부사를 나타냄
   - "-tion/-ment/-ness/-ity"는 일반적으로 명사를 나타냄
   - "-ful/-less/-ous/-ive/-al"은 일반적으로 형용사를 나타냄
   - "-ize/-ify/-ate/-en"은 일반적으로 동사를 나타냄
   - "-ing/-ed"는 일반적으로 동사 형태를 나타냄

#### 하위범주화 틀 (Subcategorization Frames)

동사는 결합할 수 있는 것에 따라 분류됩니다:

| 틀 | 설명 | 예시 동사 |
|-----|------|-----------|
| +타동사 | 직접 목적어를 취함 | make, take, give, see |
| +자동사 | 직접 목적어 없음 | go, come, arrive, sleep |
| +수여동사 | 두 개의 목적어를 취함 | give, tell, show, send |

#### 논항 구조 패턴 (Argument Structure Patterns)

| 패턴 | 구조 | 예시 |
|------|------|------|
| 주어-동사-목적어 | SVO | "The nurse administered the medication." |
| 주어-연결동사-보어 | SVC | "The patient seems tired." |
| 주어-동사-간접목적어-직접목적어 | SVOO | "The doctor gave the patient the prescription." |

---

### CEFR 복잡성 목표 (CEFR Complexity Targets)

모듈은 각 CEFR 수준에 대한 예상 복잡성 메트릭을 정의합니다:

| 메트릭 | A1 | A2 | B1 | B2 | C1 | C2 |
|--------|----|----|----|----|----|----|
| 문장 길이 | 8 | 12 | 15 | 20 | 25 | 30 |
| 의존 깊이 | 2 | 3 | 4 | 5 | 6 | 7 |
| 절 수 | 1 | 1.5 | 2 | 2.5 | 3 | 4 |
| 종속 지수 | 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 |
| 수동태 비율 | 0 | 0.05 | 0.1 | 0.15 | 0.2 | 0.25 |
| 명사화 비율 | 0.4 | 0.45 | 0.5 | 0.55 | 0.6 | 0.65 |
| 평균 의존 거리 | 2 | 3 | 4 | 5 | 6 | 7 |
| 복잡성 점수 | 0.1 | 0.25 | 0.4 | 0.6 | 0.8 | 1.0 |

이러한 목표는 다음을 가능하게 합니다:
- `matchesCEFRLevel()`: 텍스트가 목표 허용 범위 내인지 확인
- `getSimplificationSuggestions()`: 현재 vs. 목표 메트릭 비교
- 가중 점수 계산: C2를 천장으로 정규화

---

### 종속 접속사 분류 (Subordinating Conjunction Classification)

| 유형 | 접속사 | 예시 |
|------|--------|------|
| **관계적** | who, whom, whose, which, that | "The patient who arrived first..." |
| **시간적** | when, while, after, before, until, since, as soon as, once | "...after the surgery was completed..." |
| **조건적** | if, unless, provided, providing, supposing | "If the test is negative..." |
| **인과적** | because, since, as, for, due to | "...because the symptoms persisted..." |
| **양보적** | although, though, even though, whereas, even if | "Although the prognosis was good..." |
| **목적** | so that, in order that, so | "...so that the patient could recover..." |
| **명사적** | whether, how, what, why, where | "...how the treatment worked..." |

이 분류는 다음을 지원합니다:
- 세분화된 절 분석
- 습득 순서 연구 (일부 유형이 다른 것보다 먼저 학습됨)
- 병목 분석에서 오류 패턴 감지

---

### 숙달 단계와의 통합 (Integration with Mastery Stages)

`isSuitableForStage()` 함수는 숙달 단계를 적절한 CEFR 수준에 매핑합니다:

| 숙달 단계 | 설명 | 적합한 CEFR |
|-----------|------|-------------|
| 0 (새로움) | 첫 노출 | A1만 |
| 1 (인식) | 단서와 함께 식별 가능 | A1, A2 |
| 2 (회상) | 노력하면 기억 가능 | A2, B1 |
| 3 (통제된 생성) | 집중하면 생성 가능 | B1, B2 |
| 4 (자동화) | 유창한 접근 | B2, C1, C2 |

이것은 초기 숙달 단계의 학습자가 더 단순한 문장을 보고, 고급 학습자가 원어민 수준의 복잡성을 만나도록 보장합니다.

---

### 병목 감지와의 통합 (Integration with Bottleneck Detection)

병목 모듈(7부)은 캐스케이드에서 SYNT 컴포넌트로 통사 분석을 사용합니다:

```
PHON -> MORPH -> LEX -> SYNT -> PRAG
                        ^
                        |
   여기서 통사 오류가 하류 PRAG 오류를 일으킬 수 있음
   그러나 상류 LEX 문제로 인해 발생할 수도 있음
```

**예시 캐스케이드 감지**:
1. 사용자가 수동태 구문에 어려움을 겪음 (SYNT 오류)
2. 병목 시스템 확인: LEX 오류도 높은가?
3. 예라면: 근본 원인이 어휘 격차(LEX)로 인한 통사 실패일 수 있음
4. 아니라면: 통사 패턴에 직접 개입 집중

**통사 오류 패턴** (bottleneck.ts에서 감지):
- 절 내포 오류 (종속 실수)
- 주어-동사 일치 실패
- 수동태 혼란
- 어순 문제

---

### 제한사항 및 설계 결정 (Limitations and Design Decisions)

#### 휴리스틱 기반 접근법

이 모듈은 기계 학습 대신 **규칙 기반 휴리스틱**을 사용합니다 왜냐하면:
1. **외부 의존성 없음**: 네트워크 없이 브라우저/Electron에서 완전히 실행
2. **예측 가능한 동작**: 같은 입력이 항상 같은 출력 생성
3. **해석 가능**: 왜 문장이 그 점수를 받았는지 설명할 수 있음
4. **충분한 정확도**: CEFR 추정에서 휴리스틱이 전문가 평가와 ~80-85% 일치

#### 알려진 제한사항

1. **진정한 의존 파싱 없음**: 깊이가 실제 파스 트리가 아닌 종속 수와 문장 길이에서 추정됨
2. **모호한 종속 접속사**: "that"은 관계대명사 또는 보문소일 수 있음; "since"는 시간적 또는 인과적일 수 있음
3. **수동태 감지가 패턴 기반**: 불규칙 수동태를 놓치거나 오탐지 가능
4. **POS 태깅이 휴리스틱**: 전체 NLP 태거에 비해 ~70% 정확도
5. **영어만**: 종속 접속사 목록과 패턴이 영어 특화

#### 향후 개선

- 경량 의존 파서와 통합 (예: wink-nlp)
- 언어별 패턴 모듈을 통한 다국어 지원
- 사용자 피드백에서 학습하여 휴리스틱 가중치 개선
- 장르별 복잡성 조정

---

## 화용론 모듈 (Pragmatics Module)

> **코드 위치**: `src/core/pragmatics.ts`
> **상태**: 활성

---

### 맥락 및 목적

화용론 모듈은 언어 학습을 위한 **화용적 능력 분석(pragmatic competence analysis)**을 구현합니다. 화용론은 문법적으로 올바른 것뿐만 아니라 주어진 맥락에서 *사회적으로 적절한* 것을 지배하기 때문에 종종 언어 학습의 "숨겨진 교육과정"이라고 불립니다.

**비즈니스 필요성**: 언어 학습자는 문법이 기술적으로 정확해도 원어민이 어색하거나 부적절하다고 느끼는 화용적 오류를 자주 범합니다. 학습자가 교수에게 "Give me water"(문법적으로 정확)라고 말할 수 있지만, "Would you mind if I had some water?"가 맥락적으로 적절할 것입니다. 이 모듈은 LOGOS가 이러한 미묘한 언어 사용의 사회적 차원을 감지, 분석, 가르칠 수 있게 합니다.

**사용 시점**:
- 학습자가 생성한 텍스트가 의도된 사회적 맥락과 일치하는지 평가할 때
- 특정 레지스터(격식, 비격식 등)에 맞는 콘텐츠를 생성할 때
- 화행(요청, 사과, 불만)을 문화적 적절성에 대해 평가할 때
- 과제 매칭에 사용되는 z(w) 벡터의 **PRAG 점수**를 계산할 때
- 어떤 어휘 항목이 레지스터 민감 연습을 필요로 하는지 결정할 때

---

### 미시적 규모: 직접 관계 (Microscale: Direct Relationships)

#### 의존성 (이 모듈이 필요로 하는 것)

이 모듈은 **순수(pure)**합니다 - 외부 의존성이 없습니다. 내장 TypeScript/JavaScript 기능만 사용하여 모든 분석 알고리즘을 구현합니다. 이것은 핵심 알고리즘이 부작용 없는 순수 함수여야 한다는 LOGOS 핵심 모듈 아키텍처 원칙에 따른 설계입니다.

#### 피의존성 (이 모듈을 필요로 하는 것)

- **`src/core/task-matching.ts`**: 이 모듈의 **화용적 점수**(PRAG)를 z(w) 벡터의 일부로 사용하여 높은 레지스터 민감도를 가진 단어에 가장 적절한 과제 유형을 결정합니다. 높은 화용적 점수를 가진 단어는 "레지스터 전환" 및 "맥락 적절 사용" 연습에 매칭됩니다.

- **`src/core/state/component-object-state.ts`**: 화용론을 다섯 가지 **LanguageComponent** 유형 중 하나(`'pragmatic'`)로 추적하며, 화용적 능력에 대한 노출 이력과 인지 유도 메트릭을 관리합니다.

- **`src/core/register/register-calculator.ts`**: 더 상세한 레지스터 프로파일링을 제공하는 형제 모듈. pragmatics.ts가 넓은 화행과 공손성 분석을 처리하는 반면, register-calculator.ts는 세분화된 단어 수준 레지스터 적절성을 처리합니다.

- **`src/core/index.ts`**: 애플리케이션 전체에서 사용하기 위해 이 모듈의 함수를 내보냅니다(아직 명시적으로 나열되지 않음 - 이것이 격차일 수 있음).

- **`src/main/ipc/claude.ipc.ts`**: AI 생성 콘텐츠 검증에 화용 분석을 사용할 수 있습니다.

#### 데이터 흐름

```
사용자 텍스트 입력
      |
      v
+---------------------+
| analyzeRegister()   | --> 레지스터 점수 (frozen, formal, consultative, casual, intimate)
+---------------------+
      |
      v
+---------------------+
| detectSpeechAct()   | --> 화행 범주 (assertive, directive, commissive 등)
+---------------------+
      |
      v
+---------------------+
| analyzePoliteness() | --> 공손성 전략 (bald_on_record, negative_politeness 등)
+---------------------+
      |
      v
+-------------------------------+
| assessPragmaticAppropriateness() | --> 점수와 권장사항이 포함된 전체 평가
+-------------------------------+
      |
      v
+-----------------------------+
| generatePragmaticProfile()  | --> 단어/구에 대한 완전한 화용적 프로필
+-----------------------------+
```

---

### 거시적 규모: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어

이 모듈은 LOGOS 아키텍처의 **핵심 알고리즘 레이어(Core Algorithms Layer)**에 위치합니다:

```
레이어 1: 렌더러 (React UI)
    |
    v
레이어 2: 메인 프로세스 (IPC 핸들러, 서비스)
    |
    v
레이어 3: 핵심 알고리즘 <-- pragmatics.ts가 여기 위치
    |
    v
레이어 4: 데이터베이스 (Prisma/SQLite)
```

핵심 레이어의 특징:
- 부작용이나 I/O가 없는 **순수 함수**
- 외부 의존성이 없는 **자체 완결 알고리즘**
- 결정론적으로 테스트할 수 있는 **무상태 연산**

#### 전체적 영향 (Big Picture Impact)

이 모듈은 LOGOS의 이론적 기반에 설명된 **의미-화용-담화 컴포넌트(Semantic-Pragmatic-Discourse Component)**의 일부입니다. 이것은 다음을 가능하게 합니다:

1. **사용 공간 확장**: LOGOS의 핵심 임무는 학습자의 "사용 공간" - 효과적으로 의사소통할 수 있는 맥락과 상황을 확장하는 것입니다. 화용적 능력은 전문적, 학술적, 사회적 맥락을 적절하게 탐색하는 데 필수적입니다.

2. **z(w) 벡터 계산**: LOGOS의 모든 단어는 여섯 차원을 가진 z(w) 벡터를 가집니다: 빈도, 관계 밀도, 도메인 관련성, 형태적 복잡성, 음운적 난이도, **화용적 민감도**. 이 모듈이 PRAG 차원을 계산합니다.

3. **과제 유형 선택**: 높은 화용적 점수를 가진 단어(레지스터 민감 표현 "I was wondering if you might..." vs "Gimme that")는 맥락적 적절성을 연습하는 전문화된 과제에 매칭됩니다.

4. **콘텐츠 생성 검증**: 특정 도메인(의료 SOAP 노트, 법률 계약, 학술 초록)을 위한 학습 콘텐츠를 생성할 때, 이 모듈은 레지스터가 대상 장르와 일치하는지 검증합니다.

5. **오류 분석**: 학습자가 화용적 오류를 범할 때, 이 모듈은 *어떤 종류의* 오류인지(레지스터 불일치, 공손성 위반, 화행 실패) 식별하고 타겟팅된 권장사항을 제공합니다.

#### 임계 경로 분석 (Critical Path Analysis)

**중요도 수준**: 높음

이 모듈은 핵심 시작 경로에 있지 않지만 다음에 필수적입니다:
- 정확한 z(w) 벡터 계산 (과제 선택 품질에 영향)
- 도메인별 콘텐츠 적절성 (의료, 법률, 비즈니스 영어)
- 중급 이상 수준의 학습자 진도 (화용적 능력이 B2+ 학습자를 구별함)

**실패 시**: 과제 선택이 화용적 지능을 결여하여, 레지스터 민감 어휘에 부적절한 연습 유형을 할당할 수 있습니다. 콘텐츠 생성이 문법적으로는 정확하지만 대상 맥락에 사회적으로 부적절한 텍스트를 생성할 수 있습니다.

---

### 기술 개념 (쉬운 설명) (Technical Concepts - Plain English)

#### 레지스터 (Register)

**기술적**: 특정 맥락에 적절한 특정 언어적 특징(어휘, 문법, 톤)으로 특징지어지는, 사회적 상황에서의 사용에 의해 정의되는 언어의 변종.

**쉬운 설명**: 언어의 "드레스 코드". 취업 면접에 수영복을 입거나 해변에 턱시도를 입지 않듯이, 법률 문서에서 "gonna"라고 하거나 친구에게 문자를 보낼 때 "notwithstanding the aforementioned"라고 하지 않습니다. 레지스터는 어떤 단어가 어떤 상황에 "맞는지" 아는 것입니다.

**다섯 가지 레지스터**:
| 레지스터 | 맥락 | 예시 |
|----------|------|------|
| Frozen (격식) | 법률 문서, 종교 텍스트 | "We the People hereby establish..." |
| Formal (정중) | 학술 논문, 전문 보고서 | "This study demonstrates that..." |
| Consultative (상담) | 의사-환자, 교사-학생 | "I'd recommend considering..." |
| Casual (비격식) | 친구, 동료 | "Yeah, sounds good to me" |
| Intimate (친밀) | 가족, 가까운 친구 | "C'mon, you know what I mean" |

**사용 이유**: 비원어민은 맥락에 관계없이 하나의 레지스터로 기본 설정하는 경우가 많습니다. 학습자가 친구에게 너무 격식적이거나(차갑게 보임) 상사에게 너무 비격식적일 수(무례하게 보임) 있습니다. LOGOS는 적절한 레지스터 전환을 감지하고 훈련해야 합니다.

#### 화행 (Speech Acts)

**기술적**: 단순히 정보를 전달하는 것 이상으로 행동(요청, 약속, 사과)을 수행하는 발화. 철학자 John Searle(1979)의 분류에 기반합니다.

**쉬운 설명**: 문장이 문자적 의미를 넘어 수행하는 *일*. "It's cold in here"는 진술(단언)일 수도 있고, 실제로는 창문을 닫아달라는 요청(간접 지시)일 수 있습니다. "I'll be there at 5"는 예측이거나 약속일 수 있습니다 - 차이가 중요합니다.

**다섯 가지 범주**:
| 범주 | 하는 일 | 예시 |
|------|---------|------|
| Assertive (단언) | 사실 진술 | "The report is complete" |
| Directive (지시) | 누군가에게 무언가를 하게 함 | "Could you review this?" |
| Commissive (언약) | 화자를 구속 | "I promise to finish by Friday" |
| Expressive (표현) | 감정 표현 | "Thank you for your help" |
| Declarative (선언) | 말함으로써 현실을 바꿈 | "I now pronounce you..." |

**사용 이유**: 화행 인식은 *의도*를 이해하는 데 중요합니다. 학습자는 "I was wondering if you might..."가 호기심 표현이 아니라 요청임을 인식해야 합니다. 다른 문화는 같은 화행을 수행하는 다른 관례를 가지고 있습니다.

#### 공손성 전략 (Politeness Strategies) - Brown & Levinson의 프레임워크

**기술적**: 사회적 상호작용에서 "체면"(모든 사람이 유지하고 싶어하는 공적 자기 이미지)을 관리하기 위한 체계적인 언어 전략.

**쉬운 설명**: 당신이 하는 모든 요청은 잠재적으로 누군가를 짜증나게 합니다 - 당신의 이익을 위해 그들의 시간/에너지를 사용해달라고 요청하는 것입니다. 공손성 전략은 우리가 "타격을 완화하는" 다양한 방법입니다:

| 전략 | 접근법 | 예시 |
|------|--------|------|
| Bald on-record (직접적) | 직접적, 완화 없음 | "Give me the report" |
| Positive politeness (적극적 공손) | 우정에 호소 | "Hey buddy, could you grab that report?" |
| Negative politeness (소극적 공손) | 부담 인정 | "I'm so sorry to bother you, but if it's not too much trouble..." |
| Off-record (암시적) | 요청 대신 힌트 | "I noticed the report wasn't on my desk" (암시: 거기 놔주세요) |
| Don't do FTA | 요청 완전 회피 | 아무 말 안 하고, 직접 함 |

**사용 이유**: 다른 맥락은 다른 공손성 수준을 요구합니다. 가까운 동료에게 소금 건네달라고? Bald on-record가 괜찮습니다. CEO에게 급여 인상 요청? 광범위한 완화어와 함께 소극적 공손. 이 모듈은 맥락에 대한 **예상 공손성 수준**을 계산하고 불일치를 표시합니다.

#### 체면위협행위 (Face-Threatening Acts, FTAs)

**기술적**: 누군가의 적극적 체면(좋아 보이고 싶은 욕구) 또는 소극적 체면(자율성과 강요로부터의 자유 욕구)을 본질적으로 위협하는 행동.

**쉬운 설명**: 일부 것들은 말하기가 그냥 불편합니다. 부탁을 하면 누군가의 시간에 부담을 줍니다(소극적 체면 위협). 누군가의 작업을 비판하면 자기 이미지에 도전합니다(적극적 체면 위협). 사과하면 잘못한 것을 인정합니다(자신의 적극적 체면 위협).

**네 가지 방향**:
- 화자의 적극적 체면: "I was wrong" (오류 인정)
- 화자의 소극적 체면: "I'd love to help" (의무 수락)
- 청자의 적극적 체면: "This isn't your best work" (비판)
- 청자의 소극적 체면: "Can you stay late?" (부담)

**사용 이유**: 학습자는 일부 화행이 본질적으로 "위험"하고 더 신중한 언어적 포장이 필요하다는 것을 이해해야 합니다. 거절이나 불만은 감사보다 더 많은 공손성을 요구합니다.

#### 문화적 맥락 민감도 (Cultural Context Sensitivity)

**기술적**: 화용적 규범이 문화 그룹에 따라 상당히 다르며, 허용 가능한 레지스터, 직접성, 공손성 관례에 영향을 미친다는 인식.

**쉬운 설명**: 뉴욕에서 공손한 것이 도쿄에서는 무례할 수 있습니다. 미국 영어는 더 직접적인 의사소통을 선호하고; 일본어는 더 간접적인 힌트와 경의를 선호합니다. 동아시아 비즈니스 맥락에서 "bald on-record" 스타일을 사용하면 문법이 완벽해도 무례하게 인식될 수 있습니다.

**사용 이유**: LOGOS는 다양한 L1 배경에서 다양한 L2 맥락으로 진입하는 학습자에게 서비스를 제공합니다. 런던을 위해 영어를 배우는 일본 사업가는 캘리포니아를 위해 영어를 배우는 독일 엔지니어와 다른 화용적 훈련이 필요합니다. 이 모듈은 잠재적 문화적 불일치를 표시합니다.

---

### 알고리즘 세부사항 (Algorithm Details)

#### 레지스터 분석 (Register Analysis)

`analyzeRegister()` 함수는 **마커 기반 점수 시스템**을 사용합니다:

1. **어휘 마커**: 각 레지스터는 특징적인 단어를 가집니다 (frozen: "hereby", "whereas"; casual: "gonna", "stuff"). 이러한 마커를 찾으면 레지스터 점수가 증가합니다.

2. **축약 감지**: 축약(don't, can't, I'm)은 frozen/formal 레지스터에서 드물지만 casual/intimate 레지스터에서 일반적입니다.

3. **수동태 빈도**: 높은 수동태 사용은 frozen/formal 레지스터(학술 작문, 법률 문서)와 상관관계가 있습니다.

4. **1인칭 대명사 밀도**: 높은 1인칭 사용은 casual/intimate 레지스터와 상관관계; 낮은 사용은 formal/frozen과 상관관계.

점수는 지배적 레지스터가 1.0을 얻고 다른 것들이 비례적으로 낮도록 정규화됩니다.

#### 화행 감지 (Speech Act Detection)

`detectSpeechAct()` 함수는 알려진 화행 공식에 대한 **패턴 매칭**을 사용합니다:

- 요청: "Could you...", "Would you mind...", "I was wondering if..."
- 사과: "I'm sorry", "I apologize", "Forgive me"
- 약속: "I promise", "I will", "You have my word"

이것은 휴리스틱 접근법입니다. 프로덕션 시스템은 기계 학습 분류기를 사용할 수 있지만, 패턴 기반 접근법은 교육적 피드백에 적합한 해석 가능한 결과를 제공합니다.

#### 화용적 난이도 계산 (Pragmatic Difficulty Calculation)

`calculatePragmaticDifficulty()` 함수는 단어/표현을 화용적으로 올바르게 사용하기가 얼마나 어려운지 추정합니다:

- **낮은 레지스터 유연성** = 더 어려움 (특정 맥락에서만 사용해야 함)
- **높은 문화적 민감도** = 더 어려움 (문화적 맥락에 따라 다름)
- **체면위협 화행** (거절, 불만) = 더 어려움
- **간접적 공손성 전략** (암시적 힌트) = 더 어려움

이 난이도 점수는 z(w) 벡터의 PRAG 차원에 공급되고 과제 선택에 영향을 미칩니다.

---

### 학술적 기반 (Academic Foundations)

이 모듈은 다음의 개념을 구현합니다:

- **Brown, P. & Levinson, S.C. (1987)**. *Politeness: Some Universals in Language Usage*. 공손성 이론과 체면위협행위에 관한 기초 텍스트.

- **Bardovi-Harlig, K. (2013)**. *Developing L2 Pragmatics*. Language Learning. 제2언어 학습자가 화용적 능력을 어떻게 발달시키는지에 관한 연구.

- **Kasper, G. & Rose, K.R. (2002)**. *Pragmatic Development in a Second Language*. L2 화용 습득에 관한 핵심 저작.

- **Taguchi, N. (2015)**. *Instructed pragmatics at a glance*. Language Teaching. 화용론을 효과적으로 가르치는 것에 관한 현대 연구.

- **Searle, J. (1979)**. *Expression and Meaning: Studies in the Theory of Speech Acts*. 이 모듈에서 사용되는 화행 범주의 분류.

- **Biber, D. (1988)**. *Variation across Speech and Writing*. 5수준 레지스터 모델의 기반이 되는 레지스터 분석 프레임워크.

---

### 변경 이력 (Change History)

#### 2026-01-05 - 문서 생성
- **변경 내용**: 화용론 모듈에 대한 내러티브 문서 생성
- **이유**: 모든 코드 파일에 대한 쉐도우 문서 요구사항
- **영향**: 새 개발자를 위한 유지보수성과 온보딩 개선

#### 초기 구현
- **변경 내용**: 레지스터 감지, 화행 분석, 공손성 전략 평가, 화용적 난이도 계산이 포함된 포괄적 화용론 분석 모듈 생성
- **이유**: LOGOS는 5요소 언어 모델을 위한 화용적 능력 분석 필요
- **영향**: 레지스터 적절 콘텐츠 생성 및 화용적 오류 감지 가능

---

> 이 문서는 LOGOS 프로젝트의 핵심 언어학 모듈 문서의 한국어 번역입니다.
> 원본 경로:
> - `docs/narrative/src/core/semantic-network.md`
> - `docs/narrative/src/core/syntactic.md`
> - `docs/narrative/src/core/pragmatics.md`
