# 핵심 기반 모듈 (Core Foundation)

> **최종 업데이트**: 2026-01-06
> **상태**: Active

이 문서는 LOGOS 애플리케이션의 핵심 기반 모듈인 `types.ts`와 `index.ts`에 대한 한국어 번역본입니다.

---

## Core Type Definitions (핵심 타입 정의)

> **코드 위치**: `src/core/types.ts`

---

### 맥락 및 목적 (Context & Purpose)

이 파일은 전체 LOGOS 애플리케이션의 **타입 시스템 기반(Type System Foundation)**입니다. 핵심 알고리즘이 사용하는 모든 데이터 구조를 정의하며, 코드베이스 전체에서 공유되는 어휘를 확립합니다. 이 파일 없이는 나머지 LOGOS가 통신할 수 없습니다 - 문자 그대로 다른 모든 모듈이 사용하는 언어입니다.

**비즈니스 필요성**: 언어 학습은 많은 상호 연관된 개념들(능력 수준, 기억 스케줄링, 어휘 지표, 과제 유형)을 가진 복잡한 도메인입니다. 신뢰할 수 있는 소프트웨어를 구축하려면 이러한 모든 개념에 정확하고 일관된 정의가 필요합니다. 이 파일은 개발자들이 같은 것에 대해 다른 용어("score" vs "ability" vs "theta")를 사용하는 것을 방지하고 전체 애플리케이션에서 타입 안전성을 보장합니다.

**사용 시점**: 이 파일은 LOGOS의 거의 모든 다른 모듈에서 import됩니다. IRT 계산, FSRS 스케줄링, PMI 분석, 과제 생성, 병목 감지, 또는 사용자 데이터를 다루는 모든 코드가 여기서 타입을 import합니다.

---

### 미시적 규모: 직접적 관계 (Microscale: Direct Relationships)

#### 의존성 (Dependencies - 이 파일이 필요로 하는 것)

이 파일은 **의존성이 없습니다** - 기반 계층입니다. TypeScript의 내장 타입만 사용합니다.

#### 종속 항목 (Dependents - 이 파일을 필요로 하는 것)

**핵심 알고리즘 모듈:**
- `src/core/irt.ts`: `ItemParameter`, `ThetaEstimate`, `ItemCalibrationResult` 사용
- `src/core/fsrs.ts`: `FSRSCard`, `FSRSParameters`, `MasteryState` 재수출/확장
- `src/core/pmi.ts`: `PMIResult`, `PMIPair`, `DifficultyMapping`, `TaskType` 사용
- `src/core/priority.ts`: `FREMetrics`, `PriorityCalculation`, `PriorityWeights` 사용
- `src/core/bottleneck.ts`: `BottleneckEvidence`, `BottleneckAnalysis`, `ComponentType` 사용
- `src/core/morphology.ts`: `Affix`, `MorphologicalAnalysis` 사용
- `src/core/g2p.ts`: `G2PRule`, `G2PDifficulty` 사용
- `src/core/syntactic.ts`: `SyntacticComplexity` 사용

**공유 계층:**
- `src/shared/types.ts`: 프로세스 간 통신을 위해 모든 타입을 재수출

**서비스 계층:**
- `src/main/services/task-generation.service.ts`: `TaskSpec`, `TaskContent`, `Task` 사용
- `src/main/services/scoring-update.service.ts`: `MasteryState`, `MasteryResponse` 사용
- `src/main/services/state-priority.service.ts`: `PriorityCalculation`, `LearningQueueItem` 사용

#### 데이터 흐름 (Data Flow)

```
types.ts
    |
    +--> 핵심 알고리즘 (irt.ts, fsrs.ts, pmi.ts 등)
    |         |
    |         v
    |    서비스 계층 (task-generation, scoring-update 등)
    |         |
    +--> shared/types.ts --> IPC 계층 --> 렌더러 프로세스
```

---

### 거시적 규모: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 계층 (Architectural Layer)

이 파일은 **계층 0 (기반, Foundation)**에 위치합니다 - 의존성이 없고 모든 것이 이것에 의존합니다:

```
+------------------------------------------------------------+
| 계층 3: 렌더러 (React 컴포넌트)                              |
+------------------------------------------------------------+
                            |
                            v
+------------------------------------------------------------+
| 계층 2: IPC 브릿지 (contracts.ts, *.ipc.ts)                 |
|          shared/types.ts를 통해 타입 import                  |
+------------------------------------------------------------+
                            |
                            v
+------------------------------------------------------------+
| 계층 1: 서비스 및 메인 프로세스                               |
|          core/types.ts에서 직접 타입 import                  |
+------------------------------------------------------------+
                            |
                            v
+------------------------------------------------------------+
| 계층 0: 핵심 타입 (이 파일)                                  |  <-- 기반
|          의존성 없음, 모든 도메인 타입 정의                    |
+------------------------------------------------------------+
```

#### 전체적 영향 (Big Picture Impact)

이 파일은 LOGOS의 **도메인 언어(Domain Language)**를 정의합니다. 애플리케이션의 모든 개념이 여기에 권위 있는 정의를 가집니다:

| 개념 | 타입 | 시스템 영향 |
|------|------|-------------|
| 사용자 능력 | `ThetaEstimate` | IRT 계산, 적응형 난이도 |
| 항목 난이도 | `ItemParameter` | 과제 선택, 교정 |
| 기억 상태 | `FSRSCard` | 간격 반복 스케줄링 |
| 학습 단계 | `MasteryStage` | 진도 추적, 과제 선택 |
| 어휘 지표 | `FREMetrics` | 우선순위 계산 |
| 오류 패턴 | `BottleneckEvidence` | 진단 분석 |
| 과제 정의 | `TaskSpec`, `TaskContent` | 콘텐츠 생성 |
| 사용자 프로필 | `User`, `UserThetaProfile` | 개인화 |

**이 파일이 없다면:**
- 애플리케이션 전체에서 타입 안전성 없음
- 일관성 없는 명명 (개발자들이 자신만의 용어를 만들어냄)
- 모듈 간 공유된 이해 없음
- 컴파일 시간 오류 대신 런타임 오류

#### 중요 경로 분석 (Critical Path Analysis)

**중요도 수준**: Critical (기반)

- **이 파일에 버그가 있으면**: LOGOS의 모든 모듈이 오작동할 수 있음
- **타입이 일관되지 않으면**: 계층 간 데이터 흐름이 깨짐
- **명명이 불명확하면**: 향후 개발이 혼란스러워짐

**안정성 요구사항**: 이 파일은 극도로 안정적이어야 합니다. 여기서의 변경은 전체 코드베이스에 파급됩니다.

---

### 타입 도메인 구성 (Type Domain Organization)

파일은 논리적 섹션으로 구성됩니다:

#### 1. IRT 타입 (Item Response Theory, 문항 반응 이론)

**목적**: 학습자 능력과 항목 난이도의 심리측정학적 모델링을 가능하게 함.

| 타입 | 쉬운 설명 |
|------|-----------|
| `IRTModel` | 어떤 통계 모델을 사용할지 ('1PL', '2PL', '3PL') - 각각 항목에 대해 다른 가정을 가짐 |
| `ItemParameter` | 어휘 항목이 얼마나 배우기 어려운지에 영향을 주는 속성들 |
| `ThetaEstimate` | 학습자가 얼마나 숙련되었는지의 측정값 (신뢰 구간 포함) |
| `IRTResponse` | 학습자가 항목을 맞았는지 틀렸는지의 기록 |

**핵심 통찰**: 세타(Theta, 능력)와 난이도(Difficulty)는 같은 척도에 있습니다. 세타 0은 평균 능력을 의미하고, 난이도 0은 평균 난이도를 의미합니다. 세타가 난이도와 같을 때 학습자는 50%의 성공 확률을 가집니다.

#### 2. PMI 타입 (Pointwise Mutual Information, 점별 상호 정보량)

**목적**: 자연어에서 단어들이 서로 얼마나 강하게 연관되는지 측정.

| 타입 | 쉬운 설명 |
|------|-----------|
| `PMIResult` | 두 단어 간 측정된 연관 강도 |
| `PMIPair` | 분석할 두 단어 |
| `CorpusStatistics` | 텍스트 컬렉션에서의 단어 빈도에 대한 배경 데이터 |

**핵심 통찰**: 높은 PMI는 단어들이 우연보다 더 자주 함께 나타난다는 것을 의미합니다. "커피"와 "컵"은 높은 PMI를 가지고, "커피"와 "냉장고"는 그렇지 않습니다.

#### 3. FSRS 타입 (Spaced Repetition, 간격 반복)

**목적**: 장기 기억 유지를 최대화하기 위해 최적의 간격으로 복습을 예약.

| 타입 | 쉬운 설명 |
|------|-----------|
| `FSRSCard` | 항목에 대한 기억 상태 (얼마나 잘 학습됨, 얼마나 안정적) |
| `FSRSRating` | 학습자의 자가 평가 (1=잊음, 4=쉬움) |
| `FSRSParameters` | 알고리즘 튜닝 설정 |
| `FSRSScheduleResult` | 다음 복습 시기 |

**핵심 통찰**: 안정성(Stability, S)은 잊어버리기까지 며칠인지입니다. 난이도(Difficulty, D)는 항목이 기억하기 얼마나 어려운지입니다. 알고리즘은 90% 기억 유지를 달성하기 위해 복습 타이밍을 최적화합니다.

#### 4. 숙달 타입 (Mastery Types)

**목적**: 학습 단계를 통한 진행 추적 (미지 -> 인식 -> 회상 -> 생성 -> 자동화).

| 타입 | 쉬운 설명 |
|------|-----------|
| `MasteryStage` | 현재 기술 수준 (0-4) |
| `MasteryState` | 항목에 대한 완전한 학습 기록 |
| `ScaffoldingGap` | 힌트 있을 때와 없을 때의 수행 차이 |
| `StageThresholds` | 다음 단계로 진급하기 위한 요구사항 |

**핵심 통찰**: 단계 진행은 정확도만의 문제가 아닙니다. 일관된 수행, 충분한 기억 유지(안정성), 그리고 스캐폴딩(힌트)에 대한 의존성 감소가 필요합니다.

#### 5. 과제 타입 (Task Types)

**목적**: LOGOS가 생성할 수 있는 학습 연습의 종류를 정의.

| 타입 | 쉬운 설명 |
|------|-----------|
| `TaskType` | 어떤 종류의 연습인지 (인식, 회상, 생성 등) |
| `TaskFormat` | 연습이 어떻게 제시되는지 (객관식, 빈칸 채우기, 자유 응답) |
| `TaskSpec` | 어떤 연습을 생성할지에 대한 요청 |
| `TaskContent` | 실제 연습 내용 (프롬프트, 정답, 힌트) |

**핵심 통찰**: 과제 유형 + 형식 + 양식(modality)이 결합하여 다양한 연습을 만듭니다. "인식 + 객관식 + 시각적" = 읽기 객관식. "생성 + 자유 응답 + 청각적" = 듣고 말하기.

#### 6. 우선순위 타입 (Priority Types - FRE Metrics)

**목적**: 빈도, 관계, 맥락에 기반하여 다음에 무엇을 공부할지 결정.

| 타입 | 쉬운 설명 |
|------|-----------|
| `FREMetrics` | 어휘에 대한 3차원 중요도 점수 |
| `PriorityCalculation` | 하나의 항목에 대한 완전한 순위 데이터 |
| `PriorityWeights` | 계산에서 F, R, E를 어떻게 균형 맞출지 |

**핵심 통찰**: FRE는 빈도(Frequency, 얼마나 흔한지), 관계 밀도(Relational density, 다른 단어들과 얼마나 연결되는지), 맥락적 기여(Contextual contribution, 얼마나 의미 있는지)를 나타냅니다. 높은 FRE 단어가 먼저 학습됩니다.

#### 7. 병목 타입 (Bottleneck Types)

**목적**: 어떤 언어 구성요소(음운, 형태, 어휘, 통사, 화용)가 진행을 막는지 감지.

| 타입 | 쉬운 설명 |
|------|-----------|
| `ComponentType` | 5가지 언어학적 수준 (PHON, MORPH, LEX, SYNT, PRAG) |
| `BottleneckEvidence` | 한 수준에서의 오류 패턴 |
| `BottleneckAnalysis` | 무엇이 오류를 일으키는지에 대한 진단 |
| `CascadeAnalysis` | 한 수준의 오류가 더 높은 수준에서 어떻게 오류를 일으키는지 |

**핵심 통찰**: 언어 수준은 캐스케이드(cascade, 연쇄)를 형성합니다: 음운 -> 형태 -> 어휘 -> 통사 -> 화용. 낮은 수준의 오류는 높은 수준에서 겉보기 오류를 일으킵니다. 학습자가 단어를 잘못 발음하면(PHON), 맥락에서 그것을 인식하지 못할 수 있습니다(LEX).

#### 8. 언어 객체 타입 (Language Object Types)

**목적**: 학습될 수 있는 모든 것을 표현 (단어, 구, 패턴, 규칙).

| 타입 | 쉬운 설명 |
|------|-----------|
| `LanguageObjectType` | 분류 (LEX=단어, MWE=구, MORPH=패턴 등) |
| `LanguageObject` | 모든 지표를 포함한 학습 가능 항목의 완전한 기록 |

#### 9. 세션 타입 (Session Types)

**목적**: 처음부터 끝까지 학습 세션을 추적.

| 타입 | 쉬운 설명 |
|------|-----------|
| `SessionMode` | 세션의 목적 (새로운 것 학습, 훈련, 평가) |
| `SessionConfig` | 세션을 위한 설정 (지속 시간, 집중 영역) |
| `SessionState` | 세션 중 실시간 추적 |
| `SessionSummary` | 세션 후 분석 |

#### 10. 유틸리티 타입 (Utility Types)

**목적**: 전체적으로 사용되는 범용 헬퍼.

| 타입 | 쉬운 설명 |
|------|-----------|
| `Result<T, E>` | 데이터와 함께 성공하거나 오류와 함께 실패 |
| `PaginationParams` | 페이지 단위로 데이터 가져오기 |
| `DateRange` | 필터링을 위한 시간 창 |

---

### 기술 개념 (Technical Concepts - 쉬운 설명)

#### 세타 (Theta, 능력 매개변수)

**기술적 정의**: 문항 반응 이론에서 측정되는 구인(construct)에 대한 사람의 기저 능력을 나타내는 잠재 특성 매개변수로, 일반적으로 -3에서 +3 범위의 로짓 척도로 표현됨.

**쉬운 설명**: 세타를 숨겨진 기술 수준이라고 생각하세요. 직접 볼 수는 없지만 누군가의 수행을 관찰하여 추정할 수 있습니다. 세타 0은 평균이고, 양수는 평균 이상, 음수는 이하입니다. 언어 기술을 위한 타율 같은 것입니다.

**사용 이유**: 세타는 학습자와 항목을 같은 척도에서 비교할 수 있게 합니다. 당신의 세타가 1.0이고 항목의 난이도가 1.0이면 50%의 정답 확률이 있습니다. 당신이 2.0이고 항목이 1.0이면 아마 성공할 것입니다(~73%).

#### 변별도 매개변수 (Discrimination Parameter, a)

**기술적 정의**: IRT 모델에서 능력이 항목 난이도에 접근할 때 성공 확률이 얼마나 빠르게 변하는지를 결정하는 기울기 매개변수.

**쉬운 설명**: 항목이 기술 차이에 얼마나 "민감한"지. 높은 변별도 항목은 잘하는 학습자와 어려워하는 학습자를 날카롭게 구분합니다. 낮은 변별도 항목은 기술에 관계없이 비슷한 결과를 줍니다.

**사용 이유**: 일부 어휘 단어는 "진단적"입니다 - 알고 있다면 아마 많이 알고, 모른다면 아마 초보자입니다. 다른 것들은 어느 쪽으로든 많이 알려주지 않습니다. 변별도 매개변수가 이를 포착합니다.

#### 안정성 (Stability, FSRS)

**기술적 정의**: 성공적인 회상 확률이 목표 기억 유지율(일반적으로 90%)과 같아지는 일 수 간격.

**쉬운 설명**: 잊어버릴 때까지 며칠인지. 안정성이 30일이면 알고리즘은 약 한 달 동안 기억할 것으로 예측합니다. 높은 안정성 = 깊이 학습됨.

**사용 이유**: 안정성은 다음 복습을 언제 예약할지 알려줍니다. 잊어버리기 직전에 복습하고 싶습니다 - 그것이 기억 강화를 위한 최적의 순간입니다.

#### FRE 지표 (FRE Metrics)

**기술적 정의**: 어휘 중요도를 수량화하기 위해 코퍼스 빈도(F), 의미 네트워크 중심성(R), 맥락적 정보 이득(E)을 결합한 3차원 지표.

**쉬운 설명**: 단어가 왜 중요한지 측정하는 세 가지 방법. F = 실제 언어에서 얼마나 자주 나타나는지. R = 얼마나 많은 다른 단어들과 연결되는지. E = 이해에 얼마나 많은 의미를 더하는지.

**사용 이유**: 일부 단어는 다른 것보다 더 "학습할 가치가 있습니다". FRE가 우선순위를 정하는 데 도움됩니다. "The"는 높은 F지만 낮은 E를 가집니다. "진단하다"는 의료 학습자에게 중간 F지만 높은 E를 가질 수 있습니다.

#### 캐스케이드 순서 (Cascade Order)

**기술적 정의**: 낮은 수준의 결핍이 위로 전파되는, 언어의 상향식 처리를 나타내는 이론적 계층 PHON -> MORPH -> LEX -> SYNT -> PRAG.

**쉬운 설명**: 언어 이해는 소리에서 의미로 흐릅니다. 먼저 소리를 듣고(음운), 단어 부분을 인식하고(형태), 단어를 식별하고(어휘), 문법을 파싱하고(통사), 그런 다음 의도를 이해합니다(화용). 체인 초기의 문제는 나중에 문제를 일으킵니다.

**사용 이유**: 누군가 문법 문제(SYNT)가 있는 것처럼 보이면, 실제 문제가 더 일찍 있는지 확인합니다 - 아마도 소리를 파싱할 수 없어서(PHON) 단어를 인식하지 못하는(LEX) 것일 수 있습니다. 증상이 아닌 근본 원인을 수정합니다.

---

### 명명 규칙 (Naming Conventions)

`AGENT-MANIFEST.md`에 따라 이 파일은 권위 있는 명명을 확립합니다:

| 올바른 용어 | 잘못된 대안들 |
|------------|--------------|
| `theta` | score, level, ability |
| `priority` | weight, importance |
| `irtDifficulty` | hardness |
| `frequency` | F |
| `relationalDensity` | R |
| `contextualContribution` | E |

---

## Core Module Barrel Export (핵심 모듈 배럴 익스포트)

> **코드 위치**: `src/core/index.ts`

---

### 맥락 및 목적 (Context & Purpose)

이 파일은 LOGOS 학습 알고리즘의 **중추 신경계 게이트웨이(Central Nervous System Gateway)**입니다. 내부 파일 구성을 알 필요 없이 모든 핵심 계산 함수에 접근할 수 있는 단일, 통합된 진입점을 제공하는 배럴 익스포트(barrel export) 역할을 합니다.

**비즈니스 필요성**: LOGOS는 정교한 심리측정학, 언어학, 기억 과학 알고리즘을 구현합니다. 중앙 익스포트 포인트 없이는 개발자들이 15개 이상의 개별 파일에서 import하고, 내부 디렉토리 구조를 기억하고, 코드베이스 전체에 흩어진 import를 유지해야 합니다. 이 배럴 익스포트는 알고리즘적 혼란을 깔끔한 API 표면으로 변환합니다.

**사용 시점**:
- 메인 프로세스가 학습 우선순위를 계산해야 할 때마다
- UI가 숙달 진행 상황을 표시해야 할 때마다
- 학습자 응답을 처리하는 모든 IPC 핸들러
- 복습을 예약하거나 항목을 선택하는 모든 서비스
- 본질적으로: `/src/core` 외부에서 계산 로직이 필요한 모든 코드

**존재 이유 (더 깊은 이유)**:
LOGOS는 엄격한 **순수 알고리즘 격리(Pure Algorithm Isolation)** 원칙을 따릅니다. 모든 계산은 외부 의존성 없이, 데이터베이스 호출 없이, 네트워크 요청 없이, 부작용 없이 `/src/core`에 있습니다. 이 배럴 익스포트는 순수한 수학 함수를 Electron IPC, 데이터베이스 액세스, UI 상태의 복잡한 현실과 분리하는 "막(membrane)"입니다. 이 단일 파일을 통해 모든 접근을 채널링함으로써 아키텍처는 다음을 강제합니다:
1. 순수 함수는 순수하게 유지됨 (테스트 가능, 예측 가능, 이식 가능)
2. 구현 세부사항은 숨겨짐 (소비자를 깨지 않고 리팩토링)
3. 순환 의존성이 불가능해짐 (명확한 의존성 방향)

---

### 미시적 규모: 직접적 관계 (Microscale: Direct Relationships)

#### 의존성 (이 모듈이 익스포트하는 것들의 출처)

배럴은 **15개 알고리즘 파일**과 **5개 서브모듈**의 익스포트를 집계합니다:

**기반 계층:**
- `./types.ts`: 모든 TypeScript 인터페이스와 타입 정의 (공유 어휘)
- `./quadrature.ts`: 가우스-에르미트 수치 적분 (IRT를 위한 수학적 유틸리티)

**심리측정학 계층 (학습자 모델링):**
- `./irt.ts`: 문항 반응 이론 함수 - `probability1PL`, `probability2PL`, `probability3PL`, `estimateThetaMLE`, `estimateThetaEAP`, `calculateFisherInformation`, `selectNextItemFisher`, `selectNextItemKL`, `calibrateItemsEM`
- `./fsrs.ts`: 무료 간격 반복 스케줄러 - `createFSRSCard`, `updateFSRS`, `calculateNextInterval`, 숙달 단계 함수들

**언어 분석 계층:**
- `./pmi.ts`: 코퍼스 분석을 위한 점별 상호 정보량 - `PMICalculator`, `computePMI`, `computeNPMI`, `mapDifficultyToTask`
- `./morphology.ts`: 단어 구조 분해 - `analyzeMorphology`, `getMorphemeComplexity`, `identifyMorphemes`
- `./g2p.ts`: 자소-음소 규칙 - `graphemeToPhoneme`, `calculatePhonemicDistance`, `identifyPronunciationPatterns`
- `./syntactic.ts`: 문법 복잡도 분석 - `parseSentence`, `identifyConstituents`, `calculateSyntacticComplexity`

**학습 최적화 계층:**
- `./priority.ts`: FRE 기반 큐 정렬 - `calculateFREScore`, `calculatePriority`, `rankByPriority`, `adjustWeightsForGoal`
- `./bottleneck.ts`: 오류 캐스케이드 감지 - `analyzeBottleneck`, `detectCascadePattern`, `identifyRootCause`, `getComponentOrder`
- `./task-matching.ts`: 연습-학습자 적합성 - `matchTaskToLearner`, `calculateTaskSuitability`, `selectOptimalTask`
- `./response-timing.ts`: 유창성 지표 - `analyzeResponseTiming`, `calculateFluencyScore`, `detectHesitationPatterns`
- `./transfer.ts`: L1 영향 예측 - `predictTransfer`, `calculateTransferGain`, `identifyInterference`
- `./stage-thresholds.ts`: 숙달 진행 게이트 - `getStageThresholds`, `checkStageAdvancement`, `calculateStageProgress`

**서브모듈 재익스포트 (전체 네임스페이스):**
- `./content/`: 교육학적 의도 매핑, 콘텐츠 사양, 생성, 검증
- `./tasks/`: 전통적 과제 유형 라이브러리, 제약 해결, 오답지 생성
- `./grammar/`: 통사적 구성 라이브러리, 문법 시퀀스 최적화
- `./state/`: 구성요소-객체 상태 추적, 우선순위 검색 엔진
- `./register/`: 도메인/레지스터 프로필, 화용적 적절성 점수화

#### 종속 항목 (이 모듈을 사용하는 것들)

**직접 소비자:**
- `src/main/services/state-priority.service.ts`: 큐 관리를 위해 우선순위 함수 import
- `src/main/services/scoring-update.service.ts`: 응답 처리를 위해 IRT와 FSRS import
- `src/main/services/task-generation.service.ts`: 과제 매칭, 콘텐츠 생성 import
- `src/main/services/pmi.service.ts`: 코퍼스 처리를 위해 PMICalculator import
- `src/main/ipc/*.ipc.ts`: 타입과 함수를 import하는 다양한 IPC 핸들러
- `src/renderer/hooks/*.ts`: 파생 상태를 계산하는 React 훅

**Import 패턴:**
```typescript
// 전체 네임스페이스 import (서비스에서 일반적)
import { probability2PL, estimateThetaEAP, PMICalculator } from '@core';

// 특정 깊은 import (하나만 필요할 때)
import { probability2PL } from '@core/irt';
```

#### 이 모듈을 통한 데이터 흐름

```
외부 요청 (IPC/서비스)
         |
         v
    [index.ts] -----> 적절한 알고리즘 선택
         |
         +---> IRT 함수 (능력 추정)
         |           |
         |           v
         |      세타 추정값 반환
         |
         +---> FSRS 함수 (스케줄링)
         |           |
         |           v
         |      다음 복습 날짜 반환
         |
         +---> 우선순위 함수 (큐 정렬)
         |           |
         |           v
         |      정렬된 학습 큐 반환
         |
         +---> 병목 함수 (진단)
                     |
                     v
                개입 권장사항 반환
```

---

### 거시적 규모: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 계층

이 모듈은 LOGOS의 4계층 아키텍처에서 **계층 0: 순수 계산(Pure Computation)**에 위치합니다:

```
계층 3: UI (React/렌더러)
    ^
    | (훅을 통해)
    |
계층 2: IPC 핸들러 (메인 프로세스)
    ^
    | (서비스를 통해)
    |
계층 1: 서비스 (비즈니스 로직)
    ^
    | (import from)
    |
[계층 0: 핵심 알고리즘] <-- 여기 있습니다
    |
    v
(의존성 없음 - 순수 함수만)
```

이것은 다른 모든 것이 그 위에 구축되는 **기반 계층**입니다. 다른 애플리케이션 코드에 대한 의존성이 전혀 없고, 표준 TypeScript/JavaScript만 사용합니다.

#### 전체적 영향

**이 모듈이 사라진다면:**
전체 LOGOS 애플리케이션이 붕괴될 것입니다. 모든 지능적 기능이 이러한 알고리즘에 의존합니다:

| 기능 | 사용되는 알고리즘 |
|------|-----------------|
| "다음에 무엇을 배워야 하나요?" | priority.ts, task-matching.ts |
| "이 단어를 얼마나 잘 알고 있나요?" | irt.ts, fsrs.ts, stage-thresholds.ts |
| "언제 이것을 복습해야 하나요?" | fsrs.ts, priority.ts |
| "왜 이 오류를 계속 하나요?" | bottleneck.ts, transfer.ts |
| "이 단어는 배울 가치가 있나요?" | pmi.ts, priority.ts |
| "적절한 연습 생성" | content/, tasks/, grammar/ |
| "내 유창성 수준은?" | response-timing.ts, irt.ts |
| "내 수준에 콘텐츠 맞추기" | irt.ts, task-matching.ts, register/ |

#### 12개 알고리즘 도메인

배럴 익스포트는 이론적 기반을 반영하는 일관된 도메인으로 알고리즘을 구성합니다:

1. **IRT (심리측정학)**: 통계적 척도에서 학습자 능력을 모델링하여 적응형 난이도 가능
2. **FSRS (기억 과학)**: 망각 곡선 예측, 최적 복습 타이밍 예약
3. **PMI (코퍼스 언어학)**: 단어 연관 측정, 학습할 가치가 있는 연어 식별
4. **Priority (학습 과학)**: 빈도, 관계, 맥락을 학습 순서로 결합
5. **Bottleneck (오류 분석)**: 언어 구성요소를 통한 오류 캐스케이드 추적 (PHON->MORPH->LEX->SYNT->PRAG)
6. **Morphology (단어 구조)**: 패턴 학습을 위해 단어를 의미 단위로 분해
7. **G2P (음운론)**: 철자를 발음에 매핑, 발음 어려움 식별
8. **Syntactic (문법)**: 문장 복잡도 분석, 문법 패턴 식별
9. **Response Timing (유창성)**: 반응 속도 패턴을 통해 자동성 측정
10. **Task Matching (교육학)**: 학습자 상태에 적절한 연습 유형 선택
11. **Transfer (L1 영향)**: 모국어로부터의 긍정적/부정적 전이 예측
12. **Stage Thresholds (숙달)**: 학습 단계 진행 기준 정의

#### 중요 경로 분석

**중요도 수준**: CRITICAL (Tier 0)

이것은 LOGOS에서 가장 중요한 단일 모듈입니다. 우회하거나 모킹할 수 있는 서비스나 UI 컴포넌트와 달리, 핵심 알고리즘은 학습 시스템을 근본적으로 깨지 않고는 우회하거나 모킹할 수 없습니다.

**실패 모드:**
- IRT 실패 시: 능력 추정이 무작위가 되어 적응형 난이도 깨짐
- FSRS 실패 시: 복습 스케줄링이 임의가 되어 망각 곡선 무시됨
- Priority 실패 시: 학습 큐가 정렬되지 않아 비효율적 학습
- Bottleneck 실패 시: 오류 진단 불가, 학습자들이 막힘

**복구 전략:**
순수 함수 아키텍처는 실패가 결정론적이고 테스트 가능함을 의미합니다. 각 알고리즘은 `src/core/__tests__/`에 대응하는 테스트가 있습니다. 알고리즘이 잘못된 결과를 생성하면, 이 단일 익스포트 포인트를 통해 수정이 자동으로 모든 곳에 전파됩니다.

---

### 기술 개념 (Technical Concepts - 쉬운 설명)

#### 배럴 익스포트 패턴 (Barrel Export Pattern)

**기술적 정의**: 다른 모듈의 익스포트를 재익스포트하여 단일 import 포인트로 집계하는 모듈. "인덱스 익스포트" 또는 "퍼블릭 API 표면"이라고도 함.

**쉬운 설명**: 대기업의 안내 데스크와 같습니다. 각 부서가 어느 층 어느 사무실에 있는지 알 필요 없이 안내 데스크에 물어보면 연결해 줍니다. 배럴 익스포트는 모든 핵심 알고리즘을 위한 안내 데스크입니다.

**사용 이유**:
- 깔끔한 import (`from '@core/irt'`, `from '@core/fsrs'` 등 대신 `from '@core'`)
- 소비자를 깨지 않고 내부 파일 재구성 자유
- 공개적으로 사용 가능한 것 vs 내부적인 것을 감사할 단일 포인트

#### 순수 함수 (Pure Functions)

**기술적 정의**: 같은 입력에 대해 항상 같은 출력을 생성하고, 부작용이 없으며, 외부 상태에 의존하지 않는 함수. "참조 투명성" 함수라고도 함.

**쉬운 설명**: 계산기와 같습니다. 2+2를 누르면 항상 4가 나옵니다. 몇 시인지, 누가 사용하는지, 이전에 무슨 일이 있었는지 중요하지 않습니다. 계산은 매번 같습니다. LOGOS 핵심 함수는 모두 계산기입니다 - 데이터를 넣으면 예측 가능한 결과가 나옵니다.

**사용 이유**:
- 테스트 가능 (모킹 불필요, 입력으로 호출만 하면 됨)
- 캐시 가능 (같은 입력 = 캐시된 출력 유효)
- 병렬화 가능 (손상될 공유 상태 없음)
- 디버깅 가능 (결정론적으로 입력에서 출력까지 추적)

#### 명명된 익스포트 vs 네임스페이스 익스포트

**기술적 정의**: `export { foo, bar }` (명명됨) vs. `export * from './module'` (네임스페이스 재익스포트). 이 배럴은 둘 다 전략적으로 사용합니다.

**쉬운 설명**: 명명된 익스포트는 특정 요리를 나열하는 레스토랑 메뉴와 같습니다. 네임스페이스 익스포트는 "이탈리안 키친의 모든 것을 서비스합니다"라고 말하는 것과 같습니다. 핵심 인덱스는 복잡한 알고리즘에 특정 메뉴를 사용하고(무엇이 사용 가능한지 정확히 알 수 있도록) 더 간단한 서브모듈에는 "모든 것 서비스"를 사용합니다.

**사용 이유**:
- IRT, FSRS 등의 명명된 익스포트: API를 발견 가능하게 하고, 트리 쉐이킹을 가능하게 하며, 내부의 우발적 노출 방지
- 서브모듈(content/, tasks/)의 네임스페이스 익스포트: 서브모듈은 자체 API를 큐레이팅하는 자체 배럴 익스포트를 가짐

#### 트리 쉐이킹 (Tree-Shaking)

**기술적 정의**: 최종 번들에서 사용되지 않는 익스포트를 제거하는 번들러 최적화. 명명된 익스포트는 세밀한 트리 쉐이킹을 가능하게 하고, 네임스페이스 익스포트는 사용되지 않는 코드를 포함할 수 있습니다.

**쉬운 설명**: 전체 옷장 대신 실제로 입을 옷만 짐을 싸는 것과 같습니다. 명명된 익스포트는 번들러가 실제로 호출되는 함수만 패킹하게 합니다.

**중요한 이유**: 핵심 알고리즘은 상당합니다. 트리 쉐이킹은 Electron 앱이 실제로 사용되는 알고리즘만 번들링하여 애플리케이션을 가볍게 유지합니다.

---

### 설계 결정 (Design Decisions)

#### 메인 알고리즘에 명시적 명명 익스포트를 사용하는 이유

배럴은 단순히 `export * from './irt'`를 할 수 있지만 대신 각 익스포트를 명시적으로 나열합니다. 이는 의도적입니다:

1. **API 문서화**: index.ts 파일이 곧 API 문서입니다. 읽으면 정확히 무엇이 사용 가능한지 보여줍니다.
2. **브레이킹 체인지 감지**: 익스포트 추가/제거는 이 파일을 변경해야 하며, 코드 리뷰에서 API 변경이 보입니다.
3. **선택적 노출**: 알고리즘 파일의 내부 헬퍼 함수는 내부에 유지됩니다(여기서 익스포트되지 않음).

#### 서브모듈에 네임스페이스 재익스포트를 사용하는 이유

`content/`, `tasks/`, `grammar/` 같은 서브모듈은 `export * from './content'`를 사용합니다:

1. **위임**: 이러한 서브모듈은 자체 익스포트를 큐레이팅하는 자체 index.ts를 가짐
2. **성장**: 이러한 영역은 빠르게 진화하며, 직접 재익스포트는 두 개의 목록 유지를 피함
3. **일관성**: 각 서브모듈은 함께 소비되어야 하는 일관된 도메인

#### 함수와 함께 타입을 익스포트하는 이유

타입은 함수와 함께 익스포트됩니다(`createFSRSCard`와 함께 `type FSRSRating`, `type FSRSState`):

1. **소비자 편의성**: FSRS 함수를 사용하는 코드는 FSRS 타입이 필요할 가능성이 높음
2. **공존**: 함께 가는 타입과 함수는 함께 import되어야 함
3. **TypeScript 모범 사례**: 명시적 타입 익스포트는 더 나은 타입 추론을 가능하게 함

---

### 사용 예제 (Usage Examples)

#### 기본 Import (가장 일반적)
```typescript
// 통합된 진입점에서 필요한 것을 import
import {
  probability2PL,
  estimateThetaEAP,
  updateFSRS,
  calculatePriority
} from '@core';
```

#### 타입 전용 Import
```typescript
import type {
  ItemParameter,
  ThetaEstimate,
  FSRSCard,
  MasteryState
} from '@core';
```

#### 서브모듈 기능
```typescript
import {
  ContentGenerator,
  createContentSpec,
  TRADITIONAL_TASK_TYPES,
  selectOptimalTaskType
} from '@core';
```

#### 깊은 Import (트리 쉐이킹이 중요할 때)
```typescript
// 최소 번들을 위해 특정 파일에서 직접 import
import { probability2PL } from '@core/irt';
```

---

### 변경 이력 (Change History)

#### types.ts
- **2026-01-06**: 초기 문서화 - types.ts에 대한 섀도우 문서 생성

#### index.ts
- **2026-01-05**: 문서화 생성 - 배럴 익스포트 아키텍처를 설명하는 내러티브 문서 추가
- **2026-01-03**: 단계 임계값 익스포트 추가 - 숙달 진행을 위한 `stage-thresholds.ts` 익스포트 추가
- **2026-01-02**: Transfer, Response Timing, Task Matching 추가 - 세 개의 새 알고리즘 파일 통합
- **2026-01-01**: 초기 서브모듈 구조 - content/, tasks/, grammar/, state/, register/ 서브모듈 생성

---

### 관계도 (Relationship Map)

```
                            +-----------------+
                            |   index.ts      |
                            | (이 파일)       |
                            +--------+--------+
                                     |
        +----------------------------+----------------------------+
        |                            |                            |
        v                            v                            v
+---------------+          +------------------+         +------------------+
|   types.ts    |          |  알고리즘 파일들   |         |    서브모듈들     |
| (공유 타입)    |          |  (15개 파일)      |         |   (5개 모듈)      |
+---------------+          +------------------+         +------------------+
                                     |                            |
        +----+-----------+-----------+                            |
        |    |           |           |                            |
        v    v           v           v                            v
     +----+ +----+    +------+   +------+          +---------+----------+
     |IRT | |FSRS|    |PMI   |   |기타  |          |content/ |  tasks/  |
     +----+ +----+    +------+   +------+          +---------+----------+
                                                   |grammar/ | state/   |
                                                   +---------+----------+
                                                   |       register/    |
                                                   +--------------------+
```
