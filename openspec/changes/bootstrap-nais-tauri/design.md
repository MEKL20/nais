# Design: Bootstrap NAIS Tauri Architecture

## Context

NAIS is intended to be a desktop personal AI assistant with customizable Live2D/3D characters. The first brain/gateway should be OpenClaw-compatible, but NAIS should remain adapter-based.

## Decision

Use a monorepo-style structure:

- `apps/desktop`: Tauri UI/app shell.
- `packages/avatar-runtime`: frontend avatar rendering contracts.
- `packages/character-schema`: character pack schema/types/validation.
- `packages/agent-adapter`: OpenClaw-compatible and future gateway adapters.
- `characters`: character packs and templates.
- `docs`: product/architecture documentation.
- `openspec`: spec-first planning artifacts.

## Alternatives Considered

1. Single Tauri app folder only.
   - Rejected for now because Live2D, VRM, character schemas, and gateway adapters need clean boundaries.
2. Separate repositories.
   - Rejected for MVP because it adds coordination overhead too early.
3. Electron instead of Tauri.
   - Rejected by current user decision; Tauri chosen.

## Impacted Systems

- Desktop app architecture.
- Character pack format.
- Gateway adapter boundaries.
- Future auto-generation pipeline.

## Validation Plan

- Inspect created folder tree.
- Verify all blueprint/spec files are present.
- Keep future implementation tasks linked to these folders.
