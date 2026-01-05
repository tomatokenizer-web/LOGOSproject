/**
 * Pedagogical Intent Types
 *
 * Defines the educational purposes behind content generation.
 * Each intent drives different content structures, difficulty levels,
 * and assessment criteria.
 *
 * From GAPS-AND-CONNECTIONS.md Gap 4.5
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Core pedagogical intents for content generation.
 * These define WHY content is being presented to the learner.
 */
export type PedagogicalIntent =
  | 'introduce_new'        // First exposure to new concept/word
  | 'reinforce_known'      // Practice already-encountered material
  | 'test_comprehension'   // Verify understanding (receptive)
  | 'elicit_production'    // Require active output (productive)
  | 'contextual_usage'     // Show usage in natural context
  | 'error_detection'      // Train error awareness
  | 'metalinguistic'       // Explicit grammar/structure awareness
  | 'fluency_building'     // Speed and automaticity
  | 'transfer_testing';    // Apply known patterns to new cases

/**
 * Learning phase that maps to Bloom's taxonomy levels.
 */
export type LearningPhase =
  | 'recognition'    // Can identify when seen
  | 'recall'         // Can retrieve from memory
  | 'application'    // Can use in controlled contexts
  | 'analysis'       // Can break down and understand parts
  | 'synthesis'      // Can combine into new expressions
  | 'evaluation';    // Can judge correctness/appropriateness

/**
 * Content difficulty constraints.
 */
export interface DifficultyConstraints {
  /** Minimum difficulty (0-1) */
  minDifficulty: number;

  /** Maximum difficulty (0-1) */
  maxDifficulty: number;

  /** Target learner theta */
  targetTheta: number;

  /** Acceptable deviation from optimal difficulty */
  tolerance: number;
}

/**
 * Scaffolding configuration for content.
 */
export interface ScaffoldingConfig {
  /** Current scaffolding level (0-3) */
  level: 0 | 1 | 2 | 3;

  /** Available cue types */
  availableCues: CueType[];

  /** Auto-reveal hints after n seconds */
  autoRevealDelay?: number;

  /** Max hints before answer reveal */
  maxHints: number;
}

export type CueType =
  | 'first_letter'
  | 'word_length'
  | 'translation'
  | 'morpheme_breakdown'
  | 'pronunciation'
  | 'example_sentence'
  | 'semantic_field'
  | 'collocations';

/**
 * Intent metadata with pedagogical properties.
 */
export interface PedagogicalIntentMeta {
  /** Intent identifier */
  intent: PedagogicalIntent;

  /** Human-readable description */
  description: string;

  /** Appropriate learning phases */
  phases: LearningPhase[];

  /** Minimum mastery stage required */
  minMasteryStage: number;

  /** Maximum mastery stage applicable */
  maxMasteryStage: number;

  /** Typical cognitive load (1-5) */
  cognitiveLoad: number;

  /** Requires production? */
  requiresProduction: boolean;

  /** Time pressure recommended? */
  timePressure: boolean;

  /** Scaffolding typically needed? */
  scaffoldingLevel: 0 | 1 | 2 | 3;
}

// =============================================================================
// Intent Definitions
// =============================================================================

/**
 * Complete pedagogical intent metadata.
 */
export const PEDAGOGICAL_INTENTS: Record<PedagogicalIntent, PedagogicalIntentMeta> = {
  introduce_new: {
    intent: 'introduce_new',
    description: 'First exposure to new vocabulary or concept',
    phases: ['recognition'],
    minMasteryStage: 0,
    maxMasteryStage: 0,
    cognitiveLoad: 3,
    requiresProduction: false,
    timePressure: false,
    scaffoldingLevel: 3,
  },

  reinforce_known: {
    intent: 'reinforce_known',
    description: 'Practice and strengthen existing knowledge',
    phases: ['recognition', 'recall'],
    minMasteryStage: 1,
    maxMasteryStage: 3,
    cognitiveLoad: 2,
    requiresProduction: false,
    timePressure: false,
    scaffoldingLevel: 2,
  },

  test_comprehension: {
    intent: 'test_comprehension',
    description: 'Verify understanding through receptive tasks',
    phases: ['recognition', 'recall', 'analysis'],
    minMasteryStage: 1,
    maxMasteryStage: 4,
    cognitiveLoad: 3,
    requiresProduction: false,
    timePressure: false,
    scaffoldingLevel: 1,
  },

  elicit_production: {
    intent: 'elicit_production',
    description: 'Require active language output',
    phases: ['recall', 'application', 'synthesis'],
    minMasteryStage: 2,
    maxMasteryStage: 4,
    cognitiveLoad: 4,
    requiresProduction: true,
    timePressure: false,
    scaffoldingLevel: 1,
  },

  contextual_usage: {
    intent: 'contextual_usage',
    description: 'Demonstrate natural usage in context',
    phases: ['recognition', 'application'],
    minMasteryStage: 1,
    maxMasteryStage: 4,
    cognitiveLoad: 2,
    requiresProduction: false,
    timePressure: false,
    scaffoldingLevel: 2,
  },

  error_detection: {
    intent: 'error_detection',
    description: 'Train ability to identify errors',
    phases: ['analysis', 'evaluation'],
    minMasteryStage: 2,
    maxMasteryStage: 4,
    cognitiveLoad: 4,
    requiresProduction: false,
    timePressure: false,
    scaffoldingLevel: 0,
  },

  metalinguistic: {
    intent: 'metalinguistic',
    description: 'Explicit awareness of language structure',
    phases: ['analysis'],
    minMasteryStage: 1,
    maxMasteryStage: 4,
    cognitiveLoad: 4,
    requiresProduction: false,
    timePressure: false,
    scaffoldingLevel: 2,
  },

  fluency_building: {
    intent: 'fluency_building',
    description: 'Build speed and automaticity',
    phases: ['recall', 'application'],
    minMasteryStage: 2,
    maxMasteryStage: 4,
    cognitiveLoad: 2,
    requiresProduction: true,
    timePressure: true,
    scaffoldingLevel: 0,
  },

  transfer_testing: {
    intent: 'transfer_testing',
    description: 'Apply known patterns to new cases',
    phases: ['application', 'synthesis'],
    minMasteryStage: 2,
    maxMasteryStage: 4,
    cognitiveLoad: 4,
    requiresProduction: true,
    timePressure: false,
    scaffoldingLevel: 1,
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get appropriate intents for a mastery stage.
 */
export function getIntentsForStage(masteryStage: number): PedagogicalIntent[] {
  return Object.values(PEDAGOGICAL_INTENTS)
    .filter(meta =>
      masteryStage >= meta.minMasteryStage &&
      masteryStage <= meta.maxMasteryStage
    )
    .map(meta => meta.intent);
}

/**
 * Get appropriate intents for a learning phase.
 */
export function getIntentsForPhase(phase: LearningPhase): PedagogicalIntent[] {
  return Object.values(PEDAGOGICAL_INTENTS)
    .filter(meta => meta.phases.includes(phase))
    .map(meta => meta.intent);
}

/**
 * Check if intent requires production.
 */
export function requiresProduction(intent: PedagogicalIntent): boolean {
  return PEDAGOGICAL_INTENTS[intent].requiresProduction;
}

/**
 * Get scaffolding level for intent.
 */
export function getScaffoldingLevel(intent: PedagogicalIntent): 0 | 1 | 2 | 3 {
  return PEDAGOGICAL_INTENTS[intent].scaffoldingLevel;
}

/**
 * Select optimal intent based on learner state.
 */
export function selectOptimalIntent(
  masteryStage: number,
  scaffoldingGap: number,
  recentIntents: PedagogicalIntent[]
): PedagogicalIntent {
  const availableIntents = getIntentsForStage(masteryStage);

  // Prioritize based on scaffolding gap
  if (scaffoldingGap > 0.3) {
    // Large gap: focus on fluency/automation
    const fluencyIntents = availableIntents.filter(i =>
      PEDAGOGICAL_INTENTS[i].timePressure ||
      i === 'fluency_building'
    );
    if (fluencyIntents.length > 0) {
      return selectDiverse(fluencyIntents, recentIntents);
    }
  }

  if (masteryStage === 0) {
    return 'introduce_new';
  }

  if (masteryStage === 1) {
    // Early stage: mix recognition and contextual
    const earlyIntents = availableIntents.filter(i =>
      ['reinforce_known', 'contextual_usage', 'test_comprehension'].includes(i)
    );
    return selectDiverse(earlyIntents, recentIntents);
  }

  // Later stages: balance production and comprehension
  return selectDiverse(availableIntents, recentIntents);
}

/**
 * Select diverse intent (avoid recent repetition).
 */
function selectDiverse(
  available: PedagogicalIntent[],
  recent: PedagogicalIntent[]
): PedagogicalIntent {
  // Filter out recently used
  const recentSet = new Set(recent.slice(-3));
  const fresh = available.filter(i => !recentSet.has(i));

  if (fresh.length > 0) {
    return fresh[Math.floor(Math.random() * fresh.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Calculate expected success probability for intent.
 */
export function calculateExpectedSuccess(
  intent: PedagogicalIntent,
  learnerTheta: number,
  itemDifficulty: number
): number {
  const meta = PEDAGOGICAL_INTENTS[intent];

  // Base probability from IRT-like model
  const baseProbability = 1 / (1 + Math.exp(-(learnerTheta - itemDifficulty)));

  // Adjust for cognitive load
  const loadAdjustment = 1 - (meta.cognitiveLoad - 3) * 0.05;

  // Adjust for production requirement
  const productionPenalty = meta.requiresProduction ? 0.9 : 1.0;

  // Adjust for time pressure
  const timePenalty = meta.timePressure ? 0.95 : 1.0;

  return Math.min(1, Math.max(0,
    baseProbability * loadAdjustment * productionPenalty * timePenalty
  ));
}
