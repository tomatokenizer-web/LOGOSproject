# PMI (Pointwise Mutual Information) 모듈

> **Code**: `src/core/pmi.ts`
> **Tier**: 1 (Core Algorithm)

---

## 핵심 공식

### Pointwise Mutual Information

두 단어 간 공기 강도:

```
PMI(w₁, w₂) = log₂[P(w₁, w₂) / (P(w₁) × P(w₂))]

             = log₂[c₁₂ / expected_cooccurrence]

expected_cooccurrence = (c₁ × c₂) / N

c₁  = w₁의 빈도
c₂  = w₂의 빈도
c₁₂ = 공기 빈도 (윈도우 내)
N   = 총 토큰 수
```

**해석**:
- PMI > 0: 우연보다 많이 공기 (연어)
- PMI = 0: 독립적 출현
- PMI < 0: 우연보다 적게 공기 (회피)

### Normalized PMI

-1 ~ +1 범위로 정규화:

```
NPMI(w₁, w₂) = PMI(w₁, w₂) / (-log₂[P(w₁, w₂)])

             = PMI / (-log₂(c₁₂ / N))
```

**해석**:
- NPMI = +1: 완벽한 공기 (항상 함께)
- NPMI = 0: 독립적
- NPMI = -1: 완벽한 회피 (절대 함께 안함)

### Log-Likelihood Ratio (Dunning)

통계적 유의성 검정:

```
G² = 2 × [H(c₁₂, c₁, p₁) + H(c₂-c₁₂, N-c₁, p₂)
         - H(c₁₂, c₁, p) - H(c₂-c₁₂, N-c₁, p)]

H(k, n, p) = k × log(p) + (n-k) × log(1-p)

p  = c₂ / N
p₁ = c₁₂ / c₁
p₂ = (c₂ - c₁₂) / (N - c₁)
```

**유의성 임계값**:
- G² > 3.84: p < 0.05
- G² > 6.63: p < 0.01
- G² > 10.83: p < 0.001

---

## PMICalculator 클래스

### 구조 (lines 42-50)

```typescript
export class PMICalculator {
  private wordCounts: Map<string, number> = new Map();
  private pairCounts: Map<string, number> = new Map();
  private totalWords: number = 0;
  private windowSize: number;

  constructor(windowSize: number = 5) {
    this.windowSize = windowSize;
  }
}
```

### indexCorpus() (lines 56-74)

```typescript
indexCorpus(tokens: string[]): void {
  this.totalWords = tokens.length;
  this.wordCounts.clear();
  this.pairCounts.clear();

  // 단어 빈도 계산
  for (const token of tokens) {
    const normalized = token.toLowerCase();
    this.wordCounts.set(normalized, (this.wordCounts.get(normalized) || 0) + 1);
  }

  // 윈도우 내 공기 빈도 계산
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < Math.min(i + this.windowSize, tokens.length); j++) {
      const pair = this.pairKey(tokens[i].toLowerCase(), tokens[j].toLowerCase());
      this.pairCounts.set(pair, (this.pairCounts.get(pair) || 0) + 1);
    }
  }
}
```

### computePMI() (lines 83-113)

```typescript
computePMI(word1: string, word2: string): PMIResult | null {
  const w1 = word1.toLowerCase();
  const w2 = word2.toLowerCase();

  const c1 = this.wordCounts.get(w1) || 0;
  const c2 = this.wordCounts.get(w2) || 0;
  const c12 = this.pairCounts.get(this.pairKey(w1, w2)) || 0;

  if (c1 === 0 || c2 === 0 || c12 === 0) return null;

  const N = this.totalWords;
  const expectedCooccurrence = (c1 * c2) / N;

  // PMI
  const pmi = Math.log2(c12 / expectedCooccurrence);

  // Normalized PMI
  const npmi = pmi / (-Math.log2(c12 / N));

  // Log-likelihood ratio
  const llr = this.logLikelihoodRatio(c1, c2, c12, N);

  return {
    word1: w1, word2: w2,
    pmi, npmi,
    cooccurrence: c12,
    significance: llr
  };
}
```

### getCollocations() (lines 119-137)

```typescript
getCollocations(word: string, topK: number = 20): PMIResult[] {
  const results: PMIResult[] = [];
  const w = word.toLowerCase();

  for (const [pair] of this.pairCounts) {
    const [w1, w2] = pair.split('|');
    if (w1 === w || w2 === w) {
      const other = w1 === w ? w2 : w1;
      const pmi = this.computePMI(w, other);
      if (pmi && pmi.significance > 3.84) {  // p < 0.05
        results.push(pmi);
      }
    }
  }

  return results
    .sort((a, b) => b.pmi - a.pmi)
    .slice(0, topK);
}
```

---

## PMI → 난이도 변환

### pmiToDifficulty() (lines 208-237)

```typescript
export function pmiToDifficulty(
  pmi: number,
  npmi: number,
  taskType: TaskType
): number {
  const PMI_MIN = -2;
  const PMI_MAX = 10;

  // 정규화: 1 = 가장 어려움
  const normalizedDifficulty = 1 - (pmi - PMI_MIN) / (PMI_MAX - PMI_MIN);
  const baseDifficulty = Math.max(0, Math.min(1, normalizedDifficulty));

  // IRT logit 척도 [-3, +3]
  const logitDifficulty = (baseDifficulty - 0.5) * 6;

  // 과제 유형 조정
  const modifiers: Record<TaskType, number> = {
    'recognition':  -0.5,  // 인식: 쉬움
    'recall_cued':   0,    // 단서 회상: 기준
    'recall_free':  +0.5,  // 자유 회상: 어려움
    'production':   +1.0,  // 산출: 가장 어려움
    'timed':        +0.3   // 시간제한: 추가
  };

  return logitDifficulty + (modifiers[taskType] || 0);
}
```

**변환 논리**:

| PMI 범위 | 의미 | 난이도 |
|---------|------|--------|
| PMI > 8 | 매우 강한 연어 | 쉬움 (-2.5) |
| PMI 4~8 | 강한 연어 | 중간 (-1~+1) |
| PMI 0~4 | 약한 연어 | 다소 어려움 |
| PMI < 0 | 독립/회피 | 어려움 (+2.5) |

---

## 윈도우 기반 공기

### 슬라이딩 윈도우

```
텍스트: "The patient takes medication daily for hypertension"
윈도우: 5

위치 0 (The):     공기 = [patient, takes, medication, daily]
위치 1 (patient): 공기 = [takes, medication, daily, for]
위치 2 (takes):   공기 = [medication, daily, for, hypertension]
...
```

**윈도우 크기 선택**:
- 5: 일반 연어 (형용사-명사, 동사-부사)
- 2-3: 긴밀한 통사 관계
- 10+: 의미적 연상

---

## 주요 함수

| 함수 | Lines | 복잡도 | 용도 |
|------|-------|--------|------|
| `PMICalculator.indexCorpus` | 56-74 | O(n×w) | 코퍼스 색인 |
| `PMICalculator.computePMI` | 83-113 | O(1) | PMI 계산 |
| `PMICalculator.getCollocations` | 119-137 | O(p) | 상위 연어 추출 |
| `PMICalculator.logLikelihoodRatio` | 170-190 | O(1) | 유의성 검정 |
| `pmiToDifficulty` | 208-237 | O(1) | PMI → 난이도 |
| `frequencyToDifficulty` | 247-266 | O(1) | 빈도 → 난이도 |

---

## 의존 관계

```text
pmi.ts (독립, 외부 의존성 없음)
  │
  ├──> component-vectors.ts
  │      LEXVector.relationalDensity 계산에 사용
  │
  ├──> lexical.ts
  │      단어 연어 네트워크 분석
  │
  ├──> priority.ts
  │      R (관계 밀도) 계산
  │
  └──> 서비스:
       ├── vocabulary-extraction (연어 추출)
       ├── task-generation (연어 과제 생성)
       └── content-generator (연어 기반 예문)
```

---

## 학술적 기반

- Church, K.W. & Hanks, P. (1990). *Word association norms, mutual information, and lexicography*. Computational Linguistics
- Dunning, T. (1993). *Accurate methods for the statistics of surprise and coincidence*. Computational Linguistics
- Evert, S. (2008). *Corpora and collocations*. In A. Lüdeling & M. Kytö (Eds.), Corpus Linguistics: An International Handbook
- Manning, C.D. & Schütze, H. (1999). *Foundations of Statistical Natural Language Processing*. MIT Press
