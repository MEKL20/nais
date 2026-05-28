# Tech Stack

## Runtime & build system

- **Desktop shell:** Tauri 2.x (Rust backend, WebView2 frontend) — Windows only
  for now.
- **Frontend:** React 19 + TypeScript, bundled with Vite 8.
- **Backend (Rust):** crate `nais-desktop` in `apps/desktop/src-tauri`,
  edition 2021. Dependencies: `tauri 2`, `tauri-plugin-opener 2`, `serde 1`,
  `serde_json 1`, `serde_yaml 0.9`.
- **Workspace manager:** pnpm 10 (`pnpm-workspace.yaml` covers `apps/*` and
  `packages/*`). Always use pnpm — never npm or yarn for installs.
- **Node:** ≥ 20 LTS. Rust: stable ≥ 1.75.
- **Native build prerequisite (Windows):** Visual Studio Build Tools 2022 with
  the **Desktop development with C++** workload — Rust's MSVC toolchain links
  through MSVC's `link.exe`. On a fresh machine, install with:
  ```powershell
  winget install --id Microsoft.VisualStudio.2022.BuildTools --silent --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  ```
  If `cargo build` errors with `link: extra operand` it picked up Git Bash's
  GNU `link.exe` — restart shell or run from **Developer PowerShell for VS**.

## Avatar & character libraries

- Live2D rendering: `pixi.js` 7 + `pixi-live2d-display` 0.5 + `live2dcubismcore`.
  - Adapter auto-detects the mouth-open Cubism param by probing the model
    (`ParamMouthOpenY` → `ParamMouthOpen` → `ParamMouthA`); override per pack
    via `createAvatarRuntime({ kind: "live2d", mouthParamId })`.
- VRM rendering: `three` 0.170 + `@pixiv/three-vrm` 3.x.
- Schema validation: `zod` + `yaml` (in `@nais/character-schema`).

Vite is configured to split these into named chunks (`avatar-vrm`,
`avatar-live2d`, `tauri`, `react-vendor`) — preserve this when touching
`apps/desktop/vite.config.ts`. The same file also sets `server.fs.allow` to
the repo root so the dev preview can read `characters/` via Vite's `/@fs/`
mount.

## Lint, format, types

- **TypeScript:** `strict: true`, `module: ESNext`, `moduleResolution: Bundler`,
  `target: ES2022`. Root `tsconfig.json` references each workspace project.
- **ESLint:** flat config in `eslint.config.mjs`. Notable rules:
  `no-explicit-any` (warn), `no-non-null-assertion` (error), `import/order`,
  `import/no-cycle`, `no-console` allows only `warn|error|log`. Honor these —
  do not disable rules without justification.
- **Prettier:** `printWidth: 100`, double quotes, semicolons, trailing commas,
  LF line endings. Markdown wraps at 80, YAML uses single quotes.
- **Editor:** 2-space indent everywhere except Rust (4) and Makefiles (tab).

## Tests

- Test runner: **vitest** (currently only `@nais/character-schema`).
- Tests live next to source as `*.test.ts` (e.g. `src/loader.test.ts`).
- `tsconfig.build.json` excludes `**/*.test.ts` from emitted output.
- Add new test suites by installing `vitest` as devDep on the package and
  pointing `test` script at `vitest run`.

## Common commands

Run from the repo root unless noted.

```bash
# Install (use pnpm, never npm/yarn)
pnpm install

# Dev — Vite dev server on http://127.0.0.1:1420
pnpm run dev

# Type-check the whole workspace
pnpm run typecheck

# Lint / format
pnpm run lint
pnpm run lint:fix
pnpm run format
pnpm run format:check

# Run tests (currently only @nais/character-schema has a vitest suite)
pnpm run test

# Build frontend bundle
pnpm run build

# Full Tauri Windows build (MSI + NSIS installers) — requires MSVC linker
pnpm --filter @nais/desktop run tauri:build

# Tauri dev mode (opens the native window)
pnpm --filter @nais/desktop run tauri:dev

# Build a single workspace package
pnpm --filter @nais/character-schema run build
pnpm --filter @nais/avatar-runtime run build
pnpm --filter @nais/agent-adapter run build

# Smoke tests — auto-discover Chrome/Edge on Win/Linux/macOS;
# set CHROME_BIN to override.
pnpm run smoke:desktop-avatar
node scripts/smoke-live2d-core.mjs
node scripts/smoke-live2d-only.mjs

# Character schema CLI (from packages/character-schema)
pnpm --filter @nais/character-schema run validate
pnpm --filter @nais/character-schema run cli:list
```

## CI

`.github/workflows/build-windows.yml` runs on push/PR to `main` and on
`workflow_dispatch`. The pipeline:

1. Install pnpm deps (`pnpm install --frozen-lockfile`)
2. `pnpm run lint`
3. Build each workspace package in order: `character-schema` → `avatar-runtime`
   → `agent-adapter` → `@nais/desktop`
4. `pnpm run test`
5. `pnpm --filter @nais/desktop run tauri:build`
6. Upload MSI + NSIS EXE installers as artifacts

Keep this build order in mind when changing dependencies between packages.

## Verification before claiming done

After changes, run at minimum:

1. `pnpm run lint`
2. `pnpm run typecheck`
3. `pnpm run test`
4. `pnpm run build` (or the relevant workspace filter)

For Tauri/Rust changes also build with `pnpm --filter @nais/desktop run
tauri:build` when feasible. If you do not have MSVC installed locally, push
to a branch and let the Windows CI runner produce the installers.
