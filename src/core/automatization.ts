/**
 * LOGOS Automatization Module
 *
 * Measures the degree of procedural skill acquisition for language objects.
 * Tracks the transition from declarative (effortful, explicit) knowledge to
 * procedural (automatic, implicit) knowledge.
 *
 * Theoretical Framework:
 * - Anderson's ACT-R: Declarative → Procedural → Automatized knowledge
 * - DeKeyser (2015): Skill Acquisition Theory for L2 learning
 * - Segalowitz (2010): Cognitive Bases of Second Language Fluency
 *
 * Key Constructs:
 * 1. Response Time Stability: Consistent RT indicates automatization
 * 2. Accuracy Under Speed Pressure: Maintaining accuracy when rushed
 * 3. Transfer Robustness: Performance maintained across varied contexts
 * 4. Interference Resistance: Performance despite distractors
 *
 * @module core/automatization
 */

import type { MasteryStage, FSRSRating } from './types';

// =============================================================================
// Constants for Memory Safety
// =============================================================================

/** Maximum number of response time entries to process */
const MAX_RESPONSE_ENTRIES = 10_000;

/** Maximum response time value (30 seconds) */
const MAX_RESPONSE_TIME_MS = 30_000;

/** Minimum response time threshold for valid responses (100ms) */
const MIN_RESPONSE_TIME_MS = 100;

/** Maximum objectId string length */
const MAX_OBJECT_ID_LENGTH = 256;

/** Maximum timestamp allowed (1 day in future from now) */
const MAX_TIMESTAMP_OFFSET_MS = 86_400_000;

// =============================================================================
// Types
// =============================================================================

/**
 * A single response observation for automatization tracking.
 */
export interface ResponseObservation {
  /** Response time in milliseconds */
  responseTimeMs: number;

  /** Whether the response was correct */
  isCorrect: boolean;

  /** Task type identifier */
  taskType: string;

  /** Cue level used (0 = no cue, 1-3 = increasing scaffolding) */
  cueLevel: 0 | 1 | 2 | 3;

  /** Unix timestamp of response */
  timestamp: number;

  /** Optional context identifier for transfer analysis */
  contextId?: string;

  /** Optional flag if there were distractors/interference */
  withInterference?: boolean;
}

/**
 * Power law parameters for modeling automatization.
 * RT = a * (Practice^-b) + c
 * Based on Newell & Rosenbloom (1981) power law of practice.
 */
export interface PowerLawModel {
  /** Initial processing time (asymptotic starting point) */
  a: number;

  /** Learning rate (higher = faster automatization) */
  b: number;

  /** Asymptotic floor (minimum achievable RT) */
  c: number;

  /** R² goodness of fit */
  rSquared: number;

  /** Number of observations used */
  nObservations: number;
}

/**
 * Coefficient of Variation analysis for RT stability.
 * CV = σ/μ - lower values indicate more stable (automatized) performance.
 */
export interface CVAnalysis {
  /** Coefficient of Variation (σ/μ) */
  cv: number;

  /** Mean response time */
  meanRT: number;

  /** Standard deviation */
  sdRT: number;

  /** Interpretation of CV value */
  interpretation: 'highly_automatic' | 'automatic' | 'developing' | 'effortful' | 'highly_variable';

  /** Percentile rank compared to expected values */
  percentile: number;
}

/**
 * Speed-Accuracy Tradeoff (SAT) analysis.
 */
export interface SpeedAccuracyAnalysis {
  /** Accuracy at fast responses */
  fastAccuracy: number;

  /** Accuracy at normal speed */
  normalAccuracy: number;

  /** Accuracy at slow responses */
  slowAccuracy: number;

  /** SAT coefficient (-1 to 1, positive = accuracy drops with speed) */
  satCoefficient: number;

  /** Whether performance is maintained under speed pressure */
  maintainsAccuracyUnderPressure: boolean;
}

/**
 * Transfer robustness metrics.
 */
export interface TransferAnalysis {
  /** Number of unique contexts encountered */
  uniqueContexts: number;

  /** Accuracy by context (context ID → accuracy) */
  contextAccuracy: Map<string, number>;

  /** Variance across contexts (lower = more robust transfer) */
  crossContextVariance: number;

  /** Whether transfer is robust */
  robustTransfer: boolean;
}

/**
 * Interference resistance analysis.
 */
export interface InterferenceAnalysis {
  /** Accuracy without interference */
  baselineAccuracy: number;

  /** Accuracy with interference */
  interferenceAccuracy: number;

  /** Interference cost (difference) */
  interferenceCost: number;

  /** Whether resistant to interference */
  resistantToInterference: boolean;
}

/**
 * Complete automatization profile for a language object.
 */
export interface AutomatizationProfile {
  /** Unique identifier */
  objectId: string;

  /** Current automatization level (0-1 scale) */
  automatizationLevel: number;

  /** Category of automatization */
  category: AutomatizationCategory;

  /** Estimated mastery stage based on automatization */
  estimatedStage: MasteryStage;

  /** Power law model fit */
  powerLaw: PowerLawModel | null;

  /** RT stability analysis */
  cvAnalysis: CVAnalysis;

  /** Speed-accuracy tradeoff */
  satAnalysis: SpeedAccuracyAnalysis | null;

  /** Transfer robustness (if multiple contexts) */
  transferAnalysis: TransferAnalysis | null;

  /** Interference resistance (if interference data available) */
  interferenceAnalysis: InterferenceAnalysis | null;

  /** Improvement trend (-1 to 1, positive = improving) */
  trend: number;

  /** Confidence in assessment (0-1) */
  confidence: number;

  /** Number of observations analyzed */
  nObservations: number;

  /** Timestamp of last update */
  lastUpdated: number;
}

/**
 * Automatization category based on DeKeyser's skill acquisition stages.
 */
export type AutomatizationCategory =
  | 'declarative'     // Explicit, slow, effortful retrieval
  | 'procedural'      // Rule-based, moderate effort
  | 'automatic'       // Fast, effortless, implicit
  | 'fully_automatic'; // Near-native speed, interference-resistant

// =============================================================================
// Thresholds and Reference Values
// =============================================================================

/**
 * CV thresholds for automatization interpretation.
 * Based on Segalowitz (2010) and lexical processing studies.
 */
export const CV_THRESHOLDS = {
  /** Highly automatic: CV < 0.15 */
  highlyAutomatic: 0.15,
  /** Automatic: CV < 0.25 */
  automatic: 0.25,
  /** Developing: CV < 0.40 */
  developing: 0.40,
  /** Effortful: CV < 0.60 */
  effortful: 0.60,
  // Above 0.60 = highly variable
} as const;

/**
 * Automatization level thresholds for category assignment.
 */
export const AUTOMATIZATION_THRESHOLDS = {
  /** Fully automatic: level >= 0.90 */
  fullyAutomatic: 0.90,
  /** Automatic: level >= 0.70 */
  automatic: 0.70,
  /** Procedural: level >= 0.40 */
  procedural: 0.40,
  // Below 0.40 = declarative
} as const;

/**
 * Response time thresholds for recognition tasks (ms).
 * Based on lexical decision task literature (Harrington, 2006).
 */
export const RT_THRESHOLDS = {
  /** Expert/native-like (< 600ms) */
  expert: 600,
  /** Automatic (< 1000ms) */
  automatic: 1000,
  /** Fluent (< 1500ms) */
  fluent: 1500,
  /** Effortful (< 3000ms) */
  effortful: 3000,
  // Above 3000ms = highly effortful/retrieval failure
} as const;

/**
 * Minimum observations required for reliable analysis.
 */
export const MIN_OBSERVATIONS = {
  /** Minimum for any analysis */
  basic: 5,
  /** Minimum for CV analysis */
  cv: 10,
  /** Minimum for power law fitting */
  powerLaw: 15,
  /** Minimum for SAT analysis */
  sat: 20,
} as const;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Validates a response observation.
 *
 * @param obs - Response observation to validate
 * @returns Whether the observation is valid
 */
export function isValidObservation(obs: ResponseObservation): boolean {
  if (!obs || typeof obs !== 'object') return false;

  // Validate responseTimeMs
  if (typeof obs.responseTimeMs !== 'number' || !Number.isFinite(obs.responseTimeMs)) return false;
  if (obs.responseTimeMs < MIN_RESPONSE_TIME_MS) return false;
  if (obs.responseTimeMs > MAX_RESPONSE_TIME_MS) return false;

  // Validate isCorrect
  if (typeof obs.isCorrect !== 'boolean') return false;

  // Validate taskType
  if (typeof obs.taskType !== 'string' || obs.taskType.length === 0) return false;

  // Validate cueLevel
  if (![0, 1, 2, 3].includes(obs.cueLevel)) return false;

  // Validate timestamp
  if (typeof obs.timestamp !== 'number' || !Number.isFinite(obs.timestamp)) return false;
  if (obs.timestamp < 0 || obs.timestamp > Date.now() + MAX_TIMESTAMP_OFFSET_MS) return false;

  return true;
}

/**
 * Calculates the Coefficient of Variation for response times.
 *
 * CV = σ/μ measures consistency of response times.
 * Lower CV indicates more automatized (consistent) performance.
 *
 * @param responseTimes - Array of response times in ms
 * @returns CV analysis result
 */
export function calculateCV(responseTimes: number[]): CVAnalysis {
  if (!Array.isArray(responseTimes) || responseTimes.length === 0) {
    return {
      cv: 1.0,
      meanRT: 0,
      sdRT: 0,
      interpretation: 'highly_variable',
      percentile: 0,
    };
  }

  // Memory safety: limit input size and ensure finite numbers
  const times = responseTimes.slice(0, MAX_RESPONSE_ENTRIES).filter(
    t => typeof t === 'number' && Number.isFinite(t) && t >= MIN_RESPONSE_TIME_MS && t <= MAX_RESPONSE_TIME_MS
  );

  if (times.length === 0) {
    return {
      cv: 1.0,
      meanRT: 0,
      sdRT: 0,
      interpretation: 'highly_variable',
      percentile: 0,
    };
  }

  const n = times.length;
  const mean = times.reduce((a, b) => a + b, 0) / n;
  const variance = times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const cv = mean > 0 ? sd / mean : 1.0;

  // Determine interpretation
  let interpretation: CVAnalysis['interpretation'];
  if (cv < CV_THRESHOLDS.highlyAutomatic) {
    interpretation = 'highly_automatic';
  } else if (cv < CV_THRESHOLDS.automatic) {
    interpretation = 'automatic';
  } else if (cv < CV_THRESHOLDS.developing) {
    interpretation = 'developing';
  } else if (cv < CV_THRESHOLDS.effortful) {
    interpretation = 'effortful';
  } else {
    interpretation = 'highly_variable';
  }

  // Calculate percentile (0-100, higher = better/lower CV)
  // Using approximate CDF for CV distribution
  const percentile = Math.max(0, Math.min(100, 100 * (1 - cv / 1.0)));

  return {
    cv,
    meanRT: mean,
    sdRT: sd,
    interpretation,
    percentile,
  };
}

/**
 * Fits a power law model to response time data.
 *
 * Models the "power law of practice" (Newell & Rosenbloom, 1981):
 * RT = a * (N^-b) + c
 *
 * Where:
 * - a = initial time parameter
 * - b = learning rate (typically 0.2-0.5)
 * - c = asymptotic floor
 *
 * @param observations - Chronologically ordered observations
 * @returns Power law model or null if insufficient data
 */
export function fitPowerLaw(observations: ResponseObservation[]): PowerLawModel | null {
  if (!Array.isArray(observations) || observations.length < MIN_OBSERVATIONS.powerLaw) {
    return null;
  }

  // Filter valid observations and limit size
  const valid = observations
    .slice(0, MAX_RESPONSE_ENTRIES)
    .filter(isValidObservation)
    .filter(o => o.isCorrect); // Only use correct responses for RT modeling

  if (valid.length < MIN_OBSERVATIONS.powerLaw) {
    return null;
  }

  // Sort by timestamp
  const sorted = [...valid].sort((a, b) => a.timestamp - b.timestamp);
  const n = sorted.length;

  // Use log-linear regression for power law fitting
  // log(RT - c) = log(a) - b * log(N)
  // Estimate c as 80% of minimum RT (asymptotic floor estimate)
  const minRT = Math.min(...sorted.map(o => o.responseTimeMs));
  const c = minRT * 0.8;

  // Build log-transformed data
  const logN: number[] = [];
  const logRT: number[] = [];

  for (let i = 0; i < n; i++) {
    const rt = sorted[i].responseTimeMs;
    if (rt > c) {
      logN.push(Math.log(i + 1));
      logRT.push(Math.log(rt - c));
    }
  }

  if (logN.length < MIN_OBSERVATIONS.basic) {
    return null;
  }

  // Simple linear regression on log-transformed data
  const nPoints = logN.length;
  const sumX = logN.reduce((a, b) => a + b, 0);
  const sumY = logRT.reduce((a, b) => a + b, 0);
  const sumXY = logN.reduce((sum, x, i) => sum + x * logRT[i], 0);
  const sumX2 = logN.reduce((sum, x) => sum + x * x, 0);

  const denom = nPoints * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) {
    return null;
  }

  const slope = (nPoints * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / nPoints;

  const b = -slope; // Learning rate
  const a = Math.exp(intercept);

  // Calculate R²
  const meanY = sumY / nPoints;
  const ssTotal = logRT.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
  const ssResidual = logRT.reduce((sum, y, i) => {
    const predicted = intercept + slope * logN[i];
    return sum + (y - predicted) ** 2;
  }, 0);
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  return {
    a,
    b: Math.max(0, b), // Learning rate should be positive
    c,
    rSquared: Math.max(0, Math.min(1, rSquared)),
    nObservations: n,
  };
}

/**
 * Analyzes speed-accuracy tradeoff.
 *
 * Examines whether accuracy is maintained when responses are fast.
 * True automatization shows high accuracy even at fast speeds.
 *
 * @param observations - Response observations
 * @returns SAT analysis or null if insufficient data
 */
export function analyzeSpeedAccuracy(observations: ResponseObservation[]): SpeedAccuracyAnalysis | null {
  if (!Array.isArray(observations) || observations.length < MIN_OBSERVATIONS.sat) {
    return null;
  }

  const valid = observations.slice(0, MAX_RESPONSE_ENTRIES).filter(isValidObservation);
  if (valid.length < MIN_OBSERVATIONS.sat) {
    return null;
  }

  // Sort by response time
  const sorted = [...valid].sort((a, b) => a.responseTimeMs - b.responseTimeMs);
  const n = sorted.length;

  // Divide into tertiles
  const tercile = Math.floor(n / 3);
  const fast = sorted.slice(0, tercile);
  const normal = sorted.slice(tercile, 2 * tercile);
  const slow = sorted.slice(2 * tercile);

  const calcAccuracy = (obs: ResponseObservation[]): number => {
    if (obs.length === 0) return 0;
    return obs.filter(o => o.isCorrect).length / obs.length;
  };

  const fastAccuracy = calcAccuracy(fast);
  const normalAccuracy = calcAccuracy(normal);
  const slowAccuracy = calcAccuracy(slow);

  // Calculate SAT coefficient
  // Positive = accuracy drops with speed (typical untrained pattern)
  // Near-zero or negative = accuracy maintained at speed (automatized)
  const satCoefficient = slowAccuracy - fastAccuracy;

  // Automatized performance: high accuracy even at fast speeds
  const maintainsAccuracyUnderPressure = fastAccuracy >= 0.7 && satCoefficient < 0.15;

  return {
    fastAccuracy,
    normalAccuracy,
    slowAccuracy,
    satCoefficient,
    maintainsAccuracyUnderPressure,
  };
}

/**
 * Analyzes transfer robustness across contexts.
 *
 * @param observations - Response observations with context IDs
 * @returns Transfer analysis or null if insufficient data
 */
export function analyzeTransfer(observations: ResponseObservation[]): TransferAnalysis | null {
  if (!Array.isArray(observations)) {
    return null;
  }

  const valid = observations.slice(0, MAX_RESPONSE_ENTRIES).filter(isValidObservation);
  const withContext = valid.filter(o => o.contextId);

  if (withContext.length < MIN_OBSERVATIONS.basic) {
    return null;
  }

  // Group by context
  const contextGroups = new Map<string, ResponseObservation[]>();
  for (const obs of withContext) {
    const ctx = obs.contextId!;
    if (!contextGroups.has(ctx)) {
      contextGroups.set(ctx, []);
    }
    contextGroups.get(ctx)!.push(obs);
  }

  if (contextGroups.size < 2) {
    return null; // Need at least 2 contexts for transfer analysis
  }

  // Calculate accuracy by context
  const contextAccuracy = new Map<string, number>();
  const accuracies: number[] = [];

  for (const [ctx, obs] of contextGroups) {
    const acc = obs.filter(o => o.isCorrect).length / obs.length;
    contextAccuracy.set(ctx, acc);
    accuracies.push(acc);
  }

  // Calculate variance across contexts
  const meanAcc = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, a) => sum + (a - meanAcc) ** 2, 0) / accuracies.length;

  // Robust transfer: low variance and high mean accuracy
  const robustTransfer = variance < 0.04 && meanAcc >= 0.7;

  return {
    uniqueContexts: contextGroups.size,
    contextAccuracy,
    crossContextVariance: variance,
    robustTransfer,
  };
}

/**
 * Analyzes resistance to interference.
 *
 * @param observations - Response observations with interference flags
 * @returns Interference analysis or null if insufficient data
 */
export function analyzeInterference(observations: ResponseObservation[]): InterferenceAnalysis | null {
  if (!Array.isArray(observations)) {
    return null;
  }

  const valid = observations.slice(0, MAX_RESPONSE_ENTRIES).filter(isValidObservation);

  const withInterference = valid.filter(o => o.withInterference === true);
  const withoutInterference = valid.filter(o => o.withInterference === false);

  if (withInterference.length < MIN_OBSERVATIONS.basic || withoutInterference.length < MIN_OBSERVATIONS.basic) {
    return null;
  }

  const baselineAccuracy = withoutInterference.filter(o => o.isCorrect).length / withoutInterference.length;
  const interferenceAccuracy = withInterference.filter(o => o.isCorrect).length / withInterference.length;
  const interferenceCost = baselineAccuracy - interferenceAccuracy;

  // Resistant to interference: small cost and high accuracy under interference
  const resistantToInterference = interferenceCost < 0.15 && interferenceAccuracy >= 0.7;

  return {
    baselineAccuracy,
    interferenceAccuracy,
    interferenceCost,
    resistantToInterference,
  };
}

/**
 * Calculates overall automatization level (0-1).
 *
 * Combines multiple indicators:
 * - CV stability (40% weight)
 * - Mean RT relative to thresholds (30% weight)
 * - Accuracy at fast speeds (20% weight)
 * - Cue-free performance (10% weight)
 *
 * @param observations - Response observations
 * @returns Automatization level (0-1)
 */
export function calculateAutomatizationLevel(observations: ResponseObservation[]): number {
  if (!Array.isArray(observations) || observations.length < MIN_OBSERVATIONS.basic) {
    return 0;
  }

  const valid = observations.slice(0, MAX_RESPONSE_ENTRIES).filter(isValidObservation);
  if (valid.length < MIN_OBSERVATIONS.basic) {
    return 0;
  }

  const correctObs = valid.filter(o => o.isCorrect);
  if (correctObs.length === 0) {
    return 0;
  }

  // 1. CV component (40%)
  const rts = correctObs.map(o => o.responseTimeMs);
  const cvAnalysis = calculateCV(rts);
  const cvScore = Math.max(0, 1 - cvAnalysis.cv / 0.8); // CV of 0.8 = 0 score

  // 2. Mean RT component (30%)
  const meanRT = cvAnalysis.meanRT;
  let rtScore: number;
  if (meanRT <= RT_THRESHOLDS.expert) {
    rtScore = 1.0;
  } else if (meanRT <= RT_THRESHOLDS.automatic) {
    rtScore = 0.8 + 0.2 * (RT_THRESHOLDS.automatic - meanRT) / (RT_THRESHOLDS.automatic - RT_THRESHOLDS.expert);
  } else if (meanRT <= RT_THRESHOLDS.fluent) {
    rtScore = 0.5 + 0.3 * (RT_THRESHOLDS.fluent - meanRT) / (RT_THRESHOLDS.fluent - RT_THRESHOLDS.automatic);
  } else if (meanRT <= RT_THRESHOLDS.effortful) {
    rtScore = 0.2 + 0.3 * (RT_THRESHOLDS.effortful - meanRT) / (RT_THRESHOLDS.effortful - RT_THRESHOLDS.fluent);
  } else {
    rtScore = Math.max(0, 0.2 * (MAX_RESPONSE_TIME_MS - meanRT) / (MAX_RESPONSE_TIME_MS - RT_THRESHOLDS.effortful));
  }

  // 3. Speed-accuracy component (20%)
  const sat = analyzeSpeedAccuracy(valid);
  let satScore = 0.5; // Default if insufficient data
  if (sat) {
    satScore = sat.maintainsAccuracyUnderPressure ? 1.0 : (sat.fastAccuracy * 0.8);
  }

  // 4. Cue-free performance (10%)
  const cueFreeObs = valid.filter(o => o.cueLevel === 0);
  let cueFreeScore = 0;
  if (cueFreeObs.length >= MIN_OBSERVATIONS.basic) {
    cueFreeScore = cueFreeObs.filter(o => o.isCorrect).length / cueFreeObs.length;
  }

  // Weighted combination
  const level = 0.40 * cvScore + 0.30 * rtScore + 0.20 * satScore + 0.10 * cueFreeScore;

  return Math.max(0, Math.min(1, level));
}

/**
 * Determines automatization category from level.
 *
 * @param level - Automatization level (0-1)
 * @returns Automatization category
 */
export function getAutomatizationCategory(level: number): AutomatizationCategory {
  if (level >= AUTOMATIZATION_THRESHOLDS.fullyAutomatic) {
    return 'fully_automatic';
  }
  if (level >= AUTOMATIZATION_THRESHOLDS.automatic) {
    return 'automatic';
  }
  if (level >= AUTOMATIZATION_THRESHOLDS.procedural) {
    return 'procedural';
  }
  return 'declarative';
}

/**
 * Estimates mastery stage from automatization profile.
 *
 * @param level - Automatization level (0-1)
 * @param accuracy - Overall accuracy
 * @returns Estimated mastery stage (0-4)
 */
export function estimateStageFromAutomatization(level: number, accuracy: number): MasteryStage {
  // Stage 4: Fully automatic, high accuracy
  if (level >= 0.85 && accuracy >= 0.90) {
    return 4;
  }
  // Stage 3: Automatic retrieval, good accuracy
  if (level >= 0.60 && accuracy >= 0.75) {
    return 3;
  }
  // Stage 2: Procedural knowledge, moderate accuracy
  if (level >= 0.30 && accuracy >= 0.60) {
    return 2;
  }
  // Stage 1: Early procedural
  if (accuracy >= 0.40) {
    return 1;
  }
  // Stage 0: Declarative/unknown
  return 0;
}

/**
 * Calculates improvement trend from recent vs older observations.
 *
 * @param observations - Chronologically ordered observations
 * @returns Trend value (-1 to 1, positive = improving)
 */
export function calculateTrend(observations: ResponseObservation[]): number {
  if (!Array.isArray(observations) || observations.length < MIN_OBSERVATIONS.cv) {
    return 0;
  }

  const valid = observations.slice(0, MAX_RESPONSE_ENTRIES).filter(isValidObservation);
  if (valid.length < MIN_OBSERVATIONS.cv) {
    return 0;
  }

  // Sort by timestamp
  const sorted = [...valid].sort((a, b) => a.timestamp - b.timestamp);
  const n = sorted.length;
  const half = Math.floor(n / 2);

  const older = sorted.slice(0, half);
  const newer = sorted.slice(half);

  // Compare automatization levels
  const olderLevel = calculateAutomatizationLevel(older);
  const newerLevel = calculateAutomatizationLevel(newer);

  // Normalize to -1 to 1 range
  return Math.max(-1, Math.min(1, newerLevel - olderLevel));
}

/**
 * Creates a complete automatization profile for a language object.
 *
 * @param objectId - Unique identifier for the language object
 * @param observations - All response observations for this object
 * @returns Complete automatization profile
 */
export function createAutomatizationProfile(
  objectId: string,
  observations: ResponseObservation[]
): AutomatizationProfile {
  if (!objectId || typeof objectId !== 'string') {
    throw new TypeError('objectId must be a non-empty string');
  }
  if (objectId.length > MAX_OBJECT_ID_LENGTH) {
    throw new RangeError(`objectId exceeds maximum length of ${MAX_OBJECT_ID_LENGTH}`);
  }

  const valid = (observations || []).slice(0, MAX_RESPONSE_ENTRIES).filter(isValidObservation);
  const correctObs = valid.filter(o => o.isCorrect);
  const rts = correctObs.map(o => o.responseTimeMs);

  // Calculate core metrics
  const automatizationLevel = calculateAutomatizationLevel(valid);
  const category = getAutomatizationCategory(automatizationLevel);
  const cvAnalysis = calculateCV(rts);
  const powerLaw = fitPowerLaw(valid);
  const satAnalysis = analyzeSpeedAccuracy(valid);
  const transferAnalysis = analyzeTransfer(valid);
  const interferenceAnalysis = analyzeInterference(valid);

  // Calculate accuracy
  const accuracy = valid.length > 0 ? correctObs.length / valid.length : 0;
  const estimatedStage = estimateStageFromAutomatization(automatizationLevel, accuracy);

  // Calculate trend
  const trend = calculateTrend(valid);

  // Calculate confidence based on data quantity and quality
  let confidence = 0;
  if (valid.length >= MIN_OBSERVATIONS.sat) {
    confidence = 0.9;
  } else if (valid.length >= MIN_OBSERVATIONS.powerLaw) {
    confidence = 0.7;
  } else if (valid.length >= MIN_OBSERVATIONS.cv) {
    confidence = 0.5;
  } else if (valid.length >= MIN_OBSERVATIONS.basic) {
    confidence = 0.3;
  }

  // Adjust confidence based on model fit
  if (powerLaw && powerLaw.rSquared > 0.7) {
    confidence = Math.min(1, confidence + 0.1);
  }

  return {
    objectId,
    automatizationLevel,
    category,
    estimatedStage,
    powerLaw,
    cvAnalysis,
    satAnalysis,
    transferAnalysis,
    interferenceAnalysis,
    trend,
    confidence,
    nObservations: valid.length,
    lastUpdated: Date.now(),
  };
}

/**
 * Suggests optimal practice conditions for improving automatization.
 *
 * @param profile - Current automatization profile
 * @returns Array of practice recommendations
 */
export function suggestPracticeConditions(profile: AutomatizationProfile): string[] {
  const suggestions: string[] = [];

  if (profile.category === 'declarative') {
    suggestions.push('Focus on accuracy before speed - use scaffolded practice');
    suggestions.push('Use spaced retrieval practice with increasing intervals');
    suggestions.push('Include explicit rule explanation and examples');
  }

  if (profile.category === 'procedural') {
    suggestions.push('Introduce timed practice to build speed');
    suggestions.push('Reduce scaffolding gradually');
    suggestions.push('Practice in varied contexts to build transfer');
  }

  if (profile.cvAnalysis.cv > CV_THRESHOLDS.developing) {
    suggestions.push('Practice for consistency - focus on steady performance');
    suggestions.push('Use massed practice sessions to build stability');
  }

  if (profile.satAnalysis && !profile.satAnalysis.maintainsAccuracyUnderPressure) {
    suggestions.push('Build speed gradually while maintaining accuracy');
    suggestions.push('Use speeded recognition tasks before production');
  }

  if (profile.transferAnalysis && !profile.transferAnalysis.robustTransfer) {
    suggestions.push('Practice in diverse contexts to improve transfer');
    suggestions.push('Interleave practice with related items');
  }

  if (profile.interferenceAnalysis && !profile.interferenceAnalysis.resistantToInterference) {
    suggestions.push('Practice with competing alternatives to build discrimination');
    suggestions.push('Focus on distinguishing confusable items');
  }

  if (profile.trend < 0) {
    suggestions.push('Review and consolidate before advancing');
    suggestions.push('Check for interference from newly learned items');
  }

  if (suggestions.length === 0) {
    suggestions.push('Maintain current practice for retention');
    suggestions.push('Consider reducing practice frequency (well automatized)');
  }

  return suggestions;
}

/**
 * Calculates recommended FSRS rating based on automatization profile.
 *
 * @param profile - Automatization profile
 * @param responseTimeMs - Current response time
 * @param isCorrect - Whether current response is correct
 * @returns Recommended FSRSRating (1-4)
 */
export function recommendRating(
  profile: AutomatizationProfile,
  responseTimeMs: number,
  isCorrect: boolean
): FSRSRating {
  if (!isCorrect) {
    return 1; // Again
  }

  const level = profile.automatizationLevel;
  const meanRT = profile.cvAnalysis.meanRT || RT_THRESHOLDS.fluent;

  // Compare current RT to personal mean
  const rtRatio = responseTimeMs / meanRT;

  // High automatization + fast response = Easy
  if (level >= 0.80 && rtRatio <= 0.8) {
    return 4; // Easy
  }

  // Good automatization + normal response = Good
  if (level >= 0.50 && rtRatio <= 1.2) {
    return 3; // Good
  }

  // Low automatization or slow response = Hard
  if (level < 0.30 || rtRatio > 1.5) {
    return 2; // Hard
  }

  return 3; // Good (default for middle range)
}

/**
 * Determines if an object is ready for reduced practice.
 *
 * @param profile - Automatization profile
 * @returns Whether the object can have reduced practice frequency
 */
export function isReadyForReducedPractice(profile: AutomatizationProfile): boolean {
  return (
    profile.category === 'fully_automatic' &&
    profile.estimatedStage >= 4 &&
    profile.confidence >= 0.7 &&
    profile.trend >= 0
  );
}

/**
 * Calculates the retrieval strength indicator.
 *
 * Based on the power law model, estimates current retrieval strength
 * which predicts how quickly/accurately the item can be retrieved.
 *
 * @param profile - Automatization profile
 * @returns Retrieval strength (0-1)
 */
export function calculateRetrievalStrength(profile: AutomatizationProfile): number {
  if (!profile.powerLaw || profile.powerLaw.rSquared < 0.5) {
    // Fall back to CV-based estimate
    return Math.max(0, 1 - profile.cvAnalysis.cv);
  }

  // Use power law to estimate current RT efficiency
  const { a, b, c } = profile.powerLaw;
  const n = profile.nObservations;

  // Predicted RT at current practice level
  const predictedRT = a * Math.pow(n, -b) + c;

  // Compare to thresholds
  const strength = Math.max(0, Math.min(1,
    (RT_THRESHOLDS.effortful - predictedRT) / (RT_THRESHOLDS.effortful - c)
  ));

  return strength;
}
