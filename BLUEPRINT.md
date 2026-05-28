# NAIS Blueprint

NAIS = Nano Assistant Intelligence System.

Purpose: a character-driven personal AI assistant with a customizable Live2D/3D avatar, persona, voice, and OpenClaw-compatible agent brain.

## Core Direction

- Frontend/runtime: Tauri desktop app.
- Avatar targets: Live2D `.model3.json` and 3D VRM `.vrm`.
- Brain/gateway: OpenClaw first, behind an adapter so NAIS can support other backends later.
- Model routing: OpenAI-compatible provider / 9router / local models through the gateway layer.
- Character system: packaged and swappable; avatar, persona, voice, state mapping, and behavior profile are separate from the agent brain.

## High-Level Architecture

```text
NAIS Desktop App (Tauri)
  ├─ Character UI / overlay
  ├─ Live2D runtime adapter
  ├─ VRM/3D runtime adapter
  ├─ voice input/output hooks
  └─ local event bus
        ↓
NAIS Bridge
  ├─ agent gateway adapter
  ├─ state/event mapper
  ├─ character pack loader
  └─ auth/session boundary
        ↓
OpenClaw-compatible Gateway
  ├─ sessions
  ├─ tools
  ├─ memory
  ├─ reminders/tasks
  └─ model provider/router
```

## Initial Folder Map

```text
nais/
├── BLUEPRINT.md
├── apps/
│   └── desktop/                 # Tauri app shell and UI
├── packages/
│   ├── agent-adapter/           # gateway adapters, OpenClaw first
│   ├── avatar-runtime/          # Live2D + VRM frontend runtime contracts
│   └── character-schema/        # character pack schema/types/validation
├── characters/
│   └── _template/               # starter character pack structure
├── docs/                        # product/architecture docs
└── openspec/                    # spec-first change artifacts
```

## Design Rules

1. Keep avatar runtime separate from agent/gateway logic.
2. Keep persona and voice configurable per character pack.
3. Use adapter interfaces for OpenClaw, model providers, Live2D, and VRM.
4. Prefer local-first and auditable defaults.
5. Ask before destructive or privacy-sensitive system actions.
6. Verify implementation with builds/tests/inspections before claiming done.

## MVP Target

1. Tauri desktop overlay shell.
2. Character pack loader.
3. Import Live2D and VRM characters.
4. Manual chat command to OpenClaw-compatible gateway.
5. State mapping: idle, listening, thinking, speaking, success, warning, error.
6. Basic TTS/lip-sync hooks, even if provider implementation comes later.
