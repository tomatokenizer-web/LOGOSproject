# Milestone Events System

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/milestone-events.ts`
> **Status**: Active

---

## Context & Purpose

This module implements LOGOS's achievement and milestone celebration system. It exists to transform the sometimes tedious journey of language learning into a series of meaningful, celebrated accomplishments. When learners achieve significant milestones - whether mastering their first word, maintaining a 30-day streak, or reaching 90% accuracy - this system detects those achievements and broadcasts them to the rest of the application.

**Business Need**: Language learning is a marathon, not a sprint. Learners who receive positive reinforcement at key moments are significantly more likely to continue their studies. This module provides the psychological scaffolding that keeps learners motivated through the difficult middle stages of acquisition, where progress often feels invisible.

**When Used**:
- After every practice session completes, the session orchestrator calls `checkProgress()` to detect any newly achieved milestones
- When the UI initializes, it subscribes to milestone events for real-time celebration displays
- During curriculum adaptation, milestone data informs difficulty and content selection
- When saving/loading user data, the registry's state is serialized/deserialized for persistence

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/core/types.ts`: `ComponentType`, `MasteryStage` - The fundamental type definitions that define what "mastery" means and what linguistic components (phonology, morphology, lexical, syntactic, pragmatic) exist in the LOGOS model

### Dependents (What Needs This)

**Currently**: This module is newly implemented and awaiting integration with:

- **Session Orchestration** (planned): Will call `checkProgress()` after each practice session to detect achieved milestones
- **UI Celebration Layer** (planned): Will subscribe via `addListener()` to display achievement notifications, animations, and badges
- **Curriculum Adaptation** (planned): Will query `getStats()` to understand learner engagement patterns and adjust difficulty accordingly
- **Persistence Layer** (planned): Will use `serialize()`/`deserialize()` for saving milestone state to the database

### Data Flow

```
Session completes → Previous state snapshot taken → Response processing updates mastery →
New state captured → checkProgress(newState, previousState) called →
Detectors compare states → Achievement detected → MilestoneEvent created →
Event emitted to listeners → UI displays celebration → History updated →
Stats aggregated → Curriculum informed
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits in the **Core Algorithms Layer** of LOGOS's three-tier architecture:

- **Layer 1**: UI/Renderer (displays celebration notifications, achievement badges)
- **Layer 2**: This module (detects milestones, manages event lifecycle) - **You are here**
- **Layer 3**: Database (persists milestone history, provides state snapshots)

The milestone system is a **cross-cutting concern** - it doesn't directly implement learning algorithms but observes their outcomes and translates them into motivational feedback.

### Big Picture Impact

This module enables the entire **learner motivation and engagement system**:

1. **Celebration Moments**: Without milestones, learners would see only raw statistics. This module transforms "you got 45/50 correct" into "You've achieved 90% accuracy! Near perfect!"

2. **Progress Visualization**: The `getStats()` function provides aggregated achievement data that powers progress dashboards and "journey so far" visualizations.

3. **Gamification Foundation**: The points system (10-5000 points per milestone) creates the foundation for leaderboards, levels, and badges.

4. **Curriculum Feedback Loop**: Milestone patterns inform the curriculum - if a learner is achieving vocabulary milestones but not accuracy milestones, the system can adjust to focus on consolidation over expansion.

### Critical Path Analysis

**Importance Level**: Medium-High

- **If this fails**: Learning continues but without celebration feedback. Engagement metrics would likely decrease over time as learners lose motivational touchpoints.
- **Failure mode**: Silent degradation - learners simply wouldn't see achievements, which could be mistaken for "no achievements earned" rather than a system failure.
- **Backup**: The core learning algorithms function independently. Milestone detection is purely observational and never blocks the critical learning path.
- **Memory Safety**: Built-in limits prevent unbounded growth (1000 event history, 500 emissions per session, 20 listeners per event type).

---

## Technical Concepts (Plain English)

### MilestoneType (15 Achievement Categories)

**Technical**: A TypeScript union type defining all possible milestone categories: `'stage_transition' | 'accuracy_threshold' | 'automatization' | 'vocabulary_count' | 'grammar_count' | 'streak' | 'perfect_session' | 'first_mastery' | 'component_mastery' | 'transfer_chain' | 'review_milestone' | 'time_milestone' | 'level_up' | 'domain_expertise' | 'consistency'`

**Plain English**: Think of these as different "trophy types" in a video game. Just as games award trophies for "first kill," "complete level," and "100% completion," LOGOS awards milestones for different kinds of achievements. Stage transitions are like leveling up a skill. Streaks reward showing up every day. Vocabulary counts celebrate your growing word bank.

**Why We Use It**: Different milestone types deserve different celebrations and have different meanings. A 7-day streak badge has different psychological impact than a "first mastery" trophy. The type system ensures we can tailor responses appropriately.

### MilestoneDetector (Achievement Recognition Functions)

**Technical**: A function type `(state: LearnerProgressState, previousState: LearnerProgressState | null) => MilestoneDetectionResult | null` that compares current and previous learning states to detect if a milestone was just achieved.

**Plain English**: A detector is like a finish-line camera in a race. It watches two snapshots of your learning journey - where you were a moment ago and where you are now - and determines if you just crossed an important finish line. Each milestone has its own detector that knows exactly what to look for.

**Why We Use It**: By comparing state snapshots rather than tracking absolute values, we can accurately detect the *moment* of achievement. This prevents false positives (celebrating an achievement twice) and ensures timely celebration (immediately when it happens, not later when we notice it).

### MilestoneRegistry (Central Event Manager)

**Technical**: A class that maintains milestone definitions, event history, listener subscriptions, and emission state. It handles registration, detection, event creation, listener notification, and serialization.

**Plain English**: The registry is like an awards ceremony coordinator. It knows all the possible awards (milestone definitions), keeps track of who won what in the past (history), knows who wants to be notified when someone wins (listeners), and runs the actual ceremony when an achievement is detected (event emission).

**Why We Use It**: Centralizing milestone management ensures consistent behavior across the application. Any part of LOGOS can register interest in achievements, and the registry guarantees they'll be notified appropriately without duplicate events or missed notifications.

### Template Interpolation (Personalized Messages)

**Technical**: A string replacement system that takes templates like `"You've learned {count} vocabulary items"` and replaces placeholders with actual values from the milestone data using `interpolateTemplate()`.

**Plain English**: When you receive a birthday card that says "Happy Birthday, [Your Name]!", someone filled in your actual name. Template interpolation does the same thing for milestone messages. Instead of generic "You learned words!", you see "You've learned 500 words!"

**Why We Use It**: Personalized messages feel more meaningful than generic ones. A learner seeing "1000 vocabulary items mastered" with their actual count feels the achievement more viscerally than a generic "vocabulary milestone reached."

### Event Deduplication (Preventing Celebration Spam)

**Technical**: A combination of `achievedNonRepeatables` (Set), `lastEmissionByMilestone` (Map), and `DUPLICATE_COOLDOWN_MS` (60 seconds) that prevents the same milestone from firing repeatedly.

**Plain English**: If you cross a marathon finish line, you should hear the announcement once, not every time someone checks the race results. Deduplication ensures that achievements are celebrated once at the moment they happen, not repeatedly every time the system runs.

**Why We Use It**: Without deduplication, checking progress after every response could flood the UI with repeated celebrations for the same achievement, diluting the meaning and annoying the learner.

### Memory Safety Constants (Resource Protection)

**Technical**: Hard limits including `MAX_MILESTONE_HISTORY` (1000), `MAX_LISTENERS_PER_EVENT` (20), `MAX_EMISSIONS_PER_SESSION` (500) that prevent unbounded memory growth.

**Plain English**: Just as a physical trophy case has limited space, the milestone system has built-in limits. We keep the last 1000 achievements (not unlimited), allow up to 20 different parts of the app to listen for events (not unlimited), and cap celebrations per session (to prevent runaway loops).

**Why We Use It**: In long-running desktop applications, unbounded growth can eventually crash the application or make it sluggish. These limits ensure the system remains performant even after years of use.

### Priority Levels (Celebration Intensity)

**Technical**: Four priority levels - `'low' | 'medium' | 'high' | 'critical'` - that determine how prominently an achievement should be displayed and whether it auto-acknowledges.

**Plain English**: Not all achievements are equal. Getting your first 10 words is nice (low), but mastering your first item completely is remarkable (critical). Priority levels tell the UI how much fanfare to deploy - a subtle notification vs. a full-screen celebration animation.

**Why We Use It**: Over-celebrating minor achievements cheapens the experience, while under-celebrating major ones misses motivational opportunities. The priority system calibrates celebration intensity to achievement significance.

---

## The Built-In Milestones

### Stage Transition Milestones

Track progress through the 5-stage mastery model (0: Unknown -> 1: Recognition -> 2: Recall -> 3: Fluent -> 4: Mastered):

| Milestone | Priority | Points | Meaning |
|-----------|----------|--------|---------|
| stage_0_to_1 | Medium | 10 | First recognition of an item |
| stage_1_to_2 | Medium | 20 | Can now actively recall |
| stage_2_to_3 | High | 30 | Fluent, fast access |
| stage_3_to_4 | Critical | 50 | Full mastery achieved |

These are **repeatable** - you earn them for each item that advances.

### Accuracy Milestones

Track overall learning precision:

| Milestone | Priority | Points | Threshold |
|-----------|----------|--------|-----------|
| accuracy_70 | Low | 25 | 70% overall accuracy |
| accuracy_80 | Medium | 50 | 80% overall accuracy |
| accuracy_90 | High | 100 | 90% overall accuracy |
| accuracy_95 | Critical | 200 | 95% overall accuracy |

These are **non-repeatable** - once achieved, they stay achieved.

### Vocabulary Milestones

Celebrate growing word knowledge:

| Milestone | Priority | Points | Count |
|-----------|----------|--------|-------|
| vocab_100 | Medium | 100 | 100 words at Stage 2+ |
| vocab_500 | High | 300 | 500 words at Stage 2+ |
| vocab_1000 | Critical | 500 | 1000 words at Stage 2+ |
| vocab_2000 | Critical | 1000 | 2000 words at Stage 2+ |

### Streak Milestones

Reward consistent daily practice:

| Milestone | Priority | Points | Days |
|-----------|----------|--------|------|
| streak_7 | Medium | 70 | 1 week |
| streak_30 | High | 300 | 1 month |
| streak_100 | Critical | 1000 | 100 days |
| streak_365 | Critical | 5000 | 1 full year |

### Special Milestones

- **first_mastery** (Critical, 100 pts): The very first item to reach Stage 4 - a watershed moment
- **perfect_session** (High, 50 pts): 100% accuracy in a session - repeatable with 1-hour cooldown

---

## Design Decisions & Rationale

### Why State Comparison Instead of Event Triggers?

The detection system compares complete state snapshots rather than listening for individual events like "item mastered." This approach was chosen because:

1. **Atomicity**: Multiple items might advance in a single session. Comparing states captures all changes at once.
2. **Reliability**: If an event is missed, the snapshot comparison will still catch the achievement.
3. **Simplicity**: Detectors don't need to understand the details of how state changed, just what changed.

### Why Repeatable vs Non-Repeatable?

Some milestones (stage transitions, perfect sessions) can be earned multiple times - they celebrate ongoing effort. Others (accuracy thresholds, vocabulary counts) are one-time achievements that mark permanent progress levels. This distinction prevents both under-celebration (ignoring repeated excellence) and over-celebration (celebrating the same threshold repeatedly).

### Why 60-Second Cooldown?

The duplicate cooldown prevents scenarios where rapid session transitions might trigger the same milestone detection multiple times. 60 seconds is long enough to prevent spam but short enough that a genuinely new achievement (e.g., two items mastering in quick succession) still gets celebrated.

### Why Points?

The points system creates a single, comparable measure of achievement that can be:
- Displayed as a "total score" for gamification
- Used for leaderboards (if/when multiplayer features are added)
- Weighted to reflect achievement difficulty (365-day streak = 5000 pts shows its significance vs. 7-day streak = 70 pts)

---

## Serialization Format

The registry state serializes to JSON for persistence:

```json
{
  "history": [
    {
      "id": "stage_0_to_1_1704672000000",
      "type": "stage_transition",
      "milestoneId": "stage_0_to_1",
      "userId": "user_123",
      "timestamp": 1704672000000,
      "priority": "medium",
      "title": "First Recognition!",
      "description": "You can now recognize \"hello\"",
      "data": { "stage": 1, "previousStage": 0, "objectIds": ["obj_1"], "count": 1 },
      "acknowledged": true,
      "iconId": "stage_1",
      "pointsAwarded": 10
    }
  ],
  "achievedNonRepeatables": ["accuracy_70", "vocab_100"],
  "lastEmissionByMilestone": {
    "stage_0_to_1": 1704672000000,
    "perfect_session": 1704668400000
  }
}
```

---

## Utility Functions

The module exports helper functions for working with milestone data:

| Function | Purpose |
|----------|---------|
| `createEmptyProgressState(userId)` | Creates a blank learner state for initialization |
| `getMilestonePriorityOrder(priority)` | Converts priority to numeric order (1-4) |
| `sortMilestonesByPriority(events)` | Sorts milestones with highest priority first |
| `filterMilestonesByType(events, types)` | Filters events to specific milestone types |
| `calculateTotalPoints(events)` | Sums all points from a list of events |
| `groupMilestonesByType(events)` | Groups events into a Map by type |
| `summarizeMilestones(events)` | Creates human-readable summary string |

---

## Change History

### 2026-01-08 - Initial Implementation
- **What Changed**: Created complete milestone events system with 15 milestone types, registry class, built-in milestone definitions, and utility functions
- **Why**: Learner motivation and engagement requires visible progress markers and celebration moments
- **Impact**: Enables UI celebration layer, gamification features, and curriculum feedback based on achievement patterns

---

## Related Documentation

- [Core Types](/docs/narrative/src/core/types.md) - Type definitions for MasteryStage and ComponentType
- [Session Module](/docs/narrative/src/core/engines/e5-session.md) - Session orchestration that will trigger milestone checks
- [Mastery System](/docs/narrative/src/main/db/repositories/mastery.repository.md) - Database layer for mastery states
