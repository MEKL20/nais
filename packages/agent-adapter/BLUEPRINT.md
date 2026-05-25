# Agent Adapter Blueprint

Purpose: gateway abstraction layer for NAIS brain integration.

## First Adapter

- OpenClaw-compatible gateway adapter.

## Responsibilities

- Start/continue assistant sessions.
- Send user commands.
- Stream text/token/status events when available.
- Normalize tool/task/approval states for the character layer.
- Keep provider-specific details outside the desktop UI.

## Future Adapters

- Direct OpenAI-compatible chat adapter.
- Local LLM adapter.
- Custom NAIS Core Gateway adapter if OpenClaw limits are hit.
