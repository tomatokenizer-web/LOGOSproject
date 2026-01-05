/**
 * Grammar Module Index
 *
 * Central export point for grammar organization and learning.
 * Implements Gap 4.1: Grammar Organization Algorithm.
 */

// Syntactic Construction Types and Library
export {
  type GrammarCategory,
  type ClauseType,
  type SyntacticFunction,
  type CognitiveLoadMetrics,
  type SyntacticConstruction,
  type GrammarLearningSequence,
  type ConstructionMasteryState,
  CORE_CONSTRUCTIONS,
  getConstructionsByCategory,
  getConstructionsForLevel,
  getCoreConstructions,
  getConstructionsByComplexity,
  getAllPrerequisites,
  calculateTotalCognitiveLoad,
} from './syntactic-construction';

// Grammar Sequence Optimizer
export {
  type SequenceOptimizationConfig,
  type ScoredConstruction,
  type SequenceOptimizationResult,
  type GrammarSessionPlan,
  GrammarSequenceOptimizer,
  createGrammarOptimizer,
  generateGrammarSequence,
  getConstructionsForStage,
} from './grammar-sequence-optimizer';
