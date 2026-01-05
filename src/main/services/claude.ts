/**
 * Claude API Service
 *
 * Handles all Claude API interactions for the LOGOS application.
 * Provides content generation, error analysis, and adaptive hints.
 *
 * Uses the Anthropic SDK for type-safe API access.
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Types
// ============================================================================

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export interface ContentRequest {
  type: 'exercise' | 'explanation' | 'example';
  content: string;
  targetLanguage: string;
  nativeLanguage: string;
  context?: string;
  difficulty?: number;
}

export interface ErrorAnalysisRequest {
  content: string;
  userResponse: string;
  expectedResponse: string;
  targetLanguage: string;
  nativeLanguage: string;
}

export interface HintRequest {
  content: string;
  translation?: string;
  targetLanguage: string;
  nativeLanguage: string;
  hintLevel: 1 | 2 | 3;
  previousHints?: string[];
}

export interface GeneratedContent {
  content: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorAnalysis {
  errorType: string;
  component: 'PHON' | 'MORPH' | 'LEX' | 'SYNT' | 'PRAG';
  explanation: string;
  correction: string;
  similarErrors?: string[];
}

export interface Hint {
  hint: string;
  level: number;
  remainingLevels: number;
}

// ============================================================================
// Claude Service Class
// ============================================================================

/**
 * Claude API service for language learning assistance.
 *
 * Provides:
 * - Content generation (exercises, explanations, examples)
 * - Error analysis with component classification
 * - Adaptive hint generation with scaffolding levels
 */
export class ClaudeService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 1024;
  }

  /**
   * Generate learning content based on request type.
   */
  async generateContent(request: ContentRequest): Promise<GeneratedContent> {
    const systemPrompt = this.buildContentSystemPrompt(request);
    const userPrompt = this.buildContentUserPrompt(request);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return {
      content: textContent.text,
      type: request.type,
      metadata: {
        model: this.model,
        tokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Analyze a learner's error and classify by component.
   */
  async analyzeError(request: ErrorAnalysisRequest): Promise<ErrorAnalysis> {
    const systemPrompt = `You are a language learning error analyst. Analyze errors in ${request.targetLanguage} learning for a ${request.nativeLanguage} speaker.

Classify errors into one of these linguistic components:
- PHON: Phonological errors (pronunciation, sound patterns)
- MORPH: Morphological errors (word formation, conjugation, declension)
- LEX: Lexical errors (vocabulary, word choice, collocations)
- SYNT: Syntactic errors (word order, sentence structure, agreement)
- PRAG: Pragmatic errors (register, politeness, cultural appropriateness)

Respond in JSON format:
{
  "errorType": "brief error category",
  "component": "PHON|MORPH|LEX|SYNT|PRAG",
  "explanation": "clear explanation of what went wrong",
  "correction": "the correct form",
  "similarErrors": ["other common similar mistakes"]
}`;

    const userPrompt = `Analyze this error:
Target: "${request.content}"
User wrote: "${request.userResponse}"
Expected: "${request.expectedResponse}"`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    try {
      // Extract JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]) as ErrorAnalysis;
    } catch {
      // Fallback if JSON parsing fails
      return {
        errorType: 'Unknown',
        component: 'LEX',
        explanation: textContent.text,
        correction: request.expectedResponse,
      };
    }
  }

  /**
   * Generate an adaptive hint based on scaffolding level.
   *
   * Hint levels:
   * 1 - Minimal: Just a nudge in the right direction
   * 2 - Moderate: More specific guidance
   * 3 - Full: Nearly complete answer with explanation
   */
  async getHint(request: HintRequest): Promise<Hint> {
    const levelDescriptions = {
      1: 'Give a minimal hint - just nudge them in the right direction without giving away the answer. Be very brief.',
      2: 'Give a moderate hint - provide more specific guidance. You can mention the general category or pattern.',
      3: 'Give a full hint - provide substantial help. Explain the concept and give most of the answer.',
    };

    const previousHintsContext = request.previousHints?.length
      ? `\nPrevious hints given:\n${request.previousHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\nProvide a NEW hint that builds on these.`
      : '';

    const systemPrompt = `You are a language tutor helping someone learn ${request.targetLanguage}. Their native language is ${request.nativeLanguage}.

${levelDescriptions[request.hintLevel]}
${previousHintsContext}

Respond with just the hint text, no preamble.`;

    const userPrompt = `The learner needs help with: "${request.content}"${request.translation ? `\nMeaning: "${request.translation}"` : ''}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return {
      hint: textContent.text.trim(),
      level: request.hintLevel,
      remainingLevels: 3 - request.hintLevel,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private buildContentSystemPrompt(request: ContentRequest): string {
    const basePrompt = `You are a language learning content generator for ${request.targetLanguage} learners whose native language is ${request.nativeLanguage}.`;

    switch (request.type) {
      case 'exercise':
        return `${basePrompt}

Generate a learning exercise. Consider the difficulty level (${request.difficulty ?? 'intermediate'}).
Format your response as:
1. The exercise prompt/question
2. The expected answer
3. Any notes for the learner`;

      case 'explanation':
        return `${basePrompt}

Provide a clear, concise explanation. Use examples from both ${request.targetLanguage} and ${request.nativeLanguage} to illustrate the concept.
Focus on practical usage, not linguistic jargon.`;

      case 'example':
        return `${basePrompt}

Generate example sentences or usage patterns. Provide:
1. The ${request.targetLanguage} example
2. A natural ${request.nativeLanguage} translation
3. A brief note on usage context`;

      default:
        return basePrompt;
    }
  }

  private buildContentUserPrompt(request: ContentRequest): string {
    let prompt = `Generate ${request.type} content for: "${request.content}"`;

    if (request.context) {
      prompt += `\n\nContext: ${request.context}`;
    }

    if (request.difficulty !== undefined) {
      const levels = ['beginner', 'elementary', 'intermediate', 'upper-intermediate', 'advanced'];
      const level = levels[Math.min(Math.max(0, Math.floor(request.difficulty)), 4)];
      prompt += `\n\nDifficulty level: ${level}`;
    }

    return prompt;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let serviceInstance: ClaudeService | null = null;

/**
 * Get or create the Claude service instance.
 */
export function getClaudeService(apiKey?: string): ClaudeService {
  if (!serviceInstance) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    serviceInstance = new ClaudeService({ apiKey: key });
  }
  return serviceInstance;
}

/**
 * Reset the service instance (for testing).
 */
export function resetClaudeService(): void {
  serviceInstance = null;
}
