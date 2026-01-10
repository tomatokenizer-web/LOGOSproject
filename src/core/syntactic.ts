/**
 * LOGOS Syntactic Complexity Analysis Module
 *
 * Pure TypeScript implementation for sentence structure analysis.
 * Measures syntactic complexity and maps to CEFR levels.
 *
 * From ALGORITHMIC-FOUNDATIONS.md Part 6.2
 * From THEORETICAL-FOUNDATIONS.md Section 2.2 (LanguageObjectVector.syntactic)
 *
 * Key Use Cases:
 * 1. LanguageObjectVector.syntactic computation
 * 2. CEFR level estimation for content difficulty
 * 3. θ_syntactic estimation support
 * 4. Genre-specific structure analysis (SOAP, SBAR, etc.)
 * 5. Task difficulty calibration
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Complete syntactic complexity metrics.
 *
 * Includes Lu (2010, 2011) metrics for syntactic complexity:
 * - Lu, X. (2010). Automatic analysis of syntactic complexity in second language writing.
 * - Lu, X. (2011). A corpus-based evaluation of syntactic complexity measures.
 */
export interface SyntacticComplexity {
  /** Number of words in the sentence */
  sentenceLength: number;

  /** Estimated maximum depth of dependency tree */
  dependencyDepth: number;

  /** Number of clauses (main + subordinate) */
  clauseCount: number;

  /** Ratio of subordinate clauses to total clauses */
  subordinationIndex: number;

  /** Ratio of passive constructions to total verbs */
  passiveRatio: number;

  /** Ratio of nouns to (nouns + verbs) - nominal style indicator */
  nominalRatio: number;

  /** Estimated mean distance between head and dependent */
  averageDependencyDistance: number;

  /** Overall complexity score (0-1) */
  complexityScore: number;

  /** Estimated CEFR level */
  estimatedCEFR: CEFRLevel;

  // ========== Lu (2010, 2011) Metrics ==========

  /**
   * MLC: Mean Length of Clause
   * Average number of words per clause.
   * Lu (2010): One of the most reliable complexity measures.
   */
  meanLengthOfClause: number;

  /**
   * CN/C: Complex Nominals per Clause
   * Nouns with pre/post modification per clause.
   * Complex nominals = NP with adj/PP/relative clause modifiers
   * Lu (2011): Discriminates proficiency levels effectively.
   */
  complexNominalsPerClause: number;

  /**
   * DC/C: Dependent Clauses per Clause
   * Ratio of dependent clauses to total clauses.
   * Lu (2010): Captures syntactic sophistication.
   */
  dependentClausesPerClause: number;

  /**
   * T-unit metrics (optional, computed when text has multiple sentences)
   */
  tUnitMetrics?: TUnitMetrics;
}

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * T-unit metrics from Lu (2010, 2011).
 *
 * T-unit = minimal terminable unit = one main clause + attached subordinate clauses
 */
export interface TUnitMetrics {
  /** Total number of T-units */
  tUnitCount: number;

  /** MLS: Mean Length of Sentence (words per sentence) */
  meanLengthOfSentence: number;

  /** MLT: Mean Length of T-unit (words per T-unit) */
  meanLengthOfTUnit: number;

  /** C/T: Clauses per T-unit */
  clausesPerTUnit: number;

  /** CT/T: Complex T-units per T-unit (T-units with dependent clause) */
  complexTUnitsRatio: number;

  /** CP/T: Coordinate Phrases per T-unit */
  coordinatePhrasesPerTUnit: number;

  /** VP/T: Verb Phrases per T-unit */
  verbPhrasesPerTUnit: number;
}

/**
 * Complex nominal detection result.
 */
export interface ComplexNominal {
  /** The nominal phrase */
  phrase: string;

  /** Type of modification */
  modificationType: 'adjective' | 'prepositional' | 'relative' | 'participle' | 'appositive';

  /** Position in sentence */
  position: number;
}

/**
 * Syntactic vector for LanguageObjectVector.
 */
export interface SyntacticVector {
  /** Part of speech */
  partOfSpeech: PartOfSpeech;

  /** Subcategorization frames (e.g., [+transitive]) */
  subcategorization: string[];

  /** Argument structure pattern */
  argumentStructure: string;

  /** Complexity level */
  complexity: 'simple' | 'moderate' | 'complex';

  /** Required CEFR level to understand */
  requiredLevel: CEFRLevel;
}

export type PartOfSpeech =
  | 'noun' | 'verb' | 'adjective' | 'adverb'
  | 'preposition' | 'conjunction' | 'determiner'
  | 'pronoun' | 'interjection' | 'auxiliary'
  | 'unknown';

/**
 * Clause structure analysis.
 */
export interface ClauseAnalysis {
  /** Main clause count */
  mainClauses: number;

  /** Subordinate clause count */
  subordinateClauses: number;

  /** Types of subordinate clauses found */
  subordinateTypes: SubordinateClauseType[];

  /** Coordination count (and, but, or) */
  coordinationCount: number;
}

export type SubordinateClauseType =
  | 'relative'      // who, which, that
  | 'adverbial'     // when, where, because, if, although
  | 'nominal'       // that-clause as subject/object
  | 'conditional'   // if, unless, provided
  | 'concessive'    // although, even though
  | 'temporal'      // when, while, after, before
  | 'causal'        // because, since, as
  | 'purpose';      // so that, in order to

/**
 * Genre-specific structure pattern.
 */
export interface GenreStructure {
  /** Genre name */
  genre: string;

  /** Expected sections/components */
  sections: string[];

  /** Typical sentence patterns */
  patterns: string[];

  /** Target CEFR range */
  targetCEFR: { min: CEFRLevel; max: CEFRLevel };

  /** Domain specificity */
  domain: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * CEFR complexity targets from ALGORITHMIC-FOUNDATIONS.md.
 * Extended with Lu (2010, 2011) metrics based on corpus studies.
 *
 * Lu metrics reference values from:
 * - Lu, X. (2011). A corpus-based evaluation of syntactic complexity measures
 *   as indices of college-level ESL writers' language development.
 */
export const CEFR_COMPLEXITY_TARGETS: Record<CEFRLevel, SyntacticComplexity> = {
  'A1': {
    sentenceLength: 8,
    dependencyDepth: 2,
    clauseCount: 1,
    subordinationIndex: 0,
    passiveRatio: 0,
    nominalRatio: 0.4,
    averageDependencyDistance: 2,
    complexityScore: 0.1,
    estimatedCEFR: 'A1',
    // Lu metrics - A1 level
    meanLengthOfClause: 6,        // Simple, short clauses
    complexNominalsPerClause: 0.2, // Minimal modification
    dependentClausesPerClause: 0   // No subordination
  },
  'A2': {
    sentenceLength: 12,
    dependencyDepth: 3,
    clauseCount: 1.5,
    subordinationIndex: 0.1,
    passiveRatio: 0.05,
    nominalRatio: 0.45,
    averageDependencyDistance: 3,
    complexityScore: 0.25,
    estimatedCEFR: 'A2',
    // Lu metrics - A2 level
    meanLengthOfClause: 7,
    complexNominalsPerClause: 0.4,
    dependentClausesPerClause: 0.15
  },
  'B1': {
    sentenceLength: 15,
    dependencyDepth: 4,
    clauseCount: 2,
    subordinationIndex: 0.2,
    passiveRatio: 0.1,
    nominalRatio: 0.5,
    averageDependencyDistance: 4,
    complexityScore: 0.4,
    estimatedCEFR: 'B1',
    // Lu metrics - B1 level
    meanLengthOfClause: 8,
    complexNominalsPerClause: 0.6,
    dependentClausesPerClause: 0.25
  },
  'B2': {
    sentenceLength: 20,
    dependencyDepth: 5,
    clauseCount: 2.5,
    subordinationIndex: 0.3,
    passiveRatio: 0.15,
    nominalRatio: 0.55,
    averageDependencyDistance: 5,
    complexityScore: 0.6,
    estimatedCEFR: 'B2',
    // Lu metrics - B2 level
    meanLengthOfClause: 9.5,
    complexNominalsPerClause: 0.85,
    dependentClausesPerClause: 0.35
  },
  'C1': {
    sentenceLength: 25,
    dependencyDepth: 6,
    clauseCount: 3,
    subordinationIndex: 0.4,
    passiveRatio: 0.2,
    nominalRatio: 0.6,
    averageDependencyDistance: 6,
    complexityScore: 0.8,
    estimatedCEFR: 'C1',
    // Lu metrics - C1 level
    meanLengthOfClause: 11,
    complexNominalsPerClause: 1.1,
    dependentClausesPerClause: 0.45
  },
  'C2': {
    sentenceLength: 30,
    dependencyDepth: 7,
    clauseCount: 4,
    subordinationIndex: 0.5,
    passiveRatio: 0.25,
    nominalRatio: 0.65,
    averageDependencyDistance: 7,
    complexityScore: 1.0,
    estimatedCEFR: 'C2',
    // Lu metrics - C2 level (native-like)
    meanLengthOfClause: 12.5,
    complexNominalsPerClause: 1.4,
    dependentClausesPerClause: 0.55
  }
};

/**
 * Subordinating conjunctions and their types.
 */
const SUBORDINATORS: Record<string, SubordinateClauseType> = {
  // Relative
  'who': 'relative', 'whom': 'relative', 'whose': 'relative',
  'which': 'relative', 'that': 'relative',

  // Temporal
  'when': 'temporal', 'while': 'temporal', 'after': 'temporal',
  'before': 'temporal', 'until': 'temporal', 'since': 'temporal',
  'as soon as': 'temporal', 'once': 'temporal',

  // Conditional
  'if': 'conditional', 'unless': 'conditional', 'provided': 'conditional',
  'providing': 'conditional', 'supposing': 'conditional',

  // Causal (note: 'since' can be temporal or causal - keeping as temporal above)
  'because': 'causal', 'as': 'causal',
  'for': 'causal', 'due to': 'causal',

  // Concessive (note: 'while' can be temporal or concessive - keeping as temporal above)
  'although': 'concessive', 'though': 'concessive', 'even though': 'concessive',
  'whereas': 'concessive', 'even if': 'concessive',

  // Purpose
  'so that': 'purpose', 'in order that': 'purpose', 'so': 'purpose',

  // Nominal
  'whether': 'nominal', 'how': 'nominal', 'what': 'nominal',
  'why': 'nominal', 'where': 'nominal'
};

/**
 * Coordinating conjunctions.
 */
const COORDINATORS = ['and', 'but', 'or', 'nor', 'for', 'yet', 'so'];

/**
 * Passive voice indicators.
 */
const PASSIVE_AUXILIARIES = ['is', 'are', 'was', 'were', 'been', 'being', 'be'];

/**
 * Common noun suffixes for POS detection.
 */
const NOUN_PATTERNS = /\b\w+(tion|ment|ness|ity|ism|er|or|ist|ance|ence|ship|hood|dom|age|ure)\b/gi;

/**
 * Common verb patterns.
 */
const VERB_PATTERNS = /\b(is|are|was|were|have|has|had|do|does|did|will|would|could|should|might|may|must|shall|can|\w+ed|\w+ing|\w+s)\b/gi;

/**
 * Genre-specific structures.
 */
export const GENRE_STRUCTURES: GenreStructure[] = [
  {
    genre: 'SOAP_note',
    sections: ['Subjective', 'Objective', 'Assessment', 'Plan'],
    patterns: ['Patient reports...', 'Vitals:', 'Impression:', 'Recommend...'],
    targetCEFR: { min: 'B2', max: 'C1' },
    domain: 'medical'
  },
  {
    genre: 'SBAR_handoff',
    sections: ['Situation', 'Background', 'Assessment', 'Recommendation'],
    patterns: ['I am calling about...', 'The patient was admitted for...', 'I think the problem is...', 'I would recommend...'],
    targetCEFR: { min: 'B1', max: 'B2' },
    domain: 'medical'
  },
  {
    genre: 'academic_abstract',
    sections: ['Background', 'Methods', 'Results', 'Conclusions'],
    patterns: ['This study examines...', 'Data were collected...', 'Results indicate...', 'These findings suggest...'],
    targetCEFR: { min: 'C1', max: 'C2' },
    domain: 'academic'
  },
  {
    genre: 'business_email',
    sections: ['Greeting', 'Purpose', 'Details', 'Action', 'Closing'],
    patterns: ['I am writing to...', 'Please find attached...', 'Could you please...', 'Best regards'],
    targetCEFR: { min: 'B1', max: 'B2' },
    domain: 'business'
  },
  {
    genre: 'legal_contract',
    sections: ['Parties', 'Recitals', 'Terms', 'Signatures'],
    patterns: ['WHEREAS...', 'The parties agree that...', 'Subject to...', 'Notwithstanding...'],
    targetCEFR: { min: 'C1', max: 'C2' },
    domain: 'legal'
  }
];

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Analyze syntactic complexity of a sentence or text.
 *
 * @param text - Text to analyze (sentence or paragraph)
 * @returns Complete syntactic complexity metrics
 *
 * @example
 * ```typescript
 * const result = analyzeSyntacticComplexity(
 *   "Although the patient reported improvement, the physician recommended additional tests."
 * );
 * // { sentenceLength: 10, clauseCount: 2, subordinationIndex: 0.5, ... }
 * ```
 */
export function analyzeSyntacticComplexity(text: string): SyntacticComplexity {
  const sentences = splitSentences(text);
  const allMetrics = sentences.map(analyzeSingleSentence);

  // Average metrics across all sentences
  if (allMetrics.length === 0) {
    return createEmptyComplexity();
  }

  const avgMetrics = averageMetrics(allMetrics);
  avgMetrics.complexityScore = calculateComplexityScore(avgMetrics);
  avgMetrics.estimatedCEFR = estimateCEFRLevel(avgMetrics);

  return avgMetrics;
}

/**
 * Analyze a single sentence.
 */
function analyzeSingleSentence(sentence: string): SyntacticComplexity {
  const words = tokenize(sentence);
  const length = words.length;

  if (length === 0) {
    return createEmptyComplexity();
  }

  // Clause analysis
  const clauseAnalysis = analyzeClauseStructure(sentence);
  const totalClauses = Math.max(clauseAnalysis.mainClauses + clauseAnalysis.subordinateClauses, 1);

  // POS-based ratios (heuristic)
  const nounMatches = sentence.match(NOUN_PATTERNS) || [];
  const verbMatches = sentence.match(VERB_PATTERNS) || [];
  const nounCount = nounMatches.length;
  const verbCount = Math.max(verbMatches.length, 1);

  // Passive detection
  const passiveCount = countPassiveConstructions(sentence);

  // Calculate metrics
  const subordinationIndex = totalClauses > 0
    ? clauseAnalysis.subordinateClauses / totalClauses
    : 0;

  const passiveRatio = passiveCount / verbCount;
  const nominalRatio = nounCount / (nounCount + verbCount);

  // Dependency depth estimation (heuristic based on subordination)
  const dependencyDepth = Math.ceil(Math.log2(length + 1)) +
    clauseAnalysis.subordinateClauses;

  // Average dependency distance estimation
  const averageDependencyDistance = length / (totalClauses * 2 + 1);

  // ========== Lu (2010, 2011) Metrics ==========

  // MLC: Mean Length of Clause
  const meanLengthOfClause = length / totalClauses;

  // CN/C: Complex Nominals per Clause
  const complexNominals = detectComplexNominals(sentence);
  const complexNominalsPerClause = complexNominals.length / totalClauses;

  // DC/C: Dependent Clauses per Clause
  const dependentClausesPerClause = clauseAnalysis.subordinateClauses / totalClauses;

  return {
    sentenceLength: length,
    dependencyDepth,
    clauseCount: totalClauses,
    subordinationIndex,
    passiveRatio,
    nominalRatio,
    averageDependencyDistance,
    complexityScore: 0, // Calculated later
    estimatedCEFR: 'A1', // Calculated later
    // Lu metrics
    meanLengthOfClause,
    complexNominalsPerClause,
    dependentClausesPerClause
  };
}

/**
 * Analyze clause structure of a sentence.
 */
export function analyzeClauseStructure(sentence: string): ClauseAnalysis {
  const lowerSentence = sentence.toLowerCase();
  const subordinateTypes: SubordinateClauseType[] = [];
  let subordinateClauses = 0;

  // Count subordinate clauses by markers
  for (const [marker, type] of Object.entries(SUBORDINATORS)) {
    const regex = new RegExp(`\\b${marker}\\b`, 'gi');
    const matches = lowerSentence.match(regex);
    if (matches) {
      subordinateClauses += matches.length;
      subordinateTypes.push(...Array(matches.length).fill(type));
    }
  }

  // Count coordination
  let coordinationCount = 0;
  for (const coord of COORDINATORS) {
    const regex = new RegExp(`\\b${coord}\\b`, 'gi');
    const matches = lowerSentence.match(regex);
    if (matches) {
      coordinationCount += matches.length;
    }
  }

  // Main clauses = 1 (base) + coordination
  const mainClauses = 1 + coordinationCount;

  return {
    mainClauses,
    subordinateClauses,
    subordinateTypes: [...new Set(subordinateTypes)], // Unique types
    coordinationCount
  };
}

/**
 * Count passive voice constructions.
 */
function countPassiveConstructions(sentence: string): number {
  let count = 0;

  // Pattern: be-verb + past participle (ending in -ed or irregular)
  for (const aux of PASSIVE_AUXILIARIES) {
    const pattern = new RegExp(`\\b${aux}\\s+\\w+ed\\b`, 'gi');
    const matches = sentence.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }

  // Check for "by + agent" as additional indicator
  if (/\bby\s+(the|a|an|\w+)\b/i.test(sentence)) {
    count = Math.max(count, 1);
  }

  return count;
}

// ============================================================================
// Lu (2010, 2011) Complex Nominal Detection
// ============================================================================

/**
 * Complex nominal patterns for CN/C calculation.
 *
 * Complex nominals include (Lu, 2010):
 * 1. Nouns modified by adjectives
 * 2. Nouns modified by prepositional phrases
 * 3. Nouns modified by relative clauses
 * 4. Nouns modified by participles
 * 5. Appositives
 * 6. Gerunds/infinitives as subjects
 */

/** Adjective + Noun pattern */
const ADJ_NOUN_PATTERN = /\b(very|quite|rather|extremely|highly|really)?\s*(important|significant|complex|difficult|specific|particular|main|primary|secondary|new|old|big|small|large|great|good|bad|high|low|long|short|different|same|similar|other|such|certain|various|several|major|minor|recent|current|previous|following|potential|possible|necessary|essential|critical|key|basic|general|special|specific|medical|legal|clinical|professional|academic|scientific)\s+\w+(tion|ment|ness|ity|ism|er|or|ist|ance|ence|ship|hood|dom|age|ure|ing|ed|s)?\b/gi;

/** Noun + Prepositional Phrase pattern */
const NOUN_PP_PATTERN = /\b\w+(tion|ment|ness|ity|ism|er|or|ist|ance|ence|ship|hood|dom|age|ure)\s+(of|in|for|with|by|to|from|on|at|about|through|during|after|before|between|among|under|over|against|within|without|across|behind|beyond|toward|towards|upon)\s+(the|a|an|this|that|these|those|my|your|his|her|its|our|their|\w+)\b/gi;

/** Noun + Relative Clause pattern */
const NOUN_RELATIVE_PATTERN = /\b\w+(tion|ment|ness|ity|ism|er|or|ist|ance|ence|ship|hood|dom|age|ure|s)?\s+(who|which|that|whose|whom|where|when)\s+\w+/gi;

/** Noun + Participle pattern (past or present) */
const NOUN_PARTICIPLE_PATTERN = /\b\w+(tion|ment|ness|ity|ism|er|or|ist|ance|ence|ship|hood|dom|age|ure|s)?\s+(being|having|made|given|taken|done|seen|known|found|used|called|based|located|related|associated|connected|involved|required|expected|needed|caused|produced|created|developed|designed|intended|meant|supposed)\b/gi;

/** Participle + Noun pattern (premodification) */
const PARTICIPLE_NOUN_PATTERN = /\b(increasing|decreasing|growing|developing|changing|improving|worsening|ongoing|underlying|resulting|remaining|existing|following|preceding|leading|emerging|continuing|persisting|recurring|corresponding|accompanying|surrounding|supporting|related|associated|combined|integrated|expected|required|needed|recommended|suggested|proposed|reported|documented|observed|noted|mentioned|described|indicated|demonstrated|established|confirmed|identified|recognized|acknowledged)\s+\w+(tion|ment|ness|ity|ism|er|or|ist|ance|ence|ship|hood|dom|age|ure|s)?\b/gi;

/** Gerund as subject pattern */
const GERUND_SUBJECT_PATTERN = /^(Taking|Making|Having|Being|Doing|Going|Getting|Giving|Finding|Using|Keeping|Providing|Managing|Performing|Conducting|Assessing|Evaluating|Determining|Establishing|Implementing)\s+\w+/gi;

/**
 * Detect complex nominals in a sentence.
 *
 * Based on Lu (2010, 2011) definition:
 * Complex nominals = NPs with pre/post modification that add
 * semantic or structural complexity.
 *
 * @param sentence - Sentence to analyze
 * @returns Array of detected complex nominals
 */
export function detectComplexNominals(sentence: string): ComplexNominal[] {
  const complexNominals: ComplexNominal[] = [];

  // 1. Adjective + Noun
  let match;
  const adjNounRegex = new RegExp(ADJ_NOUN_PATTERN.source, 'gi');
  while ((match = adjNounRegex.exec(sentence)) !== null) {
    complexNominals.push({
      phrase: match[0],
      modificationType: 'adjective',
      position: match.index
    });
  }

  // 2. Noun + Prepositional Phrase
  const nounPPRegex = new RegExp(NOUN_PP_PATTERN.source, 'gi');
  while ((match = nounPPRegex.exec(sentence)) !== null) {
    complexNominals.push({
      phrase: match[0],
      modificationType: 'prepositional',
      position: match.index
    });
  }

  // 3. Noun + Relative Clause
  const nounRelRegex = new RegExp(NOUN_RELATIVE_PATTERN.source, 'gi');
  while ((match = nounRelRegex.exec(sentence)) !== null) {
    complexNominals.push({
      phrase: match[0],
      modificationType: 'relative',
      position: match.index
    });
  }

  // 4. Noun + Participle
  const nounPartRegex = new RegExp(NOUN_PARTICIPLE_PATTERN.source, 'gi');
  while ((match = nounPartRegex.exec(sentence)) !== null) {
    complexNominals.push({
      phrase: match[0],
      modificationType: 'participle',
      position: match.index
    });
  }

  // 5. Participle + Noun (premodification)
  const partNounRegex = new RegExp(PARTICIPLE_NOUN_PATTERN.source, 'gi');
  while ((match = partNounRegex.exec(sentence)) !== null) {
    complexNominals.push({
      phrase: match[0],
      modificationType: 'participle',
      position: match.index
    });
  }

  // 6. Gerund as subject
  const gerundRegex = new RegExp(GERUND_SUBJECT_PATTERN.source, 'gi');
  while ((match = gerundRegex.exec(sentence)) !== null) {
    complexNominals.push({
      phrase: match[0],
      modificationType: 'participle',
      position: match.index
    });
  }

  // Remove duplicates based on position
  const uniqueNominals = complexNominals.filter((cn, index, self) =>
    index === self.findIndex(other =>
      Math.abs(other.position - cn.position) < 5 && other.modificationType === cn.modificationType
    )
  );

  return uniqueNominals;
}

/**
 * Calculate T-unit metrics for multi-sentence text.
 *
 * T-unit = minimal terminable unit (Hunt, 1965)
 * = one main clause + all attached subordinate clauses
 *
 * @param text - Text with multiple sentences
 * @returns T-unit metrics
 */
export function calculateTUnitMetrics(text: string): TUnitMetrics {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return {
      tUnitCount: 0,
      meanLengthOfSentence: 0,
      meanLengthOfTUnit: 0,
      clausesPerTUnit: 0,
      complexTUnitsRatio: 0,
      coordinatePhrasesPerTUnit: 0,
      verbPhrasesPerTUnit: 0
    };
  }

  let totalWords = 0;
  let totalTUnits = 0;
  let totalClauses = 0;
  let complexTUnits = 0;
  let totalCoordPhrases = 0;
  let totalVerbPhrases = 0;

  for (const sentence of sentences) {
    const words = tokenize(sentence);
    totalWords += words.length;

    const clauseAnalysis = analyzeClauseStructure(sentence);
    const clauses = clauseAnalysis.mainClauses + clauseAnalysis.subordinateClauses;
    totalClauses += clauses;

    // T-units = main clauses (each main clause starts a T-unit)
    totalTUnits += clauseAnalysis.mainClauses;

    // Complex T-units = T-units with at least one subordinate clause
    if (clauseAnalysis.subordinateClauses > 0) {
      complexTUnits += Math.min(clauseAnalysis.mainClauses, clauseAnalysis.subordinateClauses);
    }

    // Coordinate phrases (simplified: count coordinating conjunctions)
    totalCoordPhrases += clauseAnalysis.coordinationCount;

    // Verb phrases (simplified: count verbs)
    const verbMatches = sentence.match(VERB_PATTERNS) || [];
    totalVerbPhrases += verbMatches.length;
  }

  const tUnitCount = Math.max(totalTUnits, 1);

  return {
    tUnitCount,
    meanLengthOfSentence: totalWords / sentences.length,
    meanLengthOfTUnit: totalWords / tUnitCount,
    clausesPerTUnit: totalClauses / tUnitCount,
    complexTUnitsRatio: complexTUnits / tUnitCount,
    coordinatePhrasesPerTUnit: totalCoordPhrases / tUnitCount,
    verbPhrasesPerTUnit: totalVerbPhrases / tUnitCount
  };
}

/**
 * Calculate full Lu (2010, 2011) metrics for a text.
 *
 * @param text - Text to analyze
 * @returns Object with all Lu metrics
 */
export function calculateLuMetrics(text: string): {
  MLC: number;  // Mean Length of Clause
  CNC: number;  // Complex Nominals per Clause
  DCC: number;  // Dependent Clauses per Clause
  MLS: number;  // Mean Length of Sentence
  MLT: number;  // Mean Length of T-unit
  CT: number;   // Clauses per T-unit
  CTT: number;  // Complex T-units per T-unit
} {
  const complexity = analyzeSyntacticComplexity(text);
  const tUnitMetrics = calculateTUnitMetrics(text);

  return {
    MLC: complexity.meanLengthOfClause,
    CNC: complexity.complexNominalsPerClause,
    DCC: complexity.dependentClausesPerClause,
    MLS: tUnitMetrics.meanLengthOfSentence,
    MLT: tUnitMetrics.meanLengthOfTUnit,
    CT: tUnitMetrics.clausesPerTUnit,
    CTT: tUnitMetrics.complexTUnitsRatio
  };
}

// ============================================================================
// CEFR Estimation
// ============================================================================

/**
 * Estimate CEFR level from syntactic complexity.
 */
export function estimateCEFRLevel(metrics: SyntacticComplexity): CEFRLevel {
  const score = metrics.complexityScore;

  if (score <= 0.15) return 'A1';
  if (score <= 0.3) return 'A2';
  if (score <= 0.5) return 'B1';
  if (score <= 0.7) return 'B2';
  if (score <= 0.85) return 'C1';
  return 'C2';
}

/**
 * Calculate overall complexity score (0-1).
 */
function calculateComplexityScore(metrics: SyntacticComplexity): number {
  // Weighted combination of metrics
  const weights = {
    sentenceLength: 0.2,
    dependencyDepth: 0.15,
    clauseCount: 0.15,
    subordinationIndex: 0.2,
    passiveRatio: 0.1,
    nominalRatio: 0.1,
    averageDependencyDistance: 0.1
  };

  // Normalize each metric against C2 targets
  const c2 = CEFR_COMPLEXITY_TARGETS['C2'];

  const normalized = {
    sentenceLength: Math.min(1, metrics.sentenceLength / c2.sentenceLength),
    dependencyDepth: Math.min(1, metrics.dependencyDepth / c2.dependencyDepth),
    clauseCount: Math.min(1, metrics.clauseCount / c2.clauseCount),
    subordinationIndex: Math.min(1, metrics.subordinationIndex / c2.subordinationIndex),
    passiveRatio: Math.min(1, metrics.passiveRatio / c2.passiveRatio),
    nominalRatio: Math.min(1, metrics.nominalRatio / c2.nominalRatio),
    averageDependencyDistance: Math.min(1, metrics.averageDependencyDistance / c2.averageDependencyDistance)
  };

  // Weighted sum
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += normalized[key as keyof typeof normalized] * weight;
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Check if text matches a target CEFR level.
 */
export function matchesCEFRLevel(
  text: string,
  targetLevel: CEFRLevel,
  tolerance: number = 0.15
): boolean {
  const analysis = analyzeSyntacticComplexity(text);
  const target = CEFR_COMPLEXITY_TARGETS[targetLevel];

  return Math.abs(analysis.complexityScore - target.complexityScore) <= tolerance;
}

/**
 * Get recommended simplifications to reach a lower CEFR level.
 */
export function getSimplificationSuggestions(
  text: string,
  targetLevel: CEFRLevel
): string[] {
  const current = analyzeSyntacticComplexity(text);
  const target = CEFR_COMPLEXITY_TARGETS[targetLevel];
  const suggestions: string[] = [];

  if (current.sentenceLength > target.sentenceLength * 1.2) {
    suggestions.push('Split long sentences into shorter ones');
  }

  if (current.subordinationIndex > target.subordinationIndex * 1.3) {
    suggestions.push('Replace subordinate clauses with simple sentences');
  }

  if (current.passiveRatio > target.passiveRatio * 1.5) {
    suggestions.push('Convert passive voice to active voice');
  }

  if (current.nominalRatio > target.nominalRatio * 1.2) {
    suggestions.push('Use more verbs instead of nominalized forms');
  }

  if (current.clauseCount > target.clauseCount * 1.3) {
    suggestions.push('Reduce the number of clauses per sentence');
  }

  return suggestions;
}

// ============================================================================
// Vector Generation
// ============================================================================

/**
 * Estimate part of speech for a word (heuristic).
 */
export function estimatePartOfSpeech(word: string): PartOfSpeech {
  const lower = word.toLowerCase();

  // Determiners
  if (['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their'].includes(lower)) {
    return 'determiner';
  }

  // Pronouns
  if (['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'myself', 'yourself'].includes(lower)) {
    return 'pronoun';
  }

  // Prepositions
  if (['in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'of', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'over'].includes(lower)) {
    return 'preposition';
  }

  // Conjunctions
  if (['and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'because', 'although', 'if', 'when', 'while', 'unless', 'since', 'that', 'which', 'who'].includes(lower)) {
    return 'conjunction';
  }

  // Auxiliaries
  if (['is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'might', 'may', 'must', 'shall', 'can'].includes(lower)) {
    return 'auxiliary';
  }

  // Suffix-based detection
  if (/ly$/.test(lower) && lower.length > 3) return 'adverb';
  if (/(tion|ment|ness|ity|ism|er|or|ist|ance|ence|ship|hood|dom)$/.test(lower)) return 'noun';
  if (/(ful|less|ous|ive|al|ic|able|ible|ary|ory)$/.test(lower)) return 'adjective';
  if (/(ize|ise|ify|ate|en)$/.test(lower)) return 'verb';
  if (/ing$/.test(lower)) return 'verb'; // Could be noun (gerund), but verb is safer
  if (/ed$/.test(lower)) return 'verb';

  return 'unknown';
}

/**
 * Generate syntactic vector for a word/phrase.
 */
export function toSyntacticVector(
  word: string,
  context?: string
): SyntacticVector {
  const pos = estimatePartOfSpeech(word);
  const subcategorization = inferSubcategorization(word, pos);
  const argumentStructure = inferArgumentStructure(word, pos);

  // Estimate complexity from word and context
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  let requiredLevel: CEFRLevel = 'A1';

  if (context) {
    const contextAnalysis = analyzeSyntacticComplexity(context);
    requiredLevel = contextAnalysis.estimatedCEFR;

    if (contextAnalysis.complexityScore > 0.6) complexity = 'complex';
    else if (contextAnalysis.complexityScore > 0.3) complexity = 'moderate';
  }

  return {
    partOfSpeech: pos,
    subcategorization,
    argumentStructure,
    complexity,
    requiredLevel
  };
}

/**
 * Infer subcategorization frames for verbs.
 */
function inferSubcategorization(word: string, pos: PartOfSpeech): string[] {
  if (pos !== 'verb') return [];

  const frames: string[] = [];
  const lower = word.toLowerCase();

  // Common transitive verbs
  const transitiveVerbs = ['make', 'take', 'give', 'get', 'see', 'know', 'find', 'tell', 'ask', 'use', 'put', 'keep', 'let', 'begin', 'show', 'hear', 'play', 'run', 'move', 'live'];

  // Common intransitive verbs
  const intransitiveVerbs = ['go', 'come', 'arrive', 'appear', 'happen', 'exist', 'die', 'sleep', 'laugh', 'cry', 'walk', 'sit', 'stand', 'fall'];

  // Ditransitive verbs
  const ditransitiveVerbs = ['give', 'tell', 'show', 'send', 'offer', 'teach', 'bring', 'lend', 'pass', 'write'];

  if (transitiveVerbs.includes(lower)) frames.push('+transitive');
  if (intransitiveVerbs.includes(lower)) frames.push('+intransitive');
  if (ditransitiveVerbs.includes(lower)) frames.push('+ditransitive');

  // Default to transitive if unknown verb
  if (frames.length === 0 && pos === 'verb') {
    frames.push('+transitive');
  }

  return frames;
}

/**
 * Infer argument structure pattern.
 */
function inferArgumentStructure(word: string, pos: PartOfSpeech): string {
  if (pos !== 'verb') return 'N/A';

  const lower = word.toLowerCase();

  // Linking verbs
  if (['be', 'is', 'are', 'was', 'were', 'seem', 'appear', 'become', 'remain'].includes(lower)) {
    return 'Subject-Linking Verb-Complement';
  }

  // Ditransitive pattern
  if (['give', 'tell', 'show', 'send', 'offer'].includes(lower)) {
    return 'Subject-Verb-Indirect Object-Direct Object';
  }

  // Default transitive
  return 'Subject-Verb-Object';
}

// ============================================================================
// Genre Analysis
// ============================================================================

/**
 * Detect genre from text patterns.
 */
export function detectGenre(text: string): GenreStructure | null {
  const lower = text.toLowerCase();

  for (const genre of GENRE_STRUCTURES) {
    // Check for section markers
    const sectionMatches = genre.sections.filter(s =>
      lower.includes(s.toLowerCase() + ':') ||
      lower.includes(s.toLowerCase() + ' -')
    ).length;

    // Check for pattern matches
    const patternMatches = genre.patterns.filter(p =>
      lower.includes(p.toLowerCase().slice(0, 10))
    ).length;

    // If multiple markers match, likely this genre
    if (sectionMatches >= 2 || patternMatches >= 2) {
      return genre;
    }
  }

  return null;
}

/**
 * Analyze text against a specific genre structure.
 */
export function analyzeGenreCompliance(
  text: string,
  genre: GenreStructure
): { compliance: number; missingSections: string[]; suggestions: string[] } {
  const lower = text.toLowerCase();
  const missingSections: string[] = [];
  const suggestions: string[] = [];

  // Check sections
  for (const section of genre.sections) {
    if (!lower.includes(section.toLowerCase())) {
      missingSections.push(section);
      suggestions.push(`Add "${section}" section`);
    }
  }

  // Check complexity matches target
  const analysis = analyzeSyntacticComplexity(text);
  const minLevel = CEFR_COMPLEXITY_TARGETS[genre.targetCEFR.min];
  const maxLevel = CEFR_COMPLEXITY_TARGETS[genre.targetCEFR.max];

  if (analysis.complexityScore < minLevel.complexityScore) {
    suggestions.push(`Increase sentence complexity for ${genre.genre} style`);
  }
  if (analysis.complexityScore > maxLevel.complexityScore) {
    suggestions.push(`Simplify sentences for ${genre.genre} readability`);
  }

  const compliance = 1 - (missingSections.length / genre.sections.length);

  return { compliance, missingSections, suggestions };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Split text into sentences.
 */
function splitSentences(text: string): string[] {
  // Simple sentence splitting (handles common cases)
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);
}

/**
 * Tokenize a sentence into words.
 */
function tokenize(sentence: string): string[] {
  return sentence
    .replace(/[^\w\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Create empty complexity metrics.
 */
function createEmptyComplexity(): SyntacticComplexity {
  return {
    sentenceLength: 0,
    dependencyDepth: 0,
    clauseCount: 0,
    subordinationIndex: 0,
    passiveRatio: 0,
    nominalRatio: 0,
    averageDependencyDistance: 0,
    complexityScore: 0,
    estimatedCEFR: 'A1',
    // Lu metrics
    meanLengthOfClause: 0,
    complexNominalsPerClause: 0,
    dependentClausesPerClause: 0
  };
}

/**
 * Average multiple complexity metrics.
 */
function averageMetrics(metrics: SyntacticComplexity[]): SyntacticComplexity {
  if (metrics.length === 0) return createEmptyComplexity();

  const sum = metrics.reduce((acc, m) => ({
    sentenceLength: acc.sentenceLength + m.sentenceLength,
    dependencyDepth: acc.dependencyDepth + m.dependencyDepth,
    clauseCount: acc.clauseCount + m.clauseCount,
    subordinationIndex: acc.subordinationIndex + m.subordinationIndex,
    passiveRatio: acc.passiveRatio + m.passiveRatio,
    nominalRatio: acc.nominalRatio + m.nominalRatio,
    averageDependencyDistance: acc.averageDependencyDistance + m.averageDependencyDistance,
    complexityScore: 0,
    estimatedCEFR: 'A1' as CEFRLevel,
    // Lu metrics
    meanLengthOfClause: acc.meanLengthOfClause + m.meanLengthOfClause,
    complexNominalsPerClause: acc.complexNominalsPerClause + m.complexNominalsPerClause,
    dependentClausesPerClause: acc.dependentClausesPerClause + m.dependentClausesPerClause
  }), createEmptyComplexity());

  const n = metrics.length;
  return {
    sentenceLength: sum.sentenceLength / n,
    dependencyDepth: sum.dependencyDepth / n,
    clauseCount: sum.clauseCount / n,
    subordinationIndex: sum.subordinationIndex / n,
    passiveRatio: sum.passiveRatio / n,
    nominalRatio: sum.nominalRatio / n,
    averageDependencyDistance: sum.averageDependencyDistance / n,
    complexityScore: 0,
    estimatedCEFR: 'A1',
    // Lu metrics
    meanLengthOfClause: sum.meanLengthOfClause / n,
    complexNominalsPerClause: sum.complexNominalsPerClause / n,
    dependentClausesPerClause: sum.dependentClausesPerClause / n
  };
}

/**
 * Compare CEFR levels.
 */
export function compareCEFRLevels(a: CEFRLevel, b: CEFRLevel): number {
  const order: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return order.indexOf(a) - order.indexOf(b);
}

/**
 * Get next CEFR level.
 */
export function getNextCEFRLevel(current: CEFRLevel): CEFRLevel | null {
  const order: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

/**
 * Check if a sentence is suitable for a mastery stage.
 */
export function isSuitableForStage(
  sentence: string,
  stage: 0 | 1 | 2 | 3 | 4
): boolean {
  const analysis = analyzeSyntacticComplexity(sentence);

  // Map stages to CEFR targets
  const stageTargets: Record<number, CEFRLevel[]> = {
    0: ['A1'],
    1: ['A1', 'A2'],
    2: ['A2', 'B1'],
    3: ['B1', 'B2'],
    4: ['B2', 'C1', 'C2']
  };

  return stageTargets[stage].includes(analysis.estimatedCEFR);
}
