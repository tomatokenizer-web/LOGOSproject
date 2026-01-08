/**
 * E3: FlexibleEvaluationEngine
 *
 * 유연한 다차원 평가 엔진 - 장르 적응형 평가 시스템
 *
 * 학술적 근거:
 * - 다차원 항목반응이론 (MIRT): 복수 잠재 특성 동시 측정
 * - 장르 기반 평가 (Biber, 1988): 텍스트 유형별 차별화된 기준
 * - 부분점수 모델 (Partial Credit Model): 연속적 정답 인정
 * - CEFR 수준별 가중치 조정
 *
 * 기존 코드 활용:
 * - src/core/types.ts: EvaluationMode, EvaluationLayer, MultiComponentEvaluation
 * - src/core/types.ts: ComponentEvaluation, ObjectEvaluationConfig
 *
 * 새로운 기능:
 * - 장르 자동 감지 및 프로파일 매칭
 * - CEFR 수준별 층 가중치 동적 조정
 * - 다중 기준 루브릭 평가
 * - 적응형 피드백 생성
 */

import type {
  BaseEngine,
  EvaluationEngineConfig,
  AdaptiveEvaluationInput,
  AdaptiveEvaluationResult,
  TextGenreClassification,
  GenreEvaluationProfile,
  E3EvaluationLayerDef,
} from './types';

import type {
  ComponentCode,
} from '../types';

// =============================================================================
// 로컬 타입 정의 (E3 전용)
// =============================================================================

/**
 * E3 전용 평가 층 인터페이스 (types.ts에서 가져온 타입의 별칭)
 */
type E3EvaluationLayer = E3EvaluationLayerDef;

/**
 * E3 전용 컴포넌트 평가 결과
 */
interface E3ComponentEvaluation {
  objectId: string;
  componentType: ComponentCode;
  isCorrect: boolean;
  partialCredit: number;
  feedback: string;
}

// =============================================================================
// 상수 및 기본 프로파일
// =============================================================================

/**
 * CEFR 수준별 평가 층 가중치 조정
 *
 * 낮은 수준: 형태/철자 중시
 * 높은 수준: 화용/스타일 중시
 */
const CEFR_LAYER_WEIGHTS: Record<string, Record<string, number>> = {
  'A1': { form: 0.5, meaning: 0.3, pragmatics: 0.1, style: 0.1 },
  'A2': { form: 0.4, meaning: 0.35, pragmatics: 0.15, style: 0.1 },
  'B1': { form: 0.3, meaning: 0.35, pragmatics: 0.2, style: 0.15 },
  'B2': { form: 0.25, meaning: 0.3, pragmatics: 0.25, style: 0.2 },
  'C1': { form: 0.2, meaning: 0.25, pragmatics: 0.3, style: 0.25 },
  'C2': { form: 0.15, meaning: 0.25, pragmatics: 0.3, style: 0.3 },
};

/**
 * 기본 평가 층 정의
 */
const DEFAULT_EVALUATION_LAYERS: E3EvaluationLayer[] = [
  {
    layerId: 'form',
    name: 'Form Accuracy',
    weight: 0.3,
    evaluator: 'levenshtein',
    threshold: 0.8,
    feedbackOnFail: 'Check spelling and form.',
  },
  {
    layerId: 'meaning',
    name: 'Semantic Accuracy',
    weight: 0.35,
    evaluator: 'semantic_similarity',
    threshold: 0.7,
    feedbackOnFail: 'The meaning does not match the expected answer.',
  },
  {
    layerId: 'pragmatics',
    name: 'Pragmatic Appropriateness',
    weight: 0.2,
    evaluator: 'pragmatic_check',
    threshold: 0.6,
    feedbackOnFail: 'Consider the context and appropriateness.',
  },
  {
    layerId: 'style',
    name: 'Style/Register',
    weight: 0.15,
    evaluator: 'style_match',
    threshold: 0.5,
    feedbackOnFail: 'Adjust the formality level.',
  },
];

/**
 * 기본 장르 프로파일
 */
const DEFAULT_GENRE_PROFILES: GenreEvaluationProfile[] = [
  {
    profileId: 'academic-essay',
    genre: {
      domain: 'academic',
      format: 'essay',
      formality: 'formal',
      length: 'long',
      purpose: 'inform',
    },
    requiredLayers: DEFAULT_EVALUATION_LAYERS.filter(l =>
      ['form', 'meaning', 'style'].includes(l.layerId)
    ),
    optionalLayers: DEFAULT_EVALUATION_LAYERS.filter(l => l.layerId === 'pragmatics'),
    layerWeights: { form: 0.25, meaning: 0.35, pragmatics: 0.15, style: 0.25 },
    thresholds: { pass: 0.6, merit: 0.75, distinction: 0.9 },
  },
  {
    profileId: 'business-email',
    genre: {
      domain: 'business',
      format: 'email',
      formality: 'formal',
      length: 'medium',
      purpose: 'inform',
    },
    requiredLayers: DEFAULT_EVALUATION_LAYERS,
    optionalLayers: [],
    layerWeights: { form: 0.2, meaning: 0.3, pragmatics: 0.3, style: 0.2 },
    thresholds: { pass: 0.6, merit: 0.75, distinction: 0.88 },
  },
  {
    profileId: 'casual-conversation',
    genre: {
      domain: 'casual',
      format: 'memo',
      formality: 'informal',
      length: 'short',
      purpose: 'inform',
    },
    requiredLayers: DEFAULT_EVALUATION_LAYERS.filter(l =>
      ['meaning', 'pragmatics'].includes(l.layerId)
    ),
    optionalLayers: DEFAULT_EVALUATION_LAYERS.filter(l =>
      ['form', 'style'].includes(l.layerId)
    ),
    layerWeights: { form: 0.15, meaning: 0.35, pragmatics: 0.35, style: 0.15 },
    thresholds: { pass: 0.5, merit: 0.7, distinction: 0.85 },
  },
  {
    profileId: 'technical-manual',
    genre: {
      domain: 'technical',
      format: 'manual',
      formality: 'formal',
      length: 'long',
      purpose: 'instruct',
    },
    requiredLayers: DEFAULT_EVALUATION_LAYERS,
    optionalLayers: [],
    layerWeights: { form: 0.35, meaning: 0.4, pragmatics: 0.1, style: 0.15 },
    thresholds: { pass: 0.7, merit: 0.82, distinction: 0.92 },
  },
];

// =============================================================================
// 평가 유틸리티 함수
// =============================================================================

/**
 * Levenshtein 거리 계산 (편집 거리)
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // 삭제
        dp[i][j - 1] + 1,      // 삽입
        dp[i - 1][j - 1] + cost // 대체
      );
    }
  }

  return dp[m][n];
}

/**
 * 형태 유사도 계산 (Levenshtein 기반)
 */
function computeFormSimilarity(response: string, expected: string): number {
  const r = response.toLowerCase().trim();
  const e = expected.toLowerCase().trim();

  if (r === e) return 1.0;
  if (r.length === 0 || e.length === 0) return 0;

  const distance = levenshteinDistance(r, e);
  const maxLen = Math.max(r.length, e.length);

  return 1 - distance / maxLen;
}

/**
 * 단어 집합 기반 의미 유사도 (Jaccard)
 */
function computeSemanticSimilarity(response: string, expected: string[]): number {
  const responseWords = new Set(
    response.toLowerCase().split(/\s+/).filter(w => w.length > 0)
  );

  let maxSimilarity = 0;

  for (const exp of expected) {
    const expectedWords = new Set(
      exp.toLowerCase().split(/\s+/).filter(w => w.length > 0)
    );

    // Jaccard similarity
    const intersection = new Set([...responseWords].filter(w => expectedWords.has(w)));
    const union = new Set([...responseWords, ...expectedWords]);

    const similarity = union.size > 0 ? intersection.size / union.size : 0;
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  return maxSimilarity;
}

/**
 * 스타일 매칭 점수
 */
function computeStyleScore(
  response: string,
  targetFormality: 'formal' | 'neutral' | 'informal'
): number {
  const formalMarkers = ['therefore', 'hence', 'consequently', 'furthermore', 'moreover'];
  const informalMarkers = ['gonna', 'wanna', 'yeah', 'ok', 'cool', 'like'];

  const words = response.toLowerCase().split(/\s+/);

  let formalCount = 0;
  let informalCount = 0;

  words.forEach(word => {
    if (formalMarkers.some(m => word.includes(m))) formalCount++;
    if (informalMarkers.some(m => word.includes(m))) informalCount++;
  });

  const total = formalCount + informalCount;
  if (total === 0) return targetFormality === 'neutral' ? 1.0 : 0.7;

  const formalRatio = formalCount / total;

  switch (targetFormality) {
    case 'formal':
      return formalRatio;
    case 'informal':
      return 1 - formalRatio;
    case 'neutral':
      return 1 - Math.abs(formalRatio - 0.5) * 2;
    default:
      return 0.5;
  }
}

/**
 * 화용적 적절성 점수 (간단 휴리스틱)
 */
function computePragmaticScore(
  response: string,
  genre: TextGenreClassification
): number {
  let score = 0.7; // 기본 점수

  // 길이 적절성
  const wordCount = response.split(/\s+/).length;
  const expectedLength = genre.length === 'short' ? 20 : genre.length === 'medium' ? 50 : 150;
  const lengthRatio = Math.min(wordCount, expectedLength) / Math.max(wordCount, expectedLength);
  score += lengthRatio * 0.15;

  // 목적 적합성 (간단 키워드 기반)
  const purposeKeywords: Record<string, string[]> = {
    inform: ['is', 'are', 'means', 'refers', 'indicates'],
    persuade: ['should', 'must', 'need', 'important', 'crucial'],
    instruct: ['first', 'then', 'next', 'finally', 'step'],
    entertain: ['funny', 'amazing', 'exciting', 'wonderful'],
  };

  const keywords = purposeKeywords[genre.purpose] || [];
  const hasKeyword = keywords.some(kw => response.toLowerCase().includes(kw));
  if (hasKeyword) score += 0.15;

  return Math.min(1.0, score);
}

// =============================================================================
// 장르 감지
// =============================================================================

/**
 * 텍스트 장르 자동 감지
 */
function detectGenre(text: string): TextGenreClassification {
  const wordCount = text.split(/\s+/).length;
  const lower = text.toLowerCase();

  // 길이 감지
  let length: 'short' | 'medium' | 'long';
  if (wordCount < 30) length = 'short';
  else if (wordCount < 100) length = 'medium';
  else length = 'long';

  // 격식 수준 감지
  const formalIndicators = ['furthermore', 'therefore', 'consequently', 'hereby'];
  const informalIndicators = ['gonna', 'wanna', 'lol', 'btw', 'omg'];

  let formality: 'formal' | 'neutral' | 'informal';
  const hasFormal = formalIndicators.some(ind => lower.includes(ind));
  const hasInformal = informalIndicators.some(ind => lower.includes(ind));

  if (hasFormal && !hasInformal) formality = 'formal';
  else if (hasInformal && !hasFormal) formality = 'informal';
  else formality = 'neutral';

  // 도메인 감지 (간단 키워드 기반)
  let domain: string = 'casual';
  const domainKeywords: Record<string, string[]> = {
    academic: ['research', 'study', 'hypothesis', 'methodology', 'analysis'],
    business: ['revenue', 'stakeholder', 'quarterly', 'ROI', 'KPI'],
    technical: ['implementation', 'algorithm', 'configuration', 'system'],
    creative: ['imagine', 'story', 'character', 'scene'],
  };

  for (const [d, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      domain = d;
      break;
    }
  }

  // 포맷 감지
  let format: string = 'memo';
  if (lower.includes('dear') || lower.includes('sincerely')) format = 'email';
  else if (lower.includes('introduction') || lower.includes('conclusion')) format = 'essay';
  else if (lower.includes('step 1') || lower.includes('instructions')) format = 'manual';

  // 목적 감지
  let purpose: string = 'inform';
  if (lower.includes('should') || lower.includes('must')) purpose = 'persuade';
  else if (lower.includes('step') || lower.includes('first')) purpose = 'instruct';

  return { domain, format, formality, length, purpose };
}

/**
 * 장르에 맞는 프로파일 찾기
 */
function findMatchingProfile(
  genre: TextGenreClassification,
  profiles: GenreEvaluationProfile[]
): GenreEvaluationProfile | undefined {
  // 정확한 매칭 시도
  const exactMatch = profiles.find(p =>
    p.genre.domain === genre.domain &&
    p.genre.formality === genre.formality
  );

  if (exactMatch) return exactMatch;

  // 부분 매칭 (도메인 우선)
  const domainMatch = profiles.find(p => p.genre.domain === genre.domain);
  if (domainMatch) return domainMatch;

  // 격식 수준 매칭
  const formalityMatch = profiles.find(p => p.genre.formality === genre.formality);
  if (formalityMatch) return formalityMatch;

  // 기본 프로파일
  return profiles[0];
}

// =============================================================================
// E3 엔진 구현
// =============================================================================

/**
 * FlexibleEvaluationEngine 구현
 *
 * 장르 적응형 다차원 평가 시스템
 */
export class FlexibleEvaluationEngine implements BaseEngine<
  EvaluationEngineConfig,
  AdaptiveEvaluationInput,
  AdaptiveEvaluationResult
> {
  readonly engineId = 'e3-evaluation';
  readonly version = '1.0.0';

  private _config: EvaluationEngineConfig;

  constructor(config?: Partial<EvaluationEngineConfig>) {
    this._config = {
      defaultMode: 'partial_credit',
      defaultThreshold: 0.6,
      strictness: 'normal',
      genreProfiles: DEFAULT_GENRE_PROFILES,
      autoDetectGenre: true,
      ...config,
    };
  }

  get config(): EvaluationEngineConfig {
    return { ...this._config };
  }

  updateConfig(config: Partial<EvaluationEngineConfig>): void {
    this._config = { ...this._config, ...config };
  }

  reset(): void {
    // Stateless engine
  }

  // ---------------------------------------------------------------------------
  // 메인 평가 함수
  // ---------------------------------------------------------------------------

  /**
   * 적응형 평가 수행
   */
  process(input: AdaptiveEvaluationInput): AdaptiveEvaluationResult {
    const startTime = performance.now();

    // 장르 결정 (명시적 또는 자동 감지)
    const genre = input.genre ||
      (this._config.autoDetectGenre ? detectGenre(input.response) : undefined);

    // 프로파일 매칭
    const profile = genre
      ? findMatchingProfile(genre, this._config.genreProfiles)
      : undefined;

    // CEFR 수준별 가중치 조정
    const baseWeights = profile?.layerWeights || { form: 0.3, meaning: 0.35, pragmatics: 0.2, style: 0.15 };
    const levelAdjustment = input.learnerLevel
      ? CEFR_LAYER_WEIGHTS[input.learnerLevel]
      : undefined;

    const adaptedWeights = levelAdjustment
      ? this.blendWeights(baseWeights, levelAdjustment)
      : baseWeights;

    // 평가 층 결정
    const layers = profile?.requiredLayers || DEFAULT_EVALUATION_LAYERS;

    // 각 층별 평가 수행
    const layerResults = this.evaluateLayers(
      input.response,
      input.expected,
      layers,
      adaptedWeights,
      genre
    );

    // 종합 점수 계산
    const compositeScore = layerResults.reduce(
      (sum, lr) => sum + lr.score * lr.weight,
      0
    );

    // 합격 여부 판정
    const threshold = profile?.thresholds.pass || this._config.defaultThreshold;
    const overallCorrect = compositeScore >= threshold;

    // 등급 결정
    let grade: string;
    if (profile) {
      if (compositeScore >= profile.thresholds.distinction) grade = 'distinction';
      else if (compositeScore >= profile.thresholds.merit) grade = 'merit';
      else if (compositeScore >= profile.thresholds.pass) grade = 'pass';
      else grade = 'fail';
    } else {
      grade = overallCorrect ? 'pass' : 'fail';
    }

    // 피드백 생성
    const feedback = this.generateFeedback(layerResults, grade, input.learnerLevel);

    // 컴포넌트 평가 (요청된 경우)
    const componentEvaluations: E3ComponentEvaluation[] = input.evaluateComponents
      ? this.evaluateComponents(input.response, input.expected, input.evaluateComponents)
      : [];

    const processingTimeMs = performance.now() - startTime;

    return {
      // MultiComponentEvaluation 필드
      overallCorrect,
      compositeScore,
      componentEvaluations: componentEvaluations.map(ce => ({
        objectId: ce.objectId,
        componentType: ce.componentType,
        correct: ce.isCorrect,
        partialCredit: ce.partialCredit,
        feedback: ce.feedback,
      })),
      feedback,
      explanation: `Grade: ${grade}. Composite score: ${(compositeScore * 100).toFixed(1)}%`,

      // 확장 필드
      usedProfile: profile,
      adaptedWeights,
      layerResults,

      metadata: {
        processingTimeMs,
        confidence: this.calculateConfidence(input.response, input.expected),
        method: profile ? `genre-adaptive-${profile.profileId}` : 'default-multilayer',
        warnings: genre ? [] : ['Genre auto-detection was disabled or failed'],
      },
    };
  }

  /**
   * 배치 평가
   */
  processBatch(inputs: AdaptiveEvaluationInput[]): AdaptiveEvaluationResult[] {
    return inputs.map(input => this.process(input));
  }

  // ---------------------------------------------------------------------------
  // 고급 평가 함수
  // ---------------------------------------------------------------------------

  /**
   * 루브릭 기반 상세 평가
   */
  evaluateWithRubric(
    response: string,
    rubric: Array<{
      criterion: string;
      maxScore: number;
      descriptors: Array<{ score: number; description: string }>;
    }>
  ): {
    totalScore: number;
    maxPossible: number;
    percentage: number;
    criterionScores: Array<{
      criterion: string;
      score: number;
      maxScore: number;
      matchedDescriptor: string;
    }>;
  } {
    const criterionScores: Array<{
      criterion: string;
      score: number;
      maxScore: number;
      matchedDescriptor: string;
    }> = [];

    let totalScore = 0;
    let maxPossible = 0;

    for (const criterion of rubric) {
      maxPossible += criterion.maxScore;

      // 간단한 휴리스틱: 응답 길이와 키워드 기반 점수 추정
      const words = response.toLowerCase().split(/\s+/);
      const criterionKeywords = criterion.criterion.toLowerCase().split(/\s+/);
      const keywordMatches = criterionKeywords.filter(kw =>
        words.some(w => w.includes(kw))
      ).length;

      // 키워드 매칭 비율로 점수 추정
      const matchRatio = keywordMatches / Math.max(1, criterionKeywords.length);
      const estimatedScore = Math.round(matchRatio * criterion.maxScore);

      // 해당 점수에 맞는 디스크립터 찾기
      const sortedDescriptors = [...criterion.descriptors].sort((a, b) => b.score - a.score);
      const matchedDescriptor = sortedDescriptors.find(d => d.score <= estimatedScore)
        || sortedDescriptors[sortedDescriptors.length - 1];

      criterionScores.push({
        criterion: criterion.criterion,
        score: estimatedScore,
        maxScore: criterion.maxScore,
        matchedDescriptor: matchedDescriptor?.description || 'No descriptor',
      });

      totalScore += estimatedScore;
    }

    return {
      totalScore,
      maxPossible,
      percentage: maxPossible > 0 ? totalScore / maxPossible : 0,
      criterionScores,
    };
  }

  /**
   * 장르 프로파일 추가
   */
  addGenreProfile(profile: GenreEvaluationProfile): void {
    // 기존 프로파일 대체 또는 추가
    const existingIndex = this._config.genreProfiles.findIndex(
      p => p.profileId === profile.profileId
    );

    if (existingIndex >= 0) {
      this._config.genreProfiles[existingIndex] = profile;
    } else {
      this._config.genreProfiles.push(profile);
    }
  }

  /**
   * 장르 프로파일 목록 조회
   */
  getGenreProfiles(): GenreEvaluationProfile[] {
    return [...this._config.genreProfiles];
  }

  // ---------------------------------------------------------------------------
  // 헬퍼 메서드
  // ---------------------------------------------------------------------------

  private evaluateLayers(
    response: string,
    expected: string[],
    layers: E3EvaluationLayer[],
    weights: Record<string, number>,
    genre?: TextGenreClassification
  ): Array<{
    layerId: string;
    name: string;
    score: number;
    weight: number;
    feedback: string;
    contributionToTotal: number;
  }> {
    const results: Array<{
      layerId: string;
      name: string;
      score: number;
      weight: number;
      feedback: string;
      contributionToTotal: number;
    }> = [];

    // 총 가중치 정규화
    const totalWeight = layers.reduce((sum, l) => sum + (weights[l.layerId] || l.weight), 0);

    for (const layer of layers) {
      let score: number;

      switch (layer.layerId) {
        case 'form':
          score = Math.max(...expected.map(exp => computeFormSimilarity(response, exp)));
          break;

        case 'meaning':
          score = computeSemanticSimilarity(response, expected);
          break;

        case 'pragmatics':
          score = genre ? computePragmaticScore(response, genre) : 0.5;
          break;

        case 'style':
          score = genre ? computeStyleScore(response, genre.formality) : 0.5;
          break;

        default:
          score = 0.5; // 알 수 없는 층
      }

      const weight = (weights[layer.layerId] || layer.weight) / totalWeight;
      const passed = score >= (layer.threshold || 0.5);

      results.push({
        layerId: layer.layerId,
        name: layer.name,
        score,
        weight,
        feedback: passed ? 'Good' : (layer.feedbackOnFail || 'Needs improvement'),
        contributionToTotal: score * weight,
      });
    }

    return results;
  }

  private evaluateComponents(
    response: string,
    expected: string[],
    components: ComponentCode[]
  ): E3ComponentEvaluation[] {
    // 간단한 구현: 각 컴포넌트에 대해 동일한 평가 수행
    return components.map(componentType => ({
      objectId: 'response',
      componentType,
      isCorrect: expected.some(exp =>
        computeFormSimilarity(response, exp) > 0.8
      ),
      partialCredit: Math.max(...expected.map(exp =>
        computeFormSimilarity(response, exp)
      )),
      feedback: 'Component evaluation',
    }));
  }

  private blendWeights(
    base: Record<string, number>,
    adjustment: Record<string, number>
  ): Record<string, number> {
    const blended: Record<string, number> = {};

    const allKeys = new Set([...Object.keys(base), ...Object.keys(adjustment)]);

    for (const key of allKeys) {
      const baseWeight = base[key] || 0;
      const adjWeight = adjustment[key] || 0;
      // 50:50 블렌딩
      blended[key] = (baseWeight + adjWeight) / 2;
    }

    // 정규화
    const total = Object.values(blended).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      for (const key of Object.keys(blended)) {
        blended[key] /= total;
      }
    }

    return blended;
  }

  private generateFeedback(
    layerResults: Array<{ layerId: string; score: number; feedback: string }>,
    grade: string,
    learnerLevel?: string
  ): string {
    const weakLayers = layerResults
      .filter(lr => lr.score < 0.6)
      .map(lr => lr.feedback);

    if (grade === 'distinction') {
      return 'Excellent! Your response demonstrates mastery across all evaluation criteria.';
    }

    if (grade === 'merit') {
      return 'Good work! ' + (weakLayers.length > 0
        ? `Consider improving: ${weakLayers.join('; ')}`
        : 'Minor refinements could make it even better.');
    }

    if (grade === 'pass') {
      return 'Acceptable response. ' + (weakLayers.length > 0
        ? `Areas to focus on: ${weakLayers.join('; ')}`
        : 'Continue practicing for improvement.');
    }

    // Fail
    const priorityFeedback = weakLayers.slice(0, 2).join('; ');
    const levelAdvice = learnerLevel && ['A1', 'A2'].includes(learnerLevel)
      ? ' Focus on basic form and meaning first.'
      : ' Review the requirements and try again.';

    return `Not quite there yet. ${priorityFeedback || 'Review all criteria.'}${levelAdvice}`;
  }

  private calculateConfidence(response: string, expected: string[]): number {
    // 응답 길이와 기대 답변 수에 기반한 신뢰도
    const responseLength = response.split(/\s+/).length;
    const expectedAvgLength = expected.reduce(
      (sum, e) => sum + e.split(/\s+/).length, 0
    ) / expected.length;

    // 길이가 비슷할수록 신뢰도 높음
    const lengthRatio = Math.min(responseLength, expectedAvgLength) /
      Math.max(responseLength, expectedAvgLength);

    return 0.5 + lengthRatio * 0.5;
  }
}

// =============================================================================
// 팩토리 함수
// =============================================================================

/**
 * E3 엔진 인스턴스 생성
 */
export function createEvaluationEngine(
  config?: Partial<EvaluationEngineConfig>
): FlexibleEvaluationEngine {
  return new FlexibleEvaluationEngine(config);
}

// =============================================================================
// 유틸리티 함수 (외부 노출)
// =============================================================================

/**
 * 빠른 형태 평가
 */
export function quickFormEvaluation(
  response: string,
  expected: string[]
): { score: number; bestMatch: string; isExact: boolean } {
  let bestScore = 0;
  let bestMatch = expected[0] || '';

  for (const exp of expected) {
    const score = computeFormSimilarity(response, exp);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = exp;
    }
  }

  return {
    score: bestScore,
    bestMatch,
    isExact: bestScore === 1.0,
  };
}

/**
 * 텍스트 장르 감지 (외부 노출)
 */
export function detectTextGenre(text: string): TextGenreClassification {
  return detectGenre(text);
}

/**
 * 기본 평가 층 목록 조회
 */
export function getDefaultEvaluationLayers(): E3EvaluationLayer[] {
  return [...DEFAULT_EVALUATION_LAYERS];
}
