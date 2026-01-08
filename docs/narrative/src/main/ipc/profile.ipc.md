# profile.ipc.ts - User Profile and Settings Management

> **Last Updated**: 2026-01-08
> **Code Location**: `src/main/ipc/profile.ipc.ts`
> **Status**: Active

---

## Context & Purpose

This module handles all user profile operations in LOGOS. It exists because a language learning application needs to persistently store and retrieve user-specific data: language preferences, learning goals, and application settings. Without this module, the app couldn't remember who the user is, what languages they're learning, or how they prefer to study.

**Business Need**: Users need their profile and preferences to persist across app sessions. A language learner returning after a week should see their same target language, daily goals, and interface preferences exactly as they left them.

**When Used**:
- On app startup to load user profile and restore UI state
- When the user changes their native or target language in settings
- When the user adjusts daily goals, notification preferences, or theme
- When the onboarding wizard completes and creates a new user

**Key Design Principle**: This module separates concerns between database-persisted data (user identity, languages, theta values) and session-based settings (theme, goals, notifications). Profile data lives in SQLite via Prisma; settings live in memory and will eventually use electron-store for persistence.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `./contracts.ts`: `registerDynamicHandler()` - Registers IPC handlers with Electron's main process; `success()` and `error()` - Wrapper functions for consistent API responses; `unregisterHandler()` - Cleanup function for testing
- `../db/client.ts`: `prisma` - The singleton Prisma database client for all database operations
- `../../shared/types.ts`: `User` and `UserThetaProfile` - Type definitions ensuring type safety between main and renderer processes

### Dependents (What Needs This)

- `../preload.ts`: Exposes `profile.get()`, `profile.update()`, `profile.getSettings()`, `profile.updateSettings()` to the renderer process via contextBridge
- Renderer components: Settings panels, profile displays, onboarding completion
- Not currently registered in `./index.ts` - handlers must be registered separately

### Data Flow

```
Renderer calls window.logos.profile.get()
        |
        v
preload.ts invokes 'profile:get' via IPC
        |
        v
This module's handler receives the call
        |
        v
Query Prisma for User record (findFirst)
        |
        v
Transform Prisma model to User type (toUser helper)
        |
        v
Return success response with User data
        |
        v
preload.ts unwraps response, returns to renderer
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits in the **IPC Layer** (Layer 2 of the Electron architecture):

- **Layer 1**: Renderer Process (React UI) - Cannot access database directly
- **Layer 2**: IPC Handlers (This module) - Bridge between UI and data
- **Layer 3**: Database (Prisma/SQLite) - Persistent storage

The IPC layer enforces security by preventing direct database access from the renderer process. All data must flow through these validated handlers.

### Big Picture Impact

User profiles are foundational to the entire LOGOS system:

1. **Language Pair Configuration**: The `nativeLanguage` and `targetLanguage` fields determine which content is shown, which phonological rules apply, and what transfer patterns to expect
2. **Theta Profile**: The user's ability estimates (`thetaGlobal`, `thetaPhonological`, etc.) drive IRT-based content selection - items are matched to user ability
3. **Settings Drive Behavior**: `dailyGoalMinutes` affects session length recommendations; `targetRetention` (default 0.9 = 90%) controls FSRS scheduling aggressiveness; `theme` affects the entire UI

**System Dependencies**:
- Session module needs user theta values for IRT calculations
- Queue building uses target retention for scheduling
- Task generation references user's target language for content creation
- Analytics displays use daily goals for progress comparisons

### Critical Path Analysis

**Importance Level**: High

Without working profile handlers:
- App cannot determine which language pair to use
- IRT-based difficulty selection falls back to defaults
- User settings revert on every app restart
- Onboarding cannot persist new user data

**Failure Mode**: If `profile:get` fails, the preload.ts has fallback defaults (English-English, theta=0 everywhere). This prevents crashes but degrades the learning experience to generic mode.

---

## Technical Concepts (Plain English)

### IPC Handler Registration

**Technical**: `registerDynamicHandler('profile:get', async () => {...})` binds an async function to a named channel that the renderer can invoke via `ipcRenderer.invoke()`.

**Plain English**: Like setting up a phone extension at work. When someone dials "profile:get", this code answers the call and responds with the user's profile.

**Why We Use It**: Electron's security model requires this explicit registration. The renderer process runs in a sandboxed browser context and cannot directly access Node.js APIs or the database.

### User Theta Profile

**Technical**: A set of latent ability parameters estimated via Item Response Theory (IRT), separated by linguistic component: global, phonological, morphological, lexical, syntactic, and pragmatic.

**Plain English**: Six "skill scores" that measure how good you are at different aspects of language learning. Phonological theta measures your pronunciation/sound discrimination; lexical theta measures your vocabulary; syntactic theta measures your grammar understanding. All start at 0 (average) and increase as you demonstrate mastery.

**Why We Use It**: Different learners struggle with different aspects. A strong vocabulary learner (high lexical theta) but poor grammar learner (low syntactic theta) should see more grammar exercises. These separate scores enable personalized difficulty targeting.

### Upsert Pattern (Create or Update)

**Technical**: The handlers check if a user exists with `findFirst()`, then either `create()` a new record or `update()` the existing one. This is a manual upsert pattern.

**Plain English**: Like checking if you have a customer file before deciding to create a new folder or update the existing one. "Find the user. If they don't exist, create them with these values. If they do exist, update only the fields that were provided."

**Why We Use It**: LOGOS assumes a single-user desktop model. The first call to update profile or settings might happen before any user exists, so handlers must gracefully create the initial record.

### Default Values Strategy

**Technical**: `getDefaultSettings()` and `getDefaultTheta()` return consistent default objects used when no user record exists.

**Plain English**: Like shipping a product with "factory settings" - reasonable defaults that work for most people until they customize. Daily goal of 30 minutes, system theme, notifications on, 90% target retention.

**Why We Use It**: New users shouldn't see errors or empty states. The app should work immediately with sensible defaults, then allow customization.

### Prisma Model to API Type Transformation

**Technical**: The `toUser()` helper maps Prisma's flat database model (`thetaGlobal`, `thetaPhonology`, etc.) to the nested API type structure (`theta: { thetaGlobal, thetaPhonological, ... }`).

**Plain English**: The database stores user data in one format (all columns at the same level), but the UI expects it in a different format (ability scores grouped together). This helper reshapes the data during transfer.

**Why We Use It**: Database schemas optimize for storage and queries; API types optimize for developer ergonomics. The transformation bridges these different concerns.

**Schema Mapping Note**: The Prisma schema uses `thetaPhonology` (noun form) while the API type uses `thetaPhonological` (adjective form). The `toUser()` helper handles this naming discrepancy, mapping `prismaUser.thetaPhonology` to `theta.thetaPhonological`.

### Input Validation

**Technical**: Helper functions `isValidLanguageCode()`, `isValidTheme()`, and `isInRange()` validate user input before processing using regex patterns and range checks.

**Plain English**: Like a bouncer checking IDs at a club entrance. Before accepting any user-provided data, we verify it matches expected formats. Language codes must look like "en" or "ko-KR" (BCP-47 format); themes must be "light", "dark", or "system"; numeric values must fall within sensible bounds.

**Why We Use It**: Prevents invalid data from corrupting the database or causing unexpected behavior. A malformed language code could break content filtering; an out-of-range retention value could crash the FSRS scheduler.

**Validation Rules**:

| Field | Pattern/Range | Example Valid | Example Invalid |
| ----- | ------------- | ------------- | --------------- |
| Language codes | `/^[a-z]{2}(-[A-Z]{2})?$/` | `en`, `ko-KR` | `english`, `EN`, `e` |
| Theme | `['light', 'dark', 'system']` | `dark` | `night`, `auto` |
| dailyGoalMinutes | 5-480 | 30 | 0, 500 |
| sessionLength | 5-120 | 20 | 3, 200 |
| targetRetention | 0.7-0.99 | 0.9 | 0.5, 1.0 |

### In-Memory Settings Storage (cachedSettings)

**Technical**: A module-level `cachedSettings` object stores user preferences in RAM rather than in database columns. The object persists for the application session but resets on app restart.

**Plain English**: Think of it like a sticky note on your monitor versus a file in a filing cabinet. The sticky note (in-memory) is quick to read and update, but it disappears when you leave. The filing cabinet (database) is permanent but slower. Settings use the sticky note approach for now.

**Why We Use It**: The Prisma schema (`User` table) only stores identity and theta values - not settings like theme or notifications. Rather than add columns and run a migration, settings are stored in memory with a clear path to use `electron-store` for persistence in a future update.

**Trade-off**: Settings reset on app restart. This is acceptable for MVP but noted as a future improvement.

### Sanitized Error Logging

**Technical**: Error handlers log `err instanceof Error ? err.message : 'Unknown error'` rather than the full error object.

**Plain English**: Like a doctor telling you "you have an infection" rather than reading your entire medical history aloud in the waiting room. We log enough to diagnose problems without exposing potentially sensitive internal details (stack traces, database queries, user data).

**Why We Use It**: Security best practice. Full error objects can contain sensitive information (file paths, query strings, user data). By extracting only the message, we get diagnostic value without information leakage.

---

## Handler Channels

| Channel | Purpose | Request | Response |
|---------|---------|---------|----------|
| `profile:get` | Retrieve current user profile | None | `User` object with theta profile and settings |
| `profile:update` | Update language preferences | `{ nativeLanguage?, targetLanguage? }` | Updated `User` object |
| `profile:getSettings` | Retrieve user settings | None | `UserSettings` object |
| `profile:updateSettings` | Update app settings | `Partial<UserSettings>` | Updated `UserSettings` object |

---

## Design Decisions

### Single-User Model

LOGOS assumes one user per installation. This is why `findFirst()` is used without any user ID filter - there's only ever one user record. This simplifies the data model but wouldn't scale to multi-user scenarios without refactoring.

### Settings Decoupled from Database

User settings (theme, dailyGoalMinutes, notifications, etc.) are stored in-memory via `cachedSettings` rather than in database columns. This separation recognizes that:

1. **Profile data** (languages, theta values) is identity-critical and must persist across sessions
2. **Settings data** (preferences) is convenience-focused and can use lighter-weight storage

The current implementation stores settings in RAM with defaults restored on restart. The architecture is designed for easy migration to `electron-store` for persistence without requiring database schema changes.

### Graceful Fallback Pattern

The preload.ts wraps profile calls in `.catch()` blocks that return default values. Combined with the handlers returning defaults when no user exists, this creates a robust fallback chain: handler defaults -> preload defaults -> application continues working.

### Dynamic Handler Registration

Profile handlers use `registerDynamicHandler` rather than the type-safe `registerHandler` because the profile channels (`profile:get`, `profile:update`, etc.) aren't in the core `IPCHandlerMap`. This is a flexibility vs. type-safety tradeoff.

---

## Integration Note

**Important**: The profile handlers are NOT currently registered in `src/main/ipc/index.ts`. The `registerProfileHandlers()` function exists and is exported, but `index.ts` doesn't call it. The handlers may be registered elsewhere (possibly during onboarding initialization) or may need to be added to the central registration.

---

## Change History

### 2026-01-08 - Input Validation and In-Memory Settings

- **What Changed**:
  - Added input validation for language codes (BCP-47 format), theme values, and numeric ranges
  - Moved settings storage from database columns to in-memory `cachedSettings` object
  - Fixed Prisma schema mapping (`thetaPhonology` -> `thetaPhonological`)
  - Implemented sanitized error logging (message only, no full objects)
- **Why**:
  - Validation prevents invalid data from corrupting database or crashing algorithms
  - In-memory settings avoids schema migration while providing clear upgrade path to electron-store
  - Schema mapping fix resolves mismatch between Prisma column names and API type names
  - Sanitized logging follows security best practices to prevent information leakage
- **Impact**:
  - Invalid language codes, themes, or numeric values are now rejected with descriptive errors
  - Settings reset on app restart (acceptable for MVP, future: electron-store persistence)
  - Error logs no longer expose potentially sensitive internal details

### 2026-01-08 - Initial Documentation
- **What Changed**: Created narrative documentation for profile.ipc.ts
- **Why**: Shadow documentation system requirement for all IPC handlers
- **Impact**: Enables understanding of profile system without reading source code
