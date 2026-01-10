/**
 * Milestone Events System Module
 *
 * Detects and emits events when learners achieve significant milestones.
 * Enables celebration, notification, and adaptive curriculum responses.
 *
 * Purpose:
 * - Track achievement of learning milestones
 * - Emit events for UI celebration/notification
 * - Trigger curriculum adaptations
 * - Provide progress visualization data
 *
 * Milestone Types:
 * - Stage transitions (Stage 0→1→2→3→4)
 * - Accuracy thresholds (70%, 80%, 90%, 95%)
 * - Automatization achievement
 * - Vocabulary/grammar milestones
 * - Streak achievements
 * - Transfer effect triggers
 *
 * @module core/milestone-events
 */

import type { ComponentType, MasteryStage } from './types';

// =============================================================================
// Memory Safety Constants
// =============================================================================

/** Maximum milestone history entries */
const MAX_MILESTONE_HISTORY = 1000;

/** Maximum listeners per event type */
const MAX_LISTENERS_PER_EVENT = 20;

/** Maximum event emissions per session */
const MAX_EMISSIONS_PER_SESSION = 500;

/** Minimum time between duplicate events (ms) */
const DUPLICATE_COOLDOWN_MS = 60_000; // 1 minute

// =============================================================================
// Types
// =============================================================================

/**
 * Types of milestones that can be achieved.
 */
export type MilestoneType =
  | 'stage_transition'        // Moved to a new mastery stage
  | 'accuracy_threshold'      // Reached accuracy threshold (70/80/90/95%)
  | 'automatization'          // Achieved automatic processing
  | 'vocabulary_count'        // Reached vocabulary milestone (100, 500, 1000, etc.)
  | 'grammar_count'           // Learned N grammar structures
  | 'streak'                  // Achieved N-day streak
  | 'perfect_session'         // 100% accuracy in session
  | 'first_mastery'           // First item reached Stage 4
  | 'component_mastery'       // Mastered items in a component
  | 'transfer_chain'          // Transfer effect chain completed
  | 'review_milestone'        // Completed N reviews
  | 'time_milestone'          // Studied for N hours/days
  | 'level_up'                // Overall level increased (CEFR progression)
  | 'domain_expertise'        // Expertise in specific domain
  | 'consistency';            // Consistent daily practice

/**
 * Priority levels for milestone notifications.
 */
export type MilestonePriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Milestone achievement event.
 */
export interface MilestoneEvent {
  /** Unique event ID */
  id: string;

  /** Type of milestone */
  type: MilestoneType;

  /** Specific milestone identifier */
  milestoneId: string;

  /** User ID */
  userId: string;

  /** Timestamp of achievement */
  timestamp: number;

  /** Priority for UI display */
  priority: MilestonePriority;

  /** Human-readable title */
  title: string;

  /** Detailed description */
  description: string;

  /** Optional celebration message */
  celebrationMessage?: string;

  /** Related data */
  data: MilestoneData;

  /** Whether event was acknowledged */
  acknowledged: boolean;

  /** Optional image/icon identifier */
  iconId?: string;

  /** Points/XP awarded */
  pointsAwarded: number;
}

/**
 * Data associated with a milestone.
 */
export interface MilestoneData {
  /** Component (if applicable) */
  component?: ComponentType;

  /** Stage (if applicable) */
  stage?: MasteryStage;

  /** Previous stage (for transitions) */
  previousStage?: MasteryStage;

  /** Count value (vocabulary, grammar, etc.) */
  count?: number;

  /** Threshold value (accuracy, etc.) */
  threshold?: number;

  /** Streak length */
  streakDays?: number;

  /** Object IDs involved */
  objectIds?: string[];

  /** Related domain */
  domain?: string;

  /** Time value (minutes) */
  timeMinutes?: number;

  /** Session ID (if session-based) */
  sessionId?: string;
}

/**
 * Milestone definition for detection.
 */
export interface MilestoneDefinition {
  /** Unique milestone identifier */
  id: string;

  /** Type of milestone */
  type: MilestoneType;

  /** Priority level */
  priority: MilestonePriority;

  /** Title template (supports {value} placeholders) */
  titleTemplate: string;

  /** Description template */
  descriptionTemplate: string;

  /** Celebration message template */
  celebrationTemplate?: string;

  /** Points awarded for this milestone */
  points: number;

  /** Icon identifier */
  iconId: string;

  /** Detection function */
  detector: MilestoneDetector;

  /** Whether milestone can repeat */
  repeatable: boolean;

  /** Cooldown between repeats (ms) */
  repeatCooldownMs?: number;
}

/**
 * Milestone detector function signature.
 */
export type MilestoneDetector = (
  state: LearnerProgressState,
  previousState: LearnerProgressState | null
) => MilestoneDetectionResult | null;

/**
 * Result of milestone detection.
 */
export interface MilestoneDetectionResult {
  /** Milestone was achieved */
  achieved: boolean;

  /** Data to include in event */
  data: MilestoneData;

  /** Custom title override */
  customTitle?: string;

  /** Custom description override */
  customDescription?: string;
}

/**
 * Learner progress state for milestone detection.
 */
export interface LearnerProgressState {
  /** User ID */
  userId: string;

  /** Timestamp of state */
  timestamp: number;

  /** Objects by stage */
  objectsByStage: Record<MasteryStage, string[]>;

  /** Objects by component */
  objectsByComponent: Record<string, string[]>;

  /** Overall accuracy (0-1) */
  overallAccuracy: number;

  /** Component-wise accuracy */
  componentAccuracy: Record<string, number>;

  /** Current streak (days) */
  currentStreakDays: number;

  /** Total study time (minutes) */
  totalStudyTimeMinutes: number;

  /** Session count */
  sessionCount: number;

  /** Total reviews completed */
  totalReviews: number;

  /** Automatic objects (by component) */
  automaticObjects: Record<string, string[]>;

  /** Estimated CEFR level */
  estimatedLevel: string;

  /** Domain expertise levels */
  domainExpertise: Record<string, number>;

  /** Perfect sessions count */
  perfectSessions: number;

  /** Transfer chains completed */
  transferChainsCompleted: number;
}

/**
 * Milestone listener callback.
 */
export type MilestoneListener = (event: MilestoneEvent) => void;

/**
 * Milestone registry configuration.
 */
export interface MilestoneRegistryConfig {
  /** Maximum history entries */
  maxHistory: number;

  /** Whether to deduplicate events */
  deduplicateEvents: boolean;

  /** Cooldown for duplicates (ms) */
  duplicateCooldownMs: number;

  /** Auto-acknowledge low priority events */
  autoAcknowledgeLowPriority: boolean;
}

/**
 * Milestone emission statistics.
 */
export interface MilestoneStats {
  /** Total milestones achieved */
  totalAchieved: number;

  /** Milestones by type */
  byType: Record<MilestoneType, number>;

  /** Milestones by priority */
  byPriority: Record<MilestonePriority, number>;

  /** Total points earned */
  totalPoints: number;

  /** Achievements in current session */
  sessionAchievements: number;

  /** Last milestone timestamp */
  lastMilestoneTimestamp: number | null;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default milestone registry configuration.
 */
export const DEFAULT_MILESTONE_CONFIG: MilestoneRegistryConfig = {
  maxHistory: MAX_MILESTONE_HISTORY,
  deduplicateEvents: true,
  duplicateCooldownMs: DUPLICATE_COOLDOWN_MS,
  autoAcknowledgeLowPriority: true,
};

// =============================================================================
// Built-in Milestone Definitions
// =============================================================================

/**
 * Stage transition milestones.
 */
export const STAGE_TRANSITION_MILESTONES: MilestoneDefinition[] = [
  {
    id: 'stage_0_to_1',
    type: 'stage_transition',
    priority: 'medium',
    titleTemplate: 'First Recognition!',
    descriptionTemplate: 'You can now recognize "{objectId}"',
    celebrationTemplate: '🎯 Great start!',
    points: 10,
    iconId: 'stage_1',
    repeatable: true,
    detector: (state, prev) => {
      if (!prev) return null;
      const newStage1 = state.objectsByStage[1].filter(
        id => !prev.objectsByStage[1].includes(id) && prev.objectsByStage[0].includes(id)
      );
      if (newStage1.length > 0) {
        return {
          achieved: true,
          data: {
            stage: 1,
            previousStage: 0,
            objectIds: newStage1.slice(0, 5),
            count: newStage1.length,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'stage_1_to_2',
    type: 'stage_transition',
    priority: 'medium',
    titleTemplate: 'Building Recall!',
    descriptionTemplate: '{count} item(s) moved to active recall',
    celebrationTemplate: '💪 Keep it up!',
    points: 20,
    iconId: 'stage_2',
    repeatable: true,
    detector: (state, prev) => {
      if (!prev) return null;
      const newStage2 = state.objectsByStage[2].filter(
        id => !prev.objectsByStage[2].includes(id) && prev.objectsByStage[1].includes(id)
      );
      if (newStage2.length > 0) {
        return {
          achieved: true,
          data: {
            stage: 2,
            previousStage: 1,
            objectIds: newStage2.slice(0, 5),
            count: newStage2.length,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'stage_2_to_3',
    type: 'stage_transition',
    priority: 'high',
    titleTemplate: 'Fluent Recall!',
    descriptionTemplate: '{count} item(s) now recalled fluently',
    celebrationTemplate: '🚀 Amazing progress!',
    points: 30,
    iconId: 'stage_3',
    repeatable: true,
    detector: (state, prev) => {
      if (!prev) return null;
      const newStage3 = state.objectsByStage[3].filter(
        id => !prev.objectsByStage[3].includes(id) && prev.objectsByStage[2].includes(id)
      );
      if (newStage3.length > 0) {
        return {
          achieved: true,
          data: {
            stage: 3,
            previousStage: 2,
            objectIds: newStage3.slice(0, 5),
            count: newStage3.length,
          },
        };
      }
      return null;
    },
  },
  {
    id: 'stage_3_to_4',
    type: 'stage_transition',
    priority: 'critical',
    titleTemplate: 'Mastery Achieved!',
    descriptionTemplate: '{count} item(s) fully mastered!',
    celebrationTemplate: '🏆 You\'ve mastered this!',
    points: 50,
    iconId: 'stage_4',
    repeatable: true,
    detector: (state, prev) => {
      if (!prev) return null;
      const newStage4 = state.objectsByStage[4].filter(
        id => !prev.objectsByStage[4].includes(id) && prev.objectsByStage[3].includes(id)
      );
      if (newStage4.length > 0) {
        return {
          achieved: true,
          data: {
            stage: 4,
            previousStage: 3,
            objectIds: newStage4.slice(0, 5),
            count: newStage4.length,
          },
        };
      }
      return null;
    },
  },
];

/**
 * Accuracy threshold milestones.
 */
export const ACCURACY_MILESTONES: MilestoneDefinition[] = [
  {
    id: 'accuracy_70',
    type: 'accuracy_threshold',
    priority: 'low',
    titleTemplate: '70% Accuracy Reached',
    descriptionTemplate: 'Your overall accuracy is now 70%',
    points: 25,
    iconId: 'accuracy_bronze',
    repeatable: false,
    detector: (state, prev) => {
      if (!prev) return null;
      if (state.overallAccuracy >= 0.7 && prev.overallAccuracy < 0.7) {
        return {
          achieved: true,
          data: { threshold: 0.7 },
        };
      }
      return null;
    },
  },
  {
    id: 'accuracy_80',
    type: 'accuracy_threshold',
    priority: 'medium',
    titleTemplate: '80% Accuracy!',
    descriptionTemplate: 'Excellent! Your accuracy has reached 80%',
    celebrationTemplate: '✨ Great precision!',
    points: 50,
    iconId: 'accuracy_silver',
    repeatable: false,
    detector: (state, prev) => {
      if (!prev) return null;
      if (state.overallAccuracy >= 0.8 && prev.overallAccuracy < 0.8) {
        return {
          achieved: true,
          data: { threshold: 0.8 },
        };
      }
      return null;
    },
  },
  {
    id: 'accuracy_90',
    type: 'accuracy_threshold',
    priority: 'high',
    titleTemplate: '90% Accuracy!',
    descriptionTemplate: 'Outstanding! 90% accuracy achieved',
    celebrationTemplate: '🌟 Near perfect!',
    points: 100,
    iconId: 'accuracy_gold',
    repeatable: false,
    detector: (state, prev) => {
      if (!prev) return null;
      if (state.overallAccuracy >= 0.9 && prev.overallAccuracy < 0.9) {
        return {
          achieved: true,
          data: { threshold: 0.9 },
        };
      }
      return null;
    },
  },
  {
    id: 'accuracy_95',
    type: 'accuracy_threshold',
    priority: 'critical',
    titleTemplate: '95% Accuracy!',
    descriptionTemplate: 'Incredible! 95% accuracy - you\'re a master!',
    celebrationTemplate: '🏅 Exceptional mastery!',
    points: 200,
    iconId: 'accuracy_platinum',
    repeatable: false,
    detector: (state, prev) => {
      if (!prev) return null;
      if (state.overallAccuracy >= 0.95 && prev.overallAccuracy < 0.95) {
        return {
          achieved: true,
          data: { threshold: 0.95 },
        };
      }
      return null;
    },
  },
];

/**
 * Vocabulary count milestones.
 */
export const VOCABULARY_MILESTONES: MilestoneDefinition[] = [
  {
    id: 'vocab_100',
    type: 'vocabulary_count',
    priority: 'medium',
    titleTemplate: '100 Words Learned!',
    descriptionTemplate: 'You\'ve learned 100 vocabulary items',
    celebrationTemplate: '📚 Growing vocabulary!',
    points: 100,
    iconId: 'vocab_100',
    repeatable: false,
    detector: createVocabMilestoneDetector(100),
  },
  {
    id: 'vocab_500',
    type: 'vocabulary_count',
    priority: 'high',
    titleTemplate: '500 Words Learned!',
    descriptionTemplate: 'Your vocabulary has reached 500 words',
    celebrationTemplate: '📖 Impressive vocabulary!',
    points: 300,
    iconId: 'vocab_500',
    repeatable: false,
    detector: createVocabMilestoneDetector(500),
  },
  {
    id: 'vocab_1000',
    type: 'vocabulary_count',
    priority: 'critical',
    titleTemplate: '1000 Words!',
    descriptionTemplate: 'Incredible! 1000 vocabulary items mastered',
    celebrationTemplate: '🎓 Vocabulary champion!',
    points: 500,
    iconId: 'vocab_1000',
    repeatable: false,
    detector: createVocabMilestoneDetector(1000),
  },
  {
    id: 'vocab_2000',
    type: 'vocabulary_count',
    priority: 'critical',
    titleTemplate: '2000 Words!',
    descriptionTemplate: 'Amazing! 2000 words in your vocabulary',
    celebrationTemplate: '👑 Vocabulary master!',
    points: 1000,
    iconId: 'vocab_2000',
    repeatable: false,
    detector: createVocabMilestoneDetector(2000),
  },
];

/**
 * Streak milestones.
 */
export const STREAK_MILESTONES: MilestoneDefinition[] = [
  {
    id: 'streak_7',
    type: 'streak',
    priority: 'medium',
    titleTemplate: '7-Day Streak!',
    descriptionTemplate: 'You\'ve practiced for 7 days in a row',
    celebrationTemplate: '🔥 One week strong!',
    points: 70,
    iconId: 'streak_7',
    repeatable: false,
    detector: createStreakMilestoneDetector(7),
  },
  {
    id: 'streak_30',
    type: 'streak',
    priority: 'high',
    titleTemplate: '30-Day Streak!',
    descriptionTemplate: 'One month of consistent practice!',
    celebrationTemplate: '⚡ Unstoppable!',
    points: 300,
    iconId: 'streak_30',
    repeatable: false,
    detector: createStreakMilestoneDetector(30),
  },
  {
    id: 'streak_100',
    type: 'streak',
    priority: 'critical',
    titleTemplate: '100-Day Streak!',
    descriptionTemplate: '100 days of dedication!',
    celebrationTemplate: '💎 Legendary commitment!',
    points: 1000,
    iconId: 'streak_100',
    repeatable: false,
    detector: createStreakMilestoneDetector(100),
  },
  {
    id: 'streak_365',
    type: 'streak',
    priority: 'critical',
    titleTemplate: '365-Day Streak!',
    descriptionTemplate: 'A full year of daily practice!',
    celebrationTemplate: '🌟 Absolutely incredible!',
    points: 5000,
    iconId: 'streak_365',
    repeatable: false,
    detector: createStreakMilestoneDetector(365),
  },
];

/**
 * First mastery milestone.
 */
export const FIRST_MASTERY_MILESTONE: MilestoneDefinition = {
  id: 'first_mastery',
  type: 'first_mastery',
  priority: 'critical',
  titleTemplate: 'First Mastery!',
  descriptionTemplate: 'You\'ve fully mastered your first item!',
  celebrationTemplate: '🎉 This is just the beginning!',
  points: 100,
  iconId: 'first_mastery',
  repeatable: false,
  detector: (state, prev) => {
    if (!prev) return null;
    const prevMastered = prev.objectsByStage[4].length;
    const currMastered = state.objectsByStage[4].length;
    if (prevMastered === 0 && currMastered > 0) {
      return {
        achieved: true,
        data: {
          stage: 4,
          objectIds: state.objectsByStage[4].slice(0, 1),
        },
      };
    }
    return null;
  },
};

/**
 * Perfect session milestone.
 */
export const PERFECT_SESSION_MILESTONE: MilestoneDefinition = {
  id: 'perfect_session',
  type: 'perfect_session',
  priority: 'high',
  titleTemplate: 'Perfect Session!',
  descriptionTemplate: '100% accuracy in this session',
  celebrationTemplate: '⭐ Flawless!',
  points: 50,
  iconId: 'perfect_session',
  repeatable: true,
  repeatCooldownMs: 3600_000, // 1 hour
  detector: (state, prev) => {
    if (!prev) return null;
    if (state.perfectSessions > prev.perfectSessions) {
      return {
        achieved: true,
        data: {
          count: state.perfectSessions,
        },
      };
    }
    return null;
  },
};

/**
 * All default milestone definitions.
 */
export const DEFAULT_MILESTONES: MilestoneDefinition[] = [
  ...STAGE_TRANSITION_MILESTONES,
  ...ACCURACY_MILESTONES,
  ...VOCABULARY_MILESTONES,
  ...STREAK_MILESTONES,
  FIRST_MASTERY_MILESTONE,
  PERFECT_SESSION_MILESTONE,
];

// =============================================================================
// Helper Functions for Milestone Detection
// =============================================================================

/**
 * Creates a vocabulary milestone detector.
 */
function createVocabMilestoneDetector(threshold: number): MilestoneDetector {
  return (state, prev) => {
    if (!prev) return null;
    // Count LEX objects at Stage 2 or higher
    const lexObjects = state.objectsByComponent['LEX'] || state.objectsByComponent['lexical'] || [];
    const prevLexObjects = prev.objectsByComponent['LEX'] || prev.objectsByComponent['lexical'] || [];

    // Count mastered vocabulary (Stage >= 2)
    const countMastered = (objects: string[], stageMap: Record<MasteryStage, string[]>) => {
      let count = 0;
      for (let stage = 2 as MasteryStage; stage <= 4; stage++) {
        count += stageMap[stage].filter(id => objects.includes(id)).length;
      }
      return count;
    };

    const prevCount = countMastered(prevLexObjects, prev.objectsByStage);
    const currCount = countMastered(lexObjects, state.objectsByStage);

    if (prevCount < threshold && currCount >= threshold) {
      return {
        achieved: true,
        data: { count: threshold, component: 'LEX' },
      };
    }
    return null;
  };
}

/**
 * Creates a streak milestone detector.
 */
function createStreakMilestoneDetector(days: number): MilestoneDetector {
  return (state, prev) => {
    if (!prev) return null;
    if (prev.currentStreakDays < days && state.currentStreakDays >= days) {
      return {
        achieved: true,
        data: { streakDays: days },
      };
    }
    return null;
  };
}

// =============================================================================
// Milestone Registry Class
// =============================================================================

/**
 * Registry for managing milestone detection and events.
 */
export class MilestoneRegistry {
  private definitions: Map<string, MilestoneDefinition> = new Map();
  private history: MilestoneEvent[] = [];
  private listeners: Map<MilestoneType | 'all', MilestoneListener[]> = new Map();
  private lastEmissionByMilestone: Map<string, number> = new Map();
  private achievedNonRepeatables: Set<string> = new Set();
  private sessionEmissions: number = 0;
  private config: MilestoneRegistryConfig;

  constructor(config: Partial<MilestoneRegistryConfig> = {}) {
    this.config = { ...DEFAULT_MILESTONE_CONFIG, ...config };

    // Register default milestones
    for (const def of DEFAULT_MILESTONES) {
      this.registerMilestone(def);
    }
  }

  /**
   * Registers a milestone definition.
   */
  registerMilestone(definition: MilestoneDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  /**
   * Unregisters a milestone definition.
   */
  unregisterMilestone(id: string): boolean {
    return this.definitions.delete(id);
  }

  /**
   * Adds a listener for milestone events.
   */
  addListener(type: MilestoneType | 'all', listener: MilestoneListener): void {
    const existing = this.listeners.get(type) || [];
    if (existing.length >= MAX_LISTENERS_PER_EVENT) {
      throw new Error(`Maximum listeners (${MAX_LISTENERS_PER_EVENT}) reached for type: ${type}`);
    }
    this.listeners.set(type, [...existing, listener]);
  }

  /**
   * Removes a listener.
   */
  removeListener(type: MilestoneType | 'all', listener: MilestoneListener): boolean {
    const existing = this.listeners.get(type);
    if (!existing) return false;

    const index = existing.indexOf(listener);
    if (index === -1) return false;

    existing.splice(index, 1);
    return true;
  }

  /**
   * Checks progress and emits any achieved milestone events.
   */
  checkProgress(
    currentState: LearnerProgressState,
    previousState: LearnerProgressState | null
  ): MilestoneEvent[] {
    const events: MilestoneEvent[] = [];
    const now = Date.now();

    if (this.sessionEmissions >= MAX_EMISSIONS_PER_SESSION) {
      return events;
    }

    for (const [id, definition] of this.definitions) {
      // Skip non-repeatable milestones that are already achieved
      if (!definition.repeatable && this.achievedNonRepeatables.has(id)) {
        continue;
      }

      // Check cooldown for repeatable milestones
      if (definition.repeatable) {
        const lastEmission = this.lastEmissionByMilestone.get(id);
        const cooldown = definition.repeatCooldownMs || this.config.duplicateCooldownMs;
        if (lastEmission && now - lastEmission < cooldown) {
          continue;
        }
      }

      // Run detector
      const result = definition.detector(currentState, previousState);
      if (result && result.achieved) {
        const event = this.createEvent(definition, result, currentState.userId, now);
        events.push(event);

        // Track emissions
        this.lastEmissionByMilestone.set(id, now);
        if (!definition.repeatable) {
          this.achievedNonRepeatables.add(id);
        }
        this.sessionEmissions++;

        // Emit to listeners
        this.emitEvent(event);

        // Add to history
        this.addToHistory(event);

        if (this.sessionEmissions >= MAX_EMISSIONS_PER_SESSION) {
          break;
        }
      }
    }

    return events;
  }

  /**
   * Creates a milestone event from definition and detection result.
   */
  private createEvent(
    definition: MilestoneDefinition,
    result: MilestoneDetectionResult,
    userId: string,
    timestamp: number
  ): MilestoneEvent {
    const title = result.customTitle || this.interpolateTemplate(definition.titleTemplate, result.data);
    const description = result.customDescription || this.interpolateTemplate(definition.descriptionTemplate, result.data);
    const celebration = definition.celebrationTemplate
      ? this.interpolateTemplate(definition.celebrationTemplate, result.data)
      : undefined;

    return {
      id: `${definition.id}_${timestamp}`,
      type: definition.type,
      milestoneId: definition.id,
      userId,
      timestamp,
      priority: definition.priority,
      title,
      description,
      celebrationMessage: celebration,
      data: result.data,
      acknowledged: this.config.autoAcknowledgeLowPriority && definition.priority === 'low',
      iconId: definition.iconId,
      pointsAwarded: definition.points,
    };
  }

  /**
   * Interpolates template strings with data.
   */
  private interpolateTemplate(template: string, data: MilestoneData): string {
    let result = template;

    if (data.count !== undefined) {
      result = result.replace('{count}', String(data.count));
    }
    if (data.threshold !== undefined) {
      result = result.replace('{threshold}', `${Math.round(data.threshold * 100)}%`);
    }
    if (data.streakDays !== undefined) {
      result = result.replace('{streakDays}', String(data.streakDays));
    }
    if (data.stage !== undefined) {
      result = result.replace('{stage}', String(data.stage));
    }
    if (data.objectIds && data.objectIds.length > 0) {
      result = result.replace('{objectId}', data.objectIds[0]);
    }
    if (data.domain) {
      result = result.replace('{domain}', data.domain);
    }
    if (data.timeMinutes !== undefined) {
      result = result.replace('{timeMinutes}', String(data.timeMinutes));
    }

    return result;
  }

  /**
   * Emits event to listeners.
   */
  private emitEvent(event: MilestoneEvent): void {
    // Emit to type-specific listeners
    const typeListeners = this.listeners.get(event.type) || [];
    for (const listener of typeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Milestone listener error for ${event.type}:`, error);
      }
    }

    // Emit to 'all' listeners
    const allListeners = this.listeners.get('all') || [];
    for (const listener of allListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Milestone listener error for all:', error);
      }
    }
  }

  /**
   * Adds event to history.
   */
  private addToHistory(event: MilestoneEvent): void {
    this.history.push(event);

    // Trim history if needed
    if (this.history.length > this.config.maxHistory) {
      this.history = this.history.slice(-this.config.maxHistory);
    }
  }

  /**
   * Gets milestone history.
   */
  getHistory(limit?: number): MilestoneEvent[] {
    const count = Math.min(limit || this.history.length, this.history.length);
    return this.history.slice(-count);
  }

  /**
   * Gets unacknowledged milestones.
   */
  getUnacknowledged(): MilestoneEvent[] {
    return this.history.filter(e => !e.acknowledged);
  }

  /**
   * Acknowledges a milestone event.
   */
  acknowledge(eventId: string): boolean {
    const event = this.history.find(e => e.id === eventId);
    if (event) {
      event.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Acknowledges all unacknowledged events.
   */
  acknowledgeAll(): number {
    let count = 0;
    for (const event of this.history) {
      if (!event.acknowledged) {
        event.acknowledged = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Gets statistics about achieved milestones.
   */
  getStats(): MilestoneStats {
    const byType: Record<MilestoneType, number> = {} as Record<MilestoneType, number>;
    const byPriority: Record<MilestonePriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    let totalPoints = 0;

    for (const event of this.history) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      byPriority[event.priority]++;
      totalPoints += event.pointsAwarded;
    }

    return {
      totalAchieved: this.history.length,
      byType,
      byPriority,
      totalPoints,
      sessionAchievements: this.sessionEmissions,
      lastMilestoneTimestamp: this.history.length > 0
        ? this.history[this.history.length - 1].timestamp
        : null,
    };
  }

  /**
   * Resets session emission counter.
   */
  resetSessionCounter(): void {
    this.sessionEmissions = 0;
  }

  /**
   * Clears all history and state.
   */
  clear(): void {
    this.history = [];
    this.lastEmissionByMilestone.clear();
    this.achievedNonRepeatables.clear();
    this.sessionEmissions = 0;
  }

  /**
   * Serializes registry state for persistence.
   */
  serialize(): string {
    return JSON.stringify({
      history: this.history,
      achievedNonRepeatables: Array.from(this.achievedNonRepeatables),
      lastEmissionByMilestone: Object.fromEntries(this.lastEmissionByMilestone),
    });
  }

  /**
   * Deserializes registry state.
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);

      // Validate structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid serialized data');
      }

      // Restore history with validation
      if (Array.isArray(parsed.history)) {
        this.history = parsed.history
          .filter((e: unknown) => this.isValidEvent(e))
          .slice(-this.config.maxHistory);
      }

      // Restore achieved set
      if (Array.isArray(parsed.achievedNonRepeatables)) {
        this.achievedNonRepeatables = new Set(
          parsed.achievedNonRepeatables.filter((id: unknown) => typeof id === 'string')
        );
      }

      // Restore last emission map
      if (parsed.lastEmissionByMilestone && typeof parsed.lastEmissionByMilestone === 'object') {
        this.lastEmissionByMilestone = new Map(
          Object.entries(parsed.lastEmissionByMilestone)
            .filter(([k, v]) => typeof k === 'string' && typeof v === 'number')
            .map(([k, v]) => [k, v as number])
        );
      }
    } catch (error) {
      console.error('Failed to deserialize milestone registry:', error);
      this.clear();
    }
  }

  /**
   * Validates a milestone event structure.
   */
  private isValidEvent(e: unknown): e is MilestoneEvent {
    if (!e || typeof e !== 'object') return false;
    const event = e as Record<string, unknown>;

    return (
      typeof event.id === 'string' &&
      typeof event.type === 'string' &&
      typeof event.milestoneId === 'string' &&
      typeof event.userId === 'string' &&
      typeof event.timestamp === 'number' &&
      typeof event.priority === 'string' &&
      typeof event.title === 'string' &&
      typeof event.description === 'string' &&
      typeof event.acknowledged === 'boolean' &&
      typeof event.pointsAwarded === 'number'
    );
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Creates an empty learner progress state.
 */
export function createEmptyProgressState(userId: string): LearnerProgressState {
  return {
    userId,
    timestamp: Date.now(),
    objectsByStage: { 0: [], 1: [], 2: [], 3: [], 4: [] },
    objectsByComponent: {},
    overallAccuracy: 0,
    componentAccuracy: {},
    currentStreakDays: 0,
    totalStudyTimeMinutes: 0,
    sessionCount: 0,
    totalReviews: 0,
    automaticObjects: {},
    estimatedLevel: 'A1',
    domainExpertise: {},
    perfectSessions: 0,
    transferChainsCompleted: 0,
  };
}

/**
 * Gets milestone priority display order (higher = more important).
 */
export function getMilestonePriorityOrder(priority: MilestonePriority): number {
  const order: Record<MilestonePriority, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return order[priority];
}

/**
 * Sorts milestones by priority (highest first).
 */
export function sortMilestonesByPriority(events: MilestoneEvent[]): MilestoneEvent[] {
  return [...events].sort(
    (a, b) => getMilestonePriorityOrder(b.priority) - getMilestonePriorityOrder(a.priority)
  );
}

/**
 * Filters milestones by type.
 */
export function filterMilestonesByType(
  events: MilestoneEvent[],
  types: MilestoneType[]
): MilestoneEvent[] {
  const typeSet = new Set(types);
  return events.filter(e => typeSet.has(e.type));
}

/**
 * Calculates total points from milestone events.
 */
export function calculateTotalPoints(events: MilestoneEvent[]): number {
  return events.reduce((sum, e) => sum + e.pointsAwarded, 0);
}

/**
 * Groups milestones by type for display.
 */
export function groupMilestonesByType(
  events: MilestoneEvent[]
): Map<MilestoneType, MilestoneEvent[]> {
  const groups = new Map<MilestoneType, MilestoneEvent[]>();

  for (const event of events) {
    const existing = groups.get(event.type) || [];
    existing.push(event);
    groups.set(event.type, existing);
  }

  return groups;
}

/**
 * Summarizes milestone achievements for display.
 */
export function summarizeMilestones(events: MilestoneEvent[]): string {
  if (events.length === 0) return 'No milestones achieved yet';

  const stats = {
    total: events.length,
    points: calculateTotalPoints(events),
    critical: events.filter(e => e.priority === 'critical').length,
    high: events.filter(e => e.priority === 'high').length,
  };

  const parts: string[] = [`${stats.total} milestones achieved`];

  if (stats.critical > 0) {
    parts.push(`${stats.critical} major achievements`);
  }

  parts.push(`${stats.points} total points`);

  return parts.join(' • ');
}
