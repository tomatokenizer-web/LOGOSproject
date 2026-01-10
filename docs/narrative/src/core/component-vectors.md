# Component-Specific z(w) Vector System

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/component-vectors.ts`
> **Status**: Active
> **Lines**: 2310

---

## Context & Purpose

This module represents a fundamental architectural expansion of the LOGOS learning system: **extending the z(w) vector concept from lexical items to all five language components**. Previously, the priority calculation system (FRE scoring) was designed primarily around vocabulary learning. This module generalizes that approach so that phonological patterns, morphological rules, syntactic structures, and pragmatic conventions can all be prioritized, taught, and tracked using the same unified framework.

**Business/User Need**: Language learning involves far more than vocabulary. A learner might know the word "request" (LEX) but struggle to pronounce it correctly (PHON), fail to recognize "requesting" vs "requested" (MORPH), misuse it in passive constructions (SYNT), or deploy it inappropriately with a superior (PRAG). Each component has different learning characteristics that affect how quickly mastery develops. This module captures those differences mathematically.

**The Core Problem Solved**: Without component-specific vectors, the system would treat all learning objects identically. A high-frequency word and a high-frequency syntactic pattern would receive the same priority calculation, ignoring the fact that syntax requires different cognitive processes (clause embedding, argument structure) than vocabulary (meaning retrieval, collocation). This module enables **component-aware adaptive learning**.

**When Used**:
- Every time a learning object is considered for task generation
- When computing which item should appear next in a learning session
- When predicting how long a learner will take to master an item
- When designing tasks appropriate to the item's characteristics

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/core/types.ts`: `MasteryStage` - The 0-4 mastery progression model used across all components
- `src/core/state/component-object-state.ts`: `ExposurePattern` - Historical performance data for trajectory prediction

### Related Component Analysis Modules (Data Source)

각 컴포넌트 벡터의 차원 값은 해당 컴포넌트 분석 모듈에서 추출됩니다:

| Vector Type | Source Module | Key Functions |
|-------------|---------------|---------------|
| `PHONVector` | [g2p.ts](g2p.md) | `analyzeG2PDifficulty()`, `toPhonologicalVector()` |
| `MORPHVector` | [morphology.ts](morphology.md) | `analyzeMorphology()`, `toMorphologicalVector()` |
| `LEXVector` | [lexical.ts](lexical.md) | `analyzeLexical()`, `toLexicalVector()` |
| `SYNTVector` | [syntactic.ts](syntactic.md) | `analyzeSyntacticComplexity()`, `toSyntacticVector()` |
| `PRAGVector` | [pragmatics.ts](pragmatics.md) | `assessPragmaticAppropriateness()`, `generatePragmaticProfile()` |

> **중요**: 이 모듈은 벡터 **구조와 계산**을 정의하지만, 실제 값의 **추출**은 위 모듈들이 담당합니다. 예를 들어 `PHONVector.graphemePhonemeRegularity`는 `g2p.ts`의 G2P 규칙 분석 결과에서 얻어집니다.

### Dependents (What Needs This)

- **Priority System** (`src/core/priority.ts`): The existing FRE priority calculation can now use `computeComponentPriority()` for component-aware scoring instead of generic calculations
- **Task Generation** (future): Will consume `generateTaskDesignParams()` to create tasks appropriate to each component's characteristics
- **Learning Analytics** (future): Will use `predictLearningTrajectory()` to show learners estimated time-to-mastery
- **Scheduler** (future): Will use trajectory predictions to optimize session planning

### Data Flow

```
Language Object (word, pattern, rule, convention)
         |
         v
+------------------+
| Component Vector | <-- Contains FRE metrics + component-specific dimensions
+------------------+
         |
         +---> computeComponentCostModifier() --> Cost modifier (0.5-2.0)
         |
         +---> computeComponentPriority() --> Final priority score
         |
         +---> generateTaskDesignParams() --> Task type recommendations
         |
         +---> predictLearningTrajectory() --> Days-to-mastery prediction
```

### Internal Module Architecture

The module is organized into logical sections:

1. **Type Definitions** (lines 1-1173): Base interface + 5 component-specific vector interfaces
2. **Type Guards** (lines 1143-1173): Runtime type checking for discriminated union
3. **Cost Computation** (lines 1175-1380): Per-component cost modifier functions
4. **Priority Integration** (lines 1382-1589): FRE calculation with component awareness
5. **Task Design** (lines 1591-1896): Component-appropriate task recommendations
6. **Trajectory Prediction** (lines 1898-2297): Learning time estimation

---

## Macroscale: System Integration

### Architectural Role

This module sits at the **algorithmic core** of the LOGOS learning engine, acting as the bridge between raw linguistic data and adaptive learning decisions.

```
[Content Layer]                [Algorithmic Core]              [Execution Layer]
                                      |
Corpus Analysis -------> BaseComponentVector -------> Task Generation
NLP Pipeline    -------> Component Extensions -------> Scheduler
Linguistic DBs  -------> Cost Modifiers       -------> Progress Tracking
                         Priority Calculation
                         Trajectory Prediction
```

**Position in the Five-Component Model**:

LOGOS treats language as five interconnected systems (the "component cascade"):

```
PHON (Phonological/Orthographic)
  |
  v supports
MORPH (Morphological)
  |
  v supports
LEX (Lexical)
  |
  v supports
SYNT (Syntactic)
  |
  v supports
PRAG (Pragmatic)
```

This module provides the data structure (`ComponentVector`) that represents any object at any level of this cascade, with dimensions tailored to each level's unique characteristics.

### Big Picture Impact

**What This Enables**:

1. **Truly Adaptive Learning**: The system can now make intelligent decisions about which phonological pattern, morphological rule, or pragmatic convention to teach next, not just which word.

2. **Component-Appropriate Tasks**: A phonologically irregular word gets pronunciation-focused tasks; a syntactically complex structure gets clause-combining exercises; a face-threatening speech act gets role-play scenarios.

3. **Accurate Progress Prediction**: By understanding component-specific difficulty factors (e.g., L1 interference for PHON, cultural load for PRAG), the system can predict learning time more accurately.

4. **Cross-Component Prerequisites**: The `prerequisitesSatisfied`, `supportsComponents`, and `dependsOnComponents` fields enable cascade-aware scheduling, ensuring learners have the phonological and morphological foundations before tackling complex syntax.

### Critical Path Analysis

**Importance Level**: Critical

**If This Fails**:
- Priority calculations would fall back to generic FRE scoring, losing component-specific insights
- Task generation would produce inappropriate exercises (e.g., rapid-fire drills for complex pragmatics)
- Learning time estimates would be inaccurate
- The system would treat all components identically despite their fundamentally different learning characteristics

**Failure Mode**: Without component vectors, the system degrades to a "one-size-fits-all" vocabulary trainer rather than a comprehensive language learning system.

---

## Design Principles

### 1. Common Base + Component-Specific Extensions

The design follows a classic inheritance pattern implemented through TypeScript interfaces:

```
BaseComponentVector (common FRE + learning state)
         |
         +---> PHONVector (adds phonological dimensions)
         +---> MORPHVector (adds morphological dimensions)
         +---> LEXVector (adds lexical dimensions)
         +---> SYNTVector (adds syntactic dimensions)
         +---> PRAGVector (adds pragmatic dimensions)
```

**Why This Design**: Every language object needs FRE metrics for priority calculation and learning state for tracking progress. But a word's "difficulty" depends on different factors than a syntactic pattern's "difficulty." The base/extension model captures both the commonality and the differences.

### 2. Component-Specific FRE Interpretation

The same three metrics (F, R, E) are measured differently for each component:

| Metric | PHON | MORPH | LEX | SYNT | PRAG |
|--------|------|-------|-----|------|------|
| **F** (Frequency) | Rule application frequency | Affix type frequency | Word corpus frequency | Structure genre frequency | Convention context frequency |
| **R** (Relational) | Neighborhood density | Family size | Collocation centrality | Embedding connectivity | Register flexibility |
| **E** (Contextual) | Homophone disambiguation | Semantic contribution | Information content | Discourse function | Face-threat mitigation |

**Why This Design**: The FRE formula remains the same (`w_F * F + w_R * R + w_E * E`), but the measurements reflect each component's nature. This preserves system coherence while allowing component-appropriate weighting.

### 3. Cost Modifiers as Difficulty Multipliers

Each component has a cost modifier function that converts component-specific dimensions into a difficulty multiplier (0.5 to 2.0):

- **0.5**: Half the base difficulty (easy due to positive factors)
- **1.0**: Baseline difficulty
- **2.0**: Double the base difficulty (hard due to negative factors)

**Priority Formula**: `Priority = FRE / Cost`

Higher FRE (more useful) + Lower Cost (easier) = Higher Priority

**Why This Design**: Rather than creating entirely different priority formulas per component, the cost modifier provides a unified mechanism for component-specific difficulty adjustment.

---

## Component-Specific Dimensions

### PHONVector: Phonological/Orthographic Component

**Academic Basis**:
- Ehri's grapheme-phoneme correspondence hierarchy (alphabetic -> syllable -> word)
- Vitevitch & Luce (2004) on phonological neighborhood density effects
- Flege (1995) on L1 interference in pronunciation

**Key Dimensions**:

| Dimension | What It Measures | Learning Impact |
|-----------|-----------------|-----------------|
| `phonologicalNeighborhoodDensity` | Number of phonologically similar words | High density helps generalization but increases confusion risk |
| `graphemePhonemeRegularity` | How predictable spelling-sound mapping is | Irregular words need explicit instruction and more practice |
| `g2pEntropy` | Ambiguity in pronunciation (information-theoretic) | High entropy indicates multiple possible pronunciations |
| `stressPredictability` | Whether stress follows spelling/morphology rules | Unpredictable stress requires prosody-focused tasks |
| `l1TransferDifficulty` | L1 phoneme inventory mismatch | High difficulty triggers contrastive exercises |

**Cost Modifier Factors**:
- Irregularity increases cost (irregular words like "yacht" need more exposures)
- L1 interference increases cost (sounds not in L1 are harder)
- High neighborhood density adds minor cost (discrimination challenge)
- Silent letters add complexity

### MORPHVector: Morphological Component

**Academic Basis**:
- Hay & Baayen (2005) on morphological productivity measurement
- MorphoLex (Sanchez-Gutierrez et al., 2018) on family size effects
- Nagy et al. (2006) on morphological awareness and vocabulary growth

**Key Dimensions**:

| Dimension | What It Measures | Learning Impact |
|-----------|-----------------|-----------------|
| `productivity` | How freely the pattern combines with new bases | High productivity means transfer to novel words |
| `transparency` | Predictability of meaning from parts | Opaque forms (like "understand") must be learned as wholes |
| `familySize` | Number of words sharing the root | Large families provide reinforcement opportunities |
| `familyFrequencySum` | Cumulative frequency of family members | Higher sum = more natural exposure |
| `paradigmComplexity` | Inflectional paradigm irregularity | Complex paradigms need explicit conjugation work |
| `derivationalDepth` | Steps from root to derived form | Deep derivations ("denationalization") are harder |
| `allomorphCount` | Variant forms of the morpheme | Multiple allomorphs (like English plural -s/-es/-ies) add complexity |

**Cost Modifier Factors**:
- Low productivity increases cost (less transfer value)
- Low transparency increases cost (can't use decomposition strategy)
- Large family size provides a bonus (reduces cost)
- Complex paradigms and deep derivations increase cost

### LEXVector: Lexical Component

**Academic Basis**:
- Nation (2001) on vocabulary learning dimensions
- Brysbaert et al. (2014) on concreteness ratings
- Kuperman et al. (2012) on age of acquisition norms
- Laufer & Nation (1995) on lexical richness measures

**Key Dimensions**:

| Dimension | What It Measures | Learning Impact |
|-----------|-----------------|-----------------|
| `concreteness` | Abstract vs. concrete meaning | Concrete words are encoded more easily |
| `imageability` | How easily the word evokes mental images | High imageability aids memory encoding |
| `polysemyCount` | Number of distinct senses | Polysemous words need multiple contexts |
| `ageOfAcquisition` | When L1 speakers typically learn the word | Later AoA predicts greater L2 difficulty |
| `registerFlexibility` | Usability across formal/informal contexts | Flexible words have higher utility |
| `avgCollocationStrength` | Mean PMI of significant collocations | Strong collocations should be taught together |
| `cognateStatus` | L1 cognate presence and false friend risk | True cognates accelerate learning; false friends require caution |

**Cost Modifier Factors**:
- Abstract words increase cost
- High polysemy increases cost
- Late AoA increases cost
- Register restriction increases cost
- True cognates decrease cost; false friends increase cost

### SYNTVector: Syntactic Component

**Academic Basis**:
- Lu (2010, 2011) on syntactic complexity measures
- CEFR complexity descriptors
- Pienemann's Processability Theory (1998, 2005)

**Key Dimensions**:

| Dimension | What It Measures | Learning Impact |
|-----------|-----------------|-----------------|
| `meanLengthOfClause` | Average words per clause | Longer clauses increase processing load |
| `complexNominalsPerClause` | Noun phrases with modification | High CN/C indicates academic register complexity |
| `dependentClausesPerClause` | Subordination ratio | Higher DC/C means more complex embedding |
| `argumentComplexity` | Number and optionality of arguments | Ditransitives harder than transitives harder than intransitives |
| `embeddingDepth` | Maximum nested clause depth | Deep embedding taxes working memory |
| `processabilityStage` | Pienemann's developmental stage (1-5) | Must be taught in sequence |
| `avgDependencyDistance` | Mean distance between head and dependent | Long distances increase processing difficulty |

**Cost Modifier Factors**:
- High complexity score increases cost
- Deep embedding increases cost
- Complex argument structure increases cost
- Long dependency distances increase cost
- Higher processability stage implies prerequisite knowledge needed

### PRAGVector: Pragmatic Component

**Academic Basis**:
- Brown & Levinson (1987) on politeness theory
- Joos (1967) on the five clocks (formality levels)
- Speech act theory (Austin, Searle)
- Halliday's register theory

**Key Dimensions**:

| Dimension | What It Measures | Learning Impact |
|-----------|-----------------|-----------------|
| `registerFlexibility` | Usability across formality levels | Flexible expressions have higher utility |
| `culturalLoad` | How culture-specific the convention is | High load requires explicit cultural instruction |
| `politenessComplexity` | Amount of politeness calibration needed | Complex politeness is an advanced skill |
| `faceThreatPotential` | How threatening the act is to hearer's face | High-threat acts need careful scaffolding |
| `powerSensitivity` | How much power differential affects usage | High sensitivity requires teaching with power context |
| `distanceSensitivity` | How much relationship closeness matters | High sensitivity requires teaching with relationship context |
| `indirectnessLevel` | Direct vs. indirect speech act | Indirect speech acts require pragmatic inference |

**Cost Modifier Factors**:
- High cultural load increases cost significantly
- Complex politeness calibration increases cost
- High face-threat potential increases cost
- High transfer risk (L1 pragmatic interference) increases cost
- High indirectness increases cost

---

## Priority Calculation Integration

The module integrates with the existing priority system through `computeComponentPriority()`:

```
Priority = FRE / (ComponentCost - TransferBonus + PrerequisitePenalty) + UrgencyBonus
```

**Where**:
- **FRE**: Weighted sum of Frequency, Relational density, contextual contribution (E)
- **ComponentCost**: Output of `computeComponentCostModifier()` (0.5-2.0)
- **TransferBonus**: `l1TransferCoefficient * 0.2` (reduces effective cost)
- **PrerequisitePenalty**: 0.5 if prerequisites not satisfied (increases effective cost)
- **UrgencyBonus**: From goal context, adds to priority for time-sensitive goals

**Result**: A `ComponentPriorityCalculation` object containing:
- `freScore`: The base value score
- `componentCostModifier`: Component-specific difficulty
- `transferAdjustment`: L1 benefit or penalty
- `prerequisitePenalty`: Cascade-aware penalty
- `priority`: Final computed priority
- `factors`: Detailed breakdown for debugging/analytics

---

## Task Design Parameter Generation

The `generateTaskDesignParams()` function produces component-appropriate task recommendations:

**For each component, it returns**:
- `recommendedTaskTypes`: Ordered list of suitable task types
- `recommendedFormat`: multiple_choice, fill_in_blank, free_response, etc.
- `targetProcess`: Cognitive process to target (recognition, recall, production, etc.)
- `suggestedContexts`: Appropriate contexts for practice
- `difficultyModifiers`: Per-task-type difficulty adjustments
- `includeCues`: Whether scaffolding is appropriate
- `recommendedCueLevel`: 0-3 cue intensity
- `timePressureAppropriate`: Whether timed tasks make sense
- `modalityRecommendations`: Visual/auditory/mixed appropriateness

**Component-Specific Task Logic**:

| Component | Low Difficulty/Mastery | High Difficulty/Mastery |
|-----------|----------------------|------------------------|
| PHON | Rapid response, production | Recognition with explicit decoding |
| MORPH | Word formation, free recall | Recognition, cued recall |
| LEX | Definition match, free recall | Cued recall, collocations |
| SYNT | Sentence combining, production | Recognition, clause selection |
| PRAG | Production, sentence writing | Register shift, recognition |

---

## Learning Trajectory Prediction

The `predictLearningTrajectory()` function estimates time-to-mastery:

**Base Exposures by Mastery Stage**:
- Stage 0 (New to Recognition): 15 exposures
- Stage 1 (Recognition to Recall): 20 exposures
- Stage 2 (Recall to Controlled Production): 25 exposures
- Stage 3 (Controlled to Automatic): 30 exposures
- Stage 4 (Maintenance): 10 exposures

**Modifiers Applied Per Component**:

| Component | Accelerating Factors | Decelerating Factors |
|-----------|---------------------|---------------------|
| PHON | Positive L1 transfer | Low G2P regularity, L1 interference |
| MORPH | Large family, high productivity | Opaque morphology, low productivity |
| LEX | High concreteness, cognates, low AoA | Abstractness, polysemy, late AoA |
| SYNT | Low complexity | High complexity, deep embedding |
| PRAG | Register flexibility | High cultural load, politeness complexity |

**Output**: `LearningTrajectoryPrediction` with:
- `exposuresToNextStage`: Predicted number of encounters
- `predictedDaysToMastery`: Assuming ~3 exposures/day
- `confidence`: Based on historical data availability
- `keyFactors`: Which factors are accelerating/decelerating
- `bottleneckRisk`: Probability of getting stuck
- `recommendedInterventions`: Suggested teaching strategies

---

## Technical Concepts (Plain English)

### Discriminated Union
**Technical**: A TypeScript pattern where a union type (`ComponentVector = PHONVector | MORPHVector | ...`) includes a "discriminant" property (`componentType`) that narrows the type at runtime.

**Plain English**: Like a package with a label. The label (`componentType: 'PHON'`) tells you exactly what's inside, so TypeScript (and your code) can safely assume which properties exist.

**Why We Use It**: Allows a single function like `computeComponentCostModifier()` to accept any component type and dispatch to the right logic based on the discriminant.

### Type Guards
**Technical**: Functions like `isPHONVector()` that return `v is PHONVector`, enabling TypeScript's type narrowing within conditional blocks.

**Plain English**: A "security check" that tells TypeScript "if this function returns true, you can treat this object as a PHONVector from now on."

**Why We Use It**: Essential for safe polymorphic handling of the `ComponentVector` union type.

### Cost Modifier
**Technical**: A multiplier (0.5 to 2.0) that adjusts base learning difficulty based on component-specific factors.

**Plain English**: A "difficulty dial" that makes some items easier (0.5 = half as hard) or harder (2.0 = twice as hard) based on their characteristics.

**Why We Use It**: Enables the priority formula to account for component-specific difficulty without changing the formula itself.

### Processability Theory (Pienemann)
**Technical**: A developmental framework positing that syntactic structures are acquired in a fixed sequence based on the cognitive processing procedures they require.

**Plain English**: Some grammar structures (like word order in simple sentences) must be mastered before others (like embedded clauses) because the brain builds up processing capabilities in a specific order.

**Why We Use It**: The `processabilityStage` dimension ensures SYNT items are taught in developmentally appropriate sequence.

### Face-Threat Potential (Brown & Levinson)
**Technical**: A measure of how much a speech act threatens the hearer's "face" (public self-image), calculated from power differential, social distance, and imposition rank.

**Plain English**: How awkward or risky a request/statement is. Asking a stranger for a large favor is high face-threat; thanking a friend is low.

**Why We Use It**: High face-threat pragmatic items need more careful scaffolding and practice in appropriate contexts.

### PMI (Pointwise Mutual Information)
**Technical**: A measure of how much more often two words co-occur than would be expected by chance, calculated as `log(P(x,y) / (P(x)*P(y)))`.

**Plain English**: A "stickiness score" for word pairs. "Make a decision" has high PMI because those words appear together far more than chance predicts.

**Why We Use It**: High-PMI collocations should be taught as units, not as separate words.

---

## Memory Safety

The module includes safety constants to prevent unbounded array growth:

```typescript
const MAX_COLLOCATIONS = 50;
const MAX_MISPRONUNCIATIONS = 20;
const MAX_KEY_FACTORS = 10;
const MAX_INTERVENTIONS = 5;
const MAX_CONTEXTS = 20;
const MAX_TASK_TYPES = 10;
```

**Why**: Arrays like `topCollocations` or `keyFactors` could grow indefinitely from corpus data. These limits ensure predictable memory usage and prevent performance degradation.

---

## Change History

### 2026-01-08 - Initial Implementation
- **What Changed**: Created complete component-specific vector system
- **Why**: The priority calculation system needed component-aware cost modifiers and task recommendations
- **Impact**: Enables truly adaptive learning across all five language components, not just vocabulary

---

## Future Considerations

1. **Vector Population**: This module defines structures but doesn't populate them. A future `vector-builder.ts` module will need to compute these dimensions from linguistic databases and NLP analysis.

2. **Cross-Component Interactions**: The current model treats components independently. Future work could model how PHON difficulty affects LEX difficulty (the cascade effect).

3. **Empirical Validation**: The cost modifier weights and trajectory predictions are based on linguistic theory. Real learner data will enable calibration of these parameters.

4. **Visualization**: The rich factor breakdown in `ComponentPriorityCalculation` could power learning analytics dashboards showing why certain items are prioritized.
