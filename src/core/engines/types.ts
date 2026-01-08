/**
 * LOGOS Unified Engine Types
 *
 * 5개 통합 엔진의 공통 타입 정의.
 * 기존 core/types.ts의 타입을 확장하며, 새로운 타입을 최소화.
 *
 * 설계 원칙:
 * 1. 기존 타입 재사용 극대화
 * 2. 새 타입은 기존 타입의 조합으로 구성
 * 3. 모든 엔진이 공유하는 공통 인터페이스 정의
 */

import type {
  // 기존 언어 객체 타입
  LanguageObjectType,
  ComponentCode,

  // 기존 PMI/공출현 타입
  PMIResult,

  // 기존 평가 타입
  EvaluationMode,
  MultiComponentEvaluation,
  ObjectEvaluationConfig,

  // 기존 학습 타입
  MasteryState,
  FSRSCard,

  // 기존 세션 타입
  SessionConfig,

  // 기존 우선순위 타입
  FREMetrics,
  PriorityCalculation,

  // 기존 G2P 타입
  G2PDifficulty,
} from '../types';

// =============================================================================
// 공통 엔진 인터페이스
// =============================================================================

/**
 * 모든 엔진이 구현하는 기본 인터페이스
 */
export interface BaseEngine<TConfig, TInput, TOutput> {
  /** 엔진 ID */
  readonly engineId: string;

  /** 엔진 버전 */
  readonly version: string;

  /** 현재 설정 */
  readonly config: TConfig;

  /** 설정 업데이트 */
  updateConfig(config: Partial<TConfig>): void;

  /** 메인 처리 함수 */
  process(input: TInput): TOutput;

  /** 배치 처리 */
  processBatch(inputs: TInput[]): TOutput[];

  /** 상태 초기화 */
  reset(): void;
}

/**
 * 엔진 처리 결과의 공통 메타데이터
 */
export interface EngineResultMetadata {
  /** 처리 시간 (ms) */
  processingTimeMs: number;

  /** 신뢰도 (0-1) */
  confidence: number;

  /** 사용된 알고리즘/방법 */
  method: string;

  /** 경고 메시지 */
  warnings?: string[];
}

// =============================================================================
// E1: UniversalCooccurrenceEngine 타입
// =============================================================================

/**
 * E1과 UsageSpace 통합 설계
 *
 * 기존 UsageSpace 시스템:
 * - LexUsageSpaceDimensions.collocations: 이미 PMI 기반 연어 포함
 * - ObjectUsageSpace: 객체-컨텍스트 관계 추적
 * - ComponentUsageSpaceDimensions: 컴포넌트별 사용 차원
 *
 * E1의 역할:
 * - 객체-객체 관계 (공출현) 계산 → UsageSpace의 "collocations" 데이터 공급
 * - UsageSpace 확장 시 공출현 객체 추천
 * - 28가지 객체 쌍 유형의 관계 강도 계산
 *
 * 통합 원칙:
 * 1. E1은 UsageSpace를 대체하지 않고 보완
 * 2. E1 결과 → UsageSpaceDimensions에 반영
 * 3. UsageSpace의 expansionCandidates 계산에 E1 활용
 */

import type {
  // 기존 UsageSpace 타입 - 중복 방지를 위해 재사용
  UsageContext,
} from '../types';

/**
 * 확장된 객체 유형 - 기존 LanguageObjectType 재사용
 * 7개 객체 유형: LEX, MWE, TERM, MORPH, G2P, SYNT, PRAG
 */
export type CooccurrenceObjectType = LanguageObjectType;

/**
 * 객체 쌍 유형 (28가지 조합)
 * 7 동종 + 21 이종 = 28
 *
 * 동종 (7): LEX↔LEX, MWE↔MWE, TERM↔TERM, MORPH↔MORPH, G2P↔G2P, SYNT↔SYNT, PRAG↔PRAG
 * 이종 (21): LEX↔MWE, LEX↔TERM, LEX↔MORPH, ... 등
 */
export interface ObjectPairType {
  type1: CooccurrenceObjectType;
  type2: CooccurrenceObjectType;
}

/**
 * 공출현 관계 유형
 * - 기존 PMI (어휘 공출현)를 확장하여 다양한 관계 유형 지원
 */
export type CooccurrenceRelationType =
  | 'lexical'           // 어휘적 공출현 (기존 PMI)
  | 'morphological'     // 형태론적 관계 (같은 어근, 파생)
  | 'syntactic'         // 통사적 관계 (동일 구문 패턴)
  | 'phonological'      // 음운론적 관계 (유사 음운 패턴)
  | 'pragmatic'         // 화용적 관계 (동일 맥락 사용)
  | 'semantic';         // 의미적 관계 (동의어, 반의어 등)

/**
 * 범용 공출현 입력 - 기존 PMI 입력 확장
 */
export interface CooccurrenceInput {
  /** 첫 번째 객체 */
  object1: {
    type: CooccurrenceObjectType;
    id: string;
    content: string;
  };

  /** 두 번째 객체 */
  object2: {
    type: CooccurrenceObjectType;
    id: string;
    content: string;
  };

  /** 관계 유형 (지정하지 않으면 자동 추론) */
  relationType?: CooccurrenceRelationType;

  /** 분석 컨텍스트 (선택) - UsageContext와 호환 */
  context?: Partial<UsageContext>;
}

/**
 * 범용 공출현 결과 - 기존 PMIResult 확장
 */
export interface CooccurrenceResult extends Omit<PMIResult, 'word1' | 'word2'> {
  /** 첫 번째 객체 ID */
  object1Id: string;

  /** 두 번째 객체 ID */
  object2Id: string;

  /** 객체 쌍 유형 */
  pairType: ObjectPairType;

  /** 관계 유형 */
  relationType: CooccurrenceRelationType;

  /** 관계 강도 (정규화된 PMI, -1 ~ 1) */
  relationStrength: number;

  /**
   * UsageSpace 통합: 이 공출현이 발견된 컨텍스트들
   * - UsageSpace의 expansionCandidates 계산에 활용
   */
  observedContexts?: UsageContext[];

  /**
   * UsageSpace 통합: 공출현 객체가 함께 사용 가능한 추가 컨텍스트
   * - object1의 컨텍스트 ∩ object2의 컨텍스트
   */
  sharedUsageContexts?: string[];

  /** 메타데이터 */
  metadata: EngineResultMetadata;
}

/**
 * UsageSpace 확장 추천 - E1이 UsageSpace에 제공하는 출력
 *
 * 객체의 사용공간을 확장할 때 함께 학습하면 좋은 공출현 객체 추천
 */
export interface UsageSpaceExpansionRecommendation {
  /** 대상 객체 ID */
  targetObjectId: string;

  /** 추천 공출현 객체들 */
  recommendedCooccurrences: Array<{
    objectId: string;
    objectType: CooccurrenceObjectType;
    relationStrength: number;
    relationType: CooccurrenceRelationType;
    /** 함께 학습 시 예상 전이 효과 */
    expectedTransferBenefit: number;
    /** 추천 이유 */
    reason: string;
  }>;

  /** 추천 새 컨텍스트 - 공출현 분석 기반 */
  recommendedNewContexts: Array<{
    contextId: string;
    /** 이 컨텍스트에서 함께 나타나는 객체들 */
    cooccurringObjects: string[];
    /** 준비도 점수 */
    readinessScore: number;
  }>;
}

/**
 * E1 엔진 설정
 */
export interface CooccurrenceEngineConfig {
  /** 윈도우 크기 (기존 PMI와 호환) */
  windowSize: number;

  /** 최소 공출현 빈도 */
  minCooccurrence: number;

  /** 유의성 임계값 (log-likelihood ratio) */
  significanceThreshold: number;

  /** 객체 유형별 가중치 (선택) */
  typeWeights?: Partial<Record<CooccurrenceObjectType, number>>;

  /**
   * UsageSpace 통합 설정
   */
  usageSpaceIntegration?: {
    /** UsageSpace에 결과 자동 반영 */
    autoUpdateUsageSpace: boolean;
    /** 최소 관계 강도 (UsageSpace 반영 기준) */
    minStrengthForUsageSpace: number;
    /** 확장 추천 시 고려할 최대 객체 수 */
    maxRecommendations: number;
  };
}

// =============================================================================
// E2: DistributionalAnalyzer 타입
// =============================================================================

/**
 * 분포 분석 차원
 */
export type DistributionDimension =
  | 'frequency'      // 빈도 분포
  | 'variance'       // 변이 분포
  | 'style'          // 스타일/레지스터 분포
  | 'complexity'     // 복잡성 분포
  | 'domain';        // 도메인 분포

/**
 * 분포 통계
 */
export interface DistributionStatistics {
  /** 평균 */
  mean: number;

  /** 표준편차 */
  stdDev: number;

  /** 중앙값 */
  median: number;

  /** 왜도 (비대칭성) */
  skewness: number;

  /** 첨도 (꼬리 두께) */
  kurtosis: number;

  /** 사분위수 */
  quartiles: [number, number, number]; // Q1, Q2, Q3

  /** 샘플 크기 */
  sampleSize: number;
}

/**
 * 분포 분석 입력
 */
export interface DistributionalInput {
  /** 분석 대상 객체들 */
  objects: Array<{
    id: string;
    type: LanguageObjectType;
    content: string;
    /** 기존 FRE 메트릭 활용 */
    fre?: FREMetrics;
  }>;

  /** 분석할 차원들 */
  dimensions: DistributionDimension[];

  /** 기준 분포 (목표와 비교용) */
  referenceDistribution?: {
    dimension: DistributionDimension;
    stats: DistributionStatistics;
  };
}

/**
 * 분포 분석 결과
 */
export interface DistributionalResult {
  /** 차원별 통계 */
  dimensionStats: Record<DistributionDimension, DistributionStatistics>;

  /** 기준 분포와의 격차 (제공된 경우) */
  gapAnalysis?: {
    dimension: DistributionDimension;
    gap: number;           // 평균 차이
    normalizedGap: number; // 표준화된 차이 (Cohen's d)
    significance: number;  // p-value
  };

  /** 이상치 객체들 */
  outliers: Array<{
    objectId: string;
    dimension: DistributionDimension;
    value: number;
    zScore: number;
  }>;

  /** 메타데이터 */
  metadata: EngineResultMetadata;
}

/**
 * E2 엔진 설정
 */
export interface DistributionalEngineConfig {
  /** 이상치 기준 z-score */
  outlierThreshold: number;

  /** 최소 샘플 크기 */
  minSampleSize: number;

  /** 스타일 분류 기준 */
  styleClassification?: {
    formal: string[];    // 격식체 마커
    informal: string[];  // 비격식체 마커
  };
}

// =============================================================================
// E3: FlexibleEvaluationEngine 타입
// =============================================================================

/**
 * 텍스트 장르 분류 - 사용자 피드백 반영
 */
export interface TextGenreClassification {
  /** 도메인 */
  domain: 'academic' | 'business' | 'casual' | 'technical' | 'creative' | string;

  /** 포맷 */
  format: 'email' | 'essay' | 'report' | 'memo' | 'advertisement' | 'manual' | string;

  /** 격식 수준 */
  formality: 'formal' | 'neutral' | 'informal';

  /** 길이 */
  length: 'short' | 'medium' | 'long';

  /** 목적 */
  purpose: 'inform' | 'persuade' | 'instruct' | 'entertain' | string;
}

/**
 * 장르별 평가 프로파일
 */
/**
 * E3 전용 평가 층 (engine-local 확장)
 */
export interface E3EvaluationLayerDef {
  layerId: string;
  name: string;
  weight: number;
  evaluator: string;
  threshold: number;
  feedbackOnFail: string;
}

export interface GenreEvaluationProfile {
  /** 프로파일 ID */
  profileId: string;

  /** 장르 분류 */
  genre: TextGenreClassification;

  /** 필수 평가 층 - E3 전용 확장 타입 */
  requiredLayers: E3EvaluationLayerDef[];

  /** 선택 평가 층 */
  optionalLayers: E3EvaluationLayerDef[];

  /** 층별 가중치 조정 */
  layerWeights: Record<string, number>;

  /** 합격 기준 */
  thresholds: {
    pass: number;
    merit: number;
    distinction: number;
  };
}

/**
 * 적응형 평가 입력 - 기존 ObjectEvaluationConfig 확장
 */
export interface AdaptiveEvaluationInput {
  /** 응답 */
  response: string;

  /** 기대 답변 */
  expected: string[];

  /** 장르 분류 (자동 감지 또는 명시) */
  genre?: TextGenreClassification;

  /** 학습자 CEFR 수준 (층 가중치 조정용) */
  learnerLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  /** 기존 평가 설정 재사용 */
  baseConfig?: ObjectEvaluationConfig;

  /** 컴포넌트별 평가 여부 */
  evaluateComponents?: ComponentCode[];
}

/**
 * 적응형 평가 결과 - 기존 MultiComponentEvaluation 확장
 */
export interface AdaptiveEvaluationResult extends MultiComponentEvaluation {
  /** 사용된 장르 프로파일 */
  usedProfile?: GenreEvaluationProfile;

  /** 적응된 층 가중치 */
  adaptedWeights: Record<string, number>;

  /** 층별 상세 결과 */
  layerResults: Array<{
    layerId: string;
    name: string;
    score: number;
    weight: number;
    feedback: string;
    contributionToTotal: number;
  }>;

  /** 메타데이터 */
  metadata: EngineResultMetadata;
}

/**
 * E3 엔진 설정
 */
export interface EvaluationEngineConfig {
  /** 기본 평가 모드 */
  defaultMode: EvaluationMode;

  /** 기본 합격 임계값 */
  defaultThreshold: number;

  /** 엄격성 수준 */
  strictness: 'lenient' | 'normal' | 'strict';

  /** 장르 프로파일 레지스트리 */
  genreProfiles: GenreEvaluationProfile[];

  /** 자동 장르 감지 활성화 */
  autoDetectGenre: boolean;
}

// =============================================================================
// E4: PhonologicalTrainingOptimizer 타입
// =============================================================================

/**
 * L1-L2 음소 대조 정보
 */
export interface PhonemeContrast {
  /** L2 음소 */
  targetPhoneme: string;

  /** L1에서 가장 가까운 음소 */
  closestL1Phoneme: string;

  /** 음향적 거리 (0-1, 높을수록 다름) */
  acousticDistance: number;

  /** 예상 난이도 (Flege SLM 기반) */
  predictedDifficulty: number;

  /** 학습 카테고리 */
  category: 'identical' | 'similar' | 'new';

  /** 최소 대립쌍 예시 */
  minimalPairs: Array<{
    word1: string;
    word2: string;
    contrastPosition: 'initial' | 'medial' | 'final';
  }>;
}

/**
 * 음운 훈련 순서 항목
 */
export interface PhonologicalTrainingItem {
  /** 훈련 대상 음소/패턴 */
  target: string;

  /** 훈련 순서 (1 = 가장 먼저) */
  order: number;

  /** 선행 조건 (먼저 마스터해야 하는 항목) */
  prerequisites: string[];

  /** 예상 훈련 세션 수 */
  estimatedSessions: number;

  /** L1 전이 계수 - 기존 TransferCoefficients 활용 */
  transferInfo?: {
    coefficient: number;
    type: 'positive' | 'negative' | 'neutral';
  };

  /** 관련 G2P 난이도 - 기존 G2PDifficulty 활용 */
  g2pDifficulty?: G2PDifficulty;
}

/**
 * 음운 훈련 최적화 입력
 */
export interface PhonologicalOptimizationInput {
  /** 학습자 L1 */
  learnerL1: string;

  /** 목표 L2 */
  targetL2: string;

  /** 현재 마스터된 음소들 */
  masteredPhonemes: string[];

  /** 학습자의 현재 음운 theta */
  phonologicalTheta: number;

  /** 목표 도메인 (선택) */
  targetDomain?: string;
}

/**
 * 음운 훈련 최적화 결과
 */
export interface PhonologicalOptimizationResult {
  /** 추천 훈련 순서 */
  trainingSequence: PhonologicalTrainingItem[];

  /** 문제적 대조 목록 */
  problematicContrasts: PhonemeContrast[];

  /** 자동 생성된 최소 대립쌍 */
  generatedMinimalPairs: Array<{
    phoneme: string;
    pairs: Array<{ word1: string; word2: string }>;
  }>;

  /** 예상 총 훈련 시간 */
  estimatedTotalSessions: number;

  /** 메타데이터 */
  metadata: EngineResultMetadata;
}

/**
 * E4 엔진 설정
 */
export interface PhonologicalEngineConfig {
  /** L1-L2 쌍별 음소 대조 데이터 경로 */
  contrastDataPath?: string;

  /** 난이도 순서 전략 */
  orderingStrategy: 'easiest_first' | 'most_frequent_first' | 'prerequisite_based';

  /** 최소 대립쌍 생성 개수 */
  minimalPairsPerPhoneme: number;
}

// =============================================================================
// E5: SessionOptimizer 타입
// =============================================================================

/**
 * 인터리빙 전략
 */
export type InterleavingStrategy =
  | 'pure_blocking'      // 완전 블로킹 (AAA BBB CCC)
  | 'pure_interleaving'  // 완전 인터리빙 (ABC ABC ABC)
  | 'hybrid'             // 하이브리드 (초기 블로킹 → 후기 인터리빙)
  | 'related'            // 관련 항목 간 인터리빙
  | 'adaptive';          // 학습자 수준에 따라 조정

/**
 * 세션 항목 배치 정보
 */
export interface SessionItemPlacement {
  /** 항목 ID */
  itemId: string;

  /** 세션 내 위치 (0-based) */
  position: number;

  /** 배치 이유 */
  placementReason: string;

  /** FSRS 기반 복습 우선순위 */
  fsrsPriority: number;

  /** 예상 인지 부하 (1-10) */
  cognitiveLoad: number;
}

/**
 * 세션 최적화 입력 - 기존 SessionConfig 확장
 */
export interface SessionOptimizationInput {
  /** 기존 세션 설정 재사용 */
  sessionConfig: SessionConfig;

  /** 후보 항목 목록 */
  candidateItems: Array<{
    id: string;
    type: LanguageObjectType;
    masteryState: MasteryState;
    fsrsCard: FSRSCard;
    priority: PriorityCalculation;
  }>;

  /** 학습자 현재 상태 */
  learnerState: {
    currentTheta: Record<ComponentCode, number>;
    fatigue: number;        // 0-1, 피로도
    sessionMinutes: number; // 현재까지 세션 시간
  };

  /** 인터리빙 전략 (선택) */
  interleavingStrategy?: InterleavingStrategy;
}

/**
 * 세션 최적화 결과 - 기존 SessionState와 연계
 */
export interface SessionOptimizationResult {
  /** 최적화된 항목 배치 */
  optimizedSequence: SessionItemPlacement[];

  /** 사용된 인터리빙 전략 */
  appliedStrategy: InterleavingStrategy;

  /** 추천 휴식 시점 (위치 인덱스) */
  recommendedBreaks: number[];

  /** 예상 세션 효율성 */
  expectedEfficiency: {
    learningValue: number;      // 예상 학습 가치
    retentionProbability: number; // 예상 기억 유지율
    cognitiveLoadAverage: number; // 평균 인지 부하
  };

  /** 제외된 항목과 이유 */
  excludedItems: Array<{
    itemId: string;
    reason: 'cognitive_overload' | 'recently_seen' | 'prerequisite_not_met' | 'low_priority';
  }>;

  /** 메타데이터 */
  metadata: EngineResultMetadata;
}

/**
 * E5 엔진 설정
 */
export interface SessionEngineConfig {
  /** 최대 인지 부하 (Miller's 7±2) */
  maxCognitiveLoad: number;

  /** 휴식 권장 간격 (분) */
  breakIntervalMinutes: number;

  /** 기본 인터리빙 전략 */
  defaultStrategy: InterleavingStrategy;

  /** 학습자 수준별 전략 매핑 */
  levelStrategyMap: Record<string, InterleavingStrategy>;

  /** FSRS 목표 기억 유지율 */
  targetRetention: number;
}

// =============================================================================
// 엔진 팩토리 타입
// =============================================================================

/**
 * 엔진 팩토리 - 모든 엔진 인스턴스 생성
 */
export interface EngineFactory {
  createCooccurrenceEngine(config?: Partial<CooccurrenceEngineConfig>): BaseEngine<
    CooccurrenceEngineConfig,
    CooccurrenceInput,
    CooccurrenceResult
  >;

  createDistributionalEngine(config?: Partial<DistributionalEngineConfig>): BaseEngine<
    DistributionalEngineConfig,
    DistributionalInput,
    DistributionalResult
  >;

  createEvaluationEngine(config?: Partial<EvaluationEngineConfig>): BaseEngine<
    EvaluationEngineConfig,
    AdaptiveEvaluationInput,
    AdaptiveEvaluationResult
  >;

  createPhonologicalEngine(config?: Partial<PhonologicalEngineConfig>): BaseEngine<
    PhonologicalEngineConfig,
    PhonologicalOptimizationInput,
    PhonologicalOptimizationResult
  >;

  createSessionEngine(config?: Partial<SessionEngineConfig>): BaseEngine<
    SessionEngineConfig,
    SessionOptimizationInput,
    SessionOptimizationResult
  >;
}

// =============================================================================
// 기본 설정값
// =============================================================================

export const DEFAULT_COOCCURRENCE_CONFIG: CooccurrenceEngineConfig = {
  windowSize: 5,
  minCooccurrence: 2,
  significanceThreshold: 3.84, // p < 0.05
};

export const DEFAULT_DISTRIBUTIONAL_CONFIG: DistributionalEngineConfig = {
  outlierThreshold: 2.5,
  minSampleSize: 10,
};

export const DEFAULT_EVALUATION_CONFIG: EvaluationEngineConfig = {
  defaultMode: 'partial_credit',
  defaultThreshold: 0.6,
  strictness: 'normal',
  genreProfiles: [],
  autoDetectGenre: true,
};

export const DEFAULT_PHONOLOGICAL_CONFIG: PhonologicalEngineConfig = {
  orderingStrategy: 'prerequisite_based',
  minimalPairsPerPhoneme: 5,
};

export const DEFAULT_SESSION_CONFIG: SessionEngineConfig = {
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
};
