# LOGOS Theoretical Foundations

## Immutable Conceptual Bedrock

This document establishes the **immutable conceptual foundation** that must remain unshaken for any subsequent designs, algorithms, or modules. It is not a feature list or implementation plan, but the theoretical framework governing all LOGOS development.

**Document Hierarchy:**
- This document: WHY (theoretical justification)
- FINAL-SPEC.md: WHAT (functional specification)
- DEVELOPMENT-PROTOCOL.md: HOW (implementation rules)
- REFERENCE-IMPLEMENTATIONS.md: WITH WHAT (verified code sources)

---

# Part 1: Core Identity

## 1.1 What LOGOS Is

LOGOS is neither a test-prep tool, thematic textbook, nor simple AI tutor. It is a **learning control engine that real-time estimates a user's language usage space and designs problems to expand it most efficiently**.

### The Fundamental Redefinition

Traditional view: Language learning = accumulation of vocabulary + grammar + phonology + discourse knowledge

**LOGOS view**: Language learning = **expansion of usage space enabling interpretation and production**

This extends beyond the traditional four functional domains (listening, reading, writing, speaking), delving into the cognitive systems each domain mobilizes:

| Domain | Cognitive Systems Mobilized |
|--------|----------------------------|
| Listening | Speech recognition, phoneme discrimination, short-term auditory memory |
| Reading | Visual decoding, orthographic parsing, inference generation |
| Writing | Real-time composition, motor planning, self-monitoring |
| Speaking | Articulatory planning, prosodic control, real-time retrieval |

### Usage Space Definition

The 'usage space' refers to coordinates across:
- **Specific purposes** (certification, professional communication, academic writing)
- **Specific contexts** (hospital, courtroom, classroom)
- **Specific formats** (reports, conversations, presentations)
- **Specific domains** (medical, legal, technical)

**Learning objective shifts** from "how much knowledge acquired" to **"to what extent can it be applied"**.

**Evaluation shifts** from accuracy rates to **coordinates of achievable usage scopes**.

---

## 1.2 Ontological Redefinition of Language Components

In LOGOS, language components are not traditional subfields (vocabulary, grammar) but **minimal units satisfying three conditions**:

1. **Independent evaluability** of proficiency
2. **Combinability** with other components
3. **Responsibility for specific cognitive loads** in interpretation/production tasks

### The Five Component Types

| Component | Definition | Key Properties |
|-----------|------------|----------------|
| **Phonology-Orthography** | Sound-grapheme mapping, syllable structure, positional constraints | G2P rules, spelling patterns, phonotactics |
| **Morphology** | Affixation, derivation/inflection, morphological inference | Root identification, affix productivity |
| **Lexical** | Semantic scope, collocational affordances, domain usage | Multi-dimensional vectors (see 2.2) |
| **Syntactic-Structural** | Sentence architecture, argument relations, information packaging | Dependency distance, clause embedding |
| **Semantic-Pragmatic-Discourse** | Purposes, formats, audience assumptions, statistical patterns | Register, genre conventions, discourse markers |

### Component Relations

Components connect not through knowledge inclusion hierarchies but via **combinatorial relations of co-invoked cognitive procedures**.

> Key insight: When you process a sentence, you don't activate "vocabulary knowledge" then "grammar knowledge" sequentially. You invoke multiple cognitive procedures simultaneously that span components.

---

## 1.3 Context-Conditioned G2P Model

The Phonology-Orthography component requires a formal model for **context-conditioned grapheme-to-phoneme (G2P) mapping**. This is critical because pronunciation rules are not one-to-one mappings but depend on surrounding context.

### Why This Matters

English orthography is **context-dependent**:
- `c` → /s/ before e, i, y (cell, city, cycle)
- `c` → /k/ elsewhere (cat, come, cup)
- `gh` → /f/ word-finally after certain vowels (cough, laugh)
- `gh` → ∅ (silent) in other positions (night, through)

Without formal G2P modeling, the P (phonological difficulty) component of z(w) cannot be accurately computed.

### Formal Specification

```typescript
// Grapheme unit set for English
type GraphemeUnit =
  | 'a' | 'b' | 'c' | ... | 'z'  // Single letters
  | 'th' | 'ch' | 'sh' | 'ph' | 'gh' | 'wh'  // Digraphs
  | 'tch' | 'dge' | 'tion' | 'sion' | 'ough';  // Multi-graphemes

// Phoneme set (IPA subset for English)
type Phoneme =
  | 'p' | 'b' | 't' | 'd' | 'k' | 'g'  // Stops
  | 'f' | 'v' | 'θ' | 'ð' | 's' | 'z' | 'ʃ' | 'ʒ' | 'h'  // Fricatives
  | 'tʃ' | 'dʒ'  // Affricates
  | 'm' | 'n' | 'ŋ'  // Nasals
  | 'l' | 'r' | 'w' | 'j'  // Approximants
  | 'i' | 'ɪ' | 'e' | 'ɛ' | 'æ' | 'ɑ' | 'ɔ' | 'o' | 'ʊ' | 'u' | 'ʌ' | 'ə'  // Vowels
  | '∅';  // Silent

// Context feature vector for G2P decision
interface G2PContext {
  // Positional features
  position: 'initial' | 'medial' | 'final';
  syllableRole: 'onset' | 'nucleus' | 'coda';

  // Surrounding grapheme features
  precedingGrapheme: GraphemeUnit | null;
  followingGrapheme: GraphemeUnit | null;
  precedingPhonemeClass: 'vowel' | 'consonant' | null;
  followingPhonemeClass: 'vowel' | 'consonant' | null;

  // Word-level features
  morphemeBoundary: boolean;  // Is there a morpheme boundary here?
  isStressed: boolean;
  wordClass: 'function' | 'content';
}

// G2P Rule structure
interface G2PRule {
  id: string;
  grapheme: GraphemeUnit;
  phoneme: Phoneme | Phoneme[];  // Can produce multiple phonemes
  conditions: Partial<G2PContext>;
  priority: number;  // Higher = more specific, checked first
  exceptionRate: number;  // 0-1, how often this rule has exceptions
}
```

### Core G2P Rules (English)

```typescript
const ENGLISH_G2P_RULES: G2PRule[] = [
  // ===== C Rules =====
  {
    id: 'c_soft',
    grapheme: 'c',
    phoneme: 's',
    conditions: { followingGrapheme: 'e' | 'i' | 'y' },
    priority: 10,
    exceptionRate: 0.05  // Exceptions: Celtic, cello
  },
  {
    id: 'c_hard',
    grapheme: 'c',
    phoneme: 'k',
    conditions: {},  // Default
    priority: 1,
    exceptionRate: 0.02
  },

  // ===== G Rules =====
  {
    id: 'g_soft',
    grapheme: 'g',
    phoneme: 'dʒ',
    conditions: { followingGrapheme: 'e' | 'i' | 'y' },
    priority: 10,
    exceptionRate: 0.15  // Many exceptions: get, give, girl
  },
  {
    id: 'g_hard',
    grapheme: 'g',
    phoneme: 'g',
    conditions: {},
    priority: 1,
    exceptionRate: 0.02
  },

  // ===== GH Rules =====
  {
    id: 'gh_f',
    grapheme: 'gh',
    phoneme: 'f',
    conditions: { position: 'final', precedingGrapheme: 'ou' | 'au' },
    priority: 20,
    exceptionRate: 0.1
  },
  {
    id: 'gh_silent',
    grapheme: 'gh',
    phoneme: '∅',
    conditions: {},
    priority: 5,
    exceptionRate: 0.05
  },

  // ===== TH Rules =====
  {
    id: 'th_voiced',
    grapheme: 'th',
    phoneme: 'ð',
    conditions: { wordClass: 'function' },  // the, this, that, there
    priority: 15,
    exceptionRate: 0.05
  },
  {
    id: 'th_voiceless',
    grapheme: 'th',
    phoneme: 'θ',
    conditions: {},
    priority: 5,
    exceptionRate: 0.1
  },

  // ===== TION/SION Rules =====
  {
    id: 'tion',
    grapheme: 'tion',
    phoneme: ['ʃ', 'ə', 'n'],
    conditions: {},
    priority: 30,
    exceptionRate: 0.02
  },
  {
    id: 'sion_voiced',
    grapheme: 'sion',
    phoneme: ['ʒ', 'ə', 'n'],
    conditions: { precedingPhonemeClass: 'vowel' },
    priority: 25,
    exceptionRate: 0.1
  },

  // ... Additional rules
];
```

### G2P Entropy Calculation

The **g2pEntropy** used in P (phonological difficulty) measures how unpredictable the pronunciation is:

```typescript
function computeG2PEntropy(word: string, rules: G2PRule[]): number {
  const segments = segmentWord(word);
  let totalEntropy = 0;

  for (const segment of segments) {
    const applicableRules = rules.filter(r =>
      r.grapheme === segment.grapheme &&
      matchesConditions(segment.context, r.conditions)
    );

    if (applicableRules.length === 0) {
      totalEntropy += 1.0;  // Unknown = maximum uncertainty
    } else if (applicableRules.length === 1) {
      // Single rule applies, but may have exceptions
      totalEntropy += applicableRules[0].exceptionRate;
    } else {
      // Multiple rules could apply = ambiguity
      const entropy = -applicableRules.reduce((sum, r) => {
        const prob = 1 / applicableRules.length;
        return sum + prob * Math.log2(prob);
      }, 0);
      totalEntropy += entropy;
    }
  }

  return totalEntropy / segments.length;  // Normalize by word length
}
```

### Cross-Linguistic Extension Point

This G2P model is designed for English but follows a **language-agnostic interface**:

```typescript
interface LanguageG2PSpec {
  languageCode: string;  // 'en', 'fr', 'de', etc.
  graphemeSet: Set<string>;
  phonemeSet: Set<string>;
  multiGraphemeUnits: string[];
  rules: G2PRule[];

  // Language-specific segmentation
  segmentWord(word: string): GraphemeSegment[];

  // Compute entropy for a word
  computeEntropy(word: string): number;
}

// English implementation
const ENGLISH_G2P: LanguageG2PSpec = {
  languageCode: 'en',
  graphemeSet: new Set(['a', 'b', ..., 'z']),
  phonemeSet: new Set(['p', 'b', ..., 'ə']),
  multiGraphemeUnits: ['th', 'ch', 'sh', 'gh', 'ph', 'tion', ...],
  rules: ENGLISH_G2P_RULES,
  segmentWord: segmentEnglishWord,
  computeEntropy: (word) => computeG2PEntropy(word, ENGLISH_G2P_RULES)
};
```

---

## 1.4 Extended G2P Model: Mapping Complexity and Prosody

The basic G2P model in Section 1.3 handles simple context-conditioned mappings. This section extends it to capture the full complexity of English phonology.

### 1.4.1 Mapping Cardinality Types

English orthography exhibits four mapping patterns:

```typescript
type MappingCardinality =
  | 'one_to_one'      // b → /b/
  | 'one_to_many'     // x → /ks/, u → /ju/
  | 'many_to_one'     // ck, k, c → /k/
  | 'many_to_many';   // ough → multiple possibilities

interface MappingComplexity {
  grapheme: string;
  cardinality: MappingCardinality;
  possiblePhonemes: PhonemeRealization[];
  contextDependency: 'none' | 'local' | 'distant' | 'morphological';
  learnerDifficultyRating: number;  // 1-10 scale
}

interface PhonemeRealization {
  phonemes: Phoneme[];
  probability: number;      // Base probability without context
  contexts: G2PContext[];   // Contexts where this applies
  exampleWords: string[];
}
```

### 1.4.2 One-to-Many Mappings (Single Grapheme → Multiple Phonemes)

```typescript
const ONE_TO_MANY_MAPPINGS: MappingComplexity[] = [
  // ===== X: Always produces two sounds =====
  {
    grapheme: 'x',
    cardinality: 'one_to_many',
    possiblePhonemes: [
      {
        phonemes: ['k', 's'],
        probability: 0.7,
        contexts: [{ position: 'medial' }, { position: 'final' }],
        exampleWords: ['box', 'fix', 'taxi', 'excellent']
      },
      {
        phonemes: ['g', 'z'],
        probability: 0.25,
        contexts: [{ followingPhonemeClass: 'vowel', isStressed: true }],
        exampleWords: ['exam', 'exact', 'exist', 'exotic']
      },
      {
        phonemes: ['z'],
        probability: 0.05,
        contexts: [{ position: 'initial' }],
        exampleWords: ['xylophone', 'xenon', 'xerox']
      }
    ],
    contextDependency: 'local',
    learnerDifficultyRating: 6
  },

  // ===== U: Can produce /ju/ (glide + vowel) =====
  {
    grapheme: 'u',
    cardinality: 'one_to_many',
    possiblePhonemes: [
      {
        phonemes: ['j', 'u'],  // "yoo" sound
        probability: 0.3,
        contexts: [
          { precedingGrapheme: 'c' },  // cute
          { precedingGrapheme: 'm' },  // mute, music
          { precedingGrapheme: 'f' },  // fuse, future
          { precedingGrapheme: 'h' },  // huge, human
        ],
        exampleWords: ['cute', 'mute', 'fuse', 'huge', 'use', 'music']
      },
      {
        phonemes: ['u'],  // Just "oo"
        probability: 0.4,
        contexts: [
          { precedingGrapheme: 'r' },  // rude
          { precedingGrapheme: 'l' },  //lude
          { precedingGrapheme: 'j' },  // June
        ],
        exampleWords: ['rude', 'lude', 'June', 'flute', 'rule']
      },
      {
        phonemes: ['ʌ'],  // "uh" sound
        probability: 0.3,
        contexts: [{ isStressed: false }],
        exampleWords: ['cut', 'but', 'sun', 'run']
      }
    ],
    contextDependency: 'local',
    learnerDifficultyRating: 7
  },

  // ===== QU: Q always needs U, produces /kw/ =====
  {
    grapheme: 'qu',
    cardinality: 'one_to_many',
    possiblePhonemes: [
      {
        phonemes: ['k', 'w'],
        probability: 0.95,
        contexts: [],
        exampleWords: ['queen', 'quick', 'question', 'quiet']
      },
      {
        phonemes: ['k'],  // French loans
        probability: 0.05,
        contexts: [{ position: 'final' }],
        exampleWords: ['boutique', 'antique', 'unique']
      }
    ],
    contextDependency: 'morphological',
    learnerDifficultyRating: 4
  }
];
```

### 1.4.3 Many-to-One Mappings (Multiple Graphemes → Single Phoneme)

```typescript
const MANY_TO_ONE_MAPPINGS: Record<Phoneme, GraphemeVariant[]> = {
  // ===== /k/ sound: 5 different spellings =====
  'k': [
    { grapheme: 'k', contexts: [], frequency: 0.25, exampleWords: ['king', 'like', 'book'] },
    { grapheme: 'c', contexts: [{ followingGrapheme: 'a|o|u|consonant' }], frequency: 0.45, exampleWords: ['cat', 'come', 'cut'] },
    { grapheme: 'ck', contexts: [{ position: 'final', precedingGrapheme: 'short_vowel' }], frequency: 0.15, exampleWords: ['back', 'sick', 'duck'] },
    { grapheme: 'ch', contexts: [{ etymologySource: 'greek' }], frequency: 0.08, exampleWords: ['chaos', 'chrome', 'school'] },
    { grapheme: 'q(u)', contexts: [], frequency: 0.07, exampleWords: ['queen', 'quick'] }
  ],

  // ===== /f/ sound: 4 different spellings =====
  'f': [
    { grapheme: 'f', contexts: [], frequency: 0.75, exampleWords: ['fish', 'life', 'off'] },
    { grapheme: 'ff', contexts: [{ position: 'medial|final' }], frequency: 0.12, exampleWords: ['coffee', 'different', 'stuff'] },
    { grapheme: 'ph', contexts: [{ etymologySource: 'greek' }], frequency: 0.10, exampleWords: ['phone', 'photo', 'graph'] },
    { grapheme: 'gh', contexts: [{ position: 'final', precedingGrapheme: 'ou|au' }], frequency: 0.03, exampleWords: ['cough', 'laugh', 'enough'] }
  ],

  // ===== /ʃ/ "sh" sound: 6+ different spellings =====
  'ʃ': [
    { grapheme: 'sh', contexts: [], frequency: 0.50, exampleWords: ['ship', 'wish', 'fashion'] },
    { grapheme: 'ti', contexts: [{ followingGrapheme: 'on|ous|al' }], frequency: 0.25, exampleWords: ['nation', 'patient', 'initial'] },
    { grapheme: 'ci', contexts: [{ followingGrapheme: 'ous|al|an' }], frequency: 0.10, exampleWords: ['social', 'special', 'musician'] },
    { grapheme: 'si', contexts: [{ followingGrapheme: 'on' }, { precedingPhonemeClass: 'vowel' }], frequency: 0.08, exampleWords: ['tension', 'mission', 'session'] },
    { grapheme: 'ch', contexts: [{ etymologySource: 'french' }], frequency: 0.05, exampleWords: ['chef', 'machine', 'champagne'] },
    { grapheme: 'ss', contexts: [{ followingGrapheme: 'ure|ion' }], frequency: 0.02, exampleWords: ['pressure', 'ission'] }
  ],

  // ===== /n/ sound: Silent letter complications =====
  'n': [
    { grapheme: 'n', contexts: [], frequency: 0.85, exampleWords: ['no', 'run', 'plan'] },
    { grapheme: 'nn', contexts: [], frequency: 0.10, exampleWords: ['running', 'dinner', 'connect'] },
    { grapheme: 'kn', contexts: [{ position: 'initial' }], frequency: 0.03, exampleWords: ['know', 'knife', 'knee'] },
    { grapheme: 'gn', contexts: [{ position: 'initial|final' }], frequency: 0.02, exampleWords: ['gnome', 'sign', 'design'] },
    { grapheme: 'pn', contexts: [{ position: 'initial', etymologySource: 'greek' }], frequency: 0.001, exampleWords: ['pneumonia', 'pneumatic'] }
  ]
};

interface GraphemeVariant {
  grapheme: string;
  contexts: Partial<G2PContext>[];
  frequency: number;  // Relative frequency among variants
  exampleWords: string[];
}
```

### 1.4.4 English Vowel System

English vowels are notoriously complex. This section formalizes the complete system:

```typescript
// ===== Vowel Classification =====
type VowelTenseness = 'tense' | 'lax';
type VowelLength = 'short' | 'long';
type VowelType = 'monophthong' | 'diphthong' | 'r_colored';

interface EnglishVowel {
  ipa: Phoneme;
  tenseness: VowelTenseness;
  type: VowelType;
  commonSpellings: VowelSpelling[];
  minimalPairs: string[][];  // For discrimination training
}

interface VowelSpelling {
  grapheme: string;
  environment: string;  // Description of when this spelling applies
  frequency: number;
  examples: string[];
}

const ENGLISH_VOWEL_SYSTEM: EnglishVowel[] = [
  // ===== TENSE (LONG) VOWELS =====
  {
    ipa: 'i',  // "ee" as in "see"
    tenseness: 'tense',
    type: 'monophthong',
    commonSpellings: [
      { grapheme: 'ee', environment: 'common', frequency: 0.30, examples: ['see', 'feet', 'green'] },
      { grapheme: 'ea', environment: 'common', frequency: 0.25, examples: ['eat', 'read', 'team'] },
      { grapheme: 'e_e', environment: 'magic-e', frequency: 0.15, examples: ['these', 'Pete', 'extreme'] },
      { grapheme: 'ie', environment: 'word-final', frequency: 0.10, examples: ['cookie', 'movie', 'rookie'] },
      { grapheme: 'e', environment: 'open syllable', frequency: 0.10, examples: ['be', 'me', 'we', 'he'] },
      { grapheme: 'ey', environment: 'word-final', frequency: 0.05, examples: ['key', 'money', 'turkey'] },
      { grapheme: 'i', environment: 'foreign loans', frequency: 0.05, examples: ['pizza', 'ski', 'machine'] }
    ],
    minimalPairs: [['beat', 'bit'], ['feet', 'fit'], ['seat', 'sit'], ['heap', 'hip']]
  },

  {
    ipa: 'eɪ',  // "ay" as in "day" - DIPHTHONG
    tenseness: 'tense',
    type: 'diphthong',
    commonSpellings: [
      { grapheme: 'a_e', environment: 'magic-e', frequency: 0.35, examples: ['make', 'take', 'name'] },
      { grapheme: 'ai', environment: 'medial', frequency: 0.25, examples: ['rain', 'train', 'wait'] },
      { grapheme: 'ay', environment: 'word-final', frequency: 0.20, examples: ['day', 'say', 'play'] },
      { grapheme: 'ey', environment: 'varies', frequency: 0.10, examples: ['they', 'grey', 'obey'] },
      { grapheme: 'ei', environment: 'varies', frequency: 0.05, examples: ['vein', 'rein', 'weight'] },
      { grapheme: 'a', environment: 'open syllable', frequency: 0.05, examples: ['table', 'baby', 'paper'] }
    ],
    minimalPairs: [['late', 'let'], ['main', 'men'], ['tale', 'tell'], ['bait', 'bet']]
  },

  {
    ipa: 'aɪ',  // "eye" as in "my" - DIPHTHONG
    tenseness: 'tense',
    type: 'diphthong',
    commonSpellings: [
      { grapheme: 'i_e', environment: 'magic-e', frequency: 0.35, examples: ['time', 'like', 'fine'] },
      { grapheme: 'y', environment: 'word-final', frequency: 0.25, examples: ['my', 'try', 'fly'] },
      { grapheme: 'igh', environment: 'common', frequency: 0.15, examples: ['high', 'night', 'light'] },
      { grapheme: 'ie', environment: 'word-final verbs', frequency: 0.10, examples: ['tie', 'die', 'lie'] },
      { grapheme: 'i', environment: 'open syllable', frequency: 0.10, examples: ['find', 'kind', 'mind'] },
      { grapheme: 'ei', environment: 'varies', frequency: 0.03, examples: ['height', 'either', 'neither'] },
      { grapheme: 'uy', environment: 'rare', frequency: 0.02, examples: ['buy', 'guy'] }
    ],
    minimalPairs: [['bite', 'bat'], ['kite', 'cat'], ['dime', 'dam'], ['wine', 'wan']]
  },

  {
    ipa: 'oʊ',  // "oh" as in "go" - DIPHTHONG
    tenseness: 'tense',
    type: 'diphthong',
    commonSpellings: [
      { grapheme: 'o_e', environment: 'magic-e', frequency: 0.30, examples: ['home', 'bone', 'stone'] },
      { grapheme: 'oa', environment: 'common', frequency: 0.25, examples: ['boat', 'coat', 'road'] },
      { grapheme: 'ow', environment: 'word-final or before n/l', frequency: 0.20, examples: ['show', 'grow', 'own'] },
      { grapheme: 'o', environment: 'open syllable', frequency: 0.15, examples: ['go', 'no', 'so', 'open'] },
      { grapheme: 'oe', environment: 'word-final', frequency: 0.05, examples: ['toe', 'hoe', 'doe'] },
      { grapheme: 'ough', environment: 'specific words', frequency: 0.03, examples: ['though', 'dough'] },
      { grapheme: 'ew', environment: 'after certain consonants', frequency: 0.02, examples: ['sew'] }
    ],
    minimalPairs: [['coat', 'cut'], ['note', 'nut'], ['bone', 'bun'], ['hope', 'hop']]
  },

  {
    ipa: 'u',  // "oo" as in "too"
    tenseness: 'tense',
    type: 'monophthong',
    commonSpellings: [
      { grapheme: 'oo', environment: 'common', frequency: 0.35, examples: ['too', 'food', 'moon'] },
      { grapheme: 'u_e', environment: 'magic-e (after r,l,j)', frequency: 0.20, examples: ['rude', 'June', 'flute'] },
      { grapheme: 'ew', environment: 'common', frequency: 0.15, examples: ['new', 'flew', 'chew'] },
      { grapheme: 'ue', environment: 'word-final', frequency: 0.15, examples: ['blue', 'true', 'glue'] },
      { grapheme: 'ou', environment: 'varies', frequency: 0.10, examples: ['you', 'soup', 'group'] },
      { grapheme: 'ui', environment: 'varies', frequency: 0.05, examples: ['fruit', 'suit', 'juice'] }
    ],
    minimalPairs: [['pool', 'pull'], ['fool', 'full'], ['Luke', 'look'], ['cooed', 'could']]
  },

  // ===== LAX (SHORT) VOWELS =====
  {
    ipa: 'ɪ',  // "i" as in "sit"
    tenseness: 'lax',
    type: 'monophthong',
    commonSpellings: [
      { grapheme: 'i', environment: 'closed syllable', frequency: 0.80, examples: ['sit', 'big', 'fish'] },
      { grapheme: 'y', environment: 'medial', frequency: 0.10, examples: ['gym', 'myth', 'system'] },
      { grapheme: 'e', environment: 'varies', frequency: 0.05, examples: ['pretty', 'English', 'busy'] },
      { grapheme: 'ui', environment: 'varies', frequency: 0.03, examples: ['build', 'guilt', 'guitar'] },
      { grapheme: 'a', environment: 'varies', frequency: 0.02, examples: ['village', 'private', 'climate'] }
    ],
    minimalPairs: [['bit', 'beat'], ['sit', 'seat'], ['fit', 'feet'], ['lip', 'leap']]
  },

  {
    ipa: 'ɛ',  // "e" as in "bed"
    tenseness: 'lax',
    type: 'monophthong',
    commonSpellings: [
      { grapheme: 'e', environment: 'closed syllable', frequency: 0.75, examples: ['bed', 'red', 'pen'] },
      { grapheme: 'ea', environment: 'before d/th/lth', frequency: 0.15, examples: ['head', 'bread', 'health'] },
      { grapheme: 'a', environment: 'varies', frequency: 0.05, examples: ['any', 'many', 'said'] },
      { grapheme: 'ai', environment: 'varies', frequency: 0.03, examples: ['again', 'said'] },
      { grapheme: 'ie', environment: 'varies', frequency: 0.02, examples: ['friend'] }
    ],
    minimalPairs: [['bed', 'bad'], ['pen', 'pan'], ['met', 'mat'], ['set', 'sat']]
  },

  {
    ipa: 'æ',  // "a" as in "cat"
    tenseness: 'lax',
    type: 'monophthong',
    commonSpellings: [
      { grapheme: 'a', environment: 'closed syllable', frequency: 0.95, examples: ['cat', 'hat', 'man'] },
      { grapheme: 'ai', environment: 'rare', frequency: 0.03, examples: ['plaid', 'plait'] },
      { grapheme: 'au', environment: 'rare', frequency: 0.02, examples: ['laugh', 'aunt'] }
    ],
    minimalPairs: [['cat', 'cut'], ['hat', 'hut'], ['bat', 'but'], ['cap', 'cup']]
  },

  {
    ipa: 'ʌ',  // "u" as in "cup"
    tenseness: 'lax',
    type: 'monophthong',
    commonSpellings: [
      { grapheme: 'u', environment: 'closed syllable', frequency: 0.60, examples: ['cup', 'run', 'sun'] },
      { grapheme: 'o', environment: 'before n/m/v/th', frequency: 0.25, examples: ['son', 'love', 'mother', 'come'] },
      { grapheme: 'ou', environment: 'varies', frequency: 0.10, examples: ['young', 'touch', 'country'] },
      { grapheme: 'oo', environment: 'varies', frequency: 0.05, examples: ['blood', 'flood'] }
    ],
    minimalPairs: [['cup', 'cap'], ['cut', 'cat'], ['luck', 'lack'], ['bud', 'bad']]
  },

  {
    ipa: 'ʊ',  // "oo" as in "book"
    tenseness: 'lax',
    type: 'monophthong',
    commonSpellings: [
      { grapheme: 'oo', environment: 'before k/d', frequency: 0.60, examples: ['book', 'look', 'good'] },
      { grapheme: 'u', environment: 'varies', frequency: 0.30, examples: ['put', 'push', 'full'] },
      { grapheme: 'ou', environment: 'varies', frequency: 0.10, examples: ['could', 'would', 'should'] }
    ],
    minimalPairs: [['full', 'fool'], ['pull', 'pool'], ['look', 'Luke'], ['could', 'cooed']]
  },

  {
    ipa: 'ɑ',  // "o" as in "father" (or "hot" in American English)
    tenseness: 'lax',
    type: 'monophthong',
    commonSpellings: [
      { grapheme: 'o', environment: 'closed syllable', frequency: 0.50, examples: ['hot', 'stop', 'rock'] },
      { grapheme: 'a', environment: 'before r, or in father words', frequency: 0.35, examples: ['father', 'car', 'star'] },
      { grapheme: 'al', environment: 'before m/k', frequency: 0.10, examples: ['calm', 'palm', 'talk'] },
      { grapheme: 'au', environment: 'varies', frequency: 0.05, examples: ['sauce', 'because'] }
    ],
    minimalPairs: [['cot', 'caught'], ['Don', 'dawn'], ['stock', 'stalk']]
  },

  // ===== SCHWA (REDUCED VOWEL) =====
  {
    ipa: 'ə',  // Schwa - most common vowel in English!
    tenseness: 'lax',
    type: 'monophthong',
    commonSpellings: [
      { grapheme: 'a', environment: 'unstressed', frequency: 0.25, examples: ['about', 'banana', 'sofa'] },
      { grapheme: 'e', environment: 'unstressed', frequency: 0.25, examples: ['taken', 'happen', 'problem'] },
      { grapheme: 'i', environment: 'unstressed', frequency: 0.15, examples: ['animal', 'family', 'pencil'] },
      { grapheme: 'o', environment: 'unstressed', frequency: 0.20, examples: ['lesson', 'button', 'today'] },
      { grapheme: 'u', environment: 'unstressed', frequency: 0.10, examples: ['supply', 'circus', 'album'] },
      { grapheme: 'ou', environment: 'unstressed', frequency: 0.05, examples: ['famous', 'curious', 'nervous'] }
    ],
    minimalPairs: []  // Schwa doesn't form minimal pairs - it's always unstressed
  },

  // ===== ADDITIONAL DIPHTHONGS =====
  {
    ipa: 'aʊ',  // "ow" as in "cow"
    tenseness: 'tense',
    type: 'diphthong',
    commonSpellings: [
      { grapheme: 'ou', environment: 'common', frequency: 0.50, examples: ['out', 'house', 'cloud'] },
      { grapheme: 'ow', environment: 'common', frequency: 0.50, examples: ['cow', 'now', 'how', 'town'] }
    ],
    minimalPairs: [['loud', 'load'], ['shout', 'shoot'], ['foul', 'foal']]
  },

  {
    ipa: 'ɔɪ',  // "oy" as in "boy"
    tenseness: 'tense',
    type: 'diphthong',
    commonSpellings: [
      { grapheme: 'oi', environment: 'medial', frequency: 0.50, examples: ['oil', 'coin', 'point'] },
      { grapheme: 'oy', environment: 'word-final', frequency: 0.50, examples: ['boy', 'toy', 'enjoy'] }
    ],
    minimalPairs: [['coil', 'coal'], ['toil', 'toll'], ['void', 'vowed']]
  },

  // ===== R-COLORED VOWELS =====
  {
    ipa: 'ɝ',  // "er" as in "bird" (stressed)
    tenseness: 'tense',
    type: 'r_colored',
    commonSpellings: [
      { grapheme: 'er', environment: 'common', frequency: 0.30, examples: ['her', 'term', 'verb'] },
      { grapheme: 'ir', environment: 'common', frequency: 0.25, examples: ['bird', 'girl', 'first'] },
      { grapheme: 'ur', environment: 'common', frequency: 0.25, examples: ['turn', 'burn', 'nurse'] },
      { grapheme: 'or', environment: 'after w', frequency: 0.10, examples: ['word', 'work', 'world'] },
      { grapheme: 'ear', environment: 'varies', frequency: 0.05, examples: ['learn', 'earth', 'early'] },
      { grapheme: 'our', environment: 'varies', frequency: 0.05, examples: ['journey', 'courtesy'] }
    ],
    minimalPairs: [['fern', 'fir'], ['tern', 'turn'], ['worm', 'warm']]
  },

  {
    ipa: 'ɚ',  // "er" as in "butter" (unstressed) - schwa + r
    tenseness: 'lax',
    type: 'r_colored',
    commonSpellings: [
      { grapheme: 'er', environment: 'unstressed final', frequency: 0.40, examples: ['butter', 'water', 'better'] },
      { grapheme: 'or', environment: 'unstressed', frequency: 0.25, examples: ['doctor', 'actor', 'color'] },
      { grapheme: 'ar', environment: 'unstressed', frequency: 0.20, examples: ['dollar', 'collar', 'sugar'] },
      { grapheme: 'ur', environment: 'unstressed', frequency: 0.10, examples: ['sulfur', 'murmur'] },
      { grapheme: 'ure', environment: 'unstressed', frequency: 0.05, examples: ['nature', 'culture', 'picture'] }
    ],
    minimalPairs: []
  }
];
```

### 1.4.5 Stress and Prosody System

English is a **stress-timed** language where stress patterns affect pronunciation:

```typescript
interface StressPattern {
  word: string;
  syllableCount: number;
  primaryStress: number;      // 1-indexed syllable number
  secondaryStress?: number[];
  stressType: StressPatternType;
}

type StressPatternType =
  | 'fixed_initial'       // Germanic words: FATHer, MOTHer
  | 'fixed_final'         // French loans: bouTIQUE, unIQUE
  | 'penultimate'         // Latin pattern: toMAto, imPORtant
  | 'antepenultimate'     // Greek pattern: CINema, TELephone
  | 'suffix_determined'   // Suffix dictates stress: -tion, -ic, -ity
  | 'compound'            // Compound words: BLACKbird vs black BIRD
  | 'verb_noun_shift';    // REcord (n) vs reCORD (v)

// Stress-shifting suffixes in English
const STRESS_SHIFTING_SUFFIXES: StressSuffix[] = [
  // These suffixes ATTRACT stress to the syllable before them
  { suffix: '-ic', pattern: 'stress_on_preceding', examples: ['dramatic', 'electric', 'romantic'] },
  { suffix: '-ical', pattern: 'stress_on_preceding', examples: ['political', 'historical', 'practical'] },
  { suffix: '-ity', pattern: 'stress_on_preceding', examples: ['ability', 'community', 'electricity'] },
  { suffix: '-ion', pattern: 'stress_on_preceding', examples: ['education', 'nation', 'relation'] },
  { suffix: '-ian', pattern: 'stress_on_preceding', examples: ['musician', 'politician', 'technician'] },
  { suffix: '-ious', pattern: 'stress_on_preceding', examples: ['delicious', 'ambitious', 'religious'] },

  // These suffixes DO NOT change stress
  { suffix: '-ness', pattern: 'stress_neutral', examples: ['happiness', 'sadness', 'kindness'] },
  { suffix: '-ment', pattern: 'stress_neutral', examples: ['development', 'government', 'management'] },
  { suffix: '-ful', pattern: 'stress_neutral', examples: ['beautiful', 'wonderful', 'powerful'] },
  { suffix: '-less', pattern: 'stress_neutral', examples: ['careless', 'homeless', 'hopeless'] },
  { suffix: '-ly', pattern: 'stress_neutral', examples: ['quickly', 'slowly', 'carefully'] },
  { suffix: '-er', pattern: 'stress_neutral', examples: ['teacher', 'worker', 'player'] },
  { suffix: '-ing', pattern: 'stress_neutral', examples: ['running', 'teaching', 'learning'] },
  { suffix: '-ed', pattern: 'stress_neutral', examples: ['wanted', 'needed', 'started'] }
];

interface StressSuffix {
  suffix: string;
  pattern: 'stress_on_preceding' | 'stress_on_suffix' | 'stress_neutral';
  examples: string[];
}

// Vowel reduction under lack of stress
interface VowelReduction {
  fullVowel: Phoneme;
  reducedForm: Phoneme;
  contexts: string[];
  examples: Array<{ word: string; stressed: string; unstressed: string }>;
}

const VOWEL_REDUCTION_RULES: VowelReduction[] = [
  {
    fullVowel: 'æ',
    reducedForm: 'ə',
    contexts: ['unstressed syllable'],
    examples: [
      { word: 'man', stressed: '/mæn/', unstressed: '/mən/ (in "gentleman")' },
      { word: 'can', stressed: '/kæn/', unstressed: '/kən/ (weak form)' }
    ]
  },
  {
    fullVowel: 'ɪ',
    reducedForm: 'ə',
    contexts: ['unstressed syllable, especially before liquids'],
    examples: [
      { word: 'possible', stressed: '-', unstressed: '/ˈpɑsəbəl/' },
      { word: 'pencil', stressed: '-', unstressed: '/ˈpɛnsəl/' }
    ]
  },
  {
    fullVowel: 'oʊ',
    reducedForm: 'ə',
    contexts: ['unstressed position'],
    examples: [
      { word: 'photo', stressed: '/ˈfoʊtoʊ/', unstressed: '/fəˈtɑgrəfi/ (photography)' }
    ]
  }
];

// Verb-Noun stress shift pairs
const STRESS_SHIFT_PAIRS: Array<{ noun: StressPattern; verb: StressPattern }> = [
  { noun: { word: 'record', syllableCount: 2, primaryStress: 1, stressType: 'verb_noun_shift' },
    verb: { word: 'record', syllableCount: 2, primaryStress: 2, stressType: 'verb_noun_shift' } },
  { noun: { word: 'present', syllableCount: 2, primaryStress: 1, stressType: 'verb_noun_shift' },
    verb: { word: 'present', syllableCount: 2, primaryStress: 2, stressType: 'verb_noun_shift' } },
  { noun: { word: 'object', syllableCount: 2, primaryStress: 1, stressType: 'verb_noun_shift' },
    verb: { word: 'object', syllableCount: 2, primaryStress: 2, stressType: 'verb_noun_shift' } },
  { noun: { word: 'contract', syllableCount: 2, primaryStress: 1, stressType: 'verb_noun_shift' },
    verb: { word: 'contract', syllableCount: 2, primaryStress: 2, stressType: 'verb_noun_shift' } },
  { noun: { word: 'permit', syllableCount: 2, primaryStress: 1, stressType: 'verb_noun_shift' },
    verb: { word: 'permit', syllableCount: 2, primaryStress: 2, stressType: 'verb_noun_shift' } },
  { noun: { word: 'conduct', syllableCount: 2, primaryStress: 1, stressType: 'verb_noun_shift' },
    verb: { word: 'conduct', syllableCount: 2, primaryStress: 2, stressType: 'verb_noun_shift' } }
];
```

### 1.4.6 Silent Letter Patterns

Silent letters are a major source of spelling-pronunciation mismatch:

```typescript
interface SilentLetterPattern {
  letter: string;
  pattern: string;       // Regex or description
  position: 'initial' | 'medial' | 'final' | 'any';
  etymology: string;     // Why it's silent
  examples: string[];
  exceptionRate: number; // How often it's NOT silent
}

const SILENT_LETTER_PATTERNS: SilentLetterPattern[] = [
  // ===== INITIAL SILENT CONSONANTS =====
  {
    letter: 'k',
    pattern: 'kn-',
    position: 'initial',
    etymology: 'Old English - k was pronounced, lost in Modern English',
    examples: ['know', 'knife', 'knee', 'knock', 'knight', 'knit', 'knob', 'knot'],
    exceptionRate: 0
  },
  {
    letter: 'g',
    pattern: 'gn-',
    position: 'initial',
    etymology: 'Latin/Greek origin',
    examples: ['gnome', 'gnat', 'gnaw', 'gnu', 'gnarl'],
    exceptionRate: 0
  },
  {
    letter: 'w',
    pattern: 'wr-',
    position: 'initial',
    etymology: 'Old English - w was pronounced',
    examples: ['write', 'wrong', 'wrap', 'wreck', 'wrist', 'wrestle', 'wrinkle'],
    exceptionRate: 0
  },
  {
    letter: 'p',
    pattern: 'ps-, pn-, pt-',
    position: 'initial',
    etymology: 'Greek origin',
    examples: ['psychology', 'pneumonia', 'pterodactyl', 'psalm', 'pseudo'],
    exceptionRate: 0
  },
  {
    letter: 'h',
    pattern: 'h- in function words',
    position: 'initial',
    etymology: 'French influence',
    examples: ['hour', 'honest', 'honor', 'heir', 'herb (AmE)'],
    exceptionRate: 0.1  // Some dialects pronounce these
  },

  // ===== MEDIAL SILENT LETTERS =====
  {
    letter: 'b',
    pattern: '-mb, -bt',
    position: 'final',
    etymology: 'Was pronounced in Old/Middle English',
    examples: ['climb', 'lamb', 'comb', 'thumb', 'doubt', 'debt', 'subtle'],
    exceptionRate: 0
  },
  {
    letter: 'l',
    pattern: '-alk, -olk, -alm, -alf',
    position: 'medial',
    etymology: 'Sound change in certain environments',
    examples: ['walk', 'talk', 'folk', 'yolk', 'calm', 'palm', 'half', 'calf', 'salmon'],
    exceptionRate: 0.05
  },
  {
    letter: 't',
    pattern: '-sten, -stle, -tch',
    position: 'medial',
    etymology: 'Consonant cluster simplification',
    examples: ['listen', 'fasten', 'castle', 'whistle', 'watch', 'catch', 'match'],
    exceptionRate: 0
  },
  {
    letter: 'd',
    pattern: '-dg-',
    position: 'medial',
    etymology: 'Spelling convention (dg = /dʒ/)',
    examples: ['judge', 'bridge', 'edge', 'badge', 'ledge', 'hedge'],
    exceptionRate: 0
  },
  {
    letter: 'g',
    pattern: '-ign, -gn-',
    position: 'medial',
    etymology: 'Latin/French origin',
    examples: ['sign', 'design', 'resign', 'align', 'campaign', 'foreign'],
    exceptionRate: 0.02  // 'g' pronounced in 'signature'
  },

  // ===== FINAL SILENT E =====
  {
    letter: 'e',
    pattern: '-Ce (magic e)',
    position: 'final',
    etymology: 'Marks long vowel in preceding syllable',
    examples: ['make', 'time', 'hope', 'cute', 'theme'],
    exceptionRate: 0
  },

  // ===== SPECIAL PATTERNS =====
  {
    letter: 'gh',
    pattern: '-igh, -eigh, -ough (silent)',
    position: 'medial',
    etymology: 'Old English velar fricative lost',
    examples: ['night', 'light', 'weight', 'eight', 'though', 'through', 'thought'],
    exceptionRate: 0.15  // Sometimes /f/: cough, laugh
  },
  {
    letter: 'w',
    pattern: '-wr-, -wh- before o',
    position: 'any',
    etymology: 'Historical pronunciation lost',
    examples: ['answer', 'sword', 'two', 'who', 'whole', 'whose'],
    exceptionRate: 0.05
  }
];

// ===== THE NOTORIOUS "OUGH" =====
interface OughPattern {
  pronunciation: Phoneme[];
  pattern: string;
  examples: string[];
  frequency: number;
}

const OUGH_PRONUNCIATIONS: OughPattern[] = [
  { pronunciation: ['ʌf'], pattern: 'tough, rough, enough', examples: ['tough', 'rough', 'enough'], frequency: 0.20 },
  { pronunciation: ['oʊ'], pattern: 'though, dough', examples: ['though', 'dough', 'although'], frequency: 0.15 },
  { pronunciation: ['u'], pattern: 'through', examples: ['through', 'throughout'], frequency: 0.15 },
  { pronunciation: ['ɔ'], pattern: 'thought, bought', examples: ['thought', 'bought', 'fought', 'brought', 'ought'], frequency: 0.25 },
  { pronunciation: ['aʊ'], pattern: 'bough, plough', examples: ['bough', 'plough', 'drought'], frequency: 0.10 },
  { pronunciation: ['ɒf'], pattern: 'cough', examples: ['cough'], frequency: 0.05 },
  { pronunciation: ['ʌp'], pattern: 'hiccough (variant)', examples: ['hiccough'], frequency: 0.01 },
  { pronunciation: ['ə'], pattern: 'borough, thorough', examples: ['borough', 'thorough'], frequency: 0.09 }
];
```

### 1.4.7 Syllable Structure Rules

```typescript
interface SyllableStructure {
  onset: ConsonantCluster | null;
  nucleus: Phoneme;  // Always a vowel
  coda: ConsonantCluster | null;
}

type ConsonantCluster = Phoneme[];

// Maximum onset clusters in English
const VALID_ONSETS: string[] = [
  // Single consonants
  'p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'h', 'tʃ', 'dʒ', 'm', 'n', 'l', 'r', 'w', 'j',

  // Two-consonant clusters (C + approximant)
  'pl', 'pr', 'bl', 'br', 'tr', 'dr', 'kl', 'kr', 'gl', 'gr', 'fl', 'fr', 'θr', 'ʃr',
  'tw', 'dw', 'kw', 'gw', 'sw', 'θw',
  'pj', 'bj', 'tj', 'dj', 'kj', 'gj', 'fj', 'vj', 'hj', 'mj', 'nj', 'lj',

  // S + consonant clusters
  'sp', 'st', 'sk', 'sm', 'sn', 'sl', 'sw',

  // Three-consonant clusters (s + stop + approximant)
  'spl', 'spr', 'str', 'skr', 'skw', 'skj'
];

// Maximum coda clusters in English
const VALID_CODAS: string[] = [
  // Single consonants
  'p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'tʃ', 'dʒ', 'm', 'n', 'ŋ', 'l', 'r',

  // Two-consonant clusters
  'pt', 'kt', 'ft', 'st', 'ʃt', 'tʃt',
  'bd', 'gd', 'vd', 'zd', 'ʒd', 'dʒd',
  'mp', 'nt', 'nk', 'ŋk',
  'lp', 'lb', 'lt', 'ld', 'lk', 'lf', 'lv', 'ls', 'lz', 'lʃ', 'ltʃ', 'ldʒ', 'lm', 'ln',
  'rp', 'rb', 'rt', 'rd', 'rk', 'rg', 'rf', 'rv', 'rs', 'rz', 'rʃ', 'rtʃ', 'rdʒ', 'rm', 'rn', 'rl',
  'sp', 'sk',

  // Three-consonant clusters
  'mpt', 'mps', 'nts', 'nks', 'ŋks',
  'lpt', 'lts', 'lks', 'lps',
  'rpt', 'rts', 'rks', 'rps',
  'kst', 'ksts',  // "texts" /tɛksts/

  // Four-consonant clusters (rare)
  'mpst', 'ŋkθs',  // "prompts", "strengths"
  'lpts', 'lfθs'   // "sculpts", "twelfths"
];

interface SyllableComplexityMetrics {
  onsetComplexity: number;   // 0-1: how complex the onset cluster is
  codaComplexity: number;    // 0-1: how complex the coda cluster is
  totalComplexity: number;   // Combined metric
  violatesPhonototactics: boolean;  // Does it violate English rules?
}

function analyzeSyllableComplexity(syllable: SyllableStructure): SyllableComplexityMetrics {
  const onsetSize = syllable.onset?.length ?? 0;
  const codaSize = syllable.coda?.length ?? 0;

  // Onset complexity: single = 0, double = 0.3, triple = 0.7, invalid = 1.0
  let onsetComplexity = 0;
  if (onsetSize === 2) onsetComplexity = 0.3;
  else if (onsetSize === 3) onsetComplexity = 0.7;
  else if (onsetSize > 3) onsetComplexity = 1.0;

  // Check if onset is valid
  const onsetStr = syllable.onset?.join('') ?? '';
  if (onsetStr && !VALID_ONSETS.includes(onsetStr)) {
    onsetComplexity = 1.0;
  }

  // Coda complexity: similar logic but codas can be larger
  let codaComplexity = 0;
  if (codaSize === 2) codaComplexity = 0.25;
  else if (codaSize === 3) codaComplexity = 0.5;
  else if (codaSize === 4) codaComplexity = 0.8;
  else if (codaSize > 4) codaComplexity = 1.0;

  const codaStr = syllable.coda?.join('') ?? '';
  if (codaStr && !VALID_CODAS.includes(codaStr)) {
    codaComplexity = 1.0;
  }

  return {
    onsetComplexity,
    codaComplexity,
    totalComplexity: (onsetComplexity + codaComplexity) / 2,
    violatesPhonototactics: onsetComplexity === 1.0 || codaComplexity === 1.0
  };
}
```

### 1.4.8 Exception and Irregularity Categories

```typescript
type ExceptionCategory =
  | 'loan_word'           // Foreign borrowing retains original pronunciation
  | 'historical_relic'    // Old pronunciation preserved in spelling
  | 'homograph'           // Same spelling, different pronunciation
  | 'proper_noun'         // Names follow different rules
  | 'technical_term'      // Domain-specific pronunciation
  | 'frequency_exception' // Common words break rules
  | 'regional_variant';   // Different in different dialects

interface G2PException {
  word: string;
  expectedPronunciation: Phoneme[];   // What rules would predict
  actualPronunciation: Phoneme[];     // What it actually is
  category: ExceptionCategory;
  explanation: string;
  frequency: number;  // How common is this word?
  relatedExceptions: string[];  // Other words following same exception pattern
}

const G2P_EXCEPTIONS: G2PException[] = [
  // ===== LOAN WORDS =====
  {
    word: 'pizza',
    expectedPronunciation: ['p', 'ɪ', 'z', 'ə'],
    actualPronunciation: ['p', 'i', 't', 's', 'ə'],
    category: 'loan_word',
    explanation: 'Italian loan: "zz" = /ts/ not /z/',
    frequency: 0.8,
    relatedExceptions: ['piazza', 'mozzarella', 'paparazzi']
  },
  {
    word: 'genre',
    expectedPronunciation: ['dʒ', 'ɛ', 'n', 'r', 'i'],
    actualPronunciation: ['ʒ', 'ɑ', 'n', 'r', 'ə'],
    category: 'loan_word',
    explanation: 'French loan: "g" = /ʒ/, nasal vowel approximated',
    frequency: 0.6,
    relatedExceptions: ['beige', 'garage', 'rouge', 'massage']
  },
  {
    word: 'colonel',
    expectedPronunciation: ['k', 'oʊ', 'l', 'oʊ', 'n', 'ɛ', 'l'],
    actualPronunciation: ['k', 'ɝ', 'n', 'ə', 'l'],
    category: 'historical_relic',
    explanation: 'Spelling from Italian "colonnello", pronunciation from French "coronel"',
    frequency: 0.5,
    relatedExceptions: []
  },

  // ===== HOMOGRAPHS =====
  {
    word: 'read',
    expectedPronunciation: ['r', 'i', 'd'],
    actualPronunciation: ['r', 'ɛ', 'd'],  // Past tense
    category: 'homograph',
    explanation: 'Present "read" = /rid/, past "read" = /rɛd/',
    frequency: 0.95,
    relatedExceptions: ['lead', 'live', 'wind', 'bow', 'tear', 'bass']
  },
  {
    word: 'live',
    expectedPronunciation: ['l', 'aɪ', 'v'],  // Adjective
    actualPronunciation: ['l', 'ɪ', 'v'],     // Verb
    category: 'homograph',
    explanation: 'Verb "live" = /lɪv/, adjective "live" = /laɪv/',
    frequency: 0.9,
    relatedExceptions: ['read', 'lead', 'wind', 'bow', 'tear']
  },

  // ===== HIGH-FREQUENCY EXCEPTIONS =====
  {
    word: 'the',
    expectedPronunciation: ['θ', 'i'],
    actualPronunciation: ['ð', 'ə'],  // Weak form (most common)
    category: 'frequency_exception',
    explanation: 'Most common word - almost always reduced to /ðə/',
    frequency: 1.0,
    relatedExceptions: ['a', 'an', 'to', 'of', 'and']
  },
  {
    word: 'of',
    expectedPronunciation: ['ɑ', 'f'],
    actualPronunciation: ['ʌ', 'v'],
    category: 'frequency_exception',
    explanation: 'Common function word: "f" = /v/, vowel reduced',
    frequency: 1.0,
    relatedExceptions: ['the', 'a', 'to']
  },
  {
    word: 'have',
    expectedPronunciation: ['h', 'eɪ', 'v'],
    actualPronunciation: ['h', 'æ', 'v'],  // Or /həv/ weak form
    category: 'frequency_exception',
    explanation: 'Irregular vowel: "a" = /æ/ not /eɪ/',
    frequency: 0.95,
    relatedExceptions: ['give', 'live (verb)']
  },

  // ===== REGIONAL VARIANTS =====
  {
    word: 'schedule',
    expectedPronunciation: ['s', 'k', 'ɛ', 'dʒ', 'u', 'l'],
    actualPronunciation: ['ʃ', 'ɛ', 'd', 'j', 'u', 'l'],  // British
    category: 'regional_variant',
    explanation: 'AmE: /sk-/, BrE: /ʃ-/',
    frequency: 0.7,
    relatedExceptions: ['tomato', 'vitamin', 'lieutenant', 'herbs']
  },
  {
    word: 'either',
    expectedPronunciation: ['aɪ', 'ð', 'ɚ'],
    actualPronunciation: ['i', 'ð', 'ɚ'],  // Variant pronunciation
    category: 'regional_variant',
    explanation: 'Both /iðɚ/ and /aɪðɚ/ are acceptable',
    frequency: 0.8,
    relatedExceptions: ['neither']
  }
];
```

### 1.4.9 Integration: Complete Phonological Difficulty Score

```typescript
interface PhonologicalDifficultyComponents {
  g2pEntropy: number;           // From basic G2P model (0-1)
  mappingComplexity: number;    // One-to-many / many-to-one issues (0-1)
  vowelDifficulty: number;      // Vowel system complexity (0-1)
  stressUnpredictability: number;  // Stress pattern difficulty (0-1)
  silentLetterCount: number;    // Number of silent letters
  syllableComplexity: number;   // Onset/coda complexity (0-1)
  exceptionCategory: ExceptionCategory | null;
}

function computeComprehensiveP(
  word: string,
  g2pSpec: LanguageG2PSpec,
  vowelSystem: EnglishVowel[],
  exceptionDB: G2PException[]
): number {
  const components: PhonologicalDifficultyComponents = {
    g2pEntropy: computeG2PEntropy(word, g2pSpec.rules),
    mappingComplexity: assessMappingComplexity(word, ONE_TO_MANY_MAPPINGS, MANY_TO_ONE_MAPPINGS),
    vowelDifficulty: assessVowelDifficulty(word, vowelSystem),
    stressUnpredictability: assessStressUnpredictability(word),
    silentLetterCount: countSilentLetters(word, SILENT_LETTER_PATTERNS),
    syllableComplexity: computeWordSyllableComplexity(word),
    exceptionCategory: findExceptionCategory(word, exceptionDB)
  };

  // Weighted combination
  const weights = {
    g2pEntropy: 0.25,
    mappingComplexity: 0.15,
    vowelDifficulty: 0.20,
    stressUnpredictability: 0.15,
    silentLetters: 0.10,
    syllableComplexity: 0.10,
    exception: 0.05
  };

  let P = (
    weights.g2pEntropy * components.g2pEntropy +
    weights.mappingComplexity * components.mappingComplexity +
    weights.vowelDifficulty * components.vowelDifficulty +
    weights.stressUnpredictability * components.stressUnpredictability +
    weights.silentLetters * Math.min(1, components.silentLetterCount / 3) +
    weights.syllableComplexity * components.syllableComplexity +
    weights.exception * (components.exceptionCategory ? 1 : 0)
  );

  return Math.min(1, Math.max(0, P));
}
```

---

# Part 2: Foundational Constructs

## 2.1 The Zipf/FRE Value Axis

All learning objects are positioned on a **Zipf/FRE axis**:

```
Priority = (w_F × F + w_R × R + w_E × E) / Cost
```

| Metric | Full Name | Definition |
|--------|-----------|------------|
| **F** | Frequency | Real-world usage frequency in target corpus |
| **R** | Relational Density | Density of combinations with other components (hub score) |
| **E** | Contextual Contribution | Contribution to context-purpose achievement |

### Three Domains on the Axis

```
HEAD ←──────────────────────────────────────────────────────→ TAIL
High F, High R                                          Low F, Specialized
Core fluency                                            Precision/nuance

┌─────────────┬─────────────────────┬─────────────────────────┐
│    HEAD     │        BODY         │          TAIL           │
│  Domain     │       Domain        │         Domain          │
├─────────────┼─────────────────────┼─────────────────────────┤
│ High-freq   │ Structural hubs     │ Low-freq but pivotal    │
│ High-transfer│ Bridge words       │ Domain-specific         │
│ Core vocab  │ Grammatical anchors │ Technical terms         │
│ ~2000 words │ ~5000 words         │ Goal-dependent          │
└─────────────┴─────────────────────┴─────────────────────────┘
```

**Learning prioritization** is determined not by "difficulty/ease" but by **transfer effects and usage space expansion magnitude**.

---

## 2.2 Words as Multi-Dimensional Vectors

Words are defined not as memorizable items but as **multi-dimensional vectors**:

```typescript
interface LanguageObjectVector {
  // Form Layer
  phonological: {
    phonemes: string[];
    syllableStructure: string;
    stress: number[];
  };
  orthographic: {
    graphemes: string;
    spellingPatterns: string[];
    g2pExceptions: boolean;
  };

  // Structure Layer
  morphological: {
    root: string;
    prefixes: Affix[];
    suffixes: Affix[];
    inflectionParadigm: string;
  };
  syntactic: {
    partOfSpeech: string;
    subcategorization: string[];  // [+transitive], [+ditransitive]
    argumentStructure: string;
  };

  // Meaning Layer
  semantic: {
    semanticField: string;
    abstractionLevel: number;     // 1 (concrete) to 10 (abstract)
    polysemyIndex: number;        // Number of distinct senses
  };
  pragmatic: {
    register: 'formal' | 'neutral' | 'informal';
    domainSpecificity: number;    // 0 (general) to 1 (specialized)
    collocationalProfile: PMIPair[];
  };
}

interface PMIPair {
  coword: string;
  pmi: number;                    // Pointwise Mutual Information
  direction: 'left' | 'right' | 'both';
}
```

### Vector Attributes vs. User Abilities

**Critical distinction:**
- **Vector attributes** = Properties of the language object itself (immutable per corpus)
- **θ parameters** = User's proficiency state for that vector dimension (mutable per learner)

Problem design selects which **vector dimensions to spotlight**, while assessment measures **θ on those dimensions**.

---

## 2.2.1 The Five-Element Feature Vector z(w)

Beyond the detailed multi-dimensional representation above, LOGOS employs a **compact five-element feature vector** for algorithmic prioritization:

```
z(w) = [F_norm(w), R_norm(w), D(w), M_norm(w), P_norm(w)]
```

| Element | Full Name | Definition | Quantification Method |
|---------|-----------|------------|----------------------|
| **F** | Frequency | Normalized occurrence rate in target corpus | log-scale frequency / max frequency |
| **R** | Relational Density | Network centrality in co-occurrence graph | PMI-weighted hub score, dependency centrality |
| **D** | Domain Distribution | Multi-domain occurrence profile | Vector of relative frequencies per domain |
| **M** | Morphological Composition | Productive family membership | Family size × affix productivity × family frequency |
| **P** | Phonological Constraint | Pronunciation difficulty | G2P entropy + syllable complexity + error-prone patterns |

### Detailed Element Specifications

#### F: Frequency
```typescript
function computeF(word: string, corpus: Corpus): number {
  const rawFreq = corpus.getFrequency(word);
  const totalTokens = corpus.getTotalTokens();
  // Log-scale normalization to handle Zipfian distribution
  return Math.log(rawFreq + 1) / Math.log(totalTokens);
}
```

#### R: Relational Density
```typescript
function computeR(word: string, network: CooccurrenceGraph): number {
  const pmiScores = network.getCollocations(word);
  const dependencyHubScore = network.getDependencyCentrality(word);
  const cooccurrenceStrength = pmiScores.reduce((sum, p) => sum + p.pmi, 0) / pmiScores.length;

  return normalize(
    0.5 * cooccurrenceStrength +
    0.3 * dependencyHubScore +
    0.2 * pmiScores.length / MAX_COLLOCATIONS
  );
}
```

#### D: Domain Distribution Vector
```typescript
interface DomainDistribution {
  news: number;        // 뉴스/시사
  casual: number;      // 일상회화
  academic: number;    // 학술
  business: number;    // 비즈니스
  medical: number;     // 의료
  legal: number;       // 법률
  technical: number;   // 기술
}

function computeD(word: string, domainCorpora: Map<string, Corpus>): DomainDistribution {
  const freqs: Record<string, number> = {};
  let total = 0;

  for (const [domain, corpus] of domainCorpora) {
    freqs[domain] = corpus.getFrequency(word);
    total += freqs[domain];
  }

  // Normalize to probability distribution
  return Object.fromEntries(
    Object.entries(freqs).map(([k, v]) => [k, v / (total || 1)])
  ) as DomainDistribution;
}
```

#### M: Morphological Composition
```typescript
interface MorphologicalMetrics {
  familySize: number;      // Number of words sharing the root
  productivity: number;    // How freely affixes combine (0-1)
  familyFrequencySum: number;  // Total frequency of morphological family
}

function computeM(word: string, morphDB: MorphologicalDatabase): number {
  const analysis = morphDB.analyze(word);
  const family = morphDB.getMorphologicalFamily(analysis.root);

  const metrics: MorphologicalMetrics = {
    familySize: family.length,
    productivity: analysis.affixes.reduce((p, a) => p * a.productivity, 1),
    familyFrequencySum: family.reduce((sum, w) => sum + w.frequency, 0)
  };

  // Weighted combination
  return normalize(
    0.4 * Math.log(metrics.familySize + 1) +
    0.3 * metrics.productivity +
    0.3 * Math.log(metrics.familyFrequencySum + 1)
  );
}
```

#### P: Phonological Constraint (Difficulty)
```typescript
interface PhonologicalMetrics {
  g2pEntropy: number;           // Grapheme-to-phoneme mapping unpredictability
  syllableComplexity: number;   // Complex onset/coda clusters
  errorPronePatterns: number;   // Count of known difficult patterns
}

function computeP(word: string, g2pModel: G2PModel): number {
  const metrics: PhonologicalMetrics = {
    g2pEntropy: g2pModel.computeMappingEntropy(word),
    syllableComplexity: analyzeSyllableComplexity(word),
    errorPronePatterns: countErrorPronePatterns(word)
  };

  // Higher P = more difficult pronunciation
  return normalize(
    0.4 * metrics.g2pEntropy +
    0.35 * metrics.syllableComplexity +
    0.25 * (metrics.errorPronePatterns / MAX_ERROR_PATTERNS)
  );
}
```

### Usage in Priority Calculation

The five-element vector enables precise, multi-factor prioritization:

```typescript
// Base priority from language structure
function computeBasePriority(
  z: FiveElementVector,
  context: { domain: string; goal: string },
  weights: PriorityWeights
): number {
  const domainRelevance = z.D[context.domain] || 0;

  return (
    weights.frequency * z.F +
    weights.relational * z.R +
    weights.domain * domainRelevance +
    weights.morphological * z.M -
    weights.phonological * z.P  // P subtracts: higher difficulty = lower priority
  );
}
```

---

## 2.3 The θ (Theta) Concept: Strict Separation

θ represents a statistical variable indicating the **user's proficiency state**, distinct from content or problem attributes.

### Design Principles

| Phase | θ Treatment | Rationale |
|-------|-------------|-----------|
| **Learning** | No immediate θ updates | Allow trial-and-error without judgment anxiety |
| **Training** | Soft θ tracking (internal only) | Adjust difficulty without formal assessment |
| **Evaluation** | Precise IRT-based θ estimation | Maximum discrimination with minimal items |

### Why This Separation Matters

1. **Psychological safety**: Learners can experiment freely during training
2. **Statistical validity**: θ estimation requires controlled conditions
3. **Computational efficiency**: Reduces unnecessary IRT calculations
4. **API cost control**: Limits expensive Claude calls to evaluation phases

### Multi-Dimensional θ (Future State)

```typescript
interface UserProficiencyState {
  // Global estimate
  θ_global: number;              // Overall proficiency (-3 to +3 logits)

  // Component-specific (Phase 2+)
  θ_phonological: number;        // Sound-letter mapping
  θ_morphological: number;       // Word structure recognition
  θ_lexical: number;             // Vocabulary breadth/depth
  θ_syntactic: number;           // Sentence complexity tolerance
  θ_pragmatic: number;           // Context-appropriate selection

  // Confidence intervals
  se_θ: Record<string, number>;  // Standard error per dimension
}
```

---

## 2.4 Fluency vs. Versatility: Dual Engine Architecture

LOGOS distinctly separates two cognitive training modes:

### Fluency Engine

**Goal**: Automate background procedures in high-frequency patterns, reducing cognitive energy.

**Mechanism**: Powered by high-PMI network automation.

```
PMI(W₁, W₂) = log₂ [ P(W₁, W₂) / (P(W₁) × P(W₂)) ]
```

| Characteristic | Description |
|----------------|-------------|
| Target | Head/Body domain items |
| Task type | Time-pressured recall, pattern completion |
| Success metric | Speed + accuracy on high-PMI combinations |
| Coverage | ~80% of actual language use |

### Versatility Engine

**Goal**: Expand application scope across broader usage spaces.

**Mechanism**: Powered by self-construction of low-PMI combinations.

| Characteristic | Description |
|----------------|-------------|
| Target | Body/Tail domain items |
| Task type | Creative production, novel combination |
| Success metric | Grammatical validity + semantic coherence |
| Coverage | Nuance, creativity, specialized expression |

### Why Separate Training

Fluency and Versatility involve **conflicting cognitive strategies**:

| Fluency | Versatility |
|---------|-------------|
| Pattern matching | Pattern breaking |
| Speed prioritized | Deliberation required |
| Automatic retrieval | Conscious construction |
| Risk-averse | Risk-tolerant |

An **adaptive task engine** balances them per learner level:
- Beginners: 80% Fluency / 20% Versatility
- Intermediate: 60% Fluency / 40% Versatility
- Advanced: 40% Fluency / 60% Versatility

---

## 2.5 Cue-Free vs. Cue-Assisted: Cognitive Scaffolding

Outputs from learners are differentiated based on cognitive scaffolding presence:

| Mode | Examples | What It Measures |
|------|----------|------------------|
| **Cue-Free** | Blank input, no hints | True retrieval, combinatorial ability |
| **Cue-Assisted** | Autocomplete, word banks, example sentences | Pattern recognition, short-term performance |

### The Scaffolding Gap

The **gap between cue-assisted and cue-free performance** is a key proficiency indicator:

```typescript
interface ScaffoldingAnalysis {
  objectId: string;
  cueAssistedAccuracy: number;    // e.g., 0.85
  cueFreeAccuracy: number;        // e.g., 0.45
  scaffoldingGap: number;         // 0.40 (high = scaffolding dependent)
  recommendation: 'more_practice' | 'ready_for_advancement';
}
```

**High gap** → Item is scaffolding-dependent; needs more practice before cue removal
**Low gap** → Item is internalized; ready for advancement

---

## 2.6 Pragmatics as Statistical Formal Space

Pragmatics is not a set of rules but a **statistical formal space**:

| Traditional View | LOGOS View |
|------------------|------------|
| "Reports must have introduction, body, conclusion" | "Reports typically exhibit this distribution of discourse markers" |
| "Formal register requires these forms" | "Formal register has this probability distribution over lexical choices" |
| Rule compliance | Positional placement on distributions |

### Properties of Pragmatic Space

1. **Clear centers** but **loose boundaries**
2. **Permits free combinations** of other components
3. **Genre-specific probability distributions**

### Evaluation Approach

Not: "Did you follow the rule?"
But: "Where does your output fall on the distribution?"

```typescript
interface PragmaticEvaluation {
  genre: string;                  // 'medical_report', 'casual_email'
  expectedDistribution: number[]; // Probability vector over features
  actualDistribution: number[];   // Learner's output features
  divergence: number;             // KL divergence from expected
  withinAcceptable: boolean;      // < threshold
}
```

---

# Part 3: The Problem Generation Pipeline

## 3.1 Pipeline Overview

The core of LOGOS is not a curriculum but a **learning control pipeline**. Problems are generated through sequential layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: STATE ANALYSIS                  │
│  User θ + goal-based distance calculation                   │
│  Input: User profile, GoalSpec, activity logs               │
│  Output: Component priority vector                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 2: FRE PRIORITIZATION              │
│  Zipf/FRE-based component ranking                           │
│  Input: Target corpus, priority vector                      │
│  Output: Ranked learning objects                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 3: VECTOR SELECTION                │
│  Choose which vector dimensions to spotlight                │
│  Input: Learning object, current θ, target benchmark        │
│  Output: Vector dimension focus                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 4: TRANSFER CALCULATION            │
│  Co-invocation effects of simultaneous components           │
│  Input: Target component, co-occurring components           │
│  Output: Adjusted spotlight intensities                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 5: MODALITY & FORMAT               │
│  Combine channels, interpretation/production, formats       │
│  Input: Spotlight config, available content                 │
│  Output: Problem specification                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 6: SCORING STRATEGY                │
│  Determine logging and progress tracking method             │
│  Input: Problem type, evaluation criteria                   │
│  Output: Scoring rubric, logging config                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 7: IRT APPLICATION                 │
│  (Evaluation phase only) Precise θ estimation               │
│  Input: Response data, item parameters                      │
│  Output: Updated θ estimates with confidence                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3.2 Layer Details

### Layer 1: State Analysis

```typescript
interface StateAnalysis {
  currentθ: UserProficiencyState;
  goalSpec: GoalSpec;
  componentDistances: Map<ComponentType, number>;  // Distance to goal θ
  cognitiveLevarageAreas: ComponentType[];         // Max improvement potential
}
```

**Key operation**: Compute distances between target θ and current θ per component, identifying areas with **maximal cognitive leverage**.

### Layer 2: FRE Prioritization

Not "what to learn" but **"which components induce the most cognitive procedure reuse"**.

```typescript
function prioritize(objects: LanguageObject[], state: StateAnalysis): RankedObject[] {
  return objects
    .map(obj => ({
      object: obj,
      priority: computeFRE(obj, state) / computeCost(obj, state)
    }))
    .sort((a, b) => b.priority - a.priority);
}
```

### Layer 3: Vector Selection

Determine **which vector combinations to spotlight** for transitioning from current to next benchmarks.

```typescript
interface VectorSpotlight {
  primary: VectorDimension[];     // Main focus
  secondary: VectorDimension[];   // Background reinforcement
  exclude: VectorDimension[];     // Avoid overwhelming
}
```

### Layer 4: Transfer Calculation

Calculate **transfer/reinforcement effects** of components co-invoked during task execution.

```typescript
interface TransferEffect {
  targetComponent: ComponentType;
  coInvokedComponents: ComponentType[];
  transferMultiplier: number;       // > 1 = positive transfer
  interferenceRisk: number;         // > 0 = potential confusion
}
```

### Layer 5: Modality & Format

Combine along these dimensions:

| Dimension | Options |
|-----------|---------|
| Channel | Auditory, Visual, Mixed |
| Direction | Interpretation, Production |
| Format | Multiple choice, Fill-blank, Free response, Transformation |
| Length | Word, Phrase, Sentence, Paragraph, Discourse |
| Context | Isolated, Contextual, Integrated |

### Layer 6: Scoring Strategy

Different task types require different scoring:

| Task Type | Scoring Method |
|-----------|----------------|
| Recognition | Binary (correct/incorrect) |
| Recall | Partial credit per element |
| Production | Rubric-based (grammar, meaning, pragmatics) |
| Timed | Speed + accuracy composite |

### Layer 7: IRT Application

**Only in evaluation phase**:

```typescript
interface IRTEvaluation {
  responses: Response[];
  itemParameters: ItemParameter[];  // difficulty, discrimination, guessing
  estimatedθ: number;
  standardError: number;
  nextItemSelection: 'fisher_information' | 'kullback_leibler';
}
```

---

## 3.3 Learning → Training → Evaluation Stage Separation

| Stage | θ Treatment | Purpose | Task Design |
|-------|-------------|---------|-------------|
| **Learning** | Suspended | Concept introduction | Exposure, explanation, examples |
| **Training** | Soft tracking | Procedure stabilization | Practice with feedback, trial-error |
| **Evaluation** | IRT estimation | Precise measurement | Optimized for discrimination |

A single task can dual-role by combining **simple exposure with active cognitive manipulation**.

---

# Part 4: Internal vs. External Logic Separation

## 4.1 The MCP Architecture Principle

Core implementation strategy separates:

| Logic Type | Definition | Examples |
|------------|------------|----------|
| **Internal** | Mathematically/statistically self-contained | θ estimation, FRE computation, problem space generation, difficulty functions |
| **External (MCP)** | Content requiring external resources | Corpora, media, real content, Claude API |

### Interface Requirements

Each logic must be:
1. **Refined independently** (can improve without affecting other)
2. **Equipped with clear interfaces** (typed contracts)
3. **Integrated via signal flows** (not tight coupling)

```typescript
// Internal logic: pure functions, no external dependencies
function computePriority(object: LanguageObject, state: UserState): number {
  // Pure computation
}

// External logic: clearly marked, async, fallback-equipped
async function generateTaskContent(spec: TaskSpec): Promise<TaskContent> {
  // Claude API call with caching, retry, offline fallback
}
```

---

# Part 5: Statistical Evaluation Design

## 5.1 Transfer Effect Analysis

### Example 1: Morphological Affixation Training

**Claim**: Training on affixation stabilizes novel word inference abilities.

**Mechanism**:
1. Learn prefix "pre-" means "before" in known words (preview, prepare)
2. Encounter unknown "premonition"
3. Morphological inference procedure activates
4. Meaning partially predicted without explicit learning

**Measurement**:
```typescript
interface TransferMeasurement {
  trainedAffixes: string[];
  novelWordsWithAffixes: string[];
  inferenceAccuracyBefore: number;
  inferenceAccuracyAfter: number;
  transferGain: number;
}
```

### Example 2: Phoneme-Grapheme Training

**Claim**: G2P training reduces cognitive load in subsequent lexical/syntactic learning.

**Mechanism**:
1. Automate sound-letter correspondences
2. Orthographic parsing becomes unconscious
3. Freed cognitive resources available for higher-level processing
4. Vocabulary acquisition rate increases

**Measurement**: Compare vocabulary acquisition rate pre/post G2P mastery.

### Example 3: Syntactic-Domain Structure Pre-automation

**Claim**: Pre-automating genre-specific structures provides cognitive slack for semantic-pragmatic reasoning.

**Mechanism**:
1. Medical report structure becomes automatic (SOAP: Subjective, Objective, Assessment, Plan)
2. Working memory freed from structural planning
3. More resources available for content accuracy and nuance

**Measurement**: Compare content quality scores at matched structural complexity.

---

## 5.2 Problem Type Variables vs. Generation Variables

### Conceptual Separation

| Category | Definition | Examples |
|----------|------------|----------|
| **Problem Type Variables** | Inherent to problem format | Multiple choice vs. free response, interpretation vs. production, scoring method |
| **Generation Variables** | Combinable across pipeline | Target component, vector spotlight, difficulty, context, modality |

### Integration Strategy

```typescript
interface ProblemSpecification {
  // Generation variables (from pipeline)
  targetComponent: ComponentType;
  vectorSpotlight: VectorSpotlight;
  difficultyTarget: number;
  contextRichness: 'isolated' | 'contextual' | 'integrated';
  modality: 'auditory' | 'visual' | 'mixed';

  // Problem type variables (format selection)
  taskFormat: 'recognition' | 'recall' | 'production' | 'transformation';
  responseMode: 'selection' | 'construction';
  scoringMethod: 'binary' | 'partial' | 'rubric';
  timeConstraint: number | null;
}
```

**Design principle**: Generation variables select WHAT to test; problem type variables select HOW to test it.

---

# Part 6: Identified Gaps and Future Considerations

## 6.1 Blank Spots Requiring Further Development

| Gap | Description | Priority |
|-----|-------------|----------|
| **Threshold Detection Algorithm** | Automatic identification of bottleneck sub-skills blocking advancement | High |
| **Cross-Language Transfer Model** | How L1 competencies affect L2 learning cost estimates | Medium |
| **Semantic Stretch Criteria** | Among low-PMI combinations, what qualifies as "creative but permissible"? | Medium |
| **Cue-Free Minimum Baseline** | At what threshold is cue-free performance "usable without assistance"? | High |
| **Genre Distribution Modeling** | Comprehensive probability distributions for pragmatic evaluation | Medium |
| **Multi-Modal Integration** | How to combine text/audio/video in single coherent tasks | Low (Phase 2+) |

## 6.2 Open Research Questions

1. **IRT Model Selection**: 1PL vs 2PL vs 3PL for different component types?
2. **Transfer Decay**: How quickly do transfer effects diminish without reinforcement?
3. **Fluency-Versatility Transition**: When should system shift emphasis?
4. **Scaffolding Removal Timing**: Optimal schedule for reducing cue assistance?

## 6.3 Connections to Strengthen

| From | To | Connection Needed |
|------|------|-------------------|
| PMI computation | Task generation | Algorithm for converting PMI scores to difficulty estimates |
| θ estimation | Learning queue | Real-time priority adjustment based on θ changes |
| Scaffolding gap | Training mode | Automatic mode switching based on gap size |
| Genre distributions | Claude prompts | Template library for genre-appropriate content generation |

---

# Part 7: Mapping to Implementation

## 7.1 MVP Implementation Mapping

| Theoretical Concept | MVP Implementation | Full Implementation |
|---------------------|-------------------|---------------------|
| θ parameters | Single mastery stage (0-4) | Multi-dimensional IRT |
| FRE prioritization | (F + R + C) / Cost formula | Dynamic weight adjustment |
| Fluency engine | High-frequency task selection | PMI-based recall chains |
| Versatility engine | Production tasks at Stage 3-4 | Explicit low-PMI challenges |
| Cue-free separation | hint_level in responses | Differential analysis dashboard |
| Vector spotlighting | Fixed component selection | Dynamic vector weighting |
| Pipeline layers | Simplified 3-layer | Full 7-layer |
| IRT evaluation | Basic difficulty adjustment | Fisher Information item selection |
| Transfer calculation | Manual rules | Learned transfer coefficients |
| Pragmatic evaluation | Claude-based scoring | Distribution-based placement |

## 7.2 Phase Alignment

| Phase | Theoretical Features Activated |
|-------|------------------------------|
| **Phase 1** | Basic state tracking, simplified FRE, single θ |
| **Phase 2** | Component-specific tracking, modality profiles, z(w) vector storage |
| **Phase 3** | Transfer calculations, scaffolding gap analysis, S_eff priority, task-word matching |
| **Phase 4** | Full pipeline, IRT evaluation, pragmatic distributions |

---

*Document Version: 2.2*
*Source: Unified theoretical framework consolidation*
*Updated: 2026-01-04*
*Status: IMMUTABLE CONCEPTUAL FOUNDATION*
*All designs, algorithms, and modules must align with this framework*
*New in v2.1: Section 2.2.1 (Five-Element Feature Vector z(w))*
*New in v2.2: Section 1.4 (Extended G2P Model - Mapping Complexity, Vowel System, Stress/Prosody, Silent Letters, Syllable Structure, Exception Categories)*
