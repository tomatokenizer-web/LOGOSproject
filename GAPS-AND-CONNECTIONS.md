# LOGOS: Identified Gaps and Required Connections

## Purpose

This document tracks theoretical gaps, missing algorithmic connections, and areas requiring further development before or during implementation.

---

## Priority 1: High (Required for MVP)

### Gap 1.1: Threshold Detection Algorithm

**Problem**: How to automatically identify which sub-skill is the bottleneck blocking overall advancement.

**Example**: Maria scores 85% on vocabulary but only 30% on procedure verbs. Is "procedure verbs" a vocabulary problem, a morphology problem, or a syntactic problem?

**Current State**: Not specified in theory.

**Required**: Algorithm that:
1. Analyzes error patterns across component types
2. Identifies the minimal blocking skill
3. Generates targeted remediation tasks

**Connection Needed**:
```
Error Patterns → Component Analysis → Bottleneck ID → Task Generation
```

**Proposed Approach**: Track co-occurrence of errors. If errors on "administer," "catheterize," "assess" cluster together AND share morphological pattern (verb + medical suffix), flag morphology as bottleneck.

---

### Gap 1.2: Cue-Free Minimum Baseline

**Problem**: At what threshold is cue-free performance "usable without assistance"?

**Example**: Maria scores 75% cue-free on "contraindication." Is this good enough?

**Current State**: No threshold defined.

**Required**:
- Minimum acceptable cue-free accuracy per mastery stage
- Context-dependent thresholds (certification exam vs. casual use)

**Proposed Thresholds**:

| Stage | Minimum Cue-Free Accuracy | Rationale |
|-------|--------------------------|-----------|
| Stage 2 (Recall) | 60% | Can retrieve more often than not |
| Stage 3 (Controlled) | 75% | Reliable under effort |
| Stage 4 (Automatic) | 90% | Near-perfect under pressure |

---

### Gap 1.3: PMI → Difficulty Conversion

**Problem**: How to convert PMI scores to task difficulty estimates.

**Example**: PMI("administer", "medication") = 8.5. What difficulty should a fill-in-blank task for this pair be?

**Current State**: PMI defined theoretically, no mapping to difficulty.

**Required**: Function mapping PMI to expected difficulty:
```typescript
function pmiToDifficulty(pmi: number, taskType: TaskType): number {
  // High PMI = easier (more predictable)
  // Low PMI = harder (less predictable)
  const baseDifficulty = 1 - normalize(pmi, PMI_MIN, PMI_MAX);
  return adjustForTaskType(baseDifficulty, taskType);
}
```

---

## Priority 2: Medium (Required for Phase 2-3)

### Gap 2.1: Cross-Language Transfer Model

**Problem**: How L1 competencies affect L2 learning cost estimates.

**Example**: Maria's Portuguese L1 shares Romance roots with English medical terminology. How much does this reduce her learning cost for "contraindication"?

**Current State**: Cost formula mentions "TransferGain" but no calculation method.

**Required**: L1-L2 transfer coefficient matrix:
```typescript
interface TransferCoefficient {
  l1: Language;
  l2: Language;
  componentType: ComponentType;
  coefficient: number;  // 0 (no transfer) to 1 (full transfer)
}

// Example
{ l1: 'Portuguese', l2: 'English', componentType: 'Lexical', coefficient: 0.6 }
{ l1: 'Portuguese', l2: 'English', componentType: 'Phonological', coefficient: 0.3 }
```

---

### Gap 2.2: Fluency-Versatility Transition Logic

**Problem**: When should system shift emphasis from fluency to versatility?

**Current State**: Fixed ratios by level (80/20, 60/40, 40/60) mentioned but no trigger logic.

**Required**: Transition triggers:
```typescript
function shouldShiftToVersatility(state: UserState): boolean {
  // Trigger when:
  // 1. Head domain coverage > 80%
  // 2. Fluency speed metric > threshold
  // 3. Production tasks showing plateaued improvement
  return (
    state.headDomainCoverage > 0.8 &&
    state.fluencySpeedPercentile > 0.7 &&
    state.productionImprovementRate < 0.02
  );
}
```

---

### Gap 2.3: Genre Distribution Modeling

**Problem**: Need comprehensive probability distributions for pragmatic evaluation.

**Example**: What's the expected distribution of discourse markers in a "nursing handoff report"?

**Current State**: Pragmatics defined as "statistical formal space" but no actual distributions.

**Required**: Genre templates with feature distributions:
```typescript
interface GenreDistribution {
  genre: string;
  features: {
    discourseMarkers: ProbabilityVector;
    registerLevel: ProbabilityVector;
    sentenceComplexity: ProbabilityVector;
    technicalTermDensity: number;
  };
  acceptableDeviation: number;  // KL divergence threshold
}
```

**Acquisition Method**: Extract from corpus analysis during goal processing (Claude API task).

---

### Gap 2.4: Scaffolding Removal Schedule

**Problem**: Optimal schedule for reducing cue assistance over time.

**Current State**: Scaffolding gap tracked but no removal strategy.

**Required**: Progressive cue reduction algorithm:
```typescript
function determineCueLevel(object: LanguageObject, history: ResponseHistory): CueLevel {
  const gap = history.cueAssistedAccuracy - history.cueFreeAccuracy;
  const attempts = history.cueFreeAttempts;

  if (gap < 0.1 && attempts > 3) return CueLevel.NONE;
  if (gap < 0.2 && attempts > 2) return CueLevel.MINIMAL;
  if (gap < 0.3) return CueLevel.MODERATE;
  return CueLevel.FULL;
}
```

---

## Priority 3: Low (Phase 4 or Post-MVP)

### Gap 3.1: Multi-Modal Integration

**Problem**: How to combine text/audio/video in single coherent tasks.

**Current State**: Modalities listed separately.

**Required for Phase 4**: Multi-modal task templates.

---

### Gap 3.2: Transfer Decay Modeling

**Problem**: How quickly transfer effects diminish without reinforcement.

**Current State**: No decay model for transfer.

**Required**: Decay function for transfer gains:
```typescript
function transferDecay(initialGain: number, daysSinceReinforcement: number): number {
  // Exponential decay with slower rate than item-specific memory
  return initialGain * Math.exp(-daysSinceReinforcement / TRANSFER_HALFLIFE);
}
```

---

### Gap 3.3: IRT Model Selection per Component

**Problem**: Should different component types use different IRT models (1PL, 2PL, 3PL)?

**Current State**: Generic IRT mentioned.

**Proposed Resolution**:
| Component | IRT Model | Rationale |
|-----------|-----------|-----------|
| Phonology | 1PL | Discrimination relatively constant |
| Lexical | 2PL | Items vary in discrimination |
| Syntactic | 2PL | Structure complexity varies |
| Pragmatic | 3PL | Guessing factor significant |

---

## Required Connections (Cross-Document Links)

### Connection A: PMI Computation → Task Generation

**From**: THEORETICAL-FOUNDATIONS.md (Section 2.1)
**To**: Task generation algorithm

**Missing Link**: How Claude API extracts PMI values from corpus.

**Proposed Implementation**:
```typescript
// Prompt template for PMI extraction
const pmiPrompt = `
Analyze the following text and identify word pairs with high co-occurrence.
For each pair, estimate PMI on a scale of 0-10 where:
- 0-2: Words rarely appear together
- 3-5: Moderate co-occurrence
- 6-8: Frequently co-occur
- 9-10: Almost always co-occur (collocations/idioms)

Return as JSON: { pairs: [{ word1, word2, pmi, context }] }
`;
```

---

### Connection B: θ Estimation → Learning Queue

**From**: THEORETICAL-FOUNDATIONS.md (Section 2.3)
**To**: Priority queue sorting

**Missing Link**: Real-time priority adjustment when θ changes.

**Proposed Implementation**:
```typescript
// After θ update, recalculate priorities for affected items
async function onThetaUpdate(newTheta: ThetaState) {
  const affectedObjects = await db.languageObjects.findMany({
    where: { goalId: newTheta.goalId }
  });

  for (const obj of affectedObjects) {
    const newPriority = computePriority(obj, newTheta);
    await db.masteryStates.update({
      where: { objectId: obj.id },
      data: { priority: newPriority }
    });
  }

  await rebuildLearningQueue(newTheta.goalId);
}
```

---

### Connection C: Scaffolding Gap → Training Mode

**From**: THEORETICAL-FOUNDATIONS.md (Section 2.5)
**To**: Task type selection

**Missing Link**: Automatic mode switching based on gap size.

**Proposed Implementation**:
```typescript
function selectTrainingMode(object: LanguageObject, gap: number): TrainingMode {
  if (gap > 0.4) return TrainingMode.FLUENCY_FOCUS;  // Need more automation
  if (gap > 0.2) return TrainingMode.BALANCED;
  return TrainingMode.VERSATILITY_FOCUS;  // Ready for creative extension
}
```

---

### Connection D: Genre Distributions → Claude Prompts

**From**: THEORETICAL-FOUNDATIONS.md (Section 2.6)
**To**: Content generation prompts

**Missing Link**: Template library for genre-appropriate content generation.

**Proposed Implementation**: Genre-specific prompt templates:
```typescript
const genrePrompts: Record<string, string> = {
  'medical_report': `Generate a nursing progress note using SOAP format...`,
  'patient_handoff': `Generate a shift handoff report following SBAR...`,
  'casual_conversation': `Generate a dialogue between colleagues...`,
};
```

---

## Implementation Tracking

| Gap ID | Description | Priority | Phase | Status | Reference |
|--------|-------------|----------|-------|--------|-----------|
| 1.1 | Threshold Detection | High | 1 | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Part 7 |
| 1.2 | Cue-Free Baseline | High | 1 | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Part 3.2 |
| 1.3 | PMI → Difficulty | High | 1 | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Part 2.2 |
| 1.4 | Five-Element Vector z(w) | High | 2 | **COMPLETE** | THEORETICAL-FOUNDATIONS.md Section 2.2.1 |
| 1.5 | S_eff Priority Function | High | 3 | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Section 3.3 |
| 1.6 | Task-Word Matching | High | 3 | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Section 3.4 |
| 1.7 | Context-Conditioned G2P Model | High | 2 | **COMPLETE** | THEORETICAL-FOUNDATIONS.md Section 1.3 |
| 1.8 | Word Segmentation & Organization | High | 2 | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Section 3.5 |
| 1.9 | Extended G2P: Mapping/Vowel/Stress/Exceptions | High | 2 | **COMPLETE** | THEORETICAL-FOUNDATIONS.md Section 1.4 |
| 2.1 | L1-L2 Transfer | Medium | 2 | Proposed | Requires language-pair data collection |
| 2.2 | Fluency-Versatility Transition | Medium | 2 | Proposed | See Gap 2.2 above |
| 2.3 | Genre Distributions | Medium | 3 | Proposed | LLM extraction during goal setup |
| 2.4 | Scaffolding Removal | Medium | 2 | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Part 3.2 |
| 3.1 | Multi-Modal Integration | Low | 4 | Not Started | Phase 4 feature |
| 3.2 | Transfer Decay | Low | 4 | Proposed | See Gap 3.2 above |
| 3.3 | IRT Model Selection | Low | 4 | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Part 1.1 |
| 4.1 | Grammar Organization Algorithm | Medium | 4 | Planned | Phase 4 - Syntactic Competence |
| 4.2 | Domain/Register Structure | Medium | 4 | Planned | Phase 4 - Pragmatic Competence |
| 4.3 | Component-Object State Dictionary | Medium | 4 | Planned | Phase 4 - Unified State Tracking |
| 4.4 | Multi-View Visualization Dashboard | Medium | 4 | Planned | Phase 4 - UI/UX |
| 4.5 | Content Sourcing & Generation | High | 3 | Planned | Phase 3 - Content Pipeline |
| 4.6 | Traditional Task Type Library | High | 3 | Planned | Phase 3 - Task Expansion |
| 4.7 | Cognitive Manipulation Tools | Medium | 4 | Planned | Phase 4 - Learning UI |
| 4.8 | Multi-Curriculum Management | Medium | 4 | Planned | Phase 4 - User Management |
| 4.9 | External Media Integration | Low | 4 | Planned | Phase 4 - External Resources |
| 4.10 | Component Benchmark Standards | Medium | 4 | Planned | Phase 4 - Assessment |

## Connection Implementation Tracking

| Connection | From → To | Status | Reference |
|------------|-----------|--------|-----------|
| A | PMI → Task Generation | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Part 2, Part 5 |
| B | θ Estimation → Learning Queue | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Part 1.2, Part 4.2 |
| C | Scaffolding Gap → Training Mode | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Part 3.2 |
| D | Genre Distributions → Claude Prompts | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Part 5.1 |
| E | z(w) Vector → Priority Calculation | **COMPLETE** | THEORETICAL-FOUNDATIONS.md 2.2.1, ALGORITHMIC-FOUNDATIONS.md 3.3 |
| F | Mastery State → g(m) Adjustment | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Section 3.3 |
| G | Word Criteria → Task Selection | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Section 3.4 |
| H | Cognitive Processes → Task Templates | **COMPLETE** | ALGORITHMIC-FOUNDATIONS.md Section 3.4 |
| I | Vowel System → Phonological Difficulty | **COMPLETE** | THEORETICAL-FOUNDATIONS.md Section 1.4.4 |
| J | Stress Patterns → P Score Calculation | **COMPLETE** | THEORETICAL-FOUNDATIONS.md Section 1.4.5 |
| K | Exception DB → Comprehensive P Score | **COMPLETE** | THEORETICAL-FOUNDATIONS.md Section 1.4.8-1.4.9 |

---

## Remaining Implementation Tasks

### Phase 1 MVP - All Core Algorithms Complete ✓

- IRT mathematics (1PL, 2PL, 3PL models)
- θ estimation (MLE, EAP)
- PMI computation and difficulty mapping
- FSRS spaced repetition integration
- Database schema with optimized queries
- LLM prompt templates
- Bottleneck detection algorithm

### Phase 2 - Extended Schema & G2P (UPDATED 2026-01-04)

**Schema Extensions:**

- [ ] Add `domainDistribution` JSON field to LanguageObject
- [ ] Add `morphologicalScore` Float field to LanguageObject
- [ ] Add `phonologicalDifficulty` Float field to LanguageObject

**G2P Model Implementation (NEW):**

- [ ] Implement `G2PRule` interface and `ENGLISH_G2P_RULES` array
- [ ] Implement `segmentGraphemes()` function
- [ ] Implement `computeG2PEntropy()` for P score calculation
- [ ] Create `LanguageG2PSpec` for English (extensible to other languages)

**Extended G2P Model (NEW - 2026-01-04):**

- [ ] Implement `MappingComplexity` interface for one-to-many/many-to-one mappings
- [ ] Implement `ENGLISH_VOWEL_SYSTEM` with all tense/lax/diphthong/r-colored vowels
- [ ] Implement `StressPattern` and `STRESS_SHIFTING_SUFFIXES` for prosody
- [ ] Implement `SILENT_LETTER_PATTERNS` including OUGH pronunciations
- [ ] Implement `VALID_ONSETS` and `VALID_CODAS` for phonotactic constraints
- [ ] Implement `G2PException` database with category classification
- [ ] Implement `computeComprehensiveP()` integrating all components

**Word Organization (NEW):**

- [ ] Implement `WordSegmentation` pipeline (grapheme + morpheme + syllable)
- [ ] Implement `buildWordIndexes()` for fast retrieval
- [ ] Implement `MorphologicalFamily` builder
- [ ] Implement `MultiLayerWordCard` for UI display

**Computation Functions:**

- [ ] Implement D, M, P computation functions during corpus processing
- [ ] L1-L2 transfer coefficients (requires multi-language user data)

### Phase 3 - Extended Engine (UPDATED 2026-01-04)

**Priority System:**

- [ ] Implement `computeEffectivePriority()` with S_eff formula
- [ ] Implement `computeMasteryAdjustment()` g(m) function
- [ ] Implement `computeContextModifier()` function

**Task Selection:**

- [ ] Implement `selectOptimalTask()` with word criteria matching
- [ ] Create task template library with cognitive process metadata
- [ ] Implement `computeTaskWordFit()` scoring function
- [ ] Implement `isTaskTypeAppropriateForStage()` mapping

**Data Requirements:**

- [ ] Genre distribution extraction (requires corpus analysis pipeline)
- [ ] Fluency-versatility transition tuning (requires user behavior data)

### Phase 4 - Future Enhancement

**Core Enhancements:**

- Multi-modal task integration
- Transfer decay modeling
- Advanced IRT calibration with live data
- Word characteristic vector visualization (radar charts)
- Cognitive process tracking dashboard

**Gap 4.1: Grammar Organization Algorithm** (Syntactic Competence)

- [ ] Define `SyntacticConstruction` interface with complexity metrics
- [ ] Create construction frequency database from corpus analysis
- [ ] Implement `computeSyntacticPriority()` for grammar structure ordering
- [ ] Design `GrammarSequenceOptimizer` applying prerequisite dependencies
- [ ] Map constructions to cognitive processes (pattern recognition, rule application)
- [ ] Integrate with word learning (grammar-vocabulary co-learning paths)

```typescript
// Planned interface structure
interface SyntacticConstruction {
  id: string;
  pattern: string;                    // e.g., "SVO", "There-existential"
  complexity: number;                 // Syntactic complexity score
  frequency: number;                  // Corpus frequency
  prerequisites: string[];            // Required prior constructions
  exemplarWords: string[];            // Words commonly used in pattern
  cognitiveLoad: CognitiveLoadMetrics;
}

interface GrammarLearningSequence {
  stage: LearningStage;
  constructions: SyntacticConstruction[];
  integrationWords: string[];         // Words to practice construction
  taskTypes: TaskType[];              // Optimal tasks for this grammar
}
```

**Gap 4.2: Domain/Register Structure Algorithm** (Pragmatic Competence)

- [ ] Define `RegisterProfile` interface (formality, genre, purpose)
- [ ] Create register-word association database
- [ ] Implement `computeRegisterFit()` for word-context matching
- [ ] Design `DomainTransferModel` for cross-register vocabulary
- [ ] Map registers to communicative functions
- [ ] Integrate with D (domain distribution) in z(w) vector

```typescript
// Planned interface structure
interface RegisterProfile {
  id: string;
  name: string;                       // e.g., "academic", "casual", "technical"
  formality: number;                  // 0-1 scale
  genres: Genre[];                    // Associated text genres
  typicalWords: string[];             // High-frequency words in register
  collocations: CollocationPattern[]; // Register-specific word combinations
  pragmaticFunctions: PragmaticFunction[];
}

interface DomainStructure {
  domain: string;                     // e.g., "medicine", "law", "everyday"
  registers: RegisterProfile[];       // Registers within domain
  coreVocabulary: string[];          // Essential domain words
  transitionPaths: DomainTransition[]; // How vocabulary transfers between domains
}

function computeRegisterAppropriatenessScore(
  word: string,
  targetRegister: RegisterProfile
): number;
```

**Gap 4.3: Component-Object State Dictionary & Search Engine** (Unified Learning State)

각 언어 컴포넌트(G2P, Morphology, Vocabulary, Grammar, Pragmatic)별 객체의 학습 상태, 속성, 관계를 통합 관리하고 검색/시각화하는 시스템.

- [ ] Define `ComponentObjectState` interface for unified object tracking
- [ ] Implement per-component search engine with category filtering
- [ ] Create `LearningExposureHistory` tracking (modality, task type, frequency)
- [ ] Implement `CognitiveProcessInduction` tracker (automation, usage expansion)
- [ ] Create `IRTPerformanceMetrics` per object (accuracy by intent, problem type)
- [ ] Implement `TransferEffect` and `AutoReinforcement` calculators
- [ ] Create `ObjectRelationGraph` for inter-object connections
- [ ] Implement `InterpretationCreationActivity` participation tracker
- [ ] Design visual layout: dictionary view + network graph + priority list

```typescript
// Planned interface structure
type LanguageComponent = 'g2p' | 'morphology' | 'vocabulary' | 'grammar' | 'pragmatic';

interface ComponentObjectState {
  objectId: string;
  component: LanguageComponent;
  content: string;

  // Learning Priority & Context
  goalContextPriority: number;           // Priority based on current goal
  emphasizedForContext: boolean;         // Highlighted for target context

  // Exposure History
  exposureHistory: {
    totalExposures: number;
    byModality: Record<Modality, number>;  // visual, auditory, kinesthetic
    byTaskPhase: Record<TaskPhase, number>; // learning, training, evaluation
    lastExposure: Date;
    exposurePattern: ExposurePattern[];    // Timeline of interactions
  };

  // Cognitive Process Induction
  cognitiveInduction: {
    automationLevel: number;              // 0-1: How automated the knowledge is
    usageSpaceExpansion: number;          // Contexts where successfully used
    proceduralFluency: number;            // Speed/accuracy in procedural tasks
    declarativeStrength: number;          // Explicit knowledge recall
  };

  // IRT Performance Metrics
  irtMetrics: {
    overallAccuracy: number;
    accuracyByIntent: Record<TaskIntent, number>;
    accuracyByProblemType: Record<ProblemType, number>;
    thetaEstimate: number;
    difficultyCalibration: number;
    discriminationIndex: number;
  };

  // Transfer & Reinforcement Effects
  transferEffects: {
    positiveTransferTo: string[];         // Objects this helps learn
    negativeTransferTo: string[];         // Objects this interferes with
    autoReinforcementScore: number;       // Self-reinforcing through use
    crossComponentTransfer: Record<LanguageComponent, number>;
  };

  // Feature Vector & Scores
  featureVector: {
    F: number;  // Frequency
    R: number;  // Relational density
    E: number;  // Contextual contribution (legacy)
    D: Record<string, number>;  // Domain distribution
    M: number;  // Morphological score
    P: number;  // Phonological difficulty
  };

  // Activity Participation
  activityParticipation: {
    interpretationTasks: number;          // Comprehension activities
    creationTasks: number;                // Production activities
    totalEngagementTime: number;          // Minutes spent
    qualityScore: number;                 // Average response quality
  };

  // Relationships
  relations: {
    collocations: Array<{ objectId: string; pmi: number }>;
    morphologicalFamily: string[];
    semanticNeighbors: string[];
    syntacticPatterns: string[];
    prerequisiteOf: string[];
    dependsOn: string[];
  };

  // Mastery Assessment
  masteryState: {
    stage: number;                        // 0-4 mastery stage
    cueFreeAccuracy: number;
    cueAssistedAccuracy: number;
    scaffoldingGap: number;
    stabilityDays: number;
    nextReviewDate: Date;
  };
}

// Search Engine Interface
interface ComponentSearchEngine {
  component: LanguageComponent;

  // Search methods
  searchByContent(query: string): ComponentObjectState[];
  filterByPriority(minPriority: number): ComponentObjectState[];
  filterByMasteryStage(stages: number[]): ComponentObjectState[];
  filterByAutomationLevel(min: number, max: number): ComponentObjectState[];
  filterByRecentExposure(withinDays: number): ComponentObjectState[];
  filterByNeedsReview(): ComponentObjectState[];

  // Special filters
  getNotAutomized(): ComponentObjectState[];           // Recent, needs practice
  getContextEmphasized(goalId: string): ComponentObjectState[];  // Goal-relevant
  getHighTransferValue(): ComponentObjectState[];      // Good ROI for learning
  getBottlenecks(): ComponentObjectState[];            // Blocking other learning
}

// Visualization Structures
interface DictionaryView {
  component: LanguageComponent;
  sortBy: 'priority' | 'frequency' | 'mastery' | 'recency' | 'alphabetical';
  groupBy: 'category' | 'domain' | 'difficulty' | 'mastery_stage';
  items: ComponentObjectState[];
  pagination: { page: number; pageSize: number; total: number };
}

interface NetworkGraphView {
  nodes: Array<{
    id: string;
    label: string;
    component: LanguageComponent;
    size: number;           // Based on importance/frequency
    color: string;          // Based on mastery level
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;         // Relationship strength (PMI, etc.)
    type: 'collocation' | 'morphological' | 'semantic' | 'syntactic';
  }>;
  layout: 'force' | 'hierarchical' | 'radial';
}

interface PriorityListView {
  title: string;
  filter: 'needs_review' | 'not_automized' | 'context_emphasized' | 'high_transfer';
  items: Array<{
    object: ComponentObjectState;
    reason: string;          // Why this item is prioritized
    recommendedTask: TaskType;
  }>;
}
```

**Gap 4.4: Multi-View Visualization Dashboard** (UI/UX)

- [ ] Implement Dictionary View with search/filter/sort
- [ ] Implement Network Graph View with D3.js/vis.js
- [ ] Implement Priority List View with reasoning
- [ ] Create component switcher (G2P ↔ Morph ↔ Vocab ↔ Grammar ↔ Pragmatic)
- [ ] Implement cross-component navigation (click word → see all component data)
- [ ] Create dashboard combining all views

**Connection Points for Phase 4:**

- Gap 4.1 ↔ Gap 1.6: Grammar constructions inform task-word matching
- Gap 4.2 ↔ Gap 1.4: Register profiles refine D (domain) component
- Gap 4.1 ↔ Gap 4.2: Syntactic patterns vary by register (formal vs casual)
- Gap 4.1 ↔ Section 2.5: Morphological rules interact with syntactic patterns
- Gap 4.2 ↔ Pragmatic Layer: Register awareness is core pragmatic competence
- Gap 4.3 ↔ All Components: Unified state tracking across all language layers
- Gap 4.3 ↔ Gap 1.5: S_eff priority feeds into search engine filtering
- Gap 4.3 ↔ Gap 1.6: Task-word matching uses ComponentObjectState data
- Gap 4.4 ↔ Gap 4.3: Visualization consumes ComponentObjectState data

**Gap 4.5: Content Sourcing & Generation Framework** (콘텐츠 소싱/생성)

학습/훈련/평가용 콘텐츠를 AI 생성 또는 외부 소싱하는 체계적 방법론.

- [ ] Define `ContentSpec` interface (length, format, domain, difficulty constraints)
- [ ] Implement `ContentGenerator` with Claude API integration
- [ ] Create `ContentSourcingPipeline` for external corpus integration
- [ ] Implement `ContentQualityValidator` with linguistic benchmarks
- [ ] Design fallback chain: cached → template → AI-generated
- [ ] Create `ContentVariationEngine` for task diversity

```typescript
// Planned interface structure
interface ContentSpec {
  targetObjects: string[];              // Language objects to incorporate
  contentType: 'passage' | 'dialogue' | 'sentence' | 'word_list';
  length: { min: number; max: number }; // Character/word count
  difficulty: {
    readability: number;                // Flesch-Kincaid grade level
    vocabularyLevel: number;            // 0-1 based on frequency
    syntacticComplexity: number;        // 0-1 based on clause depth
  };
  constraints: {
    mustInclude: string[];              // Required words/patterns
    mustAvoid: string[];                // Forbidden content
    domainFocus: string[];              // Target domains
    registerTarget: RegisterProfile;    // Formality level
  };
  pedagogicalIntent: PedagogicalIntent;
}

type PedagogicalIntent =
  | 'introduce_new'        // First exposure
  | 'reinforce_known'      // Practice known items
  | 'test_comprehension'   // Reading comprehension
  | 'elicit_production'    // Writing/speaking prompt
  | 'contextual_usage'     // Real-world application
  | 'error_detection';     // Find mistakes

interface ContentGenerationResult {
  content: string;
  metadata: {
    actualDifficulty: ContentSpec['difficulty'];
    objectsCovered: string[];
    generationMethod: 'ai' | 'template' | 'cached' | 'external';
    qualityScore: number;
  };
}

async function generateContent(spec: ContentSpec): Promise<ContentGenerationResult>;
```

**Gap 4.6: Traditional Task Type Library** (전통적 테스크 확장)

기존 언어 교육에서 사용되는 모든 테스크 유형의 체계적 구현.

- [ ] Define comprehensive `TraditionalTaskType` taxonomy
- [ ] Implement task generators for each type
- [ ] Create `TaskConstraintSolver` for object selection
- [ ] Implement `DistractorGenerator` for MCQ tasks
- [ ] Design `TaskDifficultyCalibrator` using IRT

```typescript
// Planned interface structure
type TraditionalTaskType =
  // ===== RECEPTIVE (이해) =====
  | 'reading_comprehension'      // 독해
  | 'listening_comprehension'    // 청해
  | 'inference_from_context'     // 문맥 추론
  | 'main_idea_identification'   // 주제 파악
  | 'detail_extraction'          // 세부 정보 추출

  // ===== PRODUCTIVE (생성) =====
  | 'essay_writing'              // 주제 글쓰기
  | 'summary_writing'            // 요약
  | 'dictation'                  // 받아쓰기
  | 'sentence_completion'        // 문장 완성
  | 'free_response'              // 자유 응답

  // ===== TRANSFORMATIVE (변환) =====
  | 'translation'                // 번역
  | 'paraphrasing'               // 다르게 표현하기
  | 'sentence_combining'         // 문장 결합
  | 'sentence_splitting'         // 문장 분리
  | 'register_shift'             // 격식 변환 (casual ↔ formal)
  | 'voice_transformation'       // 능동/수동 변환
  | 'tense_transformation'       // 시제 변환

  // ===== FILL-IN (채우기) =====
  | 'cloze_deletion'             // 빈칸 채우기
  | 'word_bank_fill'             // 단어 보기 중 선택
  | 'constrained_fill'           // 제약 조건 빈칸 (첫글자, 품사)
  | 'multiple_blank'             // 복수 빈칸

  // ===== INTERACTIVE (상호작용) =====
  | 'dialogue_completion'        // 대화 완성
  | 'role_play_prompt'           // 역할극 프롬프트
  | 'question_answering'         // Q&A
  | 'debate_response'            // 토론 응답

  // ===== ANALYTICAL (분석) =====
  | 'error_correction'           // 오류 수정
  | 'grammar_identification'     // 문법 구조 식별
  | 'word_formation_analysis'    // 단어 형성 분석
  | 'collocation_judgment'       // 연어 적절성 판단
  | 'register_appropriateness';  // 격식 적절성 판단

interface TraditionalTaskTemplate extends TaskTemplateMetadata {
  traditionalType: TraditionalTaskType;

  // Object selection constraints
  objectConstraints: {
    isolated: boolean;              // 고립 평가 vs 연계 평가
    minObjects: number;
    maxObjects: number;
    relationshipType?: 'collocation' | 'family' | 'semantic' | 'none';
  };

  // Statistical constraints for object selection
  statisticalConstraints: {
    frequencyRange: [number, number];
    difficultyRange: [number, number];
    componentMix: Partial<Record<LanguageComponent, number>>;  // % per component
  };

  // Response format
  responseFormat: {
    type: 'text' | 'selection' | 'ordering' | 'matching' | 'speech';
    minLength?: number;
    maxLength?: number;
    scoringRubric: ScoringRubric;
  };
}
```

**Gap 4.7: Cognitive Manipulation Tools** (인지적 조작 도구)

문제 풀이 중 사용자가 활용할 수 있는 인지적 보조 도구.

- [ ] Define `CognitiveToolkit` interface
- [ ] Implement highlighting/annotation tools
- [ ] Create chunking assistance tools
- [ ] Implement connection visualization tools
- [ ] Design audio playback controls with speed/repeat

```typescript
// Planned interface structure
interface CognitiveToolkit {
  // Visual highlighting tools
  highlighting: {
    colorCodes: Record<LanguageComponent, string>;  // Component-based colors
    userHighlights: HighlightRange[];
    autoHighlight: (component: LanguageComponent) => void;
  };

  // Chunking tools
  chunking: {
    syllableBreak: (word: string) => string[];
    morphemeBreak: (word: string) => MorphemeSegment[];
    phraseBreak: (sentence: string) => string[];
    toggleChunkView: () => void;
  };

  // Connection visualization
  connections: {
    showCollocations: (wordId: string) => void;
    showMorphFamily: (wordId: string) => void;
    showSemanticNeighbors: (wordId: string) => void;
    overlayNetworkMini: (wordId: string) => NetworkGraphView;
  };

  // Audio tools
  audio: {
    playPronunciation: (word: string, accent: 'US' | 'UK') => void;
    playAtSpeed: (rate: 0.5 | 0.75 | 1.0 | 1.25) => void;
    repeatSegment: (start: number, end: number) => void;
    showWaveform: boolean;
  };

  // Answer assistance
  answerTools: {
    scratchpad: string;                    // User notes
    wordBank: string[];                    // Available words
    hintLevel: 0 | 1 | 2 | 3;             // Progressive hints
    checkPartial: () => PartialFeedback;  // Mid-answer feedback
  };
}

type ResponseFormat =
  | 'single_word'
  | 'short_answer'        // 1-2 sentences
  | 'paragraph'           // 3-5 sentences
  | 'essay'               // Multiple paragraphs
  | 'selection_single'    // MCQ
  | 'selection_multiple'  // Multi-select
  | 'ordering'            // Sequence arrangement
  | 'matching'            // Pair matching
  | 'speech_recording';   // Audio response
```

**Gap 4.8: Multi-Curriculum Management** (다중 커리큘럼 관리)

사용자가 목적별로 분리된 커리큘럼을 생성/관리하는 시스템.

- [ ] Define `Curriculum` entity separate from `GoalSpec`
- [ ] Implement curriculum creation wizard with purpose templates
- [ ] Create curriculum-specific benchmark targets
- [ ] Design cross-curriculum progress tracking
- [ ] Implement curriculum switching/merging

```typescript
// Planned interface structure
type CurriculumPurpose =
  | 'academic_writing'           // 대학 에세이 작성
  | 'standardized_test'          // 공인인증시험 (TOEFL, IELTS, etc.)
  | 'professional_domain'        // 특정 분야 전문용어
  | 'conversational_fluency'     // 일상 회화
  | 'reading_comprehension'      // 독해력 향상
  | 'exam_preparation'           // 특정 시험 대비
  | 'custom';                    // 사용자 정의

interface Curriculum {
  id: string;
  name: string;
  purpose: CurriculumPurpose;
  description: string;

  // Target benchmarks
  benchmarks: {
    targetLevel: CEFRLevel;           // A1-C2
    targetVocabularySize: number;
    targetGrammarCoverage: number;    // % of target constructions
    targetSkillBalance: Record<SkillType, number>;
  };

  // Curriculum-specific settings
  settings: {
    primaryDomains: string[];
    primaryRegisters: RegisterProfile[];
    taskTypeWeights: Partial<Record<TraditionalTaskType, number>>;
    modalityPreferences: Partial<Record<Modality, number>>;
    sessionDuration: number;          // Target minutes per session
    weeklyGoal: number;               // Sessions per week
  };

  // Content sources
  contentSources: {
    internalCorpus: boolean;
    externalSources: ExternalSource[];
    userUploads: string[];            // User-provided materials
  };

  // Progress tracking
  progress: {
    startDate: Date;
    targetDate?: Date;
    currentLevel: number;
    objectsMastered: number;
    objectsInProgress: number;
    benchmarkProgress: Record<string, number>;
  };

  // Associated goals (a curriculum can have multiple goals)
  goalIds: string[];
}

interface CurriculumTemplate {
  purpose: CurriculumPurpose;
  name: string;
  description: string;
  defaultBenchmarks: Curriculum['benchmarks'];
  defaultSettings: Curriculum['settings'];
  suggestedDomains: string[];
  suggestedDuration: string;          // "3 months", "6 months", etc.
}

const CURRICULUM_TEMPLATES: CurriculumTemplate[] = [
  {
    purpose: 'academic_writing',
    name: 'Academic Essay Writing',
    description: 'Prepare for university-level essay writing with academic vocabulary and formal register',
    defaultBenchmarks: {
      targetLevel: 'B2',
      targetVocabularySize: 5000,
      targetGrammarCoverage: 0.8,
      targetSkillBalance: { writing: 0.4, reading: 0.3, vocabulary: 0.2, grammar: 0.1 }
    },
    defaultSettings: {
      primaryDomains: ['academic', 'research'],
      primaryRegisters: [/* formal, academic registers */],
      taskTypeWeights: { essay_writing: 0.3, paraphrasing: 0.2, summary_writing: 0.2 },
      modalityPreferences: { visual: 0.7, auditory: 0.3 },
      sessionDuration: 30,
      weeklyGoal: 5
    },
    suggestedDomains: ['academic', 'research', 'formal'],
    suggestedDuration: '3 months'
  },
  {
    purpose: 'standardized_test',
    name: 'TOEFL/IELTS Preparation',
    description: 'Comprehensive preparation for English proficiency exams',
    // ... similar structure
  }
];
```

**Gap 4.9: External Media Integration** (외부 미디어 연동)

딕셔너리 객체 클릭 시 관련 비디오/오디오를 자동 검색하여 제공.

- [ ] Define `ExternalMediaSource` interface
- [ ] Implement YouTube/Vimeo search integration
- [ ] Create podcast/audio clip search
- [ ] Implement relevance scoring for media results
- [ ] Design media player with learning annotations

```typescript
// Planned interface structure
interface ExternalMediaSource {
  id: string;
  type: 'youtube' | 'vimeo' | 'podcast' | 'audiobook' | 'news_clip';
  apiEndpoint: string;
  searchCapabilities: SearchCapability[];
  contentLicense: 'open' | 'creative_commons' | 'educational_use';
}

interface MediaSearchQuery {
  targetObject: ComponentObjectState;
  searchMode: 'usage_example' | 'explanation' | 'native_context' | 'tutorial';
  filters: {
    maxDuration: number;              // Seconds
    language: string;
    accent?: 'US' | 'UK' | 'AU';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    contentType?: 'educational' | 'authentic' | 'entertainment';
  };
}

interface MediaSearchResult {
  sourceType: ExternalMediaSource['type'];
  title: string;
  url: string;
  thumbnailUrl?: string;
  duration: number;
  relevanceScore: number;             // 0-1
  relevanceReason: string;            // Why this is relevant
  timestamp?: {                       // Specific moment in video
    start: number;
    end: number;
    context: string;
  };
  metadata: {
    views?: number;
    rating?: number;
    uploadDate?: Date;
    creator?: string;
  };
}

interface MediaPlayerAnnotation {
  mediaId: string;
  annotations: Array<{
    timestamp: number;
    type: 'vocabulary' | 'grammar' | 'pronunciation' | 'usage';
    objectId: string;                 // Link to LanguageObject
    note: string;
  }>;
  userNotes: string[];
  learningOutcome: {
    objectsEncountered: string[];
    exposureType: 'passive' | 'active';
  };
}

async function searchExternalMedia(query: MediaSearchQuery): Promise<MediaSearchResult[]>;
async function getMediaAnnotations(mediaUrl: string, targetObjects: string[]): Promise<MediaPlayerAnnotation>;
```

**Gap 4.10: Component Benchmark Standards** (컴포넌트별 벤치마크 기준)

각 언어 컴포넌트의 학습 목표 달성을 측정하는 표준화된 벤치마크.

- [ ] Define `ComponentBenchmark` interface per component
- [ ] Implement benchmark assessment tasks
- [ ] Create progress-to-benchmark tracking
- [ ] Design benchmark visualization (radar charts)
- [ ] Implement adaptive benchmark calibration

```typescript
// Planned interface structure
interface ComponentBenchmark {
  component: LanguageComponent;
  level: CEFRLevel;

  // Quantitative targets
  targets: {
    objectCount: number;              // Items to master
    accuracyThreshold: number;        // Min accuracy for "mastered"
    automationThreshold: number;      // Min automation level
    retentionDays: number;            // Stability requirement
  };

  // Qualitative criteria
  criteria: {
    description: string;
    canDoStatements: string[];        // "Can use X in Y context"
    exampleTasks: TraditionalTaskType[];
  };

  // Assessment specification
  assessment: {
    taskTypes: TraditionalTaskType[];
    minItems: number;
    maxItems: number;
    timeLimit?: number;
    adaptiveSelection: boolean;
  };
}

const VOCABULARY_BENCHMARKS: Record<CEFRLevel, ComponentBenchmark> = {
  'A1': {
    component: 'vocabulary',
    level: 'A1',
    targets: {
      objectCount: 500,
      accuracyThreshold: 0.7,
      automationThreshold: 0.5,
      retentionDays: 7
    },
    criteria: {
      description: 'Basic everyday vocabulary',
      canDoStatements: [
        'Can recognize and use basic greetings',
        'Can identify common objects and people',
        'Can understand simple written instructions'
      ],
      exampleTasks: ['word_bank_fill', 'matching', 'cloze_deletion']
    },
    assessment: {
      taskTypes: ['cloze_deletion', 'matching', 'word_bank_fill'],
      minItems: 20,
      maxItems: 50,
      timeLimit: 30,
      adaptiveSelection: true
    }
  },
  'A2': { /* ... */ },
  'B1': { /* ... */ },
  'B2': { /* ... */ },
  'C1': { /* ... */ },
  'C2': { /* ... */ }
};

interface BenchmarkAssessmentResult {
  curriculum: Curriculum;
  component: LanguageComponent;
  targetLevel: CEFRLevel;
  achievedLevel: CEFRLevel;
  scores: {
    accuracy: number;
    automation: number;
    retention: number;
    coverage: number;                 // % of target objects mastered
  };
  recommendations: string[];
  nextBenchmarkDate: Date;
}
```

**Connection Points (Extended):**

- Gap 4.5 ↔ Gap 4.6: Content generation feeds traditional task templates
- Gap 4.6 ↔ Gap 1.6: Traditional tasks extend existing task-word matching
- Gap 4.7 ↔ Gap 4.4: Cognitive tools integrate into visualization dashboard
- Gap 4.8 ↔ All Goals: Curriculum wraps multiple GoalSpecs
- Gap 4.9 ↔ Gap 4.3: External media links from ComponentObjectState
- Gap 4.10 ↔ Gap 4.8: Benchmarks define curriculum success criteria
- Gap 4.5 ↔ Gap 4.8: Content spec derived from curriculum settings
- Gap 4.6 ↔ Gap 4.10: Assessment tasks from benchmark specifications

---

## New Gaps Identified (2026-01-04)

### Gap 1.4: Five-Element Feature Vector z(w)

**Problem**: Original FRE (F, R, E) model lacks explicit domain distribution, morphological composition, and phonological difficulty metrics.

**Solution**: Extended to z(w) = [F, R, D, M, P] with:

- D: Domain distribution vector (multi-domain probability)
- M: Morphological composition (family size × productivity)
- P: Phonological constraint (G2P entropy + complexity)

**Status**: **COMPLETE** - See THEORETICAL-FOUNDATIONS.md Section 2.2.1

---

### Gap 1.5: Effective Priority with Learner State

**Problem**: Base priority only considers language structure, not learner's current mastery level.

**Solution**: S_eff formula integrating g(m) mastery adjustment:

```
S_eff(w) = S_base(w) × g(m(w))
```

Where g(m) implements Zone of Proximal Development targeting.

**Status**: **COMPLETE** - See ALGORITHMIC-FOUNDATIONS.md Section 3.3

---

### Gap 1.6: Task-Word Matching Algorithm

**Problem**: Task selection was not systematically linked to word characteristics.

**Solution**: Task templates with:

- `targetWordCriteria`: min/max thresholds for M, P, R, D
- `cognitiveProcesses`: specific processes activated
- `activatedLayers`: language layers exercised

Selection algorithm matches word z(w) profile to optimal task template.

**Status**: **COMPLETE** - See ALGORITHMIC-FOUNDATIONS.md Section 3.4

---

### Gap 1.9: Extended G2P Model

**Problem**: Basic G2P model lacks comprehensive coverage of English phonological complexity:
- One-to-many / many-to-one grapheme-phoneme mappings
- Complete English vowel system (tense/lax/diphthongs/r-colored)
- Stress and prosody patterns affecting pronunciation
- Silent letter patterns
- Syllable structure constraints (phonotactics)
- Exception categorization for irregular words

**Solution**: Extended G2P framework in Section 1.4 with:
- `MappingComplexity` interface with cardinality types
- `ENGLISH_VOWEL_SYSTEM` with 15+ vowel specifications including minimal pairs
- `StressPattern` types and `STRESS_SHIFTING_SUFFIXES`
- `SILENT_LETTER_PATTERNS` with etymology information
- `VALID_ONSETS` and `VALID_CODAS` for phonotactic validation
- `G2PException` database with 7 exception categories
- `computeComprehensiveP()` integrating all components into final P score

**Status**: **COMPLETE** - See THEORETICAL-FOUNDATIONS.md Section 1.4

---

*Document Version: 1.6*
*Updated: 2026-01-04*
*Purpose: Track implementation gaps and required algorithmic connections*
*Related: ALGORITHMIC-FOUNDATIONS.md provides complete implementations*
*New additions: Phase 4 Gaps (4.1-4.10): Grammar, Domain/Register, Component-Object State Dictionary, Visualization, Content Generation, Traditional Tasks, Cognitive Tools, Multi-Curriculum, External Media, Benchmarks*
