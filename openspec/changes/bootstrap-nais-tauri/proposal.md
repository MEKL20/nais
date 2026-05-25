# Proposal: Bootstrap NAIS Tauri Architecture

## Summary

Create the initial NAIS project structure for a Tauri-based desktop assistant with Live2D/VRM character support and an OpenClaw-compatible brain gateway.

## Motivation

MEKL chose Tauri for the frontend and wants clean foldering plus blueprint documentation. NAIS needs a modular foundation before implementation so avatar runtime, character packs, and gateway integration do not become tightly coupled.

## Scope

- Establish project folder layout.
- Document responsibilities with `BLUEPRINT.md` files.
- Define initial character pack template.
- Define initial spec artifacts for desktop, character, and gateway integration.

## Non-Goals

- Building the actual Tauri app in this change.
- Implementing Live2D or VRM rendering.
- Implementing auto-generation of characters.
- Connecting to OpenClaw APIs yet.

## Risks / Rollback

Risk: structure may be too broad before implementation reveals real needs.
Rollback: folders are documentation-only and can be reorganized before code lands.
