// Avatar service — wires AvatarRuntime into the NAIS desktop frontend.

import {
  createAvatarRuntime,
  type AvatarRuntimeAdapter,
  type AvatarState,
  type AvatarExpression,
  type AvatarLoadOptions,
  type AvatarModelSource,
  type AvatarRuntimeKind,
} from "@nais/avatar-runtime";

export interface AvatarService {
  readonly ready: boolean;
  load(kind: AvatarRuntimeKind, source: AvatarModelSource, opts?: AvatarLoadOptions): Promise<void>;
  setState(state: AvatarState): void;
  setExpression(expr: AvatarExpression): void;
  setMouthOpen(open: number): void;
  dispose(): void;
}

let _adapter: AvatarRuntimeAdapter | null = null;
let _ready = false;

export function createAvatarService(): AvatarService {
  return {
    get ready() { return _ready; },

    async load(kind: AvatarRuntimeKind, source: AvatarModelSource, opts?: AvatarLoadOptions): Promise<void> {
      _adapter = createAvatarRuntime({ kind });
      await _adapter.loadModel(source, opts);
      _ready = true;
    },

    setState(state: AvatarState): void {
      void _adapter?.setState(state);
    },

    setExpression(expr: AvatarExpression): void {
      void _adapter?.setExpression(expr);
    },

    setMouthOpen(open: number): void {
      void _adapter?.setMouthOpen(open);
    },

    dispose(): void {
      void _adapter?.dispose();
      _adapter = null;
      _ready = false;
    },
  };
}
