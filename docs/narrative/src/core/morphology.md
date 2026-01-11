# Morphology Analysis Module

> **Code**: `src/core/morphology.ts`
> **Tier**: 1 (Core Algorithm)

---

## Core Formulas

### Morphological Score (M Score)

Measures morphological richness of a word:

```
M = α × familySize_norm + β × productivity + γ × transparency + δ

α = 0.3  (family size weight)
β = 0.3  (productivity weight)
γ = 0.2  (transparency weight)
δ = morphemeBonus + domainBonus

familySize_norm = min(1, log₁₀(familySize + 1) / log₁₀(50))
morphemeBonus = min(0.2, (morphemeCount - 1) × 0.05)
domainBonus = 0.1 if domain-relevant affix present, else 0
```

### Difficulty Score

Difficulty based on morphological complexity:

```
D = baseScore + Σ(1 - productivity_i) × 0.15 + inflectionPenalty

baseScore:
  simple   = 0.1
  derived  = 0.3
  compound = 0.4
  complex  = 0.5

inflectionPenalty = 0.1 if inflected, else 0
```

### Family Frequency Sum (MorphoLex)

Based on Sánchez-Gutiérrez et al. (2018):

```
FFS = Σᵢ frequency(member_i)

Estimation (when corpus unavailable):
  estimate = 100 × lengthPenalty × rootBonus × commonBonus × complexityPenalty

lengthPenalty = max(0.1, 1 - (length - 4) × 0.1)
rootBonus = 3 if word === root
complexityPenalty = 0.7^(morphemeCount - 2) if morphemeCount > 2
```

---

## Affix Database

### ENGLISH_PREFIXES (lines 123-176)

**Negation**:

| Prefix | Meaning | Productivity | Domain |
|--------|---------|--------------|--------|
| un- | not, opposite | 0.9 | general |
| in- | not | 0.7 | general, academic |
| im- | not (before b,m,p) | 0.7 | general |
| dis- | not, opposite | 0.8 | general |
| anti- | against | 0.9 | general, medical |

**Time/Sequence**:

| Prefix | Meaning | Productivity |
|--------|---------|--------------|
| pre- | before | 0.85 |
| post- | after | 0.8 |
| ex- | former | 0.7 |
| neo- | new | 0.6 |

**Degree/Size**:

| Prefix | Meaning | Productivity | Domain |
|--------|---------|--------------|--------|
| hyper- | excessive | 0.7 | medical, technical |
| hypo- | under normal | 0.65 | medical |
| super- | above | 0.8 | general |
| sub- | below | 0.75 | general, medical |

**Medical-specific**:

| Prefix | Meaning | Productivity |
|--------|---------|--------------|
| cardio- | heart | 0.6 |
| neuro- | nerve | 0.6 |
| gastro- | stomach | 0.55 |
| hemo- | blood | 0.5 |

### ENGLISH_SUFFIXES (lines 181-234)

**Noun-forming**:

| Suffix | Meaning | Productivity |
|--------|---------|--------------|
| -tion | action/state | 0.9 |
| -ness | state/quality | 0.9 |
| -ment | action/result | 0.85 |
| -er | agent/doer | 0.95 |
| -ity | state/quality | 0.8 |

**Adjective-forming**:

| Suffix | Meaning | Productivity |
|--------|---------|--------------|
| -able | capable of | 0.9 |
| -less | without | 0.9 |
| -ful | full of | 0.85 |
| -ive | having quality | 0.8 |
| -al | relating to | 0.85 |

**Verb-forming**:

| Suffix | Meaning | Productivity |
|--------|---------|--------------|
| -ize | to make | 0.9 |
| -ify | to make | 0.8 |
| -ate | to cause | 0.75 |

**Medical-specific**:

| Suffix | Meaning | Productivity |
|--------|---------|--------------|
| -itis | inflammation | 0.7 |
| -osis | condition | 0.65 |
| -ectomy | surgical removal | 0.6 |
| -ology | study of | 0.7 |

---

## Morpheme Segmentation Algorithm

### segmentWord() (lines 401-486)

```typescript
function segmentWord(word: string, domain?: string): WordSegmentation {
  let remaining = word.toLowerCase();
  const morphemeSegments: MorphemeUnit[] = [];

  // 1. Extract prefixes (longest-first matching)
  const sortedPrefixes = Object.entries(ENGLISH_PREFIXES)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [prefix, affix] of sortedPrefixes) {
    if (remaining.startsWith(prefix) && remaining.length > prefix.length + 2) {
      if (domainMatch(affix.domains, domain)) {
        morphemeSegments.push({
          morpheme: prefix,
          type: 'prefix',
          meaning: affix.meaning,
          boundary: 'start'
        });
        remaining = remaining.slice(prefix.length);
        break;  // 1-pass only
      }
    }
  }

  // 2. Extract suffixes (from end)
  // 3. Check inflectional suffixes
  // 4. Remaining = root
  // 5. Syllable segmentation

  return { word, morphemeSegments, syllableSegments, ... };
}
```

### Inflection Suffix Detection (lines 491-519)

```typescript
function detectInflectionSuffix(word: string) {
  if (word.endsWith('ing')) return { suffix: 'ing', meaning: 'progressive' };
  if (word.endsWith('ed'))  return { suffix: 'ed', meaning: 'past tense' };
  if (word.endsWith('ies')) return { suffix: 'ies', meaning: 'plural (y→ies)' };
  if (word.endsWith('es'))  return { suffix: 'es', meaning: 'plural' };
  if (word.endsWith('s'))   return { suffix: 's', meaning: 'plural/3rd person' };
  if (word.endsWith('est')) return { suffix: 'est', meaning: 'superlative' };
  return null;
}
```

---

## Morphological Analysis Algorithm

### analyzeMorphology() (lines 1031-1124)

Multi-pass affix extraction:

```typescript
function analyzeMorphology(word: string, domain?: string, maxPasses = 3) {
  let remaining = word.toLowerCase();
  const prefixes: Affix[] = [];
  const suffixes: Affix[] = [];

  // Multi-pass prefix extraction (e.g., "anti-re-")
  for (let pass = 0; pass < maxPasses; pass++) {
    let found = false;
    for (const [prefix, affix] of sortedPrefixes) {
      if (remaining.startsWith(prefix) && remaining.length > prefix.length + 2) {
        prefixes.push(affix);
        remaining = remaining.slice(prefix.length);
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  // Multi-pass suffix extraction (outermost → innermost)
  for (let pass = 0; pass < maxPasses; pass++) {
    // Similar logic
  }

  // Normalize spelling changes (y→i, consonant doubling, etc.)
  remaining = normalizeRoot(remaining);

  // Detect inflection
  const inflection = detectInflection(original, remaining);

  // Determine derivation type
  let derivationType = 'simple';
  if (prefixes.length > 0 && suffixes.length > 0) derivationType = 'complex';
  else if (prefixes.length > 0 || suffixes.length > 0) derivationType = 'derived';

  return {
    word, root: remaining,
    prefixes, suffixes,
    inflection, derivationType,
    morphemeCount: 1 + prefixes.length + suffixes.length,
    difficultyScore: calculateMorphologicalDifficulty(...)
  };
}
```

### Root Normalization (lines 1130-1155)

Restore spelling changes:

```typescript
function normalizeRoot(root: string): string {
  // Remove consonant doubling: "runn" → "run"
  if (root[root.length-1] === root[root.length-2]) {
    const keepDoubled = ['ll', 'ss', 'ff', 'zz', 'cc'];
    if (!keepDoubled.includes(root.slice(-2))) {
      return root.slice(0, -1);
    }
  }

  // Restore y→i change: "happi" → "happy"
  if (root.endsWith('i') && isConsonant(root.charAt(-2))) {
    return root.slice(0, -1) + 'y';
  }

  return root;
}
```

---

## Morphological Family Construction

### buildMorphologicalFamily() (lines 639-725)

```typescript
function buildMorphologicalFamily(
  root: string,
  knownWords?: string[],
  wordFrequencies?: Map<string, number>
): MorphologicalFamily {
  const derivatives: Set<string> = new Set();
  const affixesUsed: Set<string> = new Set();

  // 1. Check known root database
  if (COMMON_ROOTS[root]) {
    COMMON_ROOTS[root].forEach(d => derivatives.add(d));
  }

  // 2. Search corpus for words containing root
  if (knownWords) {
    for (const word of knownWords) {
      if (word.includes(root) && word !== root) {
        derivatives.add(word);
      }
    }
  }

  // 3. Generate derivatives with productive affixes
  for (const prefix of productivePrefixes) {
    derivatives.add(prefix + root);
    affixesUsed.add(prefix);
  }

  for (const suffix of productiveSuffixes) {
    let derivative = root + suffix;
    // Apply spelling rules (e-deletion, y→i, etc.)
    derivatives.add(derivative);
    affixesUsed.add(suffix);
  }

  // 4. Calculate productivity
  const productivity = min(1, familySize × 0.1 + affixDiversity × 0.05 + 0.3);

  // 5. Calculate Family Frequency Sum
  const familyFrequencySum = calculateFamilyFrequencySum(
    root, Array.from(derivatives), wordFrequencies
  );

  return { root, derivatives, familySize, familyFrequencySum, productivity, affixesUsed };
}
```

### COMMON_ROOTS Database (lines 604-620)

Productive roots of Latin/Greek origin:

```typescript
const COMMON_ROOTS = {
  'act':    ['action', 'active', 'react', 'actor', 'activate', ...],
  'form':   ['inform', 'format', 'reform', 'transform', 'perform', ...],
  'port':   ['import', 'export', 'report', 'transport', 'support', ...],
  'ject':   ['inject', 'project', 'reject', 'subject', 'object', ...],
  'dict':   ['predict', 'dictate', 'dictionary', 'contradict', ...],
  'scrib':  ['describe', 'prescribe', 'subscribe', 'manuscript', ...],
  'spect':  ['inspect', 'expect', 'respect', 'spectator', ...],
  'duct':   ['conduct', 'produce', 'reduce', 'introduce', ...],
  'struct': ['construct', 'instruct', 'destruct', 'structure', ...],
  // ... 15 roots total
};
```

---

## M Score Calculation

### computeMorphologicalScore() (lines 870-916)

```typescript
function computeMorphologicalScore(
  word: string,
  domain?: string,
  knownWords?: string[]
): number {
  const analysis = analyzeMorphology(word, domain);
  const vector = toMorphologicalVector(word, domain);
  const family = buildMorphologicalFamily(analysis.root, knownWords);

  // 1. Normalize family size (log scale, max 50)
  const familySizeNorm = min(1, log₁₀(family.familySize + 1) / log₁₀(50));

  // 2. Productivity
  const productivityNorm = family.productivity;

  // 3. Transparency
  const transparencyNorm = vector.transparency;

  // 4. Morpheme bonus (diminishing returns)
  const morphemeBonus = min(0.2, (analysis.morphemeCount - 1) × 0.05);

  // 5. Domain bonus
  let domainBonus = 0;
  if (domain && hasRelevantDomainAffix(analysis, domain)) {
    domainBonus = 0.1;
  }

  // Combine
  const mScore =
    familySizeNorm × 0.3 +
    productivityNorm × 0.3 +
    transparencyNorm × 0.2 +
    morphemeBonus +
    domainBonus;

  return min(1, max(0, mScore));
}
```

---

## Transparency Calculation

### calculateTransparency() (lines 1283-1304)

Semantic predictability:

```typescript
function calculateTransparency(analysis: MorphologicalAnalysis): number {
  // Simple word: fully transparent
  if (analysis.derivationType === 'simple') return 1.0;

  // Derived word baseline
  let transparency = 0.5;

  // Productive affixes → increase transparency
  for (const prefix of analysis.prefixes) {
    transparency += prefix.productivity × 0.1;
  }
  for (const suffix of analysis.suffixes) {
    transparency += suffix.productivity × 0.1;
  }

  // Complex derivation → decrease transparency
  if (analysis.derivationType === 'complex') {
    transparency -= 0.1;
  }

  return min(1, max(0, transparency));
}
```

**Examples**:
- `unhappy`: un- (0.9) + happy → 0.5 + 0.09 = 0.59
- `contraindication`: contra- (0.6) + in- (0.7) + -tion (0.9) → complex → lower

---

## Transfer Effect Measurement

### findTransferCandidates() (lines 1347-1384)

Find new words sharing affixes with learned words:

```typescript
function findTransferCandidates(
  trainedWords: string[],
  candidateWords: string[],
  domain?: string
) {
  // Extract affixes from trained words
  const trainedAffixes = new Set<string>();
  for (const word of trainedWords) {
    const analysis = analyzeMorphology(word, domain);
    analysis.prefixes.forEach(p => trainedAffixes.add(p.form));
    analysis.suffixes.forEach(s => trainedAffixes.add(s.form));
  }

  // Find candidates with shared affixes
  return candidateWords
    .map(word => {
      const analysis = analyzeMorphology(word, domain);
      const shared = [...analysis.prefixes, ...analysis.suffixes]
        .map(a => a.form)
        .filter(a => trainedAffixes.has(a));

      if (shared.length === 0) return null;

      // Transfer potential = shared affixes × 0.3 + (1 - difficulty) × 0.2
      const potential = shared.length × 0.3 + (1 - analysis.difficultyScore) × 0.2;

      return { word, sharedAffixes: shared, transferPotential: min(1, potential) };
    })
    .filter(Boolean)
    .sort((a, b) => b.transferPotential - a.transferPotential);
}
```

### measureTransferEffect() (lines 1393-1412)

```typescript
function measureTransferEffect(
  trainedAffixes: string[],
  testResults: { word: string; correctBefore: boolean; correctAfter: boolean }[]
): MorphologicalTransfer {
  const correctBefore = testResults.filter(r => r.correctBefore).length;
  const correctAfter = testResults.filter(r => r.correctAfter).length;

  return {
    trainedAffixes,
    novelWords: testResults.map(r => r.word),
    accuracyBefore: correctBefore / testResults.length,
    accuracyAfter: correctAfter / testResults.length,
    transferGain: (correctAfter - correctBefore) / testResults.length
  };
}
```

---

## Irregular Forms Database

### IRREGULAR_PAST (lines 239-250)

```typescript
const IRREGULAR_PAST = {
  'be': 'was/were', 'have': 'had', 'do': 'did',
  'go': 'went', 'say': 'said', 'make': 'made',
  'take': 'took', 'come': 'came', 'see': 'saw',
  'think': 'thought', 'tell': 'told', 'find': 'found',
  // ... 50 irregular verbs
};
```

### IRREGULAR_PLURAL (lines 252-260)

```typescript
const IRREGULAR_PLURAL = {
  'child': 'children', 'man': 'men', 'woman': 'women',
  'tooth': 'teeth', 'foot': 'feet', 'mouse': 'mice',
  // Greek/Latin origin
  'analysis': 'analyses', 'diagnosis': 'diagnoses',
  'phenomenon': 'phenomena', 'criterion': 'criteria',
  'bacterium': 'bacteria', 'curriculum': 'curricula',
  // ... 20 irregular plurals
};
```

---

## Key Functions

| Function | Lines | Complexity | Purpose |
|----------|-------|------------|---------|
| `segmentWord` | 401-486 | O(p+s) | Morpheme/syllable segmentation |
| `analyzeMorphology` | 1031-1124 | O(p×m+s×m) | Complete morphological analysis |
| `toMorphologicalVector` | 1254-1278 | O(1) | Vector generation |
| `buildMorphologicalFamily` | 639-725 | O(w) | Morphological family |
| `computeMorphologicalScore` | 870-916 | O(w) | M score calculation |
| `calculateFamilyFrequencySum` | 749-772 | O(n) | FFS calculation |
| `findTransferCandidates` | 1347-1384 | O(t×c) | Transfer candidates |
| `measureTransferEffect` | 1393-1412 | O(n) | Transfer effect measurement |
| `extractLemma` | 1449-1487 | O(1) | Lemma extraction |
| `buildWordIndexes` | 924-967 | O(w) | Search indexes |

---

## Dependencies

```
morphology.ts (independent, no external dependencies)
  │
  ├──> component-vectors.ts
  │      Used for MORPHVector calculation
  │      - productivity → MORPHVector.productivity
  │      - transparency → MORPHVector.transparency
  │      - familySize → MORPHVector.familySize
  │
  ├──> bottleneck.ts
  │      MORPH component error pattern analysis
  │
  ├──> priority.ts
  │      Morphological Cost calculation
  │
  └──> Services:
       ├── task-generation.service (morphological tasks)
       ├── vocabulary-extraction (morphological info extraction)
       └── transfer-analysis (transfer effect tracking)
```

---

## Academic Foundation

- Sánchez-Gutiérrez, C.H. et al. (2018). *MorphoLex: A derivational morphological database for 70,000 English words*. Behavior Research Methods
- Baayen, R.H. & Schreuder, R. (1999). *War and peace: Morphemes and full forms in a noninteractive activation parallel dual-route model*. Brain and Language
- Bybee, J. (1995). *Regular morphology and the lexicon*. Language and Cognitive Processes
- Nation, I.S.P. (2001). *Learning Vocabulary in Another Language*. Cambridge University Press
