# Corpus Source Registry

> **Last Updated**: 2026-01-05
> **Code Location**: `src/main/services/corpus-sources/registry.ts`
> **Status**: Active

---

## Context & Purpose

The Corpus Source Registry is the **central catalog** of all external content sources that LOGOS can draw from when extracting vocabulary and language patterns for learners. It exists because language learning cannot happen in isolation - learners need exposure to authentic, domain-specific language from reliable sources.

**Business/User Need**: When a user sets a learning goal (e.g., "prepare for CELBAN nursing exam"), LOGOS needs to find appropriate vocabulary and language patterns from trusted, relevant sources. A nurse preparing for certification needs medical terminology from Health Canada, not movie subtitles. Conversely, someone improving conversational English benefits more from TED talks than legal documents.

**When Used**:
- During **goal setup**: The system queries the registry to identify which sources match the user's domain (medical, legal, academic, etc.), benchmark (CELBAN, IELTS, TOEFL), and skill modalities (reading, listening, writing, speaking)
- During **vocabulary extraction**: When pulling new language objects into the system, sources are prioritized by reliability and relevance
- During **content generation**: When Claude generates practice materials, it uses source metadata to maintain appropriate register and domain context

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

This is a foundational module with **no internal dependencies** - it defines types and static data that other parts of the system consume. It stands alone as a configuration/registry pattern.

### Dependents (What Needs This)

- **Vocabulary Extraction Pipeline**: Uses `getSourcesByDomain()` and `getSourcesByBenchmark()` to select appropriate corpus sources when building a learner's vocabulary pool
- **Content Generation Service** (planned): Will use source metadata to inform Claude about appropriate register, formality, and domain conventions
- **Goal Configuration UI**: Displays available benchmarks and domains based on what sources support them
- **Priority Calculation** (`src/core/priority.ts`): The FRE (Frequency, Relational, Contextual) metrics may weight vocabulary differently based on source reliability scores
- **Session Service**: Uses source modality data to match practice sessions with appropriate content sources

### Data Flow

```
User creates learning goal (domain: medical, benchmark: CELBAN)
    |
    v
Goal Service queries registry: getSourcesByBenchmark('CELBAN')
    |
    v
Registry returns filtered, priority-sorted sources:
  1. CELBAN Sample Tests (priority: 100, reliability: 1.0)
  2. Health Canada (priority: 90, reliability: 0.95)
  3. PubMed Central (priority: 85, reliability: 0.95)
    |
    v
Vocabulary Extraction Service fetches content from sources in priority order
    |
    v
Language objects created with source metadata for provenance tracking
```

---

## Macroscale: System Integration

### Architectural Layer

The Corpus Source Registry sits in the **Service Layer** (Layer 2) of LOGOS's three-tier architecture:

```
Layer 1: Renderer (React UI)
    |
    v  [IPC calls]
Layer 2: Main Process Services  <-- Registry lives here
    |     - Corpus Source Registry (configuration/data)
    |     - Vocabulary Extraction
    |     - Content Generation
    v  [Database queries]
Layer 3: Database (Prisma/SQLite)
```

This is a **configuration module** - it provides static data and helper functions rather than complex business logic. It follows the **registry pattern** where a central catalog enables loose coupling between content consumers and content providers.

### Big Picture Impact

The Corpus Source Registry enables **goal-based personalization** - the core differentiator of LOGOS from generic vocabulary apps. Without it:

1. **Learning becomes generic**: Users studying for CELBAN would get the same vocabulary as general English learners
2. **Content lacks credibility**: Without reliability scores, unreliable sources (Reddit discussions) would be weighted equally with authoritative sources (Health Canada)
3. **Modality targeting breaks**: The system couldn't match listening practice with sources that have audio/transcript content (TED talks, podcasts) vs reading-only sources (Wikipedia)
4. **Benchmark alignment impossible**: Users preparing for specific exams wouldn't get vocabulary tuned to those assessments

### Critical Path Analysis

**Importance Level**: High (Foundation)

This is a **non-critical but foundational** component:
- **If it fails**: The vocabulary extraction pipeline cannot determine which sources to use. Fallback would be to use all sources indiscriminately, degrading personalization quality significantly
- **If it's incomplete**: Learning goals for unsupported domains/benchmarks cannot be properly served
- **Recovery path**: Since this is static configuration, recovery means updating the registry with correct source definitions

**System Dependencies**:
- Every goal-based feature depends on accurate source categorization
- Claude-generated content quality depends on understanding domain context from source metadata
- User trust depends on showing learners that their vocabulary comes from authoritative sources (reliability scores)

---

## Technical Concepts (Plain English)

### Source Type Taxonomy

**Technical**: A discriminated union type (`SourceType`) categorizing corpus sources into semantic categories: government, academic, media, exam, social, encyclopedia, corpus, user_upload, claude_generated.

**Plain English**: A labeling system that puts sources into buckets based on what kind of organization or content they represent. Like sorting books in a library into sections (Reference, Government Documents, Periodicals, etc.), this helps the system quickly find the right kind of source for any learning need.

**Why We Use It**: Different source types have different characteristics. Government sources are highly reliable for official terminology. Media sources capture conversational language. Exam sources perfectly match assessment requirements. The type system enables intelligent source selection.

### Reliability Score

**Technical**: A floating-point value from 0 to 1 representing the trustworthiness and accuracy of content from a source, used for weighted prioritization in vocabulary extraction.

**Plain English**: A "trust rating" for each source. Health Canada gets 0.95 (highly trusted - it's the official government health authority). Movie subtitles get 0.70 (less trusted - subtitles often have errors, slang, or non-standard language). When building vocabulary, the system prefers higher-rated sources.

**Why We Use It**: Language learners, especially those preparing for professional certifications, need accurate vocabulary. A nurse learning medical English shouldn't memorize a transcription error from a podcast. Reliability scores ensure authoritative sources are preferred.

### Access Method

**Technical**: An enumerated type (`AccessMethod`) indicating how content is retrieved from each source: api (programmatic interface), scrape (web scraping), static (pre-loaded files), claude (AI generation), upload (user-provided).

**Plain English**: The "how do we get the content?" label for each source. Some sources have official APIs (like Wikipedia) where we can request data politely. Others require web scraping (like TED talks) where we visit pages and extract text. Some content is pre-loaded (exam samples) or generated on-demand (Claude).

**Why We Use It**: Different access methods require different technical implementations, rate limiting strategies, and caching approaches. The system needs to know how to talk to each source.

### Priority Ranking

**Technical**: An integer value (typically 50-100) determining the order in which sources are consulted when multiple sources match a query, with higher values indicating preference.

**Plain English**: A "preference order" when multiple sources could provide vocabulary for the same domain. CELBAN Sample Tests get priority 100 for medical/nursing domains because they're the gold standard for that specific exam. General sources like Wikipedia get lower priority (70) - useful for fill-in gaps but not the primary source.

**Why We Use It**: When a user studies for CELBAN, the system should prioritize official CELBAN materials, then medical literature (PubMed), then government health sites (Health Canada), and only then fall back to general sources. Priority creates this intelligent ordering.

### Domain-Based Filtering

**Technical**: The `getSourcesByDomain()` function filters the corpus registry to return sources whose `domains` array includes the requested domain or the wildcard `'*'`.

**Plain English**: A search function that finds sources relevant to a specific topic area. Asking for "medical" sources returns Health Canada, PubMed, CELBAN samples, and Reddit Medical Communities - but not TED talks or legal documents. Sources marked with `'*'` (like Wikipedia) match everything because they cover all topics.

**Why We Use It**: Different learning goals require different vocabulary. Legal English students need Justice Laws Canada. Medical students need PubMed. The filtering ensures learners get domain-appropriate content.

### Benchmark Alignment

**Technical**: The optional `benchmarks` array on each source indicates which standardized assessments (CELBAN, IELTS, TOEFL, CELPIP) the source's content is relevant for.

**Plain English**: A tag system showing which official tests each source helps prepare for. CELBAN Sample Tests are tagged with "CELBAN" - obvious. But Health Canada is also tagged with "CELBAN" because nursing exam vocabulary appears in government health documents. Immigration Canada is tagged with "IELTS" and "CELPIP" because immigration-related English overlaps with those tests.

**Why We Use It**: Users don't just want general English - they want to pass specific tests. Benchmark tags let the system prioritize sources that contain vocabulary and language patterns actually tested on those assessments.

### Modality Matching

**Technical**: The `modalities` array specifies which language skills (reading, listening, writing, speaking) each source supports, enabling targeted skill practice.

**Plain English**: A label showing what kind of practice each source supports. Wikipedia is reading-only. TED talks support listening AND speaking practice (you can listen to speeches and practice presentation language). Movie subtitles capture spoken dialogue patterns useful for listening and speaking skills.

**Why We Use It**: A user practicing for the IELTS speaking test needs sources with conversational language patterns. A user improving reading comprehension needs sources with dense written text. Modality tags enable this matching.

---

## Source Categories Explained

### Government & Official Sources (Priority: 85-90, Reliability: 0.95)

These are **authoritative, primary sources** from official Canadian government bodies:

| Source | Purpose in LOGOS |
|--------|-----------------|
| **Health Canada** | Medical terminology, health regulations, patient safety language - essential for CELBAN nursing candidates |
| **Justice Laws Canada** | Legal terminology, statutory language, regulatory text - for legal English learners |
| **Immigration Canada** | Immigration processes, citizenship requirements, application language - IELTS/CELPIP alignment |

Government sources have the highest reliability scores because they represent official, reviewed, and standardized language.

### Academic & Research Sources (Priority: 75-85, Reliability: 0.90-0.95)

**Scholarly sources** providing domain-specific academic vocabulary:

| Source | Purpose in LOGOS |
|--------|-----------------|
| **PubMed Central** | Biomedical research vocabulary - critical for healthcare professionals needing research literacy |
| **arXiv** | Technical/academic vocabulary - useful for STEM learners |

These sources expose learners to formal academic register and specialized terminology.

### Exam Banks (Priority: 100, Reliability: 0.95-1.0)

**The gold standard** - actual practice materials from target assessments:

| Source | Purpose in LOGOS |
|--------|-----------------|
| **CELBAN Samples** | Official CELBAN practice questions - the definitive source for nursing English |
| **IELTS Practice** | IELTS preparation materials - aligned to test format and vocabulary |
| **TOEFL Practice** | TOEFL iBT materials - academic English for university admission |

These have the highest priority because they represent exactly what learners will encounter on exams.

### Media & Entertainment (Priority: 60-80, Reliability: 0.70-0.90)

**Authentic language in use** - capturing how real people communicate:

| Source | Purpose in LOGOS |
|--------|-----------------|
| **OpenSubtitles** | Conversational, informal language patterns - colloquialisms, idioms, slang |
| **TED Talks** | Presentation language, clear explanation patterns - excellent for speaking practice |
| **Podcasts** | Informal spoken English, interview patterns - listening comprehension |

Lower reliability reflects that media language is less standardized, but these sources provide essential exposure to authentic usage.

### Social & Community (Priority: 50-70, Reliability: 0.60-0.80)

**Real-world informal communication**:

| Source | Purpose in LOGOS |
|--------|-----------------|
| **Reddit Medical** | Informal medical discussions - how healthcare workers actually talk to each other |
| **StackExchange** | Technical Q&A language - problem-solving communication patterns |

Lower priority and reliability, but valuable for exposing learners to how domain experts communicate informally.

### Reference & Encyclopedia (Priority: 70-80, Reliability: 0.85)

**General knowledge sources**:

| Source | Purpose in LOGOS |
|--------|-----------------|
| **Wikipedia** | Broad vocabulary coverage across all domains - the backup for gaps |
| **Simple Wikipedia** | Simplified explanations - useful for lower-level learners |
| **Wiktionary** | Word definitions and usage examples - dictionary support |

These are "wildcard" sources (domains: ['*']) that fill gaps when specialized sources don't cover something.

### Linguistic Corpora (Priority: 80-85, Reliability: 0.95)

**Professionally curated language databases**:

| Source | Purpose in LOGOS |
|--------|-----------------|
| **COCA** | Corpus of Contemporary American English - 1 billion words, gold standard for American English |
| **BNC** | British National Corpus - 100 million words of British English |

These are research-grade language databases with frequency information, enabling accurate FRE (Frequency, Relational, Contextual) metric calculation.

### Special Sources (Priority: 60-95, Reliability: 0.80-0.85)

**Non-traditional content sources**:

| Source | Purpose in LOGOS |
|--------|-----------------|
| **User Uploads** | Documents uploaded by learners - their own textbooks, workplace materials, etc. |
| **Claude Generated** | AI-generated vocabulary and examples - fallback when other sources unavailable |

User uploads have high priority (95) because learner-provided materials are highly relevant to their specific needs. Claude-generated content has lower priority (60) as a fallback but is always available.

---

## Helper Functions Reference

### `getEnabledSources(): CorpusSource[]`
Returns all sources where `enabled: true`. Used to get the full working catalog.

### `getSourceById(id: string): CorpusSource | undefined`
Retrieves a specific source by its unique identifier. Used when processing vocabulary with known provenance.

### `getSourcesByType(type: SourceType): CorpusSource[]`
Filters to a specific category (government, academic, etc.). Used for broad category selection.

### `getSourcesByDomain(domain: string): CorpusSource[]`
Finds sources relevant to a learning domain. **Critical function** for goal-based personalization. Handles wildcard domains ('*').

### `getSourcesByBenchmark(benchmark: string): CorpusSource[]`
Finds sources aligned to a specific assessment. **Critical function** for exam preparation goals.

### `getSourcesByModality(modality: string): CorpusSource[]`
Filters by skill (reading, listening, writing, speaking). Used for skill-focused practice sessions.

---

## Change History

### 2026-01-05 - Initial Implementation
- **What Changed**: Created comprehensive corpus source registry with 20 sources across 9 categories
- **Why**: LOGOS needs a central catalog of content sources to enable goal-based personalization
- **Impact**: Enables vocabulary extraction pipeline, content generation, and benchmark-aligned learning

---

## Design Decisions & Rationale

### Why Static Configuration vs Database?

The registry uses a **static TypeScript array** rather than database storage because:
1. Sources change infrequently - adding a new corpus is a development task, not a user action
2. Type safety - TypeScript can validate source definitions at compile time
3. Simplicity - no migration needed for source updates, just code deployment
4. Performance - no database query for frequently-accessed configuration

### Why Separate Priority from Reliability?

**Reliability** measures content accuracy. **Priority** measures preference order. A source can be highly reliable but low priority (BNC is extremely reliable but less relevant than COCA for North American learners). Separation allows nuanced source selection.

### Why Include Claude-Generated Content?

As a fallback source, Claude-generated content ensures the system can always provide vocabulary and examples even when:
- No corpus sources cover a niche domain
- API access to external sources fails
- User needs immediate content before corpus indexing completes

The lower priority (60) ensures it's used only when better sources are unavailable.
