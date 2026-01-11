# Item Response Theory (IRT) Module

> **Code**: `src/core/irt.ts`
> **Tier**: 1 (Core Algorithm)

---

## Core Formulas

### Item Characteristic Curve (ICC)

```
        1PL:  P(θ) = 1 / (1 + e^-(θ-b))

        2PL:  P(θ) = 1 / (1 + e^(-a(θ-b)))

        3PL:  P(θ) = c + (1-c) / (1 + e^(-a(θ-b)))
```

| Parameter | Meaning | Range | LOGOS Usage |
|-----------|---------|-------|-------------|
| **θ** (theta) | Learner ability | -3 ~ +3 | Global ability estimate |
| **b** | Item difficulty | -4 ~ +4 | P=0.5 when θ=b |
| **a** | Discrimination (slope) | 0.2 ~ 3.0 | Higher = sharper distinction |
| **c** | Guessing probability | 0 ~ 0.35 | MCQ 4-choice: c=0.25 |

---

## Ability Estimation: Newton-Raphson MLE

### Mathematical Derivation

**Goal**: Find θ that maximizes likelihood of observed response pattern u = (u₁, u₂, ..., uₙ)

**Log-likelihood function**:
```
L(θ) = Σᵢ [uᵢ log P(θ) + (1-uᵢ) log(1-P(θ))]
```

**First derivative (Score Function)**:
```
L'(θ) = Σᵢ aᵢ(uᵢ - Pᵢ)
```

**Second derivative (negative Fisher Information)**:
```
L''(θ) = -Σᵢ aᵢ² Pᵢ Qᵢ    (where Q = 1-P)
```

**Newton-Raphson Update**:
```
θ_{n+1} = θₙ - L'(θₙ) / L''(θₙ)
        = θₙ + Σᵢ aᵢ(uᵢ - Pᵢ) / Σᵢ aᵢ² Pᵢ Qᵢ
```

### Code Implementation (lines 133-177)

```typescript
for (let iter = 0; iter < MAX_ITER; iter++) {
  let L1 = 0;  // first derivative
  let L2 = 0;  // second derivative

  for (let i = 0; i < responses.length; i++) {
    const { a, b } = items[i];
    const p = probability2PL(theta, a, b);
    const q = 1 - p;
    const u = responses[i] ? 1 : 0;

    L1 += a * (u - p);        // Score function
    L2 -= a * a * p * q;      // -Fisher Information
  }

  if (L2 === 0) break;        // prevent division by zero

  const delta = L1 / L2;
  theta -= delta;

  if (Math.abs(delta) < TOLERANCE) break;  // convergence
}
```

### MLE Limitations and Solutions

| Situation | MLE Problem | Solution |
|-----------|-------------|----------|
| All correct | θ → +∞ | Use EAP |
| All incorrect | θ → -∞ | Use EAP |
| < 5 responses | SE very large | Prior shrinkage |

---

## Ability Estimation: Expected A Posteriori (EAP)

### Bayesian Approach

**Prior distribution**: θ ~ N(μ₀, σ₀²), typically N(0, 1)

**Posterior distribution**:
```
P(θ|u) ∝ P(u|θ) × P(θ)
       = [Πᵢ Pᵢ^uᵢ (1-Pᵢ)^(1-uᵢ)] × φ(θ; μ₀, σ₀)
```

**EAP estimate**: Expected value of posterior distribution
```
θ̂_EAP = ∫ θ × P(θ|u) dθ / ∫ P(θ|u) dθ
```

### Gaussian Quadrature Approximation (lines 293-343)

Approximate continuous integral with discrete sum:

```typescript
// 41 quadrature points (priorMean ± 2σ range)
for (let i = 0; i < quadPoints; i++) {
  const x = priorMean + priorSD * 4 * (i / (quadPoints - 1) - 0.5);
  points.push(x);
  weights.push(Math.exp(-0.5 * ((x - priorMean) / priorSD) ** 2));
}

// Calculate likelihood at each point
const likelihoods = points.map((theta, idx) => {
  const likelihood = responses.reduce((prod, correct, i) => {
    const p = probability2PL(theta, items[i].a, items[i].b);
    return prod * (correct ? p : 1 - p);
  }, 1);
  return likelihood * weights[idx];
});

// EAP = weighted average
const eap = Σ(θᵢ × likelihoodᵢ) / Σ(likelihoodᵢ)
```

**Why EAP is the default**:
1. Returns finite values for extreme response patterns
2. Provides stable estimates when uncertainty is high
3. Especially important in early learning stages

---

## Item Selection: Fisher Information

### Information Function

```
I(θ) = a² P(θ) Q(θ)
```

**Geometric meaning**: Proportional to ICC slope squared
- Maximum at θ = b (P = 0.5 → P×Q = 0.25 is maximum)
- Information drops rapidly when θ ≪ b or θ ≫ b

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

### Optimal Item Selection (lines 404-427)

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

**Selection principle**: Select item with highest Information at current θ estimate
→ Fastest path to understanding learner's true ability

---

## Item Selection: Kullback-Leibler Divergence

### Fisher Information Limitation

Fisher Information only considers **point estimate** θ̂
→ Not optimal when θ̂ has high uncertainty (large SE)

### KL Divergence Approach (lines 455-496)

Integrate KL divergence over entire posterior distribution of θ:

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

**When to use**: When SE is high (early learning, few responses)

---

## Item Calibration: EM Algorithm

### Problem Definition

Given response matrix U for n learners × m items,
simultaneously estimate θ₁...θₙ and (a₁,b₁)...(aₘ,bₘ)

### EM Algorithm

**E-step**: Estimate each learner's θ using current item parameters
```
θ̂ᵢ = EAP(uᵢ | current a, b)
```

**M-step**: Update item parameters using current θ estimates
```
â, b̂ = argmax Σᵢ log P(uᵢ | θ̂ᵢ, a, b)
```

**Iterate**: Until convergence

---

## Numerical Stability

| Protection | Location | Reason |
|------------|----------|--------|
| `L2 === 0` check | MLE | Prevent division by zero |
| `theta = max(-4, min(4, theta))` | MLE 3PL | Prevent divergence |
| `epsilon = 1e-10` | KL divergence | Prevent log(0) |
| `sumLikelihoods === 0` check | EAP | Return prior |

---

## Key Functions

| Function | Lines | Complexity |
|----------|-------|------------|
| `probability1PL/2PL/3PL` | 43-99 | O(1) |
| `estimateThetaMLE` | 133-177 | O(n × iter) |
| `estimateThetaMLE3PL` | 201-262 | O(n × iter) |
| `estimateThetaEAP` | 293-343 | O(n × quad) |
| `fisherInformation` | 372-376 | O(1) |
| `selectNextItem` | 404-427 | O(m) |
| `selectItemKL` | 455-496 | O(m × quad) |

---

## Dependencies

```
types.ts ──> ItemParameter, ThetaEstimate

irt.ts
  │
  ├──> g2p-irt.ts (applies IRT to G2P rules)
  ├──> priority.ts (uses θ in Cost calculation)
  ├──> task-matching.ts (uses θ for suitability evaluation)
  │
  └──> Services:
       ├── scoring-update.service (updates θ after response)
       ├── task-generation.service (selectNextItem)
       └── state-priority.service (builds queue based on θ)
```

---

## Academic Foundation

- Lord, F. M. (1980). *Applications of Item Response Theory to Practical Testing Problems*
- Bock, R. D., & Mislevy, R. J. (1982). Adaptive EAP estimation. *Applied Psychological Measurement*
- Chang, H., & Ying, Z. (1996). A global information approach to computerized adaptive testing. *Applied Psychological Measurement*
- Bock, R. D., & Aitkin, M. (1981). Marginal maximum likelihood estimation of item parameters: Application of an EM algorithm. *Psychometrika*
