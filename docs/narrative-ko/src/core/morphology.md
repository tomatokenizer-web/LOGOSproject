# 형태론적 분석 모듈

> **최종 업데이트**: 2026-01-04
> **코드 위치**: `src/core/morphology.ts`
> **상태**: 활성
> **이론적 기반**: ALGORITHMIC-FOUNDATIONS.md Part 6.1, THEORETICAL-FOUNDATIONS.md Section 2.2

---

## 맥락 및 목적

### 이 모듈이 존재하는 이유

형태론적 분석 모듈은 다음 질문에 답합니다: **"이 단어는 어떻게 구성되었으며, 그 조각들에서 무엇을 배울 수 있는가?"**

의학 맥락에서 "contraindication"이라는 단어를 생각해 보세요. 다음을 아는 학습자는:
- "contra-"는 "반대"를 의미함
- "-tion"은 동사에서 명사를 만듦
- "indicate"가 어근임

...이 정확한 단어를 이전에 본 적이 없어도 의미를 추론할 수 있습니다. 이것이 **전이 효과**입니다: 단어 부분에 대한 훈련이 새로운 단어 학습을 가속화합니다.

**비즈니스 필요성**: LOGOS는 어휘를 효율적으로 가르치는 것을 목표로 합니다. 모든 단어를 고립된 것으로 취급하는 대신, 형태론적 분석은 다음을 가능하게 합니다:
1. 공유 접사로 단어 그룹화 ("un-"을 한 번 가르치고 수백 개의 단어에 적용)
2. 전이 측정 ("pre-"를 배우면 "predict", "prevent", "precaution"에 도움이 되었는가?)
3. 난이도 추정 (희귀한 접사를 가진 단어가 더 어려움)
4. LanguageObjectVector의 형태론적 구성요소 생성

### 사용 시점

- **LanguageObjectVector 생성**: 모든 어휘 항목은 `morphological` 속성에 대해 분석됨
- **과제 생성**: 난이도가 형태소 수와 접사 생산성에 따라 조정됨
- **병목 탐지**: 형태론(MORPH 구성요소)이 연쇄 오류를 일으키는지 식별
- **전이 측정**: 접사 훈련이 새로운 단어 추론을 개선하는지 추적
- **스캐폴딩 결정**: 투명한 형태론을 가진 단어는 불투명한 것과 다른 힌트를 받음

---

## 미시적 관점: 직접적 관계

### 의존성 (이 모듈이 필요로 하는 것)

이 모듈은 외부 의존성이 없는 **자체 완결형**입니다. 다음을 포함합니다:
- 내장된 접사 데이터베이스 (`ENGLISH_PREFIXES`, `ENGLISH_SUFFIXES`)
- 불규칙 형태 테이블 (`IRREGULAR_PAST`, `IRREGULAR_PLURAL`)
- 모든 분석 함수가 외부 라이브러리 없는 순수 TypeScript

### 종속자 (이 모듈을 필요로 하는 것)

| 파일 | 사용 |
|------|-------|
| `src/core/bottleneck.ts` | 연쇄 분석을 위해 구성요소 유형 'MORPH' 사용; 패턴 추출이 형태론적 오류 패턴 참조 |
| `src/core/types.ts` | 이 모듈이 구현하는 `MorphologicalAnalysis` 및 `Affix` 인터페이스 정의 |
| `src/shared/types.ts` | IPC 통신을 위해 형태론 관련 타입 재내보내기 |
| `src/main/services/claude.ts` | (예상) 어휘 추출 요청에 형태론적 분석 사용 |
| 과제 생성 시스템 | (예상) `difficultyScore`를 사용하여 과제 난이도 조정 |

### 데이터 흐름

```
단어 입력 (예: "unhappiness")
    |
    v
analyzeMorphology()
    |
    +---> 접두사 탐지: ENGLISH_PREFIXES에 대해 가장 긴 일치 우선
    |         결과: [{ form: 'un-', meaning: 'not, opposite', productivity: 0.9 }]
    |
    +---> 접미사 탐지: ENGLISH_SUFFIXES에 대해 가장 긴 일치 우선
    |         결과: [{ form: '-ness', meaning: 'state/quality', productivity: 0.9 }]
    |
    +---> 어근 추출: "happi" (접사 제거 후 남은 부분)
    |
    +---> 굴절 탐지: 'base' (굴절 표지 없음)
    |
    +---> 파생 유형: 'complex' (접두사와 접미사 모두)
    |
    +---> 난이도 계산: 접사 생산성과 파생 유형 기반
    |
    v
MorphologicalAnalysis 결과
    |
    v
toMorphologicalVector()
    |
    +---> 투명성: 부분에서 의미가 얼마나 예측 가능한지 (이 단어는 0.7)
    |
    +---> 생산성: 평균 접사 생산성 (0.9)
    |
    +---> 굴절 패러다임: "prefix:un-|suffix:-ness|inflection:base|type:complex"
    |
    v
MorphologicalVector (LanguageObjectVector.morphological용)
```

---

## 거시적 관점: 시스템 통합

### 아키텍처 역할

이 모듈은 LOGOS 아키텍처의 **언어 분석 계층**에 위치합니다:

```
계층 1: 사용자 인터페이스 (React)
    |
계층 2: IPC 통신 (Electron)
    |
계층 3: 핵심 알고리즘 <-- morphology.ts가 여기 있음
    |     |- irt.ts (능력 추정)
    |     |- fsrs.ts (간격)
    |     |- pmi.ts (연어)
    |     |- morphology.ts (단어 구조) <-- 현재 위치
    |     |- bottleneck.ts (형태론 사용)
    |     +- priority.ts (스케줄링)
    |
계층 4: 데이터베이스 (Prisma/SQLite)
```

### 전체적 영향

형태론적 분석은 세 가지 중요한 LOGOS 기능을 가능하게 합니다:

**1. 전이 학습 측정**

전이 효과 (THEORETICAL-FOUNDATIONS.md에서)는 한 가지를 배우는 것이 관련 항목의 성능을 개선하는 것을 측정하는 LOGOS의 능력입니다. 형태론의 경우:
- "pre-" 단어 (preview, predict, precaution)로 사용자 훈련
- 본 적 없는 새로운 "pre-" 단어 (prepayment, preapproval) 테스트
- 측정: 접사 훈련이 전이되었는가?

`findTransferCandidates()`와 `measureTransferEffect()` 함수가 이를 구현합니다.

**2. LanguageObjectVector 생성**

LOGOS의 모든 어휘 항목은 다차원 벡터 표현을 가집니다:
```
LanguageObjectVector = {
    orthographic: ...,
    phonological: ...,
    morphological: <-- 이 모듈이 이것을 제공
    syntactic: ...,
    semantic: ...,
    pragmatic: ...
}
```

`morphological` 구성요소에는 다음이 포함됩니다:
- 어근/어간 식별
- 접두사 및 접미사 체인
- 굴절 패러다임 분류
- 투명성 점수 (부분에서 의미 예측 가능성)
- 생산성 점수 (접사가 얼마나 자유롭게 결합하는지)

**3. 난이도 추정**

과제 난이도는 형태론적 복잡성에 크게 의존합니다:

| 파생 유형 | 기본 난이도 | 예 |
|-----------------|-----------------|---------|
| simple | 0.1 | "cat" |
| derived | 0.3 | "unhappy" |
| compound | 0.4 | "toothbrush" |
| complex | 0.5 | "unacceptable" |

낮은 생산성 접사는 난이도를 추가합니다 (드문 패턴은 인식하기 더 어려움).

### 임계 경로 분석

**중요도 수준**: 중상

- **실패 시**: LanguageObjectVectors가 불완전해지고, 전이 효과가 측정되지 않으며, 난이도 추정이 덜 정확해짐
- **대체 동작**: 단어는 형태론적 분석 없이도 여전히 학습될 수 있지만, 효율성이 감소함
- **직접적인 사용자 대면 실패 없음**: 사용자는 오류를 보지 않지만, 학습 최적화가 저하됨
- **병목 탐지 저하**: MORPH 구성요소 오류가 다른 구성요소에 잘못 귀속될 수 있음

---

## 기술적 개념 (쉬운 설명)

### 접사 생산성

**기술적**: 유형 빈도와 신어 비율을 기반으로 접사가 언어에서 새로운 어근과 얼마나 자유롭게 결합하는지를 나타내는 생산성 값 (0-1).

**쉬운 설명**: 이 단어 부분이 얼마나 "생성적"인가? 접두사 "un-"은 매우 생산적입니다 (0.9)---"unhappy", "unclear", "unfair"라고 말할 수 있고 "uninstall"처럼 새 단어도 만들 수 있습니다. 하지만 "circum-"은 낮은 생산성입니다 (0.5)---아무 단어에나 붙일 수 없습니다.

**사용 이유**: 높은 생산성 접사는 어디에나 나타나므로 배우기 더 쉽습니다. 낮은 생산성 접사는 더 명시적인 교육이 필요합니다.

### 의미 투명성

**기술적**: 단어의 의미가 형태론적 부분에서 얼마나 조성적으로 예측 가능한지를 측정하는 투명성 점수 (0-1).

**쉬운 설명**: 조각을 알면 단어가 무엇을 의미하는지 추측할 수 있는가? "Unhappy"는 투명합니다---분명히 "not happy"를 의미합니다. 하지만 "understand"는 불투명합니다---"under"나 "standing"과 관련이 없습니다.

**사용 이유**: 투명한 단어는 다르게 스캐폴딩될 수 있습니다 ("'un-'은 무슨 뜻인가요? 'happy'는 무슨 뜻인가요? 그래서 'unhappy'는 무슨 뜻인가요?"). 불투명한 단어는 전체적 암기가 필요합니다.

### 파생 유형

**기술적**: 단어 형성 과정의 분류: simple (단일 형태소), derived (어근 + 접사), compound (어근 + 어근), 또는 complex (다중 접사).

**쉬운 설명**: 이 단어는 어떻게 만들어졌는가?
- **Simple**: "cat"이나 "run"처럼 한 조각
- **Derived**: "un+happy"나 "teach+er"처럼 무언가가 추가된 어근
- **Compound**: "tooth+brush"처럼 두 단어가 붙은 것
- **Complex**: "un+accept+able"처럼 여러 조각이 층을 이룸

**사용 이유**: 복잡한 단어는 더 많은 처리 시간이 필요하고 학습을 위해 구성요소로 분해해야 할 수 있습니다.

### 굴절 vs. 파생

**기술적**: 굴절은 새로운 어휘소를 만들지 않고 문법적 속성을 변경합니다 (run/runs/ran). 파생은 잠재적으로 다른 의미나 품사를 가진 새로운 어휘소를 만듭니다 (run/runner).

**쉬운 설명**:
- **굴절** = 같은 단어, 다른 형태 (walk/walking/walked는 모두 같은 단어)
- **파생** = 새 단어 생성 (walk -> walker는 새로운 의미의 새 단어)

**사용 이유**: 굴절 오류는 형태론 병목을 시사합니다. 파생 패턴은 전이 학습을 가능하게 합니다.

### 표제어화 (Lemmatization)

**기술적**: 굴절된 형태를 사전 표제 형태(표제어)로 축소. "running" -> "run", "better" -> "good".

**쉬운 설명**: 사전에서 찾을 "기본 단어" 찾기. "children"을 보면 표제어는 "child"입니다. "went"를 보면 표제어는 "go"입니다.

**사용 이유**: 단어의 모든 형태를 함께 연결하여 "go"를 배우면 "went", "going", "gone"에 도움이 됩니다.

---

## 주요 함수 설명

### analyzeMorphology(word, domain?)

**목적**: 단어의 완전한 형태론적 분해.

**과정**:
1. 입력 정규화 (소문자, 트림)
2. 가장 긴 것 먼저 접두사 확인 ("under" 전에 "un"이 일치하는 것 방지)
3. 가장 긴 것 먼저 접미사 확인 ("-ation" 전에 "-tion"이 일치하는 것 방지)
4. 남은 어근 추출
5. 굴절 유형 탐지 (base, past, plural 등)
6. 파생 유형 분류
7. 난이도 점수 계산

**반환**: word, root, prefixes[], suffixes[], inflection, derivationType, morphemeCount, difficultyScore를 포함한 `MorphologicalAnalysis`

### toMorphologicalVector(word, domain?)

**목적**: LanguageObjectVector를 위한 형태론적 구성요소 생성.

**추가 계산**:
- **투명성**: 부분에서 의미가 얼마나 예측 가능한지
- **생산성**: 평균 접사 생산성
- **굴절 패러다임**: 형태론적 구조의 문자열 인코딩

### findTransferCandidates(trainedWords, candidateWords, domain?)

**목적**: 이미 훈련된 단어와 접사를 공유하는 새로운 단어 찾기.

**사용 사례**: 사용자가 "predict", "prevent", "precaution"을 연습했습니다. 이제 인식할 수 있는 다른 "pre-" 단어 찾기: "prepayment", "preapproval", "preemptive".

**반환**: 전이 잠재력으로 순위가 매겨진 목록 (훈련이 도움이 될 가능성).

### measureTransferEffect(trainedAffixes, testResults)

**목적**: 접사 훈련이 실제로 새로운 단어 성능을 개선했는지 측정.

**입력**:
- 어떤 접사가 훈련되었는지
- 테스트 결과: {word, correctBefore, correctAfter}

**반환**: accuracyBefore, accuracyAfter, transferGain을 포함한 `MorphologicalTransfer`

---

## 접사 데이터베이스 설계

### 접두사 범주

| 범주 | 예 | 의미 패턴 |
|----------|----------|-----------------|
| 부정/대립 | un-, in-, dis-, non-, anti- | "~이 아닌", "반대", "~에 반하는" |
| 시간/순서 | pre-, post-, ex-, neo- | "전에", "후에", "이전의" |
| 정도/크기 | super-, sub-, over-, under-, hyper- | "위에", "아래에", "과도한" |
| 수량 | mono-, bi-, tri-, multi-, poly- | "하나", "둘", "셋", "많은" |
| 방향/위치 | inter-, intra-, trans-, extra-, circum- | "사이에", "안에", "가로질러" |
| 방식 | re-, mis-, co-, auto- | "다시", "잘못", "함께", "스스로" |
| 의학 | cardio-, neuro-, gastro-, hemo- | 신체 부위 특정 |

### 접미사 범주

| 범주 | 예 | 생성하는 것 |
|----------|----------|---------|
| 명사 형성 | -tion, -ment, -ness, -ity, -er | 동사/형용사에서 명사 |
| 형용사 형성 | -ful, -less, -able, -ous, -ive | 명사/동사에서 형용사 |
| 동사 형성 | -ize, -ify, -ate, -en | 명사/형용사에서 동사 |
| 부사 형성 | -ly, -ward, -wise | 형용사에서 부사 |
| 의학 | -itis, -osis, -ectomy, -ology | 상태/시술 용어 |

### 도메인 필터링

각 접사에는 선택적 `domains` 배열이 있습니다:
- `general`: 모든 맥락에서 적용
- `medical`: 특화된 의학 용어
- `academic`: 공식/학술적 용법
- `business`: 전문/상업적 맥락
- `technical`: 기술/공학적 맥락

도메인으로 분석할 때 접사는 관련 있는 것으로 필터링됩니다.

---

## 병목 탐지와의 통합

병목 모듈 (Part 7)은 형태론을 연쇄에서 MORPH 구성요소로 사용합니다:

```
PHON -> MORPH -> LEX -> SYNT -> PRAG
         ^
         |
   여기서 형태론 오류가 하류 LEX 및 SYNT 오류를 일으킴
```

**오류 패턴 탐지** (bottleneck.ts에서):
```typescript
case 'MORPH':
  if (content.match(/ing$/)) return '-ing 어미';
  if (content.match(/ed$/)) return '-ed 어미';
  if (content.match(/s$/)) return '복수형/3인칭';
  if (content.match(/tion$/)) return '-tion 명사화';
  return '기타 단어 형태';
```

사용자가 여러 과제에서 "-ing" 어미로 어려움을 겪을 때, 병목 시스템은:
1. 높은 MORPH 오류율 탐지
2. LEX와 SYNT도 상승했는지 확인 (연쇄 패턴)
3. 권장: "형태론(단어 형태)에 집중하세요. 특히 연습: -ing 어미."

---

## 변경 이력

### 2026-01-04 - 초기 구현
- **변경 사항**: 완전한 형태론적 분석 모듈 생성
- **이유**: 전이 학습 측정 및 LanguageObjectVector.morphological 생성 가능
- **영향**: 형태론 인식 어휘 학습의 기반

### 구현된 기능
- 50개 이상의 영어 접두사 및 접미사로 접사 탐지
- 도메인별 접사 필터링 (의학, 학술 등)
- 불규칙 형태 처리 (불규칙 과거시제, 불규칙 복수형)
- LanguageObjectVector를 위한 형태론적 벡터 생성
- 전이 후보 식별
- 전이 효과 측정
- 복잡성/난이도 채점
- 표제어 추출 (단순화됨)

### 향후 고려사항
- 다국어 접사 데이터베이스 (현재 영어 전용)
- 엣지 케이스를 위한 머신러닝 기반 접사 인식
- 형태음운 규칙을 위한 발음 분석과 통합
- 복합어 분리 (현재 기본 패턴 매칭)
