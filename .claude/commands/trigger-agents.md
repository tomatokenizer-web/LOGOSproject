# /trigger-agents

Analyze the current context and trigger appropriate agents based on the Agent Trigger System.

## Usage

```
/trigger-agents [operation] [location]
```

## What This Does

1. Analyzes the specified operation and location
2. Determines which architectural layers are affected
3. Recommends which agents should be triggered
4. Optionally spawns the recommended agents

## Examples

```
/trigger-agents create src/main/ipc/new-feature.ipc.ts
/trigger-agents security src/main/services/auth.ts
/trigger-agents document src/core/algorithm.ts
```

## Agent Trigger Rules

Based on `DEVELOPMENT-PROTOCOL.md` Agent Trigger System:

| Layer | Agent |
|-------|-------|
| ui | frontend-specialist |
| ipc | api-specialist |
| db | database-specialist |
| service (external) | mcp-specialist |
| security-sensitive | security-specialist |
| any code change | documentation-specialist |

## Prompt

Analyze the context and determine which agents should be triggered:

1. Read the file at the specified location
2. Determine architectural layers involved (ui, ipc, db, core, service)
3. Check for security-sensitive patterns (auth, token, key, secret)
4. List recommended agents with priority (immediate, soon, when_available)
5. Ask if the user wants to spawn the recommended agents

Use the Task tool to spawn agents as needed based on the analysis.
