# Proposal: Load Character Packs in Desktop

## Summary
Wire NAIS desktop to discover and load local character packs from the `characters/` directory via Tauri commands.

## Motivation
The desktop app currently has avatar and agent service wiring, but no real character selection/config path. Character pack loading is the next dependency before real Live2D/VRM rendering because it provides avatar mode, model path, persona, voice, and state mappings.

## Scope
- Add Tauri commands to list and load local character packs.
- Expose loaded character metadata to React.
- Add a character selector/status panel to the desktop UI.
- Use loaded state mappings to drive avatar state/expression where possible.

## Non-goals
- Do not implement actual Live2D/VRM rendering yet.
- Do not package character assets into Windows installer yet.
- Do not connect character persona into agent prompt yet.

## Risks / rollback
- File path behavior differs between dev and packaged app. Keep root discovery explicit and conservative.
- Rollback by removing Tauri commands and frontend character service/UI.
