# Item Response Theory (IRT) Module

> **Code**: `src/core/irt.ts`
> **Tier**: 1 (Core Algorithm)

---

## 핵심 수식

### Item Characteristic Curve (ICC)

```
        1PL:  P(θ) = 1 / (1 + e^-(θ-b))

        2PL:  P(θ) = 1 / (1 + e^(-a(θ-b)))

        3PL:  P(θ) = c + (1-c) / (1 + e^(-a(θ-b)))
```

| 파라미터 | 의미 | 범위 | LOGOS 용도 |
|----------|------|------|-----------|
| **θ** (theta) | 학습자 능력 | -3 ~ +3 | 전역 능력 추정 |
| **b** | 항목 난이도 | -4 ~ +4 | θ=b일 때 P=0.5 |
| **a** | 변별도 (기울기) | 0.2 ~ 3.0 | 높으면 날카로운 구분 |
| **c** | 추측 확률 | 0 ~ 0.35 | MCQ 4지선다: c=0.25 |

---

## 능력 추정: Newton-Raphson MLE

### 수학적 유도

**목표**: 관측된 응답 패턴 u = (u₁, u₂, ..., uₙ)의 우도(likelihood)를 최대화하는 θ 찾기

**로그 우도 함수**:
```
L(θ) = Σᵢ [uᵢ log P(θ) + (1-uᵢ) log(1-P(θ))]
```

**1차 미분 (Score Function)**:
```
L'(θ) = Σᵢ aᵢ(uᵢ - Pᵢ)
```

**2차 미분 (Fisher Information의 음수)**:
```
L''(θ) = -Σᵢ aᵢ² Pᵢ Qᵢ    (단, Q = 1-P)
```

**Newton-Raphson Update**:
```
θ_{n+1} = θₙ - L'(θₙ) / L''(θₙ)
        = θₙ + Σᵢ aᵢ(uᵢ - Pᵢ) / Σᵢ aᵢ² Pᵢ Qᵢ
```

### 코드 구현 (lines 133-177)

```typescript
for (let iter = 0; iter < MAX_ITER; iter++) {
  let L1 = 0;  // 1차 미분
  let L2 = 0;  // 2차 미분

  for (let i = 0; i < responses.length; i++) {
    const { a, b } = items[i];
    const p = probability2PL(theta, a, b);
    const q = 1 - p;
    const u = responses[i] ? 1 : 0;

    L1 += a * (u - p);        // Score function
    L2 -= a * a * p * q;      // -Fisher Information
  }

  if (L2 === 0) break;        // 0으로 나누기 방지

  const delta = L1 / L2;
  theta -= delta;

  if (Math.abs(delta) < TOLERANCE) break;  // 수렴
}
```

### MLE의 한계와 해결책

| 상황 | MLE 문제 | 해결책 |
|------|----------|--------|
| 전부 정답 | θ → +∞ | EAP 사용 |
| 전부 오답 | θ → -∞ | EAP 사용 |
| 응답 < 5개 | SE가 매우 큼 | Prior로 shrinkage |

---

## 능력 추정: Expected A Posteriori (EAP)

### 베이지안 접근

**사전 분포**: θ ~ N(μ₀, σ₀²), 보통 N(0, 1)

**사후 분포**:
```
P(θ|u) ∝ P(u|θ) × P(θ)
       = [Πᵢ Pᵢ^uᵢ (1-Pᵢ)^(1-uᵢ)] × φ(θ; μ₀, σ₀)
```

**EAP 추정치**: 사후 분포의 기댓값
```
θ̂_EAP = ∫ θ × P(θ|u) dθ / ∫ P(θ|u) dθ
```

### Gaussian Quadrature 근사 (lines 293-343)

연속 적분을 이산 합으로 근사:

```typescript
// 41개 적분점 (priorMean ± 2σ 범위)
for (let i = 0; i < quadPoints; i++) {
  const x = priorMean + priorSD * 4 * (i / (quadPoints - 1) - 0.5);
  points.push(x);
  weights.push(Math.exp(-0.5 * ((x - priorMean) / priorSD) ** 2));
}

// 각 점에서 우도 계산
const likelihoods = points.map((theta, idx) => {
  const likelihood = responses.reduce((prod, correct, i) => {
    const p = probability2PL(theta, items[i].a, items[i].b);
    return prod * (correct ? p : 1 - p);
  }, 1);
  return likelihood * weights[idx];
});

// EAP = 가중 평균
const eap = Σ(θᵢ × likelihoodᵢ) / Σ(likelihoodᵢ)
```

**왜 EAP를 기본으로 사용하는가**:
1. 극단적 응답 패턴에서도 유한한 값 반환
2. Prior가 불확실성 높을 때 안정적인 추정 제공
3. 초기 학습 단계에서 특히 중요

---

## 항목 선택: Fisher Information

### Information Function

```
I(θ) = a² P(θ) Q(θ)
```

**기하학적 의미**: ICC의 기울기 제곱에 비례
- θ = b 일 때 최대 (P = 0.5 → P×Q = 0.25 최대)
- θ ≪ b 또는 θ ≫ b 이면 정보량 급감

```
I(θ)
  |
  |        * (θ=b)
  |       ***
  |      *   *
  |     *     *
  |   **       **
  | **           **
  +-------------------> θ
```

### 최적 항목 선택 (lines 404-427)

```typescript
for (const item of availableItems) {
  if (usedItemIds.has(item.id)) continue;

  const p = probability2PL(currentTheta, item.a, item.b);
  const q = 1 - p;
  const info = item.a * item.a * p * q;

  if (info > maxInfo) {
    maxInfo = info;
    bestItem = item;
  }
}
```

**선택 원리**: 현재 θ 추정치에서 Information이 가장 큰 항목 선택
→ 학습자의 진정한 능력을 가장 빠르게 파악

---

## 항목 선택: Kullback-Leibler Divergence

### Fisher Information의 한계

Fisher Information은 **점 추정치** θ̂만 고려
→ θ̂의 불확실성(SE)이 클 때 최적이 아님

### KL Divergence 접근 (lines 455-496)

θ의 사후 분포 전체에 걸쳐 KL divergence를 적분:

```
KL(θ, θ̂) = P(θ) log(P(θ)/P(θ̂)) + Q(θ) log(Q(θ)/Q(θ̂))
```

```typescript
for (let i = 0; i < quadPoints; i++) {
  const theta = thetaEstimate + thetaSE * 3 * (i / (quadPoints - 1) - 0.5);
  const weight = exp(-0.5 * ((theta - thetaEstimate) / thetaSE) ** 2);

  const p = probability2PL(theta, item.a, item.b);
  const pEst = probability2PL(thetaEstimate, item.a, item.b);

  const kl = p * log(p/pEst) + (1-p) * log((1-p)/(1-pEst));
  klSum += kl * weight;
}
```

**사용 시점**: SE가 높을 때 (초기 학습, 응답 적을 때)

---

## 항목 교정: EM Algorithm

### 문제 정의

n명의 학습자 × m개의 항목 응답 행렬 U가 주어졌을 때,
θ₁...θₙ과 (a₁,b₁)...(aₘ,bₘ)을 동시에 추정

### EM 알고리즘

**E-step**: 현재 항목 파라미터로 각 학습자의 θ 추정
```
θ̂ᵢ = EAP(uᵢ | current a, b)
```

**M-step**: 현재 θ 추정치로 항목 파라미터 업데이트
```
â, b̂ = argmax Σᵢ log P(uᵢ | θ̂ᵢ, a, b)
```

**반복**: 수렴할 때까지

---

## 수치 안정성

| 보호 장치 | 위치 | 이유 |
|----------|------|------|
| `L2 === 0` 체크 | MLE | 0으로 나누기 방지 |
| `theta = max(-4, min(4, theta))` | MLE 3PL | 발산 방지 |
| `epsilon = 1e-10` | KL divergence | log(0) 방지 |
| `sumLikelihoods === 0` 체크 | EAP | prior 반환 |

---

## 핵심 함수

| 함수 | 라인 | 복잡도 |
|------|------|--------|
| `probability1PL/2PL/3PL` | 43-99 | O(1) |
| `estimateThetaMLE` | 133-177 | O(n × iter) |
| `estimateThetaMLE3PL` | 201-262 | O(n × iter) |
| `estimateThetaEAP` | 293-343 | O(n × quad) |
| `fisherInformation` | 372-376 | O(1) |
| `selectNextItem` | 404-427 | O(m) |
| `selectItemKL` | 455-496 | O(m × quad) |

---

## 의존 관계

```
types.ts ──> ItemParameter, ThetaEstimate

irt.ts
  │
  ├──> g2p-irt.ts (G2P 규칙에 IRT 적용)
  ├──> priority.ts (θ를 Cost 계산에 활용)
  ├──> task-matching.ts (θ로 적합도 평가)
  │
  └──> Services:
       ├── scoring-update.service (응답 후 θ 업데이트)
       ├── task-generation.service (selectNextItem)
       └── state-priority.service (θ 기반 큐 구성)
```

---

## 학술적 기반

- Lord, F. M. (1980). *Applications of Item Response Theory to Practical Testing Problems*
- Bock, R. D., & Mislevy, R. J. (1982). Adaptive EAP estimation. *Applied Psychological Measurement*
- Chang, H., & Ying, Z. (1996). A global information approach to computerized adaptive testing. *Applied Psychological Measurement*
- Bock, R. D., & Aitkin, M. (1981). Marginal maximum likelihood estimation of item parameters: Application of an EM algorithm. *Psychometrika*
