use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

static WATCHER: Mutex<Option<RecommendedWatcher>> = Mutex::new(None);

#[tauri::command]
pub fn start_watching(app: AppHandle, dir_path: String) -> Result<(), String> {
    let debounce_state = Arc::new(Mutex::new(HashMap::<String, Instant>::new()));
    let app_handle = app.clone();
    let debounce_for_closure = debounce_state.clone();

    let mut watcher = notify::recommended_watcher(move |result: Result<Event, notify::Error>| {
        let event = match result {
            Ok(event) => event,
            Err(error) => {
                eprintln!("file watcher error: {error}");
                return;
            }
        };

        if !matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) {
            return;
        }

        for path in event.paths {
            let Some(file_name) = path.file_name().and_then(|value| value.to_str()) else {
                continue;
            };

            let now = Instant::now();
            let mut debounce = match debounce_for_closure.lock() {
                Ok(lock) => lock,
                Err(_) => continue,
            };

            let should_emit = debounce
                .get(file_name)
                .map(|last_seen| now.duration_since(*last_seen) > Duration::from_millis(200))
                .unwrap_or(true);

            if should_emit {
                debounce.insert(file_name.to_string(), now);
                let _ = app_handle.emit("file-changed", file_name.to_string());
            }
        }
    })
    .map_err(|error| error.to_string())?;

    watcher
        .watch(Path::new(&dir_path), RecursiveMode::Recursive)
        .map_err(|error| error.to_string())?;

    let mut guard = WATCHER
        .lock()
        .map_err(|_| "watcher lock poisoned".to_string())?;
    *guard = Some(watcher);

    Ok(())
}

#[tauri::command]
pub fn stop_watching() -> Result<(), String> {
    let mut guard = WATCHER
        .lock()
        .map_err(|_| "watcher lock poisoned".to_string())?;
    *guard = None;
    Ok(())
}
