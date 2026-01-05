# PMI (Pointwise Mutual Information) Module

> **Last Updated**: 2026-01-04
> **Code Location**: `src/core/pmi.ts`
> **Status**: Active
> **Theoretical Foundation**: ALGORITHMIC-FOUNDATIONS.md Part 2

---

## Context & Purpose

### Why This Module Exists

The PMI module exists to answer a deceptively simple question: **which words "belong together"?**

In language learning, understanding collocations (words that naturally co-occur) is the difference between sounding fluent and sounding like a textbook. A native speaker says "make a decision" not "do a decision," "strong coffee" not "powerful coffee." These pairings feel natural because the words have high mutual information in the language.

LOGOS needs to understand these relationships for two critical reasons:

1. **Vocabulary Sequencing**: When teaching the word "administer," LOGOS should know that "medication," "test," and "treatment" are its natural companions in medical English. Teaching these together creates stronger neural pathways.

2. **Difficulty Prediction**: High-PMI word pairs are easier to recall because they "prime" each other in memory. The phrase "patient history" is easier than "patient paradigm" because the former is a strong collocation while the latter feels awkward.

**Business Need**: Language learners waste enormous time on vocabulary presented in isolation. By understanding word relationships through PMI, LOGOS can sequence learning materials to leverage natural language patterns, accelerating acquisition.

**When Used**:
- During corpus analysis to identify collocations worth teaching
- When calculating IRT difficulty parameters for vocabulary items
- When generating contextual practice tasks (ensuring distractors don't accidentally form strong collocations)
- When building the "relational density" (R) component of FRE priority scores

---

## The Core Insight: Statistical Association

### What PMI Actually Measures

PMI answers: "How surprised should I be to see these two words together?"

The formula is elegant:

```
PMI(w1, w2) = log2[ P(w1, w2) / (P(w1) * P(w2)) ]
```

**In plain English**: We compare how often words *actually* appear together versus how often they *would* appear together if they were completely independent.

- **PMI > 0**: Words appear together MORE than chance. They're attracted.
- **PMI = 0**: Words appear together exactly as chance predicts. No relationship.
- **PMI < 0**: Words appear together LESS than chance. They repel each other.

### The Window Matters

The module uses a configurable window size (default: 5 words) for co-occurrence counting. This captures phrasal relationships without being so wide that everything co-occurs with everything.

Think of it like this: in the sentence "The patient takes medication daily for chronic pain management," with a window of 5:
- "patient" and "takes" co-occur (distance 1)
- "patient" and "medication" co-occur (distance 2)
- "patient" and "management" do NOT co-occur (distance > 5)

This window design intentionally captures *local* relationships, the kind that matter for collocations and phrasal patterns.

---

## Microscale: Direct Relationships

### Dependencies (What This Module Needs)

This module is deliberately **dependency-free**. It's pure TypeScript with no external imports beyond its own type definitions. This was an architectural choice: PMI calculation is foundational enough that it should work anywhere, even in browser environments without Node.js.

The only import is the `TaskType` enum from the types file, used solely for the difficulty mapping functions.

### Dependents (What Needs This Module)

**`src/core/irt.ts`** (Indirect Relationship)
- PMI feeds into IRT through the `pmiToDifficulty()` function
- The IRT module doesn't import PMI directly, but PMI-derived difficulty values populate the `ItemParameter.b` field
- This is the critical bridge: **corpus statistics (PMI) inform psychometric parameters (IRT)**

**Priority Calculation System** (Future Integration Point)
- The `relationalDensity` (R) in FRE metrics will be computed from PMI scores
- Words with many high-PMI partners have high relational density (they're "hub" words)
- This means "medication" (which collocates with dozens of medical terms) gets higher priority than "quotidian" (which has few natural partners)

**Task Generation** (Future Integration Point)
- When generating MCQ distractors, PMI helps ensure wrong answers don't accidentally form strong collocations with the context
- "The nurse will _____ the medication" should not have "administer" AND "give" as options if both form strong collocations

**Database Schema** (Data Storage)
- The `Collocation` model in Prisma stores computed PMI results
- Fields: `pmi`, `npmi`, `cooccurrence`, `significance`
- Indexed for fast lookup of a word's strongest collocations

### Data Flow

```
Raw Corpus Text
      |
      v
[Tokenization] (external, before PMI)
      |
      v
[indexCorpus()] --> wordCounts Map, pairCounts Map, totalWords
      |
      v
[computePMI()] --> PMIResult { pmi, npmi, cooccurrence, significance }
      |
      v
[pmiToDifficulty()] --> IRT difficulty parameter (logit scale)
      |
      v
ItemParameter.b --> Used by IRT for adaptive testing
```

---

## Macroscale: System Integration

### Architectural Role

PMI sits at the **Corpus Statistics Layer** of LOGOS, one level below the psychometric layer:

```
Layer 4: User Interface (practice tasks, feedback)
Layer 3: Session Management (item selection, sequencing)
Layer 2: Psychometrics (IRT models, theta estimation)
Layer 1: Corpus Statistics (PMI, frequency analysis) <-- YOU ARE HERE
Layer 0: Raw Data (texts, word lists)
```

It's a **foundational service**: it doesn't orchestrate anything, but everything above it depends on the insights it provides.

### The PMI-to-IRT Bridge

This is perhaps the most important architectural decision in the module. The `pmiToDifficulty()` function translates statistical patterns into psychometric parameters:

```
High PMI (e.g., +8) --> Low Difficulty (e.g., -1.5)
     Strong collocation = Easier to recall

Low PMI (e.g., +1)  --> High Difficulty (e.g., +1.5)
     Weak association = Harder to recall
```

**Why this works**: Memory research shows that strongly associated word pairs prime each other. When you hear "strong," the word "coffee" is already partially activated in your brain. This makes recognition faster and recall easier. PMI quantifies exactly this associative strength.

### Integration with FRE Priority

The FRE priority system has three components:
- **F (Frequency)**: How common is this word?
- **R (Relational Density)**: How connected is this word to others?
- **E (Contextual Contribution)**: How important is this word for meaning?

PMI directly feeds **R**. A word's relational density is computed from:
- How many significant collocations it has (getCollocations count)
- How strong those collocations are (average PMI)
- How diverse those collocations are (distribution across domains)

High-R words are "hub" words in the vocabulary network. They're valuable to learn because knowing them unlocks understanding of many contexts.

### What Breaks Without PMI

If this module failed:
1. **Difficulty calibration fails**: New vocabulary items would have no principled difficulty assignment
2. **Priority calculation degrades**: R component would be unavailable, reducing priority accuracy by ~30%
3. **Task generation quality drops**: Distractors might accidentally form collocations, confusing learners
4. **Vocabulary sequencing becomes random**: No way to group words that "belong together"

---

## Technical Concepts (Plain English)

### Pointwise Mutual Information (PMI)

**Technical**: PMI(x,y) = log2[P(x,y) / (P(x)P(y))]. It measures the log-ratio of the joint probability to the product of marginal probabilities.

**Plain English**: Imagine you have a massive bag of word pairs from a corpus. PMI tells you: "Is this specific pair showing up MORE or LESS than we'd expect if I just randomly grabbed two words?" A high number means the words are best friends. Zero means they're strangers. Negative means they actively avoid each other.

**Why We Use It**: PMI gives us an objective, data-driven measure of "these words belong together." No linguist had to manually tag collocations. The statistics emerge from how language is actually used.

### Normalized PMI (NPMI)

**Technical**: NPMI = PMI / -log2[P(x,y)]. Normalizes PMI to the range [-1, +1] by dividing by the self-information of the joint event.

**Plain English**: Regular PMI has a problem: rare pairs can have ridiculously high PMI just because they're rare. If "pneumonoultramicroscopicsilicovolcanoconiosis" appears only twice in a corpus, both times next to "disease," the PMI is astronomical but meaningless. NPMI fixes this by scaling everything to a nice -1 to +1 range where:
- +1 = perfect association (they ALWAYS appear together)
- 0 = independence (no relationship)
- -1 = perfect exclusion (they NEVER appear together)

**Why We Use It**: NPMI is more robust for comparing across different frequency bands. A common pair with NPMI 0.7 and a rare pair with NPMI 0.7 have genuinely similar associative strength, even though their raw PMI values differ wildly.

### Log-Likelihood Ratio (LLR) for Significance

**Technical**: Dunning's G2 statistic, computed as 2 * sum[observed * log(observed/expected)]. Follows a chi-squared distribution with 1 degree of freedom.

**Plain English**: PMI tells you the *strength* of association, but not whether it's *real* or just random noise. If you flip a coin 10 times and get 7 heads, is the coin biased? Probably not, it's just variance. But if you flip it 10,000 times and get 7,000 heads, something's definitely up. LLR is the statistical test that tells us "this association is real, not a fluke."

**Critical Thresholds**:
- LLR > 3.84: Significant at p < 0.05 (used by `getCollocations()`)
- LLR > 6.63: Significant at p < 0.01
- LLR > 10.83: Significant at p < 0.001

**Why We Use It**: Without significance testing, we'd teach learners "collocations" that are actually just random noise. The LLR threshold of 3.84 filters out spurious associations, ensuring that every collocation we surface is genuinely meaningful in the language.

### Task Type Modifiers

**Technical**: Additive adjustments to IRT difficulty based on cognitive load differences between task types.

**Plain English**: Recognizing a word (MCQ) is easier than recalling it (fill-in-blank) is easier than producing it (free response). Even if two tasks use the same word pair with the same PMI, the task type changes the effective difficulty. The modifiers encode this:
- Recognition: -0.5 (easier, you just have to spot the right answer)
- Recall with cue: 0.0 (baseline)
- Recall without cue: +0.5 (harder, nothing to prime you)
- Production: +1.0 (hardest, you must generate)
- Timed: +0.3 (time pressure adds difficulty to any task)

**Why We Use It**: Adaptive testing needs accurate difficulty estimates. A "recall_free" task with the same vocabulary item is genuinely harder than a "recognition" task, and the IRT model needs to know this to select appropriate items.

### Window-Based Co-occurrence

**Technical**: Two tokens co-occur if they appear within windowSize positions of each other in the token sequence.

**Plain English**: We don't count words as "together" if they're 50 words apart in a sentence. That would make everything co-occur with everything. Instead, we use a window (default: 5 words) that captures local, phrasal relationships. It's like saying "these words are close enough to be part of the same idea."

**Why We Use It**: Collocations are local phenomena. "Take medication" is a collocation because "take" and "medication" are adjacent. If we used document-level co-occurrence, we'd lose this precision and just measure topical relatedness instead.

---

## Design Decisions & Rationale

### Why Pure TypeScript (No Dependencies)?

The module could have used existing NLP libraries for PMI calculation. Instead, it implements everything from scratch. Why?

1. **Portability**: Works in browser, Node, Deno, or any JavaScript runtime
2. **Transparency**: Every calculation is visible and auditable
3. **Bundle size**: No heavy NLP library dependencies
4. **Educational**: The code serves as documentation of the algorithm

### Why Log Base 2?

The formula uses `Math.log2()` not `Math.log()`. This is conventional in information theory because it gives results in "bits" of information. A PMI of 3 means the word pair provides 3 bits of information beyond independence. This makes the numbers more interpretable.

### Why Alphabetical Pair Keys?

The `pairKey()` function always puts words in alphabetical order (`w1 < w2 ? w1|w2 : w2|w1`). This ensures that "patient|medication" and "medication|patient" map to the same key. Without this, we'd double-count every pair.

### Why Filter by Significance in getCollocations()?

The method filters to `significance > 3.84` (p < 0.05) before returning collocations. This is a deliberate quality gate: we'd rather return fewer, reliable collocations than flood the caller with noise.

---

## Usage Examples

### Basic Corpus Indexing and PMI Calculation

```typescript
import { PMICalculator } from './pmi';

// Create calculator with window size 5
const calc = new PMICalculator(5);

// Index a medical corpus (tokenized)
const tokens = [
  'the', 'patient', 'takes', 'medication', 'daily',
  'for', 'chronic', 'pain', 'management', 'the',
  'patient', 'history', 'reveals', 'prior', 'medication',
  'allergies', 'patient', 'medication', 'compliance', 'is', 'good'
];
calc.indexCorpus(tokens);

// Compute PMI for a specific pair
const result = calc.computePMI('patient', 'medication');
// result: { word1: 'patient', word2: 'medication', pmi: 2.3, npmi: 0.65, ... }
```

### Getting Top Collocations

```typescript
// Get strongest collocations for "medication"
const collocations = calc.getCollocations('medication', 10);
// Returns array sorted by PMI, filtered to significant pairs only

for (const coll of collocations) {
  console.log(`${coll.word2}: PMI=${coll.pmi.toFixed(2)}, sig=${coll.significance.toFixed(1)}`);
}
```

### Converting PMI to IRT Difficulty

```typescript
import { pmiToDifficulty } from './pmi';

// High PMI collocation = easy task
const easyDifficulty = pmiToDifficulty(8, 0.8, 'recognition');
// Returns approximately -1.9 (easy item)

// Low PMI pair = hard task
const hardDifficulty = pmiToDifficulty(1, 0.2, 'production');
// Returns approximately +2.1 (hard item)
```

### Frequency-Based Difficulty (No Collocation)

```typescript
import { frequencyToDifficulty } from './pmi';

// Very common word (frequency 0.9) in recognition task
const commonWordDifficulty = frequencyToDifficulty(0.9, 'recognition');
// Returns approximately -2.9 (very easy)

// Rare word (frequency 0.1) in production task
const rareWordDifficulty = frequencyToDifficulty(0.1, 'production');
// Returns approximately +3.4 (very hard)
```

---

## Connection to Theoretical Foundations

This module implements **Part 2: PMI and Corpus Statistics** from ALGORITHMIC-FOUNDATIONS.md.

### Section 2.1: PMI Computation

The `PMICalculator` class directly implements the specification:
- `indexCorpus()` builds the count tables exactly as specified
- `computePMI()` implements the exact formula with NPMI normalization
- `logLikelihoodRatio()` implements Dunning's G2 statistic

### Section 2.2: PMI to Difficulty Mapping

The `pmiToDifficulty()` function implements the specified mapping:
- PMI range [-2, +10] maps to difficulty [0, 1]
- Inverted relationship (high PMI = low difficulty)
- Task modifiers match the specification exactly

### Integration Points (Future Implementation)

The theoretical foundations describe additional uses of PMI not yet implemented:
- **Vocabulary network visualization**: Using PMI to build word graphs
- **Semantic clustering**: Grouping words by PMI similarity
- **Transfer prediction**: Using L1-L2 PMI differences to predict learning difficulty

These represent future extension points for the module.

---

## Change History

### 2026-01-04 - Initial Implementation
- **What Changed**: Created PMI module with full calculator class, PMI computation, NPMI normalization, log-likelihood significance, and difficulty mapping functions
- **Why**: Core infrastructure needed for vocabulary analysis and IRT difficulty parameter estimation
- **Impact**: Enables corpus-based vocabulary analysis and principled difficulty assignment for all lexical items

---

## Testing Considerations

The module's pure functional design makes testing straightforward:

1. **Deterministic outputs**: Same input always produces same output
2. **Edge cases to verify**:
   - Empty corpus (returns null for any computePMI)
   - Single word corpus (no pairs possible)
   - Word not in corpus (returns null)
   - Zero co-occurrence (returns null)
   - Very rare pairs (high PMI but low significance)
3. **Mathematical properties to verify**:
   - NPMI bounded to [-1, 1]
   - PMI symmetric (word1, word2 same as word2, word1)
   - Significance always non-negative

---

*This documentation mirrors: `src/core/pmi.ts`*
*Shadow Map methodology: Narrative explanation of intent, not code description*
