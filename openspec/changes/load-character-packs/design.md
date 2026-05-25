# Design: Desktop Character Pack Loading

## Context
Character schema exists as a TypeScript package, but browser frontend cannot safely use Node `fs`. Tauri Rust commands are the right boundary for local file reads.

## Decision
Implement Rust-side commands:
- `list_character_packs(root_dir?: string)`
- `load_character_pack(pack_dir: string)`
- `default_character_root()`

The frontend calls these via `@tauri-apps/api/core.invoke` and keeps a small typed service in `src/services/characters.ts`.

## Impacted files
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/src/lib.rs`
- `apps/desktop/src/services/characters.ts`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/styles.css`

## Validation plan
- `pnpm --filter @nais/desktop run typecheck`
- `pnpm --filter @nais/desktop run build`
- `pnpm --filter @nais/desktop run tauri:build -- --no-bundle`
