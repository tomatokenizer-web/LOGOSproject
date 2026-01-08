# 핵심 모듈 배럴 내보내기

> **최종 업데이트**: 2026-01-05
> **코드 위치**: `src/core/index.ts`
> **상태**: 활성

---

## 맥락 및 목적

이 파일은 LOGOS 학습 알고리즘의 **중앙 신경계 게이트웨이**입니다. 내부 파일 구성을 알 필요 없이 모든 핵심 계산 함수에 접근할 수 있는 단일 통합 진입점을 제공하는 배럴 내보내기 역할을 합니다.

**비즈니스 필요성**: LOGOS는 정교한 심리측정, 언어학, 기억 과학 알고리즘을 구현합니다. 중앙 내보내기 포인트 없이는 개발자가 15개 이상의 개별 파일에서 가져오고, 내부 디렉토리 구조를 기억하고, 코드베이스 전체에 흩어진 가져오기를 유지해야 합니다. 이 배럴 내보내기는 알고리즘의 혼란을 깔끔한 API 표면으로 변환합니다.

**사용 시점**:
- 메인 프로세스가 학습 우선순위를 계산해야 할 때마다
- UI가 숙달 진행 상황을 표시해야 할 때마다
- 학습자 응답을 처리하는 모든 IPC 핸들러
- 복습을 예약하거나 항목을 선택하는 모든 서비스
- 본질적으로: 계산 로직이 필요한 `/src/core` 외부의 모든 코드

**존재 이유 (더 깊은 이유)**:
LOGOS는 엄격한 **순수 알고리즘 격리** 원칙을 따릅니다. 모든 계산은 외부 의존성 없이, 데이터베이스 호출 없이, 네트워크 요청 없이, 부작용 없이 `/src/core`에 있습니다. 이 배럴 내보내기는 순수한 수학 함수를 Electron IPC, 데이터베이스 접근, UI 상태의 복잡한 현실과 분리하는 "막"입니다. 이 단일 파일을 통해 모든 접근을 채널링함으로써 아키텍처는 다음을 강제합니다:
1. 순수 함수가 순수하게 유지됨 (테스트 가능, 예측 가능, 이식 가능)
2. 구현 세부사항이 숨겨짐 (소비자를 깨뜨리지 않고 리팩터링)
3. 순환 의존성이 불가능해짐 (명확한 의존성 방향)

---

## 미시적 관점: 직접적 관계

### 의존성 (이 모듈이 내보내는 대상)

배럴은 **15개 알고리즘 파일**과 **5개 하위 모듈**의 내보내기를 집계합니다:

**기반 계층:**
- `./types.ts`: 모든 TypeScript 인터페이스 및 타입 정의 (공유 어휘)
- `./quadrature.ts`: 가우스-에르미트 수치 적분 (IRT를 위한 수학적 유틸리티)

**심리측정 계층 (학습자 모델링):**
- `./irt.ts`: 문항반응이론 함수 - `probability1PL`, `probability2PL`, `probability3PL`, `estimateThetaMLE`, `estimateThetaEAP`, `calculateFisherInformation`, `selectNextItemFisher`, `selectNextItemKL`, `calibrateItemsEM`
- `./fsrs.ts`: 무료 간격 반복 스케줄러 - `createFSRSCard`, `updateFSRS`, `calculateNextInterval`, 숙달 단계 함수

**언어 분석 계층:**
- `./pmi.ts`: 코퍼스 분석을 위한 점별 상호 정보량 - `PMICalculator`, `computePMI`, `computeNPMI`, `mapDifficultyToTask`
- `./morphology.ts`: 단어 구조 분해 - `analyzeMorphology`, `getMorphemeComplexity`, `identifyMorphemes`
- `./g2p.ts`: 자소-음소 규칙 - `graphemeToPhoneme`, `calculatePhonemicDistance`, `identifyPronunciationPatterns`
- `./syntactic.ts`: 문법 복잡성 분석 - `parseSentence`, `identifyConstituents`, `calculateSyntacticComplexity`

**학습 최적화 계층:**
- `./priority.ts`: FRE 기반 큐 정렬 - `calculateFREScore`, `calculatePriority`, `rankByPriority`, `adjustWeightsForGoal`
- `./bottleneck.ts`: 오류 연쇄 탐지 - `analyzeBottleneck`, `detectCascadePattern`, `identifyRootCause`, `getComponentOrder`
- `./task-matching.ts`: 연습-학습자 적합성 - `matchTaskToLearner`, `calculateTaskSuitability`, `selectOptimalTask`
- `./response-timing.ts`: 유창성 지표 - `analyzeResponseTiming`, `calculateFluencyScore`, `detectHesitationPatterns`
- `./transfer.ts`: L1 영향 예측 - `predictTransfer`, `calculateTransferGain`, `identifyInterference`
- `./stage-thresholds.ts`: 숙달 진행 게이트 - `getStageThresholds`, `checkStageAdvancement`, `calculateStageProgress`

**하위 모듈 재내보내기 (전체 네임스페이스):**
- `./content/`: 교육적 의도 매핑, 콘텐츠 명세, 생성, 검증
- `./tasks/`: 전통적 과제 유형 라이브러리, 제약 해결, 오답지 생성
- `./grammar/`: 통사적 구문 라이브러리, 문법 시퀀스 최적화
- `./state/`: 구성요소-객체 상태 추적, 우선순위 검색 엔진
- `./register/`: 도메인/레지스터 프로필, 화용적 적절성 점수

### 종속자 (이 모듈을 사용하는 것)

**직접 소비자:**
- `src/main/services/state-priority.service.ts`: 큐 관리를 위해 우선순위 함수 가져오기
- `src/main/services/scoring-update.service.ts`: 응답 처리를 위해 IRT와 FSRS 가져오기
- `src/main/services/task-generation.service.ts`: 과제 매칭, 콘텐츠 생성 가져오기
- `src/main/services/pmi.service.ts`: 코퍼스 처리를 위해 PMICalculator 가져오기
- `src/main/ipc/*.ipc.ts`: 다양한 IPC 핸들러가 타입과 함수 가져오기
- `src/renderer/hooks/*.ts`: 파생 상태를 계산하는 React 훅

### 이 모듈을 통한 데이터 흐름

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
                개입 권장 사항 반환
```

---

## 거시적 관점: 시스템 통합

### 아키텍처 계층

이 모듈은 LOGOS 4계층 아키텍처의 **계층 0: 순수 계산**에 위치합니다:

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
    | (여기서 가져오기)
    |
[계층 0: 핵심 알고리즘] <-- 현재 위치
    |
    v
(의존성 없음 - 순수 함수만)
```

이것은 다른 모든 것이 기반으로 하는 **기초 계층**입니다. 다른 애플리케이션 코드에 대한 의존성이 전혀 없으며, 표준 TypeScript/JavaScript만 있습니다.

### 전체적 영향

**이 모듈이 사라지면:**
전체 LOGOS 애플리케이션이 붕괴됩니다. 모든 지능적 기능이 이러한 알고리즘에 의존합니다:

| 기능 | 사용되는 알고리즘 |
|---------|-----------------|
| "다음에 무엇을 배워야 하나요?" | priority.ts, task-matching.ts |
| "이 단어를 얼마나 잘 알고 있나요?" | irt.ts, fsrs.ts, stage-thresholds.ts |
| "언제 이것을 복습해야 하나요?" | fsrs.ts, priority.ts |
| "왜 이 오류를 계속 범하나요?" | bottleneck.ts, transfer.ts |
| "이 단어가 배울 가치가 있나요?" | pmi.ts, priority.ts |
| "적절한 연습 생성" | content/, tasks/, grammar/ |
| "내 유창성 수준은?" | response-timing.ts, irt.ts |
| "내 수준에 맞는 콘텐츠" | irt.ts, task-matching.ts, register/ |

### 12개 알고리즘 영역

배럴 내보내기는 이론적 기반을 반영하는 일관된 영역으로 알고리즘을 구성합니다:

1. **IRT (심리측정)**: 통계적 척도로 학습자 능력 모델링, 적응적 난이도 가능
2. **FSRS (기억 과학)**: 망각 곡선 예측, 최적 복습 시기 예약
3. **PMI (코퍼스 언어학)**: 단어 연관성 측정, 배울 가치 있는 연어 식별
4. **우선순위 (학습 과학)**: 빈도, 관계, 맥락을 학습 순서로 결합
5. **병목 (오류 분석)**: 언어 구성요소를 통한 오류 연쇄 추적 (PHON->MORPH->LEX->SYNT->PRAG)
6. **형태론 (단어 구조)**: 패턴 학습을 위해 단어를 의미 있는 단위로 분해
7. **G2P (음운론)**: 철자를 발음에 매핑, 발음 어려움 식별
8. **통사론 (문법)**: 문장 복잡성 분석, 문법 패턴 식별
9. **응답 타이밍 (유창성)**: 응답 속도 패턴을 통한 자동화 측정
10. **과제 매칭 (교육학)**: 학습자 상태에 적합한 연습 유형 선택
11. **전이 (L1 영향)**: 모국어로부터의 긍정적/부정적 전이 예측
12. **단계 임계값 (숙달)**: 학습 단계 진행 기준 정의

### 임계 경로 분석

**중요도 수준**: 매우 중요 (계층 0)

이것은 LOGOS에서 가장 중요한 단일 모듈입니다. 우회하거나 모킹할 수 있는 서비스나 UI 구성요소와 달리, 핵심 알고리즘은 학습 시스템을 근본적으로 깨뜨리지 않고는 우회하거나 모킹할 수 없습니다.

**실패 모드:**
- IRT 실패 시: 능력 추정이 무작위가 되고, 적응적 난이도가 깨짐
- FSRS 실패 시: 복습 스케줄링이 임의적이 되고, 망각 곡선 무시됨
- 우선순위 실패 시: 학습 큐가 정렬되지 않고, 비효율적 학습
- 병목 실패 시: 오류 진단 불가능, 학습자가 막힘

**복구 전략:**
순수 함수 아키텍처는 실패가 결정론적이고 테스트 가능함을 의미합니다. 각 알고리즘은 `src/core/__tests__/`에 해당 테스트가 있습니다. 알고리즘이 잘못된 결과를 생성하면 수정이 이 단일 내보내기 포인트를 통해 모든 곳에 자동으로 전파됩니다.

---

## 기술적 개념 (쉬운 설명)

### 배럴 내보내기 패턴
**기술적**: 다른 모듈의 내보내기를 재내보내기하여 단일 가져오기 지점으로 집계하는 모듈. "인덱스 내보내기" 또는 "공개 API 표면"이라고도 합니다.

**쉬운 설명**: 대기업의 안내 데스크와 같습니다. 각 부서가 어느 층, 어느 사무실에 있는지 아는 대신, 안내 데스크에서 물어보면 연결해 줍니다. 배럴 내보내기는 모든 핵심 알고리즘의 안내 데스크입니다.

**사용 이유**:
- 깔끔한 가져오기 (`from '@core/irt'`, `from '@core/fsrs'` 등 대신 `from '@core'`)
- 소비자를 깨뜨리지 않고 내부 파일 재구성 자유
- 공개적으로 사용 가능한 것 대 내부용 감사할 단일 포인트

### 순수 함수
**기술적**: 같은 입력에 대해 항상 같은 출력을 생성하고, 부작용이 없으며, 외부 상태에 의존하지 않는 함수. "참조 투명" 함수라고도 합니다.

**쉬운 설명**: 계산기와 같습니다. 2+2를 누르면 항상 4를 얻습니다. 몇 시인지, 누가 사용하는지, 이전에 무슨 일이 있었는지 상관없습니다. 계산은 매번 같습니다. LOGOS 핵심 함수는 모두 계산기입니다 - 데이터를 입력하면 예측 가능한 결과를 얻습니다.

**사용 이유**:
- 테스트 가능 (모킹 필요 없음, 입력으로 호출만)
- 캐시 가능 (같은 입력 = 캐시된 출력 유효)
- 병렬화 가능 (손상될 공유 상태 없음)
- 디버그 가능 (입력에서 출력으로 결정론적 추적)

---

## 사용 예시

### 기본 가져오기 (가장 일반적)
```typescript
// 통합 진입점에서 필요한 것을 가져오기
import {
  probability2PL,
  estimateThetaEAP,
  updateFSRS,
  calculatePriority
} from '@core';
```

### 타입 전용 가져오기
```typescript
import type {
  ItemParameter,
  ThetaEstimate,
  FSRSCard,
  MasteryState
} from '@core';
```

### 하위 모듈 기능
```typescript
import {
  ContentGenerator,
  createContentSpec,
  TRADITIONAL_TASK_TYPES,
  selectOptimalTaskType
} from '@core';
```

### 딥 가져오기 (트리 쉐이킹이 중요할 때)
```typescript
// 최소 번들을 위해 특정 파일에서 직접 가져오기
import { probability2PL } from '@core/irt';
```

---

## 변경 이력

### 2026-01-05 - 문서 생성
- **변경 사항**: 배럴 내보내기 아키텍처를 설명하는 내러티브 문서 추가
- **이유**: 유지보수성 향상을 위한 섀도우 문서 시스템 지원
- **영향**: 새 개발자가 핵심 모듈 구성을 이해할 수 있게 함
