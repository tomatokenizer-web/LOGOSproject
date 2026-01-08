# DistributionalAnalyzer (E2)

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/engines/e2-distributional.ts`
> **Status**: Active

---

## Context & Purpose

This module implements the Distributional Analyzer (E2), one of five unified analysis engines in the LOGOS system. It exists to measure and analyze how language objects are distributed across multiple dimensions: frequency, variance, style, complexity, and domain.

**Business/User Need**: Language learners often develop imbalanced vocabularies - they may know many high-frequency words but lack domain-specific terminology, or they may only produce formal register language when informal would be appropriate. E2 provides the computational foundation for detecting these imbalances and identifying statistical outliers that require special attention.

**When Used**:
- When analyzing a learner's vocabulary distribution to identify gaps
- When comparing a learner's distribution against native speaker reference distributions
- When detecting outlier items that may need prioritized learning or review
- When classifying text style (formal/informal) for evaluation calibration
- When assessing vocabulary diversity using linguistic metrics (TTR, Zipf fit)

---

## Academic Foundation (Plain English)

### Zipf's Law for Natural Language

**Technical**: Zipf's law states that word frequency follows a power law distribution: the frequency of any word is inversely proportional to its rank in the frequency table. Mathematically: `f(r) ~ 1/r^alpha` where alpha is approximately 1 for natural language.

**Plain English**: Imagine listing every word in a book by how often it appears. The most common word ("the") might appear 10,000 times. The second most common ("of") appears roughly half as often. The third appears about a third as often. This pattern continues all the way down. If learner vocabulary follows this natural distribution, it indicates balanced acquisition.

**Why We Use It**: E2's `analyzeZipfFit()` method measures how closely a learner's vocabulary follows this natural distribution. An R-squared value above 0.7 with alpha between 0.5-2.0 suggests natural acquisition patterns. Deviation may indicate artificial vocabulary building (memorizing word lists) rather than natural exposure.

### Vocabulary Diversity Measures (TTR, MTLD, vocd-D)

**Technical**: Type-Token Ratio (TTR) measures lexical diversity as unique words / total words. However, raw TTR is sensitive to text length. Variations like Root TTR (Guiraud's Index = V/sqrt(N)), Log TTR (Herdan's C = log(V)/log(N)), and Hapax Legomena Ratio (words appearing exactly once / unique words) provide more stable measures.

**Plain English**: If someone writes 100 words using 50 different words, their vocabulary is more diverse than someone who writes 100 words using only 20 different words. But measuring this fairly is tricky - longer texts naturally repeat words. E2 uses multiple formulas that account for length, giving a reliable "vocabulary richness" score.

**Why We Use It**: Vocabulary diversity correlates with language proficiency. E2's `analyzeVocabularyDiversity()` returns multiple diversity indices so the system can track learner progress and identify when vocabulary is becoming stale (low diversity) or appropriately expanding (high diversity).

### Register/Style Classification (Biber, 1988)

**Technical**: Douglas Biber's multidimensional analysis identifies linguistic features that distinguish registers (formal academic, informal conversation, etc.). Key markers include modal verbs, contraction usage, subordination patterns, and lexical density.

**Plain English**: We can tell formal from casual language by spotting telltale words. "Furthermore" and "notwithstanding" signal formal writing. "Gonna" and "kinda" signal casual speech. E2 counts these markers to classify text style on a scale from informal (0) to formal (1).

**Why We Use It**: Style classification enables the evaluation engine (E3) to calibrate its expectations. It also helps identify if learners are stuck in one register and need exposure to others.

### Outlier Detection for Learning Priority

**Technical**: Z-score normalization ((value - mean) / stdDev) identifies values that deviate significantly from the population mean. Items with |z| > 2.5 are flagged as outliers requiring attention.

**Plain English**: If most of a learner's vocabulary items have frequency scores around 0.5, but one item scores 0.05 (very rare), that item is an outlier. It might be too advanced for the learner's current level, or it might be a specialized term that needs extra practice. E2 flags these outliers so the system can adjust learning priorities.

**Why We Use It**: Outliers often represent learning opportunities - either items that are holding the learner back (negative outliers) or items where the learner unexpectedly excels (positive outliers). E2 surfaces these for targeted intervention.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/core/engines/types.ts`: **DistributionalEngineConfig, DistributionalInput, DistributionalResult, DistributionDimension, DistributionStatistics, EngineResultMetadata** - All the type contracts that define what goes into and comes out of this engine.

- `src/core/priority.ts`: **FREMetrics** - The Frequency-Relational density-contextual contribution (E) metrics that E2 uses as source data for frequency and variance dimensions. When objects have FRE metrics attached, E2 extracts frequency for frequency distribution and relationalDensity for variance distribution.

- `src/core/types.ts`: **LanguageObjectType** - Core type definitions for the 7 object types (LEX, MWE, TERM, MORPH, G2P, SYNT, PRAG) that E2 can analyze.

- `src/core/dynamic-corpus.ts`: **DomainVocabularyStats** (mentioned in design) - While not directly imported, E2's domain distribution analysis conceptually aligns with the domain vocabulary statistics from the dynamic corpus system. The contextualContribution from FREMetrics serves as a proxy for domain specificity.

### Dependents (What Needs This)

- **State Priority Service** (`src/main/services/state-priority.service.ts`): May use E2 to analyze vocabulary distribution gaps and adjust learning priorities accordingly.

- **Task Composition Service** (`src/main/services/task-composition.service.ts`): Can query distributional outliers when selecting items for practice sessions that target specific weaknesses.

- **Evaluation Engine (E3)**: Uses style classification from E2 to calibrate genre-appropriate assessment criteria.

- **Session Optimizer Engine (E5)**: Can incorporate distributional analysis when balancing cognitive load and item variety within sessions.

- **Diagnostic Assessment Service** (`src/main/services/diagnostic-assessment.service.ts`): Uses gap analysis to compare learner performance against reference distributions for placement testing.

### Data Flow

```
Language Objects (with optional FREMetrics)
         |
         v
+---------------------------+
| extractDimensionValues()  |
| - frequency: from FRE.frequency
| - variance: from FRE.relationalDensity
| - style: computed from content markers
| - complexity: computed from word/syllable analysis
| - domain: from FRE.contextualContribution
+---------------------------+
         |
         v
+---------------------------+
| computeDistributionStats()|
| - mean, stdDev, median    |
| - skewness, kurtosis      |
| - quartiles               |
+---------------------------+
         |
         +--------+---------+
         |        |         |
         v        v         v
   Outliers    Gap      Style
  Detection  Analysis  Classification
         |        |         |
         v        v         v
+------------------------------------------+
| DistributionalResult                     |
| - dimensionStats (5 dimensions)          |
| - outliers (with z-scores)               |
| - gapAnalysis (Cohen's d, p-value)       |
| - metadata (time, confidence, warnings)  |
+------------------------------------------+
```

---

## Macroscale: System Integration

### Architectural Layer

E2 sits in the **Core Analysis Layer** of LOGOS's architecture:

```
Layer 1: UI (Electron Renderer)
         |
Layer 2: IPC Handlers (Main Process API)
         |
Layer 3: Services (Business Logic, Orchestration)
         |
Layer 4: [YOU ARE HERE] Core Engines (E1-E5)
         |
Layer 5: Pure Algorithms (Statistics, FRE calculation)
         |
Layer 6: Database (Prisma/SQLite)
```

E2 is a **statistical analysis wrapper** that adds:
- 5-dimensional distribution analysis (frequency, variance, style, complexity, domain)
- Outlier detection with z-score thresholds
- Gap analysis using Cohen's d effect size
- Vocabulary diversity metrics (TTR variants, Zipf fit)
- Style/register classification

### Big Picture Impact

The distributional analyzer enables **data-driven learning personalization** throughout LOGOS:

1. **Gap Detection**: By comparing a learner's vocabulary distribution against native speaker reference distributions, E2 identifies specific areas where the learner diverges from typical patterns. If a learner's complexity distribution is skewed toward simple words, the system knows to introduce more sophisticated vocabulary.

2. **Outlier-Based Prioritization**: Items flagged as statistical outliers receive special treatment. A word with an extremely low frequency score in a learner's vocabulary might be unnecessarily difficult; a word with unusually high complexity might be blocking progress.

3. **Style Awareness**: Classification of text as formal/neutral/informal enables register-appropriate teaching. A learner stuck in formal register can be guided toward more casual language, and vice versa.

4. **Vocabulary Health Monitoring**: Diversity metrics track whether a learner's vocabulary is growing in a healthy, varied way or becoming stagnant with repetitive patterns.

5. **Diagnostic Assessment Support**: When placing new learners, E2's gap analysis provides quantified measures of how far their current abilities deviate from target levels.

### Critical Path Analysis

**Importance Level**: High

- **If E2 fails**: The system loses its ability to detect vocabulary imbalances and distribution anomalies. Learning becomes generic rather than targeted at specific gaps. Outlier items that need special attention go unnoticed.

- **Failure mode**: Without distributional analysis, learners would receive undifferentiated instruction. A learner with excellent high-frequency vocabulary but poor domain-specific terminology would not receive targeted domain vocabulary practice.

- **Backup mechanism**: If E2 is unavailable, the system can fall back to simpler priority-based or frequency-only item selection, but loses the nuanced gap and outlier detection.

---

## Technical Concepts (Plain English)

### 5 Distribution Dimensions

**Technical**: E2 analyzes objects across 5 orthogonal dimensions: `frequency` (how often items appear in target texts), `variance` (consistency of usage patterns), `style` (formal/informal register), `complexity` (morphological and phonological difficulty), and `domain` (specificity to particular fields).

**Plain English**: Think of these as 5 different lenses for examining vocabulary. One lens shows which words are common vs. rare. Another shows which words are used consistently vs. sporadically. A third reveals whether words are formal or casual. The fourth measures how linguistically complex words are. The fifth identifies which words belong to specialized fields (medical, legal, technical).

| Dimension | Source Data | What It Reveals |
|-----------|-------------|-----------------|
| Frequency | FRE.frequency | Common vs. rare vocabulary coverage |
| Variance | FRE.relationalDensity | Consistency of word relationships |
| Style | Content markers | Register appropriateness |
| Complexity | Word/syllable analysis | Linguistic difficulty level |
| Domain | FRE.contextualContribution | Field-specific knowledge |

**Why We Use It**: Different learners have different gaps. One might need more common words; another might need formal register exposure. Multi-dimensional analysis reveals the specific nature of each learner's needs.

### Distribution Statistics

**Technical**: For each dimension, E2 computes: mean (average), standard deviation (spread), median (middle value), skewness (asymmetry), kurtosis (tail weight), and quartiles (25th, 50th, 75th percentiles).

**Plain English**: Imagine measuring the heights of students in a class. The **mean** is the average height. The **standard deviation** tells you if everyone is similar height or if heights vary a lot. The **median** is the middle student when everyone lines up. **Skewness** tells you if there are more short or tall students pulling the average. **Kurtosis** reveals if most students cluster near average or spread to extremes. **Quartiles** divide the class into four equal groups by height.

**Why We Use It**: These statistics give a complete picture of how values are distributed. A high skewness in frequency distribution might indicate a learner knows many rare words but few common ones - an unusual pattern worth investigating.

### Z-Score Outlier Detection

**Technical**: Z-score standardizes values as `(value - mean) / stdDev`. Values with |z| > threshold (default 2.5) are flagged as outliers. Results are sorted by absolute z-score to prioritize the most extreme deviations.

**Plain English**: If the average test score is 70 with a spread of 10 points, a score of 95 (z = 2.5) is unusually high. A score of 45 (z = -2.5) is unusually low. E2 finds vocabulary items that deviate this much from normal and flags them for attention.

**Why We Use It**: Outliers often signal problems or opportunities. A word with extremely low frequency might be too advanced. A word with extremely high complexity might be blocking learning. Identifying these helps target interventions.

### Cohen's d Gap Analysis

**Technical**: Cohen's d measures effect size as the standardized difference between two distributions: `d = (mean1 - mean2) / pooled_stdDev`. Effect sizes are interpreted as: |d| < 0.2 (negligible), 0.2-0.5 (small), 0.5-0.8 (medium), > 0.8 (large).

**Plain English**: Imagine comparing a learner's vocabulary frequency distribution to a native speaker's. Cohen's d answers "How different are they, accounting for natural variation?" A d of 0.8 means the learner's average is nearly a full standard deviation away from native - a large, meaningful gap. A d of 0.1 means they're essentially the same.

**Why We Use It**: When comparing learner distributions to reference distributions, Cohen's d provides a standardized measure of the gap that's easy to interpret and compare across different dimensions.

### Zipf Distribution Fit (R-squared and Alpha)

**Technical**: E2 fits a power law (Zipf) model to ranked frequencies using log-log linear regression. The alpha parameter is the negative slope (natural language alpha ~ 1). R-squared measures goodness of fit (> 0.7 indicates natural distribution).

**Plain English**: Natural language follows a predictable pattern: a few words are very common, many words are rare. When we plot word rank vs. frequency on a special graph (log scale), it forms a straight line. E2 measures how well a learner's vocabulary follows this line. If it fits well (R-squared > 0.7), the learner's vocabulary resembles natural language. If not, vocabulary may be artificially constructed (e.g., from memorizing random word lists).

**Why We Use It**: Healthy vocabulary acquisition follows natural patterns. E2's Zipf analysis can detect unnatural vocabulary building that might indicate rote memorization without contextual learning.

### Vocabulary Diversity Indices

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| TTR | V / N | Simple ratio, but decreases with text length |
| Root TTR (Guiraud) | V / sqrt(N) | More stable across text lengths |
| Log TTR (Herdan) | log(V) / log(N) | Even more stable, scale-invariant |
| Hapax Ratio | hapax / V | Proportion of words used only once |

**Technical**: V = number of unique word types, N = total word tokens, hapax = words appearing exactly once.

**Plain English**: If you write 1000 words using 300 different words, your vocabulary is more diverse than someone using only 100 different words. But the raw ratio (30% vs 10%) depends on essay length. These adjusted formulas give fairer comparisons across different text lengths.

**Why We Use It**: Vocabulary diversity correlates with language proficiency. E2 provides multiple indices so the system can track genuine growth in vocabulary richness, not just total word count.

### Style Classification (Formal/Neutral/Informal)

**Technical**: E2 counts occurrences of formal markers ("therefore", "hence", "notwithstanding", etc.) and informal markers ("gonna", "wanna", "cool", etc.). The style score = formalCount / (formalCount + informalCount), ranging from 0 (informal) to 1 (formal).

**Plain English**: We classify text register by spotting telltale words. Academic papers say "furthermore"; text messages say "btw". By counting these markers, E2 places text on a formality scale. This enables the system to understand what register a learner is comfortable with.

**Why We Use It**: Register awareness is crucial for language proficiency. A learner who only produces formal language needs practice with casual conversation. E2's style classification identifies these register gaps.

### Complexity Score Calculation

E2 computes complexity from four weighted factors:

| Factor | Weight | Measurement |
|--------|--------|-------------|
| Word Length | 0.30 | Average characters per word, normalized 3-15 range |
| Syllable Count | 0.25 | Vowel clusters as syllable proxy |
| Morpheme Count | 0.25 | Suffix indicators (-ing, -ed, -tion, etc.) |
| Sentence Depth | 0.20 | Punctuation density as structure proxy |

**Technical**: Each factor is normalized to 0-1, then weighted sum produces final complexity score.

**Plain English**: Complex language has long words with many syllables, multiple morphemes (prefixes, suffixes), and nested sentence structures. E2 approximates these using simple text analysis: word length, vowel patterns, common affixes, and punctuation frequency. The result is a 0-1 score where higher means more complex.

**Why We Use It**: Complexity distribution reveals if learners are stuck at a simple level or appropriately progressing to more sophisticated language.

---

## Key Implementation Patterns

### Stateless Engine Design

E2 is implemented as a stateless engine. Each `process()` call operates independently on the provided input without maintaining accumulated state. This design enables:

- **Parallel Processing**: Multiple analyses can run concurrently without interference
- **Predictable Behavior**: Same input always produces same output
- **Simple Testing**: No setup/teardown of state required

The `reset()` method exists to satisfy the `BaseEngine` interface but performs no operation.

### Dimension-Specific Value Extraction

Each distribution dimension uses a dedicated extraction function:

```
frequency   -> extractFrequencyValues()    -> FRE.frequency or 0
variance    -> extractVarianceValues()     -> FRE.relationalDensity or 0
style       -> extractStyleValues()        -> marker counting -> 0-1 score
complexity  -> extractComplexityValues()   -> weighted text analysis -> 0-1 score
domain      -> extractDomainValues()       -> FRE.contextualContribution or 0
```

This separation of concerns enables independent testing and future extension to additional dimensions.

### Confidence Calculation Based on Sample Size

E2 scales confidence based on how much data is available:

| Sample Size | Confidence | Statistical Reliability |
|-------------|------------|------------------------|
| >= 100 | 0.95 | Very reliable statistics |
| >= 50 | 0.90 | Reliable for most purposes |
| >= 30 | 0.85 | Adequate for general use |
| >= 20 | 0.75 | Limited reliability |
| >= 10 | 0.65 | Minimum viable sample |
| < 10 | N/A | Returns empty result with warning |

This ensures consumers understand the reliability of E2's outputs.

### Gap Analysis with Effect Size and Significance

When comparing against a reference distribution, E2 provides:

1. **Raw Gap**: Simple difference between means
2. **Normalized Gap (Cohen's d)**: Effect size accounting for variance
3. **Significance (p-value approximation)**: Statistical confidence

The significance is approximated using Welch's t-test without lookup tables:

| t-statistic | Approximate p-value |
|-------------|---------------------|
| > 3.5 | p < 0.001 |
| > 2.8 | p < 0.01 |
| > 2.0 | p < 0.05 |
| > 1.5 | p < 0.10 |
| <= 1.5 | p ~ 0.50 |

---

## Configuration Options

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `outlierThreshold` | 2.5 | Z-score beyond which items are flagged as outliers |
| `minSampleSize` | 10 | Minimum objects needed for reliable analysis |
| `styleClassification.formal` | 15 markers | Words indicating formal register |
| `styleClassification.informal` | 20 markers | Words indicating informal register |

### Default Style Markers

**Formal markers**: therefore, hence, consequently, furthermore, moreover, nevertheless, notwithstanding, whereas, hereby, pursuant, aforementioned, hereafter, therein, whereby, inasmuch

**Informal markers**: gonna, wanna, gotta, kinda, sorta, lemme, gimme, yeah, nope, ok, okay, cool, awesome, stuff, thing, like, basically, actually, literally, totally

These can be customized via configuration for different domains or languages.

---

## Utility Functions

### `quickDistributionSummary(values)`

Computes statistics for a single value array and provides human-readable interpretation:

- **Skewness interpretation**: "Right-skewed" (many low values, few high), "Left-skewed" (many high values, few low), or "Approximately symmetric"
- **Kurtosis interpretation**: "Heavy tails" (many outliers), "Light tails" (few outliers), or normal
- **Variability interpretation**: Based on coefficient of variation (CV = stdDev/mean): "High variability" (CV > 50%), "Moderate variability" (25-50%), "Low variability" (< 25%)

### `compareDistributions(dist1, dist2, label1, label2)`

Compares two distribution statistics and returns:

- **Cohen's d**: Standardized effect size
- **Effect size classification**: negligible, small, medium, or large
- **Interpretation**: Human-readable comparison statement

### `createDistributionalAnalyzer(config?)`

Factory function for clean instantiation with optional custom configuration.

---

## Advanced Analysis Methods

### `analyzeVocabularyDiversity(texts)`

Analyzes lexical diversity across multiple texts, returning:

- **TTR**: Type-Token Ratio (unique words / total words)
- **Root TTR**: Guiraud's Index (V / sqrt(N)), more length-stable
- **Log TTR**: Herdan's C (log(V) / log(N)), scale-invariant
- **Hapax Ratio**: Proportion of words appearing exactly once

### `analyzeZipfFit(frequencies)`

Analyzes whether frequency distribution follows natural Zipf pattern:

- **Alpha**: Zipf exponent (natural language ~ 1.0)
- **R-squared**: Goodness of fit (> 0.7 indicates natural distribution)
- **isNaturalDistribution**: Boolean combining both criteria

### `classifyStyle(objects)`

Classifies overall text style across a collection of objects:

- **overallStyle**: "formal", "neutral", or "informal"
- **formalScore**: Average formality (0-1)
- **distribution**: Breakdown of formal/neutral/informal proportions

---

## Change History

### 2026-01-08 - Initial Implementation

- **What Changed**: Created DistributionalAnalyzer with 5-dimension analysis capability
- **Why**: Needed statistical distribution analysis across vocabulary dimensions to detect gaps and outliers for personalized learning
- **Impact**: Enables data-driven identification of learner vocabulary imbalances, supporting targeted intervention and progress monitoring

### Academic Basis Integration

- **What Changed**: Incorporated Zipf's law analysis, vocabulary diversity measures (TTR variants), and style classification based on Biber's register analysis
- **Why**: Grounds distribution analysis in established linguistic and statistical research
- **Impact**: E2's analyses align with validated academic measures, ensuring meaningful and interpretable results

---

## Related Documentation

- `docs/narrative/src/core/engines/types.md` - Type definitions for all engines including E2's input/output types
- `docs/narrative/src/core/engines/e1-cooccurrence.md` - Sibling engine for co-occurrence analysis
- `docs/narrative/src/core/priority.md` - FREMetrics definitions used as E2 input
- `docs/narrative/src/core/dynamic-corpus.md` - Domain vocabulary statistics that inform domain distribution analysis
