# LOGOS Shadow Documentation

> Comprehensive narrative documentation for the LOGOS language learning application

## Overview

This directory contains **shadow documentation** - detailed technical narratives that explain the *why* and *how* behind each code file. Unlike inline comments, shadow docs provide:

- Mathematical foundations and academic references
- Design decision rationale
- Algorithm explanations with complexity analysis
- Dependency graphs and data flow
- Component relationships

## Documentation Structure

```
docs/narrative/
├── INDEX.md                    # Master index with navigation
├── README.md                   # This file
│
├── src/
│   ├── core/                   # Tier 1: Core Algorithms
│   │   ├── priority.md         # Priority calculation (FRE/Cost)
│   │   ├── irt.md              # Item Response Theory
│   │   ├── g2p.md              # Grapheme-to-Phoneme analysis
│   │   ├── fsrs.md             # Free Spaced Repetition Scheduler
│   │   ├── pmi.md              # Pointwise Mutual Information
│   │   ├── morphology.md       # Morphological analysis (M Score)
│   │   ├── syntactic.md        # Syntactic complexity (Lu metrics)
│   │   ├── bottleneck.md       # Cascade bottleneck detection
│   │   ├── transfer.md         # L1-L2 transfer coefficients
│   │   ├── lexical.md          # Lexical analysis
│   │   ├── pragmatics.md       # Pragmatic component
│   │   ├── component-vectors.md # Five-component FRE model
│   │   └── ...
│   │
│   └── main/
│       ├── services/           # Tier 2: Service Layer
│       │   ├── claude.service.md
│       │   ├── component-prerequisite.service.md
│       │   ├── agent-trigger.service.md
│       │   ├── agent-hooks.service.md
│       │   ├── fluency-versatility.service.md
│       │   ├── generalization-estimation.service.md
│       │   └── ...
│       │
│       ├── db/                 # Database layer
│       │   └── repositories/
│       │
│       └── ipc/                # IPC handlers
│
└── _archive_ko/                # Archived Korean originals
```

## Tier System

| Tier | Layer | Documentation Depth | Examples |
|------|-------|---------------------|----------|
| **1** | Core Algorithms | Maximum - full mathematical derivations | IRT, FSRS, G2P, Priority |
| **2** | Services | High - business logic and integration | Claude API, Agent Trigger |
| **3** | Utilities | Standard - API reference | Helpers, Formatters |

## Key Concepts

### Five-Component Language Model

LOGOS uses a hierarchical language component model:

```
PHON → MORPH → LEX → SYNT → PRAG
```

| Component | Focus | Metrics |
|-----------|-------|---------|
| **PHON** | Phonology/Pronunciation | G2P entropy, L1 interference |
| **MORPH** | Morphology | M Score, affix productivity |
| **LEX** | Vocabulary | PMI, collocations |
| **SYNT** | Syntax | Lu metrics, T-unit complexity |
| **PRAG** | Pragmatics | Register, speech acts |

### FRE Model (Frequency-Relational-contextual)

Each learning object has a value score:

```
FRE = w_F × Frequency + w_R × Relational + w_E × contextual
```

### Priority Formula

```
Priority = FRE / Cost

where Cost = BaseDifficulty - TransferGain + ExposureNeed
```

### Spaced Repetition (FSRS)

Based on the Free Spaced Repetition Scheduler:

```
R(t) = e^(-t/S)    # Retrievability formula
```

5-stage mastery model: 0 (new) → 1 (learning) → 2 (reviewing) → 3 (mastered) → 4 (automated)

## Navigation

- **[INDEX.md](INDEX.md)** - Complete file listing with descriptions
- **[CODEBASE-GUIDE.md](../CODEBASE-GUIDE.md)** - External developer onboarding

## Documentation Conventions

### Code References

All shadow docs include line number references:

```typescript
// lines 133-177
function estimateThetaMLE(...) { ... }
```

### Dependency Graphs

ASCII dependency trees show relationships:

```
module.ts
  │
  ├──> dependency1.ts (purpose)
  │
  └──> Consumers:
       ├── consumer1.ts
       └── consumer2.ts
```

### Tables

Standardized table formats for:
- Function listings (name, lines, purpose)
- Parameter definitions
- Threshold values
- Mapping configurations

## Academic References

Key theoretical foundations:

- **IRT**: Lord (1980), Bock & Mislevy (1982)
- **FSRS**: Pimsleur (1967), Wozniak (SM-2)
- **PMI**: Church & Hanks (1990), Dunning (1993)
- **Morphology**: Bauer (2001), Carlisle (2000)
- **Syntax**: Lu (2010, 2011), Hunt (1965)
- **Transfer**: Ringbom (2007), Odlin (1989)
- **G2P**: Ehri (2005), Ziegler & Goswami (2005)

## Contributing

When adding new shadow documentation:

1. Match the source file path structure
2. Include the standard header with Code path and Tier
3. Start with Purpose section
4. Include mathematical formulas where applicable
5. Add line number references for key functions
6. Include a Dependencies section
7. Add Academic Foundation references
