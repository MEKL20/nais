// Tests for character pack zod schemas.

import { describe, expect, it } from "vitest";

import {
  CharacterYamlSchema,
  StateMapSchema,
  VoiceYamlSchema,
} from "./schema.js";

const baseCharacterYaml = {
  id: "valid-id",
  name: "Valid Character",
  type: "manual" as const,
  source: { kind: "local" as const, consent: true },
  avatar: {
    default_mode: "live2d" as const,
    modes: {
      live2d: { enabled: true, model: "./live2d/model.model3.json" },
      vrm: { enabled: false, model: "./vrm/model.vrm" },
    },
  },
  persona: { file: "./persona.md" },
  voice: { file: "./voice.yaml" },
  states: {
    idle: { expression: "neutral", motion: "idle" },
    listening: { expression: "focused", motion: "listen" },
    thinking: { expression: "thinking", motion: "think" },
    speaking: { expression: "neutral", motion: "speak" },
    success: { expression: "happy", motion: "nod" },
    warning: { expression: "alert", motion: "alert" },
    error: { expression: "confused", motion: "confused" },
  },
};

describe("CharacterYamlSchema", () => {
  it("accepts a fully valid manifest", () => {
    const result = CharacterYamlSchema.safeParse(baseCharacterYaml);
    expect(result.success).toBe(true);
  });

  it("rejects ids with uppercase letters", () => {
    const result = CharacterYamlSchema.safeParse({
      ...baseCharacterYaml,
      id: "Invalid-ID",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["id"]);
    }
  });

  it("rejects ids with spaces", () => {
    const result = CharacterYamlSchema.safeParse({
      ...baseCharacterYaml,
      id: "has space",
    });
    expect(result.success).toBe(false);
  });

  it("requires a non-empty name", () => {
    const result = CharacterYamlSchema.safeParse({
      ...baseCharacterYaml,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown character types", () => {
    const result = CharacterYamlSchema.safeParse({
      ...baseCharacterYaml,
      type: "auto",
    });
    expect(result.success).toBe(false);
  });

  it("requires both live2d and vrm mode entries", () => {
    const broken = {
      ...baseCharacterYaml,
      avatar: {
        default_mode: "live2d",
        modes: {
          live2d: { enabled: true, model: "./model.json" },
        },
      },
    };
    const result = CharacterYamlSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("rejects default_mode outside live2d|vrm", () => {
    const broken = {
      ...baseCharacterYaml,
      avatar: {
        ...baseCharacterYaml.avatar,
        default_mode: "spritesheet",
      },
    };
    const result = CharacterYamlSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });
});

describe("VoiceYamlSchema", () => {
  it("accepts a minimal voice config and applies defaults", () => {
    const result = VoiceYamlSchema.safeParse({
      enabled: false,
      provider: null,
      voice_id: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.speed).toBe(1.0);
      expect(result.data.pitch).toBe(0);
    }
  });

  it("clamps speed and pitch to documented ranges", () => {
    const tooFast = VoiceYamlSchema.safeParse({
      enabled: true,
      provider: null,
      voice_id: null,
      speed: 99,
    });
    expect(tooFast.success).toBe(false);

    const tooHighPitch = VoiceYamlSchema.safeParse({
      enabled: true,
      provider: null,
      voice_id: null,
      pitch: 50,
    });
    expect(tooHighPitch.success).toBe(false);
  });

  it("requires the enabled flag", () => {
    const result = VoiceYamlSchema.safeParse({
      provider: null,
      voice_id: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("StateMapSchema", () => {
  it("requires both expression and motion on each entry", () => {
    const result = StateMapSchema.safeParse({
      idle: { expression: "neutral" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts arbitrary state names", () => {
    const result = StateMapSchema.safeParse({
      custom: { expression: "x", motion: "y" },
    });
    expect(result.success).toBe(true);
  });
});
