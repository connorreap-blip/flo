use crate::types::{SnapshotData, SnapshotMeta};
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn save_snapshot(dir_path: String, snapshot: SnapshotData) -> Result<String, String> {
    let history_dir = Path::new(&dir_path).join("history");
    fs::create_dir_all(&history_dir).map_err(|e| e.to_string())?;

    // Filename from timestamp: replace colons for filesystem safety
    let filename = format!("{}.json", snapshot.timestamp.replace(':', "-"));
    let filepath = history_dir.join(&filename);

    let json = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
    fs::write(&filepath, json).map_err(|e| e.to_string())?;

    Ok(filename)
}

#[tauri::command]
pub fn list_snapshots(dir_path: String) -> Result<Vec<SnapshotMeta>, String> {
    let history_dir = Path::new(&dir_path).join("history");
    if !history_dir.exists() {
        return Ok(vec![]);
    }

    let mut snapshots: Vec<SnapshotMeta> = Vec::new();

    for entry in fs::read_dir(&history_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }

        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let data: SnapshotData = match serde_json::from_str(&content) {
            Ok(d) => d,
            Err(_) => continue, // skip malformed files
        };

        let filename = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        snapshots.push(SnapshotMeta {
            filename,
            timestamp: data.timestamp,
            summary: data.summary,
            card_count: data.cards.len(),
            edge_count: data.edges.len(),
        });
    }

    // Sort newest first
    snapshots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    Ok(snapshots)
}

#[tauri::command]
pub fn load_snapshot(dir_path: String, filename: String) -> Result<SnapshotData, String> {
    let filepath = Path::new(&dir_path).join("history").join(&filename);

    if !filepath.exists() {
        return Err(format!("Snapshot not found: {}", filename));
    }

    let content = fs::read_to_string(&filepath).map_err(|e| e.to_string())?;
    let data: SnapshotData = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(data)
}
