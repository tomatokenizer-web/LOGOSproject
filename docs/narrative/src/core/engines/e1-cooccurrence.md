# UniversalCooccurrenceEngine (E1)

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/engines/e1-cooccurrence.ts`
> **Status**: Active

---

## Context & Purpose

This module implements the Universal Co-occurrence Engine (E1), one of five unified analysis engines in the LOGOS system. It exists to measure and analyze how often different language objects appear together across all possible combinations of object types.

**Business/User Need**: Language learners benefit enormously from understanding which words, patterns, and structures naturally co-occur. When learners practice related items together, they experience **transfer effects** (like learning vocabulary that naturally appears with certain grammatical patterns), making their study more efficient. E1 provides the computational foundation for identifying these beneficial pairings.

**When Used**:
- When the system needs to calculate how strongly two language objects are associated
- During UsageSpace expansion recommendations (suggesting what to learn next)
- When building collocation-aware practice sessions
- When analyzing learner corpora to find dominant word patterns

---

## Academic Foundation (Plain English)

### Pointwise Mutual Information (PMI)
**Technical**: PMI is an information-theoretic measure that quantifies the association between two events by comparing their joint probability to what would be expected under independence. The formula is: `PMI(x,y) = log2[P(x,y) / (P(x) * P(y))]`.

**Plain English**: Imagine you flip through thousands of pages of English text. If "make" and "decision" appear together far more often than chance would predict (given how common each word is separately), they have high PMI. This tells us "make a decision" is a genuine collocation, not a random pairing.

**Why We Use It**: Research from Frontiers in Psychology (2024) shows that learners with higher proficiency tend to use collocations with MI scores above 3 (strong associations). By measuring PMI, LOGOS can prioritize teaching word combinations that sound natural together.

### Lexicogrammar Integration (Halliday)
**Technical**: Systemic Functional Linguistics treats lexis (vocabulary) and grammar as two ends of a single continuum rather than separate systems. Lexicogrammatical patterns are recurrent configurations where particular words gravitate toward particular structures.

**Plain English**: Grammar and vocabulary are not separate boxes in language. Think of how "It depends on..." almost always leads to a noun phrase or gerund. The structure and the words are married together. E1 captures these marriages by tracking co-occurrence across different linguistic levels (lexical, morphological, syntactic, etc.).

**Why We Use It**: Advanced learners are distinguished not by knowing more words or more grammar separately, but by knowing which words go with which patterns. E1 enables LOGOS to teach this integrated knowledge.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/core/pmi.ts`: **PMICalculator class** - The mathematical engine that actually computes PMI values. E1 wraps this existing calculator to extend its capabilities to all object types.

- `src/core/types.ts`: **LanguageObjectType, UsageContext** - Core type definitions for the 7 object types (LEX, MWE, TERM, MORPH, G2P, SYNT, PRAG) and context structures.

- `src/core/engines/types.ts`: **CooccurrenceInput, CooccurrenceResult, CooccurrenceEngineConfig, ObjectPairType, UsageSpaceExpansionRecommendation** - All the type contracts that define what goes into and comes out of this engine.

### Dependents (What Needs This)

- **UsageSpace Tracking Service** (`src/main/services/usage-space-tracking.service.ts`): Uses E1's expansion recommendations to suggest what contexts a learner should practice next.

- **Task Composition Service** (`src/main/services/task-composition.service.ts`): Queries co-occurrence strength when deciding which objects to combine in a single learning task.

- **PMI Service** (`src/main/services/pmi.service.ts`): May delegate to E1 for cross-type co-occurrence queries that go beyond simple word-word PMI.

- **Session Optimizer Engine (E5)**: Uses co-occurrence data to create sessions where related items reinforce each other.

### Data Flow

```
Corpus tokens (from indexed text)
         |
         v
+-------------------+
| indexCorpus() or  |
| indexHeterogeneous|
| Corpus()          |
+-------------------+
         |
         v
PMICalculator instances (cached per object pair type)
         |
         v
+-------------------+      +-------------------+
| process()         |----->| CooccurrenceResult|
| (single pair)     |      | with PMI, NPMI,   |
+-------------------+      | relation type,    |
                           | significance      |
                           +-------------------+
         |
         v
getExpansionRecommendations() --> UsageSpaceExpansionRecommendation
         |
         v
Sorted list of objects to learn together (by transfer benefit)
```

---

## Macroscale: System Integration

### Architectural Layer

E1 sits in the **Core Analysis Layer** of LOGOS's architecture:

```
Layer 1: UI (Electron Renderer)
         |
Layer 2: IPC Handlers (Main Process API)
         |
Layer 3: Services (Business Logic, Orchestration)
         |
Layer 4: [YOU ARE HERE] Core Engines (E1-E5)
         |
Layer 5: Pure Algorithms (IRT, PMI, FSRS)
         |
Layer 6: Database (Prisma/SQLite)
```

E1 is a **domain-specialized wrapper** around the pure PMI algorithm. It adds:
- Multi-type support (28 object pair combinations)
- Relation type inference (6 linguistic relation categories)
- UsageSpace integration (learning recommendations)
- Caching for performance

### Big Picture Impact

The co-occurrence engine enables **network-aware learning** throughout LOGOS:

1. **Vocabulary Clustering**: Instead of learning words in isolation, learners encounter words that belong together (collocations, semantic fields, syntactic frames).

2. **Transfer Maximization**: When E1 identifies that LEX object "prescribe" and MWE object "a medication" co-occur strongly, the session optimizer can schedule them together, amplifying memory formation.

3. **UsageSpace Expansion**: E1 answers the question "If I've learned word X, what related items should I learn next to maximize my communicative range?"

4. **Component Integration**: By tracking cross-component co-occurrence (e.g., LEX-SYNT pairs), E1 supports Halliday's lexicogrammar principle at the algorithmic level.

### Critical Path Analysis

**Importance Level**: High

- **If E1 fails**: The system loses its ability to identify beneficial object groupings. Sessions become random assemblies rather than pedagogically optimized clusters. UsageSpace recommendations degrade to simple frequency-based suggestions.

- **Failure mode**: Without co-occurrence data, learners would study items in isolation, missing the association patterns that distinguish fluent speakers. Learning efficiency would drop significantly.

- **Backup mechanism**: If E1 is unavailable, the system can fall back to simpler priority-based item selection, but loses the transfer benefit optimization.

---

## Technical Concepts (Plain English)

### 28 Object Pair Types

**Technical**: Given 7 object types (LEX, MWE, TERM, MORPH, G2P, SYNT, PRAG), there are C(7,2) + 7 = 21 heterogeneous + 7 homogeneous = 28 possible pair combinations. Each pairing receives a dedicated PMICalculator instance.

**Plain English**: Think of 7 different "species" of language knowledge. Some species pair with themselves (word-word associations), others pair across species (word-grammar pattern associations). E1 tracks all 28 possible pairings, like a matchmaking service for language elements.

**Why We Use It**: Different pair types reveal different learning opportunities. LEX-LEX reveals collocations. LEX-SYNT reveals which words prefer which sentence patterns. MORPH-MORPH reveals productive affix combinations.

### 6 Relation Types

**Technical**: Relations are classified as `lexical`, `morphological`, `syntactic`, `phonological`, `pragmatic`, or `semantic`. The engine infers the most likely relation type from the object pair types.

**Plain English**: Not all co-occurrences are the same kind. "Strong coffee" is a lexical collocation. "Un-do" and "re-do" share a morphological pattern. "If...then" is a syntactic frame. E1 labels each relationship so the system can treat them appropriately.

| Relation Type | Example | When It Matters |
|---------------|---------|-----------------|
| Lexical | "heavy rain" | Collocation practice |
| Morphological | "-tion" + "-ment" (both nominalize) | Word formation tasks |
| Syntactic | verb + passive construction | Grammar drills |
| Phonological | rhyming patterns | Pronunciation training |
| Pragmatic | "Please" + request form | Register appropriateness |
| Semantic | synonyms, antonyms | Meaning network expansion |

### Normalized PMI (NPMI)

**Technical**: NPMI bounds the PMI value to the range [-1, 1] by dividing by the negative log of the joint probability: `NPMI = PMI / (-log2(P(x,y)))`.

**Plain English**: Regular PMI can range from negative infinity to positive infinity, which makes comparison difficult. NPMI rescales everything to fit between -1 (never appear together) and +1 (always appear together). This makes it easy to compare association strengths across different word pairs.

**Why We Use It**: E1 uses NPMI as the `relationStrength` score. This normalized scale lets us rank all associations fairly, regardless of how common or rare the individual objects are.

### Log-Likelihood Ratio (LLR) Significance

**Technical**: Dunning's log-likelihood ratio test measures whether an observed co-occurrence frequency is statistically significant. Values above 3.84 indicate p < 0.05; above 6.63 indicate p < 0.01.

**Plain English**: Just because two words appeared together 5 times doesn't mean they're truly associated. If you have millions of words, many random pairings will occur 5 times. LLR tells us whether the co-occurrence is "real" or just noise. The engine only considers associations with LLR > 3.84 as meaningful.

**Why We Use It**: This prevents E1 from recommending spurious associations based on small samples or coincidental pairings.

### Transfer Benefit Estimation

**Technical**: The engine estimates learning transfer by weighting relation strength (NPMI) by relation type. Morphological relations have the highest transfer weight (0.9); pragmatic relations have the lowest (0.4) due to context dependency.

**Plain English**: If you learn that "pre-" means "before," this knowledge transfers strongly to many new words (preview, predict, prepare). That's high transfer. But knowing when to use "Excuse me" vs. "Sorry" depends heavily on specific situations. That's lower transfer. E1 adjusts recommendations accordingly.

**Why We Use It**: When recommending what to learn next, E1 prioritizes items that will unlock the most new knowledge through transfer, not just items that co-occur frequently.

### Calculator Caching

**Technical**: E1 maintains a `Map<string, PMICalculator>` where keys are canonicalized pair type strings (e.g., "LEX-MWE"). Same-type pairs share one calculator; cross-type pairs get their own.

**Plain English**: Instead of creating a new calculator every time someone asks about word associations, E1 keeps calculators around in memory. This is like keeping frequently-used tools on your workbench instead of fetching them from storage every time.

**Why We Use It**: PMI calculation requires pre-indexed corpus data. Re-indexing for every query would be extremely slow. Caching ensures that once a corpus is indexed for a pair type, all future queries are fast.

---

## Key Implementation Patterns

### Relation Type Auto-Inference

The engine automatically determines the most appropriate relation type based on the object types involved:

```typescript
// Object pair → Default relation mapping
'LEX-LEX'   → 'lexical'       // Words co-occurring
'MORPH-MORPH' → 'morphological' // Affixes combining
'SYNT-SYNT' → 'syntactic'     // Structures nesting
'LEX-SYNT'  → 'syntactic'     // Words in structures
'LEX-PRAG'  → 'pragmatic'     // Words in contexts
```

This inference can be overridden by explicitly specifying `relationType` in the input.

### Heterogeneous Corpus Indexing

When indexing cross-type pairs (e.g., words with grammar patterns), E1 uses an **interleaving strategy**:

**Technical**: Token arrays from both types are interlaced: [w1, p1, w2, p2, w3, p3, ...]. This creates artificial adjacency that the windowed PMI calculation can detect.

**Plain English**: Imagine you have a list of words and a separate list of grammar tags. To find which words go with which patterns, E1 shuffles them together like a card deck, alternating one from each pile. Now when the PMI calculator looks for nearby pairs, it can spot cross-type associations.

### Confidence Calculation

Confidence is derived from the log-likelihood ratio significance:

| LLR Range | Confidence | Statistical Meaning |
|-----------|------------|---------------------|
| >= 10.83 | 0.99 | p < 0.001 (very certain) |
| >= 6.63 | 0.95 | p < 0.01 (quite certain) |
| >= 3.84 | 0.90 | p < 0.05 (probably real) |
| < 3.84 | 0.50-0.90 | Linear interpolation (uncertain) |

---

## UsageSpace Integration

### How E1 Feeds UsageSpace

The existing `ObjectUsageSpace` type tracks which contexts a learner has mastered for each object. E1's `getExpansionRecommendations()` method answers: "Given this object, what other objects should the learner tackle next?"

```
ObjectUsageSpace.collocations ← E1 provides collocation data
ObjectUsageSpace.expansionCandidates ← E1 ranks by transfer benefit
```

### Recommendation Generation

When asked for expansion recommendations, E1:

1. Takes a target object and candidate pool
2. Computes co-occurrence with each candidate
3. Filters by significance threshold (LLR > 3.84)
4. Ranks by relation strength (NPMI)
5. Estimates transfer benefit for each
6. Returns top-N with explanatory reasons

**Example recommendation reason**:
> "Strong lexical co-occurrence (NPMI=0.72). Learning together is highly recommended."

---

## Configuration Options

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `windowSize` | 5 | How many tokens apart can co-occurring items be |
| `minCooccurrence` | 2 | Minimum times items must appear together |
| `significanceThreshold` | 3.84 | LLR cutoff for statistical significance |
| `typeWeights` | undefined | Optional per-type importance scaling |
| `usageSpaceIntegration.autoUpdateUsageSpace` | - | Auto-sync results to UsageSpace |
| `usageSpaceIntegration.minStrengthForUsageSpace` | - | NPMI threshold for UsageSpace updates |
| `usageSpaceIntegration.maxRecommendations` | - | Cap on expansion recommendations |

---

## Utility Functions

### `getAllObjectPairTypes()`

Returns all 28 possible pair combinations. Useful for system initialization, batch processing, or administrative dashboards.

### `isHomogeneousPair(pairType)`

Quick check whether a pair is same-type (LEX-LEX) vs. cross-type (LEX-SYNT). Different processing strategies may apply.

### `createCooccurrenceEngine(config?)`

Factory function for clean instantiation with optional custom configuration.

---

## Change History

### 2026-01-08 - Initial Implementation
- **What Changed**: Created UniversalCooccurrenceEngine with full 28 pair type support
- **Why**: Needed unified co-occurrence analysis across all language object types to support lexicogrammar integration
- **Impact**: Enables network-aware learning throughout LOGOS; powers UsageSpace expansion recommendations

### Academic Basis Integration
- **What Changed**: Incorporated PMI significance thresholds from Frontiers in Psychology (2024) research
- **Why**: Ensures collocation strength aligns with empirical findings about learner proficiency
- **Impact**: MI > 3 threshold now used as indicator of "strong" collocations worth teaching

---

## Related Documentation

- `docs/narrative/src/core/pmi.md` - The underlying PMI calculation module
- `docs/narrative/src/core/engines/types.md` - Type definitions for all engines
- `docs/narrative/src/core/types.md` - Core LOGOS type system including UsageSpace
- `docs/narrative/src/main/services/usage-space-tracking.service.md` - Service consuming E1 recommendations
