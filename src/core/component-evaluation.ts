/**
 * Component Evaluation Profiles Module
 *
 * Defines evaluation criteria and scoring rubrics specific to each
 * linguistic component (LEX, MORPH, G2P, SYN, PRAG).
 *
 * Purpose:
 * - Component-specific accuracy evaluation
 * - Differentiated feedback generation
 * - Task-type to component mapping
 * - Error pattern classification by component
 *
 * Theoretical Framework:
 * - Multicomponent Models of Language (Levelt, 1989)
 * - Error Analysis (Corder, 1967)
 * - Interlanguage Theory (Selinker, 1972)
 *
 * @module core/component-evaluation
 */

import type { ComponentType, MasteryStage } from './types';

// =============================================================================
// Memory Safety Constants
// =============================================================================

/** Maximum error categories per component */
const MAX_ERROR_CATEGORIES = 50;

/** Maximum evaluation criteria per profile */
const _MAX_CRITERIA = 20;

// =============================================================================
// Types
// =============================================================================

/**
 * Evaluation criterion for a component.
 */
export interface EvaluationCriterion {
  /** Criterion ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what is being evaluated */
  description: string;

  /** Weight in overall score (0-1, all weights sum to 1) */
  weight: number;

  /** Whether this criterion is critical (failure = overall failure) */
  isCritical: boolean;

  /** Minimum mastery stage where this criterion applies */
  minStage: MasteryStage;

  /** Scoring rubric (score → description) */
  rubric: Map<number, string>;
}

/**
 * Error category for a component.
 */
export interface ErrorCategory {
  /** Category ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of this error type */
  description: string;

  /** Severity (0-1, higher = more severe) */
  severity: number;

  /** Whether this error cascades to other components */
  causesCascade: boolean;

  /** Typical remediation focus */
  remediation: string;

  /** Example of this error type */
  example?: string;
}

/**
 * Component evaluation profile.
 */
export interface ComponentEvaluationProfile {
  /** Component type */
  component: ComponentType;

  /** Display name */
  displayName: string;

  /** Brief description */
  description: string;

  /** Evaluation criteria */
  criteria: EvaluationCriterion[];

  /** Error categories */
  errorCategories: ErrorCategory[];

  /** Task types that primarily test this component */
  primaryTaskTypes: string[];

  /** Task types that secondarily involve this component */
  secondaryTaskTypes: string[];

  /** Response time expectations by stage (ms) */
  responseTimeTargets: Record<MasteryStage, { target: number; max: number }>;

  /** Automaticity threshold (ms) for this component */
  automaticityThreshold: number;

  /** Stage progression criteria */
  stageProgressionCriteria: Record<MasteryStage, StageRequirement>;
}

/**
 * Stage requirement for progression.
 */
export interface StageRequirement {
  /** Minimum accuracy required */
  minAccuracy: number;

  /** Minimum number of successful trials */
  minSuccessfulTrials: number;

  /** Maximum error rate allowed */
  maxErrorRate: number;

  /** Required stability (days) */
  requiredStability: number;

  /** Required automatization level (0-1) */
  requiredAutomatization: number;
}

/**
 * Evaluation result for a single response.
 */
export interface ComponentEvaluationResult {
  /** Component evaluated */
  component: ComponentType;

  /** Overall score (0-1) */
  overallScore: number;

  /** Score breakdown by criterion */
  criterionScores: Map<string, number>;

  /** Errors detected */
  errorsDetected: ErrorCategory[];

  /** Whether response passed (met minimum threshold) */
  passed: boolean;

  /** Specific feedback */
  feedback: string[];

  /** Suggested focus areas */
  focusAreas: string[];

  /** Whether response indicates automaticity */
  isAutomatic: boolean;

  /** Confidence in evaluation (0-1) */
  confidence: number;
}

/**
 * Multi-component evaluation result.
 */
export interface MultiComponentEvaluationResult {
  /** Results by component */
  componentResults: Map<ComponentType, ComponentEvaluationResult>;

  /** Overall combined score */
  overallScore: number;

  /** Primary bottleneck component (if any) */
  bottleneckComponent: ComponentType | null;

  /** Cascade effects detected */
  cascadeEffects: CascadeEffect[];

  /** Integrated feedback */
  integratedFeedback: string[];
}

/**
 * Cascade effect between components.
 */
export interface CascadeEffect {
  /** Source component where error originated */
  sourceComponent: ComponentType;

  /** Affected component */
  affectedComponent: ComponentType;

  /** Error category that caused cascade */
  sourceError: string;

  /** Impact on affected component (0-1) */
  impact: number;
}

// =============================================================================
// Constants and Default Profiles
// =============================================================================

/**
 * Standard scoring rubric levels.
 */
export const STANDARD_RUBRIC = new Map<number, string>([
  [0, 'Incorrect/No response'],
  [0.25, 'Major errors, partial understanding'],
  [0.5, 'Moderate errors, basic competence'],
  [0.75, 'Minor errors, good competence'],
  [1.0, 'Correct/Native-like'],
]);

/**
 * LEX (Lexical/Vocabulary) evaluation profile.
 */
export const LEX_PROFILE: ComponentEvaluationProfile = {
  component: 'LEX',
  displayName: 'Vocabulary',
  description: 'Lexical knowledge including word meaning, form, and use',
  criteria: [
    {
      id: 'meaning_accuracy',
      name: 'Meaning Accuracy',
      description: 'Correct understanding/production of word meaning',
      weight: 0.4,
      isCritical: true,
      minStage: 0,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'form_accuracy',
      name: 'Form Accuracy',
      description: 'Correct spelling/pronunciation of word form',
      weight: 0.25,
      isCritical: false,
      minStage: 1,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'collocation_use',
      name: 'Collocation Use',
      description: 'Appropriate use with collocates',
      weight: 0.2,
      isCritical: false,
      minStage: 2,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'register_appropriateness',
      name: 'Register Appropriateness',
      description: 'Use in appropriate register/context',
      weight: 0.15,
      isCritical: false,
      minStage: 3,
      rubric: STANDARD_RUBRIC,
    },
  ],
  errorCategories: [
    {
      id: 'wrong_meaning',
      name: 'Wrong Meaning',
      description: 'Incorrect semantic interpretation',
      severity: 1.0,
      causesCascade: true,
      remediation: 'Review word meaning with examples in context',
      example: 'Using "sensible" to mean "sensitive"',
    },
    {
      id: 'spelling_error',
      name: 'Spelling Error',
      description: 'Incorrect orthographic form',
      severity: 0.4,
      causesCascade: false,
      remediation: 'Practice spelling patterns',
      example: 'Writing "recieve" instead of "receive"',
    },
    {
      id: 'collocation_error',
      name: 'Collocation Error',
      description: 'Unnatural word combination',
      severity: 0.5,
      causesCascade: false,
      remediation: 'Learn common collocations',
      example: 'Saying "make a decision" vs "do a decision"',
    },
    {
      id: 'register_mismatch',
      name: 'Register Mismatch',
      description: 'Word used in wrong formality level',
      severity: 0.3,
      causesCascade: false,
      remediation: 'Study register variations',
      example: 'Using "awesome" in formal academic writing',
    },
  ],
  primaryTaskTypes: ['vocabulary_mcq', 'definition_match', 'word_recall', 'flashcard'],
  secondaryTaskTypes: ['sentence_completion', 'reading_comprehension', 'cloze'],
  responseTimeTargets: {
    0: { target: 5000, max: 10000 },
    1: { target: 3000, max: 6000 },
    2: { target: 2000, max: 4000 },
    3: { target: 1500, max: 3000 },
    4: { target: 1000, max: 2000 },
  },
  automaticityThreshold: 1200,
  stageProgressionCriteria: {
    0: { minAccuracy: 0.4, minSuccessfulTrials: 3, maxErrorRate: 0.6, requiredStability: 1, requiredAutomatization: 0 },
    1: { minAccuracy: 0.6, minSuccessfulTrials: 5, maxErrorRate: 0.4, requiredStability: 3, requiredAutomatization: 0.2 },
    2: { minAccuracy: 0.75, minSuccessfulTrials: 8, maxErrorRate: 0.25, requiredStability: 7, requiredAutomatization: 0.4 },
    3: { minAccuracy: 0.85, minSuccessfulTrials: 12, maxErrorRate: 0.15, requiredStability: 14, requiredAutomatization: 0.6 },
    4: { minAccuracy: 0.95, minSuccessfulTrials: 20, maxErrorRate: 0.05, requiredStability: 30, requiredAutomatization: 0.85 },
  },
};

/**
 * MORPH (Morphology) evaluation profile.
 */
export const MORPH_PROFILE: ComponentEvaluationProfile = {
  component: 'MORPH',
  displayName: 'Morphology',
  description: 'Word formation including prefixes, suffixes, and inflections',
  criteria: [
    {
      id: 'affix_recognition',
      name: 'Affix Recognition',
      description: 'Correct identification of affixes',
      weight: 0.3,
      isCritical: false,
      minStage: 0,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'derivation_accuracy',
      name: 'Derivation Accuracy',
      description: 'Correct derivational morphology',
      weight: 0.35,
      isCritical: true,
      minStage: 1,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'inflection_accuracy',
      name: 'Inflection Accuracy',
      description: 'Correct inflectional morphology',
      weight: 0.25,
      isCritical: true,
      minStage: 1,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'productivity',
      name: 'Productive Use',
      description: 'Ability to apply patterns to new words',
      weight: 0.1,
      isCritical: false,
      minStage: 3,
      rubric: STANDARD_RUBRIC,
    },
  ],
  errorCategories: [
    {
      id: 'wrong_affix',
      name: 'Wrong Affix',
      description: 'Incorrect affix selection',
      severity: 0.7,
      causesCascade: true,
      remediation: 'Review affix meanings and constraints',
      example: 'Using "unhappy" correctly but "unsad" incorrectly',
    },
    {
      id: 'inflection_error',
      name: 'Inflection Error',
      description: 'Wrong grammatical inflection',
      severity: 0.6,
      causesCascade: true,
      remediation: 'Practice inflection paradigms',
      example: 'Saying "goed" instead of "went"',
    },
    {
      id: 'overregularization',
      name: 'Overregularization',
      description: 'Applying regular rules to irregular forms',
      severity: 0.5,
      causesCascade: false,
      remediation: 'Learn irregular forms explicitly',
      example: 'Saying "childs" instead of "children"',
    },
  ],
  primaryTaskTypes: ['word_building', 'affix_identification', 'inflection_drill'],
  secondaryTaskTypes: ['sentence_completion', 'error_correction', 'transformation'],
  responseTimeTargets: {
    0: { target: 6000, max: 12000 },
    1: { target: 4000, max: 8000 },
    2: { target: 2500, max: 5000 },
    3: { target: 1800, max: 3500 },
    4: { target: 1200, max: 2500 },
  },
  automaticityThreshold: 1500,
  stageProgressionCriteria: {
    0: { minAccuracy: 0.35, minSuccessfulTrials: 3, maxErrorRate: 0.65, requiredStability: 1, requiredAutomatization: 0 },
    1: { minAccuracy: 0.55, minSuccessfulTrials: 5, maxErrorRate: 0.45, requiredStability: 3, requiredAutomatization: 0.15 },
    2: { minAccuracy: 0.70, minSuccessfulTrials: 8, maxErrorRate: 0.30, requiredStability: 7, requiredAutomatization: 0.35 },
    3: { minAccuracy: 0.82, minSuccessfulTrials: 12, maxErrorRate: 0.18, requiredStability: 14, requiredAutomatization: 0.55 },
    4: { minAccuracy: 0.92, minSuccessfulTrials: 18, maxErrorRate: 0.08, requiredStability: 30, requiredAutomatization: 0.80 },
  },
};

/**
 * G2P (Grapheme-to-Phoneme) evaluation profile.
 */
export const G2P_PROFILE: ComponentEvaluationProfile = {
  component: 'PHON',
  displayName: 'Pronunciation',
  description: 'Grapheme-to-phoneme mapping and pronunciation accuracy',
  criteria: [
    {
      id: 'phoneme_accuracy',
      name: 'Phoneme Accuracy',
      description: 'Correct production of individual sounds',
      weight: 0.4,
      isCritical: true,
      minStage: 0,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'stress_pattern',
      name: 'Stress Pattern',
      description: 'Correct word and sentence stress',
      weight: 0.25,
      isCritical: false,
      minStage: 1,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'intonation',
      name: 'Intonation',
      description: 'Appropriate intonation patterns',
      weight: 0.2,
      isCritical: false,
      minStage: 2,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'connected_speech',
      name: 'Connected Speech',
      description: 'Natural linking and reduction in fluent speech',
      weight: 0.15,
      isCritical: false,
      minStage: 3,
      rubric: STANDARD_RUBRIC,
    },
  ],
  errorCategories: [
    {
      id: 'phoneme_substitution',
      name: 'Phoneme Substitution',
      description: 'Replacing one sound with another',
      severity: 0.7,
      causesCascade: true,
      remediation: 'Minimal pair practice',
      example: 'Saying /θ/ as /s/ in "think"',
    },
    {
      id: 'stress_error',
      name: 'Stress Error',
      description: 'Wrong syllable stressed',
      severity: 0.5,
      causesCascade: false,
      remediation: 'Practice stress patterns by word type',
      example: 'Saying "PHOtograph" instead of "phoTOGraph"',
    },
    {
      id: 'vowel_error',
      name: 'Vowel Error',
      description: 'Incorrect vowel quality or length',
      severity: 0.6,
      causesCascade: false,
      remediation: 'Vowel chart and minimal pair work',
      example: 'Confusing /ɪ/ and /iː/ in "ship" vs "sheep"',
    },
  ],
  primaryTaskTypes: ['pronunciation_drill', 'minimal_pair', 'dictation', 'shadowing'],
  secondaryTaskTypes: ['reading_aloud', 'oral_response', 'speech_production'],
  responseTimeTargets: {
    0: { target: 4000, max: 8000 },
    1: { target: 2500, max: 5000 },
    2: { target: 1800, max: 3500 },
    3: { target: 1200, max: 2500 },
    4: { target: 800, max: 1800 },
  },
  automaticityThreshold: 1000,
  stageProgressionCriteria: {
    0: { minAccuracy: 0.40, minSuccessfulTrials: 5, maxErrorRate: 0.60, requiredStability: 1, requiredAutomatization: 0 },
    1: { minAccuracy: 0.60, minSuccessfulTrials: 8, maxErrorRate: 0.40, requiredStability: 3, requiredAutomatization: 0.20 },
    2: { minAccuracy: 0.75, minSuccessfulTrials: 12, maxErrorRate: 0.25, requiredStability: 7, requiredAutomatization: 0.40 },
    3: { minAccuracy: 0.85, minSuccessfulTrials: 15, maxErrorRate: 0.15, requiredStability: 14, requiredAutomatization: 0.65 },
    4: { minAccuracy: 0.93, minSuccessfulTrials: 20, maxErrorRate: 0.07, requiredStability: 30, requiredAutomatization: 0.85 },
  },
};

/**
 * SYN (Syntactic) evaluation profile.
 */
export const SYN_PROFILE: ComponentEvaluationProfile = {
  component: 'SYNT',
  displayName: 'Grammar',
  description: 'Syntactic structures and grammatical accuracy',
  criteria: [
    {
      id: 'structure_accuracy',
      name: 'Structure Accuracy',
      description: 'Correct syntactic structure',
      weight: 0.4,
      isCritical: true,
      minStage: 0,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'agreement',
      name: 'Agreement',
      description: 'Correct subject-verb and other agreement',
      weight: 0.25,
      isCritical: true,
      minStage: 1,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'word_order',
      name: 'Word Order',
      description: 'Correct constituent ordering',
      weight: 0.2,
      isCritical: false,
      minStage: 1,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'complexity',
      name: 'Syntactic Complexity',
      description: 'Use of complex structures appropriately',
      weight: 0.15,
      isCritical: false,
      minStage: 3,
      rubric: STANDARD_RUBRIC,
    },
  ],
  errorCategories: [
    {
      id: 'word_order_error',
      name: 'Word Order Error',
      description: 'Incorrect constituent order',
      severity: 0.7,
      causesCascade: true,
      remediation: 'Practice canonical sentence patterns',
      example: 'Saying "I yesterday went" instead of "I went yesterday"',
    },
    {
      id: 'agreement_error',
      name: 'Agreement Error',
      description: 'Subject-verb or other agreement failure',
      severity: 0.6,
      causesCascade: false,
      remediation: 'Focus on agreement rules',
      example: 'Saying "He go" instead of "He goes"',
    },
    {
      id: 'tense_error',
      name: 'Tense Error',
      description: 'Wrong tense selection or formation',
      severity: 0.65,
      causesCascade: false,
      remediation: 'Practice tense system systematically',
      example: 'Saying "I will went" instead of "I will go"',
    },
    {
      id: 'missing_element',
      name: 'Missing Element',
      description: 'Required grammatical element omitted',
      severity: 0.5,
      causesCascade: false,
      remediation: 'Check for required elements in structure',
      example: 'Omitting articles: "I have car"',
    },
  ],
  primaryTaskTypes: ['grammar_mcq', 'sentence_transformation', 'error_correction', 'sentence_building'],
  secondaryTaskTypes: ['sentence_completion', 'writing', 'translation'],
  responseTimeTargets: {
    0: { target: 8000, max: 15000 },
    1: { target: 5000, max: 10000 },
    2: { target: 3500, max: 7000 },
    3: { target: 2500, max: 5000 },
    4: { target: 1800, max: 3500 },
  },
  automaticityThreshold: 2000,
  stageProgressionCriteria: {
    0: { minAccuracy: 0.35, minSuccessfulTrials: 3, maxErrorRate: 0.65, requiredStability: 1, requiredAutomatization: 0 },
    1: { minAccuracy: 0.55, minSuccessfulTrials: 5, maxErrorRate: 0.45, requiredStability: 3, requiredAutomatization: 0.15 },
    2: { minAccuracy: 0.70, minSuccessfulTrials: 8, maxErrorRate: 0.30, requiredStability: 7, requiredAutomatization: 0.30 },
    3: { minAccuracy: 0.80, minSuccessfulTrials: 12, maxErrorRate: 0.20, requiredStability: 14, requiredAutomatization: 0.50 },
    4: { minAccuracy: 0.90, minSuccessfulTrials: 18, maxErrorRate: 0.10, requiredStability: 30, requiredAutomatization: 0.75 },
  },
};

/**
 * PRAG (Pragmatic) evaluation profile.
 */
export const PRAG_PROFILE: ComponentEvaluationProfile = {
  component: 'PRAG',
  displayName: 'Pragmatics',
  description: 'Contextual language use, register, and communicative competence',
  criteria: [
    {
      id: 'appropriateness',
      name: 'Contextual Appropriateness',
      description: 'Language appropriate for context',
      weight: 0.35,
      isCritical: true,
      minStage: 0,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'register_accuracy',
      name: 'Register Accuracy',
      description: 'Correct formality level',
      weight: 0.25,
      isCritical: false,
      minStage: 1,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'speech_act',
      name: 'Speech Act Realization',
      description: 'Effective performance of speech acts',
      weight: 0.25,
      isCritical: false,
      minStage: 2,
      rubric: STANDARD_RUBRIC,
    },
    {
      id: 'cultural_awareness',
      name: 'Cultural Awareness',
      description: 'Culturally appropriate communication',
      weight: 0.15,
      isCritical: false,
      minStage: 3,
      rubric: STANDARD_RUBRIC,
    },
  ],
  errorCategories: [
    {
      id: 'register_error',
      name: 'Register Error',
      description: 'Wrong level of formality',
      severity: 0.6,
      causesCascade: false,
      remediation: 'Study register variations and contexts',
      example: 'Using "gonna" in a business email',
    },
    {
      id: 'politeness_error',
      name: 'Politeness Error',
      description: 'Inappropriate level of politeness',
      severity: 0.7,
      causesCascade: false,
      remediation: 'Learn politeness strategies',
      example: 'Being too direct in a request',
    },
    {
      id: 'speech_act_failure',
      name: 'Speech Act Failure',
      description: 'Failed to accomplish communicative goal',
      severity: 0.8,
      causesCascade: true,
      remediation: 'Practice speech act formulas and strategies',
      example: 'Apology not perceived as apology',
    },
  ],
  primaryTaskTypes: ['discourse_completion', 'appropriateness_judgment', 'role_play'],
  secondaryTaskTypes: ['writing', 'dialogue_completion', 'situation_response'],
  responseTimeTargets: {
    0: { target: 10000, max: 20000 },
    1: { target: 7000, max: 14000 },
    2: { target: 5000, max: 10000 },
    3: { target: 3500, max: 7000 },
    4: { target: 2500, max: 5000 },
  },
  automaticityThreshold: 3000,
  stageProgressionCriteria: {
    0: { minAccuracy: 0.30, minSuccessfulTrials: 3, maxErrorRate: 0.70, requiredStability: 1, requiredAutomatization: 0 },
    1: { minAccuracy: 0.50, minSuccessfulTrials: 5, maxErrorRate: 0.50, requiredStability: 3, requiredAutomatization: 0.10 },
    2: { minAccuracy: 0.65, minSuccessfulTrials: 8, maxErrorRate: 0.35, requiredStability: 7, requiredAutomatization: 0.25 },
    3: { minAccuracy: 0.78, minSuccessfulTrials: 12, maxErrorRate: 0.22, requiredStability: 14, requiredAutomatization: 0.45 },
    4: { minAccuracy: 0.88, minSuccessfulTrials: 18, maxErrorRate: 0.12, requiredStability: 30, requiredAutomatization: 0.70 },
  },
};

/**
 * All component profiles indexed by component type.
 */
export const COMPONENT_PROFILES: Partial<Record<ComponentType, ComponentEvaluationProfile>> = {
  LEX: LEX_PROFILE,
  MORPH: MORPH_PROFILE,
  PHON: G2P_PROFILE,
  SYNT: SYN_PROFILE,
  PRAG: PRAG_PROFILE,
  // Lowercase aliases
  lexical: LEX_PROFILE,
  morphological: MORPH_PROFILE,
  phonological: G2P_PROFILE,
  syntactic: SYN_PROFILE,
  pragmatic: PRAG_PROFILE,
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Gets the evaluation profile for a component.
 *
 * @param component - Component type
 * @returns Evaluation profile or null if not found
 */
export function getComponentProfile(component: ComponentType): ComponentEvaluationProfile | null {
  return COMPONENT_PROFILES[component] || null;
}

/**
 * Evaluates a response against component criteria.
 *
 * @param component - Component type
 * @param criterionScores - Map of criterion ID to score (0-1)
 * @param responseTimeMs - Response time in milliseconds
 * @param stage - Current mastery stage
 * @returns Evaluation result
 */
export function evaluateResponse(
  component: ComponentType,
  criterionScores: Map<string, number>,
  responseTimeMs: number,
  stage: MasteryStage
): ComponentEvaluationResult {
  const profile = COMPONENT_PROFILES[component];
  if (!profile) {
    return createDefaultResult(component);
  }

  // Calculate weighted score
  let totalWeight = 0;
  let weightedSum = 0;
  const applicableCriteria = profile.criteria.filter(c => c.minStage <= stage);

  for (const criterion of applicableCriteria) {
    const score = criterionScores.get(criterion.id) ?? 0;
    weightedSum += score * criterion.weight;
    totalWeight += criterion.weight;
  }

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Check for critical failures
  const criticalFailures = applicableCriteria
    .filter(c => c.isCritical && (criterionScores.get(c.id) ?? 0) < 0.4);

  const passed = overallScore >= 0.6 && criticalFailures.length === 0;

  // Detect errors
  const errorsDetected = detectErrors(profile, criterionScores);

  // Generate feedback
  const feedback = generateFeedback(profile, criterionScores, stage);

  // Identify focus areas
  const focusAreas = identifyFocusAreas(profile, criterionScores, stage);

  // Check automaticity
  const isAutomatic = responseTimeMs < profile.automaticityThreshold;

  // Calculate confidence based on number of criteria evaluated
  const confidence = Math.min(1, applicableCriteria.length / profile.criteria.length);

  return {
    component,
    overallScore,
    criterionScores: new Map(criterionScores),
    errorsDetected,
    passed,
    feedback,
    focusAreas,
    isAutomatic,
    confidence,
  };
}

/**
 * Creates a default result for unknown components.
 */
function createDefaultResult(component: ComponentType): ComponentEvaluationResult {
  return {
    component,
    overallScore: 0,
    criterionScores: new Map(),
    errorsDetected: [],
    passed: false,
    feedback: ['Unable to evaluate: unknown component'],
    focusAreas: [],
    isAutomatic: false,
    confidence: 0,
  };
}

/**
 * Detects errors based on criterion scores.
 */
function detectErrors(
  profile: ComponentEvaluationProfile,
  criterionScores: Map<string, number>
): ErrorCategory[] {
  const errors: ErrorCategory[] = [];

  // Map low scores to error categories
  for (const criterion of profile.criteria) {
    const score = criterionScores.get(criterion.id) ?? 1;
    if (score < 0.5) {
      // Find related error categories
      const relatedErrors = profile.errorCategories
        .filter(e => e.id.includes(criterion.id.split('_')[0]) || criterion.id.includes(e.id.split('_')[0]))
        .slice(0, MAX_ERROR_CATEGORIES);
      errors.push(...relatedErrors);
    }
  }

  // Remove duplicates
  const uniqueErrors = Array.from(new Map(errors.map(e => [e.id, e])).values());
  return uniqueErrors.slice(0, MAX_ERROR_CATEGORIES);
}

/**
 * Generates feedback based on evaluation.
 */
function generateFeedback(
  profile: ComponentEvaluationProfile,
  criterionScores: Map<string, number>,
  stage: MasteryStage
): string[] {
  const feedback: string[] = [];

  // Positive feedback for good scores
  const highScores = profile.criteria
    .filter(c => (criterionScores.get(c.id) ?? 0) >= 0.8);
  if (highScores.length > 0) {
    feedback.push(`Strong performance in: ${highScores.map(c => c.name).join(', ')}`);
  }

  // Areas for improvement
  const lowScores = profile.criteria
    .filter(c => c.minStage <= stage && (criterionScores.get(c.id) ?? 0) < 0.5);
  for (const criterion of lowScores.slice(0, 3)) {
    feedback.push(`Needs improvement: ${criterion.name} - ${criterion.description}`);
  }

  return feedback.slice(0, 5);
}

/**
 * Identifies priority focus areas.
 */
function identifyFocusAreas(
  profile: ComponentEvaluationProfile,
  criterionScores: Map<string, number>,
  stage: MasteryStage
): string[] {
  const focusAreas: string[] = [];

  // Priority to critical criteria with low scores
  const criticalLow = profile.criteria
    .filter(c => c.isCritical && c.minStage <= stage && (criterionScores.get(c.id) ?? 0) < 0.6)
    .map(c => c.name);
  focusAreas.push(...criticalLow);

  // Then non-critical low scores
  const nonCriticalLow = profile.criteria
    .filter(c => !c.isCritical && c.minStage <= stage && (criterionScores.get(c.id) ?? 0) < 0.5)
    .map(c => c.name);
  focusAreas.push(...nonCriticalLow);

  return focusAreas.slice(0, 3);
}

/**
 * Checks if learner meets stage progression requirements.
 *
 * @param profile - Component profile
 * @param currentStage - Current stage
 * @param accuracy - Recent accuracy
 * @param successfulTrials - Number of successful trials
 * @param stability - Days of stability
 * @param automatization - Automatization level (0-1)
 * @returns Whether ready for progression
 */
export function checkStageProgression(
  profile: ComponentEvaluationProfile,
  currentStage: MasteryStage,
  accuracy: number,
  successfulTrials: number,
  stability: number,
  automatization: number
): boolean {
  if (currentStage >= 4) return false; // Already at max

  const nextStage = (currentStage + 1) as MasteryStage;
  const requirements = profile.stageProgressionCriteria[nextStage];

  return (
    accuracy >= requirements.minAccuracy &&
    successfulTrials >= requirements.minSuccessfulTrials &&
    stability >= requirements.requiredStability &&
    automatization >= requirements.requiredAutomatization
  );
}

/**
 * Evaluates multi-component response.
 *
 * @param componentScores - Map of component to criterion scores
 * @param responseTimes - Map of component to response time
 * @param stages - Map of component to mastery stage
 * @returns Multi-component evaluation result
 */
export function evaluateMultiComponent(
  componentScores: Map<ComponentType, Map<string, number>>,
  responseTimes: Map<ComponentType, number>,
  stages: Map<ComponentType, MasteryStage>
): MultiComponentEvaluationResult {
  const componentResults = new Map<ComponentType, ComponentEvaluationResult>();
  const cascadeEffects: CascadeEffect[] = [];

  // Evaluate each component
  for (const [component, scores] of componentScores) {
    const responseTime = responseTimes.get(component) || 5000;
    const stage = stages.get(component) || 0;
    const result = evaluateResponse(component, scores, responseTime, stage);
    componentResults.set(component, result);
  }

  // Detect cascade effects
  for (const [sourceComponent, sourceResult] of componentResults) {
    if (sourceResult.errorsDetected.some(e => e.causesCascade)) {
      // Find affected components
      for (const [targetComponent, targetResult] of componentResults) {
        if (targetComponent !== sourceComponent && targetResult.overallScore < 0.7) {
          const cascadeError = sourceResult.errorsDetected.find(e => e.causesCascade);
          if (cascadeError) {
            cascadeEffects.push({
              sourceComponent,
              affectedComponent: targetComponent,
              sourceError: cascadeError.id,
              impact: cascadeError.severity * 0.5,
            });
          }
        }
      }
    }
  }

  // Calculate overall score
  const scores = Array.from(componentResults.values()).map(r => r.overallScore);
  const overallScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  // Find bottleneck (lowest scoring component)
  let bottleneckComponent: ComponentType | null = null;
  let lowestScore = 1;
  for (const [component, result] of componentResults) {
    if (result.overallScore < lowestScore) {
      lowestScore = result.overallScore;
      bottleneckComponent = component;
    }
  }

  // Generate integrated feedback
  const integratedFeedback = generateIntegratedFeedback(componentResults, cascadeEffects);

  return {
    componentResults,
    overallScore,
    bottleneckComponent: lowestScore < 0.6 ? bottleneckComponent : null,
    cascadeEffects,
    integratedFeedback,
  };
}

/**
 * Generates integrated feedback from multi-component evaluation.
 */
function generateIntegratedFeedback(
  results: Map<ComponentType, ComponentEvaluationResult>,
  cascades: CascadeEffect[]
): string[] {
  const feedback: string[] = [];

  // Overall performance summary
  const failing = Array.from(results.values()).filter(r => !r.passed);

  if (failing.length === 0) {
    feedback.push('All components performing well');
  } else {
    feedback.push(`Focus needed on: ${failing.map(r => COMPONENT_PROFILES[r.component]?.displayName || r.component).join(', ')}`);
  }

  // Cascade warnings
  if (cascades.length > 0) {
    const sourceComponents = [...new Set(cascades.map(c => c.sourceComponent))];
    feedback.push(`Errors in ${sourceComponents.map(c => COMPONENT_PROFILES[c]?.displayName || c).join(', ')} affecting other areas`);
  }

  // Priority recommendations
  const resultsArray = Array.from(results.values());
  if (resultsArray.length > 0) {
    const lowestResult = resultsArray.reduce((min, r) =>
      r.overallScore < min.overallScore ? r : min
    );
    if (lowestResult.focusAreas.length > 0) {
      feedback.push(`Priority focus: ${lowestResult.focusAreas[0]}`);
    }
  }

  return feedback.slice(0, 4);
}
