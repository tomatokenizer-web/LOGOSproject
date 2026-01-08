/**
 * E5: SessionOptimizer
 *
 * 세션 수준 학습 최적화 엔진 - FSRS + 인터리빙 + 인지 부하 관리
 *
 * 학술적 근거:
 * - FSRS-4 알고리즘: 망각 곡선 기반 최적 복습 스케줄링
 * - 인터리빙 효과 (Rohrer & Taylor, 2007):
 *   - 블로킹보다 인터리빙이 장기 보존에 효과적
 *   - 단, 초보자는 블로킹이 더 효과적일 수 있음
 * - 인지 부하 이론 (Sweller, 1988):
 *   - Miller's 7±2: 작업 기억 용량 제한
 *   - 세션 내 항목 배치로 인지 부하 관리
 * - 간격 효과 (Cepeda et al., 2006):
 *   - 최적 간격은 목표 보존 기간의 함수
 *
 * 기존 코드 활용:
 * - src/core/fsrs.ts: FSRS, FSRSCard, MasteryState
 * - src/core/priority.ts: PriorityCalculation, buildLearningQueue
 * - src/core/types.ts: SessionConfig, SessionState
 *
 * 새로운 기능:
 * - 5가지 인터리빙 전략 지원
 * - 인지 부하 기반 항목 배치
 * - 휴식 시점 자동 권장
 * - 세션 효율성 예측
 */

import type {
  BaseEngine,
  SessionEngineConfig,
  SessionOptimizationInput,
  SessionOptimizationResult,
  InterleavingStrategy,
  SessionItemPlacement,
} from './types';

import type { FSRSCard } from '../fsrs';
import { FSRS } from '../fsrs';
import type { LanguageObjectType } from '../types';

// =============================================================================
// 상수 및 설정
// =============================================================================

/**
 * 인지 부하 추정 기준
 */
const COGNITIVE_LOAD_FACTORS = {
  // 객체 유형별 기본 인지 부하
  typeLoad: {
    'LEX': 2,      // 어휘: 낮음
    'MWE': 4,      // 다단어 표현: 중간
    'TERM': 3,     // 용어: 낮음-중간
    'MORPH': 5,    // 형태소: 중간-높음
    'G2P': 4,      // 자소-음소: 중간
    'SYNT': 6,     // 통사: 높음
    'PRAG': 7,     // 화용: 높음
  } as Record<LanguageObjectType, number>,

  // 숙달 단계별 조정
  masteryAdjustment: {
    0: 1.5,   // 새 항목: 높은 부하
    1: 1.3,   // 학습 중: 높은 부하
    2: 1.0,   // 연습 중: 기본 부하
    3: 0.8,   // 숙달 중: 낮은 부하
    4: 0.5,   // 자동화: 매우 낮은 부하
  } as Record<number, number>,

  // 연속 동일 유형 페널티
  consecutivePenalty: 0.3,
};

/**
 * 인터리빙 전략별 설정
 */
const INTERLEAVING_CONFIGS: Record<InterleavingStrategy, {
  description: string;
  minTypesBetween: number;
  allowConsecutiveSame: boolean;
  blockSize: number;
}> = {
  'pure_blocking': {
    description: 'Same type items together (AAA BBB CCC)',
    minTypesBetween: 0,
    allowConsecutiveSame: true,
    blockSize: 999,
  },
  'pure_interleaving': {
    description: 'Maximum mixing (ABC ABC ABC)',
    minTypesBetween: 2,
    allowConsecutiveSame: false,
    blockSize: 1,
  },
  'hybrid': {
    description: 'Initial blocking, then interleaving',
    minTypesBetween: 1,
    allowConsecutiveSame: true,
    blockSize: 3,
  },
  'related': {
    description: 'Interleave related items',
    minTypesBetween: 1,
    allowConsecutiveSame: false,
    blockSize: 2,
  },
  'adaptive': {
    description: 'Adjust based on learner state',
    minTypesBetween: 1,
    allowConsecutiveSame: true,
    blockSize: 2,
  },
};

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 항목의 인지 부하 계산
 */
function calculateCognitiveLoad(
  type: LanguageObjectType,
  masteryStage: number,
  previousType?: LanguageObjectType
): number {
  const baseLoad = COGNITIVE_LOAD_FACTORS.typeLoad[type] || 3;
  const masteryMultiplier = COGNITIVE_LOAD_FACTORS.masteryAdjustment[masteryStage] || 1;

  let load = baseLoad * masteryMultiplier;

  // 연속 동일 유형 페널티
  if (previousType && previousType === type) {
    load += COGNITIVE_LOAD_FACTORS.consecutivePenalty;
  }

  return Math.min(10, Math.max(1, load));
}

/**
 * FSRS 기반 복습 우선순위 계산
 */
function calculateFSRSPriority(
  card: FSRSCard,
  now: Date
): number {
  const fsrs = new FSRS();
  const retrievability = fsrs.retrievability(card, now);

  // 기억 확률이 낮을수록 높은 우선순위
  // 목표 보존율(0.9) 근처에서 복습이 필요
  const urgency = 1 - retrievability;

  // 안정성이 낮으면 더 자주 복습 필요
  const stabilityFactor = 1 / (1 + card.stability / 30);

  return urgency * 0.7 + stabilityFactor * 0.3;
}

/**
 * 두 항목의 관련성 계산
 */
function calculateRelatedness(
  item1: { type: LanguageObjectType },
  item2: { type: LanguageObjectType }
): number {
  // 같은 유형: 높은 관련성
  if (item1.type === item2.type) return 1.0;

  // 언어학적 관계 매트릭스
  const relatedPairs: Record<string, string[]> = {
    'LEX': ['MWE', 'TERM', 'MORPH'],
    'MWE': ['LEX', 'SYNT', 'PRAG'],
    'MORPH': ['LEX', 'G2P'],
    'G2P': ['MORPH', 'LEX'],
    'SYNT': ['MWE', 'PRAG'],
    'PRAG': ['SYNT', 'MWE'],
    'TERM': ['LEX', 'MWE'],
  };

  const related = relatedPairs[item1.type] || [];
  if (related.includes(item2.type)) return 0.5;

  return 0.1; // 낮은 관련성
}

// =============================================================================
// E5 엔진 구현
// =============================================================================

/**
 * SessionOptimizer 구현
 *
 * 세션 수준 학습 최적화
 */
export class SessionOptimizer implements BaseEngine<
  SessionEngineConfig,
  SessionOptimizationInput,
  SessionOptimizationResult
> {
  readonly engineId = 'e5-session';
  readonly version = '1.0.0';

  private _config: SessionEngineConfig;
  // FSRS 인스턴스 - 추후 직접 스케줄링 계산에 활용 예정
  private _fsrs: FSRS;

  constructor(config?: Partial<SessionEngineConfig>) {
    this._config = {
      maxCognitiveLoad: 7,
      breakIntervalMinutes: 25,
      defaultStrategy: 'adaptive',
      levelStrategyMap: {
        'A1': 'pure_blocking',
        'A2': 'hybrid',
        'B1': 'hybrid',
        'B2': 'related',
        'C1': 'pure_interleaving',
        'C2': 'pure_interleaving',
      },
      targetRetention: 0.9,
      ...config,
    };

    this._fsrs = new FSRS({ requestRetention: this._config.targetRetention });
  }

  get config(): SessionEngineConfig {
    return { ...this._config };
  }

  /** FSRS 인스턴스 접근자 - 외부에서 직접 스케줄링 계산 필요시 사용 */
  get fsrsInstance(): FSRS {
    return this._fsrs;
  }

  updateConfig(config: Partial<SessionEngineConfig>): void {
    this._config = { ...this._config, ...config };
    this._fsrs = new FSRS({ requestRetention: this._config.targetRetention });
  }

  reset(): void {
    // Stateless engine
  }

  // ---------------------------------------------------------------------------
  // 메인 처리 함수
  // ---------------------------------------------------------------------------

  /**
   * 세션 최적화 수행
   */
  process(input: SessionOptimizationInput): SessionOptimizationResult {
    const startTime = performance.now();
    const now = new Date();

    // 인터리빙 전략 결정
    const appliedStrategy = this.determineStrategy(input);

    // 후보 항목 필터링 및 점수화
    const scoredItems = this.scoreItems(input.candidateItems, input.learnerState, now);

    // 제외 항목 식별
    const { included, excluded } = this.filterItems(
      scoredItems,
      input.sessionConfig.maxItems,
      input.learnerState
    );

    // 최적 순서 생성
    const optimizedSequence = this.optimizeSequence(
      included,
      appliedStrategy,
      input.learnerState
    );

    // 휴식 시점 계산
    const recommendedBreaks = this.calculateBreaks(
      optimizedSequence,
      input.learnerState.sessionMinutes
    );

    // 효율성 예측
    const expectedEfficiency = this.predictEfficiency(
      optimizedSequence,
      input.learnerState
    );

    const processingTimeMs = performance.now() - startTime;

    return {
      optimizedSequence,
      appliedStrategy,
      recommendedBreaks,
      expectedEfficiency,
      excludedItems: excluded.map(e => ({
        itemId: e.id,
        reason: e.exclusionReason,
      })),
      metadata: {
        processingTimeMs,
        confidence: this.calculateConfidence(input),
        method: `fsrs-interleaving-${appliedStrategy}`,
        warnings: [],
      },
    };
  }

  /**
   * 배치 처리
   */
  processBatch(inputs: SessionOptimizationInput[]): SessionOptimizationResult[] {
    return inputs.map(input => this.process(input));
  }

  // ---------------------------------------------------------------------------
  // 전략 결정
  // ---------------------------------------------------------------------------

  /**
   * 인터리빙 전략 결정
   */
  private determineStrategy(input: SessionOptimizationInput): InterleavingStrategy {
    // 명시적 전략이 지정된 경우
    if (input.interleavingStrategy) {
      return input.interleavingStrategy;
    }

    // adaptive 모드: 학습자 상태 기반 결정
    if (this._config.defaultStrategy === 'adaptive') {
      return this.selectAdaptiveStrategy(input.learnerState);
    }

    return this._config.defaultStrategy;
  }

  /**
   * 적응형 전략 선택
   */
  private selectAdaptiveStrategy(
    learnerState: SessionOptimizationInput['learnerState']
  ): InterleavingStrategy {
    // 평균 theta로 수준 추정
    const thetas = Object.values(learnerState.currentTheta);
    const avgTheta = thetas.length > 0
      ? thetas.reduce((sum, t) => sum + t, 0) / thetas.length
      : 0;

    // theta → CEFR 수준 추정
    let estimatedLevel: string;
    if (avgTheta < -2) estimatedLevel = 'A1';
    else if (avgTheta < -1) estimatedLevel = 'A2';
    else if (avgTheta < 0) estimatedLevel = 'B1';
    else if (avgTheta < 1) estimatedLevel = 'B2';
    else if (avgTheta < 2) estimatedLevel = 'C1';
    else estimatedLevel = 'C2';

    // 피로도 고려
    if (learnerState.fatigue > 0.7) {
      // 피로 시 블로킹이 인지 부하 감소
      return 'pure_blocking';
    }

    return this._config.levelStrategyMap[estimatedLevel] || 'hybrid';
  }

  // ---------------------------------------------------------------------------
  // 항목 점수화 및 필터링
  // ---------------------------------------------------------------------------

  /**
   * 항목 점수화
   */
  private scoreItems(
    items: SessionOptimizationInput['candidateItems'],
    _learnerState: SessionOptimizationInput['learnerState'],
    now: Date
  ): Array<{
    item: SessionOptimizationInput['candidateItems'][0];
    fsrsPriority: number;
    cognitiveLoad: number;
    combinedScore: number;
  }> {
    return items.map(item => {
      const fsrsPriority = calculateFSRSPriority(item.fsrsCard, now);
      const cognitiveLoad = calculateCognitiveLoad(
        item.type,
        item.masteryState.stage
      );

      // 복합 점수: FSRS 우선순위 + 기존 우선순위 - 인지 부하 페널티
      const combinedScore =
        fsrsPriority * 0.4 +
        item.priority.priority * 0.4 -
        (cognitiveLoad / 10) * 0.2;

      return {
        item,
        fsrsPriority,
        cognitiveLoad,
        combinedScore,
      };
    });
  }

  /**
   * 항목 필터링
   */
  private filterItems(
    scoredItems: Array<{
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    }>,
    maxItems: number,
    _learnerState: SessionOptimizationInput['learnerState']
  ): {
    included: Array<{
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    }>;
    excluded: Array<{
      id: string;
      exclusionReason: 'cognitive_overload' | 'recently_seen' | 'prerequisite_not_met' | 'low_priority';
    }>;
  } {
    const included: typeof scoredItems = [];
    const excluded: Array<{
      id: string;
      exclusionReason: 'cognitive_overload' | 'recently_seen' | 'prerequisite_not_met' | 'low_priority';
    }> = [];

    // 점수 기준 정렬
    const sorted = [...scoredItems].sort((a, b) => b.combinedScore - a.combinedScore);

    let totalCognitiveLoad = 0;
    const maxTotalLoad = this._config.maxCognitiveLoad * maxItems;

    for (const scored of sorted) {
      // 최대 항목 수 체크
      if (included.length >= maxItems) {
        excluded.push({
          id: scored.item.id,
          exclusionReason: 'low_priority',
        });
        continue;
      }

      // 인지 부하 체크
      if (totalCognitiveLoad + scored.cognitiveLoad > maxTotalLoad) {
        excluded.push({
          id: scored.item.id,
          exclusionReason: 'cognitive_overload',
        });
        continue;
      }

      // 최근 본 항목 체크 (FSRS 기반)
      if (scored.fsrsPriority < 0.1) {
        excluded.push({
          id: scored.item.id,
          exclusionReason: 'recently_seen',
        });
        continue;
      }

      included.push(scored);
      totalCognitiveLoad += scored.cognitiveLoad;
    }

    return { included, excluded };
  }

  // ---------------------------------------------------------------------------
  // 순서 최적화
  // ---------------------------------------------------------------------------

  /**
   * 최적 순서 생성
   */
  private optimizeSequence(
    items: Array<{
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    }>,
    strategy: InterleavingStrategy,
    learnerState: SessionOptimizationInput['learnerState']
  ): SessionItemPlacement[] {
    // INTERLEAVING_CONFIGS[strategy]는 추후 세부 파라미터 조정에 활용 예정
    let ordered: typeof items;

    switch (strategy) {
      case 'pure_blocking':
        ordered = this.applyBlockingOrder(items);
        break;

      case 'pure_interleaving':
        ordered = this.applyInterleavingOrder(items);
        break;

      case 'hybrid':
        ordered = this.applyHybridOrder(items, learnerState.sessionMinutes);
        break;

      case 'related':
        ordered = this.applyRelatedOrder(items);
        break;

      case 'adaptive':
      default:
        ordered = this.applyAdaptiveOrder(items, learnerState);
        break;
    }

    // SessionItemPlacement로 변환
    return ordered.map((scored, position) => ({
      itemId: scored.item.id,
      position,
      placementReason: this.getPlacementReason(scored, position, strategy),
      fsrsPriority: scored.fsrsPriority,
      cognitiveLoad: scored.cognitiveLoad,
    }));
  }

  /**
   * 블로킹 순서 (유형별 그룹화)
   */
  private applyBlockingOrder(
    items: Array<{
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    }>
  ): typeof items {
    // 유형별 그룹화
    const groups = new Map<LanguageObjectType, typeof items>();

    for (const scored of items) {
      const type = scored.item.type;
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(scored);
    }

    // 각 그룹 내에서 점수순 정렬, 그룹 연결
    const result: typeof items = [];
    groups.forEach(group => {
      group.sort((a, b) => b.combinedScore - a.combinedScore);
      result.push(...group);
    });

    return result;
  }

  /**
   * 인터리빙 순서 (최대 혼합)
   */
  private applyInterleavingOrder(
    items: Array<{
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    }>
  ): typeof items {
    const result: typeof items = [];
    const remaining = [...items];
    let lastType: LanguageObjectType | null = null;

    while (remaining.length > 0) {
      // 이전과 다른 유형 중 가장 높은 점수
      const differentType = remaining.filter(r =>
        lastType === null || r.item.type !== lastType
      );

      const candidates = differentType.length > 0 ? differentType : remaining;
      candidates.sort((a, b) => b.combinedScore - a.combinedScore);

      const next = candidates[0];
      result.push(next);
      remaining.splice(remaining.indexOf(next), 1);
      lastType = next.item.type;
    }

    return result;
  }

  /**
   * 하이브리드 순서 (초기 블로킹 → 후기 인터리빙)
   */
  private applyHybridOrder(
    items: Array<{
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    }>,
    _sessionMinutes: number
  ): typeof items {
    // 세션 절반까지 블로킹, 이후 인터리빙
    const halfPoint = Math.floor(items.length / 2);

    const firstHalf = items.slice(0, halfPoint);
    const secondHalf = items.slice(halfPoint);

    const blockedFirst = this.applyBlockingOrder(firstHalf);
    const interleavedSecond = this.applyInterleavingOrder(secondHalf);

    return [...blockedFirst, ...interleavedSecond];
  }

  /**
   * 관련 항목 인터리빙
   */
  private applyRelatedOrder(
    items: Array<{
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    }>
  ): typeof items {
    const result: typeof items = [];
    const remaining = [...items];

    // 첫 항목: 가장 높은 점수
    remaining.sort((a, b) => b.combinedScore - a.combinedScore);
    result.push(remaining.shift()!);

    while (remaining.length > 0) {
      const last = result[result.length - 1];

      // 관련성 + 점수 기반 선택
      remaining.sort((a, b) => {
        const relatednessA = calculateRelatedness(last.item, a.item);
        const relatednessB = calculateRelatedness(last.item, b.item);

        // 중간 관련성(0.3-0.7)이 최적
        const optimalA = 1 - Math.abs(relatednessA - 0.5) * 2;
        const optimalB = 1 - Math.abs(relatednessB - 0.5) * 2;

        return (optimalB + b.combinedScore * 0.5) - (optimalA + a.combinedScore * 0.5);
      });

      result.push(remaining.shift()!);
    }

    return result;
  }

  /**
   * 적응형 순서
   */
  private applyAdaptiveOrder(
    items: Array<{
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    }>,
    learnerState: SessionOptimizationInput['learnerState']
  ): typeof items {
    // 피로도에 따라 인지 부하 분산
    if (learnerState.fatigue > 0.5) {
      // 피로 시: 쉬운 항목부터, 어려운 항목 사이에 쉬운 항목 배치
      const sorted = [...items].sort((a, b) => a.cognitiveLoad - b.cognitiveLoad);
      return this.interleaveByDifficulty(sorted);
    }

    // 일반: 관련 항목 인터리빙
    return this.applyRelatedOrder(items);
  }

  /**
   * 난이도 기반 인터리빙 (쉬운-어려운-쉬운 패턴)
   */
  private interleaveByDifficulty(
    sortedByLoad: Array<{
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    }>
  ): typeof sortedByLoad {
    const result: typeof sortedByLoad = [];
    const easy = sortedByLoad.filter(s => s.cognitiveLoad <= 4);
    const hard = sortedByLoad.filter(s => s.cognitiveLoad > 4);

    let easyIdx = 0;
    let hardIdx = 0;

    while (easyIdx < easy.length || hardIdx < hard.length) {
      // 쉬운 항목 2개
      for (let i = 0; i < 2 && easyIdx < easy.length; i++) {
        result.push(easy[easyIdx++]);
      }
      // 어려운 항목 1개
      if (hardIdx < hard.length) {
        result.push(hard[hardIdx++]);
      }
    }

    return result;
  }

  /**
   * 배치 이유 생성
   */
  private getPlacementReason(
    scored: {
      item: SessionOptimizationInput['candidateItems'][0];
      fsrsPriority: number;
      cognitiveLoad: number;
      combinedScore: number;
    },
    position: number,
    strategy: InterleavingStrategy
  ): string {
    if (scored.fsrsPriority > 0.7) {
      return 'High FSRS priority - due for review';
    }
    if (scored.cognitiveLoad < 3) {
      return 'Low cognitive load - good for warm-up or fatigue recovery';
    }
    if (position < 3) {
      return 'High combined score - optimal for session start';
    }
    return `${strategy} strategy placement`;
  }

  // ---------------------------------------------------------------------------
  // 휴식 및 효율성
  // ---------------------------------------------------------------------------

  /**
   * 휴식 시점 계산
   */
  private calculateBreaks(
    sequence: SessionItemPlacement[],
    currentSessionMinutes: number
  ): number[] {
    const breaks: number[] = [];
    let cumulativeLoad = 0;

    sequence.forEach((item, index) => {
      cumulativeLoad += item.cognitiveLoad;

      // 누적 인지 부하가 임계값 초과 시 휴식 권장
      if (cumulativeLoad > this._config.maxCognitiveLoad * 3) {
        breaks.push(index);
        cumulativeLoad = 0;
      }
    });

    // 시간 기반 휴식 (포모도로 스타일)
    const itemsPerBreak = Math.floor(
      (this._config.breakIntervalMinutes * 2) / (currentSessionMinutes || 1)
    );

    if (itemsPerBreak > 0) {
      for (let i = itemsPerBreak; i < sequence.length; i += itemsPerBreak) {
        if (!breaks.includes(i)) {
          breaks.push(i);
        }
      }
    }

    return breaks.sort((a, b) => a - b);
  }

  /**
   * 효율성 예측
   */
  private predictEfficiency(
    sequence: SessionItemPlacement[],
    learnerState: SessionOptimizationInput['learnerState']
  ): {
    learningValue: number;
    retentionProbability: number;
    cognitiveLoadAverage: number;
  } {
    if (sequence.length === 0) {
      return { learningValue: 0, retentionProbability: 0, cognitiveLoadAverage: 0 };
    }

    // 평균 인지 부하
    const totalLoad = sequence.reduce((sum, item) => sum + item.cognitiveLoad, 0);
    const cognitiveLoadAverage = totalLoad / sequence.length;

    // 학습 가치 (FSRS 우선순위 평균)
    const totalFsrs = sequence.reduce((sum, item) => sum + item.fsrsPriority, 0);
    const learningValue = totalFsrs / sequence.length;

    // 기억 유지 확률 (목표 보존율 기반)
    // 인지 부하가 적정 수준이면 높은 보존율
    const loadFactor = cognitiveLoadAverage <= this._config.maxCognitiveLoad ? 1 : 0.8;
    const fatigueFactor = 1 - learnerState.fatigue * 0.3;

    const retentionProbability = this._config.targetRetention * loadFactor * fatigueFactor;

    return {
      learningValue,
      retentionProbability,
      cognitiveLoadAverage,
    };
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(input: SessionOptimizationInput): number {
    // 후보 항목 수와 학습자 데이터 품질 기반
    const itemConfidence = Math.min(1, input.candidateItems.length / 20);
    const thetaConfidence = Object.keys(input.learnerState.currentTheta).length > 0 ? 0.9 : 0.6;

    return (itemConfidence + thetaConfidence) / 2;
  }
}

// =============================================================================
// 팩토리 함수
// =============================================================================

/**
 * E5 엔진 인스턴스 생성
 */
export function createSessionOptimizer(
  config?: Partial<SessionEngineConfig>
): SessionOptimizer {
  return new SessionOptimizer(config);
}

// =============================================================================
// 유틸리티 함수 (외부 노출)
// =============================================================================

/**
 * 인터리빙 전략 목록 조회
 */
export function getInterleavingStrategies(): Array<{
  strategy: InterleavingStrategy;
  description: string;
}> {
  return Object.entries(INTERLEAVING_CONFIGS).map(([strategy, config]) => ({
    strategy: strategy as InterleavingStrategy,
    description: config.description,
  }));
}

/**
 * 권장 전략 조회 (CEFR 수준 기반)
 */
export function getRecommendedStrategy(cefrLevel: string): InterleavingStrategy {
  const map: Record<string, InterleavingStrategy> = {
    'A1': 'pure_blocking',
    'A2': 'hybrid',
    'B1': 'hybrid',
    'B2': 'related',
    'C1': 'pure_interleaving',
    'C2': 'pure_interleaving',
  };

  return map[cefrLevel] || 'adaptive';
}

/**
 * 인지 부하 추정
 */
export function estimateCognitiveLoad(
  type: LanguageObjectType,
  masteryStage: number
): number {
  return calculateCognitiveLoad(type, masteryStage);
}
