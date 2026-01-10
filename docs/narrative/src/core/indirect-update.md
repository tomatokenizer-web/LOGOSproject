# Indirect Update Mechanism Module

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/indirect-update.ts`
> **Status**: Active

---

## Context & Purpose

This module implements the **"ripple effect"** of language learning - when you master one item, related items become easier to learn. It propagates learning updates through the network of linguistic relationships, automatically adjusting difficulty estimates, stability predictions, and learning priorities for connected objects.

**The Core Problem**: Language knowledge is interconnected. When a learner successfully masters "nation", the difficulty of learning "national", "nationality", and "international" should decrease automatically. Without this propagation, LOGOS would over-estimate the effort required for related items, leading to inefficient scheduling and inaccurate progress predictions.

**Business Need**: LOGOS needs to answer questions like:
- "Now that the learner mastered 'decide', which other items should become easier?"
- "How much should we reduce the difficulty estimate for 'decision' and 'decisive'?"
- "Should 'decisive' be scheduled earlier now that related items are stronger?"

This module provides the machinery to propagate these beneficial effects through the vocabulary network.

**When Used**:
- After every successful learning response to trigger propagation
- After reviews to reinforce related items' stability
- After assessments to recalibrate difficulty estimates across families
- In batch processing to apply accumulated transfer effects

---

## Theoretical Framework

This module synthesizes three foundational theories from psycholinguistics and cognitive science:

### Morphological Family Effect (Nagy et al., 1989)

**Technical**: Empirical finding that vocabulary knowledge is organized into morphological families, where knowing one family member significantly facilitates recognition and learning of other members. The effect operates through shared root morpheme representation and analogical extension.

**Plain English**: Words come in families that share building blocks. When you learn "nation", you're not just learning one word - you're learning the root "nation-" that appears in dozens of related words. Your brain stores this root, making it available when you encounter "national" or "international". The research shows this family effect is one of the strongest predictors of vocabulary growth.

**Application in This Module**: Morphological relationships receive the highest propagation weight (0.8), meaning mastering one family member creates substantial difficulty reduction for others.

### Associative Network Theory (Collins & Loftus, 1975)

**Technical**: Model of semantic memory as a network of interconnected nodes, where activation spreads from activated concepts to related concepts along weighted associative links. Activation strength decays with semantic distance.

**Plain English**: Your mental dictionary is organized like a web, not a list. When you think of "doctor", related concepts like "nurse", "hospital", and "medicine" become slightly more accessible - they "light up" a little. This spreading activation explains why related knowledge feels easier to access. Learning one word sends activation rippling to connected words, priming them for easier acquisition.

**Application in This Module**: The BFS (breadth-first search) traversal through relationships models spreading activation. The depth decay factor (0.5 per hop) captures how activation weakens with distance.

### Transfer-Appropriate Processing (Morris et al., 1977)

**Technical**: Memory performance depends on the overlap between encoding conditions and retrieval conditions. Transfer is maximized when practice conditions match test conditions along relevant processing dimensions.

**Plain English**: You remember things best when you practice them the way you'll use them. This extends to transfer - learning transfers best when the new material shares processing demands with what you already know. A word that requires similar phonological processing, similar meaning retrieval, or similar grammatical application will benefit most from prior learning.

**Application in This Module**: Different relationship types (morphological, semantic, phonological) receive different weights because they represent different processing overlaps. Morphological relationships share the most processing dimensions (spelling, meaning, pronunciation), hence the highest transfer.

---

## Core Concepts Explained

### ObjectUpdateEvent

**Technical**: A trigger event containing the source object ID, update type (response/review/assessment/initial/correction), mastery stage transition (previous and new stages), accuracy, response time, timestamp, and component type. This event initiates propagation.

**Plain English**: An ObjectUpdateEvent is the "stone dropped in the pond" - the original learning event that causes ripples. When a learner successfully answers a question about "run", the system creates an event recording: "User got 'run' right, moved from stage 2 to stage 3, with 95% accuracy in 1.2 seconds." This event then triggers propagation to related words.

**Why We Use It**: Events provide the complete context needed to calculate propagation magnitude. A high-accuracy, stage-advancing review creates stronger ripples than a low-accuracy maintenance response.

### IndirectUpdate

**Technical**: A propagated update containing target object ID, source object ID, relationship type, magnitude (0-1), difficulty adjustment (negative = easier), stability boost (days), priority adjustment, confidence score, propagation depth, and reason string.

**Plain English**: An IndirectUpdate is a single ripple reaching a specific word. If learning "run" affects "running", the IndirectUpdate for "running" might say: "Reduce difficulty by 0.3 units, boost memory stability by 1.5 days, decrease learning priority by 0.1 (less urgent now), with 0.7 confidence. This is a depth-1 morphological transfer from 'run'."

**Why We Use It**: Separating propagation into discrete updates allows filtering, aggregation, and selective application. Not all updates need to be applied - very small effects can be dropped.

### PropagationResult

**Technical**: A summary structure containing the source event, all generated indirect updates, total affected count, cumulative magnitude, breakdown by relationship type, and processing time. This provides visibility into propagation scope.

**Plain English**: A PropagationResult is the final report after ripples finish spreading. It answers: "What happened when we dropped that stone?" The answer might be: "Learning 'nation' affected 12 related words (8 morphological, 3 semantic, 1 collocational) with total magnitude 4.2, processed in 3ms."

**Why We Use It**: Results enable debugging, analytics, and system monitoring. If propagation is too aggressive or too weak, results reveal the pattern.

### PropagationConfig

**Technical**: Configuration structure controlling propagation behavior: enabled flag, minimum magnitude threshold, maximum depth, depth decay factor, relationship type weights, update type weights, and flags for which effects to update (difficulty, stability, priority).

**Plain English**: PropagationConfig is the "knob panel" controlling how ripples spread. You can tune: How strong must an effect be to propagate? How far should ripples travel? How much should effects weaken with distance? Which relationship types transfer most strongly? The defaults are research-calibrated but can be adjusted for different learning contexts.

**Why We Use It**: Configuration separates policy from mechanism, enabling experimentation and personalization without code changes.

---

## Propagation Mechanics

### BFS Traversal Through Relationship Network

**Technical**: The propagation algorithm uses breadth-first search starting from the source object. At each depth level, it examines outgoing transfer relations, calculates propagation magnitude for each, creates indirect updates above the minimum threshold, and queues targets for further propagation up to the maximum depth.

**Plain English**: Imagine dropping a stone in water and watching ripples spread outward in rings. BFS does exactly this for knowledge:
1. First ring (depth 1): All words directly connected to "nation" get updated
2. Second ring (depth 2): Words connected to THOSE words get smaller updates
3. Third ring (depth 3): Even more distant connections get tiny updates
4. Stop: We don't go beyond depth 3 to keep effects meaningful

**Why BFS**: Unlike depth-first search, BFS ensures closer relationships are processed before distant ones. This matters because we have a maximum target limit (50) - we want to prioritize the strongest effects.

### Depth Decay (0.5 Factor Per Hop)

**Technical**: Propagation magnitude decays exponentially with depth according to `depthFactor = 0.5^(depth-1)`. At depth 1, factor is 1.0; depth 2, 0.5; depth 3, 0.25.

**Plain English**: Each hop cuts the ripple strength in half:
- Direct connection ("nation" -> "national"): 100% of original effect
- One hop away ("nation" -> "national" -> "nationalise"): 50% effect
- Two hops away ("nation" -> "national" -> "nationalise" -> "denationalise"): 25% effect

This models how spreading activation weakens with semantic/morphological distance. "National" is almost as related to "nation" as "nation" itself. But "denationalise" is quite distant - knowing "nation" helps, but only a little.

### Relationship Type Weights

**Technical**: Each transfer type has a base weight determining propagation strength: morphological (0.8), collocational (0.5), semantic (0.4), syntactic (0.3), phonological (0.25), orthographic (0.2).

**Plain English**: Different types of relationships transfer learning at different strengths:

| Relationship | Weight | Why |
|--------------|--------|-----|
| Morphological | 0.8 | Strongest - same root, shared meaning/spelling/pronunciation |
| Collocational | 0.5 | Strong - frequent co-occurrence creates mutual reinforcement |
| Semantic | 0.4 | Moderate - shared meaning but different form |
| Syntactic | 0.3 | Moderate - shared grammatical pattern |
| Phonological | 0.25 | Lower - shared sounds only |
| Orthographic | 0.2 | Lowest - shared spelling patterns only |

"Run" to "running" (morphological, 0.8) transfers much more than "run" to "sprint" (semantic, 0.4).

### Stage Improvement Weights

**Technical**: The stage transition in the source event determines base propagation magnitude: 0->1 transition gets 0.2 weight, 1->2 gets 0.5, 2->3 gets 0.8, 3->4 gets 1.0.

**Plain English**: Breaking through to higher mastery stages creates stronger ripples:
- Learning something brand new (0->1): Weak propagation (0.2) - knowledge is still fragile
- Early consolidation (1->2): Moderate propagation (0.5) - knowledge is stabilizing
- Strong learning (2->3): Strong propagation (0.8) - knowledge is well-established
- Full mastery (3->4): Maximum propagation (1.0) - knowledge is automated

This reflects cognitive reality: automated knowledge transfers better because it's fully integrated into your mental lexicon.

---

## Update Effects

### Difficulty Adjustment (Easier)

**Technical**: Calculated as `difficultyAdjustment = -magnitude * 0.5 * gapFactor`, where gapFactor is 1.0 if target is harder than source, 0.5 otherwise. Maximum adjustment is 0.5 IRT units per propagation.

**Plain English**: When you master a word, related words become objectively easier to learn. The difficulty adjustment answers: "How much should we lower our estimate of how hard this related word is?"

Example: Learning "nation" might reduce "national" difficulty by 0.4 units (on the -3 to +3 IRT scale). This means when we next schedule "national", we know it will require less effort than we previously thought.

The "gap factor" prevents over-adjustment: if "national" was already easier than "nation", we only give half credit - the transfer benefit is limited.

### Stability Boost (Retention)

**Technical**: Calculated as `stabilityBoost = magnitude * (sourceStability / 30) * 3`, capped at 3 days. Stability represents expected retention duration in FSRS.

**Plain English**: Learning one word helps you remember related words longer. This answers: "How many extra days will the learner retain this related word before needing review?"

Example: After mastering "nation" with 30-day stability, "national" might get a 1.5-day stability boost. This means we can wait slightly longer before reviewing "national" because the reinforcement from "nation" helps retention.

The formula scales with source stability: a strongly retained source word provides more reinforcement than a freshly learned one.

### Priority Adjustment (Urgency)

**Technical**: Calculated as `priorityAdjustment = -magnitude * 0.3` for items at stages 0-2, 0 for items at stages 3-4. Negative adjustment means lower priority (less urgent).

**Plain English**: When related words become easier, they become less urgent to study. This answers: "Should we push this related word down the queue now?"

Example: After mastering "nation", "national" priority decreases by 0.15 points. We can afford to wait a bit longer to teach "national" because the learner will find it easier thanks to knowing "nation".

High-stage items (3-4) don't get priority adjustment - they're already well-learned and priority changes wouldn't meaningfully affect scheduling.

---

## Memory Safety

The module includes hard limits to prevent runaway computation in large vocabulary networks:

### MAX_PROPAGATION_TARGETS (50)

**What It Does**: Limits total objects that can receive indirect updates from a single event.

**Why Needed**: A hub word like "make" might connect to hundreds of collocations and related words. Without a limit, propagation could affect thousands of objects, creating performance problems and potentially overwriting meaningful difficulty estimates with noise.

**Plain English**: Like a circuit breaker that trips when too many devices draw power. After 50 updates, propagation stops even if more connections exist. The first 50 are prioritized by BFS order (closest relationships first).

### MAX_PROPAGATION_DEPTH (3)

**What It Does**: Limits how far ripples can spread through the relationship graph.

**Why Needed**: Language networks are highly connected - you can reach almost any word from any other word in a few hops. Without a depth limit, every learning event would eventually affect the entire vocabulary.

**Plain English**: At 3 hops, effects have decayed to 12.5% strength (0.5^3 = 0.125). Going further would create such tiny effects that they'd be noise rather than signal. The limit keeps propagation meaningful.

### MAX_UPDATE_HISTORY (500)

**What It Does**: Limits stored update history entries for tracking.

**Why Needed**: Every propagation creates many history entries. Without cleanup, memory usage would grow unboundedly over learning sessions.

**Plain English**: Like keeping only the last 500 receipts instead of every receipt ever. Old propagation history is less relevant than recent history for analytics and debugging.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/core/types.ts`: Imports `ComponentType` (PHON, MORPH, LEX, SYNT, PRAG) and `MasteryStage` (0-4) for categorizing objects and tracking progress

- `src/core/transfer-prediction.ts`: Imports `TransferRelation` and `TransferType` - the relationship edges that define how objects connect in the transfer network

This module depends on the transfer infrastructure but implements its own propagation logic. The dependency is intentionally minimal - indirect-update focuses on *propagating effects* while transfer-prediction focuses on *predicting effects*.

### Dependents (What Needs This)

- `src/main/services/scoring-update.service.ts`: Should call `propagateUpdate()` after processing a learning response, then `applyIndirectUpdates()` to modify object states

- `src/main/services/state-priority.service.ts`: Could use propagation results to trigger priority recalculation for affected objects

- `src/core/priority.ts`: The priority adjustment values from indirect updates feed into priority calculation

- Future: Batch processing jobs that aggregate learning effects across sessions

### Data Flow

```
Learning Event (response, review, assessment)
    |
    v
ObjectUpdateEvent created
    |
    v
calculateBaseMagnitude() --> Base propagation strength
    |                         - Stage improvement weight
    |                         - Accuracy factor
    |                         - Update type weight
    v
propagateUpdate()
    |
    +---> BFS Queue initialized with source object
    |
    +---> For each object in queue (breadth-first):
    |         |
    |         v
    |     Find outgoing TransferRelations
    |         |
    |         v
    |     calculatePropagationMagnitude() per relation
    |         |       - Base magnitude
    |         |       - Relation strength
    |         |       - Type weight
    |         |       - Depth decay
    |         |       - Confidence
    |         v
    |     createIndirectUpdate() if above threshold
    |         |       - difficultyAdjustment
    |         |       - stabilityBoost
    |         |       - priorityAdjustment
    |         v
    |     Add to updates list; queue target for next depth
    |
    v
PropagationResult returned
    |
    v
applyIndirectUpdates() --> Object states modified
    |                       - difficulty += adjustment
    |                       - stability += boost
    |                       - priority += adjustment
    v
Updated scheduling and difficulty estimates
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits in the **Core Algorithm Layer** as a pure computational module:

```
Layer 1: Renderer (React UI)
    |
    v
Layer 2: Main Process (IPC handlers, services)
    |
    v
Layer 3: Core Algorithms <-- You are here (src/core/indirect-update.ts)
    |                        Also: transfer-prediction.ts, irt.ts, fsrs.ts, priority.ts
    v
Layer 4: Database (Prisma/SQLite)
```

Within the Core layer, indirect-update.ts belongs to the **Learning Effect Propagation** subgraph:

```
[Learning Response Event]
          |
          v
[scoring-update.service] --> Direct object update
          |
          v
[indirect-update.ts] --> Propagated effects <-- You are here
          |
          v
[Object State Map] --> Updated difficulty, stability, priority
          |
          v
[priority.ts] --> Recalculated learning queue
          |
          v
[Session Scheduling] --> Next items to study
```

### Big Picture Impact

This module implements **network-aware learning** - the recognition that vocabulary items form an interconnected graph where mastering one node affects the difficulty of connected nodes.

**Without this module**, LOGOS would:
- Treat each item as isolated, over-estimating difficulty for morphological families
- Miss the "snowball effect" where learning hub words accelerates overall acquisition
- Fail to adjust priorities when related items become easier
- Over-schedule reviews for items reinforced by related learning
- Underestimate learning progress because transfer effects aren't credited

**What This Module Enables**:
1. **Accurate Difficulty Estimation**: Related items get difficulty reductions reflecting actual cognitive facilitation
2. **Efficient Scheduling**: Priority adjustments prevent over-studying items made easier by transfer
3. **Better Retention Prediction**: Stability boosts improve review timing for reinforced items
4. **Learning Analytics**: Propagation results reveal network effects and vocabulary coverage patterns
5. **Curriculum Optimization**: Understanding propagation patterns helps identify high-value "hub" words

### Critical Path Analysis

**Importance Level**: Medium-High

This module enhances but does not enable basic functionality:
- LOGOS works without it (items are learned independently)
- But learning efficiency drops significantly (estimated 15-30% slower acquisition)
- Difficulty estimates become less accurate over time
- Review scheduling becomes suboptimal

**Failure Modes**:
- If propagation is too aggressive: Difficulty estimates drop too fast, items appear easier than they are
- If propagation is too conservative: Transfer benefits are wasted, learning is inefficient
- If propagation is disabled: System works but suboptimally
- If propagation hangs: MAX_PROPAGATION_TARGETS prevents infinite loops; timeout protection needed in service layer

**Recovery**: PropagationConfig allows tuning. Disabling propagation (enabled: false) provides immediate fallback without data loss.

---

## Relationship to Transfer Prediction Module

This module (`indirect-update.ts`) builds on the transfer prediction infrastructure but serves a different purpose:

| Aspect | transfer-prediction.ts | indirect-update.ts |
|--------|------------------------|---------------------|
| **Focus** | Predicting potential transfer | Applying actual transfer effects |
| **Trigger** | Query ("what would transfer?") | Event ("transfer just happened") |
| **Output** | TransferPrediction (forecast) | IndirectUpdate (action) |
| **Side Effects** | None (read-only) | Modifies object states |
| **Use Case** | Curriculum planning, sequencing | Real-time learning propagation |

**How They Work Together**:

```
transfer-prediction.ts            indirect-update.ts
        |                                 |
        v                                 v
"If learner masters 'nation',     "Learner just mastered 'nation'.
 'national' will become 0.9       Apply difficulty -0.4, stability
 units easier"                    +1.5 days to 'national'"
        |                                 |
        v                                 v
    Planning                         Execution
```

Transfer prediction answers "what if?" questions for planning. Indirect update answers "what now?" questions for execution.

---

## Key Functions Explained

### calculateBaseMagnitude()

**What It Does**: Computes the initial propagation strength from a learning event before relationship-specific adjustments.

**Factors Combined**:
- Stage improvement (breakthrough = stronger propagation)
- Accuracy (correct responses propagate more than incorrect)
- Update type (assessments propagate 1.2x, corrections propagate 0.5x)

**Formula**: `baseMagnitude = stageWeight * accuracy * updateTypeFactor`

**Plain English**: Before we figure out where ripples go, we determine how big the splash was. A perfect-accuracy, stage-advancing assessment creates a big splash (high magnitude). A low-accuracy maintenance review creates a small splash.

### calculatePropagationMagnitude()

**What It Does**: Computes the final propagation strength for a specific relationship, accounting for all attenuation factors.

**Factors Combined**:
- Base magnitude from source event
- Relation strength (how similar are the objects?)
- Type weight (morphological > semantic > phonological)
- Depth decay (0.5^(depth-1))
- Confidence (uncertain relationships contribute less)

**Plain English**: Given a splash of size X and a connection of type Y at distance Z, how strong is the ripple when it arrives? Morphological connections transmit well; distant semantic connections don't.

### createIndirectUpdate()

**What It Does**: Generates a complete IndirectUpdate structure for one target object, including all effect calculations.

**What It Calculates**:
- Difficulty adjustment using source/target difficulty gap
- Stability boost based on source stability and magnitude
- Priority adjustment based on target mastery stage
- Reason string for debugging ("Transfer from X (stage 2->3)")

**Plain English**: This function packages all the ripple effects into a single "update ticket" for one word. The ticket says exactly what changes should happen and why.

### propagateUpdate()

**What It Does**: Orchestrates the complete BFS traversal, generating all indirect updates within safety limits.

**Algorithm**:
1. Return early if propagation disabled
2. Calculate base magnitude from source event
3. Initialize BFS queue with source object
4. While queue not empty AND under MAX_PROPAGATION_TARGETS:
   - Pop next object from queue
   - Skip if beyond MAX_PROPAGATION_DEPTH
   - Find all outgoing transfer relations
   - For each unvisited target:
     - Create indirect update (if above threshold)
     - Add to results
     - Queue for further propagation
5. Return PropagationResult with all updates and statistics

**Plain English**: This is the main "ripple spreading" function. It systematically explores outward from the source, creating updates for each reachable word, stopping when limits are hit.

### applyIndirectUpdates()

**What It Does**: Actually modifies object states based on computed indirect updates.

**What It Modifies**:
- `state.difficulty`: Adjusted within [-3, 3] range
- `state.stability`: Increased up to 365 days max
- `state.priority`: Adjusted within [0, 1] range
- `state.lastUpdated`: Timestamp refreshed

**Plain English**: After computing all the ripple effects, this function writes them to the objects. It's the "make it so" step that converts computed updates into actual state changes.

### aggregateUpdates()

**What It Does**: Combines multiple updates targeting the same object into a single aggregated update with diminishing returns.

**Why Needed**: When multiple source objects propagate to the same target (e.g., knowing "nation", "national", AND "nationality" all affect "international"), we need to combine effects sensibly. Simply adding would over-count; max would under-count.

**Aggregation Formula**: Uses diminishing returns where the Nth source contributes `1/(1 + N*0.5)` of its effect.

**Plain English**: If three words all make "international" easier, we don't triple the effect - that would be unrealistic. Instead, the first word gets full credit, the second gets 67%, the third gets 50%. The combined effect is substantial but bounded.

---

## Configuration Reference

### DEFAULT_PROPAGATION_CONFIG

```typescript
{
  enabled: true,                    // Master switch for propagation
  minMagnitude: 0.05,              // Threshold: effects below 5% are dropped
  maxDepth: 2,                     // Propagate through 2 hops (config default)
  depthDecayFactor: 0.5,           // Halve effect at each hop
  relationshipWeights: {
    morphological: 0.8,            // Word families transfer strongly
    collocational: 0.5,            // Co-occurrence pairs transfer moderately
    semantic: 0.4,                 // Synonyms/related meanings
    syntactic: 0.3,                // Shared grammatical patterns
    phonological: 0.25,            // Similar sounds
    orthographic: 0.2,             // Similar spelling
  },
  updateTypeWeights: {
    response: 1.0,                 // Regular practice: full propagation
    review: 0.8,                   // Scheduled review: 80%
    assessment: 1.2,               // Formal test: 120% (stronger signal)
    initial: 0.6,                  // First learning: 60% (fragile)
    correction: 0.5,               // Error correction: 50%
  },
  updateDifficulty: true,          // Apply difficulty adjustments
  updateStability: true,           // Apply stability boosts
  updatePriority: true,            // Apply priority adjustments
}
```

### STAGE_IMPROVEMENT_WEIGHTS

| Transition | Weight | Meaning |
|------------|--------|---------|
| 0 -> 1 | 0.2 | Recognition: weak propagation (knowledge fragile) |
| 1 -> 2 | 0.5 | Recall: moderate propagation (knowledge stabilizing) |
| 2 -> 3 | 0.8 | Controlled: strong propagation (knowledge established) |
| 3 -> 4 | 1.0 | Automatic: full propagation (knowledge integrated) |
| Maintenance | 0.3 | No stage change: reduced propagation |

---

## Academic Foundations

This module synthesizes research from psycholinguistics and cognitive science:

- **Nagy, W.E., Anderson, R.C., Schommer, M., Scott, J.A., & Stallman, A.C. (1989)**: *"Morphological families in the internal lexicon"* - Empirical evidence that morphological family knowledge significantly predicts vocabulary growth and word recognition

- **Collins, A.M. & Loftus, E.F. (1975)**: *"A spreading-activation theory of semantic processing"* - Foundational model of semantic memory as a network with spreading activation, underlying the propagation mechanics

- **Morris, C.D., Bransford, J.D., & Franks, J.J. (1977)**: *"Levels of processing versus transfer appropriate processing"* - Framework explaining why transfer depends on processing overlap between original learning and transfer target

The propagation weights and decay functions in this module are computational implementations inspired by these theoretical frameworks, calibrated for practical application in adaptive language learning.

---

## Change History

### 2026-01-08 - Documentation Created
- **What Changed**: Initial narrative documentation for indirect-update module
- **Why**: Shadow documentation system implementation
- **Impact**: Enables understanding of propagation mechanics for all team members

### Initial Implementation - Module Created
- **What Changed**: Created complete propagation system with:
  - ObjectUpdateEvent and IndirectUpdate type definitions
  - BFS propagation through transfer relations
  - Depth decay and relationship type weighting
  - Difficulty, stability, and priority effect calculations
  - Aggregation for multiple updates to same target
  - Memory safety limits (MAX_PROPAGATION_TARGETS, MAX_DEPTH)
  - Configurable propagation behavior
- **Why**: Learning progress in one area should accelerate learning in related areas
- **Impact**: Enables network-aware learning optimization with automatic difficulty adjustment
