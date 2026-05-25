// NAIS Avatar Runtime Contract
// Runtime implementations must satisfy this interface.

import type {
  AvatarExpression,
  AvatarLoadOptions,
  AvatarModelSource,
  AvatarRuntimeCapabilities,
  AvatarRuntimeResult,
  AvatarRuntimeStatus,
  AvatarState,
  LookAtTarget,
} from "./types.js";

/**
 * Common interface for all avatar renderer adapters.
 *
 * The goal is to keep NAIS independent from a specific rendering engine.
 * Live2D and VRM implementations can be swapped behind this contract.
 */
export interface AvatarRuntimeAdapter {
  /** Human-readable adapter name. */
  readonly name: string;

  /** What this adapter can do. */
  getCapabilities(): AvatarRuntimeCapabilities;

  /** Current runtime status snapshot. */
  getStatus(): AvatarRuntimeStatus;

  /** Load a model. Must unload any existing model first if needed. */
  loadModel(_source: AvatarModelSource, _options?: AvatarLoadOptions): Promise<AvatarRuntimeResult>;

  /** Unload current model and release runtime resources. */
  unloadModel(): Promise<AvatarRuntimeResult>;

  /** Set semantic avatar state; adapters may map state to expression/motion. */
  setState(_state: AvatarState): Promise<AvatarRuntimeResult>;

  /** Set model expression directly. */
  setExpression(_expression: AvatarExpression): Promise<AvatarRuntimeResult>;

  /** Play model motion/animation directly. */
  playMotion(_motion: string): Promise<AvatarRuntimeResult>;

  /** Set mouth/lip-sync openness, normalized 0..1. */
  setMouthOpen(_value: number): Promise<AvatarRuntimeResult>;

  /** Make avatar look at a target coordinate. */
  lookAt(_target: LookAtTarget): Promise<AvatarRuntimeResult>;

  /** Per-frame update hook for render loops. */
  update(_deltaMs: number): void;

  /** Dispose adapter and detach from renderer/container. */
  dispose(): Promise<AvatarRuntimeResult>;
}

/** Shared success value for no-op operations. */
export const OK: AvatarRuntimeResult = { ok: true };
