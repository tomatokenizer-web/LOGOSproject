# LOGOS Development Checklist

> **Real-time progress tracker** - Update checkboxes as work completes
>
> Last Updated: 2026-01-04

---

## Phase 1: Foundation
*Get the app running with basic structure*

### 1.1 Project Setup
- [x] **Create project directory structure** - Folders for main, renderer, core, shared
- [ ] **Initialize from Electron+React template** - Clone guasam/electron-react-app as base
- [x] **Configure TypeScript strict mode** - tsconfig.json with strict: true
- [ ] **Set up ESLint + Prettier** - Consistent code style across all files
- [ ] **Initialize Git repository** - Version control from day one
- [x] **Create .env.example** - Template for API keys (never commit real keys)

### 1.2 Database Layer
- [x] **Install Prisma + better-sqlite3** - Added to package.json dependencies
- [x] **Create schema.prisma** - Extended with z(w) vector fields (D, M, P)
- [ ] **Run initial migration** - Generate database tables
- [ ] **Test CRUD operations** - Verify data persists across app restarts
- [ ] **Add seed data script** - Sample goals and language objects for testing

### 1.3 Core Algorithms (Pure TypeScript)
- [x] **Create /src/core/types.ts** - Shared type definitions (1244 lines)
- [x] **Implement irt.ts** - θ estimation, probability functions (Part 1)
- [x] **Implement pmi.ts** - PMI calculation, difficulty mapping (Part 2)
- [x] **Implement fsrs.ts** - Spaced repetition scheduling (Part 3)
- [x] **Implement priority.ts** - FRE calculation, queue sorting
- [x] **Implement bottleneck.ts** - Error pattern analysis (Part 7)
- [x] **Implement g2p.ts** - Grapheme-phoneme correspondence (Gap 1.7, 1.9)
- [x] **Implement morphology.ts** - Morphological analysis (Gap 1.8)
- [x] **Implement syntactic.ts** - Syntactic pattern analysis
- [ ] **Write unit tests for each** - 100% coverage on pure functions

### 1.4 IPC Bridge
- [ ] **Define IPC contracts** - Typed message interfaces in /src/shared/
- [ ] **Create goal.ipc.ts** - Goal CRUD handlers
- [ ] **Create learning.ipc.ts** - Queue and task handlers
- [ ] **Create session.ipc.ts** - Session tracking handlers
- [ ] **Test IPC round-trip** - Renderer calls main, gets response

### 1.5 Claude API Integration
- [ ] **Install @anthropic-ai/sdk** - Official TypeScript SDK
- [ ] **Create claude.service.ts** - API wrapper with retry logic
- [ ] **Implement offline fallback** - Cache and template tasks when offline
- [ ] **Test vocabulary extraction** - Send sample text, get structured response
- [ ] **Test task generation** - Request task for sample word

**CHECKPOINT 1: App launches, database works, algorithms run, Claude responds**

---

## Phase 2: Core Data Layer
*Store and retrieve all learning data correctly*

### 2.1 Goal Management
- [x] **Create goal from user input** - goal.repository.ts: createGoal()
- [x] **Store GoalSpec in database** - Full CRUD in goal.repository.ts
- [ ] **Extract vocabulary from goal** - Claude analyzes domain corpus
- [x] **Generate LanguageObjects** - addLanguageObjectsToGoal() with z(w) vector
- [x] **Calculate initial priorities** - bulkUpdatePriorities()

### 2.2 Mastery State Tracking
- [x] **Initialize MasteryState for each object** - bulkCreateMasteryStates()
- [x] **Update state on response** - updateMasteryState(), transitionStage()
- [x] **Track cue-free vs cue-assisted** - recordExposure() with EMA
- [x] **Calculate scaffolding gap** - getScaffoldingGap()
- [x] **Schedule next reviews** - updateFSRSParameters(), getReviewQueue()

### 2.3 Session Recording
- [x] **Start session with mode** - createSession() with mode param
- [x] **Log each response** - recordResponse() with full metadata
- [x] **Apply θ rules by mode** - applyThetaRules() (freeze/soft/full)
- [x] **End session with summary** - getSessionSummary()
- [x] **Store θ snapshots** - saveThetaSnapshot()

### 2.4 Collocation Storage
- [x] **Store PMI pairs** - createCollocation(), bulkCreateCollocations()
- [x] **Query collocations by word** - getCollocationsForWord() with PMI filter
- [x] **Update on new content** - recalculateRelationalDensities()

**CHECKPOINT 2: Data persists correctly, learning queue sorts by priority**

---

## Phase 3: Learning Engine
*The 3-layer pipeline that makes LOGOS intelligent*

### 3.1 Layer 1: State + Priority
- [ ] **Analyze user θ state** - Current ability estimates per component
- [ ] **Apply FRE formula** - Weight frequency, relations, context
- [ ] **Calculate cost adjustments** - Factor in L1 transfer, exposure
- [ ] **Sort learning queue** - Highest priority items first
- [ ] **Detect bottlenecks** - Identify weak component types

### 3.2 Layer 2: Task Generation
- [ ] **Select target object** - Pop from priority queue
- [ ] **Choose task format** - Based on mastery stage (MCQ→Fill→Production)
- [ ] **Select modality** - Visual, auditory, or mixed
- [ ] **Generate content via Claude** - Or use cached/template fallback
- [ ] **Apply cue level** - Full, moderate, minimal, or none

### 3.3 Layer 3: Scoring + Update
- [ ] **Capture user response** - Answer, time, whether hints used
- [ ] **Evaluate correctness** - Claude or pattern matching
- [ ] **Update mastery state** - Stage, accuracy, FSRS card
- [ ] **Recalculate priority** - Object may move in queue
- [ ] **Log for analytics** - All data for later analysis

### 3.4 Fluency vs Versatility Balance
- [ ] **Track ratio per session** - How much of each type
- [ ] **Adjust based on progress** - More fluency early, more versatility later
- [ ] **Generate fluency tasks** - High-PMI combinations, speed-focused
- [ ] **Generate versatility tasks** - Low-PMI combinations, creative extension

**CHECKPOINT 3: Learning queue makes sense, tasks match user level, progress tracked**

---

## Phase 4: User Interface
*Make it usable and beautiful*

### 4.1 Navigation Shell
- [ ] **Create App.tsx with router** - Page navigation structure
- [ ] **Build sidebar navigation** - Links to all main views
- [ ] **Implement useIPC hook** - Bridge to main process
- [ ] **Add loading states** - Skeleton screens while data loads
- [ ] **Add error boundaries** - Graceful failure handling

### 4.2 Onboarding Wizard
- [ ] **Welcome screen** - Explain what LOGOS does
- [ ] **Goal input** - Natural language or structured dropdowns
- [ ] **Initial assessment option** - Quick test to estimate starting θ
- [ ] **Confirmation screen** - Show generated goal, allow edits
- [ ] **Transition to dashboard** - First-time user flow complete

### 4.3 Dashboard
- [ ] **Today's focus card** - Top priority item with context
- [ ] **Learning queue preview** - Next 5-10 items
- [ ] **Mastery overview chart** - Progress by component type
- [ ] **Session history** - Recent sessions with summaries
- [ ] **Start session button** - Clear call to action

### 4.4 Training Gym
- [ ] **Task display area** - Shows current exercise
- [ ] **Input methods** - MCQ buttons, text input, voice (later)
- [ ] **Hint system** - Progressive reveals with liquid gauge
- [ ] **Feedback display** - Correct/incorrect with explanation
- [ ] **Session progress bar** - Items completed / total

### 4.5 Network View
- [ ] **Force-directed graph** - Words as nodes, relations as edges
- [ ] **Node sizing by priority** - Bigger = more important
- [ ] **Color by mastery stage** - Visual progress indicator
- [ ] **Click to inspect** - Show word details, related items
- [ ] **Filter controls** - By component type, stage, domain

### 4.6 Analytics
- [ ] **Progress over time chart** - θ estimates by date
- [ ] **Session statistics** - Duration, accuracy, transitions
- [ ] **Bottleneck visualization** - Which skills need work
- [ ] **Fluency/versatility ratio** - Balance indicator
- [ ] **Export data option** - JSON backup

### 4.7 Settings
- [ ] **API key management** - Secure storage, validation
- [ ] **Session preferences** - Duration, difficulty, modality
- [ ] **Notification settings** - Review reminders
- [ ] **Data management** - Backup, restore, clear
- [ ] **About/help** - Version, links, feedback

**CHECKPOINT 4: Full user flow works, app is usable end-to-end**

---

## Phase 4B: Gap Implementations (from GAPS-AND-CONNECTIONS.md)
*Extended algorithms for language learning system*

### Gap 4.1: Grammar Organization Algorithm
- [x] **Define SyntacticConstruction interface** - 20+ English grammar patterns
- [x] **Create syntactic-construction.ts** - CORE_CONSTRUCTIONS library with complexity metrics
- [x] **Implement grammar-sequence-optimizer.ts** - Topological sort with prerequisites
- [x] **Create grammar/index.ts** - Barrel exports

### Gap 4.2: Domain/Register Structure
- [x] **Define RegisterProfile interface** - Formality levels, genres, linguistic features
- [x] **Create register-profile.ts** - REGISTER_PROFILES library (academic, business, legal, etc.)
- [x] **Implement register-calculator.ts** - Word-register fit scoring, text analysis
- [x] **Create register/index.ts** - Barrel exports

### Gap 4.3: Component-Object State Dictionary
- [x] **Define ComponentObjectState interface** - Unified learning state tracking
- [x] **Create component-object-state.ts** - Exposure history, IRT metrics, transfer effects
- [x] **Implement component-search-engine.ts** - Search/filter engine with priority lists
- [x] **Create state/index.ts** - Barrel exports

### Gap 4.5: Content Sourcing & Generation
- [x] **Define PedagogicalIntent type** - 9 intent types for learning tasks
- [x] **Create pedagogical-intent.ts** - Intent definitions and mappings
- [x] **Define ContentSpec interface** - Length, format, difficulty constraints
- [x] **Create content-spec.ts** - Content specification types
- [x] **Implement content-generator.ts** - Claude API integration for content generation
- [x] **Implement content-validator.ts** - Linguistic benchmark validation
- [x] **Create content/index.ts** - Barrel exports

### Gap 4.6: Traditional Task Type Library
- [x] **Define TraditionalTaskType taxonomy** - 30 types across 6 categories
- [x] **Create traditional-task-types.ts** - Task templates with metadata
- [x] **Implement task-constraint-solver.ts** - Object selection for tasks
- [x] **Implement distractor-generator.ts** - MCQ distractor generation
- [x] **Create tasks/index.ts** - Barrel exports

### Remaining Phase 4 Gaps (Not Started)
- [ ] **Gap 4.4: Multi-View Visualization Dashboard** - Dictionary/Network/Priority views
- [ ] **Gap 4.7: Cognitive Manipulation Tools** - Highlighting, chunking, audio tools
- [ ] **Gap 4.8: Multi-Curriculum Management** - Multiple learning curricula
- [ ] **Gap 4.9: External Media Integration** - YouTube/podcast integration
- [ ] **Gap 4.10: Component Benchmark Standards** - CEFR-aligned benchmarks

---

## Phase 5: Polish & Package
*Make it production-ready*

### 5.1 Performance
- [ ] **Profile render performance** - Fix any slow components
- [ ] **Optimize database queries** - Add indexes where needed
- [ ] **Implement content caching** - Reduce Claude API calls
- [ ] **Lazy load heavy components** - Network graph, charts

### 5.2 Error Handling
- [ ] **Global error boundary** - Catch and display errors gracefully
- [ ] **Offline mode indicators** - Show when Claude unavailable
- [ ] **Database recovery** - Handle corruption gracefully
- [ ] **Logging system** - Capture errors for debugging

### 5.3 Testing
- [ ] **Unit tests passing** - All core algorithms
- [ ] **Integration tests** - IPC handlers + database
- [ ] **E2E tests** - Full user flows with Playwright
- [ ] **Manual testing checklist** - QA all features

### 5.4 Packaging
- [ ] **Configure electron-builder** - Windows installer settings
- [ ] **Build production bundle** - Optimized, minified
- [ ] **Test on clean machine** - Fresh Windows install
- [ ] **Create installer (.exe)** - Ready to distribute
- [ ] **Document installation steps** - For users

### 5.5 Documentation
- [ ] **User guide** - How to use LOGOS
- [ ] **Developer docs** - How to contribute
- [ ] **API documentation** - For future extensions

**CHECKPOINT 5: App is production-ready, installer works on clean machine**

---

## Progress Summary

| Phase | Status | Items Done | Total |
|-------|--------|------------|-------|
| Phase 1: Foundation | 🟡 In Progress | 14 | 30 |
| Phase 2: Core Data | 🟢 Mostly Complete | 18 | 19 |
| Phase 3: Learning Engine | ⬜ Not Started | 0 | 19 |
| Phase 4: User Interface | ⬜ Not Started | 0 | 32 |
| Phase 4B: Gap Implementations | 🟢 Mostly Complete | 21 | 26 |
| Phase 5: Polish & Package | ⬜ Not Started | 0 | 18 |
| **TOTAL** | **🟡 37%** | **53** | **144** |

---

## Quick Reference

### Key Files Created
1. `/src/core/types.ts` - All shared types ✅
2. `/src/core/irt.ts` - IRT algorithms ✅
3. `/src/core/pmi.ts` - PMI computation ✅
4. `/src/core/fsrs.ts` - Spaced repetition ✅
5. `/src/core/priority.ts` - Priority calculation ✅
6. `/src/core/bottleneck.ts` - Bottleneck detection ✅
7. `/src/core/g2p.ts` - G2P correspondence ✅
8. `/src/core/morphology.ts` - Morphological analysis ✅
9. `/src/core/content/` - Content generation module ✅
10. `/src/core/tasks/` - Task type library ✅
11. `/src/main/db/prisma.ts` - Database client singleton ✅
12. `/src/main/db/repositories/goal.repository.ts` - Goal CRUD ✅
13. `/src/main/db/repositories/mastery.repository.ts` - Mastery tracking ✅
14. `/src/main/db/repositories/session.repository.ts` - Session recording ✅
15. `/src/main/db/repositories/collocation.repository.ts` - PMI storage ✅
16. `/src/core/grammar/` - Grammar organization ✅
17. `/src/core/register/` - Domain/register structure ✅
18. `/src/core/state/` - Component state tracking ✅

### Key Files Still Needed
1. `/src/main/index.ts` - Electron entry
2. `/src/renderer/App.tsx` - React entry

### Commands You'll Use
```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Package installer
npm run package
```

### When Stuck, Check
1. ALGORITHMIC-FOUNDATIONS.md - For math/code
2. REFERENCE-IMPLEMENTATIONS.md - For npm packages
3. AGENT-MANIFEST.md - For coordination rules
4. DEVELOPMENT-PROTOCOL.md - For process rules

---

*Checklist Version: 1.0*
*Created: 2026-01-04*
*Total Items: 115*
*Update this file as you complete each item*
