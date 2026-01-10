# Fluency-Diversity State Module

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/state/fluency-diversity-state.ts`
> **Status**: Active

---

## Context & Purpose

This module exists to capture the **two dimensions of language proficiency that accuracy alone cannot measure**: fluency (how fast and consistently you access knowledge) and diversity (how broadly you can use knowledge across contexts). A learner might score 95% accuracy on vocabulary tests but still stumble in conversations because their retrieval is slow and inconsistent (low fluency), or they might only know how to use words in textbook contexts but not in casual speech (low diversity).

**Business/User Need**: Language learners frequently experience the frustrating gap between "knowing" a word and "being able to use" it naturally. Traditional learning apps track only accuracy, missing the critical dimensions that separate textbook knowledge from real-world fluency. This module provides the infrastructure to diagnose and address these gaps.

**When Used**:
- Recording every response time observation during practice sessions
- Tracking context usage when learners encounter items in different scenarios
- Collecting production samples when learners generate output (speaking, writing)
- Computing comprehensive fluency-diversity profiles for mastery assessment
- Generating personalized recommendations based on fluency vs. diversity balance
- Determining whether learners have achieved true proficiency (not just accuracy)

---

## Theoretical Framework

### Segalowitz (2010) - Cognitive Fluency

**Technical**: Segalowitz's framework identifies three components of cognitive fluency: **speed of access** (mean response time), **stability of access** (coefficient of variation), and **automaticity** (proportion of responses within automatic processing thresholds). True fluency requires all three: fast, consistent, and attention-free retrieval.

**Plain English**: Imagine asking someone their own phone number versus a random 10-digit number. For their number, responses are fast AND consistent - they do not sometimes take 1 second and sometimes 5 seconds (that would indicate they are still computing, not retrieving). The consistency of response times reveals whether knowledge has become truly automatic or still requires conscious effort.

**Why This Matters for LOGOS**: The `FluencyMetrics` interface directly implements Segalowitz's framework with `meanResponseTime`, `coefficientOfVariation`, and `automaticityRatio`. These three measures together distinguish genuine fluency from mere speed.

### Nation & Webb (2011) - Vocabulary Breadth and Use

**Technical**: Nation and Webb's vocabulary framework distinguishes between **receptive knowledge** (recognizing a word when encountered) and **productive knowledge** (generating the word when needed), and emphasizes that true vocabulary mastery requires use across multiple contexts and registers.

**Plain English**: You might recognize the word "ameliorate" when reading a newspaper article, but could you use it correctly in a job interview? In a text message? In an academic paper? Each context has different requirements - formality, collocations, connotations. Vocabulary knowledge is not a single thing but a network of abilities across usage situations.

**Why This Matters for LOGOS**: The `DiversityMetrics` interface tracks `uniqueContextCount`, `contextDistributionEvenness`, `productionVariety`, `receptiveProductiveRatio`, and `registerFlexibility`. Together, these capture whether learners can actually deploy vocabulary across the full range of real-world situations.

### Usage Space Expansion

**Technical**: Usage space expansion measures the learner's ability to transfer knowledge to novel contexts. It tracks how many distinct contexts, registers, and production forms the learner has successfully demonstrated mastery in.

**Plain English**: Think of vocabulary knowledge as a map you are coloring in. Each new context where you successfully use a word colors in another region. A word you only know in one context is a tiny colored dot; a word you can use in academic writing, casual conversation, formal presentations, and creative writing has colored in most of the map.

**Why This Matters for LOGOS**: The `contextUsages` Map and `productionSamples` array in `FluencyDiversityState` track this expansion over time, enabling the system to identify words that are "stuck" in limited contexts versus words that have achieved broad, flexible usage.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/core/types.ts`: `MasteryStage`, `TaskModality` - Type definitions for mastery levels (0-4) and input modalities (visual, auditory, mixed, text, audio)

### Dependents (What Needs This)

- `src/core/state/component-object-state.ts`: The `CognitiveInduction` interface references similar concepts (`proceduralFluency`, `usageSpaceExpansion`). This module provides the detailed implementation that feeds into those summary metrics.

- `src/core/automatization.ts`: Shares the concept of CV analysis and automaticity measurement. The fluency metrics here complement the `AutomatizationProfile` by adding the diversity dimension that automatization alone does not capture.

- **Task Generation Systems**: Services that decide what practice tasks to generate can use fluency-diversity profiles to determine whether a learner needs speed drills (low fluency) or context variation (low diversity).

- **Progress Reporting**: UI components displaying learner progress can use these profiles to show nuanced growth beyond simple accuracy percentages.

### Data Flow

```
User Response (with timing data)
       |
       v
recordRTObservation() -----> Adds to rtHistory circular buffer
       |
       v
User encounters item in new context
       |
       v
recordContextUsage() -------> Updates contextUsages Map
       |
       v
User produces output (speaking/writing)
       |
       v
recordProductionSample() ---> Adds to productionSamples array
       |
       v
Assessment requested
       |
       v
createFluencyDiversityProfile()
       |
       +---> calculateFluencyMetrics()
       |           |
       |           +---> RT mean, SD, CV
       |           +---> Automaticity ratio
       |           +---> Fastest decile
       |           +---> Trend direction
       |           +---> Composite fluency score
       |
       +---> calculateDiversityMetrics()
       |           |
       |           +---> Context count and evenness
       |           +---> Production variety
       |           +---> Receptive/productive ratio
       |           +---> Register flexibility
       |           +---> Composite diversity score
       |
       +---> estimateStageFromFluencyDiversity()
       +---> generateRecommendations()
       +---> Determine balance indicator
       |
       v
FluencyDiversityProfile
       |
       +---> Informs ComponentObjectState.cognitiveInduction
       +---> Guides task selection algorithms
       +---> Drives personalized practice recommendations
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits in the **Core State Layer** alongside other learner state tracking modules:

```
Layer 1: UI (React components)
    |
    v
Layer 2: IPC Handlers (Electron bridge)
    |
    v
Layer 3: Services (orchestration)
    |
    v
[Layer 4: CORE STATE] <-- fluency-diversity-state.ts lives here
    |                      alongside component-object-state.ts,
    |                      component-search-engine.ts
    v
Layer 5: Core Algorithms (IRT, FSRS, automatization)
    |
    v
Layer 6: Database (SQLite/Drizzle)
```

### Big Picture Impact

This module enables LOGOS to transcend the limitations of accuracy-only learning systems. Without it, LOGOS could not distinguish between:

1. **Accurate but slow**: Learner gets it right but takes 3 seconds (needs fluency practice)
2. **Fast but inconsistent**: Sometimes 500ms, sometimes 2000ms (needs consolidation)
3. **Narrow usage**: Perfect in flashcards, fails in reading (needs context diversity)
4. **Receptive-only**: Recognizes but cannot produce (needs production practice)
5. **Single-register**: Knows formal usage but not casual (needs register expansion)
6. **True proficiency**: Fast, consistent, broad, productive, flexible (ready to advance)

This distinction enables **targeted intervention**: rather than generic "practice more," LOGOS can recommend "practice speed drills" or "practice in conversation contexts" or "try using this in informal writing."

### Critical Path Analysis

**Importance Level**: High Enhancement

- **If this module fails**: LOGOS reverts to accuracy-only assessment. Learning continues but with significantly reduced diagnostic capability. Users lose visibility into fluency/diversity growth.

- **Failure mode**: Graceful degradation. Functions return default metrics (empty arrays, zero scores) when insufficient data exists. The system never crashes from missing fluency-diversity data.

- **Recovery**: State can be rebuilt from response history if the original state is lost. The `serializeState()` and `deserializeState()` functions enable persistence and recovery.

---

## Core Data Structures

### RTObservation - Response Time Recording

| Field | Type | Purpose |
|-------|------|---------|
| `responseTimeMs` | number | How long the learner took to respond (milliseconds) |
| `isCorrect` | boolean | Whether the response was correct (only correct responses contribute to fluency) |
| `modality` | TaskModality | Input/output channel (visual, auditory, etc.) |
| `timestamp` | number | Unix timestamp for temporal analysis and deduplication |

**Design Decision**: Fluency metrics are calculated only from **correct** responses. Including incorrect responses would conflate "slow because searching memory" with "slow because confused about the answer."

### ContextUsage - Breadth Tracking

| Field | Type | Purpose |
|-------|------|---------|
| `contextId` | string | Identifier for the usage context (e.g., "academic_writing", "casual_speech") |
| `successfulUses` | number | Count of correct uses in this context |
| `accuracy` | number | Success rate in this specific context |
| `averageRT` | number | Mean response time in this context |
| `lastUsed` | number | Recency tracking for the context |

**Design Decision**: Each context maintains its own accuracy and RT averages. This enables detection of "flashcard knowledge" - high accuracy in study contexts, low accuracy in natural contexts.

### ProductionSample - Output Tracking

| Field | Type | Purpose |
|-------|------|---------|
| `output` | string | The actual text/speech produced by the learner |
| `contextId` | string | Context of production |
| `qualityScore` | number | Assessment of production quality (0-1) |
| `timestamp` | number | When produced |

**Design Decision**: Storing actual outputs enables variety analysis - does the learner always use the same collocations, or do they demonstrate flexible, varied usage?

---

## Fluency Metrics Explained

### Mean Response Time (meanResponseTime)

**Technical**: Arithmetic mean of response times for correct responses, in milliseconds.

**Plain English**: On average, how long does it take the learner to correctly respond? Faster is better, but only when combined with accuracy and consistency.

### Response Time Standard Deviation (responseTimeSD)

**Technical**: Standard deviation of response times, measuring dispersion around the mean.

**Plain English**: How much do response times vary? A learner with mean 800ms and SD 50ms is much more consistent than one with mean 800ms and SD 400ms.

### Coefficient of Variation (coefficientOfVariation)

**Technical**: CV = SD / Mean. A dimensionless measure of relative variability.

**Plain English**: The "consistency score" that accounts for speed. A CV of 0.15 means response times typically vary by about 15% from the mean - very consistent. A CV of 0.50 means 50% variation - quite erratic.

**CV Thresholds**:
| CV Range | Interpretation | Meaning |
|----------|----------------|---------|
| < 0.15 | Highly Stable | Near-automatic, minimal processing variation |
| 0.15 - 0.25 | Stable | Fluent, reliable retrieval |
| 0.25 - 0.40 | Moderate | Developing but not yet automatic |
| 0.40 - 0.60 | Variable | Effortful, controlled processing |
| > 0.60 | Highly Variable | Searching, declarative retrieval |

### Automaticity Ratio (automaticityRatio)

**Technical**: Proportion of responses under the "fluent" threshold (1200ms by default).

**Plain English**: What percentage of responses are fast enough to be considered automatic? A ratio of 0.85 means 85% of responses happen within the automatic window.

### Fastest Decile RT (fastestDecileRT)

**Technical**: The response time at the 10th percentile (fastest 10% of responses).

**Plain English**: What is the learner capable of when everything clicks? This represents their "best case" performance and indicates potential automaticity ceiling.

### RT Trend (rtTrend)

**Technical**: Comparison of recent vs. older mean response times, normalized to -1 to +1 range.

**Plain English**: Is the learner getting faster (negative trend) or slower (positive trend)? A positive trend might indicate forgetting or interference from new learning.

### Fluency Score (fluencyScore)

**Technical**: Composite 0-1 score combining speed (40%), consistency (30%), and automaticity (30%).

**Plain English**: A single number summarizing overall fluency. Higher is better, but the component breakdown reveals what specifically needs work.

### Fluency Category (fluencyCategory)

**Technical**: Categorical interpretation of the fluency score.

**Mapping**:
- `highly_fluent`: Near-native speed and consistency
- `fluent`: Fast with occasional hesitation
- `developing`: Moderate speed, some variability
- `effortful`: Slow but accurate
- `struggling`: Slow and inconsistent

---

## Diversity Metrics Explained

### Unique Context Count (uniqueContextCount)

**Technical**: Number of distinct contexts where the item has been successfully used.

**Plain English**: How many different situations has the learner demonstrated they can use this knowledge? One context is narrow; five or more is diverse.

### Context Distribution Evenness (contextDistributionEvenness)

**Technical**: Normalized entropy of usage distribution across contexts. 1.0 = perfectly even distribution; 0.0 = all usage in one context.

**Plain English**: If a learner has used a word in 5 contexts but 90% of uses are in one context, evenness is low - they have not really diversified. Even distribution across contexts indicates robust, generalizable knowledge.

### Production Variety (productionVariety)

**Technical**: Count of unique output forms/collocations produced.

**Plain English**: Can the learner use this word in different sentence structures and collocations, or do they always produce the same memorized phrase? Variety indicates flexible, productive knowledge.

### Receptive-Productive Ratio (receptiveProductiveRatio)

**Technical**: Ratio of production tasks to total tasks (production + recognition).

**Plain English**: Is the learner practicing output (speaking, writing) or only input (reading, listening)? Balanced learners have ratios around 0.5; recognition-heavy learners have lower ratios and may struggle to produce on demand.

### Register Flexibility (registerFlexibility)

**Technical**: Estimated breadth of register coverage based on context categories.

**Plain English**: Can the learner use this in formal AND informal settings? Academic AND casual? The module estimates this by extracting register categories from context IDs.

### Diversity Score (diversityScore)

**Technical**: Composite 0-1 score combining context count (30%), evenness (25%), production variety (25%), and register flexibility (20%).

**Plain English**: Single number for overall diversity. Component breakdown shows whether diversity gaps are in context breadth, production practice, or register range.

### Diversity Category (diversityCategory)

**Mapping**:
- `highly_diverse`: Used across many contexts and forms
- `diverse`: Good spread with some gaps
- `moderate`: Limited to few contexts
- `narrow`: Mostly single context
- `minimal`: Very limited usage

---

## FluencyDiversityProfile - The Complete Picture

The `FluencyDiversityProfile` interface combines fluency and diversity metrics with assessment metadata:

| Field | Type | Purpose |
|-------|------|---------|
| `objectId` | string | Links to the language object |
| `fluency` | FluencyMetrics | Complete fluency assessment |
| `diversity` | DiversityMetrics | Complete diversity assessment |
| `combinedScore` | number | Average of fluency and diversity scores |
| `balanceIndicator` | enum | Which dimension needs more work |
| `estimatedStage` | MasteryStage | Mapped to LOGOS 0-4 stages |
| `recommendations` | string[] | Personalized practice suggestions |
| `observationCount` | number | Data quantity for reliability context |
| `confidence` | number | Assessment reliability (0-1) |
| `lastUpdated` | number | Timestamp |

### Balance Indicator

**Purpose**: Identifies which dimension is lagging so practice can be targeted.

- `balanced`: Fluency and diversity scores within 0.2 of each other
- `needs_fluency`: Diversity is ahead by > 0.2 (practice speed/consistency)
- `needs_diversity`: Fluency is ahead by > 0.2 (practice varied contexts)

### Stage Estimation

The `estimateStageFromFluencyDiversity()` function maps combined metrics to mastery stages:

| Stage | Requirement | Description |
|-------|-------------|-------------|
| 4 | Both highly_fluent AND highly_diverse, OR combined >= 0.85 | True proficiency |
| 3 | Combined >= 0.65 | Good command, minor gaps |
| 2 | Combined >= 0.35 | Developing, significant room for growth |
| 1 | Combined > 0.1 | Early stages, minimal but present |
| 0 | Combined <= 0.1 | Little to no demonstrated proficiency |

---

## Memory Safety Design

### MAX_HISTORY_ENTRIES (1,000)

**Purpose**: Bounds the `rtHistory` circular buffer.

**Why It Exists**: Learners accumulate response data indefinitely. Without a limit, memory usage grows unboundedly. 1,000 entries provides statistically robust analysis (far more than the ~30 needed for stable CV calculation) while bounding memory.

**Implementation**: When adding new observations, the array is sliced to `MAX_HISTORY_ENTRIES`, keeping newest first.

### MAX_CONTEXTS (500)

**Purpose**: Limits the `contextUsages` Map size.

**Why It Exists**: The system generates context IDs from various sources. Malformed or overly granular context generation could create unbounded unique contexts. 500 contexts is generous for any realistic usage pattern.

**Behavior**: New contexts are rejected once the limit is reached. Existing contexts continue to be updated.

### MAX_PRODUCTION_SAMPLES (200)

**Purpose**: Limits stored production outputs.

**Why It Exists**: Production samples include actual learner output text, which consumes more memory than numeric data. 200 samples provides sufficient variety analysis while bounding storage.

**Implementation**: Newest samples are kept, oldest are dropped via array slicing.

---

## State Management Functions

### createFluencyDiversityState(objectId)

Creates initial empty state for a new language object. All arrays empty, caches null, timestamps set to creation time.

### recordRTObservation(state, observation)

Adds a response time observation to history. Returns new state (immutable). Validates observation before adding. Invalidates fluency cache.

### recordContextUsage(state, contextId, success, responseTimeMs)

Updates or creates context usage record. Maintains running averages. Invalidates diversity cache. Respects MAX_CONTEXTS limit.

### recordProductionSample(state, sample)

Adds production sample. Maintains newest-first ordering. Invalidates diversity cache. Respects MAX_PRODUCTION_SAMPLES limit.

### Caching System

Calculated metrics are cached with validity periods to avoid recomputation on every access:

- `cachedFluency`: Stored fluency metrics
- `cachedDiversity`: Stored diversity metrics
- `cacheValidUntil`: Expiration timestamp
- `updateCache()`: Sets cache with configurable validity (default 5 minutes)
- `needsRefresh()`: Checks if cache has expired

**Design Decision**: Cache invalidation occurs automatically when new data is recorded. Explicit validity period allows periodic refresh even without new data.

---

## Serialization and Synchronization

### serializeState(state)

Converts state to JSON-compatible format. The `contextUsages` Map is converted to array of entries for JSON serialization.

### deserializeState(data)

Reconstructs state from serialized data. Rebuilds Map from entries. Respects memory limits during reconstruction. Clears caches (forces recalculation).

### mergeStates(local, remote)

Combines two states (e.g., syncing between devices):

- **RT History**: Deduplicates by timestamp, keeps newest, respects limit
- **Context Usages**: Takes most recently updated version of each context
- **Production Samples**: Deduplicates by output+timestamp combination

**Design Decision**: Last-write-wins strategy for contexts. Deduplication for observations prevents inflation from sync conflicts.

---

## Recommendations Generation

The `generateRecommendations()` function produces personalized practice suggestions based on profile analysis:

### Fluency-Based Recommendations

| Condition | Recommendation |
|-----------|----------------|
| Category is struggling/effortful | "Focus on speed building with timed recognition tasks" |
| CV > moderate threshold | "Practice for consistency - aim for steady response times" |
| RT trend positive (getting slower) | "Response times increasing - review and consolidate" |

### Diversity-Based Recommendations

| Condition | Recommendation |
|-----------|----------------|
| Context count < moderate | "Practice in more diverse contexts" |
| Receptive-productive ratio < 0.5 | "Increase production practice - try writing or speaking exercises" |
| Production variety < 3 | "Experiment with different collocations and usage patterns" |

### Balance Recommendations

| Condition | Recommendation |
|-----------|----------------|
| Fluency ahead by > 0.3 | "Fluency is ahead - focus on expanding usage contexts" |
| Diversity ahead by > 0.3 | "Diversity is ahead - focus on building speed and consistency" |
| Both high, balanced | "Maintain current practice for retention" |

---

## Integration with ComponentObjectState

The fluency-diversity metrics feed into the broader `ComponentObjectState` structure:

- `cognitiveInduction.proceduralFluency` corresponds to `fluencyScore`
- `cognitiveInduction.usageSpaceExpansion` corresponds to `diversityScore`
- `cognitiveInduction.automationLevel` integrates fluency data with automatization module

**Design Philosophy**: `FluencyDiversityState` provides detailed tracking; `ComponentObjectState.cognitiveInduction` provides the summary view used by task selection and scheduling algorithms.

---

## Integration with AutomatizationProfile

This module and `automatization.ts` track overlapping but distinct concepts:

| Concept | automatization.ts | fluency-diversity-state.ts |
|---------|-------------------|----------------------------|
| RT Analysis | CV, power law fitting | CV, mean, trend |
| Speed-Accuracy | SAT analysis | Fluency score |
| Context | Transfer analysis | Full context tracking |
| Production | Not tracked | Production samples, variety |
| Interference | Interference resistance | Not tracked |

**Complementary Design**: Automatization focuses on the cognitive transition from declarative to procedural. Fluency-diversity focuses on breadth and flexibility of use. A fully proficient learner needs both: automatic retrieval AND diverse application.

---

## Technical Concepts (Plain English)

### Circular Buffer

**Technical**: A fixed-size array where new entries overwrite the oldest when full.

**Plain English**: Like a DVR that can hold 100 hours of recording - when it is full, recording a new show automatically deletes the oldest. The RT history works the same way, always keeping the most recent 1,000 observations.

**Why We Use It**: Bounds memory usage while preserving the most relevant (recent) data.

### Normalized Entropy

**Technical**: Shannon entropy divided by maximum possible entropy, yielding a 0-1 scale.

**Plain English**: Entropy measures how "spread out" a distribution is. Maximum entropy means perfectly even spread (each context used equally). Normalizing puts this on a 0-1 scale where 1 = perfectly even and 0 = all concentrated in one bucket.

**Why We Use It**: Tells us whether context usage is genuinely diverse or just technically multi-context but practically concentrated.

### Cache Invalidation

**Technical**: Marking cached computed values as stale when underlying data changes.

**Plain English**: If you calculate the average of 100 numbers and then add a 101st number, the old average is wrong. Cache invalidation ensures we recalculate when the data changes, but do not wastefully recalculate when nothing has changed.

**Why We Use It**: Fluency/diversity calculations involve statistical operations. Recalculating on every access would be wasteful; never recalculating would yield stale results. Caching with invalidation provides the right balance.

### Immutable State Updates

**Technical**: All modification functions return new state objects rather than mutating the original.

**Plain English**: Instead of erasing and rewriting on a document, you make a copy with changes. The original remains unchanged. This enables undo, time-travel debugging, and safe concurrent access.

**Why We Use It**: Prevents subtle bugs from shared mutable state. Enables reliable state persistence and synchronization.

---

## Change History

### 2026-01-08 - Documentation Created
- **What Changed**: Initial narrative documentation for fluency-diversity-state module
- **Why**: Support Shadow Map documentation requirement for all code files
- **Impact**: Enables developers and stakeholders to understand the theoretical and practical foundations of fluency and diversity measurement

### Module Original Implementation
- **What Changed**: Complete fluency and diversity tracking system based on SLA research
- **Why**: LOGOS needed to distinguish true language proficiency from surface-level accuracy, capturing both the speed/consistency dimension (fluency) and the breadth/flexibility dimension (diversity)
- **Impact**: Enables nuanced progress tracking and targeted practice recommendations that address specific proficiency gaps

---

## Academic References

1. **Segalowitz, N.** (2010). *Cognitive Bases of Second Language Fluency*. Routledge. - Primary source for fluency metrics framework
2. **Nation, I.S.P. & Webb, S.** (2011). *Researching and Analyzing Vocabulary*. Heinle. - Foundation for diversity and vocabulary breadth concepts
3. **DeKeyser, R.** (2015). Skill Acquisition Theory. In *Theories in Second Language Acquisition*. - Contextualizes fluency within skill acquisition
4. **Shannon, C.E.** (1948). A Mathematical Theory of Communication. - Foundation for entropy-based evenness calculation
