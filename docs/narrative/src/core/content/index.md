# Content Module Index

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/content/index.ts`
> **Status**: Active (Simplified)

---

## Context & Purpose

This module serves as the **public API boundary** for the content subsystem within the LOGOS learning platform. It acts as a curated re-export point that exposes only the pedagogical intent types and functions needed by other parts of the system.

**Business Need**: The learning system needs a clean, stable interface for accessing pedagogical concepts (what educational purpose each task serves) without exposing internal implementation details. By centralizing exports here, we enable consumers to import from a single location (`@/core/content`) rather than reaching into specific files.

**Architectural Note - Simplification**: This module was recently streamlined. Previously, it exported content generation utilities (content-generator, content-validator, content-spec), but these responsibilities have been migrated to `task-generation.service.ts` in the services layer. The remaining exports focus exclusively on **pedagogical intent** - the educational "why" behind content presentation.

**When Used**: Any component that needs to understand or specify the educational purpose of a task imports from this module. This includes:

- Task generation services determining what type of learning activity to create
- State management systems tracking what pedagogical goals have been achieved
- Task constraint solvers optimizing learning sequences

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `./pedagogical-intent.ts`: The sole dependency - this module re-exports all public types and functions from the pedagogical intent system

### Dependents (What Needs This)

This module is consumed by several critical system components:

- `src/core/index.ts`: Re-exports all content module exports as part of the core public API (`export * from './content'`)

- `src/core/state/component-object-state.ts`: Imports `PedagogicalIntent` type to track what educational purposes have been served for each language object

- `src/core/tasks/task-constraint-solver.ts`: Imports `PedagogicalIntent` and `DifficultyConstraints` to optimize task selection based on educational goals

- `src/core/tasks/traditional-task-types.ts`: Imports `PedagogicalIntent` and `LearningPhase` to map traditional task formats to their pedagogical purposes

### Data Flow

```text
Consumer code
    |
    v
src/core/content/index.ts  (this module - public API boundary)
    |
    v
src/core/content/pedagogical-intent.ts  (implementation)
```

The flow is intentionally simple: this module adds no logic, serving purely as an export aggregator that shields consumers from internal file organization changes.

---

## Macroscale: System Integration

### Architectural Layer

This module sits in the **Core Layer** (Layer 1) of the LOGOS three-tier architecture:

- **Layer 0**: Shared types and constants
- **Layer 1**: Core algorithms and domain logic (this module)
- **Layer 2**: Services (task-generation.service.ts now handles content generation)
- **Layer 3**: IPC handlers and presentation

### Role in the Content Generation Pipeline

The content subsystem has been restructured with clear separation of concerns:

```text
[What to teach]           [Why to teach it]           [How to present it]
      |                          |                           |
      v                          v                           v
Language Objects    -->    Pedagogical Intent    -->    Task Generation
(src/core/types)          (THIS MODULE)               (task-generation.service.ts)
```

This module provides the middle piece: the **pedagogical layer** that translates learning states into educational strategies.

### Big Picture Impact

**What This Enables**:

1. **Pedagogically-Informed Task Selection**: The system can choose tasks that match the learner's current educational needs (introduce new concepts vs. reinforce known ones vs. test comprehension)

2. **Scaffolding Strategy**: Different pedagogical intents require different levels of support. A "introduce_new" intent needs maximum scaffolding, while "fluency_building" should be cue-free

3. **Bloom's Taxonomy Alignment**: Learning phases map to Bloom's levels (recognition, recall, application, analysis, synthesis, evaluation), enabling principled progression through cognitive complexity

4. **Cognitive Load Management**: Each intent carries metadata about expected cognitive load, enabling the system to balance challenge and support

**Simplification Rationale**: Moving content generation to `task-generation.service.ts` follows the principle of keeping pure domain logic (what educational purposes exist) separate from orchestration logic (how to generate appropriate tasks). The pedagogical intent definitions are stable domain knowledge; task generation involves database access, caching, and AI integration that belong in the services layer.

### Critical Path Analysis

**Importance Level**: High (but stable)

- If this module were removed: All pedagogical awareness would be lost. The system would generate tasks without educational purpose, essentially becoming random flashcards
- If the exports change: All consumers would break at compile time (TypeScript)
- Failure mode: None at runtime (pure type/constant exports)
- Stability: Very stable - pedagogical intent types rarely change

---

## Technical Concepts (Plain English)

### Pedagogical Intent

**Technical**: A discriminated union type (`PedagogicalIntent`) with values like 'introduce_new', 'reinforce_known', 'test_comprehension', etc., each representing a distinct educational purpose.

**Plain English**: Think of it like the "reason" behind showing a student a particular flashcard. Are we introducing something brand new? Drilling something they already know? Testing if they truly understand? Each reason leads to different presentation strategies.

**Why We Use It**: Without explicit pedagogical intent, a learning system can only optimize for metrics like "did they get it right?" With intent, we can optimize for educational outcomes like "have they progressed from recognition to production?"

### Learning Phase (Bloom's Taxonomy Mapping)

**Technical**: An enumeration (`LearningPhase`) mapping to cognitive levels: recognition, recall, application, analysis, synthesis, evaluation.

**Plain English**: Learning isn't binary (know/don't know). A learner progresses through stages: first they can recognize something when they see it, then recall it from memory, then use it in new situations, then break it apart to understand why it works, then create new things with it, and finally judge quality. Each phase requires different teaching strategies.

**Why We Use It**: Different phases require different task types. Recognition tasks (multiple choice) are appropriate for phase 1; production tasks (write a sentence) require later phases. This prevents frustrating learners with tasks beyond their current capability.

### DifficultyConstraints

**Technical**: An interface specifying `minDifficulty`, `maxDifficulty`, `targetTheta` (learner ability), and `tolerance` for difficulty matching.

**Plain English**: Like a thermostat for learning difficulty. We set a target range (not too easy, not too hard), specify where the learner currently is, and how much deviation from optimal we'll accept. The system then selects or generates content within this "Goldilocks zone."

**Why We Use It**: The Vygotsky Zone of Proximal Development concept - learning happens best when challenge slightly exceeds current ability. Too easy = boredom; too hard = frustration.

### ScaffoldingConfig

**Technical**: Configuration specifying scaffolding level (0-3), available cue types, hint timing, and maximum hints before revealing the answer.

**Plain English**: Training wheels for learning. Level 3 = maximum support (show first letter, word length, translation); Level 0 = no support (sink or swim). The configuration also controls when hints appear automatically and how many chances the learner gets.

**Why We Use It**: Scaffolding should fade over time. We track the gap between cue-assisted and cue-free performance; when that gap closes, we reduce scaffolding to build true independent knowledge.

### Module Index Pattern (Re-exports)

**Technical**: A barrel file that aggregates and re-exports symbols from internal modules, creating a public API surface.

**Plain English**: Like a receptionist's desk in an office building. Instead of visitors wandering through hallways to find the right person, they check in at reception and get directed appropriately. The index file is that reception desk - one entry point that knows where everything is internally.

**Why We Use It**: Enables internal reorganization without breaking external consumers. If we rename `pedagogical-intent.ts` to `intent-types.ts`, only this index file needs updating - all consumers still import from `@/core/content`.

---

## Exported Symbols Reference

### Types

| Export                  | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `PedagogicalIntent`     | Union type of all educational purposes               |
| `LearningPhase`         | Bloom's taxonomy cognitive levels                    |
| `DifficultyConstraints` | Difficulty targeting parameters                      |
| `ScaffoldingConfig`     | Hint and support configuration                       |
| `CueType`               | Types of learning cues (first_letter, translation, etc.) |
| `PedagogicalIntentMeta` | Full metadata for each intent                        |

### Constants

| Export               | Description                                        |
| -------------------- | -------------------------------------------------- |
| `PEDAGOGICAL_INTENTS` | Lookup table mapping each intent to its metadata |

### Functions

| Export                         | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| `getIntentsForStage(stage)`    | Get valid intents for a mastery stage            |
| `getIntentsForPhase(phase)`    | Get intents appropriate for a learning phase     |
| `requiresProduction(intent)`   | Check if intent requires active output           |
| `getScaffoldingLevel(intent)`  | Get default scaffolding for an intent            |
| `selectOptimalIntent(...)`     | Algorithm to choose best intent for learner state |
| `calculateExpectedSuccess(...)` | IRT-based success probability estimation        |

---

## Change History

### 2026-01-08 - Module Simplification

- **What Changed**: Removed exports for content-generator, content-validator, and content-spec. Module now exports only pedagogical-intent types and functions.
- **Why**: Content generation logic was moved to `task-generation.service.ts` as part of the Phase 3.2 learning pipeline implementation. This follows separation of concerns: pedagogical intent definitions (domain knowledge) stay in core; content generation (orchestration with database, caching, AI) moves to services.
- **Impact**: No breaking changes for consumers using pedagogical intent types. Consumers that were importing content generation utilities need to update imports to use task-generation.service.ts instead.

### Previous - Initial Implementation

- **What Changed**: Created content module with pedagogical intent types based on Gap 4.5 from GAPS-AND-CONNECTIONS.md
- **Why**: Learning system needed explicit pedagogical purpose tracking for educational effectiveness
- **Impact**: Enabled pedagogically-informed task selection throughout the application
