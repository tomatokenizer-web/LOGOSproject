# Morphological Analysis Module

> **Last Updated**: 2026-01-04
> **Code Location**: `src/core/morphology.ts`
> **Status**: Active
> **Theoretical Foundation**: ALGORITHMIC-FOUNDATIONS.md Part 6.1, THEORETICAL-FOUNDATIONS.md Section 2.2

---

## Context & Purpose

### Why This Module Exists

The Morphological Analysis module answers: **"How is this word built, and what can we learn from its pieces?"**

Consider the word "contraindication" in a medical context. A learner who knows:
- "contra-" means "against"
- "-tion" creates nouns from verbs
- "indicate" is the root

...can infer meaning even without seeing this exact word before. This is **Transfer Effect**: training on word parts accelerates learning of novel words.

**Business Need**: LOGOS aims to teach vocabulary efficiently. Rather than treating every word as isolated, morphological analysis enables:
1. Grouping words by shared affixes (teach "un-" once, apply to hundreds of words)
2. Measuring transfer (did learning "pre-" help with "predict", "prevent", "precaution"?)
3. Estimating difficulty (words with rare affixes are harder)
4. Generating the morphological component of LanguageObjectVector

### When Used

- **LanguageObjectVector generation**: Every vocabulary item gets analyzed for its `morphological` property
- **Task generation**: Difficulty is calibrated based on morpheme count and affix productivity
- **Bottleneck detection**: Identifies if morphology (MORPH component) is causing cascading errors
- **Transfer measurement**: Tracks whether affix training improves novel word inference
- **Scaffolding decisions**: Words with transparent morphology get different hints than opaque ones

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

This module is **self-contained** with no external dependencies. It includes:
- Built-in affix databases (`ENGLISH_PREFIXES`, `ENGLISH_SUFFIXES`)
- Irregular form tables (`IRREGULAR_PAST`, `IRREGULAR_PLURAL`)
- All analysis functions are pure TypeScript without external libraries

### Dependents (What Needs This)

| File | Usage |
|------|-------|
| **`src/core/component-vectors.ts`** | `MORPHVector` 타입은 이 모듈의 분석 결과를 구조화: `productivity`, `transparency`, `familySize`, `paradigmComplexity` 등. [component-vectors.md](component-vectors.md) 참조 |
| `src/core/bottleneck.ts` | Uses component type 'MORPH' for cascade analysis; pattern extraction references morphological error patterns |
| `src/core/types.ts` | Defines `MorphologicalAnalysis` and `Affix` interfaces that this module implements |
| `src/shared/types.ts` | Re-exports morphology-related types for IPC communication |
| `src/main/services/claude.ts` | (Expected) Uses morphological analysis for vocabulary extraction requests |
| Task generation system | (Expected) Calibrates task difficulty using `difficultyScore` |

**MORPHVector 연결**: 이 모듈의 출력이 `MORPHVector`의 차원 값을 채웁니다:
- `toMorphologicalVector().transparency` → `MORPHVector.transparency`
- `toMorphologicalVector().productivity` → `MORPHVector.productivity`
- Family size는 corpus 분석에서 별도 계산 필요

### Data Flow

```
Word Input (e.g., "unhappiness")
    |
    v
analyzeMorphology()
    |
    +---> Prefix Detection: longest-match-first against ENGLISH_PREFIXES
    |         Result: [{ form: 'un-', meaning: 'not, opposite', productivity: 0.9 }]
    |
    +---> Suffix Detection: longest-match-first against ENGLISH_SUFFIXES
    |         Result: [{ form: '-ness', meaning: 'state/quality', productivity: 0.9 }]
    |
    +---> Root Extraction: "happi" (remaining after affix removal)
    |
    +---> Inflection Detection: 'base' (no inflection markers)
    |
    +---> Derivation Type: 'complex' (both prefix and suffix)
    |
    +---> Difficulty Calculation: based on affix productivity and derivation type
    |
    v
MorphologicalAnalysis Result
    |
    v
toMorphologicalVector()
    |
    +---> Transparency: How predictable is meaning from parts (0.7 for this word)
    |
    +---> Productivity: Average affix productivity (0.9)
    |
    +---> Inflection Paradigm: "prefix:un-|suffix:-ness|inflection:base|type:complex"
    |
    v
MorphologicalVector (for LanguageObjectVector.morphological)
```

---

## Macroscale: System Integration

### Architectural Role

This module sits in the **Language Analysis Layer** of LOGOS architecture:

```
Layer 1: User Interface (React)
    |
Layer 2: IPC Communication (Electron)
    |
Layer 3: Core Algorithms <-- morphology.ts lives here
    |     |- irt.ts (ability estimation)
    |     |- fsrs.ts (spacing)
    |     |- pmi.ts (collocations)
    |     |- morphology.ts (word structure) <-- YOU ARE HERE
    |     |- bottleneck.ts (uses morphology)
    |     +- priority.ts (scheduling)
    |
Layer 4: Database (Prisma/SQLite)
```

### Big Picture Impact

Morphological analysis enables three critical LOGOS capabilities:

**1. Transfer Learning Measurement**

The Transfer Effect (from THEORETICAL-FOUNDATIONS.md) is LOGOS's ability to measure when learning one thing improves performance on related items. For morphology:
- Train a user on words with "pre-" (preview, predict, precaution)
- Test on novel "pre-" words they haven't seen (prepayment, preapproval)
- Measure: Did the affix training transfer?

The `findTransferCandidates()` and `measureTransferEffect()` functions implement this.

**2. LanguageObjectVector Generation**

Every vocabulary item in LOGOS has a multi-dimensional vector representation:
```
LanguageObjectVector = {
    orthographic: ...,
    phonological: ...,
    morphological: <-- This module provides this
    syntactic: ...,
    semantic: ...,
    pragmatic: ...
}
```

The `morphological` component includes:
- Root/stem identification
- Prefix and suffix chains
- Inflection paradigm classification
- Transparency score (meaning predictability from parts)
- Productivity score (how freely affixes combine)

**3. Difficulty Estimation**

Task difficulty depends heavily on morphological complexity:

| Derivation Type | Base Difficulty | Example |
|-----------------|-----------------|---------|
| simple | 0.1 | "cat" |
| derived | 0.3 | "unhappy" |
| compound | 0.4 | "toothbrush" |
| complex | 0.5 | "unacceptable" |

Low-productivity affixes add difficulty (rare patterns are harder to recognize).

### Critical Path Analysis

**Importance Level**: Medium-High

- **If this fails**: LanguageObjectVectors will be incomplete, transfer effects unmeasured, and difficulty estimation less accurate
- **Fallback behavior**: Words can still be learned without morphological analysis, but with reduced efficiency
- **No direct user-facing failure**: Users won't see errors, but learning optimization suffers
- **Bottleneck detection degrades**: MORPH component errors may be misattributed to other components

---

## Technical Concepts (Plain English)

### Affix Productivity

**Technical**: A productivity value (0-1) indicating how freely an affix combines with new roots in the language, based on type frequency and neologism rates.

**Plain English**: How "generative" is this word part? The prefix "un-" is highly productive (0.9)---you can say "unhappy", "unclear", "unfair" and even create new words like "uninstall". But "circum-" is low productivity (0.5)---you can't just attach it to any word.

**Why We Use It**: High-productivity affixes are easier to learn because they appear everywhere. Low-productivity affixes need more explicit teaching.

### Semantic Transparency

**Technical**: A transparency score (0-1) measuring how compositionally predictable a word's meaning is from its morphological parts.

**Plain English**: Can you guess what the word means by knowing its pieces? "Unhappy" is transparent---it clearly means "not happy". But "understand" is opaque---it has nothing to do with "under" or "standing".

**Why We Use It**: Transparent words can be scaffolded differently ("What does 'un-' mean? What does 'happy' mean? So what does 'unhappy' mean?"). Opaque words need holistic memorization.

### Derivation Type

**Technical**: Classification of word-formation process: simple (monomorphemic), derived (root + affix), compound (root + root), or complex (multiple affixes).

**Plain English**: How was this word built?
- **Simple**: Just one piece, like "cat" or "run"
- **Derived**: A root with something added, like "un+happy" or "teach+er"
- **Compound**: Two words stuck together, like "tooth+brush"
- **Complex**: Multiple pieces layered, like "un+accept+able"

**Why We Use It**: Complex words need more processing time and may require breaking down into components for learning.

### Inflection vs. Derivation

**Technical**: Inflection changes grammatical properties without creating new lexemes (run/runs/ran). Derivation creates new lexemes with potentially different meaning or part of speech (run/runner).

**Plain English**:
- **Inflection** = same word, different form (walk/walking/walked are all the same word)
- **Derivation** = new word created (walk -> walker is a new word with new meaning)

**Why We Use It**: Inflection errors suggest morphology bottleneck. Derivation patterns enable transfer learning.

### Lemmatization

**Technical**: Reducing inflected forms to their dictionary entry form (lemma). "running" -> "run", "better" -> "good".

**Plain English**: Finding the "base word" you'd look up in a dictionary. If you see "children", the lemma is "child". If you see "went", the lemma is "go".

**Why We Use It**: Links all forms of a word together so learning "go" helps with "went", "going", "gone".

---

## Key Functions Explained

### analyzeMorphology(word, domain?)

**Purpose**: Complete morphological breakdown of a word.

**Process**:
1. Normalize input (lowercase, trim)
2. Check prefixes longest-first (prevent "un" matching before "under")
3. Check suffixes longest-first (prevent "-tion" matching before "-ation")
4. Extract remaining root
5. Detect inflection type (base, past, plural, etc.)
6. Classify derivation type
7. Calculate difficulty score

**Returns**: `MorphologicalAnalysis` with word, root, prefixes[], suffixes[], inflection, derivationType, morphemeCount, difficultyScore

### toMorphologicalVector(word, domain?)

**Purpose**: Generate the morphological component for LanguageObjectVector.

**Additional Calculations**:
- **Transparency**: How predictable is meaning from parts
- **Productivity**: Average affix productivity
- **Inflection Paradigm**: String encoding of morphological structure

### findTransferCandidates(trainedWords, candidateWords, domain?)

**Purpose**: Find novel words that share affixes with already-trained words.

**Use Case**: User has practiced "predict", "prevent", "precaution". Find other "pre-" words they might now recognize: "prepayment", "preapproval", "preemptive".

**Returns**: Ranked list by transfer potential (how likely training will help).

### measureTransferEffect(trainedAffixes, testResults)

**Purpose**: Measure if affix training actually improved novel word performance.

**Input**:
- Which affixes were trained
- Test results: {word, correctBefore, correctAfter}

**Returns**: `MorphologicalTransfer` with accuracyBefore, accuracyAfter, transferGain

---

## Affix Database Design

### Prefix Categories

| Category | Examples | Meaning Pattern |
|----------|----------|-----------------|
| Negation/Opposition | un-, in-, dis-, non-, anti- | "not", "opposite", "against" |
| Time/Order | pre-, post-, ex-, neo- | "before", "after", "former" |
| Degree/Size | super-, sub-, over-, under-, hyper- | "above", "below", "excessive" |
| Quantity | mono-, bi-, tri-, multi-, poly- | "one", "two", "three", "many" |
| Direction/Location | inter-, intra-, trans-, extra-, circum- | "between", "within", "across" |
| Manner | re-, mis-, co-, auto- | "again", "wrongly", "together", "self" |
| Medical | cardio-, neuro-, gastro-, hemo- | body-part specific |

### Suffix Categories

| Category | Examples | Creates |
|----------|----------|---------|
| Noun-forming | -tion, -ment, -ness, -ity, -er | Nouns from verbs/adjectives |
| Adjective-forming | -ful, -less, -able, -ous, -ive | Adjectives from nouns/verbs |
| Verb-forming | -ize, -ify, -ate, -en | Verbs from nouns/adjectives |
| Adverb-forming | -ly, -ward, -wise | Adverbs from adjectives |
| Medical | -itis, -osis, -ectomy, -ology | Condition/procedure terms |

### Domain Filtering

Each affix has optional `domains` array:
- `general`: Applies across all contexts
- `medical`: Specialized medical terminology
- `academic`: Formal/scholarly usage
- `business`: Professional/commercial contexts
- `technical`: Technical/engineering contexts

When analyzing with a domain, affixes are filtered to relevant ones.

---

## Integration with Bottleneck Detection

The Bottleneck module (Part 7) uses morphology as the MORPH component in its cascade:

```
PHON -> MORPH -> LEX -> SYNT -> PRAG
         ^
         |
   Morphology errors here cause downstream LEX and SYNT errors
```

**Error Pattern Detection** (in bottleneck.ts):
```typescript
case 'MORPH':
  if (content.match(/ing$/)) return '-ing endings';
  if (content.match(/ed$/)) return '-ed endings';
  if (content.match(/s$/)) return 'plurals/3rd person';
  if (content.match(/tion$/)) return '-tion nominalizations';
  return 'other word forms';
```

When a user struggles with "-ing" endings across multiple tasks, the bottleneck system:
1. Detects high MORPH error rate
2. Checks if LEX and SYNT also elevated (cascade pattern)
3. Recommends: "Focus on Morphology (word forms). Specifically practice: -ing endings."

---

## Change History

### 2026-01-04 - Initial Implementation
- **What Changed**: Created complete morphological analysis module
- **Why**: Enable transfer learning measurement and LanguageObjectVector.morphological generation
- **Impact**: Foundation for morphology-aware vocabulary learning

### Features Implemented
- Affix detection with 50+ English prefixes and suffixes
- Domain-specific affix filtering (medical, academic, etc.)
- Irregular form handling (irregular past tense, irregular plurals)
- Morphological vector generation for LanguageObjectVector
- Transfer candidate identification
- Transfer effect measurement
- Complexity/difficulty scoring
- Lemma extraction (simplified)

### Future Considerations
- Multi-language affix databases (currently English-only)
- Machine learning-based affix recognition for edge cases
- Integration with pronunciation analysis for morphophonemic rules
- Compound word splitting (currently basic pattern matching)
