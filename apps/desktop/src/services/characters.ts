// Character service — discovers and loads local character packs via Tauri commands.

import { invoke } from "@tauri-apps/api/core";

import type { VoiceYaml } from "@nais/character-schema";

export interface CharacterPackSummary {
  id: string;
  name: string;
  path: string;
  avatar_enabled: boolean;
}

export interface CharacterPackDetail {
  id: string;
  name: string;
  path: string;
  avatar_enabled: boolean;
  default_mode: "live2d" | "vrm";
  live2d_enabled: boolean;
  live2d_model: string | null;
  vrm_enabled: boolean;
  vrm_model: string | null;
  states: Record<string, { expression: string; motion: string }>;
  persona_preview: string;
  voice_enabled: boolean;
  voice?: VoiceYaml;
}

/** Fetch the default character packs root directory (packaged app resource path). */
export async function getDefaultCharacterRoot(): Promise<string> {
  return invoke<string>("default_character_root");
}

/** Fetch the current working directory of the running app. */
export async function getAppCwd(): Promise<string> {
  return invoke<string>("app_cwd");
}

/**
 * List all character packs under a directory.
 * If no rootDir is provided, the Rust command resolves the best runtime path:
 * packaged resources first, then repo/dev fallbacks.
 */
export async function listCharacterPacks(
  rootDir?: string,
): Promise<CharacterPackSummary[]> {
  const result = await invoke<{ packs: CharacterPackSummary[] }>(
    "list_character_packs",
    { rootDir },
  );
  return result.packs;
}

/** Convert an absolute local asset path to a URL loadable by the current runtime. */
export function characterAssetUrl(filePath: string): string {
  const tauriInternals = globalThis.window?.__TAURI_INTERNALS__;
  if (tauriInternals) return tauriInternals.convertFileSrc(filePath);

  // Browser dev preview fallback — normalize Windows backslashes to forward slashes
  // so Vite's /@fs/ prefix can serve them.
  const normalizedPath = filePath.replace(/\\/g, "/");
  return `/@fs${normalizedPath.startsWith("/") ? "" : "/"}${normalizedPath}`;
}

/** Load full details for a specific character pack. */
export async function loadCharacterPack(
  packDir: string,
): Promise<CharacterPackDetail> {
  return invoke<CharacterPackDetail>("load_character_pack", {
    packDir,
  });
}
