# Technical Standards

> These standards apply to all TypeScript, JavaScript, Rust, and YAML code in the NAIS repository.

---

## Table of Contents

- [Language Conventions](#language-conventions)
  - [TypeScript / JavaScript](#typescript--javascript)
  - [Rust](#rust)
  - [YAML](#yaml)
- [Project Conventions](#project-conventions)
  - [File Naming](#file-naming)
  - [Package Structure](#package-structure)
- [API Design](#api-design)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Language Conventions

### TypeScript / JavaScript

**Style:** [ESLint](https://eslint.org/) + Prettier (config via `.eslintrc.cjs` and `.prettierrc`). Run `pnpm run lint` before committing.

**Key Rules:**

- **No `any`** — use `unknown` for truly unknown values; narrow with type guards
- **`strict: true`** — all TypeScript projects use strict mode
- **No named exports of primitives** — e.g. `export type Foo = ...` (type-only)
- **Explicit return types** — on public functions and methods (minimum `/** @returns */` JSDoc for complex ones)
- **`readonly`** — mark array/object parameters that are not mutated
- **Prefer `interface`** over `type` for object shapes that may be extended
- **`enum`** — avoid; use `as const` objects or union types instead
- **`async/await`** — avoid `.then().catch()`; always prefer `async/await`
- **No `var`** — use `const` or `let`
- **Barrel files** — each package has an `index.ts` that re-exports the public API; no deep imports from package internals

#### Naming

| Thing                        | Convention           | Example               |
| ---------------------------- | -------------------- | --------------------- |
| Variables / functions        | camelCase            | `loadCharacterPack`   |
| Classes / types / interfaces | PascalCase           | `CharacterPackLoader` |
| Constants                    | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`     |
| Enums                        | PascalCase values    | `Status.Active`       |
| Files                        | kebab-case           | `character-schema.ts` |
| React components             | PascalCase           | `AvatarRenderer.tsx`  |
| Test files                   | `*.test.ts` suffix   | `loader.test.ts`      |

#### Imports

```typescript
// Good
import { type CharacterPack } from "./schema.js";
import { loadCharacterPack } from "./loader.js";

// Bad — avoid default imports for modules
import loader from "./loader.js";
```

#### JSDoc

Document all exported types, functions, and classes:

```typescript
/**
 * Loads and validates a complete character pack from a directory.
 *
 * @param dir - Absolute or relative path to the character pack directory
 * @returns The validated character pack
 * @throws LoaderError if files are missing or validation fails
 */
export function loadCharacterPack(dir: string): CharacterPack {
  // ...
}
```

---

### Rust

**Style:** `rustfmt` + Clippy. Run `cargo fmt` and `cargo clippy` before committing.

**Key Rules:**

- **`no_std`** compatibility not required (desktop only)
- **Error handling** — prefer `Result<T, E>` over `panic!` for recoverable errors
- **`#[derive(...)]`** — use `Clone, Debug, PartialEq` freely; derive `Serialize`/`Deserialize` with `serde`
- **No unsafe code** unless absolutely necessary (document why)
- **Feature flags** — use for optional dependencies; no new `unsafe`
- **Visibility** — `pub(crate)` for crate-internal; `pub` only for public API

#### Naming

| Thing                    | Convention           | Example           |
| ------------------------ | -------------------- | ----------------- |
| Variables / functions    | snake_case           | `load_config`     |
| Structs / enums / traits | PascalCase           | `CharacterConfig` |
| Constants                | SCREAMING_SNAKE_CASE | `MAX_LOG_SIZE`    |
| Module files             | snake_case           | `character.rs`    |

---

### YAML

Used for configuration only (`character.yaml`, `voice.yaml`).

**Rules:**

- **2-space indent** — no tabs
- **No anchor/alias** — keep YAML simple and readable
- **Quote strings** that could be misinterpreted as numbers or booleans: `"true"` vs `true`
- **Comments** — use `#` for notes; document the purpose, not the obvious

```yaml
# Good
avatar:
  default_mode: "live2d"   # matches the active avatar renderer
  modes:
    live2d:
      enabled: true
      model: "./live2d/model.model3.json"

# Bad — no quotes, inconsistent indent
avatar:
  default_mode: live2d
  modes:
    live2d:
      enabled:true
      model: ./live2d/model.model3.json
```

---

## Project Conventions

### File Naming

| File type             | Convention       | Example                           |
| --------------------- | ---------------- | --------------------------------- |
| TypeScript modules    | kebab-case       | `character-schema.ts`             |
| React components      | PascalCase       | `AvatarCard.tsx`                  |
| Type definition files | `*.d.ts`         | `vite-env.d.ts`                   |
| Test files            | `*.test.ts`      | `loader.test.ts`                  |
| Config files          | dotfile or kebab | `.eslintrc.cjs`, `vite.config.ts` |
| Rust modules          | snake_case       | `lib.rs`, `character.rs`          |

### Package Structure

Each package in `packages/` follows this layout:

```
packages/<name>/
├── src/
│   ├── index.ts          # public API (reexports)
│   ├── schema.ts         # types and validators
│   └── loader.ts        # main logic
├── test/                 # test helpers and fixtures
├── package.json
├── tsconfig.json         # extends root, noEmit: true
├── tsconfig.build.json   # for actual build (emitDeclarationOnly)
└── README.md            # per-package docs
```

The `src/` directory has no subdirectories at the top level — flat structure preferred.

---

## API Design

### Principles

1. **Explicit over implicit** — function signatures should be self-documenting
2. **Fail fast** — validate inputs at the boundary; throw `LoaderError` or typed errors
3. **No output parameters** — prefer returning values; do not use `out` or `callback` parameters
4. **Consistent error shapes** — use typed error classes (e.g. `LoaderError` with a `code` property)
5. **Async by default** — unless there is a strong reason, async functions return `Promise<T>`

### Return Types

```typescript
// Good — explicit return type
export function loadCharacterPack(dir: string): Promise<CharacterPack> {
  // ...
}

// Good — union type for fallible operations
export function tryLoadCharacterPack(dir: string): CharacterPack | null {
  // ...
}

// Bad — undefined as error value
export function loadCharacterPack(dir: string): CharacterPack | undefined { ... }
```

---

## Error Handling

### TypeScript / JavaScript

```typescript
// Always use typed errors for domain-specific failures
export class LoaderError extends Error {
  readonly code = "LOADER_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "LoaderError";
  }
}

// Never swallow errors silently
try {
  const pack = loadCharacterPack(dir);
} catch (err) {
  if (err instanceof LoaderError) {
    console.error(`Failed to load character: ${err.message}`);
  }
  throw err; // re-throw unexpected errors
}
```

### Rust

```rust
// Use thiserror for ergonomic error types
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LoadError {
    #[error("character.yaml not found at {path}")]
    NotFound { path: PathBuf },

    #[error("validation failed: {0}")]
    Validation(String),
}
```

---

## Testing

**Current requirement:** All new functions in `packages/character-schema` must have test coverage.

**Future:** When a test framework is added, the following rules apply:

- **Unit tests** — test files live next to source: `loader.test.ts`
- **Integration tests** — `tests/` directory at package root
- **Fixtures** — `test/fixtures/` for sample data
- **Coverage** — aim for meaningful coverage, not 100%; focus on edge cases

```typescript
// Test structure
import { describe, it, expect } from "vitest";
import { loadCharacterPack } from "./loader.js";

describe("loadCharacterPack", () => {
  it("throws LoaderError when directory does not exist", () => {
    expect(() => loadCharacterPack("/nonexistent")).toThrow("not found");
  });
});
```

---

## Documentation

### When to Update README

| Change          | Update README         | Update Docs          | Update CHANGELOG |
| --------------- | --------------------- | -------------------- | ---------------- |
| New feature     | ✅                    | ✅ (if complex)      | ✅               |
| New package     | ✅ (add to structure) | ✅ (add package doc) | ✅               |
| Bug fix         | —                     | —                    | ✅               |
| Config change   | ✅ (if user-facing)   | —                    | ✅               |
| Breaking change | ✅                    | ✅                   | ✅               |

### Inline Documentation

- **Document why, not what** — code tells what; comments tell why
- **No commented-out code** — delete it; use git history if needed
- **TODO format** — `// TODO(<issue>): <description>` — link to issue
- **Hack comments** — `// HACK(<reason>): <description>` — with a tracking issue

```typescript
// Good — explains the why
// We parse YAML ourselves here because the yaml package doesn't
// support YAML 1.2 anchors, and some packs use anchor inheritance.
const parsed = parseYaml(raw, { version: "1.2" });

// Bad — restates the code
// Increment the counter
counter++;

// HACK(xxx): temp workaround for missing VRM expression in pixiv-three
// tracked at https://github.com/pixiv/three-vrm/issues/xxx
```
