# Project Structure

NAIS is a pnpm + Cargo monorepo. Top level:

```
nais/
├── apps/desktop/         # Tauri desktop app (React frontend + Rust backend)
├── packages/             # Reusable TS workspace packages
│   ├── agent-adapter/    # OpenClaw gateway adapter
│   ├── avatar-runtime/   # Live2D + VRM rendering contracts and adapters
│   └── character-schema/ # Character pack schema, validation, loader, CLI
├── characters/           # Character pack definitions (data, not code)
│   ├── _template/        # Starter pack — copy this to add a character
│   ├── mao-live2d/
│   └── pixiv-vrm-sample/
├── docs/                 # Architecture and standards docs
├── openspec/changes/     # Spec-first change proposals (proposal/design/tasks)
├── scripts/              # Node smoke scripts (.mjs)
└── .github/workflows/    # CI (Windows Tauri build)
```

## apps/desktop layout

```
apps/desktop/
├── index.html
├── vite.config.ts            # manualChunks split for avatar libs — preserve
├── src/                      # React frontend (TS, strict mode)
│   ├── main.tsx              # entry
│   ├── App.tsx
│   ├── components/           # AvatarCanvas, ChatInput, SettingsPanel, ErrorBoundary
│   └── services/             # agent, avatar, characters, markdown, stt, tts
├── public/                   # Static assets + Live2D core JS + smoke shims
└── src-tauri/                # Rust backend
    ├── Cargo.toml            # crate name: nais-desktop, lib: nais_desktop_lib
    ├── tauri.conf.json
    ├── build.rs
    ├── icons/
    ├── gen/schemas/          # generated, do not edit by hand
    └── src/
        ├── main.rs           # entry
        └── lib.rs            # #[tauri::command] handlers go here
```

Tauri commands exposed to the frontend live in `src-tauri/src/lib.rs` —
register new ones with `#[tauri::command]` and add them to the invoke handler.

## packages/* layout (consistent across all packages)

```
packages/<name>/
├── src/
│   ├── index.ts            # public API — only re-exports
│   ├── schema.ts           # types & zod validators
│   ├── loader.ts (etc.)    # implementation modules (flat, no subdirs)
│   └── *.test.ts           # vitest suites colocated with source
├── adapters/               # only for avatar-runtime (Live2D, VRM)
├── package.json            # name: @nais/<name>, type: module, ESM only
├── tsconfig.json           # noEmit:true, used for typecheck
├── tsconfig.build.json     # used for actual emit; excludes **/*.test.ts
├── vitest.config.ts        # only present where tests exist
└── README.md / BLUEPRINT.md
```

Rules:

- Every package exports through `src/index.ts` (barrel). Consumers import from
  `@nais/<name>`, never from internal paths like `@nais/<name>/src/loader`.
- `src/` stays flat — no nested subdirectories at the top level of `src/`,
  except `adapters/` in `avatar-runtime` for Live2D / VRM implementations.
- Each package is ESM-only (`"type": "module"`) and ships `dist/index.js` +
  `dist/index.d.ts` via the `exports` map.
- `@nais/character-schema` also has a CLI binary (`nais-character-schema`)
  defined in `package.json` `bin`, plus a vitest suite at
  `src/loader.test.ts` and `src/schema.test.ts`.

## characters/<pack> layout

```
characters/<pack>/
├── character.yaml    # avatar modes, state mappings, refs to persona/voice
├── persona.md        # personality, backstory, conversation style
├── voice.yaml        # TTS/STT config
├── LICENSE.md        # license for the model assets
├── live2d/           # if Live2D: .model3.json, motions, expressions, textures
└── vrm/              # if VRM: .vrm + textures
```

When adding a character: copy `_template/`, edit `character.yaml` to enable
the right `avatar.modes` (`live2d` or `vrm`) and point to the model file. The
seven `states` (idle / listening / thinking / speaking / success / warning /
error) must each map to an `expression` and `motion` available in the model —
verify against the model's `model3.json` `Motions` and `Expressions` keys
before committing. Out-of-range entries (e.g. `Idle@2` when the group has 1
motion) are silently ignored at runtime; that is a data bug, not an app bug.

## File naming conventions

| Kind                  | Convention           | Example                |
| --------------------- | -------------------- | ---------------------- |
| TS modules            | kebab-case           | `character-schema.ts`  |
| React components      | PascalCase           | `AvatarCanvas.tsx`     |
| Test files            | `*.test.ts`          | `loader.test.ts`       |
| Type-only declaration | `*.d.ts`             | `vite-env.d.ts`        |
| Rust modules          | snake_case           | `lib.rs`, `main.rs`    |
| Constants             | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`      |
| Branches              | kebab-case + prefix  | `feat/avatar-runtime`  |

See `docs/STANDARDS.md` for the full coding standards (naming, error handling,
JSDoc, Rust conventions).

## Where things go

- **New TS feature shared across packages?** New file in the relevant
  `packages/*/src/` and re-export from `index.ts`.
- **New UI component?** `apps/desktop/src/components/` (PascalCase `.tsx`).
- **New frontend service (agent calls, TTS, etc.)?** `apps/desktop/src/services/`.
- **New Tauri command?** `apps/desktop/src-tauri/src/lib.rs`.
- **New character?** Copy `characters/_template/` to `characters/<your-name>/`.
- **New large change / feature?** Start with an OpenSpec proposal under
  `openspec/changes/<change-name>/` (`proposal.md`, `design.md`, `tasks.md`)
  before writing code.
- **Changing the build, lint, or release flow?** Update `package.json`
  scripts, `eslint.config.mjs`, or `.github/workflows/build-windows.yml` —
  keep CI's per-package build order in sync.

## Things to leave alone

- `apps/desktop/src-tauri/gen/` — generated by Tauri.
- `apps/desktop/src-tauri/target/` and any `dist/` / `node_modules/` — build
  output, gitignored.
- `apps/desktop/public/live2dcubismcore.min.js` — vendored Cubism core; do not
  reformat or re-bundle.
