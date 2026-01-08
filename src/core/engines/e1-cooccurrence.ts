/**
 * E1: UniversalCooccurrenceEngine
 *
 * 범용 공출현 분석 엔진 - 28가지 객체 쌍 유형 지원
 *
 * 학술적 근거:
 * - PMI와 연어 지식 연구 (Frontiers in Psychology, 2024)
 *   - MI score > 3은 강한 연어 관계
 *   - 숙련도가 높은 학습자일수록 강하게 연관된 연어 사용
 * - 어휘-문법 통합 (Halliday의 체계기능언어학)
 *   - 어휘와 문법은 상호 의존적
 *   - 구절 복잡성이 고급 수준을 변별
 *
 * 기존 코드 활용:
 * - src/core/pmi.ts: PMICalculator 클래스 직접 사용
 * - src/core/types.ts: PMIResult, ObjectUsageSpace, UsageContext
 * - src/main/services/pmi.service.ts: 캐싱 레이어
 *
 * 새로운 기능:
 * - 7가지 객체 유형 간 28가지 쌍 조합 지원
 * - 6가지 관계 유형 (lexical, morphological, syntactic, phonological, pragmatic, semantic)
 * - UsageSpace 확장 추천
 */

import { PMICalculator } from '../pmi';
import type { LanguageObjectType, UsageContext } from '../types';
import type {
  BaseEngine,
  CooccurrenceInput,
  CooccurrenceResult,
  CooccurrenceEngineConfig,
  CooccurrenceObjectType,
  CooccurrenceRelationType,
  ObjectPairType,
  UsageSpaceExpansionRecommendation,
} from './types';

// =============================================================================
// 상수 및 헬퍼
// =============================================================================

/**
 * 객체 유형별 관계 유형 자동 추론 매핑
 */
const RELATION_TYPE_INFERENCE: Record<string, CooccurrenceRelationType> = {
  // 동종 쌍
  'LEX-LEX': 'lexical',
  'MWE-MWE': 'lexical',
  'TERM-TERM': 'lexical',
  'MORPH-MORPH': 'morphological',
  'G2P-G2P': 'phonological',
  'SYNT-SYNT': 'syntactic',
  'PRAG-PRAG': 'pragmatic',

  // 이종 쌍 (주요 조합)
  'LEX-MWE': 'lexical',
  'LEX-TERM': 'semantic',
  'LEX-MORPH': 'morphological',
  'LEX-G2P': 'phonological',
  'LEX-SYNT': 'syntactic',
  'LEX-PRAG': 'pragmatic',

  'MWE-SYNT': 'syntactic',
  'MWE-PRAG': 'pragmatic',

  'MORPH-LEX': 'morphological',
  'MORPH-SYNT': 'syntactic',

  'G2P-PHON': 'phonological',

  'SYNT-PRAG': 'pragmatic',
};

/**
 * 객체 쌍 키 생성 (순서 무관)
 */
function makePairKey(type1: CooccurrenceObjectType, type2: CooccurrenceObjectType): string {
  const sorted = [type1, type2].sort();
  return `${sorted[0]}-${sorted[1]}`;
}

/**
 * 관계 유형 자동 추론
 */
function inferRelationType(
  type1: CooccurrenceObjectType,
  type2: CooccurrenceObjectType
): CooccurrenceRelationType {
  const key = makePairKey(type1, type2);
  return RELATION_TYPE_INFERENCE[key] || 'semantic'; // 기본값: semantic
}

// =============================================================================
// E1 엔진 구현
// =============================================================================

/**
 * UniversalCooccurrenceEngine 구현
 *
 * 기존 PMICalculator를 래핑하여 모든 객체 유형 지원
 */
export class UniversalCooccurrenceEngine implements BaseEngine<
  CooccurrenceEngineConfig,
  CooccurrenceInput,
  CooccurrenceResult
> {
  readonly engineId = 'e1-cooccurrence';
  readonly version = '1.0.0';

  private _config: CooccurrenceEngineConfig;

  /**
   * 객체 유형별 PMI 계산기 캐시
   * - 동일 유형 쌍은 공유
   * - 이종 쌍은 별도 인스턴스
   */
  private calculatorCache: Map<string, PMICalculator> = new Map();

  /**
   * 계산된 공출현 결과 캐시
   */
  private resultCache: Map<string, CooccurrenceResult> = new Map();

  constructor(config?: Partial<CooccurrenceEngineConfig>) {
    this._config = {
      windowSize: 5,
      minCooccurrence: 2,
      significanceThreshold: 3.84, // p < 0.05
      ...config,
    };
  }

  get config(): CooccurrenceEngineConfig {
    return { ...this._config };
  }

  updateConfig(config: Partial<CooccurrenceEngineConfig>): void {
    this._config = { ...this._config, ...config };
    // 설정 변경 시 캐시 클리어
    this.resultCache.clear();
  }

  reset(): void {
    this.calculatorCache.clear();
    this.resultCache.clear();
  }

  // ---------------------------------------------------------------------------
  // 메인 처리 함수
  // ---------------------------------------------------------------------------

  /**
   * 단일 공출현 분석
   */
  process(input: CooccurrenceInput): CooccurrenceResult {
    const startTime = performance.now();

    // 캐시 확인
    const cacheKey = this.makeCacheKey(input);
    const cached = this.resultCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 객체 쌍 유형 결정
    const pairType: ObjectPairType = {
      type1: input.object1.type,
      type2: input.object2.type,
    };

    // 관계 유형 결정 (명시적 또는 자동 추론)
    const relationType = input.relationType ||
      inferRelationType(input.object1.type, input.object2.type);

    // PMI 계산기 가져오기 또는 생성
    const calculator = this.getOrCreateCalculator(pairType);

    // PMI 계산 (기존 PMICalculator 활용)
    const pmiResult = calculator.computePMI(
      input.object1.content,
      input.object2.content
    );

    // 결과 생성
    const processingTimeMs = performance.now() - startTime;

    const result: CooccurrenceResult = {
      // 기존 PMIResult 필드
      pmi: pmiResult?.pmi ?? 0,
      npmi: pmiResult?.npmi ?? 0,
      cooccurrence: pmiResult?.cooccurrence ?? 0,
      significance: pmiResult?.significance ?? 0,

      // 확장 필드
      object1Id: input.object1.id,
      object2Id: input.object2.id,
      pairType,
      relationType,
      relationStrength: pmiResult?.npmi ?? 0, // NPMI를 관계 강도로 사용

      // UsageSpace 통합 (컨텍스트가 제공된 경우)
      observedContexts: input.context ? [input.context as UsageContext] : undefined,
      sharedUsageContexts: undefined, // 배치 처리에서 계산

      // 메타데이터
      metadata: {
        processingTimeMs,
        confidence: this.calculateConfidence(pmiResult?.significance ?? 0),
        method: `pmi-${relationType}`,
        warnings: pmiResult ? undefined : ['No co-occurrence data found'],
      },
    };

    // 캐시 저장
    this.resultCache.set(cacheKey, result);

    return result;
  }

  /**
   * 배치 공출현 분석
   */
  processBatch(inputs: CooccurrenceInput[]): CooccurrenceResult[] {
    return inputs.map(input => this.process(input));
  }

  // ---------------------------------------------------------------------------
  // UsageSpace 통합 기능
  // ---------------------------------------------------------------------------

  /**
   * UsageSpace 확장 추천 생성
   *
   * 대상 객체와 강하게 공출현하는 객체들을 추천
   * - 함께 학습 시 전이 효과 기대
   * - UsageSpace.expansionCandidates 계산에 활용
   */
  getExpansionRecommendations(
    targetObjectId: string,
    targetObjectType: CooccurrenceObjectType,
    candidateObjects: Array<{
      id: string;
      type: CooccurrenceObjectType;
      content: string;
    }>,
    maxRecommendations: number = 10
  ): UsageSpaceExpansionRecommendation {
    // 모든 후보와의 공출현 계산
    const cooccurrenceResults: Array<{
      objectId: string;
      objectType: CooccurrenceObjectType;
      result: CooccurrenceResult;
    }> = [];

    for (const candidate of candidateObjects) {
      if (candidate.id === targetObjectId) continue;

      const result = this.process({
        object1: {
          type: targetObjectType,
          id: targetObjectId,
          content: '', // 이미 인덱싱된 경우 content 불필요
        },
        object2: candidate,
      });

      if (result.significance >= this._config.significanceThreshold) {
        cooccurrenceResults.push({
          objectId: candidate.id,
          objectType: candidate.type,
          result,
        });
      }
    }

    // 관계 강도로 정렬
    cooccurrenceResults.sort((a, b) => b.result.relationStrength - a.result.relationStrength);

    // 상위 N개 추천
    const topResults = cooccurrenceResults.slice(0, maxRecommendations);

    return {
      targetObjectId,
      recommendedCooccurrences: topResults.map(r => ({
        objectId: r.objectId,
        objectType: r.objectType,
        relationStrength: r.result.relationStrength,
        relationType: r.result.relationType,
        expectedTransferBenefit: this.estimateTransferBenefit(r.result),
        reason: this.generateRecommendationReason(r.result),
      })),
      recommendedNewContexts: [], // 별도 UsageSpace 서비스에서 계산
    };
  }

  // ---------------------------------------------------------------------------
  // 코퍼스 인덱싱 (기존 PMICalculator 위임)
  // ---------------------------------------------------------------------------

  /**
   * 코퍼스 인덱싱
   *
   * 객체 유형별로 별도 인덱싱
   */
  indexCorpus(
    objectType: CooccurrenceObjectType,
    tokens: string[]
  ): void {
    const calculator = this.getOrCreateCalculator({
      type1: objectType,
      type2: objectType,
    });
    calculator.indexCorpus(tokens);
  }

  /**
   * 이종 쌍 코퍼스 인덱싱
   *
   * 두 객체 유형 간의 공출현을 위한 인덱싱
   */
  indexHeterogeneousCorpus(
    type1: CooccurrenceObjectType,
    type2: CooccurrenceObjectType,
    tokens1: string[],
    tokens2: string[]
  ): void {
    // 이종 쌍의 경우 교차 인덱싱 필요
    // 두 토큰 배열을 인터리빙하여 공출현 계산
    const interleavedTokens: string[] = [];
    const maxLen = Math.max(tokens1.length, tokens2.length);

    for (let i = 0; i < maxLen; i++) {
      if (i < tokens1.length) interleavedTokens.push(tokens1[i]);
      if (i < tokens2.length) interleavedTokens.push(tokens2[i]);
    }

    const calculator = this.getOrCreateCalculator({ type1, type2 });
    calculator.indexCorpus(interleavedTokens);
  }

  // ---------------------------------------------------------------------------
  // 헬퍼 메서드
  // ---------------------------------------------------------------------------

  private getOrCreateCalculator(pairType: ObjectPairType): PMICalculator {
    const key = makePairKey(pairType.type1, pairType.type2);

    if (!this.calculatorCache.has(key)) {
      this.calculatorCache.set(key, new PMICalculator(this._config.windowSize));
    }

    return this.calculatorCache.get(key)!;
  }

  private makeCacheKey(input: CooccurrenceInput): string {
    return `${input.object1.id}|${input.object2.id}|${input.relationType || 'auto'}`;
  }

  private calculateConfidence(significance: number): number {
    // Log-likelihood ratio를 신뢰도로 변환
    // LLR > 10.83 → p < 0.001 → 높은 신뢰도
    if (significance >= 10.83) return 0.99;
    if (significance >= 6.63) return 0.95;  // p < 0.01
    if (significance >= 3.84) return 0.90;  // p < 0.05
    return 0.5 + (significance / 7.68) * 0.4; // 선형 보간
  }

  private estimateTransferBenefit(result: CooccurrenceResult): number {
    // 전이 효과 추정 (학술적 근거 기반 휴리스틱)
    // - 강한 공출현 → 함께 학습 시 상호 강화
    // - 관계 유형에 따른 가중치
    const relationWeights: Record<CooccurrenceRelationType, number> = {
      morphological: 0.9,  // 형태론적 관계는 전이 효과 큼
      lexical: 0.8,        // 어휘적 공출현도 높음
      syntactic: 0.7,      // 통사적 관계
      semantic: 0.6,       // 의미적 관계
      phonological: 0.5,   // 음운론적 관계
      pragmatic: 0.4,      // 화용적 관계는 맥락 의존적
    };

    const relationWeight = relationWeights[result.relationType] || 0.5;
    const strengthFactor = Math.max(0, result.relationStrength); // NPMI는 -1~1

    return relationWeight * strengthFactor;
  }

  private generateRecommendationReason(result: CooccurrenceResult): string {
    const strength = result.relationStrength;
    const relationType = result.relationType;

    if (strength > 0.7) {
      return `Strong ${relationType} co-occurrence (NPMI=${strength.toFixed(2)}). Learning together is highly recommended.`;
    } else if (strength > 0.4) {
      return `Moderate ${relationType} co-occurrence (NPMI=${strength.toFixed(2)}). May benefit from joint practice.`;
    } else {
      return `Weak ${relationType} co-occurrence (NPMI=${strength.toFixed(2)}). Consider for variety.`;
    }
  }
}

// =============================================================================
// 팩토리 함수
// =============================================================================

/**
 * E1 엔진 인스턴스 생성
 */
export function createCooccurrenceEngine(
  config?: Partial<CooccurrenceEngineConfig>
): UniversalCooccurrenceEngine {
  return new UniversalCooccurrenceEngine(config);
}

// =============================================================================
// 유틸리티 함수 (외부 노출)
// =============================================================================

/**
 * 28가지 객체 쌍 유형 목록 생성
 */
export function getAllObjectPairTypes(): ObjectPairType[] {
  const types: LanguageObjectType[] = ['LEX', 'MWE', 'TERM', 'MORPH', 'G2P', 'SYNT', 'PRAG'];
  const pairs: ObjectPairType[] = [];

  for (let i = 0; i < types.length; i++) {
    for (let j = i; j < types.length; j++) {
      pairs.push({ type1: types[i], type2: types[j] });
    }
  }

  return pairs; // 7 동종 + 21 이종 = 28
}

/**
 * 객체 쌍이 동종인지 확인
 */
export function isHomogeneousPair(pairType: ObjectPairType): boolean {
  return pairType.type1 === pairType.type2;
}
