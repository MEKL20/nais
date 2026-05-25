use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize)]
pub struct CharacterPackSummary {
    pub id: String,
    pub name: String,
    pub path: String,
    pub avatar_enabled: bool,
}

#[derive(Serialize, Deserialize)]
pub struct CharacterPackDetail {
    pub id: String,
    pub name: String,
    pub path: String,
    pub avatar_enabled: bool,
    pub default_mode: String,
    pub live2d_enabled: bool,
    pub live2d_model: Option<String>,
    pub vrm_enabled: bool,
    pub vrm_model: Option<String>,
    pub states: serde_json::Value,
    pub persona_preview: String,
    pub voice_enabled: bool,
}

#[derive(Serialize, Deserialize)]
pub struct CharacterPackListResult {
    pub packs: Vec<CharacterPackSummary>,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn is_valid_pack_dir(path: &PathBuf) -> bool {
    path.is_dir()
        && !path.file_name()
            .map(|n| n.to_string_lossy().starts_with('_'))
            .unwrap_or(false)
        && fs::metadata(path.join("character.yaml")).is_ok()
}

fn read_yaml_file(path: &PathBuf) -> Result<serde_json::Value, String> {
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str::<serde_json::Value>(&raw)
        .map_err(|e| format!("invalid yaml/json: {e}"))
}

// ---------------------------------------------------------------------------
// Tauri Commands
// ---------------------------------------------------------------------------

/// Return the default character packs root directory.
#[tauri::command]
fn default_character_root(app: AppHandle) -> Result<String, String> {
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let root = resource_path.join("characters");
    Ok(root.to_string_lossy().to_string())
}

/// Return the current working directory (useful for dev where binary is not in app root).
#[tauri::command]
fn app_cwd() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// List all character packs under a root directory.
#[tauri::command]
fn list_character_packs(root_dir: Option<String>) -> Result<CharacterPackListResult, String> {
    let root: PathBuf = if let Some(r) = root_dir {
        PathBuf::from(r)
    } else {
        // Fall back to repo characters/ relative to the binary for dev
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("."))
            .join("characters")
    };

    if !root.is_dir() {
        return Ok(CharacterPackListResult { packs: vec![] });
    }

    let entries: Vec<CharacterPackSummary> = fs::read_dir(&root)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(is_valid_pack_dir)
        .filter_map(|pack_path| {
            let yaml_path = pack_path.join("character.yaml");
            let yaml = read_yaml_file(&yaml_path).ok()?;
            let id = yaml.get("id")?.as_str()?.to_string();
            let name = yaml.get("name")?.as_str()?.to_string();
            let avatar = yaml.get("avatar")?;
            let modes = avatar?.get("modes")?;
            let live2d_enabled = modes?.get("live2d")?.get("enabled")?.as_bool().unwrap_or(false);
            let vrm_enabled = modes?.get("vrm")?.get("enabled")?.as_bool().unwrap_or(false);

            Some(CharacterPackSummary {
                id,
                name,
                path: pack_path.to_string_lossy().to_string(),
                avatar_enabled: live2d_enabled || vrm_enabled,
            })
        })
        .collect();

    Ok(CharacterPackListResult { packs: entries })
}

/// Load a single character pack and return its full detail.
#[tauri::command]
fn load_character_pack(pack_dir: String) -> Result<CharacterPackDetail, String> {
    let pack_path = PathBuf::from(&pack_dir);

    if !pack_path.is_dir() {
        return Err(format!("Directory not found: {pack_dir}"));
    }

    let yaml_path = pack_path.join("character.yaml");
    let yaml = read_yaml_file(&yaml_path)?;

    let id = yaml.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
    let name = yaml.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();

    let avatar = yaml.get("avatar");
    let default_mode = avatar?
        .get("default_mode")
        .and_then(|v| v.as_str())
        .unwrap_or("live2d")
        .to_string();

    let modes = avatar?.get("modes");
    let live2d_enabled = modes?.get("live2d")?.get("enabled")?.as_bool().unwrap_or(false);
    let live2d_model = modes?.get("live2d")?.get("model")?.as_str().map(String::from);
    let vrm_enabled = modes?.get("vrm")?.get("enabled")?.as_bool().unwrap_or(false);
    let vrm_model = modes?.get("vrm")?.get("model")?.as_str().map(String::from);

    let states = yaml.get("states").cloned().unwrap_or(serde_json::Value::Null);

    // Persona preview: first 200 chars of persona.md
    let persona_file = yaml.get("persona")
        .and_then(|v| v.get("file"))
        .and_then(|v| v.as_str())
        .unwrap_or("persona.md");
    let persona_path = pack_path.join(persona_file);
    let persona_preview = fs::read_to_string(&persona_path)
        .map(|c| c.chars().take(200).collect::<String>())
        .unwrap_or_default();

    let voice = yaml.get("voice");
    let voice_enabled = voice?.get("enabled")?.as_bool().unwrap_or(false);

    Ok(CharacterPackDetail {
        id,
        name,
        path: pack_dir,
        avatar_enabled: live2d_enabled || vrm_enabled,
        default_mode,
        live2d_enabled,
        live2d_model,
        vrm_enabled,
        vrm_model,
        states,
        persona_preview,
        voice_enabled,
    })
}

// ---------------------------------------------------------------------------
// App entry
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            nais_ping,
            default_character_root,
            app_cwd,
            list_character_packs,
            load_character_pack,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NAIS desktop application");
}
