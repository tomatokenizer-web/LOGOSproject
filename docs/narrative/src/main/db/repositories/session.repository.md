# Session Repository

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/db/repositories/session.repository.ts`
> **Status**: Active
> **Phase**: 2.3 - Session Recording

---

## Context & Purpose

This repository serves as the **data access layer for learning sessions**, tracking every interaction a user has with the language learning system. It exists because LOGOS needs to maintain a complete historical record of learning activities to power its adaptive algorithms.

**Business Need**: Language learning effectiveness depends on understanding patterns over time. Users need to see their progress, and the system needs historical data to intelligently select what to teach next. Without session tracking, LOGOS would treat every learning moment as if it were the first, unable to adapt to user strengths and weaknesses.

**User Need**: Learners want to know how they are progressing. They want to see how many items they practiced, their accuracy rates, how long they spent studying, and whether they are improving over time. Session data powers the dashboard statistics, progress visualizations, and personalized recommendations.

**When Used**:
- **Session Start**: When a user clicks "Start Session" on the SessionPage
- **During Practice**: Every time the user responds to a learning task
- **Session End**: When the user completes or exits a session
- **Analytics**: When displaying user statistics on the dashboard
- **Algorithm Updates**: When the IRT system needs to update theta ability estimates

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/main/db/prisma.ts`: `getPrisma()` - Provides the singleton Prisma database client. Without this connection, no data operations are possible.

- `@prisma/client`: `Session`, `Response`, `ThetaSnapshot`, `Prisma` - The auto-generated TypeScript types from the Prisma schema. These ensure type safety when reading and writing session data.

### Dependents (What Needs This)

- `src/main/db/index.ts`: Re-exports all session repository functions for use throughout the application. This is the central barrel file that other modules import from.

- `src/renderer/pages/SessionPage.tsx`: The React component that manages the learning session UI. It calls `startSession`, `recordResponse`, and `endSession` through IPC handlers to persist session data.

- `src/renderer/hooks/*.ts`: Custom React hooks like `useStartSession`, `useEndSession`, and `useRecordResponse` that wrap IPC calls to these repository functions.

- `src/main/ipc/session.ipc.ts` (implied): IPC handlers that bridge the renderer process to these repository functions, allowing the UI to persist session data.

### Data Flow

```
User clicks "Start Session"
    |
    v
SessionPage (React) --> IPC Handler --> createSession() --> Database
    |
    |  User answers a task
    v
SessionPage --> IPC Handler --> recordResponse() --> Database
                                     |
                                     +--> Updates session.itemsPracticed
    |
    |  Periodically during session
    v
IRT Algorithm --> saveThetaSnapshot() --> Database (preserves ability estimates)
    |
    |  User finishes session
    v
SessionPage --> IPC Handler --> endSession() --> Database
                                     |
                                     +--> Sets session.endedAt timestamp
    |
    v
Dashboard --> getUserStatistics() --> Database --> Aggregated learning metrics
```

---

## Macroscale: System Integration

### Architectural Layer

This repository sits in the **Data Access Layer** of LOGOS's three-tier architecture:

```
Layer 1: Presentation (React Components)
    - SessionPage.tsx, Dashboard components
    |
    v
Layer 2: Business Logic (Services & Algorithms)
    - IRT theta calculations, FSRS scheduling, Session management
    |
    v
Layer 3: Data Access (Repositories)  <-- YOU ARE HERE
    - session.repository.ts, goal.repository.ts, mastery.repository.ts
    |
    v
Layer 4: Storage (SQLite via Prisma)
    - Session, Response, ThetaSnapshot tables
```

### Relationship to Sibling Repositories

The session repository is one of four data repositories in LOGOS:

| Repository | Phase | Purpose |
|------------|-------|---------|
| `goal.repository.ts` | 2.1 | Manages learning goals and language objects |
| `mastery.repository.ts` | 2.2 | Tracks per-item mastery states (FSRS scheduling) |
| **`session.repository.ts`** | **2.3** | **Records session activity and responses** |
| `collocation.repository.ts` | 2.4 | Manages word co-occurrence relationships (PMI) |

These repositories work together: Goals contain language objects, mastery tracks object-level progress, sessions track time-based activity, and collocations inform vocabulary prioritization.

### Big Picture Impact

The session repository is the **historical backbone** of the entire learning system. It enables:

1. **Adaptive Learning**: Without response history, IRT cannot estimate user ability (theta)
2. **Progress Visualization**: Dashboard charts showing accuracy, time spent, and improvement trends
3. **Spaced Repetition**: Session timing data informs when to re-introduce items
4. **Learning Analytics**: Aggregate statistics help users understand their learning patterns
5. **Mode-Based Behavior**: Different theta update rules for learning, training, and evaluation modes

**Critical Path Analysis**: This is a **high-importance** component. If it fails:
- Users cannot start or complete learning sessions
- Response data is lost, breaking algorithm feedback loops
- Progress tracking becomes impossible
- The application degrades to a static flashcard system without adaptation

### Session Modes: A Key Design Decision

The repository implements three distinct **session modes** with different behaviors:

| Mode | Theta Update Behavior | Purpose |
|------|----------------------|---------|
| **Learning** | Frozen (no updates) | Safe exploration without penalizing mistakes during instruction |
| **Training** | Soft-track (50% weight) | Practice with partial credit toward ability estimation |
| **Evaluation** | Full IRT update (100% weight) | Accurate measurement of true ability level |

This design recognizes that learners perform differently when exploring new material versus demonstrating mastery. The `applyThetaRules()` function implements this logic, ensuring that struggling with a new concept doesn't unfairly lower a user's estimated ability.

---

## Technical Concepts (Plain English)

### Session Lifecycle Management

**Technical**: The repository provides `createSession`, `getSessionById`, and `endSession` functions that manage the complete lifecycle of a learning session entity in the database.

**Plain English**: Think of a session like clocking in and out at work. When you start learning, you "clock in" (createSession sets the start time). While you're learning, the system tracks everything you do. When you're done, you "clock out" (endSession sets the end time). Later, you can look back at your timesheet (getSessionById) to see what you accomplished.

**Why We Use It**: Sessions provide temporal boundaries for learning activities. This allows the system to calculate session duration, group responses together, and track progress over distinct study periods.

### Response Recording

**Technical**: The `recordResponse` function persists individual task responses with metadata including correctness, response time in milliseconds, cue level used, and optional IRT theta contribution values.

**Plain English**: Every time you answer a question, the system writes it down in a detailed logbook. It notes whether you got it right, how long you took to answer, whether you needed any hints, and how this response affects the system's estimate of your skill level.

**Why We Use It**: Individual responses are the atomic units of learning data. Aggregating them enables accuracy calculations, response time analysis, and feeds the IRT algorithm that estimates user ability.

### Theta Snapshots

**Technical**: The `saveThetaSnapshot` function persists point-in-time theta ability estimates (global and component-specific) along with standard error values during a session.

**Plain English**: Imagine taking a photograph of your skill level at a specific moment. The system periodically takes these "photographs" during a session so you can later see how your abilities evolved. Each snapshot captures your estimated ability in different areas (pronunciation, vocabulary, grammar, etc.).

**Why We Use It**: Theta values change throughout a session as the IRT algorithm processes responses. Snapshots create a timeline of ability changes, enabling visualization of learning progress over time.

### IRT (Item Response Theory) Theta

**Technical**: Theta is the latent ability parameter in the IRT model, estimated using response patterns to items with known difficulty. LOGOS maintains global and component-specific theta values.

**Plain English**: Theta is like a hidden "skill score" that the system calculates by watching how you perform on different difficulty levels. If you consistently answer hard questions correctly, your theta goes up. If you struggle with easy ones, it goes down. LOGOS tracks separate thetas for different skills (pronunciation, morphology, etc.) so it knows your strengths and weaknesses.

**Why We Use It**: Theta enables adaptive item selection. By matching item difficulty to user ability, the system can present appropriately challenging content, neither too easy (boring) nor too hard (frustrating).

### Session Mode Theta Rules

**Technical**: The `applyThetaRules` function implements conditional theta updates based on session mode: learning (freeze), training (0.5 weight), evaluation (1.0 weight).

**Plain English**: The system treats your performance differently depending on the situation:
- **Learning mode**: Like a practice test that doesn't count. Make mistakes freely while learning new material.
- **Training mode**: Like homework. Your performance counts, but not as heavily as an exam.
- **Evaluation mode**: Like a final test. Your performance fully updates your skill estimate.

**Why We Use It**: This prevents the "cold start" problem where exploring new material unfairly penalizes a learner's ability estimate. It separates instruction from assessment.

### Exponential Moving Average (in Response Stats)

**Technical**: Session statistics like average response time are calculated using aggregations over all responses within a session.

**Plain English**: Instead of just looking at your most recent answer, the system calculates running averages that consider your entire session. This smooths out outliers (like when you got distracted for one question) and gives a more accurate picture of your typical performance.

**Why We Use It**: Raw response times and accuracy rates can be noisy. Aggregated statistics provide more reliable metrics for progress tracking and algorithm inputs.

---

## Key Functions Reference

### Session Lifecycle

| Function | Purpose |
|----------|---------|
| `createSession` | Start a new session for a user working on a specific goal |
| `getSessionById` | Retrieve a session by its ID |
| `getSessionWithResponses` | Get a session with all its responses and theta snapshots |
| `endSession` | Mark a session as complete by setting the end timestamp |

### Response Tracking

| Function | Purpose |
|----------|---------|
| `recordResponse` | Log an individual task response with all metadata |
| `recordStageTransition` | Increment the counter when a user advances to a new mastery stage |
| `recordTaskType` | Track fluency vs. versatility task distribution |
| `getResponseHistory` | Get historical responses for a specific language object |

### Theta Management

| Function | Purpose |
|----------|---------|
| `saveThetaSnapshot` | Persist a point-in-time theta state during a session |
| `getThetaProgression` | Get all theta snapshots for a user over time |
| `applyThetaRules` | Update user's theta based on session mode and contribution |

### Analytics & History

| Function | Purpose |
|----------|---------|
| `getSessionHistory` | Get recent sessions for a user |
| `getSessionsByGoal` | Get sessions associated with a specific goal |
| `getSessionSummary` | Calculate aggregate statistics for a session |
| `getUserStatistics` | Get lifetime learning statistics across all sessions |

---

## Change History

### 2026-01-04 - Initial Documentation
- **What Changed**: Created narrative documentation for session repository
- **Why**: Implementing Shadow Map documentation methodology for LOGOS codebase
- **Impact**: Improves code understanding for new contributors and maintains institutional knowledge

### Phase 2.3 - Initial Implementation
- **What Changed**: Created session repository with full CRUD operations, response tracking, theta snapshots, and mode-based theta rules
- **Why**: Implementing the Session Recording phase of LOGOS development
- **Impact**: Enables complete learning session tracking, historical analytics, and adaptive algorithm support

---

## Related Documentation

- `docs/narrative/src/main/db/repositories/goal.repository.md` - Goal management (Phase 2.1)
- `docs/narrative/src/main/db/repositories/mastery.repository.md` - Mastery state tracking (Phase 2.2)
- `docs/narrative/prisma/schema.md` - Database schema definitions
- `docs/narrative/src/renderer/pages/SessionPage.md` - UI component that consumes this repository
