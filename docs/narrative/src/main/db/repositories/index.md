# Repositories Index

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/db/repositories/index.ts`
> **Status**: Active
> **Phase**: 2.x - Data Access Layer Foundation

---

## Context & Purpose

### Why a Barrel Export Exists

In any sufficiently large TypeScript application, import statements can become unwieldy. Imagine writing this at the top of every file that needs database access:

```typescript
import { createGoal, getGoalById, getGoalsByUser } from '../db/repositories/goal.repository';
import { getMasteryState, updateMasteryState, getReviewQueue } from '../db/repositories/mastery.repository';
import { createSession, recordResponse, getSessionSummary } from '../db/repositories/session.repository';
import { getCollocationsForWord, getCollocationNetwork } from '../db/repositories/collocation.repository';
```

The repositories index solves this by providing a **single import point** for all data access operations. With the barrel export pattern, the above becomes:

```typescript
import { createGoal, getMasteryState, createSession, getCollocationsForWord } from '../db/repositories';
```

**Business Need**: Developer productivity. A clean import structure reduces cognitive load, prevents import path errors, and makes refactoring easier. When repository internals change (file renames, function moves), only the index needs updating - consumers remain unchanged.

**When Used**: Every time any part of the LOGOS application needs to interact with the database. This index is the **primary entry point** for all database operations across the entire codebase.

### What Gets Re-Exported

The index re-exports all public APIs from five specialized repository modules, each corresponding to a phase in the LOGOS data layer implementation:

| Module | Phase | Domain | Exports |
|--------|-------|--------|---------|
| `goal.repository` | 2.1 | Goal Management | Goal CRUD, LanguageObject management, priority calculations |
| `mastery.repository` | 2.2 | Mastery Tracking | MasteryState lifecycle, FSRS scheduling, review queues |
| `session.repository` | 2.3 | Session Recording | Session management, response tracking, theta snapshots |
| `collocation.repository` | 2.4 | Word Relationships | PMI-based collocations, relational density, network queries |
| `error-analysis.repository` | Gap 1.1 | Error Analysis | Error pattern tracking, bottleneck detection, remediation plans |

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

The index file itself has minimal dependencies - it only imports from its sibling repository modules:

- **`./goal.repository`**: Re-exports all Goal and LanguageObject operations. This module provides functions for creating learning goals, managing vocabulary items, calculating progress, and handling bulk priority updates.

- **`./mastery.repository`**: Re-exports all MasteryState operations. This module tracks the five-stage learning progression, manages FSRS spaced repetition parameters, builds review queues, and records accuracy metrics.

- **`./session.repository`**: Re-exports all Session and Response operations. This module handles practice session lifecycle, records individual responses with timing data, tracks theta ability estimates, and generates session analytics.

- **`./collocation.repository`**: Re-exports all Collocation operations. This module manages PMI-based word relationships, builds network graphs for vocabulary visualization, and calculates relational density scores.

- **`./error-analysis.repository`**: Re-exports all ErrorAnalysis and ComponentErrorStats operations. This module tracks error patterns by linguistic component (PHON/MORPH/LEX/SYNT/PRAG), detects bottlenecks, and generates remediation plans.

### Dependents (What Needs This)

As the central export point, this index is consumed throughout the LOGOS application:

- **`src/main/db/index.ts`**: The parent database module re-exports this index alongside the Prisma client utilities, creating the top-level `../db` import path.

- **`src/main/ipc/*.ipc.ts`**: All IPC handlers import repository functions through this index to perform database operations in response to renderer process requests.

- **`src/main/services/*.ts`**: Service layer modules import from here when they need to persist or retrieve data as part of business logic operations.

### Re-Export Pattern

```
goal.repository.ts ─────────────┐
                                │
mastery.repository.ts ──────────┼──> index.ts ──> Consumers
                                │
session.repository.ts ──────────┤
                                │
collocation.repository.ts ──────┤
                                │
error-analysis.repository.ts ───┘
```

This pattern is known as the **Barrel Export** pattern, named after the way a barrel collects items from multiple sources into a single container.

---

## Macroscale: System Integration

### Architectural Layer

The repositories index sits at the **interface boundary** of the Data Access Layer:

```
Layer 1: Presentation (React UI)
    |
    | IPC Bridge
    v
Layer 2: Application Logic (IPC Handlers + Services)
    |
    | Repository Pattern
    v
Layer 3: DATA ACCESS LAYER
    |
    +-- repositories/
    |       |
    |       +-- index.ts <-- You are here (INTERFACE)
    |       +-- goal.repository.ts
    |       +-- mastery.repository.ts
    |       +-- session.repository.ts
    |       +-- collocation.repository.ts
    |
    | Prisma ORM
    v
Layer 4: Database (SQLite)
```

The index acts as the **facade** for the entire repository layer. Consumers interact only with this unified interface, never directly with individual repository files.

### Big Picture Impact

This seemingly simple file has outsized architectural significance:

1. **API Stability Contract**: The index defines the public API of the data layer. Adding a function to a repository module doesn't expose it externally until explicitly added to that module's exports. The index ensures only intentional exports become part of the public surface.

2. **Encapsulation Boundary**: Internal repository refactoring (splitting modules, renaming functions, moving code between files) can occur without breaking consumers, as long as the index continues to export the same names.

3. **Import Resolution Optimization**: TypeScript and bundlers can optimize imports more effectively when they flow through a single entry point. Tree-shaking works better with clear module boundaries.

4. **Discoverability**: New developers can open this one file to see all available data access operations. The index serves as a living documentation of the data layer's capabilities.

### The Five Pillars of LOGOS Data

The five re-exported repositories map directly to the core data concepts in LOGOS:

```
                         LOGOS Data Architecture

        +-------------------+-------------------+-------------------+
        |                   |                   |                   |
   +----+----+         +----+----+         +----+----+         +----+----+
   |  GOAL   |         | MASTERY |         | SESSION |         | ERROR   |
   |         |         |         |         |         |         | ANALYSIS|
   | What to |  --->   | How well|  <---   | What    |  --->   | Why     |
   | learn   |         | learned |         | happened|         | stuck   |
   +---------+         +---------+         +---------+         +---------+
        |                   |                   |                   |
        |              +----+----+              |                   |
        |              |COLLOCATION             |                   |
        +------------->|         |<-------------+-------------------+
                       | How words|
                       | relate   |
                       +----------+
```

- **Goals** define *what* the user wants to learn (domains, modalities, vocabulary lists)
- **Mastery** tracks *how well* each item is learned (stages, accuracy, FSRS parameters)
- **Sessions** record *what happened* during practice (responses, timing, theta changes)
- **Collocations** capture *how words relate* (PMI scores, co-occurrence networks)
- **Error Analysis** identifies *why* the learner is stuck (bottlenecks, patterns, remediation)

---

## Technical Concepts (Plain English)

### Barrel Export Pattern

**Technical**: A module organization pattern where an `index.ts` file re-exports selected exports from multiple sibling modules, creating a single import point for a directory. Implemented using `export * from './module'` syntax.

**Plain English**: Think of it like a shipping warehouse. Instead of customers visiting each manufacturer directly, they order from the warehouse. The warehouse (index.ts) gathers products (exports) from different suppliers (repository modules) and ships them out through one door. Customers don't need to know which supplier made which product - they just order from the warehouse.

**Why We Use It**:
- Cleaner imports (one path instead of many)
- Easier refactoring (change internals without changing consumers)
- Clear public API boundary (only explicitly exported items are available)
- Better IDE autocomplete (all options in one place)

### Re-Export (`export * from`)

**Technical**: A TypeScript syntax that takes all named exports from another module and re-exports them from the current module. Does not include default exports unless explicitly handled.

**Plain English**: It's like a copy machine for imports. Whatever the source module exports, this module also exports - automatically. If `goal.repository` exports 15 functions, `export * from './goal.repository'` makes all 15 available from the index.

**Why We Use It**: Avoids manually listing every export. When a repository adds a new function, it automatically becomes available through the index without editing the index file.

### Module Resolution

**Technical**: The process by which TypeScript/Node.js resolves import paths to actual files. When importing from a directory path (`'./repositories'`), the runtime looks for an `index.ts` or `index.js` file in that directory.

**Plain English**: When you write `import { something } from './repositories'` without specifying a file, the system automatically looks for `./repositories/index.ts`. It's like addressing a letter to a company - you don't specify the mailroom, but that's where it goes first for sorting.

**Why We Use It**: Enables the clean import syntax `from '../db/repositories'` instead of `from '../db/repositories/index'`.

---

## Module Inventory

### Goal Repository (Phase 2.1)

**Domain**: Learning goal specification and vocabulary management

**Key Exports**:
- `createGoal()`, `getGoalById()`, `updateGoal()`, `deleteGoal()` - Goal CRUD
- `getGoalWithObjects()`, `getGoalsByUser()` - Goal queries with relations
- `addLanguageObjectsToGoal()`, `getLanguageObjects()` - Vocabulary management
- `calculateGoalProgress()` - Progress aggregation
- `updateObjectPriority()`, `bulkUpdatePriorities()` - Priority management

**Types**: `CreateGoalInput`, `UpdateGoalInput`, `GoalWithObjects`, `GoalProgress`

### Mastery Repository (Phase 2.2)

**Domain**: Learning state tracking and spaced repetition scheduling

**Key Exports**:
- `createMasteryState()`, `getMasteryState()`, `updateMasteryState()` - State CRUD
- `recordExposure()` - Accuracy tracking with EMA
- `getReviewQueue()` - Due item retrieval
- `updateFSRSParameters()` - Spaced repetition scheduling
- `transitionStage()` - Stage advancement
- `getMasteryStatistics()` - Analytics aggregation

**Types**: `CreateMasteryStateInput`, `UpdateMasteryStateInput`, `MasteryWithObject`, `ReviewQueueItem`, `StageTransition`

### Session Repository (Phase 2.3)

**Domain**: Practice session lifecycle and response tracking

**Key Exports**:
- `createSession()`, `endSession()` - Session lifecycle
- `recordResponse()` - Response persistence
- `recordStageTransition()`, `recordTaskType()` - Session metric updates
- `saveThetaSnapshot()`, `getThetaProgression()` - Ability tracking
- `getSessionSummary()`, `getUserStatistics()` - Analytics
- `applyThetaRules()` - Mode-based theta updates

**Types**: `SessionMode`, `CreateSessionInput`, `RecordResponseInput`, `SessionWithResponses`, `SessionSummary`, `ThetaState`

### Collocation Repository (Phase 2.4)

**Domain**: PMI-based word relationships and vocabulary networks

**Key Exports**:
- `createCollocation()`, `getCollocation()`, `updateCollocation()`, `deleteCollocation()` - Collocation CRUD
- `getCollocationsForWord()`, `getTopCollocations()`, `getLowPMIPairs()` - Relationship queries
- `getCollocationNetwork()` - Graph visualization data
- `calculateRelationalDensity()`, `recalculateRelationalDensities()` - Hub scoring
- `getCollocationStats()` - Network analytics

**Types**: `CreateCollocationInput`, `CollocationWithWords`, `CollocationPair`, `CollocationNetwork`

### Error Analysis Repository (Gap 1.1)

**Domain**: Error pattern tracking, bottleneck detection, and remediation planning

**Key Exports**:
- `createErrorAnalysis()`, `getErrorAnalysisForResponse()`, `getErrorAnalysesForObject()` - Error CRUD
- `getErrorsByComponent()` - Component-filtered queries
- `identifyErrorPatterns()` - Pattern recognition with examples
- `findCooccurringErrors()` - Cascade/correlation detection
- `getOrCreateComponentStats()`, `updateComponentStats()`, `getUserComponentStats()` - Stats management
- `recalculateComponentStats()` - Aggregate recomputation
- `detectBottlenecks()`, `getPrimaryBottleneck()` - Threshold detection
- `generateRemediationPlan()` - Prioritized improvement recommendations

**Types**: `ComponentCode`, `AnalysisSource`, `CreateErrorAnalysisInput`, `ErrorPattern`, `BottleneckResult`

---

## Usage Examples

### Importing Everything Needed

```typescript
// In an IPC handler or service
import {
  // From goal.repository
  createGoal,
  getGoalsByUser,
  addLanguageObjectsToGoal,

  // From mastery.repository
  getReviewQueue,
  updateFSRSParameters,

  // From session.repository
  createSession,
  recordResponse,

  // From collocation.repository
  getCollocationsForWord,

  // Types (also re-exported)
  type CreateGoalInput,
  type ReviewQueueItem,
} from '../db/repositories';
```

### Type-Only Imports

```typescript
// When you only need types (doesn't import runtime code)
import type {
  GoalProgress,
  SessionSummary,
  CollocationNetwork,
} from '../db/repositories';
```

---

## Change History

### 2026-01-04 - Added Error Analysis Repository
- **What Changed**: Added error-analysis.repository to barrel exports, updated documentation
- **Why**: Gap 1.1 (Threshold Detection Algorithm) implementation requires persistent error tracking
- **Impact**: Error analysis functions now importable alongside other repository functions

### 2026-01-04 - Initial Creation
- **What Changed**: Created index.ts as barrel export for all four core repository modules
- **Why**: Provide unified access point for data operations as repositories were implemented in Phases 2.1-2.4
- **Impact**: All database operations now importable from single path `'../db/repositories'`

### Design Decisions

1. **Full re-export (`export *`) vs Named re-exports**: Chose full re-export for simplicity. If API surface control becomes important (hiding internal functions), can switch to explicit named exports.

2. **Single index vs Grouped indexes**: Chose single index covering all repositories. Alternative was category-based (e.g., `repositories/learning` vs `repositories/content`). Single index won for simplicity given current codebase size.

3. **No index-level logic**: The index contains only re-exports, no additional logic. This keeps it as a pure organizational tool with no runtime behavior to test or debug.

---

*This documentation mirrors: `src/main/db/repositories/index.ts`*
