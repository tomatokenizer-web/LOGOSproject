# FSRS (Free Spaced Repetition Scheduler) 모듈

> **Code**: `src/core/fsrs.ts`
> **Tier**: 1 (Core Algorithm)

---

## 핵심 수식

### Retrievability (망각 곡선)

기억 유지 확률:

```
R(t) = e^(-t/S)

t = 마지막 복습 후 경과 일수
S = Stability (90% 기억 유지까지의 일수)
```

**해석**:
- t = 0: R = 1.0 (방금 복습)
- t = S: R ≈ 0.37 (36.8%)
- 목표: R = 0.9 유지

### Initial Stability

첫 복습 후 안정성:

```
S₀ = w[rating - 1]

w[0] = 0.4  (Again)
w[1] = 0.6  (Hard)
w[2] = 2.4  (Good)
w[3] = 5.8  (Easy)
```

### Initial Difficulty

첫 복습 후 난이도:

```
D₀ = w[4] - (rating - 3) × w[5]
   = 4.93 - (rating - 3) × 0.94

D ∈ [1, 10]
```

### Difficulty Update

난이도 변화:

```
D_{n+1} = D_n - w[6] × (rating - 3)
        = D_n - 0.86 × (rating - 3)

rating = 4 (Easy):  D 감소 0.86
rating = 3 (Good):  D 불변
rating = 2 (Hard):  D 증가 0.86
rating = 1 (Again): D 증가 1.72
```

### Stability Update (Success)

성공 시 안정성 증가:

```
S_{n+1} = S_n × (1 + e^{w[8]} × (11 - D) × S_n^{-w[9]} × (e^{(1-R) × w[10]} - 1) × H × E)

w[8]  = 1.49  (기본 증가율)
w[9]  = 0.14  (안정성 감쇠)
w[10] = 0.94  (망각 보정)

H = w[15] = 0.29  if rating = 2 (Hard penalty)
E = w[16] = 2.61  if rating = 4 (Easy bonus)
```

### Stability Update (Failure)

실패 시 안정성 감소:

```
S_{n+1} = w[11] × D^{-w[12]} × (S_n + 1)^{w[13]} - 1

w[11] = 2.18  (기본 감소율)
w[12] = 0.05  (난이도 영향)
w[13] = 0.34  (이전 안정성 영향)
```

### Optimal Interval

다음 복습까지 최적 간격:

```
I = S × ln(requestRetention) / ln(0.9)

requestRetention = 0.9 (기본값)
→ I ≈ S × 1.0 (약 S일)
```

---

## FSRS 클래스

### 생성자 (lines 114-119)

```typescript
export class FSRS {
  private params: FSRSParameters;

  constructor(params?: Partial<FSRSParameters>) {
    this.params = {
      ...DEFAULT_PARAMETERS,
      ...params
    };
  }
}
```

### retrievability() (lines 126-130)

```typescript
retrievability(card: FSRSCard, now: Date): number {
  if (!card.lastReview) return 0;
  const elapsedDays = this.daysSince(card.lastReview, now);
  return Math.exp(-elapsedDays / Math.max(card.stability, 0.1));
}
```

### schedule() (lines 140-171)

```typescript
schedule(card: FSRSCard, rating: FSRSRating, now: Date): FSRSCard {
  const newCard = { ...card };

  if (card.state === 'new' || !card.lastReview) {
    // 첫 복습: 초기화
    newCard.stability = this.initialStability(rating);
    newCard.difficulty = this.initialDifficulty(rating);
    newCard.state = rating === 1 ? 'learning' : 'review';
  } else {
    // 후속 복습: 업데이트
    const retrievability = this.retrievability(card, now);
    newCard.difficulty = this.nextDifficulty(card.difficulty, rating);
    newCard.stability = this.nextStability(
      card.stability, card.difficulty, retrievability, rating
    );

    if (rating === 1) {
      newCard.lapses += 1;
      newCard.state = 'relearning';
    } else {
      newCard.state = 'review';
    }
  }

  newCard.lastReview = now;
  newCard.reps += 1;
  return newCard;
}
```

### nextInterval() (lines 178-184)

```typescript
nextInterval(stability: number): number {
  const interval = stability * Math.log(this.params.requestRetention) / Math.log(0.9);
  return Math.min(
    this.params.maximumInterval,  // 36500 (100년)
    Math.max(1, Math.round(interval))
  );
}
```

---

## Mastery State 시스템

### 5단계 숙달 모델

| Stage | 이름 | 조건 |
|-------|------|------|
| 0 | Unknown | exposureCount = 0 |
| 1 | Recognition | cueAssistedAccuracy ≥ 0.5 |
| 2 | Recall | cueFreeAccuracy ≥ 0.6 OR cueAssistedAccuracy ≥ 0.8 |
| 3 | Controlled | cueFreeAccuracy ≥ 0.75 AND stability > 7일 |
| 4 | Automatic | cueFreeAccuracy ≥ 0.9 AND stability > 30일 AND gap < 0.1 |

### STAGE_THRESHOLDS (lines 78-91)

```typescript
export const STAGE_THRESHOLDS = {
  cueFreeAccuracy: {
    stage2: 0.6,   // 절반 이상 회상
    stage3: 0.75,  // 신뢰할 수 있는 회상
    stage4: 0.9    // 거의 완벽
  },
  stability: {
    stage3: 7,     // 1주 유지
    stage4: 30     // 1달 유지
  },
  scaffoldingGap: {
    stage4: 0.1    // 단서 의존도 최소화
  }
};
```

### determineStage() (lines 352-390)

```typescript
export function determineStage(state: MasteryState): MasteryStage {
  if (state.exposureCount === 0) return 0;

  const gap = state.cueAssistedAccuracy - state.cueFreeAccuracy;
  const stability = state.fsrsCard.stability;

  // Stage 4: Automatic
  if (
    state.cueFreeAccuracy >= 0.9 &&
    stability > 30 &&
    gap < 0.1
  ) {
    return 4;
  }

  // Stage 3: Controlled Production
  if (
    state.cueFreeAccuracy >= 0.75 &&
    stability > 7
  ) {
    return 3;
  }

  // Stage 2: Recall
  if (state.cueFreeAccuracy >= 0.6 || state.cueAssistedAccuracy >= 0.8) {
    return 2;
  }

  // Stage 1: Recognition
  if (state.cueAssistedAccuracy >= 0.5) {
    return 1;
  }

  return 0;
}
```

---

## 응답 → 평점 변환

### responseToRating() (lines 287-301)

```typescript
export function responseToRating(response: FSRSResponseData): FSRSRating {
  if (!response.correct) {
    return 1;  // Again
  }

  if (response.cueLevel > 0) {
    return 2;  // Hard (단서 필요)
  }

  if (response.responseTimeMs > 5000) {
    return 3;  // Good (느리지만 정답)
  }

  return 4;  // Easy (빠르고 정답)
}
```

**변환 로직**:

| 조건 | Rating | 의미 |
|------|--------|------|
| 오답 | 1 (Again) | 실패, 재학습 |
| 정답 + 단서 사용 | 2 (Hard) | 부분 성공 |
| 정답 + 5초 초과 | 3 (Good) | 성공, 노력 필요 |
| 정답 + 5초 이내 | 4 (Easy) | 완전 자동화 |

---

## Scaffolding Gap 분석

### calculateScaffoldingGap() (lines 396-398)

```typescript
export function calculateScaffoldingGap(state: MasteryState): number {
  return Math.max(0, state.cueAssistedAccuracy - state.cueFreeAccuracy);
}
```

**해석**:
- Gap = 0: 단서 없이도 동일한 성능
- Gap > 0.3: 단서 의존도 높음, 점진적 제거 필요

### determineCueLevel() (lines 403-411)

```typescript
export function determineCueLevel(state: MasteryState): 0 | 1 | 2 | 3 {
  const gap = calculateScaffoldingGap(state);
  const attempts = state.exposureCount;

  if (gap < 0.1 && attempts > 3) return 0;  // 단서 없음
  if (gap < 0.2 && attempts > 2) return 1;  // 최소 단서
  if (gap < 0.3) return 2;                   // 중간 단서
  return 3;                                   // 전체 단서
}
```

---

## 정확도 업데이트

### updateMastery() (lines 308-340)

지수 가중 이동 평균 (EWMA):

```typescript
export function updateMastery(
  state: MasteryState,
  response: FSRSResponseData,
  fsrs: FSRS,
  now: Date
): MasteryState {
  const newState = { ...state };

  // FSRS 업데이트
  const rating = responseToRating(response);
  newState.fsrsCard = fsrs.schedule(state.fsrsCard, rating, now);
  newState.exposureCount += 1;

  // 정확도 업데이트 (최근 가중치)
  const weight = 1 / (newState.exposureCount * 0.3 + 1);

  if (response.cueLevel === 0) {
    // 단서 없는 응답
    newState.cueFreeAccuracy = (1 - weight) * state.cueFreeAccuracy +
      weight * (response.correct ? 1 : 0);
  } else {
    // 단서 있는 응답
    newState.cueAssistedAccuracy = (1 - 0.2) * state.cueAssistedAccuracy +
      0.2 * (response.correct ? 1 : 0);
  }

  // 단계 결정
  newState.stage = determineStage(newState);
  return newState;
}
```

**가중치 수식**:
```
weight = 1 / (exposureCount × 0.3 + 1)

exposure = 1:  weight = 0.77
exposure = 5:  weight = 0.40
exposure = 10: weight = 0.25
→ 초기 응답이 더 큰 영향
```

---

## 기본 파라미터

### DEFAULT_WEIGHTS (lines 61-67)

```typescript
export const DEFAULT_WEIGHTS: number[] = [
  0.4, 0.6, 2.4, 5.8,        // w[0-3]: 평점별 초기 안정성
  4.93, 0.94, 0.86, 0.01,    // w[4-7]: 난이도 조정
  1.49, 0.14, 0.94,          // w[8-10]: 안정성 증가
  2.18, 0.05, 0.34, 1.26,    // w[11-14]: 성공/실패 조정
  0.29, 2.61                  // w[15-16]: Hard 페널티, Easy 보너스
];
```

### DEFAULT_PARAMETERS (lines 69-73)

```typescript
export const DEFAULT_PARAMETERS: FSRSParameters = {
  requestRetention: 0.9,     // 목표 기억 유지율
  maximumInterval: 36500,    // 최대 간격 (100년)
  w: DEFAULT_WEIGHTS
};
```

---

## 핵심 함수

| 함수 | 라인 | 복잡도 | 용도 |
|------|------|--------|------|
| `FSRS.retrievability` | 126-130 | O(1) | 현재 기억 확률 |
| `FSRS.schedule` | 140-171 | O(1) | 카드 스케줄링 |
| `FSRS.nextInterval` | 178-184 | O(1) | 최적 간격 계산 |
| `FSRS.nextReviewDate` | 189-195 | O(1) | 다음 복습일 |
| `createNewCard` | 254-263 | O(1) | 새 카드 생성 |
| `createInitialMasteryState` | 268-276 | O(1) | 초기 상태 |
| `responseToRating` | 287-301 | O(1) | 응답→평점 |
| `updateMastery` | 308-340 | O(1) | 숙달 업데이트 |
| `determineStage` | 352-390 | O(1) | 단계 결정 |
| `calculateScaffoldingGap` | 396-398 | O(1) | 단서 의존도 |
| `determineCueLevel` | 403-411 | O(1) | 단서 수준 |

---

## 의존 관계

```
fsrs.ts (독립적, 외부 의존성 없음)
  │
  ├──> component-vectors.ts
  │      각 컴포넌트별 MasteryState 관리
  │
  ├──> priority.ts
  │      복습 우선순위 계산에 stability, retrievability 활용
  │
  ├──> state/component-object-state.ts
  │      FSRSCard 상태 저장 및 복원
  │
  └──> Services:
       ├── scoring-update.service (응답 후 schedule 호출)
       ├── task-generation.service (다음 복습 항목 선택)
       └── state-priority.service (retrievability 기반 정렬)
```

---

## 학술적 기반

- Wozniak, P.A. & Gorzelanczyk, E.J. (1994). *Optimization of repetition spacing in the practice of learning*. Acta Neurobiologiae Experimentalis
- Pimsleur, P. (1967). *A memory schedule*. The Modern Language Journal
- Ebbinghaus, H. (1885). *Über das Gedächtnis*. (망각 곡선의 원형)
- FSRS Algorithm: https://github.com/open-spaced-repetition/fsrs4anki
