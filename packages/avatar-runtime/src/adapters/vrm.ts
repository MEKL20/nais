// VRM adapter — implements AvatarRuntimeAdapter via three.js + @pixiv/three-vrm.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";

import type { VRM } from "@pixiv/three-vrm";
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

export class VRMAvatarRuntimeAdapter extends BaseAvatarRuntimeAdapter {
  private _renderer: THREE.WebGLRenderer | null = null;
  private _scene: THREE.Scene | null = null;
  private _camera: THREE.PerspectiveCamera | null = null;
  private _vrm: VRM | null = null;
  private _container: HTMLElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _animationFrameId: number | null = null;
  private _targetMouthOpen: number = 0;
  private _currentMouthOpen: number = 0;

  constructor(options: VRMAvatarRuntimeOptions = {}) {
    super({
      kind: "vrm",
      name: "VRM Avatar Runtime",
      capabilities: VRM_CAPABILITIES,
      stateMap: options.stateMap,
    });
  }

  override async loadModel(
    source: AvatarModelSource,
    options: AvatarLoadOptions = {},
  ): Promise<import("../types.js").AvatarRuntimeResult> {
    if (source.kind !== "vrm") {
      throw new AvatarRuntimeError(
        `Cannot load ${source.kind} model with vrm runtime`,
        { code: "AVATAR_RUNTIME_KIND_MISMATCH", runtime: "vrm" },
      );
    }

    await this.unloadModel();

    const container = options.container ?? null;
    this._container = container;

    // WebGL support check.
    const testCanvas = document.createElement("canvas");
    const gl =
      testCanvas.getContext("webgl2") ??
      testCanvas.getContext("webgl") ??
      null;
    if (!gl) {
      throw new AvatarRuntimeError(
        "WebGL is not supported in this environment",
        { code: "AVATAR_RUNTIME_NO_WEBGL", runtime: "vrm" },
      );
    }

    // Create renderer.
    const renderer = new THREE.WebGLRenderer({
      canvas: testCanvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio ?? 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    this._renderer = renderer;

    // Scene + camera.
    const scene = new THREE.Scene();
    this._scene = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.4, 2.5);
    camera.lookAt(0, 1, 0);
    this._camera = camera;

    // Basic lighting.
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(0, 2, 2);
    scene.add(dirLight);

    // Load VRM using GLTFLoader + VRMLoaderPlugin.
    const gltfLoader = new GLTFLoader();
    gltfLoader.register((parser) => new VRMLoaderPlugin(parser));

    const localScene = scene;

    let loadError: Error | null = null;
    let loadResult: VRM | null = null;

    try {
      loadResult = await new Promise<VRM>((resolve, reject) => {
        gltfLoader.load(
          source.path,
          (gltf) => {
            const vrm = gltf.userData["vrm"] as VRM | undefined;
            if (!vrm) {
              reject(new Error("VRM not found in GLTF userData"));
              return;
            }
            localScene.add(vrm.scene);
            resolve(vrm);
          },
          (progress) => {
            void progress;
          },
          (err) => {
            reject(err instanceof Error ? err : new Error(String(err)));
          },
        );
      });
    } catch (err) {
      loadError = err instanceof Error ? err : new Error(String(err));
    }

    if (!loadResult) {
      throw new AvatarRuntimeError(
        `Failed to load VRM from "${source.path}": ${loadError?.message ?? "unknown error"}`,
        { code: "AVATAR_RUNTIME_LOAD_FAILED", runtime: "vrm", cause: loadError },
      );
    }

    const loadedVrm = loadResult;
    this._vrm = loadedVrm;

    // Configure VRM meshes.
    (loadedVrm as unknown as { scene: THREE.Object3D }).scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        (obj as THREE.Mesh).castShadow = false;
      }
    });

    // Replace renderer canvas with a properly sized one.
    const canvas = renderer.domElement;
    this._canvas = canvas;
    if (container) {
      const w = container.clientWidth || 512;
      const h = container.clientHeight || 512;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      container.appendChild(canvas);
    } else {
      renderer.setSize(512, 512);
    }

    // Start render loop.
    this._startRenderLoop();

    this.status = {
      ...this.status,
      loaded: true,
      model: source,
      state: options.initialState ?? "idle",
      expression: options.initialExpression,
      mouthOpen: 0,
    };

    return { ok: true };
  }

  override async unloadModel(): Promise<import("../types.js").AvatarRuntimeResult> {
    this._stopRenderLoop();

    if (this._vrm) {
      try {
        (this._vrm as unknown as { dispose(): void }).dispose();
      } catch {
        // Ignore.
      }
      this._vrm = null;
    }

    if (this._scene) {
      this._scene.clear();
    }

    if (this._canvas && this._container) {
      try {
        this._container.removeChild(this._canvas);
      } catch {
        // Ignore.
      }
      this._canvas = null;
    }

    if (this._renderer) {
      try {
        this._renderer.dispose();
      } catch {
        // Ignore.
      }
      this._renderer = null;
    }

    this._scene = null;
    this._camera = null;
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
    if (mapped?.motion && this._vrm) {
      await this.playMotion(mapped.motion);
    }
    return { ok: true };
  }

  override async setExpression(expression: AvatarExpression): Promise<import("../types.js").AvatarRuntimeResult> {
    this.assertLoaded("setExpression");
    const vrm = this._vrm;
    if (!vrm?.expressionManager) return { ok: true };

    const name = String(expression);
    const exprMgr = vrm.expressionManager;

    try {
      exprMgr.setValue(name, 1.0);
    } catch {
      // Fallback to preset name mapping.
      const presetMap: Record<string, string> = {
        neutral: "neutral",
        happy: "happy",
        angry: "angry",
        sad: "sad",
        surprised: "surprised",
        relaxed: "relaxed",
        frustrated: "frustrated",
      };
      const mapped = presetMap[name] ?? name;
      try {
        exprMgr.setValue(mapped, 1.0);
      } catch {
        // Expression not available — non-fatal.
      }
    }

    this.status = { ...this.status, expression };
    return { ok: true };
  }

  override async playMotion(_motion: string): Promise<import("../types.js").AvatarRuntimeResult> {
    this.assertLoaded("playMotion");
    // Motion playback requires VRM animation clips (VRM 1.0).
    // Stub — real impl needs a motion-file loading pipeline.
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
    const vrm = this._vrm;
    if (!vrm?.lookAt) return { ok: true };

    const lookAt = vrm.lookAt;
    if (!lookAt) return { ok: true };
    const vec = new THREE.Vector3(
      (target.x - 0.5) * 2,
      -(target.y - 0.5) * 2,
      target.z ?? 1,
    );
    try {
      lookAt.lookAt(vec);
    } catch {
      // Non-fatal.
    }
    return { ok: true };
  }

  override update(deltaMs: number): void {
    const renderer = this._renderer;
    const scene = this._scene;
    const camera = this._camera;
    const vrm = this._vrm;
    if (!renderer || !scene || !camera) return;

    const deltaSec = deltaMs / 1000;

    if (vrm) {
      vrm.update(deltaSec);

      // Interpolate mouth open.
      if (Math.abs(this._currentMouthOpen - this._targetMouthOpen) > 0.001) {
        this._currentMouthOpen +=
          (this._targetMouthOpen - this._currentMouthOpen) *
          Math.min(1, deltaMs / 80);
        this._applyMouthOpen(this._currentMouthOpen);
      }
    }

    renderer.render(scene, camera);
  }

  override async dispose(): Promise<import("../types.js").AvatarRuntimeResult> {
    await this.unloadModel();
    return { ok: true };
  }

  private _applyMouthOpen(value: number): void {
    const vrm = this._vrm;
    if (!vrm?.expressionManager) return;
    try {
      vrm.expressionManager.setValue("mouthOpen", value);
    } catch {
      try {
        vrm.expressionManager.setValue("mouth", value);
      } catch {
        // Neither available — non-fatal.
      }
    }
  }

  private _startRenderLoop(): void {
    let lastTime = performance.now();

    const tick = (): void => {
      this._animationFrameId = requestAnimationFrame(tick);
      const now = performance.now();
      const deltaMs = now - lastTime;
      lastTime = now;
      this.update(deltaMs);
    };

    tick();
  }

  private _stopRenderLoop(): void {
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }
}
