// NAIS Avatar Runtime Types
// Shared contracts for Live2D and VRM renderer adapters.

/** Supported avatar rendering backends. */
export type AvatarRuntimeKind = "live2d" | "vrm";

/** Canonical NAIS avatar states mapped from assistant/task state. */
export type AvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "success"
  | "warning"
  | "error";

/** Common expression names. Adapters may support additional custom strings. */
export type AvatarExpression =
  | "neutral"
  | "focused"
  | "thinking"
  | "happy"
  | "alert"
  | "confused"
  | "sad"
  | "angry"
  | string;

/** Normalized two-dimensional target for gaze/look-at operations. */
export interface LookAtTarget {
  /** Normalized X coordinate in viewport space, usually 0..1. */
  readonly x: number;
  /** Normalized Y coordinate in viewport space, usually 0..1. */
  readonly y: number;
  /** Optional Z/depth coordinate for 3D runtimes. */
  readonly z?: number;
}

/** Model load source. */
export interface AvatarModelSource {
  /** Runtime that should load this model. */
  readonly kind: AvatarRuntimeKind;
  /** Absolute URL, relative URL, or local app asset path. */
  readonly path: string;
  /** Optional model display name. */
  readonly name?: string;
}

/** Optional load-time parameters. */
export interface AvatarLoadOptions {
  /** DOM element that renderer may attach to. */
  readonly container?: HTMLElement;
  /** Preferred initial expression after load. */
  readonly initialExpression?: AvatarExpression;
  /** Preferred initial state after load. */
  readonly initialState?: AvatarState;
  /** Whether adapter may prefetch dependent assets. */
  readonly allowPrefetch?: boolean;
}

/** Generic runtime result. */
export interface AvatarRuntimeResult {
  readonly ok: true;
}

/** Error raised by runtime adapters. */
export class AvatarRuntimeError extends Error {
  readonly code: string;
  readonly runtime?: AvatarRuntimeKind;

  constructor(message: string, options: AvatarRuntimeErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.code = options.code ?? "AVATAR_RUNTIME_ERROR";
    this.runtime = options.runtime;
  }

  override toString(): string {
    return `${this.name}[${this.code}]: ${this.message}`;
  }
}

export interface AvatarRuntimeErrorOptions {
  readonly code?: string;
  readonly runtime?: AvatarRuntimeKind;
  readonly cause?: unknown;
}

/** Current adapter status. */
export interface AvatarRuntimeStatus {
  readonly kind: AvatarRuntimeKind;
  readonly loaded: boolean;
  readonly model?: AvatarModelSource;
  readonly state: AvatarState;
  readonly expression?: AvatarExpression;
  /** Mouth openness, normalized 0..1. */
  readonly mouthOpen: number;
  readonly lastError?: AvatarRuntimeError;
}

/** State mapping entry loaded from character.yaml. */
export interface AvatarStateMapping {
  readonly expression: AvatarExpression;
  readonly motion: string;
}

/** Set of state mappings for a character. */
export type AvatarStateMap = Partial<Record<AvatarState, AvatarStateMapping>>;

/** Adapter capability report. */
export interface AvatarRuntimeCapabilities {
  readonly kind: AvatarRuntimeKind;
  readonly supportsExpressions: boolean;
  readonly supportsMotions: boolean;
  readonly supportsMouthOpen: boolean;
  readonly supportsLookAt: boolean;
  readonly supports3D: boolean;
}
