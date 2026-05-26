# Design: Live2D + VRM Renderer Swap

## Context

NAIS desktop app has a canvas-based procedural orb renderer (`AvatarCanvas.tsx`) and two placeholder avatar adapters (`Live2DAvatarRuntimeAdapter`, `VRMAvatarRuntimeAdapter`) that implement the `AvatarRuntimeAdapter` contract but do no real rendering.

The goal is to replace the rendering layer with real engines while preserving the adapter contract.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  AvatarCanvas.tsx                                     │
│  ┌────────────────────────────────────────────────┐  │
│  │  RendererBridge (WebGL / Canvas2D)             │  │
│  │  ┌──────────────────┐  ┌──────────────────┐   │  │
│  │  │ Live2DRenderer   │  │  VRMRenderer     │   │  │
│  │  │ (Cubism SDK)     │  │  (Three.js+VRM)  │   │  │
│  │  └──────────────────┘  └──────────────────┘   │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Live2DAvatarRuntimeAdapter / VRMAvatar...   │  │
│  │  (implements AvatarRuntimeAdapter contract)    │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

`AvatarCanvas` does not know which renderer is active. It holds a reference to the current `AvatarRuntimeAdapter` and calls `setState`, `setExpression`, `setMouthOpen` etc. Each adapter subclass owns its own renderer.

## Key Decisions

### 1. Renderer lifecycle
- Each adapter creates its renderer in `loadModel()` and destroys it in `unloadModel()`.
- `update(deltaMs)` drives the render loop; `AvatarCanvas` calls `adapter.update` on every `requestAnimationFrame` tick.

### 2. Live2D: Cubism SDK for Web
- Import `live2dcubismframework` as an ES module from npm (`live2dcubismcore` + the framework bundle).
- Load `.model3.json` via `LAppModel.loadModel()`.
- Expression mapping: `setExpression` writes to `model._coreModel.Parameters` or uses `CubismExpressionMotion`.
- Motion: `playMotion` triggers `model.motion()`.
- Mouth open: animate `ParamMouthOpen` parameter driven by `setMouthOpen(value)`.
- Renderer output goes to the adapter's own `HTMLCanvasElement` (separate from the one in `AvatarCanvas.tsx`); `AvatarCanvas` shows a `<div>` container and the adapter appends the canvas into it.

### 3. VRM: Three.js + @pixiv/three-vrm
- Import `three` and `@pixiv/three-vrm` from npm.
- `THREE.WebGLRenderer` targets the adapter's own `<canvas>` appended to the `AvatarCanvas` container.
- `VRMLoader` loads `.vrm` files; the resulting `VRM` object exposes `VRMExpressionManager` (for expressions) and `VRMHumanoid` / `VRMAnimation` (for motions).
- Mouth open: set `VRMExpressionManager.get('mouthCurves').setValue('mouthOpen', value)`.
- Look-at: `VRMFirstPerson.lookAt()` accepting normalized screen coordinates.

### 4. Fallback
- If WebGL2 is unavailable or model fails to load, the adapter logs a warning and the container in `AvatarCanvas` stays empty/blank; the procedural orb code in `AvatarCanvas.tsx` is removed entirely only after both adapters are proven.

### 5. Dependency injection
- All npm packages are added to `packages/avatar-runtime/package.json` devDependencies (they are browser-only so they do not affect Node.js tooling).
- The pnpm workspace hoists them.

## Impacted Files

| File | Change |
|------|--------|
| `packages/avatar-runtime/src/adapters/live2d.ts` | Rewrite placeholder → real Cubism adapter |
| `packages/avatar-runtime/src/adapters/vrm.ts` | Rewrite placeholder → real Three.js+VRM adapter |
| `packages/avatar-runtime/package.json` | Add `live2dcubismframework`, `three`, `@pixiv/three-vrm` |
| `packages/avatar-runtime/tsconfig.build.json` | Add if needed |
| `apps/desktop/src/components/AvatarCanvas.tsx` | Remove procedural orb; host adapter's canvas |
| `apps/desktop/src/services/avatar.ts` | No changes needed |

## Validation Plan

1. `pnpm --filter @nais/avatar-runtime build` succeeds with no TS errors.
2. `pnpm --filter @nais/desktop build` succeeds with no TS errors.
3. Desktop app dev server starts without runtime errors.
4. No console errors in browser DevTools when model files are absent (adapter still initializes).
