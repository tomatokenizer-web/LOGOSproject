# Priority Calculation Module

> **Code**: `src/core/priority.ts`
> **Tier**: 1 (Core Algorithm)

---

## Core Formula

```
            w_F × F + w_R × R + w_E × E
Priority = ─────────────────────────────────
           BaseDifficulty - TransferGain + ExposureNeed
```

**High Value + Low Cost = High Priority = Learn First**

---

## Mathematical Foundation

### 1. FRE Score

```typescript
FRE = w_F × F + w_R × R + w_E × E   // weights sum to 1
```

| Variable | Meaning | Measurement | Range |
|----------|---------|-------------|-------|
| **F** | Corpus frequency | Zipf's law normalization | 0-1 |
| **R** | Network centrality | PMI-based connections | 0-1 |
| **E** | Semantic contribution | TF-IDF-like | 0-1 |

**Level-based weights**:
```typescript
beginner:     { f: 0.5, r: 0.25, e: 0.25 }  // frequency first - coverage
intermediate: { f: 0.4, r: 0.3,  e: 0.3  }  // balanced
advanced:     { f: 0.3, r: 0.3,  e: 0.4  }  // context first - nuance
```

**Theoretical basis**:
- Nation (2001): High-frequency 2000 words = 80% coverage of general text
- Beginners need coverage, advanced learners need nuance

### 2. Cost Calculation

```typescript
Cost = max(0.1, BaseDifficulty - TransferGain + ExposureNeed)
```

| Factor | Calculation | Meaning |
|--------|-------------|---------|
| **BaseDifficulty** | `(irtDifficulty + 3) / 6` | IRT difficulty normalized |
| **TransferGain** | `calculateTransferGain(L1, L2, type)` | L1 transfer benefit |
| **ExposureNeed** | `min(1, (difficulty - θ) / 3)` | Ability gap |

### 3. Urgency

```typescript
function computeUrgency(nextReview, now) {
  if (!nextReview) return 1.5;  // new item

  const daysOverdue = (now - nextReview) / MS_PER_DAY;
  if (daysOverdue < 0) return 0;
  return Math.min(3, 1 + daysOverdue * 0.5);
}
```

```
Urgency
   3 |                    ******
   2 |          **********
   1 |**********
   0 |______|___________________
        Due  +2  +4  days overdue
```

### 4. Final Score

```typescript
FinalScore = Priority × (1 + Urgency)
```

**Why multiplication**: Addition would allow low Priority + high Urgency to rank higher. Multiplication maintains Priority ranking while Urgency only provides a boost.

---

## Key Functions

| Function | Lines | Purpose |
|----------|-------|---------|
| `computeFRE()` | 106-115 | Calculate value score |
| `computeCost()` | 127-131 | Calculate learning cost |
| `estimateCostFactors()` | 138-168 | Extract IRT difficulty, transfer gain, exposure need |
| `computePriority()` | 181-196 | FRE / Cost |
| `computeUrgency()` | 214-233 | Spaced repetition urgency |
| `buildLearningQueue()` | 289-312 | Sort complete queue |
| `getSessionItems()` | 326-344 | Extract session items (70% review + 30% new) |

---

## Dependencies

```
transfer.ts ──> calculateTransferGain()

priority.ts
    │
    ├──> component-vectors.ts  (uses FRE logic, adds Cost Modifier)
    ├──> state-priority.service.ts  (calls buildLearningQueue)
    └──> session.service.ts  (calls getSessionItems)
```

**Component-Specific Priority**: When 5 components need unique Cost Modifiers → [component-vectors.md](component-vectors.md)

---

## Design Decision Rationale

### Why Subtract Transfer from Cost

```typescript
// ❌ Wrong: cognates appear "more valuable"
Priority = FRE × (1 + Transfer)

// ✓ Correct: cognates treated as "easier" (same value)
Cost = Difficulty - Transfer
```

### Why Cap Urgency at 3

Without cap, long-neglected items gain infinite scores → new items never introduced

### Why FRE?

| Alternative | Problem |
|-------------|---------|
| Frequency only | Function words (the, a) always top |
| Difficulty only | Only easy items repeat, learning stalls |
| Random | Inefficient |

FRE = Frequency (efficiency) + Relations (transfer) + Context (practicality) balance

---

## Academic Foundation

- Nation, I.S.P. (2001). *Learning Vocabulary in Another Language*
- Pimsleur, P. (1967). A memory schedule. *Modern Language Journal*
- Ringbom, H. (2007). *Cross-linguistic Similarity in FL Learning*
