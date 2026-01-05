# LOGOS Verified Development Protocol

## Core Principle: No Bullshit, Working Software

## Architecture Clarification (IMPORTANT)

LOGOS is a **desktop-only application** with this architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON APP                              │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │  Main Process   │     │      Renderer Process       │   │
│  │  (Node.js)      │◄───►│      (React UI)             │   │
│  │                 │ IPC │                             │   │
│  │  • SQLite DB    │     │  • Dashboard               │   │
│  │  • Claude API   │     │  • Training Gym            │   │
│  │  • ts-fsrs      │     │  • Network Graph           │   │
│  │  • IRT Engine   │     │  • Analytics               │   │
│  └─────────────────┘     └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              │
              │ HTTPS (when online)
              ▼
     ┌─────────────────┐
     │  Anthropic API  │
     │  (Claude)       │
     └─────────────────┘
```

**NO separate backend server.** Everything runs in Electron:
- Database: SQLite via better-sqlite3 (main process)
- NLP: Claude API calls from main process
- Algorithms: ts-fsrs, IRT engine in main process
- UI: React in renderer process
- Communication: Electron IPC bridge

---

## Internal vs External Logic Separation

Core implementation strategy from THEORETICAL-FOUNDATIONS.md:

| Logic Type | Definition | Location | Examples |
|------------|------------|----------|----------|
| **Internal** | Pure, self-contained algorithms | Main process | θ estimation, FRE computation, priority calculation, difficulty functions |
| **External (MCP)** | Content requiring external resources | Main process (async) | Claude API, corpus processing, content generation |

### Implementation Rules

```typescript
// INTERNAL LOGIC: Pure functions, no external dependencies, synchronous
function computePriority(object: LanguageObject, state: UserState): number {
  const fre = (state.weights.f * object.frequency) +
              (state.weights.r * object.relationalDensity) +
              (state.weights.e * object.contextualContribution);
  return fre / computeCost(object, state);
}

// EXTERNAL LOGIC: Clearly marked, async, with fallbacks
async function generateTaskContent(spec: TaskSpec): Promise<TaskContent> {
  if (!await isOnline()) {
    return getCachedTask(spec.objectId) || getTemplateTask(spec);
  }
  return await claudeAPI.generate(spec);
}
```

### Why This Matters

1. **Testability**: Internal logic can be unit tested without mocks
2. **Offline capability**: App functions when Claude unavailable
3. **Cost control**: External calls are explicit and cacheable
4. **Maintainability**: Each logic type can evolve independently

---

Every piece of code written for LOGOS must:
1. **Have a reference implementation** - Proven code from GitHub/HuggingFace that does similar things
2. **Be tested before integration** - Each component runs standalone before connecting
3. **Use established patterns** - No novel architectures, only battle-tested approaches
4. **Include rollback points** - Git tags at every working state

---

## Reference Research Phase (Before Any Code)

### Component 1: Electron + React Desktop App
**Research targets:**
- [ ] electron-react-boilerplate (25k+ stars)
- [ ] electron-vite (3k+ stars)
- [ ] Real apps: VS Code architecture, Obsidian patterns

**Verification:** Can build and run a "Hello World" Electron app with React

---

### Component 2: Spaced Repetition Algorithm
**Research targets:**
- [ ] py-fsrs (Free Spaced Repetition Scheduler) - Anki's algorithm
- [ ] ebisu - Bayesian spaced repetition
- [ ] SM-2 algorithm implementations

**Verification:** Can schedule reviews for 100 test items, verify decay curves match published research

---

### Component 3: Item Response Theory (IRT)
**Research targets:**
- [ ] py-irt (Python IRT library)
- [ ] catsim (Computerized Adaptive Testing simulator)
- [ ] mirt (R package, for algorithm verification)

**Verification:** Can estimate item difficulty from simulated response data

---

### Component 4: NLP Pipeline (Anthropic Claude)
**Research targets:**
- [ ] anthropic-cookbook examples
- [ ] LangChain with Claude integration
- [ ] Proven prompt patterns for: entity extraction, classification, generation

**Verification:** Can extract vocabulary items from sample text with >90% accuracy

---

### Component 5: SQLite + Local Storage
**Research targets:**
- [ ] better-sqlite3 (Node.js)
- [ ] Prisma with SQLite
- [ ] Electron storage patterns (electron-store, lowdb)

**Verification:** Can store and retrieve user data across app restarts

---

### Component 6: UI Components
**Research targets:**
- [ ] shadcn/ui (already have benchmarks)
- [ ] Radix primitives
- [ ] Tremor for charts
- [ ] react-force-graph for network visualization

**Verification:** Can render dashboard with mock data

---

## Development Phases with Checkpoints

### Phase 1: Foundation
```
Duration: First checkpoint
Deliverables:
├── Electron app launches ✓
├── React renders in window ✓
├── SQLite connected ✓
├── Basic navigation works ✓
└── Can call Claude API ✓

CHECKPOINT: You verify app launches and shows test UI
```

### Phase 2: Core Data Layer
```
Duration: Second checkpoint
Deliverables:
├── GoalSpec CRUD operations ✓
├── Language Object storage ✓
├── Mastery state tracking ✓
├── Session recording ✓
├── All DB operations tested ✓
│
│   [NEW] Extended Schema Requirements:
├── Domain distribution vector storage (domainDistribution JSON)
├── Morphological score field (morphologicalScore Float)
└── Phonological difficulty field (phonologicalDifficulty Float)

CHECKPOINT: You verify data persists across restarts
```

#### Phase 2 Schema Extensions (NEW)

The following fields must be added to support the five-element feature vector z(w):

```prisma
model LanguageObject {
  // Existing FRE fields
  frequency            Float  // F: normalized frequency
  relationalDensity    Float  // R: hub/centrality score
  contextualContribution Float // E: contextual importance

  // NEW: Extended z(w) vector fields
  domainDistribution     Json?   // D: {"news": 0.1, "medical": 0.8, ...}
  morphologicalScore     Float?  // M: family size × productivity metric
  phonologicalDifficulty Float?  // P: G2P entropy + complexity metric
}
```

**Implementation Notes:**
- `domainDistribution` stores a JSON object with domain keys and probability values
- `morphologicalScore` is computed during corpus processing via Claude API
- `phonologicalDifficulty` is computed using G2P analysis functions

#### Phase 2 G2P Model Implementation (NEW - 2026-01-04)

Implement context-conditioned Grapheme-to-Phoneme mapping for the P (phonological difficulty) score:

**Required Interfaces:**

```typescript
interface G2PContext {
  position: 'initial' | 'medial' | 'final';
  precedingGrapheme?: string;
  followingGrapheme?: string;
  morphemeBoundary: boolean;
  stressPattern?: 'primary' | 'secondary' | 'unstressed';
}

interface G2PRule {
  id: string;
  grapheme: string;
  phoneme: string | string[];
  conditions: Partial<G2PContext>;
  priority: number;
  exceptionRate: number;  // 0-1, higher = more exceptions
}
```

**Required Functions:**

```typescript
// Core G2P functions
function segmentGraphemes(word: string): GraphemeUnit[];
function applyG2PRules(graphemes: GraphemeUnit[], rules: G2PRule[]): PhonemeResult;
function computeG2PEntropy(word: string): number;  // For P score

// Entropy formula: H(w) = -Σ P(phoneme|grapheme,context) × log₂(P)
// Higher entropy = less predictable = higher phonological difficulty
```

**Implementation Checklist:**
- [ ] `G2PRule` interface and `ENGLISH_G2P_RULES` array
- [ ] `segmentGraphemes()` function handling digraphs (sh, ch, th, etc.)
- [ ] `applyG2PRules()` with context-aware rule matching
- [ ] `computeG2PEntropy()` for P score calculation
- [ ] `LanguageG2PSpec` configuration for English (extensible to other languages)

See: THEORETICAL-FOUNDATIONS.md Section 1.3, ALGORITHMIC-FOUNDATIONS.md Section 3.5

#### Phase 2 Word Organization Implementation (NEW - 2026-01-04)

Implement word segmentation and organization for efficient retrieval and UI display:

**Required Interfaces:**

```typescript
interface WordSegmentation {
  graphemeSegments: GraphemeUnit[];    // Visual units
  morphemeSegments: MorphemeUnit[];    // Meaning units
  syllableSegments: SyllableUnit[];    // Pronunciation units
}

interface MultiLayerWordCard {
  orthographic: {
    written: string;
    graphemes: GraphemeUnit[];
    highlightedMorphemes: string[];
  };
  morphological: {
    root: string;
    affixes: Affix[];
    familySize: number;
    productivity: number;
  };
  semantic: {
    definitions: Definition[];
    collocations: Collocation[];
    domainTags: string[];
  };
}
```

**Required Functions:**

```typescript
// Segmentation pipeline
function segmentWord(word: string): WordSegmentation;
function buildMorphologicalFamily(root: string): MorphologicalFamily;
function computeMorphologicalScore(word: string): number;  // For M score

// Indexing for fast retrieval
function buildWordIndexes(objects: LanguageObject[]): WordIndexes;
// Returns: { byGrapheme, byMorpheme, byPhoneme, bySemantic }
```

**Implementation Checklist:**
- [ ] `WordSegmentation` pipeline (grapheme + morpheme + syllable)
- [ ] `buildWordIndexes()` for fast retrieval by any layer
- [ ] `MorphologicalFamily` builder with family size calculation
- [ ] `computeMorphologicalScore()` for M score (familySize × productivity)
- [ ] `MultiLayerWordCard` builder for UI display

See: ALGORITHMIC-FOUNDATIONS.md Section 3.5

---

### Phase 3: Learning Engine (The 7-Layer Pipeline)

The learning engine implements a simplified version of the theoretical 7-layer pipeline:

```
MVP Pipeline (3 layers):
┌─────────────────────────────────────────────┐
│ Layer 1: State + Priority                   │
│ - User θ analysis                           │
│ - FRE-based prioritization                  │
│ - [NEW] S_eff with g(m) adjustment          │
│ - (Combines theoretical layers 1-2)         │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Layer 2: Task Generation                    │
│ - Vector spotlight selection                │
│ - Modality + format combination             │
│ - [NEW] Task-word matching by z(w) criteria │
│ - [NEW] Cognitive process targeting         │
│ - (Combines theoretical layers 3-5)         │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ Layer 3: Scoring + Update                   │
│ - Response logging                          │
│ - Mastery state updates                     │
│ - (Combines theoretical layers 6-7)         │
└─────────────────────────────────────────────┘
```

```
Duration: Third checkpoint
Deliverables:
├── Priority calculation works ✓
├── Spaced repetition scheduling ✓
├── Task generation from templates ✓
├── IRT difficulty adjustment ✓
├── Fluency/Versatility task balance ✓
├── Queue updates correctly ✓
│
│   [NEW] Extended Engine Requirements:
├── S_eff effective priority function with g(m) mastery adjustment
├── Task-word matching based on z(w) vector criteria
├── Cognitive process targeting (morphological/phonological/relational tasks)
└── Task template metadata with activatedLayers and cognitiveProcesses

CHECKPOINT: You verify learning queue makes sense
```

#### Phase 3 Algorithm Extensions (NEW)

**1. Effective Priority Function S_eff**

Replace simple FRE priority with:
```typescript
S_eff(w) = S_base(w | context, goal) × g(m(w))
```

Where `g(m)` implements inverted U-curve prioritization:
- m < 0.2: Foundation lacking → g = 0.5
- m ∈ [0.2, 0.7]: Optimal zone → g = 0.8-1.0
- m > 0.9: Mastered → g = 0.3

See: ALGORITHMIC-FOUNDATIONS.md Section 3.3

**2. Task-Word Matching**

Select task templates based on word characteristics:
- High M (morphological) → Word family / derivation tasks
- High P (phonological) → Dictation / G2P tasks
- High R (relational) → Collocation / network tasks
- Domain-specific D → Context judgment tasks

See: ALGORITHMIC-FOUNDATIONS.md Section 3.4

**3. Cognitive Process Targeting**

Each task template specifies:
- `cognitiveProcesses`: ['simple_recall', 'inference', 'pattern_generalization', ...]
- `activatedLayers`: ['phonological', 'morphological', 'lexical_semantic', ...]

The algorithm selects tasks that activate appropriate processes for the word's characteristics.

#### Phase 3 Task Selection Implementation (NEW - 2026-01-04)

**Required Interfaces:**

```typescript
interface TaskTemplateMetadata {
  id: string;
  taskType: TaskType;
  targetWordCriteria: {
    minM?: number; maxM?: number;  // Morphological threshold
    minP?: number; maxP?: number;  // Phonological threshold
    minR?: number; maxR?: number;  // Relational threshold
    requiredDomains?: string[];    // Domain requirements
  };
  cognitiveProcesses: CognitiveProcess[];
  activatedLayers: LanguageLayer[];
  masteryStageRange: [number, number];
}

type CognitiveProcess =
  | 'simple_recall'
  | 'cued_recall'
  | 'recognition'
  | 'inference'
  | 'pattern_generalization'
  | 'productive_use'
  | 'contextual_judgment';

type LanguageLayer =
  | 'phonological'
  | 'orthographic'
  | 'morphological'
  | 'lexical_semantic'
  | 'syntactic'
  | 'pragmatic';
```

**Required Functions:**

```typescript
function selectOptimalTask(
  word: LanguageObject,
  masteryState: MasteryState,
  templates: TaskTemplateMetadata[]
): TaskTemplateMetadata;

function computeTaskWordFit(
  word: LanguageObject,
  template: TaskTemplateMetadata
): number;  // 0-1 fit score

function isTaskTypeAppropriateForStage(
  taskType: TaskType,
  masteryStage: number
): boolean;
```

**Implementation Checklist:**

- [ ] `TaskTemplateMetadata` interface with full criteria specification
- [ ] `selectOptimalTask()` matching word z(w) to template criteria
- [ ] `computeTaskWordFit()` scoring function
- [ ] `isTaskTypeAppropriateForStage()` validation
- [ ] Task template library with cognitive process metadata (minimum 10 templates)

See: ALGORITHMIC-FOUNDATIONS.md Section 3.4

### Phase 4: Complete UI + Polish
```
Duration: Fourth checkpoint
Deliverables:
├── Onboarding wizard ✓
├── Dashboard with real data ✓
├── Training gym functional ✓
├── Network graph renders ✓
├── Analytics accurate ✓
├── Packaged installer ✓
└── Works on clean machine ✓

CHECKPOINT: You test full user flow
```

---

## Vibe-Coding Guidelines (AI-Assisted Development)

### Rule 1: Research Before Implementation
```
WRONG:
"Write a spaced repetition algorithm"
→ Claude invents something, probably broken

RIGHT:
"I found py-fsrs implements FSRS-4.5 algorithm.
Port this to TypeScript, maintaining the same
parameter names and formula structure."
→ Claude follows proven implementation
```

### Rule 2: Always Show Reference
```
WRONG:
"Create an IRT-based adaptive testing system"
→ Vague, will produce something untested

RIGHT:
"Based on catsim's ability estimation (see:
github.com/douglasrizzo/catsim/blob/master/catsim/estimation.py),
implement Fisher Information-based item selection"
→ Traceable to working code
```

### Rule 3: Test Incrementally
```
WRONG:
Build everything, test at the end
→ Debug nightmare

RIGHT:
Build → Test → Commit → Build → Test → Commit
Each commit is a working state
```

### Rule 4: Web Search for Current Info
```
Before implementing any external integration:
1. Search for current API docs (APIs change!)
2. Search for known issues/gotchas
3. Search for working examples
4. Verify library versions
```

### Rule 5: No Magic, Only Explicit
```
WRONG:
"Make it smart" / "Make it work" / "Handle edge cases"
→ Undefined behavior

RIGHT:
"If mastery_stage < 2 and last_response == incorrect,
decrease difficulty by 0.1 and schedule review in 1 day"
→ Explicit, testable
```

---

## Quality Gates

### Before Each Commit
- [ ] Code runs without errors
- [ ] New functionality tested manually
- [ ] Reference implementation cited in comments
- [ ] Documentation updated

### Before Each Phase Checkpoint
- [ ] All components integrate
- [ ] User flow works end-to-end
- [ ] Data persists correctly
- [ ] No console errors
- [ ] Performance acceptable (<1s response)

### Before Final Release
- [ ] Fresh install test on clean machine
- [ ] All user flows complete
- [ ] Offline mode works
- [ ] Data backup/restore works
- [ ] No hardcoded paths/credentials

---

## Agent Coordination Protocol

### Who Does What

```
┌──────────────────────────────────────────────────────────────┐
│                    MAIN CLAUDE (Orchestrator)                │
│  - Coordinates all agents                                    │
│  - Makes architectural decisions                             │
│  - Resolves conflicts between agents                         │
│  - Maintains overall coherence                               │
└──────────────────────────────────────────────────────────────┘
         │
         ├─── frontend-specialist
         │    └─ React components, UI logic, styling
         │
         ├─── api-specialist
         │    └─ Electron IPC handlers, Claude API integration
         │
         ├─── database-specialist
         │    └─ Schema design, migrations, queries
         │
         ├─── documentation-specialist
         │    └─ Shadow docs for EVERY code file
         │
         ├─── security-specialist
         │    └─ API key handling, input validation
         │
         ├─── debug-git-specialist
         │    └─ Clean commits, branch management
         │
         ├─── mcp-specialist
         │    └─ External service integration
         │
         ├─── agent-optimizer
         │    └─ Ensure agents work efficiently
         │
         └─── meta-agent-builder
              └─ Create new agents if gaps found
```

### Communication Pattern

```
1. Main Claude reads current state
2. Main Claude decides which agent(s) needed
3. Agent produces output
4. documentation-specialist creates shadow doc
5. security-specialist reviews if sensitive
6. debug-git-specialist commits if milestone
7. Main Claude verifies integration
8. Repeat
```

### Agent Trigger System (NEW - 2026-01-04)

Automatic agent triggering is implemented via `src/main/services/agent-trigger.ts` and `src/main/services/agent-hooks.ts`.

#### Trigger Detection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIGGER DETECTION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Context Analysis                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Layer-based  │    │ File Pattern │    │ Bottleneck   │  │
│  │ Detection    │    │ Matching     │    │ Registration │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         └───────────────────┼───────────────────┘           │
│                             ▼                               │
│                    ┌────────────────┐                       │
│                    │ AgentTrigger[] │                       │
│                    │ with priority  │                       │
│                    └────────┬───────┘                       │
│                             │                               │
│         ┌───────────────────┼───────────────────┐           │
│         ▼                   ▼                   ▼           │
│    immediate             soon           when_available      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Automatic Trigger Conditions

| Condition | Triggered Agent(s) | Priority |
|-----------|-------------------|----------|
| UI layer work | `frontend-specialist` | when_available |
| IPC handler changes | `api-specialist` | when_available |
| Database operations | `database-specialist` | when_available |
| Security-sensitive operation | `security-specialist` | immediate |
| External API integration | `mcp-specialist` | soon |
| Any code change | `documentation-specialist` | soon |
| Same bottleneck 3+ times | `meta-agent-builder` | immediate |
| Missing agent specialization | `meta-agent-builder` | immediate |

#### Meta-Agent-Builder Trigger Conditions

`meta-agent-builder` is automatically triggered when:

1. **Explicit gap**: Bottleneck type is `missing_agent_specialization`
2. **Repeated failures**: Same bottleneck type occurs 3+ times
3. **No handler**: No existing agent is mapped to handle the bottleneck type

```typescript
// Example: Registering a bottleneck that triggers meta-agent-builder
const bottleneck: DevelopmentBottleneck = {
  type: 'missing_agent_specialization',
  location: 'src/new-feature/',
  blockedBy: 'Need ML model integration specialist',
  proposedFix: 'Create agent specialized in ML model deployment',
  affectedAgents: ['api-specialist'],
  severity: 'high',
  detectedAt: new Date(),
};

const triggers = registerBottleneck(bottleneck);
// Returns: [{ agent: 'meta-agent-builder', priority: 'immediate', ... }]
```

#### IPC Integration

Agent triggers are integrated via IPC handlers in `src/main/ipc/agent.ipc.ts`:

| Channel | Purpose |
|---------|---------|
| `agent:detectTriggers` | Analyze context, return recommended agents |
| `agent:registerBottleneck` | Register blocker, trigger appropriate agents |
| `agent:getBottlenecks` | List all active bottlenecks |
| `agent:resolveBottleneck` | Mark bottleneck as resolved |
| `agent:generateSpec` | Generate new agent spec from bottleneck |

#### Using Agent Hooks in Handlers

```typescript
import { withAgentHooks } from '../services/agent-hooks';

// Wrap handler with automatic agent detection
const wrappedHandler = withAgentHooks(
  'goal',        // domain
  'create',      // operation
  'goal.ipc.ts', // location
  async (request) => {
    // Original handler logic
    return success(result);
  }
);
```

---

## Deliverable Guarantee

By following this protocol, LOGOS will be:

✅ **Downloadable** - Packaged Electron installer (.exe for Windows)
✅ **Self-contained** - All dependencies bundled
✅ **API-ready** - Anthropic Claude API integrated and working
✅ **Database-managed** - SQLite with proper schema
✅ **Backend logic** - All algorithms implemented and tested
✅ **Decent frontend** - Clean UI based on shadcn benchmarks
✅ **Functional** - Actually does what the spec says

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Electron packaging fails | Use electron-builder with tested config |
| Claude API rate limits | Implement caching and batch requests |
| IRT math is wrong | Verify against published test datasets |
| Spaced repetition broken | Test with known-good SM-2 benchmarks |
| UI doesn't match spec | Use benchmark images as acceptance criteria |
| Integration breaks | CI pipeline with integration tests |

---

## Error Handling Patterns

### Claude API Errors

```typescript
// Always wrap Claude calls with retry logic
async function callClaude(prompt: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await client.messages.create({...});
      return response.content[0].text;
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - exponential backoff
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      if (error.status >= 500) {
        // Server error - retry
        await sleep(1000);
        continue;
      }
      throw error; // Client error - don't retry
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Database Errors

```typescript
// Wrap DB operations in transactions
async function updateMastery(objectId: string, newStage: number) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.masteryState.findUnique({...});
    if (!current) throw new Error('Object not found');
    return tx.masteryState.update({...});
  });
}
```

### IPC Errors

```typescript
// Main process handler with error boundary
ipcMain.handle('db:getMasteryState', async (_, objectId) => {
  try {
    return { success: true, data: await getMasteryState(objectId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Renderer process caller
const result = await window.api.getMasteryState(objectId);
if (!result.success) {
  showErrorToast(result.error);
  return;
}
```

---

## Offline Mode Strategy

### What Works Offline

| Feature | Offline | Notes |
|---------|---------|-------|
| View dashboard | ✅ | All data local |
| Practice existing items | ✅ | Tasks pre-generated |
| Track mastery | ✅ | SQLite local |
| Spaced repetition | ✅ | ts-fsrs local |
| Generate new tasks | ❌ | Needs Claude API |
| Process new corpus | ❌ | Needs Claude API |
| Create new goals | ⚠️ | Limited to predefined templates |

### Offline Detection

```typescript
// Check connectivity before Claude calls
async function isOnline(): Promise<boolean> {
  try {
    await fetch('https://api.anthropic.com/health', {
      method: 'HEAD',
      timeout: 5000
    });
    return true;
  } catch {
    return false;
  }
}

// Queue tasks when offline
if (!await isOnline()) {
  await offlineQueue.add({ type: 'generate_task', objectId });
  showOfflineNotice();
  return cachedTask; // Use pre-generated backup
}
```

### Pre-generation Strategy

```typescript
// Generate backup tasks during online sessions
async function pregenerateBackupTasks(objects: LanguageObject[]) {
  for (const obj of objects.slice(0, 50)) { // Top 50 priority
    if (!await hasBackupTask(obj.id)) {
      const task = await generateTask(obj);
      await storeBackupTask(obj.id, task);
    }
  }
}
```

---

## npm Dependencies (Exact Versions)

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.0",
    "@prisma/client": "^6.0.0",
    "better-sqlite3": "^11.0.0",
    "ts-fsrs": "^4.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "electron": "^33.0.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "electron-builder": "^25.0.0"
  }
}
```

---

## θ (Theta) Treatment Rules

From THEORETICAL-FOUNDATIONS.md - strict separation of θ updates by phase:

| Phase | θ Treatment | Implementation |
|-------|-------------|----------------|
| **Learning** | No θ updates | Allow exploration without judgment |
| **Training** | Soft tracking only | Internal difficulty adjustment, no formal score |
| **Evaluation** | IRT-based estimation | Precise measurement with confidence intervals |

### Why This Matters

1. **Psychological safety**: Learners experiment freely during training
2. **Statistical validity**: θ estimation requires controlled conditions
3. **API cost control**: IRT calculations only when needed

### Code Pattern

```typescript
enum SessionMode {
  LEARNING = 'learning',   // θ frozen
  TRAINING = 'training',   // θ soft-tracked
  EVALUATION = 'evaluation' // θ IRT-updated
}

function handleResponse(response: Response, mode: SessionMode) {
  // Always log the response
  await db.responses.create({ data: response });

  switch (mode) {
    case SessionMode.LEARNING:
      // No θ update - just exposure tracking
      break;
    case SessionMode.TRAINING:
      // Soft update - adjust task difficulty, don't update formal θ
      adjustLocalDifficulty(response);
      break;
    case SessionMode.EVALUATION:
      // Full IRT update with confidence calculation
      await updateThetaWithIRT(response);
      break;
  }
}
```

---

*Protocol Version: 1.3*
*Updated: 2026-01-04*
*This document governs all LOGOS development*
*Aligned with: THEORETICAL-FOUNDATIONS.md v2.1, ALGORITHMIC-FOUNDATIONS.md v2.1*
*New additions: G2P Model (Phase 2), Word Organization (Phase 2), Task Selection (Phase 3)*
