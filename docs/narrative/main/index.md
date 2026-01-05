# Main Process Entry Point

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/index.ts`
> **Status**: Active

---

## Context & Purpose

This file is the **bootstrap nucleus** of the entire LOGOS desktop application. As the Electron main process entry point, it serves as the application's "master control program" - the very first code that runs when a user launches LOGOS and the orchestrator responsible for bringing all other systems online in the correct sequence.

**Business Need**: Users expect to double-click the LOGOS icon and have the application launch smoothly, display a window, and be ready for learning within seconds. This file ensures that happens by coordinating database initialization, communication channel setup, and window creation in a carefully orchestrated startup sequence.

**When Used**:
- Every time LOGOS is launched (cold start)
- When the application is reactivated on macOS after all windows were closed
- During the Windows installer/uninstaller lifecycle (handled by electron-squirrel-startup)

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

| Import | Source | Purpose |
|--------|--------|---------|
| `app, BrowserWindow, shell` | `electron` | Core Electron APIs for application lifecycle, window management, and external link handling |
| `path` | Node.js built-in | Constructs cross-platform file paths for preload script and renderer HTML |
| `registerAllHandlers` | `./ipc` | Central IPC handler registration function that sets up all main-to-renderer communication channels |
| `initDatabase` | `./db/client` | Database initialization function that ensures Prisma/SQLite is ready before the UI loads |

### Dependents (What Needs This)

This file is the **root of the dependency tree** - nothing directly imports it. Instead:

- **Electron runtime**: Treats this as the application entry point (configured in `package.json` main field)
- **`src/main/preload.ts`**: Loaded by BrowserWindow configuration; provides the secure bridge to renderer
- **`src/renderer/*`**: The entire renderer process depends on this file successfully creating the BrowserWindow

### Data Flow

```
User launches app
       |
       v
[electron-squirrel-startup check] --> (Windows installer? quit early)
       |
       v
[app.whenReady()] --> triggers createWindow()
       |
       v
[initDatabase()] --> Prisma connects to SQLite
       |
       v
[registerAllHandlers()] --> IPC channels become available
       |
       v
[new BrowserWindow()] --> Window created with security settings
       |
       v
[loadURL/loadFile] --> React UI becomes visible
       |
       v
[User interacts] --> IPC messages flow through registered handlers
```

---

## Macroscale: System Integration

### Architectural Layer

This file sits at **Layer 0: Platform Bootstrap** - the foundation upon which all other layers rest:

```
Layer 0: Platform Bootstrap       <-- YOU ARE HERE (index.ts)
    |
    v
Layer 1: IPC Communication        (ipc/*.ts - registered by this file)
    |
    v
Layer 2: Data Persistence         (db/client.ts - initialized by this file)
    |
    v
Layer 3: Core Algorithms          (src/core/*.ts - used by IPC handlers)
    |
    v
Layer 4: User Interface           (src/renderer/* - loaded into BrowserWindow)
```

### Big Picture Impact

This file is the **single point of orchestration** for the entire application. It enables:

1. **All user interactions**: Without the BrowserWindow, users cannot see or interact with LOGOS
2. **All data persistence**: The database initialization ensures user progress, goals, and learning history are available
3. **All feature communication**: IPC handler registration enables React components to request data, start sessions, and record responses
4. **Cross-platform consistency**: Platform-specific behaviors (macOS dock behavior, Windows installer integration) are handled here
5. **Security posture**: Context isolation, sandbox mode, and navigation restrictions are configured here

**Dependency Chain**: If this file fails to execute properly, 100% of LOGOS functionality becomes unavailable. There is no graceful degradation - a bootstrap failure means a non-functional application.

### Critical Path Analysis

**Importance Level**: CRITICAL (Severity 1)

- **If initialization fails**: Application crashes or shows blank window; users cannot learn
- **If database fails to initialize**: IPC handlers will throw errors; sessions cannot start; progress cannot be saved
- **If IPC registration fails**: Renderer will be unable to communicate with main process; all buttons/interactions fail silently
- **If window fails to create**: No visible UI; application appears to not launch

**Failure Recovery**:
- Development mode shows DevTools for debugging
- Production has no fallback - restart is the only recovery option

---

## Technical Concepts (Plain English)

### Electron Main Process vs Renderer Process

**Technical**: In Electron's multi-process architecture, the main process runs Node.js and controls the application lifecycle, while renderer processes run Chromium and display web content. They communicate via IPC (Inter-Process Communication).

**Plain English**: Think of LOGOS as having two parts: a "backstage crew" (main process) that handles database operations and system tasks, and an "on-stage performer" (renderer process) that shows the UI. This file is the backstage crew's manager - it hires staff, sets up equipment, then opens the curtain for the performer.

**Why We Use It**: Separation allows the UI to remain responsive even when heavy database operations are running, and provides security by isolating web content from system access.

### Context Isolation & Sandbox Mode

**Technical**: `contextIsolation: true` and `sandbox: true` in BrowserWindow configuration ensure the renderer process cannot access Node.js APIs directly, even with nodeIntegration disabled. The preload script uses `contextBridge` to expose only specific, safe APIs.

**Plain English**: Like a bank teller window - customers (renderer) can pass requests through the window (preload/IPC), but cannot reach into the vault (Node.js/filesystem) directly. Even if malicious code somehow ran in the UI, it couldn't access user files or system resources.

**Why We Use It**: Protects users from potential security vulnerabilities if LOGOS ever loaded untrusted content. Defense in depth - multiple layers of security even when we control all content.

### electron-squirrel-startup

**Technical**: A module that handles Windows Squirrel installer events (creating/removing Start Menu shortcuts). If the app was launched by the installer (not by the user), the app quits immediately after handling the install event.

**Plain English**: When you install software on Windows, it often creates desktop shortcuts and Start Menu entries. This happens by briefly launching the app with special flags. This check says "if we were launched just to create shortcuts, do that and exit - don't actually start the learning interface."

**Why We Use It**: Standard Windows installation behavior. Without it, users would see LOGOS briefly flash open during installation, which would be confusing.

### BrowserWindow Configuration

**Technical**: The `BrowserWindow` constructor receives configuration for window dimensions, title bar style, background color, and security-critical webPreferences.

**Plain English**: Like configuring a new store before opening day - setting the size of the storefront (1400x900), the style of the entrance (hidden title bar with traffic lights on macOS), the wall color (light gray #f8fafc), and the security systems (preload script, context isolation).

**Why We Use It**:
- `titleBarStyle: 'hiddenInset'` gives a modern, clean appearance on macOS
- `trafficLightPosition` positions window controls aesthetically
- `minWidth/minHeight` prevents users from making the window too small to be usable
- `backgroundColor` prevents white flash before React loads

### Hot Module Replacement (HMR) Detection

**Technical**: The `isDev` flag checks `process.env.NODE_ENV` to determine whether to load from localhost (development with HMR) or from bundled files (production).

**Plain English**: During development, changes to code appear instantly without restarting the app (like live-reloading a webpage). In production, the app loads from pre-built files for speed. This flag tells LOGOS which mode it is in.

**Why We Use It**: Developers get fast feedback loops during development; users get optimized, fast-loading production builds.

### App Lifecycle Events

**Technical**: Electron's `app` module emits lifecycle events: `ready` (initialization complete), `window-all-closed` (all windows closed), `activate` (macOS dock click), and `web-contents-created` (new webContents created).

**Plain English**:
- `ready` = "The stage is set, you may begin"
- `window-all-closed` = "All audience members have left" (on macOS, the show can continue; on Windows/Linux, we close the theater)
- `activate` = "Someone clicked our name in the macOS dock" (reopen if we had closed everything)
- `web-contents-created` = "A new webpage is about to be shown" (we add security guards to check URLs)

**Why We Use It**: These events allow LOGOS to behave like a native app on each platform - respecting macOS conventions (app stays running in dock) and Windows/Linux conventions (app exits when windows close).

### Navigation Security

**Technical**: The `will-navigate` event handler prevents navigation to URLs outside of localhost (development) or file:// protocol (production).

**Plain English**: If someone managed to inject a link into LOGOS that tried to navigate to a phishing site, this security guard would block it. Only navigation to our own app content is allowed.

**Why We Use It**: Defense in depth - even if future code accidentally allowed arbitrary URLs in the UI, this backstop prevents the app from ever navigating to potentially malicious sites.

---

## Change History

### 2026-01-04 - Initial Documentation
- **What Changed**: Created narrative documentation for main process entry point
- **Why**: Enable understanding of bootstrap sequence and architectural role
- **Impact**: Developers can now understand why initialization order matters
