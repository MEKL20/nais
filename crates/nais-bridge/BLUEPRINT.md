# NAIS Bridge Blueprint

Purpose: local bridge between the Tauri desktop app, character packs, and agent gateway adapters.

## Responsibilities

- Expose local commands/events to the Tauri app.
- Load and validate character packs.
- Manage session lifecycle for the selected gateway adapter.
- Convert agent status into normalized character events.
- Keep future support open for local/offline brain backends.

## Event Shape Draft

```json
{
  "state": "thinking",
  "emotion": "focused",
  "text": "Processing request...",
  "speech": false,
  "source": "agent"
}
```
