# NAIS — Nano Assistant Intelligence System

> A Tauri desktop AI assistant with a customizable Live2D/3D avatar, swappable persona & voice, and an OpenClaw-compatible agent brain.

![Build Status](https://github.com/MEKL20/nais/actions/workflows/build-windows.yml/badge.svg)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Building from Source](#building-from-source)
- [Character Packs](#character-packs)
- [Development Guide](#development-guide)
- [License](#license)

---

## Overview

NAIS is a personal AI desktop assistant that lives on your desktop screen. Unlike typical virtual assistants, NAIS has a visual character — an animated 2D/3D avatar that reacts to conversation, displays emotion, and expresses personality through motion and voice.

NAIS is designed to be:

- **Easily customizable** — swap the character's look, voice, and personality in seconds via character packs
- **OpenClaw-powered** — uses OpenClaw as its agent brain, connecting to your own AI gateway
- **Desktop-native** — runs as a lightweight Windows app powered by Tauri + WebView2
- **Self-hosted** — no cloud dependency; your data and AI gateway stay on your machine or VPS

---

## Features

- 🎭 **Live2D & VRM avatars** — support for both `.model3.json` (Live2D Cubism) and `.vrm` (VRM 3D) character models
- 🧠 **OpenClaw agent brain** — connects to your local/remote OpenClaw gateway for AI inference
- 🗣️ **Swappable character packs** — drop-in character definitions with avatar, persona, and voice configuration
- 🪟 **Native Windows desktop** — uses Tauri + WebView2 for small binary size and native performance
- 🔧 **Modular monorepo** — clean separation between desktop app, bridge, avatar runtime, character schema, and agent adapters

---

## Architecture

```
NAIS
├── apps/desktop/         # Tauri desktop application (React frontend + Rust backend)
├── crates/nais-bridge/   # Rust ↔ JavaScript IPC bridge
├── packages/
│   ├── agent-adapter/    # OpenClaw gateway adapter (and future adapters)
│   ├── avatar-runtime/  # Live2D + VRM rendering contracts & placeholder adapters
│   └── character-schema/ # Character pack schema, validation, and loader
├── characters/          # Character pack definitions
│   └── _template/       # Template for creating new character packs
└── docs/                # Architecture and product documentation
```

**Tech Stack:**

| Layer             | Technology                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Desktop framework | Tauri 2.x                                                                                    |
| Frontend UI       | React 19 + TypeScript                                                                        |
| Build tool        | Vite 8                                                                                       |
| Package manager   | pnpm                                                                                         |
| Avatar rendering  | Live2D Cubism 4 (via `@cubism/live2d` in future) +VRM 1.x (via `@pixiv/three-vrm` in future) |
| Agent brain       | OpenClaw gateway adapter                                                                     |
| Character config  | YAML (`character.yaml`)                                                                      |

---

## Project Structure

```
nais/
├── apps/
│   └── desktop/               # Tauri desktop app
│       ├── src/               # React frontend source
│       ├── src-tauri/         # Rust Tauri backend
│       │   ├── src/
│       │   │   ├── main.rs    # Entry point
│       │   │   └── lib.rs     # Library + Tauri commands
│       │   ├── Cargo.toml
│       │   ├── tauri.conf.json
│       │   └── icons/         # App icons
│       └── package.json
├── crates/
│   └── nais-bridge/           # IPC bridge (future)
├── packages/
│   ├── agent-adapter/         # OpenClaw adapter (future)
│   ├── avatar-runtime/        # Avatar contracts (future)
│   └── character-schema/       # Schema types & loader (future)
├── characters/
│   ├── _template/             # Character pack template
│   │   ├── BLUEPRINT.md
│   │   ├── character.yaml      # Avatar, voice, state mappings
│   │   ├── persona.md          # Character personality & backstory
│   │   └── voice.yaml          # TTS/STT voice configuration
│   └── .gitkeep
├── docs/                       # Architecture docs
├── openspec/                   # Spec-first change artifacts
├── package.json                # pnpm workspace root
├── pnpm-workspace.yaml
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool                      | Version | Notes                         |
| ------------------------- | ------- | ----------------------------- |
| Node.js                   | ≥ 20    | LTS recommended               |
| pnpm                      | ≥ 9     | Install via `corepack enable` |
| Rust                      | ≥ 1.75  | `rustup install stable`       |
| Visual Studio Build Tools | Latest  | For Windows WebView2 SDK      |

### Local Development

```bash
# Clone the repository
git clone https://github.com/MEKL20/nais.git
cd nais

# Install dependencies (uses pnpm workspaces)
pnpm install

# Start development server (frontend hot-reload + Tauri dev mode)
pnpm run dev

# Run TypeScript type checking
pnpm run typecheck
```

The app will open in a window. The dev server runs at `http://127.0.0.1:1420`.

### Building from Source

```bash
# Build the complete Tauri app (Windows installer)
cd apps/desktop
pnpm run tauri:build

# Output artifacts are in:
# apps/desktop/src-tauri/target/release/bundle/msi/
# apps/desktop/src-tauri/target/release/bundle/nsis/
```

Alternatively, from the repo root:

```bash
pnpm --filter @nais/desktop run tauri:build
```

#### Pre-built Windows Installers

Download the latest artifacts from the **Actions** tab:

- **nais-windows-msi** — MSI installer
- **nais-windows-exe** — NSIS (`.exe`) installer

---

## Character Packs

A character pack is a folder containing:

```
characters/<name>/
├── character.yaml   # Avatar type, model paths, state mappings, emotion rules
├── persona.md       # Character backstory, personality, conversation style
└── voice.yaml       # Voice synthesis configuration
```

### Using a Character

1. Copy or create a character pack folder under `characters/`
2. Edit `character.yaml` to point to your avatar model files
3. NAIS loads the character at startup (future feature)

### Creating a New Character

Copy the `_template` folder and modify:

```bash
cp -r characters/_template characters/my-character
```

See `characters/_template/BLUEPRINT.md` for the full schema specification.

---

## Development Guide

### Adding a New Package

```bash
mkdir packages/my-package
cd packages/my-package
pnpm init
# Add to pnpm-workspace.yaml if it's a workspace package
```

### Tauri Commands

Commands exposed from Rust to the frontend are defined in `src-tauri/src/lib.rs`. Add new commands with `#[tauri::command]`.

### Avatar Runtime

The avatar runtime contract is defined in `packages/avatar-runtime/`. Implementations for Live2D and VRM are planned.

### Agent Adapter

The OpenClaw adapter in `packages/agent-adapter/` handles:

- Session management
- Message routing to OpenClaw gateway
- Event/state mapping between NAIS and the agent brain

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Tauri](https://tauri.app/) — Build smaller, faster desktop apps
- [Live2D Cubism](https://www.live2d.com/) — 2D character animation technology
- [VRM](https://vrm.dev/) — 3D avatar format for VR applications
- [OpenClaw](https://github.com/openclaw/openclaw) — AI agent gateway
