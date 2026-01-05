/**
 * Grammar Sequence Optimizer
 *
 * Builds optimal learning sequences for grammar constructions based on
 * prerequisites, complexity, frequency, and cognitive load.
 *
 * From GAPS-AND-CONNECTIONS.md Gap 4.1
 */

import type { MasteryStage } from '../types';
import type {
  SyntacticConstruction,
  GrammarLearningSequence,
  ConstructionMasteryState,
  GrammarCategory,
  CognitiveLoadMetrics,
} from './syntactic-construction';
import {
  CORE_CONSTRUCTIONS,
  getAllPrerequisites,
  calculateTotalCognitiveLoad,
} from './syntactic-construction';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for sequence optimization.
 */
export interface SequenceOptimizationConfig {
  /** Target CEFR level */
  targetLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  /** Maximum cognitive load per session (1-5) */
  maxCognitiveLoad: number;

  /** Prioritize frequency over complexity? */
  frequencyFirst: boolean;

  /** Include non-core constructions? */
  includeNonCore: boolean;

  /** Categories to focus on */
  focusCategories?: GrammarCategory[];

  /** Constructions to exclude */
  excludeConstructions?: string[];

  /** Existing mastery states */
  masteryStates?: Map<string, ConstructionMasteryState>;

  /** Maximum constructions in sequence */
  maxConstructions?: number;
}

/**
 * Scored construction for ranking.
 */
export interface ScoredConstruction {
  /** The construction */
  construction: SyntacticConstruction;

  /** Priority score (higher = should learn first) */
  priorityScore: number;

  /** Score components */
  components: {
    frequencyScore: number;
    complexityScore: number;
    prerequisiteScore: number;
    masteryScore: number;
    cognitiveLoadScore: number;
  };

  /** Reasons for score */
  reasons: string[];

  /** Ready to learn? (all prerequisites met) */
  readyToLearn: boolean;

  /** Missing prerequisites */
  missingPrerequisites: string[];
}

/**
 * Optimization result.
 */
export interface SequenceOptimizationResult {
  /** Optimized sequence */
  sequence: GrammarLearningSequence;

  /** All scored constructions */
  scoredConstructions: ScoredConstruction[];

  /** Constructions excluded (and why) */
  excluded: { construction: SyntacticConstruction; reason: string }[];

  /** Optimization metadata */
  metadata: {
    totalCandidates: number;
    totalSelected: number;
    averageCognitiveLoad: number;
    estimatedHours: number;
    coveragePercent: number;
  };
}

/**
 * Session plan for grammar learning.
 */
export interface GrammarSessionPlan {
  /** Session number */
  sessionNumber: number;

  /** Constructions to cover */
  constructions: SyntacticConstruction[];

  /** Total cognitive load */
  totalCognitiveLoad: number;

  /** Estimated duration (minutes) */
  estimatedMinutes: number;

  /** Integration words for practice */
  integrationWords: string[];

  /** Recommended task types */
  taskTypes: string[];
}

// =============================================================================
// Grammar Sequence Optimizer Class
// =============================================================================

/**
 * Optimizes grammar learning sequences.
 */
export class GrammarSequenceOptimizer {
  private config: SequenceOptimizationConfig;

  constructor(config: Partial<SequenceOptimizationConfig> = {}) {
    this.config = {
      targetLevel: 'B1',
      maxCognitiveLoad: 3.5,
      frequencyFirst: true,
      includeNonCore: false,
      ...config,
    };
  }

  /**
   * Generate an optimal learning sequence.
   */
  optimize(customConfig?: Partial<SequenceOptimizationConfig>): SequenceOptimizationResult {
    const config = { ...this.config, ...customConfig };

    // Filter candidates
    const candidates = this.filterCandidates(config);
    const excluded: { construction: SyntacticConstruction; reason: string }[] = [];

    // Score all candidates
    const scored = candidates.map(c => this.scoreConstruction(c, config));

    // Topological sort with priority
    const sorted = this.topologicalSort(scored, config);

    // Apply max constructions limit
    const selected = config.maxConstructions
      ? sorted.slice(0, config.maxConstructions)
      : sorted;

    // Collect integration words
    const integrationWords = new Set<string>();
    for (const s of selected) {
      for (const word of s.construction.exemplarWords) {
        integrationWords.add(word);
      }
    }

    // Calculate estimated hours (roughly 2 hours per construction)
    const estimatedHours = selected.length * 2;

    // Calculate average cognitive load
    const avgCognitiveLoad = selected.length > 0
      ? selected.reduce((sum, s) =>
          sum + calculateTotalCognitiveLoad(s.construction.cognitiveLoad), 0
        ) / selected.length
      : 0;

    // Determine task types
    const taskTypes = this.recommendTaskTypes(selected.map(s => s.construction));

    // Create sequence
    const sequence: GrammarLearningSequence = {
      id: `seq_${config.targetLevel}_${Date.now()}`,
      name: `Grammar Sequence to ${config.targetLevel}`,
      targetLevel: config.targetLevel,
      constructions: selected.map(s => s.construction),
      integrationWords: Array.from(integrationWords),
      taskTypes,
      estimatedHours,
    };

    // Calculate coverage
    const totalInLevel = Object.values(CORE_CONSTRUCTIONS).filter(c => {
      const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      return levelOrder.indexOf(c.cefrLevel) <= levelOrder.indexOf(config.targetLevel);
    }).length;

    return {
      sequence,
      scoredConstructions: sorted,
      excluded,
      metadata: {
        totalCandidates: candidates.length,
        totalSelected: selected.length,
        averageCognitiveLoad: avgCognitiveLoad,
        estimatedHours,
        coveragePercent: (selected.length / totalInLevel) * 100,
      },
    };
  }

  /**
   * Filter constructions based on config.
   */
  private filterCandidates(config: SequenceOptimizationConfig): SyntacticConstruction[] {
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const targetIndex = levelOrder.indexOf(config.targetLevel);

    return Object.values(CORE_CONSTRUCTIONS).filter(c => {
      // Level filter
      const constructionIndex = levelOrder.indexOf(c.cefrLevel);
      if (constructionIndex > targetIndex) return false;

      // Core filter
      if (!config.includeNonCore && !c.isCore) return false;

      // Category filter
      if (config.focusCategories && !config.focusCategories.includes(c.category)) {
        return false;
      }

      // Exclusion filter
      if (config.excludeConstructions?.includes(c.id)) return false;

      return true;
    });
  }

  /**
   * Score a construction for priority.
   */
  private scoreConstruction(
    construction: SyntacticConstruction,
    config: SequenceOptimizationConfig
  ): ScoredConstruction {
    const scores = {
      frequencyScore: 0,
      complexityScore: 0,
      prerequisiteScore: 0,
      masteryScore: 0,
      cognitiveLoadScore: 0,
    };
    const reasons: string[] = [];

    // Frequency score (0-30 points)
    // Higher frequency = higher priority
    scores.frequencyScore = construction.frequency * 30;
    if (construction.frequency > 0.7) {
      reasons.push('High frequency construction');
    }

    // Complexity score (0-25 points)
    // Lower complexity = higher priority (inverted)
    scores.complexityScore = (1 - construction.complexity) * 25;
    if (construction.complexity < 0.3) {
      reasons.push('Low complexity - good foundation');
    }

    // Prerequisite score (0-20 points)
    // Fewer prerequisites = higher priority
    const prereqCount = construction.prerequisites.length;
    scores.prerequisiteScore = Math.max(0, 20 - prereqCount * 5);
    if (prereqCount === 0) {
      reasons.push('No prerequisites - can start immediately');
    }

    // Mastery score (0-15 points)
    // Not mastered = higher priority
    if (config.masteryStates) {
      const mastery = config.masteryStates.get(construction.id);
      if (mastery) {
        // Already learning - lower priority
        scores.masteryScore = Math.max(0, 15 - mastery.stage * 5);
        if (mastery.stage < 2) {
          reasons.push('Needs more practice');
        }
      } else {
        // Not started - medium priority
        scores.masteryScore = 10;
        reasons.push('Not yet started');
      }
    } else {
      scores.masteryScore = 10;
    }

    // Cognitive load score (0-10 points)
    // Lower cognitive load = higher priority
    const totalLoad = calculateTotalCognitiveLoad(construction.cognitiveLoad);
    scores.cognitiveLoadScore = Math.max(0, 10 - totalLoad * 2);
    if (totalLoad <= 2) {
      reasons.push('Low cognitive load');
    }

    // Calculate total priority
    let priorityScore = Object.values(scores).reduce((sum, s) => sum + s, 0);

    // Bonus for core constructions
    if (construction.isCore) {
      priorityScore += 10;
      reasons.push('Core construction');
    }

    // Adjust based on frequency-first setting
    if (config.frequencyFirst) {
      priorityScore += scores.frequencyScore * 0.5;
    } else {
      priorityScore += scores.complexityScore * 0.5;
    }

    // Check prerequisites
    const allPrereqs = getAllPrerequisites(construction.id);
    const missingPrereqs: string[] = [];

    if (config.masteryStates) {
      for (const prereq of allPrereqs) {
        const prereqMastery = config.masteryStates.get(prereq);
        if (!prereqMastery || prereqMastery.stage < 2) {
          missingPrereqs.push(prereq);
        }
      }
    } else {
      // Without mastery data, assume prerequisites are missing
      missingPrereqs.push(...construction.prerequisites);
    }

    return {
      construction,
      priorityScore,
      components: scores,
      reasons,
      readyToLearn: missingPrereqs.length === 0,
      missingPrerequisites: missingPrereqs,
    };
  }

  /**
   * Topological sort with priority ordering.
   */
  private topologicalSort(
    scored: ScoredConstruction[],
    config: SequenceOptimizationConfig
  ): ScoredConstruction[] {
    const result: ScoredConstruction[] = [];
    const added = new Set<string>();
    const remaining = new Map(scored.map(s => [s.construction.id, s]));

    // Kahn's algorithm with priority
    while (remaining.size > 0) {
      // Find constructions with all prerequisites satisfied
      const ready: ScoredConstruction[] = [];

      for (const [id, s] of remaining) {
        const prereqsSatisfied = s.construction.prerequisites.every(p =>
          added.has(p) || !remaining.has(p)
        );

        if (prereqsSatisfied) {
          ready.push(s);
        }
      }

      if (ready.length === 0) {
        // Cycle detected or no more can be added
        // Add remaining by priority (handle circular dependencies)
        const remainingArray = Array.from(remaining.values());
        remainingArray.sort((a, b) => b.priorityScore - a.priorityScore);

        for (const s of remainingArray) {
          result.push(s);
          added.add(s.construction.id);
        }
        break;
      }

      // Sort ready items by priority
      ready.sort((a, b) => b.priorityScore - a.priorityScore);

      // Add highest priority item
      const next = ready[0];
      result.push(next);
      added.add(next.construction.id);
      remaining.delete(next.construction.id);
    }

    return result;
  }

  /**
   * Recommend task types for constructions.
   */
  private recommendTaskTypes(constructions: SyntacticConstruction[]): string[] {
    const taskTypes = new Set<string>();

    for (const c of constructions) {
      // Based on category
      switch (c.category) {
        case 'clause_structure':
          taskTypes.add('sentence_completion');
          taskTypes.add('error_correction');
          break;
        case 'verb_system':
          taskTypes.add('tense_transformation');
          taskTypes.add('cloze_deletion');
          taskTypes.add('grammar_identification');
          break;
        case 'modification':
          taskTypes.add('sentence_combining');
          taskTypes.add('relative_clause_tasks');
          break;
        case 'subordination':
          taskTypes.add('sentence_combining');
          taskTypes.add('paraphrasing');
          break;
        case 'information_structure':
          taskTypes.add('register_shift');
          taskTypes.add('paraphrasing');
          break;
        default:
          taskTypes.add('grammar_identification');
      }

      // Based on complexity
      if (c.complexity > 0.5) {
        taskTypes.add('error_correction');
        taskTypes.add('translation');
      }
    }

    return Array.from(taskTypes);
  }

  /**
   * Generate session plans from sequence.
   */
  generateSessionPlans(
    sequence: GrammarLearningSequence,
    sessionMinutes: number = 30
  ): GrammarSessionPlan[] {
    const plans: GrammarSessionPlan[] = [];
    let currentSession: GrammarSessionPlan = {
      sessionNumber: 1,
      constructions: [],
      totalCognitiveLoad: 0,
      estimatedMinutes: 0,
      integrationWords: [],
      taskTypes: [],
    };

    const minutesPerConstruction = 15; // Approximate time per construction

    for (const construction of sequence.constructions) {
      const load = calculateTotalCognitiveLoad(construction.cognitiveLoad);

      // Check if adding this would exceed limits
      const wouldExceedTime = currentSession.estimatedMinutes + minutesPerConstruction > sessionMinutes;
      const wouldExceedLoad = currentSession.totalCognitiveLoad + load > this.config.maxCognitiveLoad * 3;

      if (wouldExceedTime || wouldExceedLoad) {
        // Save current session and start new one
        if (currentSession.constructions.length > 0) {
          currentSession.taskTypes = this.recommendTaskTypes(currentSession.constructions);
          plans.push(currentSession);
        }

        currentSession = {
          sessionNumber: plans.length + 1,
          constructions: [],
          totalCognitiveLoad: 0,
          estimatedMinutes: 0,
          integrationWords: [],
          taskTypes: [],
        };
      }

      // Add construction to current session
      currentSession.constructions.push(construction);
      currentSession.totalCognitiveLoad += load;
      currentSession.estimatedMinutes += minutesPerConstruction;
      currentSession.integrationWords.push(...construction.exemplarWords);
    }

    // Add final session
    if (currentSession.constructions.length > 0) {
      currentSession.taskTypes = this.recommendTaskTypes(currentSession.constructions);
      plans.push(currentSession);
    }

    return plans;
  }

  /**
   * Get next construction to learn based on current mastery.
   */
  getNextConstruction(
    masteryStates: Map<string, ConstructionMasteryState>
  ): ScoredConstruction | null {
    const configWithMastery = {
      ...this.config,
      masteryStates,
    };

    const result = this.optimize(configWithMastery);

    // Find first construction that is ready to learn
    for (const scored of result.scoredConstructions) {
      if (scored.readyToLearn) {
        const mastery = masteryStates.get(scored.construction.id);
        if (!mastery || mastery.stage < 4) {
          return scored;
        }
      }
    }

    // If no ready constructions, return highest priority one
    return result.scoredConstructions[0] || null;
  }

  /**
   * Compute syntactic priority score for a word.
   */
  computeSyntacticPriority(
    wordPatterns: string[],
    masteryStates?: Map<string, ConstructionMasteryState>
  ): number {
    let totalPriority = 0;
    let matchCount = 0;

    for (const construction of Object.values(CORE_CONSTRUCTIONS)) {
      // Check if word is an exemplar for this construction
      const isExemplar = wordPatterns.some(p =>
        construction.exemplarWords.includes(p) ||
        construction.pattern.includes(p)
      );

      if (isExemplar) {
        let priority = construction.frequency * 50;

        // Adjust based on construction mastery
        if (masteryStates) {
          const mastery = masteryStates.get(construction.id);
          if (mastery) {
            // Boost if construction is being learned
            if (mastery.stage >= 1 && mastery.stage < 4) {
              priority *= 1.5;
            }
          } else {
            // Reduce if construction not started
            priority *= 0.8;
          }
        }

        totalPriority += priority;
        matchCount++;
      }
    }

    return matchCount > 0 ? totalPriority / matchCount : 0;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a grammar sequence optimizer.
 */
export function createGrammarOptimizer(
  config?: Partial<SequenceOptimizationConfig>
): GrammarSequenceOptimizer {
  return new GrammarSequenceOptimizer(config);
}

/**
 * Quick sequence generation helper.
 */
export function generateGrammarSequence(
  targetLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
  options?: Partial<SequenceOptimizationConfig>
): GrammarLearningSequence {
  const optimizer = createGrammarOptimizer({ targetLevel, ...options });
  return optimizer.optimize().sequence;
}

/**
 * Get recommended constructions for a mastery stage.
 */
export function getConstructionsForStage(
  stage: MasteryStage,
  masteryStates?: Map<string, ConstructionMasteryState>
): SyntacticConstruction[] {
  const optimizer = createGrammarOptimizer({ masteryStates });

  return Object.values(CORE_CONSTRUCTIONS).filter(c => {
    const [minStage, maxStage] = c.masteryRange;
    return stage >= minStage && stage <= maxStage;
  });
}
