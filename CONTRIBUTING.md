# Contributing to NAIS

> **Important:** All changes to `main` require a Pull Request. Direct pushes to `main` are blocked.

This document describes the workflow, standards, and expectations for all contributors.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Branch Strategy](#branch-strategy)
- [Commit Messages](#commit-messages)
- [Pull Request Workflow](#pull-request-workflow)
- [OpenSpec Process](#openspec-process)
- [Reporting Issues](#reporting-issues)

---

## Quick Start

```bash
# Clone
git clone https://github.com/MEKL20/nais.git
cd nais

# Install dependencies (uses pnpm workspaces)
corepack enable
pnpm install

# Verify the build works
pnpm run build

# Run all checks
pnpm run typecheck
```

---

## Branch Strategy

```
main          ← production-ready, protected
  └── feat/*     new features
  └── fix/*      bug fixes
  └── chore/*    tooling, deps, config
  └── docs/*    documentation only
  └── refactor/* code refactoring (no behavior change)
```

**Rules:**

- Branch from `main`; merge back into `main` via PR.
- Branch names: `feat/<short-description>`, `fix/<short-description>`, etc.
- Use **kebab-case** for branch names. Example: `feat/avatar-runtime-liv2d`
- Delete your branch after it is merged.

---

## Commit Messages

### Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type       | Use for                                    |
| ---------- | ------------------------------------------ |
| `feat`     | New feature                                |
| `fix`      | Bug fix                                    |
| `docs`     | Documentation changes only                 |
| `style`    | Formatting, whitespace (no code change)    |
| `refactor` | Code restructuring with no behavior change |
| `test`     | Adding or fixing tests                     |
| `chore`    | Build scripts, CI, dependencies, config    |
| `perf`     | Performance improvement                    |
| `ci`       | CI/CD pipeline changes                     |

### Scope

Use the package or module name as scope:

- `feat(character-schema): add YAML validation for voice config`
- `fix(desktop): correct window title on startup`
- `chore(ci): add windows-latest to build matrix`
- `docs(readme): update getting started steps`

### Rules

1. **Subject line ≤ 72 characters**
2. Use **imperative mood**: "add feature" not "added feature" or "adds feature"
3. **No emoji** in commit messages
4. Reference issues in footer: `Closes #123`
5. Each commit must pass `pnpm run typecheck`

### Good Examples

```
feat(avatar-runtime): add loadModel contract for Live2D
fix(character-schema): validate voice speed range [0.1, 10]
docs(STANDARDS): add TypeScript style guidelines
chore(ci): add pnpm cache for Windows build
refactor(agent-adapter): extract session map to separate module
```

---

## Pull Request Workflow

### Steps

1. **Create a branch** from `main`
2. **Make your changes** — follow the [Coding Standards](docs/STANDARDS.md)
3. **Run checks locally** before pushing:
   ```bash
   pnpm run typecheck
   pnpm run build
   ```
4. **Open a PR** against `main`
5. **Fill in the PR template** (description, motivation, testing)
6. **Pass CI** — all checks must be green before review
7. **Address review feedback** — push fixup commits to your branch
8. **Squash and merge** — the maintainer will squash on merge

### PR Requirements

- PR title follows [Commit Messages](#commit-messages) format
- All CI checks pass
- No merge conflicts with `main`
- New code has tests (if applicable)
- Documentation updated if behavior changed

### What Makes a Good PR Description

```
## What
Brief description of what this PR does.

## Why
Why this change is needed.

## How
Key implementation decisions.

## Testing
How you tested the change.
```

---

## OpenSpec Process

Large changes go through the [OpenSpec workflow](../openspec/README.md):

1. **Proposal** — write the problem and proposed solution in `openspec/changes/<name>/proposal.md`
2. **Design** — write the technical design in `docs/<name>/design.md`
3. **Tasks** — break it into tasks in `openspec/changes/<name>/tasks.md`
4. **Implement** — implement per task, check off items
5. **Review** — get approval before merging

Small changes (bug fixes, chores, docs) skip OpenSpec but still require a PR.

---

## Reporting Issues

When reporting a bug, include:

- **Description** — what went wrong
- **Steps to reproduce** — how to trigger it
- **Expected vs actual behavior**
- **Environment** — OS, Node version, pnpm version
- **Log output** — relevant logs or error messages

Use the issue template if one exists.

---

## Code of Conduct

Be respectful. Disagreements are fine; disrespect is not. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).
