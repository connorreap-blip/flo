use std::fs;
use std::path::Path;
use crate::types::{CanvasState, ProjectState};

#[tauri::command]
pub fn load_project(dir_path: String) -> Result<ProjectState, String> {
    let base = Path::new(&dir_path);
    let canvas_path = base.join(".flo").join("canvas.json");

    if !canvas_path.exists() {
        return Err("No .flo/canvas.json found in selected directory".to_string());
    }

    let canvas_json = fs::read_to_string(&canvas_path)
        .map_err(|e| e.to_string())?;
    let canvas: CanvasState = serde_json::from_str(&canvas_json)
        .map_err(|e| e.to_string())?;

    Ok(ProjectState {
        canvas,
        dir_path: dir_path.clone(),
    })
}
