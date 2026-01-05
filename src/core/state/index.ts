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
