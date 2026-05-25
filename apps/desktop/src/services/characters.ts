// Character service — discovers and loads local character packs via Tauri commands.

import { invoke } from "@tauri-apps/api/core";

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
 * If no rootDir is provided, auto-detects by trying app_cwd + "/characters".
 */
export async function listCharacterPacks(
  rootDir?: string,
): Promise<CharacterPackSummary[]> {
  let root = rootDir;
  if (!root) {
    try {
      const cwd = await getAppCwd();
      root = `${cwd}/characters`;
    } catch {
      root = "./characters";
    }
  }
  const result = await invoke<{ packs: CharacterPackSummary[] }>(
    "list_character_packs",
    { rootDir: root },
  );
  return result.packs;
}

/** Load full details for a specific character pack. */
export async function loadCharacterPack(
  packDir: string,
): Promise<CharacterPackDetail> {
  return invoke<CharacterPackDetail>("load_character_pack", {
    packDir,
  });
}
