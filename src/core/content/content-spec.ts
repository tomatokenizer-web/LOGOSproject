/**
 * Content Specification Types
 *
 * Defines the specification interface for content generation requests.
 * ContentSpec captures all constraints and requirements for generating
 * learning content.
 *
 * From GAPS-AND-CONNECTIONS.md Gap 4.5
 */

import type { ComponentType, TaskType, TaskModality, LanguageObject } from '../types';
import type {
  PedagogicalIntent,
  DifficultyConstraints,
  ScaffoldingConfig,
  LearningPhase,
} from './pedagogical-intent';

// =============================================================================
// Types
// =============================================================================

/**
 * Content source type.
 */
export type ContentSourceType =
  | 'cached'        // Pre-generated and stored
  | 'template'      // Template-based generation
  | 'ai_generated'  // Claude API generation
  | 'corpus'        // Extracted from corpus
  | 'user_created'; // User-uploaded content

/**
 * Quality tier for content.
 */
export type ContentQualityTier =
  | 'premium'     // AI-generated, validated
  | 'standard'    // Template-based, good quality
  | 'fallback';   // Emergency fallback, basic

/**
 * Register/formality level.
 */
export type RegisterLevel =
  | 'formal'
  | 'neutral'
  | 'informal'
  | 'colloquial';

/**
 * Genre of content.
 */
export type ContentGenre =
  | 'academic'
  | 'professional'
  | 'conversational'
  | 'narrative'
  | 'instructional'
  | 'technical'
  | 'news'
  | 'literary';

/**
 * Content specification for generation requests.
 */
export interface ContentSpec {
  /** Unique specification ID */
  id: string;

  /** Target language object(s) */
  targetObjects: LanguageObject[];

  /** Pedagogical intent */
  intent: PedagogicalIntent;

  /** Target learning phase */
  phase: LearningPhase;

  /** Task type to generate */
  taskType: TaskType;

  /** Modality preference */
  modality: TaskModality;

  /** Difficulty constraints */
  difficulty: DifficultyConstraints;

  /** Scaffolding configuration */
  scaffolding: ScaffoldingConfig;

  /** Context requirements */
  context: ContentContextSpec;

  /** Quality requirements */
  quality: ContentQualitySpec;

  /** Generation constraints */
  constraints: GenerationConstraints;
}

/**
 * Context specification for content.
 */
export interface ContentContextSpec {
  /** Target domain(s) */
  domains: string[];

  /** Register level */
  register: RegisterLevel;

  /** Content genre */
  genre: ContentGenre;

  /** Required collocations to include */
  requiredCollocations?: string[];

  /** Related vocabulary to incorporate */
  relatedVocabulary?: string[];

  /** Grammar structures to use */
  grammarStructures?: string[];

  /** Cultural context notes */
  culturalContext?: string;
}

/**
 * Quality specification for content.
 */
export interface ContentQualitySpec {
  /** Minimum quality tier */
  minimumTier: ContentQualityTier;

  /** Preferred source types (in order) */
  preferredSources: ContentSourceType[];

  /** Require human validation? */
  requireValidation: boolean;

  /** Max age for cached content (hours) */
  maxCacheAge?: number;
}

/**
 * Constraints for content generation.
 */
export interface GenerationConstraints {
  /** Maximum word count */
  maxWords?: number;

  /** Minimum word count */
  minWords?: number;

  /** Maximum sentence count */
  maxSentences?: number;

  /** Vocabulary level (CEFR) */
  vocabularyLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  /** Avoid these words */
  excludeWords?: string[];

  /** Must include these elements */
  mustInclude?: string[];

  /** Component focus */
  componentFocus?: ComponentType;

  /** Time limit for generation (ms) */
  timeoutMs?: number;

  /** Allow AI generation? */
  allowAI?: boolean;
}

/**
 * Generated content result.
 */
export interface GeneratedContent {
  /** Unique content ID */
  id: string;

  /** Specification used */
  specId: string;

  /** Source type */
  source: ContentSourceType;

  /** Quality tier achieved */
  qualityTier: ContentQualityTier;

  /** Main content text */
  content: string;

  /** Instructions for learner */
  instructions?: string;

  /** Expected response(s) */
  expectedResponses: string[];

  /** Acceptable variations */
  acceptableVariations?: string[];

  /** Distractors (for MCQ) */
  distractors?: string[];

  /** Hints (progressive) */
  hints?: string[];

  /** Explanation for feedback */
  explanation?: string;

  /** Audio URL (if applicable) */
  audioUrl?: string;

  /** Image URL (if applicable) */
  imageUrl?: string;

  /** Metadata */
  metadata: ContentMetadata;

  /** Generation timestamp */
  generatedAt: Date;

  /** Validation status */
  validated: boolean;
}

/**
 * Content metadata.
 */
export interface ContentMetadata {
  /** Actual word count */
  wordCount: number;

  /** Estimated difficulty */
  estimatedDifficulty: number;

  /** Cognitive load estimate */
  cognitiveLoad: number;

  /** Estimated completion time (seconds) */
  estimatedTime: number;

  /** Components exercised */
  components: ComponentType[];

  /** Generation duration (ms) */
  generationTimeMs: number;

  /** Tokens used (if AI) */
  tokensUsed?: number;

  /** Cache hit? */
  cacheHit: boolean;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a content specification with defaults.
 */
export function createContentSpec(
  targetObjects: LanguageObject[],
  intent: PedagogicalIntent,
  overrides: Partial<ContentSpec> = {}
): ContentSpec {
  const defaults: ContentSpec = {
    id: generateSpecId(),
    targetObjects,
    intent,
    phase: 'recall',
    taskType: 'fill_blank',
    modality: 'text',
    difficulty: {
      minDifficulty: 0.3,
      maxDifficulty: 0.7,
      targetTheta: 0,
      tolerance: 0.2,
    },
    scaffolding: {
      level: 1,
      availableCues: ['first_letter', 'translation'],
      maxHints: 3,
    },
    context: {
      domains: ['general'],
      register: 'neutral',
      genre: 'conversational',
    },
    quality: {
      minimumTier: 'standard',
      preferredSources: ['cached', 'template', 'ai_generated'],
      requireValidation: false,
    },
    constraints: {
      maxWords: 100,
      allowAI: true,
      timeoutMs: 5000,
    },
  };

  return { ...defaults, ...overrides };
}

/**
 * Create specification for vocabulary introduction.
 */
export function createIntroductionSpec(
  object: LanguageObject,
  domain: string = 'general'
): ContentSpec {
  return createContentSpec([object], 'introduce_new', {
    phase: 'recognition',
    taskType: 'definition_match',
    scaffolding: {
      level: 3,
      availableCues: ['translation', 'pronunciation', 'example_sentence'],
      maxHints: 3,
    },
    context: {
      domains: [domain],
      register: 'neutral',
      genre: 'instructional',
    },
    constraints: {
      maxSentences: 3,
      vocabularyLevel: 'A2',
    },
  });
}

/**
 * Create specification for production task.
 */
export function createProductionSpec(
  objects: LanguageObject[],
  register: RegisterLevel = 'neutral'
): ContentSpec {
  return createContentSpec(objects, 'elicit_production', {
    phase: 'synthesis',
    taskType: 'sentence_writing',
    scaffolding: {
      level: 1,
      availableCues: ['collocations', 'semantic_field'],
      maxHints: 2,
    },
    context: {
      domains: ['general'],
      register,
      genre: 'conversational',
    },
    difficulty: {
      minDifficulty: 0.4,
      maxDifficulty: 0.8,
      targetTheta: 0,
      tolerance: 0.15,
    },
  });
}

/**
 * Create specification for comprehension test.
 */
export function createComprehensionSpec(
  objects: LanguageObject[],
  genre: ContentGenre = 'narrative'
): ContentSpec {
  return createContentSpec(objects, 'test_comprehension', {
    phase: 'analysis',
    taskType: 'reading_comprehension',
    modality: 'text',
    scaffolding: {
      level: 0,
      availableCues: [],
      maxHints: 1,
    },
    context: {
      domains: ['general'],
      register: 'neutral',
      genre,
    },
    constraints: {
      minWords: 50,
      maxWords: 200,
    },
  });
}

/**
 * Create specification for fluency drill.
 */
export function createFluencySpec(
  objects: LanguageObject[]
): ContentSpec {
  return createContentSpec(objects, 'fluency_building', {
    phase: 'application',
    taskType: 'rapid_response',
    scaffolding: {
      level: 0,
      availableCues: [],
      maxHints: 0,
    },
    difficulty: {
      minDifficulty: 0.2,
      maxDifficulty: 0.5,
      targetTheta: 0,
      tolerance: 0.1,
    },
    constraints: {
      maxWords: 20,
      timeoutMs: 2000,
    },
  });
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a content specification.
 */
export function validateContentSpec(spec: ContentSpec): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!spec.targetObjects || spec.targetObjects.length === 0) {
    errors.push('At least one target object is required');
  }

  if (!spec.intent) {
    errors.push('Pedagogical intent is required');
  }

  // Check difficulty constraints
  if (spec.difficulty.minDifficulty >= spec.difficulty.maxDifficulty) {
    errors.push('minDifficulty must be less than maxDifficulty');
  }

  if (spec.difficulty.tolerance < 0 || spec.difficulty.tolerance > 0.5) {
    errors.push('Tolerance must be between 0 and 0.5');
  }

  // Check word constraints
  if (spec.constraints.minWords && spec.constraints.maxWords) {
    if (spec.constraints.minWords > spec.constraints.maxWords) {
      errors.push('minWords cannot exceed maxWords');
    }
  }

  // Check scaffolding
  if (spec.scaffolding.level < 0 || spec.scaffolding.level > 3) {
    errors.push('Scaffolding level must be 0-3');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if content meets spec requirements.
 */
export function contentMeetsSpec(
  content: GeneratedContent,
  spec: ContentSpec
): { meets: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check quality tier
  const tierOrder: ContentQualityTier[] = ['premium', 'standard', 'fallback'];
  const contentTierIndex = tierOrder.indexOf(content.qualityTier);
  const minTierIndex = tierOrder.indexOf(spec.quality.minimumTier);

  if (contentTierIndex > minTierIndex) {
    issues.push(`Quality tier ${content.qualityTier} below minimum ${spec.quality.minimumTier}`);
  }

  // Check word count
  if (spec.constraints.maxWords && content.metadata.wordCount > spec.constraints.maxWords) {
    issues.push(`Word count ${content.metadata.wordCount} exceeds max ${spec.constraints.maxWords}`);
  }

  if (spec.constraints.minWords && content.metadata.wordCount < spec.constraints.minWords) {
    issues.push(`Word count ${content.metadata.wordCount} below min ${spec.constraints.minWords}`);
  }

  // Check validation requirement
  if (spec.quality.requireValidation && !content.validated) {
    issues.push('Content requires validation but is not validated');
  }

  return {
    meets: issues.length === 0,
    issues,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function generateSpecId(): string {
  return `spec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Estimate generation complexity from spec.
 */
export function estimateGenerationComplexity(spec: ContentSpec): number {
  let complexity = 0;

  // Base complexity from object count
  complexity += spec.targetObjects.length * 0.1;

  // Intent complexity
  const intentComplexity: Record<string, number> = {
    introduce_new: 0.2,
    reinforce_known: 0.1,
    test_comprehension: 0.3,
    elicit_production: 0.4,
    contextual_usage: 0.3,
    error_detection: 0.4,
    metalinguistic: 0.3,
    fluency_building: 0.1,
    transfer_testing: 0.5,
  };
  complexity += intentComplexity[spec.intent] || 0.2;

  // Context complexity
  if (spec.context.requiredCollocations?.length) {
    complexity += spec.context.requiredCollocations.length * 0.05;
  }

  if (spec.context.grammarStructures?.length) {
    complexity += spec.context.grammarStructures.length * 0.1;
  }

  // Constraint tightness
  if (spec.constraints.maxWords && spec.constraints.minWords) {
    const range = spec.constraints.maxWords - spec.constraints.minWords;
    if (range < 20) complexity += 0.2; // Tight constraint
  }

  return Math.min(1, complexity);
}
