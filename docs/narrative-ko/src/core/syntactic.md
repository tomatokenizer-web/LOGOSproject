# 통사적 복잡성 분석 모듈

> **최종 업데이트**: 2026-01-04
> **코드 위치**: `src/core/syntactic.ts`
> **상태**: 활성
> **이론적 기반**: ALGORITHMIC-FOUNDATIONS.md Part 6.2, THEORETICAL-FOUNDATIONS.md Section 2.2 (LanguageObjectVector.syntactic)

---

## 맥락 및 목적

### 이 모듈이 존재하는 이유

통사적 복잡성 분석 모듈은 다음 질문에 답합니다: **"이 문장이 구조적으로 얼마나 복잡하며, 어떤 CEFR 수준을 필요로 하는가?"**

다음 두 문장을 생각해 보세요:
1. "The patient was admitted." (A2 수준)
2. "Although the patient initially presented with symptoms that suggested a routine infection, subsequent laboratory findings, which were obtained after the physician ordered additional tests, indicated a more complex underlying condition that required immediate intervention." (C1/C2 수준)

둘 다 의료 정보를 전달하지만, 두 번째 문장은 다음으로 인해 훨씬 더 많은 인지적 처리가 필요합니다:
- 다중 내포절 (생각 안에 생각이 층층이)
- 수동 구문 ("was obtained", "were obtained")
- 긴 의존 거리 (서로 관련된 단어들이 멀리 떨어져 있음)
- 높은 종속성 (많은 종속절이 주절에 붙어 있음)

**비즈니스 필요성**: LOGOS는 다양한 목표(간호사를 위한 CELBAN, 학계를 위한 IELTS, 비즈니스 영어 등)를 준비하는 다양한 숙련도 수준의 학습자에게 서비스합니다. 통사적 분석은 다음을 가능하게 합니다:

1. **콘텐츠 난이도 매칭**: 학습자가 자신의 수준에 적합한 문장을 보도록 보장
2. **CEFR 수준 추정**: 모든 텍스트를 A1-C2 숙련도 척도에 자동으로 매핑
3. **과제 난이도 보정**: 더 어려운 구문 = 더 어려운 과제 (IRT 매개변수 조정)
4. **장르 준수**: 의료 SOAP 노트는 비즈니스 이메일과 다른 통사적 기대를 가짐
5. **단순화 안내**: 콘텐츠 제작자에게 낮은 수준을 위해 텍스트를 단순화하는 방법 안내

### 사용 시점

- **LanguageObjectVector 생성**: 모든 문장/텍스트가 `syntactic` 속성에 대해 분석됨
- **콘텐츠 선택**: 학습자의 현재 CEFR 수준으로 사용 가능한 콘텐츠 필터링
- **과제 생성**: 통사적 복잡성 점수에 따라 과제 난이도 보정
- **장르 감지**: 텍스트가 SOAP, SBAR, 학술, 비즈니스 또는 법률 패턴을 따르는지 식별
- **단순화 제안**: 콘텐츠 적응을 위한 실행 가능한 피드백 제공
- **세타 추정 지원**: 통사적 복잡성이 theta_syntactic 능력 측정에 반영됨
- **숙달 단계 매칭**: 문장 복잡성이 학습자의 현재 단계 (0-4)와 일치하도록 보장

---

## 미시적 관점: 직접적 관계

### 의존성 (이 모듈이 필요로 하는 것)

이 모듈은 외부 의존성이 없는 **자체 완결형**입니다. 다음을 포함합니다:
- 내장된 CEFR 복잡성 목표 (`CEFR_COMPLEXITY_TARGETS`)
- 종속 접속사 데이터베이스 (`SUBORDINATORS`)
- 등위 접속사 목록 (`COORDINATORS`)
- 수동태 패턴 감지 (`PASSIVE_AUXILIARIES`)
- 품사 패턴 매칭 (`NOUN_PATTERNS`, `VERB_PATTERNS`)
- 장르 구조 정의 (`GENRE_STRUCTURES`)

### 종속자 (이 모듈을 필요로 하는 것)

| 파일 | 사용 |
|------|-------|
| `src/core/types.ts` | 이 모듈이 구현하는 `SyntacticComplexity` 인터페이스 정의 |
| `src/core/bottleneck.ts` | 연쇄 분석을 위해 구성요소 유형 'SYNT' 사용; 통사적 오류 패턴 참조 |
| 과제 생성 시스템 | (예상) `complexityScore`와 `estimatedCEFR`을 사용하여 과제 난이도 보정 |
| 콘텐츠 필터링 | (예상) 적절한 콘텐츠 필터링에 `matchesCEFRLevel()` 사용 |
| Claude 프롬프트 | (예상) 콘텐츠 적응을 위해 `getSimplificationSuggestions()` 사용 |

### 데이터 흐름

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
    |     +---> 품사 비율 계산: 명사 대 동사
    |     |
    |     +---> 의존 깊이 추정: log2(length) + subordinates
    |     |
    |     v
    |     이 문장에 대한 SyntacticComplexity 지표
    |
    +---> averageMetrics(): 모든 문장 지표 결합
    |
    +---> calculateComplexityScore(): 가중 조합 (0-1)
    |
    +---> estimateCEFRLevel(): 점수를 A1-C2에 매핑
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

## 거시적 관점: 시스템 통합

### 아키텍처 역할

이 모듈은 LOGOS 아키텍처의 **언어 분석 계층**에 위치합니다:

```
계층 1: 사용자 인터페이스 (React)
    |
계층 2: IPC 통신 (Electron)
    |
계층 3: 핵심 알고리즘 <-- syntactic.ts가 여기 있음
    |     |- irt.ts (능력 추정)
    |     |- fsrs.ts (간격)
    |     |- pmi.ts (연어)
    |     |- morphology.ts (단어 구조)
    |     |- syntactic.ts (문장 구조) <-- 현재 위치
    |     |- bottleneck.ts (SYNT 구성요소에 syntactic 사용)
    |     +- priority.ts (스케줄링)
    |
계층 4: 데이터베이스 (Prisma/SQLite)
```

### 전체적 영향

통사적 분석은 네 가지 중요한 LOGOS 기능을 가능하게 합니다:

**1. CEFR 기반 콘텐츠 선택**

유럽 공통 참조 기준(CEFR)은 여섯 가지 숙련도 수준을 정의합니다:
- A1/A2: 기본 사용자 (간단한 문장, 구체적 어휘)
- B1/B2: 독립적 사용자 (연결된 담화, 추상적 주제)
- C1/C2: 숙련된 사용자 (복잡한 구조, 미묘한 표현)

이 모듈은 모든 텍스트를 이러한 수준에 자동으로 매핑합니다:

| CEFR 수준 | 문장 길이 | 절 수 | 종속 지수 | 예시 |
|------------|-----------------|--------------|---------------------|---------|
| A1 | ~8 단어 | 1 절 | 0% | "The doctor sees patients." |
| A2 | ~12 단어 | 1-2 절 | 10% | "The doctor sees patients every day." |
| B1 | ~15 단어 | 2 절 | 20% | "The doctor sees patients who have appointments." |
| B2 | ~20 단어 | 2-3 절 | 30% | "Although the doctor was busy, she saw patients who had urgent concerns." |
| C1 | ~25 단어 | 3 절 | 40% | 다중 종속 수준의 복잡한 내포 구조 |
| C2 | ~30 단어 | 4+ 절 | 50% | 정교한 통사 패턴의 원어민 수준 복잡성 |

**2. LanguageObjectVector 생성**

LOGOS의 모든 어휘 항목과 문장 패턴은 다차원 벡터 표현을 가집니다:

```
LanguageObjectVector = {
    orthographic: ...,
    phonological: ...,
    morphological: ...,
    syntactic: <-- 이 모듈이 이것을 제공 (toSyntacticVector 통해)
    semantic: ...,
    pragmatic: ...
}
```

`syntactic` 구성요소에는 다음이 포함됩니다:
- 품사 분류
- 하위범주화 프레임 (예: [+타동사], [+수여동사])
- 논항 구조 패턴 (주어-동사-목적어 등)
- 복잡성 수준 (단순/보통/복잡)
- 필요한 CEFR 수준

**3. 장르별 구조 감지**

전문 영역에는 특정 통사적 관례가 있습니다:

| 장르 | 영역 | 예상 섹션 | CEFR 범위 | 예시 패턴 |
|-------|--------|-------------------|------------|------------------|
| SOAP 노트 | 의료 | 주관적, 객관적, 평가, 계획 | B2-C1 | "Patient reports...", "Vitals:", "Impression:" |
| SBAR 핸드오프 | 의료 | 상황, 배경, 평가, 권장 | B1-B2 | "I am calling about...", "The patient was admitted for..." |
| 학술 초록 | 학술 | 배경, 방법, 결과, 결론 | C1-C2 | "This study examines...", "Results indicate..." |
| 비즈니스 이메일 | 비즈니스 | 인사, 목적, 세부사항, 조치, 마무리 | B1-B2 | "I am writing to...", "Please find attached..." |
| 법적 계약 | 법률 | 당사자, 전문, 조건, 서명 | C1-C2 | "WHEREAS...", "Notwithstanding..." |

`detectGenre()`와 `analyzeGenreCompliance()` 함수는 LOGOS가 다음을 할 수 있게 합니다:
- 학습자가 작업 중인 텍스트 유형 식별
- 생성된 텍스트가 예상 관례를 따르는지 확인
- 누락된 섹션이나 구조적 개선 제안

**4. IRT를 위한 난이도 보정**

문항반응이론(IRT)은 각 학습 항목에 대한 난이도 매개변수가 필요합니다. 통사적 복잡성이 이것에 직접 반영됩니다:

```
기본 IRT 난이도 = f(complexityScore, subordinationIndex, passiveRatio, ...)
```

높은 통사적 복잡성 = 높은 난이도 매개변수 = 더 고급 학습자에게 항목 제시.

### 임계 경로 분석

**중요도 수준**: 중상

- **실패 시**: 콘텐츠를 학습자 수준에 맞출 수 없고, 난이도 추정이 덜 정확해지며, 장르 준수 확인 불가
- **대체 동작**: 수준 매칭 없이도 콘텐츠 제시 가능하지만, 학습자가 부적절하게 어렵거나 쉬운 자료를 만날 수 있음
- **사용자 대면 영향**: 콘텐츠 매칭 실패 시 학습자가 좌절감 (너무 어려움) 또는 지루함 (너무 쉬움)을 느낄 수 있음
- **연쇄 효과**: 잘못된 CEFR 추정이 과제 생성, 병목 탐지, 진행 추적에 영향

---

## 기술적 개념 (쉬운 설명)

### 종속 지수 (Subordination Index)

**기술적**: 문장에서 총 절에 대한 종속절의 비율로, 통사적 내포 깊이를 측정합니다.

**쉬운 설명**: 얼마나 많은 "생각 안의 생각"이 있는가? 다음을 고려하세요:
- "The doctor left." = 0% 종속 (하나의 주된 생각)
- "The doctor left because the patient recovered." = 50% 종속 (하나의 주된 생각, 하나의 의존적 생각)

높은 종속 = 더 복잡한 문장 구조 = 처리하기 더 어려움.

**사용 이유**: 언어 학습자는 내포절에서 어려움을 겪습니다. 50% 종속을 가진 문장은 여러 아이디어를 동시에 추적해야 합니다.

### 의존 깊이 (Dependency Depth)

**기술적**: 의존 트리의 루트에서 임의의 리프 노드까지의 최대 경로 길이로, 통사 구조가 얼마나 깊게 중첩되어 있는지 측정합니다.

**쉬운 설명**: 문장을 단어들이 "부모" 단어에 연결된 가계도로 상상해 보세요. 의존 깊이는 가장 깊은 가지가 몇 세대인지입니다.

- "The cat sat." = 깊이 2 (sat -> cat, sat -> the)
- "The cat that I saw yesterday sat quietly." = 깊이 5+ (많은 부모-자식 관계 수준)

**사용 이유**: 더 깊은 트리는 파싱하는 데 더 많은 작업 기억이 필요합니다. 초보 학습자는 깊이 2-3을 처리할 수 있고; 고급 학습자는 깊이 6-7을 처리할 수 있습니다.

### 수동 비율 (Passive Ratio)

**기술적**: 총 동사구에 대한 수동태(be + 과거분사)로 구성된 동사구의 비율.

**쉬운 설명**: 문장이 "X가 Y를 했다" (능동)로 구조화되어 있는가 아니면 "Y가 X에 의해 행해졌다" (수동)로 구조화되어 있는가?
- 능동: "The nurse administered the medication."
- 수동: "The medication was administered by the nurse."

수동태는 문법적으로 더 복잡하고 일상 대화에서 덜 일반적입니다.

**사용 이유**: 수동 구문은 학습자에게 더 어렵습니다:
1. 문법적 주어가 "행위자"가 아님
2. 행위자가 생략될 수 있음 ("The medication was administered.")
3. 누가 무엇을 했는지 이해하는 데 추가적인 인지 처리가 필요함

### 명사 비율 (Nominal Ratio)

**기술적**: 명사와 동사의 합에 대한 명사의 비율로, 텍스트의 명사적 스타일 정도를 나타냅니다.

**쉬운 설명**: 텍스트가 "사물 단어" (명사)를 더 많이 사용하는가 아니면 "행동 단어" (동사)를 더 많이 사용하는가?
- 동사적 스타일: "The researcher investigated how patients responded."
- 명사적 스타일: "The researcher's investigation of patient responses..."

학술 및 법률 글쓰기는 더 명사적 (명사가 많음)인 경향이 있습니다.

**사용 이유**: 높은 명사 비율은 공식/학술 스타일을 나타내며, 더 높은 CEFR 수준 및 더 큰 처리 난이도와 상관관계가 있습니다.

### 절 구조 분석

**기술적**: 주절(독립절), 종속절(의존절), 그리고 그 유형(관계절, 시간절, 조건절 등)의 식별 및 분류.

**쉬운 설명**: 문장을 "아이디어 덩어리"로 분해하고 그것들이 어떻게 연결되는지 이해하기:
- **주절**: 독립적인 문장으로 설 수 있음 ("The doctor arrived.")
- **종속절**: 주절에 의존함 ("...because the patient called.")
- **유형**: 이유 의존 (인과적), 시간 의존 (시간적), 조건 의존 (조건적) 등

**사용 이유**: 다른 종속절 유형은 다른 난이도 수준과 습득 순서를 가집니다. 관계절 (who/which/that)은 양보절 (although/even though) 전에 학습됩니다.

### 복잡성 점수 (Complexity Score)

**기술적**: 0-1 척도로 정규화된 여러 통사 지표의 가중 조합으로, 직접 CEFR 매핑을 가능하게 합니다.

**쉬운 설명**: "이 텍스트가 얼마나 복잡한가?"를 요약하는 단일 숫자:
- 문장 길이 (20% 가중치)
- 종속 지수 (20% 가중치)
- 의존 깊이 (15% 가중치)
- 절 수 (15% 가중치)
- 수동 비율 (10% 가중치)
- 명사 비율 (10% 가중치)
- 평균 의존 거리 (10% 가중치)

점수 0.1 = A1 수준 (매우 단순)
점수 1.0 = C2 수준 (원어민 수준 복잡성)

**사용 이유**: 하나의 숫자가 일곱 개의 개별 지표보다 작업하기 쉽습니다. 가중치는 L2 학습자에게 텍스트를 어렵게 만드는 것에 대한 연구를 반영합니다.

---

## 주요 함수 설명

### analyzeSyntacticComplexity(text)

**목적**: 텍스트(단일 문장 또는 단락)의 완전한 통사적 분석.

**과정**:
1. 텍스트를 개별 문장으로 분할
2. 각 문장에 대해 분석:
   - 단어 수 (문장 길이)
   - 절 구조 (주절, 종속절, 등위)
   - 수동태 구문
   - 명사 대 동사 비율
   - 추정 의존 깊이
   - 평균 의존 거리
3. 모든 문장에 걸쳐 지표 평균
4. 전체 복잡성 점수 계산 (0-1)
5. CEFR 수준에 매핑 (A1-C2)

**반환**: 모든 지표와 추정 CEFR 수준을 포함한 `SyntacticComplexity`

### analyzeClauseStructure(sentence)

**목적**: 문장의 모든 절을 식별하고 분류.

**작동 방식**:
- 종속 접속사 검색: "who", "which", "because", "although", "if", "when" 등
- 각 종속접속사는 하나의 종속절을 나타냄
- 등위 접속사 수: "and", "but", "or"
- 주절 = 1 (기본) + 등위 수

**반환**: mainClauses, subordinateClauses, subordinateTypes[], coordinationCount를 포함한 `ClauseAnalysis`

### estimateCEFRLevel(metrics)

**목적**: 복잡성 점수를 CEFR 수준에 매핑.

**매핑**:
| 점수 범위 | CEFR 수준 |
|-------------|------------|
| 0 - 0.15 | A1 |
| 0.15 - 0.30 | A2 |
| 0.30 - 0.50 | B1 |
| 0.50 - 0.70 | B2 |
| 0.70 - 0.85 | C1 |
| 0.85 - 1.00 | C2 |

### toSyntacticVector(word, context?)

**목적**: LanguageObjectVector를 위한 통사적 구성요소 생성.

**계산 내용**:
- 품사 (명사, 동사, 형용사 등)
- 하위범주화 프레임 ([+타동사], [+자동사], [+수여동사])
- 논항 구조 패턴 (SVO, S-연결동사-보어 등)
- 맥락에 따른 복잡성 수준
- 필요한 CEFR 수준

### getSimplificationSuggestions(text, targetLevel)

**목적**: 텍스트를 낮은 CEFR 수준으로 단순화하기 위한 실행 가능한 조언 제공.

**예시 제안**:
- "긴 문장을 더 짧은 문장으로 분할하세요" (길이가 목표 초과 시)
- "종속절을 단순 문장으로 대체하세요" (종속이 너무 높을 경우)
- "수동태를 능동태로 전환하세요" (수동 비율이 너무 높을 경우)
- "명사화된 형태 대신 더 많은 동사를 사용하세요" (명사 비율이 너무 높을 경우)

### detectGenre(text)

**목적**: 텍스트가 어떤 전문 장르에 속하는지 식별.

**작동 방식**:
- 장르별 섹션 표지 검색 (예: "Subjective:", "WHEREAS")
- 장르별 구문 패턴 검색
- 발견되면 일치하는 `GenreStructure` 반환, 그렇지 않으면 null

### analyzeGenreCompliance(text, genre)

**목적**: 텍스트가 예상 장르 관례를 따르는지 확인.

**반환**:
- 준수 점수 (0-1): 예상 섹션이 얼마나 있는지
- 누락된 섹션 목록
- 개선을 위한 제안

---

## 숙달 단계와의 통합

`isSuitableForStage()` 함수는 숙달 단계를 적절한 CEFR 수준에 매핑합니다:

| 숙달 단계 | 설명 | 적합한 CEFR |
|---------------|-------------|---------------|
| 0 (신규) | 첫 노출 | A1만 |
| 1 (인식) | 단서로 식별 가능 | A1, A2 |
| 2 (회상) | 노력으로 기억 가능 | A2, B1 |
| 3 (통제된 산출) | 집중하며 산출 가능 | B1, B2 |
| 4 (자동화) | 유창한 접근 | B2, C1, C2 |

이것은 초기 숙달 단계의 학습자가 더 단순한 문장을 보고, 고급 학습자가 원어민 수준의 복잡성을 만나도록 보장합니다.

---

## 병목 탐지와의 통합

병목 모듈 (Part 7)은 통사적 분석을 연쇄에서 SYNT 구성요소로 사용합니다:

```
PHON -> MORPH -> LEX -> SYNT -> PRAG
                        ^
                        |
   여기서 통사적 오류가 하류 PRAG 오류를 일으킬 수 있음
   그러나 상류 LEX 문제로 인해 발생할 수도 있음
```

**예시 연쇄 탐지**:
1. 사용자가 수동태 구문에서 어려움을 겪음 (SYNT 오류)
2. 병목 시스템이 확인: LEX 오류도 상승했는가?
3. 예인 경우: 근본 원인이 어휘 격차 (LEX)로 인한 구문 실패일 수 있음
4. 아닌 경우: 통사적 패턴에 직접 개입 집중

**통사적 오류 패턴** (bottleneck.ts에서 탐지):
- 절 내포 오류 (종속 실수)
- 주어-동사 일치 실패
- 수동태 혼동
- 어순 문제

---

## 변경 이력

### 2026-01-04 - 초기 구현
- **변경 사항**: 완전한 통사적 복잡성 분석 모듈 생성
- **이유**: CEFR 기반 콘텐츠 매칭 및 LanguageObjectVector.syntactic 생성 가능
- **영향**: 난이도에 적합한 콘텐츠 제시를 위한 기반

### 구현된 기능
- 문장 복잡성 지표 (8개 차원)
- CEFR 수준 추정 및 매핑
- 절 구조 분석 (주절/종속절, 등위)
- 종속절 유형 분류 (7개 유형)
- 장르별 구조 감지 (5개 장르: SOAP, SBAR, 학술, 비즈니스, 법률)
- LanguageObjectVector를 위한 SyntacticVector 생성
- 품사 추정 (휴리스틱)
- 동사 하위범주화 추론
- 논항 구조 패턴 식별
- 단순화 제안 생성기
- 숙달 단계 적합성 확인
- CEFR 수준 비교 유틸리티
