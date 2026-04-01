mod commands;
mod types;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::save::save_project,
            commands::save::save_project_v2,
            commands::load::load_project,
            commands::load::load_project_v2,
            commands::watcher::start_watching,
            commands::watcher::stop_watching,
            commands::history::save_snapshot,
            commands::history::list_snapshots,
            commands::history::load_snapshot,
            commands::history::enforce_snapshot_retention,
            commands::files::list_project_files,
            commands::files::read_project_file_preview,
            commands::files::import_project_files,
            commands::extract::extract_file_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
