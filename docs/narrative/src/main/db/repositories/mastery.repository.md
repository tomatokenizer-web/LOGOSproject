# Mastery Repository

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/db/repositories/mastery.repository.ts`
> **Status**: Active
> **Phase**: 2.2 - Mastery State Tracking

---

## Context & Purpose

### Why Mastery Tracking Exists

Language learning is fundamentally about moving knowledge from "I've never seen this" to "I can use this automatically without thinking." This transformation does not happen in a single step - it progresses through distinct cognitive stages, each requiring different types of practice and review schedules.

The Mastery Repository exists to **persist and query the learning state of every language object** (words, phrases, grammar rules) a user encounters. Without this layer, the application would have no memory between sessions - users would see the same content repeatedly or miss critical review windows.

**Business Need**: Users need personalized learning paths that adapt to their actual performance, not generic curricula. The mastery repository provides the data foundation that enables LOGOS to act as an intelligent tutor rather than a static flashcard deck.

**When Used**:
- Every time a user answers a practice question (recording exposure)
- When building the review queue at session start (fetching due items)
- After each response to update FSRS scheduling parameters
- When generating analytics dashboards (aggregating mastery statistics)
- When determining if an item should advance to the next mastery stage

### The Five-Stage Mastery Model

LOGOS tracks learning through five stages:

| Stage | Name | Description | Plain English |
|-------|------|-------------|---------------|
| 0 | Unknown | Never encountered | "I've never seen this word" |
| 1 | Recognition | Can recognize with cues | "I know I've seen this before when you show me options" |
| 2 | Recall | Can recall ~60% cue-free | "I can usually remember this on my own" |
| 3 | Controlled | 75%+ accuracy, week stability | "I reliably know this if I think about it" |
| 4 | Automatic | 90%+ accuracy, month stability | "This comes naturally without effort" |

The repository functions orchestrate these transitions based on measured performance.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- **`src/main/db/prisma.ts`**: `getPrisma()` - Provides the database connection handle. Every repository function begins by acquiring the Prisma client through this centralized access point.

- **`@prisma/client`**: `MasteryState`, `LanguageObject`, `Prisma` types - TypeScript type definitions generated from the Prisma schema that ensure type safety for all database operations.

### Dependents (What Needs This)

- **`src/main/ipc/session.ipc.ts`**: The session IPC handlers create and update mastery states whenever users submit responses. The `session:submit-response` handler either creates a new MasteryState record or updates an existing one after each practice attempt.

- **`src/main/ipc/learning.ipc.ts`**: The `object:get-mastery` handler queries mastery state for individual objects, and `queue:get` uses mastery data to build personalized learning queues.

- **`src/main/db/index.ts`**: Re-exports all repository functions as part of the unified database module, making them accessible throughout the application via `import { ... } from '../db'`.

- **`src/renderer/components/analytics/ProgressDashboard.tsx`**: Consumes mastery statistics to render progress visualizations showing stage distributions and accuracy trends.

- **`src/renderer/pages/DashboardPage.tsx`**: Displays mastery overview information based on aggregated statistics from this repository.

### Data Flow

```
User submits answer
        |
        v
session.ipc.ts (submit-response handler)
        |
        +--> getMasteryState(objectId)
        |         |
        |         v
        |    [Fetch current state from DB]
        |
        +--> recordExposure(objectId, correct, cueLevel)
        |         |
        |         v
        |    [Update accuracy with exponential moving average]
        |
        +--> updateFSRSParameters(objectId, difficulty, stability, nextReview, rating)
        |         |
        |         v
        |    [Update scheduling for next review]
        |
        +--> transitionStage(objectId, newStage) [if criteria met]
                  |
                  v
             [Return transition record for analytics]
```

---

## Macroscale: System Integration

### Architectural Layer

This repository sits in the **Data Access Layer** of LOGOS's three-tier architecture:

```
Layer 1: Presentation (React UI)
    |
    | IPC Bridge
    v
Layer 2: Application Logic (IPC Handlers + Services)
    |
    | Repository Pattern
    v
Layer 3: DATA ACCESS LAYER <-- You are here
    |
    | Prisma ORM
    v
Layer 4: Database (SQLite)
```

The mastery repository implements the **Repository Pattern** - it encapsulates all database queries related to mastery tracking, providing a clean API that the application layer can use without knowing SQL or Prisma-specific syntax.

### Big Picture Impact

The Mastery Repository is the **memory center** of LOGOS's adaptive learning system. Without it:

1. **No personalization**: Every session would start from scratch with no memory of past performance
2. **No spaced repetition**: Items would never be scheduled for optimal review timing
3. **No progress tracking**: Users couldn't see their advancement through mastery stages
4. **No adaptive difficulty**: The system couldn't adjust content presentation based on learner state

**Critical Path Analysis**: This is a **Tier 1 Critical Component**. If the mastery repository fails:
- Users cannot practice (no items in review queue)
- Responses cannot be recorded (learning is lost)
- Progress analytics become empty
- The entire adaptive learning engine stops functioning

### Integration with Core Algorithms

The repository serves as the **bridge between pure algorithms and persistent storage**:

```
src/core/fsrs.ts          <-->  mastery.repository.ts  <-->  MasteryState table
(FSRS calculations)            (persistence layer)          (SQLite storage)
```

The core FSRS module performs calculations in memory. This repository persists those results and reconstructs the state for future calculations.

---

## Technical Concepts (Plain English)

### Exponential Moving Average (EMA)

**Technical**: An accuracy tracking method where recent observations have exponentially higher weight than older ones, controlled by smoothing factor alpha = 0.2.

**Plain English**: Imagine your grade is calculated by giving your most recent tests much more weight than old ones. If you scored 100% today but 50% last month, your "accuracy" would be closer to 100% than to 75%. This means the system quickly adapts when your knowledge improves (or declines).

**Why We Use It**: Memory is dynamic - what you knew yesterday might be forgotten today. EMA tracks your *current* ability rather than your historical average, making the system responsive to real learning progress.

**Formula used**: `new_accuracy = old_accuracy * 0.8 + new_result * 0.2`

### Scaffolding Gap

**Technical**: The difference between cue-assisted accuracy and cue-free accuracy, measured as `cueAssistedAccuracy - cueFreeAccuracy`.

**Plain English**: This measures how much you rely on hints. If you score 90% when given hints but only 60% without hints, your scaffolding gap is 30%. A high gap means you recognize the answer when you see it but can't recall it independently - like recognizing a song but not being able to hum the melody.

**Why We Use It**:
- A large gap indicates the learner needs more retrieval practice (tests without hints)
- Stage 4 (Automatic) requires gap < 10% - true mastery means you don't need crutches
- Cue level selection is based on gap: larger gaps mean more hints are provided

### FSRS (Free Spaced Repetition Scheduler)

**Technical**: A two-variable memory model using stability (S) and difficulty (D) parameters to predict optimal review intervals, based on the forgetting curve formula `R = e^(-t/S)`.

**Plain English**: FSRS is like a smart calendar that knows when you're about to forget something. It watches how well you remember each word and calculates the perfect time to quiz you - not too soon (wasting your time) and not too late (after you've forgotten). The "stability" number represents how many days until you'll probably forget something.

**Why We Use It**: Human memory follows predictable patterns. By modeling these patterns mathematically, we can schedule reviews at the moment of "desirable difficulty" - right when you're about to forget but can still retrieve the memory with effort. This retrieval strengthens the memory far more than easy reviews.

### Rating System (1-4)

**Technical**: FSRS uses a four-point rating scale where 1=Again, 2=Hard, 3=Good, 4=Easy, each triggering different stability and difficulty adjustments.

**Plain English**: After each answer, the system categorizes your response:
- **1 (Again)**: Wrong answer - stability drops sharply, you'll see this again soon
- **2 (Hard)**: Right but needed hints - moderate stability increase
- **3 (Good)**: Right without hints, took some thought - normal stability increase
- **4 (Easy)**: Right instantly without effort - large stability increase, longer until next review

**Why We Use It**: Different response qualities indicate different memory strengths. A lucky guess deserves different treatment than confident recall.

### Lapse Tracking

**Technical**: Incrementing a counter (`fsrsLapses`) each time a previously learned item receives a rating of 1 or 2, indicating the memory has decayed.

**Plain English**: A "lapse" is when you forget something you used to know. The system tracks these like a doctor tracking relapses - if an item has many lapses, it's a "leech" that needs special attention or a different learning approach.

**Why We Use It**: High-lapse items may indicate:
- Confusing similar words (interference)
- Poor initial encoding (need different presentation)
- Inherently difficult content (adjust difficulty estimate)

---

## Function Reference

### Core CRUD Operations

| Function | Purpose | When Used |
|----------|---------|-----------|
| `createMasteryState()` | Initialize mastery for new language object | First encounter with a word |
| `getMasteryState()` | Retrieve current mastery by objectId | Before processing a response |
| `getMasteryWithObject()` | Get mastery + parent LanguageObject | Display with content context |
| `updateMasteryState()` | Generic update of any mastery fields | After response processing |

### Exposure & Accuracy Tracking

| Function | Purpose | When Used |
|----------|---------|-----------|
| `recordExposure()` | Update accuracy with EMA after practice | After every response |
| `getScaffoldingGap()` | Calculate cue dependency measure | Cue level decisions, stage checks |

### Review Scheduling

| Function | Purpose | When Used |
|----------|---------|-----------|
| `getReviewQueue()` | Fetch items due for review | Session start, building practice queue |
| `updateFSRSParameters()` | Update FSRS scheduling after review | After rating calculated |

### Stage Management

| Function | Purpose | When Used |
|----------|---------|-----------|
| `transitionStage()` | Move item to new mastery stage | When stage criteria met |
| `getItemsByStage()` | Query items at specific stage | Analytics, targeted practice |

### Analytics

| Function | Purpose | When Used |
|----------|---------|-----------|
| `getMasteryStatistics()` | Aggregate mastery data for goal | Dashboard rendering |
| `bulkCreateMasteryStates()` | Batch initialize many objects | Content import |

---

## Query Patterns

### Review Queue Construction

The `getReviewQueue()` function implements a priority-ordered query:

```
WHERE (nextReview IS NULL) OR (nextReview <= NOW)
ORDER BY stage ASC, priority DESC
LIMIT [sessionSize]
```

**Logic**: Items with null nextReview are new (never reviewed). Items with past due dates need review. Lower stages get priority (focus on advancing weak items). Within a stage, higher priority items come first.

### Accuracy Update Pattern

The `recordExposure()` function updates accuracy differently based on cue level:

- **Cue-free (cueLevel = 0)**: Updates `cueFreeAccuracy` - this is the "true" recall ability
- **Cue-assisted (cueLevel > 0)**: Updates `cueAssistedAccuracy` - recognition with support

Both use EMA with alpha = 0.2, meaning each new response shifts the average by 20%.

---

## Change History

### 2026-01-04 - Phase 2.2 Implementation
- **What Changed**: Created mastery.repository.ts with full CRUD, FSRS integration, and analytics functions
- **Why**: Implementing Phase 2.2 (Mastery State Tracking) of the LOGOS development roadmap
- **Impact**: Enables persistent mastery tracking, spaced repetition scheduling, and progress analytics

### Design Decisions

1. **Exponential Moving Average vs Simple Average**: EMA chosen because memory is non-stationary - old performance data becomes less relevant over time as the learner's actual knowledge changes.

2. **Separate cue-free/cue-assisted tracking**: Maintains two accuracy metrics rather than one because they measure different cognitive abilities (recognition vs recall). Stage 4 explicitly requires convergence of these metrics.

3. **Stage transition as explicit function**: Rather than embedding stage logic in update functions, `transitionStage()` is separate to provide a clean audit trail of progression milestones.

4. **FSRS parameters stored flat**: Rather than nested JSON, FSRS parameters (difficulty, stability, reps, lapses, state) are stored as individual columns for efficient querying and indexing.

---

*This documentation mirrors: `src/main/db/repositories/mastery.repository.ts`*
