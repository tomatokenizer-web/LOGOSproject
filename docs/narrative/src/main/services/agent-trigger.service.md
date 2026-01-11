# Agent Trigger Service

> **Code**: `src/main/services/agent-trigger.service.ts`
> **Tier**: 2 (Service Layer)

---

## Purpose

Development bottleneck detection and automatic agent activation. Implements the Bottleneck Detection Protocol.

**Key Features**:
- Context-based trigger detection (layer, file patterns)
- Bottleneck registration and agent mapping
- Meta-Agent creation condition evaluation

---

## Trigger Detection Rules

### Layer-Agent Mapping

```typescript
// lines 106-112
LAYER_AGENT_MAP: Record<string, AgentType[]> = {
  ui: ['frontend-specialist'],
  ipc: ['api-specialist'],
  db: ['database-specialist'],
  core: ['api-specialist', 'database-specialist'],
  service: ['api-specialist', 'mcp-specialist']
};
```

### File Pattern Mapping

```typescript
// lines 117-124
FILE_PATTERN_AGENT_MAP = [
  { pattern: /\.tsx?$/, agents: ['frontend-specialist'] },
  { pattern: /\.ipc\.ts$/, agents: ['api-specialist'] },
  { pattern: /schema\.prisma|\.db\.ts|db\//, agents: ['database-specialist'] },
  { pattern: /claude|anthropic|api/i, agents: ['api-specialist', 'mcp-specialist'] },
  { pattern: /auth|token|key|secret|password/i, agents: ['security-specialist'] },
  { pattern: /\.md$/, agents: ['documentation-specialist'] }
];
```

### Bottleneck-Agent Mapping

```typescript
// lines 129-139
BOTTLENECK_AGENT_MAP: Record<BottleneckType, AgentType[]> = {
  missing_spec: ['documentation-specialist', 'meta-agent-builder'],
  conflicting_docs: ['documentation-specialist'],
  missing_algorithm: ['api-specialist', 'database-specialist'],
  dependency_issue: ['mcp-specialist', 'debug-git-specialist'],
  integration_failure: ['api-specialist', 'debug-git-specialist'],
  missing_agent_specialization: ['meta-agent-builder'],
  security_concern: ['security-specialist'],
  performance_issue: ['agent-optimizer'],
  documentation_gap: ['documentation-specialist']
};
```

---

## AgentTriggerService Class

### detectTriggers(context)

```typescript
// lines 155-221
detectTriggers(context: TriggerContext): AgentTrigger[]
```

Trigger detection order:
1. **Layer-based**: Current architecture layer being worked on
2. **File pattern-based**: File path pattern matching
3. **Security sensitivity**: securitySensitive = true
4. **External API**: externalApi = true
5. **Documentation required**: Always on code changes

### registerBottleneck(bottleneck)

```typescript
// lines 226-266
registerBottleneck(bottleneck: DevelopmentBottleneck): AgentTrigger[]
```

Registers bottleneck and returns appropriate agent triggers.

### Meta-Agent Creation Conditions

```typescript
// lines 275-297
shouldTriggerMetaAgent(bottleneck): boolean {
  // 1. Explicit request
  if (bottleneck.type === 'missing_agent_specialization') return true;

  // 2. Same bottleneck repeated 3+ times
  if (sameTypeCount >= 3) return true;

  // 3. No mapped agents available
  if (!mappedAgents || mappedAgents.length === 0) return true;
}
```

---

## Priority System

```typescript
type Priority = 'immediate' | 'soon' | 'when_available';
```

| Severity | Priority | Condition |
|----------|----------|-----------|
| critical | immediate | Security issues, build failures |
| high | immediate | Blocking issues |
| medium | soon | Feature degradation |
| low | when_available | Improvements |

---

## Agent Creation Spec

```typescript
// lines 302-316
generateAgentSpec(bottleneck): AgentCreationSpec {
  return {
    name: `${bottleneck.blockedBy}-specialist`,
    specialization: bottleneck.blockedBy,
    tools: inferRequiredTools(bottleneck),
    triggerConditions: [...],
    responsibilities: [...]
  };
}
```

---

## Dependencies

```text
agent-trigger.service.ts
  │
  ├──> DEVELOPMENT-PROTOCOL.md (agent definitions)
  │
  ├──> AGENT-MANIFEST.md (bottleneck protocol)
  │
  └──> Consumers:
       ├── agent-hooks.service.ts (IPC integration)
       └── Development workflow (manual invocation)
```
