// NAIS Character Pack Schema — Zod Validation
// Validates character.yaml, voice.yaml, and persona.md

import { z } from "zod";

// ---------------------------------------------------------------------------
// Avatar models
// ---------------------------------------------------------------------------

export const Live2DConfigSchema = z.object({
  enabled: z.boolean(),
  model: z.string().min(1, "Live2D model path is required when enabled"),
});

export const VRMConfigSchema = z.object({
  enabled: z.boolean(),
  model: z.string().min(1, "VRM model path is required when enabled"),
});

export const AvatarModesSchema = z.object({
  live2d: Live2DConfigSchema,
  vrm: VRMConfigSchema,
});

export const AvatarConfigSchema = z.object({
  default_mode: z.enum(["live2d", "vrm"]),
  modes: AvatarModesSchema,
});

// ---------------------------------------------------------------------------
// State mapping
// ---------------------------------------------------------------------------

export const StateEntrySchema = z.object({
  expression: z.string().min(1),
  motion: z.string().min(1),
});

export const StateMapSchema = z.record(StateEntrySchema);

// ---------------------------------------------------------------------------
// Character source
// ---------------------------------------------------------------------------

export const CharacterSourceSchema = z.object({
  kind: z.enum(["local", "remote", "template"]),
  url: z.string().optional(),
  consent: z.boolean().optional(),
  license: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Root character.yaml schema
// ---------------------------------------------------------------------------

export const CharacterYamlSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-_]+$/, "id must be lowercase alphanumeric with dashes/underscores"),
  name: z.string().min(1),
  type: z.enum(["manual", "generated", "ai"]),
  version: z.string().optional(),
  source: CharacterSourceSchema,
  avatar: AvatarConfigSchema,
  persona: z.object({ file: z.string().min(1) }),
  voice: z.object({ file: z.string().min(1) }),
  states: StateMapSchema,
});

// ---------------------------------------------------------------------------
// Voice schema
// ---------------------------------------------------------------------------

export const VoiceYamlSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().nullable(),
  voice_id: z.string().nullable(),
  speed: z.number().min(0.1).max(10).default(1.0),
  pitch: z.number().min(-20).max(20).default(0),
  volume: z.number().min(0).max(2).default(1.0).optional(),
  style: z.string().optional(),
  language: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Persona schema (plain markdown, minimal validation)
// ---------------------------------------------------------------------------

export const PersonaSchema = z.object({
  content: z.string().min(1),
  file: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Character pack full manifest (assembled from files)
// ---------------------------------------------------------------------------

export const CharacterPackSchema = z.object({
  character: CharacterYamlSchema,
  persona: PersonaSchema,
  voice: VoiceYamlSchema,
});

// ---------------------------------------------------------------------------
// Inferred types from schemas
// ---------------------------------------------------------------------------

export type CharacterYaml = z.infer<typeof CharacterYamlSchema>;
export type VoiceYaml = z.infer<typeof VoiceYamlSchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type CharacterPack = z.infer<typeof CharacterPackSchema>;
export type AvatarMode = "live2d" | "vrm";
export type CharacterSource = CharacterYaml["source"];
