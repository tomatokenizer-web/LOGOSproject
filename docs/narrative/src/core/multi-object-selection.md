# Multi-Object Selection Module

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/multi-object-selection.ts`
> **Status**: Active
> **Pipeline Stage**: Stage 3 (Task Generation)

---

## Context & Purpose

This module exists to solve a critical question in intelligent tutoring: **"When presenting a learning task, which language objects should be combined together?"** It provides the pre-calibration guidance that determines optimal object groupings before tasks are generated.

**The Core Problem**:
Language learning tasks rarely involve just one concept. A sentence completion task might simultaneously test vocabulary knowledge (LEX), grammatical structure (SYN), and appropriate register (PRAG). Simply throwing random combinations at learners creates cognitive chaos. Combining too-easy items wastes time. Combining conflicting items (like similar-sounding words that interfere with each other) actively harms learning.

**Business/User Need**:
Learners need tasks that challenge them appropriately without overwhelming working memory. This module calculates whether combining specific language objects will help (through transfer and reinforcement) or hurt (through interference and overload) the learning process.

**When Used**:
This module is invoked during Stage 3 (Task Generation) of the learning pipeline. After the system selects which objects are due for practice, this module determines which objects can be safely combined into a single task before sending them to the content generation service.

---

## Theoretical Framework

### Academic Foundations

This module synthesizes three major research traditions:

#### 1. Q-Matrix Design (Tatsuoka, 1983)
**Technical**: A Q-matrix is a binary matrix that maps test items to the cognitive skills they require. Each row represents an item, each column a skill, and entries indicate whether that skill is needed.

**Plain English**: Think of it as a recipe card for test questions. Just as a recipe lists required ingredients, a Q-matrix lists which mental skills are needed to answer each question correctly.

**Why We Use It**: Q-matrices let us know in advance which language components (phonology, morphology, lexicon, syntax, pragmatics) a task will exercise, enabling intelligent combination decisions.

#### 2. Skill Combination Theory (VanLehn, 1988)
**Technical**: VanLehn's research on skill acquisition established that combining multiple skills in practice has non-linear effects on cognitive load. The total load is not simply the sum of individual loads---there are switching costs and interaction effects.

**Plain English**: It's like juggling: keeping two balls in the air isn't twice as hard as one---it requires coordinating their timing. Mental skills work similarly; combining them costs extra mental effort beyond the individual skills.

**Why We Use It**: The `calculateCombinedCognitiveLoad` function implements skill combination theory to estimate whether a proposed grouping will exceed working memory capacity.

#### 3. Interleaving Research (Rohrer & Taylor, 2007)
**Technical**: Interleaving (mixing different topics in practice) produces better long-term retention than blocked practice (mastering one topic before moving to the next), despite feeling harder and producing worse immediate performance.

**Plain English**: Studying A-B-A-B beats studying A-A-B-B, even though A-A-B-B feels easier. The difficulty of switching between topics strengthens memory.

**Why We Use It**: The `identifyBenefits` function explicitly calculates interleaving bonuses when objects from different component types are combined, encouraging productive difficulty.

---

## Core Concepts (Plain English)

### ObjectSelectionProfile
**Technical**: A data structure containing metadata about a language object needed for selection decisions: component type, mastery stage, difficulty, cognitive load, priority, and relationship data (related/conflicting objects).

**Plain English**: A "profile card" for each vocabulary word or grammar rule, listing everything the system needs to know to decide whether it can be combined with other items in a task.

**Key Fields**:
- `objectId`: Unique identifier (like a student ID)
- `component`: Which language system it belongs to (LEX, MORPH, G2P, SYN, PRAG)
- `masteryStage`: How well the learner knows it (0-4 scale)
- `difficulty`: How hard it is objectively (-3 to +3 IRT scale)
- `cognitiveLoad`: How much mental effort it requires (1-5 scale)
- `relatedObjects`: Items that might transfer knowledge (like word families)
- `conflictingObjects`: Items that might cause confusion (like false friends)

### CombinationFeasibility
**Technical**: The result of analyzing whether a proposed object combination is pedagogically viable, including combined difficulty, total cognitive load, predicted success probability, risk factors, benefits, and an overall score.

**Plain English**: A "safety report" for a proposed task grouping. Before combining items, this tells us: Will it be too hard? What could go wrong? What learning benefits might we get?

### CombinationRisk
**Technical**: A structured representation of potential negative effects from combining objects: interference (objects confuse each other), overload (too much for working memory), stage_mismatch (combining items at very different mastery levels), and component_conflict (too many low-mastery items of the same type).

**Plain English**: Warning labels for task combinations. Like medication interactions, some learning items shouldn't be mixed.

| Risk Type | Plain English | Example |
|-----------|---------------|---------|
| `interference` | Items confuse each other | "affect" and "effect" in the same task |
| `overload` | Too much mental load | 5 new vocabulary words at once |
| `stage_mismatch` | Too big a skill gap | Testing a new word alongside a mastered grammar rule |
| `component_conflict` | Same type, all hard | Three new phonological patterns together |

### CombinationBenefit
**Technical**: Positive learning effects from combining objects: transfer (related knowledge helps), reinforcement (same component at different stages strengthens learning), interleaving (mixing component types improves retention), and context (lexical items embedded in syntactic frames).

**Plain English**: Reasons to combine items. When items help each other, learning is more efficient than practicing separately.

| Benefit Type | Plain English | Example |
|--------------|---------------|---------|
| `transfer` | Related knowledge helps | Learning "pre-" helps with "preview", "prevent", "predict" |
| `reinforcement` | Cross-stage strengthening | Practicing a known word alongside a new one in the same family |
| `interleaving` | Mixing improves memory | Alternating vocabulary and grammar items |
| `context` | Words embedded in structure | Learning "reluctant" within "She was reluctant to..." |

### ObjectGrouping
**Technical**: The output of selection: a primary (focus) object, supporting objects, feasibility analysis, recommended task type, and component weights for the Q-matrix.

**Plain English**: The final "team roster" for a task---which item is the star, which are supporting players, and what type of practice activity fits them best.

---

## Microscale: Direct Relationships

### Dependencies (What This Module Needs)

| Path | Import | What It Provides |
|------|--------|------------------|
| `./types` | `ComponentType` | The 5 linguistic component categories (LEX, MORPH, G2P, SYN, PRAG) |
| `./types` | `MasteryStage` | 0-4 scale representing learner proficiency |

### Configuration Constants (Defined Locally)

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_OBJECTS_PER_SELECTION` | 10 | Memory safety: prevents runaway computation |
| `MAX_CANDIDATE_PAIRS` | 100 | Limits pairwise comparison for performance |
| `DEFAULT_SELECTION_STRATEGY.maxCognitiveLoad` | 7 | Miller's magic number for working memory |
| `DEFAULT_SELECTION_STRATEGY.minSecondaryStage` | 2 | Minimum mastery before item can be "supporting" |
| `COMPONENT_COGNITIVE_LOAD` | LEX=1.5, MORPH=2.0, G2P=2.0, SYN=2.5, PRAG=3.0 | Processing cost by component |
| `STAGE_COMPATIBILITY` | 5x5 matrix (0.3 to 1.0) | How well different mastery stages combine |
| `COMPONENT_INTERACTIONS` | 5x5 matrix (-0.1 to +0.3) | Synergy/interference between components |

### Dependents (What Needs This Module)

| Consumer | How It Uses This Module |
|----------|------------------------|
| **Task Generation Service** | Calls `evaluateCombinationFeasibility()` to validate proposed object groupings |
| **Session Orchestrator** | Calls `createObjectGroupingBatch()` to prepare task groupings for a learning session |
| **Learning Queue Builder** | Uses `selectSupportingObjects()` to find complementary objects for a primary selection |

### Data Flow

```
Learning Queue (objects due for practice)
         |
         v
[selectSupportingObjects] <-- Primary object + candidate pool
         |
         +-- Scores each candidate pairing
         +-- Greedy selection up to maxObjectsPerTask
         |
         v
[evaluateCombinationFeasibility] <-- Proposed grouping
         |
         +-- calculateCombinedCognitiveLoad()
         +-- estimateCombinedDifficulty()
         +-- predictCombinedSuccess()
         +-- identifyRisks() / identifyBenefits()
         |
         v
ObjectGrouping --> Task Generation (Stage 3)
                         |
                         v
               Multi-Object Calibration (Stage 4-5)
```

---

## Macroscale: System Integration

### Architectural Position

This module sits at the **critical junction between object selection and task generation** in the LOGOS adaptive learning pipeline:

```
Stage 1: Goal Setting
         |
Stage 2: Object Selection (Priority Queue)
         |
    [THIS MODULE] <-- Stage 3: Task Generation - Object Combination
         |
Stage 4: Response Evaluation (multi-object-calibration.service.ts)
         |
Stage 5: State Updates (Theta, Mastery, FSRS)
```

**Layer**: Pure Algorithm (src/core)
- No database dependencies
- No external service calls
- Stateless, synchronous functions
- Can be unit tested in isolation

### The Stage 3/Stage 4-5 Handoff

This module (Stage 3) determines **which** objects to combine.
`multi-object-calibration.service.ts` (Stage 4-5) handles **how** to evaluate and update learning states after the task is completed.

**The contract between them**:
1. This module provides `ObjectGrouping` with `componentWeights`
2. The calibration service uses these weights in its Q-matrix allocation
3. Both use the same `ComponentType` taxonomy
4. Difficulty estimates here feed into IRT probability calculations there

### Big Picture Impact

**What This Enables**:
- **Intelligent task composition**: Tasks combine objects that reinforce each other rather than interfere
- **Cognitive load management**: Never overwhelming the learner's working memory (Miller's 7)
- **Transfer-optimized learning**: Related objects grouped to maximize knowledge transfer
- **Interleaving benefits**: Strategic mixing of component types for long-term retention
- **Risk mitigation**: Conflicting objects separated to prevent interference

**What Breaks Without It**:
- Tasks would randomly combine objects, creating cognitive overload or wasted opportunities
- Learners could receive tasks combining items that interfere with each other
- No principled way to determine how many objects can fit in one task
- Loss of transfer and reinforcement benefits from intelligent grouping
- Higher risk of learner frustration and disengagement

### Critical Path Analysis

**Importance Level**: High (but not blocking)

The system can fall back to single-object tasks if this module fails, but learning efficiency drops significantly. Multi-object tasks are where sophisticated pedagogy happens---vocabulary in context, grammar with semantics, pronunciation with meaning.

**Failure Modes**:
1. If `evaluateCombinationFeasibility` errors: Fall back to single-object tasks
2. If cognitive load calculation fails: Default to maximum 2 objects per task
3. If benefit/risk analysis fails: Use conservative defaults (avoid combining)

---

## Key Functions (Technical + Plain English)

### calculateCombinedCognitiveLoad(profiles)

**Technical Definition**:
Computes the total working memory demand for a set of objects by summing individual cognitive loads, adding switching costs for cross-component tasks, and applying a mastery discount (automatized items cost less).

**Plain English**:
Adds up how much "mental RAM" all the items require together. Includes a "context-switching tax" when mixing different types, but subtracts a bonus for well-learned items (which require less conscious thought).

**Miller's Magic Number (7)**:
The default strategy caps cognitive load at 7---George Miller's famous finding that working memory holds about 7 items. This ensures tasks never exceed human processing capacity.

**Formula**:
```
baseLoad = sum(item.cognitiveLoad for each item)
switchingCost = (uniqueComponentTypes - 1) * 0.5
avgMastery = mean(item.masteryStage)
masteryDiscount = avgMastery * 0.1
totalLoad = (baseLoad + switchingCost) * (1 - masteryDiscount)
```

### estimateCombinedDifficulty(profiles)

**Technical Definition**:
Estimates combined IRT difficulty using a compensatory model: weighted average of individual difficulties (70% average, 30% maximum) plus a combination penalty (0.2 per additional object).

**Plain English**:
Calculates how hard the combined task will be. It's mostly the average difficulty of the items, pulled slightly toward the hardest item, with a bonus difficulty for having to juggle multiple things.

**Compensatory IRT Model**:
The model is "compensatory" because high ability in one area can partially offset low ability in another---unlike a "conjunctive" model where you must master everything.

### predictCombinedSuccess(profiles, userAbility)

**Technical Definition**:
Uses the 2-Parameter Logistic (2PL) IRT model to calculate the probability of success:
`P = 1 / (1 + exp(-(userAbility - combinedDifficulty)))`
Then applies a load penalty if cognitive load exceeds 5.

**Plain English**:
Predicts the learner's chance of getting the task right. If the learner's skill matches the task difficulty, they have a 50% chance. Higher skill or lower difficulty increases the probability. Cognitive overload reduces it.

### evaluateCombinationFeasibility(profiles, userAbility, strategy)

**Technical Definition**:
The main orchestration function that combines all analyses: calculates combined difficulty and cognitive load, predicts success, identifies risks and benefits, computes an overall score, and determines if the combination is feasible.

**Plain English**:
The "go/no-go" decision for a proposed task grouping. Runs all the checks and produces a verdict: Is this combination safe and beneficial?

**Feasibility Criteria**:
- Score >= 0.3 (reasonable chance of being beneficial)
- Cognitive load <= maxCognitiveLoad * 1.2 (soft cap with 20% tolerance)
- No risk with severity > 0.8 (no severe problems)

### selectSupportingObjects(primaryProfile, candidateProfiles, userAbility, strategy)

**Technical Definition**:
Implements a greedy selection algorithm: scores each candidate's pairing with the primary object, sorts by score, then incrementally adds the best candidates while maintaining feasibility.

**Plain English**:
Given a "star" item for a task, finds the best "supporting cast" from a pool of candidates. Keeps adding helpers as long as they improve the task without overloading the learner.

**Greedy Algorithm**:
A greedy algorithm makes the locally optimal choice at each step. Here, it picks the best pairing first, then the next best that still works with the group, and so on. This doesn't guarantee the global optimum but is fast and usually produces good results.

### createObjectGroupingBatch(profiles, userAbility, batchSize, strategy)

**Technical Definition**:
Creates multiple object groupings for a session by iterating through priority-sorted objects, calling `selectSupportingObjects` for each unused primary, and marking selected objects as used.

**Plain English**:
Prepares a whole session's worth of task groupings. Works through the priority list, building teams for each task, making sure no item appears twice.

---

## Selection Strategy Configuration

The `SelectionStrategy` interface allows customizing the selection behavior:

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `maxObjectsPerTask` | 3 | Limits complexity per task |
| `maxCognitiveLoad` | 7 | Miller's limit for working memory |
| `minSecondaryStage` | 2 | Supporting objects must have some mastery |
| `allowInterleaving` | true | Enable cross-component mixing benefits |
| `preferRelated` | true | Favor transfer-potential pairings |
| `avoidConflicts` | true | Separate interfering objects |

---

## Change History

### 2026-01-08 - Documentation Created
- **What Changed**: Initial narrative documentation created using Shadow Map methodology
- **Why**: Document the theoretical foundations and system integration for the multi-object selection module
- **Impact**: Enables maintainers to understand the WHY behind combination decisions

### Initial Implementation
- **What Changed**: Core module created with Q-Matrix, skill combination, and interleaving research foundations
- **Why**: LOGOS needed intelligent multi-object task composition to optimize learning efficiency
- **Impact**: Enables sophisticated task generation that respects cognitive limits while maximizing learning benefits

---

## References

### Academic Sources
- **Tatsuoka, K. K. (1983)**. Rule space: An approach for dealing with misconceptions based on item response theory. *Journal of Educational Measurement*, 20(4), 345-354.
- **VanLehn, K. (1988)**. Toward a theory of impasse-driven learning. In H. Mandl & A. Lesgold (Eds.), *Learning issues for intelligent tutoring systems* (pp. 19-41). Springer.
- **Rohrer, D., & Taylor, K. (2007)**. The shuffling of mathematics problems improves learning. *Instructional Science*, 35(6), 481-498.
- **Miller, G. A. (1956)**. The magical number seven, plus or minus two: Some limits on our capacity for processing information. *Psychological Review*, 63(2), 81-97.

### Related System Documentation
- `ALGORITHMIC-FOUNDATIONS.md` - IRT mathematics, PMI calculations, FSRS scheduling
- `src/core/types.ts` - Type definitions including Q-Matrix entries and ComponentCode
- `src/main/services/multi-object-calibration.service.ts` - Stage 4-5 calibration counterpart
