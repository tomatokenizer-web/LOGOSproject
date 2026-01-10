# Lexical Analysis Module (LEX Object Extraction)

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/lexical.ts`
> **Status**: Active

---

## Context & Purpose

This module exists because LOGOS needed the missing piece in its Stage 0 extraction pipeline: **LEX (Lexical) object extraction**. While phonological (G2P), morphological (MORPH), and syntactic (SYNT) components already had dedicated extraction modules, the lexical component - arguably the most fundamental unit of vocabulary learning - lacked systematic extraction capabilities.

The lexical module transforms raw text into structured **LexicalObject** instances that carry rich linguistic metadata. This metadata powers adaptive learning decisions: which words to teach first, how difficult they are for a given learner, and how they connect to other vocabulary items.

**Business Need**: Language learners need vocabulary instruction that prioritizes high-value words (frequent, useful, connected to their goals). Random vocabulary lists fail because they ignore corpus linguistics research showing that ~2000 high-frequency word families cover 80%+ of everyday English text. This module enables evidence-based vocabulary prioritization.

**When Used**:
- During corpus ingestion (extracting vocabulary from learning materials)
- When computing LanguageObjectVector.lexical for multi-component tasks
- For vocabulary profiling of texts to assess reading difficulty
- When generating vocabulary-focused practice tasks

---

## Academic Foundations

### Nation's Vocabulary Frequency Bands (2001)

The module implements I.S.P. Nation's landmark framework from "Learning Vocabulary in Another Language" (Cambridge University Press). Nation demonstrated that English vocabulary can be meaningfully stratified into frequency bands:

**Frequency Band System** (a tiered system organizing words by how commonly they appear in real-world text):

| Band | Range | Coverage | Implication |
|------|-------|----------|-------------|
| K1 | 1-1000 | ~70-75% | Core survival vocabulary |
| K2 | 1001-2000 | ~5-8% | Essential for fluency |
| K3 | 2001-3000 | ~2-3% | Expanding competence |
| K4 | 3001-4000 | ~1-2% | Academic/professional |
| K5 | 4001-5000 | ~1% | Specialized contexts |
| AWL | Academic Word List | ~9% (academic) | University-level texts |
| Off-list | Beyond 5000 | Variable | Domain-specific |

**Why This Matters for LOGOS**: The frequency band determines learning priority. A K1 word like "time" yields more return-on-investment than an off-list word like "phosphorescence." The module encodes this research directly into the `FrequencyBand` type and `getFrequencyBand()` function.

### Coxhead's Academic Word List (2000)

Averil Coxhead's Academic Word List (AWL) identified 570 word families that appear frequently across academic disciplines but not in general high-frequency lists. These words (like "analyze," "concept," "significant") are critical for learners targeting academic or professional English.

**Implementation**: The `AWL_WORDS` constant contains these headwords, and `isAWL()` checks membership. AWL status directly influences the `difficulty` calculation - these words earn a difficulty premium because they require formal register awareness.

### Laufer & Nation's Lexical Richness (1995)

The vocabulary profiling component (`VocabularyProfile`) implements metrics from Laufer & Nation's research on L2 written production:

- **Type-Token Ratio (TTR)**: Unique words / total words (vocabulary diversity measure)
- **Lexical Density**: Content words / total words (information load measure)
- **Coverage Analysis**: Percentage of text covered by each frequency band

These metrics power the `estimatedLevel` output (A1-C2), aligning vocabulary complexity with CEFR proficiency levels.

---

## Microscale: Direct Relationships

### Dependencies (What This Module Needs)

The lexical module is designed as a **pure TypeScript implementation** with zero external dependencies - a deliberate architectural choice for:
- Offline operation (Electron app requirement)
- Fast execution (no async dictionary lookups)
- Predictable behavior (deterministic algorithms)

**Internal dependencies within the module**:
- `tokenize()` feeds into `extractLexicalObjects()`
- `extractLemma()` is called by `analyzeLexical()`, `getFrequencyBand()`, `isAWL()`
- `estimatePOS()` informs `estimateConcreteness()` and `estimateImageability()`
- `toLexicalVector()` transforms `LexicalAnalysis` for vector storage

### Dependents (What Needs This Module)

**Direct consumers**:

1. **`src/core/types.ts`**: Imports conceptual alignment (the `LexicalObject` shape matches the `LanguageObject` contract)

2. **`src/core/morphology.ts`**: Shares lemmatization logic; morphological analysis complements lexical analysis for complete word representation

3. **`src/core/semantic-network.ts`**: Uses lexical items as nodes; collocations from lexical analysis feed into network edges

4. **Future: `src/main/services/state-priority.service.ts`**: Will consume FRE metrics from LexicalObjects to compute learning priority

5. **Future: Corpus Pipeline**: Will use `extractLexicalObjects()` and `createVocabularyProfile()` during text ingestion

### Data Flow

```
Raw Text
    |
    v
tokenize() --> Array of lowercase word tokens
    |
    v
extractLexicalObjects() --> For each unique lemma:
    |                           |
    |                           v
    |                       analyzeLexical()
    |                           |
    |                           +--> extractLemma()
    |                           +--> estimatePOS()
    |                           +--> getFrequencyBand()
    |                           +--> detectDomains()
    |                           +--> detectRegister()
    |                           +--> estimatePolysemy()
    |                           +--> estimateConcreteness()
    |                           +--> estimateImageability()
    |                           |
    |                           v
    |                       LexicalAnalysis
    |                           |
    |                           v
    |                       toLexicalVector()
    |                           |
    |                           v
    |                       LexicalVector
    |                           |
    |                           v
    |                       calculateLexicalDifficulty()
    |                           |
    |                           v
    v                       IRT difficulty estimate
LexicalObject[] (complete extraction result)
```

---

## Macroscale: System Integration

### Architectural Layer

The lexical module sits in the **Core Algorithms Layer** of LOGOS's three-tier architecture:

```
+--------------------------------------------------+
|           RENDERER LAYER (React UI)              |
|  - Vocabulary cards display LexicalVector data   |
|  - Progress shows frequency band coverage        |
+--------------------------------------------------+
                        |
                        | IPC Bridge
                        v
+--------------------------------------------------+
|        MAIN PROCESS LAYER (Electron + Services)  |
|  - Corpus pipeline calls extractLexicalObjects() |
|  - State service uses FRE metrics for priority   |
|  - Task generation queries by difficulty         |
+--------------------------------------------------+
                        |
                        | Pure function calls
                        v
+--------------------------------------------------+
|        CORE ALGORITHMS LAYER (Pure TypeScript)   | <-- YOU ARE HERE
|  - lexical.ts: LEX object extraction             |
|  - morphology.ts: MORPH analysis                 |
|  - semantic-network.ts: Collocation networks     |
|  - g2p.ts: PHON difficulty                       |
|  - irt.ts: Psychometric calculations             |
+--------------------------------------------------+
```

### Big Picture Impact

**The lexical module enables**:

1. **Evidence-Based Vocabulary Prioritization**: By computing FRE metrics (Frequency, Relational density, contextual contribution), the system can rank thousands of potential vocabulary items by learning value.

2. **Multi-Component Task Calibration**: The `LexicalVector` output feeds into the Q-matrix for task composition. A "fill-in-the-blank" task involving "significant" (AWL word) carries different component weights than one involving "big" (K1 word).

3. **Vocabulary Profiling for Content Selection**: The `createVocabularyProfile()` function allows LOGOS to assess whether a text is appropriate for a learner's current level - a K1/K2 coverage below 80% signals the text is too difficult.

4. **IRT-Based Difficulty Estimation**: The `calculateLexicalDifficulty()` function produces IRT b-parameters (difficulty) that integrate with the broader adaptive testing system.

**System Dependencies**:

Without this module:
- No systematic vocabulary extraction from corpora
- No frequency-based prioritization
- No vocabulary profiling for text selection
- No lexical component in LanguageObjectVector
- The entire "smart vocabulary learning" value proposition collapses

### Position in Component Cascade

LOGOS follows a theoretical linguistic cascade: PHON -> MORPH -> LEX -> SYNT -> PRAG

The lexical layer sits at the **center** of this cascade:
- Depends on: Phonological encoding (pronunciation), Morphological structure (word parts)
- Supports: Syntactic patterns (word combinations), Pragmatic conventions (register appropriateness)

This means lexical mastery serves as both a **prerequisite** for higher-level language skills and a **beneficiary** of lower-level automaticity.

---

## Key Data Structures (Technical Concepts in Plain English)

### LexicalObject

**Technical**: The primary output type representing a vocabulary item extracted from text, containing analysis, vector representation, FRE metrics, IRT difficulty, and corpus positions.

**Plain English**: A "vocabulary card" data structure. Imagine every word in a text becoming a learning flashcard - but instead of just the word and definition, each card carries a full dossier: how common is this word? How hard to learn? What domains does it belong to? How does it connect to other words? The LexicalObject is that dossier.

**Why We Use It**: The learning system needs structured data to make decisions. A raw string "significant" tells us nothing; a LexicalObject tells us it's AWL, formal register, academic domain, difficulty +1.5 on the IRT scale, and appears 3 times in the source text.

```typescript
interface LexicalObject {
  id: string;           // Unique identifier for database storage
  content: string;      // The lemma form ("run", not "running")
  type: 'LEX';          // Component type marker
  analysis: LexicalAnalysis;   // Full linguistic analysis
  vector: LexicalVector;       // Computational representation
  fre: { frequency, relationalDensity, contextualContribution };
  difficulty: number;   // IRT b-parameter estimate
  positions: number[];  // Where in source text this word appeared
}
```

### LexicalAnalysis

**Technical**: Complete linguistic analysis including lemma, POS, frequency band, AWL status, collocations, domains, register, polysemy count, concreteness, imageability, and estimated age of acquisition.

**Plain English**: Everything a linguist would want to know about a word, computed automatically. It's like running the word through a linguistic X-ray machine.

**Why We Use It**: Different aspects matter for different purposes. Teaching strategy cares about concreteness (concrete words are easier to learn). Difficulty estimation cares about frequency band. Task generation cares about register (don't use colloquial words in formal writing tasks).

### LexicalVector

**Technical**: A reduced representation of LexicalAnalysis optimized for storage and computation in the LanguageObjectVector framework.

**Plain English**: A "fingerprint" of the word's linguistic properties, compressed into a format that's easy to store in databases and use in calculations. It's the computational essence of the word.

**Why We Use It**: Full LexicalAnalysis is verbose (good for human inspection); LexicalVector is compact (good for machine processing). The system stores vectors, not full analyses.

### VocabularyProfile

**Technical**: Aggregate statistics about a text's vocabulary including token/type counts, TTR, coverage by frequency band, AWL coverage, lexical density, and estimated CEFR level.

**Plain English**: A "vocabulary report card" for a text. If you've ever seen readability scores like Flesch-Kincaid, this is similar but focused specifically on vocabulary sophistication.

**Why We Use It**: Learners shouldn't be given texts too far above their level. A VocabularyProfile lets LOGOS say "this text is 75% K1/K2, suitable for B1 learners" or "this text has 15% off-list words, too advanced for intermediate learners."

### FrequencyBand

**Technical**: A union type classifying words into corpus frequency tiers: k1, k2, k3, k4, k5, awl, offlist, unknown.

**Plain English**: A label saying "how common is this word in English?" K1 means "super common" (the, is, time). Offlist means "rare" (phosphorescence, surreptitious).

**Why We Use It**: Frequency is the strongest predictor of vocabulary difficulty. K1 words should be learned before K5 words. This type makes frequency a first-class concept in the system.

---

## Integration with LOGOS Architecture

### FRE Metrics Connection

The module computes the "F" in FRE (Frequency-Relational-contextual contribution):

```typescript
fre: {
  frequency: analysis.frequency,              // From frequency band
  relationalDensity: collocations.length / 10,  // From collocation count
  contextualContribution: polysemyCount > 1 ? 0.7 : 0.5  // From polysemy
}
```

These metrics feed into priority calculations (see `src/core/priority.ts`), determining which vocabulary items deserve practice time.

### IRT Difficulty Integration

The `calculateLexicalDifficulty()` function produces IRT b-parameters:

| Factor | Contribution |
|--------|--------------|
| Frequency band K1 | -2 (much easier) |
| Frequency band offlist | +2 (much harder) |
| AWL status | +1.5 |
| High polysemy | +0.2 per meaning |
| Low concreteness | +0.2 per point below 5 |
| Formal/technical register | +0.3 |

Result is clamped to [-3, +3] IRT logit scale, matching the system's psychometric framework.

### LanguageObjectVector Contribution

The `LexicalVector` output becomes the `lexical` component of multi-dimensional language object representations:

```typescript
// In LanguageObjectVector (conceptual)
{
  phonological: g2pVector,
  morphological: morphVector,
  lexical: lexicalVector,      // <-- From this module
  syntactic: syntVector,
  pragmatic: pragVector
}
```

This enables multi-component task calibration where the same word is measured across all five linguistic dimensions.

---

## Relationship with Other Modules

### morphology.ts

**Shared Concerns**:
- Both implement `extractLemma()` (with slightly different algorithms)
- Both analyze word structure (morphology focuses on affixes, lexical focuses on whole-word properties)
- Both contribute to LanguageObjectVector

**Division of Labor**:
- morphology.ts: "un-happy-ness" -> prefix "un-", root "happy", suffix "-ness"
- lexical.ts: "unhappiness" -> K3 band, abstract noun, formal register

**Potential Integration**: Morphological family size could enhance lexical difficulty estimation (words from large families are easier to learn).

### semantic-network.ts

**Complementary Functions**:
- semantic-network.ts: Provides synonym groups, antonyms, hypernym hierarchies
- lexical.ts: Computes collocation patterns, domain associations

**Data Flow**:
- Lexical analysis identifies words; semantic network maps relationships between words
- CollocationPattern from lexical.ts could populate SemanticEdge in the network
- Domain detection in lexical.ts aligns with SemanticField classification

**Integration Point**: The `collocations` field in `LexicalAnalysis` is currently empty (placeholder). Full implementation would use PMI calculations from `src/core/pmi.ts` and store results compatible with semantic-network.ts structures.

### pmi.ts

**Dependency**: The collocation patterns in `LexicalAnalysis` should be computed using PMI (Pointwise Mutual Information) from corpus co-occurrence data.

**Current State**: The module includes `CollocationPattern` type with MI score, T-score, and log-likelihood ratio fields, but actual computation is deferred to corpus pipeline integration.

---

## Usage Patterns

### Corpus Analysis

```typescript
import { extractLexicalObjects, createVocabularyProfile } from './lexical';

// During corpus ingestion
const text = await readCorpusFile('medical-textbook.txt');
const lexObjects = extractLexicalObjects(text);

// Store in database with priority ordering
const sortedByPriority = sortByLearningPriority(lexObjects);
for (const obj of sortedByPriority) {
  await languageObjectRepository.upsert(obj);
}
```

### Vocabulary Profiling

```typescript
import { createVocabularyProfile } from './lexical';

// Assess text difficulty
const profile = createVocabularyProfile(candidateText);

if (profile.coverage.k1.percentage + profile.coverage.k2.percentage < 80) {
  console.log('Text too difficult for intermediate learners');
  console.log(`Estimated level: ${profile.estimatedLevel}`);
}

if (profile.awlCoverage.percentage > 10) {
  console.log('High academic vocabulary - suitable for academic English goals');
}
```

### Filtering for Task Generation

```typescript
import { filterByDifficulty, filterByFrequencyBand, filterByDomain } from './lexical';

// Get words appropriate for user's level
const allObjects = await getLanguageObjects(goalId);
const atLevel = filterByDifficulty(allObjects, userTheta - 0.5, userTheta + 0.5);

// Focus on academic vocabulary
const academicWords = filterByFrequencyBand(atLevel, ['awl', 'k3', 'k4']);

// Domain-specific filtering
const medicalVocab = filterByDomain(academicWords, 'medical');
```

### Single Word Analysis

```typescript
import { analyzeLexical, toLexicalVector, calculateLexicalDifficulty } from './lexical';

const analysis = analyzeLexical('contraindication');
// analysis.frequencyBand = 'offlist'
// analysis.isAWL = false
// analysis.domains = ['medical']
// analysis.register = 'technical'

const vector = toLexicalVector(analysis);
const difficulty = calculateLexicalDifficulty(analysis);
// difficulty ~ 1.8 (quite difficult)
```

---

## Design Decisions and Rationale

### Why Pure TypeScript (No NLP Libraries)?

**Decision**: Implement lemmatization, POS tagging, and frequency lookup without external NLP libraries.

**Rationale**:
1. **Offline Operation**: LOGOS is an Electron desktop app that must work without internet
2. **Determinism**: External APIs might change; local algorithms are stable
3. **Performance**: No async network calls; sub-millisecond analysis
4. **Bundle Size**: NLP libraries add megabytes; this is kilobytes

**Trade-off**: Lower accuracy than statistical NLP models. Acceptable because:
- Frequency bands are pre-computed from established lists
- Heuristic POS is sufficient for difficulty estimation
- Perfect accuracy isn't required for adaptive learning

### Why Estimate Rather Than Lookup (Polysemy, Concreteness)?

**Decision**: Use heuristics for polysemy count, concreteness, imageability rather than lexical database lookups.

**Rationale**:
1. **Availability**: MRC Psycholinguistic Database and WordNet sense counts require external data files
2. **Speed**: Heuristics compute in microseconds; lookups require file I/O
3. **Good Enough**: The correlation between frequency and polysemy is strong; high-frequency words genuinely have more meanings

**Future Enhancement**: If lexical databases are bundled with the app, these functions can be upgraded to lookup-based while maintaining the same API.

### Why Include Domain and Register Detection?

**Decision**: Detect semantic domains (medical, legal, etc.) and register (formal, informal, etc.) for each word.

**Rationale**:
1. **Goal Alignment**: Learners have domain-specific goals (medical English); we need to tag vocabulary accordingly
2. **Task Appropriateness**: Formal vocabulary shouldn't appear in casual dialogue tasks
3. **Difficulty Context**: A word's difficulty depends on context - "stat" is easy in sports, hard in medicine

---

## Change History

### 2026-01-08 - Initial Implementation
- **What Changed**: Created complete lexical analysis module with extraction, profiling, and filtering
- **Why**: Stage 0 needed LEX object extraction to complete the component cascade
- **Impact**: Enables vocabulary-focused learning paths, multi-component task calibration, and corpus-based curriculum construction

### Planned Future Enhancements
- Integration with PMI module for actual collocation computation
- Collocation database population during corpus ingestion
- MRC database integration for psycholinguistic variables
- WordNet sense count lookup for accurate polysemy

---

## Technical Concepts Glossary

### Lemma
**Technical**: The canonical dictionary form of a word, from which inflected forms are derived.
**Plain English**: The "base form" you'd look up in a dictionary. "Running," "ran," and "runs" all have the lemma "run."
**Why It Matters**: We count word families, not surface forms. Learners who know "run" implicitly know "runs."

### Polysemy
**Technical**: The property of a word having multiple related meanings.
**Plain English**: Words that mean different things in different contexts. "Bank" can be a river bank or a financial bank.
**Why It Matters**: More meanings = more learning required. High-polysemy words are harder because learners must recognize which meaning applies.

### Type-Token Ratio (TTR)
**Technical**: The ratio of unique word forms (types) to total word occurrences (tokens) in a text.
**Plain English**: A measure of vocabulary diversity. A text using 100 different words out of 500 total has TTR = 0.2.
**Why It Matters**: Higher TTR indicates richer vocabulary use. Academic writing typically has higher TTR than casual speech.

### Lexical Density
**Technical**: The ratio of content words (nouns, verbs, adjectives, adverbs) to total words.
**Plain English**: How much "meaning" is packed into each word. "The important scientific discovery revolutionized understanding" has high lexical density.
**Why It Matters**: Higher lexical density = more information per sentence = harder to process.

### Concreteness
**Technical**: The degree to which a word refers to a perceivable entity versus an abstract concept.
**Plain English**: How easily you can picture the word. "Chair" is concrete (you can see it). "Justice" is abstract (you can't).
**Why It Matters**: Concrete words are easier to learn because they can be associated with mental images.

### Imageability
**Technical**: The ease with which a word evokes a mental image.
**Plain English**: How quickly an image pops into your head. "Elephant" = instant image. "Aspect" = no clear image.
**Why It Matters**: High imageability predicts faster vocabulary acquisition, especially for visual learners.

---

## References

- Nation, I.S.P. (2001). *Learning Vocabulary in Another Language*. Cambridge University Press.
- Coxhead, A. (2000). A new academic word list. *TESOL Quarterly*, 34(2), 213-238.
- Laufer, B., & Nation, P. (1995). Vocabulary size and use: Lexical richness in L2 written production. *Applied Linguistics*, 16(3), 307-322.
- Cobb, T. (2007). Computing the vocabulary demands of L2 reading. *Language Learning & Technology*, 11(3), 38-63.
