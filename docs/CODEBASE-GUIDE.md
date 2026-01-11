# LOGOS Codebase Guide

> Comprehensive guide for external developers to understand and navigate the LOGOS codebase

## Project Overview

**LOGOS** is an adaptive language learning application built with Electron, React, and TypeScript. It uses cognitive science principles (IRT, spaced repetition, transfer learning) to optimize language acquisition.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, TailwindCSS |
| Desktop | Electron |
| Database | SQLite via Prisma |
| AI | Claude API (Anthropic) |
| Build | electron-vite, Vite |
| Testing | Vitest, Playwright |

## Project Structure

```
LOGOS/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.ts        # Main entry point
│   │   ├── services/       # Backend services
│   │   ├── db/             # Database layer
│   │   │   └── repositories/
│   │   └── ipc/            # IPC handlers
│   │
│   ├── renderer/           # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── stores/
│   │   └── index.html
│   │
│   ├── core/               # Core algorithms (pure TypeScript)
│   │   ├── priority.ts     # Learning priority calculation
│   │   ├── irt.ts          # Item Response Theory
│   │   ├── g2p.ts          # Grapheme-to-Phoneme
│   │   ├── fsrs.ts         # Spaced repetition
│   │   └── ...
│   │
│   ├── shared/             # Shared types and utilities
│   │   └── types.ts
│   │
│   └── preload/            # Electron preload scripts
│
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed data
│
├── docs/
│   ├── narrative/          # Shadow documentation
│   │   ├── README.md       # Documentation overview
│   │   ├── INDEX.md        # Master index
│   │   └── src/            # Mirrors source structure
│   │
│   └── CODEBASE-GUIDE.md   # This file
│
├── e2e/                    # End-to-end tests
├── scripts/                # Build/utility scripts
└── resources/              # Static assets
```

## Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer (React)                      │
│  Components → Hooks → Stores → IPC Bridge               │
├─────────────────────────────────────────────────────────┤
│                    Main Process (Electron)               │
│  IPC Handlers → Services → Repositories → Prisma        │
├─────────────────────────────────────────────────────────┤
│                    Core Algorithms                       │
│  IRT, FSRS, Priority, G2P, Transfer (pure functions)    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    │
    ▼
React Component
    │
    ▼ (IPC invoke)
IPC Handler (main/ipc/*.ts)
    │
    ▼
Service Layer (main/services/*.ts)
    │
    ├──> Core Algorithms (core/*.ts)
    │
    └──> Repository Layer (main/db/repositories/*.ts)
              │
              ▼
         Prisma → SQLite
```

## Core Concepts

### Five-Component Language Model

LOGOS models language learning across five hierarchical components:

```
PHON → MORPH → LEX → SYNT → PRAG
```

| Component | Code | Description |
|-----------|------|-------------|
| PHON | Phonological | Pronunciation, G2P rules |
| MORPH | Morphological | Word structure, affixes |
| LEX | Lexical | Vocabulary, collocations |
| SYNT | Syntactic | Grammar, sentence structure |
| PRAG | Pragmatic | Context, register, speech acts |

**Key principle**: Lower components must be automated before higher components can be effectively learned.

### Priority Calculation

Learning items are prioritized using:

```typescript
Priority = FRE / Cost

// FRE = Frequency + Relational + contextual contribution
FRE = w_F × F + w_R × R + w_E × E

// Cost = difficulty adjusted for transfer
Cost = BaseDifficulty - TransferGain + ExposureNeed
```

See: `src/core/priority.ts` and `docs/narrative/src/core/priority.md`

### Item Response Theory (IRT)

Learner ability (θ) and item difficulty (b) are estimated using:

```typescript
P(correct) = 1 / (1 + e^(-a(θ-b)))
```

See: `src/core/irt.ts` and `docs/narrative/src/core/irt.md`

### Spaced Repetition (FSRS)

Memory retention modeled as:

```typescript
R(t) = e^(-t/S)  // Retrievability over time
```

5-stage mastery: New → Learning → Reviewing → Mastered → Automated

See: `src/core/fsrs.ts` and `docs/narrative/src/core/fsrs.md`

## Key Files

### Core Algorithms (`src/core/`)

| File | Purpose | Documentation |
|------|---------|---------------|
| `priority.ts` | Learning queue prioritization | [priority.md](narrative/src/core/priority.md) |
| `irt.ts` | Ability estimation, item selection | [irt.md](narrative/src/core/irt.md) |
| `fsrs.ts` | Spaced repetition scheduling | [fsrs.md](narrative/src/core/fsrs.md) |
| `g2p.ts` | Pronunciation analysis | [g2p.md](narrative/src/core/g2p.md) |
| `transfer.ts` | L1-L2 transfer coefficients | [transfer.md](narrative/src/core/transfer.md) |
| `component-vectors.ts` | Five-component FRE model | [component-vectors.md](narrative/src/core/component-vectors.md) |

### Services (`src/main/services/`)

| File | Purpose | Documentation |
|------|---------|---------------|
| `claude.service.ts` | Claude API integration | [claude.service.md](narrative/src/main/services/claude.service.md) |
| `component-prerequisite.service.ts` | Component hierarchy management | [component-prerequisite.service.md](narrative/src/main/services/component-prerequisite.service.md) |
| `state-priority.service.ts` | Learning queue building | [state-priority.service.md](narrative/src/main/services/state-priority.service.md) |
| `task-generation.service.ts` | Exercise generation | [task-generation.service.md](narrative/src/main/services/task-generation.service.md) |
| `scoring-update.service.ts` | Response scoring and updates | [scoring-update.service.md](narrative/src/main/services/scoring-update.service.md) |

### IPC Handlers (`src/main/ipc/`)

| File | Purpose |
|------|---------|
| `goal.ipc.ts` | Learning goal management |
| `session.ipc.ts` | Study session handling |
| `learning.ipc.ts` | Learning operations |
| `claude.ipc.ts` | AI content generation |

## Database Schema

Key models in `prisma/schema.prisma`:

```prisma
model User {
  id        String   @id
  goals     Goal[]
  sessions  Session[]
}

model Goal {
  id          String   @id
  userId      String
  targetL2    String
  domain      String
  objects     LearningObject[]
}

model LearningObject {
  id              String   @id
  goalId          String
  componentType   ComponentCode  // PHON, MORPH, LEX, SYNT, PRAG
  content         String
  masteryStates   MasteryState[]
}

model MasteryState {
  id              String   @id
  objectId        String
  stage           Int      // 0-4 (FSRS stages)
  stability       Float    // FSRS stability
  difficulty      Float    // IRT difficulty
  lastReview      DateTime?
  nextReview      DateTime?
}
```

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### Running

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# E2E tests
npm run test:e2e
```

### IPC Communication

Frontend-to-backend communication uses typed IPC:

```typescript
// Frontend (renderer)
const result = await window.api.goal.create({ ... });

// Backend (main)
ipcMain.handle('goal:create', async (event, data) => {
  return goalService.create(data);
});
```

## Shadow Documentation

The `docs/narrative/` directory contains detailed explanations for each source file:

- **What it does**: High-level purpose
- **Why it exists**: Design rationale
- **How it works**: Algorithm explanations with math
- **Dependencies**: What it uses and what uses it
- **Academic basis**: Research citations

### Navigation

1. Start with [docs/narrative/README.md](narrative/README.md)
2. Use [docs/narrative/INDEX.md](narrative/INDEX.md) for file lookup
3. Each shadow doc links to related docs

### Naming Convention

Shadow docs mirror source paths:

```
src/core/irt.ts          →  docs/narrative/src/core/irt.md
src/main/services/x.ts   →  docs/narrative/src/main/services/x.md
```

## Common Tasks

### Adding a New Learning Algorithm

1. Create algorithm in `src/core/newAlgo.ts`
2. Add types to `src/shared/types.ts`
3. Create service wrapper in `src/main/services/`
4. Add IPC handler if frontend needs access
5. Write shadow documentation in `docs/narrative/`

### Adding a New Component Type

1. Update `ComponentCode` enum in types
2. Add vector calculation in `component-vectors.ts`
3. Update prerequisite chains in `component-prerequisite.service.ts`
4. Add component-specific strategies in relevant services

### Debugging IRT/FSRS

1. Check `src/core/irt.ts` for ability estimation
2. Check `src/core/fsrs.ts` for scheduling
3. Check `scoring-update.service.ts` for state updates
4. Review corresponding shadow docs for mathematical details

## Testing

### Unit Tests

```bash
npm run test
```

Located in `__tests__/` directories alongside source files.

### E2E Tests

```bash
npm run test:e2e
```

Located in `e2e/` directory. Uses Playwright for Electron testing.

## Questions?

- Check shadow documentation for detailed explanations
- Review academic references in shadow docs for theoretical background
- Examine test files for usage examples
