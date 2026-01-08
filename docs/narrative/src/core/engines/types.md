# LOGOS Unified Engine Types

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/engines/types.ts`
> **Status**: Active

---

## Context & Purpose

This file defines the **unified type system** for LOGOS's 5 integrated engines. It exists to provide a consistent, type-safe foundation for approximately 30 individual algorithms that power the language learning system.

**Business Need**: LOGOS needs to orchestrate multiple complex algorithms (co-occurrence analysis, distributional statistics, multi-dimensional evaluation, phonological training, and session optimization) in a cohesive way. Without a unified type system, each engine would develop incompatible interfaces, making integration fragile and maintenance costly.

**When Used**: These types are imported whenever any engine is instantiated, configured, or invoked. They serve as the **contract layer** between the engine implementations and their consumers (IPC handlers, services, and the UI layer).

### Design Philosophy

The type system follows three core principles:

1. **Maximize Reuse**: Rather than creating entirely new types, this file extends and composes types from `src/core/types.ts`. For example, `CooccurrenceResult` extends the existing `PMIResult` rather than duplicating its structure.

2. **Composition Over Invention**: New types are built by combining existing types. `AdaptiveEvaluationResult` extends `MultiComponentEvaluation`, adding genre-specific layers without reinventing evaluation scoring.

3. **Shared Contract**: All five engines implement the same `BaseEngine<TConfig, TInput, TOutput>` interface, ensuring consistent instantiation, configuration, processing, and lifecycle management patterns.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

This file imports extensively from the core type system:

- `src/core/types.ts`:
  - `LanguageObjectType`, `LanguageObject`, `ComponentCode`, `ComponentType` - Language object classification
  - `PMIResult`, `Collocation` - PMI and co-occurrence primitives
  - `EvaluationMode`, `EvaluationLayer`, `AnswerRange`, `ObjectEvaluationConfig`, `MultiComponentEvaluation`, `ComponentEvaluation` - Evaluation framework
  - `MasteryStage`, `MasteryState`, `FSRSCard` - Learning state tracking
  - `SessionConfig`, `SessionState` - Session management
  - `ThetaEstimate`, `ItemParameter` - IRT ability estimation
  - `FREMetrics`, `PriorityCalculation` - Learning priority calculation
  - `TransferCoefficients` - L1-L2 transfer effects
  - `G2PDifficulty` - Grapheme-to-phoneme difficulty scoring

### Dependents (What Needs This)

The engine type definitions are consumed by:

- `src/core/engines/e1-cooccurrence.ts`: Implements `BaseEngine` using `CooccurrenceEngineConfig`, `CooccurrenceInput`, `CooccurrenceResult`
- `src/core/engines/e2-distributional.ts`: Implements `BaseEngine` using `DistributionalEngineConfig`, `DistributionalInput`, `DistributionalResult`
- `src/core/engines/e3-evaluation.ts`: Implements `BaseEngine` using `EvaluationEngineConfig`, `AdaptiveEvaluationInput`, `AdaptiveEvaluationResult`
- `src/core/engines/e4-phonological.ts`: Implements `BaseEngine` using `PhonologicalEngineConfig`, `PhonologicalOptimizationInput`, `PhonologicalOptimizationResult`
- `src/core/engines/e5-session.ts`: Implements `BaseEngine` using `SessionEngineConfig`, `SessionOptimizationInput`, `SessionOptimizationResult`
- `src/core/engines/index.ts`: Re-exports all types for external consumers
- `src/main/services/*`: Service layer consumes engine types for business logic
- `src/main/ipc/*`: IPC handlers use these types for renderer-main communication

### Data Flow

```
Core Types (src/core/types.ts)
           |
           v
Engine Types (this file)
           |
           +---> Engine Implementations (e1-e5)
           |
           +---> Engine Factory (creates instances)
           |
           +---> IPC Handlers (expose to renderer)
           |
           v
     Renderer UI (displays results)
```

---

## Macroscale: System Integration

### Architectural Layer

This file sits at **Layer 2 (Core Algorithm Contracts)** in the LOGOS architecture:

```
Layer 0: Electron Main/Renderer Framework
Layer 1: Core Algorithms (src/core/*.ts) - Pure functions
Layer 2: Engine Contracts (this file) - Type definitions   <-- You are here
Layer 3: Engine Implementations (e1-e5) - Stateful engines
Layer 4: Services (src/main/services) - Business orchestration
Layer 5: IPC Handlers (src/main/ipc) - API exposure
Layer 6: Renderer UI (src/renderer) - User interface
```

### Big Picture Impact

The unified engine types enable the entire **adaptive learning pipeline**:

1. **E1 (Co-occurrence)**: Powers vocabulary relationship discovery, enabling contextual learning suggestions
2. **E2 (Distributional)**: Analyzes learner performance distributions, detecting outliers and gaps
3. **E3 (Evaluation)**: Provides genre-adaptive scoring, making assessments contextually relevant
4. **E4 (Phonological)**: Optimizes pronunciation training sequences based on L1-L2 contrasts
5. **E5 (Session)**: Orchestrates learning sessions with cognitive load management and interleaving

Without this unified type system:
- Engines would have incompatible interfaces
- Configuration management would fragment
- Cross-engine optimization (e.g., session optimizer using evaluation results) would require brittle adapters
- Type safety would erode at integration boundaries

### Critical Path Analysis

**Importance Level**: Critical

- If types become inconsistent: Runtime errors cascade through all engines
- If `BaseEngine` contract breaks: All engine implementations and consumers must be updated
- If configuration defaults are wrong: Learning optimization degrades silently

**Failure Modes**:
- Type mismatches between engines and consumers cause TypeScript compilation failures (caught early)
- Configuration schema changes require coordinated updates (manageable with migrations)
- Missing optional fields cause subtle behavior differences (addressed by strict default configurations)

---

## Technical Concepts (Plain English)

### BaseEngine<TConfig, TInput, TOutput>

**Technical**: A generic interface using TypeScript type parameters to define a consistent contract for all engines. Specifies `engineId`, `version`, `config` properties and `updateConfig()`, `process()`, `processBatch()`, `reset()` methods.

**Plain English**: Think of this as a **universal adapter plug**. Just like all electrical outlets in a region share the same shape so any device can connect, all LOGOS engines share the same interface so any part of the system can use them the same way. The `TConfig`, `TInput`, `TOutput` parts are like "slots" that each engine fills with its specific types.

**Why We Use It**: Enables polymorphic engine handling - the session optimizer can work with any engine without knowing its specific implementation details.

### ObjectPairType (28 Combinations)

**Technical**: Represents all possible pairings of 7 language object types (LEX, MWE, TERM, MORPH, G2P, SYNT, PRAG). With 7 same-type pairs and 21 cross-type pairs (7 choose 2), this yields 28 total combinations.

**Plain English**: Imagine a classroom with 7 different types of students. `ObjectPairType` represents **every possible pair of students** you could form for a group project - including pairing two students of the same type. That's 28 different pair configurations.

**Why We Use It**: The co-occurrence engine needs to analyze relationships between *any* language objects, not just word-to-word. A morphological pattern can co-occur with a pragmatic convention, and capturing these relationships requires representing all 28 pair types.

### DistributionDimension (5 Dimensions)

**Technical**: An enumerated type with values `frequency`, `variance`, `style`, `complexity`, and `domain`, representing orthogonal dimensions for distributional analysis.

**Plain English**: When analyzing how a learner's vocabulary spreads across different characteristics, we look at **5 different yardsticks**: how often words appear (frequency), how consistent usage is (variance), what register they belong to (style), how hard they are (complexity), and what field they belong to (domain). It's like evaluating a restaurant on food quality, service, ambiance, value, and location separately.

**Why We Use It**: Multi-dimensional analysis reveals where learners have gaps. A learner might have good frequency coverage but poor domain diversity - these dimensions expose that.

### InterleavingStrategy (5 Strategies)

**Technical**: Defines how learning items are sequenced within a session: `pure_blocking` (AAA BBB CCC), `pure_interleaving` (ABC ABC ABC), `hybrid` (blocking then interleaving), `related` (interleave related items), and `adaptive` (adjust based on learner state).

**Plain English**: When practicing flashcards, you could study **all math cards first, then all language cards** (blocking), or **alternate between math and language** (interleaving), or **start with blocking then switch to interleaving** (hybrid). Research shows interleaving is harder during practice but leads to better long-term learning - like doing mixed drills in sports instead of just one skill at a time.

**Why We Use It**: The session optimizer needs to decide how to mix practice items. Beginners benefit from blocking (less confusion), while advanced learners benefit from interleaving (better discrimination). The `adaptive` strategy lets the system choose based on learner proficiency.

### PhonemeContrast

**Technical**: Represents the acoustic and perceptual distance between an L2 (target language) phoneme and the closest L1 (native language) phoneme, including predicted difficulty based on Flege's Speech Learning Model (SLM).

**Plain English**: When learning a new language, some sounds are **exactly like sounds in your native language** (easy), some are **similar but slightly different** (tricky - you might not notice the difference), and some are **completely new** (hard but learnable because you know you don't have it). This type captures that relationship - like mapping how far each new sound is from what you already know.

**Why We Use It**: Phonological training should prioritize sounds that are "similar but different" (highest confusion potential) over sounds that are identical or completely new. This type powers that prioritization.

### GenreEvaluationProfile

**Technical**: Associates a `TextGenreClassification` (domain, format, formality, length, purpose) with specific evaluation layers, weights, and threshold criteria for adaptive assessment.

**Plain English**: A casual email and a legal contract require **different grading criteria**. You wouldn't penalize informal language in a friendly email, but you would in a formal report. This type tells the evaluation engine which **grading rubric** to use based on what kind of text the learner is producing.

**Why We Use It**: One-size-fits-all evaluation frustrates learners and provides misleading feedback. Genre-adaptive evaluation makes assessment relevant to real-world communication needs.

### EngineResultMetadata

**Technical**: Standardized metadata accompanying all engine outputs, including `processingTimeMs`, `confidence` (0-1), `method` (algorithm used), and optional `warnings`.

**Plain English**: Every time an engine produces a result, this **receipt** accompanies it, telling you how long the calculation took, how confident the engine is in its answer, what algorithm it used, and any caveats to be aware of. It's like a lab report that comes with test results.

**Why We Use It**: Enables performance monitoring, confidence-based UI decisions (e.g., show uncertainty indicators), and debugging when results seem wrong.

---

## Engine-by-Engine Breakdown

### E1: UniversalCooccurrenceEngine

**Purpose**: Analyze co-occurrence relationships between ANY pair of language object types.

**Key Types**:
- `CooccurrenceObjectType`: Alias for `LanguageObjectType` - the 7 object categories
- `ObjectPairType`: Captures which two types are being compared
- `CooccurrenceInput`: Specifies two objects with optional context
- `CooccurrenceResult`: Extends `PMIResult` with `relationStrength` and pair type

**Configuration** (`CooccurrenceEngineConfig`):
- `windowSize`: How many words apart objects can be to count as co-occurring (default: 5)
- `minCooccurrence`: Minimum times pair must appear together (default: 2)
- `significanceThreshold`: Statistical threshold for meaningful relationships (default: 3.84, p < 0.05)

### E2: DistributionalAnalyzer

**Purpose**: Compute distribution statistics across 5 dimensions for any object collection.

**Key Types**:
- `DistributionDimension`: The 5 analysis dimensions
- `DistributionStatistics`: Mean, stdDev, median, skewness, kurtosis, quartiles
- `DistributionalInput`: Objects to analyze with target dimensions
- `DistributionalResult`: Per-dimension stats, gap analysis, outlier detection

**Configuration** (`DistributionalEngineConfig`):
- `outlierThreshold`: Z-score beyond which items are flagged as outliers (default: 2.5)
- `minSampleSize`: Minimum objects needed for reliable statistics (default: 10)
- `styleClassification`: Markers for formal/informal classification

### E3: FlexibleEvaluationEngine

**Purpose**: Provide genre-adaptive, multi-layer evaluation with CEFR-aware scoring.

**Key Types**:
- `TextGenreClassification`: Domain, format, formality, length, purpose
- `GenreEvaluationProfile`: Evaluation layers and weights for a genre
- `AdaptiveEvaluationInput`: Response with expected answers and optional genre/level
- `AdaptiveEvaluationResult`: Extends `MultiComponentEvaluation` with adapted weights and layer details

**Configuration** (`EvaluationEngineConfig`):
- `defaultMode`: Evaluation mode when not genre-specified (default: `partial_credit`)
- `strictness`: Overall grading strictness (default: `normal`)
- `autoDetectGenre`: Whether to infer genre from content (default: true)

### E4: PhonologicalTrainingOptimizer

**Purpose**: Generate optimal phoneme training sequences based on L1-L2 contrasts.

**Key Types**:
- `PhonemeContrast`: L1-L2 phoneme mapping with acoustic distance and difficulty prediction
- `PhonologicalTrainingItem`: Single trainable unit with prerequisites and session estimates
- `PhonologicalOptimizationInput`: Learner's L1, target L2, current mastery, theta
- `PhonologicalOptimizationResult`: Recommended training sequence with minimal pairs

**Configuration** (`PhonologicalEngineConfig`):
- `orderingStrategy`: How to sequence phonemes - easiest first, most frequent first, or prerequisite-based (default: `prerequisite_based`)
- `minimalPairsPerPhoneme`: How many contrasting word pairs to generate per phoneme (default: 5)

### E5: SessionOptimizer

**Purpose**: Optimize learning session item sequences for maximum retention and engagement.

**Key Types**:
- `InterleavingStrategy`: How to mix item types within a session
- `SessionItemPlacement`: Position and rationale for each item in the session
- `SessionOptimizationInput`: Session config, candidate items, learner state
- `SessionOptimizationResult`: Optimized sequence with break recommendations and efficiency metrics

**Configuration** (`SessionEngineConfig`):
- `maxCognitiveLoad`: Maximum simultaneous items in working memory (default: 7, Miller's Law)
- `breakIntervalMinutes`: When to suggest breaks (default: 25, Pomodoro-aligned)
- `defaultStrategy`: Default interleaving approach (default: `adaptive`)
- `levelStrategyMap`: CEFR level to strategy mapping (A1 = blocking, C2 = pure interleaving)
- `targetRetention`: FSRS target memory retention rate (default: 0.9)

---

## Default Configurations

The file exports sensible defaults for immediate engine instantiation:

| Configuration | Key Defaults |
|---------------|--------------|
| `DEFAULT_COOCCURRENCE_CONFIG` | windowSize: 5, minCooccurrence: 2, significanceThreshold: 3.84 |
| `DEFAULT_DISTRIBUTIONAL_CONFIG` | outlierThreshold: 2.5, minSampleSize: 10 |
| `DEFAULT_EVALUATION_CONFIG` | mode: partial_credit, strictness: normal, autoDetectGenre: true |
| `DEFAULT_PHONOLOGICAL_CONFIG` | strategy: prerequisite_based, minimalPairs: 5 per phoneme |
| `DEFAULT_SESSION_CONFIG` | maxLoad: 7, breaks: 25min, strategy: adaptive, retention: 0.9 |

These defaults enable zero-configuration engine startup while remaining fully overridable.

---

## Change History

### 2026-01-08 - Documentation Created
- **What Changed**: Initial narrative documentation for unified engine types
- **Why**: Part of Shadow Map documentation initiative for complete codebase understanding
- **Impact**: Enables new developers and AI agents to understand engine architecture context

### Initial Implementation
- **What Changed**: Created unified type system for 5 integrated engines
- **Why**: Consolidate ~30 individual algorithms under consistent interfaces
- **Impact**: Enables polymorphic engine handling, consistent configuration, and type-safe integration across the entire LOGOS learning pipeline
