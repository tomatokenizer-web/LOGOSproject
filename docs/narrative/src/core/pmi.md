# PMI (Pointwise Mutual Information) Module

> **Code**: `src/core/pmi.ts`
> **Tier**: 1 (Core Algorithm)

---

## Core Formulas

### Pointwise Mutual Information

Co-occurrence strength between two words:

```
PMI(w₁, w₂) = log₂[P(w₁, w₂) / (P(w₁) × P(w₂))]

             = log₂[c₁₂ / expected_cooccurrence]

expected_cooccurrence = (c₁ × c₂) / N

c₁  = frequency of w₁
c₂  = frequency of w₂
c₁₂ = co-occurrence frequency (within window)
N   = total token count
```

**Interpretation**:
- PMI > 0: Co-occur more than by chance (collocation)
- PMI = 0: Independent occurrence
- PMI < 0: Co-occur less than by chance (avoidance)

### Normalized PMI

Normalized to -1 to +1 range:

```
NPMI(w₁, w₂) = PMI(w₁, w₂) / (-log₂[P(w₁, w₂)])

             = PMI / (-log₂(c₁₂ / N))
```

**Interpretation**:
- NPMI = +1: Perfect co-occurrence (always together)
- NPMI = 0: Independent
- NPMI = -1: Perfect avoidance (never together)

### Log-Likelihood Ratio (Dunning)

Statistical significance test:

```
G² = 2 × [H(c₁₂, c₁, p₁) + H(c₂-c₁₂, N-c₁, p₂)
         - H(c₁₂, c₁, p) - H(c₂-c₁₂, N-c₁, p)]

H(k, n, p) = k × log(p) + (n-k) × log(1-p)

p  = c₂ / N
p₁ = c₁₂ / c₁
p₂ = (c₂ - c₁₂) / (N - c₁)
```

**Significance thresholds**:
- G² > 3.84: p < 0.05
- G² > 6.63: p < 0.01
- G² > 10.83: p < 0.001

---

## PMICalculator Class

### Structure (lines 42-50)

```typescript
export class PMICalculator {
  private wordCounts: Map<string, number> = new Map();
  private pairCounts: Map<string, number> = new Map();
  private totalWords: number = 0;
  private windowSize: number;

  constructor(windowSize: number = 5) {
    this.windowSize = windowSize;
  }
}
```

### indexCorpus() (lines 56-74)

```typescript
indexCorpus(tokens: string[]): void {
  this.totalWords = tokens.length;
  this.wordCounts.clear();
  this.pairCounts.clear();

  // Count word frequencies
  for (const token of tokens) {
    const normalized = token.toLowerCase();
    this.wordCounts.set(normalized, (this.wordCounts.get(normalized) || 0) + 1);
  }

  // Count co-occurrences within window
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < Math.min(i + this.windowSize, tokens.length); j++) {
      const pair = this.pairKey(tokens[i].toLowerCase(), tokens[j].toLowerCase());
      this.pairCounts.set(pair, (this.pairCounts.get(pair) || 0) + 1);
    }
  }
}
```

### computePMI() (lines 83-113)

```typescript
computePMI(word1: string, word2: string): PMIResult | null {
  const w1 = word1.toLowerCase();
  const w2 = word2.toLowerCase();

  const c1 = this.wordCounts.get(w1) || 0;
  const c2 = this.wordCounts.get(w2) || 0;
  const c12 = this.pairCounts.get(this.pairKey(w1, w2)) || 0;

  if (c1 === 0 || c2 === 0 || c12 === 0) return null;

  const N = this.totalWords;
  const expectedCooccurrence = (c1 * c2) / N;

  // PMI
  const pmi = Math.log2(c12 / expectedCooccurrence);

  // Normalized PMI
  const npmi = pmi / (-Math.log2(c12 / N));

  // Log-likelihood ratio
  const llr = this.logLikelihoodRatio(c1, c2, c12, N);

  return {
    word1: w1, word2: w2,
    pmi, npmi,
    cooccurrence: c12,
    significance: llr
  };
}
```

### getCollocations() (lines 119-137)

```typescript
getCollocations(word: string, topK: number = 20): PMIResult[] {
  const results: PMIResult[] = [];
  const w = word.toLowerCase();

  for (const [pair] of this.pairCounts) {
    const [w1, w2] = pair.split('|');
    if (w1 === w || w2 === w) {
      const other = w1 === w ? w2 : w1;
      const pmi = this.computePMI(w, other);
      if (pmi && pmi.significance > 3.84) {  // p < 0.05
        results.push(pmi);
      }
    }
  }

  return results
    .sort((a, b) => b.pmi - a.pmi)
    .slice(0, topK);
}
```

---

## PMI to Difficulty Conversion

### pmiToDifficulty() (lines 208-237)

```typescript
export function pmiToDifficulty(
  pmi: number,
  npmi: number,
  taskType: TaskType
): number {
  const PMI_MIN = -2;
  const PMI_MAX = 10;

  // Normalization: 1 = most difficult
  const normalizedDifficulty = 1 - (pmi - PMI_MIN) / (PMI_MAX - PMI_MIN);
  const baseDifficulty = Math.max(0, Math.min(1, normalizedDifficulty));

  // IRT logit scale [-3, +3]
  const logitDifficulty = (baseDifficulty - 0.5) * 6;

  // Task type adjustment
  const modifiers: Record<TaskType, number> = {
    'recognition':  -0.5,  // Recognition: easier
    'recall_cued':   0,    // Cued recall: baseline
    'recall_free':  +0.5,  // Free recall: harder
    'production':   +1.0,  // Production: hardest
    'timed':        +0.3   // Timed: additional
  };

  return logitDifficulty + (modifiers[taskType] || 0);
}
```

**Conversion Logic**:

| PMI Range | Meaning | Difficulty |
|-----------|---------|------------|
| PMI > 8 | Very strong collocation | Easy (-2.5) |
| PMI 4~8 | Strong collocation | Medium (-1~+1) |
| PMI 0~4 | Weak collocation | Somewhat hard |
| PMI < 0 | Independent/avoidance | Hard (+2.5) |

### frequencyToDifficulty() (lines 247-266)

```typescript
export function frequencyToDifficulty(
  frequency: number,
  taskType: TaskType
): number {
  // Low frequency = difficult
  const baseDifficulty = 1 - frequency;

  // Convert to logit scale
  const logitDifficulty = (baseDifficulty - 0.5) * 6;

  const modifiers: Record<TaskType, number> = {
    'recognition':  -0.5,
    'recall_cued':   0,
    'recall_free':  +0.5,
    'production':   +1.0,
    'timed':        +0.3
  };

  return logitDifficulty + (modifiers[taskType] || 0);
}
```

---

## Window-based Co-occurrence

### Sliding Window

```
Text: "The patient takes medication daily for hypertension"
Window: 5

Position 0 (The):     co-occurs = [patient, takes, medication, daily]
Position 1 (patient): co-occurs = [takes, medication, daily, for]
Position 2 (takes):   co-occurs = [medication, daily, for, hypertension]
...
```

**Window Size Selection**:
- 5: General collocations (adjective-noun, verb-adverb)
- 2-3: Close syntactic relations
- 10+: Semantic associations

### pairKey() (lines 161-163)

```typescript
private pairKey(w1: string, w2: string): string {
  return w1 < w2 ? `${w1}|${w2}` : `${w2}|${w1}`;
}
```

Sorted key treats (A,B) and (B,A) identically.

---

## Log-Likelihood Ratio

### logLikelihoodRatio() (lines 170-190)

```typescript
private logLikelihoodRatio(c1: number, c2: number, c12: number, N: number): number {
  const c1NotC2 = c1 - c12;
  const c2NotC1 = c2 - c12;

  const H = (k: number, n: number, p: number): number => {
    if (k === 0 || k === n || p <= 0 || p >= 1) return 0;
    return k * Math.log(p) + (n - k) * Math.log(1 - p);
  };

  const p = c2 / N;
  const p1 = c12 / c1;
  const p2 = c2NotC1 / (N - c1);

  if (p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1) return 0;

  return 2 * (
    H(c12, c1, p1) + H(c2NotC1, N - c1, p2) -
    H(c12, c1, p) - H(c2NotC1, N - c1, p)
  );
}
```

**Advantages over Chi-squared**:
- Stable for low-frequency words
- Less strict distributional assumptions
- Standard in linguistic research

---

## Key Functions

| Function | Lines | Complexity | Purpose |
|----------|-------|------------|---------|
| `PMICalculator.indexCorpus` | 56-74 | O(n×w) | Corpus indexing |
| `PMICalculator.computePMI` | 83-113 | O(1) | PMI calculation |
| `PMICalculator.getCollocations` | 119-137 | O(p) | Top collocations |
| `PMICalculator.logLikelihoodRatio` | 170-190 | O(1) | Significance test |
| `pmiToDifficulty` | 208-237 | O(1) | PMI → difficulty |
| `frequencyToDifficulty` | 247-266 | O(1) | Frequency → difficulty |

---

## Dependencies

```
pmi.ts (independent, no external dependencies)
  │
  ├──> component-vectors.ts
  │      Used for LEXVector.relationalDensity calculation
  │
  ├──> lexical.ts
  │      Word collocation network analysis
  │
  ├──> priority.ts
  │      R (Relational density) calculation
  │
  └──> Services:
       ├── vocabulary-extraction (collocation extraction)
       ├── task-generation (collocation task generation)
       └── content-generator (collocation-based examples)
```

---

## Academic Foundation

- Church, K.W. & Hanks, P. (1990). *Word association norms, mutual information, and lexicography*. Computational Linguistics
- Dunning, T. (1993). *Accurate methods for the statistics of surprise and coincidence*. Computational Linguistics
- Evert, S. (2008). *Corpora and collocations*. In A. Lüdeling & M. Kytö (Eds.), Corpus Linguistics: An International Handbook
- Manning, C.D. & Schütze, H. (1999). *Foundations of Statistical Natural Language Processing*. MIT Press
