// NAIS Character Pack Loader
// Loads, parses, and validates a character pack from a directory.

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, isAbsolute } from "path";

import { parse as parseYaml } from "yaml";
import {
  CharacterYamlSchema,
  VoiceYamlSchema,
  CharacterPackSchema,
  CharacterYaml,
  VoiceYaml,
  Persona,
  CharacterPack,
} from "./schema.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function assertFileExists(path: string, label: string): void {
  try {
    statSync(path);
  } catch {
    throw new LoaderError(`${label} not found at: ${path}`);
  }
}

// ---------------------------------------------------------------------------
// LoaderError
// ---------------------------------------------------------------------------

export class LoaderError extends Error {
  readonly code = "LOADER_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "LoaderError";
  }
}

// ---------------------------------------------------------------------------
// CharacterPackLoader
// ---------------------------------------------------------------------------

export interface LoaderOptions {
  /** Base directory of the character pack. */
  baseDir: string;
  /** If true, paths in character.yaml are resolved relative to baseDir. */
  resolvePaths?: boolean;
}

/**
 * Loads and validates a complete character pack from a directory.
 *
 * Expected structure:
 *   <baseDir>/
 *     character.yaml
 *     persona.md
 *     voice.yaml
 *
 * @throws LoaderError if files are missing or validation fails
 */
export class CharacterPackLoader {
  private readonly baseDir: string;
  private readonly resolvePaths: boolean;

  constructor(options: LoaderOptions) {
    this.baseDir = resolve(options.baseDir);
    this.resolvePaths = options.resolvePaths ?? true;
  }

  /**
   * Load the complete character pack.
   * Throws `LoaderError` on any failure.
   */
  load(): CharacterPack {
    const character = this.loadCharacterYaml();
    const persona = this.loadPersona(character);
    const voice = this.loadVoiceYaml(character);

    const result = CharacterPackSchema.safeParse({ character, persona, voice });
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new LoaderError(
        `Character pack validation failed for "${this.baseDir}":\n${issues}`
      );
    }

    return result.data;
  }

  /**
   * Like `load()` but returns null instead of throwing.
   */
  tryLoad(): CharacterPack | null {
    try {
      return this.load();
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------

  private loadCharacterYaml(): CharacterYaml {
    const path = join(this.baseDir, "character.yaml");
    assertFileExists(path, "character.yaml");

    const raw = readFileSync(path, "utf-8");
    const parsed = parseYaml(raw);
    const result = CharacterYamlSchema.safeParse(parsed);

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new LoaderError(
        `character.yaml validation failed:\n${issues}`
      );
    }

    return result.data;
  }

  private loadPersona(character: CharacterYaml): Persona {
    const file = character.persona.file;
    const path = this.resolvePath(file, "persona file");
    assertFileExists(path, `persona file "${file}"`);

    return {
      content: readFileSync(path, "utf-8"),
      file,
    };
  }

  private loadVoiceYaml(character: CharacterYaml): VoiceYaml {
    const file = character.voice.file;
    const path = this.resolvePath(file, "voice file");
    assertFileExists(path, `voice file "${file}"`);

    const raw = readFileSync(path, "utf-8");
    const parsed = parseYaml(raw);
    const result = VoiceYamlSchema.safeParse(parsed);

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new LoaderError(`voice.yaml validation failed:\n${issues}`);
    }

    return result.data;
  }

  private resolvePath(relativePath: string, _label: string): string {
    if (!this.resolvePaths) return relativePath;
    if (isAbsolute(relativePath)) return relativePath;
    return resolve(this.baseDir, relativePath);
  }
}

// ---------------------------------------------------------------------------
// Utility loaders (stateless)
// ---------------------------------------------------------------------------

/**
 * Load a single character pack from a directory.
 * Throws LoaderError.
 */
export function loadCharacterPack(dir: string): CharacterPack {
  return new CharacterPackLoader({ baseDir: dir }).load();
}

/**
 * Try loading; returns null on failure instead of throwing.
 */
export function tryLoadCharacterPack(dir: string): CharacterPack | null {
  return new CharacterPackLoader({ baseDir: dir }).tryLoad();
}

/**
 * List all character pack directories under a root directory.
 * Returns paths that contain a valid character.yaml.
 */
export function listCharacterPacks(rootDir: string): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(rootDir);
  } catch {
    return [];
  }

  return entries
    .map((name) => ({ name, path: join(rootDir, name) }))
    .filter(({ name, path }) => {
      if (name.startsWith("_") || name.startsWith(".")) return false;
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    })
    .filter(({ path }) => {
      try {
        statSync(join(path, "character.yaml"));
        return true;
      } catch {
        return false;
      }
    })
    .map(({ path }) => path);
}
