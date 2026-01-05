# Task Generation Service (Layer 2)

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/services/task-generation.service.ts`
> **Status**: Active

---

## Context & Purpose

This service implements **Phase 3.2: Layer 2** of the LOGOS learning pipeline. While Layer 1 (State + Priority Service) decides *what* to teach next, Layer 2 decides *how* to teach it. The Task Generation Service transforms abstract learning queue items into concrete, interactive tasks that the learner actually sees and responds to.

**Business Need**: A language learning application cannot simply show the same flashcard format repeatedly. Effective learning requires adaptive task formats that match the learner's current mastery stage, provide appropriate scaffolding (hints and cues) when needed, and gradually remove support as competence grows. This service creates that adaptive experience.

**When Used**: Every time the learning session needs to present a new task to the user. After Layer 1 selects the next item from the learning queue, this service generates the actual task content - the prompt, answer options, hints, and context that appear on screen.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/main/db/prisma.ts`: `getPrisma()` - Obtains database connection for querying language objects and cached tasks
- `src/main/db/repositories/mastery.repository.ts`: `getMasteryState()` - Retrieves the learner's current mastery metrics (stage, accuracy, exposure count) for a given object
- `src/main/db/repositories/collocation.repository.ts`: `getCollocationsForWord()` - Fetches PMI-weighted word associations to provide meaningful context and related words in tasks
- `src/main/services/state-priority.service.ts`: `LearningQueueItem` type - Receives queue items from Layer 1 as input for task generation

### Dependents (What Needs This)

- **Learning Session Controller** (future): Will call `getOrGenerateTask()` to retrieve tasks during active learning sessions
- **IPC Handlers** (future): Will expose task generation to the Electron renderer process
- **Response Processing Service** (future): Will use `TaskSpec` and `GeneratedTask` types to validate user responses

### Data Flow

```
LearningQueueItem (from Layer 1)
        |
        v
generateTaskSpec() - Determines format, cue level, difficulty
        |
        v
generateTask() - Creates full task with prompts, options, hints
        |
        v
cacheTask() - Stores for future retrieval
        |
        v
GeneratedTask (to UI Layer)
```

---

## Macroscale: System Integration

### Architectural Layer

This service operates at **Layer 2** of the LOGOS three-layer learning pipeline:

- **Layer 1**: State + Priority (what to learn) - Analyzes user ability (theta), calculates priorities, manages queue
- **Layer 2**: Task Generation (how to learn) - **This module** - Transforms queue items into interactive tasks
- **Layer 3**: Response Processing (how did they do) - Evaluates responses, updates mastery, schedules reviews

The pipeline follows a cycle: Layer 1 selects items -> Layer 2 generates tasks -> User responds -> Layer 3 processes response -> Updates feed back to Layer 1.

### Big Picture Impact

The Task Generation Service is the **bridge between algorithmic decisions and learner experience**. Without it:

- Users would receive no visual/interactive content
- The sophisticated priority calculations from Layer 1 would have no outlet
- There would be no progressive scaffolding (the Gap 2.4 algorithm would be unusable)
- Task difficulty could not adapt to format or cue level
- Learning would stagnate at a single format (e.g., always MCQ)

This service enables:
- **Stage-Appropriate Learning**: Beginners get recognition tasks (MCQ), advanced learners get production tasks (free response)
- **Adaptive Scaffolding**: Struggling learners receive hints; competent learners practice without cues
- **Fluency vs. Versatility Balance**: High-PMI collocations for fluency, novel combinations for versatility
- **Efficient Content Delivery**: Caching prevents redundant task generation

### Critical Path Analysis

**Importance Level**: Critical

This is a **synchronous dependency** in the learning session path. Every learning interaction requires task generation:

1. If task generation fails: The user sees nothing - session cannot proceed
2. If caching fails: Performance degrades but learning can continue (graceful degradation)
3. If format selection fails: Falls back to default format (resilient)

**Failure Modes**:
- Database unavailable: Cannot generate tasks (catastrophic)
- Invalid queue item: Throws error, session must handle
- Missing collocations: Tasks still generate but lack context (degraded quality)

---

## Technical Concepts (Plain English)

### Task Format Progression

**Technical**: A stage-to-format mapping (`STAGE_FORMAT_MAP`) that associates mastery stages 0-4 with increasingly demanding task types: MCQ -> fill_blank -> matching -> ordering -> free_response.

**Plain English**: Think of learning a musical instrument. First you identify notes (recognition/MCQ), then play them when shown (fill-in-the-blank), then combine them in set patterns (matching/ordering), and finally improvise freely (free response). The system advances the "difficulty dial" as you improve.

**Why We Use It**: Recognition is cognitively easier than production. Starting with recognition builds confidence and schema before demanding recall. This mirrors natural language acquisition stages.

### Cue Level System (Gap 2.4 Algorithm)

**Technical**: A 0-3 integer scale representing scaffolding intensity, calculated from the **scaffolding gap** (difference between cue-assisted and cue-free accuracy). Higher gaps indicate the learner needs cues to succeed.

**Plain English**: Like training wheels on a bicycle. Level 3 is full training wheels (lots of hints), level 0 is riding solo. The system watches whether you succeed with or without hints - if you only succeed with hints, it keeps them longer; if you succeed without, it removes them faster.

**Why We Use It**: The Zone of Proximal Development (ZPD) theory suggests learning happens best when support matches the gap between what you can do alone and what you can do with help. Cues bridge that gap, then fade.

### Cue Levels Explained

| Level | Name | What the Learner Sees |
|-------|------|----------------------|
| 0 | None | No hints - complete recall required |
| 1 | Minimal | First letter hint: "Starts with 'A'" |
| 2 | Moderate | Length + partial reveal: "7 letters, begins with 'App...'" |
| 3 | Full | Strong scaffolding: "App____" (half the word visible) |

### Fluency vs. Versatility Tasks

**Technical**: A boolean flag (`isFluencyTask`) determined by mastery stage, cue-free accuracy, and a configurable ratio. Fluency tasks reinforce high-PMI (frequently co-occurring) word pairs; versatility tasks introduce novel combinations.

**Plain English**: Fluency is saying "bread and butter" automatically because you have heard it a thousand times. Versatility is being able to say "bread and marmalade" even though it is unusual. Early learning builds fluency (common patterns); later learning builds versatility (flexible usage). The system balances both.

**Why We Use It**: Native speakers have both fluent stock phrases AND creative flexibility. The system trains both skills explicitly rather than hoping versatility emerges naturally.

### IRT-Based Difficulty Calculation

**Technical**: Item Response Theory (IRT) provides a baseline difficulty parameter for each language object. Task difficulty is computed as: `IRT difficulty + format modifier + cue modifier`. Format modifiers increase difficulty for production tasks; cue modifiers decrease difficulty when hints are provided.

**Plain English**: A word might have intrinsic difficulty (e.g., "serendipity" is harder than "cat"). But asking you to *recognize* "serendipity" in a multiple-choice list is easier than asking you to *spell* it from memory. And giving you the first three letters makes it easier still. The system combines all three factors into one difficulty number.

**Why We Use It**: Accurate difficulty estimation enables optimal item selection (items slightly above current ability are best for learning). Without accounting for format and cues, the system would misjudge task difficulty.

### Task Caching with Expiration

**Technical**: Generated tasks are stored in a `CachedTask` database table with a composite key (objectId + taskType + taskFormat) and an expiration timestamp. `getOrGenerateTask()` implements a cache-first retrieval pattern.

**Plain English**: Like preparing meals in advance. Instead of cooking every task from scratch each time, the system stores recently-made tasks in a pantry. If the same task is needed again within 24 hours, it grabs the pre-made version. After 24 hours, tasks are considered "stale" and regenerated fresh.

**Why We Use It**: Task generation involves database queries, randomization, and potentially AI calls. Caching reduces latency and database load during active learning sessions while ensuring content stays reasonably fresh.

### MCQ Distractor Generation

**Technical**: The `generateMCQOptions()` function queries the database for language objects of the same type within the same goal, orders by frequency, shuffles, and selects a subset as distractors (wrong answers) alongside the correct answer.

**Plain English**: Good multiple-choice questions have plausible wrong answers. If you are learning "apple" and the wrong answers are "quantum" and "serendipity," the question is too easy. The system picks wrong answers that are similar in type (other nouns, other verbs) and commonly studied, making the learner actually think.

**Why We Use It**: Plausible distractors create desirable difficulty and reveal what the learner actually knows versus what they are guessing at.

---

## Function Reference

### Task Format Selection

| Function | Purpose |
|----------|---------|
| `selectTaskFormat(stage, preferProduction)` | Maps mastery stage to appropriate format, optionally biasing toward production |
| `shouldBeFluencyTask(stage, accuracy, ratio)` | Determines fluency vs. versatility focus based on current learning state |

### Cue Level Determination

| Function | Purpose |
|----------|---------|
| `determineCueLevel(cueFree, cueAssisted, exposure, max)` | Calculates scaffolding level from Gap 2.4 algorithm |
| `generateHints(content, cueLevel)` | Creates progressive hints for cue levels 1-3 |

### Task Difficulty

| Function | Purpose |
|----------|---------|
| `calculateTaskDifficulty(irtDiff, format, cueLevel)` | Combines IRT, format, and cue modifiers into effective difficulty |

### Task Generation

| Function | Purpose |
|----------|---------|
| `generateTaskSpec(item, config)` | Creates task specification (format, modality, cue level, difficulty) |
| `generateTask(item, config)` | Generates full task with prompts, options, hints, context |
| `generateMCQOptions(objectId, correct, count)` | Creates plausible distractors for multiple-choice tasks |
| `getOrGenerateTask(item, config)` | Cache-first task retrieval with automatic generation fallback |

### Caching

| Function | Purpose |
|----------|---------|
| `getCachedTask(objectId, taskType, taskFormat)` | Retrieves cached task if valid and not expired |
| `cacheTask(objectId, taskType, taskFormat, task, hours)` | Stores task with configurable expiration |

---

## Configuration Options

The `TaskGenerationConfig` interface allows customization:

| Option | Type | Default | Effect |
|--------|------|---------|--------|
| `preferredModality` | 'visual' / 'auditory' / 'mixed' | 'visual' | Presentation mode for task content |
| `maxCueLevel` | 0-3 | 3 | Caps scaffolding even if algorithm suggests more |
| `fluencyRatio` | 0-1 | 0.6 | Proportion of fluency vs. versatility tasks |
| `difficultyAdjustment` | -1 to 1 | 0 | Manual offset to IRT difficulty |

---

## Change History

### 2026-01-04 - Initial Documentation
- **What Changed**: Created narrative documentation for task generation service
- **Why**: Project requires shadow documentation for all code files
- **Impact**: Enables non-technical stakeholders to understand the task generation system

### [Original Implementation Date] - Service Creation
- **What Changed**: Implemented Phase 3.2 Layer 2 of learning pipeline
- **Why**: Learning sessions need adaptive task generation to present appropriate challenges
- **Impact**: Enables stage-appropriate, scaffolded, difficulty-adjusted learning tasks
