# LOGOS 백엔드 아키텍처 완전 가이드

> 이 문서는 LOGOS 언어 학습 시스템의 백엔드 구조를 상세히 설명합니다.
> 6단계 파이프라인, 코어 알고리즘, 데이터 흐름을 빠짐없이 다룹니다.
>
> **대상 독자**: 개발자, 연구자, 교육 기술 관계자
> **최종 업데이트**: 2025년 1월 (컴포넌트별 z(w) 벡터 시스템 추가)

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [6단계 학습 파이프라인](#2-6단계-학습-파이프라인)
3. [코어 알고리즘 계층](#3-코어-알고리즘-계층)
4. [컴포넌트별 z(w) 벡터 시스템](#4-컴포넌트별-zw-벡터-시스템)
5. [서비스 계층](#5-서비스-계층)
6. [IPC 핸들러 계층](#6-ipc-핸들러-계층)
7. [데이터베이스 스키마](#7-데이터베이스-스키마)
8. [마스터리 시스템](#8-마스터리-시스템)
9. [우선순위 계산](#9-우선순위-계산)
10. [주요 데이터 흐름](#10-주요-데이터-흐름)
11. [오프라인 모드](#11-오프라인-모드)
12. [용어 사전](#12-용어-사전)

---

## 1. 시스템 개요

LOGOS는 Electron 기반의 **적응형 언어 학습 시스템**입니다. 심리측정학(IRT), 간격 반복(FSRS), 언어학적 분석을 결합하여 개인화된 학습 경험을 제공합니다.

### 핵심 설계 원칙

LOGOS의 백엔드는 네 가지 핵심 원칙을 따릅니다.

**심리측정학적 정밀도**: 모든 학습 항목의 난이도와 사용자의 능력을 Item Response Theory(IRT)로 정밀하게 측정합니다. IRT는 교육 측정 분야에서 70년 이상 검증된 통계 모델로, "이 문제를 맞출 확률"을 수학적으로 계산할 수 있습니다.

**최적 간격 반복**: Free Spaced Repetition Scheduler(FSRS)를 통해 각 항목의 최적 복습 시점을 계산합니다. FSRS는 Ebbinghaus의 망각 곡선을 현대적으로 재해석한 알고리즘으로, 기억이 사라지기 직전에 복습하여 효율을 극대화합니다.

**언어학적 우선순위**: 빈도(Frequency), 관계 밀도(Relational density), 맥락 기여도(contextual contribution E)를 조합한 FRE 공식으로 학습 우선순위를 결정합니다. 단순히 "자주 나오는 단어"가 아니라 "언어 네트워크에서 중요한 위치를 차지하는 단어"를 우선합니다.

**컴포넌트별 학습 최적화**: 언어의 5가지 구성요소(음운, 형태, 어휘, 통사, 화용)는 각각 다른 방식으로 학습됩니다. LOGOS는 각 컴포넌트의 고유한 학습 특성을 반영한 벡터 시스템을 사용합니다.

### 기술 스택

| 기술 | 용도 | 선택 이유 |
|------|------|----------|
| TypeScript | 전체 코드베이스 | 타입 안전성, 자동 완성 |
| Electron | 데스크톱 앱 | 크로스 플랫폼, 오프라인 지원 |
| SQLite + Prisma | 데이터베이스 | 로컬 저장, 타입 안전 ORM |
| Electron IPC | UI 통신 | 프로세스 간 안전한 통신 |
| Anthropic Claude | AI 통합 | 자연어 생성, 응답 평가 |

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LOGOS ELECTRON APP                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐              ┌─────────────────────────────┐   │
│  │   RENDERER PROCESS  │              │      MAIN PROCESS           │   │
│  │   (React UI)        │              │      (Node.js)              │   │
│  │                     │              │                             │   │
│  │  ┌───────────────┐  │    IPC      │  ┌─────────────────────────┐│   │
│  │  │    Pages      │  │◄──────────►│  │     IPC Handlers        ││   │
│  │  │  - Dashboard  │  │              │  │  goal, session, etc.   ││   │
│  │  │  - Session    │  │              │  └──────────┬──────────────┘│   │
│  │  │  - Analytics  │  │              │             │               │   │
│  │  └───────────────┘  │              │  ┌──────────▼──────────────┐│   │
│  │                     │              │  │      Services           ││   │
│  └─────────────────────┘              │  │  6-Stage Pipeline       ││   │
│                                        │  └──────────┬──────────────┘│   │
│                                        │             │               │   │
│                                        │  ┌──────────▼──────────────┐│   │
│                                        │  │   Core Algorithms       ││   │
│                                        │  │   (40+ Pure Modules)    ││   │
│                                        │  └──────────┬──────────────┘│   │
│                                        │             │               │   │
│                                        │  ┌──────────▼──────────────┐│   │
│                                        │  │  Database (SQLite)      ││   │
│                                        │  │  via Prisma ORM         ││   │
│                                        │  └─────────────────────────┘│   │
│                                        └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 6단계 학습 파이프라인

LOGOS의 핵심은 6단계로 구성된 학습 파이프라인입니다. 각 단계는 명확한 책임을 가지며, 순수 알고리즘과 서비스가 협력합니다.

### 파이프라인 개요

```
Stage 0: 언어학적 분석 (Linguistic Analysis)
    │     ► 텍스트에서 학습 객체 추출, 언어학적 특성 분석
    ▼
Stage 1: 학습자 상태 측정 (Learner State)
    │     ► 능력 추정, 마스터리 상태, 자동화 수준 측정
    ▼
Stage 2: 우선순위 계산 (Priority Calculation)
    │     ► FRE 공식 + 컴포넌트별 비용 수정자 적용
    ▼
Stage 3: 과제 생성 (Task Generation)
    │     ► 최적 과제 형식 선택, 콘텐츠 생성
    ▼
Stage 4: 응답 평가 (Response Evaluation)
    │     ► 정확도, 응답 시간, 컴포넌트별 평가
    ▼
Stage 5: 상태 업데이트 (State Update)
    │     ► FSRS 업데이트, 간접 전파, 마일스톤 체크
    └──────► Stage 1로 피드백 (학습 루프 완성)
```

### Stage 0: 언어학적 분석

학습 객체의 언어학적 특성을 분석하여 **컴포넌트별 z(w) 벡터**를 구축합니다.

> **z(w) 벡터란?**
> 각 학습 객체(단어, 문법 패턴, 발음 규칙 등)의 언어학적 특성을 다차원 벡터로 표현한 것입니다. 마치 사람의 DNA가 유전 정보를 담고 있듯이, z(w) 벡터는 학습 객체의 "학습 DNA"를 담고 있습니다.

**담당 코어 모듈**:
| 모듈 | 역할 | 출력 |
|------|------|------|
| `lexical.ts` | LEX 객체 추출 및 어휘 분석 | 빈도, 구체성, 다의어 수준 |
| `morphology.ts` | 형태소 분석, 단어 가족 | 생산성, 투명도, 가족 크기 |
| `g2p.ts` | 자소-음소 변환, 발음 난이도 | G2P 규칙성, 이웃 밀도 |
| `syntactic.ts` | 통사 복잡도 (Lu 지표) | MLC, CN/C, 처리가능성 단계 |
| `pragmatics.ts` | 화용적 분석, 레지스터 | 문화 부하, 공손성 복잡도 |
| `pmi.ts` | 연어 강도 계산 (PMI) | 연어 쌍, PMI 점수 |
| `semantic-network.ts` | 의미망 구축 | 의미 관계 그래프 |
| `component-vectors.ts` | 컴포넌트별 벡터 통합 | 5종 컴포넌트 벡터 |

**컴포넌트별 z(w) 벡터 구성**:

기존의 단일 z(w) 벡터가 아닌, **각 언어 컴포넌트에 특화된 벡터**를 사용합니다:

| 컴포넌트 | 주요 차원 | 학습 특성 |
|----------|----------|----------|
| PHON (음운) | G2P 규칙성, 음운 이웃 밀도, L1 전이 난이도 | 자동화 중심, 청각 우선 |
| MORPH (형태) | 생산성, 투명도, 가족 크기, 파라다임 복잡도 | 규칙 발견, 일반화 |
| LEX (어휘) | 구체성, 다의어, 습득 연령, 연어 강도 | 맥락 학습, 의미망 |
| SYNT (통사) | Lu 복잡도, 내포 깊이, 처리가능성 단계 | 점진적 구조화 |
| PRAG (화용) | 문화 부하, 공손성, 체면 위협 | 맥락 민감성 |

### Stage 1: 학습자 상태 측정

학습자의 현재 능력과 각 객체의 마스터리 상태를 측정합니다.

**담당 코어 모듈**:
- `irt.ts`: IRT 기반 능력 추정 (θ)
- `fsrs.ts`: 간격 반복 상태 관리
- `automatization.ts`: 자동화 수준 측정 (CV, Power Law)
- `state/fluency-diversity-state.ts`: 유창성/다양성 추적
- `bottleneck.ts`: 병목 컴포넌트 분석

**측정 항목**:
| 메트릭 | 설명 | 측정 방법 | 사용처 |
|--------|------|----------|--------|
| θ (Theta) | 전역 및 컴포넌트별 능력 | IRT EAP 추정 | 난이도 매칭 |
| 마스터리 단계 | 0-4 단계 | 정확도 + 안정성 | 과제 형식 선택 |
| 안정성 (S) | FSRS 안정성 | 망각 곡선 역산 | 복습 일정 |
| CV (변동계수) | 응답 시간 일관성 | σ/μ | 자동화 판정 |
| 유창성 지표 | RT 안정성 | 이동 평균 | 단계 진행 |

**자동화 수준 측정** (`automatization.ts`):

> **자동화(Automatization)란?**
> 외국어를 처음 배울 때는 의식적으로 규칙을 적용하지만, 숙달되면 무의식적으로 빠르게 처리합니다. 이 변화를 "자동화"라고 하며, Anderson의 ACT-R 이론과 DeKeyser의 기술 습득 이론에 기반합니다.

```typescript
// CV(Coefficient of Variation) 분석
// CV = 표준편차 / 평균 - 응답 시간의 일관성을 측정
const cvAnalysis = calculateCV(responseTimes);

// 자동화 수준 판정 기준
// CV < 0.15: 고도 자동화 (fully automatic) - 네이티브 수준
// CV 0.15-0.25: 자동화 (automatic) - 유창한 수준
// CV 0.25-0.40: 절차화 (procedural) - 규칙 적용 단계
// CV > 0.40: 선언적 (declarative) - 의식적 처리 단계

// Power Law 적합도 (연습 효과 측정)
const powerLaw = fitPowerLaw(trialResponses);
// RT = a * n^(-b) + c
// a: 초기 반응 시간, b: 학습률, c: 점근선 (최종 반응 시간)
// b가 클수록 빠르게 자동화됨
```

### Stage 2: 우선순위 계산

FRE 공식과 **컴포넌트별 비용 수정자(Cost Modifier)**를 조합하여 학습 우선순위를 결정합니다.

**담당 코어 모듈**:
- `priority.ts`: FRE 기반 우선순위 계산
- `component-vectors.ts`: 컴포넌트별 비용 수정자 계산
- `transfer.ts`: L1-L2 전이 계수
- `transfer-prediction.ts`: L2 내부 전이 효과 예측
- `stage-thresholds.ts`: 단계별 임계값 관리

**확장된 Priority 공식**:

```
기존 공식:
  Priority = FRE / Cost

새로운 공식 (컴포넌트별 비용 반영):
  Priority = FRE / (ComponentCost - TransferBonus + PrerequisitePenalty) + UrgencyBonus

각 요소:
  FRE = w_F × F + w_R × R + w_E × E
  ComponentCost = computeComponentCostModifier(vector)  // 0.5 ~ 2.0
  TransferBonus = l1TransferCoefficient × 0.2           // L1 유사성 보너스
  PrerequisitePenalty = prerequisitesSatisfied ? 0 : 0.5
  UrgencyBonus = goalContext.urgency × 0.1
```

**컴포넌트별 비용 수정자**:

각 컴포넌트는 고유한 학습 난이도 요소를 가집니다:

| 컴포넌트 | 비용 증가 요인 | 비용 감소 요인 |
|----------|---------------|---------------|
| PHON | 불규칙 발음(+50%), L1 간섭(+30%) | 높은 규칙성 |
| MORPH | 낮은 투명도(+40%), 복잡한 패러다임(+20%) | 큰 단어 가족(-30%) |
| LEX | 추상성(+25%), 다의어(+30%), 늦은 습득연령(+25%) | 동계어(-20%) |
| SYNT | 높은 복잡도(+40%), 깊은 내포(+30%) | 낮은 처리가능성 단계 |
| PRAG | 문화 부하(+35%), 공손성 복잡도(+25%) | 높은 레지스터 유연성 |

**전이 효과 예측** (`transfer-prediction.ts`):

> **L2 내부 전이란?**
> 한 단어를 배우면 관련된 다른 단어도 쉬워지는 현상입니다. 예: "unhappy"를 배우면 "happiness", "unhappiness"의 학습 비용이 줄어듭니다.

```typescript
// 전이 관계 유형
type TransferType =
  | 'morphological'   // 형태적 가족 (unhappy → happiness)
  | 'collocational'   // 연어 관계 (make → decision)
  | 'semantic'        // 의미 유사 (big → large)
  | 'syntactic'       // 통사 패턴 공유
  | 'phonological'    // 음성 유사 (rhyme)
  | 'orthographic';   // 철자 유사

// 전이 예측
const prediction = predictTransfer(sourceObject, targetObject, relation);
// 결과: 전이 강도, 방향, 시간에 따른 감쇠율
```

**수준별 FRE 가중치**:
| 수준 | F (빈도) | R (관계) | E (맥락) | 설명 |
|------|----------|----------|----------|------|
| 초급 (θ < -1) | 0.5 | 0.25 | 0.25 | 고빈도 단어 우선 |
| 중급 (-1 ≤ θ < 1) | 0.4 | 0.3 | 0.3 | 균형 잡힌 학습 |
| 고급 (θ ≥ 1) | 0.3 | 0.3 | 0.4 | 맥락적 뉘앙스 중시 |

### Stage 3: 과제 생성

우선순위가 결정된 객체에 대해 **컴포넌트 특성을 반영한 최적의 과제**를 생성합니다.

**담당 코어 모듈**:
- `task-matching.ts`: z(w) 벡터 기반 과제 매칭
- `component-vectors.ts`: `generateTaskDesignParams()` - 컴포넌트별 과제 설계
- `multi-object-selection.ts`: 복합 과제 객체 선택
- `tasks/`: 과제 유형 라이브러리
- `content/`: 콘텐츠 생성 스펙

**컴포넌트별 과제 설계** (`generateTaskDesignParams()`):

각 컴포넌트는 최적의 학습 방식이 다릅니다:

```typescript
// PHON: 청각 중심, 불규칙 패턴은 명시적 교수
if (vector.componentType === 'PHON') {
  if (vector.graphemePhonemeRegularity < 0.5) {
    // 불규칙 발음: 인식 → 단서 회상 → 생산 순서
    recommendedTaskTypes = ['recognition', 'recall_cued', 'production'];
  } else {
    // 규칙적 발음: 빠른 반응 훈련 가능
    recommendedTaskTypes = ['rapid_response', 'production', 'timed'];
  }
  modalityRecommendations = { visual: 0.7, auditory: 0.9, mixed: 0.8 };
}

// MORPH: 시각 중심, 생산적 접사는 단어 형성 과제
if (vector.componentType === 'MORPH') {
  if (vector.productivity > 0.7) {
    // 생산적 접사: 단어 형성 과제로 일반화 유도
    recommendedTaskTypes = ['word_formation', 'recall_free', 'production'];
  } else {
    // 비생산적 접사: 개별 암기
    recommendedTaskTypes = ['recognition', 'recall_cued', 'fill_blank'];
  }
  modalityRecommendations = { visual: 0.9, auditory: 0.4, mixed: 0.6 };
}

// PRAG: 시간 압박 부적합 (성찰 필요), 시나리오 기반
if (vector.componentType === 'PRAG') {
  timePressureAppropriate = false;  // 화용은 성찰 시간 필요
  recommendedTaskTypes = ['register_shift', 'production', 'sentence_writing'];
  modalityRecommendations = { visual: 0.6, auditory: 0.8, mixed: 0.9 };
}
```

**복합 객체 선택** (`multi-object-selection.ts`):

Stage 3 이상에서 여러 객체를 조합한 복합 과제를 구성합니다.

> **인지 부하(Cognitive Load)란?**
> 작업 기억(Working Memory)에 가해지는 부담입니다. 너무 많은 새로운 요소를 한 번에 제시하면 학습 효율이 떨어집니다. LOGOS는 Sweller의 인지 부하 이론에 따라 적절한 복잡도를 유지합니다.

```typescript
// 인지 부하 계산
const cognitiveLoad = calculateCombinedCognitiveLoad(objects);
// 각 컴포넌트별 기본 부하 + 조합 시너지/간섭 효과

// 조합 적합성 평가
const feasibility = evaluateCombinationFeasibility(
  objects,
  userAbility,
  strategy
);
// 결과: 위험 요소, 이점, 예상 성공률

// 지원 객체 선택 (주 학습 대상 + 보조 객체)
const grouping = selectSupportingObjects(
  primaryObject,
  candidates,
  userAbility
);
```

**마스터리 단계별 과제 형식**:
| 단계 | 형식 | 예시 | 인지 과정 |
|------|------|------|----------|
| 0 (새로움) | 소개, 첫 노출 | 정의 제시, 예문 | 주의, 인코딩 |
| 1 (인식) | 객관식, 매칭 | 4지선다 | 재인 |
| 2 (회상) | 빈칸 채우기 | 첫 글자 힌트 | 단서 회상 |
| 3 (통제된 생산) | 자유 응답 | 문장 생성 | 자유 회상 |
| 4 (자동화) | 시간 제한 응답 | 빠른 인식 | 자동 인출 |

### Stage 4: 응답 평가

사용자 응답을 **다차원으로 평가**하고 **캐스케이드 효과**를 감지합니다.

**담당 코어 모듈**:
- `component-evaluation.ts`: 컴포넌트별 평가 프로파일
- `response-timing.ts`: 응답 시간 분석

**컴포넌트별 평가** (`component-evaluation.ts`):

각 언어 컴포넌트는 다른 평가 기준을 가집니다:

```typescript
// 컴포넌트별 평가 프로파일
const profiles = {
  LEX: {
    criteria: ['meaning_accuracy', 'form_accuracy', 'collocation_use', 'register'],
    weights: [0.4, 0.25, 0.2, 0.15],
    automaticityThreshold: 1200,  // ms
    cascadeErrors: ['wrong_meaning']  // 의미 오류는 다른 컴포넌트에 영향
  },
  MORPH: {
    criteria: ['affix_recognition', 'derivation', 'inflection', 'productivity'],
    weights: [0.3, 0.35, 0.25, 0.1],
    automaticityThreshold: 1500,
    cascadeErrors: ['wrong_affix', 'inflection_error']
  },
  PHON: {
    criteria: ['phoneme_accuracy', 'stress_pattern', 'intonation', 'connected'],
    weights: [0.4, 0.25, 0.2, 0.15],
    automaticityThreshold: 1000,  // 가장 빠른 임계값 (기초 컴포넌트)
    cascadeErrors: ['phoneme_substitution']
  },
  SYNT: {
    criteria: ['structure_accuracy', 'agreement', 'word_order', 'complexity'],
    weights: [0.4, 0.25, 0.2, 0.15],
    automaticityThreshold: 2000,
    cascadeErrors: ['word_order_error']
  },
  PRAG: {
    criteria: ['appropriateness', 'register_accuracy', 'speech_act', 'cultural'],
    weights: [0.35, 0.25, 0.25, 0.15],
    automaticityThreshold: 3000,  // 가장 느린 임계값 (고급 컴포넌트)
    cascadeErrors: ['speech_act_failure']
  }
};
```

**캐스케이드 효과 감지**:

> **캐스케이드 효과란?**
> 하위 컴포넌트의 오류가 상위 컴포넌트에 연쇄적으로 영향을 미치는 현상입니다. 예: 발음 오류(PHON) → 형태 혼동(MORPH) → 의미 오해(LEX)

```typescript
// 캐스케이드 순서 (Levelt 1999 기반)
const CASCADE_ORDER = ['PHON', 'MORPH', 'LEX', 'SYNT', 'PRAG'];

// 다중 컴포넌트 평가
const result = evaluateMultiComponent(
  response,
  targetComponents,
  context
);
// 결과: 개별 점수 + 캐스케이드 효과 + 병목 컴포넌트 식별
```

**CEFR 수준별 평가 가중치**:
| 수준 | 형태 | 의미 | 화용 | 스타일 | 평가 초점 |
|------|------|------|------|--------|----------|
| A1-A2 | 0.5 | 0.3 | 0.1 | 0.1 | 기본 형태 정확성 |
| B1-B2 | 0.35 | 0.3 | 0.2 | 0.15 | 균형 잡힌 평가 |
| C1-C2 | 0.15 | 0.25 | 0.3 | 0.3 | 화용적 적절성, 스타일 |

### Stage 5: 상태 업데이트

평가 결과를 바탕으로 학습자 상태와 객체 상태를 업데이트하고, **관련 객체에 간접 효과를 전파**합니다.

**담당 코어 모듈**:
- `fsrs.ts`: 간격 반복 업데이트
- `indirect-update.ts`: 관련 객체 간접 업데이트
- `milestone-events.ts`: 마일스톤 달성 이벤트

**간접 업데이트** (`indirect-update.ts`):

한 객체 학습이 관련 객체에 미치는 파급 효과를 전파합니다.

> **간접 업데이트란?**
> "unhappy"를 마스터하면 "happiness", "unhappiness"도 일부 학습된 것으로 간주하는 시스템입니다. 형태적, 의미적, 연어적 관계에 따라 전파 강도가 다릅니다.

```typescript
// 관계별 전파 가중치
const relationshipWeights = {
  morphological: 0.8,   // 형태적 가족: 가장 강한 전파
  collocational: 0.5,   // 연어 관계
  semantic: 0.4,        // 의미 유사
  syntactic: 0.3,       // 통사 패턴
  phonological: 0.25,   // 음성 유사
  orthographic: 0.2,    // 철자 유사
};

// 업데이트 전파
const result = propagateUpdate(
  sourceEvent,      // 원본 학습 이벤트
  relatedObjects,   // 관련 객체 목록
  relations,        // 관계 정보
  config           // 전파 설정
);

// 전파 결과:
// - 난이도 조정: 관련 객체의 IRT 난이도 하향
// - 안정성 부스트: FSRS 안정성 일부 증가
// - 우선순위 조정: 학습 대기열 위치 변경
```

**마일스톤 이벤트** (`milestone-events.ts`):

학습 성취를 추적하고 UI에 알림을 제공합니다.

```typescript
// 마일스톤 유형
type MilestoneType =
  | 'stage_transition'    // 단계 진행 (0→1, 1→2, ...)
  | 'accuracy_threshold'  // 정확도 달성 (70%, 80%, 90%, 95%)
  | 'automatization'      // 자동화 달성 (CV < 0.15)
  | 'vocabulary_count'    // 어휘 수 달성 (100, 500, 1000, 5000)
  | 'streak'              // 연속 학습일 (7, 30, 100일)
  | 'first_mastery'       // 첫 마스터리 (첫 Stage 4 달성)
  | 'perfect_session';    // 완벽한 세션 (100% 정확도)

// 마일스톤 우선순위 (UI 표시 순서)
const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

// 마일스톤 감지
const milestones = registry.checkProgress(currentState, previousState);
// 감지된 마일스톤은 이벤트로 발행되어 UI에 표시
```

**학습 궤적 예측** (`predictLearningTrajectory()`):

각 객체가 다음 단계에 도달하기까지 필요한 노출 횟수를 예측합니다.

```typescript
// 단계별 기본 노출 횟수
const BASE_EXPOSURES = {
  0: 15,  // 새로움 → 인식
  1: 20,  // 인식 → 회상
  2: 25,  // 회상 → 통제된 생산
  3: 30,  // 통제된 생산 → 자동화
  4: 10,  // 유지 학습
};

// 컴포넌트별 수정자 적용
// PHON: 불규칙 패턴 +50%, L1 간섭 +30%
// MORPH: 큰 가족 -20%, 낮은 투명도 +30%
// LEX: 추상적 +20%, 다의어 +20%, 동계어 -20%
// SYNT: 복잡도 비례 증가, 깊은 내포 +30%
// PRAG: 문화 부하 +40%, 공손성 복잡도 +30%

const prediction = predictLearningTrajectory(vector, historicalPerformance);
// 결과: 예상 노출 횟수, 예상 일수, 핵심 요인, 병목 위험도, 권장 개입
```

---

## 3. 코어 알고리즘 계층

코어 알고리즘은 `src/core/` 디렉토리에 위치하며, **순수 함수**로만 구성됩니다. 데이터베이스나 I/O에 접근하지 않아 테스트와 재사용이 용이합니다.

### 디렉토리 구조

```
src/core/
├── index.ts                    # 중앙 export (40+ 모듈)
├── types.ts                    # 공유 타입 정의 (2800+ 줄)
│
├── # 학습 메트릭
├── irt.ts                      # Item Response Theory
├── fsrs.ts                     # Free Spaced Repetition Scheduler
├── priority.ts                 # FRE 우선순위 계산
├── bottleneck.ts               # 병목 분석
│
├── # 언어학적 분석 (Stage 0)
├── lexical.ts                  # LEX 객체 추출
├── morphology.ts               # 형태소 분석
├── g2p.ts                      # 자소-음소 변환
├── syntactic.ts                # 통사 분석
├── pragmatics.ts               # 화용 분석
├── pmi.ts                      # PMI 계산
├── semantic-network.ts         # 의미망
│
├── # 컴포넌트 벡터 시스템 ★신규
├── component-vectors.ts        # 5종 컴포넌트별 z(w) 벡터
│
├── # 학습자 상태 (Stage 1)
├── automatization.ts           # 자동화 수준 측정
├── response-timing.ts          # 응답 시간 분석
├── quadrature.ts               # 가우스 구적법 (EAP용)
│
├── # 전이 효과 (Stage 2)
├── transfer.ts                 # L1-L2 전이
├── transfer-prediction.ts      # L2 내부 전이 예측
├── stage-thresholds.ts         # 단계 임계값
│
├── # 과제 생성 (Stage 3)
├── task-matching.ts            # 과제 매칭
├── multi-object-selection.ts   # 복합 객체 선택
├── tasks/                      # 과제 유형 라이브러리
├── content/                    # 콘텐츠 스펙
├── grammar/                    # 문법 시퀀스
│
├── # 평가 (Stage 4)
├── component-evaluation.ts     # 컴포넌트별 평가
│
├── # 상태 업데이트 (Stage 5)
├── indirect-update.ts          # 간접 업데이트
├── milestone-events.ts         # 마일스톤 이벤트
│
├── # 상태 관리
├── state/
│   ├── index.ts
│   ├── component-object-state.ts
│   ├── component-search-engine.ts
│   └── fluency-diversity-state.ts
│
└── register/                   # 레지스터 프로파일링
```

### 핵심 알고리즘 상세

#### IRT (Item Response Theory) - `irt.ts`

학습자 능력과 문항 특성을 수학적으로 모델링합니다.

> **IRT란?**
> "이 학생이 이 문제를 맞출 확률은 얼마인가?"를 계산하는 통계 모델입니다. 학생의 능력(θ)과 문제의 난이도(b)를 같은 척도에 놓아 정밀한 매칭이 가능합니다.

**모델 종류**:

| 모델 | 공식 | 파라미터 | 용도 |
|------|------|----------|------|
| 1PL (Rasch) | P = 1/(1+e^(-(θ-b))) | b: 난이도 | 단순 측정 |
| 2PL | P = 1/(1+e^(-a(θ-b))) | a: 변별도, b: 난이도 | 일반 측정 |
| 3PL | P = c + (1-c)/(1+e^(-a(θ-b))) | a, b, c: 추측 | 객관식 문항 |

**추정 방법**:

```typescript
// MLE (Maximum Likelihood Estimation): 최대우도추정
// 관찰된 응답 패턴이 나타날 확률을 최대화하는 θ 탐색
const thetaMLE = estimateThetaMLE(responses, items);

// EAP (Expected A Posteriori): 베이지안 사후기대값
// 사전 분포(보통 N(0,1))와 우도를 결합한 사후 분포의 기대값
// 가우스 구적법(Gauss-Hermite Quadrature)으로 수치 적분
const thetaEAP = estimateThetaEAP(responses, items);

// 적응형 테스트를 위한 다음 문항 선택
// 'max_info': 현재 θ에서 Fisher Information이 최대인 문항
// 'kl': Kullback-Leibler 정보 최대화
const nextItem = selectNextItem(items, theta, 'max_info');
```

#### FSRS (Free Spaced Repetition Scheduler) - `fsrs.ts`

최적 복습 간격을 계산합니다.

> **FSRS란?**
> SuperMemo의 SM-2 알고리즘을 개선한 현대적 간격 반복 알고리즘입니다. "기억이 사라지기 직전"에 복습하여 효율을 극대화합니다.

**핵심 개념**:

| 개념 | 설명 | 공식/범위 |
|------|------|----------|
| 안정성 (S) | 90% 회수율 유지 가능 일수 | 0 ~ ∞ |
| 난이도 (D) | 학습 난이도 | 1 ~ 10 |
| 회수율 (R) | 현재 기억 강도 | R = e^(-t/S) |

**등급 체계**:
| 등급 | 이름 | 설명 | 안정성 영향 |
|------|------|------|-------------|
| 1 | Again | 완전 망각, 처음부터 | S → 초기값 |
| 2 | Hard | 어렵게 회상 | S × 0.7 |
| 3 | Good | 적절히 회상 | S × 2.5 |
| 4 | Easy | 즉시 회상 | S × 4.0 |

```typescript
// FSRS 카드 상태 업데이트
const updatedCard = fsrs.repeat(card, now, rating);
// 결과: 새 안정성, 새 난이도, 다음 복습 일자

// 마스터리 상태 업데이트
const newMastery = updateMastery(
  currentMastery,
  responseData,  // { isCorrect, responseTime, cueLevel }
  now
);
```

#### 자동화 측정 - `automatization.ts`

Anderson의 ACT-R과 DeKeyser의 Skill Acquisition Theory에 기반한 자동화 수준 측정입니다.

> **왜 자동화가 중요한가?**
> 언어 능력의 궁극적 목표는 "생각 없이" 사용하는 것입니다. 자동화 수준을 측정해야 진정한 숙달 여부를 판단할 수 있습니다.

```typescript
// CV(Coefficient of Variation) 분석
// CV = 표준편차 / 평균
const cvAnalysis = calculateCV(responseTimes);
// {
//   cv: 0.12,
//   category: 'highly_automatic',
//   interpretation: '응답 시간이 매우 일관적'
// }

// 자동화 카테고리
type AutomatizationCategory =
  | 'declarative'     // CV > 0.40: 의식적 처리, 규칙 적용
  | 'procedural'      // CV 0.25-0.40: 절차화, 반자동
  | 'automatic'       // CV 0.15-0.25: 자동화, 유창
  | 'fully_automatic'; // CV < 0.15: 고도 자동화, 네이티브급

// Power Law 적합 (연습 효과)
const powerLaw = fitPowerLaw(trialResponses);
// RT = a * n^(-b) + c
// a: 초기 RT (첫 시도 반응 시간)
// b: 학습률 (클수록 빠르게 자동화)
// c: 점근선 (최종 반응 시간, 이론적 한계)

// 종합 자동화 프로파일
const profile = createAutomatizationProfile(objectId, observations);
// {
//   automatizationLevel: 0.78,  // 0-1
//   category: 'automatic',
//   powerLaw: { a, b, c, r2 },
//   cvAnalysis: { cv, trend },
//   recommendation: 'Ready for time-pressured tasks'
// }
```

---

## 4. 컴포넌트별 z(w) 벡터 시스템

**2025년 1월 신규 추가**

기존의 단일 z(w) 벡터를 확장하여 각 언어 컴포넌트(PHON, MORPH, LEX, SYNT, PRAG)에 특화된 벡터 시스템을 도입했습니다.

### 설계 원칙

1. **공통 기반 + 컴포넌트별 확장**: 모든 벡터는 `BaseComponentVector`를 상속하며, 각 컴포넌트는 고유한 차원을 추가합니다.

2. **동일한 FRE 공식, 다른 측정 방식**: F, R, E는 모든 컴포넌트에서 사용되지만, 측정 방법이 다릅니다.

3. **비용 수정자를 통한 학습 난이도 반영**: 각 컴포넌트의 고유한 학습 특성이 Priority 계산에 반영됩니다.

### 베이스 벡터 (`BaseComponentVector`)

모든 컴포넌트 벡터의 공통 인터페이스입니다.

```typescript
interface BaseComponentVector {
  // 식별
  objectId: string;
  componentType: 'PHON' | 'MORPH' | 'LEX' | 'SYNT' | 'PRAG';
  content: string;

  // FRE 메트릭 (컴포넌트별 측정 방식 상이)
  frequency: number;           // F: 0-1
  relationalDensity: number;   // R: 0-1
  contextualContribution: number; // E: 0-1

  // 학습 상태
  masteryStage: MasteryStage;  // 0-4
  automationLevel: number;      // 0-1
  usageSpaceCoverage: number;   // 0-1
  priority: number;
  irtDifficulty: number;        // -3 ~ +3
  l1TransferCoefficient: number; // -1 ~ +1

  // 전제조건 상태
  prerequisitesSatisfied: boolean;
  supportsComponents: ComponentCode[];    // 상위 컴포넌트
  dependsOnComponents: ComponentCode[];   // 하위 컴포넌트
}
```

### PHONVector (음운/철자)

**학술적 기반**: Ehri의 G2P 모델, Vitevitch & Luce (2004) 음운 이웃 밀도

> **음운 컴포넌트란?**
> 소리와 철자의 관계를 다룹니다. 영어에서 "knight"의 'k'가 묵음인 것처럼, 철자와 발음의 불일치는 학습 난이도에 큰 영향을 미칩니다.

**주요 차원**:

| 차원 | 설명 | 범위 | 학습 영향 |
|------|------|------|----------|
| `graphemePhonemeRegularity` | G2P 규칙성 | 0-1 | 불규칙할수록 명시적 교수 필요 |
| `phonologicalNeighborhoodDensity` | 음운 이웃 밀도 | 0-1 | 높으면 혼동 가능성↑, 일반화↑ |
| `g2pEntropy` | G2P 엔트로피 | bits | 발음 예측 불확실성 |
| `stressPredictability` | 강세 예측가능성 | 0-1 | 다음절 단어 학습에 중요 |
| `l1TransferDifficulty` | L1 전이 난이도 | 0-1 | L1 간섭 정도 |

**비용 수정자 계산**:
```typescript
function computePHONCostModifier(vector: PHONVector): number {
  // 불규칙성이 비용을 증가시킴
  const irregularityCost = (1 - vector.graphemePhonemeRegularity) * 0.5;
  // L1 전이 난이도
  const transferCost = vector.l1TransferDifficulty * 0.3;
  // 높은 이웃 밀도는 초기에 혼동 유발
  const densityCost = vector.phonologicalNeighborhoodDensity > 0.7 ? 0.1 : 0;
  // 묵음 문자
  const silentLetterCost = vector.hasSilentLetters ? 0.1 : 0;

  return Math.max(0.5, Math.min(2.0,
    1.0 + irregularityCost + transferCost + densityCost + silentLetterCost
  ));
}
// 결과: 0.5(매우 쉬움) ~ 2.0(매우 어려움)
```

### MORPHVector (형태론)

**학술적 기반**: Hay & Baayen (2005) 생산성, MorphoLex (Sanchez-Gutierrez 2018)

> **형태론 컴포넌트란?**
> 단어의 내부 구조를 다룹니다. "unhappiness"가 "un-happy-ness"로 분해되는 것처럼, 접두사/접미사의 규칙을 이해하면 새로운 단어 학습이 쉬워집니다.

**주요 차원**:

| 차원 | 설명 | 범위 | 학습 영향 |
|------|------|------|----------|
| `productivity` | 생산성 | 0-1 | 높으면 새 단어에 적용 가능 |
| `transparency` | 투명도 | 0-1 | 의미 예측가능성 |
| `familySize` | 단어 가족 크기 | 개수 | 클수록 네트워크 효과↑ |
| `familyFrequencySum` | 가족 빈도 합계 | 빈도 | 간접 노출 기회 |
| `paradigmComplexity` | 패러다임 복잡도 | 0-1 | 굴절 규칙 복잡성 |
| `derivationalDepth` | 파생 깊이 | 단계 | nation→national→nationality |
| `allomorphCount` | 이형태 수 | 개수 | -s/-es/-ies 같은 변이형 |

**비용 수정자 계산**:
```typescript
function computeMORPHCostModifier(vector: MORPHVector): number {
  // 낮은 생산성 = 개별 암기 필요
  const productivityCost = (1 - vector.productivity) * 0.3;
  // 낮은 투명도 = 의미 추론 불가
  const transparencyCost = (1 - vector.transparency) * 0.4;
  // 큰 가족 = 강화 기회 (보너스)
  const familySizeBonus = Math.min(0.3, vector.familySize / 30 * 0.3);
  // 복잡한 패러다임
  const paradigmCost = vector.paradigmComplexity * 0.2;
  // 깊은 파생
  const derivationCost = Math.min(0.2, vector.derivationalDepth * 0.05);

  return Math.max(0.5, Math.min(2.0,
    1.0 + productivityCost + transparencyCost + paradigmCost + derivationCost - familySizeBonus
  ));
}
```

### LEXVector (어휘)

**학술적 기반**: Nation (2001), Brysbaert 구체성, Kuperman 습득연령

> **어휘 컴포넌트란?**
> 개별 단어의 의미와 용법을 다룹니다. "unprecedented"가 "이전에 없던"이라는 의미를 갖고, 격식체에서 주로 쓰인다는 지식입니다.

**주요 차원**:

| 차원 | 설명 | 범위 | 학습 영향 |
|------|------|------|----------|
| `concreteness` | 구체성 | 0-1 | 추상적일수록 맥락 의존 |
| `imageability` | 심상성 | 0-1 | 시각화 가능성 |
| `polysemyCount` | 다의어 수 | 개수 | 많을수록 맥락 학습 필요 |
| `ageOfAcquisition` | 습득 연령 | 년 | L1 화자 습득 나이 |
| `registerFlexibility` | 레지스터 유연성 | 0-1 | 다양한 상황 사용 가능성 |
| `avgCollocationStrength` | 평균 연어 강도 | PMI | 연어 파트너와의 결합 강도 |
| `cognateStatus` | 동계어 여부 | bool | L1과 형태/의미 유사 |

**비용 수정자 계산**:
```typescript
function computeLEXCostModifier(vector: LEXVector): number {
  // 추상적 단어
  const abstractnessCost = (1 - vector.concreteness) * 0.25;
  // 다의어
  const polysemyCost = Math.min(0.3, vector.polysemyCount / 10 * 0.3);
  // 늦은 습득 연령
  const aoaCost = Math.min(0.25, (vector.ageOfAcquisition - 5) / 15 * 0.25);
  // 동계어 효과
  let cognateEffect = 0;
  if (vector.cognateStatus.isCognate && !vector.cognateStatus.falseFriendRisk) {
    cognateEffect = -0.2;  // 동계어는 쉬움
  } else if (vector.cognateStatus.falseFriendRisk) {
    cognateEffect = 0.2;   // 가짜 동계어는 주의 필요
  }

  return Math.max(0.5, Math.min(2.0,
    1.0 + abstractnessCost + polysemyCost + aoaCost + cognateEffect
  ));
}
```

### SYNTVector (통사)

**학술적 기반**: Lu (2010, 2011) 복잡도 지표, Pienemann 처리가능성 이론

> **통사 컴포넌트란?**
> 문장 구조와 문법 규칙을 다룹니다. "The man who I met yesterday was my teacher"에서 관계절의 위치와 구조를 이해하는 것입니다.

**주요 차원**:

| 차원 | 설명 | 범위 | 학습 영향 |
|------|------|------|----------|
| `meanLengthOfClause` | 평균 절 길이 (MLC) | 단어수 | 정보 밀도 |
| `complexNominalsPerClause` | 절당 복합 명사구 (CN/C) | 개수 | 학술 텍스트 특성 |
| `dependentClausesPerClause` | 절당 종속절 (DC/C) | 비율 | 내포 복잡도 |
| `complexityScore` | 종합 복잡도 | 0-1 | Lu 지표 종합 |
| `embeddingDepth` | 내포 깊이 | 단계 | 절 중첩 수준 |
| `processabilityStage` | 처리가능성 단계 | 1-5 | Pienemann 이론 |
| `cefrLevel` | CEFR 수준 | A1-C2 | 유럽 기준 |

**처리가능성 이론 (Pienemann)**:

> **처리가능성 이론이란?**
> 학습자는 문법을 정해진 순서로 습득합니다. 3단계 구조를 배우기 전에 2단계를 먼저 마스터해야 합니다.

| 단계 | 구조 유형 | 예시 |
|------|----------|------|
| 1 | 단어/고정 표현 | "Hello", "Thank you" |
| 2 | 어순 규칙 | SVO 기본 어순 |
| 3 | 구 내부 일치 | "a big house" (관사-형용사-명사) |
| 4 | 절 내부 일치 | 주어-동사 수일치 |
| 5 | 절 간 이동 | 의문문 도치, 관계절 |

**비용 수정자 계산**:
```typescript
function computeSYNTCostModifier(vector: SYNTVector): number {
  // 복잡도 직접 반영
  const complexityCost = vector.complexityScore * 0.4;
  // 깊은 내포
  const embeddingCost = Math.min(0.3, vector.embeddingDepth * 0.1);
  // 복잡한 논항 구조
  const argumentCost = vector.argumentComplexity * 0.15;
  // 긴 의존 거리
  const dependencyCost = Math.min(0.15, vector.avgDependencyDistance / 10 * 0.15);
  // 처리가능성 단계
  const processabilityCost = (vector.processabilityStage - 1) * 0.05;

  return Math.max(0.5, Math.min(2.0,
    1.0 + complexityCost + embeddingCost + argumentCost + dependencyCost + processabilityCost
  ));
}
```

### PRAGVector (화용)

**학술적 기반**: Brown & Levinson (1987) 공손성, Joos (1967) 레지스터

> **화용 컴포넌트란?**
> 맥락에 맞는 언어 사용을 다룹니다. "Can you pass the salt?"가 질문이 아니라 요청이라는 것, 상사에게는 "Could you possibly..."를 사용해야 한다는 것입니다.

**주요 차원**:

| 차원 | 설명 | 범위 | 학습 영향 |
|------|------|------|----------|
| `registerFlexibility` | 레지스터 유연성 | 0-1 | 다양한 상황 사용 가능 |
| `culturalLoad` | 문화 부하 | 0-1 | 문화 특수성 |
| `politenessComplexity` | 공손성 복잡도 | 0-1 | 공손 전략 조절 필요 |
| `faceThreatPotential` | 체면 위협 잠재력 | 0-1 | 화행의 위험도 |
| `powerSensitivity` | 권력 민감도 | 0-1 | 상하 관계 중요성 |
| `distanceSensitivity` | 거리 민감도 | 0-1 | 친밀도 중요성 |
| `indirectnessLevel` | 간접성 수준 | 0-1 | 문자적/함축적 |

**공손성 전략 (Brown & Levinson)**:

> **체면(Face)이란?**
> 모든 사람이 가진 두 가지 욕구: 긍정적 체면(인정받고 싶음)과 부정적 체면(방해받지 않고 싶음). 요청은 상대의 부정적 체면을 위협합니다.

| 전략 | 설명 | 예시 |
|------|------|------|
| Bald on-record | 직접적 | "Close the window." |
| Positive politeness | 친밀감 | "Could you close the window, buddy?" |
| Negative politeness | 공손/거리 | "Would you mind closing the window?" |
| Off-record | 간접적/암시 | "It's cold in here." |

**비용 수정자 계산**:
```typescript
function computePRAGCostModifier(vector: PRAGVector): number {
  // 문화 부하
  const culturalCost = vector.culturalLoad * 0.35;
  // 공손성 복잡도
  const politenessCost = vector.politenessComplexity * 0.25;
  // 체면 위협
  const faceThreatCost = vector.faceThreatPotential * 0.2;
  // 전이 위험
  const transferRiskCost = vector.pragmaticTransferRisk * 0.1;
  // 간접성
  const indirectnessCost = vector.indirectnessLevel * 0.1;

  return Math.max(0.5, Math.min(2.0,
    1.0 + culturalCost + politenessCost + faceThreatCost + transferRiskCost + indirectnessCost
  ));
}
```

### 타입 가드와 사용 예시

```typescript
// 컴포넌트별 타입 가드
if (isPHONVector(vector)) {
  // PHON 전용 속성 접근 가능
  console.log(vector.graphemePhonemeRegularity);
}

// 통합 비용 계산
const cost = computeComponentCostModifier(vector);  // 자동 디스패치

// 과제 설계 파라미터 생성
const taskParams = generateTaskDesignParams(vector, 'stabilization');
// {
//   componentType: 'LEX',
//   recommendedTaskTypes: ['definition_match', 'recall_free'],
//   targetProcess: 'recall',
//   modalityRecommendations: { visual: 0.8, auditory: 0.6, mixed: 0.7 },
//   timePressureAppropriate: true
// }

// 학습 궤적 예측
const trajectory = predictLearningTrajectory(vector, history);
// {
//   exposuresToNextStage: 25,
//   predictedDaysToMastery: 8,
//   keyFactors: [{ factor: 'High concreteness', impact: 'accelerating' }],
//   bottleneckRisk: 0.2,
//   recommendedInterventions: []
// }
```

---

## 5. 서비스 계층

서비스 계층은 `src/main/services/`에 위치하며, 비즈니스 로직과 I/O를 담당합니다.

### 디렉토리 구조

```
src/main/services/
│
├── # 3-Layer Pipeline (레거시 호환)
├── state-priority.service.ts      # Layer 1: 큐 빌딩
├── task-generation.service.ts     # Layer 2: 과제 생성
├── scoring-update.service.ts      # Layer 3: 응답 처리
│
├── # 6-Stage Pipeline 통합
├── integrated-task-pipeline.service.ts  # Stage 2-3 통합
├── multi-layer-evaluation.service.ts    # Stage 4 다층 평가
├── multi-object-calibration.service.ts  # 복합 객체 캘리브레이션
├── task-composition.service.ts          # Stage 3 과제 구성
├── constraint-propagation.service.ts    # 제약 전파
├── usage-space-tracking.service.ts      # 사용 공간 추적
│
├── # 외부 통합
├── claude.service.ts              # Claude API 통합
├── offline-queue.service.ts       # 오프라인 큐
├── pmi.service.ts                 # PMI DB 작업
│
├── # 에이전트 시스템
├── agent-trigger.service.ts       # 병목 감지 에이전트
├── agent-hooks.service.ts         # 작업 훅
│
├── # 분석
├── diagnostic-assessment.service.ts     # 진단 평가
├── generalization-estimation.service.ts # 일반화 추정
│
└── corpus-sources/                # 코퍼스 관리
    ├── registry.ts
    ├── filter.ts
    └── corpus-pipeline.service.ts
```

### 주요 서비스 상세

#### State-Priority Service

"다음에 무엇을 학습할 것인가"를 결정합니다.

```typescript
// 1. 사용자 상태 조회
const userState = await getUserState(userId);
// θ (전역), θ_phon, θ_morph, θ_lex, θ_synt, θ_prag

// 2. 학습 객체별 우선순위 계산
const priorities = await Promise.all(
  objects.map(obj => computeComponentPriority(
    obj.vector,
    userState,
    goalContext
  ))
);

// 3. 긴급도, 병목, 전제조건으로 조정
const adjustedQueue = priorities
  .map(p => ({
    ...p,
    urgency: computeUrgency(p.objectId),
    bottleneckBoost: getBottleneckBoost(p.componentType, userState),
  }))
  .filter(p => p.prerequisitesSatisfied)
  .sort((a, b) => b.finalScore - a.finalScore);

// 4. 최종 학습 큐 반환
return adjustedQueue.slice(0, MAX_QUEUE_SIZE);
```

#### Task-Generation Service

"어떤 형식의 과제를 제시할 것인가"를 결정합니다.

```typescript
// 1. 컴포넌트별 과제 설계 파라미터 획득
const taskParams = generateTaskDesignParams(
  vector,
  learningGoal
);

// 2. 마스터리 단계에 따른 과제 형식 결정
const taskFormat = selectTaskFormat(
  object.masteryStage,
  taskParams.recommendedTaskTypes
);

// 3. Claude API 또는 템플릿으로 콘텐츠 생성
let content;
try {
  content = await claudeService.generateTask(object, taskFormat, {
    timeout: 10000  // 10초 타임아웃
  });
} catch {
  // 오프라인 폴백
  content = await templateService.generateTask(object, taskFormat);
}

// 4. 과제 반환
return {
  object,
  format: taskFormat,
  content,
  modalityRecommendation: taskParams.modalityRecommendations,
  expectedDifficulty: taskParams.difficultyModifiers[taskFormat]
};
```

#### Claude Service

Anthropic Claude API와의 통합을 관리합니다.

| 기능 | 용도 | 캐시 TTL |
|------|------|----------|
| 동적 콘텐츠 생성 | 과제 텍스트, 예문 | 30분 |
| 자유 응답 평가 | 문장 생성 과제 채점 | 없음 |
| 어휘 추출 | 텍스트에서 학습 객체 추출 | 1시간 |
| 오프라인 폴백 | 네트워크 없을 때 대체 | - |

```typescript
// Claude API 호출 예시
const response = await claude.generateContent({
  prompt: buildPrompt(object, taskFormat),
  maxTokens: 500,
  temperature: 0.7,
});

// 캐싱 적용
const cacheKey = `task:${object.id}:${taskFormat}`;
const cached = await cache.get(cacheKey);
if (cached) return cached;

const result = await generateContent(...);
await cache.set(cacheKey, result, { ttl: 30 * 60 * 1000 });
```

---

## 6. IPC 핸들러 계층

IPC 핸들러는 `src/main/ipc/`에 위치하며, UI와 메인 프로세스 간 통신을 담당합니다.

### 핸들러 목록

| 파일 | 역할 | 주요 채널 |
|------|------|----------|
| `goal.ipc.ts` | 학습 목표 관리 | goal:create, goal:list, goal:delete |
| `session.ipc.ts` | 학습 세션 | session:start, session:submit-response, session:end |
| `learning.ipc.ts` | 학습 객체/큐 | object:get, object:update, queue:get |
| `claude.ipc.ts` | AI 통합 | claude:generateContent, claude:evaluate |
| `agent.ipc.ts` | 에이전트 | agent:detectTriggers, agent:execute |
| `profile.ipc.ts` | 프로필/설정 | profile:get, profile:updateSettings |
| `sync.ipc.ts` | 동기화 | sync:status, sync:force |
| `onboarding.ipc.ts` | 온보딩 | onboarding:start, onboarding:complete |

### 세션 흐름 예시

```
1. session:start
   ├─► Session 생성 (ID, 시작 시간)
   ├─► 학습 큐 생성 (Stage 1-2)
   └─► 첫 과제 반환 (Stage 3)

2. session:submit-response [반복]
   ├─► 응답 수신 (정답, 응답 시간, 단서 수준)
   ├─► Stage 4: 다차원 평가
   │   ├─► 정확도 평가
   │   ├─► 응답 시간 분석
   │   └─► 컴포넌트별 평가
   ├─► Stage 5: 상태 업데이트
   │   ├─► FSRS 업데이트
   │   ├─► 마스터리 업데이트
   │   ├─► 간접 업데이트 전파
   │   └─► 마일스톤 체크
   └─► 다음 과제 반환 (Stage 3)

3. session:end
   ├─► 세션 통계 집계
   │   ├─► 총 문항 수, 정답률
   │   ├─► 평균 응답 시간
   │   ├─► 컴포넌트별 성과
   │   └─► 달성 마일스톤
   ├─► IRT 캘리브레이션 스케줄 (조건 충족 시)
   └─► 세션 요약 반환
```

---

## 7. 데이터베이스 스키마

Prisma ORM을 통해 SQLite 데이터베이스를 관리합니다.

### 핵심 테이블

#### User
```prisma
model User {
  id               String   @id @default(uuid())
  nativeLanguage   String   // 'ko', 'ja', 'zh', 'es', etc.
  targetLanguage   String   // 'en-US', 'en-GB', etc.

  // 전역 및 컴포넌트별 능력 추정치
  thetaGlobal      Float    @default(0)    // -3 ~ +3
  thetaPhonology   Float    @default(0)
  thetaMorphology  Float    @default(0)
  thetaLexical     Float    @default(0)
  thetaSyntactic   Float    @default(0)
  thetaPragmatic   Float    @default(0)

  // 메타데이터
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // 관계
  goals            Goal[]
  sessions         Session[]
  masteryStates    MasteryState[]
}
```

#### LanguageObject
```prisma
model LanguageObject {
  id                     String  @id @default(uuid())
  content                String  // 학습 내용 (단어, 문법 패턴 등)
  type                   String  // PHON, MORPH, LEX, SYNT, PRAG

  // 기본 z(w) 벡터
  frequency              Float   @default(0)   // F: 코퍼스 빈도
  relationalDensity      Float   @default(0)   // R: 연어 허브 점수
  contextualContribution Float   @default(0)   // E: 맥락 기여도

  // 컴포넌트별 확장 메트릭 (JSON 저장)
  componentMetrics       String  @default("{}")  // 컴포넌트별 상세 벡터

  // 레거시 메트릭 (호환성)
  morphologicalScore     Float   @default(0)
  phonologicalDifficulty Float   @default(0)
  syntacticComplexity    Float   @default(0)
  pragmaticScore         Float   @default(0)

  // IRT 파라미터
  irtDifficulty          Float   @default(0)    // b: -3 ~ +3
  irtDiscrimination      Float   @default(1)    // a: 0.5 ~ 2.5
  irtGuessing            Float   @default(0)    // c: 0 ~ 0.25

  // 계산된 우선순위
  priority               Float   @default(0)

  // 관계
  goalId                 String
  goal                   Goal    @relation(fields: [goalId], references: [id])
  masteryState           MasteryState?
  responses              Response[]

  @@index([goalId, priority(sort: Desc)])
  @@index([type])
}
```

#### MasteryState
```prisma
model MasteryState {
  id                 String   @id @default(uuid())
  objectId           String   @unique
  object             LanguageObject @relation(fields: [objectId], references: [id])

  // 마스터리 단계
  stage              Int      @default(0)  // 0-4

  // FSRS 상태
  fsrsDifficulty     Float    @default(5)   // 1-10
  fsrsStability      Float    @default(0)   // 일수
  fsrsLastReview     DateTime?
  fsrsReps           Int      @default(0)   // 총 복습 횟수
  fsrsLapses         Int      @default(0)   // 망각 횟수

  // 정확도 추적
  cueFreeAccuracy    Float    @default(0)   // 단서 없는 정확도
  cueAssistedAccuracy Float   @default(0)   // 단서 있는 정확도
  exposureCount      Int      @default(0)   // 총 노출 횟수

  // 자동화 메트릭
  automationLevel    Float    @default(0)   // 0-1
  cvScore            Float?                  // 변동계수

  // 스케줄링
  nextReview         DateTime?

  // 메타데이터
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([nextReview])
  @@index([stage])
}
```

### 인덱스 전략

```prisma
// 우선순위 기반 조회 (학습 큐 생성)
@@index([goalId, priority(sort: Desc)])

// 복습 일정 조회
@@index([nextReview])

// 세션 이력 조회
@@index([goalId, createdAt(sort: Desc)])

// 컴포넌트별 필터링
@@index([type])

// 마스터리 단계별 집계
@@index([stage])
```

---

## 8. 마스터리 시스템

### 5단계 마스터리 모델

| 단계 | 명칭 | 설명 | 진입 조건 | 과제 형식 |
|------|------|------|----------|----------|
| 0 | 새로움 | 첫 노출, 미학습 | 초기 상태 | 소개, 정의 |
| 1 | 인식 | 보면 안다 | cueAssisted ≥ 50% | 객관식, 매칭 |
| 2 | 회상 | 힌트로 떠올림 | cueFree ≥ 60% 또는 cueAssisted ≥ 80% | 빈칸 채우기 |
| 3 | 통제된 생산 | 노력하면 생산 | cueFree ≥ 75%, S > 7일 | 자유 응답 |
| 4 | 자동화 | 즉시 생산 | cueFree ≥ 90%, S > 30일, gap < 0.1, CV < 0.25 | 시간 제한 |

### 단계 변이 로직

```typescript
function determineStage(mastery: MasteryState): MasteryStage {
  const {
    cueFreeAccuracy,
    cueAssistedAccuracy,
    fsrsStability,
    automationLevel,
    cvScore
  } = mastery;

  // 정확도 갭 (최근 성과와의 차이)
  const gap = Math.abs(cueFreeAccuracy - getRecentAccuracy(mastery));

  // 자동화 조건 확인
  const isAutomated = cvScore !== null && cvScore < 0.25;

  // Stage 4: 자동화
  if (cueFreeAccuracy >= 0.9 &&
      fsrsStability > 30 &&
      gap < 0.1 &&
      isAutomated) {
    return 4;
  }

  // Stage 3: 통제된 생산
  if (cueFreeAccuracy >= 0.75 && fsrsStability > 7) {
    return 3;
  }

  // Stage 2: 회상
  if (cueFreeAccuracy >= 0.6 || cueAssistedAccuracy >= 0.8) {
    return 2;
  }

  // Stage 1: 인식
  if (cueAssistedAccuracy >= 0.5) {
    return 1;
  }

  // Stage 0: 새로움
  return 0;
}
```

### 스캐폴딩 갭 분석

> **스캐폴딩 갭이란?**
> 도움을 받았을 때의 성과와 도움 없이의 성과 차이입니다. 갭이 크면 아직 독립적 사용이 어렵다는 의미입니다.

```typescript
interface ScaffoldingGap {
  objectId: string;
  cueAssistedAccuracy: number;  // 힌트 있을 때
  cueFreeAccuracy: number;       // 힌트 없을 때
  gap: number;                    // 차이 (0-1)
  recommendation: 'reduce_support' | 'maintain_support' | 'increase_support';
}

function analyzeScaffoldingGap(mastery: MasteryState): ScaffoldingGap {
  const gap = mastery.cueAssistedAccuracy - mastery.cueFreeAccuracy;

  let recommendation: ScaffoldingGap['recommendation'];
  if (gap < 0.1) {
    recommendation = 'reduce_support';  // 지원 줄여도 됨
  } else if (gap < 0.3) {
    recommendation = 'maintain_support';  // 현재 수준 유지
  } else {
    recommendation = 'increase_support';  // 더 많은 지원 필요
  }

  return { objectId, cueAssistedAccuracy, cueFreeAccuracy, gap, recommendation };
}
```

---

## 9. 우선순위 계산

### 확장된 FRE 공식

기존의 단순 FRE 공식에 **컴포넌트별 비용 수정자**를 추가했습니다.

```
기존:
  Priority = (w_F × F + w_R × R + w_E × E) / Cost
  Cost = BaseDifficulty - TransferGain + ExposureNeed

신규 (컴포넌트별 비용 반영):
  Priority = FRE / (ComponentCost - TransferBonus + PrerequisitePenalty) + UrgencyBonus

  ComponentCost = computeComponentCostModifier(vector)
  // PHON: 0.5 ~ 2.0 (불규칙성, L1 간섭)
  // MORPH: 0.5 ~ 2.0 (생산성, 투명도, 가족 크기)
  // LEX: 0.5 ~ 2.0 (구체성, 다의어, 습득연령)
  // SYNT: 0.5 ~ 2.0 (복잡도, 내포 깊이)
  // PRAG: 0.5 ~ 2.0 (문화 부하, 공손성)
```

### 비용 요소 상세

| 요소 | 계산 방법 | 범위 | 설명 |
|------|----------|------|------|
| BaseDifficulty | (irtDifficulty + 3) / 6 | 0-1 | IRT 난이도 정규화 |
| ComponentCost | computeComponentCostModifier() | 0.5-2.0 | 컴포넌트별 학습 비용 |
| TransferBonus | l1TransferCoefficient × 0.2 | 0-0.2 | L1 유사성 보너스 |
| PrerequisitePenalty | !satisfied ? 0.5 : 0 | 0 or 0.5 | 전제조건 미충족 패널티 |
| UrgencyBonus | goalContext.urgency × 0.1 | 0-0.1 | 긴급도 보너스 |

### 추가 조정 요소

| 요소 | 가중치 | 설명 | 계산 |
|------|--------|------|------|
| 긴급도 | 0.14 | FSRS 복습 필요도 | days_overdue / 7 |
| 병목 부스트 | 0.06 | 약한 컴포넌트 강화 | isBottleneck ? 0.1 : 0 |
| 전제조건 | 0.12 | 준비도 기반 필터 | prerequisiteScore |
| 도메인 적합성 | 0.10 | 목표와 일치도 | domainMatch |

### 최종 점수 계산

```typescript
interface ComponentPriorityCalculation {
  objectId: string;
  componentType: ComponentCode;
  freScore: number;
  componentCostModifier: number;
  transferAdjustment: number;
  prerequisitePenalty: number;
  priority: number;
  factors: {
    frequency: number;
    relationalDensity: number;
    contextualContribution: number;
    irtDifficulty: number;
    urgency: number;
    componentFactors: Record<string, number>;  // 컴포넌트별 상세 요인
  };
}

function computeComponentPriority(
  vector: ComponentVector,
  userState: ComponentUserState,
  goalContext?: GoalContext
): ComponentPriorityCalculation {
  // 1. 기본 FRE 점수
  const freScore = computeFREFromVector(vector, userState.weights);

  // 2. 컴포넌트별 비용 수정자
  const componentCostModifier = computeComponentCostModifier(vector);

  // 3. 전이 보너스
  const transferAdjustment = vector.l1TransferCoefficient * 0.2;

  // 4. 전제조건 패널티
  const prerequisitePenalty = vector.prerequisitesSatisfied ? 0 : 0.5;

  // 5. 긴급도
  const urgency = goalContext?.urgency ?? 0;

  // 6. 최종 비용
  const cost = Math.max(0.1,
    componentCostModifier - transferAdjustment + prerequisitePenalty
  );

  // 7. 최종 우선순위
  const priority = freScore / cost + urgency * 0.1;

  return {
    objectId: vector.objectId,
    componentType: vector.componentType,
    freScore,
    componentCostModifier,
    transferAdjustment,
    prerequisitePenalty,
    priority,
    factors: {
      frequency: vector.frequency,
      relationalDensity: vector.relationalDensity,
      contextualContribution: vector.contextualContribution,
      irtDifficulty: vector.irtDifficulty,
      urgency,
      componentFactors: extractComponentFactors(vector)
    }
  };
}
```

---

## 10. 주요 데이터 흐름

### 학습 세션 전체 흐름

```
1. 세션 시작 (session:start)
   │
   ▼
2. 학습 큐 생성
   ├─► Stage 0: 언어학적 분석 (이미 완료된 객체)
   ├─► Stage 1: 학습자 상태 측정
   │   ├─► θ 조회 (전역 + 컴포넌트별)
   │   ├─► 마스터리 상태 조회
   │   └─► 자동화 수준 확인
   ├─► Stage 2: 우선순위 계산
   │   ├─► FRE 점수 계산
   │   ├─► 컴포넌트별 비용 적용
   │   └─► 긴급도/병목 조정
   └─► 큐 정렬 및 반환
   │
   ▼
3. 과제 생성 (queue:get 후)
   └─► Stage 3: 과제 생성
       ├─► 컴포넌트별 과제 설계 파라미터
       ├─► 마스터리 단계별 형식 선택
       └─► Claude/템플릿 콘텐츠 생성
   │
   ▼
4. 응답 제출 (session:submit-response) [반복]
   ├─► Stage 4: 응답 평가
   │   ├─► 정확도 판정
   │   ├─► 응답 시간 분석
   │   ├─► 컴포넌트별 평가
   │   └─► 캐스케이드 효과 감지
   ├─► Stage 5: 상태 업데이트
   │   ├─► FSRS 업데이트 (등급 결정)
   │   ├─► 마스터리 단계 재계산
   │   ├─► 자동화 수준 업데이트
   │   ├─► 간접 업데이트 전파
   │   └─► 마일스톤 체크 및 발행
   └─► 다음 과제 선택 및 반환
   │
   ▼
5. 세션 종료 (session:end)
   ├─► 통계 집계
   │   ├─► 총 문항 수, 정답률
   │   ├─► 평균 응답 시간
   │   ├─► 컴포넌트별 성과
   │   ├─► 달성 마일스톤
   │   └─► 학습 궤적 예측
   ├─► IRT 캘리브레이션 스케줄 (조건 충족 시)
   └─► 세션 요약 반환
```

### IRT 캘리브레이션 흐름

**트리거 조건**: 최소 50개 응답, 10개 문항

```
1. 데이터 수집 (최근 50개 응답)
   │
   ▼
2. E-step: θ 사후 분포 추정
   │     ► 가우스 구적법으로 수치 적분
   ▼
3. M-step: 문항 파라미터 최대우도 추정
   │     ► a(변별도), b(난이도), c(추측) 업데이트
   ▼
4. 반복 (수렴까지, 최대 100회)
   │
   ▼
5. 결과 저장
   ├─► LanguageObject (a, b, c)
   └─► User (θ_global, θ_phon, θ_morph, θ_lex, θ_synt, θ_prag)
```

---

## 11. 오프라인 모드

### 오프라인 큐 서비스

네트워크 없이도 학습이 가능합니다.

**큐잉되는 작업**:
| 작업 | 우선순위 | 재시도 |
|------|----------|--------|
| 응답 기록 | 높음 | 3회 |
| Theta 업데이트 | 중간 | 3회 |
| 마스터리 변경 | 중간 | 3회 |
| 세션 통계 | 낮음 | 5회 |

**동기화 전략**:
- 연결 복구 시 자동 처리 (FIFO)
- `sync:force`로 수동 동기화
- 타임스탬프 기반 충돌 해결 (최신 우선)
- 실패 시 지수 백오프

### Claude API 폴백

| 상태 | 과제 생성 | 응답 평가 |
|------|----------|----------|
| 온라인 | Claude API | Claude API |
| 오프라인 | 템플릿 기반 | 규칙 기반 |

**템플릿 기반 과제 생성**:
```typescript
// 객관식 템플릿
const mcqTemplate = {
  prompt: `다음 중 "${word}"의 뜻으로 가장 적절한 것은?`,
  options: [correctDefinition, ...distractors],
  correctIndex: 0
};

// 빈칸 채우기 템플릿
const fillTemplate = {
  prompt: exampleSentence.replace(word, '____'),
  answer: word,
  hint: word[0] + '...'
};
```

**캐싱**:
- Claude 응답: 30분 TTL
- 어휘 분석: 1시간 TTL
- 캐시 크기 제한: 100MB

---

## 12. 용어 사전

### 학습 이론 용어

| 용어 | 영문 | 설명 |
|------|------|------|
| **θ (Theta)** | Ability Parameter | IRT 능력 파라미터. -3 ~ +3 범위. 0이 평균. |
| **마스터리 단계** | Mastery Stage | 학습 진행 상태. 0(새로움) ~ 4(자동화). |
| **자동화** | Automatization | 의식적 노력 없이 처리하는 상태. CV < 0.15. |
| **스캐폴딩** | Scaffolding | 학습 지원. 힌트, 단서 제공. 점진적 제거. |
| **전이** | Transfer | 한 학습이 다른 학습에 영향. 긍정적/부정적 전이. |
| **간격 반복** | Spaced Repetition | 점점 긴 간격으로 복습. 망각 곡선 기반. |

### 언어학 용어

| 용어 | 영문 | 설명 |
|------|------|------|
| **형태소** | Morpheme | 의미를 가진 최소 단위. 'unhappiness' = un + happy + ness |
| **연어** | Collocation | 자주 함께 쓰이는 단어 조합. 'make a decision' |
| **레지스터** | Register | 상황에 따른 언어 변이. 격식체/비격식체. |
| **화행** | Speech Act | 말로 하는 행위. 요청, 약속, 사과 등. |
| **체면** | Face | 사회적 자아 이미지. 긍정적/부정적 체면. |
| **처리가능성** | Processability | 문법 구조의 습득 순서. Pienemann 이론. |

### 시스템 용어

| 용어 | 영문 | 설명 |
|------|------|------|
| **FRE** | Frequency-Relational-E | 우선순위 공식. 빈도, 관계, 맥락 기여. |
| **FSRS** | Free Spaced Repetition Scheduler | 간격 반복 알고리즘. |
| **IRT** | Item Response Theory | 문항 반응 이론. 능력-난이도 매칭. |
| **z(w) 벡터** | Feature Vector | 학습 객체의 언어학적 특성 벡터. |
| **안정성 (S)** | Stability | 90% 회수율 유지 가능 일수. |
| **CV** | Coefficient of Variation | 변동계수. 응답 시간 일관성 측정. |
| **병목** | Bottleneck | 학습 진행을 방해하는 약한 컴포넌트. |
| **간접 업데이트** | Indirect Update | 관련 객체로의 학습 효과 전파. |
| **비용 수정자** | Cost Modifier | 컴포넌트별 학습 난이도 조정 계수. |

### 컴포넌트 약어

| 약어 | 전체 | 한국어 | 대상 |
|------|------|--------|------|
| PHON | Phonology | 음운 | 발음, 철자-소리 관계 |
| MORPH | Morphology | 형태 | 단어 구조, 접사 |
| LEX | Lexical | 어휘 | 단어 의미, 용법 |
| SYNT | Syntactic | 통사 | 문장 구조, 문법 |
| PRAG | Pragmatic | 화용 | 맥락, 적절성 |

---

## 부록: 신규 모듈 요약 (2025년 1월)

### 코어 알고리즘 모듈

| 모듈 | Stage | 목적 | 주요 함수 |
|------|-------|------|----------|
| `lexical.ts` | 0 | LEX 객체 추출, 어휘 분석 | `extractLexicalObjects`, `analyzeLexical` |
| `component-vectors.ts` | 0-2 | 컴포넌트별 z(w) 벡터 | `computeComponentCostModifier`, `generateTaskDesignParams`, `predictLearningTrajectory` |
| `automatization.ts` | 1 | 자동화 수준 측정 | `calculateCV`, `fitPowerLaw`, `createAutomatizationProfile` |
| `fluency-diversity-state.ts` | 1 | 유창성/다양성 상태 | `recordRTObservation`, `calculateFluencyMetrics` |
| `transfer-prediction.ts` | 2 | L2 내부 전이 예측 | `predictTransfer`, `buildTransferNetwork` |
| `multi-object-selection.ts` | 3 | 복합 과제 객체 선택 | `evaluateCombinationFeasibility`, `selectSupportingObjects` |
| `component-evaluation.ts` | 4 | 컴포넌트별 평가 | `evaluateResponse`, `evaluateMultiComponent` |
| `indirect-update.ts` | 5 | 관련 객체 간접 업데이트 | `propagateUpdate`, `applyIndirectUpdates` |
| `milestone-events.ts` | 5 | 마일스톤 달성 이벤트 | `MilestoneRegistry.checkProgress` |

### 컴포넌트 벡터 시스템

| 타입 | 주요 차원 | 비용 범위 |
|------|----------|----------|
| `PHONVector` | g2pRegularity, neighborhoodDensity, l1TransferDifficulty | 0.5-2.0 |
| `MORPHVector` | productivity, transparency, familySize, paradigmComplexity | 0.5-2.0 |
| `LEXVector` | concreteness, polysemyCount, ageOfAcquisition, cognateStatus | 0.5-2.0 |
| `SYNTVector` | complexityScore, embeddingDepth, processabilityStage | 0.5-2.0 |
| `PRAGVector` | culturalLoad, politenessComplexity, faceThreatPotential | 0.5-2.0 |

### 메모리 안전 상수

모든 신규 모듈은 배열 크기 제한을 포함합니다:

```typescript
// component-vectors.ts
const MAX_COLLOCATIONS = 50;
const MAX_MISPRONUNCIATIONS = 20;
const MAX_KEY_FACTORS = 10;
const MAX_INTERVENTIONS = 5;
const MAX_CONTEXTS = 20;
const MAX_TASK_TYPES = 10;

// lexical.ts
const MAX_TEXT_LENGTH = 1_000_000;
const MAX_TOKENS = 100_000;
const MAX_UNIQUE_LEMMAS = 50_000;

// indirect-update.ts
const MAX_PROPAGATION_DEPTH = 3;
const MAX_UPDATES_PER_PROPAGATION = 100;
```

---

*이 문서는 LOGOS 백엔드의 6단계 파이프라인과 40개 이상의 코어 모듈을 다룹니다.*
*최종 업데이트: 2025년 1월 - 컴포넌트별 z(w) 벡터 시스템 추가*
