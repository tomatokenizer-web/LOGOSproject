# Fluency vs Versatility Balance Service

> **Code**: `src/main/services/fluency-versatility.service.ts`
> **Tier**: 2 (Service Layer)

---

## Purpose

Phase 3.4 implementation: Fluency-Versatility balance. Session ratio tracking, progress-based adjustment, appropriate task type generation.

**Fluency**: High-PMI collocations, speed-focused (bread and butter)
**Versatility**: Low-PMI combinations, creative extension (bread and marmalade)

---

## Level-Based Default Ratios

```typescript
const LEVEL_RATIOS = {
  beginner:     { fluency: 0.8, versatility: 0.2 },
  intermediate: { fluency: 0.6, versatility: 0.4 },
  advanced:     { fluency: 0.4, versatility: 0.6 }
};
```

**Rationale**: Beginners need to build automated chunks; advanced learners need flexible usage.

---

## Core Functions

### Ratio Calculation

| Function | Purpose |
|----------|---------|
| `calculateTargetRatio(userId, goalId)` | Calculate target ratio |
| `getSessionBalance(sessionId)` | Query current session balance |
| `adjustRatioForProgress(ratio, stats)` | Progress-based adjustment |

### Task Generation

| Function | Purpose |
|----------|---------|
| `generateFluencyTask(goalId)` | Generate high-PMI speed tasks |
| `generateVersatilityTask(goalId)` | Generate low-PMI creative tasks |
| `getNextTaskType(sessionId)` | Determine next task type |

### Transition Analysis

| Function | Purpose |
|----------|---------|
| `analyzeTransition(userId, goalId)` | Analyze mode transition necessity |
| `checkHeadDomainCoverage(goalId)` | Check core domain mastery |

---

## Transition Conditions

### Fluency → Versatility Shift

```typescript
shouldShift =
  headDomainCoverage >= 0.8 &&    // 80% core collocation mastery
  fluencySpeed < 3000 &&           // Response within 3 seconds
  productionImprovement > 0.1;     // 10%+ production improvement
```

---

## Session Balance Management

```typescript
interface SessionBalance {
  targetRatio: { fluency: 0.6, versatility: 0.4 };
  currentRatio: { fluency: 0.7, versatility: 0.3 };
  fluencyTaskCount: 14;
  versatilityTaskCount: 6;
  recommendedNextType: 'versatility';  // Balance recovery
}
```

---

## Dependencies

```text
fluency-versatility.service.ts
  │
  ├──> collocation.repository.ts (PMI data)
  │
  ├──> mastery.repository.ts (mastery statistics)
  │
  └──> Consumers:
       ├── task-generation.service (task type selection)
       └── session.repository (session balance recording)
```
