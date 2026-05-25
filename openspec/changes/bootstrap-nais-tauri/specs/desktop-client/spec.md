# Spec: Desktop Client

## Requirement

NAIS shall provide a Tauri desktop client that can host a floating character assistant UI.

## Scenarios

- When the app starts, it can load the selected character pack.
- When the agent state changes, the UI receives a normalized state event.
- When the user submits text, the desktop client forwards it through the bridge rather than directly embedding gateway details.

## Edge Cases

- If avatar loading fails, show a safe fallback UI.
- If gateway connection is unavailable, keep the desktop client responsive and show disconnected state.
