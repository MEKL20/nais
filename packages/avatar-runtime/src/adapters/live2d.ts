// Live2D placeholder adapter.
// Real Live2D Cubism integration will replace renderer-specific no-ops later.

import { BaseAvatarRuntimeAdapter } from "../base.js";
import { AvatarRuntimeCapabilities, AvatarStateMap } from "../types.js";

export const LIVE2D_CAPABILITIES: AvatarRuntimeCapabilities = {
  kind: "live2d",
  supportsExpressions: true,
  supportsMotions: true,
  supportsMouthOpen: true,
  supportsLookAt: true,
  supports3D: false,
};

export interface Live2DAvatarRuntimeOptions {
  readonly stateMap?: AvatarStateMap;
}

/**
 * Placeholder adapter for Live2D `.model3.json` models.
 *
 * This adapter tracks state and validates contract behavior but does not render
 * yet. The real implementation will bind to a Live2D Cubism runtime.
 */
export class Live2DAvatarRuntimeAdapter extends BaseAvatarRuntimeAdapter {
  constructor(options: Live2DAvatarRuntimeOptions = {}) {
    super({
      kind: "live2d",
      name: "Live2D Avatar Runtime",
      capabilities: LIVE2D_CAPABILITIES,
      stateMap: options.stateMap,
    });
  }
}
