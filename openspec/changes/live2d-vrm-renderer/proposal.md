# Proposal: Swap Procedural Orb with Live2D + VRM Renderers

## Summary

Replace the canvas-based procedural orb renderer in `AvatarCanvas.tsx` (and the placeholder `Live2DAvatarRuntimeAdapter` / `VRMAvatarRuntimeAdapter`) with real Live2D Cubism SDK for Web and three.js + `@pixiv/three-vrm` implementations, wired through the existing `AvatarRuntimeAdapter` contract.

## Motivation

- The orb is a placeholder that communicates avatar state via color only.
- Real character presence requires Live2D / VRM models with expressions, motion, and lip-sync.
- The adapter contract already exists; only the renderer implementations are stubs.
- Desktop app already has UI to select Live2D/VRM packs and expects `live2d` / `vrm` modes.

## Scope

- Implement `Live2DAvatarRuntimeAdapter` using Cubism SDK for Web (`cubism-sdk-web`).
- Implement `VRMAvatarRuntimeAdapter` using `three` + `@pixiv/three-vrm`.
- Update `AvatarCanvas.tsx` to host a WebGL/Canvas renderer that delegates to the active adapter.
- Support state → expression + motion mapping via existing `stateMap` contract.
- Support `setMouthOpen` for lip-sync (parameterized blend shape or morph).
- TypeScript strict, no `any` in adapter surfaces.

## Non-Goals

- No new character packs or model files included in this change.
- No Tauri backend changes (renderer runs in the webview).
- No audio/voice integration.
- No multi-avatar or scene management.

## Risks

- Cubism SDK for Web bundle size is large (~3 MB); lazy-load only when a Live2D model is selected.
- VRM requires WebGL2; fallback to procedural orb if WebGL2 unavailable.
- Three.js and @pixiv/three-vrm version compatibility must be pinned.
- Both adapters must properly dispose GPU resources to avoid memory leaks.

## Rollback

- The existing placeholder adapters can be reverted to by restoring `live2d.ts` and `vrm.ts` stubs.
- `AvatarCanvas.tsx` falls back to orb rendering if no real model is loaded.
