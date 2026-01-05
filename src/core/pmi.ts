/**
 * PMI (Pointwise Mutual Information) Module
 *
 * Pure TypeScript implementation for corpus statistics and collocations.
 * NO external dependencies - all functions are pure.
 *
 * From ALGORITHMIC-FOUNDATIONS.md Part 2
 */

// ============================================================================
// Types
// ============================================================================

export interface PMIResult {
  word1: string;
  word2: string;
  pmi: number;
  npmi: number;      // Normalized PMI [-1, 1]
  cooccurrence: number;
  significance: number;  // Log-likelihood ratio
}

export type TaskType = 'recognition' | 'recall_cued' | 'recall_free' | 'production' | 'timed';

// ============================================================================
// PMI Calculator Class
// ============================================================================

/**
 * Calculates Pointwise Mutual Information for word pairs in a corpus.
 *
 * PMI measures how much more likely two words are to co-occur than
 * if they were independent. High PMI = strong collocation.
 *
 * @example
 * ```typescript
 * const calc = new PMICalculator(5);
 * calc.indexCorpus(['the', 'patient', 'takes', 'medication', 'daily']);
 * const result = calc.computePMI('patient', 'medication');
 * ```
 */
export class PMICalculator {
  private wordCounts: Map<string, number> = new Map();
  private pairCounts: Map<string, number> = new Map();
  private totalWords: number = 0;
  private windowSize: number;

  constructor(windowSize: number = 5) {
    this.windowSize = windowSize;
  }

  /**
   * Index a corpus of tokens for PMI calculation.
   * Builds word frequency and co-occurrence counts.
   */
  indexCorpus(tokens: string[]): void {
    this.totalWords = tokens.length;
    this.wordCounts.clear();
    this.pairCounts.clear();

    // Count single words
    for (const token of tokens) {
      const normalized = token.toLowerCase();
      this.wordCounts.set(normalized, (this.wordCounts.get(normalized) || 0) + 1);
    }

    // Count co-occurrences within window
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < Math.min(i + this.windowSize, tokens.length); j++) {
        const pair = this.pairKey(tokens[i].toLowerCase(), tokens[j].toLowerCase());
        this.pairCounts.set(pair, (this.pairCounts.get(pair) || 0) + 1);
      }
    }
  }

  /**
   * Compute PMI between two words.
   *
   * PMI(w1, w2) = log2[P(w1,w2) / (P(w1) × P(w2))]
   *
   * @returns PMI result or null if words not found
   */
  computePMI(word1: string, word2: string): PMIResult | null {
    const w1 = word1.toLowerCase();
    const w2 = word2.toLowerCase();

    const c1 = this.wordCounts.get(w1) || 0;
    const c2 = this.wordCounts.get(w2) || 0;
    const c12 = this.pairCounts.get(this.pairKey(w1, w2)) || 0;

    if (c1 === 0 || c2 === 0 || c12 === 0) return null;

    const N = this.totalWords;
    const expectedCooccurrence = (c1 * c2) / N;

    // PMI
    const pmi = Math.log2(c12 / expectedCooccurrence);

    // Normalized PMI (bounded [-1, 1])
    const npmi = pmi / (-Math.log2(c12 / N));

    // Log-likelihood ratio for significance
    const llr = this.logLikelihoodRatio(c1, c2, c12, N);

    return {
      word1: w1,
      word2: w2,
      pmi,
      npmi,
      cooccurrence: c12,
      significance: llr
    };
  }

  /**
   * Get top collocations for a word, sorted by PMI.
   * Only includes statistically significant pairs (LLR > 3.84, p < 0.05).
   */
  getCollocations(word: string, topK: number = 20): PMIResult[] {
    const results: PMIResult[] = [];
    const w = word.toLowerCase();

    for (const [pair] of this.pairCounts) {
      const [w1, w2] = pair.split('|');
      if (w1 === w || w2 === w) {
        const other = w1 === w ? w2 : w1;
        const pmi = this.computePMI(w, other);
        if (pmi && pmi.significance > 3.84) {  // p < 0.05
          results.push(pmi);
        }
      }
    }

    return results
      .sort((a, b) => b.pmi - a.pmi)
      .slice(0, topK);
  }

  /**
   * Get all indexed words.
   */
  getVocabulary(): string[] {
    return Array.from(this.wordCounts.keys());
  }

  /**
   * Get word frequency.
   */
  getWordCount(word: string): number {
    return this.wordCounts.get(word.toLowerCase()) || 0;
  }

  /**
   * Get total corpus size.
   */
  getTotalWords(): number {
    return this.totalWords;
  }

  // Private helper: create consistent pair key
  private pairKey(w1: string, w2: string): string {
    return w1 < w2 ? `${w1}|${w2}` : `${w2}|${w1}`;
  }

  /**
   * Dunning's log-likelihood ratio for statistical significance.
   * Values > 3.84 are significant at p < 0.05.
   * Values > 6.63 are significant at p < 0.01.
   */
  private logLikelihoodRatio(c1: number, c2: number, c12: number, N: number): number {
    const c1NotC2 = c1 - c12;
    const c2NotC1 = c2 - c12;

    const H = (k: number, n: number, p: number): number => {
      if (k === 0 || k === n || p <= 0 || p >= 1) return 0;
      return k * Math.log(p) + (n - k) * Math.log(1 - p);
    };

    const p = c2 / N;
    const p1 = c12 / c1;
    const p2 = c2NotC1 / (N - c1);

    // Handle edge cases
    if (p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1) return 0;

    return 2 * (
      H(c12, c1, p1) + H(c2NotC1, N - c1, p2) -
      H(c12, c1, p) - H(c2NotC1, N - c1, p)
    );
  }
}

// ============================================================================
// PMI to Difficulty Mapping
// ============================================================================

/**
 * Convert PMI score to IRT difficulty parameter.
 *
 * Higher PMI = more predictable = easier task
 * Lower PMI = less predictable = harder task
 *
 * @param pmi - Raw PMI value (typically -2 to +10)
 * @param npmi - Normalized PMI (not used currently, reserved for future)
 * @param taskType - Type of task affects difficulty
 * @returns IRT difficulty on logit scale (-3 to +3)
 */
export function pmiToDifficulty(
  pmi: number,
  npmi: number,
  taskType: TaskType
): number {
  // PMI typically ranges from -2 to +10 for meaningful pairs
  // Higher PMI = more predictable = easier
  const PMI_MIN = -2;
  const PMI_MAX = 10;

  // Normalize to [0, 1] where 1 = hardest
  const normalizedDifficulty = 1 - (pmi - PMI_MIN) / (PMI_MAX - PMI_MIN);

  // Clamp to valid range
  const baseDifficulty = Math.max(0, Math.min(1, normalizedDifficulty));

  // Convert to IRT logit scale [-3, +3]
  const logitDifficulty = (baseDifficulty - 0.5) * 6;

  // Task type modifiers
  const modifiers: Record<TaskType, number> = {
    'recognition': -0.5,      // Easier: just recognize
    'recall_cued': 0,         // Baseline
    'recall_free': +0.5,      // Harder: no cues
    'production': +1.0,       // Hardest: generate
    'timed': +0.3             // Added time pressure
  };

  return logitDifficulty + (modifiers[taskType] || 0);
}

/**
 * Estimate difficulty for a single word (no collocation).
 * Uses word frequency as proxy for difficulty.
 *
 * @param frequency - Normalized frequency (0-1, 1 = most common)
 * @param taskType - Type of task
 * @returns IRT difficulty on logit scale
 */
export function frequencyToDifficulty(
  frequency: number,
  taskType: TaskType
): number {
  // Lower frequency = harder
  const baseDifficulty = 1 - frequency;

  // Convert to logit scale
  const logitDifficulty = (baseDifficulty - 0.5) * 6;

  const modifiers: Record<TaskType, number> = {
    'recognition': -0.5,
    'recall_cued': 0,
    'recall_free': +0.5,
    'production': +1.0,
    'timed': +0.3
  };

  return logitDifficulty + (modifiers[taskType] || 0);
}
