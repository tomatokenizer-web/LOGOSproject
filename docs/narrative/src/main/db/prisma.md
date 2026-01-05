# Prisma Client Singleton

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/db/prisma.ts`
> **Status**: Active

---

## Context & Purpose

This module provides a **singleton PrismaClient** (a single, shared database connection instance) for the LOGOS language learning application. It exists because Electron applications need careful database lifecycle management - the database connection must be established when the app starts and cleanly closed when the app shuts down.

**Business Need**: LOGOS stores all learning data locally - user profiles, language objects, mastery states, session history, and response analytics. This module is the foundation that makes all that data persistence possible, enabling learners to track their progress across sessions and allowing the adaptive algorithms (IRT, FSRS, PMI) to work with historical data.

**When Used**:
- `initDatabase()` is called once during application startup, inside `createWindow()` in the main process entry point
- `getPrisma()` is called throughout the application whenever database access is needed
- `closeDatabase()` is called during graceful application shutdown
- `withTransaction()` is used when multiple database operations must succeed or fail together (atomic operations)

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)
- `@prisma/client`: The auto-generated Prisma client library - provides the `PrismaClient` class with type-safe database methods based on the schema
- `prisma/schema.prisma`: The schema definition file - Prisma generates the client types from this schema (not a runtime import, but a build-time dependency)

### Dependents (What Needs This)

**Note**: The codebase contains two database client files that serve related purposes:
- `src/main/db/prisma.ts` (this file) - Function-based singleton with explicit lifecycle methods
- `src/main/db/client.ts` - Export-based singleton with automatic shutdown handlers

The IPC handlers import from `client.ts`:
- `src/main/ipc/session.ipc.ts`: Uses `prisma` for all session, response, and analytics operations (session:start, session:end, submit-response, analytics queries)
- `src/main/ipc/learning.ipc.ts`: Uses `prisma` for language object CRUD, mastery state queries, and learning queue building
- `src/main/ipc/goal.ipc.ts`: Uses `prisma` for goal specification management

The main process entry point uses `initDatabase()`:
- `src/main/index.ts`: Calls `initDatabase()` during app startup in `createWindow()`

### Data Flow
```
App Startup
    |
    v
index.ts: createWindow()
    |
    v
initDatabase() --> getPrisma() --> new PrismaClient() --> $connect()
    |                                     |
    |                                     v
    |                            SQLite database file
    |
    v
IPC Handlers registered
    |
    v
[Application running - handlers use getPrisma() for all queries]
    |
    v
App Shutdown
    |
    v
closeDatabase() --> $disconnect() --> prisma = null
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits in the **Data Access Layer** of the LOGOS three-tier architecture:

```
+---------------------------------------------------+
|  Layer 1: Renderer (React UI)                     |
|  - User interactions, visual components           |
+---------------------------------------------------+
            |  IPC Bridge (contextBridge)
            v
+---------------------------------------------------+
|  Layer 2: Main Process (Electron)                 |
|  - IPC Handlers (session.ipc.ts, learning.ipc.ts) |
|  - Business Logic (FSRS, IRT, Priority algorithms)|
+---------------------------------------------------+
            |
            v
+---------------------------------------------------+
|  Layer 3: Data Access Layer                       |
|  --> prisma.ts (this module) <--                  |
|  - Connection lifecycle management                |
|  - Singleton instance provision                   |
|  - Transaction coordination                       |
+---------------------------------------------------+
            |
            v
+---------------------------------------------------+
|  Layer 4: Storage (SQLite via better-sqlite3)     |
|  - User, GoalSpec, LanguageObject, MasteryState   |
|  - Session, Response, ThetaSnapshot, CachedTask   |
+---------------------------------------------------+
```

### Big Picture Impact

This module is a **foundational infrastructure component** - almost every feature in LOGOS depends on it:

**Learning System Dependencies**:
- Language object storage and retrieval (vocabulary, grammar patterns)
- Mastery state tracking (FSRS parameters, stage progression)
- Learning queue construction (priority calculations need current state)

**Session Management Dependencies**:
- Session creation and tracking
- Response recording for accuracy analysis
- Theta estimation from response history

**Analytics Dependencies**:
- Progress tracking over time
- Bottleneck detection algorithms
- Session history and streak calculations

**Goal System Dependencies**:
- Goal specification persistence
- Progress percentage tracking
- Deadline management

### Critical Path Analysis

**Importance Level**: Critical (Severity 5/5)

If this module fails:
- **Complete Data Loss Access**: No learning objects can be retrieved or created
- **Session Failure**: Users cannot start, continue, or complete learning sessions
- **Algorithm Failure**: IRT theta estimation and FSRS scheduling cannot function without historical data
- **Progress Loss**: All mastery state and learning history becomes inaccessible

**Failure Modes**:
1. **Connection failure on startup**: App should not proceed - user sees error state
2. **Connection drop mid-session**: Responses cannot be saved - data loss for that session
3. **Improper shutdown**: Database may be left in inconsistent state (SQLite's WAL mode provides some protection)

**Backup/Recovery**:
- SQLite database file can be backed up/restored
- No automatic failover - this is a local-first application
- The `client.ts` variant registers SIGINT/SIGTERM handlers for graceful shutdown

---

## Technical Concepts (Plain English)

### Singleton Pattern
**Technical**: A design pattern that ensures only one instance of a class exists throughout the application lifetime, with a global access point to that instance.

**Plain English**: Like having one shared company car instead of buying a new car for every employee trip. Everyone uses the same car (database connection), which is more efficient and prevents conflicts.

**Why We Use It**: Creating multiple PrismaClient instances would:
- Exhaust database connection limits
- Create resource leaks during hot module replacement in development
- Make transaction coordination impossible across different parts of the app

### Connection Pooling
**Technical**: A technique where database connections are reused rather than created and destroyed for each query, managed by a "pool" that hands out connections as needed.

**Plain English**: Like a library book checkout system - books (connections) are returned to the shelf after use rather than being destroyed, so the next person can use the same book without waiting for a new one to be printed.

**Why We Use It**: Prisma handles this internally. For SQLite with better-sqlite3, the "pool" is effectively a single connection, but the principle still applies for query management.

### Database Transaction
**Technical**: A sequence of database operations that are executed as a single unit of work - either all operations succeed (commit) or all are rolled back if any fails (rollback), ensuring ACID properties.

**Plain English**: Like an all-or-nothing bank transfer - if you're moving money between accounts, either both the withdrawal AND deposit happen, or neither does. You never end up with money disappearing or appearing from nowhere.

**Why We Use It**: The `withTransaction()` helper ensures that related operations (like creating a mastery state when recording a response) happen atomically. If one part fails, the database is not left in an inconsistent state.

### Lazy Initialization
**Technical**: A strategy where resource creation is deferred until the first time it's actually needed, rather than creating everything upfront.

**Plain English**: Like not making coffee until someone actually wants a cup, rather than brewing a pot every morning regardless of whether anyone will drink it.

**Why We Use It**: The `getPrisma()` function creates the PrismaClient only when first called. This means if something goes wrong during initialization, the error is caught at the point of use rather than at import time.

### Hot Module Replacement (HMR) Considerations
**Technical**: During development, HMR allows modules to be updated without a full page reload. Without singleton protection, this can create orphaned database connections.

**Plain English**: Like having a guard at the factory door who remembers which workers are already inside - when a worker clocks out and clocks back in (module reload), they get their same locker back instead of being assigned a new one every time.

**Why We Use It**: The module-level `let prisma: PrismaClient | null = null` variable ensures that even if the module is re-executed during development hot reloading, the same instance is returned. The companion `client.ts` goes further by attaching to `global.prisma`.

---

## Change History

### 2026-01-04 - Initial Documentation
- **What Changed**: Created narrative documentation for the prisma.ts module
- **Why**: Shadow documentation requirement for all code files in the LOGOS project
- **Impact**: Improved understanding of the database access layer for future development

### Initial Implementation - Database Singleton
- **What Changed**: Created singleton Prisma client with lifecycle management functions
- **Why**: LOGOS needed a reliable, type-safe way to access the SQLite database from the Electron main process
- **Impact**: Enabled all data persistence features - user profiles, goals, learning objects, sessions, responses, and analytics
