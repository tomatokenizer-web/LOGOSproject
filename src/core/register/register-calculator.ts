/**
 * Register Appropriateness Calculator
 *
 * Calculates how well words and expressions fit within specific registers.
 * Used for pragmatic competence assessment and content generation.
 *
 * From GAPS-AND-CONNECTIONS.md Gap 4.2
 */

import type { LanguageObject } from '../types';
import type {
  RegisterProfile,
  DomainStructure,
  FormalityLevel,
  RegisterFeatures,
  CollocationPattern,
} from './register-profile';
import {
  REGISTER_PROFILES,
  DOMAIN_STRUCTURES,
  findClosestRegister,
  calculateFormalityDistance,
} from './register-profile';

// =============================================================================
// Types
// =============================================================================

/**
 * Register fit assessment result.
 */
export interface RegisterFitResult {
  /** Word or expression assessed */
  word: string;

  /** Target register */
  register: RegisterProfile;

  /** Overall appropriateness score (0-1) */
  appropriatenessScore: number;

  /** Score components */
  components: {
    formalityFit: number;
    genreFit: number;
    collocationFit: number;
    frequencyFit: number;
  };

  /** Assessment reasoning */
  reasons: string[];

  /** Suggested alternatives if poor fit */
  alternatives?: string[];

  /** Is this word appropriate for this register? */
  isAppropriate: boolean;
}

/**
 * Word register distribution.
 */
export interface WordRegisterDistribution {
  /** The word */
  word: string;

  /** Distribution across registers (register ID -> probability) */
  distribution: Record<string, number>;

  /** Primary register (highest probability) */
  primaryRegister: string;

  /** Is this word register-neutral? */
  isNeutral: boolean;

  /** Register span (range of appropriate formality) */
  formalitySpan: [number, number];
}

/**
 * Register transfer analysis.
 */
export interface RegisterTransferAnalysis {
  /** Source register */
  sourceRegister: RegisterProfile;

  /** Target register */
  targetRegister: RegisterProfile;

  /** Words that transfer well */
  transferableWords: string[];

  /** Words that need adaptation */
  adaptationNeeded: { word: string; suggestion: string }[];

  /** Words to avoid in target */
  avoidInTarget: string[];

  /** Overall transfer difficulty (0-1) */
  transferDifficulty: number;
}

/**
 * Text register analysis result.
 */
export interface TextRegisterAnalysis {
  /** Analyzed text */
  text: string;

  /** Detected primary register */
  detectedRegister: RegisterProfile;

  /** Confidence score (0-1) */
  confidence: number;

  /** Feature scores */
  featureScores: Partial<RegisterFeatures>;

  /** Register violations (words that don't fit) */
  violations: { word: string; reason: string }[];

  /** Consistency score (0-1) */
  consistencyScore: number;
}

// =============================================================================
// Register Calculator Class
// =============================================================================

/**
 * Calculates register appropriateness.
 */
export class RegisterCalculator {
  private wordRegisterCache: Map<string, WordRegisterDistribution>;

  constructor() {
    this.wordRegisterCache = new Map();
  }

  /**
   * Compute register appropriateness score for a word.
   */
  computeRegisterFit(
    word: string,
    targetRegister: RegisterProfile | string,
    context?: { domain?: string; genre?: string }
  ): RegisterFitResult {
    const register = typeof targetRegister === 'string'
      ? REGISTER_PROFILES[targetRegister]
      : targetRegister;

    if (!register) {
      throw new Error(`Unknown register: ${targetRegister}`);
    }

    const wordLower = word.toLowerCase();
    const scores = {
      formalityFit: 0,
      genreFit: 0,
      collocationFit: 0,
      frequencyFit: 0,
    };
    const reasons: string[] = [];
    const alternatives: string[] = [];

    // Get word's register distribution
    const distribution = this.getWordRegisterDistribution(wordLower);

    // Formality fit (0-40 points)
    const wordFormality = this.estimateWordFormality(wordLower);
    const formalityDiff = Math.abs(wordFormality - register.formality);

    if (formalityDiff <= 0.1) {
      scores.formalityFit = 40;
      reasons.push('Formality matches register well');
    } else if (formalityDiff <= 0.25) {
      scores.formalityFit = 30;
      reasons.push('Formality is acceptable for register');
    } else if (formalityDiff <= 0.4) {
      scores.formalityFit = 15;
      reasons.push('Formality slightly mismatched');
    } else {
      scores.formalityFit = 5;
      reasons.push('Formality significantly mismatched');
      // Suggest alternatives
      const betterRegister = findClosestRegister(wordFormality);
      if (betterRegister.id !== register.id) {
        alternatives.push(`Consider words from ${betterRegister.name} register`);
      }
    }

    // Genre fit (0-25 points)
    if (register.typicalWords.includes(wordLower)) {
      scores.genreFit = 25;
      reasons.push('Word is typical for this register');
    } else if (distribution.distribution[register.id] > 0.3) {
      scores.genreFit = 20;
      reasons.push('Word commonly used in this register');
    } else if (distribution.distribution[register.id] > 0.1) {
      scores.genreFit = 12;
      reasons.push('Word occasionally used in this register');
    } else if (distribution.isNeutral) {
      scores.genreFit = 15;
      reasons.push('Register-neutral word');
    } else {
      scores.genreFit = 5;
      reasons.push('Word rarely used in this register');
    }

    // Collocation fit (0-20 points)
    const hasCollocation = register.collocations.some(
      c => c.word1.toLowerCase() === wordLower || c.word2.toLowerCase() === wordLower
    );

    if (hasCollocation) {
      scores.collocationFit = 20;
      reasons.push('Word has register-specific collocations');
    } else {
      scores.collocationFit = 10; // Neutral
    }

    // Frequency fit (0-15 points)
    // Words with higher register-specific frequency get higher scores
    const registerFrequency = distribution.distribution[register.id] || 0;
    scores.frequencyFit = Math.round(registerFrequency * 15);

    // Calculate total score
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
    const appropriatenessScore = totalScore / 100;

    return {
      word,
      register,
      appropriatenessScore,
      components: scores,
      reasons,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      isAppropriate: appropriatenessScore >= 0.5,
    };
  }

  /**
   * Analyze text for register consistency.
   */
  analyzeTextRegister(text: string): TextRegisterAnalysis {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const violations: { word: string; reason: string }[] = [];

    // Calculate feature scores
    const featureScores: Partial<RegisterFeatures> = {
      avgSentenceLength: this.calculateAvgSentenceLength(text),
      contractionRate: this.calculateContractionRate(text),
      personalPronounDensity: this.calculatePronounDensity(text),
    };

    // Score each register
    const registerScores = new Map<string, number>();

    for (const [registerId, register] of Object.entries(REGISTER_PROFILES)) {
      let score = 0;

      // Check typical words
      const typicalWordCount = words.filter(w =>
        register.typicalWords.includes(w)
      ).length;
      score += typicalWordCount * 10;

      // Check feature alignment
      if (featureScores.contractionRate !== undefined) {
        const contractionDiff = Math.abs(
          featureScores.contractionRate - register.features.contractionRate
        );
        score += Math.max(0, 20 - contractionDiff * 50);
      }

      // Check formality alignment
      const avgWordFormality = this.calculateAverageFormality(words);
      const formalityDiff = Math.abs(avgWordFormality - register.formality);
      score += Math.max(0, 30 - formalityDiff * 60);

      registerScores.set(registerId, score);
    }

    // Find best matching register
    let bestRegister = Object.values(REGISTER_PROFILES)[0];
    let bestScore = 0;

    for (const [registerId, score] of registerScores) {
      if (score > bestScore) {
        bestScore = score;
        bestRegister = REGISTER_PROFILES[registerId];
      }
    }

    // Calculate confidence
    const scores = Array.from(registerScores.values()).sort((a, b) => b - a);
    const confidence = scores.length > 1 && scores[0] > 0
      ? Math.min(1, (scores[0] - scores[1]) / scores[0] + 0.3)
      : 0.5;

    // Find violations
    for (const word of words) {
      const fit = this.computeRegisterFit(word, bestRegister);
      if (!fit.isAppropriate && !this.isCommonWord(word)) {
        violations.push({
          word,
          reason: fit.reasons[fit.reasons.length - 1] || 'Register mismatch',
        });
      }
    }

    // Calculate consistency
    const consistencyScore = violations.length === 0
      ? 1.0
      : Math.max(0, 1 - violations.length / words.length * 5);

    return {
      text,
      detectedRegister: bestRegister,
      confidence,
      featureScores,
      violations,
      consistencyScore,
    };
  }

  /**
   * Analyze transfer between registers.
   */
  analyzeRegisterTransfer(
    sourceRegister: RegisterProfile | string,
    targetRegister: RegisterProfile | string,
    vocabulary: string[]
  ): RegisterTransferAnalysis {
    const source = typeof sourceRegister === 'string'
      ? REGISTER_PROFILES[sourceRegister]
      : sourceRegister;
    const target = typeof targetRegister === 'string'
      ? REGISTER_PROFILES[targetRegister]
      : targetRegister;

    if (!source || !target) {
      throw new Error('Invalid register');
    }

    const transferable: string[] = [];
    const adaptationNeeded: { word: string; suggestion: string }[] = [];
    const avoidInTarget: string[] = [];

    for (const word of vocabulary) {
      const sourceFit = this.computeRegisterFit(word, source);
      const targetFit = this.computeRegisterFit(word, target);

      if (targetFit.isAppropriate) {
        transferable.push(word);
      } else if (sourceFit.isAppropriate && !targetFit.isAppropriate) {
        // Word works in source but not target
        const suggestion = this.suggestRegisterAlternative(word, target);
        if (suggestion) {
          adaptationNeeded.push({ word, suggestion });
        } else {
          avoidInTarget.push(word);
        }
      }
    }

    // Calculate transfer difficulty based on formality distance
    const formalityDistance = calculateFormalityDistance(source, target);
    const transferDifficulty = Math.min(1, formalityDistance * 1.5);

    return {
      sourceRegister: source,
      targetRegister: target,
      transferableWords: transferable,
      adaptationNeeded,
      avoidInTarget,
      transferDifficulty,
    };
  }

  /**
   * Get word's register distribution.
   */
  getWordRegisterDistribution(word: string): WordRegisterDistribution {
    const cached = this.wordRegisterCache.get(word);
    if (cached) return cached;

    const distribution: Record<string, number> = {};
    let maxProb = 0;
    let primaryRegister = '';
    let minFormality = 1;
    let maxFormality = 0;

    for (const [registerId, register] of Object.entries(REGISTER_PROFILES)) {
      // Calculate probability based on typical words and formality
      let prob = 0;

      if (register.typicalWords.includes(word)) {
        prob = 0.8;
      } else {
        // Estimate based on word characteristics
        const wordFormality = this.estimateWordFormality(word);
        const formalityDiff = Math.abs(wordFormality - register.formality);
        prob = Math.max(0, 0.5 - formalityDiff);
      }

      distribution[registerId] = prob;

      if (prob > maxProb) {
        maxProb = prob;
        primaryRegister = registerId;
      }

      if (prob > 0.3) {
        minFormality = Math.min(minFormality, register.formality);
        maxFormality = Math.max(maxFormality, register.formality);
      }
    }

    // Check if neutral (works across many registers)
    const highProbCount = Object.values(distribution).filter(p => p > 0.4).length;
    const isNeutral = highProbCount >= 3;

    const result: WordRegisterDistribution = {
      word,
      distribution,
      primaryRegister,
      isNeutral,
      formalitySpan: [minFormality, maxFormality],
    };

    this.wordRegisterCache.set(word, result);
    return result;
  }

  /**
   * Estimate word formality level (0-1).
   */
  private estimateWordFormality(word: string): number {
    // Check formal indicators
    const formalIndicators = [
      word.length > 8,
      word.includes('tion'),
      word.includes('ment'),
      word.includes('ness'),
      /^(un|dis|mis|pre|pro)/.test(word),
    ];

    // Check informal indicators
    const informalIndicators = [
      word.length <= 4,
      word.includes('\''),
      /^(gonna|wanna|kinda|sorta|gotta)$/.test(word),
      word.endsWith('in'),
    ];

    const formalScore = formalIndicators.filter(Boolean).length * 0.15;
    const informalScore = informalIndicators.filter(Boolean).length * 0.15;

    // Base formality is 0.5, adjust based on indicators
    return Math.max(0, Math.min(1, 0.5 + formalScore - informalScore));
  }

  /**
   * Calculate average sentence length.
   */
  private calculateAvgSentenceLength(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;

    const totalWords = sentences.reduce(
      (sum, s) => sum + s.trim().split(/\s+/).length,
      0
    );

    return totalWords / sentences.length;
  }

  /**
   * Calculate contraction rate.
   */
  private calculateContractionRate(text: string): number {
    const words = text.split(/\s+/);
    const contractions = words.filter(w => w.includes('\''));
    return words.length > 0 ? contractions.length / words.length : 0;
  }

  /**
   * Calculate personal pronoun density.
   */
  private calculatePronounDensity(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    const pronouns = ['i', 'me', 'my', 'mine', 'you', 'your', 'yours',
      'he', 'him', 'his', 'she', 'her', 'hers', 'we', 'us', 'our', 'ours',
      'they', 'them', 'their', 'theirs'];

    const pronounCount = words.filter(w => pronouns.includes(w)).length;
    return words.length > 0 ? pronounCount / words.length : 0;
  }

  /**
   * Calculate average formality of word list.
   */
  private calculateAverageFormality(words: string[]): number {
    if (words.length === 0) return 0.5;

    const total = words.reduce(
      (sum, word) => sum + this.estimateWordFormality(word),
      0
    );

    return total / words.length;
  }

  /**
   * Check if word is common/neutral.
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'and', 'or', 'but', 'if', 'then',
      'so', 'that', 'this', 'these', 'those', 'it', 'its', 'for', 'with',
      'from', 'to', 'of', 'in', 'on', 'at', 'by', 'as', 'not', 'no', 'yes',
    ]);

    return commonWords.has(word.toLowerCase());
  }

  /**
   * Suggest alternative word for target register.
   */
  private suggestRegisterAlternative(
    word: string,
    targetRegister: RegisterProfile
  ): string | undefined {
    // Simple synonym mapping for demonstration
    // In production, would use a thesaurus API or database
    const formalAlternatives: Record<string, string> = {
      'gonna': 'going to',
      'wanna': 'want to',
      'gotta': 'have to',
      'stuff': 'materials',
      'thing': 'item',
      'guy': 'individual',
      'kids': 'children',
      'lots': 'numerous',
    };

    const casualAlternatives: Record<string, string> = {
      'subsequently': 'then',
      'utilize': 'use',
      'facilitate': 'help',
      'demonstrate': 'show',
      'commence': 'start',
      'terminate': 'end',
      'endeavor': 'try',
    };

    if (targetRegister.formality > 0.6) {
      return formalAlternatives[word.toLowerCase()];
    } else if (targetRegister.formality < 0.4) {
      return casualAlternatives[word.toLowerCase()];
    }

    return undefined;
  }

  /**
   * Clear the word register cache.
   */
  clearCache(): void {
    this.wordRegisterCache.clear();
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a register calculator instance.
 */
export function createRegisterCalculator(): RegisterCalculator {
  return new RegisterCalculator();
}

/**
 * Quick register fit check.
 */
export function computeRegisterAppropriatenessScore(
  word: string,
  targetRegister: RegisterProfile | string
): number {
  const calculator = createRegisterCalculator();
  return calculator.computeRegisterFit(word, targetRegister).appropriatenessScore;
}

/**
 * Get best matching register for text.
 */
export function detectTextRegister(text: string): RegisterProfile {
  const calculator = createRegisterCalculator();
  return calculator.analyzeTextRegister(text).detectedRegister;
}
