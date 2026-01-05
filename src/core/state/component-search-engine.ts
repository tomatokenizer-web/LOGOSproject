/**
 * Component Search Engine
 *
 * Search and filter component object states across language components.
 * Provides efficient querying for dictionary views, network graphs, and priority lists.
 *
 * From GAPS-AND-CONNECTIONS.md Gap 4.3
 */

import type { MasteryStage } from '../types';
import type {
  ComponentObjectState,
  LanguageComponent,
  TaskPhase,
  CognitiveInduction,
} from './component-object-state';
import {
  needsReview,
  isAutomized,
  getBottleneckScore,
  calculateEffectivePriority,
} from './component-object-state';

// =============================================================================
// Types
// =============================================================================

/**
 * Search filter criteria.
 */
export interface SearchFilters {
  /** Filter by component */
  component?: LanguageComponent;

  /** Content search query */
  query?: string;

  /** Minimum priority */
  minPriority?: number;

  /** Mastery stages to include */
  masteryStages?: MasteryStage[];

  /** Automation level range */
  automationRange?: [number, number];

  /** Only items exposed within N days */
  recentExposureDays?: number;

  /** Only items needing review */
  needsReview?: boolean;

  /** Only items emphasized for context */
  emphasizedOnly?: boolean;

  /** Only items not automized */
  notAutomizedOnly?: boolean;

  /** Domain filter */
  domain?: string;

  /** Has specific relation type */
  hasRelationType?: 'collocations' | 'morphologicalFamily' | 'semanticNeighbors';

  /** Minimum transfer value */
  minTransferValue?: number;
}

/**
 * Sort options for search results.
 */
export type SortOption =
  | 'priority'
  | 'frequency'
  | 'mastery'
  | 'recency'
  | 'alphabetical'
  | 'automation'
  | 'bottleneck';

/**
 * Group options for organizing results.
 */
export type GroupOption =
  | 'category'
  | 'domain'
  | 'difficulty'
  | 'mastery_stage'
  | 'component';

/**
 * Search result with metadata.
 */
export interface SearchResult {
  /** Matching objects */
  items: ComponentObjectState[];

  /** Total count (before pagination) */
  totalCount: number;

  /** Applied filters */
  appliedFilters: SearchFilters;

  /** Sort applied */
  sortedBy: SortOption;

  /** Search duration (ms) */
  searchDuration: number;
}

/**
 * Grouped search result.
 */
export interface GroupedSearchResult {
  /** Groups with items */
  groups: Array<{
    name: string;
    items: ComponentObjectState[];
    count: number;
  }>;

  /** Total count */
  totalCount: number;

  /** Grouped by */
  groupedBy: GroupOption;
}

/**
 * Priority list item with reasoning.
 */
export interface PriorityListItem {
  /** The object */
  object: ComponentObjectState;

  /** Priority score */
  priorityScore: number;

  /** Why this item is prioritized */
  reason: string;

  /** Recommended task type */
  recommendedTask: string;
}

/**
 * Network graph node.
 */
export interface NetworkNode {
  /** Node ID */
  id: string;

  /** Display label */
  label: string;

  /** Component type */
  component: LanguageComponent;

  /** Node size (based on importance) */
  size: number;

  /** Color (based on mastery) */
  color: string;

  /** Position (if layout computed) */
  position?: { x: number; y: number };
}

/**
 * Network graph edge.
 */
export interface NetworkEdge {
  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;

  /** Relationship strength */
  weight: number;

  /** Relationship type */
  type: 'collocation' | 'morphological' | 'semantic' | 'syntactic' | 'prerequisite';
}

/**
 * Network graph view data.
 */
export interface NetworkGraphView {
  /** Graph nodes */
  nodes: NetworkNode[];

  /** Graph edges */
  edges: NetworkEdge[];

  /** Layout type */
  layout: 'force' | 'hierarchical' | 'radial';
}

// =============================================================================
// Component Search Engine Class
// =============================================================================

/**
 * Search engine for component object states.
 */
export class ComponentSearchEngine {
  private states: Map<string, ComponentObjectState>;
  private componentIndex: Map<LanguageComponent, Set<string>>;
  private contentIndex: Map<string, Set<string>>;

  constructor() {
    this.states = new Map();
    this.componentIndex = new Map();
    this.contentIndex = new Map();
  }

  /**
   * Add or update a state in the index.
   */
  index(state: ComponentObjectState): void {
    // Remove from old indexes if exists
    if (this.states.has(state.objectId)) {
      this.removeFromIndexes(state.objectId);
    }

    // Add to main store
    this.states.set(state.objectId, state);

    // Add to component index
    if (!this.componentIndex.has(state.component)) {
      this.componentIndex.set(state.component, new Set());
    }
    this.componentIndex.get(state.component)!.add(state.objectId);

    // Add to content index (tokenize content)
    const tokens = this.tokenize(state.content);
    for (const token of tokens) {
      if (!this.contentIndex.has(token)) {
        this.contentIndex.set(token, new Set());
      }
      this.contentIndex.get(token)!.add(state.objectId);
    }
  }

  /**
   * Bulk index multiple states.
   */
  indexMany(states: ComponentObjectState[]): void {
    for (const state of states) {
      this.index(state);
    }
  }

  /**
   * Remove a state from the index.
   */
  remove(objectId: string): boolean {
    if (!this.states.has(objectId)) return false;
    this.removeFromIndexes(objectId);
    this.states.delete(objectId);
    return true;
  }

  /**
   * Get a state by ID.
   */
  get(objectId: string): ComponentObjectState | undefined {
    return this.states.get(objectId);
  }

  /**
   * Search states with filters.
   */
  search(
    filters: SearchFilters,
    sort: SortOption = 'priority',
    limit?: number,
    offset: number = 0
  ): SearchResult {
    const startTime = performance.now();

    // Start with all items or component-filtered items
    let candidates: ComponentObjectState[];

    if (filters.component) {
      const componentIds = this.componentIndex.get(filters.component);
      candidates = componentIds
        ? Array.from(componentIds).map(id => this.states.get(id)!).filter(Boolean)
        : [];
    } else {
      candidates = Array.from(this.states.values());
    }

    // Apply content query filter
    if (filters.query) {
      const queryTokens = this.tokenize(filters.query.toLowerCase());
      const matchingIds = new Set<string>();

      for (const token of queryTokens) {
        const ids = this.contentIndex.get(token);
        if (ids) {
          for (const id of ids) matchingIds.add(id);
        }
      }

      candidates = candidates.filter(s => matchingIds.has(s.objectId));
    }

    // Apply remaining filters
    candidates = candidates.filter(s => this.matchesFilters(s, filters));

    // Sort
    candidates = this.sortResults(candidates, sort);

    const totalCount = candidates.length;

    // Paginate
    if (limit !== undefined) {
      candidates = candidates.slice(offset, offset + limit);
    }

    return {
      items: candidates,
      totalCount,
      appliedFilters: filters,
      sortedBy: sort,
      searchDuration: performance.now() - startTime,
    };
  }

  /**
   * Search by content.
   */
  searchByContent(query: string): ComponentObjectState[] {
    return this.search({ query }).items;
  }

  /**
   * Filter by minimum priority.
   */
  filterByPriority(minPriority: number): ComponentObjectState[] {
    return this.search({ minPriority }).items;
  }

  /**
   * Filter by mastery stages.
   */
  filterByMasteryStage(stages: MasteryStage[]): ComponentObjectState[] {
    return this.search({ masteryStages: stages }).items;
  }

  /**
   * Filter by automation level range.
   */
  filterByAutomationLevel(min: number, max: number): ComponentObjectState[] {
    return this.search({ automationRange: [min, max] }).items;
  }

  /**
   * Filter by recent exposure.
   */
  filterByRecentExposure(withinDays: number): ComponentObjectState[] {
    return this.search({ recentExposureDays: withinDays }).items;
  }

  /**
   * Get items needing review.
   */
  filterByNeedsReview(): ComponentObjectState[] {
    return this.search({ needsReview: true }).items;
  }

  /**
   * Get items not automized (need practice).
   */
  getNotAutomized(): ComponentObjectState[] {
    return this.search({ notAutomizedOnly: true }).items;
  }

  /**
   * Get context-emphasized items.
   */
  getContextEmphasized(goalId?: string): ComponentObjectState[] {
    return this.search({ emphasizedOnly: true }).items;
  }

  /**
   * Get high transfer value items.
   */
  getHighTransferValue(minValue: number = 0.5): ComponentObjectState[] {
    return this.search({ minTransferValue: minValue }).items;
  }

  /**
   * Get bottleneck items (blocking other learning).
   */
  getBottlenecks(): ComponentObjectState[] {
    const all = Array.from(this.states.values());
    const withScores = all.map(s => ({
      state: s,
      score: getBottleneckScore(s),
    }));

    return withScores
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.state);
  }

  /**
   * Get grouped results.
   */
  searchGrouped(
    filters: SearchFilters,
    groupBy: GroupOption
  ): GroupedSearchResult {
    const results = this.search(filters);
    const groupMap = new Map<string, ComponentObjectState[]>();

    for (const item of results.items) {
      const groupKey = this.getGroupKey(item, groupBy);

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(item);
    }

    const groups = Array.from(groupMap.entries())
      .map(([name, items]) => ({ name, items, count: items.length }))
      .sort((a, b) => b.count - a.count);

    return {
      groups,
      totalCount: results.totalCount,
      groupedBy: groupBy,
    };
  }

  /**
   * Generate priority list with reasoning.
   */
  generatePriorityList(
    filter: 'needs_review' | 'not_automized' | 'context_emphasized' | 'high_transfer' | 'bottleneck',
    limit: number = 20
  ): PriorityListItem[] {
    let items: ComponentObjectState[];
    let getReasonFn: (s: ComponentObjectState) => string;
    let getTaskFn: (s: ComponentObjectState) => string;

    switch (filter) {
      case 'needs_review':
        items = this.filterByNeedsReview();
        getReasonFn = s => `Due for review (last: ${s.exposureHistory.lastExposure?.toLocaleDateString() || 'never'})`;
        getTaskFn = s => s.masteryState.scaffoldingGap > 0.2 ? 'cloze_deletion' : 'free_response';
        break;

      case 'not_automized':
        items = this.getNotAutomized();
        getReasonFn = s => `Low automation (${(s.cognitiveInduction.automationLevel * 100).toFixed(0)}%)`;
        getTaskFn = () => 'dictation';
        break;

      case 'context_emphasized':
        items = this.getContextEmphasized();
        getReasonFn = s => `Goal-relevant (priority: ${s.goalContextPriority.toFixed(2)})`;
        getTaskFn = s => s.masteryState.stage < 2 ? 'word_bank_fill' : 'sentence_completion';
        break;

      case 'high_transfer':
        items = this.getHighTransferValue();
        getReasonFn = s => `Enables learning ${s.transferEffects.positiveTransferTo.length} other items`;
        getTaskFn = () => 'contextual_usage';
        break;

      case 'bottleneck':
        items = this.getBottlenecks();
        getReasonFn = s => `Blocking ${s.relations.prerequisiteOf.length} items`;
        getTaskFn = () => 'error_correction';
        break;
    }

    return items.slice(0, limit).map(object => ({
      object,
      priorityScore: calculateEffectivePriority(object),
      reason: getReasonFn(object),
      recommendedTask: getTaskFn(object),
    }));
  }

  /**
   * Build network graph view for related objects.
   */
  buildNetworkGraph(
    centerObjectId: string,
    depth: number = 2
  ): NetworkGraphView {
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    const visited = new Set<string>();

    const centerState = this.states.get(centerObjectId);
    if (!centerState) {
      return { nodes: [], edges: [], layout: 'force' };
    }

    // BFS to collect related objects
    const queue: Array<{ id: string; level: number }> = [
      { id: centerObjectId, level: 0 },
    ];

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;

      if (visited.has(id) || level > depth) continue;
      visited.add(id);

      const state = this.states.get(id);
      if (!state) continue;

      // Add node
      nodes.push({
        id: state.objectId,
        label: state.content,
        component: state.component,
        size: 10 + state.featureVector.F * 20,
        color: this.getMasteryColor(state.masteryState.stage),
      });

      // Add edges and queue related objects
      for (const coll of state.relations.collocations) {
        if (!visited.has(coll.objectId)) {
          edges.push({
            source: id,
            target: coll.objectId,
            weight: coll.pmi,
            type: 'collocation',
          });
          queue.push({ id: coll.objectId, level: level + 1 });
        }
      }

      for (const familyId of state.relations.morphologicalFamily) {
        if (!visited.has(familyId)) {
          edges.push({
            source: id,
            target: familyId,
            weight: 5,
            type: 'morphological',
          });
          queue.push({ id: familyId, level: level + 1 });
        }
      }

      for (const neighborId of state.relations.semanticNeighbors) {
        if (!visited.has(neighborId)) {
          edges.push({
            source: id,
            target: neighborId,
            weight: 3,
            type: 'semantic',
          });
          queue.push({ id: neighborId, level: level + 1 });
        }
      }

      for (const prereqId of state.relations.dependsOn) {
        if (!visited.has(prereqId)) {
          edges.push({
            source: prereqId,
            target: id,
            weight: 7,
            type: 'prerequisite',
          });
          queue.push({ id: prereqId, level: level + 1 });
        }
      }
    }

    return { nodes, edges, layout: 'force' };
  }

  /**
   * Get statistics for the index.
   */
  getStatistics(): {
    totalObjects: number;
    byComponent: Record<LanguageComponent, number>;
    byMasteryStage: Record<number, number>;
    needingReview: number;
    notAutomized: number;
  } {
    const byComponent: Record<string, number> = {};
    const byMasteryStage: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    let needingReviewCount = 0;
    let notAutomizedCount = 0;

    for (const state of this.states.values()) {
      byComponent[state.component] = (byComponent[state.component] || 0) + 1;
      byMasteryStage[state.masteryState.stage]++;

      if (needsReview(state)) needingReviewCount++;
      if (!isAutomized(state)) notAutomizedCount++;
    }

    return {
      totalObjects: this.states.size,
      byComponent: byComponent as Record<LanguageComponent, number>,
      byMasteryStage,
      needingReview: needingReviewCount,
      notAutomized: notAutomizedCount,
    };
  }

  /**
   * Clear all indexed data.
   */
  clear(): void {
    this.states.clear();
    this.componentIndex.clear();
    this.contentIndex.clear();
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private removeFromIndexes(objectId: string): void {
    const state = this.states.get(objectId);
    if (!state) return;

    // Remove from component index
    this.componentIndex.get(state.component)?.delete(objectId);

    // Remove from content index
    const tokens = this.tokenize(state.content);
    for (const token of tokens) {
      this.contentIndex.get(token)?.delete(objectId);
    }
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .split(/\s+/)
      .filter(t => t.length >= 2);
  }

  private matchesFilters(state: ComponentObjectState, filters: SearchFilters): boolean {
    // Priority filter
    if (filters.minPriority !== undefined) {
      if (calculateEffectivePriority(state) < filters.minPriority) return false;
    }

    // Mastery stage filter
    if (filters.masteryStages && !filters.masteryStages.includes(state.masteryState.stage)) {
      return false;
    }

    // Automation range filter
    if (filters.automationRange) {
      const [min, max] = filters.automationRange;
      const level = state.cognitiveInduction.automationLevel;
      if (level < min || level > max) return false;
    }

    // Recent exposure filter
    if (filters.recentExposureDays !== undefined) {
      if (!state.exposureHistory.lastExposure) return false;

      const daysSinceExposure = (Date.now() - state.exposureHistory.lastExposure.getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceExposure > filters.recentExposureDays) return false;
    }

    // Needs review filter
    if (filters.needsReview && !needsReview(state)) return false;

    // Emphasized filter
    if (filters.emphasizedOnly && !state.emphasizedForContext) return false;

    // Not automized filter
    if (filters.notAutomizedOnly && isAutomized(state)) return false;

    // Domain filter
    if (filters.domain && !state.featureVector.D[filters.domain]) return false;

    // Relation type filter
    if (filters.hasRelationType) {
      const relations = state.relations[filters.hasRelationType];
      if (!relations || relations.length === 0) return false;
    }

    // Transfer value filter
    if (filters.minTransferValue !== undefined) {
      const transferValue = state.transferEffects.positiveTransferTo.length * 0.1 +
        state.transferEffects.autoReinforcementScore;
      if (transferValue < filters.minTransferValue) return false;
    }

    return true;
  }

  private sortResults(
    items: ComponentObjectState[],
    sort: SortOption
  ): ComponentObjectState[] {
    switch (sort) {
      case 'priority':
        return items.sort((a, b) =>
          calculateEffectivePriority(b) - calculateEffectivePriority(a)
        );

      case 'frequency':
        return items.sort((a, b) => b.featureVector.F - a.featureVector.F);

      case 'mastery':
        return items.sort((a, b) => b.masteryState.stage - a.masteryState.stage);

      case 'recency':
        return items.sort((a, b) => {
          const aTime = a.exposureHistory.lastExposure?.getTime() || 0;
          const bTime = b.exposureHistory.lastExposure?.getTime() || 0;
          return bTime - aTime;
        });

      case 'alphabetical':
        return items.sort((a, b) => a.content.localeCompare(b.content));

      case 'automation':
        return items.sort((a, b) =>
          b.cognitiveInduction.automationLevel - a.cognitiveInduction.automationLevel
        );

      case 'bottleneck':
        return items.sort((a, b) => getBottleneckScore(b) - getBottleneckScore(a));

      default:
        return items;
    }
  }

  private getGroupKey(state: ComponentObjectState, groupBy: GroupOption): string {
    switch (groupBy) {
      case 'component':
        return state.component;

      case 'mastery_stage':
        return `Stage ${state.masteryState.stage}`;

      case 'domain':
        const domains = Object.keys(state.featureVector.D);
        return domains[0] || 'general';

      case 'difficulty':
        const difficulty = state.featureVector.P;
        if (difficulty < 0.33) return 'Easy';
        if (difficulty < 0.67) return 'Medium';
        return 'Hard';

      case 'category':
        return state.component;

      default:
        return 'Other';
    }
  }

  private getMasteryColor(stage: MasteryStage): string {
    const colors: Record<MasteryStage, string> = {
      0: '#ef4444', // red - unknown
      1: '#f97316', // orange - recognized
      2: '#eab308', // yellow - recall
      3: '#22c55e', // green - controlled
      4: '#3b82f6', // blue - automatic
    };
    return colors[stage] || '#6b7280';
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new search engine instance.
 */
export function createSearchEngine(): ComponentSearchEngine {
  return new ComponentSearchEngine();
}

/**
 * Create a search engine with initial data.
 */
export function createSearchEngineWithData(
  states: ComponentObjectState[]
): ComponentSearchEngine {
  const engine = new ComponentSearchEngine();
  engine.indexMany(states);
  return engine;
}
