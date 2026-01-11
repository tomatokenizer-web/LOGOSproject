# Claude API Service

> **Code**: `src/main/services/claude.service.ts`
> **Tier**: 2 (Service Layer)

---

## Purpose

Handles all interactions with the Claude API. Content generation, error analysis, and adaptive hint provision.

**Key Features**:
- Online mode: Full Claude API integration
- Offline fallback: Template-based generation when API unavailable
- Response caching: Reduces API calls for repeated requests
- Graceful degradation: Automatic fallback on API errors

---

## Core Functions

### Content Generation

| Function | Purpose |
|----------|---------|
| `generateContent(request)` | Generate exercises, explanations, example sentences |
| `generateExercise(content, config)` | Generate customized exercises |
| `generateExplanation(content, config)` | Generate grammar/vocabulary explanations |

### Error Analysis

| Function | Purpose |
|----------|---------|
| `analyzeError(request)` | Analyze and classify learner errors |
| `categorizeError(response, expected)` | Classify as PHON/MORPH/LEX/SYNT/PRAG |

### Hint Generation

| Function | Purpose |
|----------|---------|
| `generateHint(request)` | Generate level-appropriate adaptive hints |

---

## Cache System

### ContentCache Class (lines 93-150)

```typescript
class ContentCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number = 30 * 60 * 1000;  // 30 minutes

  generateKey(prefix: string, params: Record<string, unknown>): string;
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, ttl?: number): void;
  clear(): void;
}
```

**Cache Strategy**:
- TTL-based expiration
- Key generation based on request parameters
- Automatic cleanup of expired entries

---

## Dependencies

```
claude.service.ts
  │
  ├──> @anthropic-ai/sdk (Claude API SDK)
  │
  ├──> offline-queue.service.ts (offline queuing)
  │
  └──> Consumers:
       ├── task-generation.service (content generation)
       ├── scoring-update.service (error analysis)
       └── IPC handlers (hint requests)
```

---

## Offline Fallback

Template-based content generation when API unavailable:

| Request Type | Fallback Behavior |
|--------------|-------------------|
| exercise | Use predefined templates |
| explanation | Return basic grammar rules |
| hint | Use progressive disclosure pattern |
| error_analysis | Levenshtein-based classification |
