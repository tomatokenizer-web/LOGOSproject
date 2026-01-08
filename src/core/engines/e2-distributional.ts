/**
 * E2: DistributionalAnalyzer
 *
 * 분포 분석 엔진 - 빈도, 변이, 스타일, 복잡성, 도메인 분포 분석
 *
 * 학술적 근거:
 * - Zipf의 법칙: 자연어 빈도 분포는 멱법칙을 따름
 * - 어휘 다양성 측정 (TTR, MTLD, vocd-D)
 * - 레지스터/스타일 분류 (Biber, 1988)
 * - 이상치 탐지를 통한 학습 우선순위 조정
 *
 * 기존 코드 활용:
 * - src/core/priority.ts: FREMetrics (빈도, 관계밀도, 맥락기여도)
 * - src/core/dynamic-corpus.ts: DomainVocabularyStats, ExtractedItem
 * - src/core/syntactic.ts: 복잡성 측정
 *
 * 새로운 기능:
 * - 5가지 분포 차원 통합 분석
 * - 통계적 이상치 탐지 (z-score, IQR)
 * - 목표 분포와의 격차 분석 (Cohen's d)
 * - 스타일/레지스터 분류
 */

import type {
  BaseEngine,
  DistributionalEngineConfig,
  DistributionalInput,
  DistributionalResult,
  DistributionDimension,
  DistributionStatistics,
} from './types';

import type { FREMetrics } from '../priority';
import type { LanguageObjectType } from '../types';

// =============================================================================
// 상수 및 헬퍼
// =============================================================================

/**
 * 기본 스타일 마커
 */
const DEFAULT_STYLE_MARKERS = {
  formal: [
    'therefore', 'hence', 'consequently', 'furthermore', 'moreover',
    'nevertheless', 'notwithstanding', 'whereas', 'hereby', 'pursuant',
    'aforementioned', 'hereafter', 'therein', 'whereby', 'inasmuch',
  ],
  informal: [
    'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'lemme', 'gimme',
    'yeah', 'nope', 'ok', 'okay', 'cool', 'awesome', 'stuff', 'thing',
    'like', 'basically', 'actually', 'literally', 'totally',
  ],
};

/**
 * 복잡성 측정 가중치
 */
const COMPLEXITY_WEIGHTS = {
  wordLength: 0.3,       // 평균 단어 길이
  syllableCount: 0.25,   // 음절 수
  morphemeCount: 0.25,   // 형태소 수 (추정)
  sentenceDepth: 0.2,    // 문장 깊이 (추정)
};

// =============================================================================
// 통계 계산 유틸리티
// =============================================================================

/**
 * 기본 통계 계산
 */
function computeBasicStats(values: number[]): {
  mean: number;
  stdDev: number;
  median: number;
  min: number;
  max: number;
} {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0, median: 0, min: 0, max: 0 };
  }

  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);

  // 평균
  const mean = values.reduce((sum, v) => sum + v, 0) / n;

  // 표준편차
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  // 중앙값
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  return {
    mean,
    stdDev,
    median,
    min: sorted[0],
    max: sorted[n - 1],
  };
}

/**
 * 사분위수 계산
 */
function computeQuartiles(values: number[]): [number, number, number] {
  if (values.length === 0) {
    return [0, 0, 0];
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // Q1 (25%), Q2 (50%), Q3 (75%)
  const q1Index = Math.floor(n * 0.25);
  const q2Index = Math.floor(n * 0.5);
  const q3Index = Math.floor(n * 0.75);

  return [
    sorted[q1Index],
    sorted[q2Index],
    sorted[q3Index],
  ];
}

/**
 * 왜도 (Skewness) 계산
 * - Fisher-Pearson standardized moment coefficient
 */
function computeSkewness(values: number[], mean: number, stdDev: number): number {
  if (values.length < 3 || stdDev === 0) {
    return 0;
  }

  const n = values.length;
  const m3 = values.reduce((sum, v) => sum + ((v - mean) / stdDev) ** 3, 0) / n;

  return m3;
}

/**
 * 첨도 (Kurtosis) 계산
 * - Excess kurtosis (정규분포 = 0)
 */
function computeKurtosis(values: number[], mean: number, stdDev: number): number {
  if (values.length < 4 || stdDev === 0) {
    return 0;
  }

  const n = values.length;
  const m4 = values.reduce((sum, v) => sum + ((v - mean) / stdDev) ** 4, 0) / n;

  return m4 - 3; // Excess kurtosis
}

/**
 * Z-score 계산
 */
function computeZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Cohen's d 계산 (효과 크기)
 */
function computeCohensD(
  mean1: number,
  mean2: number,
  stdDev1: number,
  stdDev2: number,
  n1: number,
  n2: number
): number {
  // Pooled standard deviation
  const pooledStdDev = Math.sqrt(
    ((n1 - 1) * stdDev1 ** 2 + (n2 - 1) * stdDev2 ** 2) / (n1 + n2 - 2)
  );

  if (pooledStdDev === 0) return 0;

  return (mean1 - mean2) / pooledStdDev;
}

/**
 * 전체 분포 통계 계산
 */
function computeDistributionStatistics(values: number[]): DistributionStatistics {
  const { mean, stdDev, median } = computeBasicStats(values);
  const quartiles = computeQuartiles(values);
  const skewness = computeSkewness(values, mean, stdDev);
  const kurtosis = computeKurtosis(values, mean, stdDev);

  return {
    mean,
    stdDev,
    median,
    skewness,
    kurtosis,
    quartiles,
    sampleSize: values.length,
  };
}

// =============================================================================
// 차원별 값 추출 함수
// =============================================================================

/**
 * 빈도 값 추출
 */
function extractFrequencyValues(
  objects: Array<{ fre?: FREMetrics; content: string }>
): number[] {
  return objects.map(obj => obj.fre?.frequency ?? 0);
}

/**
 * 변이 (다양성) 값 추출
 * - 관계 밀도를 변이 지표로 사용
 */
function extractVarianceValues(
  objects: Array<{ fre?: FREMetrics; content: string }>
): number[] {
  return objects.map(obj => obj.fre?.relationalDensity ?? 0);
}

/**
 * 스타일 점수 계산
 * - 격식체 마커 비율 기반 (0 = informal, 1 = formal)
 */
function extractStyleValues(
  objects: Array<{ content: string }>,
  styleConfig: { formal: string[]; informal: string[] }
): number[] {
  return objects.map(obj => {
    const content = obj.content.toLowerCase();
    const words = content.split(/\s+/);

    let formalCount = 0;
    let informalCount = 0;

    words.forEach(word => {
      if (styleConfig.formal.some(marker => word.includes(marker))) {
        formalCount++;
      }
      if (styleConfig.informal.some(marker => word.includes(marker))) {
        informalCount++;
      }
    });

    const total = formalCount + informalCount;
    if (total === 0) return 0.5; // 중립

    return formalCount / total; // 0 (informal) ~ 1 (formal)
  });
}

/**
 * 복잡성 점수 계산
 */
function extractComplexityValues(
  objects: Array<{ content: string }>
): number[] {
  return objects.map(obj => {
    const content = obj.content;
    const words = content.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) return 0;

    // 평균 단어 길이 (정규화: 3-15 글자 → 0-1)
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const wordLengthScore = Math.min(1, Math.max(0, (avgWordLength - 3) / 12));

    // 추정 음절 수 (영어 휴리스틱: 모음 클러스터 수)
    const syllableCount = (content.match(/[aeiouy]+/gi) || []).length;
    const syllableScore = Math.min(1, syllableCount / (words.length * 3));

    // 추정 형태소 수 (접미사 기반)
    const morphemeIndicators = ['ing', 'ed', 'ly', 'tion', 'ness', 'ment', 'able', 'ible'];
    const morphemeCount = morphemeIndicators.reduce((count, suffix) => {
      return count + (content.match(new RegExp(suffix, 'gi')) || []).length;
    }, words.length);
    const morphemeScore = Math.min(1, morphemeCount / (words.length * 2));

    // 추정 문장 깊이 (구두점 기반)
    const punctuationCount = (content.match(/[,;:()]/g) || []).length;
    const depthScore = Math.min(1, punctuationCount / Math.max(1, words.length / 5));

    return (
      COMPLEXITY_WEIGHTS.wordLength * wordLengthScore +
      COMPLEXITY_WEIGHTS.syllableCount * syllableScore +
      COMPLEXITY_WEIGHTS.morphemeCount * morphemeScore +
      COMPLEXITY_WEIGHTS.sentenceDepth * depthScore
    );
  });
}

/**
 * 도메인 분포 값 추출
 * - contextualContribution을 도메인 특수성으로 사용
 */
function extractDomainValues(
  objects: Array<{ fre?: FREMetrics; content: string }>
): number[] {
  return objects.map(obj => obj.fre?.contextualContribution ?? 0);
}

// =============================================================================
// E2 엔진 구현
// =============================================================================

/**
 * DistributionalAnalyzer 구현
 *
 * 5가지 차원의 분포 분석 제공
 */
export class DistributionalAnalyzer implements BaseEngine<
  DistributionalEngineConfig,
  DistributionalInput,
  DistributionalResult
> {
  readonly engineId = 'e2-distributional';
  readonly version = '1.0.0';

  private _config: DistributionalEngineConfig;

  constructor(config?: Partial<DistributionalEngineConfig>) {
    this._config = {
      outlierThreshold: 2.5,
      minSampleSize: 10,
      styleClassification: DEFAULT_STYLE_MARKERS,
      ...config,
    };
  }

  get config(): DistributionalEngineConfig {
    return { ...this._config };
  }

  updateConfig(config: Partial<DistributionalEngineConfig>): void {
    this._config = { ...this._config, ...config };
  }

  reset(): void {
    // Stateless engine - nothing to reset
  }

  // ---------------------------------------------------------------------------
  // 메인 처리 함수
  // ---------------------------------------------------------------------------

  /**
   * 분포 분석 수행
   */
  process(input: DistributionalInput): DistributionalResult {
    const startTime = performance.now();

    // 샘플 크기 검증
    if (input.objects.length < this._config.minSampleSize) {
      const processingTimeMs = performance.now() - startTime;
      return this.createEmptyResult(processingTimeMs, [
        `Sample size (${input.objects.length}) below minimum (${this._config.minSampleSize})`,
      ]);
    }

    // 차원별 통계 계산
    const dimensionStats: Record<DistributionDimension, DistributionStatistics> = {
      frequency: { mean: 0, stdDev: 0, median: 0, skewness: 0, kurtosis: 0, quartiles: [0, 0, 0], sampleSize: 0 },
      variance: { mean: 0, stdDev: 0, median: 0, skewness: 0, kurtosis: 0, quartiles: [0, 0, 0], sampleSize: 0 },
      style: { mean: 0, stdDev: 0, median: 0, skewness: 0, kurtosis: 0, quartiles: [0, 0, 0], sampleSize: 0 },
      complexity: { mean: 0, stdDev: 0, median: 0, skewness: 0, kurtosis: 0, quartiles: [0, 0, 0], sampleSize: 0 },
      domain: { mean: 0, stdDev: 0, median: 0, skewness: 0, kurtosis: 0, quartiles: [0, 0, 0], sampleSize: 0 },
    };

    // 차원별 값 맵
    const dimensionValues: Record<DistributionDimension, number[]> = {
      frequency: [],
      variance: [],
      style: [],
      complexity: [],
      domain: [],
    };

    // 요청된 차원 분석
    for (const dimension of input.dimensions) {
      const values = this.extractDimensionValues(dimension, input.objects);
      dimensionValues[dimension] = values;
      dimensionStats[dimension] = computeDistributionStatistics(values);
    }

    // 이상치 탐지
    const outliers = this.detectOutliers(input.objects, dimensionValues, dimensionStats);

    // 기준 분포 격차 분석
    const gapAnalysis = input.referenceDistribution
      ? this.analyzeGap(
          dimensionStats[input.referenceDistribution.dimension],
          input.referenceDistribution.stats
        )
      : undefined;

    const processingTimeMs = performance.now() - startTime;

    return {
      dimensionStats,
      gapAnalysis,
      outliers,
      metadata: {
        processingTimeMs,
        confidence: this.calculateConfidence(input.objects.length),
        method: 'statistical-distribution',
        warnings: [],
      },
    };
  }

  /**
   * 배치 분포 분석
   */
  processBatch(inputs: DistributionalInput[]): DistributionalResult[] {
    return inputs.map(input => this.process(input));
  }

  // ---------------------------------------------------------------------------
  // 고급 분석 함수
  // ---------------------------------------------------------------------------

  /**
   * 어휘 다양성 분석 (Type-Token Ratio 변형)
   */
  analyzeVocabularyDiversity(
    texts: string[]
  ): {
    ttr: number;           // Type-Token Ratio
    rootTtr: number;       // Root TTR (Guiraud's Index)
    logTtr: number;        // Log TTR (Herdan's C)
    hapaxRatio: number;    // Hapax legomena ratio
  } {
    const allTokens: string[] = [];
    const tokenFrequencies: Map<string, number> = new Map();

    texts.forEach(text => {
      const tokens = text.toLowerCase().split(/\s+/).filter(t => t.length > 0);
      tokens.forEach(token => {
        allTokens.push(token);
        tokenFrequencies.set(token, (tokenFrequencies.get(token) || 0) + 1);
      });
    });

    const N = allTokens.length; // Total tokens
    const V = tokenFrequencies.size; // Unique types

    if (N === 0) {
      return { ttr: 0, rootTtr: 0, logTtr: 0, hapaxRatio: 0 };
    }

    // Hapax legomena (단 1회 출현 단어)
    let hapaxCount = 0;
    tokenFrequencies.forEach(freq => {
      if (freq === 1) hapaxCount++;
    });

    return {
      ttr: V / N,
      rootTtr: V / Math.sqrt(N), // Guiraud's Index
      logTtr: Math.log(V) / Math.log(N), // Herdan's C
      hapaxRatio: hapaxCount / V,
    };
  }

  /**
   * Zipf 분포 적합도 분석
   *
   * 자연어는 Zipf의 법칙을 따름: f(r) ∝ 1/r^α (α ≈ 1)
   */
  analyzeZipfFit(
    frequencies: number[]
  ): {
    alpha: number;         // Zipf exponent
    rsquared: number;      // R² (적합도)
    isNaturalDistribution: boolean;
  } {
    if (frequencies.length < 3) {
      return { alpha: 0, rsquared: 0, isNaturalDistribution: false };
    }

    // 순위-빈도 정렬
    const sorted = [...frequencies].sort((a, b) => b - a);

    // 로그 변환 (log(rank) vs log(frequency))
    const logRanks: number[] = [];
    const logFreqs: number[] = [];

    sorted.forEach((freq, index) => {
      if (freq > 0) {
        logRanks.push(Math.log(index + 1));
        logFreqs.push(Math.log(freq));
      }
    });

    if (logRanks.length < 3) {
      return { alpha: 0, rsquared: 0, isNaturalDistribution: false };
    }

    // 선형 회귀로 기울기 (alpha) 추정
    const n = logRanks.length;
    const sumX = logRanks.reduce((a, b) => a + b, 0);
    const sumY = logFreqs.reduce((a, b) => a + b, 0);
    const sumXY = logRanks.reduce((sum, x, i) => sum + x * logFreqs[i], 0);
    const sumXX = logRanks.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R² 계산
    const meanY = sumY / n;
    const ssTotal = logFreqs.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
    const ssResidual = logFreqs.reduce((sum, y, i) => {
      const predicted = slope * logRanks[i] + intercept;
      return sum + (y - predicted) ** 2;
    }, 0);

    const rsquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
    const alpha = -slope; // Zipf exponent (양수로 변환)

    return {
      alpha,
      rsquared: Math.max(0, rsquared),
      isNaturalDistribution: alpha > 0.5 && alpha < 2.0 && rsquared > 0.7,
    };
  }

  /**
   * 스타일 분류
   */
  classifyStyle(
    objects: Array<{ content: string }>
  ): {
    overallStyle: 'formal' | 'neutral' | 'informal';
    formalScore: number;
    distribution: { formal: number; neutral: number; informal: number };
  } {
    const styleValues = extractStyleValues(
      objects,
      this._config.styleClassification || DEFAULT_STYLE_MARKERS
    );

    const stats = computeBasicStats(styleValues);

    // 분포 계산
    const formal = styleValues.filter(v => v > 0.6).length / styleValues.length;
    const informal = styleValues.filter(v => v < 0.4).length / styleValues.length;
    const neutral = 1 - formal - informal;

    // 전체 스타일 결정
    let overallStyle: 'formal' | 'neutral' | 'informal';
    if (stats.mean > 0.6) {
      overallStyle = 'formal';
    } else if (stats.mean < 0.4) {
      overallStyle = 'informal';
    } else {
      overallStyle = 'neutral';
    }

    return {
      overallStyle,
      formalScore: stats.mean,
      distribution: { formal, neutral, informal },
    };
  }

  // ---------------------------------------------------------------------------
  // 헬퍼 메서드
  // ---------------------------------------------------------------------------

  private extractDimensionValues(
    dimension: DistributionDimension,
    objects: Array<{ id: string; type: LanguageObjectType; content: string; fre?: FREMetrics }>
  ): number[] {
    switch (dimension) {
      case 'frequency':
        return extractFrequencyValues(objects);
      case 'variance':
        return extractVarianceValues(objects);
      case 'style':
        return extractStyleValues(objects, this._config.styleClassification || DEFAULT_STYLE_MARKERS);
      case 'complexity':
        return extractComplexityValues(objects);
      case 'domain':
        return extractDomainValues(objects);
      default:
        return [];
    }
  }

  private detectOutliers(
    objects: Array<{ id: string; type: LanguageObjectType; content: string; fre?: FREMetrics }>,
    dimensionValues: Record<DistributionDimension, number[]>,
    dimensionStats: Record<DistributionDimension, DistributionStatistics>
  ): Array<{
    objectId: string;
    dimension: DistributionDimension;
    value: number;
    zScore: number;
  }> {
    const outliers: Array<{
      objectId: string;
      dimension: DistributionDimension;
      value: number;
      zScore: number;
    }> = [];

    const dimensions = Object.keys(dimensionValues) as DistributionDimension[];

    dimensions.forEach(dimension => {
      const values = dimensionValues[dimension];
      const stats = dimensionStats[dimension];

      if (values.length === 0 || stats.stdDev === 0) return;

      values.forEach((value, index) => {
        const zScore = computeZScore(value, stats.mean, stats.stdDev);

        if (Math.abs(zScore) > this._config.outlierThreshold) {
          outliers.push({
            objectId: objects[index].id,
            dimension,
            value,
            zScore,
          });
        }
      });
    });

    // Z-score 절대값 기준 정렬 (가장 극단적인 것 먼저)
    outliers.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

    return outliers;
  }

  private analyzeGap(
    observedStats: DistributionStatistics,
    referenceStats: DistributionStatistics
  ): {
    dimension: DistributionDimension;
    gap: number;
    normalizedGap: number;
    significance: number;
  } | undefined {
    if (observedStats.sampleSize === 0 || referenceStats.sampleSize === 0) {
      return undefined;
    }

    const gap = observedStats.mean - referenceStats.mean;

    const normalizedGap = computeCohensD(
      observedStats.mean,
      referenceStats.mean,
      observedStats.stdDev,
      referenceStats.stdDev,
      observedStats.sampleSize,
      referenceStats.sampleSize
    );

    // Welch's t-test 근사 (p-value는 테이블 없이 추정)
    const se = Math.sqrt(
      observedStats.stdDev ** 2 / observedStats.sampleSize +
      referenceStats.stdDev ** 2 / referenceStats.sampleSize
    );

    const tStatistic = se > 0 ? Math.abs(gap) / se : 0;

    // 단순화된 p-value 추정 (t > 2 → p < 0.05)
    let significance: number;
    if (tStatistic > 3.5) significance = 0.001;
    else if (tStatistic > 2.8) significance = 0.01;
    else if (tStatistic > 2.0) significance = 0.05;
    else if (tStatistic > 1.5) significance = 0.1;
    else significance = 0.5;

    return {
      dimension: 'frequency', // placeholder - should be passed from caller
      gap,
      normalizedGap,
      significance,
    };
  }

  private calculateConfidence(sampleSize: number): number {
    // 샘플 크기 기반 신뢰도
    // 30개 이상: 높은 신뢰도, 10개 이상: 중간, 그 이하: 낮음
    if (sampleSize >= 100) return 0.95;
    if (sampleSize >= 50) return 0.90;
    if (sampleSize >= 30) return 0.85;
    if (sampleSize >= 20) return 0.75;
    if (sampleSize >= 10) return 0.65;
    return 0.5;
  }

  private createEmptyResult(
    processingTimeMs: number,
    warnings: string[]
  ): DistributionalResult {
    const emptyStats: DistributionStatistics = {
      mean: 0,
      stdDev: 0,
      median: 0,
      skewness: 0,
      kurtosis: 0,
      quartiles: [0, 0, 0],
      sampleSize: 0,
    };

    return {
      dimensionStats: {
        frequency: emptyStats,
        variance: emptyStats,
        style: emptyStats,
        complexity: emptyStats,
        domain: emptyStats,
      },
      outliers: [],
      metadata: {
        processingTimeMs,
        confidence: 0,
        method: 'statistical-distribution',
        warnings,
      },
    };
  }
}

// =============================================================================
// 팩토리 함수
// =============================================================================

/**
 * E2 엔진 인스턴스 생성
 */
export function createDistributionalAnalyzer(
  config?: Partial<DistributionalEngineConfig>
): DistributionalAnalyzer {
  return new DistributionalAnalyzer(config);
}

// =============================================================================
// 유틸리티 함수 (외부 노출)
// =============================================================================

/**
 * 빠른 분포 요약 생성
 */
export function quickDistributionSummary(
  values: number[]
): {
  stats: DistributionStatistics;
  interpretation: string;
} {
  const stats = computeDistributionStatistics(values);

  let interpretation = '';

  // 왜도 해석
  if (stats.skewness > 0.5) {
    interpretation += 'Right-skewed (long tail of high values). ';
  } else if (stats.skewness < -0.5) {
    interpretation += 'Left-skewed (long tail of low values). ';
  } else {
    interpretation += 'Approximately symmetric. ';
  }

  // 첨도 해석
  if (stats.kurtosis > 1) {
    interpretation += 'Heavy tails (many outliers). ';
  } else if (stats.kurtosis < -1) {
    interpretation += 'Light tails (few outliers). ';
  }

  // 분산 해석
  const cv = stats.mean !== 0 ? stats.stdDev / stats.mean : 0;
  if (cv > 0.5) {
    interpretation += 'High variability (CV > 50%).';
  } else if (cv > 0.25) {
    interpretation += 'Moderate variability.';
  } else {
    interpretation += 'Low variability (consistent values).';
  }

  return { stats, interpretation };
}

/**
 * 두 분포 비교
 */
export function compareDistributions(
  dist1: DistributionStatistics,
  dist2: DistributionStatistics,
  label1: string = 'Distribution 1',
  label2: string = 'Distribution 2'
): {
  cohensD: number;
  effectSize: 'negligible' | 'small' | 'medium' | 'large';
  interpretation: string;
} {
  const cohensD = computeCohensD(
    dist1.mean,
    dist2.mean,
    dist1.stdDev,
    dist2.stdDev,
    dist1.sampleSize,
    dist2.sampleSize
  );

  let effectSize: 'negligible' | 'small' | 'medium' | 'large';
  if (Math.abs(cohensD) < 0.2) effectSize = 'negligible';
  else if (Math.abs(cohensD) < 0.5) effectSize = 'small';
  else if (Math.abs(cohensD) < 0.8) effectSize = 'medium';
  else effectSize = 'large';

  const direction = cohensD > 0 ? 'higher than' : 'lower than';
  const interpretation = `${label1} is ${direction} ${label2} with ${effectSize} effect size (d = ${cohensD.toFixed(2)}).`;

  return { cohensD, effectSize, interpretation };
}
