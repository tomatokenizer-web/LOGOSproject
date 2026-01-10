/**
 * State Module Index
 *
 * Central export point for component object state tracking.
 * Implements Gap 4.3: Component-Object State Dictionary.
 */

// Component Object State Types and Functions
export {
  type LanguageComponent,
  type TaskPhase,
  type ProblemType,
  type ExposurePattern,
  type CognitiveInduction,
  type IRTMetrics,
  type TransferEffects,
  type FeatureVector,
  type ObjectRelations,
  type ActivityParticipation,
  type MasteryStateSummary,
  type ComponentObjectState,
  createComponentObjectState,
  recordExposure,
  updateIRTMetrics,
  updateCognitiveInduction,
  updateMasteryState,
  addRelation,
  calculateEffectivePriority,
  needsReview,
  isAutomized,
  getBottleneckScore,
} from './component-object-state';

// Component Search Engine
export {
  type SearchFilters,
  type SortOption,
  type GroupOption,
  type SearchResult,
  type GroupedSearchResult,
  type PriorityListItem,
  type NetworkNode,
  type NetworkEdge,
  type NetworkGraphView,
  ComponentSearchEngine,
  createSearchEngine,
  createSearchEngineWithData,
} from './component-search-engine';

// Fluency-Diversity State Tracking
export {
  // Types
  type RTObservation,
  type FluencyMetrics,
  type FluencyCategory,
  type ContextUsage,
  type ProductionSample,
  type DiversityMetrics,
  type DiversityCategory,
  type FluencyDiversityProfile,
  type FluencyDiversityState,
  // Constants
  FLUENCY_RT_THRESHOLDS,
  FLUENCY_CV_THRESHOLDS,
  DIVERSITY_THRESHOLDS,
  // Factory Functions
  createFluencyDiversityState,
  // State Update Functions
  recordRTObservation,
  recordContextUsage,
  recordProductionSample,
  // Metric Calculation
  calculateFluencyMetrics,
  calculateDiversityMetrics,
  estimateStageFromFluencyDiversity,
  generateRecommendations,
  createFluencyDiversityProfile,
  // Utility Functions
  needsRefresh,
  updateCache,
  serializeState,
  deserializeState,
  mergeStates,
} from './fluency-diversity-state';
