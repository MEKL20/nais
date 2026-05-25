// Base adapter implementation for NAIS avatar runtimes.

import type { AvatarRuntimeAdapter } from "./runtime.js";
import { OK } from "./runtime.js";
import type {
  AvatarExpression,
  AvatarLoadOptions,
  AvatarModelSource,
  AvatarRuntimeCapabilities,
  AvatarRuntimeKind,
  AvatarRuntimeResult,
  AvatarRuntimeStatus,
  AvatarState,
  AvatarStateMap,
  LookAtTarget,
} from "./types.js";
import { AvatarRuntimeError } from "./types.js";

/** Constructor options for BaseAvatarRuntimeAdapter. */
export interface BaseAvatarRuntimeOptions {
  readonly kind: AvatarRuntimeKind;
  readonly name: string;
  readonly capabilities: AvatarRuntimeCapabilities;
  readonly stateMap?: AvatarStateMap;
}

/**
 * Base no-op adapter.
 *
 * Concrete adapters should override renderer-specific methods but can reuse
 * status tracking and validation behavior from this class.
 */
export class BaseAvatarRuntimeAdapter implements AvatarRuntimeAdapter {
  readonly name: string;

  protected readonly kind: AvatarRuntimeKind;
  protected readonly capabilities: AvatarRuntimeCapabilities;
  protected readonly stateMap: AvatarStateMap;
  protected status: AvatarRuntimeStatus;

  constructor(options: BaseAvatarRuntimeOptions) {
    this.name = options.name;
    this.kind = options.kind;
    this.capabilities = options.capabilities;
    this.stateMap = options.stateMap ?? {};
    this.status = {
      kind: options.kind,
      loaded: false,
      state: "idle",
      mouthOpen: 0,
    };
  }

  getCapabilities(): AvatarRuntimeCapabilities {
    return this.capabilities;
  }

  getStatus(): AvatarRuntimeStatus {
    return this.status;
  }

  async loadModel(
    source: AvatarModelSource,
    options: AvatarLoadOptions = {},
  ): Promise<AvatarRuntimeResult> {
    if (source.kind !== this.kind) {
      throw new AvatarRuntimeError(`Cannot load ${source.kind} model with ${this.kind} runtime`, {
        code: "AVATAR_RUNTIME_KIND_MISMATCH",
        runtime: this.kind,
      });
    }

    this.status = {
      ...this.status,
      loaded: true,
      model: source,
      state: options.initialState ?? "idle",
      expression: options.initialExpression,
      mouthOpen: 0,
    };

    return OK;
  }

  async unloadModel(): Promise<AvatarRuntimeResult> {
    this.status = {
      kind: this.kind,
      loaded: false,
      state: "idle",
      mouthOpen: 0,
    };
    return OK;
  }

  async setState(state: AvatarState): Promise<AvatarRuntimeResult> {
    this.assertLoaded("setState");
    const mapped = this.stateMap[state];
    this.status = {
      ...this.status,
      state,
      expression: mapped?.expression ?? this.status.expression,
    };
    if (mapped?.motion) {
      await this.playMotion(mapped.motion);
    }
    return OK;
  }

  async setExpression(expression: AvatarExpression): Promise<AvatarRuntimeResult> {
    this.assertLoaded("setExpression");
    if (!this.capabilities.supportsExpressions) {
      throw new AvatarRuntimeError("Runtime does not support expressions", {
        code: "AVATAR_RUNTIME_UNSUPPORTED_OPERATION",
        runtime: this.kind,
      });
    }
    this.status = { ...this.status, expression };
    return OK;
  }

  async playMotion(motion: string): Promise<AvatarRuntimeResult> {
    this.assertLoaded("playMotion");
    if (!this.capabilities.supportsMotions) {
      throw new AvatarRuntimeError("Runtime does not support motions", {
        code: "AVATAR_RUNTIME_UNSUPPORTED_OPERATION",
        runtime: this.kind,
      });
    }
    void motion;
    return OK;
  }

  async setMouthOpen(value: number): Promise<AvatarRuntimeResult> {
    this.assertLoaded("setMouthOpen");
    if (!this.capabilities.supportsMouthOpen) {
      throw new AvatarRuntimeError("Runtime does not support mouth openness", {
        code: "AVATAR_RUNTIME_UNSUPPORTED_OPERATION",
        runtime: this.kind,
      });
    }
    this.status = { ...this.status, mouthOpen: clamp01(value) };
    return OK;
  }

  async lookAt(target: LookAtTarget): Promise<AvatarRuntimeResult> {
    this.assertLoaded("lookAt");
    if (!this.capabilities.supportsLookAt) {
      throw new AvatarRuntimeError("Runtime does not support lookAt", {
        code: "AVATAR_RUNTIME_UNSUPPORTED_OPERATION",
        runtime: this.kind,
      });
    }
    void target;
    return OK;
  }

  update(deltaMs: number): void {
    void deltaMs;
  }

  async dispose(): Promise<AvatarRuntimeResult> {
    await this.unloadModel();
    return OK;
  }

  protected assertLoaded(operation: string): void {
    if (!this.status.loaded) {
      throw new AvatarRuntimeError(`Cannot ${operation}; no avatar model is loaded`, {
        code: "AVATAR_RUNTIME_NOT_LOADED",
        runtime: this.kind,
      });
    }
  }
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
