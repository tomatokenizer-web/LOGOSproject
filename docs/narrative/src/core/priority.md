# Priority Calculation Module

> **Code**: `src/core/priority.ts`
> **Tier**: 1 (Core Algorithm)

---

## 핵심 공식

```
            w_F × F + w_R × R + w_E × E
Priority = ─────────────────────────────────
           BaseDifficulty - TransferGain + ExposureNeed
```

**높은 Value + 낮은 Cost = 높은 Priority = 먼저 학습**

---

## 수학적 기초

### 1. FRE 점수

```typescript
FRE = w_F × F + w_R × R + w_E × E   // 가중치 합 = 1
```

| 변수 | 의미 | 측정 | 범위 |
|------|------|------|------|
| **F** | 코퍼스 빈도 | Zipf's law 정규화 | 0-1 |
| **R** | 네트워크 중심성 | PMI 기반 연결 | 0-1 |
| **E** | 의미 기여도 | TF-IDF 유사 | 0-1 |

**수준별 가중치**:
```typescript
beginner:     { f: 0.5, r: 0.25, e: 0.25 }  // 빈도 우선 - 커버리지 확보
intermediate: { f: 0.4, r: 0.3,  e: 0.3  }  // 균형
advanced:     { f: 0.3, r: 0.3,  e: 0.4  }  // 맥락 우선 - 뉘앙스 학습
```

**이론적 근거**:
- Nation (2001): 고빈도 2000단어 = 일반 텍스트 80% 커버
- 초급은 커버리지, 고급은 뉘앙스가 병목

### 2. Cost 계산

```typescript
Cost = max(0.1, BaseDifficulty - TransferGain + ExposureNeed)
```

| 요소 | 계산 | 의미 |
|------|------|------|
| **BaseDifficulty** | `(irtDifficulty + 3) / 6` | IRT 난이도 정규화 |
| **TransferGain** | `calculateTransferGain(L1, L2, type)` | L1 전이 이득 |
| **ExposureNeed** | `min(1, (difficulty - θ) / 3)` | 능력 격차 |

### 3. Urgency (긴급성)

```typescript
function computeUrgency(nextReview, now) {
  if (!nextReview) return 1.5;  // 신규 항목

  const daysOverdue = (now - nextReview) / MS_PER_DAY;
  if (daysOverdue < 0) return 0;
  return Math.min(3, 1 + daysOverdue * 0.5);
}
```

```
Urgency
   3 |                    ******
   2 |          **********
   1 |**********
   0 |______|___________________
        Due  +2  +4  days overdue
```

### 4. Final Score

```typescript
FinalScore = Priority × (1 + Urgency)
```

**곱셈 이유**: 덧셈이면 낮은 Priority + 높은 Urgency가 상위로 감. 곱셈은 Priority 순위 유지하면서 Urgency가 부스트만 제공.

---

## 핵심 함수

| 함수 | 라인 | 용도 |
|------|------|------|
| `computeFRE()` | 106-115 | 가치 점수 계산 |
| `computeCost()` | 127-131 | 학습 비용 계산 |
| `estimateCostFactors()` | 138-168 | IRT 난이도, 전이 이득, 노출 필요 추출 |
| `computePriority()` | 181-196 | FRE / Cost |
| `computeUrgency()` | 214-233 | 간격반복 긴급성 |
| `buildLearningQueue()` | 289-312 | 전체 큐 정렬 |
| `getSessionItems()` | 326-344 | 세션 항목 추출 (70% 복습 + 30% 신규) |

---

## 의존 관계

```
transfer.ts ──> calculateTransferGain()

priority.ts
    │
    ├──> component-vectors.ts  (FRE 로직 활용, Cost Modifier 추가)
    ├──> state-priority.service.ts  (buildLearningQueue 호출)
    └──> session.service.ts  (getSessionItems 호출)
```

**Component-Specific Priority**: 5개 컴포넌트별 고유 Cost Modifier가 필요한 경우 → [component-vectors.md](component-vectors.md)

---

## 설계 결정 근거

### Transfer를 Cost에서 빼는 이유

```typescript
// ❌ 틀림: 동족어가 "더 가치 있는" 것처럼 됨
Priority = FRE × (1 + Transfer)

// ✓ 올바름: 동족어는 "더 쉬운" 것으로 취급 (가치는 동일)
Cost = Difficulty - Transfer
```

### Urgency 상한(3) 이유

상한 없으면 오래 방치된 항목이 무한히 높은 점수 획득 → 새 항목 영원히 도입 안됨

### 왜 FRE인가?

| 대안 | 문제점 |
|------|--------|
| 빈도만 | 기능어(the, a)가 항상 최상위 |
| 난이도만 | 쉬운 것만 반복, 학습 정체 |
| 무작위 | 비효율적 |

FRE = 빈도(효율) + 연결성(전이) + 맥락(실용성) 균형

---

## 학술적 기반

- Nation, I.S.P. (2001). *Learning Vocabulary in Another Language*
- Pimsleur, P. (1967). A memory schedule. *Modern Language Journal*
- Ringbom, H. (2007). *Cross-linguistic Similarity in FL Learning*
