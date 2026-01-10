/**
 * Multi-Object Selection Module
 *
 * Provides guidance for Stage 3 (Task Generation) on which language objects
 * can be effectively combined in a single task. This is the "pre-calibration"
 * component that complements multi-object-calibration.service.ts (Stage 4-5).
 *
 * Theoretical Framework:
 * - Q-Matrix Design (Tatsuoka, 1983): Component requirements per task
 * - Skill Combination Theory (VanLehn, 1988): Cognitive load of combinations
 * - Interleaving Research (Rohrer & Taylor, 2007): Benefits of mixing
 *
 * Purpose:
 * - Determine which objects can be combined without cognitive overload
 * - Estimate difficulty of combined presentation
 * - Predict transfer and interference effects
 * - Guide task composition for optimal learning
 *
 * @module core/multi-object-selection
 */

import type { ComponentType, MasteryStage } from './types';

// =============================================================================
// Memory Safety Constants
// =============================================================================

/** Maximum objects to consider in a single selection */
const MAX_OBJECTS_PER_SELECTION = 10;

/** Maximum candidate pairs to evaluate */
const MAX_CANDIDATE_PAIRS = 100;

// =============================================================================
// Types
// =============================================================================

/**
 * Object profile for selection decisions.
 */
export interface ObjectSelectionProfile {
  /** Unique object identifier */
  objectId: string;

  /** Language component type */
  component: ComponentType;

  /** Current mastery stage (0-4) */
  masteryStage: MasteryStage;

  /** Difficulty estimate (-3 to +3 IRT scale) */
  difficulty: number;

  /** Cognitive load estimate (1-5 scale) */
  cognitiveLoad: number;

  /** Priority score (0-1) */
  priority: number;

  /** Related object IDs (morphological family, collocations) */
  relatedObjects: string[];

  /** Conflicting object IDs (interference sources) */
  conflictingObjects: string[];
}

/**
 * Combination feasibility result.
 */
export interface CombinationFeasibility {
  /** Whether combination is feasible */
  isFeasible: boolean;

  /** Combined difficulty estimate */
  combinedDifficulty: number;

  /** Total cognitive load */
  totalCognitiveLoad: number;

  /** Predicted success probability */
  predictedSuccess: number;

  /** Risk factors */
  risks: CombinationRisk[];

  /** Benefits of combination */
  benefits: CombinationBenefit[];

  /** Overall score (0-1, higher = better combination) */
  score: number;
}

/**
 * Risk factors for object combinations.
 */
export interface CombinationRisk {
  /** Risk type */
  type: 'interference' | 'overload' | 'stage_mismatch' | 'component_conflict';

  /** Severity (0-1) */
  severity: number;

  /** Description */
  description: string;

  /** Affected object IDs */
  affectedObjects: string[];
}

/**
 * Benefits of object combinations.
 */
export interface CombinationBenefit {
  /** Benefit type */
  type: 'transfer' | 'reinforcement' | 'interleaving' | 'context';

  /** Magnitude (0-1) */
  magnitude: number;

  /** Description */
  description: string;

  /** Contributing object IDs */
  contributingObjects: string[];
}

/**
 * Recommended object grouping.
 */
export interface ObjectGrouping {
  /** Primary (focus) object */
  primaryObjectId: string;

  /** Supporting objects */
  supportingObjectIds: string[];

  /** Feasibility analysis */
  feasibility: CombinationFeasibility;

  /** Recommended task type */
  recommendedTaskType: string;

  /** Recommended component weights */
  componentWeights: Partial<Record<ComponentType, number>>;
}

/**
 * Selection strategy configuration.
 */
export interface SelectionStrategy {
  /** Maximum objects per task */
  maxObjectsPerTask: number;

  /** Maximum cognitive load allowed */
  maxCognitiveLoad: number;

  /** Minimum stage for secondary objects */
  minSecondaryStage: MasteryStage;

  /** Allow interleaving of component types */
  allowInterleaving: boolean;

  /** Prefer related objects (transfer) */
  preferRelated: boolean;

  /** Avoid conflicting objects */
  avoidConflicts: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default selection strategy.
 */
export const DEFAULT_SELECTION_STRATEGY: SelectionStrategy = {
  maxObjectsPerTask: 3,
  maxCognitiveLoad: 7, // Miller's magic number
  minSecondaryStage: 2, // At least Stage 2 mastery
  allowInterleaving: true,
  preferRelated: true,
  avoidConflicts: true,
};

/**
 * Cognitive load by component type.
 * Based on processing complexity and working memory demands.
 */
export const COMPONENT_COGNITIVE_LOAD: Record<ComponentType, number> = {
  LEX: 1.5,      // Lexical access - relatively automatic
  MORPH: 2.0,    // Morphological processing - rule application
  G2P: 2.0,      // Grapheme-phoneme - decoding
  SYN: 2.5,      // Syntactic - structural processing
  PRAG: 3.0,     // Pragmatic - context integration
};

/**
 * Stage compatibility matrix.
 * Value indicates how well stages combine (0-1).
 */
export const STAGE_COMPATIBILITY: Record<MasteryStage, Record<MasteryStage, number>> = {
  0: { 0: 0.3, 1: 0.4, 2: 0.5, 3: 0.6, 4: 0.7 },
  1: { 0: 0.4, 1: 0.6, 2: 0.7, 3: 0.7, 4: 0.8 },
  2: { 0: 0.5, 1: 0.7, 2: 0.8, 3: 0.8, 4: 0.9 },
  3: { 0: 0.6, 1: 0.7, 2: 0.8, 3: 0.9, 4: 0.95 },
  4: { 0: 0.7, 1: 0.8, 2: 0.9, 3: 0.95, 4: 1.0 },
};

/**
 * Component interaction effects.
 * Positive = synergy, Negative = interference.
 */
export const COMPONENT_INTERACTIONS: Record<ComponentType, Partial<Record<ComponentType, number>>> = {
  LEX: { MORPH: 0.3, G2P: 0.2, SYN: 0.1, PRAG: 0.1 },
  MORPH: { LEX: 0.3, G2P: 0.1, SYN: 0.2, PRAG: 0.0 },
  G2P: { LEX: 0.2, MORPH: 0.1, SYN: 0.0, PRAG: -0.1 },
  SYN: { LEX: 0.1, MORPH: 0.2, G2P: 0.0, PRAG: 0.3 },
  PRAG: { LEX: 0.1, MORPH: 0.0, G2P: -0.1, SYN: 0.3 },
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Calculates combined cognitive load for a set of objects.
 *
 * @param profiles - Object profiles
 * @returns Total cognitive load
 */
export function calculateCombinedCognitiveLoad(profiles: ObjectSelectionProfile[]): number {
  if (profiles.length === 0) return 0;

  // Base load from individual objects
  let totalLoad = profiles.reduce((sum, p) => sum + p.cognitiveLoad, 0);

  // Add interaction overhead (diminishes with mastery)
  const uniqueComponents = new Set(profiles.map(p => p.component));
  if (uniqueComponents.size > 1) {
    // Cross-component switching cost
    const switchingCost = (uniqueComponents.size - 1) * 0.5;
    totalLoad += switchingCost;
  }

  // Reduce load based on average mastery (automatized items cost less)
  const avgMastery = profiles.reduce((sum, p) => sum + p.masteryStage, 0) / profiles.length;
  const masteryDiscount = avgMastery * 0.1;
  totalLoad *= (1 - masteryDiscount);

  return Math.max(1, totalLoad);
}

/**
 * Estimates combined difficulty for objects.
 *
 * @param profiles - Object profiles
 * @returns Combined difficulty on IRT scale
 */
export function estimateCombinedDifficulty(profiles: ObjectSelectionProfile[]): number {
  if (profiles.length === 0) return 0;
  if (profiles.length === 1) return profiles[0].difficulty;

  // Use compensatory model: weighted average with interaction bonus
  const avgDifficulty = profiles.reduce((sum, p) => sum + p.difficulty, 0) / profiles.length;
  const maxDifficulty = Math.max(...profiles.map(p => p.difficulty));

  // Combination adds to difficulty (0.2 per additional object)
  const combinationPenalty = (profiles.length - 1) * 0.2;

  // Result is between average and max, plus penalty
  return avgDifficulty * 0.7 + maxDifficulty * 0.3 + combinationPenalty;
}

/**
 * Calculates predicted success probability for combination.
 *
 * @param profiles - Object profiles
 * @param userAbility - User's current ability estimate (theta)
 * @returns Success probability (0-1)
 */
export function predictCombinedSuccess(
  profiles: ObjectSelectionProfile[],
  userAbility: number
): number {
  if (profiles.length === 0) return 0;

  const combinedDifficulty = estimateCombinedDifficulty(profiles);

  // Simple 2PL model
  const logit = userAbility - combinedDifficulty;
  const probability = 1 / (1 + Math.exp(-logit));

  // Adjust for cognitive load
  const cognitiveLoad = calculateCombinedCognitiveLoad(profiles);
  const loadPenalty = Math.max(0, (cognitiveLoad - 5) * 0.05);

  return Math.max(0, Math.min(1, probability - loadPenalty));
}

/**
 * Identifies risks in object combination.
 *
 * @param profiles - Object profiles
 * @param strategy - Selection strategy
 * @returns Array of identified risks
 */
export function identifyRisks(
  profiles: ObjectSelectionProfile[],
  strategy: SelectionStrategy = DEFAULT_SELECTION_STRATEGY
): CombinationRisk[] {
  const risks: CombinationRisk[] = [];

  if (profiles.length === 0) return risks;

  // Check cognitive overload
  const cognitiveLoad = calculateCombinedCognitiveLoad(profiles);
  if (cognitiveLoad > strategy.maxCognitiveLoad) {
    risks.push({
      type: 'overload',
      severity: Math.min(1, (cognitiveLoad - strategy.maxCognitiveLoad) / strategy.maxCognitiveLoad),
      description: `Cognitive load (${cognitiveLoad.toFixed(1)}) exceeds maximum (${strategy.maxCognitiveLoad})`,
      affectedObjects: profiles.map(p => p.objectId),
    });
  }

  // Check stage mismatch
  const stages = profiles.map(p => p.masteryStage);
  const minStage = Math.min(...stages);
  const maxStage = Math.max(...stages);
  if (maxStage - minStage >= 2) {
    const lowStageObjects = profiles.filter(p => p.masteryStage < strategy.minSecondaryStage);
    if (lowStageObjects.length > 0) {
      risks.push({
        type: 'stage_mismatch',
        severity: (maxStage - minStage) / 4,
        description: `Stage gap of ${maxStage - minStage} between objects`,
        affectedObjects: lowStageObjects.map(p => p.objectId),
      });
    }
  }

  // Check interference
  if (strategy.avoidConflicts) {
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const p1 = profiles[i];
        const p2 = profiles[j];
        if (p1.conflictingObjects.includes(p2.objectId) || p2.conflictingObjects.includes(p1.objectId)) {
          risks.push({
            type: 'interference',
            severity: 0.7,
            description: `Interference between ${p1.objectId} and ${p2.objectId}`,
            affectedObjects: [p1.objectId, p2.objectId],
          });
        }
      }
    }
  }

  // Check component conflict (too many of same type at low mastery)
  const componentCounts = new Map<ComponentType, number>();
  for (const p of profiles) {
    componentCounts.set(p.component, (componentCounts.get(p.component) || 0) + 1);
  }
  for (const [component, count] of componentCounts) {
    if (count >= 3) {
      const componentProfiles = profiles.filter(p => p.component === component);
      const avgMastery = componentProfiles.reduce((s, p) => s + p.masteryStage, 0) / count;
      if (avgMastery < 2) {
        risks.push({
          type: 'component_conflict',
          severity: 0.5,
          description: `Too many low-mastery ${component} objects (${count})`,
          affectedObjects: componentProfiles.map(p => p.objectId),
        });
      }
    }
  }

  return risks;
}

/**
 * Identifies benefits in object combination.
 *
 * @param profiles - Object profiles
 * @param strategy - Selection strategy
 * @returns Array of identified benefits
 */
export function identifyBenefits(
  profiles: ObjectSelectionProfile[],
  strategy: SelectionStrategy = DEFAULT_SELECTION_STRATEGY
): CombinationBenefit[] {
  const benefits: CombinationBenefit[] = [];

  if (profiles.length < 2) return benefits;

  // Check transfer potential
  if (strategy.preferRelated) {
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const p1 = profiles[i];
        const p2 = profiles[j];
        if (p1.relatedObjects.includes(p2.objectId) || p2.relatedObjects.includes(p1.objectId)) {
          benefits.push({
            type: 'transfer',
            magnitude: 0.6,
            description: `Transfer potential between related objects`,
            contributingObjects: [p1.objectId, p2.objectId],
          });
        }
      }
    }
  }

  // Check reinforcement (same component, different stages)
  const componentGroups = new Map<ComponentType, ObjectSelectionProfile[]>();
  for (const p of profiles) {
    if (!componentGroups.has(p.component)) {
      componentGroups.set(p.component, []);
    }
    componentGroups.get(p.component)!.push(p);
  }
  for (const [_component, group] of componentGroups) {
    if (group.length >= 2) {
      const stages = new Set(group.map(p => p.masteryStage));
      if (stages.size > 1) {
        benefits.push({
          type: 'reinforcement',
          magnitude: 0.4,
          description: `Cross-stage reinforcement within component`,
          contributingObjects: group.map(p => p.objectId),
        });
      }
    }
  }

  // Check interleaving benefit
  if (strategy.allowInterleaving) {
    const uniqueComponents = new Set(profiles.map(p => p.component));
    if (uniqueComponents.size >= 2) {
      benefits.push({
        type: 'interleaving',
        magnitude: 0.3 * Math.min(1, uniqueComponents.size / 3),
        description: `Interleaving across ${uniqueComponents.size} components`,
        contributingObjects: profiles.map(p => p.objectId),
      });
    }
  }

  // Check contextual embedding
  const hasLex = profiles.some(p => p.component === 'LEX');
  const hasSyn = profiles.some(p => p.component === 'SYN');
  const hasPrag = profiles.some(p => p.component === 'PRAG');
  if (hasLex && (hasSyn || hasPrag)) {
    benefits.push({
      type: 'context',
      magnitude: 0.5,
      description: `Lexical items embedded in syntactic/pragmatic context`,
      contributingObjects: profiles.filter(p =>
        p.component === 'LEX' || p.component === 'SYN' || p.component === 'PRAG'
      ).map(p => p.objectId),
    });
  }

  return benefits;
}

/**
 * Evaluates feasibility of combining objects.
 *
 * @param profiles - Object profiles to evaluate
 * @param userAbility - User's ability estimate
 * @param strategy - Selection strategy
 * @returns Feasibility analysis
 */
export function evaluateCombinationFeasibility(
  profiles: ObjectSelectionProfile[],
  userAbility: number,
  strategy: SelectionStrategy = DEFAULT_SELECTION_STRATEGY
): CombinationFeasibility {
  if (profiles.length === 0) {
    return {
      isFeasible: false,
      combinedDifficulty: 0,
      totalCognitiveLoad: 0,
      predictedSuccess: 0,
      risks: [],
      benefits: [],
      score: 0,
    };
  }

  // Limit input size
  const limitedProfiles = profiles.slice(0, MAX_OBJECTS_PER_SELECTION);

  const combinedDifficulty = estimateCombinedDifficulty(limitedProfiles);
  const totalCognitiveLoad = calculateCombinedCognitiveLoad(limitedProfiles);
  const predictedSuccess = predictCombinedSuccess(limitedProfiles, userAbility);

  const risks = identifyRisks(limitedProfiles, strategy);
  const benefits = identifyBenefits(limitedProfiles, strategy);

  // Calculate overall score
  const riskPenalty = risks.reduce((sum, r) => sum + r.severity * 0.2, 0);
  const benefitBonus = benefits.reduce((sum, b) => sum + b.magnitude * 0.15, 0);

  // Base score from predicted success
  let score = predictedSuccess;

  // Apply risk and benefit modifiers
  score = Math.max(0, score - riskPenalty + benefitBonus);

  // Penalize exceeding object limit
  if (limitedProfiles.length > strategy.maxObjectsPerTask) {
    score *= 0.5;
  }

  // Determine feasibility
  const isFeasible = (
    score >= 0.3 &&
    totalCognitiveLoad <= strategy.maxCognitiveLoad * 1.2 &&
    !risks.some(r => r.severity > 0.8)
  );

  return {
    isFeasible,
    combinedDifficulty,
    totalCognitiveLoad,
    predictedSuccess,
    risks,
    benefits,
    score: Math.max(0, Math.min(1, score)),
  };
}

/**
 * Selects optimal supporting objects for a primary object.
 *
 * @param primaryProfile - Primary object profile
 * @param candidateProfiles - Candidate supporting objects
 * @param userAbility - User's ability estimate
 * @param strategy - Selection strategy
 * @returns Recommended object grouping
 */
export function selectSupportingObjects(
  primaryProfile: ObjectSelectionProfile,
  candidateProfiles: ObjectSelectionProfile[],
  userAbility: number,
  strategy: SelectionStrategy = DEFAULT_SELECTION_STRATEGY
): ObjectGrouping {
  // Limit candidates
  const candidates = candidateProfiles
    .filter(p => p.objectId !== primaryProfile.objectId)
    .slice(0, MAX_CANDIDATE_PAIRS);

  if (candidates.length === 0) {
    return {
      primaryObjectId: primaryProfile.objectId,
      supportingObjectIds: [],
      feasibility: evaluateCombinationFeasibility([primaryProfile], userAbility, strategy),
      recommendedTaskType: determineTaskType([primaryProfile]),
      componentWeights: { [primaryProfile.component]: 1.0 },
    };
  }

  // Score each candidate pairing
  const pairScores: Array<{ candidateId: string; score: number; feasibility: CombinationFeasibility }> = [];

  for (const candidate of candidates) {
    const feasibility = evaluateCombinationFeasibility(
      [primaryProfile, candidate],
      userAbility,
      strategy
    );
    pairScores.push({
      candidateId: candidate.objectId,
      score: feasibility.score,
      feasibility,
    });
  }

  // Sort by score descending
  pairScores.sort((a, b) => b.score - a.score);

  // Greedily add supporting objects up to limit
  const selected: ObjectSelectionProfile[] = [primaryProfile];
  const selectedIds: string[] = [];

  for (const pair of pairScores) {
    if (selectedIds.length >= strategy.maxObjectsPerTask - 1) break;
    if (pair.score < 0.4) break; // Don't add low-score objects

    const candidate = candidates.find(c => c.objectId === pair.candidateId);
    if (!candidate) continue; // Defensive: should never happen but safe to skip
    const testGroup = [...selected, candidate];
    const testFeasibility = evaluateCombinationFeasibility(testGroup, userAbility, strategy);

    if (testFeasibility.isFeasible && testFeasibility.score >= 0.4) {
      selected.push(candidate);
      selectedIds.push(pair.candidateId);
    }
  }

  const finalFeasibility = evaluateCombinationFeasibility(selected, userAbility, strategy);

  // Calculate component weights
  const componentWeights: Partial<Record<ComponentType, number>> = {};
  const componentCounts = new Map<ComponentType, number>();
  for (const p of selected) {
    componentCounts.set(p.component, (componentCounts.get(p.component) || 0) + 1);
  }
  for (const [component, count] of componentCounts) {
    componentWeights[component] = count / selected.length;
  }

  return {
    primaryObjectId: primaryProfile.objectId,
    supportingObjectIds: selectedIds,
    feasibility: finalFeasibility,
    recommendedTaskType: determineTaskType(selected),
    componentWeights,
  };
}

/**
 * Determines recommended task type based on object composition.
 *
 * @param profiles - Object profiles
 * @returns Recommended task type
 */
export function determineTaskType(profiles: ObjectSelectionProfile[]): string {
  if (profiles.length === 0) return 'flashcard';
  if (profiles.length === 1) return 'single_focus';

  const components = new Set(profiles.map(p => p.component));
  const avgMastery = profiles.reduce((s, p) => s + p.masteryStage, 0) / profiles.length;

  if (components.has('SYN') && components.has('LEX')) {
    return avgMastery >= 2 ? 'sentence_completion' : 'guided_construction';
  }

  if (components.has('G2P')) {
    return 'pronunciation_practice';
  }

  if (components.has('MORPH') && components.size === 1) {
    return 'morphology_drill';
  }

  if (components.has('PRAG')) {
    return 'contextual_usage';
  }

  if (avgMastery >= 3) {
    return 'integrated_production';
  }

  return 'multi_object_recognition';
}

/**
 * Creates a batch of recommended groupings from a pool of objects.
 *
 * @param profiles - All available object profiles
 * @param userAbility - User's ability estimate
 * @param batchSize - Number of groupings to create
 * @param strategy - Selection strategy
 * @returns Array of recommended groupings
 */
export function createObjectGroupingBatch(
  profiles: ObjectSelectionProfile[],
  userAbility: number,
  batchSize: number,
  strategy: SelectionStrategy = DEFAULT_SELECTION_STRATEGY
): ObjectGrouping[] {
  if (profiles.length === 0) return [];

  // Sort by priority (highest first)
  const sorted = [...profiles].sort((a, b) => b.priority - a.priority);
  const groupings: ObjectGrouping[] = [];
  const usedObjectIds = new Set<string>();

  for (const primary of sorted) {
    if (groupings.length >= batchSize) break;
    if (usedObjectIds.has(primary.objectId)) continue;

    // Find unused candidates
    const candidates = sorted.filter(p => !usedObjectIds.has(p.objectId));

    const grouping = selectSupportingObjects(primary, candidates, userAbility, strategy);

    // Mark objects as used
    usedObjectIds.add(grouping.primaryObjectId);
    for (const id of grouping.supportingObjectIds) {
      usedObjectIds.add(id);
    }

    groupings.push(grouping);
  }

  return groupings;
}
