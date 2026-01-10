/**
 * Indirect Update Mechanism Module
 *
 * Propagates learning updates to related objects when one object is learned.
 * Implements the "ripple effect" where mastering one item affects related items
 * through morphological, collocational, semantic, and syntactic relationships.
 *
 * Purpose:
 * - Reduce redundant learning of related items
 * - Leverage transfer effects for efficiency
 * - Update difficulty estimates based on related mastery
 * - Track cumulative family/network effects
 *
 * Theoretical Framework:
 * - Morphological Family Effect (Nagy et al., 1989)
 * - Associative Network Theory (Collins & Loftus, 1975)
 * - Transfer-Appropriate Processing (Morris et al., 1977)
 *
 * @module core/indirect-update
 */

import type { ComponentType, MasteryStage } from './types';
import type { TransferRelation, TransferType } from './transfer-prediction';

// =============================================================================
// Memory Safety Constants
// =============================================================================

/** Maximum objects to update in single propagation */
const MAX_PROPAGATION_TARGETS = 50;

/** Maximum propagation depth (hops) */
const MAX_PROPAGATION_DEPTH = 3;

/** Maximum update history entries */
const MAX_UPDATE_HISTORY = 500;

// =============================================================================
// Types
// =============================================================================

/**
 * Update event for a single object.
 */
export interface ObjectUpdateEvent {
  /** Object that was directly updated */
  sourceObjectId: string;

  /** Type of update (response, review, assessment) */
  updateType: UpdateType;

  /** New mastery stage */
  newStage: MasteryStage;

  /** Previous mastery stage */
  previousStage: MasteryStage;

  /** Accuracy of the update event */
  accuracy: number;

  /** Response time (ms) */
  responseTimeMs: number;

  /** Timestamp of update */
  timestamp: number;

  /** Component type */
  component: ComponentType;
}

/**
 * Type of update that triggers propagation.
 */
export type UpdateType =
  | 'response'     // Regular task response
  | 'review'       // Spaced review
  | 'assessment'   // Formal assessment
  | 'initial'      // Initial learning
  | 'correction';  // Error correction

/**
 * Indirect update to be applied to a related object.
 */
export interface IndirectUpdate {
  /** Target object ID */
  targetObjectId: string;

  /** Source object that triggered update */
  sourceObjectId: string;

  /** Relationship type */
  relationshipType: TransferType;

  /** Update magnitude (0-1) */
  magnitude: number;

  /** Difficulty adjustment (negative = easier) */
  difficultyAdjustment: number;

  /** Stability boost (days) */
  stabilityBoost: number;

  /** Priority adjustment */
  priorityAdjustment: number;

  /** Confidence in update (0-1) */
  confidence: number;

  /** Propagation depth (1 = direct, 2+ = indirect) */
  depth: number;

  /** Reason for update */
  reason: string;
}

/**
 * Result of propagation operation.
 */
export interface PropagationResult {
  /** Source update event */
  sourceEvent: ObjectUpdateEvent;

  /** All indirect updates generated */
  indirectUpdates: IndirectUpdate[];

  /** Total objects affected */
  totalAffected: number;

  /** Cumulative magnitude of updates */
  cumulativeMagnitude: number;

  /** Summary by relationship type */
  byRelationType: Map<TransferType, number>;

  /** Processing time (ms) */
  processingTimeMs: number;
}

/**
 * Object state for propagation calculation.
 */
export interface ObjectPropagationState {
  /** Object ID */
  objectId: string;

  /** Current mastery stage */
  masteryStage: MasteryStage;

  /** Current difficulty estimate */
  difficulty: number;

  /** Current stability (days) */
  stability: number;

  /** Current priority score */
  priority: number;

  /** Component type */
  component: ComponentType;

  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * Propagation configuration.
 */
export interface PropagationConfig {
  /** Enable propagation */
  enabled: boolean;

  /** Minimum magnitude to propagate */
  minMagnitude: number;

  /** Maximum propagation depth */
  maxDepth: number;

  /** Decay factor per hop */
  depthDecayFactor: number;

  /** Relationship type weights */
  relationshipWeights: Record<TransferType, number>;

  /** Update type weights */
  updateTypeWeights: Record<UpdateType, number>;

  /** Whether to update difficulty */
  updateDifficulty: boolean;

  /** Whether to update stability */
  updateStability: boolean;

  /** Whether to update priority */
  updatePriority: boolean;
}

/**
 * Update history entry for tracking.
 */
export interface UpdateHistoryEntry {
  /** Update timestamp */
  timestamp: number;

  /** Source object */
  sourceObjectId: string;

  /** Target object */
  targetObjectId: string;

  /** Magnitude applied */
  magnitude: number;

  /** Relationship type */
  relationshipType: TransferType;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default propagation configuration.
 */
export const DEFAULT_PROPAGATION_CONFIG: PropagationConfig = {
  enabled: true,
  minMagnitude: 0.05,
  maxDepth: 2,
  depthDecayFactor: 0.5,
  relationshipWeights: {
    morphological: 0.8,   // Strong family propagation
    collocational: 0.5,   // Moderate collocation effect
    semantic: 0.4,        // Moderate semantic spreading
    syntactic: 0.3,       // Lower syntactic transfer
    phonological: 0.25,   // Lower phonological transfer
    orthographic: 0.2,    // Lowest orthographic transfer
  },
  updateTypeWeights: {
    response: 1.0,
    review: 0.8,
    assessment: 1.2,
    initial: 0.6,
    correction: 0.5,
  },
  updateDifficulty: true,
  updateStability: true,
  updatePriority: true,
};

/**
 * Stage improvement thresholds for propagation.
 */
export const STAGE_IMPROVEMENT_WEIGHTS: Record<number, number> = {
  0: 0.2,   // 0→1: minimal propagation
  1: 0.5,   // 1→2: moderate propagation
  2: 0.8,   // 2→3: strong propagation
  3: 1.0,   // 3→4: full propagation
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Calculates base propagation magnitude from update event.
 *
 * @param event - Update event
 * @param config - Propagation configuration
 * @returns Base magnitude (0-1)
 */
export function calculateBaseMagnitude(
  event: ObjectUpdateEvent,
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): number {
  // Stage improvement factor
  const stageImprovement = event.newStage - event.previousStage;
  const stageWeight = stageImprovement > 0
    ? STAGE_IMPROVEMENT_WEIGHTS[event.previousStage] || 0.5
    : 0.3; // Maintenance/decline has lower propagation

  // Accuracy factor
  const accuracyFactor = event.accuracy;

  // Update type factor
  const updateTypeFactor = config.updateTypeWeights[event.updateType] || 1.0;

  // Combine factors
  const baseMagnitude = stageWeight * accuracyFactor * updateTypeFactor;

  return Math.max(0, Math.min(1, baseMagnitude));
}

/**
 * Calculates propagation magnitude for a relationship.
 *
 * @param baseMagnitude - Base magnitude from source event
 * @param relation - Transfer relation to target
 * @param depth - Current propagation depth
 * @param config - Propagation configuration
 * @returns Propagation magnitude (0-1)
 */
export function calculatePropagationMagnitude(
  baseMagnitude: number,
  relation: TransferRelation,
  depth: number,
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): number {
  if (depth > config.maxDepth) return 0;

  // Relationship strength
  const relationStrength = relation.strength;

  // Relationship type weight
  const typeWeight = config.relationshipWeights[relation.transferType] || 0.3;

  // Depth decay
  const depthFactor = Math.pow(config.depthDecayFactor, depth - 1);

  // Confidence factor
  const confidenceFactor = relation.confidence;

  // Combine
  const magnitude = baseMagnitude * relationStrength * typeWeight * depthFactor * confidenceFactor;

  return Math.max(0, Math.min(1, magnitude));
}

/**
 * Calculates difficulty adjustment from propagation.
 *
 * @param magnitude - Propagation magnitude
 * @param sourceState - Source object state
 * @param targetState - Target object state
 * @returns Difficulty adjustment (negative = easier)
 */
export function calculateDifficultyAdjustment(
  magnitude: number,
  sourceState: ObjectPropagationState,
  targetState: ObjectPropagationState
): number {
  // Base adjustment proportional to magnitude
  // Maximum 0.5 difficulty units reduction per propagation
  const baseAdjustment = -magnitude * 0.5;

  // Reduce effect if target already easier than source
  const difficultyGap = targetState.difficulty - sourceState.difficulty;
  const gapFactor = difficultyGap > 0 ? 1.0 : 0.5;

  return baseAdjustment * gapFactor;
}

/**
 * Calculates stability boost from propagation.
 *
 * @param magnitude - Propagation magnitude
 * @param sourceState - Source object state
 * @returns Stability boost (days)
 */
export function calculateStabilityBoost(
  magnitude: number,
  sourceState: ObjectPropagationState
): number {
  // Base boost proportional to magnitude and source stability
  // Maximum 3 days boost from indirect update
  const maxBoost = 3;
  const baseBoost = magnitude * (sourceState.stability / 30) * maxBoost;

  return Math.max(0, Math.min(maxBoost, baseBoost));
}

/**
 * Calculates priority adjustment from propagation.
 *
 * @param magnitude - Propagation magnitude
 * @param targetState - Target object state
 * @returns Priority adjustment (-1 to 1)
 */
export function calculatePriorityAdjustment(
  magnitude: number,
  targetState: ObjectPropagationState
): number {
  // Higher magnitude = lower priority (less urgent)
  // But only reduce if target is at lower stage
  if (targetState.masteryStage >= 3) {
    return 0; // Don't adjust priority for high-stage items
  }

  // Negative adjustment means lower priority (item got easier)
  return -magnitude * 0.3;
}

/**
 * Creates an indirect update for a target object.
 *
 * @param sourceEvent - Source update event
 * @param relation - Relationship to target
 * @param sourceState - Source object state
 * @param targetState - Target object state
 * @param baseMagnitude - Base propagation magnitude
 * @param depth - Current propagation depth
 * @param config - Propagation configuration
 * @returns Indirect update or null if below threshold
 */
export function createIndirectUpdate(
  sourceEvent: ObjectUpdateEvent,
  relation: TransferRelation,
  sourceState: ObjectPropagationState,
  targetState: ObjectPropagationState,
  baseMagnitude: number,
  depth: number,
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): IndirectUpdate | null {
  const magnitude = calculatePropagationMagnitude(baseMagnitude, relation, depth, config);

  if (magnitude < config.minMagnitude) {
    return null;
  }

  const difficultyAdjustment = config.updateDifficulty
    ? calculateDifficultyAdjustment(magnitude, sourceState, targetState)
    : 0;

  const stabilityBoost = config.updateStability
    ? calculateStabilityBoost(magnitude, sourceState)
    : 0;

  const priorityAdjustment = config.updatePriority
    ? calculatePriorityAdjustment(magnitude, targetState)
    : 0;

  // Generate reason
  const stageChange = sourceEvent.newStage - sourceEvent.previousStage;
  const reason = stageChange > 0
    ? `Transfer from ${sourceEvent.sourceObjectId} (stage ${sourceEvent.previousStage}→${sourceEvent.newStage})`
    : `Reinforcement from ${sourceEvent.sourceObjectId} review`;

  return {
    targetObjectId: relation.targetId,
    sourceObjectId: sourceEvent.sourceObjectId,
    relationshipType: relation.transferType,
    magnitude,
    difficultyAdjustment,
    stabilityBoost,
    priorityAdjustment,
    confidence: relation.confidence * (1 - (depth - 1) * 0.2),
    depth,
    reason,
  };
}

/**
 * Propagates update through relationship network.
 *
 * @param event - Source update event
 * @param relations - All transfer relations
 * @param objectStates - Map of object states
 * @param config - Propagation configuration
 * @returns Propagation result
 */
export function propagateUpdate(
  event: ObjectUpdateEvent,
  relations: TransferRelation[],
  objectStates: Map<string, ObjectPropagationState>,
  config: PropagationConfig = DEFAULT_PROPAGATION_CONFIG
): PropagationResult {
  const startTime = Date.now();

  if (!config.enabled) {
    return {
      sourceEvent: event,
      indirectUpdates: [],
      totalAffected: 0,
      cumulativeMagnitude: 0,
      byRelationType: new Map(),
      processingTimeMs: 0,
    };
  }

  const sourceState = objectStates.get(event.sourceObjectId);
  if (!sourceState) {
    return {
      sourceEvent: event,
      indirectUpdates: [],
      totalAffected: 0,
      cumulativeMagnitude: 0,
      byRelationType: new Map(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  const baseMagnitude = calculateBaseMagnitude(event, config);
  const indirectUpdates: IndirectUpdate[] = [];
  const visited = new Set<string>([event.sourceObjectId]);
  const byRelationType = new Map<TransferType, number>();

  // BFS propagation
  interface QueueItem {
    objectId: string;
    depth: number;
    parentMagnitude: number;
  }

  const queue: QueueItem[] = [{ objectId: event.sourceObjectId, depth: 0, parentMagnitude: baseMagnitude }];

  while (queue.length > 0 && indirectUpdates.length < MAX_PROPAGATION_TARGETS) {
    const current = queue.shift()!;

    if (current.depth >= config.maxDepth || current.depth >= MAX_PROPAGATION_DEPTH) {
      continue;
    }

    // Find outgoing relations
    const outgoingRelations = relations.filter(r => r.sourceId === current.objectId);

    for (const relation of outgoingRelations) {
      if (visited.has(relation.targetId)) continue;
      visited.add(relation.targetId);

      const targetState = objectStates.get(relation.targetId);
      if (!targetState) continue;

      const update = createIndirectUpdate(
        event,
        relation,
        sourceState,
        targetState,
        current.parentMagnitude,
        current.depth + 1,
        config
      );

      if (update) {
        indirectUpdates.push(update);

        // Track by relation type
        const currentTypeSum = byRelationType.get(relation.transferType) || 0;
        byRelationType.set(relation.transferType, currentTypeSum + update.magnitude);

        // Add to queue for further propagation
        if (current.depth + 1 < config.maxDepth) {
          queue.push({
            objectId: relation.targetId,
            depth: current.depth + 1,
            parentMagnitude: update.magnitude,
          });
        }
      }
    }
  }

  const cumulativeMagnitude = indirectUpdates.reduce((sum, u) => sum + u.magnitude, 0);

  return {
    sourceEvent: event,
    indirectUpdates: indirectUpdates.slice(0, MAX_PROPAGATION_TARGETS),
    totalAffected: indirectUpdates.length,
    cumulativeMagnitude,
    byRelationType,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Applies indirect updates to object states.
 *
 * @param updates - Indirect updates to apply
 * @param objectStates - Mutable map of object states
 * @returns Number of states modified
 */
export function applyIndirectUpdates(
  updates: IndirectUpdate[],
  objectStates: Map<string, ObjectPropagationState>
): number {
  let modified = 0;

  for (const update of updates) {
    const state = objectStates.get(update.targetObjectId);
    if (!state) continue;

    // Apply difficulty adjustment
    if (update.difficultyAdjustment !== 0) {
      state.difficulty = Math.max(-3, Math.min(3, state.difficulty + update.difficultyAdjustment));
    }

    // Apply stability boost
    if (update.stabilityBoost > 0) {
      state.stability = Math.min(365, state.stability + update.stabilityBoost);
    }

    // Apply priority adjustment
    if (update.priorityAdjustment !== 0) {
      state.priority = Math.max(0, Math.min(1, state.priority + update.priorityAdjustment));
    }

    // Update timestamp
    state.lastUpdated = Date.now();
    modified++;
  }

  return modified;
}

/**
 * Filters updates by minimum magnitude.
 *
 * @param updates - Updates to filter
 * @param minMagnitude - Minimum magnitude threshold
 * @returns Filtered updates
 */
export function filterByMagnitude(
  updates: IndirectUpdate[],
  minMagnitude: number
): IndirectUpdate[] {
  return updates.filter(u => u.magnitude >= minMagnitude);
}

/**
 * Groups updates by target object.
 *
 * @param updates - Updates to group
 * @returns Map of target ID to updates
 */
export function groupByTarget(
  updates: IndirectUpdate[]
): Map<string, IndirectUpdate[]> {
  const grouped = new Map<string, IndirectUpdate[]>();

  for (const update of updates) {
    if (!grouped.has(update.targetObjectId)) {
      grouped.set(update.targetObjectId, []);
    }
    grouped.get(update.targetObjectId)!.push(update);
  }

  return grouped;
}

/**
 * Aggregates multiple updates to same target.
 *
 * @param updates - Updates for same target
 * @returns Aggregated update
 */
export function aggregateUpdates(updates: IndirectUpdate[]): IndirectUpdate | null {
  if (updates.length === 0) return null;
  if (updates.length === 1) return updates[0];

  // Use first update as base
  const base = updates[0];

  // Aggregate with diminishing returns
  let totalMagnitude = 0;
  let totalDifficulty = 0;
  let totalStability = 0;
  let totalPriority = 0;
  let totalConfidence = 0;

  for (let i = 0; i < updates.length; i++) {
    const diminishFactor = 1 / (1 + i * 0.5);
    const update = updates[i];

    totalMagnitude += update.magnitude * diminishFactor;
    totalDifficulty += update.difficultyAdjustment * diminishFactor;
    totalStability += update.stabilityBoost * diminishFactor;
    totalPriority += update.priorityAdjustment * diminishFactor;
    totalConfidence += update.confidence * diminishFactor;
  }

  // Find dominant relationship type
  const typeCounts = new Map<TransferType, number>();
  for (const u of updates) {
    typeCounts.set(u.relationshipType, (typeCounts.get(u.relationshipType) || 0) + 1);
  }
  const dominantType = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])[0][0];

  return {
    targetObjectId: base.targetObjectId,
    sourceObjectId: `multiple (${updates.length})`,
    relationshipType: dominantType,
    magnitude: Math.min(1, totalMagnitude),
    difficultyAdjustment: Math.max(-1, totalDifficulty),
    stabilityBoost: Math.min(5, totalStability),
    priorityAdjustment: Math.max(-0.5, Math.min(0.5, totalPriority)),
    confidence: Math.min(1, totalConfidence / updates.length),
    depth: Math.min(...updates.map(u => u.depth)),
    reason: `Aggregated from ${updates.length} sources`,
  };
}

/**
 * Creates update history entry.
 *
 * @param update - Indirect update
 * @returns History entry
 */
export function createHistoryEntry(update: IndirectUpdate): UpdateHistoryEntry {
  return {
    timestamp: Date.now(),
    sourceObjectId: update.sourceObjectId,
    targetObjectId: update.targetObjectId,
    magnitude: update.magnitude,
    relationshipType: update.relationshipType,
  };
}

/**
 * Summarizes propagation result.
 *
 * @param result - Propagation result
 * @returns Human-readable summary
 */
export function summarizePropagation(result: PropagationResult): string {
  if (result.totalAffected === 0) {
    return 'No objects affected by propagation';
  }

  const typeBreakdown = Array.from(result.byRelationType.entries())
    .map(([type, magnitude]) => `${type}: ${magnitude.toFixed(2)}`)
    .join(', ');

  return (
    `Propagation affected ${result.totalAffected} objects ` +
    `(total magnitude: ${result.cumulativeMagnitude.toFixed(2)}, ` +
    `types: ${typeBreakdown}, ` +
    `time: ${result.processingTimeMs}ms)`
  );
}
