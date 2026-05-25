// @nais/character-schema — Public API
// -------------------------------------

// Schema types
export {
  CharacterYamlSchema,
  VoiceYamlSchema,
  PersonaSchema,
  CharacterPackSchema,
  AvatarModesSchema,
  StateMapSchema,
  StateEntrySchema,
  CharacterSourceSchema,
  Live2DConfigSchema,
  VRMConfigSchema,
  AvatarConfigSchema,
  type CharacterYaml,
  type VoiceYaml,
  type Persona,
  type CharacterPack,
  type AvatarMode,
  type CharacterSource,
} from "./schema.js";

// Loader
export {
  CharacterPackLoader,
  loadCharacterPack,
  tryLoadCharacterPack,
  listCharacterPacks,
  LoaderError,
  type LoaderOptions,
} from "./loader.js";
