# State + Priority Service (Layer 1)

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/services/state-priority.service.ts`
> **Status**: Active
> **Phase**: 3.1 - Layer 1 of Learning Pipeline

---

## Context & Purpose

This service is the **brain of the learning scheduler**. It answers the fundamental question every adaptive learning system must solve: *"What should the learner study next, and why?"*

The State + Priority Service exists because language learning is not a linear process. A learner cannot simply march through vocabulary lists alphabetically. Instead, effective learning requires understanding:

1. **Where the learner currently stands** (their ability profile across language components)
2. **What material will produce maximum learning** (items in their Zone of Proximal Development)
3. **What is blocking their progress** (bottleneck components causing cascading failures)
4. **What urgently needs review** (items about to be forgotten)

**Business Need**: Without intelligent prioritization, learners waste time on material that is either too easy (boring, no learning gain) or too hard (frustrating, no learning gain). This service ensures every study session is maximally productive.

**When Used**:
- At the start of every learning session to determine the next item
- After completing an item to reprioritize the queue
- Periodically in background to recalculate priorities as time passes
- When bottleneck detection triggers queue rebalancing

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

| File | Import | Purpose |
|------|--------|---------|
| `src/main/db/prisma.ts` | `getPrisma()` | Database connection for querying user theta state |
| `src/main/db/repositories/mastery.repository.ts` | `getMasteryStatistics`, `getReviewQueue`, `ReviewQueueItem` | Retrieves mastery data, review schedules, and learning metrics |
| `src/main/db/repositories/goal.repository.ts` | `getLanguageObjects`, `bulkUpdatePriorities` | Fetches language objects and persists priority updates |
| `src/main/db/repositories/error-analysis.repository.ts` | `detectBottlenecks`, `getPrimaryBottleneck`, `BottleneckResult` | Identifies which language components are blocking progress |

### Dependents (What Needs This)

| Consumer | Function Used | Purpose |
|----------|---------------|---------|
| Learning Session Handler | `getNextLearningItem()` | Determines what to present to learner next |
| Session Start Logic | `getLearningQueue()` | Displays upcoming items in study queue |
| Background Workers | `recalculatePriorities()` | Keeps priority scores fresh as time passes |
| Dashboard/Analytics | `getStateAnalysis()`, `analyzeQueue()` | Shows learner their current state and queue composition |
| Adaptive Algorithm Coordinator | `getUserThetaState()` | Provides ability parameters for difficulty calibration |

### Data Flow

```
User starts session
        |
        v
getUserThetaState() -----> Retrieves ability profile (theta values per component)
        |
        v
detectBottlenecks() -----> Identifies struggling components
        |
        v
For each LanguageObject:
        |
        +---> calculateBasePriority() -----> z(w) vector: F, R, D, M, P
        |
        +---> calculateMasteryAdjustment() --> g(m) for Zone of Proximal Development
        |
        +---> calculateUrgencyScore() -------> Time-based review pressure
        |
        v
calculateEffectivePriority() ---> S_eff(w) = S_base * g(m) + urgency + bottleneck_boost
        |
        v
Sort queue by S_eff(w) descending
        |
        v
Return highest priority item to learner
```

---

## Macroscale: System Integration

### Architectural Layer

This service sits at **Layer 1** of the three-layer learning pipeline defined in the LOGOS architecture:

```
Layer 3: Task Generation (SELECT task type, GENERATE content)
              ^
              |  "Here's an item at priority 0.87"
              |
Layer 2: Response Evaluation (EVALUATE correctness, UPDATE mastery)
              ^
              |  "User got item X wrong, component MORPH"
              |
=====> Layer 1: State + Priority (THIS SERVICE) <=====
              ^
              |  "User theta, bottlenecks, review schedule"
              |
Database Layer: Mastery states, error analyses, user profiles
```

The State + Priority Service is the **foundation layer** that all other learning decisions build upon. Without accurate state analysis and intelligent prioritization, the upper layers cannot function effectively.

### Big Picture Impact

This service enables the core adaptive learning loop of LOGOS:

1. **Personalized Learning Paths**: By combining theta state (ability), mastery levels, and bottleneck detection, each learner gets a unique study sequence optimized for their current knowledge state.

2. **Zone of Proximal Development Targeting**: The mastery adjustment function `g(m)` implements Vygotsky's ZPD theory. Items with 40-70% accuracy receive highest priority because they represent material the learner can almost but not quite handle independently.

3. **Spaced Repetition Integration**: Urgency scores ensure items due for review are surfaced at the right time, preventing forgetting while avoiding premature review.

4. **Bottleneck Resolution**: When the error analysis system detects a struggling component (e.g., morphology errors above threshold), this service boosts priority for items targeting that component.

**What Would Break Without This Service**:
- Learning queue would be random or alphabetical (ineffective)
- Overdue reviews would be missed (forgetting)
- Struggling areas would not receive extra attention (stagnation)
- Difficulty calibration would have no ability estimate (frustration)
- The entire adaptive learning promise of LOGOS would collapse

### Critical Path Analysis

**Importance Level**: Critical (Core)

This is a **critical path** component. Every learning interaction flows through this service:

```
Learning Session Start --> getNextLearningItem() --> Present to User
                                  ^
                                  |
                           (This Service)
```

**Failure Modes**:
- If theta retrieval fails: Fallback to global average (degraded personalization)
- If priority calculation fails: Items served in default order (reduced effectiveness)
- If bottleneck detection fails: Missing components not boosted (slower progress)

**Redundancy**: The service uses defensive defaults throughout. Missing data results in neutral values (0.5 for most scores, 1.0 for adjustments) rather than crashes.

---

## Technical Concepts (Plain English)

### Theta State

**Technical**: A vector of ability parameters (theta values) from Item Response Theory, representing the learner's latent ability on a logit scale for each language component (phonology, morphology, lexical, syntactic, pragmatic).

**Plain English**: Think of theta as your "skill level" in a video game, but broken down by category. You might be level 7 at vocabulary (lexical) but only level 3 at grammar (syntactic). The theta state captures this nuanced ability profile so the system knows exactly where you're strong and weak.

**Why We Use It**: Without component-specific ability estimates, we would treat all learners as equally capable across all areas. Theta state enables precision targeting of each learner's actual weaknesses.

### Priority Weights (z(w) Vector)

**Technical**: A weighted sum of five objective properties of each language object: Frequency (F), Relational density (R), Domain relevance (D), Morphological complexity (M), and Phonological difficulty (P).

**Plain English**: Every word or phrase has properties that make it more or less important to learn. High-frequency words (like "the") matter more than rare ones. Words with many connections to other words (relational density) are valuable anchors. Words relevant to your domain (medical, legal, etc.) are prioritized. The z(w) vector combines all these factors into a single "importance score."

**Why We Use It**: Not all vocabulary is equally valuable. A doctor learning medical English needs "diagnosis" before "serendipity." The z(w) vector encodes these objective importance factors independent of the learner's current state.

### Zone of Proximal Development (g(m) Adjustment)

**Technical**: A mastery-based adjustment function that peaks for items with 40-70% cue-free accuracy and decreases for items that are too easy (>90%) or too hard (<40%).

**Plain English**: Imagine a sweet spot for learning. If something is too easy, you're bored and not learning. If it's too hard, you're frustrated and not learning. The ZPD is that Goldilocks zone where you can almost do it with a little help. The g(m) function finds items in YOUR personal sweet spot and prioritizes them.

**Why We Use It**: Learning science shows maximum growth happens just beyond current ability. This function operationalizes that insight, ensuring learners spend time on material that stretches them without breaking them.

### Scaffolding Gap

**Technical**: The difference between cue-assisted accuracy and cue-free accuracy for a given item. Calculated as: `scaffoldingGap = cueAssistedAccuracy - cueFreeAccuracy`.

**Plain English**: When you're given hints, can you get it right? When hints are removed, do you still remember? The scaffolding gap measures this difference. A high gap means "I know this with help but not alone" - these items need more independent practice to solidify the knowledge.

**Why We Use It**: It reveals items stuck in a "supported but not internalized" state. High scaffolding gap items are prioritized because they represent knowledge that needs to transition from supported to independent recall.

### Urgency Score

**Technical**: A time-based function that increases as items become overdue for review, implementing temporal pressure from the spaced repetition schedule.

**Plain English**: Like milk with an expiration date, memories have a "best review by" date. Items past due become more urgent (might be forgotten), while items not yet due have low urgency (reviewing too early is wasteful). The urgency score is like a countdown timer that influences what you see next.

**Why We Use It**: Spaced repetition only works if reviews happen at the right time. The urgency score ensures overdue items bubble to the top before they're forgotten, while preventing premature review that would disrupt optimal spacing.

### Bottleneck Detection

**Technical**: Identification of language components with error rates exceeding threshold (default 30%) or showing increasing trend, which are blocking overall progress.

**Plain English**: Imagine learning a language is like water flowing through pipes. If one pipe (say, grammar) is clogged, water backs up everywhere. Bottleneck detection finds the clogged pipe. If your morphology error rate suddenly spikes, everything that depends on morphology (verbs, conjugations, word forms) will struggle until you fix that foundational issue.

**Why We Use It**: Bottlenecks cause cascading failures. A learner struggling with verb conjugation will fail many sentences even if their vocabulary is strong. By detecting and prioritizing bottleneck components, we fix the root cause rather than chasing symptoms.

### Effective Priority S_eff(w)

**Technical**: The final priority score combining base priority (S_base), mastery adjustment (g(m)), urgency, and bottleneck boost: `S_eff(w) = S_base(w) * g(m) + urgency_weight * urgency + bottleneck_boost`.

**Plain English**: The "final answer" for how important an item is RIGHT NOW for THIS learner. It blends: (1) how objectively important the item is, (2) whether it's in your learning sweet spot, (3) whether you're about to forget it, and (4) whether it targets a struggling area. The item with the highest S_eff is what you study next.

**Why We Use It**: No single factor determines optimal study order. Effective priority is the synthesis that balances all considerations into a single actionable ranking.

---

## Algorithm Details

### Base Priority Formula (S_base)

The base priority implements the FRE (Frequency-Relational-Domain) formula from the algorithmic foundations:

```
S_base(w) = w_F * F + w_R * R + w_D * D + w_M * M + w_P * P
```

Where:
- **F**: Normalized frequency (0-1), higher = more common
- **R**: Relational density (0-1), higher = more connections
- **D**: Domain relevance (0-1), how much item appears in target domain
- **M**: Morphological score (0-1), complexity of word formation
- **P**: Phonological difficulty (0-1), pronunciation complexity

Default weights:
- Frequency: 0.20
- Relational: 0.15
- Domain: 0.15
- Morphological: 0.10
- Phonological: 0.10
- Urgency: 0.20
- Bottleneck: 0.10

### Mastery Adjustment Formula (g(m))

```
g(m) = stageFactor * accuracyFactor * gapFactor
```

Where:
- **stageFactor**: [1.0, 0.9, 0.7, 0.5, 0.3] for stages [0, 1, 2, 3, 4]
- **accuracyFactor**:
  - <40%: 0.8 (too hard)
  - 40-70%: 1.0 (ZPD sweet spot)
  - 70-90%: 0.6 (getting easy)
  - >90%: 0.3 (mastered)
- **gapFactor**: 1 + scaffoldingGap * 0.5

### Urgency Score Formula

```
if (overdue):
    urgency = min(1.0, 0.5 + hoursOverdue / 48)
else:
    urgency = max(0.1, 0.5 - hoursUntilDue / 168)
```

Items overdue by 48+ hours reach maximum urgency (1.0).
Items due in 1+ weeks have minimum urgency (0.1).

---

## Change History

### 2026-01-04 - Initial Implementation
- **What Changed**: Created complete State + Priority Service implementing Phase 3.1
- **Why**: Foundation layer needed for adaptive learning pipeline
- **Impact**: Enables intelligent queue ordering, ZPD targeting, and bottleneck-aware prioritization

### Key Design Decisions

1. **Defensive Defaults**: All calculations use neutral fallbacks (0.5, 1.0) when data is missing, ensuring graceful degradation rather than crashes.

2. **Async Parallel Fetching**: `getStateAnalysis()` uses `Promise.all()` to fetch theta, mastery, queue, and bottleneck data concurrently, minimizing latency.

3. **Component Mapping**: Object types (LEX, MORPH, G2P, SYNT, PRAG) map to component codes and theta keys, enabling cross-system integration.

4. **Bulk Operations**: `recalculatePriorities()` batches all updates into a single transaction via `bulkUpdatePriorities()`, avoiding N+1 database calls.

---

## Testing Considerations

### Unit Test Scenarios

1. **calculateBasePriority**: Verify weighted sum with known inputs
2. **calculateMasteryAdjustment**: Test all accuracy bands and stage combinations
3. **calculateUrgencyScore**: Test overdue, due soon, and far future cases
4. **calculateEffectivePriority**: Verify bottleneck boost applies correctly

### Integration Test Scenarios

1. **getLearningQueue**: Verify sorting by effective priority
2. **recalculatePriorities**: Verify bulk update persists correctly
3. **getStateAnalysis**: Verify all four parallel queries return correctly

### Edge Cases

- User with no mastery data (new user)
- Object with null domain distribution
- All items at same priority (tie-breaking)
- Empty bottleneck list
- Items with future review dates only

---

## Related Documentation

- `docs/narrative/src/main/db/repositories/mastery.repository.md` - Mastery state tracking
- `docs/narrative/src/main/db/repositories/error-analysis.repository.md` - Bottleneck detection
- `docs/narrative/src/main/db/repositories/goal.repository.md` - Language object management
- `ALGORITHMIC-FOUNDATIONS.md` - FRE formula specification
