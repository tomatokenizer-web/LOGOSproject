# Bottleneck Detection Module

> **Last Updated**: 2026-01-04
> **Code Location**: `src/core/bottleneck.ts`
> **Status**: Active
> **Theoretical Foundation**: ALGORITHMIC-FOUNDATIONS.md Part 7

---

## Context & Purpose

### Why This Module Exists

The Bottleneck Detection module answers: **"What's actually holding me back?"**

Consider Maria: 85% on vocabulary, 30% on procedure verbs. Is this:
- A vocabulary problem? (doesn't know the words)
- A morphology problem? (can't handle verb forms)
- A syntactic problem? (struggles with sentence structure)

**The bottleneck detector finds the ROOT CAUSE, not just the symptom.**

---

## The Cascade Model

Errors propagate through the linguistic hierarchy:

```
PHON → MORPH → LEX → SYNT → PRAG
```

| Position | Component | Example |
|----------|-----------|---------|
| 1 | PHON (Phonology) | th-sounds, vowels |
| 2 | MORPH (Morphology) | -ing, -ed endings |
| 3 | LEX (Lexical) | vocabulary |
| 4 | SYNT (Syntax) | clauses, word order |
| 5 | PRAG (Pragmatics) | politeness, register |

**Key insight**: A morphology problem manifests as errors in lexical, syntactic, AND pragmatic tasks. The naive approach finds high LEX errors and prescribes vocabulary drills. The cascade-aware approach traces back to MORPH.

---

## Evidence Collection

For each component, we collect:

1. **Error Rate**: errors / total responses
2. **Error Patterns**: Clustered by similarity (e.g., "-ed endings (7x)")
3. **Co-occurring Errors**: Components that fail together in sessions
4. **Improvement Trend**: First 75% vs last 25% error rates

---

## Cascade Analysis Algorithm

```
For each component in cascade order (PHON → PRAG):
    If error rate >= threshold (30%):
        If downstream components also elevated (>= 20%):
            → This is the ROOT CAUSE
            → Downstream errors are cascaded effects
```

Returns:
- `rootCause`: The originating component
- `cascadeChain`: All affected components
- `confidence`: How sure we are (0-1)

---

## Pattern Recognition

Errors are clustered by similarity:

| Component | Pattern Examples |
|-----------|------------------|
| PHON | th-sounds, r/l distinction, vowel combinations |
| MORPH | -ing endings, -ed endings, plurals |
| LEX | complex vocabulary, basic vocabulary |
| SYNT | conditional clauses, relative clauses |
| PRAG | politeness markers, apology patterns |

Only patterns appearing 2+ times are reported.

---

## Confidence Calculation

Confidence = dataConfidence + cascadeBoost + differentiationBoost

- **Data quantity**: min(1, responses / 50)
- **Cascade detection**: +0.2 if cascade found
- **Differentiation**: min(0.2, topRate - secondRate)

Thresholds:
- < 0.3: Need more data
- 0.3-0.5: Preliminary
- 0.5-0.7: Moderate
- > 0.7: High confidence

---

## Actionable Recommendations

Generated recommendations include:
1. **Focus statement**: "Focus on Morphology (46% error rate)"
2. **Cascade benefits**: "Improving this will also help with vocabulary, grammar"
3. **Specific patterns**: "Specifically practice: -ed endings"
4. **Trend feedback**: "(Already improving - keep it up!)"

---

## Integration Points

### Dependencies
None - pure TypeScript.

### Dependents
- Session Summary: `SessionSummary.bottlenecks`
- Analytics Dashboard: Visual bottleneck display
- Item Selection: Prioritize bottleneck-addressing items

---

## Usage Examples

```typescript
import { analyzeBottleneck, type ResponseData } from './bottleneck';

const analysis = analyzeBottleneck(responses);

console.log(analysis.primaryBottleneck);  // 'MORPH'
console.log(analysis.confidence);          // 0.75
console.log(analysis.recommendation);
// "Focus on Morphology (46% error rate).
//  Improving this will also help with vocabulary.
//  Specifically practice: -ed endings."
```

Utility functions:
```typescript
getCascadePosition('MORPH');           // 1
canCauseErrors('MORPH', 'SYNT');       // true
getDownstreamComponents('MORPH');       // ['LEX', 'SYNT', 'PRAG']
summarizeBottleneck(analysis);          // "word forms (46% errors)"
```

---

*This documentation mirrors: `src/core/bottleneck.ts`*
