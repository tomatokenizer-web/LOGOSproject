# Priority Calculation Module

> **Last Updated**: 2026-01-04
> **Code Location**: `src/core/priority.ts`
> **Status**: Active
> **Theoretical Foundation**: THEORETICAL-FOUNDATIONS.md, FINAL-SPEC.md

---

## Context & Purpose

### Why This Module Exists

The Priority Calculation module answers the most fundamental question in language learning: **What should I learn next?**

The priority formula:
```
Priority = (w_F × F + w_R × R + w_E × E) / Cost
```

Where:
- **F (Frequency)**: How often the word appears in target texts (0-1)
- **R (Relational Density)**: Hub score from PMI analysis (0-1)
- **E (Contextual Contribution)**: Meaning importance (0-1)
- **Cost**: Learning difficulty adjusted for transfer and ability

---

## The FRE Framework

### F: Frequency - The Foundation
High-frequency words provide the fastest path to comprehension. The top 2,000 words cover ~80% of text.

### R: Relational Density - The Network Effect
Hub words like "take" connect to dozens of phrases. Learning these creates vocabulary "force multipliers."

### E: Contextual Contribution - The Meaning Makers
Words that carry heavy semantic load. Advanced learners need precision vocabulary.

---

## Cost Calculation

```
Cost = BaseDifficulty - TransferGain + ExposureNeed
```

- **BaseDifficulty**: IRT difficulty normalized from logit scale
- **TransferGain**: L1 cognate benefit (placeholder: 0.1 if L1 specified)
- **ExposureNeed**: Ability gap = max(0, itemDifficulty - userTheta) / 3

Minimum cost floor: 0.1 (prevents division by zero)

---

## Urgency: The Spaced Repetition Layer

```
FinalScore = Priority × (1 + Urgency)
```

Urgency rules:
- Not yet due: 0
- Due today: 1
- Overdue by N days: min(3, 1 + N × 0.5)
- New items: 1.5

---

## Weight Adjustments by Level

| Level | Theta | F | R | E |
|-------|-------|---|---|---|
| Beginner | < -1 | 0.5 | 0.25 | 0.25 |
| Intermediate | -1 to +1 | 0.4 | 0.3 | 0.3 |
| Advanced | > +1 | 0.3 | 0.3 | 0.4 |

---

## Session Balancing

```typescript
getSessionItems(queue, sessionSize, newItemRatio = 0.3)
```

Default: 70% due items, 30% new items.

Prevents:
- All reviews (no progress)
- All new items (no retention)

---

## Integration Points

### Dependencies (Implicit)
- `irt.ts`: Provides irtDifficulty field
- `fsrs.ts`: Provides nextReview dates
- `pmi.ts`: Feeds relationalDensity scores

### Dependents
- Session Management: Builds learning queues
- UI: Displays queue position
- Analytics: Shows priority distribution

---

## Usage Examples

```typescript
import { computePriority, buildLearningQueue, getSessionItems } from './priority';

// Compute single word priority
const priority = computePriority(word, userState);

// Build complete queue
const queue = buildLearningQueue(objects, userState, masteryMap, new Date());

// Get balanced session
const session = getSessionItems(queue, 20, 0.3);
```

---

*This documentation mirrors: `src/core/priority.ts`*
