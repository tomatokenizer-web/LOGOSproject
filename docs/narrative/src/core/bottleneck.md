# Bottleneck Detection Module

> **Code**: `src/core/bottleneck.ts`
> **Tier**: 1 (Core Algorithm)

---

## Core Concepts

### Language Component Cascade

Errors propagate through language processing layers:

```
PHON → MORPH → LEX → SYNT → PRAG
(phonology)  (morphology)  (lexical)  (syntax)  (pragmatics)

Example:
- MORPH error (-ing ending)
  → LEX error (verb meaning confusion)
    → SYNT error (tense mismatch)
      → PRAG error (inappropriate speech act)
```

**Key Insight**: Find the **root cause**, not just the highest error rate.

### Bottleneck Detection Algorithm

1. Check error rates in cascade order
2. If threshold exceeded + downstream errors exist → root cause
3. If no cascade, select highest error rate

---

## Configuration Parameters

### DEFAULT_BOTTLENECK_CONFIG (lines 121-126)

```typescript
export const DEFAULT_BOTTLENECK_CONFIG: BottleneckDetectionConfig = {
  minResponses: 20,              // Minimum response count
  minResponsesPerType: 5,        // Minimum per component
  errorRateThreshold: 0.3,       // 30%+ = problem
  cascadeConfidenceThreshold: 0.7 // Cascade confidence
};
```

---

## Main Analysis Functions

### analyzeBottleneck() (lines 169-212)

```typescript
export function analyzeBottleneck(
  responses: ResponseData[],
  config: BottleneckDetectionConfig = DEFAULT_BOTTLENECK_CONFIG
): BottleneckAnalysis {
  // Check minimum data
  if (responses.length < config.minResponses) {
    return {
      primaryBottleneck: null,
      confidence: 0,
      evidence: [],
      recommendation: `Need more data (${responses.length}/${config.minResponses})`
    };
  }

  // 1. Calculate component statistics
  const stats = calculateComponentStats(responses);

  // 2. Build evidence array
  const evidence = buildEvidence(stats, responses, config);

  // 3. Cascade analysis (root cause search)
  const cascade = analyzeCascadingErrors(evidence, config);

  // 4. Determine primary bottleneck
  let primaryBottleneck = cascade.rootCause;
  if (!primaryBottleneck) {
    primaryBottleneck = findHighestErrorRate(evidence, config);
  }

  // 5. Confidence and recommendations
  const confidence = calculateConfidence(evidence, responses.length, cascade);
  const recommendation = generateRecommendation(primaryBottleneck, evidence, cascade);

  return {
    primaryBottleneck,
    confidence,
    evidence: evidence.sort((a, b) => b.errorRate - a.errorRate),
    recommendation
  };
}
```

### calculateComponentStats() (lines 217-261)

```typescript
function calculateComponentStats(
  responses: ResponseData[]
): Map<ComponentType, ComponentStats> {
  const stats = new Map<ComponentType, ComponentStats>();

  // Initialize all components
  for (const type of CASCADE_ORDER) {
    stats.set(type, {
      total: 0,
      errors: 0,
      errorResponses: [],
      recentErrors: 0,
      recentTotal: 0
    });
  }

  // Sort by time (for recent 25% calculation)
  const sorted = [...responses].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const recentThreshold = Math.floor(sorted.length * 0.75);

  // Aggregate statistics
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const stat = stats.get(r.componentType);

    if (stat) {
      stat.total++;
      if (!r.correct) {
        stat.errors++;
        stat.errorResponses.push(r);
      }

      // Track recent performance
      if (i >= recentThreshold) {
        stat.recentTotal++;
        if (!r.correct) stat.recentErrors++;
      }
    }
  }

  return stats;
}
```

---

## Cascade Analysis

### analyzeCascadingErrors() (lines 419-454)

```typescript
export function analyzeCascadingErrors(
  evidence: BottleneckEvidence[],
  config: BottleneckDetectionConfig = DEFAULT_BOTTLENECK_CONFIG
): CascadeAnalysis {
  // Check in cascade order
  for (const type of CASCADE_ORDER) {
    const ev = evidence.find(e => e.componentType === type);

    if (ev && ev.errorRate >= config.errorRateThreshold) {
      // Check downstream component errors
      const typeIndex = CASCADE_ORDER.indexOf(type);
      const downstreamErrors = CASCADE_ORDER
        .slice(typeIndex + 1)
        .filter(t => {
          const downstream = evidence.find(e => e.componentType === t);
          // Downstream threshold = 67% of upstream
          return downstream && downstream.errorRate >= config.errorRateThreshold * 0.67;
        });

      if (downstreamErrors.length > 0) {
        // Cascade pattern found
        return {
          rootCause: type,
          cascadeChain: [type, ...downstreamErrors],
          confidence: config.cascadeConfidenceThreshold
        };
      }
    }
  }

  // No cascade
  return { rootCause: null, cascadeChain: [], confidence: 0 };
}
```

**Cascade Detection Example**:

| Component | Error Rate | Analysis |
|-----------|------------|----------|
| PHON | 15% | Below threshold → pass |
| MORPH | 35% | Above threshold → check downstream |
| LEX | 28% | Above 35% × 0.67 = 23.5% → affected |
| SYNT | 22% | Below threshold → independent |
| PRAG | 10% | Below threshold |

→ **Root Cause**: MORPH, **Cascade**: [MORPH, LEX]

---

## Error Pattern Analysis

### extractErrorPattern() (lines 322-364)

Component-specific error classification:

```typescript
function extractErrorPattern(response: ResponseData): string {
  const content = response.content.toLowerCase();

  switch (response.componentType) {
    case 'PHON':
      if (content.includes('th')) return 'th-sounds';
      if (content.includes('r') || content.includes('l')) return 'r/l distinction';
      if (content.match(/[aeiou]{2}/)) return 'vowel combinations';
      return 'other pronunciation';

    case 'MORPH':
      if (content.match(/ing$/)) return '-ing endings';
      if (content.match(/ed$/)) return '-ed endings';
      if (content.match(/s$/)) return 'plurals/3rd person';
      if (content.match(/tion$/)) return '-tion nominalizations';
      return 'other word forms';

    case 'LEX':
      if (content.length > 10) return 'complex vocabulary';
      if (content.length <= 4) return 'basic vocabulary';
      return 'intermediate vocabulary';

    case 'SYNT':
      if (content.includes('if') || content.includes('when')) return 'conditional clauses';
      if (content.includes('who') || content.includes('which')) return 'relative clauses';
      if (content.includes(',')) return 'compound sentences';
      return 'simple sentence patterns';

    case 'PRAG':
      if (content.includes('please') || content.includes('could')) return 'politeness markers';
      if (content.includes('sorry') || content.includes('excuse')) return 'apology patterns';
      return 'discourse markers';
  }
}
```

### analyzeErrorPatterns() (lines 302-316)

```typescript
export function analyzeErrorPatterns(errors: ResponseData[]): string[] {
  const patterns = new Map<string, number>();

  for (const error of errors) {
    const pattern = extractErrorPattern(error);
    patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
  }

  // Return patterns occurring 2+ times
  return Array.from(patterns.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)  // Top 5
    .map(([pattern, count]) => `${pattern} (${count}×)`);
}
```

---

## Co-occurring Error Analysis

### findCooccurringErrors() (lines 374-407)

Detect errors co-occurring within sessions:

```typescript
export function findCooccurringErrors(
  targetType: ComponentType,
  responses: ResponseData[]
): ComponentType[] {
  // Group errors by session
  const sessionErrors = new Map<string, Set<ComponentType>>();

  for (const r of responses) {
    if (!r.correct) {
      const errors = sessionErrors.get(r.sessionId) || new Set();
      errors.add(r.componentType);
      sessionErrors.set(r.sessionId, errors);
    }
  }

  // Count co-occurrence frequency
  const cooccurrence = new Map<ComponentType, number>();

  for (const errors of sessionErrors.values()) {
    if (errors.has(targetType)) {
      for (const type of errors) {
        if (type !== targetType) {
          cooccurrence.set(type, (cooccurrence.get(type) || 0) + 1);
        }
      }
    }
  }

  // Components co-occurring 2+ times
  return Array.from(cooccurrence.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([type, _]) => type);
}
```

---

## Confidence Calculation

### calculateConfidence() (lines 479-498)

```typescript
function calculateConfidence(
  evidence: BottleneckEvidence[],
  totalResponses: number,
  cascade: CascadeAnalysis
): number {
  if (evidence.length === 0) return 0;

  // Data volume-based confidence
  const dataConfidence = Math.min(1, totalResponses / 50);

  // Cascade bonus
  const cascadeBoost = cascade.rootCause ? 0.2 : 0;

  // Differentiation bonus (error rate gap)
  const rates = evidence.map(e => e.errorRate).sort((a, b) => b - a);
  const differentiation = rates.length >= 2 ? (rates[0] - rates[1]) : 0;
  const differentiationBoost = Math.min(0.2, differentiation);

  return Math.min(1, dataConfidence + cascadeBoost + differentiationBoost);
}
```

---

## Improvement Trend Analysis

### calculateImprovementTrend() (lines 555-573)

```typescript
export function calculateImprovementTrend(
  componentType: ComponentType,
  responses: ResponseData[]
): number {
  const componentResponses = responses.filter(r => r.componentType === componentType);

  if (componentResponses.length < 4) return 0;

  const midpoint = Math.floor(componentResponses.length / 2);
  const firstHalf = componentResponses.slice(0, midpoint);
  const secondHalf = componentResponses.slice(midpoint);

  const firstErrorRate = firstHalf.filter(r => !r.correct).length / firstHalf.length;
  const secondErrorRate = secondHalf.filter(r => !r.correct).length / secondHalf.length;

  // Positive = improving (recent errors decreasing)
  return firstErrorRate - secondErrorRate;
}
```

---

## Recommendation Generation

### generateRecommendation() (lines 503-540)

```typescript
function generateRecommendation(
  bottleneck: ComponentType | null,
  evidence: BottleneckEvidence[],
  cascade: CascadeAnalysis
): string {
  if (!bottleneck) {
    return 'No significant bottleneck detected. Continue balanced practice.';
  }

  const ev = evidence.find(e => e.componentType === bottleneck);
  const errorRate = ev ? Math.round(ev.errorRate * 100) : 0;
  const componentName = COMPONENT_NAMES[toShortForm(bottleneck)];

  let recommendation = `Focus on ${componentName} (${errorRate}% error rate). `;

  // Add cascade information
  if (cascade.rootCause === bottleneck && cascade.cascadeChain.length > 1) {
    const downstream = cascade.cascadeChain.slice(1)
      .map(t => COMPONENT_SHORT[toShortForm(t)])
      .join(', ');
    recommendation += `Improving this will also help with ${downstream}. `;
  }

  // Pattern-specific advice
  if (ev && ev.errorPatterns.length > 0) {
    const topPattern = ev.errorPatterns[0].split(' (')[0];
    recommendation += `Specifically practice: ${topPattern}.`;
  }

  // Improvement trend note
  if (ev && ev.improvement > 0.05) {
    recommendation += ' (Already improving - keep it up!)';
  } else if (ev && ev.improvement < -0.05) {
    recommendation += ' (Needs extra attention - performance declining.)';
  }

  return recommendation;
}
```

---

## Utility Functions

| Function | Lines | Purpose |
|----------|-------|---------|
| `isComponentType` | 582-584 | Type guard |
| `getCascadePosition` | 589-591 | Cascade position |
| `canCauseErrors` | 596-601 | Upstream→downstream relationship |
| `getDownstreamComponents` | 606-609 | Get downstream components |
| `getUpstreamComponents` | 614-617 | Get upstream components |
| `summarizeBottleneck` | 622-637 | Summary string |

---

## Key Functions

| Function | Lines | Complexity | Purpose |
|----------|-------|------------|---------|
| `analyzeBottleneck` | 169-212 | O(n×c) | Full analysis |
| `calculateComponentStats` | 217-261 | O(n) | Statistics aggregation |
| `buildEvidence` | 266-293 | O(c×e) | Evidence building |
| `analyzeErrorPatterns` | 302-316 | O(e) | Pattern analysis |
| `findCooccurringErrors` | 374-407 | O(n) | Co-occurring errors |
| `analyzeCascadingErrors` | 419-454 | O(c²) | Cascade analysis |
| `calculateImprovementTrend` | 555-573 | O(n) | Trend analysis |
| `generateRecommendation` | 503-540 | O(c) | Recommendation generation |

---

## Dependencies

```
bottleneck.ts
  │
  ├──> types.ts
  │      ComponentType import
  │
  ├──> component-vectors.ts
  │      Used for component-specific error tracking
  │
  └──> Services:
       ├── scoring-update.service (error data collection)
       ├── state-priority.service (bottleneck-based priority)
       └── analytics.service (bottleneck visualization)
```

---

## Academic Foundation

- Levelt, W.J.M. (1989). *Speaking: From Intention to Articulation*. MIT Press
- Anderson, J.R. (1983). *The Architecture of Cognition*. Harvard University Press
- Kroll, J.F. & de Groot, A.M.B. (2005). *Handbook of Bilingualism: Psycholinguistic Approaches*. Oxford University Press
