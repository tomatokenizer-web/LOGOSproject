# 언어학 모듈 (Linguistic Analysis)

> **최종 업데이트**: 2026-01-07
> **상태**: 활성
> **코드 위치**: `src/core/`

---

[이전: 심리측정 모듈](../01-psychometric/) | [다음: 학습 엔진](../03-learning-engine/)

---

## 개요

LOGOS의 언어학 모듈은 언어의 다섯 가지 핵심 영역을 분석합니다: **형태론**, **통사론**, **음운론**, **의미론**, **화용론**. 이 모듈들은 언어 학습의 근본적인 질문에 답합니다: "이 언어 항목은 얼마나 어렵고, 왜 그런가?"

각 모듈은 LanguageObjectVector의 한 차원을 담당하며, 어휘 항목을 다차원 벡터로 표현하여 정밀한 학습 최적화를 가능하게 합니다:

```
LanguageObjectVector = {
    orthographic: 철자 패턴 분석,
    phonological: 발음 및 음운 구조,
    morphological: 단어 구조 및 형태소,
    syntactic: 문장 구조 및 복잡성,
    semantic: 의미 관계 및 네트워크,
    pragmatic: 사회적 맥락 및 적절성
}
```

---

## 목차

1. [형태론 (Morphology)](#1-형태론-morphology)
2. [통사론 (Syntax)](#2-통사론-syntax)
3. [음운론 (Phonology)](#3-음운론-phonology)
4. [의미론 (Semantics)](#4-의미론-semantics)
5. [화용론 (Pragmatics)](#5-화용론-pragmatics)
6. [시스템 통합](#6-시스템-통합)

---

## 1. 형태론 (Morphology)

> **코드 위치**: `src/core/morphology.ts`

### 1.1 맥락 및 목적

형태론적 분석 모듈은 다음 질문에 답합니다: **"이 단어는 어떻게 구성되었으며, 그 조각들에서 무엇을 배울 수 있는가?"**

의학 맥락에서 "contraindication"이라는 단어를 생각해 보세요. 다음을 아는 학습자는:
- "contra-"는 "반대"를 의미함
- "-tion"은 동사에서 명사를 만듦
- "indicate"가 어근임

이 단어를 처음 보더라도 의미를 추론할 수 있습니다. 이것이 **전이 효과(Transfer Effect)**입니다: 단어 부분에 대한 훈련이 새로운 단어 학습을 가속화합니다.

### 1.2 핵심 기능

| 기능 | 설명 |
|------|------|
| 접사 탐지 | 50개 이상의 영어 접두사/접미사 인식 |
| 전이 측정 | 접사 훈련이 새 단어 학습에 미치는 영향 측정 |
| 난이도 추정 | 형태론적 복잡성 기반 난이도 계산 |
| 벡터 생성 | LanguageObjectVector.morphological 구성요소 생성 |

### 1.3 파생 유형별 난이도

| 파생 유형 | 기본 난이도 | 예시 |
|----------|------------|------|
| simple | 0.1 | "cat", "run" |
| derived | 0.3 | "unhappy", "teacher" |
| compound | 0.4 | "toothbrush" |
| complex | 0.5 | "unacceptable" |

### 1.4 핵심 함수

- **`analyzeMorphology(word, domain?)`**: 단어의 완전한 형태론적 분해
- **`toMorphologicalVector(word, domain?)`**: LanguageObjectVector용 벡터 생성
- **`findTransferCandidates(trainedWords, candidateWords)`**: 전이 학습 후보 식별
- **`measureTransferEffect(trainedAffixes, testResults)`**: 전이 효과 측정

### 1.5 기술 개념

#### 접사 생산성 (Affix Productivity)
**기술적**: 접사가 새로운 어근과 얼마나 자유롭게 결합하는지를 나타내는 값 (0-1).

**쉬운 설명**: "un-"은 매우 생산적 (0.9) - "unhappy", "unclear", "unfair" 등 어디에나 붙일 수 있습니다. 반면 "circum-"은 낮은 생산성 (0.5) - 특정 단어에만 사용됩니다.

#### 의미 투명성 (Semantic Transparency)
**기술적**: 단어의 의미가 형태론적 부분에서 얼마나 예측 가능한지 측정.

**쉬운 설명**: "unhappy"는 투명 - "not happy"임이 명확합니다. "understand"는 불투명 - "under"나 "stand"와 관련이 없습니다.

---

## 2. 통사론 (Syntax)

> **코드 위치**: `src/core/syntactic.ts`, `src/core/grammar/`

### 2.1 맥락 및 목적

통사적 복잡성 분석 모듈은 다음 질문에 답합니다: **"이 문장이 구조적으로 얼마나 복잡하며, 어떤 CEFR 수준을 필요로 하는가?"**

두 문장을 비교해 보세요:
1. "The patient was admitted." (A2 수준)
2. "Although the patient initially presented with symptoms that suggested a routine infection, subsequent laboratory findings indicated a more complex condition." (C1 수준)

둘 다 의료 정보를 전달하지만, 두 번째 문장은 다중 내포절, 수동 구문, 긴 의존 거리로 인해 훨씬 더 많은 인지적 처리가 필요합니다.

### 2.2 CEFR 수준별 복잡성 목표

| CEFR 수준 | 문장 길이 | 절 수 | 종속 지수 | 예시 |
|-----------|-----------|-------|-----------|------|
| A1 | ~8 단어 | 1절 | 0% | "The doctor sees patients." |
| A2 | ~12 단어 | 1-2절 | 10% | "The doctor sees patients every day." |
| B1 | ~15 단어 | 2절 | 20% | "The doctor sees patients who have appointments." |
| B2 | ~20 단어 | 2-3절 | 30% | "Although the doctor was busy, she saw patients who had urgent concerns." |
| C1 | ~25 단어 | 3절 | 40% | 다중 종속 수준의 복잡한 내포 구조 |
| C2 | ~30 단어 | 4+절 | 50% | 정교한 통사 패턴의 원어민 수준 복잡성 |

### 2.3 복잡성 점수 계산

복잡성 점수(0-1)는 여러 지표의 가중 조합입니다:

| 지표 | 가중치 |
|------|--------|
| 문장 길이 | 20% |
| 종속 지수 | 20% |
| 의존 깊이 | 15% |
| 절 수 | 15% |
| 수동 비율 | 10% |
| 명사 비율 | 10% |
| 평균 의존 거리 | 10% |

### 2.4 장르별 구조 감지

| 장르 | 영역 | 예상 섹션 | CEFR 범위 |
|------|------|-----------|-----------|
| SOAP 노트 | 의료 | 주관적, 객관적, 평가, 계획 | B2-C1 |
| SBAR 핸드오프 | 의료 | 상황, 배경, 평가, 권장 | B1-B2 |
| 학술 초록 | 학술 | 배경, 방법, 결과, 결론 | C1-C2 |
| 비즈니스 이메일 | 비즈니스 | 인사, 목적, 세부사항, 조치, 마무리 | B1-B2 |
| 법적 계약 | 법률 | 당사자, 전문, 조건, 서명 | C1-C2 |

### 2.5 문법 시퀀스 최적화기

`grammar-sequence-optimizer.ts`는 최적의 문법 학습 경로를 계산합니다:

- **우선순위 점수**: 빈도, 복잡도, 선행조건 등 고려
- **세션 계획**: 인지 부하 제한을 준수하는 학습 세션 생성
- **위상 정렬**: 선행조건을 준수하면서 최고 우선순위 구문 선택

### 2.6 핵심 함수

- **`analyzeSyntacticComplexity(text)`**: 텍스트의 완전한 통사적 분석
- **`analyzeClauseStructure(sentence)`**: 절 구조 식별 및 분류
- **`estimateCEFRLevel(metrics)`**: 복잡성 점수를 CEFR 수준에 매핑
- **`toSyntacticVector(word, context?)`**: LanguageObjectVector용 통사 벡터 생성
- **`getSimplificationSuggestions(text, targetLevel)`**: 단순화 제안 생성
- **`detectGenre(text)`**: 전문 장르 식별

### 2.7 기술 개념

#### 종속 지수 (Subordination Index)
**기술적**: 문장에서 총 절에 대한 종속절의 비율.

**쉬운 설명**: "생각 안의 생각"이 얼마나 있는가. 50% 종속을 가진 문장은 여러 아이디어를 동시에 추적해야 합니다.

#### 의존 깊이 (Dependency Depth)
**기술적**: 의존 트리의 루트에서 리프 노드까지의 최대 경로 길이.

**쉬운 설명**: 문장을 가계도로 상상해 보세요. 의존 깊이는 가장 깊은 가지가 몇 세대인지입니다. 깊은 트리는 더 많은 작업 기억이 필요합니다.

---

## 3. 음운론 (Phonology)

> **코드 위치**: `src/core/g2p.ts`, `src/core/g2p-irt.ts`

### 3.1 맥락 및 목적

자소-음소 변환(G2P) 분석 모듈은 언어 학습의 근본적인 도전을 해결합니다: **영어 철자는 발음과 일관성이 없습니다.**

"through", "though", "tough", "thought"는 모두 "ough"를 포함하지만 다르게 발음합니다. G2P 모듈은 철자와 발음 간의 관계를 분석하여:

1. **발음 난이도 예측** - 단어 제시 전에
2. **L1 간섭 예측** - 학습자의 모국어 기반 오류 예상
3. **전이 효과 측정** - 철자 패턴 숙달 시 학습 가속화 측정

### 3.2 G2P 규칙 데이터베이스

| 범주 | 예시 패턴 | 음소 | 신뢰도 |
|------|----------|------|--------|
| Magic E | `a[^aeiou]e$` | /ei/ | 85% |
| 모음 이중음자 | `ee` | /i:/ | 95% |
| 모음 이중음자 | `ea` | /i:/ | 70% |
| R-통제 | `ar` | /a:r/ | 85% |
| 묵음 자음 | `^kn` | /n/ | 99% |
| 자음 이중음자 | `ph` | /f/ | 99% |
| 접미사 | `-tion` | /shun/ | 95% |

### 3.3 L1 간섭 패턴

| L1 | 주요 간섭 패턴 | 일반 패턴 |
|----|---------------|----------|
| 스페인어 | sp-에 /esp-/, v에 /b/, /th/ 없음 | 모음 축약 어려움 |
| 중국어 | 근사음 r, v에 /w/, /th/ 없음 | 종성 자음 탈락 |
| 일본어 | r/l 합병, v에 /b/, f에 /h/ | 자음군에 모음 삽입 |
| 한국어 | f에 /p/, v에 /b/, r/l 이음 | 종성 자음 미개방 |

### 3.4 G2P-IRT 통합

`g2p-irt.ts`는 언어학적 분석(G2P)과 심리측정적 측정(IRT)을 연결합니다:

- **맥락 의존적 난이도**: 동일 단어가 태스크 맥락에 따라 다른 난이도를 가짐
- **다차원 능력 추적**: 읽기/말하기, 알파벳/음절/단어 수준별 별도 세타 추정
- **L1 특화 조정**: 모국어 전이 효과가 난이도 매개변수 수정
- **피셔 정보 기반 선택**: 효율적 능력 추정을 위한 최적 문항 선택

#### 맥락별 난이도 조정

| 맥락 | 조정 | 근거 |
|------|------|------|
| 읽기 | +0.0 | 기준선 |
| 듣기 | +0.3 | 청각 처리 부하 |
| 말하기 | +0.6 | 산출이 수용보다 어려움 |
| 쓰기 | +0.4 | 철자 산출 난이도 |
| 시간 제한 | +0.3 | 시간 압박 추가 |

### 3.5 G2P 층위 계층

| 층위 | 설명 | 비유 |
|------|------|------|
| 알파벳 | 개별 문자-소리 대응 | 개별 음표 식별 |
| 음절 | 음절 패턴 인식 | 화음과 패턴 인식 |
| 단어 | 전체 단어 인식 | 구절을 초견으로 읽기 |

### 3.6 난이도 점수 계산

| 요소 | 기여도 |
|------|--------|
| 예외 단어 일치 | +0.20 |
| 묵음 문자 존재 | +0.15 |
| 각 모음 조합 | +0.10 |
| 각 3+자음군 | +0.15 |
| 3 초과 음절 | 음절당 +0.05 |
| 불규칙 강세 | +0.10 |

### 3.7 핵심 함수

- **`analyzeG2PDifficulty(word, domain?)`**: G2P 난이도 분석
- **`analyzeG2PWithL1(word, l1)`**: L1 기반 오발음 예측
- **`toPhonologicalVector(word)`**: 음운론적 벡터 생성
- **`g2pToIRTParameters(g2pAnalysis)`**: G2P 분석을 IRT 매개변수로 변환
- **`selectOptimalG2PItem(candidates, profile, context)`**: 최적 문항 선택

---

## 4. 의미론 (Semantics)

> **코드 위치**: `src/core/semantic-network.ts`

### 4.1 맥락 및 목적

의미망 모듈은 어휘 관계를 위한 **의미 네트워크 모델**을 구현합니다. 단어들이 서로 어떻게 연결되는지 이해할 수 있게 합니다:

- "big"과 "large"가 비슷한 의미 (동의어)
- "hot"이 "cold"의 반대 (반의어)
- "dog"가 "animal"의 한 종류 (상하위어)
- "make a decision"이 자연스러운 표현 (연어)

### 4.2 어휘 관계 유형

#### 동의어 (Synonymy)
유사한 의미를 가지며 때때로 대체 가능한 단어들.
```typescript
['happy', 'joyful', 'cheerful', 'glad', 'delighted', 'pleased']
```
**핵심 통찰**: 동의어는 완벽하게 대체 가능하지 않습니다. "big sister"는 자연스럽지만 "large sister"는 아닙니다.

#### 반의어 (Antonymy)
반대 의미를 가진 단어들.
- **등급적**: hot-cold (척도상의 정도)
- **상보적**: dead-alive (중간 지점 없음)
- **관계적**: buy-sell (반대 역할)

#### 상위어/하위어 (Hypernymy/Hyponymy)
범주 관계를 나타냅니다.
```
animal (상위어)
├── dog (하위어)
│   ├── poodle
│   ├── bulldog
│   └── labrador
├── cat
└── bird
```
**핵심 통찰**: "dog"를 알면 "animal"의 속성을 이미 알고 있습니다. 이것이 전이 학습을 가능하게 합니다.

#### 연어 (Collocations)
자주 함께 나타나는 단어 파트너십.
```typescript
{
  make: ['decision', 'mistake', 'progress', 'effort'],
  take: ['time', 'action', 'place', 'risk']
}
```
**핵심 통찰**: "Make a decision"은 자연스럽지만 "do a decision"은 아닙니다.

### 4.3 네트워크 기반 난이도

```typescript
{
  difficulty: 0.45,
  factors: {
    synonymDensity: 0.6,    // 동의어가 많을수록 = 더 쉬움
    hierarchyDepth: 0.3,    // 깊을수록 = 더 어려움
    polysemy: 0.2,          // 다의어 = 더 어려움
    abstractness: 0.5       // 추상적 = 더 어려움
  }
}
```

### 4.4 핵심 함수

- **`findSynonyms(word)`**: 동의어 찾기
- **`findAntonyms(word)`**: 반의어 찾기
- **`findHypernyms(word)`**: 상위어(범주) 찾기
- **`findHyponyms(word)`**: 하위어(유형) 찾기
- **`findCollocations(word)`**: 연어 찾기
- **`calculateSemanticSimilarity(word1, word2)`**: 의미 유사도 계산
- **`buildSemanticNetwork(word, depth)`**: 의미 네트워크 구축
- **`suggestVocabularyExpansion(knownWords, count)`**: 어휘 확장 제안

### 4.5 기술 개념

#### 동의어 집합 (Synset)
**기술적**: 동일한 기저 개념을 나타내는 어휘 항목의 집합.

**쉬운 설명**: 같은 것을 의미하는 단어 그룹. 각 동의어 집합은 하나의 의미를 포착합니다 - "bank"(금융)와 "bank"(강둑)는 다른 동의어 집합입니다.

#### 네트워크 중심성 (Network Centrality)
**기술적**: 그래프에서 노드의 중요성 측정값.

**쉬운 설명**: "good", "make", "have"와 같은 높은 중심성 단어는 많은 다른 단어에 연결됩니다. 이들은 높은 가치의 학습 대상입니다.

---

## 5. 화용론 (Pragmatics)

> **코드 위치**: `src/core/pragmatics.ts`

### 5.1 맥락 및 목적

화용론 모듈은 언어 학습의 **"숨겨진 교육과정"**을 다룹니다: 문법적으로 *무엇이* 옳은지뿐만 아니라 **무엇이 사회적으로 적절한지**를 분석합니다.

학습자가 교수에게 "Give me water"라고 말할 수 있습니다 (문법적으로 맞음). 하지만 "Would you mind if I had some water?"가 맥락적으로 적절합니다.

### 5.2 레지스터 (Register)

언어의 "드레스 코드" - 어떤 단어가 어떤 상황에 맞는지.

| 레지스터 | 맥락 | 예시 |
|----------|------|------|
| Frozen (경직) | 법률 문서, 종교 텍스트 | "We the People hereby establish..." |
| Formal (공식) | 학술 논문, 전문 보고서 | "This study demonstrates that..." |
| Consultative (상담) | 의사-환자, 교사-학생 | "I'd recommend considering..." |
| Casual (비격식) | 친구, 동료 | "Yeah, sounds good to me" |
| Intimate (친밀) | 가족, 친한 친구 | "C'mon, you know what I mean" |

### 5.3 화행 (Speech Acts)

문장이 문자 그대로의 의미 이상으로 하는 *일*.

| 범주 | 하는 것 | 예시 |
|------|---------|------|
| Assertive (단언적) | 사실 진술 | "The report is complete" |
| Directive (지시적) | 누군가가 무언가를 하게 함 | "Could you review this?" |
| Commissive (약속적) | 화자를 구속 | "I promise to finish by Friday" |
| Expressive (표현적) | 감정 표현 | "Thank you for your help" |
| Declarative (선언적) | 말함으로써 현실 변경 | "I now pronounce you..." |

**핵심 통찰**: "I was wondering if you might..."는 호기심 표현이 아니라 요청입니다.

### 5.4 공손 전략 (Politeness Strategies)

Brown & Levinson의 프레임워크에 따른 "체면" 관리:

| 전략 | 접근 | 예시 |
|------|------|------|
| Bald on-record | 직접적, 완화 없음 | "Give me the report" |
| Positive politeness | 우정에 호소 | "Hey buddy, could you grab that report?" |
| Negative politeness | 부담 인정 | "I'm so sorry to bother you, but..." |
| Off-record | 요청 대신 암시 | "I noticed the report wasn't on my desk" |

### 5.5 화용적 난이도 계산

- **낮은 레지스터 유연성** = 더 어려움 (특정 맥락에서만 사용)
- **높은 문화적 민감도** = 더 어려움 (문화마다 다름)
- **체면 위협 화행** (거절, 불만) = 더 어려움
- **간접적 공손 전략** = 더 어려움

### 5.6 핵심 함수

- **`analyzeRegister(text)`**: 레지스터 분석
- **`detectSpeechAct(text)`**: 화행 탐지
- **`analyzePoliteness(text)`**: 공손 전략 분석
- **`assessPragmaticAppropriateness(text, context)`**: 화용적 적절성 평가
- **`calculatePragmaticDifficulty(word)`**: 화용적 난이도 계산
- **`generatePragmaticProfile(word)`**: 화용적 프로필 생성

---

## 6. 시스템 통합

### 6.1 아키텍처 위치

모든 언어학 모듈은 LOGOS 아키텍처의 **핵심 알고리즘 계층**에 위치합니다:

```
계층 1: 사용자 인터페이스 (React)
    |
계층 2: IPC 통신 (Electron)
    |
계층 3: 핵심 알고리즘 <-- 언어학 모듈들
    |     |- morphology.ts (형태론)
    |     |- syntactic.ts (통사론)
    |     |- g2p.ts, g2p-irt.ts (음운론)
    |     |- semantic-network.ts (의미론)
    |     |- pragmatics.ts (화용론)
    |     +- grammar/ (문법 시퀀싱)
    |
계층 4: 데이터베이스 (Prisma/SQLite)
```

### 6.2 병목 탐지와의 통합

병목 모듈은 언어학 모듈들을 연쇄 분석에서 사용합니다:

```
PHON -> MORPH -> LEX -> SYNT -> PRAG
  |       |             |       |
  G2P   형태론       통사론   화용론
```

사용자가 특정 영역에서 어려움을 겪으면:
1. 해당 구성요소의 오류율 탐지
2. 상류/하류 오류와 비교 (연쇄 패턴)
3. 근본 원인 식별 및 개입 권장

### 6.3 LanguageObjectVector 생성

각 모듈이 제공하는 벡터 구성요소:

| 모듈 | 제공하는 벡터 |
|------|--------------|
| morphology.ts | `toMorphologicalVector()` |
| syntactic.ts | `toSyntacticVector()` |
| g2p.ts | `toPhonologicalVector()`, `toOrthographicVector()` |
| semantic-network.ts | 의미적 연결 및 밀도 |
| pragmatics.ts | PRAG 점수 (z(w) 벡터) |

### 6.4 모듈 간 데이터 흐름

```
단어 입력
    |
    +---> morphology.ts ---> 형태론적 분석 ---> 전이 후보
    |
    +---> g2p.ts ---> 발음 난이도 ---> L1 특화 피드백
    |
    +---> syntactic.ts ---> 통사적 복잡성 ---> CEFR 수준
    |
    +---> semantic-network.ts ---> 의미적 연결 ---> 어휘 확장
    |
    +---> pragmatics.ts ---> 레지스터 분석 ---> 맥락 적절성
    |
    v
LanguageObjectVector --> 과제 생성 --> 학습자 제시
```

---

## 학술 참고문헌

### 형태론
- Bauer, L. (2003). *Introducing Linguistic Morphology*
- Plag, I. (2003). *Word-Formation in English*

### 통사론
- Chomsky, N. (1965). *Aspects of the Theory of Syntax*
- Diessel, H. (2004). *The Acquisition of Complex Sentences*

### 음운론
- Roach, P. (2009). *English Phonetics and Phonology*
- Ma, B. et al. (2025). *Personalized Language Learning with Spaced Repetition*

### 의미론
- Miller, G.A. (1995). *WordNet: A Lexical Database for English*
- Mikolov, T. et al. (2013). *Distributed Representations of Words and Phrases*

### 화용론
- Brown, P. & Levinson, S.C. (1987). *Politeness: Some Universals in Language Usage*
- Searle, J. (1979). *Expression and Meaning: Studies in the Theory of Speech Acts*
- Taguchi, N. (2015). *Instructed pragmatics at a glance*

---

## 변경 이력

### 2026-01-07 - 통합 문서 생성
- **변경 사항**: 8개의 개별 문서를 하나의 통합 문서로 병합
- **통합된 원본 파일**:
  - `sections/core-linguistic-1.md`
  - `sections/core-linguistic-2.md`
  - `sections/core-grammar.md`
  - `src/core/morphology.md`
  - `src/core/syntactic.md`
  - `src/core/g2p.md`
  - `src/core/semantic-network.md`
  - `src/core/pragmatics.md`
- **이유**: 중복 제거 및 탐색 용이성 향상
- **영향**: 언어학 모듈 전체를 하나의 문서에서 파악 가능

---

[이전: 심리측정 모듈](../01-psychometric/) | [다음: 학습 엔진](../03-learning-engine/)
