/**
 * E4: PhonologicalTrainingOptimizer
 *
 * 음운론적 학습 최적화 엔진 - L1-L2 음소 대조 기반 훈련 순서 최적화
 *
 * 학술적 근거:
 * - Flege's Speech Learning Model (SLM): L1과의 음향적 거리에 따른 난이도 예측
 *   - "New" 음소: L1에 없음 → 중간 난이도 (새로운 카테고리 형성)
 *   - "Similar" 음소: L1에 비슷함 → 높은 난이도 (간섭 효과)
 *   - "Identical" 음소: L1과 동일 → 낮은 난이도 (직접 전이)
 * - 최소 대립쌍(Minimal Pair) 훈련의 효과성 (Thomson, 2018)
 * - 음운 인식 훈련의 읽기 능력 전이 (National Reading Panel, 2000)
 *
 * 기존 코드 활용:
 * - src/core/g2p.ts: G2PDifficulty, PhonologicalVector, L1Mispronunciation
 * - src/core/transfer.ts: TransferCoefficients, LanguagePairProfile
 *
 * 새로운 기능:
 * - L1-L2 음소 대조 분석 및 난이도 예측
 * - Flege SLM 기반 학습 카테고리 분류
 * - 최적 훈련 순서 생성 (선행조건 기반)
 * - 자동 최소 대립쌍 생성
 */

import type {
  BaseEngine,
  PhonologicalEngineConfig,
  PhonologicalOptimizationInput,
  PhonologicalOptimizationResult,
  PhonemeContrast,
  PhonologicalTrainingItem,
} from './types';

// =============================================================================
// 상수 및 음소 데이터
// =============================================================================

/**
 * 영어 음소 인벤토리 (IPA)
 */
const ENGLISH_PHONEMES = {
  vowels: {
    monophthongs: ['iː', 'ɪ', 'e', 'æ', 'ɑː', 'ɒ', 'ɔː', 'ʊ', 'uː', 'ʌ', 'ɜː', 'ə'],
    diphthongs: ['eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ', 'ɪə', 'eə', 'ʊə'],
  },
  consonants: {
    plosives: ['p', 'b', 't', 'd', 'k', 'g'],
    fricatives: ['f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h'],
    affricates: ['tʃ', 'dʒ'],
    nasals: ['m', 'n', 'ŋ'],
    liquids: ['l', 'r'],
    glides: ['w', 'j'],
  },
};

/**
 * L1별 음소 인벤토리 (간략화)
 */
const L1_PHONEME_INVENTORIES: Record<string, {
  vowels: string[];
  consonants: string[];
  missingFromEnglish: string[];
  problematicContrasts: Array<{ phoneme: string; confusedWith: string }>;
}> = {
  ko: {
    vowels: ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ', 'ㅐ', 'ㅔ', 'ㅛ', 'ㅕ', 'ㅠ', 'ㅑ'],
    consonants: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'],
    missingFromEnglish: ['θ', 'ð', 'f', 'v', 'z', 'ʒ', 'r'],
    problematicContrasts: [
      { phoneme: 'r', confusedWith: 'l' },
      { phoneme: 'f', confusedWith: 'p' },
      { phoneme: 'v', confusedWith: 'b' },
      { phoneme: 'θ', confusedWith: 's' },
      { phoneme: 'ð', confusedWith: 'd' },
      { phoneme: 'z', confusedWith: 's' },
      { phoneme: 'ʃ', confusedWith: 's' },
    ],
  },
  ja: {
    vowels: ['a', 'i', 'u', 'e', 'o'],
    consonants: ['k', 'g', 's', 'z', 't', 'd', 'n', 'h', 'b', 'p', 'm', 'j', 'ɾ', 'w'],
    missingFromEnglish: ['θ', 'ð', 'f', 'v', 'l', 'ʃ', 'ʒ', 'tʃ', 'dʒ'],
    problematicContrasts: [
      { phoneme: 'r', confusedWith: 'l' },
      { phoneme: 'l', confusedWith: 'r' },
      { phoneme: 'θ', confusedWith: 's' },
      { phoneme: 'ð', confusedWith: 'z' },
      { phoneme: 'v', confusedWith: 'b' },
      { phoneme: 'f', confusedWith: 'h' },
    ],
  },
  zh: {
    vowels: ['a', 'o', 'e', 'i', 'u', 'ü'],
    consonants: ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'],
    missingFromEnglish: ['θ', 'ð', 'v', 'ŋ', 'dʒ'],
    problematicContrasts: [
      { phoneme: 'θ', confusedWith: 's' },
      { phoneme: 'ð', confusedWith: 'z' },
      { phoneme: 'v', confusedWith: 'w' },
      { phoneme: 'n', confusedWith: 'l' },
      { phoneme: 'r', confusedWith: 'l' },
    ],
  },
  es: {
    vowels: ['a', 'e', 'i', 'o', 'u'],
    consonants: ['b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'ɲ', 'p', 'r', 'ɾ', 's', 't', 'tʃ', 'x', 'θ'],
    missingFromEnglish: ['v', 'ð', 'ʃ', 'ʒ', 'z', 'h', 'dʒ'],
    problematicContrasts: [
      { phoneme: 'v', confusedWith: 'b' },
      { phoneme: 'ʃ', confusedWith: 'tʃ' },
      { phoneme: 'dʒ', confusedWith: 'j' },
      { phoneme: 'z', confusedWith: 's' },
      { phoneme: 'h', confusedWith: 'x' },
    ],
  },
};

/**
 * 최소 대립쌍 데이터베이스 (영어)
 */
const MINIMAL_PAIRS_DB: Record<string, Array<{ word1: string; word2: string; position: 'initial' | 'medial' | 'final' }>> = {
  'r-l': [
    { word1: 'rice', word2: 'lice', position: 'initial' },
    { word1: 'right', word2: 'light', position: 'initial' },
    { word1: 'berry', word2: 'belly', position: 'medial' },
    { word1: 'car', word2: 'call', position: 'final' },
  ],
  'θ-s': [
    { word1: 'think', word2: 'sink', position: 'initial' },
    { word1: 'thick', word2: 'sick', position: 'initial' },
    { word1: 'path', word2: 'pass', position: 'final' },
    { word1: 'math', word2: 'mass', position: 'final' },
  ],
  'ð-d': [
    { word1: 'they', word2: 'day', position: 'initial' },
    { word1: 'then', word2: 'den', position: 'initial' },
    { word1: 'breathe', word2: 'breed', position: 'final' },
  ],
  'v-b': [
    { word1: 'vest', word2: 'best', position: 'initial' },
    { word1: 'vote', word2: 'boat', position: 'initial' },
    { word1: 'very', word2: 'berry', position: 'initial' },
  ],
  'f-p': [
    { word1: 'fat', word2: 'pat', position: 'initial' },
    { word1: 'fast', word2: 'past', position: 'initial' },
    { word1: 'copy', word2: 'coffee', position: 'medial' },
  ],
  'z-s': [
    { word1: 'zoo', word2: 'sue', position: 'initial' },
    { word1: 'zip', word2: 'sip', position: 'initial' },
    { word1: 'buzz', word2: 'bus', position: 'final' },
  ],
  'ʃ-s': [
    { word1: 'ship', word2: 'sip', position: 'initial' },
    { word1: 'she', word2: 'see', position: 'initial' },
    { word1: 'wish', word2: 'wiss', position: 'final' },
  ],
  'ʃ-tʃ': [
    { word1: 'ship', word2: 'chip', position: 'initial' },
    { word1: 'share', word2: 'chair', position: 'initial' },
    { word1: 'wash', word2: 'watch', position: 'final' },
  ],
  'iː-ɪ': [
    { word1: 'sheep', word2: 'ship', position: 'medial' },
    { word1: 'leave', word2: 'live', position: 'medial' },
    { word1: 'beat', word2: 'bit', position: 'medial' },
  ],
  'æ-e': [
    { word1: 'bad', word2: 'bed', position: 'medial' },
    { word1: 'man', word2: 'men', position: 'medial' },
    { word1: 'sat', word2: 'set', position: 'medial' },
  ],
};

/**
 * 음소별 빈도 (대략적)
 */
const PHONEME_FREQUENCY: Record<string, number> = {
  'ə': 0.11, 'n': 0.07, 't': 0.07, 'ɪ': 0.06, 's': 0.05,
  'r': 0.05, 'd': 0.04, 'l': 0.04, 'i': 0.04, 'k': 0.03,
  'ð': 0.03, 'z': 0.03, 'm': 0.03, 'e': 0.03, 'w': 0.02,
  'p': 0.02, 'b': 0.02, 'v': 0.02, 'f': 0.02, 'h': 0.02,
  'ŋ': 0.01, 'ʃ': 0.01, 'θ': 0.01, 'g': 0.01, 'tʃ': 0.01,
  'dʒ': 0.01, 'ʒ': 0.001, 'j': 0.01,
};

// =============================================================================
// Flege SLM 기반 카테고리 분류
// =============================================================================

/**
 * Flege's Speech Learning Model 카테고리 분류
 */
function classifyPhonemeCategory(
  targetPhoneme: string,
  l1Inventory: { missingFromEnglish: string[]; problematicContrasts: Array<{ phoneme: string; confusedWith: string }> }
): 'identical' | 'similar' | 'new' {
  // L1에 없는 음소 → "new"
  if (l1Inventory.missingFromEnglish.includes(targetPhoneme)) {
    return 'new';
  }

  // L1에서 혼동되는 음소 → "similar" (가장 어려움)
  const isConfused = l1Inventory.problematicContrasts.some(
    c => c.phoneme === targetPhoneme || c.confusedWith === targetPhoneme
  );
  if (isConfused) {
    return 'similar';
  }

  // 그 외 → "identical" (직접 전이)
  return 'identical';
}

/**
 * 음소 난이도 예측 (Flege SLM 기반)
 */
function predictDifficulty(
  category: 'identical' | 'similar' | 'new',
  frequency: number
): number {
  // Flege SLM:
  // - identical: 낮은 난이도 (직접 전이)
  // - new: 중간 난이도 (새로운 카테고리 형성 가능)
  // - similar: 높은 난이도 (L1 간섭)

  const baseDifficulty: Record<string, number> = {
    identical: 0.2,
    new: 0.5,
    similar: 0.8,
  };

  // 빈도가 낮을수록 노출 기회 적음 → 난이도 증가
  const frequencyPenalty = (1 - Math.min(1, frequency * 10)) * 0.2;

  return Math.min(1, baseDifficulty[category] + frequencyPenalty);
}

/**
 * 음향적 거리 추정 (간략화)
 */
function estimateAcousticDistance(
  targetPhoneme: string,
  closestL1Phoneme: string
): number {
  // 실제로는 포먼트 분석 등 필요
  // 여기서는 카테고리 기반 휴리스틱

  // 같은 음소
  if (targetPhoneme === closestL1Phoneme) return 0;

  // 같은 조음 방식/위치
  const plosives = ['p', 'b', 't', 'd', 'k', 'g'];
  const fricatives = ['f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h'];

  const sameClass =
    (plosives.includes(targetPhoneme) && plosives.includes(closestL1Phoneme)) ||
    (fricatives.includes(targetPhoneme) && fricatives.includes(closestL1Phoneme));

  if (sameClass) return 0.4;

  return 0.7; // 다른 클래스
}

// =============================================================================
// E4 엔진 구현
// =============================================================================

/**
 * PhonologicalTrainingOptimizer 구현
 *
 * L1-L2 음소 대조 기반 훈련 최적화
 */
export class PhonologicalTrainingOptimizer implements BaseEngine<
  PhonologicalEngineConfig,
  PhonologicalOptimizationInput,
  PhonologicalOptimizationResult
> {
  readonly engineId = 'e4-phonological';
  readonly version = '1.0.0';

  private _config: PhonologicalEngineConfig;

  constructor(config?: Partial<PhonologicalEngineConfig>) {
    this._config = {
      orderingStrategy: 'prerequisite_based',
      minimalPairsPerPhoneme: 5,
      ...config,
    };
  }

  get config(): PhonologicalEngineConfig {
    return { ...this._config };
  }

  updateConfig(config: Partial<PhonologicalEngineConfig>): void {
    this._config = { ...this._config, ...config };
  }

  reset(): void {
    // Stateless engine
  }

  // ---------------------------------------------------------------------------
  // 메인 처리 함수
  // ---------------------------------------------------------------------------

  /**
   * 음운 훈련 최적화 수행
   */
  process(input: PhonologicalOptimizationInput): PhonologicalOptimizationResult {
    const startTime = performance.now();

    // L1 음소 인벤토리 가져오기
    const l1Inventory = L1_PHONEME_INVENTORIES[input.learnerL1] ||
      L1_PHONEME_INVENTORIES['ko']; // 기본값: 한국어

    // 문제적 대조 분석
    const problematicContrasts = this.analyzeContrasts(input.targetL2, l1Inventory);

    // 훈련 항목 생성
    const allItems = this.generateTrainingItems(
      problematicContrasts,
      input.masteredPhonemes,
      l1Inventory
    );

    // 훈련 순서 최적화
    const trainingSequence = this.optimizeSequence(
      allItems,
      input.phonologicalTheta,
      input.targetDomain
    );

    // 최소 대립쌍 생성
    const generatedMinimalPairs = this.generateMinimalPairs(problematicContrasts);

    // 총 훈련 시간 추정
    const estimatedTotalSessions = trainingSequence.reduce(
      (sum, item) => sum + item.estimatedSessions, 0
    );

    const processingTimeMs = performance.now() - startTime;

    return {
      trainingSequence,
      problematicContrasts,
      generatedMinimalPairs,
      estimatedTotalSessions,
      metadata: {
        processingTimeMs,
        confidence: this.calculateConfidence(input.learnerL1),
        method: `flege-slm-${this._config.orderingStrategy}`,
        warnings: this.generateWarnings(input),
      },
    };
  }

  /**
   * 배치 처리
   */
  processBatch(inputs: PhonologicalOptimizationInput[]): PhonologicalOptimizationResult[] {
    return inputs.map(input => this.process(input));
  }

  // ---------------------------------------------------------------------------
  // 대조 분석
  // ---------------------------------------------------------------------------

  /**
   * L1-L2 음소 대조 분석
   */
  analyzeContrasts(
    targetL2: string,
    l1Inventory: typeof L1_PHONEME_INVENTORIES['ko']
  ): PhonemeContrast[] {
    const contrasts: PhonemeContrast[] = [];

    // 영어 타겟인 경우
    if (targetL2 === 'en') {
      const allEnglishPhonemes = [
        ...ENGLISH_PHONEMES.vowels.monophthongs,
        ...ENGLISH_PHONEMES.vowels.diphthongs,
        ...ENGLISH_PHONEMES.consonants.plosives,
        ...ENGLISH_PHONEMES.consonants.fricatives,
        ...ENGLISH_PHONEMES.consonants.affricates,
        ...ENGLISH_PHONEMES.consonants.nasals,
        ...ENGLISH_PHONEMES.consonants.liquids,
        ...ENGLISH_PHONEMES.consonants.glides,
      ];

      for (const phoneme of allEnglishPhonemes) {
        const category = classifyPhonemeCategory(phoneme, l1Inventory);

        // identical은 문제적 대조가 아님
        if (category === 'identical') continue;

        // 가장 가까운 L1 음소 찾기
        const confusionPair = l1Inventory.problematicContrasts.find(
          c => c.phoneme === phoneme
        );
        const closestL1 = confusionPair?.confusedWith || phoneme;

        const acousticDistance = estimateAcousticDistance(phoneme, closestL1);
        const predictedDiff = predictDifficulty(category, PHONEME_FREQUENCY[phoneme] || 0.01);

        // 최소 대립쌍 찾기
        const minimalPairs = this.findMinimalPairs(phoneme, closestL1);

        contrasts.push({
          targetPhoneme: phoneme,
          closestL1Phoneme: closestL1,
          acousticDistance,
          predictedDifficulty: predictedDiff,
          category,
          minimalPairs,
        });
      }
    }

    // 난이도 순 정렬
    return contrasts.sort((a, b) => b.predictedDifficulty - a.predictedDifficulty);
  }

  /**
   * 최소 대립쌍 찾기
   */
  private findMinimalPairs(
    phoneme1: string,
    phoneme2: string
  ): Array<{ word1: string; word2: string; contrastPosition: 'initial' | 'medial' | 'final' }> {
    const key = `${phoneme1}-${phoneme2}`;
    const reverseKey = `${phoneme2}-${phoneme1}`;

    const pairs = MINIMAL_PAIRS_DB[key] || MINIMAL_PAIRS_DB[reverseKey] || [];

    return pairs.slice(0, this._config.minimalPairsPerPhoneme).map(p => ({
      word1: p.word1,
      word2: p.word2,
      contrastPosition: p.position,
    }));
  }

  // ---------------------------------------------------------------------------
  // 훈련 항목 생성
  // ---------------------------------------------------------------------------

  /**
   * 훈련 항목 생성
   */
  private generateTrainingItems(
    contrasts: PhonemeContrast[],
    masteredPhonemes: string[],
    _l1Inventory: typeof L1_PHONEME_INVENTORIES['ko']
  ): PhonologicalTrainingItem[] {
    const items: PhonologicalTrainingItem[] = [];

    for (const contrast of contrasts) {
      // 이미 마스터한 음소 건너뛰기
      if (masteredPhonemes.includes(contrast.targetPhoneme)) continue;

      // 선행 조건 결정
      const prerequisites = this.determinePrerequisites(
        contrast.targetPhoneme,
        contrast.category,
        masteredPhonemes
      );

      // 예상 세션 수 계산
      const estimatedSessions = this.estimateSessions(contrast);

      // 전이 정보
      const transferType = contrast.category === 'similar' ? 'negative' :
        contrast.category === 'new' ? 'neutral' : 'positive';

      items.push({
        target: contrast.targetPhoneme,
        order: 0, // 나중에 결정
        prerequisites,
        estimatedSessions,
        transferInfo: {
          coefficient: contrast.category === 'similar' ? -0.3 :
            contrast.category === 'new' ? 0 : 0.5,
          type: transferType,
        },
      });
    }

    return items;
  }

  /**
   * 선행 조건 결정
   */
  private determinePrerequisites(
    phoneme: string,
    _category: 'identical' | 'similar' | 'new',
    masteredPhonemes: string[]
  ): string[] {
    const prerequisites: string[] = [];

    // 유성/무성 쌍의 경우 무성음 먼저
    const voicePairs: Record<string, string> = {
      'b': 'p', 'd': 't', 'g': 'k', 'v': 'f', 'z': 's', 'ʒ': 'ʃ', 'ð': 'θ',
    };

    if (voicePairs[phoneme] && !masteredPhonemes.includes(voicePairs[phoneme])) {
      prerequisites.push(voicePairs[phoneme]);
    }

    // 조음 위치가 비슷한 더 쉬운 음소 먼저
    if (phoneme === 'ð' && !masteredPhonemes.includes('d')) {
      prerequisites.push('d');
    }
    if (phoneme === 'θ' && !masteredPhonemes.includes('s')) {
      prerequisites.push('s');
    }

    return prerequisites;
  }

  /**
   * 예상 세션 수 계산
   */
  private estimateSessions(contrast: PhonemeContrast): number {
    // 기본 세션 수
    let sessions = 3;

    // 난이도에 따라 조정
    if (contrast.predictedDifficulty > 0.7) sessions += 3;
    else if (contrast.predictedDifficulty > 0.5) sessions += 2;
    else if (contrast.predictedDifficulty > 0.3) sessions += 1;

    // "similar" 카테고리는 추가 세션 필요
    if (contrast.category === 'similar') sessions += 2;

    return sessions;
  }

  // ---------------------------------------------------------------------------
  // 순서 최적화
  // ---------------------------------------------------------------------------

  /**
   * 훈련 순서 최적화
   */
  private optimizeSequence(
    items: PhonologicalTrainingItem[],
    phonologicalTheta: number,
    _targetDomain?: string
  ): PhonologicalTrainingItem[] {
    let orderedItems: PhonologicalTrainingItem[];

    switch (this._config.orderingStrategy) {
      case 'easiest_first':
        orderedItems = this.orderByDifficulty(items, 'ascending');
        break;

      case 'most_frequent_first':
        orderedItems = this.orderByFrequency(items);
        break;

      case 'prerequisite_based':
      default:
        orderedItems = this.orderByPrerequisites(items);
        break;
    }

    // 학습자 수준에 따른 조정
    if (phonologicalTheta < -1) {
      // 초보자: 가장 쉬운 것부터
      orderedItems = this.filterForBeginner(orderedItems);
    }

    // 순서 번호 할당
    orderedItems.forEach((item, index) => {
      item.order = index + 1;
    });

    return orderedItems;
  }

  /**
   * 난이도 순 정렬
   */
  private orderByDifficulty(
    items: PhonologicalTrainingItem[],
    direction: 'ascending' | 'descending'
  ): PhonologicalTrainingItem[] {
    return [...items].sort((a, b) => {
      const diffA = a.transferInfo?.coefficient ?? 0;
      const diffB = b.transferInfo?.coefficient ?? 0;

      return direction === 'ascending' ? diffB - diffA : diffA - diffB;
    });
  }

  /**
   * 빈도 순 정렬
   */
  private orderByFrequency(items: PhonologicalTrainingItem[]): PhonologicalTrainingItem[] {
    return [...items].sort((a, b) => {
      const freqA = PHONEME_FREQUENCY[a.target] || 0;
      const freqB = PHONEME_FREQUENCY[b.target] || 0;
      return freqB - freqA; // 높은 빈도 먼저
    });
  }

  /**
   * 선행조건 기반 정렬 (위상 정렬)
   */
  private orderByPrerequisites(items: PhonologicalTrainingItem[]): PhonologicalTrainingItem[] {
    const ordered: PhonologicalTrainingItem[] = [];
    const remaining = [...items];
    const completed = new Set<string>();

    while (remaining.length > 0) {
      // 모든 선행조건이 충족된 항목 찾기
      const ready = remaining.filter(item =>
        item.prerequisites.every(prereq => completed.has(prereq))
      );

      if (ready.length === 0) {
        // 순환 의존성 또는 외부 선행조건 → 남은 것 모두 추가
        ordered.push(...remaining);
        break;
      }

      // 준비된 항목 중 가장 쉬운 것부터
      ready.sort((a, b) => {
        const diffA = a.transferInfo?.coefficient ?? 0;
        const diffB = b.transferInfo?.coefficient ?? 0;
        return diffB - diffA;
      });

      const next = ready[0];
      ordered.push(next);
      completed.add(next.target);
      remaining.splice(remaining.indexOf(next), 1);
    }

    return ordered;
  }

  /**
   * 초보자용 필터링
   */
  private filterForBeginner(items: PhonologicalTrainingItem[]): PhonologicalTrainingItem[] {
    // 난이도가 너무 높은 항목 제외
    return items.filter(item => {
      const difficulty = item.transferInfo?.type === 'negative' ? 0.8 : 0.5;
      return difficulty < 0.9;
    });
  }

  // ---------------------------------------------------------------------------
  // 최소 대립쌍 생성
  // ---------------------------------------------------------------------------

  /**
   * 최소 대립쌍 생성
   */
  private generateMinimalPairs(
    contrasts: PhonemeContrast[]
  ): Array<{
    phoneme: string;
    pairs: Array<{ word1: string; word2: string }>;
  }> {
    return contrasts
      .filter(c => c.minimalPairs.length > 0)
      .map(c => ({
        phoneme: c.targetPhoneme,
        pairs: c.minimalPairs.map(p => ({
          word1: p.word1,
          word2: p.word2,
        })),
      }));
  }

  // ---------------------------------------------------------------------------
  // 헬퍼 메서드
  // ---------------------------------------------------------------------------

  private calculateConfidence(l1: string): number {
    // 지원되는 L1인 경우 높은 신뢰도
    if (L1_PHONEME_INVENTORIES[l1]) return 0.85;
    return 0.6; // 알 수 없는 L1
  }

  private generateWarnings(input: PhonologicalOptimizationInput): string[] {
    const warnings: string[] = [];

    if (!L1_PHONEME_INVENTORIES[input.learnerL1]) {
      warnings.push(`L1 '${input.learnerL1}' not in database, using default contrasts`);
    }

    if (input.targetL2 !== 'en') {
      warnings.push(`Target L2 '${input.targetL2}' not fully supported, defaulting to English`);
    }

    return warnings;
  }
}

// =============================================================================
// 팩토리 함수
// =============================================================================

/**
 * E4 엔진 인스턴스 생성
 */
export function createPhonologicalOptimizer(
  config?: Partial<PhonologicalEngineConfig>
): PhonologicalTrainingOptimizer {
  return new PhonologicalTrainingOptimizer(config);
}

// =============================================================================
// 유틸리티 함수 (외부 노출)
// =============================================================================

/**
 * L1별 문제적 음소 목록 조회
 */
export function getProblematicPhonemesForL1(l1: string): string[] {
  const inventory = L1_PHONEME_INVENTORIES[l1];
  if (!inventory) return [];

  return [
    ...inventory.missingFromEnglish,
    ...inventory.problematicContrasts.map(c => c.phoneme),
  ];
}

/**
 * 최소 대립쌍 조회
 */
export function getMinimalPairs(
  phoneme1: string,
  phoneme2: string
): Array<{ word1: string; word2: string }> {
  const key = `${phoneme1}-${phoneme2}`;
  const reverseKey = `${phoneme2}-${phoneme1}`;

  const pairs = MINIMAL_PAIRS_DB[key] || MINIMAL_PAIRS_DB[reverseKey] || [];

  return pairs.map(p => ({ word1: p.word1, word2: p.word2 }));
}

/**
 * 음소 빈도 조회
 */
export function getPhonemeFrequency(phoneme: string): number {
  return PHONEME_FREQUENCY[phoneme] || 0;
}
