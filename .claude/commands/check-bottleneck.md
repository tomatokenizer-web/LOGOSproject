# /check-bottleneck

Register a development bottleneck and trigger appropriate agents.

## Usage

```
/check-bottleneck [type] [description]
```

## Bottleneck Types

- `missing_spec` - Documentation or specification gap
- `conflicting_docs` - Conflicting requirements
- `missing_algorithm` - Algorithm not implemented
- `dependency_issue` - Package/import problems
- `integration_failure` - Components not working together
- `missing_agent` - Need new agent type (triggers meta-agent-builder)
- `security_concern` - Security issue detected
- `performance_issue` - Performance problem

## Examples

```
/check-bottleneck missing_spec "FRE algorithm documentation incomplete"
/check-bottleneck missing_agent "Need ML model integration specialist"
/check-bottleneck security_concern "API key exposed in logs"
```

## What Happens

1. Bottleneck is analyzed
2. Appropriate agents are determined:
   - `missing_spec` → documentation-specialist
   - `missing_agent` → meta-agent-builder
   - `security_concern` → security-specialist
   - etc.
3. If same bottleneck type occurs 3+ times → meta-agent-builder triggered
4. Agents are spawned to address the issue

## Prompt

Analyze the bottleneck and take action:

1. Parse the bottleneck type and description
2. Determine which agents should handle this
3. Check if this is a repeated bottleneck (would trigger meta-agent-builder)
4. Spawn the appropriate agents to address the bottleneck
5. Report what actions were taken
