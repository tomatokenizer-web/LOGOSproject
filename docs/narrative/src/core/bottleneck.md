# 병목 탐지 모듈

> **Code**: `src/core/bottleneck.ts`
> **Tier**: 1 (Core Algorithm)

---

## 핵심 개념

### 언어 구성요소 캐스케이드

오류는 언어 처리 계층을 따라 전파:

```
PHON → MORPH → LEX → SYNT → PRAG
(음운)  (형태)  (어휘)  (통사)  (화용)

예시:
- MORPH 오류 (-ing 어미)
  → LEX 오류 (동사 의미 혼동)
    → SYNT 오류 (시제 불일치)
      → PRAG 오류 (부적절한 화행)
```

**핵심 통찰**: 가장 높은 오류율이 아니라 **근본 원인**을 찾아야 함.

### 병목 탐지 알고리즘

1. 캐스케이드 순서대로 오류율 검사
2. 임계값 초과 + 하류 오류 존재 → 근본 원인
3. 캐스케이드 없으면 최고 오류율 선택

---

## 설정 파라미터

### DEFAULT_BOTTLENECK_CONFIG (lines 121-126)

```typescript
export const DEFAULT_BOTTLENECK_CONFIG: BottleneckDetectionConfig = {
  minResponses: 20,              // 최소 응답 수
  minResponsesPerType: 5,        // 컴포넌트당 최소
  errorRateThreshold: 0.3,       // 30% 이상 = 문제
  cascadeConfidenceThreshold: 0.7 // 캐스케이드 신뢰도
};
```

---

## 주요 분석 함수

### analyzeBottleneck() (lines 169-212)

```typescript
export function analyzeBottleneck(
  responses: ResponseData[],
  config: BottleneckDetectionConfig = DEFAULT_BOTTLENECK_CONFIG
): BottleneckAnalysis {
  // 최소 데이터 체크
  if (responses.length < config.minResponses) {
    return {
      primaryBottleneck: null,
      confidence: 0,
      evidence: [],
      recommendation: `Need more data (${responses.length}/${config.minResponses})`
    };
  }

  // 1. 컴포넌트별 통계 계산
  const stats = calculateComponentStats(responses);

  // 2. 증거 배열 구축
  const evidence = buildEvidence(stats, responses, config);

  // 3. 캐스케이드 분석 (근본 원인 탐색)
  const cascade = analyzeCascadingErrors(evidence, config);

  // 4. 주요 병목 결정
  let primaryBottleneck = cascade.rootCause;
  if (!primaryBottleneck) {
    primaryBottleneck = findHighestErrorRate(evidence, config);
  }

  // 5. 신뢰도 및 권고사항
  const confidence = calculateConfidence(evidence, responses.length, cascade);
  const recommendation = generateRecommendation(primaryBottleneck, evidence, cascade);

  return {
    primaryBottleneck,
    confidence,
    evidence: evidence.sort((a, b) => b.errorRate - a.errorRate),
    recommendation
  };
}
```

### calculateComponentStats() (lines 217-261)

```typescript
function calculateComponentStats(
  responses: ResponseData[]
): Map<ComponentType, ComponentStats> {
  const stats = new Map<ComponentType, ComponentStats>();

  // 모든 컴포넌트 초기화
  for (const type of CASCADE_ORDER) {
    stats.set(type, {
      total: 0,
      errors: 0,
      errorResponses: [],
      recentErrors: 0,
      recentTotal: 0
    });
  }

  // 시간순 정렬 (최근 25% 계산용)
  const sorted = [...responses].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const recentThreshold = Math.floor(sorted.length * 0.75);

  // 통계 집계
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const stat = stats.get(r.componentType);

    if (stat) {
      stat.total++;
      if (!r.correct) {
        stat.errors++;
        stat.errorResponses.push(r);
      }

      // 최근 성과 추적
      if (i >= recentThreshold) {
        stat.recentTotal++;
        if (!r.correct) stat.recentErrors++;
      }
    }
  }

  return stats;
}
```

---

## 캐스케이드 분석

### analyzeCascadingErrors() (lines 419-454)

```typescript
export function analyzeCascadingErrors(
  evidence: BottleneckEvidence[],
  config: BottleneckDetectionConfig = DEFAULT_BOTTLENECK_CONFIG
): CascadeAnalysis {
  // 캐스케이드 순서대로 검사
  for (const type of CASCADE_ORDER) {
    const ev = evidence.find(e => e.componentType === type);

    if (ev && ev.errorRate >= config.errorRateThreshold) {
      // 하류 컴포넌트 오류 확인
      const typeIndex = CASCADE_ORDER.indexOf(type);
      const downstreamErrors = CASCADE_ORDER
        .slice(typeIndex + 1)
        .filter(t => {
          const downstream = evidence.find(e => e.componentType === t);
          // 하류 임계값 = 상류의 67%
          return downstream && downstream.errorRate >= config.errorRateThreshold * 0.67;
        });

      if (downstreamErrors.length > 0) {
        // 캐스케이드 패턴 발견
        return {
          rootCause: type,
          cascadeChain: [type, ...downstreamErrors],
          confidence: config.cascadeConfidenceThreshold
        };
      }
    }
  }

  // 캐스케이드 없음
  return { rootCause: null, cascadeChain: [], confidence: 0 };
}
```

**캐스케이드 탐지 예시**:

| 컴포넌트 | 오류율 | 분석 |
|----------|--------|------|
| PHON | 15% | 임계값 미만 → 통과 |
| MORPH | 35% | 임계값 초과 → 하류 검사 |
| LEX | 28% | 35% × 0.67 = 23.5% 초과 → 영향받음 |
| SYNT | 22% | 임계값 미만 → 독립적 |
| PRAG | 10% | 임계값 미만 |

→ **근본 원인**: MORPH, **캐스케이드**: [MORPH, LEX]

---

## 오류 패턴 분석

### extractErrorPattern() (lines 322-364)

컴포넌트별 오류 분류:

```typescript
function extractErrorPattern(response: ResponseData): string {
  const content = response.content.toLowerCase();

  switch (response.componentType) {
    case 'PHON':
      if (content.includes('th')) return 'th-sounds';
      if (content.includes('r') || content.includes('l')) return 'r/l distinction';
      if (content.match(/[aeiou]{2}/)) return 'vowel combinations';
      return 'other pronunciation';

    case 'MORPH':
      if (content.match(/ing$/)) return '-ing endings';
      if (content.match(/ed$/)) return '-ed endings';
      if (content.match(/s$/)) return 'plurals/3rd person';
      if (content.match(/tion$/)) return '-tion nominalizations';
      return 'other word forms';

    case 'LEX':
      if (content.length > 10) return 'complex vocabulary';
      if (content.length <= 4) return 'basic vocabulary';
      return 'intermediate vocabulary';

    case 'SYNT':
      if (content.includes('if') || content.includes('when')) return 'conditional clauses';
      if (content.includes('who') || content.includes('which')) return 'relative clauses';
      if (content.includes(',')) return 'compound sentences';
      return 'simple sentence patterns';

    case 'PRAG':
      if (content.includes('please') || content.includes('could')) return 'politeness markers';
      if (content.includes('sorry') || content.includes('excuse')) return 'apology patterns';
      return 'discourse markers';
  }
}
```

### analyzeErrorPatterns() (lines 302-316)

```typescript
export function analyzeErrorPatterns(errors: ResponseData[]): string[] {
  const patterns = new Map<string, number>();

  for (const error of errors) {
    const pattern = extractErrorPattern(error);
    patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
  }

  // 2회 이상 발생한 패턴만 반환
  return Array.from(patterns.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)  // 상위 5개
    .map(([pattern, count]) => `${pattern} (${count}×)`);
}
```

---

## 공기 오류 분석

### findCooccurringErrors() (lines 374-407)

세션 내 동시 발생 오류 탐지:

```typescript
export function findCooccurringErrors(
  targetType: ComponentType,
  responses: ResponseData[]
): ComponentType[] {
  // 세션별 오류 그룹화
  const sessionErrors = new Map<string, Set<ComponentType>>();

  for (const r of responses) {
    if (!r.correct) {
      const errors = sessionErrors.get(r.sessionId) || new Set();
      errors.add(r.componentType);
      sessionErrors.set(r.sessionId, errors);
    }
  }

  // 공기 빈도 카운트
  const cooccurrence = new Map<ComponentType, number>();

  for (const errors of sessionErrors.values()) {
    if (errors.has(targetType)) {
      for (const type of errors) {
        if (type !== targetType) {
          cooccurrence.set(type, (cooccurrence.get(type) || 0) + 1);
        }
      }
    }
  }

  // 2회 이상 공기한 컴포넌트
  return Array.from(cooccurrence.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([type, _]) => type);
}
```

---

## 신뢰도 계산

### calculateConfidence() (lines 479-498)

```typescript
function calculateConfidence(
  evidence: BottleneckEvidence[],
  totalResponses: number,
  cascade: CascadeAnalysis
): number {
  if (evidence.length === 0) return 0;

  // 데이터 양 기반 신뢰도
  const dataConfidence = Math.min(1, totalResponses / 50);

  // 캐스케이드 보너스
  const cascadeBoost = cascade.rootCause ? 0.2 : 0;

  // 차별화 보너스 (오류율 차이)
  const rates = evidence.map(e => e.errorRate).sort((a, b) => b - a);
  const differentiation = rates.length >= 2 ? (rates[0] - rates[1]) : 0;
  const differentiationBoost = Math.min(0.2, differentiation);

  return Math.min(1, dataConfidence + cascadeBoost + differentiationBoost);
}
```

---

## 개선 추세 분석

### calculateImprovementTrend() (lines 555-573)

```typescript
export function calculateImprovementTrend(
  componentType: ComponentType,
  responses: ResponseData[]
): number {
  const componentResponses = responses.filter(r => r.componentType === componentType);

  if (componentResponses.length < 4) return 0;

  const midpoint = Math.floor(componentResponses.length / 2);
  const firstHalf = componentResponses.slice(0, midpoint);
  const secondHalf = componentResponses.slice(midpoint);

  const firstErrorRate = firstHalf.filter(r => !r.correct).length / firstHalf.length;
  const secondErrorRate = secondHalf.filter(r => !r.correct).length / secondHalf.length;

  // 양수 = 개선 중 (최근 오류 감소)
  return firstErrorRate - secondErrorRate;
}
```

---

## 권고사항 생성

### generateRecommendation() (lines 503-540)

```typescript
function generateRecommendation(
  bottleneck: ComponentType | null,
  evidence: BottleneckEvidence[],
  cascade: CascadeAnalysis
): string {
  if (!bottleneck) {
    return 'No significant bottleneck detected. Continue balanced practice.';
  }

  const ev = evidence.find(e => e.componentType === bottleneck);
  const errorRate = ev ? Math.round(ev.errorRate * 100) : 0;
  const componentName = COMPONENT_NAMES[toShortForm(bottleneck)];

  let recommendation = `Focus on ${componentName} (${errorRate}% error rate). `;

  // 캐스케이드 정보 추가
  if (cascade.rootCause === bottleneck && cascade.cascadeChain.length > 1) {
    const downstream = cascade.cascadeChain.slice(1)
      .map(t => COMPONENT_SHORT[toShortForm(t)])
      .join(', ');
    recommendation += `Improving this will also help with ${downstream}. `;
  }

  // 패턴별 조언
  if (ev && ev.errorPatterns.length > 0) {
    const topPattern = ev.errorPatterns[0].split(' (')[0];
    recommendation += `Specifically practice: ${topPattern}.`;
  }

  // 개선 추세 메모
  if (ev && ev.improvement > 0.05) {
    recommendation += ' (Already improving - keep it up!)';
  } else if (ev && ev.improvement < -0.05) {
    recommendation += ' (Needs extra attention - performance declining.)';
  }

  return recommendation;
}
```

---

## 유틸리티 함수

| 함수 | 라인 | 용도 |
|------|------|------|
| `isComponentType` | 582-584 | 타입 가드 |
| `getCascadePosition` | 589-591 | 캐스케이드 위치 |
| `canCauseErrors` | 596-601 | 상류→하류 관계 |
| `getDownstreamComponents` | 606-609 | 하류 컴포넌트 |
| `getUpstreamComponents` | 614-617 | 상류 컴포넌트 |
| `summarizeBottleneck` | 622-637 | 요약 문자열 |

---

## 핵심 함수

| 함수 | 라인 | 복잡도 | 용도 |
|------|------|--------|------|
| `analyzeBottleneck` | 169-212 | O(n×c) | 전체 분석 |
| `calculateComponentStats` | 217-261 | O(n) | 통계 집계 |
| `buildEvidence` | 266-293 | O(c×e) | 증거 구축 |
| `analyzeErrorPatterns` | 302-316 | O(e) | 패턴 분석 |
| `findCooccurringErrors` | 374-407 | O(n) | 공기 오류 |
| `analyzeCascadingErrors` | 419-454 | O(c²) | 캐스케이드 |
| `calculateImprovementTrend` | 555-573 | O(n) | 추세 분석 |
| `generateRecommendation` | 503-540 | O(c) | 권고 생성 |

---

## 의존 관계

```
bottleneck.ts
  │
  ├──> types.ts
  │      ComponentType 임포트
  │
  ├──> component-vectors.ts
  │      컴포넌트별 오류 추적에 활용
  │
  └──> Services:
       ├── scoring-update.service (오류 데이터 수집)
       ├── state-priority.service (병목 기반 우선순위)
       └── analytics.service (병목 시각화)
```

---

## 학술적 기반

- Levelt, W.J.M. (1989). *Speaking: From Intention to Articulation*. MIT Press
- Anderson, J.R. (1983). *The Architecture of Cognition*. Harvard University Press
- Kroll, J.F. & de Groot, A.M.B. (2005). *Handbook of Bilingualism: Psycholinguistic Approaches*. Oxford University Press
