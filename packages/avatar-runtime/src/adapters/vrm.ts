// VRM placeholder adapter.
// Real VRM/Three.js integration will replace renderer-specific no-ops later.

import { BaseAvatarRuntimeAdapter } from "../base.js";
import { AvatarRuntimeCapabilities, AvatarStateMap } from "../types.js";

export const VRM_CAPABILITIES: AvatarRuntimeCapabilities = {
  kind: "vrm",
  supportsExpressions: true,
  supportsMotions: true,
  supportsMouthOpen: true,
  supportsLookAt: true,
  supports3D: true,
};

export interface VRMAvatarRuntimeOptions {
  readonly stateMap?: AvatarStateMap;
}

/**
 * Placeholder adapter for VRM `.vrm` models.
 *
 * This adapter tracks state and validates contract behavior but does not render
 * yet. The real implementation will bind to Three.js + @pixiv/three-vrm.
 */
export class VRMAvatarRuntimeAdapter extends BaseAvatarRuntimeAdapter {
  constructor(options: VRMAvatarRuntimeOptions = {}) {
    super({
      kind: "vrm",
      name: "VRM Avatar Runtime",
      capabilities: VRM_CAPABILITIES,
      stateMap: options.stateMap,
    });
  }
}
