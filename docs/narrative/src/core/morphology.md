# 형태론 분석 모듈

> **Code**: `src/core/morphology.ts`
> **Tier**: 1 (Core Algorithm)

---

## 핵심 수식

### Morphological Score (M Score)

단어의 형태론적 풍요도:

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

형태론적 복잡도에 따른 난이도:

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

Sánchez-Gutiérrez et al. (2018) 기반:

```
FFS = Σᵢ frequency(member_i)

추정값 (corpus 없을 때):
  estimate = 100 × lengthPenalty × rootBonus × commonBonus × complexityPenalty

lengthPenalty = max(0.1, 1 - (length - 4) × 0.1)
rootBonus = 3 if word === root
complexityPenalty = 0.7^(morphemeCount - 2) if morphemeCount > 2
```

---

## 접사 데이터베이스

### ENGLISH_PREFIXES (lines 123-176)

**부정/반대** (Negation):

| 접두사 | 의미 | 생산성 | 도메인 |
|--------|------|--------|--------|
| un- | not, opposite | 0.9 | general |
| in- | not | 0.7 | general, academic |
| im- | not (before b,m,p) | 0.7 | general |
| dis- | not, opposite | 0.8 | general |
| anti- | against | 0.9 | general, medical |

**시간/순서** (Time):

| 접두사 | 의미 | 생산성 |
|--------|------|--------|
| pre- | before | 0.85 |
| post- | after | 0.8 |
| ex- | former | 0.7 |
| neo- | new | 0.6 |

**정도/크기** (Degree):

| 접두사 | 의미 | 생산성 | 도메인 |
|--------|------|--------|--------|
| hyper- | excessive | 0.7 | medical, technical |
| hypo- | under normal | 0.65 | medical |
| super- | above | 0.8 | general |
| sub- | below | 0.75 | general, medical |

**의료 전용** (Medical):

| 접두사 | 의미 | 생산성 |
|--------|------|--------|
| cardio- | heart | 0.6 |
| neuro- | nerve | 0.6 |
| gastro- | stomach | 0.55 |
| hemo- | blood | 0.5 |

### ENGLISH_SUFFIXES (lines 181-234)

**명사 형성** (Noun-forming):

| 접미사 | 의미 | 생산성 |
|--------|------|--------|
| -tion | action/state | 0.9 |
| -ness | state/quality | 0.9 |
| -ment | action/result | 0.85 |
| -er | agent/doer | 0.95 |
| -ity | state/quality | 0.8 |

**형용사 형성** (Adjective-forming):

| 접미사 | 의미 | 생산성 |
|--------|------|--------|
| -able | capable of | 0.9 |
| -less | without | 0.9 |
| -ful | full of | 0.85 |
| -ive | having quality | 0.8 |
| -al | relating to | 0.85 |

**동사 형성** (Verb-forming):

| 접미사 | 의미 | 생산성 |
|--------|------|--------|
| -ize | to make | 0.9 |
| -ify | to make | 0.8 |
| -ate | to cause | 0.75 |

**의료 전용** (Medical):

| 접미사 | 의미 | 생산성 |
|--------|------|--------|
| -itis | inflammation | 0.7 |
| -osis | condition | 0.65 |
| -ectomy | surgical removal | 0.6 |
| -ology | study of | 0.7 |

---

## 형태소 분절 알고리즘

### segmentWord() (lines 401-486)

```typescript
function segmentWord(word: string, domain?: string): WordSegmentation {
  let remaining = word.toLowerCase();
  const morphemeSegments: MorphemeUnit[] = [];

  // 1. 접두사 추출 (longest-first matching)
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

  // 2. 접미사 추출 (end에서부터)
  // 3. 굴절 접미사 체크
  // 4. 나머지 = 어근
  // 5. 음절 분절

  return { word, morphemeSegments, syllableSegments, ... };
}
```

### 굴절 접미사 탐지 (lines 491-519)

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

## 형태론 분석 알고리즘

### analyzeMorphology() (lines 1031-1124)

다중 패스 접사 추출:

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
    // 유사 로직
  }

  // 철자 변화 정규화 (y→i, 자음 중복 등)
  remaining = normalizeRoot(remaining);

  // 굴절 탐지
  const inflection = detectInflection(original, remaining);

  // 파생 유형 결정
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

### Root 정규화 (lines 1130-1155)

철자 변화 복원:

```typescript
function normalizeRoot(root: string): string {
  // 자음 중복 제거: "runn" → "run"
  if (root[root.length-1] === root[root.length-2]) {
    const keepDoubled = ['ll', 'ss', 'ff', 'zz', 'cc'];
    if (!keepDoubled.includes(root.slice(-2))) {
      return root.slice(0, -1);
    }
  }

  // y→i 변환 복원: "happi" → "happy"
  if (root.endsWith('i') && isConsonant(root.charAt(-2))) {
    return root.slice(0, -1) + 'y';
  }

  return root;
}
```

---

## 형태론적 가족 구축

### buildMorphologicalFamily() (lines 639-725)

```typescript
function buildMorphologicalFamily(
  root: string,
  knownWords?: string[],
  wordFrequencies?: Map<string, number>
): MorphologicalFamily {
  const derivatives: Set<string> = new Set();
  const affixesUsed: Set<string> = new Set();

  // 1. 알려진 어근 데이터베이스 체크
  if (COMMON_ROOTS[root]) {
    COMMON_ROOTS[root].forEach(d => derivatives.add(d));
  }

  // 2. 코퍼스에서 어근 포함 단어 검색
  if (knownWords) {
    for (const word of knownWords) {
      if (word.includes(root) && word !== root) {
        derivatives.add(word);
      }
    }
  }

  // 3. 생산적 접사로 파생어 생성
  for (const prefix of productivePrefixes) {
    derivatives.add(prefix + root);
    affixesUsed.add(prefix);
  }

  for (const suffix of productiveSuffixes) {
    let derivative = root + suffix;
    // 철자 규칙 적용 (e 탈락, y→i 등)
    derivatives.add(derivative);
    affixesUsed.add(suffix);
  }

  // 4. 생산성 계산
  const productivity = min(1, familySize × 0.1 + affixDiversity × 0.05 + 0.3);

  // 5. Family Frequency Sum 계산
  const familyFrequencySum = calculateFamilyFrequencySum(
    root, Array.from(derivatives), wordFrequencies
  );

  return { root, derivatives, familySize, familyFrequencySum, productivity, affixesUsed };
}
```

### COMMON_ROOTS 데이터베이스 (lines 604-620)

라틴/그리스어 기원 생산적 어근:

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
  // ... 15개 어근
};
```

---

## M Score 계산

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

  // 1. Family size 정규화 (log scale, max 50)
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

  // 결합
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

## Transparency 계산

### calculateTransparency() (lines 1283-1304)

의미 예측 가능성:

```typescript
function calculateTransparency(analysis: MorphologicalAnalysis): number {
  // 단순 단어: 완전 투명
  if (analysis.derivationType === 'simple') return 1.0;

  // 파생어 기본값
  let transparency = 0.5;

  // 생산적 접사 → 투명도 증가
  for (const prefix of analysis.prefixes) {
    transparency += prefix.productivity × 0.1;
  }
  for (const suffix of analysis.suffixes) {
    transparency += suffix.productivity × 0.1;
  }

  // 복합 파생 → 투명도 감소
  if (analysis.derivationType === 'complex') {
    transparency -= 0.1;
  }

  return min(1, max(0, transparency));
}
```

**예시**:
- `unhappy`: un- (0.9) + happy → 0.5 + 0.09 = 0.59
- `contraindication`: contra- (0.6) + in- (0.7) + -tion (0.9) → complex → 더 낮음

---

## 전이 효과 측정

### findTransferCandidates() (lines 1347-1384)

학습한 접사를 공유하는 신규 단어 찾기:

```typescript
function findTransferCandidates(
  trainedWords: string[],
  candidateWords: string[],
  domain?: string
) {
  // 학습된 단어에서 접사 추출
  const trainedAffixes = new Set<string>();
  for (const word of trainedWords) {
    const analysis = analyzeMorphology(word, domain);
    analysis.prefixes.forEach(p => trainedAffixes.add(p.form));
    analysis.suffixes.forEach(s => trainedAffixes.add(s.form));
  }

  // 공유 접사 있는 후보 찾기
  return candidateWords
    .map(word => {
      const analysis = analyzeMorphology(word, domain);
      const shared = [...analysis.prefixes, ...analysis.suffixes]
        .map(a => a.form)
        .filter(a => trainedAffixes.has(a));

      if (shared.length === 0) return null;

      // 전이 잠재력 = 공유 접사 수 × 0.3 + (1 - 난이도) × 0.2
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

## 불규칙 변화 데이터베이스

### IRREGULAR_PAST (lines 239-250)

```typescript
const IRREGULAR_PAST = {
  'be': 'was/were', 'have': 'had', 'do': 'did',
  'go': 'went', 'say': 'said', 'make': 'made',
  'take': 'took', 'come': 'came', 'see': 'saw',
  'think': 'thought', 'tell': 'told', 'find': 'found',
  // ... 50개 불규칙 동사
};
```

### IRREGULAR_PLURAL (lines 252-260)

```typescript
const IRREGULAR_PLURAL = {
  'child': 'children', 'man': 'men', 'woman': 'women',
  'tooth': 'teeth', 'foot': 'feet', 'mouse': 'mice',
  // 그리스/라틴어 기원
  'analysis': 'analyses', 'diagnosis': 'diagnoses',
  'phenomenon': 'phenomena', 'criterion': 'criteria',
  'bacterium': 'bacteria', 'curriculum': 'curricula',
  // ... 20개 불규칙 복수
};
```

---

## 핵심 함수

| 함수 | 라인 | 복잡도 | 용도 |
|------|------|--------|------|
| `segmentWord` | 401-486 | O(p+s) | 형태소/음절 분절 |
| `analyzeMorphology` | 1031-1124 | O(p×m+s×m) | 완전 형태 분석 |
| `toMorphologicalVector` | 1254-1278 | O(1) | 벡터 생성 |
| `buildMorphologicalFamily` | 639-725 | O(w) | 형태론적 가족 |
| `computeMorphologicalScore` | 870-916 | O(w) | M 스코어 계산 |
| `calculateFamilyFrequencySum` | 749-772 | O(n) | FFS 계산 |
| `findTransferCandidates` | 1347-1384 | O(t×c) | 전이 후보 |
| `measureTransferEffect` | 1393-1412 | O(n) | 전이 효과 측정 |
| `extractLemma` | 1449-1487 | O(1) | 기본형 추출 |
| `buildWordIndexes` | 924-967 | O(w) | 검색 인덱스 |

---

## 의존 관계

```
morphology.ts (독립적, 외부 의존성 없음)
  │
  ├──> component-vectors.ts
  │      MORPHVector 계산에 활용
  │      - productivity → MORPHVector.productivity
  │      - transparency → MORPHVector.transparency
  │      - familySize → MORPHVector.familySize
  │
  ├──> bottleneck.ts
  │      MORPH 컴포넌트 오류 패턴 분석
  │
  ├──> priority.ts
  │      Morphological Cost 계산
  │
  └──> Services:
       ├── task-generation.service (형태 분석 과제)
       ├── vocabulary-extraction (형태 정보 추출)
       └── transfer-analysis (전이 효과 추적)
```

---

## 학술적 기반

- Sánchez-Gutiérrez, C.H. et al. (2018). *MorphoLex: A derivational morphological database for 70,000 English words*. Behavior Research Methods
- Baayen, R.H. & Schreuder, R. (1999). *War and peace: Morphemes and full forms in a noninteractive activation parallel dual-route model*. Brain and Language
- Bybee, J. (1995). *Regular morphology and the lexicon*. Language and Cognitive Processes
- Nation, I.S.P. (2001). *Learning Vocabulary in Another Language*. Cambridge University Press
