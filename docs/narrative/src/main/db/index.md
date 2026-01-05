# Database Module Index (Barrel Export)

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/db/index.ts`
> **Status**: Active

---

## Context & Purpose

This file serves as the **barrel export** (a centralized re-export file) for the entire database module in the LOGOS language learning application. It exists to provide a clean, unified API surface for database operations, allowing other parts of the application to import everything database-related from a single location.

**Business Need**: The LOGOS application needs to persist user learning data, goals, mastery progress, sessions, and collocation information. Without a well-organized database module, code throughout the application would need to know the internal file structure of the database layer, creating tight coupling and maintenance headaches.

**When Used**: Every time any part of the LOGOS application needs to:
- Connect to or disconnect from the database
- Execute queries within a transaction
- Access goal, mastery, session, or collocation data via repositories

---

## Microscale: Direct Relationships

### Dependencies (What This Re-exports)

This barrel file aggregates exports from two distinct categories:

**Connection Utilities** (from `./prisma.ts`):
- `getPrisma()` - Retrieves the singleton Prisma client instance
- `initDatabase()` - Establishes the database connection during app startup
- `closeDatabase()` - Gracefully closes the connection during app shutdown
- `withTransaction()` - Wraps operations in an ACID-compliant database transaction

**Repository Classes** (from `./repositories/`):
- `goal.repository` - Manages user learning goals and targets
- `mastery.repository` - Tracks vocabulary and concept mastery levels
- `session.repository` - Records learning session history and metrics
- `collocation.repository` - Stores word combination patterns for language learning

### Dependents (What Imports from This Module)

- `src/main/index.ts`: The main Electron process imports `initDatabase` to establish database connection during application startup
- `src/main/db/client.ts`: An alternative database client file (appears to be a parallel implementation with the same singleton pattern)
- `src/main/ipc/*.ipc.ts`: IPC handlers import repositories to handle renderer process requests for database operations

### Data Flow

```
Application Startup
        |
        v
main/index.ts imports { initDatabase } from './db'
        |
        v
initDatabase() connects to SQLite via Prisma
        |
        v
IPC handlers import repositories from './db'
        |
        v
Renderer process sends requests via IPC
        |
        v
IPC handlers use repositories to query/mutate data
        |
        v
Responses sent back to renderer
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits at the **Data Access Layer** of the LOGOS three-tier architecture:

- **Layer 1 (Renderer)**: React UI components that display learning content
- **Layer 2 (Main Process)**: Electron main process with IPC handlers and business logic
- **Layer 3 (Data Access)**: **This module** - Database connection and repository pattern implementation

The barrel export pattern ensures that Layers 1 and 2 interact with Layer 3 through a single, stable interface.

### Big Picture Impact

The database module is the **persistence backbone** of LOGOS. It enables:

- **Learning Progress Tracking**: Without persistent storage, users would lose all their vocabulary mastery data, session history, and customized goals every time they close the application
- **Adaptive Learning Algorithms**: The IRT (Item Response Theory) and FSRS (Free Spaced Repetition Scheduler) algorithms require historical performance data to calculate optimal review schedules
- **Goal Management**: Users set learning targets (e.g., "Learn 50 new words this week") which must persist across sessions
- **Collocation Analysis**: PMI (Pointwise Mutual Information) calculations for word combinations depend on stored collocation frequency data

### Critical Path Analysis

**Importance Level**: Critical

- **If this module fails**: The entire application becomes non-functional. No data can be stored or retrieved. The learning algorithms cannot operate without historical data.
- **Failure modes**:
  - Database connection failure during startup: Application cannot initialize
  - Transaction failure during learning session: User progress is lost
  - Repository query failure: UI displays errors or stale data
- **Recovery strategy**: The `withTransaction` utility provides rollback capability for failed operations. The singleton pattern prevents connection pool exhaustion.

---

## Technical Concepts (Plain English)

### Barrel Export Pattern

**Technical**: A module design pattern where a single `index.ts` file re-exports all public APIs from multiple internal files, creating a unified import point.

**Plain English**: Like a department store directory at the entrance that lists all departments - you don't need to know which floor electronics is on, you just look it up at the central directory. Similarly, consumers of this module don't need to know that `getPrisma` lives in `prisma.ts` and `GoalRepository` lives in `repositories/goal.repository.ts`.

**Why We Use It**: Simplifies imports across the codebase. Instead of:
```typescript
import { getPrisma } from './db/prisma';
import { GoalRepository } from './db/repositories/goal.repository';
```
Consumers can write:
```typescript
import { getPrisma, GoalRepository } from './db';
```

### Singleton Pattern (for Database Connections)

**Technical**: A creational design pattern that restricts instantiation of a class to a single object, ensuring only one database connection pool exists.

**Plain English**: Like having one shared phone line for an entire household instead of each person getting their own line. It prevents resource waste and coordination problems.

**Why We Use It**: Database connections are expensive to create. Opening too many connections can exhaust system resources or hit database limits. The singleton ensures all parts of the application share one connection pool.

### Repository Pattern

**Technical**: A design pattern that encapsulates data access logic and provides a collection-like interface for domain objects, abstracting the underlying data store.

**Plain English**: Like having a librarian who knows exactly where every book is shelved. You ask the librarian for "books about French verbs" and they handle finding it in the catalog, locating the shelf, and retrieving the book. You don't need to know the Dewey Decimal system.

**Why We Use It**: Separates "what data we need" from "how to get it from the database." If we later switch from SQLite to PostgreSQL, only the repository internals change - all the code that uses repositories stays the same.

### ACID Transactions (via withTransaction)

**Technical**: A set of properties (Atomicity, Consistency, Isolation, Durability) that guarantee database transactions are processed reliably.

**Plain English**: Like an "all-or-nothing" bank transfer. If you're transferring $100 from savings to checking, either both accounts update correctly, or neither does. You'll never end up with money disappearing or appearing from nowhere.

**Why We Use It**: Learning sessions may update multiple tables (session record, mastery scores, goal progress). If the app crashes mid-update, the transaction ensures we don't end up with partially saved data that corrupts the user's learning history.

---

## Design Decisions & Rationale

### Why a Separate `prisma.ts` Instead of Inline?

The connection utilities (`getPrisma`, `initDatabase`, etc.) are separated into their own file because:
1. **Testability**: Connection logic can be mocked independently of repositories
2. **Single Responsibility**: One file manages connection lifecycle, another manages data access patterns
3. **Hot Module Replacement**: In development, the singleton needs special handling to survive HMR (as seen in `client.ts`)

### Why Export Individual Functions Instead of a Class?

The exports like `getPrisma`, `initDatabase`, `closeDatabase` are standalone functions rather than methods on a `DatabaseManager` class because:
1. **Tree-shaking**: Bundlers can exclude unused functions more easily
2. **Simplicity**: No need to instantiate or manage a class instance
3. **Functional Style**: Aligns with modern TypeScript/JavaScript patterns

### Note on Dual Implementation (index.ts vs client.ts)

The codebase contains two database client implementations:
- `index.ts` + `prisma.ts`: Uses a module-scoped variable with explicit init/close functions
- `client.ts`: Uses a global variable pattern for HMR survival

This appears to be an evolution in the codebase. The `main/index.ts` currently imports from `client.ts`, suggesting `client.ts` is the active implementation while `prisma.ts` may be legacy or an alternative approach.

---

## Change History

### 2026-01-04 - Documentation Created
- **What Changed**: Initial narrative documentation created for database barrel export
- **Why**: Establish shadow documentation system for the LOGOS codebase
- **Impact**: Improves codebase understanding for future contributors and AI agents
