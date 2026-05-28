// Avatar runtime factory helpers.

import type { AvatarRuntimeAdapter } from "./runtime.js";
import { AvatarRuntimeError, type AvatarRuntimeKind, type AvatarStateMap } from "./types.js";

export interface CreateAvatarRuntimeOptions {
  readonly kind: AvatarRuntimeKind;
  readonly stateMap?: AvatarStateMap;
  /** Optional Cubism parameter id for mouth-open lipsync (Live2D only). */
  readonly mouthParamId?: string;
}

/** Create an avatar runtime adapter for the selected backend. */
export async function createAvatarRuntime(
  options: CreateAvatarRuntimeOptions,
): Promise<AvatarRuntimeAdapter> {
  switch (options.kind) {
    case "live2d": {
      const { Live2DAvatarRuntimeAdapter } = await import("./adapters/live2d.js");
      return new Live2DAvatarRuntimeAdapter({
        stateMap: options.stateMap,
        mouthParamId: options.mouthParamId,
      });
    }
    case "vrm": {
      const { VRMAvatarRuntimeAdapter } = await import("./adapters/vrm.js");
      return new VRMAvatarRuntimeAdapter({ stateMap: options.stateMap });
    }
    default:
      throw new AvatarRuntimeError(`Unsupported avatar runtime: ${String(options.kind)}`, {
        code: "AVATAR_RUNTIME_UNSUPPORTED_KIND",
      });
  }
}
