/**
 * Content Module Index
 *
 * Central export point for content generation and validation.
 * Implements Gap 4.5: Content Sourcing & Generation Framework.
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

// Content Specification
export {
  type ContentSourceType,
  type ContentQualityTier,
  type RegisterLevel,
  type ContentGenre,
  type ContentSpec,
  type ContentContextSpec,
  type ContentQualitySpec,
  type GenerationConstraints,
  type GeneratedContent,
  type ContentMetadata,
  createContentSpec,
  createIntroductionSpec,
  createProductionSpec,
  createComprehensionSpec,
  createFluencySpec,
  validateContentSpec,
  contentMeetsSpec,
  estimateGenerationComplexity,
} from './content-spec';

// Content Generator
export {
  type GeneratorConfig,
  type ContentCache,
  type ContentTemplate,
  type GenerationResult,
  ContentGenerator,
  createContentGenerator,
} from './content-generator';

// Content Validator
export {
  type ValidationResult,
  type ValidationCheck,
  type ValidationCategory,
  type ValidatorConfig,
  type LinguisticBenchmark,
  ContentQualityValidator,
  createContentValidator,
  validateContent,
} from './content-validator';
