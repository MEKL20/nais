# Desktop App Blueprint

Purpose: Tauri frontend for NAIS, responsible for desktop overlay, character display, user interaction, and local event handling.

## Responsibilities

- Render floating/transparent assistant window.
- Host Live2D and VRM avatar canvases.
- Provide chat input, hotkey hooks, and later wake/listen UI.
- Receive agent events and map them to character state.
- Keep sensitive gateway credentials out of frontend state where possible.

## Candidate Stack

- Tauri v2
- TypeScript
- React or Svelte UI
- Vite
- PixiJS + Live2D display adapter
- Three.js + `@pixiv/three-vrm`

## Non-Goals Initially

- Full auto-generation studio.
- Complex window physics.
- Full wake-word pipeline.
- Production installer/signing.
