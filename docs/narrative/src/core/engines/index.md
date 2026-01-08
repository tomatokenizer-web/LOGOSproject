# LOGOS Unified Engine Layer Entry Point

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/engines/index.ts`
> **Status**: Active (In Development)

---

## Context & Purpose

This file is the **central gateway** to LOGOS's Unified Engine Layer, a strategic architecture designed to consolidate approximately 30 individual algorithms scattered throughout the codebase into 5 coherent, integrated engines. It exists to provide a single, consistent entry point for accessing complex algorithmic capabilities while preserving the modularity and testability of the underlying implementations.

**Business Need**: LOGOS has accumulated a rich library of psychometric, linguistic, and pedagogical algorithms (IRT, FSRS, PMI, morphological analysis, G2P, etc.). Without unification, consumers of these algorithms face:
- Inconsistent APIs across algorithm types
- No clear guidance on which algorithm to use for which purpose
- Difficulty combining multiple algorithms for complex operations
- Maintenance burden spread across 30+ individual files

The Unified Engine Layer solves this by providing **domain-organized facades** that group related algorithms under intuitive names and standardized interfaces.

**When Used**:
- When services need to perform complex analytical operations spanning multiple algorithms
- When the system needs to evaluate learner performance across multiple dimensions simultaneously
- When phonological or session optimization requires orchestrating multiple underlying functions
- When new features need co-occurrence or distributional analysis without understanding implementation details

**Design Philosophy (The Three Principles)**:

The engines layer adheres to three strict design principles that differentiate it from the raw algorithm exports in `@core`:

1. **Wrap, Never Rewrite**: Engines wrap existing functions from `@core/irt`, `@core/pmi`, `@core/fsrs`, etc. They add orchestration, not reimplementation. If an algorithm needs improvement, fix it at the source, not in the engine wrapper.

2. **Extension Points**: Engines expose hooks for future capability without modifying core engine code. New evaluation criteria, new co-occurrence relationship types, or new optimization strategies can be added through configuration rather than code changes.

3. **Configuration Separation**: Engine behavior is driven by external configuration (thresholds, weights, feature flags) rather than hardcoded values. This enables A/B testing, user-specific tuning, and research experimentation without redeployment.

---

## Microscale: Direct Relationships

### Dependencies (What This Module Re-exports From)

This barrel file aggregates exports from **6 sources**:

**Type Definitions:**
- `./types.ts`: Unified type definitions for all 5 engines (interfaces for engine inputs, outputs, configurations)

**The Five Engines:**
- `./e1-cooccurrence.ts`: **UniversalCooccurrenceEngine** (E1)
  - Wraps PMI, collocation analysis, semantic network functions
  - Provides unified co-occurrence relationship detection across all object types

- `./e2-distributional.ts`: **DistributionalAnalyzer** (E2)
  - Wraps frequency analysis, variance calculation, style/register profiling
  - Provides distribution-based insights for corpus and learner data

- `./e3-evaluation.ts`: **FlexibleEvaluationEngine** (E3)
  - Wraps IRT (1PL, 2PL, 3PL), MIRT **Multi-dimensional IRT** (an extension of IRT that models multiple latent abilities simultaneously, like modeling reading ability and listening ability as separate but correlated dimensions), and multi-criteria evaluation
  - Provides unified learner assessment across multiple dimensions

- `./e4-phonological.ts`: **PhonologicalTrainingOptimizer** (E4)
  - Wraps G2P **Grapheme-to-Phoneme** (rules that map written letters to spoken sounds), phonological difficulty analysis, pronunciation prediction
  - Optimizes learning sequences for pronunciation-heavy goals

- `./e5-session.ts`: **SessionOptimizer** (E5)
  - Wraps priority calculation, FSRS scheduling, bottleneck detection
  - Optimizes within-session item selection and pacing

### Dependents (What Will Use This Module)

**Expected Primary Consumers** (as the engines are implemented):
- `src/main/services/integrated-task-pipeline.service.ts`: Will use E3 for evaluation, E5 for session optimization
- `src/main/services/multi-layer-evaluation.service.ts`: Will use E3 for multi-dimensional assessment
- `src/main/services/task-composition.service.ts`: Will use E1 for co-occurrence context, E2 for distributional analysis
- `src/main/services/pmi.service.ts`: May migrate to use E1 for unified co-occurrence interface
- Future services requiring coordinated multi-algorithm operations

**Import Pattern:**
```typescript
// Full engine import
import {
  UniversalCooccurrenceEngine,
  DistributionalAnalyzer,
  FlexibleEvaluationEngine,
  PhonologicalTrainingOptimizer,
  SessionOptimizer
} from '@core/engines';

// Type-only import
import type {
  EngineConfig,
  CooccurrenceResult,
  EvaluationReport
} from '@core/engines';
```

### Data Flow Concept

```
Service Layer Request
         |
         v
    [engines/index.ts] -----> Selects appropriate engine(s)
         |
         +---> E1: CooccurrenceEngine
         |           |
         |           +---> PMICalculator (from @core/pmi)
         |           +---> SemanticNetwork (from @core/semantic-network)
         |           |
         |           v
         |      Returns unified co-occurrence relationships
         |
         +---> E2: DistributionalAnalyzer
         |           |
         |           +---> FrequencyAnalysis (from @core)
         |           +---> RegisterCalculator (from @core/register)
         |           |
         |           v
         |      Returns distribution metrics
         |
         +---> E3: FlexibleEvaluationEngine
         |           |
         |           +---> IRT functions (from @core/irt)
         |           +---> Quadrature (from @core/quadrature)
         |           |
         |           v
         |      Returns multi-dimensional evaluation
         |
         +---> E4: PhonologicalTrainingOptimizer
         |           |
         |           +---> G2P (from @core/g2p)
         |           +---> G2P-IRT (from @core/g2p-irt)
         |           |
         |           v
         |      Returns phonological learning path
         |
         +---> E5: SessionOptimizer
                     |
                     +---> Priority (from @core/priority)
                     +---> FSRS (from @core/fsrs)
                     +---> Bottleneck (from @core/bottleneck)
                     |
                     v
                Returns session optimization decisions
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits at **Layer 0.5: Engine Orchestration** in LOGOS's architecture:

```
Layer 3: UI (React/Renderer)
    ^
    | (via hooks)
    |
Layer 2: IPC Handlers (Main Process)
    ^
    | (via services)
    |
Layer 1: Services (Business Logic)
    ^
    | (imports from)
    |
[Layer 0.5: Unified Engine Layer] <-- YOU ARE HERE
    ^
    | (wraps and orchestrates)
    |
Layer 0: Core Algorithms (Pure Functions)
    |
    v
(No dependencies - pure functions only)
```

The engines layer introduces a **facade pattern** between raw algorithms and business logic. It doesn't add new mathematical capabilities, but provides:
- **Orchestration**: Combining multiple algorithms for complex operations
- **Abstraction**: Hiding algorithm selection logic from service consumers
- **Configuration**: Centralizing tunable parameters for each engine domain

### Big Picture Impact

**If This Module Didn't Exist:**
The application would still function using direct `@core` imports, but:
- Services would duplicate algorithm selection logic
- Multi-dimensional operations would require manual coordination
- Configuration would be scattered across service files
- Testing complex scenarios would require mocking many individual functions

**The Five Engines Enable:**

| Engine | Capability | Business Value |
|--------|------------|----------------|
| E1: UniversalCooccurrence | Cross-type relationship discovery | Richer learning context, better collocations |
| E2: Distributional | Frequency/variance/style analysis | Domain-appropriate content selection |
| E3: FlexibleEvaluation | Multi-dimensional assessment | Precise learner modeling across skills |
| E4: Phonological | Pronunciation optimization | Efficient phonological skill development |
| E5: Session | Within-session optimization | Maximized learning per session |

### Why Five Engines?

The engine grouping reflects the **natural domains** of language learning optimization:

1. **Co-occurrence (E1)**: "What goes with what?" - Relationships between language objects
2. **Distribution (E2)**: "How common and where?" - Statistical properties of language use
3. **Evaluation (E3)**: "How well does the learner know it?" - Psychometric measurement
4. **Phonology (E4)**: "How hard is it to pronounce?" - Sound system optimization
5. **Session (E5)**: "What should come next?" - Learning path optimization

These five domains cover the full cycle of adaptive language learning:
- E2 tells us what content exists and where
- E1 tells us how content relates
- E3 tells us where the learner is
- E4 addresses the uniquely challenging domain of pronunciation
- E5 decides what to do next

### Critical Path Analysis

**Importance Level**: HIGH (Strategic)

While individual algorithms in `@core` are critical for computation, the engines layer is critical for **scalability and maintainability**. As LOGOS grows:
- Without engines: O(n) complexity for services to understand algorithms
- With engines: O(1) complexity through stable engine interfaces

**Current State**: The barrel export exists but individual engine files (e1-e5) are **pending implementation**. This file establishes the architectural contract that will be fulfilled as engines are built.

**Dependencies for Full Implementation**:
1. `./types.ts` - Define unified interfaces
2. Each engine file - Implement wrapper logic around existing `@core` functions
3. Configuration schema - Define engine parameters

---

## Technical Concepts (Plain English)

### Unified Engine Layer
**Technical**: A facade pattern implementation that groups related algorithms into domain-specific orchestration classes, providing consistent APIs and configuration injection points.

**Plain English**: Like a universal remote control for all your algorithms. Instead of having separate buttons for TV, sound system, and streaming box, you get one remote with "Watch Movie" that coordinates everything automatically.

**Why We Use It**:
- Simplifies service code (one import instead of many)
- Enables complex operations without understanding internals
- Centralizes configuration and tuning

### Barrel Export Pattern
**Technical**: A module that re-exports other modules' exports, aggregating them into a single import point. Uses `export * from './module'` syntax.

**Plain English**: Like a department store directory. Instead of knowing which floor and aisle each product is on, you look at the directory at the entrance. The barrel export is that directory for engine functionality.

**Why We Use It**:
- Clean imports (`from '@core/engines'` instead of 5 separate imports)
- Freedom to reorganize engine internals without breaking consumers
- Single place to audit what's publicly available

### Wrapper Functions (The "Wrap, Never Rewrite" Principle)
**Technical**: Functions that delegate to existing implementations while adding orchestration, parameter transformation, or result aggregation logic. Wrappers do not duplicate the core algorithm logic.

**Plain English**: Like a personal assistant who knows which expert to call for each problem. The assistant doesn't do the expert's job but knows how to reach them, what information they need, and how to translate their answer back to you.

**Why We Use It**:
- Single source of truth for algorithms (in `@core`)
- Engines add value through coordination, not reimplementation
- Bug fixes in `@core` automatically benefit engines

### Extension Points
**Technical**: Defined interfaces or hooks in the engine architecture that allow adding new capabilities without modifying existing engine code. Typically implemented via configuration objects, strategy patterns, or plugin systems.

**Plain English**: Like a USB port on a computer. You can plug in keyboards, mice, drives, or devices that didn't exist when the computer was built. Extension points are USB ports for engine capabilities.

**Why We Use It**:
- Future-proofing without code changes
- Research experimentation (try new algorithms without risking stable code)
- User-specific customization

### Configuration Separation
**Technical**: Externalizing tunable parameters (thresholds, weights, feature flags) from code into configuration files, databases, or environment variables. Enables runtime adjustment without recompilation.

**Plain English**: Like a car's dashboard settings. You can adjust seat position, mirror angle, and climate without opening the hood. Engine configuration lets you adjust algorithm behavior without opening the code.

**Why We Use It**:
- A/B testing different parameter values
- Per-user or per-goal optimization
- Research experiments with clean separation from production code

---

## Design Decisions

### Why a Separate `engines` Directory?

The core module already exports all algorithms. Why create a separate `engines` directory?

1. **Separation of Concerns**: `@core` = pure algorithms, `@core/engines` = orchestration and coordination
2. **Independent Evolution**: Engines can add features without touching stable algorithm code
3. **Testing Boundaries**: Engine tests focus on orchestration; algorithm tests focus on correctness
4. **Import Clarity**: `from '@core'` = direct algorithm access; `from '@core/engines'` = coordinated access

### Why Five Engines?

The number 5 wasn't arbitrary. It emerged from analyzing LOGOS's operational domains:

- **E1-E2**: Data-side (analyzing language objects and corpus)
- **E3**: Assessment-side (measuring learner state)
- **E4**: Specialty domain (phonology deserves dedicated optimization)
- **E5**: Decision-side (what to do next)

Each engine owns a clear responsibility that doesn't overlap with others.

### Why Korean Comments in Source?

The source file contains Korean comments reflecting the development team's primary language. This is intentional:
- Design documents use bilingual explanations
- Korean comments provide cultural context for pedagogical decisions
- English variable names ensure code readability for international collaboration

---

## The Engine Roadmap

### Current State (2026-01-08)
- Barrel export structure established
- Type definitions pending (`./types.ts`)
- Individual engine implementations pending (`./e1-e5`)

### Implementation Order
1. **E5: SessionOptimizer** - Most immediate value for learning loop
2. **E3: FlexibleEvaluationEngine** - Enables diagnostic assessment improvements
3. **E1: UniversalCooccurrenceEngine** - Enhances context-aware learning
4. **E2: DistributionalAnalyzer** - Improves content selection
5. **E4: PhonologicalTrainingOptimizer** - Addresses specialty domain last

### Success Criteria
Each engine is "complete" when:
- It wraps all relevant `@core` functions
- It provides configuration injection
- It has extension points documented
- It has integration tests covering orchestration logic

---

## Change History

### 2026-01-08 - Narrative Documentation Created
- **What Changed**: Added comprehensive shadow documentation for engines entry point
- **Why**: Support Shadow Map documentation system for maintainability
- **Impact**: Establishes architectural understanding for engine development

### 2026-01-07 - Initial Barrel Export Structure
- **What Changed**: Created `src/core/engines/index.ts` with exports for types and 5 engine modules
- **Why**: Establish architectural foundation for Unified Engine Layer
- **Impact**: Defines the contract for upcoming engine implementations

---

## Relationship Map

```
                         +----------------------+
                         |   engines/index.ts   |
                         |   (This File)        |
                         +----------+-----------+
                                    |
           +------------------------+------------------------+
           |                        |                        |
           v                        v                        v
    +------------+          +---------------+         +----------------+
    | types.ts   |          | 5 Engine Files|         | Configuration  |
    | (Unified   |          | (e1-e5)       |         | (Future)       |
    | Interfaces)|          +---------------+         +----------------+
    +------------+                  |
                                    |
        +----------+----------+-----+-----+----------+
        |          |          |          |          |
        v          v          v          v          v
     +----+     +----+     +----+     +----+     +----+
     | E1 |     | E2 |     | E3 |     | E4 |     | E5 |
     +----+     +----+     +----+     +----+     +----+
        |          |          |          |          |
        v          v          v          v          v
    [PMI,      [Freq,     [IRT,      [G2P,      [FSRS,
     Sem.Net]   Reg.Calc]  Quad]      G2P-IRT]   Priority,
                                                 Bottleneck]
```

---

## Usage Examples (Future)

### Coordinated Evaluation (E3)
```typescript
import { FlexibleEvaluationEngine } from '@core/engines';

const engine = new FlexibleEvaluationEngine(config);
const report = engine.evaluateMultiDimensional(responses, {
  dimensions: ['LEX', 'SYNT', 'PRAG'],
  model: '2PL',
  estimationMethod: 'EAP'
});

// report.thetaByDimension: { LEX: 0.5, SYNT: -0.2, PRAG: 0.1 }
// report.overallTheta: 0.13
// report.reliability: 0.85
```

### Session Optimization (E5)
```typescript
import { SessionOptimizer } from '@core/engines';

const optimizer = new SessionOptimizer(sessionConfig);
const plan = optimizer.planSession({
  goalId: 'goal-123',
  remainingTime: 15, // minutes
  learnerState: currentState
});

// plan.items: [{ objectId: 'word-1', taskType: 'recall' }, ...]
// plan.pacing: { itemsPerMinute: 2, breakAt: 10 }
// plan.bottleneckFocus: 'MORPH'
```

### Co-occurrence Analysis (E1)
```typescript
import { UniversalCooccurrenceEngine } from '@core/engines';

const engine = new UniversalCooccurrenceEngine(corpusConfig);
const relationships = engine.findRelationships('patient', {
  types: ['collocation', 'semantic', 'morphological'],
  minStrength: 0.5
});

// relationships: [
//   { type: 'collocation', related: 'care', strength: 0.82 },
//   { type: 'semantic', related: 'client', strength: 0.71 },
//   { type: 'morphological', related: 'patience', strength: 0.65 }
// ]
```
