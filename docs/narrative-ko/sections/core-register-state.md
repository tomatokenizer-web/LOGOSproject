# Core Register & State 모듈 문서

이 문서는 LOGOS 프로젝트의 Register(레지스터) 모듈과 State(상태) 모듈에 대한 기술 문서입니다.

---

## Register 모듈

### index.ts - Register 모듈의 중앙 내보내기 지점

#### 존재 이유

Register 모듈은 언어 학습에서 **화용적 능력(pragmatic competence)**을 모델링하기 위해 존재합니다. 이는 특정 사회적 맥락에 적합한 언어를 사용하는 능력을 의미합니다. 이 index 파일은 모든 레지스터 관련 타입, 프로필, 계산기를 단일 import 지점으로 통합하여, LOGOS의 다른 부분에서 내부 파일 구조를 알 필요 없이 도메인/레지스터 기능에 쉽게 접근할 수 있도록 합니다.

이는 프로젝트의 GAPS-AND-CONNECTIONS.md 명세서에서 언어 학습 시스템의 도메인 및 레지스터 구조 필요성을 다루는 Gap 4.2를 직접 구현합니다.

#### 핵심 개념

- **Register(레지스터)**: 특정 사회적 상황에서 사용되는 언어 변이형 (예: 학술 격식체, 일상 대화, 법률 고정체)
- **RegisterProfile(레지스터 프로필)**: 격식성 수준, 전형적 어휘, 연어(collocation), 언어적 특성을 포함한 레지스터의 완전한 정의
- **DomainStructure(도메인 구조)**: 전문적 또는 맥락적 도메인별로 그룹화된 레지스터 컬렉션 (예: 의학 영어, 비즈니스 영어)
- **RegisterCalculator(레지스터 계산기)**: 단어와 구문이 특정 레지스터 내에서 얼마나 잘 맞는지 계산하는 엔진
- **FormalityLevel(격식성 수준)**: "frozen"(가장 격식적)에서 "intimate"(가장 비격식적)까지의 범주형 척도

#### 설계 결정사항

- **Barrel Export 패턴**: `export { ... } from './file'` 패턴을 사용하여 내부 구현 세부사항을 숨기면서 깔끔한 공개 API 생성
- **책임 분리**: 타입과 정적 데이터는 `register-profile.ts`에, 계산 로직은 `register-calculator.ts`에 위치
- **타입 우선 내보내기**: 타입이 런타임 대응물과 함께 내보내져 소비자에게 강력한 TypeScript 지원 제공
- **재변환 없음**: 내보내기가 변경 없이 전달되며, 추가 처리나 래핑이 발생하지 않음

#### 통합 지점

- **소비자**: 레지스터 인식이 필요한 모든 모듈이 이 index에서 import:
  - 콘텐츠 생성 서비스 (출력 레지스터를 컨텍스트에 맞추기 위해)
  - 평가 엔진 (학습자의 화용적 능력 평가를 위해)
  - 어휘 모듈 (단어에 레지스터 적합성 태그 지정을 위해)

- **상위 의존성**:
  - `register-profile.ts`: 모든 타입 정의, 정적 레지스터 데이터, 쿼리 함수 제공
  - `register-calculator.ts`: 계산 분석 기능 제공

- **시스템 역할**: 더 넓은 `core/` 알고리즘 레이어 내에서 레지스터 하위 시스템의 **파사드(facade)** 역할 수행

---

### register-calculator.ts - Register 적합성 분석 엔진

#### 존재 이유

언어 학습자는 종종 **레지스터 불일치**로 어려움을 겪습니다: 비즈니스 이메일에서 캐주얼한 속어를 사용하거나, 친구들과 대화할 때 지나치게 격식적인 언어를 사용하는 경우입니다. 이 계산기는 이러한 불일치를 감지하고 점수화하는 계산적 백본을 제공합니다. "이 단어가 학술 글쓰기에 적합한가?" 또는 "이 텍스트는 어떤 레지스터에 속하는가?"와 같은 질문에 답합니다.

이 모듈은 LOGOS가 학습자에게 문법적 정확성뿐만 아니라 화용적 적합성에 대한 피드백을 제공할 수 있게 합니다. 문장은 문법적으로 완벽하면서도 사회적으로 어색할 수 있으며, 이 계산기가 그것을 포착합니다.

#### 핵심 개념

- **RegisterFitResult**: 단일 단어를 대상 레지스터에 대해 분석한 결과. 적합성 점수(0-1), 구성요소 분석(격식성 적합도, 장르 적합도, 연어 적합도, 빈도 적합도), 추론 근거, 적합도가 낮을 때 제안되는 대안 포함.

- **WordRegisterDistribution**: 단어를 각 레지스터에 속할 확률에 매핑. 단어가 레지스터 특정적인지(예: "herein"은 강하게 법률적) 또는 레지스터 중립적인지(예: "the"는 어디서나 작동) 드러냄.

- **RegisterTransferAnalysis**: 어휘가 레지스터 간에 이동할 때 어떤 일이 발생하는지 분석. 전이 가능한 단어, 적응이 필요한 단어, 피해야 할 단어 식별. 학습자에게 "코드 스위칭(code-switch)"을 가르치는 데 중요.

- **TextRegisterAnalysis**: 지배적 레지스터를 감지하고, 위반(감지된 레지스터에 맞지 않는 단어)을 식별하며, 일관성을 측정하는 전체 텍스트 분석.

- **격식성 추정(Formality Estimation)**: 형태론적 특성(길이, "-tion"/"-ment"와 같은 접미사, 축약형)을 기반으로 단어 격식성을 추정하는 휴리스틱 시스템.

#### 설계 결정사항

- **다중 구성요소 점수 시스템**: 100점 점수 시스템은 네 가지 구성요소로 분해:
  - 격식성 적합도 (0-40점): 단어 격식성이 레지스터 격식성과 일치하는가?
  - 장르 적합도 (0-25점): 이 단어가 이 레지스터에서 전형적이거나 흔한가?
  - 연어 적합도 (0-20점): 단어가 레지스터 특정 연어를 가지는가?
  - 빈도 적합도 (0-15점): 이 단어가 이 레지스터에서 얼마나 자주 나타나는가?

  이 분해는 뉘앙스 있는 피드백을 가능하게 합니다 ("당신의 단어 선택은 격식적으로는 적합하지만 장르적으로는 비전형적입니다").

- **0.5 임계값**: 50% 이하의 적합성 점수를 받은 단어는 부적합으로 표시. 이 균형 잡힌 임계값은 명확한 불일치를 포착하면서 경계선 사례는 허용.

- **캐싱 전략**: `wordRegisterCache`는 텍스트 분석 중 같은 단어가 반복적으로 나타나므로 분포 계산을 메모이제이션. 장시간 실행 세션을 위해 캐시를 명시적으로 지울 수 있음.

- **휴리스틱 격식성 추정**: 완전한 어휘 데이터베이스를 요구하기보다, 격식성은 단어 특성(길이, 형태론)에서 추정. 불완전하지만 외부 의존성 없이 확장 가능.

- **클래스 + 팩토리 함수**: 상태 유지 사용을 위한 `RegisterCalculator` 클래스와 편의를 위한 `createRegisterCalculator()` 팩토리 및 독립 함수(`computeRegisterAppropriatenessScore`, `detectTextRegister`) 제공.

#### 통합 지점

- **직접 의존성**:
  - `register-profile.ts`: 모든 계산에 `REGISTER_PROFILES`, `findClosestRegister()`, `calculateFormalityDistance()` 제공
  - `../types`: `LanguageObject` 타입 import (현재 보이는 코드에서는 미사용)

- **소비자**:
  - 콘텐츠 생성 시스템: 생성된 콘텐츠가 대상 레지스터와 일치하는지 검증
  - 평가 모듈: 학습자 출력의 화용적 능력 점수화
  - 글쓰기 지원 도구: 레지스터에 적합한 대안 제안
  - 텍스트 분석 기능: 입력 텍스트의 레지스터 감지 및 보고

- **시스템 역할**: 이것은 레지스터 하위 시스템의 **계산 엔진**. `register-profile.ts`가 정적 데이터를 제공하는 반면, 이 모듈은 동적 분석을 제공.

---

### register-profile.ts - Register 타입 정의 및 정적 데이터 라이브러리

#### 존재 이유

레지스터 적합성을 분석하기 전에, 시스템은 어떤 레지스터가 존재하고 각각을 무엇이 특징짓는지에 대한 어휘가 필요합니다. 이 파일은 그 기초 지식을 정의합니다: "학술 격식체"란 무엇인가? 법률 언어가 캐주얼한 채팅과 다른 이유는 무엇인가? 비즈니스 이메일과 소셜 미디어 게시물을 구분하는 언어적 특성은 무엇인가?

이것은 레지스터 인식 언어 학습을 가능하게 하는 **지식 베이스**입니다. 이러한 정의 없이는 계산기가 계산할 대상이 없습니다.

#### 핵심 개념

- **Genre(장르)**: 텍스트 유형의 범주적 분류 (13개 정의). 예: `academic_article`, `business_email`, `casual_conversation`, `legal_document`. 단일 레지스터가 여러 장르에 걸쳐 있을 수 있음.

- **PragmaticFunction(화용적 기능)**: 언어가 달성하려는 목적 (17개 정의). 예: `informing`, `requesting`, `persuading`, `hedging`. 레지스터마다 다른 화용적 기능을 선호.

- **FormalityLevel(격식성 수준)**: 수치 범위에 매핑되는 5단계 범주형 척도:
  - `frozen` (0.9-1.0): 법률, 예전, 의식적
  - `formal` (0.7-0.9): 학술, 전문 글쓰기
  - `consultative` (0.5-0.7): 전문적 대화
  - `casual` (0.3-0.5): 친구, 동료
  - `intimate` (0.0-0.3): 가까운 가족, 파트너

- **CollocationPattern(연어 패턴)**: 레지스터 내에서 자주 함께 나타나는 단어 쌍. 관계 유형(동사+명사, 형용사+명사 등), 통계적 강도(PMI 점수), 레지스터 특정성 점수 포함.

- **RegisterProfile(레지스터 프로필)**: 다음을 포함하는 레지스터의 완전한 정의:
  - 정체성 (id, name, description)
  - 격식성 (수준 및 수치)
  - 장르 연관성
  - 전형적 어휘
  - 연어
  - 화용적 기능
  - 정량화된 언어적 특성
  - 예시 맥락
  - L1별 일반적 오류 (선택적)

- **RegisterFeatures(레지스터 특성)**: 레지스터 언어 패턴의 수치적 특성화:
  - `avgSentenceLength`: 학술 = 25단어; 소셜 미디어 = 6단어
  - `passiveVoiceRate`: 법률 = 45%; 캐주얼 = 5%
  - `contractionRate`: 소셜 미디어 = 85%; 법률 = 0%
  - `technicalTermDensity`: 의학 = 35%; 캐주얼 = 2%
  - 추가: 대명사 밀도, 완화 빈도, 담화 표지, 법조동사, 복합문, 명사화 비율

- **DomainStructure(도메인 구조)**: 전문/맥락적 도메인별로 레지스터 그룹화. 포함 내용:
  - 도메인의 핵심 어휘
  - 학습자가 도메인 간 이동할 수 있는 방법을 보여주는 전환 경로
  - 다루는 CEFR 수준 범위

#### 설계 결정사항

- **8개의 사전 구축 레지스터**: 가장 일반적인 영어 학습 요구 사항 포함:
  - `academic_formal`: 연구 논문, 저널
  - `business_formal`: 보고서, 제안서, 공식 서신
  - `legal_frozen`: 계약서, 법령
  - `professional_consultative`: 직장 대화
  - `medical_professional`: 의료 커뮤니케이션
  - `casual_conversation`: 친구와의 일상 대화
  - `social_media_informal`: Twitter, Instagram, 문자
  - `news_journalistic`: 뉴스 보도, 보도자료

- **4개의 사전 구축 도메인**: General, Academic, Business, Medical. 각각 지정:
  - 소속 레지스터
  - 마스터할 핵심 어휘
  - 인접 도메인으로의 전환 경로 (예: Medical에서 Academic으로는 연구 어휘 공유)

- **수치 격식성**: 범주적 수준을 넘어, 각 레지스터는 정밀한 0-1 격식성 값을 가짐. 레지스터 간 수학적 거리 계산 가능.

- **L1별 오류 추적**: 선택적 `commonErrors` 필드는 특정 모국어 화자의 전형적 실수 포착. 현재 학술 레지스터에서 중국어 및 스페인어 화자용으로 정의.

- **도메인 전환**: `DomainTransition` 객체는 어휘가 도메인 간에 어떻게 전이되는지 모델링. `transferCoefficient` (0-1)는 기술이 얼마나 쉽게 전이되는지 나타내며, `bridgeWords`는 학습자가 도메인 경계를 넘는 데 도움이 되는 어휘 식별.

- **순수 데이터 + 헬퍼 함수**: 파일은 원시 데이터 내보내기(`REGISTER_PROFILES`, `DOMAIN_STRUCTURES`)와 일반적 쿼리를 위한 편의 함수(`getRegistersByFormality`, `findClosestRegister`, `isTypicalForRegister`) 모두 제공.

#### 통합 지점

- **직접 의존성**:
  - `../types`: `ComponentType` (타입 정의) import

- **소비자**:
  - `register-calculator.ts`: 모든 계산에 프로필, 상수, 헬퍼 함수 사용
  - 콘텐츠 생성: 대상 레지스터 선택 및 특성 검색
  - 평가: 점수화를 위한 레지스터 특성 조회
  - UI 컴포넌트: 학습자에게 레지스터 이름과 설명 표시 가능

- **시스템 역할**: 이것은 레지스터 하위 시스템의 **정적 지식 레이어**. 레지스터가 무엇인지 정의하고, `register-calculator.ts`는 이 데이터를 사용하여 콘텐츠가 레지스터와 얼마나 잘 일치하는지 분석.

- **확장성 포인트**:
  - `REGISTER_PROFILES` 객체 확장으로 새 레지스터 추가
  - `DOMAIN_STRUCTURES` 객체 확장으로 새 도메인 추가
  - 타입 유니온 확장으로 새 장르/화용적 기능 추가

---

## State 모듈

### index.ts - State 모듈 공개 API

#### 존재 이유

State 모듈은 여러 파일에 걸쳐 복잡한 타입 계층과 수많은 함수를 포함합니다. 통제된 내보내기 표면 없이는 소비자가 내부 파일 구조를 알고 리팩토링 중 변경될 수 있는 특정 경로에서 import해야 합니다. 이 index 파일은 모듈의 공개 API 계약 역할을 합니다 - 안정적인 인터페이스의 일부인 것과 내부 구현 세부사항을 명시적으로 선언합니다. 소비자는 `core/state`에서 import하고 필요한 것을 정확히 받습니다.

이 패턴은 트리 쉐이킹(tree-shaking)도 가능하게 합니다: 번들러가 명시적 내보내기 목록을 분석하여 프로덕션 빌드에서 사용되지 않는 코드를 제외할 수 있습니다.

#### 핵심 개념

- **Type-Only Exports(타입 전용 내보내기)**: 내보내기에서 TypeScript의 `type` 키워드는 이것들이 컴파일 타임 전용 구조임을 신호. `LanguageComponent`, `TaskPhase`, `CognitiveInduction`, `ComponentObjectState`와 같은 타입은 형태를 설명하지만 런타임 코드를 생성하지 않음.

- **두 개의 내보내기 그룹**: 파일은 모듈의 두 소스 파일을 반영하는 두 개의 논리적 섹션으로 구성:
  1. Component Object State (개별 학습 항목 상태를 위한 타입과 함수)
  2. Component Search Engine (컬렉션 쿼리를 위한 타입과 클래스)

- **함수 내보내기**: 타입과 함께, index는 팩토리 및 유틸리티 함수 내보내기: `createComponentObjectState`, `recordExposure`, `updateIRTMetrics`, `updateCognitiveInduction`, `updateMasteryState`, `addRelation`, `calculateEffectivePriority`, `needsReview`, `isAutomized`, `getBottleneckScore`, `createSearchEngine`, `createSearchEngineWithData`.

#### 설계 결정사항

**명시적 우선**: `export * from './component-object-state'`를 사용하는 대신, 각 내보내기를 개별적으로 나열. 내부 헬퍼를 실수로 노출하는 것을 방지하고 공개 API를 자기 문서화되게 만듦.

**소스 파일별 그룹화**: 내보내기 문은 출처(`./component-object-state` vs `./component-search-engine`)를 보존하여, 필요할 때 구현 세부사항을 쉽게 추적 가능.

**클래스 내보내기**: `ComponentSearchEngine`은 인터페이스만이 아닌 구체적 클래스로 내보내짐. 소비자가 직접 인스턴스화하거나 확장할 수 있게 하며, 팩토리 함수는 일반적인 경우를 위한 더 간단한 진입점 제공.

**Gap 4.3 참조**: 모듈 헤더 주석은 프로젝트 요구사항 명세의 "Gap 4.3: Component-Object State Dictionary"를 명시적으로 참조하여, 구현에서 설계 문서로의 추적성 유지.

#### 통합 지점

- **`./component-object-state`**: 개별 학습 항목 추적을 위한 모든 핵심 타입과 상태 조작 함수.

- **`./component-search-engine`**: 컬렉션 수준 작업을 위한 검색 엔진 클래스, 쿼리 타입, 결과 타입.

- **소비자 모듈**: 학습 상태와 작업해야 하는 시스템의 모든 부분이 이 index에서 import:
  - 작업 선택 알고리즘: `ComponentObjectState`와 `calculateEffectivePriority` import
  - 사전 UI 컴포넌트: `SearchFilters`, `SearchResult`, `ComponentSearchEngine` import
  - 네트워크 시각화: `NetworkGraphView`, `NetworkNode`, `NetworkEdge` import
  - 간격 반복 스케줄링: `MasteryStateSummary`와 `needsReview` import
  - 진행 추적: `CognitiveInduction`과 `IRTMetrics` import

- **패키지 경계**: 이 파일은 `@logos/core/state` 패키지 경계를 효과적으로 정의 - 여기서 내보낸 모든 것은 공개, 디렉토리의 다른 모든 것은 구현 세부사항.

---

### component-object-state.ts - 언어 컴포넌트를 위한 통합 학습 상태

#### 존재 이유

언어 학습은 여러 차원을 동시에 추적하는 것을 포함합니다: 어휘 노출, 문법 패턴 인식, 발음 연습 등. 통합된 상태 모델 없이는 시스템이 서로 정보를 주고받을 수 없는 분리된 추적 시스템으로 파편화됩니다. 이 모듈은 시스템이 학습자와 언어 컴포넌트 간의 관계에 대해 알아야 하는 모든 것을 캡처하는 포괄적인 데이터 구조를 제공합니다 - 원시 노출 횟수부터 자동화 수준 및 전이 효과와 같은 정교한 인지 메트릭까지.

이것은 프로젝트의 GAPS-AND-CONNECTIONS 명세에서 모든 언어 도메인에 걸친 "Component-Object State Dictionary"의 필요성을 식별한 Gap 4.3을 직접 구현합니다.

#### 핵심 개념

- **LanguageComponent(언어 컴포넌트)**: 학습 항목을 다섯 도메인으로 분류: 자소-음소 대응(g2p), 형태론, 어휘, 문법, 화용론. 이 분류법은 시스템이 도메인에 적합한 학습 전략을 적용할 수 있게 보장.

- **TaskPhase(작업 단계)**: 학습(초기 소개), 훈련(의도적 연습), 평가(사정) 단계 구분. 각 단계는 다른 교육적 목적을 수행하고 다른 메트릭 생성.

- **ExposurePattern(노출 패턴)**: 학습 항목과의 각 상호작용의 타임스탬프 기록, 작업 유형, 양식(시각/청각/혼합), 성공 결과, 응답 시간, 사용된 스캐폴딩 수준 캡처.

- **CognitiveInduction(인지 유도)**: 자동화 수준(지식이 얼마나 자동화되었는지), 사용 공간 확장(마스터한 맥락의 다양성), 절차적 유창성(실시간 사용의 속도/정확도)과 같은 메트릭을 통해 명시적에서 암시적 지식으로의 전환 추적.

- **IRTMetrics(IRT 메트릭)**: 세타 추정치(학습자 능력), 난이도 보정, 변별 지수, 표준 오차를 포함한 문항 반응 이론 매개변수. 적응적 난이도 선택 가능.

- **TransferEffects(전이 효과)**: 한 항목을 학습하는 것이 다른 항목에 어떻게 영향을 미치는지 매핑 - 긍정적 전이("un-"을 배우면 "undo", "unfair"에 도움), 부정적 간섭(언어 간 거짓 친구), 교차 컴포넌트 전이(어휘 지식이 문법 습득을 돕는 것).

- **FeatureVector(특성 벡터)**: z(w)로 인코딩된 학습 항목의 정적 속성: 빈도(F), 관계 밀도(R), 도메인 분포(D), 형태적 복잡성(M), 음운적 난이도(P).

- **ComponentObjectState**: 전체 노출 이력, 인지 메트릭, 관계, 마스터리 상태를 단일 추적 가능 엔티티로 집계하는 마스터 인터페이스.

#### 설계 결정사항

**불변 업데이트 함수**: 모든 상태 수정 함수(`recordExposure`, `updateIRTMetrics` 등)는 제자리 변경 대신 새 상태 객체 반환. 시간 여행 디버깅, 실행 취소 기능, 안전한 동시 접근 가능.

**메트릭에 지수 이동 평균 사용**: 정확도 및 성능 메트릭은 alpha=0.1로 EMA 사용, 과거 데이터에 90% 가중치 부여. 개별 응답의 노이즈를 평활화하면서 학습자 능력의 진정한 변화에는 반응성 유지.

**노출 이력 제한**: `exposurePattern` 배열은 마지막 100개 항목만 유지(`.slice(-99)` 통해). 추세 분석을 위한 충분한 이력을 보존하면서 메모리 사용 제한.

**스캐폴딩 갭을 일급 메트릭으로**: 단서 보조와 단서 없는 정확도 간의 차이(`scaffoldingGap`)를 명시적으로 추적. 존재하지만 아직 내재화되지 않은 지식을 드러내기 때문 - 적절한 연습 과제 선택을 위한 핵심 신호.

**제한된 세타 추정치**: IRT 세타 매개변수는 경계 근처에서 수확 체감과 함께 [-3, 3]으로 클램프. 이상치 응답으로 인한 폭주 추정치 방지.

#### 통합 지점

- **`../types`**: 시스템 전반에 걸쳐 값을 표준화하는 `MasteryStage`, `ComponentType`, `TaskModality` 타입 정의 import.

- **`../content/pedagogical-intent`**: 학습 목표(소개, 강화, 평가 등)별로 분류된 정확도 추적에 `PedagogicalIntent` 사용.

- **`../tasks/traditional-task-types`**: 각 노출을 생성한 연습 형식을 기록하기 위해 `TraditionalTaskType` 참조.

- **`./component-search-engine`**: 검색 엔진이 전체 컴포넌트 상태 컬렉션에 걸친 필터링 및 정렬을 가능하게 하기 위해 이 모듈의 타입과 유틸리티 함수 import.

- **FSRS 통합**: `masteryState.fsrsState` 선택적 필드가 Free Spaced Repetition Scheduler 알고리즘에 연결되어, 이 상태가 간격 반복 스케줄링을 구동할 수 있게 함.

- **우선순위 계산**: `calculateEffectivePriority` 함수는 목표 컨텍스트, 복습 긴급성, 자동화 필요성, 전이 가치를 작업 선택 알고리즘이 사용하는 단일 우선순위 점수로 종합.

---

### component-search-engine.ts - 학습 상태 컬렉션을 위한 쿼리 인터페이스

#### 존재 이유

언어 학습자의 상태는 어휘, 문법, 음운론 등에 걸쳐 수천 개의 추적 항목을 포함합니다. 효율적인 쿼리 없이는 시스템이 모든 결정마다 - 다음에 무엇을 복습할지, 어떤 항목이 병목인지, 어떤 개념이 클러스터를 이루는지 - 모든 항목을 스캔해야 합니다. 이 검색 엔진은 풍부한 필터링, 정렬, 그룹화, 그래프 순회 기능과 함께 컴포넌트 상태에 대한 인덱싱된 접근을 제공합니다. 학습자 대면 UI와 내부 스케줄링 알고리즘 모두를 구동하는 사전 뷰, 네트워크 시각화, 우선순위 목록을 지원합니다.

#### 핵심 개념

- **삼중 인덱싱 전략**: 엔진은 세 개의 병렬 인덱스 유지: 기본 `states` Map (objectId에서 상태로), `componentIndex` (언어 컴포넌트에서 objectId 집합으로), `contentIndex` (토큰화된 콘텐츠 단어에서 objectId 집합으로). ID로 O(1) 조회와 컴포넌트 또는 텍스트 검색으로 빠른 범위 축소 가능.

- **SearchFilters(검색 필터)**: 컴포넌트 유형, 텍스트 쿼리, 최소 우선순위, 마스터리 단계, 자동화 수준 범위, 노출 최근성, 복습 상태, 컨텍스트 강조, 도메인 태그, 관계 존재, 전이 가치 임계값을 지원하는 포괄적인 필터 인터페이스.

- **SortOption(정렬 옵션)**: 7가지 정렬 전략 - priority(복합 점수), frequency(코퍼스 일반성), mastery(단계 수준), recency(마지막 노출), alphabetical, automation(절차적 유창성), bottleneck(다른 학습 차단).

- **GroupOption(그룹화 옵션)**: 그룹화된 표시를 위해 카테고리, 도메인, 난이도 계층, 마스터리 단계, 언어 컴포넌트별로 결과 구성.

- **PriorityListItem(우선순위 목록 항목)**: 상태 객체를 계산된 우선순위 점수, 사람이 읽을 수 있는 우선순위 이유, 권장 작업 유형과 함께 래핑 - "다음에 무엇을 공부할지" 인터페이스에 표시할 준비 완료.

- **NetworkGraphView(네트워크 그래프 뷰)**: 학습 항목 간의 관계를 시각화를 위한 노드와 엣지로 표현. 노드는 컴포넌트 유형, 중요도(크기), 마스터리(색상) 인코딩. 엣지는 연어, 형태적 계열, 의미적 유사성, 통사적 패턴, 선행 요건 체인 캡처.

#### 설계 결정사항

**캡슐화된 상태를 가진 클래스 기반 엔진**: `component-object-state.ts`의 순수 함수 접근법과 달리, 검색 엔진은 가변 인덱스 구조를 캡슐화하기 위해 클래스 사용. 엔진이 소스 데이터와 동기화를 유지해야 하는 파생 데이터 구조(인덱스)를 유지하는 서비스 레이어이기 때문에 적절함.

**콘텐츠 검색을 위한 토큰화**: 콘텐츠는 공백으로 분할되고 2자 미만의 토큰은 폐기. 이 단순한 접근법은 전체 텍스트 검색 엔진의 오버헤드 없이 언어 학습 콘텐츠(단어, 짧은 구)에 잘 작동.

**네트워크 그래프 구성을 위한 BFS**: `buildNetworkGraph` 메서드는 중심 객체에서 지정된 깊이까지 관련 항목을 수집하기 위해 너비 우선 탐색 사용. 전체 관계 네트워크를 로드하지 않고 시각화에 적합한 경계가 있고 집중된 서브그래프 생성.

**색상 코딩된 마스터리 단계**: 비공개 `getMasteryColor` 메서드는 단계 0-4를 빨강-주황-노랑-초록-파랑 진행으로 매핑. 네트워크 그래프에서 어떤 영역에 주의가 필요한지에 대한 즉각적인 시각적 피드백 제공.

**편의를 위한 팩토리 함수**: `createSearchEngine()`과 `createSearchEngineWithData()`는 빈 초기화와 대량 로딩 시나리오 모두를 지원하는 깔끔한 인스턴스화 패턴 제공.

**성능 타이밍**: 검색 결과에 밀리초 단위의 `searchDuration` 포함, 성능 모니터링 및 최적화 결정 가능.

#### 통합 지점

- **`./component-object-state`**: 필터링 및 정렬 로직을 구동하기 위해 `ComponentObjectState` 타입과 유틸리티 함수(`needsReview`, `isAutomized`, `getBottleneckScore`, `calculateEffectivePriority`) import.

- **`../types`**: 타입 안전 단계 필터링을 위해 `MasteryStage` 사용.

- **UI 컴포넌트**: `SearchResult`, `GroupedSearchResult`, `NetworkGraphView` 타입은 사전 뷰, 그룹화된 목록, 힘 기반 그래프를 렌더링하는 React 컴포넌트가 직접 소비할 수 있는 DTO(Data Transfer Objects)로 설계.

- **작업 선택 알고리즘**: `generatePriorityList` 메서드는 우선순위 점수와 함께 작업 권장 사항을 반환하여, 상태 쿼리를 작업 생성 파이프라인에 연결.

- **통계 집계**: `getStatistics` 메서드는 대시보드용 메트릭 제공: 총 객체 수, 컴포넌트별 수, 마스터리 단계별 수, 복습이 필요한 항목, 아직 자동화되지 않은 항목.
