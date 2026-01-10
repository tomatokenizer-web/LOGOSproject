# Grapheme-to-Phoneme (G2P) 분석 모듈

> **Code**: `src/core/g2p.ts`
> **Tier**: 1 (Core Algorithm)

---

## 핵심 수식

### G2P Entropy

단어의 발음 불확실성을 정량화:

```
H(w) = -Σᵢ P(phoneme|grapheme,context) × log₂(P)

정규화: H_norm = min(1, H(w) / 2)
```

**해석**:
- H = 0: 완벽히 예측 가능 (cat, stop)
- H ≈ 0.5: 중간 불확실성 (read, lead)
- H ≈ 1: 높은 불확실성 (through, cough)

### Phonological Difficulty Score (P Score)

```
P(w) = α × H(w) + β × D(w) + γ × S(w)

α = 0.4  (entropy weight)
β = 0.4  (pattern difficulty weight)
γ = 0.2  (syllable complexity weight)

S(w) = min(1, (syllableCount - 1) / 5)
```

---

## 계층적 G2P 모델

Ehri (2005), Treiman (1993), Ziegler & Goswami (2005) 기반:

```
┌─────────────────────────────────────────┐
│            Word Layer                    │
│  (전체 단어 표상, 형태음소 패턴)          │
├─────────────────────────────────────────┤
│           Syllable Layer                 │
│   onset-rime 구조, 6가지 음절 유형        │
├─────────────────────────────────────────┤
│          Alphabetic Layer                │
│    개별 grapheme-phoneme 대응 규칙       │
└─────────────────────────────────────────┘
```

### 음절 유형 (SyllableType)

| 유형 | 패턴 | 예시 | 모음 발음 |
|------|------|------|-----------|
| closed | CVC | cat, stop | 단모음 |
| open | CV | go, me | 장모음 |
| silent-e | CVCe | make, time | 장모음 |
| vowel-team | CVVC | rain, feet | 팀 규칙 |
| r-controlled | CVr | car, bird | r-색채 |
| consonant-le | Cle | table, apple | /əl/ |

---

## G2P 규칙 데이터베이스

### 규칙 구조 (lines 25-43)

```typescript
interface G2PRule {
  pattern: RegExp;        // grapheme 패턴
  phoneme: string;        // IPA 음소
  context: G2PContext;    // 'initial' | 'medial' | 'final' | 'any'
  exceptions: string[];   // 예외 단어 목록
  reliability: number;    // 신뢰도 (0-1)
  domains?: string[];     // 도메인 (medical 등)
}
```

### 주요 규칙 신뢰도

| 패턴 | 음소 | 신뢰도 | 예외 수 |
|------|------|--------|---------|
| ee | /iː/ | 0.95 | 0 |
| ph | /f/ | 0.99 | 0 |
| ^kn | /n/ | 0.99 | 0 |
| ea | /iː/ | 0.70 | 16 (bread, head...) |
| ou | /aʊ/ | 0.50 | 15 (you, soul, cough...) |
| oo | /uː/ | 0.75 | 12 (book, blood...) |
| ch | /tʃ/ | 0.75 | 16 (school, chef...) |

### 의료 도메인 규칙 (lines 519-552)

```typescript
// 그리스어 기원 접두사
{ pattern: /^psych/, phoneme: '/saɪk/', reliability: 0.99 }  // psychology
{ pattern: /^pneu/,  phoneme: '/njuː/', reliability: 0.99 }  // pneumonia
{ pattern: /^rhe/,   phoneme: '/riː/',  reliability: 0.95 }  // rheumatoid
{ pattern: /rrh/,    phoneme: '/r/',    reliability: 0.99 }  // hemorrhage
```

---

## L1 간섭 패턴

### 지원 언어별 간섭 (lines 558-619)

**Spanish**:
```
sp- → /esp-/  (Spanish adds /e/ before s+consonant)
v   → /b/     (Spanish v/b merge)
th  → /t, d/  (lacks dental fricatives)
```

**Japanese**:
```
r ↔ l        (merger - bidirectional confusion)
v   → /b/    (lacks /v/)
f   → /h/    (Japanese f is bilabial)
consonant clusters → vowel insertion
```

**Mandarin**:
```
th  → /s, z/  (lacks dental fricatives)
v   → /w/     (lacks /v/)
final consonants → deletion
```

**Korean**:
```
f   → /p/     (lacks /f/)
r ↔ l        (allophonic variation)
final consonants → unreleased
```

---

## Grapheme 분절 알고리즘

### segmentGraphemes() (lines 726-794)

```typescript
// 분절 우선순위: trigraph > digraph > silent > single
while (i < word.length) {
  // 1. Trigraph 체크 (igh, tch, dge...)
  if (ENGLISH_TRIGRAPHS.includes(word.slice(i, i+3))) {
    // trigraph unit 추가
    i += 3;
    continue;
  }

  // 2. Digraph 체크 (sh, ch, th, ee, ai...)
  if (ENGLISH_DIGRAPHS.includes(word.slice(i, i+2))) {
    // digraph unit 추가
    i += 2;
    continue;
  }

  // 3. Silent letter 체크
  if (isSilentLetter(word, i)) {
    // silent unit 추가 (phoneme = '')
    i++;
    continue;
  }

  // 4. Single grapheme
  // single unit 추가
  i++;
}
```

### Digraph/Trigraph 목록

**Digraphs** (29개):
```
자음: ch, sh, th, wh, ph, gh, ck, ng, qu
모음: ee, ea, oo, ai, ay, oa, ou, ow, oi, oy, au, aw
R-통제: ar, er, ir, or, ur
기타: ey, ie, ei, ue, ew
```

**Trigraphs** (10개):
```
igh, tch, dge, air, ear, ure, ore, are, eer, oor
```

---

## Entropy 계산 알고리즘

### computeG2PEntropy() (lines 1033-1062)

```typescript
function computeG2PEntropy(word: string): number {
  const graphemes = segmentGraphemes(word);
  let totalEntropy = 0;

  for (const unit of graphemes) {
    const possiblePhonemes = getPossiblePhonemes(unit.grapheme);
    const n = possiblePhonemes.length;

    if (n <= 1) continue;  // 모호성 없음

    const reliability = getGraphemeReliability(unit.grapheme);

    // H = log₂(n) × (1 - reliability)
    // 가능성이 많고 신뢰도가 낮을수록 entropy 증가
    totalEntropy += Math.log2(n) * (1 - reliability);
  }

  // 정규화: grapheme당 평균, 0-1 범위
  return Math.min(1, (totalEntropy / graphemes.length) / 2);
}
```

### 모호한 Grapheme 음소 (lines 1067-1091)

```typescript
const ambiguousGraphemes = {
  'a':  ['/æ/', '/eɪ/', '/ɑː/', '/ə/'],      // 4개
  'ou': ['/aʊ/', '/uː/', '/ʌ/', '/oʊ/', '/ə/'], // 5개
  'ea': ['/iː/', '/ɛ/', '/eɪ/'],              // 3개
  'ch': ['/tʃ/', '/k/', '/ʃ/'],               // 3개
  'gh': ['', '/f/', '/g/'],                   // 3개 (silent 포함)
  //...
};
```

---

## 난이도 분석 알고리즘

### analyzeG2PDifficulty() (lines 1163-1248)

```typescript
function analyzeG2PDifficulty(word: string): G2PDifficulty {
  let difficultyScore = 0;
  const irregularPatterns: IrregularPattern[] = [];

  // 1. 예외 단어 체크 (+0.2)
  for (const rule of ENGLISH_G2P_RULES) {
    if (rule.exceptions.includes(word)) {
      difficultyScore += 0.2;
      irregularPatterns.push({...});
    }
  }

  // 2. Silent letters (+0.15)
  if (checkSilentLetters(word)) {
    difficultyScore += 0.15;
  }

  // 3. 모음 조합 (각 +0.1)
  const vowelDigraphs = word.match(/[aeiou]{2,}/g) || [];
  difficultyScore += vowelDigraphs.length * 0.1;

  // 4. 자음 군집 3개 이상 (각 +0.15)
  const clusters = word.match(/[bcdfghjklmnpqrstvwxyz]{3,}/gi) || [];
  difficultyScore += clusters.length * 0.15;

  // 5. 음절 수 (3개 초과시 개당 +0.05)
  const syllables = countSyllables(word);
  if (syllables > 3) {
    difficultyScore += (syllables - 3) * 0.05;
  }

  // 6. 비정규 강세 (+0.1)
  if (checkIrregularStress(word)) {
    difficultyScore += 0.1;
  }

  return {
    word,
    irregularPatterns,
    difficultyScore: Math.min(1, difficultyScore),
    syllableCount: syllables,
    hasSilentLetters: ...,
    hasIrregularStress: ...,
    potentialMispronunciations: []
  };
}
```

---

## 음절 수 계산

### countSyllables() (lines 1277-1308)

```typescript
function countSyllables(word: string): number {
  // 1. 모음 그룹 수 계산
  let count = (word.match(/[aeiouy]+/g) || []).length;

  // 2. Silent-e 보정 (-1)
  if (word.endsWith('e') && !'aeiou'.includes(word.charAt(-2))) {
    count = Math.max(1, count - 1);
  }

  // 3. Syllabic -le 보정 (+1)
  if (word.endsWith('le') && !'aeiou'.includes(word.charAt(-3))) {
    count++;  // table, apple
  }

  // 4. Syllabic -ed 보정 (+1)
  if (word.endsWith('ed') && 'dt'.includes(word.charAt(-3))) {
    count++;  // wanted, needed
  }

  return Math.max(1, count);
}
```

**정확도**: 일반 영어 어휘 ~85%. 방언 차이 (fire: 1 vs 2음절)는 단순 버전 사용.

---

## 계층적 프로필 시스템

### G2PHierarchicalProfile (lines 1758-1794)

```typescript
interface G2PHierarchicalProfile {
  alphabetic: {
    units: Map<string, AlphabeticUnit>;  // 학습된 grapheme-phoneme 매핑
    mastery: number;                      // 전체 mastery (0-1)
    difficulties: string[];               // 문제 패턴
  };

  syllable: {
    units: Map<string, SyllableUnit>;    // 학습된 음절 패턴
    mastery: number;
    difficulties: string[];
  };

  word: {
    units: Map<string, WordUnit>;        // 전체 단어 표상
    mastery: number;
    sightWordCount: number;              // 시각 단어 수
  };

  l1: string;  // 모국어
  l2: string;  // 목표어
}
```

### assessHierarchicalReadiness() (lines 2109-2176)

학습자가 특정 단어를 배울 준비가 되었는지 계층별 평가:

```typescript
function assessHierarchicalReadiness(profile, word) {
  const hierarchy = parseWordHierarchy(word);

  // Alphabetic layer: 모든 grapheme 알고 있는가?
  let knownGraphemes = 0;
  for (const unit of hierarchy.alphabetic) {
    if (profile.alphabetic.units.get(unit.grapheme)?.acquisitionStage >= 2) {
      knownGraphemes++;
    }
  }
  const alphabeticReadiness = knownGraphemes / hierarchy.alphabetic.length;

  // Syllable layer: 모든 음절 패턴 알고 있는가?
  // ... (유사한 로직)

  // 추천 수준 결정
  if (alphabeticReadiness < 0.7) {
    return { recommendedLevel: 'alphabetic', prerequisites: [...] };
  } else if (syllableReadiness < 0.7) {
    return { recommendedLevel: 'syllable', prerequisites: [...] };
  } else {
    return { recommendedLevel: 'word' };
  }
}
```

---

## Transfer Effect 측정

### findG2PTransferCandidates() (lines 1549-1580)

학습한 패턴과 공유하는 단어 찾기:

```typescript
function findG2PTransferCandidates(trainedWords, candidateWords) {
  // 학습된 단어에서 패턴 추출
  const trainedPatterns = new Set<string>();
  for (const word of trainedWords) {
    const vector = toOrthographicVector(word);
    vector.spellingPatterns.forEach(p => trainedPatterns.add(p));
  }

  // 후보 단어에서 공유 패턴 찾기
  return candidateWords
    .map(word => {
      const shared = getSpellingPatterns(word)
        .filter(p => trainedPatterns.has(p));

      if (shared.length === 0) return null;

      // 전이 잠재력 = 공유 패턴 수 × 0.25 + (1 - 난이도) × 0.3
      const potential = shared.length * 0.25 +
                       (1 - analyzeG2PDifficulty(word).difficultyScore) * 0.3;

      return { word, sharedPatterns: shared, transferPotential: potential };
    })
    .filter(Boolean)
    .sort((a, b) => b.transferPotential - a.transferPotential);
}
```

---

## 핵심 함수

| 함수 | 라인 | 복잡도 | 용도 |
|------|------|--------|------|
| `segmentGraphemes` | 726-794 | O(n) | Grapheme 분절 |
| `computeG2PEntropy` | 1033-1062 | O(n) | 발음 불확실성 |
| `computePhonologicalDifficulty` | 1121-1139 | O(n) | P 스코어 계산 |
| `analyzeG2PDifficulty` | 1163-1248 | O(n×r) | 난이도 분석 |
| `analyzeG2PWithL1` | 1389-1402 | O(n×p) | L1 간섭 포함 분석 |
| `countSyllables` | 1277-1308 | O(n) | 음절 수 |
| `parseWordHierarchy` | 1802-1840 | O(n) | 계층적 분해 |
| `assessHierarchicalReadiness` | 2109-2176 | O(n) | 학습 준비도 |
| `findG2PTransferCandidates` | 1549-1580 | O(m×n) | 전이 후보 |

---

## 의존 관계

```
g2p.ts (독립적, 외부 의존성 없음)
  │
  ├──> component-vectors.ts
  │      PHONVector 계산에 활용
  │
  ├──> g2p-irt.ts
  │      G2P 규칙에 IRT 적용
  │
  ├──> priority.ts
  │      Phonological Cost 계산
  │
  └──> Services:
       ├── task-generation.service (발음 과제 생성)
       ├── scoring-update.service (G2P mastery 추적)
       └── pronunciation-training (L1 맞춤 피드백)
```

---

## 학술적 기반

- Ehri, L.C. (2005). *Learning to read words: Theory, findings, and issues*. Scientific Studies of Reading
- Treiman, R. (1993). *Beginning to Spell*. Oxford University Press
- Ziegler, J.C. & Goswami, U. (2005). *Reading acquisition, developmental dyslexia, and skilled reading across languages*. Psychological Bulletin
- Kessler, B. & Treiman, R. (2001). *Relationships between sounds and letters in English monosyllables*. Journal of Memory and Language
