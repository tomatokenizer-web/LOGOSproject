# Agent Trigger Service

> **Last Updated**: 2026-01-04
> **Code Location**: `src/main/services/agent-trigger.ts`
> **Status**: Active

---

## Context & Purpose

This module exists to solve a fundamental coordination problem in AI-assisted development: **How does a multi-agent system know which specialist to call when?**

In the LOGOS project, multiple specialized AI agents work together (frontend-specialist, database-specialist, security-specialist, etc.), but without an intelligent routing mechanism, the orchestrating system would need to manually decide which agent handles each task. The Agent Trigger Service automates this decision-making by analyzing the context of what is being worked on and recommending which agents should be invoked.

**Business/User Need**: Development velocity depends on the right specialist being engaged at the right time. A security-sensitive change that bypasses the security-specialist, or a database schema change that skips the database-specialist, creates technical debt and potential bugs. This service acts as an intelligent dispatcher that ensures no critical expertise is bypassed.

**When Used**:
- Every time code is about to be written or modified (to detect which agents should review/contribute)
- When a development blocker occurs (to identify which specialist can resolve it)
- When existing agents cannot handle a problem (to trigger the meta-agent-builder to create a new specialist)

---

## Microscale: Direct Relationships

### Dependencies (What This Needs)

This module is intentionally **dependency-free** within the codebase. It operates as a pure decision-making service that:
- Uses only TypeScript built-in types
- Requires no database access
- Has no external API calls
- Maintains its own internal state

This design choice follows the AGENT-MANIFEST.md Rule 2 (Algorithm Purity): core logic should be pure and independently testable.

### Dependents (What Needs This)

- **Main orchestration layer** (planned): Will call `detectTriggers()` before dispatching work to agents
- **IPC handlers** (planned): Will use `registerBottleneck()` when agents report blockers
- **Development workflow automation**: Any tooling that needs to determine agent routing

### Related Files (Conceptual Relationships)

- `src/main/services/claude.ts`: The Claude API service that agents use for LLM capabilities. While agent-trigger.ts decides *which* agent to call, claude.ts provides *how* agents communicate with the AI
- `AGENT-MANIFEST.md`: Defines the DevelopmentBottleneck interface (lines 106-108) that this service implements
- `DEVELOPMENT-PROTOCOL.md`: Defines the available agent types (lines 577-602) that this service routes to

### Data Flow

```
Development Context (files, layers, operation)
    |
    v
detectTriggers() analyzes context
    |
    +--> Layer matching (ui -> frontend-specialist)
    +--> File pattern matching (*.tsx -> frontend-specialist)
    +--> Security flag check (securitySensitive -> security-specialist)
    +--> External API check (externalApi -> mcp-specialist)
    |
    v
Deduplicated, prioritized AgentTrigger[] returned
    |
    v
Orchestration system invokes recommended agents
```

---

## Macroscale: System Integration

### Architectural Layer

This service sits at the **Meta-Coordination Layer** of the LOGOS architecture:

```
Layer 0: Specification Documents (FINAL-SPEC.md, AGENT-MANIFEST.md)
    |
Layer 1: THIS MODULE - Agent coordination/routing decisions  <-- You are here
    |
Layer 2: Individual Agents (frontend-specialist, database-specialist, etc.)
    |
Layer 3: Application Code (src/main, src/renderer, src/core)
    |
Layer 4: Runtime (Electron main process, SQLite, Claude API)
```

This is the **control plane** for the agent system, not the **data plane**. It doesn't do work itself; it decides who should do the work.

### Big Picture Impact

The Agent Trigger Service enables the **self-organizing agent ecosystem** described in DEVELOPMENT-PROTOCOL.md. Without it:

1. **Manual agent selection** would be required for every task, slowing development
2. **Missed specializations** would occur (security issues going unreviewed, documentation falling out of sync)
3. **No meta-learning** - the system couldn't recognize when it needs new capabilities

**Key capabilities this enables:**
- Automatic documentation generation (documentation-specialist always triggered on code changes)
- Security review enforcement (security-sensitive operations always routed to security-specialist)
- Gap detection and self-improvement (meta-agent-builder triggered when existing agents fail repeatedly)

### Critical Path Analysis

**Importance Level**: High (Control Plane)

- **If this fails**: Agent selection becomes manual/arbitrary, leading to inconsistent code quality and missed specialized reviews
- **Failure mode**: Graceful - if trigger detection fails, the system can fall back to invoking a general-purpose agent
- **Single point of failure**: No - this service is advisory, not blocking. Work can proceed even if triggers are not detected

### System Position in Agent Ecosystem

```
                    +------------------+
                    | Orchestrator     |
                    | (Main Claude)    |
                    +--------+---------+
                             |
                             | "What agents should handle this?"
                             v
                    +------------------+
                    | AgentTriggerSvc  |  <-- THIS MODULE
                    +--------+---------+
                             |
           +-----------------+------------------+
           |                 |                  |
           v                 v                  v
    +-------------+  +---------------+  +----------------+
    | frontend-   |  | database-     |  | security-      |
    | specialist  |  | specialist    |  | specialist     |
    +-------------+  +---------------+  +----------------+
           |                 |                  |
           +-----------------+------------------+
                             |
                             v
                    +------------------+
                    | Application Code |
                    +------------------+
```

---

## Technical Concepts (Plain English)

### TriggerContext

**Technical**: An interface that captures the operational context - what operation is being performed, which files are involved, which architectural layers are affected, and whether special conditions (security sensitivity, external API usage) apply.

**Plain English**: Think of it as a "job description" for the current task. Just like you might describe a plumbing job as "bathroom renovation, involves pipes under the sink, needs permits," the TriggerContext describes a coding task as "modifying login flow, involves auth/login.ts, affects the IPC layer, security-sensitive."

**Why We Use It**: The service needs structured information about what's happening to make intelligent routing decisions. Without this context, it would be guessing blindly.

### DevelopmentBottleneck

**Technical**: A structure representing a development blocker with type classification, location, blocking cause, proposed resolution, affected agents, severity level, and detection timestamp.

**Plain English**: Imagine a construction project where workers hit a problem they can't solve. The DevelopmentBottleneck is the formal "incident report" that describes: what type of problem (missing blueprint, conflicting instructions), where it happened (kitchen framing), what's blocking progress (no structural engineer approval), and how serious it is (critical - can't proceed without resolution).

**Why We Use It**: Bottlenecks are inevitable in complex development. This structure ensures they're captured systematically so the right specialist can be dispatched, and patterns can be detected over time.

### Layer-to-Agent Mapping (LAYER_AGENT_MAP)

**Technical**: A static lookup table mapping architectural layers (ui, ipc, db, core, service) to the agents specialized in those areas.

**Plain English**: Like a hospital's department directory. If you have a heart problem, go to cardiology; if you have a skin problem, go to dermatology. This map says: if you're working on UI code, involve the frontend-specialist; if you're working on database code, involve the database-specialist.

**Why We Use It**: It encodes institutional knowledge about which specialists are relevant to which parts of the codebase, so the system doesn't have to figure this out from scratch every time.

### File Pattern Matching (FILE_PATTERN_AGENT_MAP)

**Technical**: An array of regex patterns paired with agent lists. File paths are matched against these patterns to determine relevant specialists.

**Plain English**: Like email filtering rules. "If the subject contains 'invoice', send to accounting. If it contains 'support', send to customer service." This says: if the filename ends in `.tsx`, involve frontend-specialist; if it contains `auth` or `password`, involve security-specialist.

**Why We Use It**: File naming conventions carry semantic information about what the code does. A file named `password-reset.ts` is very likely to need security review, even if nobody explicitly marked it as security-sensitive.

### Bottleneck-to-Agent Mapping (BOTTLENECK_AGENT_MAP)

**Technical**: A lookup table mapping bottleneck types (missing_spec, integration_failure, etc.) to the agents capable of resolving them.

**Plain English**: Like a troubleshooting flowchart at a help desk. "If the problem is hardware, escalate to IT. If the problem is billing, escalate to Finance." This says: if the problem is missing documentation, call documentation-specialist; if it's a security concern, call security-specialist.

**Why We Use It**: Different types of problems require different expertise. Rather than having a generalist try to solve everything, this routes problems to specialists who can resolve them efficiently.

### Meta-Agent-Builder Trigger Logic

**Technical**: The `shouldTriggerMetaAgent()` method determines if the system should create a new specialized agent. It triggers when: (1) the bottleneck explicitly indicates missing specialization, (2) the same bottleneck type occurs 3+ times, or (3) no existing agent is mapped to handle the bottleneck type.

**Plain English**: Imagine a company that notices they keep calling external consultants for HVAC problems. After the third call, they realize: "We should just hire an HVAC specialist." This logic does the same thing - if existing agents can't handle a recurring problem, it signals that a new specialist should be created.

**Why We Use It**: This is the **self-improvement mechanism** of the agent system. Rather than being limited to the agents that existed at design time, the system can recognize gaps and request new capabilities.

### Priority Levels (immediate/soon/when_available)

**Technical**: A three-tier priority classification for agent triggers that determines invocation urgency.

**Plain English**: Like a hospital triage system. "Immediate" is the emergency room (security breach, critical failure). "Soon" is urgent care (needs attention today but not this second). "When available" is a scheduled appointment (can wait for the next available slot).

**Why We Use It**: Not all agent invocations are equally urgent. A security concern should interrupt current work; a documentation update can wait until the code changes are complete.

### Singleton Pattern (getAgentTriggerService)

**Technical**: A factory function that ensures only one instance of AgentTriggerService exists application-wide, maintaining consistent state (active bottlenecks, trigger history) across all callers.

**Plain English**: Like having one central dispatcher for a taxi company rather than multiple competing dispatchers. Everyone who needs to request an agent goes through the same service, so it has a complete picture of what's happening and what's been requested.

**Why We Use It**: Bottleneck tracking and trigger history need to be consistent. If multiple instances existed, they would each have partial information, defeating the pattern-detection logic that triggers meta-agent-builder.

---

## Design Decisions & Rationale

### Why No External Dependencies?

The service could have been implemented with database persistence for bottlenecks, or with API calls to determine agent availability. Instead, it's entirely self-contained.

**Rationale**: Following the LOGOS principle of "internal vs external logic separation" (DEVELOPMENT-PROTOCOL.md), this is **internal logic** - pure decision-making that doesn't need external resources. This makes it:
- Instantly testable without mocks
- Functional offline
- Predictable (same inputs always produce same outputs)

### Why Regex for File Patterns?

Pattern matching could use glob patterns, AST analysis, or explicit file lists. Regex was chosen.

**Rationale**: Regex provides the right balance of:
- Expressiveness (can match complex patterns like `/auth|token|key|secret|password/i`)
- Performance (compiled patterns match quickly)
- Familiarity (developers understand regex)
- Maintainability (patterns are readable and easy to update)

### Why Three Priority Levels?

Two levels (urgent/not urgent) or continuous priority scores were alternatives.

**Rationale**: Three levels map to distinct behavioral categories:
- `immediate`: Interrupt current work (security, critical failures)
- `soon`: Queue for next available slot (documentation, integration)
- `when_available`: Add to backlog (optimization, cleanup)

This matches how human teams actually handle interrupts and provides clear guidance to orchestration logic.

---

## Change History

### 2026-01-04 - Initial Implementation
- **What Changed**: Created complete agent trigger service with context analysis, bottleneck registration, and meta-agent-builder triggering
- **Why**: The AGENT-MANIFEST.md defined the DevelopmentBottleneck interface and escalation protocol, but no code existed to implement it. This service provides the runtime implementation
- **Impact**: Enables automated agent routing throughout the LOGOS development workflow

---

## Future Considerations

### Potential Enhancements
- **Learning from history**: Use trigger history to improve routing accuracy over time
- **Agent availability awareness**: Check if agents are currently busy before routing
- **Cost optimization**: Factor in agent invocation costs when multiple agents could handle a task

### Integration Points (Not Yet Implemented)
- Integration with main orchestration loop
- IPC handlers for bottleneck registration from renderer process
- Persistent storage for bottleneck patterns across sessions