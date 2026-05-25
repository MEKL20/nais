// Avatar runtime factory helpers.

import { Live2DAvatarRuntimeAdapter } from "./adapters/live2d.js";
import { VRMAvatarRuntimeAdapter } from "./adapters/vrm.js";
import { AvatarRuntimeAdapter } from "./runtime.js";
import { AvatarRuntimeError, AvatarRuntimeKind, AvatarStateMap } from "./types.js";

export interface CreateAvatarRuntimeOptions {
  readonly kind: AvatarRuntimeKind;
  readonly stateMap?: AvatarStateMap;
}

/** Create an avatar runtime adapter for the selected backend. */
export function createAvatarRuntime(options: CreateAvatarRuntimeOptions): AvatarRuntimeAdapter {
  switch (options.kind) {
    case "live2d":
      return new Live2DAvatarRuntimeAdapter({ stateMap: options.stateMap });
    case "vrm":
      return new VRMAvatarRuntimeAdapter({ stateMap: options.stateMap });
    default:
      throw new AvatarRuntimeError(`Unsupported avatar runtime: ${String(options.kind)}`, {
        code: "AVATAR_RUNTIME_UNSUPPORTED_KIND",
      });
  }
}
