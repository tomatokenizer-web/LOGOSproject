# Within-L2 Transfer Prediction Module

> **Last Updated**: 2026-01-08
> **Code Location**: `src/core/transfer-prediction.ts`
> **Status**: Active

---

## Context & Purpose

This module predicts **within-L2 learning transfer effects** - how mastering one piece of language knowledge accelerates learning related pieces. Unlike its sibling `transfer.ts` (which handles L1-to-L2 transfer between native and target languages), this module focuses on the rich web of relationships *within* the target language itself.

**The Core Insight**: Language learning is not a collection of isolated facts. When you learn the word "run", you're building knowledge that transfers to "running", "runner", "ran", and even unrelated words like "walk" or "sprint" through semantic similarity. This module quantifies these transfer effects to optimize learning sequences.

**Business Need**: LOGOS needs to answer questions like:
- "If the learner just mastered 'decide', how much easier will 'decision' be?"
- "Which vocabulary should we teach next to maximize transfer benefits?"
- "How do collocations like 'make a decision' create mutual reinforcement?"

Without this module, LOGOS would treat each vocabulary item as independent, missing opportunities to leverage prior learning for accelerated acquisition.

**When Used**:
- During learning queue construction to prioritize items with high incoming transfer
- After successful reviews to predict which related items now have reduced difficulty
- In batch processing to identify optimal "hub" words that transfer to many others
- When estimating time-to-mastery for curriculum planning

---

## Theoretical Framework

This module synthesizes four foundational theories from cognitive science and linguistics:

### Connectionist Learning (Rumelhart & McClelland, 1986)

**Technical**: Neural network-inspired model where knowledge is stored as patterns of activation across distributed representations, enabling generalization to novel inputs based on similarity to learned patterns.

**Plain English**: Your brain doesn't store words in separate filing cabinets - it stores them in overlapping patterns, like a web where similar things are connected. When you strengthen one connection (learning "happy"), nearby connections ("happiness", "happily", "glad") get a little stronger too. This module models that spreading activation.

### Transfer of Training (Thorndike & Woodworth, 1901)

**Technical**: Classical finding that learning one skill facilitates learning of related skills to the degree that they share "identical elements" - common component procedures, knowledge, or processes.

**Plain English**: The original discovery that practice transfers between related skills. Learning to catch baseballs helps you catch softballs because the underlying motion is similar. This module applies the "identical elements" principle to language - shared morphological roots, similar sound patterns, and overlapping meanings all count as identical elements.

### Morphological Family Effects (Nagy et al., 1989)

**Technical**: Empirical finding that knowing one member of a morphological family (e.g., "act") significantly facilitates recognition and learning of other family members ("action", "actor", "activate", "activity").

**Plain English**: Word families are the most powerful transfer pathway in language. Learning "nation" gives you a massive head start on "national", "nationality", "nationalize", and "internationally". The research shows vocabulary growth accelerates as learners build denser morphological networks.

### Associative Learning (Anderson, 1983)

**Technical**: ACT-R framework where knowledge is represented as networks of associated chunks, with spreading activation determining accessibility and retrieval speed.

**Plain English**: Words that appear together become mentally linked. The more you see "make" with "decision" or "take" with "chance", the stronger their association becomes. This module captures how collocational patterns create bidirectional transfer - learning one strengthens the other.

---

## Transfer Types Explained

The module recognizes six distinct pathways through which learning can transfer:

### Morphological Transfer (Strength: 0.6)

**What It Is**: Word family members sharing root knowledge.

**Examples**:
- `run` -> `running`, `runner`, `ran`
- `happy` -> `happiness`, `unhappy`, `happily`
- `nation` -> `national`, `international`, `nationality`

**Why Strongest**: Morphological transfer has the highest base rate (0.6) because family members share explicit structural elements. The root "nation" carries meaning, spelling patterns, and pronunciation that directly transfer.

### Collocational Transfer (Strength: 0.4)

**What It Is**: Co-occurrence patterns that strengthen together.

**Examples**:
- `make` + `decision` (learning one reinforces the other)
- `take` + `chance`
- `heavy` + `rain`

**Why It Matters**: Collocations represent statistical regularities in language use. Knowing that "make" frequently pairs with "decision" creates bidirectional facilitation - practicing one primes the other.

### Semantic Transfer (Strength: 0.35)

**What It Is**: Related meanings that facilitate each other.

**Examples**:
- `big` <-> `large` <-> `huge`
- `walk` <-> `run` <-> `sprint`
- `happy` <-> `glad` <-> `joyful`

**Why Moderate**: Semantic relationships are less direct than morphological ones - "big" and "large" share meaning but not form. Transfer is real but requires more abstraction.

### Syntactic Transfer (Strength: 0.3)

**What It Is**: Shared grammatical patterns that generalize.

**Examples**:
- Verb + to-infinitive pattern: `want to go`, `try to help`, `need to learn`
- Phrasal verb structure: `look up`, `give in`, `break down`

**Why It Helps**: Once you learn the pattern "verb + to + verb", applying it to new verbs becomes easier. The grammatical frame transfers even when the vocabulary differs.

### Phonological Transfer (Strength: 0.25)

**What It Is**: Similar sound patterns that aid pronunciation.

**Examples**:
- `-ight` words: `light`, `night`, `right`, `sight`
- Initial `str-`: `string`, `strong`, `street`, `stream`

**Why Lower**: Sound patterns are less consciously accessible than meaning or spelling, but phonological neighborhoods still facilitate word recognition and pronunciation.

### Orthographic Transfer (Strength: 0.2)

**What It Is**: Spelling pattern similarity.

**Examples**:
- `-tion` endings: `nation`, `station`, `relation`
- Silent `e` patterns: `make`, `take`, `bake`

**Why Lowest**: Orthographic transfer operates primarily on visual recognition and spelling accuracy - important but narrower than meaning-based transfer.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- `src/core/types.ts`: Imports `ComponentType` and `MasteryStage` type definitions for categorizing language objects and tracking learner progress

This module is designed to be **nearly self-contained**, embedding its own type definitions and configuration constants. This ensures:
- Transfer calculations remain pure and testable
- No circular dependency risks with other priority/scheduling modules
- Easy extraction if transfer prediction needs standalone use

### Dependents (What Needs This)

- `src/main/services/state-priority.service.ts`: Uses `generateBatchTransferPredictions()` to identify items that benefit from recently learned material, boosting their priority in the learning queue

- `src/core/priority.ts`: Could integrate `TransferPrediction.difficultyReduction` to adjust the effective difficulty of items based on predicted transfer

- `src/main/services/task-generation.service.ts`: Could use transfer networks to select related items for multi-object tasks, maximizing learning efficiency

- `src/core/transfer.ts` (sibling): While independent, this module **complements** the L1-L2 transfer module. A complete transfer picture combines:
  - Cross-language transfer (L1 -> L2): How native language affects L2 learning
  - Within-language transfer (L2 -> L2): How L2 knowledge facilitates more L2 knowledge

### Data Flow

```
Source Object (recently mastered)
    |
    v
buildTransferNetwork() --> TransferNetwork (outgoing relations)
    |
    v
calculateEffectiveTransfer() for each relation
    |                          |
    |    [Factors Combined]    |
    |    - Base strength       |
    |    - Type rate           |
    |    - Direction asymmetry |
    |    - Stage modifier      |
    |    - Time decay          |
    |    - Confidence          |
    |                          |
    v                          v
predictTransfer() --> TransferPrediction
    |                   - difficultyReduction
    |                   - learningTimeReduction
    |                   - stageAcceleration
    v
aggregatePredictions() --> Combined effect from multiple sources
    |
    v
Learning Queue Prioritization / Difficulty Adjustment
```

---

## Macroscale: System Integration

### Architectural Layer

This module sits in the **Core Algorithm Layer** alongside other pure computational modules:

```
Layer 1: Renderer (React UI)
    |
    v
Layer 2: Main Process (IPC handlers, services)
    |
    v
Layer 3: Core Algorithms <-- You are here (src/core/transfer-prediction.ts)
    |                        Also: transfer.ts, irt.ts, priority.ts
    v
Layer 4: Database (Prisma/SQLite)
```

Within the Core layer, transfer-prediction.ts connects to the **Learning Optimization** subgraph:

```
[IRT Module] ----+
(ability/difficulty)  |
                      v
                 priority.ts ---> Learning Queue
                      ^
                      |
[transfer.ts] --------+  (L1-L2 effects)
                      |
[transfer-prediction] +  (L2-L2 effects) <-- You are here
                      |
[FSRS Module] --------+  (spaced repetition)
```

### Big Picture Impact

This module enables **network-aware learning** - the recognition that vocabulary is not a flat list but a richly interconnected graph where strategic selection can multiply learning efficiency.

**Without this module**, LOGOS would:
- Treat each vocabulary item as isolated, missing transfer opportunities
- Fail to capitalize on "hub" words that transfer to many related items
- Over-estimate difficulty for items related to recently mastered content
- Miss the accelerating returns of morphological family learning
- Schedule items randomly rather than strategically for maximum transfer

**System Dependencies**:

1. **Priority Calculation**: Transfer predictions can reduce effective difficulty, boosting priority for items with high incoming transfer
2. **Batch Learning Analysis**: `generateBatchTransferPredictions()` identifies ripple effects from recent learning sessions
3. **Curriculum Optimization**: Transfer networks reveal which items to teach first for maximum downstream benefit
4. **Time Estimation**: `learningTimeReduction` predictions enable more accurate progress forecasting

### Critical Path Analysis

**Importance Level**: Medium-High

This module is not required for basic app functionality (LOGOS works without it), but it is essential for:
- Learning efficiency optimization (estimated 20-40% improvement in acquisition rate)
- Intelligent curriculum sequencing (teaching "hub" words first)
- Accurate difficulty prediction for related items
- Identifying when learners are ready for advanced vocabulary based on their morphological family coverage

**Failure Mode**: If this module fails or returns incorrect predictions:
- Learning queue would still function but with suboptimal ordering
- Difficulty estimates would be less accurate for related items
- The app would work, but learners would progress more slowly
- No data loss or critical functionality loss

---

## Core Concepts (Plain English)

### TransferRelation

**Technical**: A directed edge in the transfer graph connecting a source object to a target object, with properties for transfer type, strength (0-1), direction (forward/backward/bidirectional), and confidence (0-1).

**Plain English**: A transfer relation is like an arrow saying "if you know THIS, you'll find THAT easier." The arrow has a label (what kind of connection - morphological, semantic, etc.), a strength (how much it helps), and a confidence score (how sure we are this relationship exists).

**Why We Use It**: These relations form the edges of the transfer network, enabling the system to trace paths of learning facilitation.

### TransferPrediction

**Technical**: An output structure containing predicted effects on a target object: difficulty reduction (IRT scale), learning time reduction (0-1 proportion), stage acceleration (partial stages), contributing relations, and prediction confidence.

**Plain English**: A transfer prediction answers "what happens to this unlearned word now that the learner knows a related word?" It might say: "Learning 'nation' reduces the difficulty of 'national' by 0.9 units, cuts learning time by 30%, and could accelerate mastery by 0.4 stages."

**Why We Use It**: Predictions drive scheduling decisions - items with high predicted transfer benefits should be prioritized.

### TransferNetwork

**Technical**: A graph structure centered on one object, containing all incoming and outgoing transfer relations plus aggregate statistics (total relations, average strength, primary type, network reach).

**Plain English**: A transfer network is like a spider web centered on one word, showing everything connected to it. "Run" might connect to "running" (morphological), "sprint" (semantic), "run + out of" (collocational), and many others. The network statistics summarize how connected this word is - hub words have large, strong networks.

**Why We Use It**: Networks enable both local predictions (what does THIS word help?) and global analysis (which words are the most connected hubs?).

### Indirect/Chain Transfer

**Technical**: Multi-hop transfer effects where A -> B -> C creates indirect transfer from A to C, calculated with exponential decay per hop (factor of 0.5 per step) up to a configurable maximum depth (default: 3).

**Plain English**: Transfer can ripple through chains. If you learn "act", it helps "action" (direct transfer), and "action" helps "reaction" (second hop). So learning "act" actually gives you a small head start on "reaction" even though they're not directly connected. The effect weakens with each hop - like ripples spreading from a stone in water.

**Why We Use It**: Chain transfer captures the cumulative benefit of building vocabulary in related areas. Learning multiple words in the same family creates compounding transfer effects.

### Transfer Decay

**Technical**: Time-based reduction in transfer strength, modeled with configurable decay functions (exponential, power, or linear) based on days since the source item was last reviewed.

**Plain English**: Transfer is strongest right after you practice something. If you reviewed "nation" yesterday, it transfers strongly to "national" today. If you haven't reviewed "nation" in months, the transfer weakens - the knowledge is less active in memory. The decay function controls how quickly this fading happens.

**Why We Use It**: Decay ensures transfer predictions account for memory freshness, not just whether something was ever learned.

---

## Key Functions Explained

### calculateTransferDecay()

**What It Does**: Applies time-based decay to transfer strength based on days since the source was reviewed.

**Decay Models**:
- **Exponential** (default): `S(t) = S0 * e^(-lambda*t)` - Fast initial decay, then stabilizes
- **Power**: `S(t) = S0 * (1+t)^(-lambda)` - Slower decay, better for long-term effects
- **Linear**: `S(t) = S0 * max(0, 1-lambda*t)` - Constant decay rate until zero

**Plain English**: Like how a phone battery indicator drops over time, this function calculates how much the transfer "charge" has depleted since the source knowledge was refreshed.

### calculateEffectiveTransfer()

**What It Does**: Combines all factors to compute the actual transfer strength between two objects.

**Factors Combined**:
1. Base relation strength (how similar are they?)
2. Type-specific rate (morphological transfer stronger than orthographic)
3. Direction asymmetry (forward transfer stronger than backward)
4. Stage modifier (mastered items transfer better than partially learned)
5. Automatization bonus (automated knowledge transfers 20% better)
6. Time decay (fresher knowledge transfers better)
7. Confidence weighting (uncertain relations contribute less)

**Plain English**: This function asks "given everything we know - what kind of relationship, how well the source is known, how recently it was practiced - how much actual benefit flows to the target?"

### predictTransfer()

**What It Does**: Generates a complete transfer prediction for one source-target pair.

**Output Includes**:
- `difficultyReduction`: Up to 1.5 IRT units easier (on a -3 to +3 scale)
- `learningTimeReduction`: Up to 40% faster acquisition
- `stageAcceleration`: Up to 0.5 extra stages (from highly mastered sources)

**Plain English**: This is the payoff function - given a transfer relationship and source state, it predicts exactly how much easier and faster learning the target will be.

### generateBatchTransferPredictions()

**What It Does**: Processes multiple recently-learned objects and generates aggregated predictions for all affected targets.

**Process**:
1. For each learned object, find all direct transfer relations
2. Generate predictions for each direct target
3. If configured, calculate indirect (chain) transfer effects
4. Aggregate multiple predictions for the same target (with diminishing returns)
5. Sort by total benefit and identify priority objects

**Plain English**: After a learning session, this function answers "what ripple effects do these newly mastered items create?" It finds all the dominoes that might fall easier now.

---

## Configuration Constants

### DEFAULT_TRANSFER_RATES

Base transfer rates by type, derived from psycholinguistic research:

| Type | Rate | Rationale |
|------|------|-----------|
| Morphological | 0.6 | Strong family effects (Nagy et al., 1989) |
| Collocational | 0.4 | Moderate PMI-based association |
| Semantic | 0.35 | Semantic priming effects |
| Syntactic | 0.3 | Pattern generalization |
| Phonological | 0.25 | Phonological neighborhood effects |
| Orthographic | 0.2 | Spelling pattern similarity |

### TRANSFER_ASYMMETRY

Direction modifiers reflecting that forward transfer (known -> unknown) is stronger than backward transfer (unknown strengthening known):

| Direction | Factor | Meaning |
|-----------|--------|---------|
| Forward | 1.0 | Full strength: knowing A helps learn B |
| Backward | 0.6 | Reduced: learning B slightly reinforces A |
| Bidirectional | 0.8 | Symmetric average |

### STAGE_TRANSFER_MODIFIER

How mastery stage affects transfer potential:

| Stage | Modifier | Interpretation |
|-------|----------|----------------|
| 0 (Unknown) | 0.1 | Almost no transfer from unlearned items |
| 1 (Recognition) | 0.3 | Minimal transfer from early learning |
| 2 (Recall) | 0.6 | Moderate transfer from established knowledge |
| 3 (Controlled) | 0.85 | Strong transfer from well-known items |
| 4 (Automatic) | 1.0 | Full transfer from mastered items |

---

## Memory Safety

The module includes protective constants to prevent runaway computation:

- `MAX_RELATED_OBJECTS = 100`: Limits objects processed per source
- `MAX_CHAIN_DEPTH = 5`: Caps indirect transfer hops (default config: 3)
- `MAX_PREDICTION_HISTORY = 1000`: Limits total predictions stored

These bounds ensure predictable performance even with large vocabulary networks.

---

## Relationship to L1-L2 Transfer Module

This module (`transfer-prediction.ts`) and its sibling (`transfer.ts`) handle different but complementary aspects of language learning transfer:

| Aspect | transfer.ts (L1-L2) | transfer-prediction.ts (L2-L2) |
|--------|---------------------|-------------------------------|
| **Focus** | Native language influence | Within-L2 relationships |
| **Question** | "How does knowing Spanish help learn English?" | "How does knowing 'run' help learn 'running'?" |
| **Scope** | Cross-language | Within-language |
| **Data Source** | Language family tables | Object relationship graph |
| **Effect** | Adjusts base difficulty | Predicts difficulty reduction |
| **Application** | Initial item calibration | Dynamic learning optimization |

**Complete Transfer Model**:
```
Total Transfer Effect = L1-L2 Transfer + L2-L2 Transfer
                      = (Native language help/interference)
                      + (Prior L2 knowledge facilitation)
```

A Spanish speaker learning "international" benefits from:
1. L1-L2 transfer: Spanish "internacional" is a cognate (from transfer.ts)
2. L2-L2 transfer: If they know "nation" and "national" (from transfer-prediction.ts)

---

## Change History

### 2026-01-08 - Documentation Created
- **What Changed**: Initial narrative documentation for transfer-prediction module
- **Why**: Shadow documentation system implementation
- **Impact**: Enables understanding of within-L2 transfer system for all team members

### Initial Implementation - Module Created
- **What Changed**: Created complete within-L2 transfer prediction system with:
  - Six transfer types (morphological, collocational, semantic, syntactic, phonological, orthographic)
  - TransferRelation and TransferPrediction type definitions
  - Transfer network construction
  - Direct and indirect (chain) transfer calculation
  - Batch prediction generation
  - Configurable decay functions (exponential, power, linear)
  - Stage-based and automatization modifiers
- **Why**: Language learning optimization requires modeling how knowing one item facilitates learning related items
- **Impact**: Enables network-aware learning sequencing, difficulty prediction, and curriculum optimization

---

## Academic Foundations

This module synthesizes research from cognitive science, linguistics, and educational psychology:

- **Rumelhart, D.E. & McClelland, J.L. (1986)**: *Parallel Distributed Processing* - Connectionist learning framework underlying the spreading activation model

- **Thorndike, E.L. & Woodworth, R.S. (1901)**: *"The influence of improvement in one mental function upon the efficiency of other functions"* - Original transfer of training research establishing "identical elements" principle

- **Nagy, W.E., Anderson, R.C., Schommer, M., Scott, J.A., & Stallman, A.C. (1989)**: *"Morphological families in the internal lexicon"* - Empirical evidence for morphological family effects in vocabulary acquisition

- **Anderson, J.R. (1983)**: *The Architecture of Cognition* - ACT-R framework for associative learning and spreading activation

The transfer rates and decay functions in this module are computational implementations inspired by these theoretical frameworks, calibrated for practical application in language learning optimization.
