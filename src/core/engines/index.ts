/**
 * LOGOS Unified Engine Layer
 *
 * 5개의 통합 엔진을 통해 ~30개의 개별 알고리즘을 일관된 인터페이스로 제공.
 *
 * 엔진 구조:
 * - E1: UniversalCooccurrenceEngine - 모든 객체 유형 간 공출현 관계
 * - E2: DistributionalAnalyzer - 분포 분석 (빈도, 변이, 스타일)
 * - E3: FlexibleEvaluationEngine - 다차원 평가 (IRT, MIRT, 다중 기준)
 * - E4: PhonologicalTrainingOptimizer - 음운론적 학습 최적화
 * - E5: SessionOptimizer - 세션 수준 학습 최적화
 *
 * 설계 원칙:
 * 1. 기존 함수 래핑, 재작성 금지
 * 2. 확장 포인트 활용
 * 3. 설정으로 분리
 */

// =============================================================================
// Engine Exports
// =============================================================================

export * from './types';
export * from './e1-cooccurrence';
export * from './e2-distributional';
export * from './e3-evaluation';
export * from './e4-phonological';
export * from './e5-session';
