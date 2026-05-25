# Spec: Character System

## Requirement

NAIS shall support swappable character packs with persona, voice, Live2D, and/or VRM configuration.

## Scenarios

- A user can switch from one character pack to another without changing agent code.
- A character pack may include Live2D only, VRM only, or both.
- Character state mappings define how idle/listening/thinking/speaking/success/warning/error are displayed.

## Edge Cases

- Missing state mappings fall back to idle.
- Missing voice config results in text-only mode.
- Generated character packs must record source/provenance and consent metadata.
