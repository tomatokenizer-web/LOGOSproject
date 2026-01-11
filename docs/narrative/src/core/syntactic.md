# Syntactic Complexity Analysis Module

> **Code**: `src/core/syntactic.ts`
> **Tier**: 1 (Core Algorithm)

---

## Core Formulas

### Complexity Score

Normalizes syntactic complexity to 0-1 range:

```
S = Σᵢ wᵢ × normalize(metricᵢ / C2_target)

Weights:
  sentenceLength:      0.20
  subordinationIndex:  0.20
  dependencyDepth:     0.15
  clauseCount:         0.15
  passiveRatio:        0.10
  nominalRatio:        0.10
  avgDependencyDist:   0.10
```

### Lu (2010, 2011) Metrics

Research-based syntactic complexity measures:

```
MLC = totalWords / totalClauses          (Mean Length of Clause)
CN/C = complexNominals / totalClauses    (Complex Nominals per Clause)
DC/C = dependentClauses / totalClauses   (Dependent Clauses per Clause)
MLT = totalWords / tUnitCount            (Mean Length of T-unit)
C/T = totalClauses / tUnitCount          (Clauses per T-unit)
CT/T = complexTUnits / tUnitCount        (Complex T-units Ratio)
```

### Subordination Index

Proportion of subordinate clauses:

```
SI = subordinateClauses / (mainClauses + subordinateClauses)

mainClauses = 1 + coordinationCount
```

### Dependency Depth Estimation

Heuristic estimation of dependency structure depth:

```
DD = ceil(log₂(sentenceLength + 1)) + subordinateClauseCount
```

---

## CEFR Complexity Targets

### CEFR_COMPLEXITY_TARGETS (lines 216-307)

| Level | Length | Depth | Clauses | SI | Passive | Nominal | MLC | CN/C | DC/C |
|-------|--------|-------|---------|-----|---------|---------|-----|------|------|
| A1 | 8 | 2 | 1.0 | 0.00 | 0.00 | 0.40 | 6.0 | 0.2 | 0.00 |
| A2 | 12 | 3 | 1.5 | 0.10 | 0.05 | 0.45 | 7.0 | 0.4 | 0.15 |
| B1 | 15 | 4 | 2.0 | 0.20 | 0.10 | 0.50 | 8.0 | 0.6 | 0.25 |
| B2 | 20 | 5 | 2.5 | 0.30 | 0.15 | 0.55 | 9.5 | 0.85 | 0.35 |
| C1 | 25 | 6 | 3.0 | 0.40 | 0.20 | 0.60 | 11.0 | 1.1 | 0.45 |
| C2 | 30 | 7 | 4.0 | 0.50 | 0.25 | 0.65 | 12.5 | 1.4 | 0.55 |

### CEFR Estimation (lines 788-797)

```typescript
function estimateCEFRLevel(metrics: SyntacticComplexity): CEFRLevel {
  const score = metrics.complexityScore;

  if (score <= 0.15) return 'A1';
  if (score <= 0.30) return 'A2';
  if (score <= 0.50) return 'B1';
  if (score <= 0.70) return 'B2';
  if (score <= 0.85) return 'C1';
  return 'C2';
}
```

---

## Clause Structure Analysis

### SUBORDINATORS Database (lines 312-340)

**Relative clauses**:
```typescript
'who', 'whom', 'whose', 'which', 'that'
```

**Temporal clauses**:
```typescript
'when', 'while', 'after', 'before', 'until', 'since', 'as soon as', 'once'
```

**Conditional clauses**:
```typescript
'if', 'unless', 'provided', 'providing', 'supposing'
```

**Causal clauses**:
```typescript
'because', 'as', 'for', 'due to'
```

**Concessive clauses**:
```typescript
'although', 'though', 'even though', 'whereas', 'even if'
```

**Purpose clauses**:
```typescript
'so that', 'in order that', 'so'
```

**Nominal clauses**:
```typescript
'whether', 'how', 'what', 'why', 'where'
```

### analyzeClauseStructure() (lines 508-542)

```typescript
function analyzeClauseStructure(sentence: string): ClauseAnalysis {
  const lowerSentence = sentence.toLowerCase();
  const subordinateTypes: SubordinateClauseType[] = [];
  let subordinateClauses = 0;

  // Count clauses by subordinating conjunction
  for (const [marker, type] of Object.entries(SUBORDINATORS)) {
    const regex = new RegExp(`\\b${marker}\\b`, 'gi');
    const matches = lowerSentence.match(regex);
    if (matches) {
      subordinateClauses += matches.length;
      subordinateTypes.push(...Array(matches.length).fill(type));
    }
  }

  // Count coordinating conjunctions
  let coordinationCount = 0;
  for (const coord of COORDINATORS) {  // 'and', 'but', 'or', 'nor', 'for', 'yet', 'so'
    const regex = new RegExp(`\\b${coord}\\b`, 'gi');
    const matches = lowerSentence.match(regex);
    if (matches) {
      coordinationCount += matches.length;
    }
  }

  // Main clauses = 1 (base) + coordination
  const mainClauses = 1 + coordinationCount;

  return {
    mainClauses,
    subordinateClauses,
    subordinateTypes: [...new Set(subordinateTypes)],
    coordinationCount
  };
}
```

---

## Complex Nominal Detection

### Lu (2010) Definition

Complex nominal = noun phrase with pre/post modification:

1. **Adjective + noun**: `important finding`, `clinical assessment`
2. **Noun + prepositional phrase**: `treatment of infection`
3. **Noun + relative clause**: `patient who presented`
4. **Noun + participle**: `findings based on`
5. **Participle + noun**: `increasing evidence`
6. **Gerund subject**: `Taking medication is...`

### detectComplexNominals() (lines 611-683)

```typescript
function detectComplexNominals(sentence: string): ComplexNominal[] {
  const complexNominals: ComplexNominal[] = [];

  // 1. Adjective + noun pattern
  const adjNounRegex = /\b(important|significant|complex|...)\s+\w+(tion|ment|...)\b/gi;
  while ((match = adjNounRegex.exec(sentence)) !== null) {
    complexNominals.push({
      phrase: match[0],
      modificationType: 'adjective',
      position: match.index
    });
  }

  // 2. Noun + prepositional phrase pattern
  const nounPPRegex = /\b\w+(tion|...)\s+(of|in|for|with|...)\s+(the|a|...)\b/gi;
  // ...

  // 3. Noun + relative clause pattern
  const nounRelRegex = /\b\w+\s+(who|which|that|...)\s+\w+/gi;
  // ...

  // 4. Noun + participle pattern
  // 5. Participle + noun pattern
  // 6. Gerund subject pattern

  // Remove duplicates by position
  return uniqueNominals;
}
```

---

## T-unit Metrics

### T-unit Definition (Hunt, 1965)

T-unit = minimal terminable unit
       = one main clause + attached subordinate clauses

```
"The doctor arrived, and she examined the patient."
→ 2 T-units: "The doctor arrived" + "she examined the patient"

"Although tired, the doctor examined the patient."
→ 1 T-unit (main clause + subordinate clause)
```

### calculateTUnitMetrics() (lines 694-750)

```typescript
function calculateTUnitMetrics(text: string): TUnitMetrics {
  const sentences = splitSentences(text);

  let totalWords = 0;
  let totalTUnits = 0;
  let totalClauses = 0;
  let complexTUnits = 0;
  let totalCoordPhrases = 0;
  let totalVerbPhrases = 0;

  for (const sentence of sentences) {
    const words = tokenize(sentence);
    totalWords += words.length;

    const clauseAnalysis = analyzeClauseStructure(sentence);
    const clauses = clauseAnalysis.mainClauses + clauseAnalysis.subordinateClauses;
    totalClauses += clauses;

    // T-units = number of main clauses
    totalTUnits += clauseAnalysis.mainClauses;

    // Complex T-units = T-units containing subordinate clauses
    if (clauseAnalysis.subordinateClauses > 0) {
      complexTUnits += Math.min(
        clauseAnalysis.mainClauses,
        clauseAnalysis.subordinateClauses
      );
    }

    totalCoordPhrases += clauseAnalysis.coordinationCount;
    totalVerbPhrases += (sentence.match(VERB_PATTERNS) || []).length;
  }

  return {
    tUnitCount: totalTUnits,
    meanLengthOfSentence: totalWords / sentences.length,       // MLS
    meanLengthOfTUnit: totalWords / totalTUnits,               // MLT
    clausesPerTUnit: totalClauses / totalTUnits,               // C/T
    complexTUnitsRatio: complexTUnits / totalTUnits,           // CT/T
    coordinatePhrasesPerTUnit: totalCoordPhrases / totalTUnits,// CP/T
    verbPhrasesPerTUnit: totalVerbPhrases / totalTUnits        // VP/T
  };
}
```

---

## Passive Voice Detection

### countPassiveConstructions() (lines 547-565)

```typescript
function countPassiveConstructions(sentence: string): number {
  let count = 0;

  // Pattern: be-verb + past participle (-ed)
  const passiveAux = ['is', 'are', 'was', 'were', 'been', 'being', 'be'];

  for (const aux of passiveAux) {
    const pattern = new RegExp(`\\b${aux}\\s+\\w+ed\\b`, 'gi');
    const matches = sentence.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }

  // Additional check for "by + agent"
  if (/\bby\s+(the|a|an|\w+)\b/i.test(sentence)) {
    count = Math.max(count, 1);
  }

  return count;
}
```

---

## Complexity Score Calculation

### calculateComplexityScore() (lines 802-834)

```typescript
function calculateComplexityScore(metrics: SyntacticComplexity): number {
  const weights = {
    sentenceLength: 0.20,
    dependencyDepth: 0.15,
    clauseCount: 0.15,
    subordinationIndex: 0.20,
    passiveRatio: 0.10,
    nominalRatio: 0.10,
    averageDependencyDistance: 0.10
  };

  // Normalize against C2 targets
  const c2 = CEFR_COMPLEXITY_TARGETS['C2'];

  const normalized = {
    sentenceLength: min(1, metrics.sentenceLength / c2.sentenceLength),
    dependencyDepth: min(1, metrics.dependencyDepth / c2.dependencyDepth),
    clauseCount: min(1, metrics.clauseCount / c2.clauseCount),
    subordinationIndex: min(1, metrics.subordinationIndex / c2.subordinationIndex),
    passiveRatio: min(1, metrics.passiveRatio / c2.passiveRatio),
    nominalRatio: min(1, metrics.nominalRatio / c2.nominalRatio),
    averageDependencyDistance: min(1, metrics.averageDependencyDistance / c2.averageDependencyDistance)
  };

  // Weighted sum
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += normalized[key] * weight;
  }

  return min(1, max(0, score));
}
```

---

## Part-of-Speech Estimation

### estimatePartOfSpeech() (lines 891-928)

```typescript
function estimatePartOfSpeech(word: string): PartOfSpeech {
  const lower = word.toLowerCase();

  // Lookup closed-class words
  if (DETERMINERS.includes(lower)) return 'determiner';
  if (PRONOUNS.includes(lower)) return 'pronoun';
  if (PREPOSITIONS.includes(lower)) return 'preposition';
  if (CONJUNCTIONS.includes(lower)) return 'conjunction';
  if (AUXILIARIES.includes(lower)) return 'auxiliary';

  // Suffix-based inference
  if (/ly$/.test(lower) && lower.length > 3) return 'adverb';
  if (/(tion|ment|ness|ity|ism|er|or|ist|ance|ence|ship|hood|dom)$/.test(lower)) {
    return 'noun';
  }
  if (/(ful|less|ous|ive|al|ic|able|ible|ary|ory)$/.test(lower)) {
    return 'adjective';
  }
  if (/(ize|ise|ify|ate|en)$/.test(lower)) return 'verb';
  if (/ing$/.test(lower)) return 'verb';
  if (/ed$/.test(lower)) return 'verb';

  return 'unknown';
}
```

### Subcategorization Inference (lines 965-990)

```typescript
function inferSubcategorization(word: string, pos: PartOfSpeech): string[] {
  if (pos !== 'verb') return [];

  const frames: string[] = [];
  const lower = word.toLowerCase();

  // Transitive
  if (TRANSITIVE_VERBS.includes(lower)) frames.push('+transitive');

  // Intransitive
  if (INTRANSITIVE_VERBS.includes(lower)) frames.push('+intransitive');

  // Ditransitive
  if (DITRANSITIVE_VERBS.includes(lower)) frames.push('+ditransitive');

  // Default: transitive
  if (frames.length === 0 && pos === 'verb') {
    frames.push('+transitive');
  }

  return frames;
}
```

---

## Genre Structure Analysis

### GENRE_STRUCTURES (lines 365-401)

| Genre | Domain | Sections | CEFR Range |
|-------|--------|----------|------------|
| SOAP_note | medical | Subjective, Objective, Assessment, Plan | B2-C1 |
| SBAR_handoff | medical | Situation, Background, Assessment, Recommendation | B1-B2 |
| academic_abstract | academic | Background, Methods, Results, Conclusions | C1-C2 |
| business_email | business | Greeting, Purpose, Details, Action, Closing | B1-B2 |
| legal_contract | legal | Parties, Recitals, Terms, Signatures | C1-C2 |

### detectGenre() (lines 1021-1043)

```typescript
function detectGenre(text: string): GenreStructure | null {
  const lower = text.toLowerCase();

  for (const genre of GENRE_STRUCTURES) {
    // Search for section markers
    const sectionMatches = genre.sections.filter(s =>
      lower.includes(s.toLowerCase() + ':') ||
      lower.includes(s.toLowerCase() + ' -')
    ).length;

    // Pattern matching
    const patternMatches = genre.patterns.filter(p =>
      lower.includes(p.toLowerCase().slice(0, 10))
    ).length;

    // Multiple marker matches → identified genre
    if (sectionMatches >= 2 || patternMatches >= 2) {
      return genre;
    }
  }

  return null;
}
```

### analyzeGenreCompliance() (lines 1048-1079)

```typescript
function analyzeGenreCompliance(
  text: string,
  genre: GenreStructure
): { compliance: number; missingSections: string[]; suggestions: string[] } {
  const lower = text.toLowerCase();
  const missingSections: string[] = [];
  const suggestions: string[] = [];

  // Check section presence
  for (const section of genre.sections) {
    if (!lower.includes(section.toLowerCase())) {
      missingSections.push(section);
      suggestions.push(`Add "${section}" section`);
    }
  }

  // Check complexity range
  const analysis = analyzeSyntacticComplexity(text);
  const minLevel = CEFR_COMPLEXITY_TARGETS[genre.targetCEFR.min];
  const maxLevel = CEFR_COMPLEXITY_TARGETS[genre.targetCEFR.max];

  if (analysis.complexityScore < minLevel.complexityScore) {
    suggestions.push(`Increase sentence complexity for ${genre.genre} style`);
  }
  if (analysis.complexityScore > maxLevel.complexityScore) {
    suggestions.push(`Simplify sentences for ${genre.genre} readability`);
  }

  return {
    compliance: 1 - (missingSections.length / genre.sections.length),
    missingSections,
    suggestions
  };
}
```

---

## Key Functions

| Function | Lines | Complexity | Purpose |
|----------|-------|------------|---------|
| `analyzeSyntacticComplexity` | 421-435 | O(n×w) | Full complexity analysis |
| `analyzeSingleSentence` | 440-503 | O(w) | Single sentence analysis |
| `analyzeClauseStructure` | 508-542 | O(s×m) | Clause structure analysis |
| `countPassiveConstructions` | 547-565 | O(a) | Passive voice count |
| `detectComplexNominals` | 611-683 | O(p×n) | Lu CN/C calculation |
| `calculateTUnitMetrics` | 694-750 | O(n×w) | T-unit metrics |
| `calculateLuMetrics` | 758-779 | O(n×w) | Complete Lu metrics |
| `estimateCEFRLevel` | 788-797 | O(1) | CEFR estimation |
| `calculateComplexityScore` | 802-834 | O(1) | Complexity score |
| `toSyntacticVector` | 933-960 | O(w) | Vector generation |
| `detectGenre` | 1021-1043 | O(g×s) | Genre detection |
| `analyzeGenreCompliance` | 1048-1079 | O(s) | Genre compliance |
| `getSimplificationSuggestions` | 853-882 | O(1) | Simplification suggestions |
| `isSuitableForStage` | 1186-1202 | O(w) | Stage suitability |

---

## Dependencies

```
syntactic.ts (independent, no external dependencies)
  │
  ├──> component-vectors.ts
  │      Used for SYNTVector calculation
  │      - complexityScore → SYNTVector.complexityScore
  │      - subordinationIndex → SYNTVector.dependentClausesPerClause
  │      - dependencyDepth → SYNTVector.embeddingDepth
  │
  ├──> bottleneck.ts
  │      SYNT component error pattern analysis
  │
  ├──> priority.ts
  │      Syntactic Cost calculation
  │
  └──> Services:
       ├── task-generation.service (syntactic task generation)
       ├── content-selection (CEFR filtering)
       └── simplification (simplification suggestions)
```

---

## Academic Foundation

- Lu, X. (2010). *Automatic analysis of syntactic complexity in second language writing*. International Journal of Corpus Linguistics
- Lu, X. (2011). *A corpus-based evaluation of syntactic complexity measures as indices of college-level ESL writers' language development*. TESOL Quarterly
- Hunt, K.W. (1965). *Grammatical structures written at three grade levels*. NCTE Research Report
- Ortega, L. (2003). *Syntactic complexity measures and their relationship to L2 proficiency*. Applied Linguistics
- Council of Europe (2001). *Common European Framework of Reference for Languages*. Cambridge University Press
