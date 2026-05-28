// Integration tests for CharacterPackLoader using a temp directory.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CharacterPackLoader,
  LoaderError,
  listCharacterPacks,
  loadCharacterPack,
  tryLoadCharacterPack,
} from "./loader.js";

const VALID_CHARACTER_YAML = `
id: 'fixture-pack'
name: 'Fixture Pack'
type: 'manual'
source:
  kind: 'local'
  consent: true
avatar:
  default_mode: 'vrm'
  modes:
    live2d:
      enabled: false
      model: './live2d/model.model3.json'
    vrm:
      enabled: true
      model: './vrm/model.vrm'
persona:
  file: './persona.md'
voice:
  file: './voice.yaml'
states:
  idle: { expression: 'neutral', motion: 'idle' }
  listening: { expression: 'focused', motion: 'listen' }
  thinking: { expression: 'thinking', motion: 'think' }
  speaking: { expression: 'neutral', motion: 'speak' }
  success: { expression: 'happy', motion: 'nod' }
  warning: { expression: 'alert', motion: 'alert' }
  error: { expression: 'confused', motion: 'confused' }
`.trimStart();

const VALID_VOICE_YAML = `
enabled: false
provider: null
voice_id: null
speed: 1.0
pitch: 0
`.trimStart();

const VALID_PERSONA_MD = "# Fixture Pack\n\nA test persona.\n";

let workspace: string;

function writePack(name: string, files: Record<string, string> = {}): string {
  const dir = join(workspace, name);
  mkdirSync(dir, { recursive: true });
  const defaultFiles: Record<string, string> = {
    "character.yaml": VALID_CHARACTER_YAML,
    "voice.yaml": VALID_VOICE_YAML,
    "persona.md": VALID_PERSONA_MD,
  };
  const merged = { ...defaultFiles, ...files };
  for (const [filename, content] of Object.entries(merged)) {
    writeFileSync(join(dir, filename), content, "utf-8");
  }
  return dir;
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "nais-loader-test-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("loadCharacterPack", () => {
  it("loads a fully valid pack", () => {
    const dir = writePack("good-pack");
    const pack = loadCharacterPack(dir);

    expect(pack.character.id).toBe("fixture-pack");
    expect(pack.character.name).toBe("Fixture Pack");
    expect(pack.persona.content).toContain("A test persona");
    expect(pack.voice.enabled).toBe(false);
  });

  it("throws LoaderError when character.yaml is missing", () => {
    const dir = writePack("missing-yaml");
    rmSync(join(dir, "character.yaml"));

    expect(() => loadCharacterPack(dir)).toThrowError(LoaderError);
  });

  it("throws LoaderError when persona.md is missing", () => {
    const dir = writePack("missing-persona");
    rmSync(join(dir, "persona.md"));

    expect(() => loadCharacterPack(dir)).toThrowError(LoaderError);
  });

  it("throws LoaderError when voice.yaml is missing", () => {
    const dir = writePack("missing-voice");
    rmSync(join(dir, "voice.yaml"));

    expect(() => loadCharacterPack(dir)).toThrowError(LoaderError);
  });

  it("throws LoaderError when character.yaml is malformed", () => {
    const dir = writePack("bad-yaml", {
      "character.yaml": "id: 'Bad ID'\nname: ''\n",
    });

    expect(() => loadCharacterPack(dir)).toThrowError(LoaderError);
  });
});

describe("tryLoadCharacterPack", () => {
  it("returns null for invalid packs instead of throwing", () => {
    const dir = writePack("bad-pack", { "character.yaml": "not yaml: : :" });
    expect(tryLoadCharacterPack(dir)).toBeNull();
  });

  it("returns the pack for valid input", () => {
    const dir = writePack("good-pack-2");
    const pack = tryLoadCharacterPack(dir);
    expect(pack).not.toBeNull();
    expect(pack?.character.id).toBe("fixture-pack");
  });
});

describe("listCharacterPacks", () => {
  it("returns paths to all directories with a character.yaml", () => {
    writePack("pack-a");
    writePack("pack-b");
    mkdirSync(join(workspace, "not-a-pack"), { recursive: true });

    const packs = listCharacterPacks(workspace);
    expect(packs.length).toBe(2);
    expect(packs.some((p) => p.endsWith("pack-a"))).toBe(true);
    expect(packs.some((p) => p.endsWith("pack-b"))).toBe(true);
  });

  it("skips directories starting with underscore or dot", () => {
    writePack("_template");
    writePack(".hidden");
    writePack("real-pack");

    const packs = listCharacterPacks(workspace);
    expect(packs.length).toBe(1);
    expect(packs[0]?.endsWith("real-pack")).toBe(true);
  });

  it("returns empty array for non-existent root", () => {
    expect(listCharacterPacks(join(workspace, "does-not-exist"))).toEqual([]);
  });
});

describe("CharacterPackLoader", () => {
  it("respects the resolvePaths flag", () => {
    const dir = writePack("absolute-paths");
    const loader = new CharacterPackLoader({ baseDir: dir, resolvePaths: true });
    expect(() => loader.load()).not.toThrow();
  });
});
