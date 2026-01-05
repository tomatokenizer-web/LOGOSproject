# LOGOS Project - Claude Code Instructions

## Project Overview

LOGOS is an Electron desktop application for language learning with adaptive algorithms (IRT, FSRS, PMI).

## Agent Coordination System

This project uses an automated agent trigger system. When working on this codebase, Claude Code should:

### Automatic Agent Triggering Rules

**IMPORTANT**: Before making any code changes, check which agents should be involved by analyzing the context:

1. **Layer Detection**: Determine which architectural layers are affected
   - `ui` → trigger `frontend-specialist`
   - `ipc` → trigger `api-specialist`
   - `db` → trigger `database-specialist`
   - `service` → trigger `mcp-specialist` (if external API)

2. **Security-Sensitive Operations**: Always trigger `security-specialist` for:
   - API key handling
   - Authentication/authorization code
   - Input validation
   - External data handling

3. **Documentation**: Always trigger `documentation-specialist` after code changes to create/update shadow documentation in `docs/narrative/`

4. **Meta-Agent-Builder Triggers**: Trigger when:
   - Same type of error occurs 3+ times
   - No existing agent can handle a bottleneck
   - Explicit gap in agent specialization detected

### Agent Types Available

| Agent | Use For |
|-------|---------|
| `frontend-specialist` | React components, UI logic, styling |
| `api-specialist` | Electron IPC handlers, Claude API integration |
| `database-specialist` | Schema design, migrations, queries |
| `documentation-specialist` | Shadow docs for EVERY code file |
| `security-specialist` | API key handling, input validation |
| `debug-git-specialist` | Clean commits, branch management |
| `mcp-specialist` | External service integration |
| `agent-optimizer` | Ensure agents work efficiently |
| `meta-agent-builder` | Create new agents if gaps found |

### File-to-Agent Mapping

```
src/renderer/**/*.tsx     → frontend-specialist
src/main/ipc/*.ipc.ts     → api-specialist
src/main/db/**            → database-specialist
src/main/services/claude* → api-specialist, mcp-specialist
**/auth*, **/token*       → security-specialist
*.md                      → documentation-specialist
```

### How to Use Agent Trigger Service

The trigger service is implemented in:
- `src/main/services/agent-trigger.ts` - Core trigger detection
- `src/main/services/agent-hooks.ts` - IPC handler integration
- `src/main/ipc/agent.ipc.ts` - IPC handlers for UI

#### When Writing Code

1. **Before starting**: Mentally map which agents should be involved
2. **After writing code**: Trigger `documentation-specialist` for shadow docs
3. **If errors occur**: Register as bottleneck, appropriate agents will be triggered
4. **For security-sensitive code**: Always involve `security-specialist`

### Bottleneck Registration

When encountering development blockers, register them:

```typescript
// Types of bottlenecks
type BottleneckType =
  | 'missing_spec'           // Documentation gap
  | 'conflicting_docs'       // Conflicting requirements
  | 'missing_algorithm'      // Algorithm not implemented
  | 'dependency_issue'       // Package/import problems
  | 'integration_failure'    // Components not working together
  | 'missing_agent_specialization' // Need new agent type
  | 'security_concern'       // Security issue detected
  | 'performance_issue'      // Performance problem
  | 'documentation_gap';     // Missing docs
```

## Development Workflow

1. Read `DEVELOPMENT-PROTOCOL.md` for full development guidelines
2. Read `AGENT-MANIFEST.md` for agent coordination rules
3. Check `ALGORITHMIC-FOUNDATIONS.md` for algorithm specifications
4. Follow the layer boundaries defined in the protocol

## Key Directories

```
src/
├── main/           # Electron main process
│   ├── ipc/        # IPC handlers (api-specialist)
│   ├── services/   # Business logic (api-specialist, mcp-specialist)
│   └── db/         # Database (database-specialist)
├── core/           # Pure algorithms (api-specialist)
├── renderer/       # React UI (frontend-specialist)
└── shared/         # Shared types
```

## Shadow Documentation

Every code file MUST have corresponding shadow documentation in `docs/narrative/` that explains:
- **Why** the code exists
- **Context** and relationships
- **Design decisions** and rationale

## Slash Commands

- `/trigger-agents [operation] [location]` - Analyze context and trigger appropriate agents
- `/check-bottleneck [type] [description]` - Register bottleneck and get help

## Hooks (Automatic)

The following hooks are configured in `.claude/hooks.json`:

| Trigger | Action |
|---------|--------|
| File Write | Remind to trigger documentation-specialist |
| File Edit | Remind to update shadow docs |
| Security file detected | Alert for security-specialist review |
| IPC file | Note api-specialist domain |
| React component | Note frontend-specialist domain |
| Database file | Note database-specialist domain |
| Task complete | Verify docs, security, git status |

---

*This file is read by Claude Code to understand project-specific instructions.*
