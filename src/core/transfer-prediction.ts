/**
 * Transfer Prediction Module
 *
 * Predicts within-L2 learning transfer effects between language objects.
 * Complements the L1-L2 transfer.ts module by modeling how learning one
 * object influences the learning of related objects.
 *
 * Theoretical Framework:
 * - Connectionist Learning (Rumelhart & McClelland, 1986)
 * - Transfer of Training (Thorndike & Woodworth, 1901)
 * - Morphological Family Effects (Nagy et al., 1989)
 * - Associative Learning (Anderson, 1983)
 *
 * Transfer Types:
 * 1. Morphological: Word family members share root knowledge
 * 2. Collocational: Co-occurrence patterns strengthen together
 * 3. Semantic: Related meanings facilitate each other
 * 4. Syntactic: Shared grammatical patterns transfer
 * 5. Phonological: Similar sound patterns aid pronunciation
 *
 * @module core/transfer-prediction
 */

import type { ComponentType, MasteryStage } from './types';

// =============================================================================
// Memory Safety Constants
// =============================================================================

/** Maximum related objects to process */
const MAX_RELATED_OBJECTS = 100;

/** Maximum transfer chain depth */
const MAX_CHAIN_DEPTH = 5;

/** Maximum prediction history */
const MAX_PREDICTION_HISTORY = 1000;

// =============================================================================
// Types
// =============================================================================

/**
 * Type of transfer relationship between objects.
 */
export type TransferType =
  | 'morphological'  // Same word family (run -> running, runner)
  | 'collocational'  // Co-occurrence (make + decision, take + chance)
  | 'semantic'       // Meaning similarity (big ↔ large)
  | 'syntactic'      // Shared pattern (V + to-infinitive)
  | 'phonological'   // Sound similarity (cat, bat, hat)
  | 'orthographic';  // Spelling pattern (ight words)

/**
 * Direction of transfer effect.
 */
export type TransferDirection = 'forward' | 'backward' | 'bidirectional';

/**
 * Transfer relationship between two objects.
 */
export interface TransferRelation {
  /** Source object ID */
  sourceId: string;

  /** Target object ID */
  targetId: string;

  /** Type of transfer */
  transferType: TransferType;

  /** Direction of transfer */
  direction: TransferDirection;

  /** Transfer strength (0-1) */
  strength: number;

  /** Confidence in the relationship (0-1) */
  confidence: number;

  /** Optional linguistic feature that mediates transfer */
  mediatingFeature?: string;
}

/**
 * Transfer prediction result.
 */
export interface TransferPrediction {
  /** Target object that will be affected */
  targetId: string;

  /** Predicted difficulty reduction (positive = easier) */
  difficultyReduction: number;

  /** Predicted learning time reduction ratio (0-1) */
  learningTimeReduction: number;

  /** Predicted stage acceleration (extra stages) */
  stageAcceleration: number;

  /** Primary transfer type contributing */
  primaryTransferType: TransferType;

  /** All contributing relations */
  contributingRelations: TransferRelation[];

  /** Confidence in prediction (0-1) */
  confidence: number;
}

/**
 * Object learning state for transfer calculation.
 */
export interface ObjectLearningState {
  /** Object ID */
  objectId: string;

  /** Component type */
  component: ComponentType;

  /** Current mastery stage (0-4) */
  masteryStage: MasteryStage;

  /** Stability (days of retention) */
  stability: number;

  /** Time since last review (days) */
  daysSinceReview: number;

  /** Automatization level (0-1) */
  automatization: number;
}

/**
 * Transfer network for an object.
 */
export interface TransferNetwork {
  /** Central object ID */
  centerId: string;

  /** Outgoing transfer relations */
  outgoing: TransferRelation[];

  /** Incoming transfer relations */
  incoming: TransferRelation[];

  /** Network statistics */
  stats: {
    totalRelations: number;
    avgStrength: number;
    primaryType: TransferType;
    networkReach: number;
  };
}

/**
 * Batch transfer prediction result.
 */
export interface BatchTransferResult {
  /** Source objects that triggered predictions */
  sourceObjectIds: string[];

  /** All predictions */
  predictions: TransferPrediction[];

  /** Total learning efficiency gain */
  totalEfficiencyGain: number;

  /** Objects to prioritize based on transfer */
  prioritizedObjects: string[];
}

/**
 * Transfer decay function type.
 */
export type DecayFunction = 'exponential' | 'power' | 'linear';

/**
 * Transfer model configuration.
 */
export interface TransferModelConfig {
  /** Base transfer rate per type */
  baseTransferRates: Record<TransferType, number>;

  /** Decay function for transfer over time */
  decayFunction: DecayFunction;

  /** Decay rate parameter */
  decayRate: number;

  /** Minimum transfer threshold (below = no effect) */
  minTransferThreshold: number;

  /** Whether to include indirect (chain) transfer */
  includeIndirectTransfer: boolean;

  /** Maximum chain depth for indirect transfer */
  maxChainDepth: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default transfer rates by type.
 * Based on psycholinguistic research on facilitation effects.
 */
export const DEFAULT_TRANSFER_RATES: Record<TransferType, number> = {
  morphological: 0.6,   // Strong family effects (Nagy et al., 1989)
  collocational: 0.4,   // Moderate PMI-based association
  semantic: 0.35,       // Semantic priming effects
  syntactic: 0.3,       // Pattern generalization
  phonological: 0.25,   // Phonological neighborhood
  orthographic: 0.2,    // Orthographic similarity
};

/**
 * Transfer asymmetry factors.
 * Forward transfer from known → unknown is typically stronger.
 */
export const TRANSFER_ASYMMETRY: Record<TransferDirection, number> = {
  forward: 1.0,         // Full strength
  backward: 0.6,        // Reduced backward transfer
  bidirectional: 0.8,   // Symmetric average
};

/**
 * Stage-based transfer modifiers.
 * Higher mastery = more transfer potential.
 */
export const STAGE_TRANSFER_MODIFIER: Record<MasteryStage, number> = {
  0: 0.1,   // Almost no transfer from unknown items
  1: 0.3,   // Minimal transfer from early learning
  2: 0.6,   // Moderate transfer from established knowledge
  3: 0.85,  // Strong transfer from well-known items
  4: 1.0,   // Full transfer from mastered items
};

/**
 * Default model configuration.
 */
export const DEFAULT_TRANSFER_CONFIG: TransferModelConfig = {
  baseTransferRates: DEFAULT_TRANSFER_RATES,
  decayFunction: 'exponential',
  decayRate: 0.1,
  minTransferThreshold: 0.05,
  includeIndirectTransfer: true,
  maxChainDepth: 3,
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Calculates time-based decay of transfer effect.
 *
 * @param initialStrength - Initial transfer strength
 * @param daysSinceReview - Days since source object was reviewed
 * @param config - Model configuration
 * @returns Decayed transfer strength
 */
export function calculateTransferDecay(
  initialStrength: number,
  daysSinceReview: number,
  config: TransferModelConfig = DEFAULT_TRANSFER_CONFIG
): number {
  if (daysSinceReview <= 0) return initialStrength;
  if (!Number.isFinite(daysSinceReview) || !Number.isFinite(initialStrength)) {
    return 0;
  }

  const { decayFunction, decayRate } = config;
  let decayedStrength: number;

  switch (decayFunction) {
    case 'exponential':
      // S(t) = S₀ * e^(-λt)
      decayedStrength = initialStrength * Math.exp(-decayRate * daysSinceReview);
      break;
    case 'power':
      // S(t) = S₀ * (1 + t)^(-λ)
      decayedStrength = initialStrength * Math.pow(1 + daysSinceReview, -decayRate);
      break;
    case 'linear':
      // S(t) = S₀ * max(0, 1 - λt)
      decayedStrength = initialStrength * Math.max(0, 1 - decayRate * daysSinceReview);
      break;
    default:
      decayedStrength = initialStrength;
  }

  return Math.max(0, Math.min(1, decayedStrength));
}

/**
 * Calculates effective transfer strength between two objects.
 *
 * @param relation - Transfer relation
 * @param sourceState - Learning state of source object
 * @param config - Model configuration
 * @returns Effective transfer strength (0-1)
 */
export function calculateEffectiveTransfer(
  relation: TransferRelation,
  sourceState: ObjectLearningState,
  config: TransferModelConfig = DEFAULT_TRANSFER_CONFIG
): number {
  // Base strength from relation
  const baseStrength = relation.strength;

  // Type-specific rate
  const typeRate = config.baseTransferRates[relation.transferType] || 0.3;

  // Direction asymmetry
  const directionFactor = TRANSFER_ASYMMETRY[relation.direction];

  // Stage-based modifier from source mastery
  const stageFactor = STAGE_TRANSFER_MODIFIER[sourceState.masteryStage];

  // Automatization bonus (automatized knowledge transfers better)
  const automatizationBonus = 1 + sourceState.automatization * 0.2;

  // Time decay
  const decayedStrength = calculateTransferDecay(
    baseStrength,
    sourceState.daysSinceReview,
    config
  );

  // Confidence weighting
  const confidenceWeight = relation.confidence;

  // Combine factors
  const effectiveStrength = (
    decayedStrength *
    typeRate *
    directionFactor *
    stageFactor *
    automatizationBonus *
    confidenceWeight
  );

  return Math.max(0, Math.min(1, effectiveStrength));
}

/**
 * Predicts transfer effect from source to target object.
 *
 * @param sourceState - Learning state of source object
 * @param relation - Transfer relation to target
 * @param targetCurrentDifficulty - Current difficulty of target (IRT scale)
 * @param config - Model configuration
 * @returns Transfer prediction
 */
export function predictTransfer(
  sourceState: ObjectLearningState,
  relation: TransferRelation,
  targetCurrentDifficulty: number,
  config: TransferModelConfig = DEFAULT_TRANSFER_CONFIG
): TransferPrediction {
  const effectiveTransfer = calculateEffectiveTransfer(relation, sourceState, config);

  // Below threshold = no meaningful transfer
  if (effectiveTransfer < config.minTransferThreshold) {
    return {
      targetId: relation.targetId,
      difficultyReduction: 0,
      learningTimeReduction: 0,
      stageAcceleration: 0,
      primaryTransferType: relation.transferType,
      contributingRelations: [relation],
      confidence: relation.confidence * 0.5, // Low confidence in null prediction
    };
  }

  // Difficulty reduction (on IRT scale, -3 to +3)
  // Maximum reduction is 1.5 difficulty units
  const difficultyReduction = effectiveTransfer * 1.5;

  // Learning time reduction (proportion)
  // Strong transfer can reduce learning time by up to 40%
  const learningTimeReduction = effectiveTransfer * 0.4;

  // Stage acceleration (partial stages)
  // Maximum 1 stage acceleration from transfer
  const stageAcceleration = effectiveTransfer * (sourceState.masteryStage >= 3 ? 0.5 : 0.25);

  return {
    targetId: relation.targetId,
    difficultyReduction,
    learningTimeReduction,
    stageAcceleration,
    primaryTransferType: relation.transferType,
    contributingRelations: [relation],
    confidence: Math.min(1, effectiveTransfer * relation.confidence),
  };
}

/**
 * Aggregates multiple transfer predictions for a single target.
 *
 * @param predictions - Array of predictions for same target
 * @returns Aggregated prediction
 */
export function aggregatePredictions(predictions: TransferPrediction[]): TransferPrediction | null {
  if (predictions.length === 0) return null;
  if (predictions.length === 1) return predictions[0];

  const targetId = predictions[0].targetId;

  // Aggregate using diminishing returns model
  let totalDifficultyReduction = 0;
  let totalTimeReduction = 0;
  let totalStageAcceleration = 0;
  const allRelations: TransferRelation[] = [];
  let totalConfidence = 0;

  // Sort by contribution (difficulty reduction)
  const sorted = [...predictions].sort((a, b) => b.difficultyReduction - a.difficultyReduction);

  // First source gets full effect, subsequent sources get diminishing effect
  for (let i = 0; i < sorted.length; i++) {
    const prediction = sorted[i];
    const diminishingFactor = 1 / (1 + i * 0.5); // 1, 0.67, 0.5, 0.4, ...

    totalDifficultyReduction += prediction.difficultyReduction * diminishingFactor;
    totalTimeReduction += prediction.learningTimeReduction * diminishingFactor;
    totalStageAcceleration += prediction.stageAcceleration * diminishingFactor;
    allRelations.push(...prediction.contributingRelations);
    totalConfidence += prediction.confidence * diminishingFactor;
  }

  // Cap maximums
  totalDifficultyReduction = Math.min(2.0, totalDifficultyReduction);
  totalTimeReduction = Math.min(0.6, totalTimeReduction);
  totalStageAcceleration = Math.min(1.0, totalStageAcceleration);

  // Find primary transfer type (most common or strongest)
  const typeCounts = new Map<TransferType, number>();
  for (const p of predictions) {
    typeCounts.set(p.primaryTransferType, (typeCounts.get(p.primaryTransferType) || 0) + 1);
  }
  const primaryType = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])[0][0];

  return {
    targetId,
    difficultyReduction: totalDifficultyReduction,
    learningTimeReduction: totalTimeReduction,
    stageAcceleration: totalStageAcceleration,
    primaryTransferType: primaryType,
    contributingRelations: allRelations.slice(0, MAX_RELATED_OBJECTS),
    confidence: Math.min(1, totalConfidence / predictions.length),
  };
}

/**
 * Builds transfer network for an object.
 *
 * @param objectId - Central object ID
 * @param allRelations - All transfer relations in the system
 * @returns Transfer network
 */
export function buildTransferNetwork(
  objectId: string,
  allRelations: TransferRelation[]
): TransferNetwork {
  const outgoing = allRelations
    .filter(r => r.sourceId === objectId)
    .slice(0, MAX_RELATED_OBJECTS);

  const incoming = allRelations
    .filter(r => r.targetId === objectId)
    .slice(0, MAX_RELATED_OBJECTS);

  const totalRelations = outgoing.length + incoming.length;

  // Calculate average strength
  const allStrengths = [...outgoing, ...incoming].map(r => r.strength);
  const avgStrength = allStrengths.length > 0
    ? allStrengths.reduce((a, b) => a + b, 0) / allStrengths.length
    : 0;

  // Find primary type
  const typeCounts = new Map<TransferType, number>();
  for (const r of [...outgoing, ...incoming]) {
    typeCounts.set(r.transferType, (typeCounts.get(r.transferType) || 0) + 1);
  }
  const primaryType = typeCounts.size > 0
    ? Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : 'semantic';

  // Calculate network reach (unique connected objects)
  const connectedObjects = new Set<string>();
  for (const r of outgoing) connectedObjects.add(r.targetId);
  for (const r of incoming) connectedObjects.add(r.sourceId);

  return {
    centerId: objectId,
    outgoing,
    incoming,
    stats: {
      totalRelations,
      avgStrength,
      primaryType,
      networkReach: connectedObjects.size,
    },
  };
}

/**
 * Calculates indirect (chain) transfer effects.
 *
 * @param sourceState - Learning state of original source
 * @param directRelations - Direct relations from source
 * @param allRelations - All relations for chain lookup
 * @param allStates - All object learning states
 * @param config - Model configuration
 * @param depth - Current chain depth
 * @returns Array of indirect predictions
 */
export function calculateIndirectTransfer(
  sourceState: ObjectLearningState,
  directRelations: TransferRelation[],
  allRelations: TransferRelation[],
  allStates: Map<string, ObjectLearningState>,
  config: TransferModelConfig = DEFAULT_TRANSFER_CONFIG,
  depth: number = 1
): TransferPrediction[] {
  if (depth > config.maxChainDepth || depth > MAX_CHAIN_DEPTH) {
    return [];
  }

  const indirectPredictions: TransferPrediction[] = [];
  const visited = new Set<string>([sourceState.objectId]);

  // For each direct target, find its outgoing relations
  for (const directRel of directRelations.slice(0, MAX_RELATED_OBJECTS)) {
    if (visited.has(directRel.targetId)) continue;
    visited.add(directRel.targetId);

    const intermediateState = allStates.get(directRel.targetId);
    if (!intermediateState) continue;

    // Find relations from intermediate object
    const nextRelations = allRelations.filter(
      r => r.sourceId === directRel.targetId && !visited.has(r.targetId)
    );

    for (const nextRel of nextRelations.slice(0, 20)) {
      // Chain transfer strength decays with depth
      const chainDecay = Math.pow(0.5, depth);
      const directTransfer = calculateEffectiveTransfer(directRel, sourceState, config);
      const nextTransfer = calculateEffectiveTransfer(nextRel, intermediateState, config);

      const chainedStrength = directTransfer * nextTransfer * chainDecay;

      if (chainedStrength >= config.minTransferThreshold) {
        indirectPredictions.push({
          targetId: nextRel.targetId,
          difficultyReduction: chainedStrength * 1.0, // Reduced max for chains
          learningTimeReduction: chainedStrength * 0.25,
          stageAcceleration: chainedStrength * 0.15,
          primaryTransferType: nextRel.transferType,
          contributingRelations: [directRel, nextRel],
          confidence: chainedStrength * 0.7, // Lower confidence for chains
        });
      }
    }

    // Recurse for deeper chains
    if (depth < config.maxChainDepth) {
      const deeperPredictions = calculateIndirectTransfer(
        intermediateState,
        nextRelations,
        allRelations,
        allStates,
        config,
        depth + 1
      );
      indirectPredictions.push(...deeperPredictions);
    }
  }

  return indirectPredictions.slice(0, MAX_PREDICTION_HISTORY);
}

/**
 * Generates batch transfer predictions from learned objects.
 *
 * @param learnedObjectStates - States of recently learned/reviewed objects
 * @param relations - All transfer relations
 * @param allStates - All object states
 * @param config - Model configuration
 * @returns Batch transfer result
 */
export function generateBatchTransferPredictions(
  learnedObjectStates: ObjectLearningState[],
  relations: TransferRelation[],
  allStates: Map<string, ObjectLearningState>,
  config: TransferModelConfig = DEFAULT_TRANSFER_CONFIG
): BatchTransferResult {
  const allPredictions: TransferPrediction[] = [];
  const predictionsByTarget = new Map<string, TransferPrediction[]>();

  // Generate predictions from each learned object
  for (const sourceState of learnedObjectStates.slice(0, MAX_RELATED_OBJECTS)) {
    const directRelations = relations.filter(r => r.sourceId === sourceState.objectId);

    // Direct transfer predictions
    for (const rel of directRelations.slice(0, MAX_RELATED_OBJECTS)) {
      const prediction = predictTransfer(sourceState, rel, 0, config);

      if (prediction.difficultyReduction >= config.minTransferThreshold) {
        if (!predictionsByTarget.has(prediction.targetId)) {
          predictionsByTarget.set(prediction.targetId, []);
        }
        predictionsByTarget.get(prediction.targetId)!.push(prediction);
      }
    }

    // Indirect transfer predictions
    if (config.includeIndirectTransfer) {
      const indirectPreds = calculateIndirectTransfer(
        sourceState,
        directRelations,
        relations,
        allStates,
        config
      );

      for (const pred of indirectPreds) {
        if (!predictionsByTarget.has(pred.targetId)) {
          predictionsByTarget.set(pred.targetId, []);
        }
        predictionsByTarget.get(pred.targetId)!.push(pred);
      }
    }
  }

  // Aggregate predictions per target
  for (const [_targetId, preds] of predictionsByTarget) {
    const aggregated = aggregatePredictions(preds);
    if (aggregated) {
      allPredictions.push(aggregated);
    }
  }

  // Sort by total benefit
  allPredictions.sort((a, b) =>
    (b.difficultyReduction + b.learningTimeReduction * 2) -
    (a.difficultyReduction + a.learningTimeReduction * 2)
  );

  // Calculate total efficiency gain
  const totalEfficiencyGain = allPredictions.reduce(
    (sum, p) => sum + p.learningTimeReduction,
    0
  );

  // Prioritize objects with high transfer benefit and not yet mastered
  const prioritizedObjects = allPredictions
    .filter(p => {
      const state = allStates.get(p.targetId);
      return state && state.masteryStage < 4;
    })
    .slice(0, 20)
    .map(p => p.targetId);

  return {
    sourceObjectIds: learnedObjectStates.map(s => s.objectId),
    predictions: allPredictions.slice(0, MAX_PREDICTION_HISTORY),
    totalEfficiencyGain,
    prioritizedObjects,
  };
}

/**
 * Estimates transfer strength between two objects based on features.
 *
 * @param sharedFeatures - Number of shared features
 * @param totalFeatures - Total features considered
 * @param transferType - Type of transfer
 * @returns Estimated strength (0-1)
 */
export function estimateTransferStrength(
  sharedFeatures: number,
  totalFeatures: number,
  transferType: TransferType
): number {
  if (totalFeatures <= 0 || !Number.isFinite(sharedFeatures)) {
    return 0;
  }

  const featureRatio = Math.min(1, sharedFeatures / totalFeatures);
  const baseRate = DEFAULT_TRANSFER_RATES[transferType] || 0.3;

  // Jaccard-like similarity weighted by type
  return featureRatio * baseRate;
}

/**
 * Creates a transfer relation between two objects.
 *
 * @param sourceId - Source object ID
 * @param targetId - Target object ID
 * @param transferType - Type of transfer
 * @param strength - Transfer strength (0-1)
 * @param direction - Direction of transfer
 * @param confidence - Confidence in relation (0-1)
 * @param mediatingFeature - Optional mediating feature
 * @returns Transfer relation
 */
export function createTransferRelation(
  sourceId: string,
  targetId: string,
  transferType: TransferType,
  strength: number,
  direction: TransferDirection = 'forward',
  confidence: number = 0.8,
  mediatingFeature?: string
): TransferRelation {
  if (!sourceId || !targetId) {
    throw new TypeError('sourceId and targetId are required');
  }

  return {
    sourceId,
    targetId,
    transferType,
    direction,
    strength: Math.max(0, Math.min(1, strength)),
    confidence: Math.max(0, Math.min(1, confidence)),
    mediatingFeature,
  };
}
