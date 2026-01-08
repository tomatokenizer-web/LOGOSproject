# 콘텐츠 모듈 (Content Module)

이 문서는 LOGOS 프로젝트의 콘텐츠 생성 및 검증 서브시스템에 대한 내러티브 문서의 한국어 번역본입니다.

---

## index.ts - 콘텐츠 모듈의 공개 API 표면 (Public API Surface)

### 존재 이유

콘텐츠 모듈에는 다양한 타입, 클래스, 함수가 포함된 여러 관련 파일들이 있습니다. 중앙 익스포트 지점이 없으면 소비자(consumer)가 내부 파일 구조를 알고 여러 위치에서 가져와야 합니다. 이 인덱스 파일은 내부 구조를 숨기고, 소비자에게 영향을 주지 않으면서 향후 리팩토링을 가능하게 하며, 전체 콘텐츠 생성 및 검증 서브시스템에 대한 단일 임포트 대상을 제공하는 깔끔한 공개 API를 생성합니다.

### 핵심 개념 (Key Concepts)

- **모듈 집계 (Module aggregation)**: 네 개의 구현 파일(pedagogical-intent, content-spec, content-generator, content-validator)에서 모든 공개 익스포트가 이 단일 진입점을 통해 다시 내보내집니다.

- **타입 익스포트 (Type exports)**: TypeScript 타입 정의는 `type` 키워드와 함께 익스포트되어 타입 전용 임포트와 소비 코드에서의 적절한 트리 셰이킹(tree-shaking)을 가능하게 합니다.

- **그룹화된 익스포트 (Grouped exports)**: 익스포트는 주석과 함께 소스 파일별로 구성되어 각 익스포트가 어떤 구현 파일에서 제공되는지 쉽게 추적할 수 있습니다.

### 설계 결정 (Design Decisions)

**배럴 익스포트 대신 명시적 재익스포트**: `export * from './file'`을 사용하는 대신 각 익스포트가 개별적으로 나열됩니다. 이를 통해 공개 API를 명시적으로 제어하고 의도적으로 노출된 것과 내부용인 것을 명확히 구분합니다.

**인터페이스에 대한 타입 전용 익스포트**: 타입 익스포트에 `type` 키워드를 사용하면 런타임 의존성이 생성되지 않고 더 나은 빌드 최적화가 가능합니다.

**주석을 활용한 논리적 그룹화**: 파일은 구현 파일과 일치하는 네 개의 섹션(Pedagogical Intent, Content Specification, Content Generator, Content Validator)으로 구성됩니다. 주석이 탐색을 위한 섹션을 구분합니다.

**포괄적인 API 노출**: 인덱스는 주요 클래스(ContentGenerator, ContentQualityValidator)뿐만 아니라 팩토리 함수(createContentSpec, createContentValidator), 헬퍼 함수(validateContentSpec, estimateGenerationComplexity) 및 모든 지원 타입도 익스포트합니다. 이를 통해 간단한 사용 사례와 고급 커스터마이징 모두 가능합니다.

### 통합 포인트 (Integration Points)

**다음에서 재익스포트:**
- `./pedagogical-intent`: 모든 교육학적 의도 타입, PEDAGOGICAL_INTENTS 상수, 의도 선택 및 성공 계산을 위한 헬퍼 함수
- `./content-spec`: 콘텐츠 명세 타입, 일반적인 명세 패턴을 위한 팩토리 함수, 검증/복잡도 유틸리티
- `./content-generator`: 생성기 타입(config, cache, template, result), ContentGenerator 클래스 및 팩토리 함수
- `./content-validator`: 검증 타입(result, check, category, config, benchmark), ContentQualityValidator 클래스 및 편의 함수

**소비처:**
- 다른 코어 모듈: `from '../content'` 또는 `from '@core/content'`를 통해 콘텐츠 타입과 함수 임포트
- 메인 프로세스 서비스: 콘텐츠 준비를 위해 ContentGenerator와 ContentQualityValidator 사용
- 렌더러 컴포넌트: 콘텐츠 표시 및 상호작용을 위한 타입 임포트
- 테스트 파일: 유닛 및 통합 테스트를 위해 모든 타입과 함수 임포트

**임포트 패턴:**
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

---

## pedagogical-intent.ts - 콘텐츠 생성을 위한 교육 목적 정의

### 존재 이유

학습 콘텐츠는 상호 교환 가능하지 않습니다. 어휘 도입을 위한 플래시카드는 시간 제한 회상 훈련과는 다른 목적을 수행합니다. 명시적인 교육학적 의도(pedagogical intent) 모델링 없이는 콘텐츠 생성이 학습 과학과 단절됩니다. 이 모듈은 콘텐츠 구조, 난이도, 평가 기준을 주도하는 교육 목적(의도)을 정의합니다. 학습 이론(블룸의 분류체계, 숙달 단계, 인지 부하)을 실제 콘텐츠 생성 결정과 연결합니다.

### 핵심 개념 (Key Concepts)

- **PedagogicalIntent**: 아홉 가지 구별되는 교육 목적의 유니온 타입:
  - `introduce_new`: 새로운 어휘/개념에 대한 첫 노출
  - `reinforce_known`: 이미 접한 자료 연습
  - `test_comprehension`: 수용적 이해 확인
  - `elicit_production`: 능동적 언어 출력 요구
  - `contextual_usage`: 자연스러운 사용 패턴 시연
  - `error_detection`: 오류 인식 및 수정 훈련
  - `metalinguistic`: 명시적 문법/구조 인식
  - `fluency_building`: 속도와 자동성 구축
  - `transfer_testing`: 알려진 패턴을 새로운 사례에 적용

- **LearningPhase**: 학습자 참여의 인지 수준을 설명하는 블룸의 분류체계와 정렬된 여섯 단계(recognition, recall, application, analysis, synthesis, evaluation).

- **DifficultyConstraints**: 최소/최대 난이도(0-1), 목표 학습자 세타(능력 추정치), 최적값에서의 허용 편차를 포함한 콘텐츠 난이도의 수치적 경계.

- **ScaffoldingConfig**: 레벨(0-3), 사용 가능한 단서 유형, 자동 공개 지연, 정답 공개 전 최대 힌트 수를 포함한 지원 구조 구성.

- **CueType**: 점진적으로 공개될 수 있는 여덟 가지 학습 스캐폴드 유형(first_letter, word_length, translation, morpheme_breakdown, pronunciation, example_sentence, semantic_field, collocations).

- **PedagogicalIntentMeta**: 적용 가능한 단계, 숙달 단계 범위, 인지 부하(1-5), 생산 요구 사항, 시간 압박 권장 사항, 전형적인 스캐폴딩 수준을 포함한 각 의도에 대한 풍부한 메타데이터.

- **PEDAGOGICAL_INTENTS 상수**: 각 PedagogicalIntent를 PedagogicalIntentMeta에 매핑하는 포괄적인 룩업 테이블로, 의도 속성의 권위 있는 소스 역할을 합니다.

### 설계 결정 (Design Decisions)

**콘텐츠 구조의 동인으로서의 의도**: 교육학적 목적을 메타데이터로 취급하는 대신, 의도는 콘텐츠 형식, 난이도 타겟팅, 스캐폴딩 가용성, 평가 기준을 결정하는 일급(first-class) 동인입니다. 이를 통해 기술이 아닌 교육학이 기술을 주도하게 됩니다.

**블룸의 분류체계 정렬**: 학습 단계는 확립된 교육 이론에 매핑되어 LOGOS가 인지 기술 개발 및 평가 설계에 관한 수십 년의 연구를 활용할 수 있게 합니다.

**숙달 단계 경계**: 각 의도는 최소/최대 숙달 단계(0-4)를 지정하여 부적절한 과제를 방지합니다(예: 0단계 항목에는 생산 과제 없음, 숙달된 항목에는 도입 없음).

**인지 부하 정량화**: 1-5 인지 부하 척도는 학습 세션 전반에 걸친 부하 균형을 가능하게 하여 너무 많은 고부하 과제로 인한 학습자 피로를 방지합니다.

**명시적 속성으로서의 시간 압박**: 유창성 구축 과제는 명시적으로 시간 압박으로 표시되어 UI 컴포넌트가 타이머를 추가하고 점수 시스템이 응답 속도를 고려할 수 있게 합니다.

**스캐폴딩 수준 기본값**: 각 의도에는 기본 스캐폴딩 수준(0-3)이 있어 도전적인 과제에 적절한 지원이 제공되면서 유창성 훈련에 대한 과도한 스캐폴딩을 방지합니다.

**일반적인 쿼리를 위한 헬퍼 함수**: `getIntentsForStage()`, `getIntentsForPhase()`, `requiresProduction()`, `getScaffoldingLevel()`과 같은 함수는 일반적인 조회를 캡슐화하여 소비 코드에서의 중복과 잠재적 오류를 줄입니다.

**최적 의도 선택 알고리즘**: `selectOptimalIntent()` 함수는 숙달 단계, 스캐폴딩 격차, 최근 의도 이력을 고려하여 반복을 피하고 참여를 유지하는 교육학적으로 정보에 입각한 선택 전략을 구현합니다.

**IRT 영감을 받은 성공 확률**: `calculateExpectedSuccess()` 함수는 인지 부하, 생산 요구 사항, 시간 압박에 맞게 조정된 IRT 유사 모델을 사용하여 학습자 성공 확률을 추정합니다. 이를 통해 적응형 난이도 타겟팅이 가능합니다.

### 통합 포인트 (Integration Points)

**소비처:**
- `./content-spec`: 핵심 명세 구성 요소로 PedagogicalIntent, DifficultyConstraints, ScaffoldingConfig, LearningPhase 임포트
- `./content-generator`: 프롬프트 구성 및 메타데이터 계산을 위해 PEDAGOGICAL_INTENTS 사용
- `./content-validator`: 콘텐츠가 의도 요구 사항과 일치하는지 확인하기 위해 PEDAGOGICAL_INTENTS 사용
- 과제 선택 엔진: 학습자 상태에 따라 적절한 의도를 선택하기 위해 헬퍼 함수 사용
- 스케줄링 알고리즘: 간격 반복 통합을 위해 성공 확률 계산 사용

**데이터 흐름:**
```
학습자 상태 (숙달 단계, 세타, 최근 이력)
     |
     v
selectOptimalIntent() ---> PedagogicalIntent
     |
     v
PEDAGOGICAL_INTENTS[intent] ---> PedagogicalIntentMeta
     |
     v
calculateExpectedSuccess() ---> 성공 확률
     |
     v
ContentSpec 구성 (의도 + 메타 사용)
     |
     v
콘텐츠 생성 (프롬프트/템플릿 선택을 위해 의도 사용)
     |
     v
콘텐츠 검증 (의도 정렬 확인)
```

**학습 이론과의 관계:**
```
블룸의 분류체계         LOGOS LearningPhase        예시 의도
-----------------     -------------------        ---------------
지식                   recognition                introduce_new
이해                   recall                     reinforce_known, test_comprehension
적용                   application                contextual_usage, fluency_building
분석                   analysis                   error_detection, metalinguistic
종합                   synthesis                  elicit_production, transfer_testing
평가                   evaluation                 error_detection
```

---

## content-spec.ts - 콘텐츠 생성 요청을 위한 명세 계약

### 존재 이유

콘텐츠 생성은 콘텐츠를 요청하는 컴포넌트와 생성하는 컴포넌트 간의 정확한 계약을 필요로 합니다. 공식적인 명세 없이는 생성기가 난이도, 컨텍스트, 품질 요구 사항에 대한 가정을 해야 합니다. 이 모듈은 ContentSpec을 모든 제약 조건과 요구 사항을 사전에 캡처하는 포괄적인 요청 형식으로 정의하여, 생성기가 왕복 협상 없이 적절하게 타겟팅된 콘텐츠를 생성할 수 있게 합니다.

### 핵심 개념 (Key Concepts)

- **ContentSpec**: 콘텐츠 생성 요청을 완전히 설명하는 중심 인터페이스. 대상 어휘, 교육학적 의도, 단계, 과제 유형, 모달리티, 난이도 제약, 스캐폴딩 구성, 컨텍스트 요구 사항, 품질 선호도, 생성 제약을 단일 일관된 명세로 묶습니다.

- **ContentSourceType**: 캐시 적중 및 품질 추론을 가능하게 하는 콘텐츠 출처(cached, template, ai_generated, corpus, user_created)의 열거형.

- **ContentQualityTier**: 콘텐츠 정교함에 대한 기대치를 설정하고 품질 기반 필터링을 가능하게 하는 세 수준 품질 분류(premium, standard, fallback).

- **RegisterLevel & ContentGenre**: 생성된 콘텐츠가 학습 컨텍스트에 적합한 격식(formal/neutral/informal/colloquial) 및 장르(academic/conversational/technical 등)와 일치하도록 보장하는 스타일 제약.

- **GeneratedContent**: ContentSpec의 출력 대응물로, 실제 콘텐츠 텍스트, 지시사항, 예상 응답, 오답 선지(distractor), 힌트, 생성 과정에 대한 풍부한 메타데이터를 포함.

- **ContentMetadata**: 단어 수, 추정 난이도, 인지 부하, 완료 시간 추정, 캐시 적중 상태를 포함한 생성된 콘텐츠에 첨부된 관찰성 데이터.

- **팩토리 함수**: 일반적인 학습 시나리오에 대해 잘 구성된 명세를 생성하는 편의 생성자(createContentSpec, createIntroductionSpec, createProductionSpec, createComprehensionSpec, createFluencySpec).

### 설계 결정 (Design Decisions)

**중첩 인터페이스를 통한 관심사 분리**: 수십 개의 속성이 있는 평면 구조 대신, ContentSpec은 중첩 인터페이스(ContentContextSpec, ContentQualitySpec, GenerationConstraints, DifficultyConstraints, ScaffoldingConfig)를 사용하여 관련 관심사를 그룹화합니다. 이를 통해 가독성이 향상되고 부분 업데이트가 가능합니다.

**CEFR 정렬 어휘 수준**: vocabularyLevel 제약은 사용자 정의 난이도 척도 대신 표준 CEFR 수준(A1-C2)을 사용합니다. 이는 국제 언어 학습 표준과 일치하며 외부 콘텐츠 소스와의 상호 운용성을 가능하게 합니다.

**별도 함수로서의 명세 검증**: `validateContentSpec()` 함수는 구성에서 분리되어 명세를 점진적으로 구축하고 제출 전에 검증할 수 있습니다. 이는 복잡한 워크플로우에서 동적 명세 조립을 지원합니다.

**콘텐츠-명세 충족 검증**: `contentMeetsSpec()` 함수는 출력이 입력 요구 사항을 충족하는지에 대한 생성 후 검증을 제공합니다. 이를 통해 콘텐츠가 미달할 때 품질 게이트 및 재시도 로직이 가능합니다.

**복잡도 추정**: `estimateGenerationComplexity()` 함수는 객체 수, 의도, 컨텍스트 요구 사항, 제약 엄격도에 따라 0-1 복잡도 점수를 제공합니다. 이를 통해 생성기가 적절한 전략을 선택하고 현실적인 타임아웃을 설정할 수 있습니다.

**팩토리 함수를 통한 합리적인 기본값**: 팩토리 함수는 교육학적 모범 사례를 인코딩하여(예: 도입에는 높은 스캐폴딩과 교육적 장르; 유창성 훈련에는 제로 스캐폴딩과 엄격한 타임아웃) 호출자가 깊은 도메인 전문 지식을 필요로 하지 않습니다.

### 통합 포인트 (Integration Points)

**의존성:**
- `../types`: 핵심 도메인 타입을 위해 ComponentType, TaskType, TaskModality, LanguageObject 임포트
- `./pedagogical-intent`: 교육 목적을 설명하는 PedagogicalIntent, DifficultyConstraints, ScaffoldingConfig, LearningPhase 타입 임포트

**소비처:**
- `./content-generator`: ContentSpec은 ContentGenerator.generate()의 주요 입력
- `./content-validator`: ContentQualityValidator.validate()는 생성된 콘텐츠가 요구 사항을 충족하는지 확인하기 위해 ContentSpec 사용
- 과제 선택 로직: 업스트림 컴포넌트가 학습자 상태와 학습 목표에 따라 ContentSpec 구성
- 캐싱 레이어: 콘텐츠 재사용을 위해 ContentSpec 속성에서 캐시 키 도출

**데이터 흐름:**
```
학습 상태 + 목표
     |
     v
팩토리 함수 또는 수동 구성
     |
     v
ContentSpec (완전한 요청)
     |
     +---> validateContentSpec() ---> 검증 오류
     |
     v
ContentGenerator.generate(spec)
     |
     v
GeneratedContent
     |
     +---> contentMeetsSpec(content, spec) ---> 준수 확인
```

---

## content-generator.ts - 폴백 체인을 갖춘 다중 소스 콘텐츠 생성

### 존재 이유

학습 애플리케이션은 학습자에게 다양하고 컨텍스트에 적합한 콘텐츠를 제시해야 하지만, 단일 콘텐츠 소스에 의존하면 취약성과 잠재적 다운타임이 발생합니다. 이 모듈은 프리미엄 소스를 사용할 수 없을 때도 콘텐츠 전달을 보장하는 우선순위가 지정된 폴백 체인(cached -> template -> AI-generated)을 구현하여 신뢰성 문제를 해결합니다. 학습자가 항상 적절한 연습 자료를 받도록 보장하면서 가능할 때 품질을 최적화합니다.

### 핵심 개념 (Key Concepts)

- **ContentGenerator 클래스**: 여러 백엔드에 걸쳐 콘텐츠 소싱을 조정하는 메인 오케스트레이터. 구성, 캐싱, 템플릿 관리를 단일 책임 컴포넌트에 캡슐화합니다.

- **폴백 체인 (Fallback chain)**: 생성기가 우선순위 순서로 소스를 시도하는 복원력 패턴: 먼저 즉각적인 응답을 위해 캐시 확인, 그 다음 결정론적 생성을 위해 템플릿 적용, 마지막으로 동적 콘텐츠를 위해 Claude AI 호출. 각 계층은 다른 품질/지연 시간 트레이드오프를 가집니다.

- **ContentCache 인터페이스**: 생성기를 특정 스토리지 구현에서 분리하는 콘텐츠 지속성 추상화. 콘텐츠 신선도를 보장하기 위한 TTL 기반 만료 지원.

- **ContentTemplate**: 플레이스홀더 치환을 사용하는 패턴 기반 생성 접근 방식. 템플릿은 대문자화, 마스킹, 대문자 변환과 같은 변환이 포함된 과제별 패턴(예: "{content}의 의미는 무엇입니까?")을 정의합니다.

- **GenerationResult**: 성공 상태, 생성된 콘텐츠, 소스 귀속, 관찰성을 위한 타이밍 메트릭을 포함하는 포괄적인 응답 봉투.

- **PlaceholderDef**: 템플릿 변수가 ContentSpec에서 어떻게 채워져야 하는지 설명하는 메타데이터로, object_content, translation, context, blank와 같은 유형을 지원.

### 설계 결정 (Design Decisions)

**폴백 순서 (cache -> template -> AI)**: 이 순서는 속도와 비용을 우선시합니다. 캐시 적중은 거의 즉각적이고 비용이 없습니다; 템플릿은 빠르고 결정론적입니다; AI는 가장 느리지만 품질이 가장 높습니다. 이 순서는 학습 컨텍스트에 대한 "충분히 좋고 빠른" 철학을 반영합니다.

**생성 시점에 템플릿 초기화**: 모든 기본 제공 템플릿은 `initializeTemplates()`에서 즉시 로드됩니다. 이는 시작 비용을 선불로 처리하지만 생성 중 동기적 선택을 위해 템플릿이 항상 사용 가능하도록 보장합니다.

**AI 프롬프트 구성**: `buildAIPrompt()` 메서드는 어휘 대상, 교육학적 의도, 컨텍스트 요구 사항, 제약을 포함한 상세한 프롬프트를 구성합니다. 이 구조화된 프롬프팅은 AI 출력 품질을 향상시키고 재생성 필요성을 줄입니다.

**IPC 기반 Claude API 접근**: 렌더러 코드에 API 자격 증명을 포함하는 대신, 생성기는 `window.logos.claude`를 호출하여 메인 프로세스를 통해 AI 요청을 라우팅합니다. 이는 Electron 아키텍처에서 보안 경계를 강제합니다.

**성공으로서의 폴백 콘텐츠**: 캐시와 AI가 모두 실패해도 `generateFallback()`은 "template" 소스와 "fallback" 품질 계층으로 표시된 기본적이지만 기능적인 콘텐츠를 반환합니다. 이를 통해 학습 흐름이 콘텐츠 생성에서 절대 차단되지 않습니다.

**템플릿에 대한 품질 계층 필터링**: `selectTemplate()` 메서드는 품질 계층으로 템플릿을 필터링하여 가능할 때 프리미엄 템플릿을 선호합니다. 이를 통해 명시적 구성 없이 우아한 품질 저하가 가능합니다.

### 통합 포인트 (Integration Points)

**의존성:**
- `./content-spec`: 명세와 출력 간의 계약을 정의하는 ContentSpec, GeneratedContent, ContentSourceType, ContentQualityTier, ContentMetadata 타입 임포트
- `./pedagogical-intent`: 프롬프트 구성 및 메타데이터 계산을 알리기 위해 PEDAGOGICAL_INTENTS 메타데이터 사용
- `../types`: 어휘 항목 표현 및 과제 분류를 위해 LanguageObject와 TaskType 임포트
- `window.logos.claude` (런타임): AI 생성을 위한 메인 프로세스의 ClaudeService에 대한 IPC 브릿지

**소비처:**
- 과제 생성 파이프라인: ContentSpec을 실제 학습자 대면 콘텐츠로 구체화해야 하는 업스트림 컴포넌트가 ContentGenerator 호출
- 캐싱 인프라: 외부 캐시 구현이 ContentCache 인터페이스에 플러그인
- 품질 검증: 생성된 콘텐츠가 생성 후 검증을 위해 ContentQualityValidator로 흐름

**데이터 흐름:**
```
ContentSpec (생성할 내용)
     |
     v
ContentGenerator.generate()
     |
     +---> tryCache() ---> [캐시 적중] ---> 캐시된 것 반환
     |
     +---> tryTemplate() ---> [템플릿 발견] ---> 적용 & 캐시 ---> 반환
     |
     +---> tryAI() ---> [API 사용 가능] ---> Claude 호출 ---> 파싱 ---> 캐시 ---> 반환
     |
     +---> generateFallback() ---> 기본 콘텐츠 반환
     |
     v
GenerationResult (콘텐츠 + 메타데이터)
```

---

## content-validator.ts - 생성된 학습 콘텐츠에 대한 품질 보증

### 존재 이유

템플릿이든 AI에서든 생성된 콘텐츠에는 오류, 부적절한 자료, 교육학적으로 잘못 정렬된 과제가 포함될 수 있습니다. 저품질 콘텐츠를 학습자에게 제시하면 신뢰와 학습 결과가 손상됩니다. 이 모듈은 콘텐츠가 학습자에게 도달하기 전에 언어적, 교육학적, 기술적, 안전 카테고리 전반에 걸쳐 콘텐츠를 점수화하는 다차원 검증 시스템을 구현합니다. 학습 경험에 미달 콘텐츠가 들어가는 것을 방지하는 품질 게이트 역할을 합니다.

### 핵심 개념 (Key Concepts)

- **ContentQualityValidator 클래스**: 생성된 콘텐츠에 대해 일련의 검사를 실행하고 점수, 계층 할당, 개선 제안이 포함된 포괄적인 ValidationResult를 생성하는 메인 검증 엔진.

- **ValidationResult**: 전체 합격/불합격 상태, 0-100 품질 점수, 달성된 품질 계층, 개별 검사 결과, 실행 가능한 제안, 검증 타임스탬프를 포함하는 완전한 검증 출력.

- **ValidationCheck**: 이름, 카테고리, 합격/불합격 상태, 가중 점수, 설명 메시지가 포함된 단일 품질 검사. 검사는 집계 점수를 위해 카테고리로 그룹화됩니다.

- **ValidationCategory**: 품질 평가의 네 가지 차원:
  - `linguistic`: 단어 수, 문장 구조, 문법, 어휘 수준 적절성
  - `pedagogical`: 의도 정렬, 예상 응답 존재, 지시사항 품질, 인지 부하, 스캐폴딩 가용성
  - `technical`: 비어 있지 않은 콘텐츠, 유효한 구조, 명세 ID 일치
  - `safety`: 콘텐츠 적절성, PII 감지

- **ValidatorConfig**: 최소 전체 점수, 카테고리별 최소값, 엄격 모드 토글, 대상 언어, 간섭 감지를 위한 모국어를 포함한 구성 옵션.

- **LinguisticBenchmark**: CEFR 수준별 어휘 범위, 문장 복잡도 목표, 가독성 점수 범위에 대한 참조 데이터로 언어적 검사를 경험적 표준에 기반하게 합니다.

### 설계 결정 (Design Decisions)

**가중 점수 시스템**: 각 검사에는 전체 및 카테고리 점수에 대한 기여도를 결정하는 가중치(0-1)가 있습니다. 이를 통해 검증 우선순위의 미세 조정이 가능합니다(예: 안전 검사는 콘텐츠 안전을 위해 0.3으로 높게 가중치 부여).

**하드 게이트로서의 안전**: 안전 카테고리 최소값은 기본적으로 100으로 설정되어 다른 점수와 관계없이 안전 실패가 검증을 차단합니다. 이는 콘텐츠 안전의 비타협적 특성을 반영합니다.

**점수에서 계층 결정**: 품질 계층 매핑은 자동입니다(90+ = premium, 70+ = standard, 미만 = fallback), 안전 실패 시 fallback 계층으로 강제됩니다. 이를 통해 다운스트림 품질 기반 결정이 단순화됩니다.

**제안 생성**: 실패한 검사는 사람이 읽을 수 있는 개선 제안을 생성하여 단순한 합격/불합격 판정 대신 콘텐츠 개선을 위한 피드백 루프를 가능하게 합니다.

**단순화된 언어적 검사**: 문법 및 어휘 검사는 전체 NLP 대신 휴리스틱(이중 공백, 대문자화, 단어 길이 평균)을 사용합니다. 이는 성능과 의존성 단순성을 위해 일부 정확도를 희생하며, 프로덕션 시스템은 적절한 NLP 라이브러리를 사용해야 한다는 참고 사항이 있습니다.

**기본 안전 패턴**: 안전 검사는 명백한 부적절한 콘텐츠와 PII(전화번호, 이메일, SSN 패턴)에 대해 정규식 패턴을 사용합니다. 이는 프로덕션 시스템이 콘텐츠 중재 API를 필요로 한다는 것을 인정하면서 기본 보호를 제공합니다.

**인지 부하 검증**: 검증기는 콘텐츠 인지 부하가 교육학적 의도의 예상 부하와 일치하는지 확인하여 의도와 실행 간의 불일치를 포착합니다.

### 통합 포인트 (Integration Points)

**의존성:**
- `./content-spec`: 생성과 검증 간의 계약을 위해 GeneratedContent, ContentSpec, ContentQualityTier 임포트
- `../types`: 지식 컴포넌트 분류를 위해 ComponentType 임포트
- `./pedagogical-intent`: 콘텐츠가 교육 목적과 일치하는지 확인하기 위해 PEDAGOGICAL_INTENTS 임포트

**소비처:**
- 콘텐츠 생성 파이프라인: ContentGenerator가 품질 보증을 위해 생성 후 검증 호출 가능
- 품질 게이트: 상위 수준 오케스트레이터가 콘텐츠를 제시할지 재생성할지 결정하기 위해 검증 결과 사용
- 콘텐츠 큐레이션 도구: 인간 리뷰어가 콘텐츠 라이브러리 개선을 위해 검증 제안 사용
- 분석: 검증 점수가 콘텐츠 품질 메트릭 및 대시보드에 공급

**데이터 흐름:**
```
GeneratedContent + ContentSpec
     |
     v
ContentQualityValidator.validate()
     |
     +---> runLinguisticChecks() ---> 단어 수, 문법, 어휘
     +---> runPedagogicalChecks() ---> 의도, 응답, 스캐폴딩
     +---> runTechnicalChecks() ---> 구조, 명세 일치
     +---> runSafetyChecks() ---> 콘텐츠 안전, PII
     |
     v
카테고리별 점수 집계
     |
     v
임계값에 대한 유효성 결정
     |
     v
품질 계층 할당
     |
     v
개선 제안 생성
     |
     v
ValidationResult (점수, 계층, 검사, 제안)
```
