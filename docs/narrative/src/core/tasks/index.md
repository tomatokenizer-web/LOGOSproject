# Tasks Module Index (Barrel Export)

> **Last Updated**: 2026-01-04
> **Code Location**: `src/core/tasks/index.ts`
> **Status**: Active
> **Implements**: Gap 4.6 - Traditional Task Type Library

---

## Context & Purpose

This file serves as the **central export hub** (commonly called a "barrel export") for the entire tasks module. It exists to provide a clean, organized public API for all task-related functionality in the LOGOS language learning application.

**Business Need**: When building a language learning platform, you need many different types of exercises (reading comprehension, fill-in-the-blank, error correction, etc.). Rather than forcing every other part of the application to remember exactly which file contains which feature, this module collects everything in one place. Think of it like the reception desk at a large office building - instead of wandering the halls looking for the right department, you ask reception and they direct you.

**Problem Solved**: Without barrel exports, importing task functionality would require knowing the internal file structure:
```typescript
// Without barrel (messy, brittle)
import { TRADITIONAL_TASK_TYPES } from '../core/tasks/traditional-task-types';
import { TaskConstraintSolver } from '../core/tasks/task-constraint-solver';
import { DistractorGenerator } from '../core/tasks/distractor-generator';

// With barrel (clean, stable)
import { TRADITIONAL_TASK_TYPES, TaskConstraintSolver, DistractorGenerator } from '../core/tasks';
```

**When Used**: Every time any part of LOGOS needs to work with tasks - generating exercises, selecting vocabulary for practice, creating multiple choice options, or determining what type of activity suits a learner's current level.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

This barrel file re-exports from three internal modules:

- **`./traditional-task-types.ts`**: The library of 30 task type definitions
  - Types: `TaskCategory`, `TraditionalTaskType`, `CognitiveProcess`, `ResponseFormat`, `TraditionalTaskTypeMeta`
  - Data: `TRADITIONAL_TASK_TYPES` - complete metadata for all 30 task types
  - Functions: `getTaskTypesByCategory()`, `getTaskTypesForStage()`, `getTaskTypesForIntent()`, `getTaskTypesForComponent()`, `getProductiveTaskTypes()`, `getReceptiveTaskTypes()`, `calculateTaskSuitability()`, `selectOptimalTaskType()`

- **`./task-constraint-solver.ts`**: Object selection engine
  - Types: `ObjectSelectionConstraints`, `ScoredObject`, `SelectionResult`, `CollocationPair`
  - Classes: `TaskConstraintSolver` - the main solver class
  - Functions: `createConstraintSolver()`, `selectObjectsForTask()`

- **`./distractor-generator.ts`**: MCQ wrong-answer generator
  - Types: `DistractorStrategy`, `Distractor`, `DistractorConfig`, `DistractorSet`
  - Classes: `DistractorGenerator` - generates plausible wrong answers
  - Functions: `createDistractorGenerator()`, `generateDistractors()`

### Dependents (What Needs This)

Any module that generates or manages learning activities:

- **Task generation services**: Use task types to create appropriate exercises
- **Content selection pipelines**: Use constraint solver to pick suitable vocabulary
- **Quiz/test generators**: Use distractor generator for multiple choice questions
- **Adaptive learning engine**: Uses task suitability scoring to match activities to learner level
- **UI components**: Import task type metadata for rendering exercise interfaces

### Data Flow

```
External Module Request
        |
        v
  [index.ts] (this file)
        |
        +---> traditional-task-types.ts (task metadata & selection)
        |
        +---> task-constraint-solver.ts (object matching)
        |
        +---> distractor-generator.ts (wrong answer creation)
```

---

## Macroscale: System Integration

### Architectural Role

This module sits in the **Core Algorithm Layer** of LOGOS's three-tier architecture:

```
+--------------------------------------------------+
|  RENDERER (UI Layer)                              |
|  React components for displaying exercises        |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|  CORE (Algorithm Layer) <-- YOU ARE HERE          |
|  - tasks/index.ts (this file)                     |
|  - IRT ability estimation                         |
|  - FSRS spaced repetition                         |
|  - PMI collocation scoring                        |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|  MAIN (Data Layer)                                |
|  Database, IPC handlers, services                 |
+--------------------------------------------------+
```

The tasks module is **pure algorithm code** - it contains no database access, no UI rendering, no Electron-specific logic. This makes it:
- Testable in isolation
- Portable to other platforms
- Easy to reason about

### Big Picture Impact

The tasks module is the **pedagogical brain** of LOGOS. It answers critical questions:

1. **"What kind of exercise should this learner do next?"**
   - `selectOptimalTaskType()` considers mastery stage, target skill, and variety

2. **"Which words should appear in this exercise?"**
   - `TaskConstraintSolver` matches vocabulary to task requirements

3. **"What wrong answers should a multiple choice question have?"**
   - `DistractorGenerator` creates plausible-but-wrong options

**Without this module**, LOGOS would be unable to:
- Generate appropriate learning activities
- Select vocabulary that matches the learner's level
- Create meaningful multiple choice questions
- Vary exercise types to maintain engagement

### System Dependencies

**Importance Level**: Critical Path

This module is a **dependency hub** - many systems need it, but it needs few external systems. It depends only on:
- Core type definitions (`../types`)
- Pedagogical intent system (`../content/pedagogical-intent`)

If this module fails:
- No exercises can be generated
- The adaptive learning loop breaks
- Users see no learning content

**Fallback**: The `selectOptimalTaskType()` function has a hardcoded fallback to `'cloze_deletion'` if scoring fails, ensuring the system can always generate *something*.

---

## What This Module Exports

### Traditional Task Types (30 types across 6 categories)

The complete taxonomy of language learning exercise types:

| Category | Count | Description | Examples |
|----------|-------|-------------|----------|
| **Receptive** | 5 | Understanding without production | Reading comprehension, listening comprehension |
| **Productive** | 5 | Active language creation | Essay writing, dictation, free response |
| **Transformative** | 7 | Converting between forms | Translation, paraphrasing, voice transformation |
| **Fill-in** | 4 | Gap completion exercises | Cloze deletion, word bank fill |
| **Interactive** | 4 | Dialogue and response | Role play, question answering |
| **Analytical** | 5 | Error detection and analysis | Error correction, grammar identification |

Each task type includes rich metadata:
- **Cognitive processes** engaged (recognition, recall, synthesis, etc.)
- **Mastery range** (which learner stages it's appropriate for)
- **Component focus** (phonological, morphological, lexical, syntactic, pragmatic)
- **Difficulty and cognitive load** ratings
- **Response format** (multiple choice, typing, audio recording, etc.)

### Task Constraint Solver

A **constraint satisfaction engine** (a system that finds solutions matching multiple requirements simultaneously) that selects appropriate vocabulary for tasks.

Key capabilities:
- Filters objects by mastery stage, domain, and component
- Scores objects on difficulty fit, recency, and review due status
- Ensures collocation pairs appear together when needed
- Returns ranked results with rejection reasons for debugging

### Distractor Generator

Creates **plausible wrong answers** for multiple choice questions using linguistic strategies:

| Strategy | Description | Example |
|----------|-------------|---------|
| `phonological_similar` | Similar sounding | "their" vs "there" |
| `orthographic_similar` | Similar spelling | "affect" vs "effect" |
| `semantic_related` | Same category | "apple" vs "orange" (both fruits) |
| `morphological_variant` | Different form | "run" vs "running" |
| `common_confusion` | L1 interference | "make" vs "do" (Spanish speakers) |
| `translation_false_friend` | False cognates | "actual" (Spanish: current) |

---

## Technical Concepts (Plain English)

### Barrel Export
**Technical**: A module pattern where a single `index.ts` file re-exports symbols from multiple internal files, creating a unified public API.

**Plain English**: Like a department store's ground floor - instead of customers needing to know which floor sells shoes vs. electronics, there's a directory at the entrance that points them to everything. Internal reorganization (moving departments between floors) doesn't require updating every customer's mental map.

**Why We Use It**: Allows the internal structure of the tasks module to change without breaking every file that imports from it.

### Constraint Satisfaction
**Technical**: Finding values that satisfy multiple constraints simultaneously, often using scoring and elimination.

**Plain English**: Like a matchmaking service that finds a person who: lives nearby, shares your hobbies, is in your age range, and is available on weekends. No single criterion is enough; you need to satisfy many at once.

**Why We Use It**: Selecting vocabulary for a task must satisfy mastery level, component focus, domain, and difficulty - all at once.

### Distractor Plausibility
**Technical**: A measure (0-1) of how believable a wrong answer is, balancing the need to be wrong with the need to seem potentially correct.

**Plain English**: Like a lie detector test - the wrong answers need to be good enough lies that someone who doesn't know the material might fall for them, but not so obvious that the question becomes unfair.

**Why We Use It**: Too-easy distractors don't test real knowledge; too-hard distractors frustrate learners. The plausibility score helps calibrate difficulty.

### Cognitive Load
**Technical**: The mental effort required to complete a task, measured on a 1-5 scale based on working memory demands.

**Plain English**: Like physical weight - some exercises are light (recognition tasks), while others are heavy lifting (essay writing). You don't ask someone who just started training to deadlift 300 pounds.

**Why We Use It**: Matching cognitive load to learner capacity prevents overwhelm and boredom.

---

## Change History

### 2026-01-04 - Initial Implementation
- **What Changed**: Created barrel export for tasks module implementing Gap 4.6
- **Why**: Need centralized task type library for exercise generation
- **Impact**: Enables adaptive task selection across the entire application

---

## Related Documentation

- `docs/narrative/src/core/tasks/traditional-task-types.md` - Detailed task type documentation
- `docs/narrative/src/core/tasks/task-constraint-solver.md` - Constraint solver deep dive
- `docs/narrative/src/core/tasks/distractor-generator.md` - Distractor generation strategies
- `docs/narrative/src/core/content/pedagogical-intent.md` - Intent system integration
