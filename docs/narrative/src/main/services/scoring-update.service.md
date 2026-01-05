# Scoring + Update Service (Layer 3)

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/services/scoring-update.service.ts`
> **Status**: Active
> **Phase**: 3.3 - Layer 3 of Learning Pipeline

---

## Context & Purpose

This service completes the adaptive learning loop by answering the critical question: *"How did the learner do, and what should change as a result?"*

The Scoring + Update Service is the **feedback processor** of the LOGOS learning pipeline. After Layer 1 decides what to teach and Layer 2 generates the task, Layer 3 captures the learner's response, evaluates its correctness, updates all mastery tracking systems, and feeds those updates back into the priority calculations that drive future learning.

**Business Need**: Without accurate response evaluation and systematic mastery updates, the system cannot adapt. A learner who struggles with verb conjugations would continue receiving the same ineffective tasks. A learner who masters vocabulary would be stuck reviewing material they already know. This service closes the loop, ensuring every response teaches the system something about the learner.

**When Used**:
- Every time a learner submits a response to a task
- At session end for batch processing of any pending responses
- When generating session summaries showing progress metrics
- During analytics generation that tracks learning outcomes over time

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

| File | Import | Purpose |
|------|--------|---------|
| `src/main/db/prisma.ts` | `getPrisma()` | Database connection for querying and updating mastery states |
| `src/main/db/repositories/mastery.repository.ts` | `updateMasteryState`, `recordExposure`, `updateFSRSParameters`, `transitionStage`, `StageTransition` | Persists mastery changes, accuracy updates, FSRS scheduling, and stage promotions/demotions |
| `src/main/db/repositories/session.repository.ts` | `recordResponse`, `recordStageTransition`, `recordTaskType`, `applyThetaRules`, `SessionMode`, `ThetaState` | Records response history, session metrics, fluency/versatility tracking, and IRT ability updates |
| `src/main/db/repositories/error-analysis.repository.ts` | `createErrorAnalysis`, `recalculateComponentStats`, `ComponentCode` | Stores error classifications and updates bottleneck detection statistics |
| `src/main/db/repositories/goal.repository.ts` | `updateObjectPriority` | Persists recalculated priorities after mastery changes |
| `src/main/services/task-generation.service.ts` | `GeneratedTask`, `TaskSpec` | Receives task context for evaluating responses |
| `src/main/services/state-priority.service.ts` | `calculateEffectivePriority`, `calculateMasteryAdjustment`, `calculateUrgencyScore` | Recalculates item priority after mastery updates |

### Dependents (What Needs This)

| Consumer | Function Used | Purpose |
|----------|---------------|---------|
| Learning Session Controller | `processResponse()` | Evaluates each response and updates all tracking systems |
| Session End Handler | `batchProcessResponses()` | Processes any queued responses at session termination |
| Session Summary UI | `summarizeOutcomes()` | Generates statistics for end-of-session review screen |
| Analytics Dashboard | `ResponseOutcome` type | Consumes outcome data for progress visualization |
| Error Analysis Module | Error analysis creation | Receives categorized errors for bottleneck detection |

### Data Flow

```
User Response (text input)
        |
        v
evaluateResponse() -----> Compare to expected answer
        |                      |
        +-- Exact match? ------+--> correct: true, partialCredit: 1.0
        |                      |
        +-- 90%+ similar? -----+--> correct: true, partialCredit: 0.95
        |                      |
        +-- 70%+ similar? -----+--> correct: false, partialCredit: 0.7
        |                      |
        +-- Otherwise ---------+--> analyzeError() --> categorize error type
        |
        v
recordResponse() -----> Persist to session history
        |
        v
recordExposure() -----> Update accuracy metrics (EMA)
        |
        v
determineStageTransition() -----> Check promotion/demotion thresholds
        |                              |
        +-- Stage changed? --> transitionStage() + recordStageTransition()
        |
        v
calculateFSRSUpdate() -----> Compute new stability, difficulty, next review
        |
        v
updateFSRSParameters() -----> Persist FSRS state
        |
        v
calculateEffectivePriority() -----> Recalculate item priority
        |
        v
updateObjectPriority() -----> Persist new priority
        |
        v
calculateThetaContribution() -----> IRT ability update (if not learning mode)
        |
        v
applyThetaRules() -----> Update user theta state
        |
        v
createErrorAnalysis() -----> (if incorrect) Categorize and store error
        |
        v
recalculateComponentStats() -----> Update bottleneck detection data
        |
        v
ResponseOutcome -----> Return complete outcome to caller
```

---

## Macroscale: System Integration

### Architectural Layer

This service sits at **Layer 3** of the three-layer learning pipeline defined in the LOGOS architecture:

```
User sees task <---- Layer 2: Task Generation (SELECT format, GENERATE content)
        |
        |  User submits response
        v
=====> Layer 3: Scoring + Update (THIS SERVICE) <=====
        |        - Evaluate correctness
        |        - Update mastery state
        |        - Apply FSRS scheduling
        |        - Update theta (ability)
        |        - Recalculate priority
        |        - Analyze errors
        v
Mastery data updated -----> Feeds into Layer 1: State + Priority
        |
        v
Next item selected -----> Cycle continues
```

Layer 3 is the **closing arc** of the learning loop. It transforms a momentary user action (typing a response) into persistent learning state changes that inform all future decisions.

### Big Picture Impact

This service enables the core feedback mechanisms that make LOGOS adaptive:

1. **Progressive Mastery Tracking**: Each response updates accuracy metrics using exponential moving averages (EMA), ensuring recent performance weighs more heavily than distant history. This captures actual learning trajectory.

2. **Stage Progression**: The five-stage mastery model (Unknown -> Recognized -> Recall -> Controlled -> Automatic) provides coarse-grained progress markers. This service enforces the promotion/demotion thresholds that gate these transitions.

3. **Spaced Repetition Scheduling**: The FSRS algorithm determines optimal review timing. This service computes stability (how well-rooted the memory is) and difficulty (how hard the item is for this learner), scheduling the next review at the predicted optimal moment.

4. **IRT Ability Estimation**: For training and evaluation sessions, correct/incorrect responses update the learner's theta (ability) parameters. This enables increasingly accurate difficulty calibration across the system.

5. **Error Pattern Detection**: Incorrect responses are analyzed and categorized, feeding the bottleneck detection system. Systematic errors in morphology, for example, surface as prioritization signals for morphology-focused tasks.

**What Would Break Without This Service**:
- Responses would have no lasting effect (no learning)
- Mastery stages would never advance (stuck at stage 0)
- Review schedules would never update (forgotten items)
- Priority calculations would use stale data (wrong item selection)
- Ability estimates would never improve (poor difficulty calibration)
- Error patterns would never surface (missed bottlenecks)
- The entire adaptive learning promise of LOGOS would be hollow

### Critical Path Analysis

**Importance Level**: Critical (Core)

This is the **most critical path** component in terms of state mutation. Every response must flow through this service for learning to occur:

```
User Response --> processResponse() --> [12 coordinated updates] --> Learning State Changed
                         ^
                         |
                  (Single point of coordination)
```

**Failure Modes**:
- Database unavailable: Responses lost, mastery frozen (catastrophic)
- FSRS calculation error: Wrong review timing (degraded spacing)
- Stage transition error: Progress stuck or premature promotion (frustrating)
- Error analysis failure: Bottlenecks missed (slower progress)
- Theta update failure: Ability frozen (poor calibration)

**Transaction Safety**: The service performs multiple database writes per response. A partial failure could leave inconsistent state. Production deployment should wrap `processResponse()` in a transaction.

---

## Technical Concepts (Plain English)

### Response Evaluation with Partial Credit

**Technical**: A comparison pipeline that normalizes text (lowercase, trim, remove punctuation), calculates Levenshtein-based similarity, and assigns partial credit based on configurable thresholds (90%+ similarity = 0.95 credit, 70%+ = similarity score as credit).

**Plain English**: Like a generous spelling teacher. If you write "recieve" instead of "receive," the system recognizes you know the word but made a small error. Instead of marking it completely wrong, it gives you partial credit - enough to acknowledge your knowledge while flagging the error for practice.

**Why We Use It**: Binary correct/incorrect loses information. A learner who writes "serendipitty" clearly knows more than one who writes "banana" when asked for "serendipity." Partial credit preserves this distinction.

### Levenshtein Distance (Similarity Calculation)

**Technical**: An algorithm that calculates the minimum number of single-character edits (insertions, deletions, substitutions) needed to transform one string into another. Similarity is then `1 - (distance / maxLength)`.

**Plain English**: Imagine you are playing a word game where each letter change costs one point. "cat" to "bat" costs 1 point (change c to b). "cat" to "cart" costs 1 point (insert r). The Levenshtein distance is the total cost. The closer to zero, the more similar the words. The system converts this into a similarity percentage.

**Why We Use It**: It provides a principled, language-independent measure of "how close" two strings are. This enables consistent partial credit across all languages and content types.

### Error Type Analysis

**Technical**: A heuristic classifier that categorizes errors into three types based on string comparison: `spelling` (same length, few character differences), `typo` (length differs by 1-2), and `wrong_word` (substantially different).

**Plain English**: When you get something wrong, there are different kinds of wrong. Mixing up "their" and "thier" is a spelling error - you know the word but fumble the letters. Writing "ther" is a typo - you know the word but missed a letter. Writing "banana" when asked for "their" is a wrong word - you do not know the answer at all. Each type suggests different remediation.

**Why We Use It**: Different error types need different interventions. Spelling errors benefit from visual drill; wrong word errors need concept re-teaching. Classification enables targeted feedback and bottleneck analysis.

### Stage Transition Thresholds (Gap 1.2)

**Technical**: A lookup table mapping each mastery stage (0-4) to promotion and demotion thresholds based on cue-free accuracy. Stage 0->1 requires 50%, 1->2 requires 60%, 2->3 requires 75%, 3->4 requires 90%.

**Plain English**: Like belt tests in martial arts. To go from white belt to yellow belt (stage 0 to 1), you need to demonstrate 50% mastery without hints. Higher belts have stricter requirements. If your performance drops below the demotion threshold, you might get "demoted" back to the previous belt until you recover.

**Why We Use It**: Arbitrary stage advancement would lose meaning. These thresholds ensure stages reflect genuine competence levels. The increasing strictness mirrors the higher standards for advanced proficiency.

### Stage Thresholds Reference

| Current Stage | Stage Name | Promote At | Demote At |
|---------------|------------|------------|-----------|
| 0 | Unknown | 50% | (n/a) |
| 1 | Recognized | 60% | 30% |
| 2 | Recall | 75% | 40% |
| 3 | Controlled | 90% | 60% |
| 4 | Automatic | (n/a) | 80% |

### FSRS Algorithm (Spaced Repetition)

**Technical**: Free Spaced Repetition Scheduler - a modern spaced repetition algorithm that tracks difficulty (D) and stability (S) parameters per item. Rating (1-4) is derived from correctness and response time. Stability grows exponentially on success, resets partially on failure. Next review interval is computed as `stability * (1 + (5 - difficulty) / 10)` days.

**Plain English**: Like watering plants on a schedule. If a plant is thriving (correct answers), you can water it less frequently (longer review intervals). If it is wilting (wrong answers), you need to water more often (shorter intervals). The system tracks each word's "health" and schedules its next watering at the optimal time - not too soon (wasteful) and not too late (forgotten).

**Why We Use It**: Human memory follows predictable forgetting curves. FSRS models these curves per-item, ensuring reviews happen just before forgetting occurs. This maximizes retention per minute of study time.

### FSRS Rating Scale

| Rating | Meaning | Trigger | Effect |
|--------|---------|---------|--------|
| 1 (Again) | Forgot | Incorrect response | Stability resets to 20% of current, difficulty increases |
| 2 (Hard) | Remembered with difficulty | Correct but >10 seconds | Stability grows slowly (1.5x), difficulty unchanged |
| 3 (Good) | Remembered normally | Correct, 5-10 seconds | Stability grows normally (2.0x), difficulty unchanged |
| 4 (Easy) | Remembered effortlessly | Correct, <5 seconds | Stability grows rapidly (2.5x), difficulty decreases |

### Theta Contribution (IRT-Based Ability Update)

**Technical**: Item Response Theory (IRT) models learner ability as a latent parameter theta. Each response contributes to theta proportional to item discrimination and inversely proportional to extreme difficulty. Contributions are mapped to component-specific theta values (lexical, morphological, phonological, syntactic, pragmatic) plus a global theta.

**Plain English**: Imagine your "language skill level" as a hidden score that gradually adjusts as you answer questions. Getting a hard question right boosts your score more than an easy one. Missing an easy question hurts more than missing a hard one. The system tracks separate scores for different language areas (vocabulary vs. grammar vs. pronunciation) so it knows exactly where you are strong and weak.

**Why We Use It**: Accurate ability estimation enables intelligent difficulty calibration. If the system knows you are strong in vocabulary (high lexical theta) but weak in grammar (low syntactic theta), it can adjust task difficulty appropriately for each component.

### Session Mode Theta Rules

| Mode | Theta Update Behavior | Rationale |
|------|----------------------|-----------|
| Learning | Frozen (no update) | Cued responses bias ability estimates; ignore during scaffolded practice |
| Training | 50% weight | Partial confidence in responses; blend into ability estimate cautiously |
| Evaluation | 100% weight | Cue-free responses are reliable indicators; full ability update |

### Exponential Moving Average (EMA) for Accuracy

**Technical**: Accuracy is updated using EMA with alpha = 0.2: `new_accuracy = old_accuracy * (1 - alpha) + new_value * alpha`. This weights recent responses more heavily while preserving historical context.

**Plain English**: Like a weather forecast that blends today's temperature with the recent average. If yesterday was 70 degrees and today is 80, the forecast does not jump to 80 - it might say 72, blending old and new. This smoothing prevents one lucky (or unlucky) response from wildly swinging your accuracy score.

**Why We Use It**: Raw accuracy (correct / total) treats all responses equally regardless of recency. EMA captures learning trajectory - a learner who starts at 20% and ends at 80% should show 80% ability, not 50% average.

---

## Function Reference

### Response Evaluation

| Function | Purpose |
|----------|---------|
| `evaluateResponse(userResponse, expectedAnswer, config)` | Main evaluation pipeline: normalize, compare, assign credit, generate feedback |
| `normalizeResponse(response)` | Standardizes text for comparison (lowercase, trim, remove punctuation, normalize whitespace) |
| `calculateSimilarity(a, b)` | Computes Levenshtein-based similarity score (0-1) between two strings |
| `analyzeError(response, expected)` | Categorizes error type (spelling, typo, wrong_word) with explanation |

### Mastery State Updates

| Function | Purpose |
|----------|---------|
| `determineStageTransition(currentStage, cueFreeAccuracy, cueAssistedAccuracy)` | Checks if accuracy warrants promotion or demotion |
| `calculateFSRSUpdate(correct, currentDifficulty, currentStability, responseTimeMs)` | Computes new FSRS parameters and next review date |
| `calculateThetaContribution(correct, itemDifficulty, itemDiscrimination, componentType)` | Calculates IRT-based ability parameter updates |

### Main Processing

| Function | Purpose |
|----------|---------|
| `processResponse(userId, userResponse, config)` | Complete 12-step pipeline from response to outcome |
| `batchProcessResponses(userId, responses, config)` | Processes multiple responses sequentially (session end) |
| `summarizeOutcomes(outcomes)` | Aggregates statistics from multiple outcomes for session summary |

---

## Types Reference

### Input Types

```typescript
UserResponse {
  sessionId: string;        // Active session identifier
  task: GeneratedTask;      // The task that was presented
  response: string;         // What the user typed
  responseTimeMs: number;   // How long they took
  hintsUsed: number;        // How many hints were revealed
}

ScoringConfig {
  sessionMode: SessionMode;           // 'learning' | 'training' | 'evaluation'
  strictness?: 'lenient' | 'normal' | 'strict';  // Evaluation strictness
  partialCreditEnabled?: boolean;     // Whether to award partial credit
}
```

### Output Types

```typescript
EvaluationResult {
  correct: boolean;         // Binary correctness
  partialCredit?: number;   // 0-1 score for partial correctness
  feedback: string;         // User-facing feedback message
  explanation?: string;     // Why it was wrong (for incorrect)
  correction?: string;      // The correct answer (for incorrect)
}

ResponseOutcome {
  responseId: string;       // Database record ID
  evaluation: EvaluationResult;
  masteryUpdate: {
    previousStage: number;
    newStage: number;
    stageChanged: boolean;
    newAccuracy: number;
  };
  priorityUpdate: {
    previousPriority: number;
    newPriority: number;
  };
  fsrsUpdate?: {
    nextReview: Date;
    stability: number;
    difficulty: number;
  };
  thetaContribution?: Partial<ThetaState>;
}
```

---

## Processing Pipeline Detail

The `processResponse()` function executes 12 coordinated steps:

| Step | Operation | Data Updated |
|------|-----------|--------------|
| 1 | `evaluateResponse()` | Computes evaluation result |
| 2 | Query LanguageObject + MasteryState | Retrieves current mastery data |
| 3 | Calculate effective cue level | Adjusts for hints used |
| 4 | `recordResponse()` | Creates Response record in session |
| 5 | `recordExposure()` | Updates exposure count + accuracy EMA |
| 6 | Query updated MasteryState | Gets fresh accuracy after EMA |
| 7 | `determineStageTransition()` | Checks promotion/demotion |
| 8 | `calculateFSRSUpdate()` + `updateFSRSParameters()` | Updates spaced repetition scheduling |
| 9 | `calculateEffectivePriority()` + `updateObjectPriority()` | Recalculates and persists priority |
| 10 | `recordTaskType()` | Tracks fluency vs. versatility balance |
| 11 | `calculateThetaContribution()` + `applyThetaRules()` | Updates user ability (if not learning mode) |
| 12 | `createErrorAnalysis()` + `recalculateComponentStats()` | Categorizes errors (if incorrect) |

---

## Change History

### 2026-01-04 - Initial Implementation
- **What Changed**: Created complete Scoring + Update Service implementing Phase 3.3
- **Why**: Final layer needed to close the adaptive learning loop
- **Impact**: Enables response evaluation, mastery tracking, FSRS scheduling, IRT updates, and error analysis

### Key Design Decisions

1. **12-Step Pipeline**: All updates are coordinated in a single function to ensure consistency. This trades simplicity for completeness - every response triggers a comprehensive state update.

2. **Partial Credit by Default**: The system errs on the side of recognizing partial knowledge. This provides better learning signals and reduces learner frustration from harsh binary grading.

3. **Response Time as Signal**: FSRS ratings incorporate response time, distinguishing "instant recall" (easy) from "struggled but got it" (hard). This provides richer memory strength information than binary correctness alone.

4. **Theta Freeze in Learning Mode**: During scaffolded learning, responses are biased by hints and should not update ability estimates. Only training/evaluation sessions update theta.

5. **Component Mapping**: Error types and theta contributions map to the five linguistic components (PHON, MORPH, LEX, SYNT, PRAG), enabling component-specific analytics and bottleneck detection.

---

## Testing Considerations

### Unit Test Scenarios

1. **evaluateResponse**: Test exact match, 90%+ match, 70%+ match, and complete mismatch
2. **normalizeResponse**: Test punctuation removal, whitespace normalization, case folding
3. **calculateSimilarity**: Test identical strings, single edit, complete difference
4. **analyzeError**: Test same-length with few diffs (spelling), length diff (typo), big diff (wrong word)
5. **determineStageTransition**: Test all stage/accuracy combinations for promotion and demotion
6. **calculateFSRSUpdate**: Test all four ratings and verify parameter updates

### Integration Test Scenarios

1. **processResponse**: Verify all 12 steps execute and database reflects changes
2. **batchProcessResponses**: Verify sequential processing with cumulative effects
3. **summarizeOutcomes**: Verify aggregation accuracy for promotions, demotions, theta

### Edge Cases

- First response for an item (no prior mastery data)
- Response time of 0ms (instant)
- Response time of 60000ms+ (very slow)
- Empty response string
- Response identical to expected but with different whitespace
- Stage 4 item with perfect accuracy (cannot promote further)
- Stage 0 item with 0% accuracy (cannot demote further)
- Learning mode response (theta should not update)

---

## Related Documentation

- `docs/narrative/src/main/services/state-priority.service.md` - Layer 1: Priority calculation (consumes mastery updates)
- `docs/narrative/src/main/services/task-generation.service.md` - Layer 2: Task generation (provides task context)
- `docs/narrative/src/main/db/repositories/mastery.repository.md` - Mastery state persistence
- `docs/narrative/src/main/db/repositories/session.repository.md` - Session and response recording
- `docs/narrative/src/main/db/repositories/error-analysis.repository.md` - Error pattern storage
- `ALGORITHMIC-FOUNDATIONS.md` - FSRS and IRT algorithm specifications
