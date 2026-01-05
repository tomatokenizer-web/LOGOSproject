# Collocation Repository

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/db/repositories/collocation.repository.ts`
> **Status**: Active
> **Phase**: 2.4 - Collocation Storage

---

## Context & Purpose

### Why This Repository Exists

Language fluency is not just knowing individual words - it is knowing which words *belong together*. A native English speaker says "make a decision" not "do a decision," "heavy rain" not "strong rain." These natural pairings, called **collocations**, are invisible patterns that separate fluent speech from awkward translation.

The Collocation Repository exists to **persist and query the statistical relationships between word pairs** discovered through PMI (Pointwise Mutual Information) analysis. It transforms raw corpus statistics into actionable data that drives intelligent vocabulary sequencing and task generation.

**Business Need**: Language learners spend countless hours memorizing isolated vocabulary only to sound unnatural when speaking. By storing and surfacing collocations, LOGOS can:
1. Teach words that "belong together" in the same session
2. Generate contextual practice that reflects actual language use
3. Identify "hub words" (high relational density) that unlock many phrases
4. Create fluency-building tasks using strongly associated pairs
5. Create versatility-building tasks using weakly associated pairs

**When Used**:
- After corpus analysis to store discovered word relationships
- When building the "R" (Relational Density) component of priority scores
- When generating contextual fill-in-the-blank tasks
- When creating MCQ distractors (avoiding strong collocations as wrong answers)
- When visualizing vocabulary networks for analytics
- During fluency tasks (high-PMI pairs) and versatility tasks (low-PMI pairs)

### The Collocation-Fluency Connection

Consider the word "medication." In isolation, a learner might know its definition. But native speakers also know:
- "take medication" (verb collocation)
- "medication adherence" (noun collocation)
- "over-the-counter medication" (modifier collocation)
- "prescribe medication" (medical context)

Each of these pairs has a measurable PMI score. High PMI means the words appear together far more often than random chance would predict - they are statistically attracted to each other. This repository stores these relationships so LOGOS can leverage them throughout the learning experience.

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- **`src/main/db/prisma.ts`**: `getPrisma()` - Provides the database connection handle. Every repository function begins by acquiring the Prisma client through this centralized access point.

- **`@prisma/client`**: `Collocation`, `LanguageObject` types - TypeScript type definitions generated from the Prisma schema that ensure type safety for all database operations.

### Dependents (What Needs This)

- **`src/main/db/index.ts`**: Re-exports all repository functions as part of the unified database module. Other parts of the application access collocation functions via `import { ... } from '../db'`.

- **Priority Calculation System** (Integration Point):
  - The `calculateRelationalDensity()` function computes the "R" component of FRE priority scores
  - Words with many high-PMI partners receive higher relational density scores
  - This feeds directly into `src/core/priority.ts` when computing what to teach next

- **Task Generation** (Integration Point):
  - `getTopCollocations()` provides high-PMI pairs for fluency practice
  - `getLowPMIPairs()` provides weak associations for versatility tasks
  - `getCollocationsForWord()` helps generate contextual sentence frames

- **Analytics & Visualization** (Integration Point):
  - `getCollocationNetwork()` builds graph data for vocabulary network visualizations
  - `getCollocationStats()` provides aggregate metrics for dashboards

- **Corpus Analysis Pipeline** (Upstream):
  - After PMI computation in `src/core/pmi.ts`, results are persisted via `createCollocation()` or `bulkCreateCollocations()`
  - This creates a persistent cache of statistical relationships

### Data Flow

```
Corpus Text Analysis
      |
      v
src/core/pmi.ts (PMI computation)
      |
      v
collocation.repository.ts
      |
      +---> createCollocation() / bulkCreateCollocations()
      |           |
      |           v
      |     [Store in Collocation table]
      |
      +---> getCollocationsForWord()
      |           |
      |           v
      |     [Return related words for task generation]
      |
      +---> calculateRelationalDensity()
      |           |
      |           v
      |     [Compute hub score -> update LanguageObject.relationalDensity]
      |
      +---> getCollocationNetwork()
                  |
                  v
            [Build graph for visualization]
```

---

## Macroscale: System Integration

### Architectural Layer

This repository sits in the **Data Access Layer** of LOGOS's three-tier architecture:

```
Layer 1: Presentation (React UI)
    |
    | IPC Bridge
    v
Layer 2: Application Logic (IPC Handlers + Services)
    |
    | Repository Pattern
    v
Layer 3: DATA ACCESS LAYER <-- You are here
    |
    | Prisma ORM
    v
Layer 4: Database (SQLite)
```

Within the data layer, collocation.repository.ts serves a specialized role - it bridges the gap between **corpus statistics** (computed offline or during import) and **real-time learning decisions** (task selection, priority calculation).

### The PMI-to-Learning Pipeline

This repository is a critical link in transforming raw text analysis into intelligent learning:

```
Raw Corpus
    |
    v
Tokenization & Window Analysis
    |
    v
PMI Computation (src/core/pmi.ts)
    |
    v
COLLOCATION REPOSITORY <-- Persistence layer
    |
    +---> Relational Density (R in FRE priority)
    +---> Task Generation (fluency/versatility)
    +---> Network Visualization
    +---> Difficulty Calibration
```

### Big Picture Impact

The Collocation Repository enables several key LOGOS capabilities:

1. **Intelligent Vocabulary Sequencing**
   - High relational density words are prioritized
   - Related words can be taught in clusters
   - The "R" component ensures hub words surface early

2. **Fluency Task Generation**
   - `getTopCollocations()` provides strongly associated pairs
   - Tasks like "The patient ___ medication daily" leverage natural co-occurrence
   - High-PMI pairs are easier to recall (leveraging memory priming)

3. **Versatility Task Generation**
   - `getLowPMIPairs()` provides weakly associated but valid combinations
   - Forces learners to process language more deeply
   - Builds flexible vocabulary use beyond formulaic phrases

4. **Network Visualization**
   - `getCollocationNetwork()` enables interactive vocabulary maps
   - Learners can explore word relationships visually
   - Helps identify vocabulary clusters and knowledge gaps

5. **Analytics & Progress Tracking**
   - `getCollocationStats()` aggregates PMI metrics for dashboards
   - Tracks how interconnected the learned vocabulary has become

### What Breaks Without Collocations

If this repository failed or was empty:

1. **Priority calculation degrades**: The "R" (Relational Density) component would be zero for all words, reducing priority accuracy by approximately 30%

2. **Task generation becomes generic**: Without collocation data, tasks cannot leverage natural language patterns - they become random word combinations

3. **Network visualization fails**: The vocabulary graph would have no edges, only isolated nodes

4. **Fluency training impossible**: High-PMI phrase practice relies entirely on this data

5. **Hub word identification fails**: Cannot identify which words unlock the most phrases

**Critical Path Analysis**: This is a **Tier 2 Component**. While the system can function without collocations (unlike mastery state which is Tier 1), the quality of learning experience degrades significantly. The adaptive algorithms operate in a "degraded mode" with less intelligent sequencing.

---

## Technical Concepts (Plain English)

### PMI (Pointwise Mutual Information)

**Technical**: PMI(x,y) = log2[P(x,y) / (P(x)P(y))]. It measures the log-ratio of the joint probability to the product of marginal probabilities.

**Plain English**: PMI answers the question: "How surprised should I be to see these two words together?" If "heavy" and "rain" appear together far more often than we would expect by random chance, they have high PMI. If "heavy" and "mathematics" rarely appear together (less than random chance would predict), they have negative PMI.

**Why We Use It**: PMI gives us an objective, data-driven measure of "these words belong together" without requiring any linguist to manually tag collocations. The statistics emerge from how language is actually used.

### NPMI (Normalized PMI)

**Technical**: NPMI = PMI / -log2[P(x,y)]. Normalizes PMI to the range [-1, +1].

**Plain English**: Regular PMI has a problem - rare word pairs can have astronomically high PMI just because they are rare. If "pneumonoultramicroscopicsilicovolcanoconiosis" appears only twice, both times next to "disease," the PMI is huge but meaningless. NPMI scales everything to a consistent -1 to +1 range where:
- +1 = perfect association (they ALWAYS appear together)
- 0 = no relationship
- -1 = perfect exclusion (they NEVER appear together)

**Why We Use It**: NPMI allows fair comparison across frequency bands. A common pair with NPMI 0.7 and a rare pair with NPMI 0.7 have genuinely similar associative strength.

### Relational Density (Hub Score)

**Technical**: A normalized measure combining the number of significant collocations a word has with the average strength (PMI) of those connections.

**Plain English**: Think of vocabulary as a social network where words are people. Some words are "popular" - they connect to many other words through strong collocations. The word "take" connects to hundreds of phrases (take medication, take time, take action, take over). Its relational density is high. Conversely, "pneumatic" connects to very few words. Learning "take" unlocks access to many phrases; learning "pneumatic" unlocks few.

**Formula Used**:
```
connectionFactor = log(connectionCount + 1)
pmiNormalized = min(avgPMI / 10, 1)
relationalDensity = min(connectionFactor * pmiNormalized, 1)
```

**Why We Use It**: This is the "R" in FRE priority. Hub words are force multipliers in vocabulary acquisition - learning them yields disproportionate comprehension gains.

### BFS (Breadth-First Search) Network Traversal

**Technical**: A graph traversal algorithm that explores nodes level by level, starting from a center node and expanding outward.

**Plain English**: Imagine dropping a pebble in water and watching the ripples spread outward in rings. BFS explores the vocabulary network the same way - first all words directly connected to the center word (depth 1), then all words connected to those (depth 2), and so on. This builds a "neighborhood" around any word.

**Why We Use It**: The `getCollocationNetwork()` function uses BFS to build visualization graphs. Without BFS, we would either get disconnected fragments or overwhelm the UI with the entire vocabulary at once.

### Bidirectional Lookup

**Technical**: Querying collocations where a word can be either word1 or word2 in the pair.

**Plain English**: When we store "medication|patient" as a collocation, we need to find it whether someone asks "what words go with medication?" or "what words go with patient?" The repository handles this by always checking both directions: `WHERE word1Id = ? OR word2Id = ?`.

**Why We Use It**: Collocations are symmetric relationships. The order we happened to store them should not affect retrieval. This ensures `getCollocationsForWord("medication")` returns "patient" even if the pair was stored as patient-medication.

---

## Function Reference

### Core CRUD Operations

| Function | Purpose | When Used |
|----------|---------|-----------|
| `createCollocation()` | Store a single word pair relationship | After PMI analysis discovers a significant pair |
| `getCollocation()` | Retrieve collocation by word pair | Checking if relationship already exists |
| `updateCollocation()` | Update PMI statistics for existing pair | When corpus expands and statistics change |
| `deleteCollocation()` | Remove a collocation relationship | Data cleanup or word deletion cascades |
| `bulkCreateCollocations()` | Batch insert many collocations efficiently | After corpus analysis (typically hundreds/thousands of pairs) |

### Query Operations

| Function | Purpose | When Used |
|----------|---------|-----------|
| `getCollocationsForWord()` | Get all collocations for a specific word | Task generation, building context frames |
| `getTopCollocations()` | Get highest-PMI pairs for a goal | Fluency task selection |
| `getLowPMIPairs()` | Get low-PMI pairs for a goal | Versatility task selection |

### Analysis Operations

| Function | Purpose | When Used |
|----------|---------|-----------|
| `calculateRelationalDensity()` | Compute hub score for single word | Priority calculation (R component) |
| `recalculateRelationalDensities()` | Batch update hub scores for all objects | After bulk collocation import |
| `getCollocationStats()` | Aggregate statistics for a goal | Analytics dashboard rendering |

### Visualization

| Function | Purpose | When Used |
|----------|---------|-----------|
| `getCollocationNetwork()` | Build node-edge graph for visualization | Network graph component rendering |

---

## Query Patterns

### Bidirectional Collocation Lookup

The `getCollocation()` function implements bidirectional lookup:

```
WHERE (word1Id = ? AND word2Id = ?)
   OR (word1Id = ? AND word2Id = ?)  -- reversed
```

**Why**: Collocations are symmetric. "Heavy rain" and "rain heavy" are the same relationship. The storage order is arbitrary, so retrieval must check both directions.

### PMI-Filtered Queries

Several functions filter by PMI threshold:

```
WHERE pmi >= ?  -- minPMI parameter
```

**Why**: Low-PMI pairs are often noise - words that happen to appear near each other without semantic connection. The threshold (typically 2.0) filters to statistically meaningful associations.

### BFS Network Construction

The `getCollocationNetwork()` function implements breadth-first traversal:

```
queue = [centerWord]
while queue not empty:
  word = queue.dequeue()
  if visited: continue
  visited.add(word)
  collocations = getCollocationsForWord(word, minPMI)
  for each collocation:
    add edge to graph
    if depth < maxDepth:
      queue.enqueue(neighbor)
```

**Why**: This builds a bounded neighborhood around a word. Without depth limits, the entire vocabulary would be included. Without BFS, the graph might be fragmented or unbalanced.

### Relational Density Formula

The `calculateRelationalDensity()` function computes:

```
hubScore = min(
  log(connectionCount + 1) * min(avgPMI / 10, 1),
  1
)
```

**Why**:
- `log(connections)`: Dampens effect of extremely high connection counts (diminishing returns)
- `avgPMI / 10`: Normalizes PMI to ~[0,1] range (assuming max useful PMI is ~10)
- Final `min(..., 1)`: Ensures output is bounded [0,1] for the FRE formula

---

## Integration with FRE Priority

The Collocation Repository directly feeds the "R" component of priority calculation:

```
Priority = (w_F * F + w_R * R + w_E * E) / Cost
```

Where **R = relationalDensity** computed by this repository.

### How R is Computed

1. `calculateRelationalDensity(wordId)` queries all collocations for the word
2. It computes:
   - Number of significant connections
   - Average PMI of those connections
   - Combined hub score normalized to [0,1]
3. The result is stored in `LanguageObject.relationalDensity`
4. Priority calculation reads this field when building learning queues

### Impact on Learning Order

Words with high R scores get priority because:
- They connect to many other words (hub nodes in the vocabulary network)
- Learning them creates "force multipliers" - understanding "take" helps understand dozens of phrases
- They provide more contextual anchors for future learning

Example: In medical English, "medication" has high R because it collocates with:
- "take medication" (administration)
- "prescribe medication" (medical action)
- "medication adherence" (compliance concept)
- "over-the-counter medication" (category)
- "medication interaction" (safety concern)

Learning "medication" early unlocks comprehension of many medical contexts.

---

## Fluency vs. Versatility Tasks

The repository supports two distinct task types based on PMI:

### Fluency Tasks (High PMI)

**Function**: `getTopCollocations(goalId, limit)`

**Purpose**: Build automaticity with natural language patterns

**Example Task**: "The patient should ___ the medication as prescribed."
- Correct answer: "take" (high PMI with "medication")
- Easy because the collocation primes recall

**Why It Works**: High-PMI pairs activate each other in memory. When a learner sees "medication," the word "take" is already partially activated. This builds the kind of automatic, effortless language use that characterizes fluency.

### Versatility Tasks (Low PMI)

**Function**: `getLowPMIPairs(goalId, maxPMI, limit)`

**Purpose**: Build flexible vocabulary use beyond formulaic phrases

**Example Task**: "The committee will ___ the proposal tomorrow."
- Multiple valid answers: "discuss," "review," "consider," "reject"
- Harder because no strong collocation primes a specific answer

**Why It Works**: Low-PMI pairs force deeper processing. The learner cannot rely on automatic associations and must actually think about meaning and context. This builds the kind of flexible language use needed for novel situations.

---

## Change History

### 2026-01-04 - Phase 2.4 Implementation
- **What Changed**: Created collocation.repository.ts with full CRUD, query operations, relational density calculation, network building, and analytics functions
- **Why**: Implementing Phase 2.4 (Collocation Storage) of the LOGOS development roadmap
- **Impact**: Enables PMI-based collocation storage, relational density computation for priority scores, fluency/versatility task generation, and network visualization

### Design Decisions

1. **Bidirectional Lookup in getCollocation()**: Rather than enforcing alphabetical order on storage, we check both directions on retrieval. This simplifies the insert logic at a small query cost.

2. **BFS for Network Building**: Chose BFS over DFS because it produces more balanced, "ripple-like" graphs that are easier to visualize. DFS would create long chains that are harder to display.

3. **Log Scaling for Relational Density**: Used logarithm to dampen connection count because a word with 100 connections is not 10x more valuable than one with 10 connections. Diminishing returns apply.

4. **Separate High/Low PMI Functions**: Rather than one function with direction parameter, separate `getTopCollocations()` and `getLowPMIPairs()` functions make intent clear and prevent accidental misuse.

5. **Batch Recalculation Function**: `recalculateRelationalDensities()` iterates through all objects because updating one word's collocations can change many relational densities. Batch processing ensures consistency.

---

## Testing Considerations

The repository's database-dependent nature requires integration testing:

1. **Bidirectional retrieval**: Verify `getCollocation(a, b)` returns same result as `getCollocation(b, a)`

2. **PMI filtering**: Verify `getCollocationsForWord(id, minPMI=5)` excludes pairs below threshold

3. **Network depth limits**: Verify `getCollocationNetwork(goalId, centerId, depth=1)` does not include depth-2 nodes

4. **Relational density bounds**: Verify output is always in [0, 1] range regardless of input

5. **Empty corpus handling**: Verify graceful behavior when no collocations exist

6. **Bulk operation efficiency**: Verify `bulkCreateCollocations()` uses batch insert (not N individual inserts)

---

*This documentation mirrors: `src/main/db/repositories/collocation.repository.ts`*
*Shadow Map methodology: Narrative explanation of intent, not code description*
