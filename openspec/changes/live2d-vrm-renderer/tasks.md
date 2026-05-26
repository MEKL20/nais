# Tasks: Live2D + VRM Renderer Swap

## Setup

- [x] Add npm dependencies to `packages/avatar-runtime/package.json`:
  - `three`
  - `@pixiv/three-vrm`
  - `pixi-live2d-display` (Live2D via PixiJS — correct package for Cubism 4)
  - `pixi.js` (peer dep for pixi-live2d-display)
  - `@types/three` (TypeScript types for three.js)

- [x] Run `pnpm install` in `/home/ubuntu/.openclaw/workspace/nais`
- [x] Verify `pnpm --filter @nais/avatar-runtime build` succeeds (TS compiles, bundle generated)

## Live2D Adapter

- [x] Rewrite `packages/avatar-runtime/src/adapters/live2d.ts`:
  - Import `pixi-live2d-display` + `pixi.js` (ES modules)
  - Implement `loadModel()` → creates PIXI.Application, loads model via Live2DModel.from(), appends canvas to container
  - Implement `setExpression()` → calls model.expression(name)
  - Implement `playMotion()` → calls model.motion(group, index)
  - Implement `setMouthOpen(value)` → interpolates ParamMouthOpen via core model API
  - Implement `update(deltaMs)` → calls model.update() + app.ticker.update()
  - Implement `dispose()` → destroys PIXI app, releases resources

- [x] Verify: `pnpm --filter @nais/avatar-runtime typecheck` passes

## VRM Adapter

- [x] Rewrite `packages/avatar-runtime/src/adapters/vrm.ts`:
  - Import `three` + `@pixiv/three-vrm` (VRMLoaderPlugin via GLTFLoader.register())
  - Implement `loadModel()` → creates WebGLRenderer, VRMLoader, loads .vrm, appends canvas to container
  - Implement `setExpression()` → calls VRMExpressionManager.setValue(name, 1.0)
  - Implement `playMotion()` → stub (requires VRMAnimation pipeline; tracked separately)
  - Implement `setMouthOpen(value)` → interpolates mouthOpen via VRMExpressionManager
  - Implement `lookAt(target)` → calls VRMLookAt.lookAt(Vector3)
  - Implement `update(deltaMs)` → vrm.update(deltaSec) + renderer.render()
  - Implement `dispose()` → disposes VRM, renderer, scene, canvas

- [x] Verify: `pnpm --filter @nais/avatar-runtime typecheck` passes

## AvatarCanvas (UI Layer)

- [x] Rewrite `apps/desktop/src/components/AvatarCanvas.tsx`:
  - Remove procedural orb useEffect render loop
  - Show styled placeholder orb when modelLoaded=false
  - Show adapter container div when modelLoaded=true
  - Accept containerRef, modelLoaded, onContainerRef props

- [x] Verify: `pnpm --filter @nais/desktop build` passes

## Integration Smoke Test

- [ ] `pnpm --filter @nais/desktop dev` starts without errors
- [ ] Browser DevTools → no Error-level console logs on load
- [x] Confirm build succeeds end-to-end: `pnpm --filter @nais/desktop build`

## Rollback Verification

- [ ] Restore `live2d.ts` and `vrm.ts` stubs → build still passes
