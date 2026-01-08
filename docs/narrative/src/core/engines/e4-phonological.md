# PhonologicalTrainingOptimizer (E4)

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/engines/e4-phonological.ts`
> **Status**: Active

---

## Context & Purpose

This module implements the Phonological Training Optimizer (E4), one of five unified analysis engines in the LOGOS system. It exists to solve a fundamental challenge in pronunciation instruction: not all phonemes are equally difficult for all learners. A Japanese speaker learning English struggles with /r/ vs /l/; a Spanish speaker struggles with /v/ vs /b/. E4 uses linguistic science to predict these difficulties and optimize the training sequence accordingly.

**Business/User Need**: Language learners often waste enormous effort on pronunciation training that does not account for their native language background. A Korean speaker drilling the /th/ sound (which does not exist in Korean) faces a fundamentally different learning challenge than a German speaker (whose language has a similar sound). E4 enables LOGOS to create personalized phonological training plans that address each learner's specific interference patterns.

**When Used**:
- When generating a new phonological training curriculum for a learner
- When the system needs to predict which sounds will be hardest for a specific L1 speaker
- When creating minimal pair exercises (ship/sheep, rice/lice) for targeted practice
- When determining prerequisite phonemes before teaching more complex sounds

---

## Academic Foundation (Plain English)

### Flege's Speech Learning Model (SLM)

**Technical**: The Speech Learning Model (Flege, 1995) posits that L2 phoneme acquisition difficulty is primarily determined by the phonetic distance between L2 sounds and their closest L1 equivalents. Counterintuitively, "similar" sounds (close but not identical to L1) are harder to acquire than "new" sounds (no L1 equivalent), because similar sounds trigger L1 category assimilation while new sounds enable fresh category formation.

**Plain English**: Imagine you learned to recognize faces as a child by sorting them into categories like "friend," "stranger," "family." Now you move to a new country where some faces look almost like people you know but are actually different people. These "almost familiar" faces are the hardest to learn because your brain keeps confusing them with existing categories. Truly novel faces (from ethnicities you have never seen) are actually easier because your brain creates a fresh category.

**Why We Use It**: Flege's model provides a principled way to predict difficulty:
- **Identical** sounds (L2 sound = L1 sound): Low difficulty. Direct positive transfer.
- **New** sounds (L2 sound has no L1 equivalent): Medium difficulty. The brain can form a new category.
- **Similar** sounds (L2 sound is close to L1 but different): High difficulty. L1 interference prevents accurate perception and production.

E4 classifies every English phoneme into one of these three categories for each supported L1, then sequences training to address the hardest cases appropriately.

### Minimal Pair Training Effectiveness

**Technical**: Thomson (2018) demonstrated that high-variability phonetic training using minimal pairs (words differing by one phoneme) significantly improves L2 phoneme perception, with effects transferring to novel speakers and words.

**Plain English**: If you want to teach the difference between /r/ and /l/ to a Japanese speaker, do not just say "this is /r/" and "this is /l/." Instead, show pairs of real words that differ only in that sound: "rice" vs "lice," "right" vs "light," "berry" vs "belly." Hearing these contrasts in real words, spoken by multiple voices, rewires the brain to detect the distinction.

**Why We Use It**: E4 automatically generates minimal pair practice sets for each problematic phoneme contrast. These pairs form the core of perceptual training exercises.

### Phonological Awareness Transfer to Reading

**Technical**: The National Reading Panel (2000) meta-analysis established that phonological awareness training (ability to manipulate phonemes) causally improves reading outcomes, with transfer effects to decoding novel words.

**Plain English**: Learning to hear and produce sounds accurately is not just about speaking. It is a gateway skill that unlocks reading ability. A learner who can distinguish "pat" from "bat" in speech will more easily learn to read words containing /p/ and /b/. Pronunciation training is reading training.

**Why We Use It**: E4's training sequences are designed not just for speaking, but to support broader literacy development. The system prioritizes phonemes that appear in high-frequency words, maximizing transfer to reading.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/core/g2p.ts`: **G2PDifficulty, PhonologicalVector** - E4 integrates with the grapheme-to-phoneme analysis system to connect pronunciation training with spelling pattern instruction. When a phoneme is trained, related G2P patterns can be highlighted.

- `src/core/transfer.ts`: **TransferCoefficients, getTransferCoefficients()** - The language transfer module provides L1-L2 phonological transfer coefficients that E4 uses to adjust difficulty predictions for each language pair.

- `src/core/engines/types.ts`: **PhonologicalEngineConfig, PhonologicalOptimizationInput, PhonologicalOptimizationResult, PhonemeContrast, PhonologicalTrainingItem** - All type contracts defining E4's API.

### Dependents (What Needs This)

- **Session Optimizer Engine (E5)**: Uses E4's training sequences to schedule pronunciation practice items appropriately within learning sessions.

- **Task Generation Service** (`src/main/services/task-generation.service.ts`): Requests minimal pairs and difficulty predictions when generating pronunciation-focused learning tasks.

- **Onboarding Assessment** (`src/main/services/diagnostic-assessment.service.ts`): May use E4's problematic contrast analysis to quickly identify a learner's pronunciation gaps during initial assessment.

- **G2P Training Pipeline**: E4's phoneme sequences can be coordinated with G2P training to reinforce spelling-sound correspondences.

### Data Flow

```
PhonologicalOptimizationInput
(L1, L2, mastered phonemes, current theta)
         |
         v
+----------------------------+
| analyzeContrasts()         |
| - Fetch L1 phoneme inventory
| - Compare against L2 (English)
| - Classify: identical/similar/new
| - Calculate acoustic distance
+----------------------------+
         |
         v
List of PhonemeContrast objects (sorted by difficulty)
         |
         v
+----------------------------+
| generateTrainingItems()    |
| - Filter already mastered
| - Determine prerequisites
| - Estimate session count
| - Attach transfer info
+----------------------------+
         |
         v
+----------------------------+
| optimizeSequence()         |
| - Apply ordering strategy
| - Topological sort by prereqs
| - Adjust for learner level
+----------------------------+
         |
         v
PhonologicalOptimizationResult
(ordered training items, minimal pairs, session estimates)
```

---

## Macroscale: System Integration

### Architectural Layer

E4 sits in the **Core Analysis Layer** of LOGOS's architecture:

```
Layer 1: UI (Electron Renderer)
         |
Layer 2: IPC Handlers (Main Process API)
         |
Layer 3: Services (Business Logic, Orchestration)
         |
Layer 4: [YOU ARE HERE] Core Engines (E1-E5)
         |
Layer 5: Pure Algorithms (IRT, PMI, FSRS)
         |
Layer 6: Database (Prisma/SQLite)
```

E4 is a **domain-specialized phonological analysis engine** that:
- Encapsulates L1-specific phoneme inventory data (Korean, Japanese, Chinese, Spanish)
- Implements Flege SLM classification logic
- Maintains a minimal pair database for rapid lookup
- Generates prerequisite-aware training sequences using topological sort

### Big Picture Impact

The phonological training optimizer enables **personalized pronunciation instruction** throughout LOGOS:

1. **L1-Aware Difficulty Prediction**: Instead of assuming all learners struggle equally, LOGOS knows that a Korean speaker will find /f/ hard (they substitute /p/) while a Spanish speaker will find /z/ hard (they substitute /s/).

2. **Prerequisite-Based Sequencing**: Some sounds build on others. Voiced fricatives (/v/, /z/, /dh/) are easier to learn after their voiceless counterparts (/f/, /s/, /th/). E4 enforces this pedagogical logic.

3. **Transfer Effect Optimization**: By tagging each phoneme with its transfer type (positive, negative, neutral), E4 allows the session optimizer to group items that reinforce each other or to deliberately separate items that cause interference.

4. **Minimal Pair Generation**: Automated creation of practice materials (rice/lice, vest/best, think/sink) saves curriculum designers time and ensures coverage of all problematic contrasts.

### Critical Path Analysis

**Importance Level**: High for pronunciation-focused learning modes

- **If E4 fails**: Pronunciation training becomes generic and L1-agnostic. Learners spend time on sounds they already produce well while neglecting their actual problem areas. Training efficiency drops significantly.

- **Failure mode**: Without E4's difficulty predictions, a Korean learner might be drilled on /p/ vs /b/ (already distinct in Korean) while their actual struggle with /f/ vs /p/ goes unaddressed.

- **Backup mechanism**: If E4 is unavailable, the system can fall back to frequency-based phoneme ordering (most common sounds first), but loses the personalization benefit.

---

## Technical Concepts (Plain English)

### L1 Phoneme Inventories

**Technical**: E4 maintains phoneme inventories for supported L1 languages (Korean, Japanese, Mandarin Chinese, Spanish), including which English phonemes are missing from each L1 and which phoneme pairs cause confusion.

**Plain English**: Every language has a different "sound palette." Korean has no /f/, /v/, /z/, /th/ sounds. Japanese has no clear /l/ vs /r/ distinction. Chinese has no final consonant clusters. E4 stores these facts in lookup tables so it can instantly identify problem areas for any learner.

**Why We Use It**: Without this data, the system would treat all learners identically. With it, LOGOS can immediately say "You speak Korean? Here are your likely problem sounds."

| L1 Language | Missing English Sounds | Common Confusions |
|-------------|------------------------|-------------------|
| Korean | /f/, /v/, /z/, /th/, /dh/ | /r/-/l/, /f/-/p/, /v/-/b/, /th/-/s/ |
| Japanese | /l/, /v/, /f/, /th/, /dh/ | /r/-/l/, /v/-/b/, /f/-/h/, /th/-/s/ |
| Chinese | /v/, /th/, /dh/, final /ng/ | /r/-/l/, /n/-/l/, /v/-/w/, /th/-/s/ |
| Spanish | /v/, /z/, /h/, /sh/, /zh/ | /v/-/b/, /z/-/s/, /sh/-/ch/, /h/-/x/ |

### Flege SLM Categories

**Technical**: E4 classifies each target phoneme as 'identical', 'similar', or 'new' based on its relationship to the L1 inventory. Difficulty scores are: identical = 0.2, new = 0.5, similar = 0.8 (base values, adjusted by frequency).

**Plain English**:
- **Identical** (easy): The sound exists in your native language and works the same way. English /m/ is identical for most L1s.
- **New** (medium): The sound does not exist in your language at all. Your brain can learn to make a fresh box for it. English /th/ is new for Korean speakers.
- **Similar** (hard): A sound exists in your language that is almost the same but not quite. Your brain keeps putting the new sound in the old box. English /r/ vs /l/ for Japanese speakers.

**Why We Use It**: This classification drives the difficulty scoring. Similar phonemes get more training time because they require overcoming active interference.

### Topological Sort for Prerequisites

**Technical**: E4 uses a topological sort algorithm to order training items such that all prerequisites are satisfied before an item is introduced. For example, voiceless consonants are scheduled before their voiced counterparts.

**Plain English**: Think of learning to cook. You need to know how to boil water before you can make pasta. You need to know how to chop onions before you can make a stir-fry. E4 builds a "learning recipe" where each step requires previous steps to be complete. You cannot effectively train /v/ until /f/ is somewhat stable.

**Why We Use It**: Prerequisite-based ordering prevents learners from attempting sounds they are not ready for. It reduces frustration and increases success rate on practice items.

### Acoustic Distance Estimation

**Technical**: E4 estimates acoustic distance between phonemes using articulatory heuristics: same manner of articulation (e.g., both plosives) = closer; different manner = farther.

**Plain English**: How "far apart" are two sounds? Sounds made the same way (both stops like /p/ and /b/, both fricatives like /f/ and /v/) are closer than sounds made differently (a stop /p/ vs a fricative /f/). This distance affects how easily learners can distinguish them.

**Why We Use It**: Acoustic distance informs training strategies. Closely-spaced sounds (same manner, different voicing) benefit from direct contrast training. Distant sounds can be trained more independently.

### Minimal Pairs Database

**Technical**: E4 maintains a lookup table of minimal pairs (word pairs differing by one phoneme) organized by phoneme contrast and position (initial, medial, final).

**Plain English**: For the /r/-/l/ contrast, E4 knows pairs like rice/lice (initial), berry/belly (medial), car/call (final). For /th/-/s/, it knows think/sink, thick/sick, path/pass. These are not generated algorithmically but curated for actual word frequency and pedagogical value.

**Why We Use It**: Minimal pairs are the gold standard for pronunciation training. Having them pre-computed allows instant exercise generation.

| Contrast | Initial Position | Medial Position | Final Position |
|----------|------------------|-----------------|----------------|
| /r/-/l/ | rice-lice, right-light | berry-belly | car-call |
| /th/-/s/ | think-sink, thick-sick | - | path-pass, math-mass |
| /v/-/b/ | vest-best, vote-boat | - | - |
| /f/-/p/ | fat-pat, fast-past | coffee-copy | - |

### Session Estimation

**Technical**: E4 estimates required training sessions per phoneme based on difficulty category and transfer type. Similar phonemes with negative transfer require 3+ additional sessions compared to identical phonemes.

**Plain English**: How long will it take to learn each sound? E4 makes educated guesses:
- Identical sounds: 3 sessions (quick review)
- New sounds: 5-6 sessions (need to build new category)
- Similar sounds: 7-8 sessions (need to overcome interference)

**Why We Use It**: Session estimates allow the system to plan curricula and set learner expectations. They also influence item selection during session optimization.

---

## Ordering Strategies

E4 supports three training sequence strategies, configurable via `orderingStrategy`:

### `easiest_first`

Items with highest positive transfer (lowest interference) are presented first. Builds confidence before tackling hard problems.

**Best for**: Anxious learners, beginners, confidence-building phases.

### `most_frequent_first`

Phonemes that appear most often in English text are presented first. Maximizes immediate utility.

**Best for**: Learners with specific communication goals, time-constrained training.

### `prerequisite_based` (Default)

Topological sort ensures all prerequisites are met before each item. Respects phonological dependencies.

**Best for**: Systematic learners, long-term curriculum development.

---

## Learner Level Adaptation

E4 adjusts its output based on the learner's current phonological theta (ability estimate):

| Theta Range | Adaptation |
|-------------|------------|
| theta < -1 | Beginner filter: exclude extremely difficult items (similar category with high interference) |
| -1 <= theta < 0 | Standard sequence, no filtering |
| theta >= 0 | Advanced: may include fine phonetic distinctions and allophonic variation |

---

## Configuration Options

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `orderingStrategy` | 'prerequisite_based' | How to sequence training items |
| `minimalPairsPerPhoneme` | 5 | How many minimal pairs to return per contrast |
| `contrastDataPath` | undefined | Optional path to external contrast data |

---

## Utility Functions

### `getProblematicPhonemesForL1(l1: string)`

Returns a list of English phonemes that are expected to be difficult for speakers of the given L1. Useful for quick diagnostic displays.

**Example**: `getProblematicPhonemesForL1('ko')` returns `['f', 'v', 'z', 'th', 'dh', 'r', 'sh']`

### `getMinimalPairs(phoneme1: string, phoneme2: string)`

Returns minimal pair examples for any supported phoneme contrast.

**Example**: `getMinimalPairs('r', 'l')` returns `[{word1: 'rice', word2: 'lice'}, ...]`

### `getPhonemeFrequency(phoneme: string)`

Returns the approximate frequency of a phoneme in English text (0-1 scale). Used for frequency-based ordering.

**Example**: `getPhonemeFrequency('schwa')` returns `0.11` (most common English phoneme)

### `createPhonologicalOptimizer(config?)`

Factory function for clean instantiation with optional custom configuration.

---

## Supported L1-L2 Pairs

E4 is currently optimized for learners of **English as L2** from the following L1 backgrounds:

| L1 Code | Language | Inventory Quality |
|---------|----------|-------------------|
| `ko` | Korean | Full support (default fallback) |
| `ja` | Japanese | Full support |
| `zh` | Mandarin Chinese | Full support |
| `es` | Spanish | Full support |

For unsupported L1s, E4 falls back to Korean patterns and issues a warning in the result metadata.

---

## Integration with G2P System

E4 coordinates with the grapheme-to-phoneme (`g2p.ts`) module:

- `PhonologicalTrainingItem.g2pDifficulty` can be populated with G2P analysis for any target phoneme
- When training /th/, the system can simultaneously highlight "th" spelling patterns
- Phonological training reinforces orthographic patterns and vice versa

This integration supports the research finding (National Reading Panel, 2000) that phonological awareness transfers to reading ability.

---

## Change History

### 2026-01-08 - Initial Implementation

- **What Changed**: Created PhonologicalTrainingOptimizer with Flege SLM classification, 4 L1 inventories, minimal pairs database, and prerequisite-based sequencing
- **Why**: LOGOS needed personalized pronunciation training that accounts for L1 interference patterns
- **Impact**: Enables L1-aware phonological curricula; generates minimal pair exercises automatically; integrates with session optimization

### Flege SLM Integration

- **What Changed**: Implemented the identical/similar/new classification system with empirically-derived difficulty scores
- **Why**: Research shows that "similar" sounds are counterintuitively harder than "new" sounds
- **Impact**: Difficulty predictions now align with SLA research; similar sounds receive appropriate extra training time

### Minimal Pairs Database

- **What Changed**: Added curated minimal pairs for 10+ common phoneme contrasts
- **Why**: Minimal pair training is the gold standard for perceptual training
- **Impact**: System can instantly generate targeted contrast exercises for any problematic phoneme pair

---

## Related Documentation

- `docs/narrative/src/core/g2p.md` - Grapheme-to-phoneme analysis and phonological vectors
- `docs/narrative/src/core/transfer.md` - L1-L2 transfer coefficients used for difficulty adjustment
- `docs/narrative/src/core/engines/types.md` - Type definitions including PhonemeContrast, PhonologicalTrainingItem
- `docs/narrative/src/core/engines/e5-session.md` - Session optimizer that schedules phonological items
- `docs/narrative/src/main/services/task-generation.service.md` - Service that requests minimal pairs for task creation
