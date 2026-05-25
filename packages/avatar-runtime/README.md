# @nais/avatar-runtime

Shared avatar runtime contracts and placeholder adapters for NAIS.

This package defines the stable interface used by the desktop app to control animated characters without coupling the UI to a specific renderer.

## Supported Runtime Kinds

- `live2d` — Live2D Cubism `.model3.json`
- `vrm` — VRM 3D `.vrm`

## Contract

All adapters implement `AvatarRuntimeAdapter`:

- `loadModel(source, options?)`
- `unloadModel()`
- `setState(state)`
- `setExpression(expression)`
- `playMotion(motion)`
- `setMouthOpen(value)`
- `lookAt(target)`
- `update(deltaMs)`
- `dispose()`

## Usage

```ts
import { createAvatarRuntime } from "@nais/avatar-runtime";

const runtime = createAvatarRuntime({ kind: "live2d" });

await runtime.loadModel({
  kind: "live2d",
  path: "./characters/nano/live2d/model.model3.json",
});

await runtime.setState("speaking");
await runtime.setMouthOpen(0.7);
```

## Current Implementation

The current adapters are **contract placeholders**. They validate calls, track state, and expose capabilities, but do not render yet.

Real renderers will later bind to:

- Live2D Cubism runtime for `.model3.json`
- Three.js + `@pixiv/three-vrm` for `.vrm`
