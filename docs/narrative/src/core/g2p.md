# Grapheme-to-Phoneme (G2P) Analysis Module

> **Code**: `src/core/g2p.ts`
> **Tier**: 1 (Core Algorithm)

---

## Core Formulas

### G2P Entropy

Quantifies pronunciation uncertainty of a word:

```
H(w) = -Σᵢ P(phoneme|grapheme,context) × log₂(P)

Normalized: H_norm = min(1, H(w) / 2)
```

**Interpretation**:
- H = 0: Perfectly predictable (cat, stop)
- H ≈ 0.5: Medium uncertainty (read, lead)
- H ≈ 1: High uncertainty (through, cough)

### Phonological Difficulty Score (P Score)

```
P(w) = α × H(w) + β × D(w) + γ × S(w)

α = 0.4  (entropy weight)
β = 0.4  (pattern difficulty weight)
γ = 0.2  (syllable complexity weight)

S(w) = min(1, (syllableCount - 1) / 5)
```

---

## Hierarchical G2P Model

Based on Ehri (2005), Treiman (1993), Ziegler & Goswami (2005):

```
┌─────────────────────────────────────────┐
│            Word Layer                    │
│  (whole word representation,             │
│   morphophonemic patterns)               │
├─────────────────────────────────────────┤
│           Syllable Layer                 │
│   (onset-rime structure, 6 syllable      │
│    types)                                │
├─────────────────────────────────────────┤
│          Alphabetic Layer                │
│    (individual grapheme-phoneme          │
│     correspondence rules)                │
└─────────────────────────────────────────┘
```

### Syllable Types (SyllableType)

| Type | Pattern | Example | Vowel Sound |
|------|---------|---------|-------------|
| closed | CVC | cat, stop | short vowel |
| open | CV | go, me | long vowel |
| silent-e | CVCe | make, time | long vowel |
| vowel-team | CVVC | rain, feet | team rules |
| r-controlled | CVr | car, bird | r-colored |
| consonant-le | Cle | table, apple | /əl/ |

---

## G2P Rule Database

### Rule Structure (lines 25-43)

```typescript
interface G2PRule {
  pattern: RegExp;        // grapheme pattern
  phoneme: string;        // IPA phoneme
  context: G2PContext;    // 'initial' | 'medial' | 'final' | 'any'
  exceptions: string[];   // exception word list
  reliability: number;    // reliability (0-1)
  domains?: string[];     // domains (medical, etc.)
}
```

### Key Rule Reliability

| Pattern | Phoneme | Reliability | Exceptions |
|---------|---------|-------------|------------|
| ee | /iː/ | 0.95 | 0 |
| ph | /f/ | 0.99 | 0 |
| ^kn | /n/ | 0.99 | 0 |
| ea | /iː/ | 0.70 | 16 (bread, head...) |
| ou | /aʊ/ | 0.50 | 15 (you, soul, cough...) |
| oo | /uː/ | 0.75 | 12 (book, blood...) |
| ch | /tʃ/ | 0.75 | 16 (school, chef...) |

### Medical Domain Rules (lines 519-552)

```typescript
// Greek-origin prefixes
{ pattern: /^psych/, phoneme: '/saɪk/', reliability: 0.99 }  // psychology
{ pattern: /^pneu/,  phoneme: '/njuː/', reliability: 0.99 }  // pneumonia
{ pattern: /^rhe/,   phoneme: '/riː/',  reliability: 0.95 }  // rheumatoid
{ pattern: /rrh/,    phoneme: '/r/',    reliability: 0.99 }  // hemorrhage
```

---

## L1 Interference Patterns

### Language-Specific Interference (lines 558-619)

**Spanish**:
```
sp- → /esp-/  (Spanish adds /e/ before s+consonant)
v   → /b/     (Spanish v/b merge)
th  → /t, d/  (lacks dental fricatives)
```

**Japanese**:
```
r ↔ l        (merger - bidirectional confusion)
v   → /b/    (lacks /v/)
f   → /h/    (Japanese f is bilabial)
consonant clusters → vowel insertion
```

**Mandarin**:
```
th  → /s, z/  (lacks dental fricatives)
v   → /w/     (lacks /v/)
final consonants → deletion
```

**Korean**:
```
f   → /p/     (lacks /f/)
r ↔ l        (allophonic variation)
final consonants → unreleased
```

---

## Grapheme Segmentation Algorithm

### segmentGraphemes() (lines 726-794)

```typescript
// Segmentation priority: trigraph > digraph > silent > single
while (i < word.length) {
  // 1. Check trigraphs (igh, tch, dge...)
  if (ENGLISH_TRIGRAPHS.includes(word.slice(i, i+3))) {
    // add trigraph unit
    i += 3;
    continue;
  }

  // 2. Check digraphs (sh, ch, th, ee, ai...)
  if (ENGLISH_DIGRAPHS.includes(word.slice(i, i+2))) {
    // add digraph unit
    i += 2;
    continue;
  }

  // 3. Check silent letters
  if (isSilentLetter(word, i)) {
    // add silent unit (phoneme = '')
    i++;
    continue;
  }

  // 4. Single grapheme
  // add single unit
  i++;
}
```

### Digraph/Trigraph Lists

**Digraphs** (29):
```
Consonants: ch, sh, th, wh, ph, gh, ck, ng, qu
Vowels: ee, ea, oo, ai, ay, oa, ou, ow, oi, oy, au, aw
R-controlled: ar, er, ir, or, ur
Others: ey, ie, ei, ue, ew
```

**Trigraphs** (10):
```
igh, tch, dge, air, ear, ure, ore, are, eer, oor
```

---

## Entropy Calculation Algorithm

### computeG2PEntropy() (lines 1033-1062)

```typescript
function computeG2PEntropy(word: string): number {
  const graphemes = segmentGraphemes(word);
  let totalEntropy = 0;

  for (const unit of graphemes) {
    const possiblePhonemes = getPossiblePhonemes(unit.grapheme);
    const n = possiblePhonemes.length;

    if (n <= 1) continue;  // no ambiguity

    const reliability = getGraphemeReliability(unit.grapheme);

    // H = log₂(n) × (1 - reliability)
    // More possibilities + lower reliability = higher entropy
    totalEntropy += Math.log2(n) * (1 - reliability);
  }

  // Normalize: average per grapheme, 0-1 range
  return Math.min(1, (totalEntropy / graphemes.length) / 2);
}
```

### Ambiguous Grapheme Phonemes (lines 1067-1091)

```typescript
const ambiguousGraphemes = {
  'a':  ['/æ/', '/eɪ/', '/ɑː/', '/ə/'],      // 4
  'ou': ['/aʊ/', '/uː/', '/ʌ/', '/oʊ/', '/ə/'], // 5
  'ea': ['/iː/', '/ɛ/', '/eɪ/'],              // 3
  'ch': ['/tʃ/', '/k/', '/ʃ/'],               // 3
  'gh': ['', '/f/', '/g/'],                   // 3 (includes silent)
  //...
};
```

---

## Difficulty Analysis Algorithm

### analyzeG2PDifficulty() (lines 1163-1248)

```typescript
function analyzeG2PDifficulty(word: string): G2PDifficulty {
  let difficultyScore = 0;
  const irregularPatterns: IrregularPattern[] = [];

  // 1. Check exception words (+0.2)
  for (const rule of ENGLISH_G2P_RULES) {
    if (rule.exceptions.includes(word)) {
      difficultyScore += 0.2;
      irregularPatterns.push({...});
    }
  }

  // 2. Silent letters (+0.15)
  if (checkSilentLetters(word)) {
    difficultyScore += 0.15;
  }

  // 3. Vowel combinations (each +0.1)
  const vowelDigraphs = word.match(/[aeiou]{2,}/g) || [];
  difficultyScore += vowelDigraphs.length * 0.1;

  // 4. Consonant clusters 3+ (each +0.15)
  const clusters = word.match(/[bcdfghjklmnpqrstvwxyz]{3,}/gi) || [];
  difficultyScore += clusters.length * 0.15;

  // 5. Syllable count (3+ adds +0.05 each)
  const syllables = countSyllables(word);
  if (syllables > 3) {
    difficultyScore += (syllables - 3) * 0.05;
  }

  // 6. Irregular stress (+0.1)
  if (checkIrregularStress(word)) {
    difficultyScore += 0.1;
  }

  return {
    word,
    irregularPatterns,
    difficultyScore: Math.min(1, difficultyScore),
    syllableCount: syllables,
    hasSilentLetters: ...,
    hasIrregularStress: ...,
    potentialMispronunciations: []
  };
}
```

---

## Syllable Counting

### countSyllables() (lines 1277-1308)

```typescript
function countSyllables(word: string): number {
  // 1. Count vowel groups
  let count = (word.match(/[aeiouy]+/g) || []).length;

  // 2. Silent-e adjustment (-1)
  if (word.endsWith('e') && !'aeiou'.includes(word.charAt(-2))) {
    count = Math.max(1, count - 1);
  }

  // 3. Syllabic -le adjustment (+1)
  if (word.endsWith('le') && !'aeiou'.includes(word.charAt(-3))) {
    count++;  // table, apple
  }

  // 4. Syllabic -ed adjustment (+1)
  if (word.endsWith('ed') && 'dt'.includes(word.charAt(-3))) {
    count++;  // wanted, needed
  }

  return Math.max(1, count);
}
```

**Accuracy**: ~85% for general English vocabulary. Dialect variation (fire: 1 vs 2 syllables) uses simple version.

---

## Hierarchical Profile System

### G2PHierarchicalProfile (lines 1758-1794)

```typescript
interface G2PHierarchicalProfile {
  alphabetic: {
    units: Map<string, AlphabeticUnit>;  // learned grapheme-phoneme mappings
    mastery: number;                      // overall mastery (0-1)
    difficulties: string[];               // problem patterns
  };

  syllable: {
    units: Map<string, SyllableUnit>;    // learned syllable patterns
    mastery: number;
    difficulties: string[];
  };

  word: {
    units: Map<string, WordUnit>;        // whole word representations
    mastery: number;
    sightWordCount: number;              // sight word count
  };

  l1: string;  // native language
  l2: string;  // target language
}
```

### assessHierarchicalReadiness() (lines 2109-2176)

Evaluates if learner is ready to learn a specific word by layer:

```typescript
function assessHierarchicalReadiness(profile, word) {
  const hierarchy = parseWordHierarchy(word);

  // Alphabetic layer: knows all graphemes?
  let knownGraphemes = 0;
  for (const unit of hierarchy.alphabetic) {
    if (profile.alphabetic.units.get(unit.grapheme)?.acquisitionStage >= 2) {
      knownGraphemes++;
    }
  }
  const alphabeticReadiness = knownGraphemes / hierarchy.alphabetic.length;

  // Syllable layer: knows all syllable patterns?
  // ... (similar logic)

  // Determine recommended level
  if (alphabeticReadiness < 0.7) {
    return { recommendedLevel: 'alphabetic', prerequisites: [...] };
  } else if (syllableReadiness < 0.7) {
    return { recommendedLevel: 'syllable', prerequisites: [...] };
  } else {
    return { recommendedLevel: 'word' };
  }
}
```

---

## Transfer Effect Measurement

### findG2PTransferCandidates() (lines 1549-1580)

Find words sharing patterns with learned words:

```typescript
function findG2PTransferCandidates(trainedWords, candidateWords) {
  // Extract patterns from trained words
  const trainedPatterns = new Set<string>();
  for (const word of trainedWords) {
    const vector = toOrthographicVector(word);
    vector.spellingPatterns.forEach(p => trainedPatterns.add(p));
  }

  // Find shared patterns in candidate words
  return candidateWords
    .map(word => {
      const shared = getSpellingPatterns(word)
        .filter(p => trainedPatterns.has(p));

      if (shared.length === 0) return null;

      // Transfer potential = shared patterns × 0.25 + (1 - difficulty) × 0.3
      const potential = shared.length * 0.25 +
                       (1 - analyzeG2PDifficulty(word).difficultyScore) * 0.3;

      return { word, sharedPatterns: shared, transferPotential: potential };
    })
    .filter(Boolean)
    .sort((a, b) => b.transferPotential - a.transferPotential);
}
```

---

## Key Functions

| Function | Lines | Complexity | Purpose |
|----------|-------|------------|---------|
| `segmentGraphemes` | 726-794 | O(n) | Grapheme segmentation |
| `computeG2PEntropy` | 1033-1062 | O(n) | Pronunciation uncertainty |
| `computePhonologicalDifficulty` | 1121-1139 | O(n) | P score calculation |
| `analyzeG2PDifficulty` | 1163-1248 | O(n×r) | Difficulty analysis |
| `analyzeG2PWithL1` | 1389-1402 | O(n×p) | Analysis including L1 interference |
| `countSyllables` | 1277-1308 | O(n) | Syllable count |
| `parseWordHierarchy` | 1802-1840 | O(n) | Hierarchical decomposition |
| `assessHierarchicalReadiness` | 2109-2176 | O(n) | Learning readiness |
| `findG2PTransferCandidates` | 1549-1580 | O(m×n) | Transfer candidates |

---

## Dependencies

```
g2p.ts (independent, no external dependencies)
  │
  ├──> component-vectors.ts
  │      Used for PHONVector calculation
  │
  ├──> g2p-irt.ts
  │      Applies IRT to G2P rules
  │
  ├──> priority.ts
  │      Phonological Cost calculation
  │
  └──> Services:
       ├── task-generation.service (pronunciation task generation)
       ├── scoring-update.service (G2P mastery tracking)
       └── pronunciation-training (L1-tailored feedback)
```

---

## Academic Foundation

- Ehri, L.C. (2005). *Learning to read words: Theory, findings, and issues*. Scientific Studies of Reading
- Treiman, R. (1993). *Beginning to Spell*. Oxford University Press
- Ziegler, J.C. & Goswami, U. (2005). *Reading acquisition, developmental dyslexia, and skilled reading across languages*. Psychological Bulletin
- Kessler, B. & Treiman, R. (2001). *Relationships between sounds and letters in English monosyllables*. Journal of Memory and Language
