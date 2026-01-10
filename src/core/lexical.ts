/**
 * LOGOS Lexical Analysis Module
 *
 * Pure TypeScript implementation for lexical object extraction and analysis.
 * Extracts LEX objects from text with comprehensive linguistic features.
 *
 * Academic References:
 * - Nation, I.S.P. (2001). Learning Vocabulary in Another Language. Cambridge.
 * - Cobb, T. (2007). Computing the vocabulary demands of L2 reading. Language Learning & Technology.
 * - Laufer, B. & Nation, P. (1995). Vocabulary size and use: Lexical richness in L2 written production.
 *
 * Key Use Cases:
 * 1. LEX object extraction from corpus
 * 2. LanguageObjectVector.lexical computation
 * 3. Vocabulary profiling (frequency bands, academic word list)
 * 4. Collocation pattern detection
 *
 * @module core/lexical
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Part of speech categories for lexical analysis.
 */
export type LexicalPOS =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'determiner'
  | 'pronoun'
  | 'interjection'
  | 'particle'
  | 'auxiliary'
  | 'modal'
  | 'unknown';

/**
 * Frequency band classification based on corpus linguistics.
 * Based on Nation (2001) frequency levels.
 */
export type FrequencyBand =
  | 'k1'      // 1-1000 most frequent (core vocabulary)
  | 'k2'      // 1001-2000 (high frequency)
  | 'k3'      // 2001-3000 (mid-high frequency)
  | 'k4'      // 3001-4000 (mid frequency)
  | 'k5'      // 4001-5000 (mid-low frequency)
  | 'awl'     // Academic Word List (Coxhead, 2000)
  | 'offlist' // Not in top 5000 or AWL
  | 'unknown';

/**
 * Word family information for vocabulary acquisition.
 */
export interface WordFamily {
  /** Base form (headword) */
  headword: string;

  /** All family members */
  members: string[];

  /** Total family frequency (sum of all members) */
  familyFrequency: number;

  /** Part of speech of headword */
  headwordPOS: LexicalPOS;
}

/**
 * Collocation pattern with strength metrics.
 */
export interface CollocationPattern {
  /** Collocate word */
  collocate: string;

  /** Grammatical relationship */
  relation: 'verb_object' | 'adj_noun' | 'adv_verb' | 'noun_noun' | 'phrasal_verb' | 'compound';

  /** Mutual Information score */
  mi: number;

  /** T-score (frequency-weighted) */
  tScore: number;

  /** Log-likelihood ratio */
  logLikelihood: number;

  /** Example context */
  example?: string;
}

/**
 * Complete lexical analysis result for a word.
 */
export interface LexicalAnalysis {
  /** Surface form */
  word: string;

  /** Lemma (dictionary form) */
  lemma: string;

  /** Part of speech */
  pos: LexicalPOS;

  /** Frequency band */
  frequencyBand: FrequencyBand;

  /** Raw frequency (0-1 normalized) */
  frequency: number;

  /** Is this an Academic Word List item? */
  isAWL: boolean;

  /** Word family information */
  wordFamily?: WordFamily;

  /** Strong collocations */
  collocations: CollocationPattern[];

  /** Semantic domains */
  domains: string[];

  /** Register appropriateness */
  register: 'formal' | 'neutral' | 'informal' | 'technical' | 'colloquial';

  /** Polysemy count (number of distinct meanings) */
  polysemyCount: number;

  /** Concreteness rating (1-5, 5 = most concrete) */
  concreteness: number;

  /** Imageability rating (1-5, 5 = most imageable) */
  imageability: number;

  /** Age of acquisition estimate (years) */
  ageOfAcquisition?: number;
}

/**
 * Lexical vector for LanguageObjectVector.
 */
export interface LexicalVector {
  /** Lemma form */
  lemma: string;

  /** Part of speech */
  pos: LexicalPOS;

  /** Frequency band */
  frequencyBand: FrequencyBand;

  /** Normalized frequency (0-1) */
  frequency: number;

  /** Number of strong collocates */
  collocationCount: number;

  /** Polysemy level */
  polysemyLevel: 'monosemous' | 'low' | 'medium' | 'high';

  /** Semantic domains */
  domains: string[];

  /** Register */
  register: string;

  /** Concreteness (0-1) */
  concreteness: number;
}

/**
 * Extracted LEX object for the learning system.
 */
export interface LexicalObject {
  /** Unique identifier */
  id: string;

  /** Word content */
  content: string;

  /** Component type (always 'LEX') */
  type: 'LEX';

  /** Lexical analysis */
  analysis: LexicalAnalysis;

  /** Lexical vector for computation */
  vector: LexicalVector;

  /** FRE metrics */
  fre: {
    frequency: number;
    relationalDensity: number;
    contextualContribution: number;
  };

  /** IRT difficulty estimate */
  difficulty: number;

  /** Source corpus positions */
  positions: number[];
}

/**
 * Vocabulary profile summary for a text.
 */
export interface VocabularyProfile {
  /** Total tokens */
  totalTokens: number;

  /** Unique types */
  uniqueTypes: number;

  /** Type-Token Ratio */
  ttr: number;

  /** Coverage by frequency band */
  coverage: Record<FrequencyBand, { tokens: number; types: number; percentage: number }>;

  /** AWL coverage */
  awlCoverage: { tokens: number; types: number; percentage: number };

  /** Lexical density (content words / total words) */
  lexicalDensity: number;

  /** Estimated reading level */
  estimatedLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

// ============================================================================
// Constants
// ============================================================================

/**
 * K1 words (1000 most frequent).
 * Subset for demonstration - in production, use full BNC/COCA list.
 */
const K1_WORDS = new Set([
  // Function words
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'or', 'and', 'but',
  'not', 'what', 'all', 'when', 'we', 'you', 'they', 'he', 'she', 'it', 'i',
  'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'who', 'which', 'where', 'how', 'why', 'if', 'then', 'than', 'so', 'as',
  // Common content words
  'time', 'year', 'people', 'way', 'day', 'man', 'woman', 'child', 'world', 'life',
  'hand', 'part', 'place', 'case', 'week', 'company', 'system', 'program', 'question',
  'work', 'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother',
  'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye',
  'job', 'word', 'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend',
  'father', 'power', 'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city',
  'name', 'president', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back',
  'parent', 'face', 'others', 'level', 'office', 'door', 'health', 'person', 'art',
  'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research', 'girl',
  'guy', 'food', 'moment', 'air', 'teacher', 'force', 'education',
  // Common verbs
  'say', 'get', 'make', 'go', 'know', 'take', 'see', 'come', 'think', 'look',
  'want', 'give', 'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try',
  'leave', 'call', 'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own',
  'other', 'old', 'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early',
  'young', 'important', 'few', 'public', 'bad', 'same', 'able',
]);

/**
 * K2 words (1001-2000 most frequent).
 * Subset for demonstration.
 */
const K2_WORDS = new Set([
  'actually', 'address', 'affect', 'allow', 'amount', 'analysis', 'appear', 'apply',
  'approach', 'assume', 'attention', 'available', 'average', 'avoid', 'basic', 'basis',
  'behavior', 'benefit', 'budget', 'build', 'career', 'carry', 'category', 'cause',
  'challenge', 'character', 'choice', 'citizen', 'claim', 'class', 'clear', 'close',
  'college', 'comment', 'common', 'community', 'compare', 'computer', 'concern', 'condition',
  'consider', 'contain', 'continue', 'control', 'cost', 'country', 'couple', 'course',
  'court', 'cover', 'create', 'culture', 'current', 'customer', 'data', 'deal',
  'death', 'debate', 'decade', 'decision', 'defense', 'degree', 'describe', 'design',
  'detail', 'determine', 'develop', 'development', 'difference', 'difficult', 'director',
  'discover', 'discuss', 'disease', 'doctor', 'document', 'drive', 'drop', 'drug',
  'economy', 'effect', 'effort', 'election', 'employee', 'energy', 'enjoy', 'enter',
  'environment', 'especially', 'establish', 'event', 'evidence', 'example', 'exist',
  'expect', 'experience', 'expert', 'explain', 'factor', 'fail', 'fall', 'family',
  'federal', 'field', 'figure', 'fill', 'film', 'final', 'finally', 'financial',
  'fire', 'firm', 'follow', 'foreign', 'form', 'former', 'forward', 'free',
  'future', 'general', 'generation', 'goal', 'ground', 'group', 'grow', 'growth',
]);

/**
 * Academic Word List (AWL) - Coxhead (2000).
 * Subset for demonstration.
 */
const AWL_WORDS = new Set([
  'analyse', 'analyze', 'approach', 'area', 'assess', 'assume', 'authority', 'available',
  'benefit', 'concept', 'consist', 'constitute', 'context', 'contract', 'create', 'data',
  'define', 'derive', 'distribute', 'economy', 'environment', 'establish', 'estimate',
  'evident', 'export', 'factor', 'finance', 'formula', 'function', 'identify', 'income',
  'indicate', 'individual', 'interpret', 'involve', 'issue', 'labour', 'legal', 'legislate',
  'major', 'method', 'occur', 'percent', 'period', 'policy', 'principle', 'proceed',
  'process', 'require', 'research', 'respond', 'role', 'section', 'sector', 'significant',
  'similar', 'source', 'specific', 'structure', 'theory', 'vary', 'achieve', 'acquire',
  'administrate', 'affect', 'appropriate', 'aspect', 'assist', 'category', 'chapter',
  'commission', 'community', 'complex', 'compute', 'conclude', 'conduct', 'consequent',
  'construct', 'consume', 'credit', 'culture', 'design', 'distinct', 'element', 'equate',
  'evaluate', 'feature', 'final', 'focus', 'impact', 'injure', 'institute', 'invest',
  'item', 'journal', 'maintain', 'normal', 'obtain', 'participate', 'perceive', 'positive',
  'potential', 'previous', 'primary', 'purchase', 'range', 'region', 'regulate', 'relevant',
  'reside', 'resource', 'restrict', 'secure', 'seek', 'select', 'site', 'strategy',
  'survey', 'text', 'tradition', 'transfer',
]);

/**
 * Common POS patterns for heuristic tagging.
 */
const POS_PATTERNS: { pattern: RegExp; pos: LexicalPOS }[] = [
  // Verbs
  { pattern: /^(be|is|are|was|were|been|being)$/i, pos: 'auxiliary' },
  { pattern: /^(can|could|may|might|must|shall|should|will|would)$/i, pos: 'modal' },
  { pattern: /^(have|has|had|do|does|did)$/i, pos: 'auxiliary' },
  { pattern: /\b\w+ing$/i, pos: 'verb' },  // Progressive
  { pattern: /\b\w+ed$/i, pos: 'verb' },   // Past tense
  { pattern: /\b\w+s$/i, pos: 'verb' },    // 3rd person (ambiguous with noun plural)

  // Adverbs
  { pattern: /\b\w+ly$/i, pos: 'adverb' },

  // Adjectives
  { pattern: /\b\w+ful$/i, pos: 'adjective' },
  { pattern: /\b\w+less$/i, pos: 'adjective' },
  { pattern: /\b\w+ous$/i, pos: 'adjective' },
  { pattern: /\b\w+ive$/i, pos: 'adjective' },
  { pattern: /\b\w+able$/i, pos: 'adjective' },
  { pattern: /\b\w+ible$/i, pos: 'adjective' },

  // Nouns
  { pattern: /\b\w+tion$/i, pos: 'noun' },
  { pattern: /\b\w+sion$/i, pos: 'noun' },
  { pattern: /\b\w+ment$/i, pos: 'noun' },
  { pattern: /\b\w+ness$/i, pos: 'noun' },
  { pattern: /\b\w+ity$/i, pos: 'noun' },
  { pattern: /\b\w+er$/i, pos: 'noun' },
  { pattern: /\b\w+or$/i, pos: 'noun' },
  { pattern: /\b\w+ist$/i, pos: 'noun' },

  // Function words
  { pattern: /^(the|a|an)$/i, pos: 'determiner' },
  { pattern: /^(this|that|these|those)$/i, pos: 'determiner' },
  { pattern: /^(my|your|his|her|its|our|their)$/i, pos: 'determiner' },
  { pattern: /^(i|you|he|she|it|we|they|me|him|her|us|them)$/i, pos: 'pronoun' },
  { pattern: /^(who|whom|whose|which|what|that)$/i, pos: 'pronoun' },
  { pattern: /^(in|on|at|to|for|with|by|from|of|about|into|through|during|before|after|above|below|between|under|over)$/i, pos: 'preposition' },
  { pattern: /^(and|but|or|nor|so|yet|for)$/i, pos: 'conjunction' },
];

/**
 * Domain indicators - words that suggest specific domains.
 */
const DOMAIN_INDICATORS: Record<string, string[]> = {
  medical: ['diagnosis', 'treatment', 'patient', 'symptom', 'therapy', 'clinical', 'hospital', 'doctor', 'medicine', 'disease'],
  legal: ['court', 'law', 'judge', 'attorney', 'plaintiff', 'defendant', 'contract', 'liability', 'jurisdiction', 'statute'],
  business: ['profit', 'revenue', 'market', 'investment', 'stakeholder', 'strategy', 'management', 'corporate', 'merger', 'acquisition'],
  technology: ['algorithm', 'software', 'hardware', 'database', 'network', 'server', 'protocol', 'interface', 'encryption', 'bandwidth'],
  academic: ['research', 'hypothesis', 'methodology', 'analysis', 'conclusion', 'citation', 'thesis', 'dissertation', 'peer-review', 'publication'],
  science: ['experiment', 'hypothesis', 'variable', 'control', 'observation', 'theory', 'evidence', 'molecule', 'atom', 'organism'],
};

/**
 * Register indicators.
 */
const REGISTER_INDICATORS: Record<string, { words: string[]; register: LexicalAnalysis['register'] }> = {
  formal: {
    words: ['furthermore', 'moreover', 'consequently', 'nevertheless', 'henceforth', 'whereby', 'thereof', 'herein'],
    register: 'formal',
  },
  informal: {
    words: ['gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'yeah', 'nope', 'stuff', 'things', 'guy', 'guys'],
    register: 'informal',
  },
  colloquial: {
    words: ['awesome', 'cool', 'totally', 'literally', 'basically', 'actually', 'like', 'whatever'],
    register: 'colloquial',
  },
  technical: {
    words: ['parameter', 'optimize', 'implement', 'configure', 'instantiate', 'initialize', 'iterate', 'recursive'],
    register: 'technical',
  },
};

// ============================================================================
// Security Constants
// ============================================================================

/** Maximum text length to prevent memory exhaustion */
const MAX_TEXT_LENGTH = 1_000_000;

/** Maximum tokens to process */
const MAX_TOKENS = 100_000;

/** Maximum unique lemmas to track */
const MAX_UNIQUE_LEMMAS = 50_000;

/** Maximum positions to store per lemma */
const MAX_POSITIONS_PER_LEMMA = 1_000;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Tokenize text into words.
 *
 * @param text - Input text to tokenize
 * @returns Array of lowercase word tokens
 * @throws TypeError if input is not a string
 * @throws RangeError if input exceeds MAX_TEXT_LENGTH
 */
export function tokenize(text: string): string[] {
  // Input validation
  if (typeof text !== 'string') {
    throw new TypeError('tokenize() requires a string argument');
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new RangeError(`Input exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
  }

  if (text.length === 0) {
    return [];
  }

  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !/^\d+$/.test(w));
}

/**
 * Extract lemma from word (simplified).
 * In production, use a proper lemmatizer.
 */
export function extractLemma(word: string): string {
  const lower = word.toLowerCase();

  // Irregular verbs (subset)
  const irregulars: Record<string, string> = {
    'was': 'be', 'were': 'be', 'been': 'be', 'being': 'be', 'am': 'be', 'is': 'be', 'are': 'be',
    'had': 'have', 'has': 'have', 'having': 'have',
    'did': 'do', 'does': 'do', 'doing': 'do', 'done': 'do',
    'went': 'go', 'gone': 'go', 'going': 'go', 'goes': 'go',
    'said': 'say', 'says': 'say', 'saying': 'say',
    'made': 'make', 'makes': 'make', 'making': 'make',
    'took': 'take', 'taken': 'take', 'takes': 'take', 'taking': 'take',
    'came': 'come', 'comes': 'come', 'coming': 'come',
    'saw': 'see', 'seen': 'see', 'sees': 'see', 'seeing': 'see',
    'knew': 'know', 'known': 'know', 'knows': 'know', 'knowing': 'know',
    'thought': 'think', 'thinks': 'think', 'thinking': 'think',
    'got': 'get', 'gotten': 'get', 'gets': 'get', 'getting': 'get',
    'gave': 'give', 'given': 'give', 'gives': 'give', 'giving': 'give',
    'found': 'find', 'finds': 'find', 'finding': 'find',
    'told': 'tell', 'tells': 'tell', 'telling': 'tell',
    'felt': 'feel', 'feels': 'feel', 'feeling': 'feel',
    'left': 'leave', 'leaves': 'leave', 'leaving': 'leave',
    'called': 'call', 'calls': 'call', 'calling': 'call',
    'children': 'child', 'men': 'man', 'women': 'woman', 'people': 'person',
    'feet': 'foot', 'teeth': 'tooth', 'mice': 'mouse',
  };

  if (irregulars[lower]) {
    return irregulars[lower];
  }

  // Regular patterns
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';  // studies -> study
  }
  if (lower.endsWith('es') && lower.length > 3) {
    if (lower.endsWith('ches') || lower.endsWith('shes') || lower.endsWith('sses') || lower.endsWith('xes') || lower.endsWith('zes')) {
      return lower.slice(0, -2);  // watches -> watch
    }
  }
  if (lower.endsWith('s') && lower.length > 2 && !lower.endsWith('ss')) {
    return lower.slice(0, -1);  // dogs -> dog
  }
  if (lower.endsWith('ed') && lower.length > 3) {
    if (lower.endsWith('ied')) {
      return lower.slice(0, -3) + 'y';  // studied -> study
    }
    // Double consonant: stopped -> stop
    if (lower.length > 4 && lower[lower.length - 3] === lower[lower.length - 4]) {
      return lower.slice(0, -3);
    }
    return lower.slice(0, -2);  // walked -> walk
  }
  if (lower.endsWith('ing') && lower.length > 4) {
    // Double consonant: stopping -> stop
    if (lower.length > 5 && lower[lower.length - 4] === lower[lower.length - 5]) {
      return lower.slice(0, -4);
    }
    return lower.slice(0, -3);  // walking -> walk
  }

  return lower;
}

/**
 * Estimate part of speech using heuristics.
 */
export function estimatePOS(word: string): LexicalPOS {
  const lower = word.toLowerCase();

  for (const { pattern, pos } of POS_PATTERNS) {
    if (pattern.test(lower)) {
      return pos;
    }
  }

  // Default to noun for content words
  if (lower.length > 2) {
    return 'noun';
  }

  return 'unknown';
}

/**
 * Determine frequency band for a word.
 */
export function getFrequencyBand(word: string): FrequencyBand {
  const lower = word.toLowerCase();
  const lemma = extractLemma(lower);

  if (K1_WORDS.has(lower) || K1_WORDS.has(lemma)) {
    return 'k1';
  }
  if (K2_WORDS.has(lower) || K2_WORDS.has(lemma)) {
    return 'k2';
  }
  if (AWL_WORDS.has(lower) || AWL_WORDS.has(lemma)) {
    return 'awl';
  }

  // Estimate based on word properties
  const length = lower.length;
  if (length <= 4) return 'k3';
  if (length <= 6) return 'k4';
  if (length <= 8) return 'k5';

  return 'offlist';
}

/**
 * Check if word is in Academic Word List.
 */
export function isAWL(word: string): boolean {
  const lower = word.toLowerCase();
  const lemma = extractLemma(lower);
  return AWL_WORDS.has(lower) || AWL_WORDS.has(lemma);
}

/**
 * Detect semantic domains for a word.
 */
export function detectDomains(word: string): string[] {
  const lower = word.toLowerCase();
  const lemma = extractLemma(lower);
  const domains: string[] = [];

  for (const [domain, indicators] of Object.entries(DOMAIN_INDICATORS)) {
    if (indicators.includes(lower) || indicators.includes(lemma)) {
      domains.push(domain);
    }
  }

  // If no specific domain, mark as general
  if (domains.length === 0) {
    domains.push('general');
  }

  return domains;
}

/**
 * Detect register for a word.
 */
export function detectRegister(word: string): LexicalAnalysis['register'] {
  const lower = word.toLowerCase();

  for (const { words, register } of Object.values(REGISTER_INDICATORS)) {
    if (words.includes(lower)) {
      return register;
    }
  }

  // AWL words tend to be formal
  if (isAWL(lower)) {
    return 'formal';
  }

  return 'neutral';
}

/**
 * Estimate polysemy count based on word properties.
 * In production, use WordNet sense counts.
 */
export function estimatePolysemy(word: string): number {
  const lower = word.toLowerCase();
  const band = getFrequencyBand(lower);

  // High-frequency words tend to have more meanings
  switch (band) {
    case 'k1': return 5;
    case 'k2': return 3;
    case 'k3': return 2;
    default: return 1;
  }
}

/**
 * Estimate concreteness (1-5 scale).
 * In production, use MRC Psycholinguistic Database.
 */
export function estimateConcreteness(word: string, pos: LexicalPOS): number {
  // Nouns tend to be more concrete
  if (pos === 'noun') {
    // Abstract noun suffixes
    if (word.endsWith('tion') || word.endsWith('ness') || word.endsWith('ity') || word.endsWith('ment')) {
      return 2;
    }
    return 4;
  }

  if (pos === 'verb') return 3;
  if (pos === 'adjective') return 2;
  if (pos === 'adverb') return 2;

  return 3;
}

/**
 * Estimate imageability (1-5 scale).
 */
export function estimateImageability(_word: string, pos: LexicalPOS, concreteness: number): number {
  // Imageability correlates with concreteness
  return Math.min(5, Math.max(1, concreteness + (pos === 'noun' ? 0.5 : -0.5)));
}

/**
 * Calculate difficulty based on lexical properties.
 */
export function calculateLexicalDifficulty(analysis: LexicalAnalysis): number {
  let difficulty = 0;

  // Frequency band contribution
  const bandDifficulty: Record<FrequencyBand, number> = {
    'k1': -2,
    'k2': -1,
    'k3': 0,
    'k4': 0.5,
    'k5': 1,
    'awl': 1.5,
    'offlist': 2,
    'unknown': 1,
  };
  difficulty += bandDifficulty[analysis.frequencyBand];

  // Polysemy adds difficulty
  difficulty += (analysis.polysemyCount - 1) * 0.2;

  // Abstract words are harder
  difficulty += (5 - analysis.concreteness) * 0.2;

  // Formal register slightly harder
  if (analysis.register === 'formal' || analysis.register === 'technical') {
    difficulty += 0.3;
  }

  // Clamp to IRT scale
  return Math.max(-3, Math.min(3, difficulty));
}

/**
 * Analyze a single word and produce LexicalAnalysis.
 */
export function analyzeLexical(word: string): LexicalAnalysis {
  const lemma = extractLemma(word);
  const pos = estimatePOS(word);
  const frequencyBand = getFrequencyBand(word);
  const domains = detectDomains(word);
  const register = detectRegister(word);
  const polysemyCount = estimatePolysemy(word);
  const concreteness = estimateConcreteness(word, pos);
  const imageability = estimateImageability(word, pos, concreteness);

  // Estimate raw frequency
  const frequencyMap: Record<FrequencyBand, number> = {
    'k1': 0.9, 'k2': 0.7, 'k3': 0.5, 'k4': 0.35, 'k5': 0.2, 'awl': 0.3, 'offlist': 0.1, 'unknown': 0.05,
  };
  const frequency = frequencyMap[frequencyBand];

  return {
    word,
    lemma,
    pos,
    frequencyBand,
    frequency,
    isAWL: isAWL(word),
    collocations: [], // Would be populated from corpus
    domains,
    register,
    polysemyCount,
    concreteness,
    imageability,
  };
}

/**
 * Convert LexicalAnalysis to LexicalVector.
 */
export function toLexicalVector(analysis: LexicalAnalysis): LexicalVector {
  const polysemyLevel: LexicalVector['polysemyLevel'] =
    analysis.polysemyCount === 1 ? 'monosemous' :
    analysis.polysemyCount <= 3 ? 'low' :
    analysis.polysemyCount <= 5 ? 'medium' : 'high';

  return {
    lemma: analysis.lemma,
    pos: analysis.pos,
    frequencyBand: analysis.frequencyBand,
    frequency: analysis.frequency,
    collocationCount: analysis.collocations.length,
    polysemyLevel,
    domains: analysis.domains,
    register: analysis.register,
    concreteness: analysis.concreteness / 5, // Normalize to 0-1
  };
}

/**
 * Extract LEX objects from text.
 *
 * Memory-safe implementation with configurable limits to prevent DoS.
 *
 * @param text - Input text to analyze
 * @returns Array of LexicalObject instances
 */
export function extractLexicalObjects(text: string): LexicalObject[] {
  const tokens = tokenize(text);

  // Guard against excessive token count
  const processTokens = tokens.length > MAX_TOKENS
    ? tokens.slice(0, MAX_TOKENS)
    : tokens;

  const seen = new Map<string, { count: number; positions: number[] }>();

  // Collect unique lemmas with positions (with memory limits)
  processTokens.forEach((token, index) => {
    const lemma = extractLemma(token);

    // Limit unique lemmas to prevent memory exhaustion
    if (!seen.has(lemma) && seen.size >= MAX_UNIQUE_LEMMAS) {
      return; // Skip new lemmas beyond limit
    }

    if (!seen.has(lemma)) {
      seen.set(lemma, { count: 0, positions: [] });
    }

    const entry = seen.get(lemma)!;
    entry.count++;

    // Limit positions array size per lemma
    if (entry.positions.length < MAX_POSITIONS_PER_LEMMA) {
      entry.positions.push(index);
    }
  });

  // Create LEX objects
  const objects: LexicalObject[] = [];
  let idCounter = 0;

  for (const [lemma, { positions }] of seen) {
    // Skip very short function words
    if (lemma.length < 2) continue;

    const analysis = analyzeLexical(lemma);
    const vector = toLexicalVector(analysis);
    const difficulty = calculateLexicalDifficulty(analysis);

    // Calculate FRE metrics
    const relationalDensity = analysis.collocations.length / 10; // Normalize
    const contextualContribution = analysis.polysemyCount > 1 ? 0.7 : 0.5;

    objects.push({
      id: `lex_${idCounter++}`,
      content: lemma,
      type: 'LEX',
      analysis,
      vector,
      fre: {
        frequency: analysis.frequency,
        relationalDensity: Math.min(1, relationalDensity),
        contextualContribution,
      },
      difficulty,
      positions,
    });
  }

  return objects;
}

/**
 * Create vocabulary profile for a text.
 */
export function createVocabularyProfile(text: string): VocabularyProfile {
  const tokens = tokenize(text);
  const totalTokens = tokens.length;
  const uniqueTypes = new Set(tokens.map(t => extractLemma(t))).size;
  const ttr = uniqueTypes / totalTokens;

  // Initialize coverage
  const coverage: VocabularyProfile['coverage'] = {
    k1: { tokens: 0, types: 0, percentage: 0 },
    k2: { tokens: 0, types: 0, percentage: 0 },
    k3: { tokens: 0, types: 0, percentage: 0 },
    k4: { tokens: 0, types: 0, percentage: 0 },
    k5: { tokens: 0, types: 0, percentage: 0 },
    awl: { tokens: 0, types: 0, percentage: 0 },
    offlist: { tokens: 0, types: 0, percentage: 0 },
    unknown: { tokens: 0, types: 0, percentage: 0 },
  };

  const typesPerBand = new Map<FrequencyBand, Set<string>>();
  for (const band of Object.keys(coverage) as FrequencyBand[]) {
    typesPerBand.set(band, new Set());
  }

  let awlTokens = 0;
  const awlTypes = new Set<string>();
  let contentWordCount = 0;

  // Analyze each token
  for (const token of tokens) {
    const lemma = extractLemma(token);
    const band = getFrequencyBand(token);
    const pos = estimatePOS(token);

    coverage[band].tokens++;
    typesPerBand.get(band)!.add(lemma);

    if (isAWL(token)) {
      awlTokens++;
      awlTypes.add(lemma);
    }

    // Content word check
    if (['noun', 'verb', 'adjective', 'adverb'].includes(pos)) {
      contentWordCount++;
    }
  }

  // Calculate percentages
  for (const band of Object.keys(coverage) as FrequencyBand[]) {
    coverage[band].types = typesPerBand.get(band)!.size;
    coverage[band].percentage = (coverage[band].tokens / totalTokens) * 100;
  }

  const awlCoverage = {
    tokens: awlTokens,
    types: awlTypes.size,
    percentage: (awlTokens / totalTokens) * 100,
  };

  const lexicalDensity = contentWordCount / totalTokens;

  // Estimate reading level based on coverage
  const k1k2Coverage = coverage.k1.percentage + coverage.k2.percentage;
  let estimatedLevel: VocabularyProfile['estimatedLevel'];
  if (k1k2Coverage > 95) estimatedLevel = 'A1';
  else if (k1k2Coverage > 90) estimatedLevel = 'A2';
  else if (k1k2Coverage > 85) estimatedLevel = 'B1';
  else if (k1k2Coverage > 80) estimatedLevel = 'B2';
  else if (k1k2Coverage > 75) estimatedLevel = 'C1';
  else estimatedLevel = 'C2';

  return {
    totalTokens,
    uniqueTypes,
    ttr,
    coverage,
    awlCoverage,
    lexicalDensity,
    estimatedLevel,
  };
}

/**
 * Get difficulty category label.
 */
export function getLexicalDifficultyCategory(difficulty: number): string {
  if (difficulty < -1.5) return 'very_easy';
  if (difficulty < -0.5) return 'easy';
  if (difficulty < 0.5) return 'moderate';
  if (difficulty < 1.5) return 'difficult';
  return 'very_difficult';
}

/**
 * Filter LEX objects by difficulty range.
 */
export function filterByDifficulty(
  objects: LexicalObject[],
  minDifficulty: number,
  maxDifficulty: number
): LexicalObject[] {
  return objects.filter(obj => obj.difficulty >= minDifficulty && obj.difficulty <= maxDifficulty);
}

/**
 * Filter LEX objects by frequency band.
 */
export function filterByFrequencyBand(
  objects: LexicalObject[],
  bands: FrequencyBand[]
): LexicalObject[] {
  return objects.filter(obj => bands.includes(obj.analysis.frequencyBand));
}

/**
 * Filter LEX objects by domain.
 */
export function filterByDomain(
  objects: LexicalObject[],
  domain: string
): LexicalObject[] {
  return objects.filter(obj => obj.analysis.domains.includes(domain));
}

/**
 * Sort LEX objects by priority for learning.
 * High frequency + high utility = high priority.
 */
export function sortByLearningPriority(objects: LexicalObject[]): LexicalObject[] {
  return [...objects].sort((a, b) => {
    // Primary: frequency (higher is better)
    const freqDiff = b.fre.frequency - a.fre.frequency;
    if (Math.abs(freqDiff) > 0.1) return freqDiff;

    // Secondary: relational density (higher is better)
    const relDiff = b.fre.relationalDensity - a.fre.relationalDensity;
    if (Math.abs(relDiff) > 0.1) return relDiff;

    // Tertiary: difficulty (easier first)
    return a.difficulty - b.difficulty;
  });
}
