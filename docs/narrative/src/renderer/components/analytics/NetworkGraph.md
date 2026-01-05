# NetworkGraph Component

> **Last Updated**: 2026-01-04
> **Code Location**: `src/renderer/components/analytics/NetworkGraph.tsx`
> **Status**: Active
> **Theoretical Foundation**: ALGORITHMIC-FOUNDATIONS.md Part 2 (PMI), THEORETICAL-FOUNDATIONS.md (Vocabulary Networks)

---

## Context & Purpose

### Why This Component Exists

The NetworkGraph component exists to answer a fundamental question for language learners: **"How are the words I'm learning connected to each other?"**

Language is not a list of isolated vocabulary items. It is a densely interconnected web where words derive meaning from their relationships. "Run" connects to "jog," "sprint," "marathon," and "runner." "Patient" lives in a constellation with "doctor," "hospital," "medication," and "diagnosis." Understanding these connections accelerates learning because the brain naturally stores and retrieves information through associative networks.

LOGOS visualizes these relationships as an interactive force-directed graph where:
- **Nodes** represent language objects (words, phrases, roots, collocations)
- **Edges** represent relationships (PMI-weighted collocations, morphological families, semantic clusters)
- **Visual properties** encode learning state (mastery level, linguistic component type)

This transforms abstract statistical relationships (like PMI scores from corpus analysis) into tangible, explorable visualizations that help learners see the structure of their growing vocabulary.

**Business Need**: Traditional vocabulary apps present words as flashcard lists, ignoring the network structure of language. Learners cannot see which words unlock other words, which clusters belong together, or where their knowledge has gaps. NetworkGraph provides this "map view" of vocabulary, transforming language learning from memorization into exploration.

**When Used**:
- On the analytics dashboard to show vocabulary network growth over time
- When examining a specific word to see its collocations and related forms
- When identifying learning opportunities (isolated nodes suggest vocabulary gaps)
- When visualizing morphological families (verb conjugations, noun derivations)
- When showing progress through semantic domains (medical vocabulary cluster, legal terms cluster)

---

## The Design Philosophy: Physics as Metaphor

### Why Force-Directed Layout?

The component uses a **force-directed graph algorithm** (sometimes called "force simulation" or "spring-electric model") where:
- Nodes repel each other like charged particles (**Coulomb's Law**)
- Edges attract connected nodes like springs (**Hooke's Law**)
- A center gravity prevents the graph from drifting away

This creates a natural, organic layout where:
- Strongly connected words cluster together
- Weakly connected words drift apart
- The overall structure reveals the topology of vocabulary knowledge

**The physics metaphor is pedagogically meaningful**: Words that "belong together" literally pull toward each other on screen. PMI scores become visible as edge thickness. The learner can *see* that "patient" and "medication" have a strong relationship, while "patient" and "motorcycle" have none.

### Pure TypeScript, No D3

A critical architectural decision: this component implements its own force simulation from scratch in pure TypeScript, rather than depending on D3.js (the standard library for such visualizations).

**Why avoid D3?**
1. **Bundle size**: D3 is large (~100KB minified). The force simulation alone is only ~2KB.
2. **Learning curve**: D3's API is notoriously complex. This implementation is transparent.
3. **Electron compatibility**: Pure TypeScript runs anywhere without polyfills.
4. **Debugging**: When something goes wrong, the physics code is right there to inspect.
5. **Customization**: We control exactly how PMI weights translate to spring constants.

The tradeoff is that we cannot use D3's extensive ecosystem of layouts and helpers, but for this specific use case (force-directed vocabulary network), the custom implementation provides exactly what LOGOS needs.

---

## Microscale: Direct Relationships

### Dependencies (What This Component Needs)

**`src/renderer/components/ui/index.ts`**: Design System Components
- `GlassCard`: Container for the empty state and the wrapped card variant
- `GlassBadge`: Legend indicators showing mastery level colors
- `GlassButton`: Refresh button in the NetworkGraphCard variant

These are the only external React component dependencies. The visualization itself uses native Canvas API.

**Browser APIs**:
- `CanvasRenderingContext2D`: All rendering happens through HTML5 Canvas, not DOM elements
- `requestAnimationFrame`: Powers the smooth physics animation loop
- `window.devicePixelRatio`: Handles high-DPI (Retina) display scaling

### Dependents (What Needs This Component)

**`src/renderer/components/analytics/ProgressDashboard.tsx`** (Sibling - Future Integration)
- The dashboard currently shows mastery distribution and bottlenecks
- NetworkGraph will be integrated to show vocabulary topology alongside statistics

**`src/core/state/component-search-engine.ts`**: Data Source
- The `buildNetworkGraph()` method produces `NetworkNode[]` and `NetworkEdge[]`
- This data flows into NetworkGraph's `nodes` and `edges` props
- The search engine converts ComponentObjectState relations (collocations, morphological families) into graph format

**Future Dependents**:
- Word detail views (show network around a specific word)
- Learning path visualization (show prerequisite chains)
- Semantic domain explorer (zoom into specific vocabulary clusters)

### Data Flow

```
ComponentObjectState records (from database)
        |
        v
[ComponentSearchEngine.buildNetworkGraph()]
        |
        | Extracts: collocations (with PMI), morphological family,
        |           semantic neighbors, prerequisite relations
        v
NetworkGraphView { nodes: NetworkNode[], edges: NetworkEdge[] }
        |
        | Adapter transformation (type mapping)
        v
NetworkGraphProps { nodes: GraphNode[], edges: GraphEdge[] }
        |
        v
[NetworkGraph Component]
        |
        +-- initializeSimulation() --> SimNode[], SimEdge[]
        |
        +-- simulationStep() --> Position updates (physics)
        |
        +-- renderGraph() --> Canvas draw calls
        |
        +-- findNodeAtPosition() --> Hit testing for interaction
        |
        v
Visual Output: Interactive force-directed graph on Canvas
```

---

## Macroscale: System Integration

### Architectural Layer

NetworkGraph sits at the **Presentation Layer** of LOGOS, specifically in the Analytics visualization subsystem:

```
Layer 5: Application Shell (routing, navigation)
Layer 4: Pages/Views (DashboardPage, SessionPage)
Layer 3: Feature Components (ProgressDashboard, SessionView)
Layer 2: Visualization Components (NetworkGraph, charts) <-- YOU ARE HERE
Layer 1: Design System Primitives (GlassCard, GlassButton)
Layer 0: Canvas/DOM APIs
```

It is a **pure presentation component**: it receives data (nodes, edges), renders them, and emits events (onNodeClick, onNodeDoubleClick). It has no knowledge of where the data comes from or what happens when a node is clicked.

### The Bridge Between Statistics and Intuition

NetworkGraph is the critical **translation layer** between abstract corpus statistics and human intuition:

```
ALGORITHMIC WORLD                    VISUAL WORLD
────────────────────────────────────────────────────────
PMI score: 4.7                 -->   Thick, highlighted edge
NPMI normalized: 0.72          -->   Edge pulled tight (short)
Mastery stage: 3               -->   Node size: 18px, green fill
Component: MORPH               -->   Violet color from palette
Collocation relation           -->   Blue edge
Morphological relation         -->   Purple edge
Semantic relation              -->   Green edge
```

This translation is why the component matters: it makes invisible relationships visible.

### Integration with Mastery System

The visual encoding of mastery stages serves a pedagogical purpose:

| Mastery Stage | Visual Encoding | Meaning |
|---------------|-----------------|---------|
| 0 (New) | Small, gray node | Unknown word, recently introduced |
| 1 (Learning) | Amber node | Recognized but not recalled reliably |
| 2 (Familiar) | Blue node | Can recall with some effort |
| 3 (Proficient) | Green node | Reliable recall, approaching automation |
| 4 (Mastered) | Large, purple node | Fully automated, unconscious retrieval |

Learners can immediately see: "My network has many small gray nodes connected to a few large purple ones." This reveals the natural progression: master hub words, then expand outward.

### Integration with Linguistic Components

When nodes are tagged with linguistic component types (PHON, MORPH, LEX, SYNT, PRAG), the color palette shifts to show which *aspect* of language knowledge the word represents:

| Component | Color | Meaning |
|-----------|-------|---------|
| PHON (Phonology) | Pink | Pronunciation, sound patterns |
| MORPH (Morphology) | Violet | Word formation, prefixes, suffixes |
| LEX (Lexical) | Blue | Core vocabulary meaning |
| SYNT (Syntax) | Green | Grammatical usage patterns |
| PRAG (Pragmatics) | Orange | Contextual/social usage |

This allows the graph to show not just *which words* are connected, but *what kind of knowledge* each connection represents.

### What Breaks Without NetworkGraph

If this component failed or was removed:
1. **No vocabulary topology visualization**: Learners lose the "map" of their knowledge
2. **Collocation relationships invisible**: PMI data has no visual representation
3. **Morphological families invisible**: Root/derivation relationships hidden
4. **Progress feels abstract**: Statistics without spatial structure
5. **Learning feels isolated**: No sense of how words connect

NetworkGraph is not critical path (the app runs without it), but it is essential for the *exploratory learning experience* that differentiates LOGOS from flashcard apps.

---

## Technical Concepts (Plain English)

### Force-Directed Graph / Force Simulation

**Technical**: An algorithm that positions graph nodes by simulating physical forces. Nodes repel each other via Coulomb's law (F = k/r^2), while edges act as springs following Hooke's law (F = -kx). The system iterates until forces balance (equilibrium).

**Plain English**: Imagine each word is a small magnet that pushes away other magnets, but some words are connected by rubber bands that pull them together. If you let go of all the magnets, they'll bounce around and eventually settle into a configuration where the pushing and pulling balance out. Words connected by strong rubber bands (high PMI) end up close together. Words with no connection drift to the edges.

**Why We Use It**: It produces natural, readable layouts without manual positioning. Related words automatically cluster. The layout *encodes* relationship strength visually.

### Canvas-Based Rendering

**Technical**: Drawing directly to an HTML5 Canvas 2D context using immediate mode rendering, rather than creating DOM elements (SVG, divs) for each visual element.

**Plain English**: Instead of creating hundreds of HTML elements (one per word, one per line), we paint directly onto a single "digital canvas" like an artist painting on a real canvas. This is much faster when there are many things to draw because the browser doesn't have to manage hundreds of separate elements.

**Why We Use It**: Vocabulary networks can have hundreds of nodes. Canvas handles this smoothly. DOM-based rendering (SVG) would lag noticeably beyond ~100 nodes.

### Hit Testing

**Technical**: Determining which graphical element (if any) is under a given screen coordinate by checking geometric containment (typically point-in-circle for nodes).

**Plain English**: When you click on the canvas, we need to figure out "did they click on a word, or on empty space?" We do this by checking the distance from your click to the center of each word-circle. If the distance is less than the circle's radius, you clicked on that word.

**Why We Use It**: Canvas doesn't have built-in "click this circle" events like DOM elements. We implement our own click detection so users can select and interact with nodes.

### Alpha Decay (Simulation Cooling)

**Technical**: A coefficient (alpha) that starts at 1.0 and decays exponentially each frame (alpha *= 0.99), multiplied with all forces to gradually reduce motion until the simulation stabilizes.

**Plain English**: Imagine the physics simulation starts "hot" - everything is bouncing around energetically. Each frame, we turn down the heat a little bit. Eventually, the system "cools" and settles into a stable arrangement. Without cooling, the nodes would bounce forever.

**Why We Use It**: Creates smooth, organic settling animation. The graph starts active, finds its layout, then becomes stable for interaction.

### High-DPI Scaling (devicePixelRatio)

**Technical**: Adjusting canvas dimensions by window.devicePixelRatio to render at the display's native resolution, then scaling down via CSS to maintain correct visual size.

**Plain English**: Retina displays have 2x or 3x the pixels of normal displays. If we draw a 600x400 canvas on a Retina screen, it looks blurry because each "virtual pixel" is shown as a 2x2 or 3x3 block. By drawing at 1200x800 and displaying at 600x400, we use all the real pixels and everything looks crisp.

**Why We Use It**: LOGOS targets desktop users (Electron app), many of whom have high-DPI displays. Text and circles must be sharp.

### PMI-Weighted Springs

**Technical**: Edge weight (derived from normalized PMI) affects the spring constant and rest length, so high-PMI collocations have stronger, shorter springs.

**Plain English**: The rubber band between "strong" and "coffee" is thick and tight (high PMI = common collocation). The rubber band between "strong" and "bicycle" is thin and slack (low PMI = rare co-occurrence). When the simulation runs, "strong coffee" ends up close together while "strong bicycle" barely attracts.

**Why We Use It**: Makes statistical relationships (PMI scores) visually intuitive. Learners see which word pairs are "tight" without reading numbers.

---

## Design Decisions & Rationale

### Why Nodes-in-Circle Initial Layout?

When initializing the simulation, nodes are placed in a circle rather than randomly scattered:

```typescript
const angle = (2 * Math.PI * i) / nodes.length;
const radius = Math.min(width, height) * 0.3;
```

**Rationale**:
1. **Deterministic**: Same input always produces same starting configuration
2. **Symmetric**: No initial bias toward any direction
3. **Visible**: All nodes start on-screen, none hidden off-canvas
4. **Aesthetic**: The circular burst into clustered layout is visually pleasing

Random initialization sometimes places nodes off-screen or creates ugly initial states.

### Why Repulsion + Attraction + Gravity?

The force model combines three forces:

1. **Repulsion** (Coulomb): Prevents node overlap, spreads out the graph
2. **Attraction** (Springs): Pulls connected nodes together
3. **Center Gravity**: Keeps the entire graph centered on canvas

**Without repulsion**: All connected nodes would collapse into a single point.
**Without attraction**: The graph would explode outward indefinitely.
**Without gravity**: The graph would drift off-screen over time.

The specific constants (repulsionStrength: 5000, springStrength: 0.1, gravityStrength: 0.02) were tuned empirically to produce readable layouts for vocabulary networks of 10-200 nodes.

### Why Interactive Dragging with Physics Resume?

When users drag a node, the physics simulation resumes with increased alpha:

```typescript
alphaRef.current = Math.max(alphaRef.current, 0.3);
```

**Rationale**: Dragging a node should cause related nodes to follow. By "reheating" the simulation, connected nodes respond naturally to the drag. The alternative (freezing physics during drag) makes dragging feel disconnected from the network.

### Why Node Size Encodes Mastery?

```typescript
const masteryBonus = node.masteryStage * 2;
return base + masteryBonus; // 12 + (0-8) = 12-20px
```

**Rationale**: Mastered words deserve visual prominence. They are the anchors of the learner's vocabulary network. New words (stage 0) are small because they are not yet firmly established. This creates a natural visual hierarchy where the learner's strongest knowledge literally stands out.

### Why Canvas Over SVG?

The component uses Canvas 2D context rather than SVG elements. Trade-offs:

**Canvas Advantages**:
- Better performance at high node counts (100+)
- Simpler animation model (just redraw everything each frame)
- No DOM mutation overhead during simulation

**Canvas Disadvantages**:
- Must implement hit testing manually
- No built-in accessibility (aria labels on nodes)
- Harder to style with CSS

For vocabulary networks that may contain hundreds of words, Canvas performance wins.

### Why Include Helper Utilities (collocationsToGraph, morphologyToGraph)?

The module exports utility functions that transform LOGOS data structures into graph format:

```typescript
export function collocationsToGraph(
  centerWord: string,
  collocations: Array<{ word: string; pmi: number; npmi: number }>,
  masteryMap?: Map<string, number>
): { nodes: GraphNode[]; edges: GraphEdge[] }
```

**Rationale**:
1. **Convenience**: Common use cases (show collocations, show morphology) have ready-made transformers
2. **Consistency**: Ensures edge weights are computed uniformly (NPMI normalization)
3. **Separation**: Graph rendering logic stays separate from data transformation logic

---

## Interaction Model

### Mouse Interactions

| Action | Result |
|--------|--------|
| Hover over node | Cursor changes to pointer; node and connected edges highlight |
| Click node | Fires `onNodeClick(nodeId)` - typically selects the word |
| Double-click node | Fires `onNodeDoubleClick(nodeId)` - typically opens word detail |
| Drag node | Pins node to cursor; physics resume; related nodes follow |
| Release drag | Unpins node; physics settle into new equilibrium |
| Move in empty space | Cursor shows grab icon (inviting pan in future) |

### Visual Feedback

| State | Visual Treatment |
|-------|------------------|
| Default node | Filled circle, component/mastery color, white label below |
| Hovered node | Radial glow effect; larger radius; bolder label |
| Selected node | Bright white border (3px); radial glow; bolder label |
| Connected edge (to selected/hovered) | Increased opacity; thicker stroke |
| Default edge | Semi-transparent; width proportional to weight |

---

## Empty State Handling

When `nodes.length === 0`, the component renders a friendly empty state instead of a blank canvas:

```jsx
<GlassCard className="network-graph-empty">
  <span>web emoji</span>
  <p>No lexical relationships to display.</p>
  <p>Start learning words to build your vocabulary network.</p>
</GlassCard>
```

**Rationale**: An empty graph is confusing. The empty state explains *why* there's nothing to show and encourages the user toward the action (learning words) that will populate the graph.

---

## Connection to Theoretical Foundations

### PMI Visualization

The NetworkGraph directly visualizes PMI relationships computed by `src/core/pmi.ts`:

- Edge weight = normalized NPMI score (0-1 range)
- Edge color = blue for collocations
- Edge thickness = linearly proportional to weight
- Spatial distance = inversely related to PMI (high PMI = closer nodes)

When a user sees two words close together connected by a thick line, they are literally seeing high pointwise mutual information, a statistical property of corpus co-occurrence.

### Morphological Networks

The violet edges represent morphological family relationships:

- Root "run" connects to "runner," "running," "ran"
- These edges have fixed weight (0.7) since morphological relations are categorical
- Color distinguishes them from statistical (PMI) relationships

### Mastery Stage Integration

Node size and color directly reflect the FSRS-derived mastery stage:

- Stage computed by `src/core/fsrs.ts` based on review history
- Stored in `ComponentObjectState.masteryState.stage`
- Passed through to graph as `GraphNode.masteryStage`

The visual representation makes abstract spaced repetition statistics tangible.

---

## Performance Considerations

### Animation Frame Budget

At 60fps, each frame has ~16ms. The simulation loop must complete within this budget:

```
simulationStep(): ~1-2ms for 100 nodes (O(n^2) repulsion)
renderGraph(): ~2-5ms for 100 nodes + edges
React reconciliation: ~1ms (minimal, only state update)
```

Total: ~4-8ms, safely under budget for graphs up to ~200 nodes.

### O(n^2) Repulsion Warning

The naive repulsion calculation checks every node pair:

```typescript
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    // compute repulsion
  }
}
```

This is O(n^2), acceptable for vocabulary networks (<500 nodes) but would lag for larger graphs. If LOGOS ever needs 1000+ node graphs, Barnes-Hut approximation (O(n log n)) would be needed.

### Canvas Layer Caching

Currently, the entire graph redraws every frame during simulation. A future optimization could:
1. Draw edges to an off-screen canvas (they move less)
2. Only redraw nodes and their immediate edges
3. Composite the layers for final display

This would help if edge count becomes a bottleneck.

---

## Change History

### 2026-01-04 - Initial Implementation
- **What Changed**: Created NetworkGraph component with pure TypeScript force simulation, Canvas rendering, hit testing, and interactive features (hover, click, drag)
- **Why**: LOGOS needed a way to visualize vocabulary relationships (PMI collocations, morphological families) to help learners understand the structure of their knowledge
- **Impact**: Enables the "network view" of vocabulary learning; makes abstract statistical relationships (PMI) visually intuitive; provides foundation for future graph-based features (learning paths, semantic domain exploration)

### 2026-01-04 - Added Helper Components and Utilities
- **What Changed**: Added NetworkGraphCard wrapper and transformation utilities (collocationsToGraph, morphologyToGraph)
- **Why**: Common use cases needed ready-made solutions; card wrapper provides consistent styling with refresh capability
- **Impact**: Simplifies integration with LOGOS data structures; ensures consistent edge weight computation

---

## Future Enhancements

### Planned
- **Pan/Zoom**: Navigate large graphs with mouse drag (pan) and wheel (zoom)
- **Node Labels on Hover Only**: Reduce clutter by hiding labels until hover
- **Edge Labels**: Show PMI scores or relationship types on edges
- **Cluster Highlighting**: Click a node to highlight its entire connected cluster

### Potential
- **Animated Transitions**: Smooth morphing when nodes/edges change
- **Mini-map**: Overview of large graphs with viewport indicator
- **Export**: Save graph as image (PNG) or data (JSON)
- **Accessibility**: Keyboard navigation, screen reader support for graph structure

---

*This documentation mirrors: `src/renderer/components/analytics/NetworkGraph.tsx`*
*Shadow Map methodology: Narrative explanation of intent, not code description*
