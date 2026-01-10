/**
 * LOGOS Core Module
 *
 * Central export point for all core algorithms and types.
 * The core module contains PURE functions with no external dependencies.
 *
 * Architecture:
 * - All algorithms are pure (no side effects, no I/O)
 * - Types are shared via types.ts
 * - Each algorithm file is self-contained
 *
 * Usage:
 * ```typescript
 * import { probability2PL, estimateThetaEAP, PMICalculator } from '@core';
 * // Or import specific modules
 * import { probability2PL } from '@core/irt';
 * ```
 */

// =============================================================================
// Core Types
// =============================================================================

export * from './types';

// =============================================================================
// IRT (Item Response Theory) - Ability Estimation
// =============================================================================

export {
  // Probability functions
  probability1PL,
  probability2PL,
  probability3PL,
  // Estimation functions
  estimateThetaMLE,
  estimateThetaEAP,
  fisherInformation,
  selectNextItem,
  selectItemKL,
  // Calibration
  calibrateItems,
} from './irt';

// =============================================================================
// FSRS (Free Spaced Repetition Scheduler) - Memory Scheduling
// =============================================================================

export {
  // Types
  type FSRSRating,
  type FSRSState,
  type FSRSCard,
  type FSRSParameters,
  type MasteryStage,
  type MasteryState,
  type FSRSResponseData,
  // Constants
  DEFAULT_WEIGHTS,
  DEFAULT_PARAMETERS,
  STAGE_THRESHOLDS,
  // Class
  FSRS,
  // Functions
  createNewCard,
  createInitialMasteryState,
  responseToRating,
  updateMastery,
  determineStage,
  calculateScaffoldingGap,
  determineCueLevel,
} from './fsrs';

// =============================================================================
// PMI (Pointwise Mutual Information) - Corpus Analysis
// =============================================================================

export {
  // Types
  type PMIResult,
  type TaskType as PMITaskType,
  // Class
  PMICalculator,
  // Functions
  pmiToDifficulty,
  frequencyToDifficulty,
} from './pmi';

// =============================================================================
// Priority - Learning Queue Ordering
// =============================================================================

export {
  // Types
  type FREMetrics,
  type PriorityWeights,
  type CostFactors,
  type LanguageObject as PriorityLanguageObject,
  type UserState,
  type MasteryInfo,
  type QueueItem,
  // Constants
  DEFAULT_PRIORITY_WEIGHTS,
  LEVEL_WEIGHT_ADJUSTMENTS,
  // Functions
  computeFRE,
  computeCost,
  estimateCostFactors,
  computePriority,
  computeUrgency,
  computeFinalScore,
  sortByPriority,
  getTopPriorityItems,
  buildLearningQueue,
  getSessionItems,
  getWeightsForLevel,
  inferLevel,
} from './priority';

// =============================================================================
// Bottleneck Detection - Error Analysis
// =============================================================================

export {
  // Types
  type ComponentType,
  type BottleneckEvidence,
  type BottleneckAnalysis,
  type CascadeAnalysis,
  type BottleneckDetectionConfig,
  type ResponseData as BottleneckResponseData,
  // Constants
  DEFAULT_BOTTLENECK_CONFIG,
  CASCADE_ORDER,
  // Functions
  analyzeBottleneck,
  analyzeErrorPatterns,
  findCooccurringErrors,
  analyzeCascadingErrors,
  calculateImprovementTrend,
  isComponentType,
  getCascadePosition,
  canCauseErrors,
  getDownstreamComponents,
  getUpstreamComponents,
  summarizeBottleneck,
} from './bottleneck';

// =============================================================================
// Morphology - Word Structure Analysis
// =============================================================================

export {
  // Types
  type Affix,
  type MorphologicalAnalysis,
  type InflectionType,
  type DerivationType,
  type MorphologicalTransfer,
  type MorphologicalVector,
  type MorphemeUnit,
  type SyllableUnit,
  type WordSegmentation,
  type MorphologicalFamily,
  type MultiLayerWordCard,
  // Constants
  ENGLISH_PREFIXES,
  ENGLISH_SUFFIXES,
  // Functions
  segmentWord,
  buildMorphologicalFamily,
  computeMorphologicalScore,
  buildWordIndexes,
  buildMultiLayerWordCard,
  analyzeMorphology,
  toMorphologicalVector,
  findTransferCandidates,
  measureTransferEffect,
  getAffixesForDomain,
  hasAffix,
  extractLemma,
  getMorphologicalComplexity,
} from './morphology';

// =============================================================================
// G2P (Grapheme-to-Phoneme) - Pronunciation
// =============================================================================

export {
  // Types
  type G2PRule,
  type G2PContext,
  type G2PDifficulty,
  type IrregularPattern,
  type L1Mispronunciation,
  type PhonologicalVector,
  type OrthographicVector,
  type G2PTransfer,
  type GraphemeUnit,
  type PhonemeResult,
  // Constants
  ENGLISH_G2P_RULES,
  L1_INTERFERENCE_PATTERNS,
  // Functions
  segmentGraphemes,
  applyG2PRules,
  computeG2PEntropy,
  computePhonologicalDifficulty,
  analyzeG2PDifficulty,
  countSyllables,
  predictMispronunciations,
  analyzeG2PWithL1,
  toPhonologicalVector,
  toOrthographicVector,
  findG2PTransferCandidates,
  measureG2PTransfer,
  getRulesForDomain,
  getSupportedL1Languages,
  isRegularG2P,
  getG2PDifficultyCategory,
} from './g2p';

// =============================================================================
// Syntactic - Grammar Analysis
// =============================================================================

export {
  // Types
  type SyntacticComplexity,
  type CEFRLevel,
  type SyntacticVector,
  type PartOfSpeech,
  type ClauseAnalysis,
  type SubordinateClauseType,
  type GenreStructure,
  // Constants
  CEFR_COMPLEXITY_TARGETS,
  GENRE_STRUCTURES,
  // Functions
  analyzeSyntacticComplexity,
  analyzeClauseStructure,
  estimateCEFRLevel,
  matchesCEFRLevel,
  getSimplificationSuggestions,
  estimatePartOfSpeech,
  toSyntacticVector,
  detectGenre,
  analyzeGenreCompliance,
  compareCEFRLevels,
  getNextCEFRLevel,
  isSuitableForStage,
} from './syntactic';

// =============================================================================
// Response Timing - Performance Analysis
// =============================================================================

export {
  // Types
  type ResponseTimeThresholds,
  type TaskCategory,
  type ResponseTimeAnalysis,
  type FluencyMetrics,
  // Functions
  getTaskCategory,
  getAdjustedThresholds,
  analyzeResponseTime,
  calculateFSRSRatingWithTiming,
  calculateFluencyMetrics,
  detectSuspiciousPatterns,
  getTargetResponseTime,
} from './response-timing';

// =============================================================================
// Task Matching - Exercise Selection
// =============================================================================

export {
  // Types
  type ZVector,
  type TaskSuitabilityMap,
  type TaskRecommendation,
  type WordProfile,
  // Functions
  calculateTaskSuitability,
  getDominantComponent,
  recommendTask,
  recommendTaskBatch,
  extractZVector,
  isTaskSuitable,
  getOptimalModality,
} from './task-matching';

// =============================================================================
// Transfer - L1 Influence
// =============================================================================

export {
  // Types
  type LanguageFamily,
  type TransferCoefficients,
  type LanguagePairProfile,
  type TransferAdjustedDifficulty,
  // Functions
  getLanguageFamily,
  getTransferCoefficients,
  getLanguagePairProfile,
  calculateTransferAdjustedDifficulty,
  calculateTransferGain,
  getPhonologicalDifficultyBonus,
  isCognate,
} from './transfer';

// =============================================================================
// Stage Thresholds - Mastery Progression
// =============================================================================

export {
  // Types
  type ThresholdConfig,
  type ABTestGroup,
  type ABTest,
  type TestAssignment,
  type StageTransitionEvent,
  // Constants
  DEFAULT_THRESHOLDS,
  CONSERVATIVE_THRESHOLDS,
  AGGRESSIVE_THRESHOLDS,
  RESEARCH_THRESHOLDS,
  // Registry
  thresholdRegistry,
  // Functions
  checkStageTransition,
  getRecommendedCueLevel,
  calculateStageProgress,
} from './stage-thresholds';

// =============================================================================
// Quadrature - Numerical Integration
// =============================================================================

export {
  // Types
  type QuadratureNode,
  type QuadratureRule,
  // Constants
  RECOMMENDED_SETTINGS,
  // Functions
  getGaussHermiteNodes,
  createGaussHermiteRule,
  createUniformRule,
  integrateNormal,
  computeEAP,
  estimateThetaEAPGaussHermite,
  compareQuadratureMethods,
} from './quadrature';

// =============================================================================
// Submodules - Domain-Specific Features
// =============================================================================

// Content generation and validation
export * from './content';

// Task type library and generation
export * from './tasks';

// Grammar sequence optimization
export * from './grammar';

// State management
export * from './state';

// Register profiling
export * from './register';

// =============================================================================
// Lexical - Vocabulary Analysis (LEX Objects)
// =============================================================================

export {
  // Types
  type LexicalPOS,
  type FrequencyBand,
  type WordFamily,
  type CollocationPattern,
  type LexicalAnalysis,
  type LexicalVector,
  type LexicalObject,
  type VocabularyProfile,
  // Functions
  tokenize,
  extractLemma as extractLexicalLemma,
  estimatePOS,
  getFrequencyBand,
  isAWL,
  detectDomains,
  detectRegister,
  estimatePolysemy,
  estimateConcreteness,
  estimateImageability,
  calculateLexicalDifficulty,
  analyzeLexical,
  toLexicalVector,
  extractLexicalObjects,
  createVocabularyProfile,
  getLexicalDifficultyCategory,
  filterByDifficulty,
  filterByFrequencyBand,
  filterByDomain,
  sortByLearningPriority,
} from './lexical';

// =============================================================================
// Automatization - Procedural Skill Acquisition
// =============================================================================

export {
  // Types
  type ResponseObservation,
  type PowerLawModel,
  type CVAnalysis,
  type SpeedAccuracyAnalysis,
  type TransferAnalysis,
  type InterferenceAnalysis,
  type AutomatizationProfile,
  type AutomatizationCategory,
  // Constants
  CV_THRESHOLDS,
  AUTOMATIZATION_THRESHOLDS,
  RT_THRESHOLDS,
  MIN_OBSERVATIONS,
  // Functions
  isValidObservation,
  calculateCV,
  fitPowerLaw,
  analyzeSpeedAccuracy,
  analyzeTransfer,
  analyzeInterference,
  calculateAutomatizationLevel,
  getAutomatizationCategory,
  estimateStageFromAutomatization,
  calculateTrend,
  createAutomatizationProfile,
  suggestPracticeConditions,
  recommendRating,
  isReadyForReducedPractice,
  calculateRetrievalStrength,
} from './automatization';

// =============================================================================
// Multi-Object Selection - Stage 3 Task Composition
// =============================================================================

export {
  // Types
  type ObjectSelectionProfile,
  type CombinationFeasibility,
  type CombinationRisk,
  type CombinationBenefit,
  type ObjectGrouping,
  type SelectionStrategy,
  // Constants
  DEFAULT_SELECTION_STRATEGY,
  COMPONENT_COGNITIVE_LOAD,
  STAGE_COMPATIBILITY,
  COMPONENT_INTERACTIONS,
  // Functions
  calculateCombinedCognitiveLoad,
  estimateCombinedDifficulty,
  predictCombinedSuccess,
  identifyRisks,
  identifyBenefits,
  evaluateCombinationFeasibility,
  selectSupportingObjects,
  determineTaskType,
  createObjectGroupingBatch,
} from './multi-object-selection';

// =============================================================================
// Transfer Prediction - Within-L2 Transfer Effects
// =============================================================================

export {
  // Types
  type TransferType,
  type TransferDirection,
  type TransferRelation,
  type TransferPrediction,
  type ObjectLearningState,
  type TransferNetwork,
  type BatchTransferResult,
  type DecayFunction,
  type TransferModelConfig,
  // Constants
  DEFAULT_TRANSFER_RATES,
  TRANSFER_ASYMMETRY,
  STAGE_TRANSFER_MODIFIER,
  DEFAULT_TRANSFER_CONFIG,
  // Functions
  calculateTransferDecay,
  calculateEffectiveTransfer,
  predictTransfer,
  aggregatePredictions,
  buildTransferNetwork,
  calculateIndirectTransfer,
  generateBatchTransferPredictions,
  estimateTransferStrength,
  createTransferRelation,
} from './transfer-prediction';

// =============================================================================
// Component Evaluation - Component-Specific Scoring
// =============================================================================

export {
  // Types
  type EvaluationCriterion,
  type ErrorCategory,
  type ComponentEvaluationProfile,
  type StageRequirement,
  type ComponentEvaluationResult,
  type MultiComponentEvaluationResult,
  type CascadeEffect,
  // Constants
  STANDARD_RUBRIC,
  LEX_PROFILE,
  MORPH_PROFILE,
  G2P_PROFILE,
  SYN_PROFILE,
  PRAG_PROFILE,
  COMPONENT_PROFILES,
  // Functions
  getComponentProfile,
  evaluateResponse,
  checkStageProgression,
  evaluateMultiComponent,
} from './component-evaluation';

// =============================================================================
// Indirect Update - Learning Propagation
// =============================================================================

export {
  // Types
  type ObjectUpdateEvent,
  type UpdateType,
  type IndirectUpdate,
  type PropagationResult,
  type ObjectPropagationState,
  type PropagationConfig,
  type UpdateHistoryEntry,
  // Constants
  DEFAULT_PROPAGATION_CONFIG,
  STAGE_IMPROVEMENT_WEIGHTS,
  // Functions
  calculateBaseMagnitude,
  calculatePropagationMagnitude,
  calculateDifficultyAdjustment,
  calculateStabilityBoost,
  calculatePriorityAdjustment,
  createIndirectUpdate,
  propagateUpdate,
  applyIndirectUpdates,
  filterByMagnitude,
  groupByTarget,
  aggregateUpdates,
  createHistoryEntry,
  summarizePropagation,
} from './indirect-update';

// =============================================================================
// Milestone Events - Achievement Tracking
// =============================================================================

export {
  // Types
  type MilestoneType,
  type MilestonePriority,
  type MilestoneEvent,
  type MilestoneData,
  type MilestoneDefinition,
  type MilestoneDetector,
  type MilestoneDetectionResult,
  type LearnerProgressState,
  type MilestoneListener,
  type MilestoneRegistryConfig,
  type MilestoneStats,
  // Constants
  DEFAULT_MILESTONE_CONFIG,
  STAGE_TRANSITION_MILESTONES,
  ACCURACY_MILESTONES,
  VOCABULARY_MILESTONES,
  STREAK_MILESTONES,
  FIRST_MASTERY_MILESTONE,
  PERFECT_SESSION_MILESTONE,
  DEFAULT_MILESTONES,
  // Class
  MilestoneRegistry,
  // Functions
  createEmptyProgressState,
  getMilestonePriorityOrder,
  sortMilestonesByPriority,
  filterMilestonesByType,
  calculateTotalPoints,
  groupMilestonesByType,
  summarizeMilestones,
} from './milestone-events';

// =============================================================================
// Component Vectors - Component-Specific z(w) Vector System
// =============================================================================

export {
  // Component Code Types
  type ComponentCode,
  type CEFRLevel as ComponentCEFRLevel,
  type CognitiveProcess,
  type LearningGoal,
  type TaskType as ComponentTaskType,

  // Base Vector
  type BaseComponentVector,

  // Component-Specific Vectors
  type PHONVector,
  type MORPHVector,
  type LEXVector as ComponentLEXVector,
  type SYNTVector,
  type PRAGVector,
  type ComponentVector,

  // Supporting Types
  type PredictedMispronunciation,
  type Affix as ComponentAffix,
  type CollocationEntry,
  type CognateStatus,
  type FrequencyBand as ComponentFrequencyBand,
  type LexicalPOS as ComponentLexicalPOS,
  type SubordinateClauseType as ComponentSubordinateClauseType,
  type SpeechActType,
  type IllocutionaryForce,
  type FormalityLevel,
  type PolitenessStrategy,
  type InterlocutorRelationship,
  type PragmaticInterference,

  // Priority Calculation
  type PriorityWeights as ComponentPriorityWeights,
  type ComponentUserState,
  type GoalContext,
  type ComponentPriorityCalculation,

  // Task Design
  type TaskFormat,
  type CueLevelType,
  type ComponentTaskDesignParams,

  // Learning Trajectory
  type TrajectoryKeyFactor,
  type LearningTrajectoryPrediction,

  // Type Guards
  isPHONVector,
  isMORPHVector,
  isLEXVector,
  isSYNTVector,
  isPRAGVector,

  // Cost Modifier Functions
  computePHONCostModifier,
  computeMORPHCostModifier,
  computeLEXCostModifier,
  computeSYNTCostModifier,
  computePRAGCostModifier,
  computeComponentCostModifier,

  // Priority Functions
  computeFREFromVector,
  computeComponentPriority,

  // Task Design Functions
  generateTaskDesignParams,

  // Trajectory Prediction
  predictLearningTrajectory,

  // Constants
  DEFAULT_PRIORITY_WEIGHTS as COMPONENT_DEFAULT_PRIORITY_WEIGHTS,
  MAX_COLLOCATIONS,
  MAX_MISPRONUNCIATIONS,
  MAX_KEY_FACTORS,
  MAX_INTERVENTIONS,
  MAX_CONTEXTS,
  MAX_TASK_TYPES,
} from './component-vectors';
