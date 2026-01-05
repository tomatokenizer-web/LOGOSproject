# Error Analysis Repository

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/db/repositories/error-analysis.repository.ts`
> **Status**: Active
> **Phase**: Gap 1.1 - Threshold Detection Algorithm

---

## Context & Purpose

### Why Error Analysis Exists

When a language learner makes mistakes, **understanding the nature of those mistakes is more valuable than simply marking them wrong**. A student who consistently struggles with past tense "-ed" endings has a fundamentally different learning need than one who confuses similar-sounding words.

The Error Analysis Repository exists to **persist, query, and analyze error patterns across learning sessions**. It transforms raw incorrect responses into actionable intelligence about what linguistic sub-skills are blocking a learner's progress.

**Business Need**: Adaptive tutoring requires knowing not just *that* a learner is struggling, but *why*. Generic feedback like "practice more vocabulary" is far less helpful than specific guidance like "your morphology errors (verb endings) are causing downstream vocabulary mistakes."

**When Used**:
- After response evaluation when errors are detected (creating analysis records)
- During session summary generation (identifying patterns within a session)
- When building remediation plans (prioritizing which skills to focus on)
- In analytics dashboards (visualizing error trends over time)
- When the bottleneck detection algorithm needs historical error data

### The Component Model: Five Linguistic Pillars

LOGOS categorizes all errors into five linguistic components, forming a cascade hierarchy:

| Component | Code | Description | Plain English |
|-----------|------|-------------|---------------|
| Phonology | PHON | Sound system | "How words sound" |
| Morphology | MORPH | Word formation | "How words are built (prefixes, suffixes, roots)" |
| Lexical | LEX | Vocabulary | "Which words to use" |
| Syntax | SYNT | Sentence structure | "How words fit together in sentences" |
| Pragmatics | PRAG | Context/Register | "How to speak appropriately for the situation" |

**Critical Insight**: These components form a **cascade** where earlier components cause downstream effects:

```
PHON --> MORPH --> LEX --> SYNT --> PRAG
```

If a learner struggles with morphology (verb endings like "-ing", "-ed"), they will appear to have vocabulary problems (using "walk" instead of "walked") and syntax problems (incorrect tense agreement). The error analysis repository tracks this data so the bottleneck detector can trace back to the root cause.

### Connection to Gap 1.1: Threshold Detection Algorithm

This repository implements the data layer for **Gap 1.1** from `GAPS-AND-CONNECTIONS.md`:

> **Problem**: How to automatically identify which sub-skill is the bottleneck blocking overall advancement.

The repository provides:
1. **Error pattern identification** - grouping errors by component/type
2. **Co-occurrence detection** - finding errors that appear together
3. **Component statistics** - tracking error rates per linguistic pillar
4. **Bottleneck flags** - marking components exceeding threshold error rates
5. **Remediation plans** - generating prioritized improvement recommendations

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

- **`src/main/db/prisma.ts`**: `getPrisma()` - The centralized database connection provider. Every function in this repository begins by acquiring the Prisma client through this function.

- **`@prisma/client`**: `ErrorAnalysis`, `ComponentErrorStats`, `Prisma` types - TypeScript type definitions generated from the Prisma schema ensuring type-safe database operations.

### Dependents (What Needs This)

- **`src/main/ipc/response.ipc.ts`**: The response evaluation IPC handler calls `createErrorAnalysis()` when Claude AI identifies errors in learner responses. Each incorrect answer triggers an analysis record creation.

- **`src/main/services/session-summary.ts`**: After a learning session completes, the summary service calls `identifyErrorPatterns()` and `findCooccurringErrors()` to generate session-specific insights.

- **`src/main/services/bottleneck.service.ts`**: The bottleneck detection service uses `detectBottlenecks()` and `getPrimaryBottleneck()` to identify which component is blocking learner progress.

- **`src/main/ipc/analytics.ipc.ts`**: Analytics IPC handlers query `getUserComponentStats()` to populate error rate visualizations on the dashboard.

- **`src/renderer/components/analytics/ErrorPatternChart.tsx`**: Consumes error pattern data to render visualizations of where learners struggle most.

- **`src/core/bottleneck.ts`**: The pure algorithm module uses this repository's data to perform cascade analysis and root cause identification.

### Data Flow

```
User submits incorrect response
        |
        v
response.ipc.ts (evaluate response)
        |
        +--> Claude AI analyzes the error
        |         |
        |         v
        |    [Identifies component, error type, explanation, correction]
        |
        +--> createErrorAnalysis(input)
        |         |
        |         v
        |    [Persist error record to ErrorAnalysis table]
        |
        +--> recalculateComponentStats(userId, goalId)  [async, batched]
                  |
                  v
             [Update ComponentErrorStats aggregates]
                  |
                  v
             [Check if threshold exceeded]
                  |
                  v
             detectBottlenecks() --> isBottleneck: true/false
```

**Pattern Identification Flow**:

```
Session ends
     |
     v
identifyErrorPatterns(goalId, windowDays=14)
     |
     +--> Query all errors in time window
     |
     +--> Group by component:errorType key
     |
     +--> Count total and recent occurrences
     |
     +--> Keep up to 3 examples per pattern
     |
     v
Return ErrorPattern[] sorted by frequency
```

**Co-occurrence Detection Flow**:

```
findCooccurringErrors(goalId, windowDays=14)
     |
     +--> Query all incorrect responses with errors
     |
     +--> Group responses by sessionId
     |
     +--> For each session, collect unique component codes
     |
     +--> Count how often component pairs appear together
     |
     v
Return [{components: ['MORPH', 'LEX'], count: 12}, ...]
```

---

## Macroscale: System Integration

### Architectural Layer

This repository sits in the **Data Access Layer** of LOGOS's architecture:

```
Layer 1: Presentation (React UI)
    |
    | IPC Bridge
    v
Layer 2: Application Logic (Services + IPC Handlers)
    |
    | Repository Pattern
    v
Layer 3: DATA ACCESS LAYER <-- You are here (error-analysis.repository.ts)
    |
    | Prisma ORM
    v
Layer 4: Database (SQLite)
```

The error analysis repository collaborates with the **core bottleneck algorithm** (`src/core/bottleneck.ts`) which performs the cascade analysis in pure TypeScript. The repository provides the persistent data; the core module provides the intelligence.

### Big Picture Impact

The Error Analysis Repository is the **diagnostic memory** of LOGOS's adaptive system. Without it:

1. **No pattern recognition**: The system couldn't identify recurring weaknesses across sessions
2. **No bottleneck detection**: Gap 1.1 would be unimplemented - learners would receive generic rather than targeted feedback
3. **No remediation planning**: The "Focus on [X]" recommendations would be impossible to generate
4. **No cascade analysis**: Downstream effects would be misdiagnosed as root causes

**Critical Path Analysis**: This is a **Tier 2 Important Component**. The system can function without it (practice sessions still work), but the adaptive intelligence degrades significantly:
- Feedback becomes generic rather than specific
- Learners waste time on symptoms rather than root causes
- Progress analytics lose their diagnostic depth
- The "smart tutor" becomes a "dumb flashcard deck"

### Integration with Gap 1.1 Algorithm

The repository implements the data persistence side of the Threshold Detection Algorithm:

```
GAPS-AND-CONNECTIONS.md Definition:
----------------------------------
"Algorithm that:
 1. Analyzes error patterns across component types
 2. Identifies the minimal blocking skill
 3. Generates targeted remediation tasks"

Repository Implementation:
-------------------------
1. identifyErrorPatterns()      --> Analyzes patterns
2. detectBottlenecks()          --> Identifies blocking components
   getPrimaryBottleneck()       --> Finds the minimal blocking skill
3. generateRemediationPlan()    --> Creates targeted task recommendations
```

### Relationship to Mastery Repository

The error analysis repository complements `mastery.repository.ts`:

| Mastery Repository | Error Analysis Repository |
|--------------------|---------------------------|
| Tracks *what* you know | Tracks *where* you struggle |
| Stage 0-4 progression | Component-level diagnostics |
| FSRS scheduling | Pattern recognition |
| "When to practice" | "What to practice" |

Together they form the **dual pillars of adaptive learning**: mastery tells us the learner's current ability level; error analysis tells us why they're stuck at that level.

---

## Technical Concepts (Plain English)

### Error Analysis Record

**Technical**: A database record capturing the linguistic classification of an incorrect response, including component code (PHON/MORPH/LEX/SYNT/PRAG), error type string, explanation, correction, confidence score, and analysis source.

**Plain English**: Every time you make a mistake, the system writes down *what kind* of mistake it was. Not just "wrong" but specifically "morphology error - incorrect past tense ending" with an explanation of what you should have said.

**Why We Use It**: To build a memory of your specific weaknesses over time. One mistake is noise; ten similar mistakes is a pattern that deserves attention.

### Component Error Stats

**Technical**: Aggregate statistics tracking error rate, trend, total errors, recent errors, and recommendation text per linguistic component per user/goal combination.

**Plain English**: A running scoreboard of how you're doing in each language area. If your vocabulary error rate is 15% but your morphology error rate is 45%, you'll see that clearly and get recommendations to focus on morphology.

**Why We Use It**: Individual error records are too granular for decision-making. Aggregates provide the "big picture" view that determines bottleneck detection.

### Error Pattern

**Technical**: A grouping of similar errors by component and error type, with occurrence counts (total and recent) and up to 3 concrete examples from the learner's actual responses.

**Plain English**: If you keep making the same mistake, the system groups those together and says "You've made this mistake 7 times in the last two weeks, and here are 3 examples." This makes the pattern concrete and actionable.

**Why We Use It**: Humans learn better from specific examples than abstract statistics. "You struggle with -ed endings" is good; "You wrote 'I walk to work yesterday' instead of 'I walked to work yesterday'" is better.

### Co-occurring Errors

**Technical**: A correlation analysis that identifies which component error types tend to appear together within the same learning session, counted as pair frequencies.

**Plain English**: Some errors travel in packs. If every session where you struggle with vocabulary also has morphology errors, that's a clue that morphology might be the root cause. It's like a doctor noticing that patients with fever also tend to have headaches - it helps diagnose the underlying condition.

**Why We Use It**: The cascade model predicts that errors in early components (PHON, MORPH) cause apparent errors in later components (LEX, SYNT, PRAG). Co-occurrence data validates this cascade and helps identify root causes.

### Bottleneck Detection

**Technical**: An algorithm that identifies components where error rate exceeds a threshold (default 30%) or trend exceeds 0.5, flagging them as `isBottleneck: true` for prioritized attention.

**Plain English**: A "bottleneck" is whatever is holding you back the most. If your morphology error rate is above 30%, that's flagged as your bottleneck - the thing you should focus on before worrying about other skills.

**Why We Use It**: Learners often want to practice vocabulary (it feels productive), but if morphology is their bottleneck, vocabulary drills won't help until morphology improves. The bottleneck detector enforces focus on root causes.

### Remediation Plan

**Technical**: A prioritized list of recommendations including component code, priority level (high/medium/low), recommendation text, and suggested task types, generated by combining bottleneck analysis with error pattern data.

**Plain English**: After analyzing your errors, the system creates a "prescription" - a prioritized list of what to work on, with specific exercise types for each area. Like a doctor writing orders for which treatments to do first.

**Why We Use It**: Data without action is useless. The remediation plan translates error analysis into concrete learning recommendations that the UI can present and the task selection algorithm can implement.

### Task Type Mapping

**Technical**: A predefined mapping from component codes to suggested task types, implemented in `getTaskTypesForComponent()`.

**Plain English**: Each language skill area has exercises that work best for it:
- Phonology (sounds): dictation, listening comprehension
- Morphology (word forms): fill-in-the-blank with constraints, word formation analysis
- Vocabulary: cloze deletion, matching, word banks
- Syntax: sentence combining/splitting, error correction
- Pragmatics: register shifting, dialogue completion

**Why We Use It**: Not all exercises train all skills equally. By mapping components to optimal task types, the remediation plan includes actionable suggestions rather than vague "practice more" advice.

### Analysis Source

**Technical**: An enum-like type (`'claude' | 'rule_based' | 'hybrid'`) indicating whether the error analysis was generated by Claude AI, rule-based pattern matching, or a combination.

**Plain English**: The system can figure out what kind of mistake you made in two ways:
- **Claude**: The AI reads your answer and explains what went wrong (smart but slower/costlier)
- **Rule-based**: Predefined patterns detect common errors (fast but limited)
- **Hybrid**: Rules detect, Claude explains (balanced)

**Why We Use It**: Tracking the source helps evaluate analysis quality and costs. If rule-based detection has high accuracy for certain error types, we can avoid API calls for those cases.

### Confidence Score

**Technical**: A 0-1 floating-point value indicating how confident the system is in its error classification, defaulting to 0.8.

**Plain English**: The system's self-assessment of "how sure am I about this diagnosis?" High confidence (0.9+) means the error clearly matches known patterns. Lower confidence (0.6-0.7) means it might be something else.

**Why We Use It**: Low-confidence diagnoses should be weighted less heavily in bottleneck calculations. If the system isn't sure whether an error is morphological or syntactic, it shouldn't strongly influence the recommendation.

### Trend Calculation

**Technical**: A measure of whether errors are increasing or decreasing, calculated as `(recentErrors - olderErrors/2) / (olderErrors/2)`, where positive values indicate worsening performance.

**Plain English**: Are you getting better or worse at this skill? The trend compares your error rate in the last 7 days to the 7 days before that. Positive trend = getting worse (red flag). Negative trend = improving (keep it up).

**Why We Use It**: A component with 30% error rate but improving trend is less concerning than one with 25% error rate but worsening trend. Trend helps prioritize interventions for skills that are sliding backward.

---

## Function Reference

### Error Analysis CRUD

| Function | Purpose | When Used |
|----------|---------|-----------|
| `createErrorAnalysis()` | Record a new error with full classification | After Claude evaluates an incorrect response |
| `getErrorAnalysisForResponse()` | Retrieve error record by responseId | Display feedback for a specific answer |
| `getErrorAnalysesForObject()` | Get all errors for a language object | Review error history for a word/phrase |
| `getErrorsByComponent()` | Query errors filtered by component | Component-specific analytics |

### Pattern Recognition

| Function | Purpose | When Used |
|----------|---------|-----------|
| `identifyErrorPatterns()` | Group errors by component/type with examples | Session summary, pattern visualization |
| `findCooccurringErrors()` | Detect component pairs that fail together | Cascade analysis, root cause identification |

### Component Statistics

| Function | Purpose | When Used |
|----------|---------|-----------|
| `getOrCreateComponentStats()` | Initialize or retrieve component aggregates | Before updating stats |
| `updateComponentStats()` | Modify aggregate statistics | After recalculation |
| `getUserComponentStats()` | Get all component stats for a user | Dashboard analytics |
| `recalculateComponentStats()` | Recompute all stats from raw error data | Periodic refresh, data correction |

### Bottleneck Detection

| Function | Purpose | When Used |
|----------|---------|-----------|
| `detectBottlenecks()` | Identify all components above threshold | Bottleneck analysis |
| `getPrimaryBottleneck()` | Find the single most blocking component | Focus recommendation |
| `generateRemediationPlan()` | Create prioritized improvement recommendations | Session end, dashboard |

### Internal Utilities

| Function | Purpose | Visibility |
|----------|---------|------------|
| `getTaskTypesForComponent()` | Map component to suggested task types | Internal helper |

---

## Configuration & Thresholds

### Default Values

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `windowDays` | 14 | Time window for pattern analysis |
| `recentDays` | 7 | Definition of "recent" for trend calculation |
| `threshold` | 0.3 (30%) | Error rate above which component is flagged as bottleneck |
| `trendThreshold` | 0.5 | Trend value above which component is flagged as bottleneck |
| `confidence` | 0.8 | Default confidence for new error analyses |

### Priority Thresholds

| Priority | Error Rate | Trend | Meaning |
|----------|------------|-------|---------|
| High | >= 40% | OR > 0.5 | Urgent attention needed |
| Medium | >= 25% | OR > 0.2 | Should address soon |
| Low | >= 15% | - | Minor concern |

---

## Database Schema Context

The repository operates on two tables:

### ErrorAnalysis Table
```
- id: UUID primary key
- responseId: FK to Response (1:1)
- objectId: FK to LanguageObject
- component: String (PHON/MORPH/LEX/SYNT/PRAG)
- errorType: String (specific error category)
- explanation: String (what went wrong)
- correction: String (what should have been said)
- similarErrors: JSON (related past errors)
- confidence: Float (0-1)
- source: String (claude/rule_based/hybrid)
- createdAt: DateTime
```

### ComponentErrorStats Table
```
- id: UUID primary key
- userId: FK to User
- component: String (PHON/MORPH/LEX/SYNT/PRAG)
- goalId: FK to GoalSpec (nullable for user-wide stats)
- totalErrors: Int
- recentErrors: Int
- errorRate: Float (0-1)
- trend: Float (negative=improving, positive=worsening)
- recommendation: String (nullable)
- updatedAt: DateTime
Unique constraint: (userId, component, goalId)
```

---

## Change History

### 2026-01-04 - Gap 1.1 Implementation
- **What Changed**: Created error-analysis.repository.ts implementing full error tracking, pattern recognition, and bottleneck detection data layer
- **Why**: Implementing Gap 1.1 (Threshold Detection Algorithm) from GAPS-AND-CONNECTIONS.md
- **Impact**: Enables intelligent bottleneck identification, cascade analysis, and targeted remediation recommendations

### Design Decisions

1. **Five-component model (PHON/MORPH/LEX/SYNT/PRAG)**: Based on linguistic theory of language competence layers. This provides meaningful granularity without over-complicating the analysis.

2. **14-day analysis window**: Long enough to accumulate meaningful data, short enough to reflect current ability (not ancient history).

3. **Two-tier accuracy tracking (total vs recent)**: Enables trend calculation. A learner who made 50 morphology errors last month but only 5 this week is improving - we want to capture that.

4. **Example collection (max 3 per pattern)**: Concrete examples make patterns actionable for learners. Limiting to 3 prevents storage bloat while providing sufficient illustration.

5. **Session-based co-occurrence**: Errors in the same session are more likely causally related than errors days apart. Session grouping improves cascade detection accuracy.

6. **Threshold at 30%**: Balances sensitivity (catching real problems) with specificity (not flagging normal variation). Derived from educational research on significant skill gaps.

7. **Task type mapping hardcoded**: While the mapping could be database-driven, hardcoding ensures consistency and avoids the complexity of maintaining task metadata. The mapping is based on established language teaching methodology.

---

*This documentation mirrors: `src/main/db/repositories/error-analysis.repository.ts`*
