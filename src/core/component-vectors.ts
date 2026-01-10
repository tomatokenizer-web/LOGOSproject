/**
 * Component-Specific z(w) Vector System
 *
 * Each language component (PHON, MORPH, LEX, SYNT, PRAG) has unique vector
 * dimensions reflecting its role in language interpretation/production and
 * learning characteristics.
 *
 * Academic Foundations:
 * - PHON: Ehri's G2P model, Vitevitch & Luce (2004) neighborhood density
 * - MORPH: Hay & Baayen (2005) productivity, MorphoLex (Sanchez-Gutierrez 2018)
 * - LEX: Nation (2001), Brysbaert concreteness, Kuperman AoA norms
 * - SYNT: Lu (2010, 2011) complexity metrics, Pienemann's Processability Theory
 * - PRAG: Brown & Levinson (1987) politeness, Joos (1967) five clocks
 *
 * Design Principle:
 * 1. Common base (BaseComponentVector): F, R, E + learning state
 * 2. Component-specific extensions: unique dimensions per component
 * 3. Cost modifiers: component dimensions affect learning cost
 */

import type { MasteryStage } from './types';
import type { ExposurePattern } from './state/component-object-state';

// =============================================================================
// Memory Safety Constants
// =============================================================================

/** Maximum array sizes for memory safety */
const MAX_COLLOCATIONS = 50;
const MAX_MISPRONUNCIATIONS = 20;
const MAX_KEY_FACTORS = 10;
const MAX_INTERVENTIONS = 5;
const MAX_CONTEXTS = 20;
const MAX_TASK_TYPES = 10;

// =============================================================================
// Component Code Type (Short Form)
// =============================================================================

/**
 * Short-form component codes for vector type discrimination.
 */
export type ComponentCode = 'PHON' | 'MORPH' | 'LEX' | 'SYNT' | 'PRAG';

/**
 * CEFR level type for syntactic complexity alignment.
 */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * Cognitive process types for task targeting.
 */
export type CognitiveProcess =
  | 'recognition'
  | 'recall'
  | 'production'
  | 'transformation'
  | 'analysis'
  | 'synthesis';

/**
 * Learning goal types.
 */
export type LearningGoal =
  | 'introduction'
  | 'practice'
  | 'stabilization'
  | 'automatization'
  | 'expansion';

/**
 * Task types for recommendations.
 */
export type TaskType =
  | 'recognition'
  | 'recall_cued'
  | 'recall_free'
  | 'production'
  | 'word_formation'
  | 'sentence_combining'
  | 'fill_blank'
  | 'error_correction'
  | 'register_shift'
  | 'collocation'
  | 'definition_match'
  | 'rapid_response'
  | 'timed'
  | 'clause_selection'
  | 'sentence_writing';

// =============================================================================
// Base Component Vector
// =============================================================================

/**
 * Base z(w) vector interface - common dimensions across all components.
 *
 * FRE metrics are interpreted differently per component:
 * - F (Frequency): How often this pattern/item occurs in target texts
 * - R (Relational Density): Hub score in component-specific network
 * - E (Contextual Contribution): Importance for meaning interpretation
 */
export interface BaseComponentVector {
  /** Unique identifier for the language object */
  objectId: string;

  /** Component type discriminator */
  componentType: ComponentCode;

  /** Content (word, pattern, rule) */
  content: string;

  // ========== FRE Metrics (Component-Specific Measurement) ==========

  /**
   * Frequency (F): 0-1 normalized
   * - PHON: Rule application frequency in lexicon
   * - MORPH: Affix type frequency across word families
   * - LEX: Word frequency in target corpus
   * - SYNT: Structure frequency in target genre
   * - PRAG: Convention frequency in target contexts
   */
  frequency: number;

  /**
   * Relational Density (R): 0-1 normalized
   * - PHON: Phonological neighborhood density
   * - MORPH: Morphological family size (familyFrequencySum)
   * - LEX: Collocation network centrality (PMI-weighted)
   * - SYNT: Clause embedding connectivity
   * - PRAG: Register flexibility (usability across contexts)
   */
  relationalDensity: number;

  /**
   * Contextual Contribution (E): 0-1 normalized
   * - PHON: Impact on lexical access (homophone disambiguation)
   * - MORPH: Semantic contribution of affix
   * - LEX: Information content in discourse
   * - SYNT: Discourse function importance
   * - PRAG: Face-threat mitigation value
   */
  contextualContribution: number;

  // ========== Common Learning State ==========

  /** Current mastery stage (0-4) */
  masteryStage: MasteryStage;

  /** Automation level from FSRS stability (0-1) */
  automationLevel: number;

  /** Usage space coverage (0-1) */
  usageSpaceCoverage: number;

  /** Goal-aligned priority score */
  priority: number;

  /** IRT difficulty parameter (logit scale, -3 to +3) */
  irtDifficulty: number;

  /** L1 transfer coefficient (-1 to +1, positive = helps) */
  l1TransferCoefficient: number;

  // ========== Prerequisite State ==========

  /** Prerequisites satisfied (cascade-aware) */
  prerequisitesSatisfied: boolean;

  /** Components this object supports (higher in cascade) */
  supportsComponents: ComponentCode[];

  /** Components this object depends on (lower in cascade) */
  dependsOnComponents: ComponentCode[];
}

// =============================================================================
// PHON Vector (Phonological/Orthographic Component)
// =============================================================================

/**
 * Predicted L1 mispronunciation entry.
 */
export interface PredictedMispronunciation {
  /** Expected incorrect pronunciation */
  mispronunciation: string;
  /** Probability of this error (0-1) */
  probability: number;
  /** Reason for the prediction */
  reason: string;
}

/**
 * PHONVector - Phonological component z(w) vector.
 *
 * Tracks grapheme-phoneme correspondence patterns, pronunciation difficulty,
 * and L1 interference effects.
 *
 * Academic basis:
 * - Ehri's G2P hierarchical model (alphabetic -> syllable -> word)
 * - Phonological neighborhood density effects (Vitevitch & Luce, 2004)
 * - L1 interference in pronunciation (Flege, 1995)
 */
export interface PHONVector extends BaseComponentVector {
  componentType: 'PHON';

  // ========== Phonological Core ==========

  /** Phonological representation (IPA) */
  phonemes: string[];

  /** Syllable structure pattern (e.g., CVC, CVCC) */
  syllableStructure: string;

  /** Number of syllables */
  syllableCount: number;

  /** Stress pattern (1=primary, 2=secondary, 0=unstressed) */
  stressPattern: number[];

  // ========== PHON-Specific Dimensions ==========

  /**
   * Phonological neighborhood density (0-1)
   * Number of phonologically similar words / max possible
   *
   * Priority impact: High density = higher generalization potential
   * Task design: Dense neighborhoods need discrimination tasks
   * Trajectory: Facilitates but also confuses during learning
   *
   * Based on: Vitevitch & Luce (2004)
   */
  phonologicalNeighborhoodDensity: number;

  /**
   * Grapheme-phoneme regularity (0-1)
   * 1 = fully regular, 0 = highly irregular (exception word)
   *
   * Priority impact: Irregular words need earlier explicit instruction
   * Task design: Irregular words need more visual/explicit training
   * Trajectory: Predicts time-to-automatization
   *
   * Computed from: G2P rule reliability scores
   */
  graphemePhonemeRegularity: number;

  /**
   * G2P entropy (bits)
   * Information-theoretic measure of spelling-pronunciation ambiguity
   *
   * Priority impact: High entropy = needs explicit instruction
   * Task design: High entropy words need decoding tasks
   *
   * Computed from: Shannon entropy across possible pronunciations
   */
  g2pEntropy: number;

  /**
   * Stress predictability (0-1)
   * How predictable stress is from spelling/morphology
   *
   * Priority impact: Unpredictable stress needs explicit teaching
   * Task design: Unpredictable items need prosody tasks
   *
   * Relevant for: Multi-syllable words
   */
  stressPredictability: number;

  /**
   * L1 transfer difficulty (0-1)
   * 0 = positive transfer, 1 = maximum interference
   *
   * Priority impact: High difficulty = earlier intervention
   * Task design: Interference patterns need contrastive tasks
   *
   * Based on: L1-L2 phoneme inventory comparison
   */
  l1TransferDifficulty: number;

  /** Predicted L1 mispronunciations */
  predictedMispronunciations: PredictedMispronunciation[];

  /** Position-specific difficulty breakdown */
  positionDifficulty: {
    initial: number;
    medial: number;
    final: number;
  };

  /** Silent letter presence */
  hasSilentLetters: boolean;

  /**
   * G2P hierarchical level readiness
   * Based on Ehri's model: alphabetic -> syllable -> word
   */
  hierarchicalLevel: 'alphabetic' | 'syllable' | 'word';

  /** G2P rules required for this word */
  requiredG2PRules: string[];

  // ========== Cost Modifier ==========

  /**
   * Cost modifier for priority calculation
   * Combines regularity, transfer, and neighborhood effects
   */
  phonologicalCostModifier: number;
}

// =============================================================================
// MORPH Vector (Morphological Component)
// =============================================================================

/**
 * Affix structure for morphological analysis.
 */
export interface Affix {
  /** Affix form (e.g., 'un-', '-tion') */
  form: string;
  /** Affix type */
  type: 'prefix' | 'suffix' | 'infix';
  /** Semantic function */
  meaning: string;
  /** How freely it combines (0-1) */
  productivity: number;
  /** Specific domains where used */
  domains?: string[];
}

/**
 * MORPHVector - Morphological component z(w) vector.
 *
 * Tracks word formation patterns, productivity, and derivational complexity.
 *
 * Academic basis:
 * - MorphoLex (Sanchez-Gutierrez et al., 2018) - family size effects
 * - Hay & Baayen (2005) - productivity measurement
 * - Nagy et al. (2006) - morphological awareness and vocabulary
 */
export interface MORPHVector extends BaseComponentVector {
  componentType: 'MORPH';

  // ========== Morphological Core ==========

  /** Root/stem of the word */
  root: string;

  /** Identified prefixes (in order) */
  prefixes: Affix[];

  /** Identified suffixes (in order) */
  suffixes: Affix[];

  /** Total morpheme count */
  morphemeCount: number;

  /** Inflection type */
  inflectionType:
    | 'none'
    | 'regular'
    | 'irregular'
    | 'suppletive'
    | 'zero';

  /** Derivation complexity */
  derivationType:
    | 'simple'
    | 'derived'
    | 'compound'
    | 'complex';

  // ========== MORPH-Specific Dimensions ==========

  /**
   * Productivity (0-1)
   * How freely this affix/pattern combines with new bases
   *
   * Priority impact: High productivity = higher transfer value
   * Task design: Productive affixes enable word formation tasks
   * Trajectory: Predicts generalization to novel words
   *
   * Based on: Hay & Baayen (2005) - P = hapax / token frequency
   */
  productivity: number;

  /**
   * Transparency (0-1)
   * How predictable the meaning is from component parts
   * 1 = fully compositional, 0 = idiomatic/opaque
   *
   * Priority impact: Transparent items can be taught via decomposition
   * Task design: Opaque items need whole-word approaches
   *
   * Example: "unhappy" = transparent; "understand" = opaque
   */
  transparency: number;

  /**
   * Morphological family size
   * Number of words sharing the same root
   *
   * Priority impact: Large families = high network value
   * Task design: Family members can be taught together
   *
   * Based on: MorphoLex (Sanchez-Gutierrez et al., 2018)
   */
  familySize: number;

  /**
   * Family frequency sum
   * Cumulative frequency of all family members
   *
   * Priority impact: High sum = more reinforcement opportunities
   *
   * Based on: MorphoLex methodology
   */
  familyFrequencySum: number;

  /**
   * Paradigm complexity (0-1)
   * For inflectional morphology: how complex is the paradigm?
   *
   * Priority impact: Complex paradigms need explicit teaching
   * Task design: Paradigm tasks (conjugation tables, etc.)
   *
   * Relevant for: Verbs (regular vs irregular), nouns (plurals)
   */
  paradigmComplexity: number;

  /**
   * Derivational depth
   * Number of derivational steps from root
   *
   * Priority impact: Deep derivations are harder
   * Task design: Build up from simpler derivations
   *
   * Example: nation -> national -> nationality -> denationalize (depth=3)
   */
  derivationalDepth: number;

  /**
   * Allomorph count
   * Number of variant forms of the morpheme
   *
   * Priority impact: More allomorphs = harder to learn pattern
   * Task design: Present allomorphs with conditioning contexts
   *
   * Example: plural -s/-es/-ies has 3+ allomorphs
   */
  allomorphCount: number;

  /**
   * Cross-linguistic morphological transfer (0-1)
   * L1 similarity of morphological patterns
   *
   * Priority impact: Positive transfer reduces learning cost
   */
  morphologicalTransferScore: number;

  /**
   * Semantic shift type (for derivational morphology)
   * What type of meaning change does the affix cause?
   */
  semanticShiftType?:
    | 'nominalization'
    | 'agentive'
    | 'causative'
    | 'adjectival'
    | 'adverbial'
    | 'negative'
    | 'none';

  /** Part-of-speech transformation */
  posTransformation?: {
    from: string;
    to: string;
  };

  /** Domain specificity */
  domainSpecificity: {
    isGeneral: boolean;
    specificDomains: string[];
  };

  // ========== Cost Modifier ==========

  /**
   * Cost modifier based on morphological properties
   * Combines productivity, transparency, family effects
   */
  morphologicalCostModifier: number;

  /**
   * Transfer potential to vocabulary acquisition
   * How much does learning this pattern help with new words?
   */
  vocabularyTransferPotential: number;
}

// =============================================================================
// LEX Vector (Lexical Component)
// =============================================================================

/**
 * Collocation entry with strength measure.
 */
export interface CollocationEntry {
  /** Collocate word */
  collocate: string;
  /** Pointwise Mutual Information score */
  pmi: number;
  /** Grammatical relation */
  relation: 'verb_object' | 'adj_noun' | 'adv_verb' | 'noun_noun' | 'other';
}

/**
 * Cognate status for L1-L2 transfer.
 */
export interface CognateStatus {
  /** Is this a cognate with learner's L1? */
  isCognate: boolean;
  /** L1 form if cognate */
  cognateL1Form?: string;
  /** Risk of false friend confusion */
  falseFriendRisk: boolean;
}

/**
 * Frequency band classification.
 */
export type FrequencyBand =
  | 'k1'       // 1-1000
  | 'k2'       // 1001-2000
  | 'k3'       // 2001-3000
  | 'k4'       // 3001-4000
  | 'k5'       // 4001-5000
  | 'awl'      // Academic Word List
  | 'offlist'; // Beyond 5000

/**
 * Lexical part of speech.
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
  | 'interjection';

/**
 * LEXVector - Lexical component z(w) vector.
 *
 * Tracks word-level properties, semantic relations, and usage patterns.
 *
 * Academic basis:
 * - Nation (2001) - vocabulary learning dimensions
 * - Laufer & Nation (1995) - lexical richness measures
 * - Brysbaert et al. (2014) - concreteness ratings
 * - Kuperman et al. (2012) - age of acquisition norms
 */
export interface LEXVector extends BaseComponentVector {
  componentType: 'LEX';

  // ========== Lexical Core ==========

  /** Lemma (dictionary form) */
  lemma: string;

  /** Part of speech */
  partOfSpeech: LexicalPOS;

  /** Frequency band (k1, k2, k3, awl, etc.) */
  frequencyBand: FrequencyBand;

  // ========== LEX-Specific Dimensions ==========

  /**
   * Concreteness (0-1)
   * 0 = abstract, 1 = concrete
   *
   * Priority impact: Concrete words easier to learn initially
   * Task design: Abstract words need context-rich tasks
   * Trajectory: Concrete -> abstract progression
   *
   * Based on: Brysbaert et al. (2014) concreteness ratings
   */
  concreteness: number;

  /**
   * Imageability (0-1)
   * How easily the word evokes a mental image
   *
   * Priority impact: High imageability = easier encoding
   * Task design: Low imageability needs semantic elaboration
   *
   * Based on: MRC Psycholinguistic Database
   */
  imageability: number;

  /**
   * Polysemy count
   * Number of distinct senses/meanings
   *
   * Priority impact: Polysemous words need more contexts
   * Task design: Multiple meaning tasks, disambiguation
   * Trajectory: Core sense first, then extensions
   *
   * Based on: WordNet sense count
   */
  polysemyCount: number;

  /** Polysemy level (derived from count) */
  polysemyLevel: 'monosemous' | 'low' | 'medium' | 'high';

  /**
   * Age of acquisition estimate (years)
   * Average age when L1 speakers learn this word
   *
   * Priority impact: Later-acquired words are harder
   * Task design: Earlier AoA words as scaffolds
   *
   * Based on: Kuperman et al. (2012) AoA norms
   */
  ageOfAcquisition: number;

  /**
   * Register flexibility (0-1)
   * Usability across formal/informal contexts
   *
   * Priority impact: Flexible words have higher utility
   * Task design: Restricted registers need context matching
   *
   * 1 = usable in all registers, 0 = highly restricted
   */
  registerFlexibility: number;

  /** Primary register */
  primaryRegister: 'informal' | 'neutral' | 'formal' | 'technical' | 'colloquial';

  /**
   * Collocation strength (aggregate)
   * Average PMI of significant collocations
   *
   * Priority impact: Strong collocations = teach with partners
   * Task design: Collocation completion/matching tasks
   */
  avgCollocationStrength: number;

  /** Number of strong collocates (PMI > threshold) */
  strongCollocateCount: number;

  /** Top collocations with PMI scores */
  topCollocations: CollocationEntry[];

  /** Semantic domain distribution */
  domainDistribution: Record<string, number>;

  /** Cognate status (for L1-specific learners) */
  cognateStatus: CognateStatus;

  /** Word family membership */
  wordFamily?: {
    headword: string;
    familyMembers: string[];
    familyFrequency: number;
  };

  /** Semantic field / domain tags */
  semanticFields: string[];

  /** Academic Word List membership */
  isAWL: boolean;

  /**
   * Contextual constraint strength (0-1)
   * How much context is needed to use correctly?
   *
   * Priority impact: High constraint = needs extensive context exposure
   */
  contextualConstraint: number;

  // ========== Cost Modifier ==========

  /** Cost modifier based on lexical properties */
  lexicalCostModifier: number;

  /**
   * Recommended learning sequence position
   * Based on concreteness, AoA, frequency
   */
  sequencePosition: 'early' | 'middle' | 'late';
}

// =============================================================================
// SYNT Vector (Syntactic Component)
// =============================================================================

/**
 * Subordinate clause types.
 */
export type SubordinateClauseType =
  | 'relative'
  | 'adverbial_time'
  | 'adverbial_reason'
  | 'adverbial_condition'
  | 'adverbial_concession'
  | 'complement_that'
  | 'complement_wh'
  | 'complement_infinitive';

/**
 * SYNTVector - Syntactic component z(w) vector.
 *
 * Tracks grammatical structure complexity and usage patterns.
 *
 * Academic basis:
 * - Lu (2010, 2011) - syntactic complexity measures
 * - CEFR complexity descriptors
 * - Pienemann's Processability Theory (1998, 2005)
 */
export interface SYNTVector extends BaseComponentVector {
  componentType: 'SYNT';

  // ========== Syntactic Core ==========

  /** Pattern representation (e.g., "NP V NP PP") */
  patternRepresentation: string;

  /** Subcategorization frame (e.g., [+transitive, +dative]) */
  subcategorizationFrame: string[];

  /** Argument structure pattern */
  argumentStructure: string;

  // ========== SYNT-Specific Dimensions (Lu 2010, 2011) ==========

  /**
   * Mean Length of Clause (MLC)
   * Average words per clause in structures using this pattern
   *
   * Priority impact: Higher MLC = more complex, later teaching
   * Task design: Build from short to long clauses
   *
   * Based on: Lu (2010)
   */
  meanLengthOfClause: number;

  /**
   * Complex Nominals per Clause (CN/C)
   * Noun phrases with modification per clause
   *
   * Priority impact: High CN/C = academic register, later teaching
   * Task design: Nominal expansion tasks
   *
   * Based on: Lu (2011) - discriminates proficiency well
   */
  complexNominalsPerClause: number;

  /**
   * Dependent Clauses per Clause (DC/C)
   * Subordination ratio
   *
   * Priority impact: Higher DC/C = more complex subordination
   * Task design: Clause combining tasks
   *
   * Based on: Lu (2010)
   */
  dependentClausesPerClause: number;

  /** Overall syntactic complexity (0-1) */
  complexityScore: number;

  /** Complexity category */
  complexityCategory: 'simple' | 'moderate' | 'complex' | 'highly_complex';

  /**
   * Argument structure complexity (0-1)
   * Number and optionality of arguments
   *
   * Priority impact: Complex argument structure = harder
   * Task design: Argument structure drills
   *
   * Example: ditransitive > transitive > intransitive
   */
  argumentComplexity: number;

  /** CEFR alignment */
  cefrLevel: CEFRLevel;

  /** CEFR complexity metrics */
  cefrMetrics: {
    targetSentenceLength: number;
    targetSubordinationIndex: number;
    targetPassiveRatio: number;
  };

  /**
   * Embedding depth
   * Maximum depth of nested clauses
   *
   * Priority impact: Deep embedding = high cognitive load
   * Task design: Incremental depth building
   */
  embeddingDepth: number;

  /** Subordination types supported */
  subordinationTypes: SubordinateClauseType[];

  /**
   * Average dependency distance
   * Mean distance between head and dependent
   *
   * Priority impact: Long distances = harder processing
   */
  avgDependencyDistance: number;

  /**
   * Processability level (Pienemann)
   * Which stage of Processability Theory?
   *
   * Priority impact: Must teach in sequence
   * Task design: Stage-appropriate tasks
   */
  processabilityStage: 1 | 2 | 3 | 4 | 5;

  /** Word order flexibility */
  wordOrderFlexibility: number;

  /** Genre association */
  genreAssociation: {
    narrative: number;
    expository: number;
    argumentative: number;
    instructional: number;
    conversational: number;
  };

  /** Voice support */
  voiceSupport: {
    active: boolean;
    passive: boolean;
    passiveDifficulty?: number;
  };

  /** Information structure patterns */
  informationStructure: ('topic-comment' | 'focus-presupposition' | 'given-new')[];

  // ========== Cost Modifier ==========

  /** Syntactic cost modifier */
  syntacticCostModifier: number;

  /** Recommended task progression */
  taskProgression: Array<{
    stage: number;
    taskTypes: TaskType[];
    complexity: number;
  }>;
}

// =============================================================================
// PRAG Vector (Pragmatic Component)
// =============================================================================

/**
 * Speech act types for pragmatic classification.
 */
export type SpeechActType =
  | 'greeting'
  | 'leave-taking'
  | 'introduction'
  | 'request'
  | 'command'
  | 'suggestion'
  | 'invitation'
  | 'offer'
  | 'promise'
  | 'threat'
  | 'warning'
  | 'apology'
  | 'thanks'
  | 'congratulation'
  | 'condolence'
  | 'complaint'
  | 'criticism'
  | 'compliment'
  | 'agreement'
  | 'disagreement'
  | 'refusal'
  | 'hedging'
  | 'clarification'
  | 'confirmation';

/**
 * Illocutionary force categories.
 */
export type IllocutionaryForce =
  | 'assertive'
  | 'directive'
  | 'commissive'
  | 'expressive'
  | 'declarative';

/**
 * Formality levels (Joos, 1967 five clocks).
 */
export type FormalityLevel =
  | 'intimate'
  | 'casual'
  | 'consultative'
  | 'formal'
  | 'frozen';

/**
 * Politeness strategies (Brown & Levinson, 1987).
 */
export type PolitenessStrategy =
  | 'bald-on-record'
  | 'positive-politeness'
  | 'negative-politeness'
  | 'off-record';

/**
 * Interlocutor relationship parameters.
 */
export interface InterlocutorRelationship {
  /** Relative power differential */
  powerDifferential: 'higher' | 'equal' | 'lower';
  /** Social distance */
  socialDistance: 'close' | 'neutral' | 'distant';
  /** Appropriateness score for this relationship */
  appropriateness: number;
}

/**
 * L1 pragmatic interference pattern.
 */
export interface PragmaticInterference {
  /** L1 language */
  l1: string;
  /** Type of interference */
  interferenceType: string;
  /** Description */
  description: string;
}

/**
 * PRAGVector - Pragmatic component z(w) vector.
 *
 * Tracks contextual appropriateness, register, and social dimensions.
 *
 * Academic basis:
 * - Brown & Levinson (1987) - Politeness theory
 * - Joos (1967) - Five clocks (register levels)
 * - Speech act theory (Austin, Searle)
 * - Halliday's register theory
 */
export interface PRAGVector extends BaseComponentVector {
  componentType: 'PRAG';

  // ========== Pragmatic Core ==========

  /** Speech act type this pattern realizes */
  speechActType: SpeechActType;

  /** Illocutionary force */
  illocutionaryForce: IllocutionaryForce;

  /** Primary communicative purpose */
  communicativePurpose:
    | 'inform'
    | 'request'
    | 'persuade'
    | 'apologize'
    | 'complain'
    | 'suggest'
    | 'refuse'
    | 'thank';

  // ========== PRAG-Specific Dimensions ==========

  /**
   * Register flexibility (0-1)
   * Usability across formality levels
   *
   * Priority impact: Flexible = higher utility
   * Task design: Register-specific contexts
   *
   * Based on: Joos (1967) five clocks
   */
  registerFlexibility: number;

  /** Primary formality level */
  primaryFormality: FormalityLevel;

  /** Appropriate formality range */
  formalityRange: {
    min: FormalityLevel;
    max: FormalityLevel;
  };

  /**
   * Cultural load (0-1)
   * How culture-specific is this convention?
   *
   * Priority impact: High load = needs explicit teaching
   * Task design: Cultural comparison tasks
   *
   * 0 = universal, 1 = highly culture-specific
   */
  culturalLoad: number;

  /** Cultural notes */
  culturalNotes: string[];

  /**
   * Politeness complexity (0-1)
   * How much politeness calibration is required?
   *
   * Priority impact: Complex politeness = advanced skill
   * Task design: Politeness gradient tasks
   *
   * Based on: Brown & Levinson (1987)
   */
  politenessComplexity: number;

  /** Politeness strategy (Brown & Levinson) */
  politenessStrategy: PolitenessStrategy;

  /**
   * Face-threat potential (0-1)
   * How threatening is this act to hearer's face?
   *
   * Priority impact: High threat = needs careful scaffolding
   * Task design: Face-saving strategy tasks
   *
   * Based on: Brown & Levinson FTA weightiness
   */
  faceThreatPotential: number;

  /** Face type threatened */
  faceType: 'positive' | 'negative' | 'both' | 'none';

  /**
   * Power differential sensitivity (0-1)
   * How much does power difference affect appropriateness?
   *
   * Priority impact: High sensitivity = teach with power context
   * Task design: Superior/equal/subordinate scenarios
   */
  powerSensitivity: number;

  /**
   * Social distance sensitivity (0-1)
   * How much does relationship closeness affect usage?
   *
   * Priority impact: High sensitivity = teach with relationship context
   */
  distanceSensitivity: number;

  /**
   * Imposition weight (0-1)
   * How much does the act impose on the hearer?
   *
   * Based on: Brown & Levinson's R (rank of imposition)
   */
  impositionWeight: number;

  /** Interlocutor relationship mapping */
  appropriateRelationships: InterlocutorRelationship[];

  /** Domain appropriateness */
  domainAppropriateness: Record<string, number>;

  /**
   * L1 pragmatic transfer risk (0-1)
   * Risk of negative transfer from L1 pragmatic norms
   *
   * Priority impact: High risk = explicit contrastive teaching
   */
  pragmaticTransferRisk: number;

  /** Common L1 interference patterns */
  l1InterferencePatterns: PragmaticInterference[];

  /** Indirect speech act flag */
  isIndirectSpeechAct: boolean;

  /**
   * Indirectness level (0-1)
   * 0 = direct/literal, 1 = highly indirect
   */
  indirectnessLevel: number;

  /** Mitigation devices available */
  mitigationDevices: string[];

  // ========== Cost Modifier ==========

  /** Pragmatic cost modifier */
  pragmaticCostModifier: number;

  /** Context requirements for teaching */
  requiredContextFeatures: {
    powerContext: boolean;
    distanceContext: boolean;
    domainContext: boolean;
    culturalContext: boolean;
  };

  /** Recommended scenarios for practice */
  recommendedScenarios: Array<{
    scenario: string;
    power: 'higher' | 'equal' | 'lower';
    distance: 'close' | 'neutral' | 'distant';
    domain: string;
  }>;
}

// =============================================================================
// Discriminated Union and Type Guards
// =============================================================================

/**
 * Discriminated union of all component vectors.
 * Use this for polymorphic handling of any component type.
 */
export type ComponentVector =
  | PHONVector
  | MORPHVector
  | LEXVector
  | SYNTVector
  | PRAGVector;

/**
 * Type guard for PHON vectors.
 */
export function isPHONVector(v: ComponentVector): v is PHONVector {
  return v.componentType === 'PHON';
}

/**
 * Type guard for MORPH vectors.
 */
export function isMORPHVector(v: ComponentVector): v is MORPHVector {
  return v.componentType === 'MORPH';
}

/**
 * Type guard for LEX vectors.
 */
export function isLEXVector(v: ComponentVector): v is LEXVector {
  return v.componentType === 'LEX';
}

/**
 * Type guard for SYNT vectors.
 */
export function isSYNTVector(v: ComponentVector): v is SYNTVector {
  return v.componentType === 'SYNT';
}

/**
 * Type guard for PRAG vectors.
 */
export function isPRAGVector(v: ComponentVector): v is PRAGVector {
  return v.componentType === 'PRAG';
}

// =============================================================================
// Cost Modifier Computation Functions
// =============================================================================

/**
 * Compute PHON cost modifier.
 *
 * Combines regularity, L1 transfer difficulty, and neighborhood effects.
 * Higher cost = more learning effort required.
 *
 * @param vector - PHON vector
 * @returns Cost modifier (0.5 to 2.0)
 */
export function computePHONCostModifier(vector: PHONVector): number {
  // Irregularity increases cost (1 - regularity)
  const irregularityCost = (1 - vector.graphemePhonemeRegularity) * 0.5;

  // L1 transfer difficulty increases cost
  const transferCost = vector.l1TransferDifficulty * 0.3;

  // High neighborhood density can be confusing initially
  const densityCost = vector.phonologicalNeighborhoodDensity > 0.7 ? 0.1 : 0;

  // Silent letters add complexity
  const silentLetterCost = vector.hasSilentLetters ? 0.1 : 0;

  // Base cost + modifiers
  const baseCost = 1.0;
  const totalCost = baseCost + irregularityCost + transferCost + densityCost + silentLetterCost;

  // Clamp to reasonable range
  return Math.max(0.5, Math.min(2.0, totalCost));
}

/**
 * Compute MORPH cost modifier.
 *
 * Combines productivity, transparency, and family size effects.
 * Productive, transparent patterns with large families are easier.
 *
 * @param vector - MORPH vector
 * @returns Cost modifier (0.5 to 2.0)
 */
export function computeMORPHCostModifier(vector: MORPHVector): number {
  // Low productivity increases cost
  const productivityCost = (1 - vector.productivity) * 0.3;

  // Low transparency increases cost
  const transparencyCost = (1 - vector.transparency) * 0.4;

  // Small family = less reinforcement = higher cost
  const familySizeBonus = Math.min(0.3, vector.familySize / 30 * 0.3);

  // Complex paradigms increase cost
  const paradigmCost = vector.paradigmComplexity * 0.2;

  // Deep derivation increases cost
  const derivationCost = Math.min(0.2, vector.derivationalDepth * 0.05);

  // Multiple allomorphs increase cost
  const allomorphCost = Math.min(0.15, (vector.allomorphCount - 1) * 0.05);

  // Base cost + modifiers - bonuses
  const baseCost = 1.0;
  const totalCost =
    baseCost +
    productivityCost +
    transparencyCost +
    paradigmCost +
    derivationCost +
    allomorphCost -
    familySizeBonus;

  return Math.max(0.5, Math.min(2.0, totalCost));
}

/**
 * Compute LEX cost modifier.
 *
 * Combines concreteness, polysemy, AoA, and cognate effects.
 * Concrete, low-polysemy cognates are easiest.
 *
 * @param vector - LEX vector
 * @returns Cost modifier (0.5 to 2.0)
 */
export function computeLEXCostModifier(vector: LEXVector): number {
  // Abstract words are harder (1 - concreteness)
  const abstractnessCost = (1 - vector.concreteness) * 0.25;

  // High polysemy increases cost
  const polysemyCost = Math.min(0.3, vector.polysemyCount / 10 * 0.3);

  // Later AoA increases cost
  const aoaCost = Math.min(0.25, (vector.ageOfAcquisition - 5) / 15 * 0.25);

  // Low register flexibility increases cost
  const registerCost = (1 - vector.registerFlexibility) * 0.1;

  // Cognate status affects cost
  let cognateEffect = 0;
  if (vector.cognateStatus.isCognate && !vector.cognateStatus.falseFriendRisk) {
    cognateEffect = -0.2; // Cognates are easier
  } else if (vector.cognateStatus.falseFriendRisk) {
    cognateEffect = 0.2; // False friends need extra attention
  }

  // Base cost + modifiers
  const baseCost = 1.0;
  const totalCost =
    baseCost + abstractnessCost + polysemyCost + aoaCost + registerCost + cognateEffect;

  return Math.max(0.5, Math.min(2.0, totalCost));
}

/**
 * Compute SYNT cost modifier.
 *
 * Combines complexity metrics, embedding depth, and processability stage.
 * Simple, shallow structures at early processability stages are easiest.
 *
 * @param vector - SYNT vector
 * @returns Cost modifier (0.5 to 2.0)
 */
export function computeSYNTCostModifier(vector: SYNTVector): number {
  // Overall complexity directly affects cost
  const complexityCost = vector.complexityScore * 0.4;

  // Deep embedding increases cost
  const embeddingCost = Math.min(0.3, vector.embeddingDepth * 0.1);

  // High argument complexity increases cost
  const argumentCost = vector.argumentComplexity * 0.15;

  // Long dependency distances increase cost
  const dependencyCost = Math.min(0.15, vector.avgDependencyDistance / 10 * 0.15);

  // Higher processability stage = more prerequisite knowledge
  const processabilityCost = (vector.processabilityStage - 1) * 0.05;

  // Base cost + modifiers
  const baseCost = 1.0;
  const totalCost =
    baseCost + complexityCost + embeddingCost + argumentCost + dependencyCost + processabilityCost;

  return Math.max(0.5, Math.min(2.0, totalCost));
}

/**
 * Compute PRAG cost modifier.
 *
 * Combines cultural load, politeness complexity, and face-threat potential.
 * Universal, simple, low-threat acts are easiest.
 *
 * @param vector - PRAG vector
 * @returns Cost modifier (0.5 to 2.0)
 */
export function computePRAGCostModifier(vector: PRAGVector): number {
  // High cultural load increases cost
  const culturalCost = vector.culturalLoad * 0.35;

  // Complex politeness increases cost
  const politenessCost = vector.politenessComplexity * 0.25;

  // High face-threat potential increases cost
  const faceThreatCost = vector.faceThreatPotential * 0.2;

  // High transfer risk increases cost
  const transferRiskCost = vector.pragmaticTransferRisk * 0.1;

  // High indirectness increases cost
  const indirectnessCost = vector.indirectnessLevel * 0.1;

  // Base cost + modifiers
  const baseCost = 1.0;
  const totalCost =
    baseCost + culturalCost + politenessCost + faceThreatCost + transferRiskCost + indirectnessCost;

  return Math.max(0.5, Math.min(2.0, totalCost));
}

/**
 * Compute cost modifier for any component vector.
 *
 * Dispatches to the appropriate component-specific function.
 *
 * @param vector - Any component vector
 * @returns Cost modifier (0.5 to 2.0)
 */
export function computeComponentCostModifier(vector: ComponentVector): number {
  switch (vector.componentType) {
    case 'PHON':
      return computePHONCostModifier(vector);
    case 'MORPH':
      return computeMORPHCostModifier(vector);
    case 'LEX':
      return computeLEXCostModifier(vector);
    case 'SYNT':
      return computeSYNTCostModifier(vector);
    case 'PRAG':
      return computePRAGCostModifier(vector);
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = vector;
      throw new Error(`Unknown component type: ${(_exhaustive as ComponentVector).componentType}`);
  }
}

// =============================================================================
// Priority Calculation Integration
// =============================================================================

/**
 * Priority weights for FRE calculation.
 */
export interface PriorityWeights {
  f: number; // Frequency weight
  r: number; // Relational density weight
  e: number; // Contextual contribution weight
}

/**
 * Default priority weights.
 */
export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  f: 0.4,
  r: 0.3,
  e: 0.3,
};

/**
 * User state for priority calculation.
 */
export interface ComponentUserState {
  theta: number;
  weights: PriorityWeights;
  l1Language?: string;
}

/**
 * Goal context for priority calculation.
 */
export interface GoalContext {
  targetDomains: string[];
  targetRegisters: string[];
  urgency: number;
}

/**
 * Extended priority calculation result using component-specific vectors.
 */
export interface ComponentPriorityCalculation {
  /** Object ID */
  objectId: string;

  /** Component type */
  componentType: ComponentCode;

  /** Base FRE score */
  freScore: number;

  /** Component-specific cost modifier */
  componentCostModifier: number;

  /** L1 transfer adjustment */
  transferAdjustment: number;

  /** Prerequisite penalty (if prerequisites not met) */
  prerequisitePenalty: number;

  /** Final priority score */
  priority: number;

  /** Factors contributing to priority */
  factors: {
    frequency: number;
    relationalDensity: number;
    contextualContribution: number;
    irtDifficulty: number;
    urgency: number;
    componentFactors: Record<string, number>;
  };
}

/**
 * Compute weighted FRE score.
 *
 * @param vector - Component vector with FRE metrics
 * @param weights - Priority weights
 * @returns FRE score (0-1)
 */
export function computeFREFromVector(
  vector: ComponentVector,
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS
): number {
  return (
    weights.f * vector.frequency +
    weights.r * vector.relationalDensity +
    weights.e * vector.contextualContribution
  );
}

/**
 * Compute priority for a component vector.
 *
 * Priority = FRE / (ComponentCost - TransferBonus + PrerequisitePenalty)
 *
 * @param vector - Component vector
 * @param userState - Current user state
 * @param goalContext - Optional goal context
 * @returns Detailed priority calculation
 */
export function computeComponentPriority(
  vector: ComponentVector,
  userState: ComponentUserState,
  goalContext?: GoalContext
): ComponentPriorityCalculation {
  // Base FRE score
  const freScore = computeFREFromVector(vector, userState.weights);

  // Component-specific cost modifier
  const componentCostModifier = computeComponentCostModifier(vector);

  // L1 transfer adjustment (positive = helps learning)
  const transferAdjustment = vector.l1TransferCoefficient * 0.2;

  // Prerequisite penalty
  const prerequisitePenalty = vector.prerequisitesSatisfied ? 0 : 0.5;

  // Urgency from goal context
  const urgency = goalContext?.urgency ?? 0;

  // Extract component-specific factors
  const componentFactors = extractComponentFactors(vector);

  // Final cost
  const cost = Math.max(
    0.1,
    componentCostModifier - transferAdjustment + prerequisitePenalty
  );

  // Final priority (FRE / Cost + urgency bonus)
  const priority = freScore / cost + urgency * 0.1;

  return {
    objectId: vector.objectId,
    componentType: vector.componentType,
    freScore,
    componentCostModifier,
    transferAdjustment,
    prerequisitePenalty,
    priority,
    factors: {
      frequency: vector.frequency,
      relationalDensity: vector.relationalDensity,
      contextualContribution: vector.contextualContribution,
      irtDifficulty: vector.irtDifficulty,
      urgency,
      componentFactors,
    },
  };
}

/**
 * Extract component-specific factors for debugging/analysis.
 */
function extractComponentFactors(vector: ComponentVector): Record<string, number> {
  switch (vector.componentType) {
    case 'PHON':
      return {
        neighborhoodDensity: vector.phonologicalNeighborhoodDensity,
        g2pRegularity: vector.graphemePhonemeRegularity,
        l1Difficulty: vector.l1TransferDifficulty,
        g2pEntropy: vector.g2pEntropy,
      };

    case 'MORPH':
      return {
        productivity: vector.productivity,
        transparency: vector.transparency,
        familySize: Math.min(1, vector.familySize / 30),
        derivationalDepth: Math.min(1, vector.derivationalDepth / 5),
        paradigmComplexity: vector.paradigmComplexity,
      };

    case 'LEX':
      return {
        concreteness: vector.concreteness,
        polysemy: Math.min(1, vector.polysemyCount / 10),
        ageOfAcquisition: Math.min(1, vector.ageOfAcquisition / 18),
        registerFlexibility: vector.registerFlexibility,
        collocationStrength: Math.min(1, vector.avgCollocationStrength / 10),
      };

    case 'SYNT':
      return {
        complexity: vector.complexityScore,
        mlc: Math.min(1, vector.meanLengthOfClause / 15),
        embeddingDepth: Math.min(1, vector.embeddingDepth / 5),
        argumentComplexity: vector.argumentComplexity,
        processabilityStage: vector.processabilityStage / 5,
      };

    case 'PRAG':
      return {
        registerFlexibility: vector.registerFlexibility,
        culturalLoad: vector.culturalLoad,
        politenessComplexity: vector.politenessComplexity,
        faceThreatPotential: vector.faceThreatPotential,
        indirectnessLevel: vector.indirectnessLevel,
      };

    default:
      return {};
  }
}

// =============================================================================
// Task Design Parameter Generation
// =============================================================================

/**
 * Task format types.
 */
export type TaskFormat =
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'free_response'
  | 'matching'
  | 'ordering'
  | 'error_identification'
  | 'transformation';

/**
 * Cue level for scaffolding.
 */
export type CueLevelType = 0 | 1 | 2 | 3;

/**
 * Task design parameters derived from component vector.
 */
export interface ComponentTaskDesignParams {
  /** Component type */
  componentType: ComponentCode;

  /** Recommended task types (ordered by suitability) */
  recommendedTaskTypes: TaskType[];

  /** Recommended task format */
  recommendedFormat: TaskFormat;

  /** Cognitive process to target */
  targetProcess: CognitiveProcess;

  /** Suggested contexts/scenarios */
  suggestedContexts: string[];

  /** Difficulty modifiers for this item */
  difficultyModifiers: Partial<Record<TaskType, number>>;

  /** Whether to include cues */
  includeCues: boolean;

  /** Cue level recommendation */
  recommendedCueLevel: CueLevelType;

  /** Time pressure appropriateness */
  timePressureAppropriate: boolean;

  /** Multimodal recommendations */
  modalityRecommendations: {
    visual: number;
    auditory: number;
    mixed: number;
  };
}

/**
 * Generate task design parameters from component vector.
 *
 * @param vector - Component vector
 * @param learningGoal - Current learning goal
 * @returns Task design parameters
 */
export function generateTaskDesignParams(
  vector: ComponentVector,
  learningGoal: LearningGoal
): ComponentTaskDesignParams {
  const includeCues = vector.masteryStage < 3;
  const recommendedCueLevel: CueLevelType = Math.min(3, Math.max(0, 3 - vector.masteryStage)) as CueLevelType;
  const timePressureAppropriate = learningGoal === 'stabilization' || learningGoal === 'automatization';

  switch (vector.componentType) {
    case 'PHON':
      return generatePHONTaskParams(vector, learningGoal, includeCues, recommendedCueLevel, timePressureAppropriate);

    case 'MORPH':
      return generateMORPHTaskParams(vector, learningGoal, includeCues, recommendedCueLevel, timePressureAppropriate);

    case 'LEX':
      return generateLEXTaskParams(vector, learningGoal, includeCues, recommendedCueLevel, timePressureAppropriate);

    case 'SYNT':
      return generateSYNTTaskParams(vector, learningGoal, includeCues, recommendedCueLevel, timePressureAppropriate);

    case 'PRAG':
      return generatePRAGTaskParams(vector, learningGoal, includeCues, recommendedCueLevel, timePressureAppropriate);
  }
}

function generatePHONTaskParams(
  vector: PHONVector,
  _learningGoal: LearningGoal,
  includeCues: boolean,
  recommendedCueLevel: CueLevelType,
  timePressureAppropriate: boolean
): ComponentTaskDesignParams {
  // Irregular patterns need more explicit instruction
  const recommendedTaskTypes: TaskType[] =
    vector.graphemePhonemeRegularity < 0.5
      ? ['recognition', 'recall_cued', 'production']
      : ['rapid_response', 'production', 'timed'];

  const targetProcess: CognitiveProcess =
    vector.hierarchicalLevel === 'alphabetic' ? 'recognition' : 'production';

  const suggestedContexts = vector.requiredG2PRules.slice(0, MAX_CONTEXTS);

  return {
    componentType: 'PHON',
    recommendedTaskTypes: recommendedTaskTypes.slice(0, MAX_TASK_TYPES),
    recommendedFormat: vector.graphemePhonemeRegularity < 0.5 ? 'multiple_choice' : 'free_response',
    targetProcess,
    suggestedContexts,
    difficultyModifiers: {
      recognition: 0.8,
      production: 1.2 + (1 - vector.graphemePhonemeRegularity) * 0.3,
      rapid_response: 1.0,
    },
    includeCues,
    recommendedCueLevel,
    timePressureAppropriate: timePressureAppropriate && vector.masteryStage >= 2,
    modalityRecommendations: {
      visual: 0.7,
      auditory: 0.9,
      mixed: 0.8,
    },
  };
}

function generateMORPHTaskParams(
  vector: MORPHVector,
  _learningGoal: LearningGoal,
  includeCues: boolean,
  recommendedCueLevel: CueLevelType,
  timePressureAppropriate: boolean
): ComponentTaskDesignParams {
  // Transparent morphology allows word formation tasks
  const recommendedTaskTypes: TaskType[] =
    vector.transparency > 0.7
      ? ['word_formation', 'recall_free', 'production']
      : ['recognition', 'recall_cued', 'fill_blank'];

  const targetProcess: CognitiveProcess =
    vector.productivity > 0.7 ? 'transformation' : 'recall';

  // Use domain specificity for context suggestions
  const suggestedContexts = vector.domainSpecificity.specificDomains.slice(0, MAX_CONTEXTS);

  return {
    componentType: 'MORPH',
    recommendedTaskTypes: recommendedTaskTypes.slice(0, MAX_TASK_TYPES),
    recommendedFormat: vector.productivity > 0.7 ? 'transformation' : 'fill_in_blank',
    targetProcess,
    suggestedContexts,
    difficultyModifiers: {
      word_formation: 1.0 - vector.productivity * 0.3,
      recognition: 0.7,
      recall_cued: 0.9,
      fill_blank: 1.0,
    },
    includeCues,
    recommendedCueLevel,
    timePressureAppropriate,
    modalityRecommendations: {
      visual: 0.9,
      auditory: 0.4,
      mixed: 0.6,
    },
  };
}

function generateLEXTaskParams(
  vector: LEXVector,
  learningGoal: LearningGoal,
  includeCues: boolean,
  recommendedCueLevel: CueLevelType,
  timePressureAppropriate: boolean
): ComponentTaskDesignParams {
  // Concrete words can use definition matching
  const recommendedTaskTypes: TaskType[] =
    vector.concreteness > 0.6
      ? ['definition_match', 'recall_free', 'production']
      : ['recall_cued', 'fill_blank', 'collocation'];

  const targetProcess: CognitiveProcess =
    learningGoal === 'stabilization' ? 'recall' : 'production';

  // Use collocations for context suggestions
  const suggestedContexts = vector.topCollocations
    .slice(0, MAX_CONTEXTS)
    .map(c => c.collocate);

  return {
    componentType: 'LEX',
    recommendedTaskTypes: recommendedTaskTypes.slice(0, MAX_TASK_TYPES),
    recommendedFormat: vector.polysemyCount > 3 ? 'multiple_choice' : 'free_response',
    targetProcess,
    suggestedContexts,
    difficultyModifiers: {
      definition_match: 0.8 + (1 - vector.concreteness) * 0.3,
      recall_free: 1.0,
      collocation: 0.9,
      production: 1.2,
    },
    includeCues,
    recommendedCueLevel,
    timePressureAppropriate,
    modalityRecommendations: {
      visual: 0.8,
      auditory: 0.6,
      mixed: 0.7,
    },
  };
}

function generateSYNTTaskParams(
  vector: SYNTVector,
  _learningGoal: LearningGoal,
  includeCues: boolean,
  recommendedCueLevel: CueLevelType,
  timePressureAppropriate: boolean
): ComponentTaskDesignParams {
  // Simple structures allow production, complex need recognition first
  const recommendedTaskTypes: TaskType[] =
    vector.complexityScore < 0.4
      ? ['sentence_combining', 'production', 'error_correction']
      : ['recognition', 'clause_selection', 'fill_blank'];

  const targetProcess: CognitiveProcess =
    vector.embeddingDepth > 2 ? 'analysis' : 'synthesis';

  // Generate contexts from genre association
  const suggestedContexts: string[] = [];
  if (vector.genreAssociation.narrative > 0.5) suggestedContexts.push('narrative');
  if (vector.genreAssociation.expository > 0.5) suggestedContexts.push('expository');
  if (vector.genreAssociation.argumentative > 0.5) suggestedContexts.push('argumentative');
  if (vector.genreAssociation.conversational > 0.5) suggestedContexts.push('conversational');

  return {
    componentType: 'SYNT',
    recommendedTaskTypes: recommendedTaskTypes.slice(0, MAX_TASK_TYPES),
    recommendedFormat: vector.complexityScore > 0.5 ? 'ordering' : 'free_response',
    targetProcess,
    suggestedContexts: suggestedContexts.slice(0, MAX_CONTEXTS),
    difficultyModifiers: {
      sentence_combining: 0.9 + vector.complexityScore * 0.3,
      production: 1.0 + vector.embeddingDepth * 0.1,
      error_correction: 0.8,
      recognition: 0.7,
    },
    includeCues,
    recommendedCueLevel,
    timePressureAppropriate: timePressureAppropriate && vector.complexityScore < 0.5,
    modalityRecommendations: {
      visual: 0.9,
      auditory: 0.3,
      mixed: 0.5,
    },
  };
}

function generatePRAGTaskParams(
  vector: PRAGVector,
  _learningGoal: LearningGoal,
  includeCues: boolean,
  recommendedCueLevel: CueLevelType,
  _timePressureAppropriate: boolean
): ComponentTaskDesignParams {
  // High face-threat needs careful scaffolding
  const recommendedTaskTypes: TaskType[] =
    vector.faceThreatPotential > 0.6
      ? ['register_shift', 'recognition', 'production']
      : ['production', 'sentence_writing', 'register_shift'];

  const targetProcess: CognitiveProcess = 'production';

  // Use recommended scenarios for contexts
  const suggestedContexts = vector.recommendedScenarios
    .slice(0, MAX_CONTEXTS)
    .map(s => s.scenario);

  return {
    componentType: 'PRAG',
    recommendedTaskTypes: recommendedTaskTypes.slice(0, MAX_TASK_TYPES),
    recommendedFormat: 'free_response',
    targetProcess,
    suggestedContexts,
    difficultyModifiers: {
      register_shift: 1.0 + vector.culturalLoad * 0.2,
      recognition: 0.7,
      production: 1.2 + vector.politenessComplexity * 0.2,
      sentence_writing: 1.1,
    },
    includeCues,
    recommendedCueLevel,
    timePressureAppropriate: false, // Pragmatics needs reflection time
    modalityRecommendations: {
      visual: 0.6,
      auditory: 0.8,
      mixed: 0.9,
    },
  };
}

// =============================================================================
// Learning Trajectory Prediction
// =============================================================================

/**
 * Key factor affecting learning trajectory.
 */
export interface TrajectoryKeyFactor {
  /** Factor name */
  factor: string;
  /** Impact direction */
  impact: 'accelerating' | 'neutral' | 'decelerating';
  /** Magnitude (0-1) */
  magnitude: number;
}

/**
 * Predicted learning trajectory for a component object.
 */
export interface LearningTrajectoryPrediction {
  /** Object ID */
  objectId: string;

  /** Component type */
  componentType: ComponentCode;

  /** Current mastery stage */
  currentStage: MasteryStage;

  /** Predicted exposures to next stage */
  exposuresToNextStage: number;

  /** Predicted time to mastery (days) */
  predictedDaysToMastery: number;

  /** Confidence in prediction (0-1) */
  confidence: number;

  /** Key factors affecting trajectory */
  keyFactors: TrajectoryKeyFactor[];

  /** Bottleneck risk (0-1) */
  bottleneckRisk: number;

  /** Recommended interventions */
  recommendedInterventions: string[];
}

/**
 * Base exposures needed for each mastery stage.
 */
const BASE_EXPOSURES_BY_STAGE: Record<MasteryStage, number> = {
  0: 15, // New to recognition
  1: 20, // Recognition to recall
  2: 25, // Recall to controlled production
  3: 30, // Controlled to automatic
  4: 10, // Maintenance
};

/**
 * Predict learning trajectory from component vector.
 *
 * @param vector - Component vector
 * @param historicalPerformance - Past exposure patterns
 * @returns Learning trajectory prediction
 */
export function predictLearningTrajectory(
  vector: ComponentVector,
  historicalPerformance: ExposurePattern[] = []
): LearningTrajectoryPrediction {
  const baseExposures = BASE_EXPOSURES_BY_STAGE[vector.masteryStage];
  let modifier = 1.0;
  const keyFactors: TrajectoryKeyFactor[] = [];
  const recommendedInterventions: string[] = [];

  // Apply component-specific modifiers
  switch (vector.componentType) {
    case 'PHON':
      modifier = applyPHONTrajectoryModifiers(vector, modifier, keyFactors, recommendedInterventions);
      break;

    case 'MORPH':
      modifier = applyMORPHTrajectoryModifiers(vector, modifier, keyFactors, recommendedInterventions);
      break;

    case 'LEX':
      modifier = applyLEXTrajectoryModifiers(vector, modifier, keyFactors, recommendedInterventions);
      break;

    case 'SYNT':
      modifier = applySYNTTrajectoryModifiers(vector, modifier, keyFactors, recommendedInterventions);
      break;

    case 'PRAG':
      modifier = applyPRAGTrajectoryModifiers(vector, modifier, keyFactors, recommendedInterventions);
      break;
  }

  // Prerequisite penalty
  if (!vector.prerequisitesSatisfied) {
    modifier *= 2.0;
    keyFactors.push({
      factor: 'Prerequisites not met',
      impact: 'decelerating',
      magnitude: 1.0,
    });
    recommendedInterventions.push('Focus on prerequisite components first');
  }

  // Historical performance adjustment
  if (historicalPerformance.length >= 5) {
    const recentSuccessRate =
      historicalPerformance.slice(-5).filter(p => p.success === true).length / 5;

    if (recentSuccessRate > 0.8) {
      modifier *= 0.9;
      keyFactors.push({
        factor: 'Strong recent performance',
        impact: 'accelerating',
        magnitude: 0.1,
      });
    } else if (recentSuccessRate < 0.4) {
      modifier *= 1.3;
      keyFactors.push({
        factor: 'Struggling with recent attempts',
        impact: 'decelerating',
        magnitude: 0.3,
      });
      recommendedInterventions.push('Add scaffolding support');
    }
  }

  const predictedExposures = Math.round(baseExposures * modifier);
  const predictedDays = Math.round(predictedExposures / 3); // ~3 exposures/day

  // Calculate bottleneck risk
  const bottleneckRisk = calculateBottleneckRisk(vector, keyFactors);

  // Confidence based on historical data availability
  const confidence = Math.min(0.9, 0.5 + historicalPerformance.length * 0.05);

  return {
    objectId: vector.objectId,
    componentType: vector.componentType,
    currentStage: vector.masteryStage,
    exposuresToNextStage: predictedExposures,
    predictedDaysToMastery: predictedDays,
    confidence,
    keyFactors: keyFactors.slice(0, MAX_KEY_FACTORS),
    bottleneckRisk,
    recommendedInterventions: recommendedInterventions.slice(0, MAX_INTERVENTIONS),
  };
}

function applyPHONTrajectoryModifiers(
  vector: PHONVector,
  modifier: number,
  keyFactors: TrajectoryKeyFactor[],
  interventions: string[]
): number {
  // Irregular patterns take longer
  if (vector.graphemePhonemeRegularity < 0.5) {
    modifier *= 1.5;
    keyFactors.push({
      factor: 'Low G2P regularity',
      impact: 'decelerating',
      magnitude: 0.5,
    });
    interventions.push('Use explicit phonics instruction');
  }

  // L1 transfer difficulty
  if (vector.l1TransferDifficulty > 0.5) {
    modifier *= 1 + vector.l1TransferDifficulty * 0.3;
    keyFactors.push({
      factor: 'L1 interference',
      impact: 'decelerating',
      magnitude: vector.l1TransferDifficulty * 0.3,
    });
    interventions.push('Use contrastive pronunciation exercises');
  } else if (vector.l1TransferDifficulty < 0.3) {
    modifier *= 0.9;
    keyFactors.push({
      factor: 'Positive L1 transfer',
      impact: 'accelerating',
      magnitude: 0.1,
    });
  }

  return modifier;
}

function applyMORPHTrajectoryModifiers(
  vector: MORPHVector,
  modifier: number,
  keyFactors: TrajectoryKeyFactor[],
  interventions: string[]
): number {
  // Large families accelerate learning
  if (vector.familySize > 10) {
    modifier *= 0.8;
    keyFactors.push({
      factor: 'Large morphological family',
      impact: 'accelerating',
      magnitude: 0.2,
    });
  }

  // Low transparency slows learning
  if (vector.transparency < 0.5) {
    modifier *= 1.3;
    keyFactors.push({
      factor: 'Opaque morphology',
      impact: 'decelerating',
      magnitude: 0.3,
    });
    interventions.push('Teach as whole lexical item');
  }

  // High productivity accelerates generalization
  if (vector.productivity > 0.7) {
    modifier *= 0.9;
    keyFactors.push({
      factor: 'High productivity pattern',
      impact: 'accelerating',
      magnitude: 0.1,
    });
  }

  return modifier;
}

function applyLEXTrajectoryModifiers(
  vector: LEXVector,
  modifier: number,
  keyFactors: TrajectoryKeyFactor[],
  interventions: string[]
): number {
  // Concrete words are faster
  if (vector.concreteness > 0.7) {
    modifier *= 0.85;
    keyFactors.push({
      factor: 'High concreteness',
      impact: 'accelerating',
      magnitude: 0.15,
    });
  } else if (vector.concreteness < 0.3) {
    modifier *= 1.2;
    keyFactors.push({
      factor: 'Abstract concept',
      impact: 'decelerating',
      magnitude: 0.2,
    });
    interventions.push('Use rich contextual examples');
  }

  // High polysemy slows learning
  if (vector.polysemyCount > 5) {
    modifier *= 1.2;
    keyFactors.push({
      factor: 'Multiple meanings',
      impact: 'decelerating',
      magnitude: 0.2,
    });
    interventions.push('Focus on core meaning first');
  }

  // Low AoA helps
  if (vector.ageOfAcquisition < 8) {
    modifier *= 0.9;
    keyFactors.push({
      factor: 'Early-acquired word',
      impact: 'accelerating',
      magnitude: 0.1,
    });
  }

  // Cognate advantage
  if (vector.cognateStatus.isCognate && !vector.cognateStatus.falseFriendRisk) {
    modifier *= 0.8;
    keyFactors.push({
      factor: 'Cognate advantage',
      impact: 'accelerating',
      magnitude: 0.2,
    });
  }

  return modifier;
}

function applySYNTTrajectoryModifiers(
  vector: SYNTVector,
  modifier: number,
  keyFactors: TrajectoryKeyFactor[],
  interventions: string[]
): number {
  // Complexity directly affects time
  modifier *= 1 + vector.complexityScore * 0.5;
  if (vector.complexityScore > 0.5) {
    keyFactors.push({
      factor: 'High syntactic complexity',
      impact: 'decelerating',
      magnitude: vector.complexityScore * 0.5,
    });
  }

  // Deep embedding is harder
  if (vector.embeddingDepth > 3) {
    modifier *= 1.3;
    keyFactors.push({
      factor: 'Deep clause embedding',
      impact: 'decelerating',
      magnitude: 0.3,
    });
    interventions.push('Build up from simpler embeddings');
  }

  // High processability stage requires foundation
  if (vector.processabilityStage > 3) {
    keyFactors.push({
      factor: 'Advanced processability stage',
      impact: 'neutral',
      magnitude: 0,
    });
    interventions.push('Ensure earlier stages are automatized');
  }

  return modifier;
}

function applyPRAGTrajectoryModifiers(
  vector: PRAGVector,
  modifier: number,
  keyFactors: TrajectoryKeyFactor[],
  interventions: string[]
): number {
  // High cultural load = longer
  if (vector.culturalLoad > 0.5) {
    modifier *= 1 + vector.culturalLoad * 0.4;
    keyFactors.push({
      factor: 'Culture-specific convention',
      impact: 'decelerating',
      magnitude: vector.culturalLoad * 0.4,
    });
    interventions.push('Include explicit cultural instruction');
  }

  // Complex politeness = longer
  if (vector.politenessComplexity > 0.5) {
    modifier *= 1 + vector.politenessComplexity * 0.3;
    keyFactors.push({
      factor: 'Complex politeness calibration',
      impact: 'decelerating',
      magnitude: vector.politenessComplexity * 0.3,
    });
    interventions.push('Practice with varied social contexts');
  }

  // Register flexibility helps
  if (vector.registerFlexibility > 0.7) {
    modifier *= 0.9;
    keyFactors.push({
      factor: 'Register-flexible expression',
      impact: 'accelerating',
      magnitude: 0.1,
    });
  }

  return modifier;
}

/**
 * Calculate bottleneck risk based on key factors.
 */
function calculateBottleneckRisk(
  vector: ComponentVector,
  keyFactors: TrajectoryKeyFactor[]
): number {
  let risk = 0;

  // Prerequisite issues are high risk
  if (!vector.prerequisitesSatisfied) {
    risk += 0.5;
  }

  // Sum up decelerating factors
  const deceleratingMagnitude = keyFactors
    .filter(f => f.impact === 'decelerating')
    .reduce((sum, f) => sum + f.magnitude, 0);

  risk += Math.min(0.4, deceleratingMagnitude * 0.3);

  // Low automation level adds risk
  if (vector.automationLevel < 0.3 && vector.masteryStage >= 2) {
    risk += 0.1;
  }

  return Math.min(1, risk);
}

// =============================================================================
// Exports
// =============================================================================

export {
  MAX_COLLOCATIONS,
  MAX_MISPRONUNCIATIONS,
  MAX_KEY_FACTORS,
  MAX_INTERVENTIONS,
  MAX_CONTEXTS,
  MAX_TASK_TYPES,
};
