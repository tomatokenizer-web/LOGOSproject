/**
 * Syntactic Construction Types
 *
 * Defines syntactic constructions for grammar organization and learning.
 * Each construction represents a grammatical pattern with complexity metrics,
 * prerequisites, and cognitive load information.
 *
 * From GAPS-AND-CONNECTIONS.md Gap 4.1
 */

import type { ComponentType, MasteryStage } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Grammatical category of construction.
 */
export type GrammarCategory =
  | 'clause_structure'     // Basic sentence patterns (SVO, SVC, etc.)
  | 'phrase_structure'     // NP, VP, PP, AP, AdvP
  | 'verb_system'          // Tense, aspect, mood, voice
  | 'nominal_system'       // Articles, determiners, quantifiers
  | 'modification'         // Adjectives, adverbs, relative clauses
  | 'coordination'         // Conjunctions, compound structures
  | 'subordination'        // Complex sentences, embedded clauses
  | 'information_structure' // Focus, topic, cleft constructions
  | 'special_constructions'; // Existential, conditional, comparative

/**
 * Clause type classification.
 */
export type ClauseType =
  | 'declarative'
  | 'interrogative'
  | 'imperative'
  | 'exclamative';

/**
 * Syntactic function in sentence.
 */
export type SyntacticFunction =
  | 'subject'
  | 'predicate'
  | 'object'
  | 'complement'
  | 'adjunct'
  | 'determiner'
  | 'modifier';

/**
 * Cognitive load metrics for construction learning.
 */
export interface CognitiveLoadMetrics {
  /** Processing load (1-5) */
  processingLoad: number;

  /** Memory demand (1-5) */
  memoryDemand: number;

  /** Attention required (1-5) */
  attentionRequired: number;

  /** Integration complexity (1-5) - combining multiple rules */
  integrationComplexity: number;

  /** Transfer difficulty (1-5) - applying to new contexts */
  transferDifficulty: number;
}

/**
 * Syntactic construction definition.
 */
export interface SyntacticConstruction {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the construction */
  description: string;

  /** Grammatical category */
  category: GrammarCategory;

  /** Pattern notation (e.g., "S + V + O", "There + be + NP") */
  pattern: string;

  /** Example sentences */
  examples: string[];

  /** Syntactic complexity score (0-1) */
  complexity: number;

  /** Corpus frequency (0-1, normalized) */
  frequency: number;

  /** Prerequisites - constructions that should be learned first */
  prerequisites: string[];

  /** Constructions that build on this one */
  enablesLearning: string[];

  /** Words commonly used with this pattern */
  exemplarWords: string[];

  /** Primary components exercised */
  components: ComponentType[];

  /** Cognitive load metrics */
  cognitiveLoad: CognitiveLoadMetrics;

  /** Appropriate mastery stages for learning */
  masteryRange: [MasteryStage, MasteryStage];

  /** CEFR level association */
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  /** Clause types this construction applies to */
  clauseTypes: ClauseType[];

  /** Whether this is a core/essential construction */
  isCore: boolean;

  /** Error patterns common with this construction */
  commonErrors: string[];

  /** L1 interference notes for specific languages */
  l1Interference?: Record<string, string>;
}

/**
 * Grammar learning sequence configuration.
 */
export interface GrammarLearningSequence {
  /** Sequence identifier */
  id: string;

  /** Sequence name */
  name: string;

  /** Target CEFR level */
  targetLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  /** Ordered list of constructions */
  constructions: SyntacticConstruction[];

  /** Words to practice with these constructions */
  integrationWords: string[];

  /** Recommended task types for this sequence */
  taskTypes: string[];

  /** Estimated learning time (hours) */
  estimatedHours: number;
}

/**
 * Construction mastery state.
 */
export interface ConstructionMasteryState {
  /** Construction ID */
  constructionId: string;

  /** Current mastery stage (0-4) */
  stage: MasteryStage;

  /** Accuracy in recognition tasks */
  recognitionAccuracy: number;

  /** Accuracy in production tasks */
  productionAccuracy: number;

  /** Total exposures */
  exposures: number;

  /** Last practiced date */
  lastPracticed: Date;

  /** Error history */
  errorTypes: string[];
}

// =============================================================================
// Core Construction Library
// =============================================================================

/**
 * Essential English syntactic constructions organized by complexity.
 */
export const CORE_CONSTRUCTIONS: Record<string, SyntacticConstruction> = {
  // =========================================================================
  // Level 1: Basic Clause Structures (A1)
  // =========================================================================

  svo_basic: {
    id: 'svo_basic',
    name: 'Basic SVO (Subject-Verb-Object)',
    description: 'The fundamental English sentence pattern with transitive verbs',
    category: 'clause_structure',
    pattern: 'S + V + O',
    examples: [
      'I eat breakfast.',
      'She reads books.',
      'They play soccer.',
    ],
    complexity: 0.1,
    frequency: 0.95,
    prerequisites: [],
    enablesLearning: ['svo_ditransitive', 'passive_basic', 'relative_clause_object'],
    exemplarWords: ['eat', 'read', 'play', 'see', 'like', 'have', 'make', 'take'],
    components: ['syntactic', 'lexical'],
    cognitiveLoad: {
      processingLoad: 1,
      memoryDemand: 1,
      attentionRequired: 1,
      integrationComplexity: 1,
      transferDifficulty: 1,
    },
    masteryRange: [0, 2],
    cefrLevel: 'A1',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['Missing object', 'Wrong word order (OSV)'],
    l1Interference: {
      Japanese: 'SOV order transfer',
      Spanish: 'Null subject tendency',
      Korean: 'SOV order transfer',
    },
  },

  sv_intransitive: {
    id: 'sv_intransitive',
    name: 'Intransitive SV (Subject-Verb)',
    description: 'Simple sentences with intransitive verbs',
    category: 'clause_structure',
    pattern: 'S + V',
    examples: [
      'Birds fly.',
      'Children laugh.',
      'The sun rises.',
    ],
    complexity: 0.05,
    frequency: 0.7,
    prerequisites: [],
    enablesLearning: ['sv_adverbial', 'svo_basic'],
    exemplarWords: ['sleep', 'walk', 'run', 'laugh', 'cry', 'arrive', 'happen'],
    components: ['syntactic', 'lexical'],
    cognitiveLoad: {
      processingLoad: 1,
      memoryDemand: 1,
      attentionRequired: 1,
      integrationComplexity: 1,
      transferDifficulty: 1,
    },
    masteryRange: [0, 1],
    cefrLevel: 'A1',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['Adding unnecessary object'],
  },

  svc_linking: {
    id: 'svc_linking',
    name: 'Linking Verb Construction (SVC)',
    description: 'Sentences with be and other linking verbs',
    category: 'clause_structure',
    pattern: 'S + V(linking) + C',
    examples: [
      'She is a doctor.',
      'The food tastes delicious.',
      'He seems tired.',
    ],
    complexity: 0.15,
    frequency: 0.85,
    prerequisites: ['sv_intransitive'],
    enablesLearning: ['there_existential', 'it_cleft'],
    exemplarWords: ['be', 'seem', 'become', 'appear', 'feel', 'look', 'sound', 'taste'],
    components: ['syntactic', 'lexical'],
    cognitiveLoad: {
      processingLoad: 2,
      memoryDemand: 2,
      attentionRequired: 2,
      integrationComplexity: 1,
      transferDifficulty: 2,
    },
    masteryRange: [0, 2],
    cefrLevel: 'A1',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['Using action verb syntax', 'Wrong complement type'],
    l1Interference: {
      Chinese: 'Missing copula be',
      Russian: 'Omitting copula in present',
    },
  },

  question_yes_no: {
    id: 'question_yes_no',
    name: 'Yes/No Questions',
    description: 'Questions requiring yes/no answer with subject-auxiliary inversion',
    category: 'clause_structure',
    pattern: 'Aux + S + V + (O)?',
    examples: [
      'Do you like coffee?',
      'Is she coming?',
      'Can you help me?',
    ],
    complexity: 0.2,
    frequency: 0.8,
    prerequisites: ['svo_basic', 'sv_intransitive'],
    enablesLearning: ['question_wh', 'tag_question'],
    exemplarWords: ['do', 'does', 'did', 'is', 'are', 'can', 'will'],
    components: ['syntactic'],
    cognitiveLoad: {
      processingLoad: 2,
      memoryDemand: 2,
      attentionRequired: 2,
      integrationComplexity: 2,
      transferDifficulty: 2,
    },
    masteryRange: [0, 2],
    cefrLevel: 'A1',
    clauseTypes: ['interrogative'],
    isCore: true,
    commonErrors: ['Missing do-support', 'No inversion', 'Double auxiliary'],
    l1Interference: {
      Chinese: 'Using declarative word order',
      Spanish: 'Inversion without auxiliary',
    },
  },

  negative_basic: {
    id: 'negative_basic',
    name: 'Basic Negation',
    description: 'Negative sentences with not/n\'t',
    category: 'clause_structure',
    pattern: 'S + Aux + not + V',
    examples: [
      'I do not like spinach.',
      'She isn\'t coming today.',
      'They can\'t swim.',
    ],
    complexity: 0.2,
    frequency: 0.85,
    prerequisites: ['svo_basic'],
    enablesLearning: ['negative_scope', 'neither_nor'],
    exemplarWords: ['not', 'never', 'no', 'nothing', 'nobody'],
    components: ['syntactic'],
    cognitiveLoad: {
      processingLoad: 2,
      memoryDemand: 2,
      attentionRequired: 2,
      integrationComplexity: 2,
      transferDifficulty: 2,
    },
    masteryRange: [0, 2],
    cefrLevel: 'A1',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['Double negation', 'Wrong auxiliary', 'Negation placement'],
    l1Interference: {
      Spanish: 'Double negation accepted',
      French: 'ne...pas structure',
    },
  },

  // =========================================================================
  // Level 2: Verb System Basics (A1-A2)
  // =========================================================================

  present_simple: {
    id: 'present_simple',
    name: 'Present Simple Tense',
    description: 'Habitual actions, facts, and general truths',
    category: 'verb_system',
    pattern: 'S + V(base/-s/-es)',
    examples: [
      'Water boils at 100 degrees.',
      'She works every day.',
      'Cats like fish.',
    ],
    complexity: 0.15,
    frequency: 0.9,
    prerequisites: ['svo_basic', 'sv_intransitive'],
    enablesLearning: ['present_continuous', 'past_simple'],
    exemplarWords: ['work', 'live', 'study', 'like', 'know', 'want'],
    components: ['morphological', 'syntactic'],
    cognitiveLoad: {
      processingLoad: 2,
      memoryDemand: 2,
      attentionRequired: 2,
      integrationComplexity: 2,
      transferDifficulty: 2,
    },
    masteryRange: [0, 2],
    cefrLevel: 'A1',
    clauseTypes: ['declarative', 'interrogative'],
    isCore: true,
    commonErrors: ['Missing third person -s', 'Using with current action'],
    l1Interference: {
      Chinese: 'No morphological marking confusion',
      Spanish: 'Overuse for ongoing actions',
    },
  },

  present_continuous: {
    id: 'present_continuous',
    name: 'Present Continuous Tense',
    description: 'Actions happening now or temporary situations',
    category: 'verb_system',
    pattern: 'S + be + V-ing',
    examples: [
      'I am reading a book.',
      'She is working late today.',
      'They are traveling in Europe.',
    ],
    complexity: 0.25,
    frequency: 0.75,
    prerequisites: ['svc_linking', 'present_simple'],
    enablesLearning: ['past_continuous', 'present_perfect_continuous'],
    exemplarWords: ['working', 'reading', 'playing', 'waiting', 'studying'],
    components: ['morphological', 'syntactic'],
    cognitiveLoad: {
      processingLoad: 2,
      memoryDemand: 2,
      attentionRequired: 3,
      integrationComplexity: 2,
      transferDifficulty: 3,
    },
    masteryRange: [1, 3],
    cefrLevel: 'A1',
    clauseTypes: ['declarative', 'interrogative'],
    isCore: true,
    commonErrors: ['Using with stative verbs', 'Wrong be form', 'Missing -ing'],
    l1Interference: {
      French: 'Overuse of simple present',
      German: 'No continuous form in L1',
    },
  },

  past_simple: {
    id: 'past_simple',
    name: 'Past Simple Tense',
    description: 'Completed actions in the past',
    category: 'verb_system',
    pattern: 'S + V-ed/irregular',
    examples: [
      'I visited Paris last year.',
      'She went to the store.',
      'They played tennis yesterday.',
    ],
    complexity: 0.3,
    frequency: 0.85,
    prerequisites: ['present_simple'],
    enablesLearning: ['past_continuous', 'present_perfect', 'reported_speech'],
    exemplarWords: ['went', 'saw', 'had', 'made', 'came', 'took', 'knew'],
    components: ['morphological', 'syntactic'],
    cognitiveLoad: {
      processingLoad: 3,
      memoryDemand: 3,
      attentionRequired: 2,
      integrationComplexity: 2,
      transferDifficulty: 3,
    },
    masteryRange: [1, 3],
    cefrLevel: 'A2',
    clauseTypes: ['declarative', 'interrogative'],
    isCore: true,
    commonErrors: ['Irregular verb forms', 'Did + past form', 'Time marker confusion'],
  },

  future_will: {
    id: 'future_will',
    name: 'Future with Will',
    description: 'Predictions, decisions, and promises about the future',
    category: 'verb_system',
    pattern: 'S + will + V(base)',
    examples: [
      'I will help you tomorrow.',
      'It will rain this evening.',
      'She will be 30 next year.',
    ],
    complexity: 0.2,
    frequency: 0.7,
    prerequisites: ['present_simple', 'svo_basic'],
    enablesLearning: ['future_going_to', 'conditional_first'],
    exemplarWords: ['will', 'won\'t', 'shall'],
    components: ['syntactic'],
    cognitiveLoad: {
      processingLoad: 2,
      memoryDemand: 2,
      attentionRequired: 2,
      integrationComplexity: 2,
      transferDifficulty: 2,
    },
    masteryRange: [1, 3],
    cefrLevel: 'A2',
    clauseTypes: ['declarative', 'interrogative'],
    isCore: true,
    commonErrors: ['Will vs going to confusion', 'Using with time clauses'],
  },

  // =========================================================================
  // Level 3: Complex Structures (A2-B1)
  // =========================================================================

  present_perfect: {
    id: 'present_perfect',
    name: 'Present Perfect Tense',
    description: 'Past actions with present relevance, experiences, unfinished time',
    category: 'verb_system',
    pattern: 'S + have/has + V-ed/past participle',
    examples: [
      'I have visited Japan twice.',
      'She has lived here for 10 years.',
      'They have already eaten.',
    ],
    complexity: 0.45,
    frequency: 0.65,
    prerequisites: ['past_simple', 'present_simple'],
    enablesLearning: ['present_perfect_continuous', 'past_perfect'],
    exemplarWords: ['have', 'has', 'been', 'done', 'seen', 'gone', 'made'],
    components: ['morphological', 'syntactic'],
    cognitiveLoad: {
      processingLoad: 4,
      memoryDemand: 3,
      attentionRequired: 4,
      integrationComplexity: 4,
      transferDifficulty: 5,
    },
    masteryRange: [2, 4],
    cefrLevel: 'A2',
    clauseTypes: ['declarative', 'interrogative'],
    isCore: true,
    commonErrors: ['Using with specific past time', 'For vs since', 'Been vs gone'],
    l1Interference: {
      German: 'Overuse for simple past',
      Spanish: 'Using past simple instead',
      French: 'Different time reference rules',
    },
  },

  passive_basic: {
    id: 'passive_basic',
    name: 'Basic Passive Voice',
    description: 'Sentences where the action is emphasized over the actor',
    category: 'verb_system',
    pattern: 'S + be + V-ed/past participle (+ by agent)',
    examples: [
      'The book was written by Hemingway.',
      'The window is broken.',
      'English is spoken worldwide.',
    ],
    complexity: 0.5,
    frequency: 0.5,
    prerequisites: ['svo_basic', 'past_simple', 'present_perfect'],
    enablesLearning: ['passive_continuous', 'passive_perfect'],
    exemplarWords: ['written', 'made', 'built', 'spoken', 'eaten', 'done'],
    components: ['syntactic', 'morphological'],
    cognitiveLoad: {
      processingLoad: 4,
      memoryDemand: 4,
      attentionRequired: 4,
      integrationComplexity: 4,
      transferDifficulty: 4,
    },
    masteryRange: [2, 4],
    cefrLevel: 'B1',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['Wrong be form', 'Using active participle', 'Unnecessary by-phrase'],
  },

  question_wh: {
    id: 'question_wh',
    name: 'Wh-Questions',
    description: 'Questions with who, what, where, when, why, how',
    category: 'clause_structure',
    pattern: 'Wh-word + Aux + S + V (+ O)?',
    examples: [
      'What do you want?',
      'Where does she live?',
      'Why did they leave?',
    ],
    complexity: 0.3,
    frequency: 0.75,
    prerequisites: ['question_yes_no'],
    enablesLearning: ['embedded_question', 'wh_subject'],
    exemplarWords: ['what', 'where', 'when', 'why', 'how', 'who', 'which'],
    components: ['syntactic'],
    cognitiveLoad: {
      processingLoad: 3,
      memoryDemand: 2,
      attentionRequired: 3,
      integrationComplexity: 3,
      transferDifficulty: 3,
    },
    masteryRange: [1, 3],
    cefrLevel: 'A2',
    clauseTypes: ['interrogative'],
    isCore: true,
    commonErrors: ['Wrong wh-word', 'Missing auxiliary', 'Word order errors'],
  },

  relative_clause_basic: {
    id: 'relative_clause_basic',
    name: 'Basic Relative Clauses',
    description: 'Clauses that modify nouns using who, which, that',
    category: 'modification',
    pattern: 'NP + (who/which/that) + clause',
    examples: [
      'The man who lives next door is a teacher.',
      'I read the book that you recommended.',
      'The car which I bought is red.',
    ],
    complexity: 0.55,
    frequency: 0.6,
    prerequisites: ['svo_basic', 'question_wh'],
    enablesLearning: ['relative_clause_reduced', 'relative_clause_non_restrictive'],
    exemplarWords: ['who', 'which', 'that', 'whose', 'whom', 'where'],
    components: ['syntactic'],
    cognitiveLoad: {
      processingLoad: 4,
      memoryDemand: 4,
      attentionRequired: 4,
      integrationComplexity: 5,
      transferDifficulty: 4,
    },
    masteryRange: [2, 4],
    cefrLevel: 'B1',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['Wrong relative pronoun', 'Omission errors', 'Resumptive pronoun'],
    l1Interference: {
      Arabic: 'Resumptive pronoun addition',
      Chinese: 'Different relativization strategy',
    },
  },

  // =========================================================================
  // Level 4: Advanced Structures (B1-B2)
  // =========================================================================

  conditional_first: {
    id: 'conditional_first',
    name: 'First Conditional',
    description: 'Real/possible future conditions',
    category: 'subordination',
    pattern: 'If + S + V(present), S + will + V',
    examples: [
      'If it rains, I will stay home.',
      'She will pass if she studies hard.',
      'If you call, I\'ll come.',
    ],
    complexity: 0.5,
    frequency: 0.55,
    prerequisites: ['future_will', 'present_simple'],
    enablesLearning: ['conditional_second', 'conditional_third'],
    exemplarWords: ['if', 'when', 'unless', 'provided', 'as long as'],
    components: ['syntactic'],
    cognitiveLoad: {
      processingLoad: 3,
      memoryDemand: 3,
      attentionRequired: 3,
      integrationComplexity: 4,
      transferDifficulty: 3,
    },
    masteryRange: [2, 4],
    cefrLevel: 'B1',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['Will in if-clause', 'Tense mismatch'],
  },

  conditional_second: {
    id: 'conditional_second',
    name: 'Second Conditional',
    description: 'Unreal/hypothetical present conditions',
    category: 'subordination',
    pattern: 'If + S + V(past), S + would + V',
    examples: [
      'If I had money, I would travel.',
      'She would help if she could.',
      'If I were you, I would accept.',
    ],
    complexity: 0.65,
    frequency: 0.45,
    prerequisites: ['conditional_first', 'past_simple'],
    enablesLearning: ['conditional_third', 'wish_constructions'],
    exemplarWords: ['would', 'could', 'might', 'were'],
    components: ['syntactic', 'morphological'],
    cognitiveLoad: {
      processingLoad: 4,
      memoryDemand: 4,
      attentionRequired: 4,
      integrationComplexity: 4,
      transferDifficulty: 5,
    },
    masteryRange: [2, 4],
    cefrLevel: 'B1',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['Would in if-clause', 'Was instead of were', 'First/second confusion'],
  },

  reported_speech: {
    id: 'reported_speech',
    name: 'Reported Speech',
    description: 'Reporting what someone said with tense backshift',
    category: 'subordination',
    pattern: 'S + said/told + (that) + S + V(backshifted)',
    examples: [
      'She said that she was tired.',
      'He told me he would come.',
      'They mentioned they had finished.',
    ],
    complexity: 0.6,
    frequency: 0.5,
    prerequisites: ['past_simple', 'present_perfect'],
    enablesLearning: ['reported_questions', 'reporting_verbs_variety'],
    exemplarWords: ['said', 'told', 'mentioned', 'explained', 'claimed', 'admitted'],
    components: ['syntactic', 'morphological'],
    cognitiveLoad: {
      processingLoad: 4,
      memoryDemand: 4,
      attentionRequired: 4,
      integrationComplexity: 5,
      transferDifficulty: 4,
    },
    masteryRange: [2, 4],
    cefrLevel: 'B1',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['No tense shift', 'Pronoun/time word confusion', 'Said vs told'],
  },

  there_existential: {
    id: 'there_existential',
    name: 'Existential There',
    description: 'Introducing new information about existence',
    category: 'special_constructions',
    pattern: 'There + be + NP (+ location)',
    examples: [
      'There is a book on the table.',
      'There are many problems to solve.',
      'There was a time when I believed.',
    ],
    complexity: 0.35,
    frequency: 0.6,
    prerequisites: ['svc_linking'],
    enablesLearning: ['there_with_modals', 'it_extraposition'],
    exemplarWords: ['there', 'is', 'are', 'was', 'were', 'will be'],
    components: ['syntactic'],
    cognitiveLoad: {
      processingLoad: 3,
      memoryDemand: 2,
      attentionRequired: 3,
      integrationComplexity: 3,
      transferDifficulty: 3,
    },
    masteryRange: [1, 3],
    cefrLevel: 'A2',
    clauseTypes: ['declarative'],
    isCore: true,
    commonErrors: ['Have vs there is', 'Agreement with post-verbal NP'],
    l1Interference: {
      Spanish: 'Using have (hay) pattern',
      French: 'Il y a structure interference',
    },
  },

  // =========================================================================
  // Level 5: Complex Subordination (B2-C1)
  // =========================================================================

  embedded_question: {
    id: 'embedded_question',
    name: 'Embedded Questions',
    description: 'Questions within statements with declarative word order',
    category: 'subordination',
    pattern: 'S + V + wh-word + S + V',
    examples: [
      'I wonder what she wants.',
      'Do you know where he lives?',
      'I\'m not sure how this works.',
    ],
    complexity: 0.55,
    frequency: 0.45,
    prerequisites: ['question_wh', 'svo_basic'],
    enablesLearning: ['noun_clause_subject', 'free_relatives'],
    exemplarWords: ['wonder', 'know', 'ask', 'understand', 'remember', 'tell'],
    components: ['syntactic'],
    cognitiveLoad: {
      processingLoad: 4,
      memoryDemand: 4,
      attentionRequired: 4,
      integrationComplexity: 4,
      transferDifficulty: 4,
    },
    masteryRange: [2, 4],
    cefrLevel: 'B2',
    clauseTypes: ['declarative', 'interrogative'],
    isCore: false,
    commonErrors: ['Using question word order', 'Do-support in embedded'],
  },

  it_cleft: {
    id: 'it_cleft',
    name: 'It-Cleft Construction',
    description: 'Focus construction highlighting specific information',
    category: 'information_structure',
    pattern: 'It + be + X + that/who + clause',
    examples: [
      'It was John who broke the window.',
      'It\'s the music that I love.',
      'It was in Paris that we met.',
    ],
    complexity: 0.65,
    frequency: 0.35,
    prerequisites: ['relative_clause_basic', 'svc_linking'],
    enablesLearning: ['wh_cleft', 'reverse_cleft'],
    exemplarWords: ['it', 'that', 'who', 'which', 'where', 'when'],
    components: ['syntactic', 'pragmatic'],
    cognitiveLoad: {
      processingLoad: 4,
      memoryDemand: 4,
      attentionRequired: 5,
      integrationComplexity: 5,
      transferDifficulty: 5,
    },
    masteryRange: [3, 4],
    cefrLevel: 'B2',
    clauseTypes: ['declarative'],
    isCore: false,
    commonErrors: ['Wrong tense in cleft', 'Incorrect relative pronoun'],
  },

  conditional_third: {
    id: 'conditional_third',
    name: 'Third Conditional',
    description: 'Unreal past conditions and their imaginary consequences',
    category: 'subordination',
    pattern: 'If + S + had + V-ed, S + would have + V-ed',
    examples: [
      'If I had studied, I would have passed.',
      'She would have come if she had known.',
      'If they had left earlier, they wouldn\'t have missed the train.',
    ],
    complexity: 0.75,
    frequency: 0.35,
    prerequisites: ['conditional_second', 'past_perfect'],
    enablesLearning: ['mixed_conditional', 'wish_past'],
    exemplarWords: ['had', 'would have', 'could have', 'might have'],
    components: ['syntactic', 'morphological'],
    cognitiveLoad: {
      processingLoad: 5,
      memoryDemand: 5,
      attentionRequired: 5,
      integrationComplexity: 5,
      transferDifficulty: 5,
    },
    masteryRange: [3, 4],
    cefrLevel: 'B2',
    clauseTypes: ['declarative'],
    isCore: false,
    commonErrors: ['Would have in if-clause', 'Tense confusion', 'Missing have'],
  },

  participle_clause: {
    id: 'participle_clause',
    name: 'Participle Clauses',
    description: 'Reduced clauses using present or past participles',
    category: 'modification',
    pattern: 'V-ing/V-ed, S + V or S + V-ing/V-ed, V',
    examples: [
      'Walking home, I saw a deer.',
      'Written in 1605, the play is still popular.',
      'Having finished the work, she left.',
    ],
    complexity: 0.7,
    frequency: 0.4,
    prerequisites: ['relative_clause_basic', 'present_continuous'],
    enablesLearning: ['absolute_construction'],
    exemplarWords: ['walking', 'having', 'being', 'written', 'known', 'seen'],
    components: ['syntactic'],
    cognitiveLoad: {
      processingLoad: 4,
      memoryDemand: 4,
      attentionRequired: 5,
      integrationComplexity: 5,
      transferDifficulty: 5,
    },
    masteryRange: [3, 4],
    cefrLevel: 'B2',
    clauseTypes: ['declarative'],
    isCore: false,
    commonErrors: ['Dangling participle', 'Wrong participle form'],
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all constructions in a category.
 */
export function getConstructionsByCategory(category: GrammarCategory): SyntacticConstruction[] {
  return Object.values(CORE_CONSTRUCTIONS).filter(c => c.category === category);
}

/**
 * Get constructions appropriate for a CEFR level.
 */
export function getConstructionsForLevel(level: string): SyntacticConstruction[] {
  const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const levelIndex = levelOrder.indexOf(level);

  return Object.values(CORE_CONSTRUCTIONS).filter(c => {
    const constructionIndex = levelOrder.indexOf(c.cefrLevel);
    return constructionIndex <= levelIndex;
  });
}

/**
 * Get core (essential) constructions only.
 */
export function getCoreConstructions(): SyntacticConstruction[] {
  return Object.values(CORE_CONSTRUCTIONS).filter(c => c.isCore);
}

/**
 * Get constructions within a complexity range.
 */
export function getConstructionsByComplexity(
  minComplexity: number,
  maxComplexity: number
): SyntacticConstruction[] {
  return Object.values(CORE_CONSTRUCTIONS).filter(
    c => c.complexity >= minComplexity && c.complexity <= maxComplexity
  );
}

/**
 * Get prerequisites for a construction (recursive).
 */
export function getAllPrerequisites(constructionId: string): string[] {
  const construction = CORE_CONSTRUCTIONS[constructionId];
  if (!construction) return [];

  const prerequisites = new Set<string>();

  function collectPrereqs(id: string) {
    const c = CORE_CONSTRUCTIONS[id];
    if (!c) return;

    for (const prereq of c.prerequisites) {
      if (!prerequisites.has(prereq)) {
        prerequisites.add(prereq);
        collectPrereqs(prereq);
      }
    }
  }

  collectPrereqs(constructionId);
  return Array.from(prerequisites);
}

/**
 * Calculate total cognitive load score.
 */
export function calculateTotalCognitiveLoad(metrics: CognitiveLoadMetrics): number {
  return (
    metrics.processingLoad +
    metrics.memoryDemand +
    metrics.attentionRequired +
    metrics.integrationComplexity +
    metrics.transferDifficulty
  ) / 5;
}
