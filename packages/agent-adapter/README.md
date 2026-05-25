# @nais/agent-adapter

Gateway adapter contracts for connecting NAIS desktop app to an agent brain.

## Supported Backends

- `openclaw` — OpenClaw gateway running on VPS (primary target)

## Contract

All adapters implement `AgentAdapter`:

- `connect(gatewayUrl, sessionKey)` — connect to gateway
- `disconnect()` — disconnect cleanly
- `sendMessage(message)` → `AgentMessageResult` — send text to agent
- `onEvent(handler)` → `unsubscribe` — subscribe to agent events
- `getCapabilities()` — report supported features
- `getStatus()` — current connection status
- `dispose()` — release all resources

## Events

The adapter emits `AgentEvent` objects with kinds:

- `agent.thinking` / `agent.speaking` / `agent.idle` / `agent.error`
- `avatar.state` — avatar state change
- `message` — text message (agent or user)
- `tool.call` / `tool.result`
- `session.ended`

## OpenClaw Adapter

Connects to an OpenClaw gateway via:

- **HTTP** `POST /tools/invoke` — sends messages via `sessions_send`
- **WebSocket** `/ws` — subscribes to live agent events

Gateway URL and bearer token come from character pack config or app settings.

## Usage

```ts
import { createAgentAdapter } from "@nais/agent-adapter";

const agent = createAgentAdapter({ kind: "openclaw" });

await agent.connect("https://your-gateway.example.com", "main");

const unsub = agent.onEvent((event) => {
  console.log("[agent]", event.kind, event.data);
});

await agent.sendMessage({
  sessionKey: "main",
  text: "Hello, nano!",
});

unsub();
await agent.disconnect();
agent.dispose();
```
