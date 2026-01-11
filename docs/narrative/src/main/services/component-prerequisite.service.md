# Component Prerequisite Service

> **Code**: `src/main/services/component-prerequisite.service.ts`
> **Tier**: 2 (Service Layer)

---

## Purpose

Manages component prerequisite chains. Tracks hierarchical dependencies between language components (PHON → MORPH → LEX → SYNT → PRAG).

**Core Principle**: Lower components must be automated (reach threshold stability) for effective learning of higher components.

---

## Theoretical Foundation

### Processability Theory (Pienemann, 1998, 2005)

Language processing procedures develop hierarchically. Higher procedures impossible without lower ones.

```
PHON → MORPH → LEX → SYNT → PRAG
(phonology) (morphology) (lexicon) (syntax) (pragmatics)
```

### Skill Acquisition Theory / ACT-R (Anderson, 1982, 1993)

Three stages of skill acquisition:
1. **Cognitive**: Declarative knowledge
2. **Associative**: Proceduralization begins
3. **Autonomous**: Automation complete

Automation of lower components frees cognitive resources for higher components.

### Levelt's Speech Production Model (1999)

Speech production follows: conceptualization → formulation → articulation. Each stage depends on output from the previous stage.

---

## Component Hierarchy

```typescript
// lines 133-144
COMPONENT_ORDER: ComponentCode[] = ['PHON', 'MORPH', 'LEX', 'SYNT', 'PRAG'];

COMPONENT_SUPPORTS: Record<ComponentCode, ComponentCode[]> = {
  PHON: ['MORPH', 'LEX'],
  MORPH: ['LEX', 'SYNT'],
  LEX: ['SYNT', 'PRAG'],
  SYNT: ['PRAG'],
  PRAG: []
};
```

| Component | Prerequisites | Supports |
|-----------|---------------|----------|
| PHON | None | MORPH, LEX |
| MORPH | PHON | LEX, SYNT |
| LEX | PHON, MORPH | SYNT, PRAG |
| SYNT | MORPH, LEX | PRAG |
| PRAG | LEX, SYNT | None |

---

## Automation Level Calculation

```typescript
// lines 194-259
normalizedStability = min(fsrsStability / 30, 1);  // 30 days = 1.0

// Component automation determination
isAutomated = automationRatio >= 0.7 && normalizedAutomation >= requiredThreshold;
```

| Component | Automation Threshold | Meaning |
|-----------|---------------------|---------|
| PHON | 0.3 | 10-day stability |
| MORPH | 0.4 | 12-day stability |
| LEX | 0.5 | 15-day stability |
| SYNT | 0.6 | 18-day stability |
| PRAG | 0.7 | 21-day stability |

---

## Prerequisite Status Check

```typescript
// lines 150-190
interface PrerequisiteStatus {
  component: ComponentCode;
  allSatisfied: boolean;
  prerequisites: Array<{
    component: ComponentCode;
    requiredThreshold: number;
    currentAutomation: number;
    isSatisfied: boolean;
  }>;
  blockingComponents: ComponentCode[];
}
```

### Unlock Status

| Status | Condition | Readiness Score |
|--------|-----------|-----------------|
| fully_unlocked | All prerequisites met | 0.7 - 1.0 |
| partially_unlocked | Some prerequisites met | 0.3 - 0.7 |
| locked | Prerequisites not met | 0 |

---

## Learning Strategy Determination

```typescript
// lines 551-631
interface ObjectLearningStrategy {
  objectId: string;
  componentType: ComponentCode;
  currentGoal: 'stabilization' | 'expansion';
  goalReason: LearningGoalReason;
  prerequisiteStatus: PrerequisiteStatus;
  automationLevel: number;
  automationThreshold: number;
  usageSpaceCoverage: number;
  supportsComponents: ComponentCode[];
  priority: number;
}
```

### Priority Calculation

```typescript
if (!prerequisiteStatus.allSatisfied) {
  priority = 30;  // Prerequisites not met - low priority
} else if (automationLevel < automationThreshold) {
  priority = 70 + (1 - automationLevel) × 30;  // Automation needed - high priority
} else if (supportsComponents.length > 0) {
  priority = 50;  // Supporting higher components - medium priority
} else {
  priority = 40;  // Ready for expansion
}
```

---

## Component Recommendations

```typescript
// lines 360-416
interface ComponentRecommendation {
  component: ComponentCode;
  priority: number;
  focusType: 'stabilize' | 'expand' | 'introduce';
  reason: string;
  targetObjectIds: string[];
}
```

| Focus Type | Condition | Action |
|------------|-----------|--------|
| introduce | objectCount === 0 | Introduce first item |
| stabilize | !isAutomated | Stabilization training |
| expand | isAutomated | Usage Space expansion |

---

## Support Score Calculation

```typescript
// lines 462-542
// Calculate how much an object supports higher components
contributionScore = normalizedAutomation / prereqConfig.automationThreshold;
```

**Purpose**: When determining learning priority for lower component objects, reflects contribution to unlocking higher components.

---

## Dependencies

```text
component-prerequisite.service.ts
  │
  ├──> types.ts (COMPONENT_PREREQUISITES)
  │
  ├──> prisma.ts (DB access)
  │
  └──> Consumers:
       ├── state-priority.service (priority calculation)
       ├── task-generation.service (learning strategy)
       └── IPC handlers (unlock status display)
```
