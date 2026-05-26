// NAIS smoke shim for browser-only dev preview.
// Tauri injects __TAURI_INTERNALS__ in desktop webviews; Vite browser smoke does not.
// This shim only activates for local dev preview when Tauri internals are absent.
(() => {
  if (globalThis.window?.__TAURI_INTERNALS__) return;

  const repoRoot = "/home/ubuntu/.openclaw/workspace/nais";
  const packRoot = `${repoRoot}/characters`;
  const packData = {
    "pixiv-vrm-sample": {
      id: "pixiv-vrm-sample",
      name: "Pixiv VRM Sample",
      path: `${packRoot}/pixiv-vrm-sample`,
      avatar_enabled: true,
      default_mode: "vrm",
      live2d_enabled: false,
      live2d_model: "./live2d/model3.json",
      vrm_enabled: true,
      vrm_model: "./vrm/VRM1_Constraint_Twist_Sample.vrm",
      states: {
        idle: { expression: "neutral", motion: "" },
        listening: { expression: "neutral", motion: "" },
        thinking: { expression: "relaxed", motion: "" },
        speaking: { expression: "happy", motion: "" },
        success: { expression: "happy", motion: "" },
        warning: { expression: "surprised", motion: "" },
        error: { expression: "sad", motion: "" },
      },
      persona_preview: "Sample VRM character pack for NAIS runtime verification.",
      voice_enabled: false,
    },
    "mao-live2d": {
      id: "mao-live2d",
      name: "Mao Live2D Sample",
      path: `${packRoot}/mao-live2d`,
      avatar_enabled: true,
      default_mode: "live2d",
      live2d_enabled: true,
      live2d_model: "./live2d/Mao.model3.json",
      vrm_enabled: false,
      vrm_model: "./avatar3d/model.vrm",
      states: {
        idle: { expression: "exp_01", motion: "Idle@0" },
        listening: { expression: "exp_02", motion: "Idle@1" },
        thinking: { expression: "exp_03", motion: "Idle@2" },
        speaking: { expression: "exp_04", motion: "TapBody@0" },
        success: { expression: "exp_05", motion: "TapBody@1" },
        warning: { expression: "exp_06", motion: "TapBody@0" },
        error: { expression: "exp_07", motion: "TapBody@1" },
      },
      persona_preview: "Sample Live2D character pack for NAIS runtime verification.",
      voice_enabled: false,
    },
  };

  // Extract ?naisSmokePack= from the URL search string (plain JS, no URLSearchParams).
  var search = globalThis.location && globalThis.location.search ? globalThis.location.search : "";
  var packMatch = /[?&]naisSmokePack=([^&]*)/.exec(search);

  globalThis.window.__NAIS_SMOKE_BYPASS_CONNECT__ = true;
  globalThis.window.__NAIS_SMOKE_PACK_ID__ = packMatch ? decodeURIComponent(packMatch[1]) : "pixiv-vrm-sample";
  globalThis.window.__TAURI_INTERNALS__ = {
    async invoke(cmd, args = {}) {
      if (cmd === "app_cwd") return repoRoot;
      if (cmd === "default_character_root") return packRoot;
      if (cmd === "list_character_packs") {
        return {
          packs: Object.values(packData).map(({ id, name, path, avatar_enabled }) => ({
            id,
            name,
            path,
            avatar_enabled,
          })),
        };
      }
      if (cmd === "load_character_pack") {
        const packDir = args.packDir || "";
        const pack = Object.values(packData).find((p) => p.path === packDir || packDir.endsWith(`/${p.id}`));
        if (!pack) throw new Error(`Unknown smoke pack: ${packDir}`);
        return pack;
      }
      if (cmd === "nais_ping") return "nais-tauri-ok";
      throw new Error(`Unsupported smoke invoke: ${cmd}`);
    },
    convertFileSrc(filePath) {
      const value = String(filePath);
      if (value.startsWith(`${repoRoot}/`)) return `/@fs/${value}`;
      return `/@fs${value.startsWith("/") ? "" : "/"}${value}`;
    },
  };
})();
