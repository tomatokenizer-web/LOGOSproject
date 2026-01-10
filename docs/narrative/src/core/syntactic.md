# 통사 복잡도 분석 모듈

> **Code**: `src/core/syntactic.ts`
> **Tier**: 1 (Core Algorithm)

---

## 핵심 수식

### Complexity Score

통사 복잡도를 0-1 범위로 정규화:

```
S = Σᵢ wᵢ × normalize(metricᵢ / C2_target)

가중치:
  sentenceLength:      0.20
  subordinationIndex:  0.20
  dependencyDepth:     0.15
  clauseCount:         0.15
  passiveRatio:        0.10
  nominalRatio:        0.10
  avgDependencyDist:   0.10
```

### Lu (2010, 2011) 메트릭

학술 연구 기반 통사 복잡도 지표:

```
MLC = totalWords / totalClauses          (Mean Length of Clause)
CN/C = complexNominals / totalClauses    (Complex Nominals per Clause)
DC/C = dependentClauses / totalClauses   (Dependent Clauses per Clause)
MLT = totalWords / tUnitCount            (Mean Length of T-unit)
C/T = totalClauses / tUnitCount          (Clauses per T-unit)
CT/T = complexTUnits / tUnitCount        (Complex T-units Ratio)
```

### Subordination Index

종속절 비율:

```
SI = subordinateClauses / (mainClauses + subordinateClauses)

mainClauses = 1 + coordinationCount
```

### Dependency Depth Estimation

의존 구조 깊이 추정 (휴리스틱):

```
DD = ceil(log₂(sentenceLength + 1)) + subordinateClauseCount
```

---

## CEFR 복잡도 목표값

### CEFR_COMPLEXITY_TARGETS (lines 216-307)

| Level | Length | Depth | Clauses | SI | Passive | Nominal | MLC | CN/C | DC/C |
|-------|--------|-------|---------|-----|---------|---------|-----|------|------|
| A1 | 8 | 2 | 1.0 | 0.00 | 0.00 | 0.40 | 6.0 | 0.2 | 0.00 |
| A2 | 12 | 3 | 1.5 | 0.10 | 0.05 | 0.45 | 7.0 | 0.4 | 0.15 |
| B1 | 15 | 4 | 2.0 | 0.20 | 0.10 | 0.50 | 8.0 | 0.6 | 0.25 |
| B2 | 20 | 5 | 2.5 | 0.30 | 0.15 | 0.55 | 9.5 | 0.85 | 0.35 |
| C1 | 25 | 6 | 3.0 | 0.40 | 0.20 | 0.60 | 11.0 | 1.1 | 0.45 |
| C2 | 30 | 7 | 4.0 | 0.50 | 0.25 | 0.65 | 12.5 | 1.4 | 0.55 |

### CEFR 추정 (lines 788-797)

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

## 절 구조 분석

### SUBORDINATORS 데이터베이스 (lines 312-340)

**관계절** (Relative):
```typescript
'who', 'whom', 'whose', 'which', 'that'
```

**시간절** (Temporal):
```typescript
'when', 'while', 'after', 'before', 'until', 'since', 'as soon as', 'once'
```

**조건절** (Conditional):
```typescript
'if', 'unless', 'provided', 'providing', 'supposing'
```

**인과절** (Causal):
```typescript
'because', 'as', 'for', 'due to'
```

**양보절** (Concessive):
```typescript
'although', 'though', 'even though', 'whereas', 'even if'
```

**목적절** (Purpose):
```typescript
'so that', 'in order that', 'so'
```

**명사절** (Nominal):
```typescript
'whether', 'how', 'what', 'why', 'where'
```

### analyzeClauseStructure() (lines 508-542)

```typescript
function analyzeClauseStructure(sentence: string): ClauseAnalysis {
  const lowerSentence = sentence.toLowerCase();
  const subordinateTypes: SubordinateClauseType[] = [];
  let subordinateClauses = 0;

  // 종속 접속사별 절 카운트
  for (const [marker, type] of Object.entries(SUBORDINATORS)) {
    const regex = new RegExp(`\\b${marker}\\b`, 'gi');
    const matches = lowerSentence.match(regex);
    if (matches) {
      subordinateClauses += matches.length;
      subordinateTypes.push(...Array(matches.length).fill(type));
    }
  }

  // 등위 접속사 카운트
  let coordinationCount = 0;
  for (const coord of COORDINATORS) {  // 'and', 'but', 'or', 'nor', 'for', 'yet', 'so'
    const regex = new RegExp(`\\b${coord}\\b`, 'gi');
    const matches = lowerSentence.match(regex);
    if (matches) {
      coordinationCount += matches.length;
    }
  }

  // 주절 = 1 (기본) + 등위 접속
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

## Complex Nominal 탐지

### Lu (2010) 정의

Complex nominal = 전치/후치 수식을 받는 명사구:

1. **형용사 + 명사**: `important finding`, `clinical assessment`
2. **명사 + 전치사구**: `treatment of infection`
3. **명사 + 관계절**: `patient who presented`
4. **명사 + 분사**: `findings based on`
5. **분사 + 명사**: `increasing evidence`
6. **동명사 주어**: `Taking medication is...`

### detectComplexNominals() (lines 611-683)

```typescript
function detectComplexNominals(sentence: string): ComplexNominal[] {
  const complexNominals: ComplexNominal[] = [];

  // 1. 형용사 + 명사 패턴
  const adjNounRegex = /\b(important|significant|complex|...)\s+\w+(tion|ment|...)\b/gi;
  while ((match = adjNounRegex.exec(sentence)) !== null) {
    complexNominals.push({
      phrase: match[0],
      modificationType: 'adjective',
      position: match.index
    });
  }

  // 2. 명사 + 전치사구 패턴
  const nounPPRegex = /\b\w+(tion|...)\s+(of|in|for|with|...)\s+(the|a|...)\b/gi;
  // ...

  // 3. 명사 + 관계절 패턴
  const nounRelRegex = /\b\w+\s+(who|which|that|...)\s+\w+/gi;
  // ...

  // 4. 명사 + 분사 패턴
  // 5. 분사 + 명사 패턴
  // 6. 동명사 주어 패턴

  // 위치 기반 중복 제거
  return uniqueNominals;
}
```

---

## T-unit 메트릭

### T-unit 정의 (Hunt, 1965)

T-unit = minimal terminable unit
       = 하나의 주절 + 부속 종속절

```
"The doctor arrived, and she examined the patient."
→ 2 T-units: "The doctor arrived" + "she examined the patient"

"Although tired, the doctor examined the patient."
→ 1 T-unit (주절 + 종속절)
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

    // T-units = 주절 수
    totalTUnits += clauseAnalysis.mainClauses;

    // Complex T-units = 종속절 포함 T-unit
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

## 수동태 탐지

### countPassiveConstructions() (lines 547-565)

```typescript
function countPassiveConstructions(sentence: string): number {
  let count = 0;

  // 패턴: be동사 + 과거분사 (-ed)
  const passiveAux = ['is', 'are', 'was', 'were', 'been', 'being', 'be'];

  for (const aux of passiveAux) {
    const pattern = new RegExp(`\\b${aux}\\s+\\w+ed\\b`, 'gi');
    const matches = sentence.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }

  // "by + agent" 추가 확인
  if (/\bby\s+(the|a|an|\w+)\b/i.test(sentence)) {
    count = Math.max(count, 1);
  }

  return count;
}
```

---

## 복잡도 점수 계산

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

  // C2 목표값 대비 정규화
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

  // 가중 합
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += normalized[key] * weight;
  }

  return min(1, max(0, score));
}
```

---

## 품사 추정

### estimatePartOfSpeech() (lines 891-928)

```typescript
function estimatePartOfSpeech(word: string): PartOfSpeech {
  const lower = word.toLowerCase();

  // 폐쇄 클래스 단어 조회
  if (DETERMINERS.includes(lower)) return 'determiner';
  if (PRONOUNS.includes(lower)) return 'pronoun';
  if (PREPOSITIONS.includes(lower)) return 'preposition';
  if (CONJUNCTIONS.includes(lower)) return 'conjunction';
  if (AUXILIARIES.includes(lower)) return 'auxiliary';

  // 접미사 기반 추론
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

### Subcategorization 추론 (lines 965-990)

```typescript
function inferSubcategorization(word: string, pos: PartOfSpeech): string[] {
  if (pos !== 'verb') return [];

  const frames: string[] = [];
  const lower = word.toLowerCase();

  // 타동사
  if (TRANSITIVE_VERBS.includes(lower)) frames.push('+transitive');

  // 자동사
  if (INTRANSITIVE_VERBS.includes(lower)) frames.push('+intransitive');

  // 이중타동사
  if (DITRANSITIVE_VERBS.includes(lower)) frames.push('+ditransitive');

  // 기본값: 타동사
  if (frames.length === 0 && pos === 'verb') {
    frames.push('+transitive');
  }

  return frames;
}
```

---

## 장르 구조 분석

### GENRE_STRUCTURES (lines 365-401)

| 장르 | 도메인 | 섹션 | CEFR 범위 |
|------|--------|------|-----------|
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
    // 섹션 마커 검색
    const sectionMatches = genre.sections.filter(s =>
      lower.includes(s.toLowerCase() + ':') ||
      lower.includes(s.toLowerCase() + ' -')
    ).length;

    // 패턴 매칭
    const patternMatches = genre.patterns.filter(p =>
      lower.includes(p.toLowerCase().slice(0, 10))
    ).length;

    // 복수 마커 일치 → 해당 장르
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

  // 섹션 존재 확인
  for (const section of genre.sections) {
    if (!lower.includes(section.toLowerCase())) {
      missingSections.push(section);
      suggestions.push(`Add "${section}" section`);
    }
  }

  // 복잡도 범위 확인
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

## 핵심 함수

| 함수 | 라인 | 복잡도 | 용도 |
|------|------|--------|------|
| `analyzeSyntacticComplexity` | 421-435 | O(n×w) | 전체 복잡도 분석 |
| `analyzeSingleSentence` | 440-503 | O(w) | 단일 문장 분석 |
| `analyzeClauseStructure` | 508-542 | O(s×m) | 절 구조 분석 |
| `countPassiveConstructions` | 547-565 | O(a) | 수동태 카운트 |
| `detectComplexNominals` | 611-683 | O(p×n) | Lu CN/C 계산 |
| `calculateTUnitMetrics` | 694-750 | O(n×w) | T-unit 메트릭 |
| `calculateLuMetrics` | 758-779 | O(n×w) | Lu 전체 메트릭 |
| `estimateCEFRLevel` | 788-797 | O(1) | CEFR 추정 |
| `calculateComplexityScore` | 802-834 | O(1) | 복잡도 점수 |
| `toSyntacticVector` | 933-960 | O(w) | 벡터 생성 |
| `detectGenre` | 1021-1043 | O(g×s) | 장르 탐지 |
| `analyzeGenreCompliance` | 1048-1079 | O(s) | 장르 준수도 |
| `getSimplificationSuggestions` | 853-882 | O(1) | 단순화 제안 |
| `isSuitableForStage` | 1186-1202 | O(w) | 단계 적합성 |

---

## 의존 관계

```
syntactic.ts (독립적, 외부 의존성 없음)
  │
  ├──> component-vectors.ts
  │      SYNTVector 계산에 활용
  │      - complexityScore → SYNTVector.complexityScore
  │      - subordinationIndex → SYNTVector.dependentClausesPerClause
  │      - dependencyDepth → SYNTVector.embeddingDepth
  │
  ├──> bottleneck.ts
  │      SYNT 컴포넌트 오류 패턴 분석
  │
  ├──> priority.ts
  │      Syntactic Cost 계산
  │
  └──> Services:
       ├── task-generation.service (통사 과제 생성)
       ├── content-selection (CEFR 필터링)
       └── simplification (단순화 제안)
```

---

## 학술적 기반

- Lu, X. (2010). *Automatic analysis of syntactic complexity in second language writing*. International Journal of Corpus Linguistics
- Lu, X. (2011). *A corpus-based evaluation of syntactic complexity measures as indices of college-level ESL writers' language development*. TESOL Quarterly
- Hunt, K.W. (1965). *Grammatical structures written at three grade levels*. NCTE Research Report
- Ortega, L. (2003). *Syntactic complexity measures and their relationship to L2 proficiency*. Applied Linguistics
- Council of Europe (2001). *Common European Framework of Reference for Languages*. Cambridge University Press
