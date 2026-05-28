// NAIS smoke shim for browser-only dev preview.
// Tauri injects __TAURI_INTERNALS__ in desktop webviews; Vite browser smoke does not.
// This shim only activates for local dev preview when Tauri internals are absent.
(() => {
  if (globalThis.window?.__TAURI_INTERNALS__) return;

  // Resolve paths relative to dev origin so the shim works on any host (Linux,
  // Windows, CI). Vite's `server.fs.allow` lets us reach repo-relative files
  // through the `/@fs/...` mount.
  // The dev URL serves apps/desktop, so the repo root is two levels up from
  // the served files — but for /@fs/ we use *absolute* paths. We compute those
  // by reading the script's own URL on load (set when the page loaded the
  // shim from /nais-smoke-shim.js).
  const POSIX_REPO_ROOT_HINT = "/home/runner/nais"; // CI-only fallback hint
  const repoRoot = (() => {
    // The shim ships in apps/desktop/public, so its served URL is the dev
    // origin root. We can't infer the FS path from the URL, so we use a
    // hint chain: explicit env, common CI path, generic relative fallback.
    if (globalThis.window?.__NAIS_REPO_ROOT__) return globalThis.window.__NAIS_REPO_ROOT__;
    return POSIX_REPO_ROOT_HINT;
  })();

  const packRoot = `${repoRoot}/characters`;

  // Pack metadata mirrors what the Rust load_character_pack command returns.
  // Real assets are still resolved via convertFileSrc below — only structure
  // is hardcoded here.
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
        const pack = Object.values(packData).find(
          (p) => p.path === packDir || packDir.endsWith(`/${p.id}`) || packDir.endsWith(`\\${p.id}`),
        );
        if (!pack) throw new Error(`Unknown smoke pack: ${packDir}`);
        return pack;
      }
      if (cmd === "nais_ping") return "nais-tauri-ok";
      throw new Error(`Unsupported smoke invoke: ${cmd}`);
    },
    convertFileSrc(filePath) {
      // Normalize to forward slashes so /@fs/ works for both POSIX and Windows.
      const value = String(filePath).replace(/\\/g, "/");
      // Best-effort: Vite's /@fs/ mount needs an absolute path the dev server
      // is allowed to read (configured via server.fs.allow in vite.config.ts).
      if (/^[a-zA-Z]:\//.test(value)) return `/@fs/${value}`; // Windows drive
      return `/@fs${value.startsWith("/") ? "" : "/"}${value}`;
    },
  };
})();
