# FSRS (Free Spaced Repetition Scheduler) Module

> **Code**: `src/core/fsrs.ts`
> **Tier**: 1 (Core Algorithm)

---

## Core Formulas

### Retrievability (Forgetting Curve)

Memory retention probability:

```
R(t) = e^(-t/S)

t = days elapsed since last review
S = Stability (days until 90% retention)
```

**Interpretation**:
- t = 0: R = 1.0 (just reviewed)
- t = S: R ≈ 0.37 (36.8%)
- Goal: Maintain R = 0.9

### Initial Stability

Stability after first review:

```
S₀ = w[rating - 1]

w[0] = 0.4  (Again)
w[1] = 0.6  (Hard)
w[2] = 2.4  (Good)
w[3] = 5.8  (Easy)
```

### Initial Difficulty

Difficulty after first review:

```
D₀ = w[4] - (rating - 3) × w[5]
   = 4.93 - (rating - 3) × 0.94

D ∈ [1, 10]
```

### Difficulty Update

Difficulty change:

```
D_{n+1} = D_n - w[6] × (rating - 3)
        = D_n - 0.86 × (rating - 3)

rating = 4 (Easy):  D decreases by 0.86
rating = 3 (Good):  D unchanged
rating = 2 (Hard):  D increases by 0.86
rating = 1 (Again): D increases by 1.72
```

### Stability Update (Success)

Stability increase on success:

```
S_{n+1} = S_n × (1 + e^{w[8]} × (11 - D) × S_n^{-w[9]} × (e^{(1-R) × w[10]} - 1) × H × E)

w[8]  = 1.49  (base increase rate)
w[9]  = 0.14  (stability decay)
w[10] = 0.94  (forgetting correction)

H = w[15] = 0.29  if rating = 2 (Hard penalty)
E = w[16] = 2.61  if rating = 4 (Easy bonus)
```

### Stability Update (Failure)

Stability decrease on failure:

```
S_{n+1} = w[11] × D^{-w[12]} × (S_n + 1)^{w[13]} - 1

w[11] = 2.18  (base decrease rate)
w[12] = 0.05  (difficulty influence)
w[13] = 0.34  (previous stability influence)
```

### Optimal Interval

Optimal interval until next review:

```
I = S × ln(requestRetention) / ln(0.9)

requestRetention = 0.9 (default)
→ I ≈ S × 1.0 (approximately S days)
```

---

## FSRS Class

### Constructor (lines 114-119)

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
    // First review: initialization
    newCard.stability = this.initialStability(rating);
    newCard.difficulty = this.initialDifficulty(rating);
    newCard.state = rating === 1 ? 'learning' : 'review';
  } else {
    // Subsequent reviews: update
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
    this.params.maximumInterval,  // 36500 (100 years)
    Math.max(1, Math.round(interval))
  );
}
```

---

## Mastery State System

### 5-Stage Mastery Model

| Stage | Name | Condition |
|-------|------|-----------|
| 0 | Unknown | exposureCount = 0 |
| 1 | Recognition | cueAssistedAccuracy ≥ 0.5 |
| 2 | Recall | cueFreeAccuracy ≥ 0.6 OR cueAssistedAccuracy ≥ 0.8 |
| 3 | Controlled | cueFreeAccuracy ≥ 0.75 AND stability > 7 days |
| 4 | Automatic | cueFreeAccuracy ≥ 0.9 AND stability > 30 days AND gap < 0.1 |

### STAGE_THRESHOLDS (lines 78-91)

```typescript
export const STAGE_THRESHOLDS = {
  cueFreeAccuracy: {
    stage2: 0.6,   // More than half recalled
    stage3: 0.75,  // Reliable recall
    stage4: 0.9    // Near perfect
  },
  stability: {
    stage3: 7,     // 1 week retention
    stage4: 30     // 1 month retention
  },
  scaffoldingGap: {
    stage4: 0.1    // Minimal cue dependency
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

## Response to Rating Conversion

### responseToRating() (lines 287-301)

```typescript
export function responseToRating(response: FSRSResponseData): FSRSRating {
  if (!response.correct) {
    return 1;  // Again
  }

  if (response.cueLevel > 0) {
    return 2;  // Hard (cue needed)
  }

  if (response.responseTimeMs > 5000) {
    return 3;  // Good (slow but correct)
  }

  return 4;  // Easy (fast and correct)
}
```

**Conversion Logic**:

| Condition | Rating | Meaning |
|-----------|--------|---------|
| Incorrect | 1 (Again) | Failed, needs relearning |
| Correct + cue used | 2 (Hard) | Partial success |
| Correct + >5 seconds | 3 (Good) | Success, effort needed |
| Correct + ≤5 seconds | 4 (Easy) | Fully automated |

---

## Scaffolding Gap Analysis

### calculateScaffoldingGap() (lines 396-398)

```typescript
export function calculateScaffoldingGap(state: MasteryState): number {
  return Math.max(0, state.cueAssistedAccuracy - state.cueFreeAccuracy);
}
```

**Interpretation**:
- Gap = 0: Same performance without cues
- Gap > 0.3: High cue dependency, gradual removal needed

### determineCueLevel() (lines 403-411)

```typescript
export function determineCueLevel(state: MasteryState): 0 | 1 | 2 | 3 {
  const gap = calculateScaffoldingGap(state);
  const attempts = state.exposureCount;

  if (gap < 0.1 && attempts > 3) return 0;  // No cue
  if (gap < 0.2 && attempts > 2) return 1;  // Minimal cue
  if (gap < 0.3) return 2;                   // Medium cue
  return 3;                                   // Full cue
}
```

---

## Accuracy Update

### updateMastery() (lines 308-340)

Exponentially Weighted Moving Average (EWMA):

```typescript
export function updateMastery(
  state: MasteryState,
  response: FSRSResponseData,
  fsrs: FSRS,
  now: Date
): MasteryState {
  const newState = { ...state };

  // FSRS update
  const rating = responseToRating(response);
  newState.fsrsCard = fsrs.schedule(state.fsrsCard, rating, now);
  newState.exposureCount += 1;

  // Accuracy update (recent weight)
  const weight = 1 / (newState.exposureCount * 0.3 + 1);

  if (response.cueLevel === 0) {
    // Response without cue
    newState.cueFreeAccuracy = (1 - weight) * state.cueFreeAccuracy +
      weight * (response.correct ? 1 : 0);
  } else {
    // Response with cue
    newState.cueAssistedAccuracy = (1 - 0.2) * state.cueAssistedAccuracy +
      0.2 * (response.correct ? 1 : 0);
  }

  // Determine stage
  newState.stage = determineStage(newState);
  return newState;
}
```

**Weight Formula**:
```
weight = 1 / (exposureCount × 0.3 + 1)

exposure = 1:  weight = 0.77
exposure = 5:  weight = 0.40
exposure = 10: weight = 0.25
→ Initial responses have greater influence
```

---

## Default Parameters

### DEFAULT_WEIGHTS (lines 61-67)

```typescript
export const DEFAULT_WEIGHTS: number[] = [
  0.4, 0.6, 2.4, 5.8,        // w[0-3]: Initial stability by rating
  4.93, 0.94, 0.86, 0.01,    // w[4-7]: Difficulty adjustment
  1.49, 0.14, 0.94,          // w[8-10]: Stability increase
  2.18, 0.05, 0.34, 1.26,    // w[11-14]: Success/failure adjustment
  0.29, 2.61                  // w[15-16]: Hard penalty, Easy bonus
];
```

### DEFAULT_PARAMETERS (lines 69-73)

```typescript
export const DEFAULT_PARAMETERS: FSRSParameters = {
  requestRetention: 0.9,     // Target retention rate
  maximumInterval: 36500,    // Maximum interval (100 years)
  w: DEFAULT_WEIGHTS
};
```

---

## Key Functions

| Function | Lines | Complexity | Purpose |
|----------|-------|------------|---------|
| `FSRS.retrievability` | 126-130 | O(1) | Current memory probability |
| `FSRS.schedule` | 140-171 | O(1) | Card scheduling |
| `FSRS.nextInterval` | 178-184 | O(1) | Optimal interval calculation |
| `FSRS.nextReviewDate` | 189-195 | O(1) | Next review date |
| `createNewCard` | 254-263 | O(1) | New card creation |
| `createInitialMasteryState` | 268-276 | O(1) | Initial state |
| `responseToRating` | 287-301 | O(1) | Response → rating |
| `updateMastery` | 308-340 | O(1) | Mastery update |
| `determineStage` | 352-390 | O(1) | Stage determination |
| `calculateScaffoldingGap` | 396-398 | O(1) | Cue dependency |
| `determineCueLevel` | 403-411 | O(1) | Cue level |

---

## Dependencies

```
fsrs.ts (independent, no external dependencies)
  │
  ├──> component-vectors.ts
  │      Manages MasteryState for each component
  │
  ├──> priority.ts
  │      Uses stability, retrievability for review priority
  │
  ├──> state/component-object-state.ts
  │      FSRSCard state storage and restoration
  │
  └──> Services:
       ├── scoring-update.service (calls schedule after response)
       ├── task-generation.service (selects next review items)
       └── state-priority.service (sorts by retrievability)
```

---

## Academic Foundation

- Wozniak, P.A. & Gorzelanczyk, E.J. (1994). *Optimization of repetition spacing in the practice of learning*. Acta Neurobiologiae Experimentalis
- Pimsleur, P. (1967). *A memory schedule*. The Modern Language Journal
- Ebbinghaus, H. (1885). *Über das Gedächtnis*. (Original forgetting curve)
- FSRS Algorithm: https://github.com/open-spaced-repetition/fsrs4anki
