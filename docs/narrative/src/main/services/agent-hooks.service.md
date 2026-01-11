# Agent Hooks Service

> **Code**: `src/main/services/agent-hooks.service.ts`
> **Tier**: 2 (Service Layer)

---

## Purpose

Provides automatic agent trigger hooks integrable with IPC handlers. Bridge between IPC operations and agent coordination.

---

## Domain-Layer Mapping

```typescript
// lines 75-83
DOMAIN_LAYER_MAP: Record<DomainType, Layer[]> = {
  goal: ['ipc', 'db'],
  object: ['ipc', 'db', 'core'],
  session: ['ipc', 'db', 'core'],
  claude: ['ipc', 'service'],
  queue: ['ipc', 'core'],
  analytics: ['ipc', 'db', 'core'],
  agent: ['ipc', 'service']
};
```

---

## Hook Functions

### preOperationHook

```typescript
// lines 115-143
preOperationHook(context: HookContext): HookResult
```

Pre-operation agent trigger detection:
- Layer determination
- Security sensitivity check
- External API requirement check

### postOperationHook

```typescript
// lines 148-179
postOperationHook(context, success, result): HookResult
```

Post-operation result handling:
- Register as bottleneck on failure
- Infer error type

### errorHook

```typescript
// lines 184-207
errorHook(domain, operation, location, error): HookResult
```

On error occurrence:
- Infer bottleneck type
- Determine affected agents
- Set priority to 'immediate'

---

## Error Type Inference

```typescript
// lines 216-242
function inferBottleneckType(error: Error): BottleneckType {
  const message = error.message.toLowerCase();

  if (message.includes('not found')) return 'missing_spec';
  if (message.includes('conflict')) return 'conflicting_docs';
  if (message.includes('algorithm')) return 'missing_algorithm';
  if (message.includes('dependency')) return 'dependency_issue';
  if (message.includes('integration')) return 'integration_failure';
  if (message.includes('security')) return 'security_concern';
  if (message.includes('performance')) return 'performance_issue';

  return 'integration_failure';  // default
}
```

---

## withAgentHooks Wrapper

```typescript
// lines 280-340
function withAgentHooks<TRequest, TResponse>(
  domain: DomainType,
  operation: OperationType,
  location: string,
  handler: (request) => Promise<Result>
): WrappedHandler
```

**Usage Example**:

```typescript
const wrappedHandler = withAgentHooks(
  'goal',
  'create',
  'src/main/handlers/goal.ipc.ts',
  originalHandler
);
```

**Behavior**:
1. Call `preOperationHook`
2. Execute original handler
3. Call `postOperationHook` or `errorHook` based on success/failure
4. Log triggers

---

## Convenience Functions

```typescript
// lines 345-367
triggerDocumentation(filePath): AgentTrigger[]
triggerSecurityReview(filePath): AgentTrigger[]
```

Manually request specific agent triggers.

---

## Dependencies

```text
agent-hooks.service.ts
  │
  ├──> agent-trigger.service.ts (trigger logic)
  │
  └──> Consumers:
       └── IPC handlers (wrapper application)
```
