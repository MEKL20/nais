# Character System Delta Spec

## Requirement: Desktop can discover local character packs

### Scenario: characters directory exists
- Given the repo contains a `characters/` directory
- When the desktop asks for available character packs
- Then it receives pack summaries for directories containing `character.yaml`
- And directories beginning with `_` or `.` are ignored

### Scenario: no character packs exist
- Given no valid character pack directories are found
- When the desktop lists character packs
- Then it returns an empty list without crashing

## Requirement: Desktop can load a selected character pack

### Scenario: valid pack selected
- Given a valid character pack directory
- When the desktop loads it
- Then it receives character metadata, persona content, voice config, avatar config, and state mappings

### Scenario: invalid pack selected
- Given an invalid or missing character pack directory
- When the desktop loads it
- Then the command returns a clear error message
