# Generalization Estimation Service

> **Code**: `src/main/services/generalization-estimation.service.ts`
> **Tier**: 2 (Service Layer)

---

## Purpose

Estimates transfer probability from trained contexts to untrained contexts. Since the entire Usage Space is combinatorially vast, estimates total coverage from representative samples.

**Core Algorithms**:
- Transfer Distance calculation (context similarity)
- Transfer Probability estimation (transfer success probability)
- Representative Sample selection (maximize generalization)
- Coverage Estimation (total usage space estimation)

---

## Theoretical Foundation

### Transfer Distance (Thorndike, 1901)

```text
Distance = 1 - Similarity

Similarity = |SharedFeatures| / |TotalFeatures|
```

**Identical Elements Theory**: More shared elements between two contexts = easier transfer.

| Feature | Transfer facilitated when shared |
|---------|----------------------------------|
| domain | Same domain (medical-medical) |
| register | Same register (formal-formal) |
| modality | Same modality (spoken-spoken) |
| genre | Same genre (consultation-consultation) |

### Transfer Probability (Perkins & Salomon, 1992)

```typescript
// lines 153-193
baseProbability = Math.exp(-decayConstant * distance);  // k = 2
automationBoost = sourceAutomationLevel * 0.3;
transferProbability = min(1, baseProbability + automationBoost);
```

**Transfer Types**:

| Type | Distance | Probability | Characteristics |
|------|----------|-------------|-----------------|
| Near Transfer | ≤ 0.5 | ~60% | Automatic transfer possible |
| Far Transfer | > 0.5 | ~13% | Explicit bridging required |

---

## Representative Sample Selection

### Selection Criteria (lines 234-302)

```typescript
totalScore =
  goalAlignmentScore × strategy.goalWeight +
  diversityScore × strategy.diversityWeight +
  transferPotentialScore × strategy.transferWeight;
```

| Score | Calculation Method | Purpose |
|-------|-------------------|---------|
| Goal Alignment | Similarity to target context | Goal achievement |
| Diversity | Distance from existing coverage | Avoid redundancy |
| Transfer Potential | Reachability to other uncovered contexts | Maximize efficiency |

### Component-Specific Strategies

```typescript
// from types.ts COMPONENT_SAMPLING_STRATEGIES
PHON:  { goalWeight: 0.3, diversityWeight: 0.2, transferWeight: 0.5, minSamples: 5 }
MORPH: { goalWeight: 0.4, diversityWeight: 0.2, transferWeight: 0.4, minSamples: 4 }
LEX:   { goalWeight: 0.5, diversityWeight: 0.3, transferWeight: 0.2, minSamples: 8 }
SYNT:  { goalWeight: 0.4, diversityWeight: 0.3, transferWeight: 0.3, minSamples: 6 }
PRAG:  { goalWeight: 0.6, diversityWeight: 0.2, transferWeight: 0.2, minSamples: 10 }
```

**Rationale**: PHON has high transfer rate so generalizes with fewer samples; PRAG has low transfer rate so needs many samples.

---

## Component-Specific Generalization Patterns

### PHON (lines 569-606)

```typescript
positionTransferRate = 0.7;  // 70% transfer across positions
confidence = 0.8;            // High confidence
```

Phonological rules are abstract, generalizing regardless of position.

### MORPH (lines 608-644)

```typescript
productivityRate = 0.6;  // Based on Carlisle (2000)
confidence = 0.75;
```

Affixes can be productively applied to new stems.

### LEX (lines 646-683)

```typescript
nearTransferCoverage = (1 - directCoverage) × 0.25;  // Low transfer
farTransferCoverage = 0.05;
confidence = 0.7;
```

Vocabulary is context-specific; collocational relationships limit transfer.

### SYNT (lines 685-722)

```typescript
nearTransferCoverage = (1 - directCoverage) × 0.35;  // Medium transfer
confidence = 0.7;
```

Grammar patterns can be abstracted to some degree but have genre dependency.

### PRAG (lines 724-767)

```typescript
nearTransferCoverage = (1 - directCoverage) × 0.2;  // Lowest transfer
farTransferCoverage = 0.02;
confidence = 0.6;
```

Pragmatics is highly context-dependent; completely different based on interlocutor/situation.

---

## Coverage Breakdown Structure

```typescript
interface CoverageBreakdown {
  directCoverage: number;        // Actually trained contexts
  nearTransferCoverage: number;  // Coverage inferred via near transfer
  farTransferCoverage: number;   // Coverage inferred via far transfer
  totalEstimatedCoverage: number;
  confidence: number;            // Estimation confidence
}
```

---

## Minimum Sample Calculation (Power Law)

```typescript
// lines 866-897
additionalSamples = ceil(coverageGap × baseMinimum × 2 × transferMultiplier);

transferMultiplier = {
  PHON: 0.7,   // High transfer = fewer samples
  MORPH: 0.8,
  LEX: 1.2,    // Low transfer = more samples
  SYNT: 1.0,
  PRAG: 1.4    // Lowest transfer = most samples
};
```

**Power Law of Practice** (Newell & Rosenbloom, 1981): Performance improves as a power function of practice amount.

---

## Dependencies

```text
generalization-estimation.service.ts
  │
  ├──> usage-space-tracking.service.ts (STANDARD_CONTEXTS, getObjectUsageSpace)
  │
  ├──> types.ts (COMPONENT_SAMPLING_STRATEGIES)
  │
  └──> Consumers:
       ├── task-composition.service (context selection)
       └── usage-space-tracking.service (recommended context calculation)
```
