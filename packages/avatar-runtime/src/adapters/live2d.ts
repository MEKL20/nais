// Live2D adapter — implements AvatarRuntimeAdapter via pixi-live2d-display + pixi.js.

import * as PIXI from "pixi.js";
import { Live2DModel, MotionPriority, startUpCubism4 } from "pixi-live2d-display/cubism4";

import { BaseAvatarRuntimeAdapter } from "../base.js";
import {
  type AvatarExpression,
  type AvatarLoadOptions,
  type AvatarModelSource,
  type AvatarRuntimeCapabilities,
  type AvatarStateMap,
  type AvatarState,
  AvatarRuntimeError,
} from "../types.js";

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
  /**
   * Override the Cubism parameter id used for mouth-open lipsync.
   * If unset, the adapter probes the model for the first available id from
   * the standard candidates: ParamMouthOpenY, ParamMouthOpen, ParamMouthA.
   */
  readonly mouthParamId?: string;
}

const DEFAULT_MOUTH_PARAM_CANDIDATES = [
  "ParamMouthOpenY",
  "ParamMouthOpen",
  "ParamMouthA",
];

export class Live2DAvatarRuntimeAdapter extends BaseAvatarRuntimeAdapter {
  private _app: PIXI.Application | null = null;
  private _model: Live2DModel | null = null;
  private _container: HTMLElement | null = null;
  private _mouthParamOverride: string | null = null;
  private _mouthParamId: string = "ParamMouthOpenY";
  private _targetMouthOpen: number = 0;
  private _currentMouthOpen: number = 0;
  private _animationFrameId: number | null = null;
  private _lastTickMs: number = 0;

  constructor(options: Live2DAvatarRuntimeOptions = {}) {
    super({
      kind: "live2d",
      name: "Live2D Avatar Runtime",
      capabilities: LIVE2D_CAPABILITIES,
      stateMap: options.stateMap,
    });
    this._mouthParamOverride = options.mouthParamId ?? null;
  }

  override async loadModel(
    source: AvatarModelSource,
    options: AvatarLoadOptions = {},
  ): Promise<import("../types.js").AvatarRuntimeResult> {
    if (source.kind !== "live2d") {
      throw new AvatarRuntimeError(
        `Cannot load ${source.kind} model with live2d runtime`,
        { code: "AVATAR_RUNTIME_KIND_MISMATCH", runtime: "live2d" },
      );
    }

    await this.unloadModel();

    const container = options.container ?? null;
    this._container = container;

    // Create PixiJS application.
    const app = new PIXI.Application({
      width: 512,
      height: 512,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: window.devicePixelRatio ?? 1,
      autoDensity: true,
    });
    this._app = app;

    if (container) {
      container.appendChild(app.view as unknown as Node);
    }

    // Try synchronous startup first — if it succeeds, async load below will work.
    // If it fails, Live2DModel.from() will catch and report it.
    try {
      startUpCubism4({ logFunction: console.warn, loggingLevel: 1 });
    } catch {
      // Non-fatal — model.from() will handle error if core truly fails.
    }

    // Load Live2D model.
    let model: Live2DModel;
    try {
      model = await Live2DModel.from(source.path, {
        autoFocus: false,
        autoHitTest: false,
        autoUpdate: false,
      });
    } catch (err) {
      await this._destroyApp();
      throw new AvatarRuntimeError(
        `Failed to load Live2D model from "${source.path}": ${err instanceof Error ? err.message : String(err)}`,
        { code: "AVATAR_RUNTIME_LOAD_FAILED", runtime: "live2d", cause: err },
      );
    }

    this._model = model;

    model.anchor.set(0.5, 0.5);
    app.stage.addChild(model);

    const canvasW = app.screen.width;
    const canvasH = app.screen.height;
    const modelW = (model.internalModel as { originalWidth?: number } | undefined)?.originalWidth ?? 512;
    const modelH = (model.internalModel as { originalHeight?: number } | undefined)?.originalHeight ?? 512;
    const scale = Math.min(canvasW / modelW, canvasH / modelH) * 0.9;
    model.scale.set(scale);
    model.x = canvasW / 2;
    model.y = canvasH / 2;

    model.eventMode = "static";
    model.cursor = "pointer";

    this._mouthParamId = this._resolveMouthParamId(model);

    this.status = {
      ...this.status,
      loaded: true,
      state: options.initialState ?? "idle",
      expression: options.initialExpression,
      mouthOpen: 0,
    };

    this._startRenderLoop();

    return { ok: true };
  }

  override async unloadModel(): Promise<import("../types.js").AvatarRuntimeResult> {
    this._stopRenderLoop();
    if (this._model) {
      try {
        this._model.destroy();
      } catch {
        // Ignore.
      }
      this._model = null;
    }
    await this._destroyApp();
    this._container = null;
    return await super.unloadModel();
  }

  override async setState(state: AvatarState): Promise<import("../types.js").AvatarRuntimeResult> {
    this.assertLoaded("setState");
    const mapped = this.stateMap[state];
    this.status = {
      ...this.status,
      state,
      expression: mapped?.expression ?? this.status.expression,
    };
    if (mapped?.motion && this._model) {
      await this.playMotion(mapped.motion);
    }
    return { ok: true };
  }

  override async setExpression(expression: AvatarExpression): Promise<import("../types.js").AvatarRuntimeResult> {
    this.assertLoaded("setExpression");
    const model = this._model;
    if (!model) return { ok: true };
    try {
      await model.expression(String(expression));
      this.status = { ...this.status, expression };
    } catch {
      // Expression not found in model — non-fatal.
    }
    return { ok: true };
  }

  override async playMotion(motion: string): Promise<import("../types.js").AvatarRuntimeResult> {
    this.assertLoaded("playMotion");
    const model = this._model;
    if (!model) return { ok: true };
    // motion string format: "group" or "group@index"
    const atIdx = motion.indexOf("@");
    const group = atIdx >= 0 ? motion.slice(0, atIdx) : motion;
    const indexStr = atIdx >= 0 ? motion.slice(atIdx + 1) : undefined;
    const index = indexStr !== undefined ? parseInt(indexStr, 10) : undefined;
    try {
      if (index !== undefined) {
        await model.motion(group, index, MotionPriority.NORMAL);
      } else {
        await model.motion(group, undefined, MotionPriority.NORMAL);
      }
    } catch {
      // Motion not found in model — non-fatal.
    }
    return { ok: true };
  }

  override async setMouthOpen(value: number): Promise<import("../types.js").AvatarRuntimeResult> {
    this.assertLoaded("setMouthOpen");
    this._targetMouthOpen = Math.max(0, Math.min(1, value));
    this.status = { ...this.status, mouthOpen: this._targetMouthOpen };
    return { ok: true };
  }

  override async lookAt(target: import("../types.js").LookAtTarget): Promise<import("../types.js").AvatarRuntimeResult> {
    this.assertLoaded("lookAt");
    const model = this._model;
    if (!model) return { ok: true };
    try {
      model.focus(target.x, target.y);
    } catch {
      // Non-fatal.
    }
    return { ok: true };
  }

  override update(deltaMs: number): void {
    const app = this._app;
    const model = this._model;
    if (!app || !model) return;

    model.update(deltaMs);

    // Interpolate mouth open.
    if (Math.abs(this._currentMouthOpen - this._targetMouthOpen) > 0.001) {
      this._currentMouthOpen +=
        (this._targetMouthOpen - this._currentMouthOpen) *
        Math.min(1, deltaMs / 80);
      this._applyMouthOpen(this._currentMouthOpen);
    }

    app.ticker.update();
  }

  override async dispose(): Promise<import("../types.js").AvatarRuntimeResult> {
    await this.unloadModel();
    return { ok: true };
  }

  private _startRenderLoop(): void {
    this._stopRenderLoop();
    this._lastTickMs = performance.now();
    const tick = (): void => {
      this._animationFrameId = requestAnimationFrame(tick);
      const now = performance.now();
      const deltaMs = now - this._lastTickMs;
      this._lastTickMs = now;
      this.update(deltaMs);
    };
    this._animationFrameId = requestAnimationFrame(tick);
  }

  private _stopRenderLoop(): void {
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }

  /**
   * Pick the mouth-open parameter id this model exposes.
   *
   * The Cubism core model exposes parameters via either an `_parameterIds`
   * array or `getParameterCount()` + `getParameterId(i)`. Different SDK
   * builds expose different shapes, so we try multiple introspection paths
   * before falling back to the first candidate name.
   */
  private _resolveMouthParamId(model: Live2DModel): string {
    if (this._mouthParamOverride) return this._mouthParamOverride;
    const fallback = DEFAULT_MOUTH_PARAM_CANDIDATES[0] ?? "ParamMouthOpenY";

    const ids = this._collectParameterIds(model);
    if (ids.length === 0) return fallback;

    for (const candidate of DEFAULT_MOUTH_PARAM_CANDIDATES) {
      if (ids.includes(candidate)) return candidate;
    }
    return fallback;
  }

  private _collectParameterIds(model: Live2DModel): string[] {
    const internal = model.internalModel as
      | {
          coreModel?: {
            _parameterIds?: string[];
            getParameterCount?: () => number;
            getParameterId?: (_index: number) => string;
          };
        }
      | undefined;
    const core = internal?.coreModel;
    if (!core) return [];

    if (Array.isArray(core._parameterIds)) {
      return core._parameterIds;
    }

    const count = core.getParameterCount?.() ?? 0;
    if (count <= 0 || !core.getParameterId) return [];

    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      try {
        ids.push(core.getParameterId(i));
      } catch {
        // Ignore.
      }
    }
    return ids;
  }

  private _applyMouthOpen(value: number): void {
    const model = this._model;
    if (!model) return;
    try {
      const internalModel = model.internalModel as
        | { coreModel?: { setParamFloat?: (id: string, v: number) => void } }
        | undefined;
      internalModel?.coreModel?.setParamFloat?.(this._mouthParamId, value);
    } catch {
      // Ignore.
    }
  }

  private async _destroyApp(): Promise<void> {
    if (this._app) {
      try {
        this._app.destroy(true, { children: true });
      } catch {
        // Ignore.
      }
      this._app = null;
    }
  }
}
