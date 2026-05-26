use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

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
    pub voice: serde_json::Value,
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
    serde_yaml::from_str::<serde_json::Value>(&raw).map_err(|e| format!("invalid yaml: {e}"))
}

fn repo_character_root_from_cwd() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    if cwd.ends_with(Path::new("apps/desktop")) {
        Some(cwd.join("../../characters"))
    } else {
        Some(cwd.join("characters"))
    }
}

fn candidate_character_roots(app: Option<&AppHandle>, requested: Option<String>) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Some(root) = requested.filter(|value| !value.trim().is_empty()) {
        roots.push(PathBuf::from(root));
    }

    if let Some(app) = app {
        if let Ok(resource_dir) = app.path().resource_dir() {
            roots.push(resource_dir.join("characters"));
        }
    }

    if let Some(repo_root) = repo_character_root_from_cwd() {
        roots.push(repo_root);
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            roots.push(exe_dir.join("characters"));
        }
    }

    roots.push(PathBuf::from("characters"));
    roots
}

fn resolve_character_root(app: Option<&AppHandle>, requested: Option<String>) -> PathBuf {
    candidate_character_roots(app, requested)
        .into_iter()
        .find(|root| root.is_dir())
        .unwrap_or_else(|| PathBuf::from("characters"))
}

// ---------------------------------------------------------------------------
// Tauri Commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn nais_ping() -> &'static str {
    "nais-tauri-ok"
}

/// Return the default character packs root directory.
#[tauri::command]
fn default_character_root(app: AppHandle) -> Result<String, String> {
    let root = resolve_character_root(Some(&app), None);
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
fn list_character_packs(
    app: AppHandle,
    root_dir: Option<String>,
) -> Result<CharacterPackListResult, String> {
    let root = resolve_character_root(Some(&app), root_dir);

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
            let modes = yaml.get("avatar")?.get("modes")?;
            let live2d_enabled = modes
                .get("live2d")
                .and_then(|v| v.get("enabled"))
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let vrm_enabled = modes
                .get("vrm")
                .and_then(|v| v.get("enabled"))
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

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
    let default_mode = avatar
        .and_then(|v| v.get("default_mode"))
        .and_then(|v| v.as_str())
        .unwrap_or("live2d")
        .to_string();

    let modes = avatar.and_then(|v| v.get("modes"));
    let live2d = modes.and_then(|v| v.get("live2d"));
    let vrm = modes.and_then(|v| v.get("vrm"));
    let live2d_enabled = live2d
        .and_then(|v| v.get("enabled"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let live2d_model = live2d
        .and_then(|v| v.get("model"))
        .and_then(|v| v.as_str())
        .map(String::from);
    let vrm_enabled = vrm
        .and_then(|v| v.get("enabled"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let vrm_model = vrm
        .and_then(|v| v.get("model"))
        .and_then(|v| v.as_str())
        .map(String::from);

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

    let voice_file = yaml.get("voice")
        .and_then(|v| v.get("file"))
        .and_then(|v| v.as_str())
        .unwrap_or("voice.yaml");
    let voice_path = pack_path.join(voice_file);
    let voice = read_yaml_file(&voice_path).unwrap_or_else(|_| serde_json::json!({
        "enabled": false,
        "provider": null,
        "voice_id": null,
        "speed": 1.0,
        "pitch": 0,
        "volume": 1.0,
        "style": "",
        "language": "en"
    }));
    let voice_enabled = voice
        .get("enabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

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
        voice,
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
