# Character Schema Blueprint

Purpose: schema, types, and validation rules for NAIS character packs.

## Character Pack Goals

A character pack should define avatar assets, persona, voice, state mappings, and metadata without changing NAIS core code.

## Draft Structure

```text
characters/<character-id>/
├── character.yaml
├── persona.md
├── voice.yaml
├── live2d/        # optional
└── avatar3d/      # optional
```

## Validation Rules

- Character id must be stable and filesystem-safe.
- At least one avatar mode must exist: Live2D or VRM.
- Persona file must be plain text/Markdown.
- Voice config may be disabled/null for text-only mode.
- State mappings should fall back to idle when missing.
