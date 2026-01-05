# FSRS (Free Spaced Repetition Scheduler) Module

> **Last Updated**: 2026-01-04
> **Code Location**: `src/core/fsrs.ts`
> **Status**: Active
> **Theoretical Foundation**: ALGORITHMIC-FOUNDATIONS.md Part 3

---

## Context & Purpose

### Why Spaced Repetition Matters for Language Learning

The human brain is a forgetting machine. Within 24 hours of learning something new, you forget approximately 70% of it. Within a week, 90%. This is not a bug; it's a feature. The brain aggressively prunes information it deems unimportant to conserve cognitive resources.

But here's the counterintuitive insight from memory science: **the act of nearly forgetting something, then successfully recalling it, is what makes memories permanent**. Every time you retrieve a memory at the edge of forgetting, you strengthen the neural pathways that encode it.

**The FSRS module exists because language acquisition is fundamentally a memory problem.** A language learner must internalize thousands of vocabulary items, grammatical patterns, pronunciation rules, and pragmatic conventions. Without systematic memory management, learners waste enormous time either:
- Reviewing things they already know (wasted effort)
- Not reviewing things they're forgetting (knowledge decay)

FSRS solves this by predicting, for each piece of knowledge, exactly when the learner should review it next.

### The FSRS Algorithm

FSRS (Free Spaced Repetition Scheduler) uses a **two-variable memory model**:
- **Stability (S)**: How long until the memory decays to 90% recall probability
- **Difficulty (D)**: How inherently hard this item is for this learner

The key formula: `Retrievability = e^(-t/S)` where t = elapsed days and S = stability.

---

## How FSRS Relates to Mastery Stages (0-4)

LOGOS uses a five-stage mastery model:

| Stage | Name | Criteria |
|-------|------|----------|
| 0 | Unknown | Never encountered |
| 1 | Recognition | cueAssistedAccuracy >= 0.5 |
| 2 | Recall | cueFreeAccuracy >= 0.6 OR cueAssistedAccuracy >= 0.8 |
| 3 | Controlled | cueFreeAccuracy >= 0.75 AND stability > 7 days |
| 4 | Automatic | cueFreeAccuracy >= 0.9 AND stability > 30 days AND gap < 0.1 |

FSRS parameters directly inform stage transitions through stability requirements.

---

## The FSRS Rating System (1-4)

| Rating | Name | LOGOS Conversion |
|--------|------|------------------|
| 1 | Again | Incorrect answer |
| 2 | Hard | Correct with cues |
| 3 | Good | Correct, cue-free, slow (>5s) |
| 4 | Easy | Correct, cue-free, fast (<=5s) |

The 17 weight parameters control stability updates, difficulty adjustments, and rating bonuses/penalties.

---

## Scaffolding Gap Tracking

LOGOS tracks two accuracy metrics:
- **Cue-Free Accuracy**: Performance without hints
- **Cue-Assisted Accuracy**: Performance with hints

The difference is the **scaffolding gap**. Stage 4 requires gap < 0.1 (10 percentage points).

Cue level selection:
- Gap < 0.1 AND attempts > 3: No cues
- Gap < 0.2 AND attempts > 2: Minimal cues
- Gap < 0.3: Moderate cues
- Gap >= 0.3: Full cues

---

## Integration Points

### Dependencies
This module is dependency-free - pure TypeScript.

### Dependents
- Session Management: Calls `FSRS.schedule()` after responses
- Mastery State System: Uses `updateMastery()` and `determineStage()`
- Database Layer: Stores FSRS card fields in MasteryState
- Priority System: Uses FSRS state for urgency calculation

---

## Usage Examples

```typescript
import { FSRS, createNewCard, updateMastery } from './fsrs';

const fsrs = new FSRS();
let card = createNewCard();

// First review
card = fsrs.schedule(card, 3, new Date());
console.log(card.stability);  // ~2.4 days

// Get next review date
const nextReview = fsrs.nextReviewDate(card);
```

---

*This documentation mirrors: `src/core/fsrs.ts`*
