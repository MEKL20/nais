// @nais/avatar-runtime — Public API

export { BaseAvatarRuntimeAdapter, type BaseAvatarRuntimeOptions } from "./base.js";
export { createAvatarRuntime, type CreateAvatarRuntimeOptions } from "./factory.js";
export { OK, type AvatarRuntimeAdapter } from "./runtime.js";
export {
  AvatarRuntimeError,
  type AvatarExpression,
  type AvatarLoadOptions,
  type AvatarModelSource,
  type AvatarRuntimeCapabilities,
  type AvatarRuntimeErrorOptions,
  type AvatarRuntimeKind,
  type AvatarRuntimeResult,
  type AvatarRuntimeStatus,
  type AvatarState,
  type AvatarStateMap,
  type AvatarStateMapping,
  type LookAtTarget,
} from "./types.js";
export type { Live2DAvatarRuntimeOptions } from "./adapters/live2d.js";
export type { VRMAvatarRuntimeOptions } from "./adapters/vrm.js";
