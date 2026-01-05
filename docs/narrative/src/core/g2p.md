# Grapheme-to-Phoneme (G2P) Analysis Module

> **Last Updated**: 2026-01-04
> **Code Location**: `src/core/g2p.ts`
> **Status**: Active

---

## Context & Purpose

This module exists to solve a fundamental challenge in language learning: English spelling is notoriously inconsistent with pronunciation. Words like "through," "though," "tough," and "thought" all contain "ough" but pronounce it differently. For language learners, this creates significant confusion and pronunciation errors.

The G2P module analyzes the relationship between how words are spelled (graphemes) and how they're pronounced (phonemes), enabling LOGOS to:

1. **Predict pronunciation difficulty** before presenting words to learners
2. **Anticipate specific errors** based on a learner's native language
3. **Measure learning transfer** when spelling patterns are mastered

**Business Need**: Language learners waste time and develop fossilized pronunciation errors when they're given words with unpredictable spelling-pronunciation relationships without proper support. By analyzing G2P patterns, LOGOS can scaffold pronunciation instruction, present words in optimal order, and provide targeted feedback.

**When Used**:
- During vocabulary task generation to estimate word difficulty
- When computing LanguageObjectVector phonological and orthographic dimensions
- When predicting what errors a specific learner might make
- When measuring whether mastering one spelling pattern helps with learning similar patterns

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

This module is intentionally self-contained with no external dependencies. It implements:
- Pure TypeScript for all analysis
- Regex-based pattern matching for G2P rules
- Heuristic algorithms for syllable counting and stress estimation

**Design Rationale**: By avoiding external phoneme dictionaries (like CMU Pronouncing Dictionary), the module remains lightweight and works offline. The trade-off is reduced accuracy for irregular words, which is acceptable for difficulty estimation purposes.

### Dependents (What Needs This)

- `src/core/languageObjectVector.ts`: Calls `toPhonologicalVector()` and `toOrthographicVector()` to populate the phonological and orthographic dimensions of vocabulary items
- `src/scheduling/taskCalibration.ts`: Uses `analyzeG2PDifficulty()` to estimate pronunciation task difficulty for the Scheduler
- `src/learning/pronunciationTraining.ts`: Uses `predictMispronunciations()` to generate L1-specific pronunciation feedback
- `src/analytics/transferEffects.ts`: Uses `findG2PTransferCandidates()` and `measureG2PTransfer()` to track how G2P training affects vocabulary acquisition

### Data Flow

```
Word input
    |
    v
analyzeG2PDifficulty() --> checks against ENGLISH_G2P_RULES
    |                           |
    |                           v
    |                   identifies exception words
    |                   detects silent letters
    |                   finds vowel digraphs
    |                   counts consonant clusters
    |
    v
G2PDifficulty result
    |
    +--> difficultyScore (0-1) --> Task Calibration
    +--> irregularPatterns --> Diagnostic UI
    +--> syllableCount --> Phonological Vector
    |
    v
If L1 provided: analyzeG2PWithL1()
    |
    v
L1Mispronunciation predictions --> Pronunciation Feedback
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits in the **Core Analysis Layer** of LOGOS architecture:

```
Layer 1: User Interface (pronunciation exercises, feedback displays)
    |
Layer 2: Learning Engine (task selection, feedback generation)
    |
Layer 3: Core Analysis <-- G2P MODULE LIVES HERE
    |       - Analyzes linguistic properties of vocabulary items
    |       - Computes difficulty metrics
    |       - Generates vectors for knowledge representation
    |
Layer 4: Data Layer (vocabulary databases, learner profiles)
```

### Big Picture Impact

The G2P module enables three major LOGOS capabilities:

**1. Intelligent Task Sequencing**
Without G2P analysis, LOGOS would present words in arbitrary order. With it, the system can sequence words from regular (predictable spelling) to irregular, ensuring learners build pattern recognition before encountering exceptions.

**2. Personalized Error Prediction**
A Spanish speaker learning English will make different pronunciation errors than a Mandarin speaker. The L1 interference database allows LOGOS to anticipate errors before they happen and provide preemptive instruction.

**3. Transfer Effect Measurement**
When a learner masters the "-tion" suffix pattern (nation, station, operation), do they learn new "-tion" words faster? The transfer effect functions measure this, enabling LOGOS to optimize which patterns to explicitly teach versus let learners discover naturally.

### Critical Path Analysis

**Importance Level**: High (Pronunciation Domain)

- **If this fails**: Pronunciation task difficulty estimation falls back to simple heuristics (word length, frequency). L1-specific feedback becomes unavailable. Transfer effect tracking is disabled.

- **Graceful degradation**: The module returns sensible defaults when patterns are not found. An unknown word still gets a syllable count and basic analysis.

- **No single point of failure**: Other LOGOS components can function without G2P analysis, but pronunciation-related features degrade significantly.

---

## Technical Concepts (Plain English)

### Grapheme-to-Phoneme Correspondence (G2P)
**Technical**: The systematic mapping between written letter sequences (graphemes) and their spoken sound representations (phonemes), including rules, contexts, and exceptions.

**Plain English**: The rules that tell you how to pronounce a word based on how it's spelled. In Spanish, these rules are almost perfect - "a" always sounds like "ah." In English, these rules are full of exceptions - "ough" can sound like "oo" (through), "oh" (though), "uff" (tough), or "aw" (thought).

**Why We Use It**: By cataloging these rules and their exceptions, we can predict which words will be hard to pronounce and why.

### L1 Interference (Negative Transfer)
**Technical**: Phonological patterns from a learner's native language (L1) that interfere with target language (L2) pronunciation, causing systematic error patterns predictable from contrastive analysis.

**Plain English**: When your native language "gets in the way" of pronouncing a new language. Spanish doesn't have words starting with "sp-" so Spanish speakers instinctively add an "e" sound before it, saying "eh-spanish" instead of "spanish." It's not random - it's predictable based on what sounds exist in your first language.

**Why We Use It**: If we know a learner's native language, we can predict exactly which English sounds will be difficult and provide targeted practice.

### Phonological Vector
**Technical**: A multi-dimensional representation of a word's sound properties including phoneme sequence, syllable structure, stress pattern, and syllable count, used as input features for machine learning models.

**Plain English**: A numerical "fingerprint" of how a word sounds, capturing things like: How many syllables? Which syllable is stressed? What's the pattern of consonants and vowels? This fingerprint lets the computer compare how similar two words sound, even though computers don't actually "hear" anything.

**Why We Use It**: The LanguageObjectVector needs phonological information to represent vocabulary items completely. This vector provides that dimension.

### Transfer Effect (Positive Transfer)
**Technical**: The measurable improvement in acquisition rate for new items that share structural patterns with previously mastered items, calculated as the difference in learning curves before and after explicit pattern instruction.

**Plain English**: When learning one thing makes learning similar things easier. If you master the "-tion" ending in "nation," you'll learn "station," "vacation," and "education" faster because your brain has already figured out that pattern. We measure this by comparing how fast you learned before and after.

**Why We Use It**: By measuring transfer, LOGOS can identify high-value patterns worth teaching explicitly versus patterns learners pick up naturally.

### Silent Letters
**Technical**: Graphemes that appear in a word's orthographic representation but have no corresponding phoneme in the pronunciation, often historical remnants from earlier pronunciations or borrowed spellings.

**Plain English**: Letters you write but don't say. The "k" in "knife," the "b" in "climb," the "gh" in "night." They're usually leftovers from when English did pronounce those letters centuries ago, but pronunciation changed while spelling stayed the same.

**Why We Use It**: Silent letters are a major source of pronunciation difficulty. Detecting them helps us warn learners and provide special instruction.

### Vowel Digraph
**Technical**: A sequence of two vowel graphemes that represent a single phoneme or diphthong, often with variable pronunciation depending on word origin and context.

**Plain English**: Two vowels that team up to make one sound. "EA" in "beat" makes a long "ee" sound. But "EA" in "bread" makes a short "eh" sound. These combinations are tricky because they're not always consistent.

**Why We Use It**: Vowel combinations are unpredictable in English and contribute significantly to G2P difficulty scores.

---

## Key Data Structures

### ENGLISH_G2P_RULES Database

The module contains 40+ G2P rules organized by category:

| Category | Example Pattern | Phoneme | Reliability | Notes |
|----------|-----------------|---------|-------------|-------|
| Magic E | `a[^aeiou]e$` | /ei/ | 85% | "make" but not "have" |
| Vowel Digraph | `ee` | /i:/ | 95% | Highly reliable |
| Vowel Digraph | `ea` | /i:/ | 70% | Many exceptions |
| R-controlled | `ar` | /a:r/ | 85% | "car" but not "war" |
| Silent Consonant | `^kn` | /n/ | 99% | Always silent k |
| Consonant Digraph | `ph` | /f/ | 99% | From Greek |
| Soft C | `c[eiy]` | /s/ | 95% | "city," "cent" |
| Suffix | `-tion` | /shun/ | 95% | Very reliable |
| Medical | `^psych` | /saik/ | 99% | Domain-specific |

**Reliability Score**: Indicates how consistently the rule applies. Low reliability (like "ou" at 50%) means many exceptions exist.

### L1_INTERFERENCE_PATTERNS Database

Supports six native language backgrounds:

| L1 | Key Interference Patterns | General Patterns |
|----|---------------------------|------------------|
| Spanish | /esp-/ for sp-, /b/ for v, lacks /th/ | Vowel reduction difficulty |
| Portuguese | /t/ or /f/ for th, silent h | Nasalization transfer |
| Mandarin | Approximant r, /w/ for v, lacks /th/ | Final consonant deletion |
| Japanese | r/l merger, /b/ for v, /h/ for f | Vowel insertion in clusters |
| Korean | /p/ for f, /b/ for v, r/l allophony | Final consonant unreleased |
| Arabic | /b/ for p, /f/ for v | Vowel cluster avoidance |

---

## Algorithm Details

### Difficulty Score Calculation

The `analyzeG2PDifficulty()` function computes a 0-1 difficulty score by accumulating contributions:

| Factor | Contribution | Rationale |
|--------|--------------|-----------|
| Exception word match | +0.20 | Word breaks a common rule |
| Silent letters present | +0.15 | Unpredictable pronunciation |
| Each vowel combination | +0.10 | Variable pronunciation |
| Each 3+ consonant cluster | +0.15 | Articulatory difficulty |
| Syllables beyond 3 | +0.05/syllable | Length complexity |
| Irregular stress | +0.10 | Unpredictable emphasis |

The score is capped at 1.0 maximum.

### Syllable Counting Heuristic

The `countSyllables()` function uses a vowel-counting approach with adjustments:

1. Count vowel groups (`[aeiouy]+`)
2. Subtract 1 for silent final "e" (if preceded by consonant)
3. Add 1 for syllabic "-le" endings (like "ble," "tle")
4. Add 1 for syllabic "-ed" endings (after "t" or "d")
5. Ensure minimum of 1 syllable

**Accuracy**: This heuristic achieves approximately 85% accuracy on common English vocabulary. Edge cases like "fire" (1 or 2 syllables depending on accent) are handled by defaulting to simpler counts.

---

## Change History

### 2026-01-04 - Initial Documentation
- **What Changed**: Created narrative documentation for G2P module
- **Why**: Enable team understanding of pronunciation analysis system
- **Impact**: Improves maintainability and onboarding

### Module Creation - Core Implementation
- **What Changed**: Implemented complete G2P analysis with rule database, L1 interference patterns, and vector generation
- **Why**: LOGOS needed pronunciation difficulty estimation for task calibration and personalized error prediction
- **Impact**: Enables phonological dimension of LanguageObjectVector and L1-specific pronunciation training
