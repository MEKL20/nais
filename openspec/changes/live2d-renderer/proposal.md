# Proposal: Live2D Cubism SDK Renderer

## Summary
Replace the procedural canvas orb in `AvatarCanvas` with a real Live2D Cubism SDK renderer, loading `.model3.json` character pack models and playing expressions, motions, and lip-sync via the Cubism WebGL backend.

## Motivation
The procedural orb is a visual placeholder. Real NAIS character packs ship with Live2D models (`.model3.json` + textures). Without a real renderer, the avatar cannot display character art, play character animations, or respond visually to agent events. A Live2D renderer is the faster path to a visually compelling avatar compared to VRM.

## Scope
- Install Live2D Cubism SDK (`live2d-core` / `@pixiv/light`) as a dependency of `packages/avatar-runtime`.
- Implement `Live2DCubismAdapter` extending `BaseAvatarRuntimeAdapter` with real Cubism rendering on a WebGL canvas.
- Replace the procedural orb in `AvatarCanvas` with a `<canvas>` element backed by the real adapter.
- Wire character pack state mappings (`states` in `character.yaml`) to Cubism expression and motion clips.
- Support `mouthOpen` via Cubism lip-sync parameter (`ParamMouthOpenY`).
- Provide model asset path resolution via `CharacterPackDetail.live2d_model` relative path.

## Non-goals
- VRM renderer (separate change).
- Physics/hair simulation beyond Cubism built-ins.
- Model export/conversion tooling.
- Dynamic model swapping at runtime (load once on startup).
- Webpack/vite asset bundling for packaged Windows app (deferred to packaging change).

## Risks / rollback
- Cubism SDK bundles large WASM + core libraries; increases bundle size ~1–3 MB.
- SDK has specific browser compatibility requirements (WebGL2, SharedArrayBuffer may need COOP/COEP headers in dev).
- Cubism model files (`.model3.json` + textures) are not in the repo yet; testing requires a real model.
- Rollback: revert adapter implementation, restore procedural orb, update `AvatarCanvas`.
