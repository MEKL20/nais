# Spec: Agent Gateway Adapter

## Requirement

NAIS shall communicate with its AI brain through an adapter interface, with OpenClaw-compatible gateway support as the first target.

## Scenarios

- The desktop client sends a user command to the bridge.
- The bridge uses the selected gateway adapter to send the command.
- Agent text/status/tool events are normalized into character events.

## Edge Cases

- Gateway unavailable: emit disconnected/error state without crashing.
- Approval required: emit warning/approval-needed state.
- Long-running task: emit thinking/progress states.
