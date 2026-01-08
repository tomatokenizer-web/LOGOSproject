# LOGOS 핵심 동적 모듈 (Core Dynamic Modules)

> **최종 업데이트**: 2026-01-06
> **상태**: Active

이 문서는 LOGOS의 핵심 동적 모듈 3개에 대한 한국어 번역입니다.

---

## 동적 코퍼스 소싱 모듈 (Dynamic Corpus Sourcing Module)

> **코드 위치**: `src/core/dynamic-corpus.ts`

---

### 맥락 및 목적 (Context & Purpose)

이 모듈은 정적 어휘 목록과 실제 언어 사용의 풍부하고 살아있는 세계 사이의 격차를 해소하기 위해 존재합니다. 언어 학습 애플리케이션은 전통적으로 미리 패키지된 단어 목록을 제공하지만, 언어 자체는 도메인, 레지스터, 문맥에 걸쳐 끊임없이 진화합니다. 동적 코퍼스 모듈은 LOGOS가 런타임에 외부 코퍼스 API를 활용하여 학습자의 특정 목표에 맞는 어휘를 추출할 수 있게 함으로써 이 근본적인 한계를 해결합니다.

**비즈니스/사용자 요구사항**: CELBAN 시험을 준비하는 간호사는 일반적인 단어 목록이 아닌 실제 의료 문서에 등장하는 의학 용어가 필요합니다. 이민법 실무를 공부하는 변호사는 이민법 맥락에서 실제 빈도에 따라 가중치가 부여된 법률 어휘가 필요합니다. 이 모듈은 LOGOS가 정적 데이터에만 의존하지 않고 도메인 관련 어휘를 동적으로 소싱하여 전문 학습자를 지원할 수 있게 합니다.

**사용 시점**:
- 새 학습 목표가 생성될 때 (초기 어휘 채우기)
- 사용자가 특정 도메인이나 맥락에 대한 어휘를 요청할 때
- 시스템이 기존 어휘를 코퍼스 검증 항목으로 보충해야 할 때
- 메인 코퍼스 파이프라인 서비스가 API 실패를 겪을 때 폴백(fallback) 데이터 소스로

---

### 학술적 기반 (Academic Foundations)

#### 코퍼스 언어학 원리 (Corpus Linguistics Principles)

이 모듈은 확립된 코퍼스 언어학 연구에 기반하며, 다음의 원리들을 구현합니다:

**COCA (Corpus of Contemporary American English)**: 무료로 이용 가능한 가장 큰 미국 영어 코퍼스(10억 단어 이상)로, COCA는 구어, 소설, 대중 잡지, 신문, 학술 텍스트의 다섯 장르에 걸친 빈도 데이터를 제공합니다. 이 모듈의 설계는 COCA의 장르 인식 접근 방식을 반영하여 어휘 추출을 도메인 맥락별로 필터링할 수 있습니다.

**OPUS 병렬 코퍼스 (OPUS Parallel Corpus)**: 다국어 병렬 코퍼스 프로젝트인 OPUS는 여러 언어에 걸쳐 정렬된 텍스트를 제공합니다. 이 모듈의 다국어 지원과 교차 언어 분석은 OPUS의 아키텍처에서 영감을 받았습니다.

**Sinclair의 코퍼스 언어학 (1991)**: John Sinclair의 기초적인 연구는 어휘 선택이 직관이 아닌 실제 사용 패턴에 기반한 *원칙적*이어야 한다고 확립했습니다. 이 모듈은 임의의 단어 목록 대신 빈도 가중치, 도메인 관련 어휘를 우선시함으로써 이를 구현합니다.

**연어 분석 (Collocation Analysis)**: `CollocationData` 타입과 연어 추출은 Church & Hanks (1990)가 개척하고 후속 코퍼스 언어학 연구에서 정제된 상호 정보(Mutual Information, MI) 및 t-점수와 같은 메트릭을 사용하여 단어 연관 강도를 측정하는 전통을 따릅니다.

---

### 마이크로스케일: 직접 관계 (Microscale: Direct Relationships)

#### 의존성 (Dependencies - 이 모듈이 필요로 하는 것)

이 모듈은 **순수(pure)**하게 설계되었습니다 (코어 레이어 내 외부 의존성 없음). 서비스 레이어가 구현하는 인터페이스를 정의합니다:

- **코어 내 없음**: 코어 모듈로서 순수 함수와 타입 정의만 포함합니다. 모든 I/O 작업은 소비자가 처리합니다.

#### 의존 모듈 (Dependents - 이 모듈을 필요로 하는 것)

- `src/main/services/corpus-sources/corpus-pipeline.service.ts`: 여러 소스에 걸쳐 어휘 채우기를 조정하기 위해 이러한 타입과 함수를 사용하는 메인 오케스트레이션 서비스
- `src/main/services/corpus-sources/registry.ts`: 추가 소스 타입과 접근 방법으로 `CorpusSource` 개념을 확장
- `src/main/services/corpus-sources/filter.ts`: 목표에 적합한 소스를 필터링하기 위해 도메인 및 모달리티 정보 사용
- `src/main/services/pmi.service.ts`: PMI (점별 상호 정보, Pointwise Mutual Information) 점수와 연어를 계산하기 위해 `ExtractedItem` 데이터 소비
- `src/core/priority.ts`: 학습 우선순위 점수를 계산하기 위해 추출된 항목의 빈도 및 도메인 관련성 데이터 사용
- `src/core/types.ts`: `LanguageObject` 타입은 `corpusItemToLanguageObject()` 변환 함수를 통해 `ExtractedItem`과 정렬됨

#### 데이터 흐름 (Data Flow)

```
사용자가 학습 목표 생성
    |
    v
목표 사양 (도메인, 모달리티, 벤치마크)
    |
    v
[queryCorpus] --> 캐시 확인 --> 캐시되어 있으면 즉시 반환
    |                                   |
    | (캐시 미스)                       |
    v                                   |
[getAvailableSources] --> 도메인/언어별 소스 필터링
    |
    v
[querySource] --> 소스 타입별 디스패치 (API/임베디드/파일)
    |
    +--> API 소스: [queryAPISource] --> HTTP 요청 --> 응답 파싱
    |
    +--> 임베디드 소스: [queryEmbeddedCorpus] --> 정적 데이터 필터링
    |
    v
[CorpusResult] with ExtractedItems
    |
    v
결과 캐시 --> 호출자에게 반환
    |
    v
[corpusItemToLanguageObject] --> LOGOS 내부 형식으로 변환
    |
    v
corpus-pipeline.service를 통해 데이터베이스에 저장
```

---

### 매크로스케일: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어 (Architectural Layer)

이 모듈은 LOGOS의 3계층 아키텍처에서 **코어 레이어**에 위치합니다:

- **레이어 1 (렌더러)**: UI 컴포넌트가 어휘와 학습 콘텐츠 표시
- **레이어 2 (코어)**: **이 모듈** - 코퍼스 상호작용을 위한 순수 알고리즘과 타입 정의
- **레이어 3 (메인/서비스)**: `corpus-pipeline.service.ts`가 실제 API 호출과 데이터베이스 작업을 오케스트레이션

이 모듈은 LOGOS의 엄격한 관심사 분리를 따릅니다: 코어 모듈은 부작용이나 I/O가 없는 순수 함수만 포함합니다. 실제 API 호출, 캐싱 지속성, 데이터베이스 쓰기는 서비스 레이어에 위임됩니다.

#### 전체 그림 영향 (Big Picture Impact)

**어휘 채우기 파이프라인**: 이 모듈은 LOGOS가 어휘를 이해하고 소싱하는 방법의 **개념적 기반**입니다. 이 모듈이 없으면 LOGOS는 개별 학습자 목표에 적응할 수 없는 정적이고 미리 패키지된 단어 목록으로 제한됩니다.

**도메인별 학습**: 이 모듈은 어휘를 도메인(의료, 법률, 기술)별로 적절한 빈도와 난이도 가중치와 함께 필터링할 수 있게 하여 전문직 언어 학습자(간호사, 변호사, 엔지니어)를 위한 LOGOS의 핵심 가치 제안을 가능하게 합니다.

**우아한 성능 저하 (Graceful Degradation)**: 임베디드 어휘 폴백(`EMBEDDED_VOCABULARY` 상수)은 외부 API를 사용할 수 없을 때도 시스템이 빈 결과를 반환하지 않도록 보장합니다. 이것은 오프라인 사용과 API 속도 제한 시나리오에 중요합니다.

---

### 주요 타입 설명 (Key Types Explained)

#### CorpusSource

**기술적**: 연결 세부 정보, 지원되는 도메인/언어, 속도 제한, 가용성 상태를 포함한 외부 코퍼스 제공자의 구성을 정의하는 인터페이스.

**쉬운 설명**: 어휘 소스의 "주소 카드"라고 생각하세요. 다른 도서관에 대한 연락처 정보(운영 시간, 위치, 보유 도서)가 있듯이, `CorpusSource`는 어휘 제공자에게 연락하는 방법, 지원하는 언어와 도메인, 현재 이용 가능한지 여부를 설명합니다.

**사용 이유**: LOGOS는 여러 어휘 소스(COCA, OPUS, 임베디드 데이터)를 쿼리하고 각 학습 목표에 가장 적합한 것을 선택해야 합니다. 이 타입은 소스를 설명하고 비교하는 방법을 표준화합니다.

```typescript
interface CorpusSource {
  id: string;                    // 고유 식별자 ("coca", "opus", "embedded_medical")
  name: string;                  // 사람이 읽을 수 있는 이름 ("Corpus of Contemporary American English")
  type: 'api' | 'file' | 'embedded';  // 접근 방법
  baseUrl?: string;              // API 소스용
  domains: string[];             // 다루는 주제
  languages: string[];           // 지원하는 언어
  rateLimit?: number;            // API 스로틀링 (분당 요청)
  isAvailable: boolean;          // 현재 작동 중?
  requiresAuth: boolean;         // API 키 필요?
  priority: number;              // 높을수록 여러 개가 매칭될 때 선호됨
}
```

#### CorpusQuery

**기술적**: 도메인, 난이도 범위, 대상 개수, 언어, 품사 필터, 제외 목록을 포함한 어휘 추출 기준을 지정하는 구조화된 쿼리 객체.

**쉬운 설명**: 어휘를 위한 "쇼핑 목록"입니다. 사전을 무작위로 돌아다니는 대신, 정확히 무엇이 필요한지 지정합니다: "이미 알고 있는 단어를 제외하고, 내 수준에 너무 어렵지 않은, 영어로 된 의료 명사와 동사 50개를 주세요."

**사용 이유**: 구조화된 쿼리는 일관되고 재현 가능한 어휘 추출을 가능하게 하며 캐싱을 지원합니다(동일한 쿼리는 캐시된 결과를 반환).

```typescript
interface CorpusQuery {
  domain: string;              // 대상 주제 영역 ("medical", "legal")
  genre?: string;              // 선택적 하위 카테고리 ("nursing", "contracts")
  minFrequency?: number;       // 고빈도 단어만 (0-1 스케일)
  maxDifficulty?: number;      // 복잡성 상한
  targetCount: number;         // 반환할 항목 수
  language: string;            // 대상 언어 코드
  posFilter?: string[];        // 품사 필터 (["noun", "verb"])
  excludeIds?: string[];       // 이미 알려진 항목 건너뛰기
  keywords?: string[];         // 필터링을 위한 검색어
}
```

#### ExtractedItem

**기술적**: 빈도 통계, 도메인 관련성 점수, 사용 맥락, 연어 데이터로 강화된 코퍼스 소스에서 추출된 어휘 항목.

**쉬운 설명**: 검색에서 돌아오는 "어휘 카드"입니다. 단어 자체만이 아니라 우리가 알아낸 모든 유용한 정보: 얼마나 흔한지, 도메인에 얼마나 관련 있는지, 맥락에서 보여주는 예문, 자주 함께 나타나는 단어들.

**사용 이유**: 원시 단어만으로는 효과적인 언어 학습에 충분하지 않습니다. LOGOS는 우선순위 계산을 위한 빈도 데이터, 작업 생성을 위한 맥락, 관계 매핑을 위한 연어가 필요합니다.

```typescript
interface ExtractedItem {
  content: string;             // 단어 또는 구문 자체
  frequency: number;           // 얼마나 흔한지 (0=희귀, 1=매우 흔함)
  domainRelevance: number;     // 도메인에 얼마나 특화됐는지 (0-1)
  domain: string;              // 어떤 도메인에서 왔는지
  pos?: string;                // 품사 (명사, 동사 등)
  contexts: string[];          // 예문
  collocations: CollocationData[];  // 함께 나타나는 단어들
  estimatedDifficulty: number; // 학습 난이도 추정 (0-1)
  sourceId: string;            // 어떤 코퍼스가 제공했는지
  rawFrequency?: number;       // 절대 빈도수 (가능한 경우)
}
```

#### CorpusResult

**기술적**: 소스 메타데이터, 추출된 항목, 쿼리 성능 통계를 포함한 코퍼스 쿼리의 완전한 결과 패키지.

**쉬운 설명**: 어휘 주문에 대한 "영수증"입니다. 어떤 소스가 요청을 처리했는지, 어떤 항목을 받았는지, 얼마나 걸렸는지, 결과가 캐시에서 왔는지(빠름) 새 쿼리에서 왔는지(느림)를 알려줍니다.

**사용 이유**: 어휘 항목 자체 외에도 디버깅, 캐시 관리, 소스 품질 평가를 위한 메타데이터가 필요합니다.

```typescript
interface CorpusResult {
  source: CorpusSource;        // 어떤 소스가 제공했는지
  items: ExtractedItem[];      // 어휘 항목들
  metadata: {
    queryTime: number;         // 쿼리에 걸린 시간 (ms)
    totalAvailable: number;    // 필터링 전 전체 항목
    domainCoverage: number;    // 도메인을 얼마나 잘 커버했는지 (0-1)
    fromCache: boolean;        // 캐시 히트였나?
    cacheExpiry?: Date;        // 캐시 만료 시점
  };
}
```

---

### 핵심 함수 설명 (Core Functions Explained)

#### queryCorpus

**기술적**: 코퍼스 쿼리의 주요 진입점. 우선순위에 따라 정렬된 여러 소스를 통한 폴백과 함께 캐시 우선 검색을 구현합니다.

**쉬운 설명**: 모든 어휘 요청을 처리하는 "프론트 데스크" 함수입니다. 먼저 최근에 이 정확한 질문에 답했는지 확인합니다(캐시). 그렇지 않으면 기준에 맞는 어휘를 찾을 때까지 선호도 순서대로 사용 가능한 소스를 순회합니다.

**동작**:
1. 동일한 쿼리에 대한 캐시 확인
2. 캐시 미스 시 도메인에 사용 가능한 소스 식별
3. targetCount에 도달할 때까지 우선순위 순서로 소스 쿼리
4. 성공적인 결과 캐시
5. 모든 소스가 실패하면 임베디드 어휘로 폴백

#### extractDomainVocabulary

**기술적**: 학습자의 현재 능력 수준(theta)에 적합한 어휘를 추출하고, 난이도 필터링과 선택적 연어 집중을 적용하는 상위 수준 함수.

**쉬운 설명**: 당신의 학습 수준을 알고 있는 "개인화된 쇼핑 도우미"입니다. 그냥 아무 의료 어휘를 얻는 대신, 현재 능력 추정치에 기반하여 *당신에게* 특별히 적절하게 도전적인 의료 어휘를 얻습니다.

**사용 이유**: 원시 코퍼스 데이터와 교육적으로 적절한 콘텐츠 사이의 격차를 난이도 필터링과 소스 간 중복 제거로 연결합니다.

#### getDomainVocabularyStats

**기술적**: 빈도 분포, 평균 단어 길이, 전문 용어 비율을 포함한 도메인의 어휘 프로필에 대한 집계 통계를 계산합니다.

**쉬운 설명**: 도메인에 대한 "재고 보고서"입니다. 얼마나 많은 어휘가 있는지, 빈도별로 어떻게 분포되어 있는지(흔한 단어가 많은지? 희귀한 전문 용어가 많은지?), 전체적으로 도메인이 얼마나 "전문화"되어 있는지 알려줍니다.

**사용 이유**: 갭 분석(학습자가 도메인의 몇 퍼센트를 알고 있는지?)을 가능하게 하고 학습 목표 보정에 도움이 됩니다.

---

### 캐싱 전략 (Caching Strategy)

#### 인메모리 캐시 (In-Memory Cache)

모듈은 `CorpusCache` 클래스를 통해 간단하지만 효과적인 인메모리 캐시를 구현합니다:

**TTL (Time-To-Live)**: 기본 1시간 (`DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000`)

**쉬운 설명**: 특정 쿼리에 대한 어휘를 가져오면 1시간 동안 답을 기억합니다. 그 시간 내에 같은 질문을 하면 외부 API를 다시 쿼리하는 대신 저장된 답을 즉시 제공합니다.

**최대 크기**: 100개 항목 (`MAX_CACHE_SIZE = 100`)

**쉬운 설명**: 마지막 100개 쿼리만 기억합니다. 이것은 메모리가 무한정 커지는 것을 방지합니다. 공간이 부족하면 가장 오래된 캐시된 답을 버립니다.

**퇴거 정책**: 가장 오래된 것 먼저 (FIFO)

**쿼리 해싱**: 쿼리는 캐시 키 생성을 위해 JSON으로 직렬화됩니다. 의미적으로 관련된 필드만 해시됩니다(domain, genre, minFrequency, maxDifficulty, targetCount, language, posFilter, keywords).

#### 캐싱이 중요한 이유

외부 코퍼스 API는 속도 제한이 있습니다(예: OPUS: 분당 60 요청). 캐싱이 없으면:
- 같은 도메인에 대한 반복적인 목표 생성이 API를 과부하시킴
- UI 새로고침이 중복 쿼리를 트리거할 수 있음
- 속도 제한 소진이 사용자 경험을 저하시킴

캐싱으로:
- 동일한 쿼리는 메모리에서 즉시 반환
- API 할당량이 진정으로 새로운 쿼리를 위해 보존됨
- 과부하 사용 중에도 시스템이 반응성을 유지

---

### 폴백 메커니즘 (Fallback Mechanisms)

#### 폴백 체인

모듈은 강력한 폴백 전략을 구현합니다:

1. **기본**: 외부 API 소스 (COCA, BNC, OPUS)
2. **보조**: 임베디드 어휘 데이터 (`EMBEDDED_VOCABULARY`)
3. **3차**: 일반 범용 어휘 (도메인별 임베디드 데이터가 없는 경우)

#### 임베디드 어휘

`EMBEDDED_VOCABULARY` 상수는 주요 도메인에 대한 큐레이션된 어휘를 포함합니다:

- **의료 (Medical)**: diagnosis, prognosis, symptom, administer, contraindication 등
- **비즈니스 (Business)**: leverage, stakeholder, synergy, benchmark, scalable
- **학술 (Academic)**: hypothesis, methodology, empirical, paradigm, discourse
- **법률 (Legal)**: jurisdiction, plaintiff, liability, stipulate
- **일반 (General)**: significant, establish, fundamental

**쉬운 설명**: 임베디드 어휘를 LOGOS와 함께 제공되는 "비상 백업 사전"으로 생각하세요. 인터넷이 다운되거나 모든 API가 고장나도 학습자는 여전히 필수 도메인 어휘에 접근할 수 있습니다.

---

### 변환 함수: corpusItemToLanguageObject

이 함수는 코퍼스 데이터를 LOGOS의 내부 데이터 모델로 연결합니다.

**하는 일**:
- `ExtractedItem` (코퍼스 형식)을 `LanguageObject` (LOGOS 형식)으로 변환
- 연어 강도에서 관계 밀도 계산
- 0-1 난이도를 IRT 스케일 (-3에서 +3)로 변환
- 빈도, 도메인 관련성, 난이도에서 우선순위 점수 계산

**쉬운 설명**: 코퍼스 데이터는 빈도 백분율과 도메인 점수를 가진 "원시" 형식으로 들어옵니다. LOGOS의 학습 알고리즘은 IRT 난이도 매개변수와 우선순위 점수를 가진 특정 형식의 데이터가 필요합니다. 이 함수는 두 형식 간의 "번역가"입니다.

**변환 세부사항**:

| 코퍼스 필드 | LOGOS 필드 | 변환 |
|--------------|-------------|----------------|
| `estimatedDifficulty` | `irtDifficulty` | `(difficulty - 0.5) * 6`으로 0-1을 -3에서 +3으로 매핑 |
| `collocations[].strength` | `relationalDensity` | 강도 합계 / 5, 1.0에서 상한 |
| `domainRelevance` | `contextualContribution` | 직접 매핑 |
| 결합 | `priority` | `F * 0.4 + R * 0.4 + (1-D) * 0.2` |

---

## 다중 커리큘럼 관리 모듈 (Multi-Curriculum Management Module)

> **코드 위치**: `src/core/multi-curriculum.ts`

---

### 맥락 및 목적 (Context & Purpose)

이 모듈은 적응형 학습의 근본적인 문제를 해결합니다: **효율성을 희생하지 않고 여러 학습 목표를 동시에 추구하도록 어떻게 도울 것인가?** CELBAN 인증을 공부하는 간호사는 병원 행정을 위한 비즈니스 영어와 계속 교육을 위한 학술 영어도 필요할 수 있습니다. 전통적인 학습 시스템은 사용자가 한 번에 하나의 목표만 선택하도록 강제하지만, 실제 학습자는 서로 다른 마감일과 우선순위를 가진 여러 목표를 동시에 다룹니다.

다중 커리큘럼 모듈은 경쟁하는 학습 목표를 관리하기 위해 **파레토 최적 자원 배분(Pareto-optimal resource allocation)**을 구현합니다. 임의로 시간을 나누는 대신, 경제학과 운영 연구의 최적화 기법을 사용하여 다른 목표를 해치지 않고는 어떤 목표도 개선할 수 없는 배분을 찾습니다.

**비즈니스 요구사항**: LOGOS는 복잡하고 다면적인 언어 학습 요구를 가진 의료 전문가를 대상으로 합니다. 학습자가 다음을 필요로 할 때 단일 "의료 영어" 커리큘럼은 충분하지 않습니다:
- 임상 의사소통 기술 (긴급, 인증 마감일)
- 환자 문서 작성 (지속적인 직업적 필요)
- 연구를 위한 학술 읽기 (장기 경력 개발)

이 모듈은 마감일, 우선순위, 목표 간 시너지를 존중하는 지능적인 시간 배분으로 모든 목표를 동시에 추구할 수 있게 합니다.

**사용 시점**:
- 활성 학습 목표에 걸쳐 시간을 배분하기 위한 세션 계획 중
- 여러 커리큘럼에 도움이 되는 공유 어휘/객체의 우선순위를 정할 때
- 목표가 일정에 뒤처질 때 진행 추적 및 재조정을 위해
- 관련 학습 도메인 간 전이 혜택을 계산할 때

---

### 마이크로스케일: 직접 관계 (Microscale: Direct Relationships)

#### 의존성 (Dependencies)

이 모듈은 다른 LOGOS 모듈에서 직접 임포트 없이 **순수 알고리즘 모듈**로 설계되었습니다. 이 격리는 다음을 보장합니다:
- 관심사의 깨끗한 분리 (최적화 로직 vs. 데이터 접근)
- 데이터베이스나 서비스 의존성 없이 테스트 가능
- 다른 맥락에서의 잠재적 사용을 위한 이식성

**내부 상수**: 모듈은 자체 최적화 매개변수를 정의합니다:
- `MIN_ALLOCATION = 0.05`: 모든 활성 목표가 세션 시간의 최소 5%를 받도록 보장 (목표 방치 방지)
- `MAX_ALLOCATION = 0.8`: 단일 목표를 80%로 상한 (다양화 보장)
- `PARETO_SAMPLES = 20`: 프론티어 계산을 위한 무작위 배분 샘플 수
- `SYNERGY_MULTIPLIER = 1.5`: 목표 간 공유되는 학습 객체에 대한 보너스 계수
- `DOMAIN_SIMILARITY`: 도메인 쌍 간 유사도 점수 매트릭스 (medical-healthcare: 0.8, medical-science: 0.5 등)

#### 의존 모듈 (Dependents)

- `src/main/services/session-planning.service.ts` (예상): 여러 커리큘럼의 균형을 맞추는 세션 계획 생성을 위해 `planMultiGoalSession()` 사용
- `src/main/services/goal-management.service.ts` (예상): `createCurriculumGoal()`, `updateGoalFromSession()`, 진행 추적 함수 사용
- `src/renderer/components/goal/MultiGoalDashboard.tsx` (예상): 목표 균형 및 주의 경고 시각화를 위해 `MultiGoalProgress` 소비
- `src/main/ipc/curriculum.ipc.ts` (예상): 렌더러 프로세스에 다중 커리큘럼 함수 노출

#### 데이터 흐름 (Data Flow)

```
사용자가 목표 정의 (targetTheta, deadline, weight)
    |
    v
createCurriculumGoal() --> CurriculumGoal 객체들
    |
    v
computeParetoFrontier(goals, availableMinutes)
    |
    v
배분 샘플 생성 --> 각각 평가 --> 지배되는 솔루션 표시
    |
    v
selectParetoOptimalAllocation(frontier, preference)
    |
    v
planMultiGoalSession() --> MultiGoalSessionPlan
    |                        (시간 배분, 객체 순서)
    v
세션 실행 --> updateGoalFromSession() --> 업데이트된 목표
    |
    v
calculateMultiGoalProgress() --> attentionNeeded 경고
    |
    v
balanceGoalProgress() --> 재조정 권장사항
```

---

### 매크로스케일: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어 (Architectural Layer)

이 모듈은 IRT, FSRS, Priority 모듈과 함께 **코어 알고리즘 레이어**에 위치합니다:

```
레이어 1: 렌더러 (React UI)
    |
    v
레이어 2: 메인 프로세스 (IPC 핸들러, 서비스)
    |
    v
레이어 3: 코어 알고리즘 <-- 여기 있습니다 (src/core/multi-curriculum.ts)
    |       |
    |       +-- irt.ts (능력 추정)
    |       +-- fsrs.ts (간격 반복)
    |       +-- priority.ts (항목 순서)
    |       +-- transfer.ts (L1-L2 효과)
    |       +-- multi-curriculum.ts (목표 관리) <-- 신규
    |
    v
레이어 4: 데이터베이스 (Prisma/SQLite)
```

#### 전체 그림 영향 (Big Picture Impact)

다중 커리큘럼 모듈은 단일 트랙에서 포트폴리오 기반 학습으로의 **패러다임 전환**을 나타냅니다. 이 아키텍처 추가는 다음을 가능하게 합니다:

1. **목표 포트폴리오 관리**: 사용자가 여러 동시 학습 목표를 정의, 추적, 균형 맞출 수 있음
2. **시너지 활용**: 목표 간 공유 어휘(예: "diagnosis"가 의료와 학술 커리큘럼 모두에 등장)가 식별되고 최대 효율성을 위해 우선순위가 매겨짐
3. **마감일 인식 배분**: 마감이 다가오는 목표는 자동으로 더 많은 관심을 받음
4. **전이 극대화**: 한 목표의 진행이 지식 전이를 통해 관련 목표를 향상시킬 수 있음

---

### 주요 타입 설명 (Key Types Explained)

#### CurriculumGoal

**기술적**: 심리측정 매개변수(`targetTheta`, `currentTheta`), 스케줄링 메타데이터(`deadline`, `weight`), 도메인 맥락을 가진 학습 목표의 구조화된 표현.

**쉬운 설명**: CurriculumGoal을 명확한 목표선을 가진 "학습 프로젝트"로 생각하세요. 알고 있는 것:
- 어디로 가려는지 (targetTheta: 원하는 숙련도 수준)
- 지금 어디에 있는지 (currentTheta: 현재 숙련도)
- 언제까지 완료해야 하는지 (deadline: 인증 시험 날짜 같은)
- 이것이 얼마나 중요한지 (weight: 목표들 중 0-1 우선순위)
- 어떤 종류의 지식인지 (domain: 의료, 법률, 비즈니스 등)

#### ParetoSolution

**기술적**: 어떤 목표의 예상 진행을 개선하면 필연적으로 다른 목표의 진행을 줄이게 되는 비지배 솔루션을 나타내는 배분 공간의 점. 합이 1.0이 되는 배분 분율과 효율성/위험 메트릭 포함.

**쉬운 설명**: 60분 학습 세션과 세 가지 목표가 있다고 상상해 보세요. ParetoSolution은 그 시간을 나누는 하나의 특정 방법입니다(예: 목표 A에 30분, B에 20분, C에 10분). 이것이 특별한 이유는 **효율적**이기 때문입니다 - 모든 목표를 동시에 더 좋게 만드는 다른 분배는 없습니다. 목표 B에 더 많은 시간을 줄 수 있지만, A나 C에서 빼야만 합니다. 파레토 프론티어는 이러한 "모든 것을 한 번에 개선할 수 없는" 솔루션들의 집합입니다.

#### SharedObject

**기술적**: 여러 커리큘럼에 나타나는 학습 객체(어휘 단어, 문법 패턴 등)로, 다중 목표 관련성에 기반한 계산된 시너지 보너스를 가짐.

**쉬운 설명**: 일부 어휘 항목은 "멀티태스커"입니다 - "diagnosis" 단어를 배우면 의료 영어 AND 학술 읽기 AND 전문 문서 작성에 도움이 됩니다. SharedObjects는 이러한 고가치 항목을 추적하고 **시너지 보너스**를 계산합니다 - 본질적으로 "이 단어를 한 번 배우면 세 곳에서 도움이 되므로 추가 가치가 있다"고 말합니다.

#### MultiGoalSessionPlan

**기술적**: 목표별 시간 배분, 공유 객체 우선순위가 매겨진 순서화된 객체 시퀀스, 예상 결과 예측을 포함하는 완전한 세션 사양.

**쉬운 설명**: 이것은 단일 세션을 위한 "학습 일정"입니다. 알려주는 것:
- 각 목표에 얼마나 많은 시간을 쓸지 (goalTimeAllocation)
- 어떤 특정 항목을 어떤 순서로 연습할지 (objectSequence)
- 어떤 항목이 여러 목표에 도움이 되는 "보너스" 항목인지 (prioritizedSharedObjects)
- 끝날 때 어떤 진행을 기대할 수 있는지 (expectedOutcomes)

---

### 핵심 함수와 관계 (Core Functions and Their Relationships)

#### 파레토 최적화 파이프라인

```
computeParetoFrontier()
    |
    +-- generateRandomAllocation() ----+
    +-- generateEqualAllocation() -----+--> evaluateAllocation()
    +-- generateDeadlineWeightedAllocation() --+--> ParetoSolution[]
    +-- generateProgressWeightedAllocation() --+
    |
    v
markDominatedSolutions() --> 지배되는 솔루션 필터링
    |
    v
selectParetoOptimalAllocation(frontier, preference)
    |
    +-- selectMostBalanced() ----+
    +-- selectLowestRisk() ------+--> 단일 최적 ParetoSolution
    +-- selectMaxProgress() -----+
    +-- selectMaxEfficiency() ---+
    +-- selectByCustomWeights() -+
```

**computeParetoFrontier()**: 최적화의 핵심. 여러 후보 배분(무작위 샘플 + 등분할, 마감일 가중, 진행 가중 같은 전략적 배분)을 생성하고, 각각의 예상 진행을 평가하며, 지배되는 솔루션을 표시하여 파레토 프론티어를 식별합니다.

**selectParetoOptimalAllocation()**: 사용자 선호에 따라 프론티어에서 하나의 솔루션을 선택:
- `balanced`: 목표 간 진행 분산 최소화
- `deadline_focused`: 마감 놓칠 위험 최소화
- `progress_focused`: 균형에 관계없이 총 진행 최대화
- `synergy_focused`: 공유 객체를 통한 효율성 최대화
- `custom`: 사용자 정의 가중치 적용

---

### 학술적 기반 (Academic Foundations)

#### 파레토 최적화 (다목적 최적화)

**기술적**: 이탈리아 경제학자 Vilfredo Pareto의 이름을 딴 파레토 최적성은 다른 목표를 악화시키지 않고는 어떤 목표도 개선할 수 없는 상태를 정의합니다. 파레토 프론티어(또는 파레토 전선)는 다목적 최적화 문제에서 모든 비지배 솔루션의 집합입니다.

**쉬운 설명**: 휴대폰을 선택한다고 상상해 보세요 - 일부는 카메라가 더 좋고, 일부는 배터리 수명이 더 좋고, 일부는 가격이 더 좋습니다. 휴대폰이 "파레토 최적"이라면 세 가지 범주 모두에서 더 나은 다른 휴대폰이 없습니다. "프론티어"는 이러한 "모든 면에서 이길 수 없는" 옵션들의 집합입니다. 학습에서 우리의 목표는 각 목표의 진행이며, 한 목표를 해치지 않고 다른 목표를 개선할 수 없는 효율적인 배분을 원합니다.

**사용 이유**: 다중 목표 학습은 본질적으로 다목적 문제입니다. 단순히 "모든 것을 최대화"할 수 없습니다 - 목표 A에 더 많은 시간은 목표 B에 더 적은 시간을 의미합니다. 파레토 최적화는 트레이드오프를 탐색하고 효율적인 배분을 선택하는 원칙적인 방법을 제공합니다.

**학술 참조**: Miettinen, K. (1999). *Nonlinear Multiobjective Optimization*. Springer.

#### 커리큘럼 학습 (Curriculum Learning)

**기술적**: 훈련 예제가 무작위가 아닌 의미 있는 순서(일반적으로 쉬운 것에서 어려운 것으로)로 제시되어 학습 효율성과 최종 성능을 개선하는 기계 학습 패러다임.

**쉬운 설명**: 선생님이 산술 전에 미적분을 던지지 않듯이, 커리큘럼 학습은 전략적 순서로 자료를 제시합니다. LOGOS의 다중 커리큘럼 모듈은 이를 인터리브되고 균형 잡혀야 하는 **여러 병렬 커리큘럼**으로 확장합니다.

**학술 참조**: Narvekar, S., Peng, B., Leonetti, M., Sinapov, J., Taylor, M. E., & Stone, P. (2020). Curriculum Learning for Reinforcement Learning Domains: A Framework and Survey. *Journal of Machine Learning Research*, 21(181), 1-50.

#### 학습 곡선 이론 (Learning Curve Theory)

**기술적**: 성능이 연습의 함수로 어떻게 개선되는지 설명하는 모델로, 일반적으로 거듭제곱 법칙(performance = k * practice^a)이나 오류율의 지수 감소를 따릅니다.

**쉬운 설명**: 연습할수록 잘해집니다 - 하지만 선형적으로가 아닙니다. 초기 연습은 큰 향상을 주고, 나중 연습은 더 작은 개선을 줍니다. `estimateProgressRate()` 함수는 제곱근 모델을 사용합니다: `progress = baseRate * sqrt(minutes)`, 수확 체감을 포착합니다.

---

### 기술 개념 (쉬운 설명) (Technical Concepts - Plain English)

#### 파레토 프론티어 (Pareto Frontier)

**쉬운 설명**: 휴가를 계획하면서 비용, 기간, 목적지 품질을 고려한다면, 파레토 프론티어는 다른 요소를 희생하지 않고는 한 요소를 개선할 수 없는 모든 여행입니다. 평범한 곳으로 가는 저렴하고 짧은 여행이 프론티어에 있을 수 있고; 놀라운 곳으로 가는 비싸고 긴 여행도 있을 수 있습니다. 각각이 어떤 면에서는 더 낫기 때문에 어느 쪽도 다른 쪽을 "지배"하지 않습니다.

#### 시너지 보너스 (Synergy Bonus)

**기술적**: 여러 커리큘럼에 나타나는 학습 객체에 적용되는 추가 혜택 계수로, 단일 노출 다중 목표 진행의 곱셈 가치를 반영합니다.

**쉬운 설명**: "prescription" 단어를 한 번 배우면 의료 커뮤니케이션, 환자 문서 작성, AND 약국 어휘에 도움이 됩니다. 세 가지 목표를 위해 세 번 배우는 대신 한 번 배웁니다. 시너지 보너스(추가 목표당 1.5배 배수)는 이 효율성 이득을 포착합니다.

#### 전이 계수 (Transfer Coefficient)

**기술적**: 공유 콘텐츠와 도메인 유사성에 기반하여 한 학습 목표의 진행이 다른 목표에 도움이 되는 정도를 나타내는 0과 1 사이의 값.

**쉬운 설명**: 의료 영어와 비즈니스 영어를 배우고 있다면, 일부 어휘를 공유합니다("appointment", "schedule", "report"). 한쪽의 진행이 부분적으로 다른 쪽에 도움이 됩니다. 전이 계수는 얼마나 도움이 되는지 측정합니다: 0은 도움 없음, 1은 완벽한 중복.

#### 마감일 위험 점수 (Deadline Risk Score)

**기술적**: 현재 진행 속도가 주어졌을 때 목표가 마감일을 놓칠 확률을 나타내는 0과 1 사이의 시그모이드 매핑된 값으로, `1 / (1 + e^(-2*(requiredRate/baselineRate - 1)))`로 계산됩니다.

**쉬운 설명**: 시험까지 30일이 있고 70% 완료했다면 아마 안전합니다. 7일이 있고 20% 완료했다면 곤란합니다. 마감일 위험 점수는 이것을 0-1 숫자로 변환합니다: 0은 "순조로움", 1은 "거의 확실히 놓칠 것".

---

## 사용자-객체 관계 그래프 모듈 (User-Object Relationship Graph Module)

> **코드 위치**: `src/core/user-object-graph.ts`

---

### 맥락 및 목적 (Context & Purpose)

이 모듈은 언어 학습자와 그들이 만나는 각 개별 언어 객체(단어, 패턴, 표현) 간의 진화하는 관계를 추적하고 분석하기 위해 존재합니다. "봤음/안 봤음"을 추적하는 단순한 플래시카드 시스템과 달리, 이 모듈은 **언어 습득의 다차원적 특성**을 포착합니다.

**해결하는 핵심 문제**:

전통적인 어휘 학습 앱은 단어를 이진 상태로 취급합니다: 단어를 알거나 모르거나. 실제 언어 지식은 훨씬 더 미묘합니다. 학습자가:
- 읽을 때는 단어를 인식하지만 쓸 때는 생성하지 못할 수 있음
- 의료 맥락에서는 단어를 이해하지만 일상 대화에서는 못 할 수 있음
- 단어를 정확히 들을 수 있지만 일관되게 철자를 틀릴 수 있음

이 모듈은 각 사용자와 각 언어 객체 사이에 **관계 그래프**를 구축하여 이러한 비대칭을 포착하고, 학습자가 성공했는지 *여부*뿐 아니라 *어떻게*, *언제*, *어떤 맥락에서* 기록합니다.

**비즈니스 요구사항**: 개인화된 언어 학습은 다양한 기술 차원에 걸쳐 각 학습자의 고유한 강점과 약점을 이해해야 합니다. 세분화된 접촉 데이터 없이는 시스템이 다음에 무엇을 연습할지에 대한 지능적인 결정을 내릴 수 없습니다.

**사용 시점**:
- 학습자가 작업을 완료할 때마다 (언어 객체와의 모든 상호작용)
- 학습 세션 추천을 생성할 때
- 학습자를 위한 진행 시각화를 구축할 때
- 어떤 항목이 집중 연습이 필요한지 계산할 때

---

### 학술적 기반 (Academic Foundations)

이 모듈은 교육 데이터 마이닝과 지식 추적의 세 가지 주요 연구 기반 위에 구축되었습니다:

#### 심층 지식 추적 (DKT) - Piech et al., 2015

**기술적**: DKT는 **Long Short-Term Memory (LSTM) 네트워크**(긴 시퀀스에 걸쳐 정보를 기억할 수 있는 신경망 유형)를 사용하여 학생이 문제를 연습하면서 지식이 시간에 따라 어떻게 진화하는지 모델링합니다.

**쉬운 설명**: 단순히 "정답 vs 오답"을 세는 대신, DKT는 각 연습 시도가 학생이 알고 있는 것을 변화시킨다는 것을 인식합니다. 게임에서 승패만 추적하는 것이 아니라 각 경기 후 플레이어의 기술 수준이 어떻게 변하는지 추적하는 것과 같습니다.

**사용 이유**: DKT는 순차적 학습 패턴이 중요하다는 것을 보여주었습니다. 이 모듈은 유사한 철학을 구현합니다: 단어와의 각 만남은 고립된 것이 아니라 학습 궤적의 일부입니다.

#### DyGKT - 지식 추적을 위한 동적 그래프 학습 (2024)

**기술적**: DyGKT는 학습자-개념 관계를 **이질적 동적 그래프**로 모델링하며, 노드는 학생, 문제, 지식 개념을 나타내고 에지는 시간에 따라 진화하는 상호작용을 포착합니다.

**쉬운 설명**: 당신, 배우고 있는 모든 단어, 그리고 기저 개념(문법 규칙, 발음 패턴) 사이의 연결 웹을 상상해 보세요. DyGKT는 연습하면서 이 웹이 어떻게 변하는지 추적합니다. 일부 연결은 강해지고, 다른 것은 격차를 드러냅니다.

**사용 이유**: DyGKT는 우리의 다차원 추적에 영감을 주었습니다. 단순히 "사용자가 단어 X를 안다"가 아니라 "사용자가 X를 시각적으로 인식하고, X를 청각적으로 생성하는 데 어려움을 겪으며, X를 주로 의료 맥락에서 봤다"를 추적합니다.

#### 지식 관계 순위 (Knowledge Relation Rank) (PMC 2023)

**기술적**: 이 연구는 다른 유형의 참여(읽기, 쓰기, 듣기)가 다른 가중치를 가진 다른 유형의 지식 에지를 생성하는 **이질적 학습 상호작용**을 모델링합니다.

**쉬운 설명**: 단어를 10번 읽어서 배우는 것은 대화에서 두 번 사용하는 것과 다른 종류의 지식을 만듭니다. 이 연구는 이러한 차이를 정량화합니다.

**사용 이유**: 해석 대 생성 비율과 모달리티별 성공률을 근본적으로 다른 유형의 지식으로 추적하는 우리의 결정을 검증합니다.

---

### 마이크로스케일: 직접 관계 (Microscale: Direct Relationships)

#### 의존성 (Dependencies)

| 파일 | 임포트 | 목적 |
|------|--------|---------|
| `src/core/types.ts` | `TaskType`, `TaskFormat`, `TaskModality` | 작업 분류를 위한 타입 정의 - 코드베이스 전체에서 일관된 어휘 보장 |

**내부 의존성**:
- 외부 라이브러리 의존성 없이 순수 TypeScript만 사용
- JavaScript의 네이티브 `Date`, `Math`, `Map` 객체에 의존

#### 의존 모듈 (Dependents)

**참고**: 이 모듈은 새로 구현되어 아직 완전히 통합되지 않았습니다. 예상 소비자:

| 예상 소비자 | 이 모듈 사용 방법 |
|-------------------|----------------------------|
| `src/main/services/learning-session.ts` | 세션 계획을 위한 현재 사용자-객체 상태를 얻기 위해 `buildRelationshipStats()` 호출 |
| `src/main/services/task-selector.ts` | 노출 격차를 찾고 균형 잡힌 연습을 추천하기 위해 `buildRelationshipProfile()` 사용 |
| `src/renderer/components/ProgressDashboard.tsx` | 차트와 그래프를 위해 `generateVisualizationData()` 소비 |
| `src/main/db/operations/mastery.ts` | 연습 결과 기록 시 `createEncounter()`와 `updateStatsWithEncounter()` 호출 |

#### 데이터 흐름 (Data Flow)

```
사용자가 작업 완료
        |
        v
+-------------------+
| createEncounter() | -- 전체 맥락과 함께 원시 만남 기록
+-------------------+
        |
        v
+---------------------------+
| updateStatsWithEncounter()| -- 집계된 통계를 증분적으로 업데이트
+---------------------------+
        |
        v
+------------------------+
| buildRelationshipStats()| -- 필요시 모든 파생 메트릭 (재)계산
+------------------------+
        |
        v
+-------------------------+
| buildRelationshipProfile()| -- 격차에 기반한 추천 추가
+-------------------------+
        |
        v
+---------------------------+
| generateVisualizationData()| -- UI 소비를 위해 포맷
+---------------------------+
        |
        v
[UI가 진행 차트 렌더링, 세션 플래너가 추천 사용]
```

---

### 매크로스케일: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 레이어 (Architectural Layer)

이 모듈은 LOGOS 아키텍처의 **코어 알고리즘 레이어**에 위치합니다:

```
레이어 0: 공유 타입 (src/shared/, src/core/types.ts)
            |
레이어 1: 코어 알고리즘 (src/core/) <-- 여기 있습니다
            |
레이어 2: 메인 프로세스 서비스 (src/main/services/)
            |
레이어 3: IPC 핸들러 (src/main/ipc/)
            |
레이어 4: 렌더러/UI (src/renderer/)
```

**아키텍처 원칙**: 이 모듈은 **순수**합니다 - 부작용이 없고, I/O를 수행하지 않으며, 데이터베이스에 직접 접근하지 않습니다. 데이터를 받고, 파생 값을 계산하고, 결과를 반환합니다. 이것은:
- 격리된 테스트 가능
- 다른 맥락에서 재사용 가능
- Electron 메인/렌더러 프로세스 우려에서 자유로움

#### 전체 그림 영향 (Big Picture Impact)

이 모듈은 LOGOS에서 **개인화된 학습의 기반**입니다. 가능하게 하는 것:

| 기능 | 이 모듈이 가능하게 하는 방법 |
|---------|---------------------------|
| **스마트 세션 계획** | 연습이 부족한 기술 차원 식별 (예: "사용자가 더 많은 청각 생성 연습 필요") |
| **균형 잡힌 학습** | 불균형한 연습을 방지하기 위해 해석/생성 비율 추적 |
| **도메인 맥락화** | 각 단어가 본 도메인을 기록하여 도메인별 연습 가능 |
| **진행 시각화** | UI를 위한 레이더 차트, 타임라인, 분포 데이터 생성 |
| **학습 비용 추정** | 과거 패턴에 기반하여 미래 항목에 얼마나 많은 노력이 필요한지 예측 |
| **전이 학습 최적화** | 파생 효과 계산 - 단어 X를 배우면 관련 단어 Y, Z에 도움 |

---

### 기술 개념 (쉬운 설명) (Technical Concepts - Plain English)

#### 만남 (Encounter)

**기술적**: 사용자와 언어 객체 간의 단일 상호작용의 타임스탬프된 기록으로, 전체 맥락(작업 유형, 모달리티, 도메인)과 결과(성공, 응답 시간, 단서 수준)를 포착합니다.

**쉬운 설명**: 단어를 연습할 때마다 우리는 기록합니다: "오후 3:42에 Maria가 의료 독해 작업에서 'diagnosis'를 봤고, 힌트 없이 2.3초 만에 정답을 맞췄다." 이것이 하나의 만남입니다.

**추적 이유**: 개별 만남은 학습 패턴을 이해하기 위한 원재료입니다. 이것 없이는 궤적이 아닌 최종 상태만 알 수 있습니다.

#### 해석 vs. 생성 (Interpretation vs. Production)

**기술적**: **해석 작업**(수용 기술)은 언어 입력을 인식하거나 이해해야 합니다(독해, 듣기, 매칭). **생성 작업**(생성 기술)은 언어 출력을 생성해야 합니다(말하기, 쓰기, 자유 응답).

**쉬운 설명**:
- *해석* = "볼/들을 때 이해할 수 있다" (군중에서 친구 얼굴을 알아보는 것처럼)
- *생성* = "기억에서 만들어낼 수 있다" (기억에서 친구 얼굴을 그리는 것처럼)

**추적 이유**: 학습자는 종종 비대칭적 기술을 가집니다. 누군가가 1000단어를 이해하지만 대화에서는 200개만 사용할 수 있을 수 있습니다. 이 비율을 추적하면 연습을 어느 방향으로 밀어야 하는지 알 수 있습니다.

#### 모달리티 균형 (샤논 엔트로피) (Modality Balance - Shannon Entropy)

**기술적**: 연습이 감각 채널(시각, 청각, 혼합)에 걸쳐 얼마나 고르게 분포되었는지 측정하기 위해 모달리티 분포의 **정규화된 샤논 엔트로피**를 계산합니다. 1.0은 완벽하게 균형; 0.0은 단일 모달리티만.

**쉬운 설명**: 단어를 읽기만 하고 듣지 않으면 모달리티 균형은 0(치우침)입니다. 읽기, 듣기, 혼합 연습을 동등하게 하면 균형이 1(균등)에 가까워집니다. 다음 만남 모달리티가 "얼마나 놀라울지"를 측정하는 정보 이론 공식을 사용합니다 - 높은 놀라움은 높은 균형을 의미합니다.

**추적 이유**: 다중 모달 노출은 더 강건한 기억을 만듭니다. "hospital"을 읽기만 한 사람은 악센트가 있는 발음을 들었을 때 인식하지 못할 수 있습니다.

#### 해석/생성 비율 (Interpretation/Production Ratio)

**기술적**: `해석 만남 / 총 만남`으로 계산된 0과 1 사이의 값. 0.5는 균형 잡힌 연습; 0.5 이상은 해석 중심 연습.

**쉬운 설명**: "모든 연습 중 얼마나 수동적(이해)이고 능동적(생성)이었나?"에 답합니다. 단어에 대해 8개의 인식 작업과 2개의 쓰기 작업을 했다면 비율은 0.8 - 수동 학습으로 크게 치우쳐 있습니다.

**추적 이유**: 생성이 더 어렵고 더 강한 기억 흔적을 만듭니다. 누군가의 비율이 너무 높으면 더 많은 생성 작업을 추천합니다.

#### 학습 비용 추정 (Learning Cost Estimation)

**기술적**: 숙달을 달성하는 데 필요한 노력을 추정하는 복합 점수(0-1)로, 다음을 결합:
- 기본 IRT 난이도 (항목이 심리측정적으로 얼마나 어려운지)
- 역사적 성공률 (사용자가 어떻게 수행했는지)
- 노출 요인 (숙달 없이 얼마나 많은 시도)

**쉬운 설명**: "이 사람이 이 단어를 진정으로 배우는 데 얼마나 많은 작업이 필요할까?" 사용자가 계속 실패하는 흔한 단어는 더 많은 비용이 듭니다(어려움을 겪고 있음). 본 적 없는 희귀 단어는 처음에 덜 비쌉니다(미지의 영역).

**추적 이유**: 연습의 우선순위를 정하는 데 도움이 됩니다. 고비용 항목은 버리기보다 특별한 주의(스캐폴딩, 추가 연습)가 필요할 수 있습니다.

#### 파생 효과 점수 (전이 학습) (Derived Effect Score - Transfer Learning)

**기술적**: 한 언어 객체를 배우는 것이 **전이 학습**을 통해 관련 객체에 얼마나 도움이 되는지 측정합니다. 전이 계수와 네트워크 중심성(객체가 다른 것들과 얼마나 연결되어 있는지)을 사용하여 계산됩니다.

**쉬운 설명**: 접두사 "un-"을 배우면 수백 개의 단어(unhappy, unlikely, unusual)에 도움이 됩니다. 희귀 전문 용어를 배우면 자신에게만 도움이 됩니다. 이 점수는 그 배수 효과를 포착합니다 - 일부 지식은 다른 지식을 잠금 해제하기 때문에 더 "전략적"입니다.

**추적 이유**: 시스템이 고레버리지 학습의 우선순위를 정할 수 있게 합니다. 어근과 흔한 패턴을 공부하면 연쇄 효과가 있습니다.

#### 지식 강도 (Knowledge Strength)

**기술적**: 다음을 결합한 가중 복합 점수:
- 성공률 (40%)
- 검색 유창성 (20%)
- 모달리티 균형 (10%)
- 카테고리 균형 (10%)
- 최근성 감쇠 (20%)

최근성 구성 요소에 30일 반감기의 지수 감쇠를 사용합니다.

**쉬운 설명**: "이 사람이 이 단어를 지금 얼마나 잘 아는가?" 단순히 맞추는 것만이 아닙니다:
- 일관되게 맞추기
- 빠르게 맞추기 (유창성)
- 다른 형식에서 맞추기
- 수동적이고 능동적인 작업 모두에서 맞추기
- 최근에 연습했기 (기억은 희미해짐)

**추적 이유**: 단일 메트릭은 오해의 소지가 있을 수 있습니다. 누군가가 100% 정확도를 가질 수 있지만 쉬운 인식 작업에서만. 이 복합이 진정하고 강건한 지식을 드러냅니다.

#### 검색 유창성 (Retrieval Fluency)

**기술적**: 응답 시간을 유창성 점수로 매핑하는 **시그모이드 함수**를 사용합니다. 함수는 2000ms에 중간점을 가지며, 더 빠른 응답은 더 높은 유창성 점수(1.0에 접근)를 주고 더 느린 응답은 더 낮은 점수(0.0에 접근)를 줍니다.

**쉬운 설명**: "이 단어에 얼마나 빨리 접근할 수 있나?" 결국 정답을 맞추더라도 기본 단어를 떠올리는 데 10초가 걸린다면 약한 기억을 암시합니다. 즉각적인 회상(1초 미만)은 강하고 자동적인 지식을 암시합니다.

**추적 이유**: 유창성은 "결국 알아냈다"와 "확실히 안다"를 구별합니다. 실생활의 언어 사용은 빠른 접근이 필요합니다 - 말하면서 5초간 주저하면 대화 흐름이 끊깁니다.

---

### 주요 함수 설명 (Key Functions Explained)

#### `classifyTaskCategory(taskType: string): TaskCategory`

**하는 일**: 작업 유형 문자열("recognition" 또는 "free_response" 같은)을 받아 "interpretation" 또는 "production"으로 분류합니다.

**존재 이유**: 코드베이스의 다른 부분이 다른 작업 유형 이름을 사용합니다. 이 함수는 언어 습득 이론에 기반한 일관된 분류를 제공합니다.

**폴백 로직**: 알 수 없는 작업 유형이 전달되면 함수는 패턴 매칭("recognition" 포함? "production" 포함?)을 사용하여 최선의 추측을 하고, 더 안전한 가정으로 "interpretation"을 기본값으로 합니다.

#### `calculateModalityBalance(encounters: ObjectEncounter[]): number`

**하는 일**: 샤논 엔트로피를 사용하여 만남이 시각, 청각, 혼합 모달리티에 걸쳐 얼마나 고르게 분포되어 있는지 계산합니다.

**수학**:
1. 모달리티별 만남 수 세기
2. 개수를 확률로 변환
3. 엔트로피 계산: `H = -sum(p * log2(p))`
4. 최대 가능 엔트로피로 정규화 (3개 카테고리의 경우 `log2(3)`)

**왜 엔트로피인가**: 엔트로피는 자연스럽게 "퍼짐"을 포착합니다. 모든 만남이 시각적이면 엔트로피는 0(불확실성 없음). 완벽하게 균형 잡히면 엔트로피가 최대(다음 모달리티에 대한 최대 불확실성).

#### `updateStatsWithEncounter(currentStats, encounter): ObjectRelationshipStats`

**하는 일**: 새 만남이 기록될 때 전체 기록에서 재계산하지 않고 집계된 통계를 증분적으로 업데이트합니다.

**왜 증분인가**: 매번 처음부터 모든 통계를 재계산하면 비용이 많이 듭니다(O(n), n = 총 만남). 증분 업데이트는 O(1) - 기록 크기에 관계없이 상수 시간.

**러닝 평균 공식**: 성공률의 경우 온라인 평균 업데이트 공식 사용:
```
new_mean = old_mean + (new_value - old_mean) / n
```

#### `buildRelationshipProfile(stats): ObjectRelationshipProfile`

**하는 일**: 원시 통계를 실행 가능한 추천으로 확장:
- 사용자가 다음에 어떤 작업 카테고리를 연습해야 하는가?
- 어떤 모달리티가 과소 대표되었는가?
- 사용자 노출에 어떤 격차가 있는가?

**통계와 분리된 이유**: 통계는 객관적인 측정입니다. 프로필은 교육 원칙(예: "70/30 해석/생성 분할은 불균형")에 기반한 주관적인 추천을 포함합니다.

---

## 참고 문헌 (References)

- Sinclair, J. (1991). *Corpus, Concordance, Collocation*. Oxford University Press.
- Church, K., & Hanks, P. (1990). Word association norms, mutual information, and lexicography. *Computational Linguistics*, 16(1), 22-29.
- Davies, M. (2008-). The Corpus of Contemporary American English (COCA). Available online at https://www.english-corpora.org/coca/
- OPUS Project. Open Parallel Corpus. Available at https://opus.nlpl.eu/
- Miettinen, K. (1999). *Nonlinear Multiobjective Optimization*. Springer.
- Narvekar, S., Peng, B., Leonetti, M., Sinapov, J., Taylor, M. E., & Stone, P. (2020). Curriculum Learning for Reinforcement Learning Domains: A Framework and Survey. *Journal of Machine Learning Research*, 21(181), 1-50.
- Piech, C., et al. (2015). Deep Knowledge Tracing. *Advances in Neural Information Processing Systems*.
