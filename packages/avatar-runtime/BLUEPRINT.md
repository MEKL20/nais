# Avatar Runtime Blueprint

Purpose: shared frontend contracts and adapters for rendering animated NAIS characters.

## Avatar Modes

- `live2d`: Live2D Cubism model via `.model3.json`.
- `vrm`: 3D humanoid avatar via `.vrm`.

## Required States

- idle
- listening
- thinking
- speaking
- success
- warning
- error

## Adapter Contract Draft

Each adapter should support:

- load model
- unload model
- set state
- set expression
- play motion/animation
- update mouth/lip-sync value
- look at cursor/target
- report load/render errors
