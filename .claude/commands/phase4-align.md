# LOGOS Phase 4 Implementation & Full Alignment

## Context

LOGOS specification documents have been updated with comprehensive Phase 4 gaps (4.1-4.10). This prompt instructs the implementation of Phase 4 features and alignment of all Phase 1-3 configurations with the updated specifications.

## Source Documents

Read and understand the following specification documents before proceeding:

1. `GAPS-AND-CONNECTIONS.md` (v1.6) - Implementation tracking and Gap definitions
2. `THEORETICAL-FOUNDATIONS.md` (v2.2) - Theoretical framework including Extended G2P
3. `ALGORITHMIC-FOUNDATIONS.md` (v1.1) - Complete algorithm implementations
4. `DEVELOPMENT-PROTOCOL.md` (v1.3) - Phase definitions and implementation rules

## Phase 4 Gaps to Implement

### HIGH PRIORITY (Phase 3 scope - implement first)

**Gap 4.5: Content Sourcing & Generation Framework**
- Implement `ContentSpec` interface with difficulty constraints
- Create `ContentGenerator` with Claude API integration
- Design fallback chain: cached → template → AI-generated
- Implement `ContentQualityValidator` with linguistic benchmarks
- Create `PedagogicalIntent` types: introduce_new, reinforce_known, test_comprehension, elicit_production, contextual_usage, error_detection

**Gap 4.6: Traditional Task Type Library**
- Implement 30 `TraditionalTaskType` definitions:
  - RECEPTIVE: reading_comprehension, listening_comprehension, inference_from_context, main_idea_identification, detail_extraction
  - PRODUCTIVE: essay_writing, summary_writing, dictation, sentence_completion, free_response
  - TRANSFORMATIVE: translation, paraphrasing, sentence_combining, sentence_splitting, register_shift, voice_transformation, tense_transformation
  - FILL-IN: cloze_deletion, word_bank_fill, constrained_fill, multiple_blank
  - INTERACTIVE: dialogue_completion, role_play_prompt, question_answering, debate_response
  - ANALYTICAL: error_correction, grammar_identification, word_formation_analysis, collocation_judgment, register_appropriateness
- Create `TraditionalTaskTemplate` extending `TaskTemplateMetadata`
- Implement `TaskConstraintSolver` for object selection
- Implement `DistractorGenerator` for MCQ tasks

### MEDIUM PRIORITY (Phase 4 scope)

**Gap 4.1: Grammar Organization Algorithm**
- Define `SyntacticConstruction` interface with complexity metrics
- Implement `computeSyntacticPriority()` for grammar ordering
- Design `GrammarSequenceOptimizer` with prerequisite dependencies
- Integrate grammar-vocabulary co-learning paths

**Gap 4.2: Domain/Register Structure Algorithm**
- Define `RegisterProfile` interface (formality, genre, purpose)
- Implement `computeRegisterFit()` for word-context matching
- Design `DomainTransferModel` for cross-register vocabulary
- Integrate with D (domain distribution) in z(w) vector

**Gap 4.3: Component-Object State Dictionary**
- Define `ComponentObjectState` interface with:
  - exposureHistory (byModality, byTaskPhase, exposurePattern)
  - cognitiveInduction (automationLevel, usageSpaceExpansion, proceduralFluency, declarativeStrength)
  - irtMetrics (accuracyByIntent, accuracyByProblemType, thetaEstimate)
  - transferEffects (positiveTransferTo, negativeTransferTo, autoReinforcementScore)
  - activityParticipation (interpretationTasks, creationTasks, engagementTime)
  - relations (collocations, morphologicalFamily, semanticNeighbors, syntacticPatterns)
- Implement `ComponentSearchEngine` per component
- Create special filters: getNotAutomized(), getContextEmphasized(), getHighTransferValue(), getBottlenecks()

**Gap 4.4: Multi-View Visualization Dashboard**
- Implement `DictionaryView` with search/filter/sort
- Implement `NetworkGraphView` with D3.js/vis.js
- Implement `PriorityListView` with reasoning
- Create component switcher (G2P ↔ Morph ↔ Vocab ↔ Grammar ↔ Pragmatic)

**Gap 4.7: Cognitive Manipulation Tools**
- Implement `CognitiveToolkit` interface:
  - highlighting (colorCodes by component, autoHighlight)
  - chunking (syllableBreak, morphemeBreak, phraseBreak)
  - connections (showCollocations, showMorphFamily, showSemanticNeighbors)
  - audio (playPronunciation, playAtSpeed, repeatSegment)
  - answerTools (scratchpad, wordBank, hintLevel, checkPartial)

**Gap 4.8: Multi-Curriculum Management**
- Define `Curriculum` entity with:
  - CurriculumPurpose: academic_writing, standardized_test, professional_domain, conversational_fluency, reading_comprehension, exam_preparation, custom
  - benchmarks (targetLevel CEFR, targetVocabularySize, targetGrammarCoverage, targetSkillBalance)
  - settings (primaryDomains, primaryRegisters, taskTypeWeights, modalityPreferences, sessionDuration, weeklyGoal)
  - contentSources (internalCorpus, externalSources, userUploads)
  - progress tracking
- Create `CurriculumTemplate` for each purpose type
- Implement curriculum creation wizard

**Gap 4.9: External Media Integration**
- Define `ExternalMediaSource` interface (youtube, vimeo, podcast, audiobook, news_clip)
- Implement `searchExternalMedia()` with relevance scoring
- Create `MediaPlayerAnnotation` for learning annotations
- Design timestamp-based object linking

**Gap 4.10: Component Benchmark Standards**
- Define `ComponentBenchmark` per CEFR level (A1-C2) per component
- Implement quantitative targets (objectCount, accuracyThreshold, automationThreshold, retentionDays)
- Create qualitative criteria (canDoStatements, exampleTasks)
- Implement `BenchmarkAssessmentResult` with recommendations

## Phase 1-3 Alignment Tasks

### Phase 1 Verification
Confirm all Phase 1 algorithms are implemented:
- [ ] IRT mathematics (1PL, 2PL, 3PL) in `src/core/irt/`
- [ ] θ estimation (MLE, EAP) in `src/core/irt/`
- [ ] PMI computation in `src/core/pmi/`
- [ ] FSRS integration in `src/core/fsrs/`
- [ ] Bottleneck detection in `src/core/bottleneck/`

### Phase 2 Implementation
Ensure Phase 2 schema and G2P are implemented:
- [ ] Schema fields: domainDistribution, morphologicalScore, phonologicalDifficulty
- [ ] G2PRule interface and ENGLISH_G2P_RULES
- [ ] Extended G2P: MappingComplexity, ENGLISH_VOWEL_SYSTEM, StressPattern
- [ ] SILENT_LETTER_PATTERNS, VALID_ONSETS, VALID_CODAS
- [ ] G2PException database
- [ ] computeComprehensiveP() function
- [ ] WordSegmentation pipeline
- [ ] MorphologicalFamily builder
- [ ] MultiLayerWordCard structure

### Phase 3 Implementation
Ensure Phase 3 engine is complete:
- [ ] computeEffectivePriority() with S_eff formula
- [ ] computeMasteryAdjustment() g(m) function
- [ ] computeContextModifier() function
- [ ] selectOptimalTask() with word criteria matching
- [ ] TASK_TEMPLATES array (extend to 30+ with TraditionalTaskType)
- [ ] computeTaskWordFit() scoring
- [ ] isTaskTypeAppropriateForStage() mapping

## File Structure for Phase 4

```
src/
├── core/
│   ├── content/
│   │   ├── content-spec.ts           # Gap 4.5
│   │   ├── content-generator.ts      # Gap 4.5
│   │   ├── content-validator.ts      # Gap 4.5
│   │   └── pedagogical-intent.ts     # Gap 4.5
│   ├── tasks/
│   │   ├── traditional-task-types.ts # Gap 4.6
│   │   ├── task-constraint-solver.ts # Gap 4.6
│   │   ├── distractor-generator.ts   # Gap 4.6
│   │   └── task-templates-extended.ts # Gap 4.6
│   ├── grammar/
│   │   ├── syntactic-construction.ts # Gap 4.1
│   │   ├── grammar-sequence.ts       # Gap 4.1
│   │   └── grammar-priority.ts       # Gap 4.1
│   ├── register/
│   │   ├── register-profile.ts       # Gap 4.2
│   │   ├── domain-structure.ts       # Gap 4.2
│   │   └── register-fit.ts           # Gap 4.2
│   ├── state/
│   │   ├── component-object-state.ts # Gap 4.3
│   │   ├── component-search.ts       # Gap 4.3
│   │   └── exposure-history.ts       # Gap 4.3
│   ├── curriculum/
│   │   ├── curriculum.ts             # Gap 4.8
│   │   ├── curriculum-templates.ts   # Gap 4.8
│   │   └── curriculum-progress.ts    # Gap 4.8
│   ├── benchmark/
│   │   ├── component-benchmark.ts    # Gap 4.10
│   │   ├── cefr-standards.ts         # Gap 4.10
│   │   └── benchmark-assessment.ts   # Gap 4.10
│   └── media/
│       ├── external-media-source.ts  # Gap 4.9
│       ├── media-search.ts           # Gap 4.9
│       └── media-annotation.ts       # Gap 4.9
├── renderer/
│   └── components/
│       ├── visualization/
│       │   ├── DictionaryView.tsx    # Gap 4.4
│       │   ├── NetworkGraphView.tsx  # Gap 4.4
│       │   ├── PriorityListView.tsx  # Gap 4.4
│       │   └── ComponentSwitcher.tsx # Gap 4.4
│       ├── cognitive-tools/
│       │   ├── HighlightTool.tsx     # Gap 4.7
│       │   ├── ChunkingTool.tsx      # Gap 4.7
│       │   ├── ConnectionOverlay.tsx # Gap 4.7
│       │   ├── AudioPlayer.tsx       # Gap 4.7
│       │   └── AnswerAssist.tsx      # Gap 4.7
│       ├── curriculum/
│       │   ├── CurriculumWizard.tsx  # Gap 4.8
│       │   ├── CurriculumCard.tsx    # Gap 4.8
│       │   └── CurriculumProgress.tsx # Gap 4.8
│       └── media/
│           ├── MediaSearch.tsx       # Gap 4.9
│           └── AnnotatedPlayer.tsx   # Gap 4.9
└── main/
    └── ipc/
        ├── content.ipc.ts            # Gap 4.5
        ├── curriculum.ipc.ts         # Gap 4.8
        ├── media.ipc.ts              # Gap 4.9
        └── benchmark.ipc.ts          # Gap 4.10
```

## Database Schema Extensions

Add to `prisma/schema.prisma`:

```prisma
model Curriculum {
  id          String   @id @default(uuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  name        String
  purpose     String   // CurriculumPurpose
  description String?

  // Benchmarks
  targetLevel         String   // CEFR level
  targetVocabularySize Int
  targetGrammarCoverage Float
  targetSkillBalance  Json     // Record<SkillType, number>

  // Settings
  primaryDomains      Json     // string[]
  taskTypeWeights     Json     // Partial<Record<TraditionalTaskType, number>>
  modalityPreferences Json     // Partial<Record<Modality, number>>
  sessionDuration     Int      @default(30)
  weeklyGoal          Int      @default(5)

  // Progress
  startDate           DateTime @default(now())
  targetDate          DateTime?
  currentLevel        Float    @default(0)
  objectsMastered     Int      @default(0)
  objectsInProgress   Int      @default(0)

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  goals  GoalSpec[]

  @@index([userId])
}

model ExposureHistory {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())

  objectId  String
  object    LanguageObject @relation(fields: [objectId], references: [id], onDelete: Cascade)

  modality  String   // 'visual' | 'auditory' | 'kinesthetic'
  taskPhase String   // 'learning' | 'training' | 'evaluation'
  taskType  String   // TraditionalTaskType

  // Outcome
  correct   Boolean
  responseTimeMs Int

  @@index([objectId, createdAt(sort: Desc)])
}

model ExternalMedia {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())

  sourceType String  // 'youtube' | 'podcast' | etc.
  url        String  @unique
  title      String
  duration   Int     // seconds

  // Annotations
  annotations Json   // MediaPlayerAnnotation

  // Learning outcomes
  objectsEncountered Json  // string[]

  @@index([url])
}
```

## Implementation Order

1. **Phase 3 completion first** (Gap 4.5, 4.6) - Content & Task foundations
2. **Core Phase 4** (Gap 4.1, 4.2, 4.3) - Grammar, Register, State Dictionary
3. **UI Phase 4** (Gap 4.4, 4.7) - Visualization, Cognitive Tools
4. **Advanced Phase 4** (Gap 4.8, 4.9, 4.10) - Curriculum, Media, Benchmarks

## Connection Points to Verify

After implementation, verify these connections work:

- Gap 4.5 ↔ Gap 4.6: Content generation feeds traditional task templates
- Gap 4.6 ↔ Gap 1.6: Traditional tasks extend existing task-word matching
- Gap 4.7 ↔ Gap 4.4: Cognitive tools integrate into visualization dashboard
- Gap 4.8 ↔ All Goals: Curriculum wraps multiple GoalSpecs
- Gap 4.9 ↔ Gap 4.3: External media links from ComponentObjectState
- Gap 4.10 ↔ Gap 4.8: Benchmarks define curriculum success criteria
- Gap 4.5 ↔ Gap 4.8: Content spec derived from curriculum settings
- Gap 4.6 ↔ Gap 4.10: Assessment tasks from benchmark specifications

## Validation Checklist

- [ ] All Phase 1 algorithms have unit tests
- [ ] All Phase 2 schema fields are in Prisma and migrations run
- [ ] All Phase 3 functions are implemented and tested
- [ ] All Phase 4 interfaces are defined in TypeScript
- [ ] All Phase 4 UI components render correctly
- [ ] All IPC handlers are registered
- [ ] GAPS-AND-CONNECTIONS.md Implementation Tracking is updated
- [ ] All connection points verified working

---

*Prompt Version: 1.0*
*Target: LOGOS Phase 4 Implementation*
*Aligned with: GAPS-AND-CONNECTIONS.md v1.6, THEORETICAL-FOUNDATIONS.md v2.2, ALGORITHMIC-FOUNDATIONS.md v1.1*
