/**
 * Content Module Index
 *
 * Pedagogical intent types for learning phase and difficulty specification.
 * Content generation is handled by task-generation.service.ts.
 */

// Pedagogical Intent
export {
  type PedagogicalIntent,
  type LearningPhase,
  type DifficultyConstraints,
  type ScaffoldingConfig,
  type CueType,
  type PedagogicalIntentMeta,
  PEDAGOGICAL_INTENTS,
  getIntentsForStage,
  getIntentsForPhase,
  requiresProduction,
  getScaffoldingLevel,
  selectOptimalIntent,
  calculateExpectedSuccess,
} from './pedagogical-intent';
