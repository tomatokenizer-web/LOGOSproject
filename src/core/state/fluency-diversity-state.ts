/**
 * Fluency and Diversity State Module
 *
 * Extends learner state tracking with detailed fluency (speed/automaticity)
 * and diversity (breadth/variety) metrics. Integrates with ComponentObjectState
 * and AutomatizationProfile for comprehensive learner state assessment.
 *
 * Theoretical Framework:
 * - Fluency: Segalowitz (2010) - speed, stability, automatic processing
 * - Diversity: Nation & Webb (2011) - productive vs receptive vocabulary use
 * - Usage space expansion: contexts, registers, collocations
 *
 * Key Constructs:
 * 1. Fluency: How fast and consistently the learner accesses knowledge
 * 2. Diversity: How broadly the learner can use knowledge across contexts
 * 3. Integration: Combining both for holistic proficiency assessment
 *
 * @module core/state/fluency-diversity-state
 */

import type { MasteryStage, TaskModality } from '../types';

// =============================================================================
// Constants for Memory Safety
// =============================================================================

/** Maximum history entries to store */
const MAX_HISTORY_ENTRIES = 1_000;

/** Maximum contexts to track */
const MAX_CONTEXTS = 500;

/** Maximum production samples to store */
const MAX_PRODUCTION_SAMPLES = 200;

/** Maximum output length for production samples */
const MAX_OUTPUT_LENGTH = 10_000;

/** Maximum clock drift allowed for sync (1 minute) */
const MAX_CLOCK_DRIFT_MS = 60_000;

/** Dangerous keys that could cause prototype pollution */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

// =============================================================================
// Types
// =============================================================================

/**
 * Response time observation for fluency tracking.
 */
export interface RTObservation {
  /** Response time in milliseconds */
  responseTimeMs: number;

  /** Whether response was correct */
  isCorrect: boolean;

  /** Task modality */
  modality: TaskModality;

  /** Unix timestamp */
  timestamp: number;
}

/**
 * Fluency metrics for a language object.
 *
 * Based on Segalowitz (2010) cognitive fluency framework:
 * - Speed of access
 * - Consistency (CV)
 * - Attention-free processing
 */
export interface FluencyMetrics {
  /** Average response time (ms) */
  meanResponseTime: number;

  /** Standard deviation of response times */
  responseTimeSD: number;

  /** Coefficient of variation (SD/mean) - lower = more fluent */
  coefficientOfVariation: number;

  /** Proportion of responses within automaticity threshold */
  automaticityRatio: number;

  /** Fastest 10th percentile response time */
  fastestDecileRT: number;

  /** Response time trend (negative = improving) */
  rtTrend: number;

  /** Fluency score (0-1, composite) */
  fluencyScore: number;

  /** Category interpretation */
  fluencyCategory: FluencyCategory;
}

/**
 * Fluency category based on performance patterns.
 */
export type FluencyCategory =
  | 'highly_fluent'    // Near-native speed and consistency
  | 'fluent'           // Fast with occasional hesitation
  | 'developing'       // Moderate speed, some variability
  | 'effortful'        // Slow but accurate
  | 'struggling';      // Slow and inconsistent

/**
 * Context usage record for diversity tracking.
 */
export interface ContextUsage {
  /** Context identifier (e.g., "academic_writing", "casual_speech") */
  contextId: string;

  /** Number of successful uses in this context */
  successfulUses: number;

  /** Accuracy in this context */
  accuracy: number;

  /** Average response time in this context */
  averageRT: number;

  /** Last used timestamp */
  lastUsed: number;
}

/**
 * Production sample for diversity tracking.
 */
export interface ProductionSample {
  /** Output produced by learner */
  output: string;

  /** Context of production */
  contextId: string;

  /** Quality score (0-1) */
  qualityScore: number;

  /** Unix timestamp */
  timestamp: number;
}

/**
 * Diversity metrics for a language object.
 *
 * Measures breadth of usage across contexts and production variety.
 */
export interface DiversityMetrics {
  /** Number of unique contexts where object was used */
  uniqueContextCount: number;

  /** Distribution evenness across contexts (0-1, 1 = even) */
  contextDistributionEvenness: number;

  /** Number of unique production forms/collocations */
  productionVariety: number;

  /** Receptive (recognition) vs productive (generation) ratio */
  receptiveProductiveRatio: number;

  /** Cross-register usage score (0-1) */
  registerFlexibility: number;

  /** Diversity score (0-1, composite) */
  diversityScore: number;

  /** Category interpretation */
  diversityCategory: DiversityCategory;
}

/**
 * Diversity category based on usage patterns.
 */
export type DiversityCategory =
  | 'highly_diverse'   // Used across many contexts and forms
  | 'diverse'          // Good spread with some gaps
  | 'moderate'         // Limited to few contexts
  | 'narrow'           // Mostly single context
  | 'minimal';         // Very limited usage

/**
 * Combined fluency-diversity profile.
 */
export interface FluencyDiversityProfile {
  /** Object identifier */
  objectId: string;

  /** Fluency metrics */
  fluency: FluencyMetrics;

  /** Diversity metrics */
  diversity: DiversityMetrics;

  /** Combined score (0-1) */
  combinedScore: number;

  /** Balance indicator: fluency vs diversity focus needed */
  balanceIndicator: 'balanced' | 'needs_fluency' | 'needs_diversity';

  /** Estimated mastery stage based on both metrics */
  estimatedStage: MasteryStage;

  /** Learning recommendations based on profile */
  recommendations: string[];

  /** Number of observations used */
  observationCount: number;

  /** Confidence in assessment (0-1) */
  confidence: number;

  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Fluency-diversity state for persistent storage.
 */
export interface FluencyDiversityState {
  /** Object identifier */
  objectId: string;

  /** Response time history (circular buffer, newest first) */
  rtHistory: RTObservation[];

  /** Context usage map */
  contextUsages: Map<string, ContextUsage>;

  /** Production samples (newest first) */
  productionSamples: ProductionSample[];

  /** Cached fluency metrics */
  cachedFluency: FluencyMetrics | null;

  /** Cached diversity metrics */
  cachedDiversity: DiversityMetrics | null;

  /** Cache invalidation timestamp */
  cacheValidUntil: number;

  /** Metadata */
  createdAt: number;
  updatedAt: number;
}

// =============================================================================
// Thresholds
// =============================================================================

/**
 * Response time thresholds for fluency assessment (ms).
 */
export const FLUENCY_RT_THRESHOLDS = {
  /** Highly fluent: < 800ms */
  highlyFluent: 800,
  /** Fluent: < 1200ms */
  fluent: 1200,
  /** Developing: < 2000ms */
  developing: 2000,
  /** Effortful: < 4000ms */
  effortful: 4000,
  // Above = struggling
} as const;

/**
 * CV thresholds for fluency stability.
 */
export const FLUENCY_CV_THRESHOLDS = {
  /** Highly stable: CV < 0.15 */
  highlyStable: 0.15,
  /** Stable: CV < 0.25 */
  stable: 0.25,
  /** Moderate: CV < 0.40 */
  moderate: 0.40,
  /** Variable: CV < 0.60 */
  variable: 0.60,
  // Above = highly variable
} as const;

/**
 * Diversity thresholds.
 */
export const DIVERSITY_THRESHOLDS = {
  /** Context count for diverse usage */
  diverseContexts: 5,
  /** Context count for moderate usage */
  moderateContexts: 3,
  /** Minimum receptive-productive ratio for balance */
  balancedRatio: 0.5,
} as const;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a new fluency-diversity state.
 *
 * @param objectId - Object identifier
 * @returns Initial fluency-diversity state
 */
export function createFluencyDiversityState(objectId: string): FluencyDiversityState {
  if (!objectId || typeof objectId !== 'string') {
    throw new TypeError('objectId must be a non-empty string');
  }

  const now = Date.now();

  return {
    objectId,
    rtHistory: [],
    contextUsages: new Map(),
    productionSamples: [],
    cachedFluency: null,
    cachedDiversity: null,
    cacheValidUntil: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// State Update Functions
// =============================================================================

/**
 * Records a response time observation.
 *
 * @param state - Current state
 * @param observation - RT observation to record
 * @returns Updated state
 */
export function recordRTObservation(
  state: FluencyDiversityState,
  observation: RTObservation
): FluencyDiversityState {
  // Validate observation
  if (!observation || typeof observation.responseTimeMs !== 'number') {
    return state;
  }
  if (!Number.isFinite(observation.responseTimeMs) || observation.responseTimeMs < 0) {
    return state;
  }

  // Add to history (newest first)
  const newHistory = [observation, ...state.rtHistory].slice(0, MAX_HISTORY_ENTRIES);

  return {
    ...state,
    rtHistory: newHistory,
    cachedFluency: null, // Invalidate cache
    cacheValidUntil: 0,
    updatedAt: Date.now(),
  };
}

/**
 * Records context usage.
 *
 * @param state - Current state
 * @param contextId - Context identifier
 * @param success - Whether use was successful
 * @param responseTimeMs - Response time
 * @returns Updated state
 */
export function recordContextUsage(
  state: FluencyDiversityState,
  contextId: string,
  success: boolean,
  responseTimeMs: number
): FluencyDiversityState {
  if (!contextId || typeof contextId !== 'string') {
    return state;
  }

  // Limit number of contexts
  if (state.contextUsages.size >= MAX_CONTEXTS && !state.contextUsages.has(contextId)) {
    return state;
  }

  const existing = state.contextUsages.get(contextId);
  const now = Date.now();

  let updated: ContextUsage;
  if (existing) {
    const newSuccessful = success ? existing.successfulUses + 1 : existing.successfulUses;
    // Guard against division by zero
    const totalUses = existing.accuracy > 0
      ? (existing.successfulUses / existing.accuracy) + 1
      : 1;
    const newAccuracy = totalUses > 0 ? newSuccessful / totalUses : 0;
    const newAvgRT = totalUses > 1
      ? (existing.averageRT * (totalUses - 1) + responseTimeMs) / totalUses
      : responseTimeMs;

    updated = {
      contextId,
      successfulUses: newSuccessful,
      accuracy: newAccuracy,
      averageRT: newAvgRT,
      lastUsed: now,
    };
  } else {
    updated = {
      contextId,
      successfulUses: success ? 1 : 0,
      accuracy: success ? 1 : 0,
      averageRT: responseTimeMs,
      lastUsed: now,
    };
  }

  const newContextUsages = new Map(state.contextUsages);
  newContextUsages.set(contextId, updated);

  return {
    ...state,
    contextUsages: newContextUsages,
    cachedDiversity: null, // Invalidate cache
    cacheValidUntil: 0,
    updatedAt: now,
  };
}

/**
 * Records a production sample.
 *
 * @param state - Current state
 * @param sample - Production sample
 * @returns Updated state
 */
export function recordProductionSample(
  state: FluencyDiversityState,
  sample: ProductionSample
): FluencyDiversityState {
  if (!sample || !sample.output || typeof sample.output !== 'string') {
    return state;
  }

  // Add to samples (newest first)
  const newSamples = [sample, ...state.productionSamples].slice(0, MAX_PRODUCTION_SAMPLES);

  return {
    ...state,
    productionSamples: newSamples,
    cachedDiversity: null, // Invalidate cache
    cacheValidUntil: 0,
    updatedAt: Date.now(),
  };
}

// =============================================================================
// Metric Calculation Functions
// =============================================================================

/**
 * Calculates fluency metrics from RT history.
 *
 * @param rtHistory - Response time observations
 * @returns Fluency metrics
 */
export function calculateFluencyMetrics(rtHistory: RTObservation[]): FluencyMetrics {
  const defaultMetrics: FluencyMetrics = {
    meanResponseTime: 0,
    responseTimeSD: 0,
    coefficientOfVariation: 1,
    automaticityRatio: 0,
    fastestDecileRT: 0,
    rtTrend: 0,
    fluencyScore: 0,
    fluencyCategory: 'struggling',
  };

  if (!rtHistory || rtHistory.length === 0) {
    return defaultMetrics;
  }

  // Filter to correct responses only
  const correctObs = rtHistory.filter(o => o.isCorrect);
  if (correctObs.length === 0) {
    return defaultMetrics;
  }

  const rts = correctObs.map(o => o.responseTimeMs).filter(
    rt => Number.isFinite(rt) && rt > 0
  );

  if (rts.length === 0) {
    return defaultMetrics;
  }

  // Calculate basic statistics
  const n = rts.length;
  const mean = rts.reduce((a, b) => a + b, 0) / n;
  const variance = rts.reduce((sum, rt) => sum + (rt - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const cv = mean > 0 ? sd / mean : 1;

  // Calculate automaticity ratio (proportion under fluent threshold)
  const automaticityRatio = rts.filter(rt => rt < FLUENCY_RT_THRESHOLDS.fluent).length / n;

  // Calculate fastest decile
  const sorted = [...rts].sort((a, b) => a - b);
  const decileIndex = Math.floor(n * 0.1);
  const fastestDecileRT = sorted[decileIndex] || sorted[0];

  // Calculate trend (compare first half to second half)
  let rtTrend = 0;
  if (n >= 10) {
    const half = Math.floor(n / 2);
    const olderMean = rts.slice(half).reduce((a, b) => a + b, 0) / (n - half);
    const newerMean = rts.slice(0, half).reduce((a, b) => a + b, 0) / half;
    rtTrend = olderMean > 0 ? (newerMean - olderMean) / olderMean : 0;
  }

  // Calculate composite fluency score
  // Components: speed (40%), consistency (30%), automaticity (30%)
  const speedScore = Math.max(0, 1 - (mean / FLUENCY_RT_THRESHOLDS.effortful));
  const consistencyScore = Math.max(0, 1 - (cv / 0.8));
  const automaticityScore = automaticityRatio;

  const fluencyScore = Math.max(0, Math.min(1,
    0.40 * speedScore + 0.30 * consistencyScore + 0.30 * automaticityScore
  ));

  // Determine category
  let fluencyCategory: FluencyCategory;
  if (mean < FLUENCY_RT_THRESHOLDS.highlyFluent && cv < FLUENCY_CV_THRESHOLDS.stable) {
    fluencyCategory = 'highly_fluent';
  } else if (mean < FLUENCY_RT_THRESHOLDS.fluent && cv < FLUENCY_CV_THRESHOLDS.moderate) {
    fluencyCategory = 'fluent';
  } else if (mean < FLUENCY_RT_THRESHOLDS.developing) {
    fluencyCategory = 'developing';
  } else if (mean < FLUENCY_RT_THRESHOLDS.effortful) {
    fluencyCategory = 'effortful';
  } else {
    fluencyCategory = 'struggling';
  }

  return {
    meanResponseTime: mean,
    responseTimeSD: sd,
    coefficientOfVariation: cv,
    automaticityRatio,
    fastestDecileRT,
    rtTrend,
    fluencyScore,
    fluencyCategory,
  };
}

/**
 * Calculates diversity metrics from context and production data.
 *
 * @param contextUsages - Context usage map
 * @param productionSamples - Production samples
 * @param totalReceptiveCount - Total receptive (recognition) task count
 * @returns Diversity metrics
 */
export function calculateDiversityMetrics(
  contextUsages: Map<string, ContextUsage>,
  productionSamples: ProductionSample[],
  totalReceptiveCount: number
): DiversityMetrics {
  const defaultMetrics: DiversityMetrics = {
    uniqueContextCount: 0,
    contextDistributionEvenness: 0,
    productionVariety: 0,
    receptiveProductiveRatio: 0,
    registerFlexibility: 0,
    diversityScore: 0,
    diversityCategory: 'minimal',
  };

  const uniqueContextCount = contextUsages.size;

  if (uniqueContextCount === 0) {
    return defaultMetrics;
  }

  // Calculate context distribution evenness (normalized entropy)
  const contextValues = Array.from(contextUsages.values());
  const totalUses = contextValues.reduce((sum, ctx) => {
    const uses = ctx.accuracy > 0 ? ctx.successfulUses / ctx.accuracy : 0;
    return sum + uses;
  }, 0);

  let evenness = 0;
  if (totalUses > 0 && uniqueContextCount > 1) {
    const maxEntropy = Math.log(uniqueContextCount);
    let entropy = 0;
    for (const ctx of contextValues) {
      const uses = ctx.accuracy > 0 ? ctx.successfulUses / ctx.accuracy : 0;
      const p = uses / totalUses;
      if (p > 0) {
        entropy -= p * Math.log(p);
      }
    }
    evenness = maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  // Calculate production variety (unique outputs)
  const uniqueOutputs = new Set(productionSamples.map(s => s.output.toLowerCase().trim()));
  const productionVariety = uniqueOutputs.size;

  // Calculate receptive-productive ratio
  const productiveCount = productionSamples.length;
  const receptiveProductiveRatio = (totalReceptiveCount + productiveCount) > 0
    ? productiveCount / (totalReceptiveCount + productiveCount)
    : 0;

  // Estimate register flexibility (based on context types)
  // Simple heuristic: count context categories
  const registerContexts = new Set<string>();
  for (const ctx of contextUsages.keys()) {
    const category = ctx.split('_')[0]; // e.g., "academic" from "academic_writing"
    registerContexts.add(category);
  }
  const registerFlexibility = Math.min(1, registerContexts.size / 4); // Assume 4 main registers

  // Calculate composite diversity score
  // Components: context count (30%), evenness (25%), production (25%), register (20%)
  const contextScore = Math.min(1, uniqueContextCount / DIVERSITY_THRESHOLDS.diverseContexts);
  const evennessScore = evenness;
  const productionScore = Math.min(1, productionVariety / 10); // Assume 10+ is high variety
  const registerScore = registerFlexibility;

  const diversityScore = Math.max(0, Math.min(1,
    0.30 * contextScore + 0.25 * evennessScore + 0.25 * productionScore + 0.20 * registerScore
  ));

  // Determine category
  let diversityCategory: DiversityCategory;
  if (uniqueContextCount >= DIVERSITY_THRESHOLDS.diverseContexts && diversityScore >= 0.7) {
    diversityCategory = 'highly_diverse';
  } else if (uniqueContextCount >= DIVERSITY_THRESHOLDS.moderateContexts && diversityScore >= 0.5) {
    diversityCategory = 'diverse';
  } else if (uniqueContextCount >= 2) {
    diversityCategory = 'moderate';
  } else if (uniqueContextCount === 1 && contextValues[0]?.successfulUses > 0) {
    diversityCategory = 'narrow';
  } else {
    diversityCategory = 'minimal';
  }

  return {
    uniqueContextCount,
    contextDistributionEvenness: evenness,
    productionVariety,
    receptiveProductiveRatio,
    registerFlexibility,
    diversityScore,
    diversityCategory,
  };
}

/**
 * Estimates mastery stage from fluency and diversity metrics.
 *
 * @param fluency - Fluency metrics
 * @param diversity - Diversity metrics
 * @returns Estimated mastery stage
 */
export function estimateStageFromFluencyDiversity(
  fluency: FluencyMetrics,
  diversity: DiversityMetrics
): MasteryStage {
  const combined = (fluency.fluencyScore + diversity.diversityScore) / 2;

  // Stage 4: Both highly fluent and diverse
  if (fluency.fluencyCategory === 'highly_fluent' && diversity.diversityCategory === 'highly_diverse') {
    return 4;
  }

  // Stage 4 alternative: High combined score
  if (combined >= 0.85) {
    return 4;
  }

  // Stage 3: Fluent or diverse, combined good
  if (combined >= 0.65) {
    return 3;
  }

  // Stage 2: Developing, some usage
  if (combined >= 0.35) {
    return 2;
  }

  // Stage 1: Minimal but present
  if (combined > 0.1) {
    return 1;
  }

  return 0;
}

/**
 * Generates learning recommendations based on profile.
 *
 * @param fluency - Fluency metrics
 * @param diversity - Diversity metrics
 * @returns Array of recommendations
 */
export function generateRecommendations(
  fluency: FluencyMetrics,
  diversity: DiversityMetrics
): string[] {
  const recommendations: string[] = [];

  // Fluency recommendations
  if (fluency.fluencyCategory === 'struggling' || fluency.fluencyCategory === 'effortful') {
    recommendations.push('Focus on speed building with timed recognition tasks');
    recommendations.push('Use spaced retrieval practice to strengthen memory traces');
  }

  if (fluency.coefficientOfVariation > FLUENCY_CV_THRESHOLDS.moderate) {
    recommendations.push('Practice for consistency - aim for steady response times');
  }

  if (fluency.rtTrend > 0.1) {
    recommendations.push('Response times increasing - review and consolidate');
  }

  // Diversity recommendations
  if (diversity.uniqueContextCount < DIVERSITY_THRESHOLDS.moderateContexts) {
    recommendations.push('Practice in more diverse contexts');
    recommendations.push('Try using this in different registers (formal/informal)');
  }

  if (diversity.receptiveProductiveRatio < DIVERSITY_THRESHOLDS.balancedRatio) {
    recommendations.push('Increase production practice - try writing or speaking exercises');
  }

  if (diversity.productionVariety < 3) {
    recommendations.push('Experiment with different collocations and usage patterns');
  }

  // Balance recommendations
  const diff = fluency.fluencyScore - diversity.diversityScore;
  if (diff > 0.3) {
    recommendations.push('Fluency is ahead - focus on expanding usage contexts');
  } else if (diff < -0.3) {
    recommendations.push('Diversity is ahead - focus on building speed and consistency');
  }

  if (recommendations.length === 0) {
    recommendations.push('Maintain current practice for retention');
    recommendations.push('Consider spacing out practice (well-established knowledge)');
  }

  return recommendations;
}

// =============================================================================
// Profile Creation
// =============================================================================

/**
 * Creates a complete fluency-diversity profile.
 *
 * @param state - Fluency-diversity state
 * @param totalReceptiveCount - Total receptive task count (for ratio calculation)
 * @returns Complete profile
 */
export function createFluencyDiversityProfile(
  state: FluencyDiversityState,
  totalReceptiveCount: number = 0
): FluencyDiversityProfile {
  const fluency = calculateFluencyMetrics(state.rtHistory);
  const diversity = calculateDiversityMetrics(
    state.contextUsages,
    state.productionSamples,
    totalReceptiveCount
  );

  const combinedScore = (fluency.fluencyScore + diversity.diversityScore) / 2;

  const estimatedStage = estimateStageFromFluencyDiversity(fluency, diversity);
  const recommendations = generateRecommendations(fluency, diversity);

  // Determine balance indicator
  const diff = fluency.fluencyScore - diversity.diversityScore;
  let balanceIndicator: FluencyDiversityProfile['balanceIndicator'];
  if (Math.abs(diff) < 0.2) {
    balanceIndicator = 'balanced';
  } else if (diff < 0) {
    balanceIndicator = 'needs_fluency';
  } else {
    balanceIndicator = 'needs_diversity';
  }

  // Calculate confidence based on data quantity
  const rtCount = state.rtHistory.length;
  const contextCount = state.contextUsages.size;
  let confidence = 0;
  if (rtCount >= 50 && contextCount >= 5) {
    confidence = 0.9;
  } else if (rtCount >= 20 && contextCount >= 3) {
    confidence = 0.7;
  } else if (rtCount >= 10) {
    confidence = 0.5;
  } else if (rtCount >= 5) {
    confidence = 0.3;
  }

  return {
    objectId: state.objectId,
    fluency,
    diversity,
    combinedScore,
    balanceIndicator,
    estimatedStage,
    recommendations,
    observationCount: rtCount,
    confidence,
    lastUpdated: Date.now(),
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Checks if fluency-diversity state needs refresh (cache expired).
 *
 * @param state - Current state
 * @returns Whether state needs refresh
 */
export function needsRefresh(state: FluencyDiversityState): boolean {
  return Date.now() > state.cacheValidUntil;
}

/**
 * Updates cached metrics with validity period.
 *
 * @param state - Current state
 * @param fluency - Calculated fluency metrics
 * @param diversity - Calculated diversity metrics
 * @param validityMs - Cache validity period in milliseconds (default 5 minutes)
 * @returns Updated state with cached metrics
 */
export function updateCache(
  state: FluencyDiversityState,
  fluency: FluencyMetrics,
  diversity: DiversityMetrics,
  validityMs: number = 300_000
): FluencyDiversityState {
  return {
    ...state,
    cachedFluency: fluency,
    cachedDiversity: diversity,
    cacheValidUntil: Date.now() + validityMs,
  };
}

/**
 * Serializes fluency-diversity state for storage.
 *
 * @param state - State to serialize
 * @returns JSON-compatible object
 */
export function serializeState(state: FluencyDiversityState): object {
  return {
    objectId: state.objectId,
    rtHistory: state.rtHistory,
    contextUsages: Array.from(state.contextUsages.entries()),
    productionSamples: state.productionSamples,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

/**
 * Validates an RT observation from deserialized data.
 */
function isValidRTObservation(item: unknown): item is RTObservation {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.responseTimeMs === 'number' &&
    Number.isFinite(obj.responseTimeMs) &&
    obj.responseTimeMs >= 0 &&
    typeof obj.isCorrect === 'boolean' &&
    typeof obj.timestamp === 'number' &&
    Number.isFinite(obj.timestamp) &&
    obj.timestamp >= 0
  );
}

/**
 * Validates a context usage from deserialized data.
 */
function isValidContextUsage(item: unknown): item is ContextUsage {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.contextId === 'string' &&
    typeof obj.successfulUses === 'number' &&
    Number.isFinite(obj.successfulUses) &&
    typeof obj.accuracy === 'number' &&
    Number.isFinite(obj.accuracy) &&
    typeof obj.averageRT === 'number' &&
    Number.isFinite(obj.averageRT) &&
    typeof obj.lastUsed === 'number' &&
    Number.isFinite(obj.lastUsed)
  );
}

/**
 * Validates a production sample from deserialized data.
 */
function isValidProductionSample(item: unknown): item is ProductionSample {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.output === 'string' &&
    obj.output.length <= MAX_OUTPUT_LENGTH &&
    typeof obj.contextId === 'string' &&
    typeof obj.qualityScore === 'number' &&
    Number.isFinite(obj.qualityScore) &&
    typeof obj.timestamp === 'number' &&
    Number.isFinite(obj.timestamp)
  );
}

/**
 * Deserializes fluency-diversity state from storage.
 * Includes validation to prevent malformed data injection.
 *
 * @param data - Serialized data (unknown type for safety)
 * @returns Fluency-diversity state
 * @throws TypeError if data is invalid
 */
export function deserializeState(data: unknown): FluencyDiversityState {
  // Type guard validation
  if (!data || typeof data !== 'object') {
    throw new TypeError('Invalid state data: expected object');
  }

  const obj = data as Record<string, unknown>;

  // Validate objectId
  if (typeof obj.objectId !== 'string' || !obj.objectId) {
    throw new TypeError('Invalid objectId: expected non-empty string');
  }

  // Validate timestamps
  if (typeof obj.createdAt !== 'number' || !Number.isFinite(obj.createdAt)) {
    throw new TypeError('Invalid createdAt: expected number');
  }
  if (typeof obj.updatedAt !== 'number' || !Number.isFinite(obj.updatedAt)) {
    throw new TypeError('Invalid updatedAt: expected number');
  }

  // Validate and sanitize rtHistory
  const rtHistory: RTObservation[] = [];
  if (Array.isArray(obj.rtHistory)) {
    for (const item of obj.rtHistory.slice(0, MAX_HISTORY_ENTRIES)) {
      if (isValidRTObservation(item)) {
        rtHistory.push(item);
      }
    }
  }

  // Validate contextUsages (prevent prototype pollution)
  const contextUsages = new Map<string, ContextUsage>();
  if (Array.isArray(obj.contextUsages)) {
    for (const entry of obj.contextUsages.slice(0, MAX_CONTEXTS)) {
      if (Array.isArray(entry) && entry.length === 2) {
        const [key, value] = entry;
        if (
          typeof key === 'string' &&
          !DANGEROUS_KEYS.includes(key) &&
          isValidContextUsage(value)
        ) {
          contextUsages.set(key, value);
        }
      }
    }
  }

  // Validate productionSamples
  const productionSamples: ProductionSample[] = [];
  if (Array.isArray(obj.productionSamples)) {
    for (const item of obj.productionSamples.slice(0, MAX_PRODUCTION_SAMPLES)) {
      if (isValidProductionSample(item)) {
        productionSamples.push(item);
      }
    }
  }

  return {
    objectId: obj.objectId,
    rtHistory,
    contextUsages,
    productionSamples,
    cachedFluency: null,
    cachedDiversity: null,
    cacheValidUntil: 0,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

/**
 * Merges two fluency-diversity states (e.g., from sync).
 * Includes validation to prevent malformed data injection.
 *
 * @param local - Local state
 * @param remote - Remote state
 * @returns Merged state
 * @throws Error if objectIds don't match
 */
export function mergeStates(
  local: FluencyDiversityState,
  remote: FluencyDiversityState
): FluencyDiversityState {
  // Validate objectId match
  if (local.objectId !== remote.objectId) {
    throw new Error('Cannot merge states with different objectIds');
  }

  // Calculate max valid timestamp (allow 1 minute clock drift)
  const maxValidTimestamp = Date.now() + MAX_CLOCK_DRIFT_MS;

  // Merge RT histories with validation (deduplicate by timestamp)
  const rtMap = new Map<number, RTObservation>();
  for (const obs of local.rtHistory) {
    if (isValidRTObservation(obs) && obs.timestamp <= maxValidTimestamp) {
      rtMap.set(obs.timestamp, obs);
    }
  }
  for (const obs of remote.rtHistory) {
    if (isValidRTObservation(obs) && obs.timestamp <= maxValidTimestamp) {
      rtMap.set(obs.timestamp, obs);
    }
  }
  const mergedRT = Array.from(rtMap.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_HISTORY_ENTRIES);

  // Merge context usages with validation (take most recent)
  const mergedContexts = new Map<string, ContextUsage>();
  for (const [key, value] of local.contextUsages) {
    if (!DANGEROUS_KEYS.includes(key) && isValidContextUsage(value)) {
      mergedContexts.set(key, value);
    }
  }
  for (const [key, value] of remote.contextUsages) {
    if (DANGEROUS_KEYS.includes(key) || !isValidContextUsage(value)) {
      continue;
    }
    const existing = mergedContexts.get(key);
    if (!existing || value.lastUsed > existing.lastUsed) {
      mergedContexts.set(key, value);
    }
  }

  // Merge production samples with validation (deduplicate by output+timestamp)
  const sampleMap = new Map<string, ProductionSample>();
  for (const sample of [...local.productionSamples, ...remote.productionSamples]) {
    if (isValidProductionSample(sample) && sample.timestamp <= maxValidTimestamp) {
      const key = `${sample.output}:${sample.timestamp}`;
      sampleMap.set(key, sample);
    }
  }
  const mergedSamples = Array.from(sampleMap.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_PRODUCTION_SAMPLES);

  return {
    objectId: local.objectId,
    rtHistory: mergedRT,
    contextUsages: mergedContexts,
    productionSamples: mergedSamples,
    cachedFluency: null,
    cachedDiversity: null,
    cacheValidUntil: 0,
    createdAt: Math.min(local.createdAt, remote.createdAt),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}
