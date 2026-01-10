# Automatization Module

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/automatization.ts`
> **Status**: Active

---

## Context & Purpose

This module exists to measure and track the **psychological transformation of language knowledge** from slow, effortful retrieval to fast, unconscious access. It answers the fundamental question: "Has this learner truly internalized this language item, or are they still consciously translating and retrieving?"

**Business/User Need**: Language learners often struggle to understand why vocabulary they "know" fails them in real conversations. The answer lies in **automatization** (also called proceduralization). You might recognize a word on a flashcard with 2 seconds to think, but real communication demands sub-second retrieval. This module provides the diagnostic infrastructure to identify which items need more practice to become truly automatic.

**When Used**:
- During every practice response to build response time history
- After practice sessions to generate comprehensive automatization profiles
- When determining FSRS ratings (the spaced repetition scheduler uses automatization data)
- To recommend whether a learner can reduce practice frequency on well-automated items
- To generate personalized practice recommendations based on automatization gaps

---

## Theoretical Framework

### Anderson's ACT-R Theory (Plain English)

**Technical**: ACT-R (Adaptive Control of Thought-Rational) is a cognitive architecture describing how knowledge transforms from **declarative** (facts you can state) to **procedural** (skills you can perform automatically).

**Plain English**: Think of learning to drive. At first, you consciously think "check mirror, signal, check blind spot, turn wheel" (declarative). After years of practice, you just... merge lanes without consciously thinking through each step (procedural). Language follows the same pattern. Early learners consciously translate; fluent speakers just speak.

**Why This Matters for LOGOS**: The module tracks this transformation quantitatively. A learner with high automatization on "hospital" doesn't need to think "hmmm, h-o-s-p-i-t-a-l, that means medical building..." - they just know it instantly.

### DeKeyser's Skill Acquisition Theory

**Technical**: DeKeyser (2015) applied skill acquisition research to second language learning, demonstrating that L2 knowledge follows the same declarative-to-procedural pathway, but requires extensive **practice-in-context** to proceduralize.

**Plain English**: Language learning works like learning any complex skill (chess, surgery, sports). You start with explicit rules, then practice until those rules become automatic. The key insight is that grammar rules alone are not enough - you need thousands of meaningful practice repetitions.

**Why This Matters for LOGOS**: The module implements metrics that detect whether practice has actually caused proceduralization, not just memorization. A learner might score 100% accuracy but with 3-second response times - that is declarative, not procedural.

### Segalowitz's Cognitive Fluency Framework

**Technical**: Segalowitz (2010) identified **Coefficient of Variation (CV)** of response times as the key marker distinguishing true automaticity from mere speed. Low CV indicates stable, automatic processing; high CV indicates effortful, controlled processing.

**Plain English**: Imagine timing someone typing their name vs. a random string of letters. For their name, times are fast and consistent (low CV). For random letters, times are variable - sometimes fast guesses, sometimes slow searches (high CV). The consistency matters more than raw speed.

**Why This Matters for LOGOS**: The CV metric is the module's primary automatization indicator. Two learners might average 800ms, but if one has CV of 0.15 and another has CV of 0.50, the first is automated and the second is not.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/core/types.ts`: `MasteryStage`, `FSRSRating` - Core type definitions for mastery levels (0-4) and FSRS ratings (1-4 scale for Again/Hard/Good/Easy)

### Dependents (What Needs This)

- `src/core/tasks/traditional-task-types.ts`: References `automatization` as a cognitive process type, enabling task generation systems to create automatization-focused practice tasks
- **FSRS Integration** (via `recommendRating()`): The spaced repetition scheduler consumes automatization profiles to make more intelligent rating recommendations beyond simple correct/incorrect
- **Practice Recommendation Systems**: Any module determining "what should this user practice next" can use automatization profiles to identify items stuck in declarative phase

### Data Flow

```
User Response (with timing data)
       |
       v
ResponseObservation created
       |
       +---> calculateCV() ---------> RT stability score
       |
       +---> fitPowerLaw() ---------> Learning curve model
       |
       +---> analyzeSpeedAccuracy() -> SAT analysis
       |
       +---> analyzeTransfer() -----> Cross-context robustness
       |
       +---> analyzeInterference() -> Distraction resistance
       |
       v
createAutomatizationProfile()
       |
       v
AutomatizationProfile
       |
       +---> recommendRating() -----> FSRS scheduling decisions
       |
       +---> suggestPracticeConditions() -> User guidance
       |
       +---> isReadyForReducedPractice() -> Graduation decisions
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits in the **Core Algorithms Layer** of LOGOS architecture:

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
[Layer 4: CORE ALGORITHMS] <-- automatization.ts lives here
    |                           alongside fsrs.ts, irt.ts, pmi.ts
    v
Layer 5: Database (SQLite/Drizzle)
```

### Big Picture Impact

The automatization module is the **quality assurance system** for the entire learning process. Without it, LOGOS could only track binary correct/incorrect data. With it, LOGOS can distinguish between:

1. **Surface knowledge**: Correct but slow (needs more practice)
2. **Fragile knowledge**: Fast but inconsistent (needs consolidation)
3. **Context-bound knowledge**: Works in flashcards but not in sentences (needs transfer practice)
4. **Interference-vulnerable knowledge**: Fails when similar items are present (needs discrimination training)
5. **True automaticity**: Fast, consistent, robust, interference-resistant (ready for reduced practice)

This distinction enables **intelligent practice allocation**: Rather than practicing everything equally, LOGOS can focus practice time on items that have not yet automated, while reducing practice on fully automated items.

### Critical Path Analysis

**Importance Level**: High (Enhancement, not Critical Path)

- **If this module fails**: LOGOS falls back to basic accuracy-only metrics. Learning still works, but is less efficient. Users cannot see their automatization progress or receive automatization-specific recommendations.
- **Failure mode**: Graceful degradation. Most functions return safe defaults (level 0, high CV) when given insufficient data.
- **Dependencies on this**: The FSRS rating recommendation system uses automatization data to enhance rating suggestions. Without it, ratings become purely accuracy-based.

---

## Core Metrics Explained

### 1. Coefficient of Variation (CV) for Response Time Stability

**Technical**: CV = standard deviation / mean. For response times, CV < 0.25 indicates automatic processing; CV > 0.40 indicates effortful, controlled processing.

**Plain English**: Imagine measuring how long it takes someone to recognize their mother's face vs. a stranger's face. For mom, response times are fast AND consistent (low CV). For strangers, times are more variable - sometimes quick recognition, sometimes slow searching of memory (high CV). The automatization module uses this same principle: consistent response times indicate automatic retrieval.

**CV Thresholds in LOGOS**:
| CV Range | Interpretation | Meaning |
|----------|----------------|---------|
| < 0.15 | Highly Automatic | Near-native processing speed and consistency |
| 0.15 - 0.25 | Automatic | Fast, stable retrieval |
| 0.25 - 0.40 | Developing | Procedural but not yet automatic |
| 0.40 - 0.60 | Effortful | Still requires conscious effort |
| > 0.60 | Highly Variable | Declarative/searching retrieval |

### 2. Power Law of Practice Fitting

**Technical**: The Power Law of Practice (Newell & Rosenbloom, 1981) models skill acquisition as RT = a * N^(-b) + c, where N is practice count, b is learning rate, and c is the asymptotic floor.

**Plain English**: Every skill improves rapidly at first, then improvement slows down. The first 10 practice trials might cut your response time in half; the next 100 trials might only cut it by another 20%. This curve follows a predictable mathematical pattern. By fitting the learner's actual data to this pattern, the module can:
- Estimate how much more practice is needed to reach automaticity
- Predict the learner's eventual "floor" (fastest possible time)
- Detect if learning has stalled (poor model fit)

**Model Parameters**:
- **a (initial time)**: Starting point before any practice
- **b (learning rate)**: How quickly the learner improves (typical: 0.2-0.5)
- **c (asymptotic floor)**: The fastest the learner will ever be
- **R-squared**: How well the model fits the actual data

### 3. Speed-Accuracy Tradeoff (SAT) Analysis

**Technical**: SAT analysis examines whether accuracy remains stable across different response speeds by dividing responses into fast/normal/slow tertiles and comparing accuracy rates.

**Plain English**: When you rush, do you make more mistakes? For truly automated knowledge, the answer is "no" - you can respond quickly without sacrificing accuracy. For declarative knowledge, rushing causes errors because you need that time to consciously retrieve and verify the answer.

**SAT Coefficient Interpretation**:
- **Near-zero or negative**: Accuracy maintained at high speeds (automated)
- **Positive (> 0.15)**: Accuracy drops when rushed (not yet automated)

### 4. Transfer Robustness Across Contexts

**Technical**: Transfer analysis measures whether performance on an item remains stable across different usage contexts (different sentences, topics, task types).

**Plain English**: Can you use the word "prescribe" only in flashcard contexts, or also in reading comprehension, in conversations about medication, in writing about medical topics? If accuracy varies wildly by context, the knowledge has not generalized - it is "flashcard knowledge," not "usable knowledge."

**Robust Transfer Indicators**:
- Low variance across contexts (< 0.04)
- High mean accuracy across all contexts (>= 70%)

### 5. Interference Resistance

**Technical**: Interference analysis compares performance with and without distractors/competing alternatives present.

**Plain English**: Can you distinguish "prescribe" from "proscribe" when both are options? Or do similar-looking/sounding words cause confusion? Interference resistance is the hallmark of truly consolidated knowledge.

**Interference Cost**: Baseline accuracy minus accuracy-with-interference. Cost < 0.15 indicates resistance.

---

## AutomatizationProfile Structure

The `AutomatizationProfile` interface is the comprehensive output of the automatization assessment system. Each field represents a different dimension of automatization:

| Field | Type | Purpose |
|-------|------|---------|
| `objectId` | string | Links to the language object being assessed |
| `automatizationLevel` | 0-1 | Composite score combining all metrics |
| `category` | enum | Human-readable category (declarative/procedural/automatic/fully_automatic) |
| `estimatedStage` | 0-4 | Maps automatization to LOGOS mastery stages |
| `powerLaw` | object/null | Fitted learning curve model (null if insufficient data) |
| `cvAnalysis` | object | Response time consistency analysis |
| `satAnalysis` | object/null | Speed-accuracy tradeoff results |
| `transferAnalysis` | object/null | Cross-context robustness (requires multiple contexts) |
| `interferenceAnalysis` | object/null | Distraction resistance (requires interference data) |
| `trend` | -1 to 1 | Is automatization improving (+) or declining (-)? |
| `confidence` | 0-1 | How reliable is this assessment? Based on data quantity |
| `nObservations` | number | Raw count of responses analyzed |
| `lastUpdated` | timestamp | When this profile was generated |

### Category Mapping

```
automatizationLevel >= 0.90 --> "fully_automatic"  (near-native)
automatizationLevel >= 0.70 --> "automatic"        (fluent access)
automatizationLevel >= 0.40 --> "procedural"       (rule-based, moderate effort)
automatizationLevel <  0.40 --> "declarative"      (effortful, explicit)
```

---

## Automatization Level to Mastery Stage Mapping

The `estimateStageFromAutomatization()` function maps the continuous automatization level to LOGOS's discrete mastery stages:

| Stage | Automatization Level | Accuracy | Description |
|-------|---------------------|----------|-------------|
| 4 | >= 0.85 | >= 90% | Fully automatic, interference-resistant, near-native |
| 3 | >= 0.60 | >= 75% | Automatic retrieval, reliable under normal conditions |
| 2 | >= 0.30 | >= 60% | Procedural knowledge, requires effort but accessible |
| 1 | any | >= 40% | Early procedural, recognition possible |
| 0 | any | < 40% | Declarative/unknown, minimal automatization |

**Design Philosophy**: Automatization level alone does not determine stage. High automatization with poor accuracy might indicate "fast guessing" rather than true mastery. The combination ensures both speed and accuracy requirements are met.

---

## Memory Safety Constants

The module implements several constants to prevent memory exhaustion and ensure consistent behavior:

### MAX_RESPONSE_ENTRIES (10,000)

**Purpose**: Limits the number of response observations processed in any single analysis.

**Why It Exists**: A user might accumulate years of response data. Processing millions of observations would cause performance issues. The limit ensures bounded memory usage while still providing statistically meaningful analysis.

**Design Decision**: 10,000 observations is sufficient for reliable statistics (well beyond the minimum 20-30 needed for statistical power) while preventing unbounded growth.

### MAX_RESPONSE_TIME_MS (30,000ms / 30 seconds)

**Purpose**: Upper bound for valid response times.

**Why It Exists**: Responses longer than 30 seconds indicate the user looked away, got distracted, or the measurement was corrupted. Including such outliers would skew CV calculations.

### MIN_RESPONSE_TIME_MS (100ms)

**Purpose**: Lower bound for valid response times.

**Why It Exists**: Response times under 100ms are physiologically impossible for genuine language processing - they indicate misclicks, test errors, or cheating. Excluding them prevents artificial inflation of "fast" metrics.

### MIN_OBSERVATIONS Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `basic` | 5 | Minimum for any analysis at all |
| `cv` | 10 | Minimum for reliable CV calculation |
| `powerLaw` | 15 | Minimum for meaningful curve fitting |
| `sat` | 20 | Minimum for tertile-based SAT analysis |

**Design Philosophy**: More complex analyses require more data. The module gracefully degrades, returning null/default values when insufficient data exists rather than producing unreliable results.

---

## Integration with FSRS Rating Recommendations

The `recommendRating()` function bridges automatization metrics and spaced repetition scheduling:

### The Problem It Solves

Standard FSRS asks users to self-rate their recall (Again/Hard/Good/Easy). But learners are poor judges of their own learning - they often rate items "Easy" that are actually poorly automated, leading to premature graduation and forgetting.

### How Automatization Helps

By incorporating response time and automatization profile data, the function can override or guide the rating:

```
Input: AutomatizationProfile + responseTimeMs + isCorrect
Output: FSRSRating (1-4)

If incorrect: return 1 (Again)
If automatization >= 0.80 AND responseTime is fast: return 4 (Easy)
If automatization >= 0.50 AND responseTime is normal: return 3 (Good)
If automatization < 0.30 OR responseTime is slow: return 2 (Hard)
Default: return 3 (Good)
```

### rtRatio Calculation

The function compares current response time to the learner's personal mean for this item:

- `rtRatio <= 0.8`: Response was faster than usual (suggesting strengthening)
- `rtRatio <= 1.2`: Response was normal
- `rtRatio > 1.5`: Response was slower than usual (suggesting weakening)

This personalized comparison avoids comparing absolute times across different item types (a 1-second response on a simple word might be slow, but on a complex phrase might be fast).

---

## Technical Concepts (Plain English)

### Coefficient of Variation (CV)

**Technical**: A standardized measure of dispersion (SD/Mean) that allows comparison across different scales.

**Plain English**: If your response times for "apple" are [800, 850, 780, 820, 810] ms (mean=812, SD=25), your CV is 0.03 - highly consistent. If they are [500, 1500, 800, 2000, 700] ms (mean=1100, SD=573), your CV is 0.52 - highly variable.

**Why We Use It**: Raw variability (standard deviation) depends on mean - a 100ms SD might be tiny for 5-second responses but huge for 500ms responses. CV normalizes this, allowing comparison across items of different inherent difficulty.

### Power Law of Practice

**Technical**: A mathematical model (RT = a * N^-b + c) describing how performance improves with practice, with diminishing returns over time.

**Plain English**: Learning is like filling a bucket with a hole in it. At first, water (improvement) accumulates rapidly. But as the bucket fills, water leaks out at a rate that eventually matches the input, and the level (performance) stabilizes. The power law captures this mathematically.

**Why We Use It**: By fitting the model, we can predict future performance and estimate how much more practice is needed to reach target automaticity.

### Speed-Accuracy Tradeoff (SAT)

**Technical**: The empirical relationship between response speed and accuracy, where faster responses typically show lower accuracy for non-automatized knowledge.

**Plain English**: When taking a test, you can often get more right by taking more time. But for truly mastered knowledge (like your name, your multiplication tables), extra time does not help because you already know it instantly.

**Why We Use It**: SAT distinguishes "slow but correct" from "fast and correct." Both might show 90% accuracy, but only the second indicates true automatization.

### Tertiles

**Technical**: Division of a dataset into three equal parts based on ranking.

**Plain English**: Sort all responses by speed. The fastest third are "fast responses," the middle third are "normal," and the slowest third are "slow." This lets us compare accuracy across speed ranges without arbitrary cutoffs.

**Why We Use It**: SAT analysis needs to compare accuracy at different speeds. Tertiles provide a data-driven way to define "fast" and "slow" relative to the learner's own performance distribution.

---

## Change History

### 2026-01-08 - Documentation Created
- **What Changed**: Initial narrative documentation for automatization module
- **Why**: Support Shadow Map documentation requirement for all code files
- **Impact**: Enables developers and stakeholders to understand the theoretical and practical foundations of automatization measurement

### Module Original Implementation
- **What Changed**: Complete automatization measurement system based on cognitive psychology research
- **Why**: LOGOS needed to distinguish true mastery (automatic retrieval) from surface knowledge (declarative retrieval) to enable intelligent practice allocation
- **Impact**: Enables the entire "smart scheduling" capability - without this, LOGOS would be another basic flashcard app

---

## Academic References

1. **Anderson, J.R.** (1982, 1993). ACT-R cognitive architecture. *Psychological Review*.
2. **DeKeyser, R.** (2015). Skill Acquisition Theory. In *Theories in Second Language Acquisition*.
3. **Segalowitz, N.** (2010). *Cognitive Bases of Second Language Fluency*. Routledge.
4. **Newell, A. & Rosenbloom, P.S.** (1981). Mechanisms of skill acquisition and the law of practice. In *Cognitive Skills and Their Acquisition*.
5. **Harrington, M.** (2006). The lexical decision task as a measure of L2 lexical proficiency.
