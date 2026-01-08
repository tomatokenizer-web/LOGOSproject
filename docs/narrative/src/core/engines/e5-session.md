# E5: SessionOptimizer - Session-Level Learning Optimization Engine

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/engines/e5-session.ts`
> **Status**: Active
> **Engine ID**: `e5-session`
> **Version**: `1.0.0`

---

## Context & Purpose

The SessionOptimizer exists to solve a fundamental problem in language learning: **how do you sequence learning items within a single session to maximize retention while preventing cognitive overload?**

Without intelligent session optimization, learners face three common failure modes:
1. **Cognitive fatigue**: Too many difficult items in sequence exhausts working memory
2. **Inefficient interleaving**: Either too much blocking (easy but poor retention) or too much mixing (hard to learn patterns)
3. **Missed review opportunities**: Items due for FSRS review get deprioritized or forgotten

**Business/User Need**: When a learner sits down for a 25-minute study session, the system needs to intelligently select and order items so that:
- High-priority reviews happen on schedule (preserving long-term retention)
- Cognitive load stays within manageable bounds (Miller's 7 plus-or-minus 2)
- The interleaving strategy matches the learner's proficiency level (beginners need blocking; advanced learners benefit from interleaving)
- Rest points are recommended before mental fatigue sets in

**When Used**: This engine processes at the start of every learning session and can be re-invoked mid-session if the learner's state changes significantly (e.g., after a break or when fatigue is detected).

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

**From Engine Types (`./types.ts`):**
- `BaseEngine<TConfig, TInput, TOutput>`: The interface contract that all LOGOS engines implement, ensuring consistent process/processBatch methods
- `SessionEngineConfig`: Configuration parameters (maxCognitiveLoad, breakIntervalMinutes, defaultStrategy, levelStrategyMap, targetRetention)
- `SessionOptimizationInput`: The data structure containing candidate items, learner state, and optional strategy override
- `SessionOptimizationResult`: The output structure with optimized sequence, breaks, efficiency prediction
- `InterleavingStrategy`: The 5 strategy types (pure_blocking, pure_interleaving, hybrid, related, adaptive)
- `SessionItemPlacement`: Per-item placement info including position, reason, FSRS priority, cognitive load
- `EngineResultMetadata`: Standard metadata (processingTimeMs, confidence, method, warnings)

**From FSRS Module (`../fsrs.ts`):**
- `FSRS` class: The core spaced repetition scheduler for calculating retrievability and scheduling reviews
- `FSRSCard` type: Card state with difficulty, stability, lastReview, reps, lapses, state
- `MasteryState` type: Stage, FSRS card, cue-free/assisted accuracy, exposure count

**From Core Types (`../types.ts`):**
- `PriorityCalculation`: FRE-based priority scores from the priority engine
- `LanguageObjectType`: The 7 object types (LEX, MWE, TERM, MORPH, G2P, SYNT, PRAG)
- `ComponentCode`: The 5 linguistic components (PHON, MORPH, LEX, SYNT, PRAG)

### Dependents (What Needs This)

**Session Management Layer:**
- `src/main/services/session-manager.ts` (expected): Calls `process()` at session start to get optimized item sequence
- `src/renderer/components/SessionView.tsx` (expected): Displays items in optimized order, shows break recommendations

**Other Engines in the Pipeline:**
- E3 FlexibleEvaluationEngine: Receives items after session ordering for response evaluation
- Priority calculation flows: E5 uses priority scores but also feeds back by updating mastery states

**Analytics and Reporting:**
- Session summary generation: Uses `expectedEfficiency` predictions to compare against actual outcomes
- Learning analytics: Tracks which strategies were applied and their effectiveness

### Data Flow

```
Session Start Request
        |
        v
+------------------+
| candidateItems   | --> Items with FSRSCard, MasteryState, Priority
| learnerState     | --> currentTheta, fatigue, sessionMinutes
| sessionConfig    | --> maxItems, mode, goalId
| strategy?        | --> Optional override
+------------------+
        |
        v
[1. Strategy Determination]
   - Check explicit strategy override
   - If adaptive: estimate CEFR from average theta
   - Apply fatigue correction (high fatigue -> blocking)
        |
        v
[2. Item Scoring]
   - Calculate FSRS priority (urgency based on retrievability)
   - Calculate cognitive load (type + mastery adjustment)
   - Combine: 40% FSRS + 40% existing priority - 20% load penalty
        |
        v
[3. Item Filtering]
   - Sort by combined score
   - Exclude if: cognitive overload, recently seen (FSRS < 0.1), low priority
   - Track excluded items with reasons
        |
        v
[4. Sequence Optimization]
   - Apply strategy-specific ordering algorithm
   - pure_blocking: Group by type, sort within groups
   - pure_interleaving: Maximum mixing, no consecutive same type
   - hybrid: First half blocking, second half interleaving
   - related: Order by linguistic relatedness (0.3-0.7 optimal)
   - adaptive: Interleave by difficulty (easy-easy-hard pattern)
        |
        v
[5. Break & Efficiency Calculation]
   - Cumulative load threshold (maxCognitiveLoad * 3) -> break point
   - Pomodoro-style time-based breaks
   - Predict learningValue, retentionProbability, cognitiveLoadAverage
        |
        v
+---------------------------+
| SessionOptimizationResult |
| - optimizedSequence       |
| - appliedStrategy         |
| - recommendedBreaks       |
| - expectedEfficiency      |
| - excludedItems           |
| - metadata                |
+---------------------------+
```

---

## Macroscale: System Integration

### Architectural Layer

The SessionOptimizer sits at **Layer 2 (Application Logic)** in the LOGOS architecture, bridging between:

```
Layer 1: UI (React)
   |
   | Session start request
   v
Layer 2: E5 SessionOptimizer  <-- YOU ARE HERE
   |
   | Optimized sequence
   v
Layer 2: E3 EvaluationEngine (per-item evaluation)
   |
   | Results & mastery updates
   v
Layer 3: Database (FSRS cards, mastery states)
```

Within the 5-engine ecosystem, E5 is the **orchestrator** that determines the order and pacing of learning:

```
E1 Cooccurrence    E2 Distributional    E4 Phonological
       \                  |                  /
        \                 |                 /
         \                |                /
          +--------> E5 Session <--------+
                         |
                         v
                   E3 Evaluation
```

### Big Picture Impact

The SessionOptimizer is the **conductor of the learning orchestra**. Without it, the system would present items in an arbitrary order that ignores:
- Memory science (spacing effect, forgetting curve)
- Cognitive psychology (working memory limits, fatigue)
- Learning research (interleaving effects, difficulty sequencing)

**What This Enables:**
1. **Optimized retention**: Items are scheduled based on FSRS retrievability, ensuring reviews happen at the optimal forgetting point
2. **Sustainable sessions**: Cognitive load management prevents burnout and maintains engagement
3. **Adaptive difficulty**: Beginners get more blocking (easier to see patterns), advanced learners get interleaving (better long-term retention)
4. **Data-driven breaks**: Rest recommendations based on accumulated cognitive load, not arbitrary timers

**What Breaks If This Fails:**
- Sessions become cognitively exhausting (too many hard items in sequence)
- Retention drops (reviews happen too early or too late)
- Learner frustration increases (mismatched difficulty sequencing)
- Session efficiency metrics become meaningless (no baseline for comparison)

### Critical Path Analysis

**Importance Level**: Critical (Session-blocking)

- **If this fails**: Sessions cannot start with optimized content. Fallback would be priority-sorted presentation without cognitive load management.
- **Failure modes**:
  - Strategy selection infinite loop (mitigated by default fallback)
  - Cognitive load overflow (bounded by Math.min/max)
  - Empty candidate list (returns empty sequence gracefully)
- **Dependencies**: FSRS module must be available; candidate items must have FSRSCard data
- **Performance**: Sub-millisecond for typical session sizes (20-50 items), scales linearly

---

## Technical Concepts (Plain English)

### FSRS (Free Spaced Repetition Scheduler)

**Technical**: An algorithm that models memory decay as an exponential function `R = e^(-t/S)` where R is retrievability (recall probability), t is time elapsed, and S is stability (days until 90% retention). It schedules reviews at the optimal point where retrievability drops to the target retention rate (default 90%).

**Plain English**: Imagine your memory of a word is like a rubber band being stretched. FSRS calculates exactly when that rubber band is about to snap (you're about to forget) and schedules a review just before that happens. The more times you successfully review, the stronger the rubber band gets, and the longer between reviews.

**Why We Use It**: Reviewing too early wastes time; reviewing too late means relearning from scratch. FSRS finds the sweet spot where one review does maximum work for retention.

### Interleaving Effect

**Technical**: Research by Rohrer & Taylor (2007) demonstrated that mixing practice of different skills (ABC ABC ABC) produces better long-term retention than blocked practice (AAA BBB CCC), despite feeling harder during learning. This is an example of a "desirable difficulty."

**Plain English**: It's like training for a sport by mixing drills randomly instead of doing all of one drill first. Your brain has to work harder to identify "what type of problem is this?" which builds stronger, more flexible memory traces.

**Why We Use It**: For intermediate and advanced learners, interleaving produces 20-40% better retention on delayed tests. However, beginners benefit from blocking because they need to first establish what each pattern looks like.

### Cognitive Load Theory (Miller's 7 plus-or-minus 2)

**Technical**: George Miller's 1956 research established that working memory can hold approximately 7 plus-or-minus 2 "chunks" of information. Sweller's Cognitive Load Theory (1988) extended this to instructional design, showing that exceeding working memory capacity impairs learning.

**Plain English**: Your brain's "RAM" can only hold about 7 things at once. If we throw too many new, complex items at you in sequence, the earlier ones get pushed out before they can be saved to long-term memory. It's like trying to juggle too many balls - add one more and you drop them all.

**Why We Use It**: We assign cognitive load scores (1-10) to each item based on type and mastery level, then ensure the cumulative load doesn't exceed thresholds. New pragmatics items (high load) get spaced between automated vocabulary items (low load).

### CEFR (Common European Framework of Reference)

**Technical**: A 6-level scale (A1-C2) for language proficiency standardized by the Council of Europe. Each level corresponds to specific communicative competencies. LOGOS maps internal theta values to CEFR levels for strategy selection.

**Plain English**: CEFR is like the "belt system" for language learning. A1 is white belt (complete beginner), C2 is black belt (near-native). We use this to decide how to teach - beginners need simpler, more structured approaches; advanced learners can handle complex, mixed practice.

**Why We Use It**: Different proficiency levels benefit from different learning strategies. Our `levelStrategyMap` automatically selects appropriate interleaving:
- A1/A2: More blocking (pattern recognition)
- B1/B2: Hybrid/related (transitioning)
- C1/C2: Pure interleaving (maximum challenge)

### Spacing Effect

**Technical**: Cepeda et al. (2006) meta-analysis showed that distributed practice (spaced over time) produces better retention than massed practice (crammed). Optimal spacing interval is a function of the target retention period - longer gaps for longer retention.

**Plain English**: Studying something for 1 hour spread across 6 days beats 6 hours in one day. Your brain consolidates memories during the gaps between study sessions, like cement that needs time to set.

**Why We Use It**: FSRS implements spacing automatically by scheduling reviews at optimal intervals. The SessionOptimizer respects these intervals by prioritizing due items and excluding recently-seen items.

---

## Algorithm Details

### Cognitive Load Calculation

Each item receives a cognitive load score from 1-10:

```
Base Load (by object type):
  LEX (vocabulary)     = 2  (familiar, concrete)
  TERM (technical)     = 3  (specialized but similar to LEX)
  MWE (multi-word)     = 4  (multiple units to process)
  G2P (grapheme-phoneme) = 4  (rule application)
  MORPH (morphology)   = 5  (abstract patterns)
  SYNT (syntax)        = 6  (structural relationships)
  PRAG (pragmatics)    = 7  (context-dependent, most complex)

Mastery Adjustment:
  Stage 0 (new)        = x1.5  (everything is new)
  Stage 1 (learning)   = x1.3  (still effortful)
  Stage 2 (practicing) = x1.0  (baseline)
  Stage 3 (mastering)  = x0.8  (becoming easier)
  Stage 4 (automatic)  = x0.5  (minimal load)

Consecutive Penalty: +0.3 if same type as previous item
```

**Example**: A new (stage 0) syntactic pattern has load = 6 * 1.5 = 9. An automated (stage 4) vocabulary item has load = 2 * 0.5 = 1.

### Interleaving Strategy Selection

The adaptive strategy uses theta-to-CEFR mapping:

```
Theta Range    -> CEFR Level -> Default Strategy
θ < -2         -> A1         -> pure_blocking
-2 <= θ < -1   -> A2         -> hybrid
-1 <= θ < 0    -> B1         -> hybrid
0 <= θ < 1     -> B2         -> related
1 <= θ < 2     -> C1         -> pure_interleaving
θ >= 2         -> C2         -> pure_interleaving

Fatigue Override: If fatigue > 0.7, always use pure_blocking
(Rationale: High fatigue = reduced working memory = simpler approach)
```

### Related Items Ordering

The `related` strategy seeks items with "moderate relatedness" (0.3-0.7):

```
Relatedness Scores:
  Same type                        = 1.0 (too similar)
  Linguistically related types     = 0.5 (optimal)
  Unrelated types                  = 0.1 (too different)

Related Pairs:
  LEX <-> MWE, TERM, MORPH
  MWE <-> LEX, SYNT, PRAG
  MORPH <-> LEX, G2P
  G2P <-> MORPH, LEX
  SYNT <-> MWE, PRAG
  PRAG <-> SYNT, MWE
  TERM <-> LEX, MWE
```

The algorithm maximizes `1 - |relatedness - 0.5| * 2`, favoring items that are related but not identical.

---

## Configuration Reference

### SessionEngineConfig

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxCognitiveLoad` | 7 | Maximum cognitive load per item slot (Miller's number) |
| `breakIntervalMinutes` | 25 | Pomodoro-style break interval |
| `defaultStrategy` | `'adaptive'` | Strategy when none specified |
| `levelStrategyMap` | See below | CEFR level to strategy mapping |
| `targetRetention` | 0.9 | FSRS target retention rate |

**Default Level Strategy Map:**
```typescript
{
  'A1': 'pure_blocking',
  'A2': 'hybrid',
  'B1': 'hybrid',
  'B2': 'related',
  'C1': 'pure_interleaving',
  'C2': 'pure_interleaving',
}
```

---

## Change History

### 2026-01-08 - Documentation Created
- **What Changed**: Initial narrative documentation for E5 SessionOptimizer
- **Why**: Shadow documentation requirement for all code files
- **Impact**: Enables understanding of session optimization for developers and stakeholders

### Initial Implementation
- **What Changed**: Created SessionOptimizer class implementing BaseEngine interface
- **Why**: Need intelligent session-level learning optimization combining FSRS, interleaving, and cognitive load management
- **Impact**: Enables scientifically-grounded session optimization across all LOGOS learning sessions

---

## References

### Academic Foundations

1. **FSRS-4 Algorithm**: Open-source spaced repetition algorithm improving on SM-2/SM-18. See [fsrs4anki](https://github.com/open-spaced-repetition/fsrs4anki)

2. **Rohrer, D., & Taylor, K. (2007)**. The shuffling of mathematics problems improves learning. *Instructional Science, 35*(6), 481-498. - Foundation for interleaving effect

3. **Sweller, J. (1988)**. Cognitive load during problem solving: Effects on learning. *Cognitive Science, 12*(2), 257-285. - Cognitive load theory

4. **Miller, G. A. (1956)**. The magical number seven, plus or minus two. *Psychological Review, 63*(2), 81-97. - Working memory capacity

5. **Cepeda, N. J., et al. (2006)**. Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354-380. - Spacing effect meta-analysis

### Related LOGOS Documentation

- `ALGORITHMIC-FOUNDATIONS.md`: Full specification of all algorithms
- `docs/narrative/src/core/fsrs.md`: FSRS module narrative (when created)
- `docs/narrative/src/core/engines/types.md`: Engine type definitions narrative (when created)
