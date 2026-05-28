# Product

NAIS (Nano Assistant Intelligence System) is a Windows desktop AI assistant
with a customizable Live2D / VRM avatar, swappable persona and voice, and an
OpenClaw-compatible agent brain.

## What it does

- Runs as a native Windows app (Tauri + WebView2) with an animated 2D/3D
  character on the desktop.
- Connects to a user-provided OpenClaw gateway for AI inference (no built-in
  cloud dependency; self-hosted by default).
- Loads "character packs" — drop-in folders that bundle an avatar model
  (`.model3.json` for Live2D or `.vrm` for VRM), a persona, voice config, and
  state-to-expression mappings.
- Reacts visually to conversation through a fixed set of states: `idle`,
  `listening`, `thinking`, `speaking`, `success`, `warning`, `error`.
- Ships TTS via the browser Web Speech API and STT via WebSpeechRecognition,
  with per-pack voice configuration (`voice.yaml`).

## Design principles

1. **Avatar runtime is separate from agent logic.** Rendering, animation, and
   voice are decoupled from gateway/brain code.
2. **Adapter interfaces everywhere.** OpenClaw, model providers, Live2D, and
   VRM are all behind adapters so they can be swapped or extended.
3. **Local-first and auditable.** User data stays on the user's machine or
   their VPS; ask before destructive or privacy-sensitive actions.
4. **Character packs are data, not code.** Persona, voice, and visual
   behavior are configurable per pack without touching the app.

## MVP scope (what's in flight)

Tauri overlay shell, character pack loader, Live2D + VRM import, manual
chat to an OpenClaw gateway, the seven-state mapping, and basic TTS / lip-sync
hooks. Treat anything outside that list as "future" unless an OpenSpec change
proposal exists for it under `openspec/changes/`.