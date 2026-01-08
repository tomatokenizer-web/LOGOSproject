# E3: FlexibleEvaluationEngine - Genre-Adaptive Multi-Dimensional Evaluation System

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/engines/e3-evaluation.ts`
> **Status**: Active
> **Engine ID**: `e3-evaluation`
> **Version**: 1.0.0

---

## Context & Purpose

The FlexibleEvaluationEngine exists to solve a fundamental challenge in language assessment: **different types of writing require different evaluation criteria**. An email to a friend should not be judged by the same standards as an academic essay or a technical manual.

This engine provides a **genre-adaptive evaluation system** that automatically detects the type of text being assessed and applies appropriate evaluation weights across multiple dimensions. It recognizes that a learner's proficiency level also affects what aspects of their response matter most - beginners need to focus on form and spelling, while advanced learners should demonstrate pragmatic awareness and stylistic sophistication.

**Business Need**: Language learners receive feedback that is calibrated to both the type of text they are producing AND their proficiency level, making assessment more fair, meaningful, and pedagogically useful.

**When Used**:
- Every time a learner submits a written response for evaluation
- When the system needs to score open-ended writing tasks
- During rubric-based assessment of complex productions
- When generating adaptive feedback based on learner level

---

## Academic Foundations (Plain English)

### Multidimensional Item Response Theory (MIRT)
**Technical**: MIRT extends classical Item Response Theory to measure multiple latent traits simultaneously, allowing a single response to provide information about several underlying abilities.

**Plain English**: Instead of giving one overall "correct/incorrect" score, the system looks at your response from multiple angles at once - like how a dance judge might score technique, artistry, and timing separately, then combine them into a final score.

**Why We Use It**: A single sentence can reveal information about vocabulary knowledge, grammar mastery, and pragmatic awareness all at once. MIRT lets us extract and track all these dimensions from each response.

### Genre-Based Evaluation (Biber, 1988)
**Technical**: Douglas Biber's research demonstrated that texts vary systematically along multiple dimensions depending on their genre and register, requiring differentiated evaluation criteria.

**Plain English**: The words and structures that make a business email effective are different from those that make a casual text message effective. What counts as "good writing" depends heavily on what kind of writing it is.

**Why We Use It**: We cannot fairly evaluate a casual conversation response using formal academic essay criteria. The engine detects genre and adjusts its expectations accordingly.

### Partial Credit Model
**Technical**: Unlike binary (correct/incorrect) scoring, the Partial Credit Model awards proportional scores for responses that demonstrate partial understanding or competence.

**Plain English**: Instead of pass/fail, the system recognizes degrees of correctness - like getting 80% credit for a response that has the right idea but a spelling error, rather than zero credit.

**Why We Use It**: Language learning involves gradual improvement. Partial credit encourages learners by recognizing progress and provides more precise diagnostic information.

### CEFR Level-Based Weight Adjustment
**Technical**: The Common European Framework of Reference (CEFR) defines six proficiency levels (A1-C2). Evaluation layer weights are dynamically adjusted based on the learner's current level.

**Plain English**: A beginner (A1) is primarily assessed on spelling and basic meaning, while an advanced learner (C2) is held to high standards for style and pragmatic appropriateness. The system shifts its focus as you improve.

**Why We Use It**: Fair assessment means appropriate expectations. A C2-level pragmatic error is more significant than an A1-level pragmatic error because the learner should know better.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

**From `src/core/engines/types.ts`:**
- `BaseEngine`: The interface contract that all LOGOS engines must implement - provides the standard `process()`, `processBatch()`, `updateConfig()`, and `reset()` methods
- `EvaluationEngineConfig`: Configuration type defining default mode, threshold, strictness, genre profiles, and auto-detection settings
- `AdaptiveEvaluationInput`: Input type specifying response text, expected answers, optional genre, learner level, and components to evaluate
- `AdaptiveEvaluationResult`: Output type extending `MultiComponentEvaluation` with layer results, adapted weights, and metadata
- `TextGenreClassification`: Genre classification structure (domain, format, formality, length, purpose)
- `GenreEvaluationProfile`: Complete evaluation profile for a genre including required/optional layers and thresholds
- `EngineResultMetadata`: Standard metadata (processing time, confidence, method, warnings)

**From `src/core/types.ts`:**
- `EvaluationMode`: Enum of evaluation modes ('binary', 'partial_credit', 'range_based', 'rubric_based')
- `EvaluationLayer`: Layer definition with ID, name, weight, evaluator, threshold, and feedback
- `ComponentEvaluation`: Per-component evaluation result with correctness, partial credit, and feedback
- `ComponentCode`: The five linguistic component codes ('PHON', 'MORPH', 'LEX', 'SYNT', 'PRAG')

### Dependents (What Needs This)

**Task Processing Pipeline:**
- `src/main/services/task-processor.ts` (expected): Uses E3 to evaluate learner responses to generated tasks
- `src/main/services/response-handler.ts` (expected): Calls E3 to produce evaluation results that update mastery state

**Session Management:**
- `src/core/engines/e5-session.ts` (expected): Session optimizer may use evaluation results to adjust item selection

**Frontend Components:**
- `src/renderer/components/FeedbackDisplay.tsx` (expected): Displays layer-by-layer feedback generated by E3
- `src/renderer/components/EvaluationResult.tsx` (expected): Shows composite scores and grade information

### Data Flow

```
User Response
      |
      v
+------------------+
| AdaptiveInput    |   Response text + expected answers + optional genre/level
+------------------+
      |
      v
+------------------+
| Genre Detection  |   Analyzes text for domain, formality, length, format, purpose
+------------------+
      |
      v
+------------------+
| Profile Matching |   Finds best-fit GenreEvaluationProfile from registry
+------------------+
      |
      v
+------------------+
| Weight Blending  |   Combines profile weights with CEFR level adjustments
+------------------+
      |
      v
+------------------+
| Layer Evaluation |   Scores each layer (form, meaning, pragmatics, style)
+------------------+
      |
      v
+------------------+
| Score Aggregation|   Weighted composite score + grade determination
+------------------+
      |
      v
+------------------+
| Feedback Gen     |   Generates adaptive feedback based on grade and weak layers
+------------------+
      |
      v
AdaptiveEvaluationResult (compositeScore, layerResults, feedback, grade)
```

---

## Macroscale: System Integration

### Architectural Layer

E3 sits in the **Core Algorithm Layer** of LOGOS's three-tier architecture:

```
Layer 1: Presentation (Renderer/UI)
    |
    | User responses, display feedback
    v
Layer 2: Application Services (Main Process)
    |
    | Task processing, response handling
    v
+-------------------------------------------+
| Layer 3: CORE ALGORITHMS (E1-E5 Engines)  |
|                                           |
|   E1: Co-occurrence     E2: Distribution  |
|   E3: EVALUATION <--    E4: Phonological  |
|   E5: Session                             |
+-------------------------------------------+
    |
    | Evaluation results feed back to mastery/scheduling
    v
Layer 4: Data Persistence (SQLite via Drizzle)
```

E3 is **stateless** - it does not maintain internal state between calls. Each evaluation is independent, making it thread-safe and easily testable.

### Big Picture Impact

The FlexibleEvaluationEngine enables the entire **assessment and feedback loop** in LOGOS:

1. **Fair Assessment**: Learners receive scores calibrated to text type and proficiency level
2. **Diagnostic Feedback**: Layer-by-layer breakdown identifies specific areas for improvement
3. **Mastery Updates**: Evaluation results feed into mastery state calculations (via E5)
4. **Adaptive Learning Path**: Weak layers inform what to practice next
5. **Progress Tracking**: Grade progression (fail -> pass -> merit -> distinction) shows improvement

**Downstream Dependencies:**
- **Mastery System**: Uses `compositeScore` and `componentEvaluations` to update stage
- **FSRS Scheduler**: Uses evaluation results to determine review difficulty rating
- **Priority Calculator**: Weak layer scores influence learning priority
- **Analytics Dashboard**: Aggregates layer scores over time for progress visualization

### Critical Path Analysis

**Importance Level**: Critical

E3 is on the **critical path** for all production and writing tasks:

- **If E3 fails**: Writing tasks cannot be scored, feedback cannot be generated, mastery cannot update
- **Failure mode**: System falls back to binary evaluation with generic feedback
- **Backup mechanism**: `quickFormEvaluation()` exported function provides minimal form-based scoring
- **Performance requirement**: Must complete evaluation within 100ms for responsive UX

**Reliability Considerations:**
- Stateless design prevents state corruption
- Graceful degradation when genre detection fails (uses default profile)
- All layer evaluators have fallback scores (0.5 for unknown cases)

---

## Core Components (Technical Deep Dive)

### CEFR Layer Weights

The engine maintains a lookup table mapping CEFR levels to evaluation layer weights:

| Level | Form | Meaning | Pragmatics | Style |
|-------|------|---------|------------|-------|
| A1    | 0.50 | 0.30    | 0.10       | 0.10  |
| A2    | 0.40 | 0.35    | 0.15       | 0.10  |
| B1    | 0.30 | 0.35    | 0.20       | 0.15  |
| B2    | 0.25 | 0.30    | 0.25       | 0.20  |
| C1    | 0.20 | 0.25    | 0.30       | 0.25  |
| C2    | 0.15 | 0.25    | 0.30       | 0.30  |

**Plain English**: As learners advance, the weight shifts from "Did you spell it right?" toward "Did you use it appropriately in context?"

### Four Evaluation Layers

1. **Form Accuracy (Levenshtein-based)**
   - Measures spelling and surface form correctness
   - Uses edit distance normalized by string length
   - Threshold: 0.8 (80% similarity required)

2. **Semantic Accuracy (Jaccard-based)**
   - Measures meaning overlap with expected answers
   - Uses word-set intersection over union
   - Threshold: 0.7 (70% word overlap required)

3. **Pragmatic Appropriateness (Heuristic)**
   - Measures contextual fit based on length and purpose keywords
   - Considers text length vs. expected length for genre
   - Threshold: 0.6 (60% appropriateness required)

4. **Style/Register Match (Marker-based)**
   - Detects formal markers (therefore, hence, consequently)
   - Detects informal markers (gonna, wanna, yeah)
   - Compares detected formality against target formality
   - Threshold: 0.5 (50% style match required)

### Genre Profiles (Pre-configured)

| Profile ID | Domain | Formality | Key Layer Weights | Pass Threshold |
|------------|--------|-----------|-------------------|----------------|
| academic-essay | academic | formal | meaning 0.35, style 0.25 | 0.60 |
| business-email | business | formal | pragmatics 0.30, meaning 0.30 | 0.60 |
| casual-conversation | casual | informal | meaning 0.35, pragmatics 0.35 | 0.50 |
| technical-manual | technical | formal | meaning 0.40, form 0.35 | 0.70 |

### Genre Detection Algorithm

The `detectGenre()` function analyzes input text to classify:

1. **Length**: Word count -> short (<30), medium (30-100), long (>100)
2. **Formality**: Presence of formal vs. informal markers
3. **Domain**: Keyword matching for academic, business, technical, creative
4. **Format**: Pattern matching for email, essay, manual structures
5. **Purpose**: Keyword detection for inform, persuade, instruct

**Fallback Behavior**: If auto-detection fails or is disabled, uses first available profile or default weights.

---

## Exported API

### Primary Class

```typescript
class FlexibleEvaluationEngine implements BaseEngine<
  EvaluationEngineConfig,
  AdaptiveEvaluationInput,
  AdaptiveEvaluationResult
>
```

**Key Methods:**
- `process(input)`: Main evaluation - returns full adaptive result
- `processBatch(inputs)`: Evaluates multiple responses in sequence
- `evaluateWithRubric(response, rubric)`: Detailed rubric-based scoring
- `addGenreProfile(profile)`: Register custom genre profiles
- `getGenreProfiles()`: Retrieve registered profiles

### Factory Function

```typescript
function createEvaluationEngine(config?: Partial<EvaluationEngineConfig>): FlexibleEvaluationEngine
```

Creates a configured engine instance with optional custom configuration.

### Utility Functions

```typescript
function quickFormEvaluation(response: string, expected: string[]): {
  score: number;
  bestMatch: string;
  isExact: boolean;
}
```
Fast form-only evaluation for simple use cases.

```typescript
function detectTextGenre(text: string): TextGenreClassification
```
Standalone genre detection without full evaluation.

```typescript
function getDefaultEvaluationLayers(): EvaluationLayer[]
```
Returns the default four-layer evaluation structure.

---

## Integration Patterns

### With Task Processor

```typescript
// After learner submits response
const engine = createEvaluationEngine({ autoDetectGenre: true });
const result = engine.process({
  response: learnerResponse,
  expected: task.expectedAnswers,
  learnerLevel: user.cefrLevel,
  evaluateComponents: ['LEX', 'SYNT']
});

// Use result to update mastery
updateMastery(result.componentEvaluations, result.compositeScore);

// Display feedback to learner
displayFeedback(result.feedback, result.layerResults);
```

### With Custom Genre Profile

```typescript
const engine = createEvaluationEngine();

// Add domain-specific profile (e.g., medical reports)
engine.addGenreProfile({
  profileId: 'medical-report',
  genre: {
    domain: 'medical',
    format: 'report',
    formality: 'formal',
    length: 'long',
    purpose: 'inform'
  },
  requiredLayers: getDefaultEvaluationLayers(),
  optionalLayers: [],
  layerWeights: { form: 0.30, meaning: 0.40, pragmatics: 0.15, style: 0.15 },
  thresholds: { pass: 0.65, merit: 0.80, distinction: 0.92 }
});
```

---

## Performance Characteristics

| Operation | Typical Time | Notes |
|-----------|--------------|-------|
| Single evaluation | 5-20ms | Depends on response length |
| Genre detection | 1-3ms | Keyword-based, very fast |
| Rubric evaluation | 10-30ms | Per-criterion scoring |
| Batch (10 items) | 50-200ms | Linear scaling |

**Memory Usage**: Minimal - stateless design, no persistent state
**Thread Safety**: Full - no shared mutable state

---

## Testing Considerations

### Unit Test Scenarios

1. **Layer Scoring**: Test each layer evaluator in isolation
2. **Weight Blending**: Verify CEFR weight + profile weight combination
3. **Genre Detection**: Test classification accuracy on sample texts
4. **Profile Matching**: Verify correct profile selection logic
5. **Edge Cases**: Empty responses, exact matches, no expected answers

### Integration Test Scenarios

1. **Full Pipeline**: Submit response -> evaluate -> verify feedback
2. **Level Progression**: Same response evaluated at different CEFR levels
3. **Genre Switching**: Same content evaluated under different genre profiles

---

## Change History

### 2026-01-08 - Initial Implementation
- **What Changed**: Created FlexibleEvaluationEngine with full genre-adaptive evaluation
- **Why**: Need differentiated evaluation criteria for different text types and learner levels
- **Impact**: Enables fair, meaningful assessment across all writing task types

### Key Implementation Decisions

1. **Stateless Design**: Chose stateless over stateful to simplify testing and enable parallelization
2. **Weight Blending (50:50)**: Equal blend of profile and CEFR weights for balanced adaptation
3. **Heuristic Evaluators**: Used lightweight heuristics over ML models for speed and determinism
4. **Graceful Degradation**: System continues with defaults if genre detection fails

---

## Related Documentation

- **E1 Engine**: `docs/narrative/src/core/engines/e1-cooccurrence.md` - Co-occurrence analysis
- **E2 Engine**: `docs/narrative/src/core/engines/e2-distributional.md` - Distributional analysis
- **E5 Engine**: `docs/narrative/src/core/engines/e5-session.md` (planned) - Session optimization
- **Core Types**: `docs/narrative/src/core/types.md` (planned) - Shared type definitions
- **Engine Types**: `docs/narrative/src/core/engines/types.md` (planned) - Engine-specific types

---

## References

- Biber, D. (1988). *Variation across speech and writing*. Cambridge University Press.
- Council of Europe. (2001). *Common European Framework of Reference for Languages*.
- de la Torre, J. (2011). The generalized DINA model framework. *Psychometrika*, 76(2), 179-199.
- Masters, G. N. (1982). A Rasch model for partial credit scoring. *Psychometrika*, 47(2), 149-174.
