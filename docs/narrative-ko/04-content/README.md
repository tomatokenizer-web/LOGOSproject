# 콘텐츠 생성 시스템 (Content Generation)

> **최종 업데이트**: 2026-01-07
> **코드 위치**: `src/core/content/`
> **상태**: Active

---

## 개요

LOGOS의 콘텐츠 생성 시스템은 학습자에게 제시되는 모든 학습 자료를 생성하고 검증하는 핵심 서브시스템입니다. 이 모듈은 단순한 콘텐츠 출력이 아닌, **교육학적 의도(Pedagogical Intent)**를 기반으로 학습 이론과 기술을 연결하는 역할을 합니다.

**핵심 철학**: 기술이 교육학을 주도하는 것이 아니라, 교육학이 기술을 주도합니다.

---

## 콘텐츠 생성 (Content Generation)

### 다중 소스 폴백 체인

콘텐츠 생성기는 **복원력 있는 폴백 체인(Fallback Chain)**을 구현합니다. 이는 마치 여러 개의 백업 발전기가 있는 병원과 같습니다 - 하나가 실패해도 다음 것이 작동합니다.

```
폴백 순서:
1. 캐시 (Cache)     → 가장 빠름, 비용 없음
2. 템플릿 (Template) → 빠르고 결정론적
3. AI 생성         → 가장 느리지만 품질 최고
4. 기본 폴백       → 항상 동작 보장
```

**캐시 우선 전략의 이유**: 학습 앱에서는 "충분히 좋고 빠른" 콘텐츠가 "완벽하지만 느린" 콘텐츠보다 학습자 경험에 더 좋습니다. 캐시 적중은 거의 즉각적이고 비용이 없으며, 템플릿은 빠르고 예측 가능합니다. AI는 가장 느리지만 품질이 가장 높습니다.

### ContentGenerator 클래스

**역할**: 여러 백엔드에 걸쳐 콘텐츠 소싱을 조정하는 메인 오케스트레이터

**주요 기능**:
- 구성, 캐싱, 템플릿 관리를 단일 책임 컴포넌트에 캡슐화
- IPC 기반 Claude API 접근으로 보안 경계 강제
- 품질 계층별 템플릿 필터링

### 템플릿 시스템

템플릿은 **플레이스홀더 치환(Placeholder Substitution)**을 사용하는 패턴 기반 생성 방식입니다:

```
템플릿 예시: "{content}의 의미는 무엇입니까?"
             ↓ 플레이스홀더 치환
실제 출력:   "ephemeral의 의미는 무엇입니까?"
```

**PlaceholderDef**: 템플릿 변수가 ContentSpec에서 어떻게 채워지는지 설명
- `object_content`: 학습 대상 콘텐츠
- `translation`: 번역
- `context`: 문맥
- `blank`: 빈칸 마스킹

### AI 프롬프트 구성

`buildAIPrompt()` 메서드는 다음을 포함한 상세한 프롬프트를 구성합니다:
- 어휘 대상
- 교육학적 의도
- 컨텍스트 요구 사항
- 제약 조건

이 구조화된 프롬프팅은 AI 출력 품질을 향상시키고 재생성 필요성을 줄입니다.

---

## 검증 (Validation)

### 다차원 품질 보증

콘텐츠 검증기는 학습자에게 도달하기 전에 콘텐츠를 **네 가지 차원**에서 평가합니다:

| 카테고리 | 검사 항목 | 목적 |
|----------|-----------|------|
| **언어적 (Linguistic)** | 단어 수, 문장 구조, 문법, 어휘 수준 | 언어적 품질 보장 |
| **교육학적 (Pedagogical)** | 의도 정렬, 예상 응답, 지시사항 품질, 인지 부하 | 학습 효과 보장 |
| **기술적 (Technical)** | 비어 있지 않은 콘텐츠, 유효한 구조, 명세 ID 일치 | 시스템 무결성 |
| **안전 (Safety)** | 콘텐츠 적절성, PII 감지 | 학습자 보호 |

### 가중 점수 시스템

각 검사에는 **가중치(0-1)**가 할당되어 전체 및 카테고리 점수에 기여합니다:

```
전체 점수 = Sum(검사 점수 * 가중치) / Sum(가중치)
```

**안전 검사의 특수성**: 안전 카테고리 최소값은 기본적으로 **100**으로 설정됩니다. 다른 점수가 아무리 높아도 안전 실패가 있으면 콘텐츠가 차단됩니다. 이는 콘텐츠 안전의 비타협적 특성을 반영합니다.

### 품질 계층 자동 결정

```
점수 90+ → Premium (프리미엄)
점수 70+ → Standard (표준)
점수 70 미만 → Fallback (폴백)
안전 실패 시 → 강제 Fallback
```

### ValidationResult 구조

```typescript
interface ValidationResult {
  valid: boolean;           // 전체 합격/불합격
  score: number;            // 0-100 품질 점수
  qualityTier: string;      // premium/standard/fallback
  checks: ValidationCheck[]; // 개별 검사 결과
  suggestions: string[];    // 개선 제안
  timestamp: Date;          // 검증 시점
}
```

---

## 교육적 의도 (Pedagogical Intent)

### 왜 의도가 중요한가

학습 콘텐츠는 **상호 교환 가능하지 않습니다**. 어휘 도입을 위한 플래시카드는 시간 제한 회상 훈련과 완전히 다른 목적을 수행합니다.

**교육학적 의도(Pedagogical Intent)**는 콘텐츠 구조, 난이도, 평가 기준을 결정하는 **일급(first-class) 동인**입니다.

### 아홉 가지 교육 목적

| 의도 | 설명 | 예시 상황 |
|------|------|-----------|
| `introduce_new` | 새로운 어휘/개념 첫 노출 | 새 단어 처음 보여주기 |
| `reinforce_known` | 이미 접한 자료 연습 | 복습 세션 |
| `test_comprehension` | 수용적 이해 확인 | 듣기 이해 테스트 |
| `elicit_production` | 능동적 언어 출력 요구 | 문장 만들기 |
| `contextual_usage` | 자연스러운 사용 패턴 시연 | 실제 대화 예문 |
| `error_detection` | 오류 인식 및 수정 훈련 | 틀린 문장 찾기 |
| `metalinguistic` | 명시적 문법/구조 인식 | 문법 규칙 설명 |
| `fluency_building` | 속도와 자동성 구축 | 시간 제한 연습 |
| `transfer_testing` | 알려진 패턴을 새 사례에 적용 | 응용 문제 |

### 블룸의 분류체계 정렬

LOGOS의 LearningPhase는 **블룸의 분류체계(Bloom's Taxonomy)**와 정렬됩니다:

```
블룸의 분류체계    LOGOS LearningPhase    예시 의도
--------------    ------------------    -----------
지식              recognition           introduce_new
이해              recall                reinforce_known, test_comprehension
적용              application           contextual_usage, fluency_building
분석              analysis              error_detection, metalinguistic
종합              synthesis             elicit_production, transfer_testing
평가              evaluation            error_detection
```

이를 통해 LOGOS는 인지 기술 개발 및 평가 설계에 관한 **수십 년의 연구**를 활용할 수 있습니다.

### 인지 부하 관리

각 의도에는 **1-5 인지 부하 척도**가 할당됩니다:

- **낮은 부하 (1-2)**: introduce_new, reinforce_known
- **중간 부하 (3)**: test_comprehension, contextual_usage
- **높은 부하 (4-5)**: elicit_production, metalinguistic, transfer_testing

이를 통해 학습 세션 전반에 걸친 **부하 균형**이 가능하여 학습자 피로를 방지합니다.

### 숙달 단계 경계

각 의도는 **최소/최대 숙달 단계(0-4)**를 지정합니다:

```
0단계 항목 → 생산 과제 금지 (너무 어려움)
4단계 항목 → 도입 과제 금지 (이미 숙달됨)
```

이를 통해 **부적절한 과제**를 자동으로 방지합니다.

### 헬퍼 함수들

| 함수 | 용도 |
|------|------|
| `getIntentsForStage()` | 특정 숙달 단계에 적합한 의도 조회 |
| `getIntentsForPhase()` | 특정 학습 단계에 적합한 의도 조회 |
| `requiresProduction()` | 생산 과제 필요 여부 확인 |
| `getScaffoldingLevel()` | 기본 스캐폴딩 수준 조회 |
| `selectOptimalIntent()` | 최적 의도 자동 선택 |
| `calculateExpectedSuccess()` | 예상 성공 확률 계산 |

---

## 콘텐츠 명세 (Content Specification)

### ContentSpec의 역할

**ContentSpec**은 콘텐츠를 요청하는 컴포넌트와 생성하는 컴포넌트 간의 **정확한 계약**입니다:

```typescript
ContentSpec = {
  대상 어휘 + 교육학적 의도 + 과제 유형 +
  모달리티 + 난이도 제약 + 스캐폴딩 구성 +
  컨텍스트 요구 사항 + 품질 선호도 + 생성 제약
}
```

### 중첩 인터페이스 설계

수십 개의 속성을 평면 구조로 나열하는 대신, ContentSpec은 **중첩 인터페이스**를 사용합니다:

- `ContentContextSpec`: 컨텍스트 요구 사항
- `ContentQualitySpec`: 품질 선호도
- `GenerationConstraints`: 생성 제약
- `DifficultyConstraints`: 난이도 경계
- `ScaffoldingConfig`: 스캐폴딩 설정

### CEFR 정렬

어휘 수준 제약은 **CEFR 표준(A1-C2)**을 사용합니다:
- 국제 언어 학습 표준과 일치
- 외부 콘텐츠 소스와 상호 운용 가능

### 팩토리 함수

일반적인 시나리오를 위한 편의 생성자:

| 함수 | 용도 | 특징 |
|------|------|------|
| `createIntroductionSpec()` | 새 어휘 도입 | 높은 스캐폴딩, 교육적 장르 |
| `createProductionSpec()` | 생산 과제 | 중간 스캐폴딩, 출력 요구 |
| `createComprehensionSpec()` | 이해 테스트 | 수용적 과제 |
| `createFluencySpec()` | 유창성 훈련 | 제로 스캐폴딩, 엄격한 타임아웃 |

---

## 데이터 흐름

### 전체 콘텐츠 생성 파이프라인

```
학습자 상태 (숙달 단계, 세타, 최근 이력)
     |
     v
selectOptimalIntent() ─────────────────> PedagogicalIntent
     |
     v
팩토리 함수 또는 수동 구성 ──────────────> ContentSpec
     |
     v
validateContentSpec() ─────────────────> 검증 오류 (있으면)
     |
     v
ContentGenerator.generate()
     |
     ├──> tryCache() ──> [적중] ──> 반환
     |
     ├──> tryTemplate() ──> [발견] ──> 적용 & 캐시 ──> 반환
     |
     ├──> tryAI() ──> [가능] ──> Claude 호출 ──> 파싱 ──> 캐시 ──> 반환
     |
     └──> generateFallback() ──> 기본 콘텐츠 반환
     |
     v
GeneratedContent
     |
     v
ContentQualityValidator.validate()
     |
     ├──> runLinguisticChecks()
     ├──> runPedagogicalChecks()
     ├──> runTechnicalChecks()
     └──> runSafetyChecks()
     |
     v
ValidationResult (점수, 계층, 제안)
     |
     v
contentMeetsSpec() ──────────────────> 준수 확인
     |
     v
학습자에게 제시
```

---

## 통합 포인트

### 모듈 임포트 패턴

```typescript
// 일반적인 사용법 - 특정 항목 임포트
import {
  ContentSpec,
  ContentGenerator,
  createContentSpec,
  validateContent
} from '@core/content';

// 인터페이스에 대한 타입 전용 임포트
import type {
  GeneratedContent,
  ValidationResult
} from '@core/content';

// 전체 네임스페이스 임포트 (덜 일반적)
import * as Content from '@core/content';
```

### 소비처

| 소비자 | 용도 |
|--------|------|
| 과제 선택 엔진 | 학습자 상태에 따른 적절한 의도 선택 |
| 스케줄링 알고리즘 | 간격 반복 통합을 위한 성공 확률 계산 |
| 메인 프로세스 서비스 | ContentGenerator와 Validator 직접 사용 |
| 렌더러 컴포넌트 | 콘텐츠 표시를 위한 타입 임포트 |
| 테스트 파일 | 유닛 및 통합 테스트 |

### IPC 브릿지

AI 생성은 `window.logos.claude`를 통해 메인 프로세스로 라우팅됩니다:
- 렌더러 코드에 API 자격 증명 미포함
- Electron 아키텍처에서 보안 경계 강제

---

## 기술 용어 해설

| 기술 용어 | 쉬운 설명 |
|-----------|-----------|
| **폴백 체인 (Fallback Chain)** | 첫 번째 방법이 실패하면 두 번째, 세 번째 방법을 자동으로 시도하는 백업 시스템 |
| **템플릿 치환 (Template Substitution)** | 빈칸이 있는 틀(템플릿)에 실제 값을 채워넣는 방식 |
| **인지 부하 (Cognitive Load)** | 학습 시 뇌가 처리해야 하는 정보량 - 너무 많으면 학습 효율 저하 |
| **스캐폴딩 (Scaffolding)** | 건물 공사용 비계처럼, 학습자가 어려워할 때 제공하는 임시 지원 구조 |
| **IRT (Item Response Theory)** | 학습자 능력과 문제 난이도의 관계를 수학적으로 모델링하는 이론 |
| **CEFR** | 유럽 공통 언어 참조 기준 - A1(초급)부터 C2(최상급)까지의 국제 언어 능력 표준 |
| **블룸의 분류체계** | 학습 목표를 인지 수준별로 분류한 교육학 프레임워크 |
| **PII (Personally Identifiable Information)** | 개인을 식별할 수 있는 정보 (전화번호, 이메일 등) |

---

## 네비게이션

| 이전 | 현재 | 다음 |
|------|------|------|
| [학습 엔진](../03-learning-engine/) | **콘텐츠 생성** | [과제 시스템](../05-tasks/) |

---

> **참고**: 이 문서는 `src/core/content/` 디렉토리의 구현을 설명하는 내러티브 문서입니다. 코드의 "무엇"보다 "왜"에 초점을 맞추고 있습니다.
