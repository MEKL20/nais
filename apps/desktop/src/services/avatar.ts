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
  readonly adapter: AvatarRuntimeAdapter | null;
  load(kind: AvatarRuntimeKind, source: AvatarModelSource, opts?: AvatarLoadOptions): Promise<void>;
  unload(): Promise<void>;
  setState(state: AvatarState): void;
  setExpression(expr: AvatarExpression): void;
  setMouthOpen(open: number): void;
  lookAt(x: number, y: number): void;
  dispose(): void;
}

let _adapter: AvatarRuntimeAdapter | null = null;
let _ready = false;

export function createAvatarService(): AvatarService {
  return {
    get ready() { return _ready; },
    get adapter() { return _adapter; },

    async load(kind: AvatarRuntimeKind, source: AvatarModelSource, opts?: AvatarLoadOptions): Promise<void> {
      if (_adapter) {
        await _adapter.dispose();
      }
      _adapter = await createAvatarRuntime({ kind });
      await _adapter.loadModel(source, opts);
      _ready = true;
    },

    async unload(): Promise<void> {
      if (_adapter) {
        await _adapter.unloadModel();
      }
      _ready = false;
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

    lookAt(x: number, y: number): void {
      void _adapter?.lookAt({ x, y });
    },

    dispose(): void {
      void _adapter?.dispose();
      _adapter = null;
      _ready = false;
    },
  };
}
