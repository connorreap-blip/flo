use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use std::cmp::Ordering;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::UNIX_EPOCH;

use crate::types::{ProjectFileEntry, ProjectFilePreview};

const MAX_TEXT_PREVIEW_CHARS: usize = 24_000;
const MAX_IMAGE_PREVIEW_BYTES: usize = 5 * 1024 * 1024;

#[tauri::command]
pub fn list_project_files(dir_path: String) -> Result<Vec<ProjectFileEntry>, String> {
    let base = Path::new(&dir_path);
    if !base.exists() {
        return Err("Selected folder does not exist".to_string());
    }

    let mut entries = Vec::new();
    collect_files(base, base, &mut entries)?;
    entries.sort_by(compare_entries);
    Ok(entries)
}

#[tauri::command]
pub fn read_project_file_preview(
    dir_path: String,
    relative_path: String,
) -> Result<ProjectFilePreview, String> {
    let base = Path::new(&dir_path);
    let resolved = resolve_relative_path(base, &relative_path)?;
    let metadata = fs::metadata(&resolved).map_err(|e| e.to_string())?;
    if !metadata.is_file() {
        return Err("Only files can be previewed".to_string());
    }

    let extension = normalized_extension(&resolved);
    let bytes = fs::read(&resolved).map_err(|e| e.to_string())?;
    let size = bytes.len() as u64;

    if is_image_extension(extension.as_deref()) {
        if bytes.len() > MAX_IMAGE_PREVIEW_BYTES {
            return Ok(ProjectFilePreview {
                relative_path,
                kind: "unsupported".to_string(),
                mime_type: mime_type_for_extension(extension.as_deref()),
                content: Some("This image is too large to preview in the app.".to_string()),
                data_url: None,
                truncated: false,
                size,
            });
        }

        let mime_type = mime_type_for_extension(extension.as_deref());
        let data_url = format!(
            "data:{};base64,{}",
            mime_type
                .clone()
                .unwrap_or_else(|| "application/octet-stream".to_string()),
            STANDARD.encode(bytes)
        );

        return Ok(ProjectFilePreview {
            relative_path,
            kind: "image".to_string(),
            mime_type,
            content: None,
            data_url: Some(data_url),
            truncated: false,
            size,
        });
    }

    if let Ok(text) = String::from_utf8(bytes) {
        let mut truncated = false;
        let preview = if text.chars().count() > MAX_TEXT_PREVIEW_CHARS {
            truncated = true;
            text.chars()
                .take(MAX_TEXT_PREVIEW_CHARS)
                .collect::<String>()
        } else {
            text
        };

        return Ok(ProjectFilePreview {
            relative_path,
            kind: "text".to_string(),
            mime_type: mime_type_for_extension(extension.as_deref()),
            content: Some(preview),
            data_url: None,
            truncated,
            size,
        });
    }

    Ok(ProjectFilePreview {
        relative_path,
        kind: "unsupported".to_string(),
        mime_type: mime_type_for_extension(extension.as_deref()),
        content: Some(
            "This file type can be opened from flo, but not previewed here yet.".to_string(),
        ),
        data_url: None,
        truncated: false,
        size,
    })
}

#[tauri::command]
pub fn import_project_files(
    dir_path: String,
    file_paths: Vec<String>,
) -> Result<Vec<ProjectFileEntry>, String> {
    let base = Path::new(&dir_path);
    if !base.exists() {
        return Err("Selected folder does not exist".to_string());
    }

    let assets_dir = base.join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    let mut imported = Vec::new();
    for raw_path in file_paths {
        let source = PathBuf::from(&raw_path);
        if !source.is_file() {
            continue;
        }

        let Some(file_name) = source.file_name().and_then(|value| value.to_str()) else {
            continue;
        };

        let destination = unique_destination(&assets_dir, file_name);
        fs::copy(&source, &destination).map_err(|e| e.to_string())?;
        imported.push(build_entry(base, &destination)?);
    }

    imported.sort_by(compare_entries);
    Ok(imported)
}

fn collect_files(
    base: &Path,
    current: &Path,
    entries: &mut Vec<ProjectFileEntry>,
) -> Result<(), String> {
    let read_dir = fs::read_dir(current).map_err(|e| e.to_string())?;
    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        if metadata.is_dir() {
            collect_files(base, &path, entries)?;
            continue;
        }

        if metadata.is_file() {
            entries.push(build_entry(base, &path)?);
        }
    }

    Ok(())
}

fn build_entry(base: &Path, path: &Path) -> Result<ProjectFileEntry, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let relative = path
        .strip_prefix(base)
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .replace('\\', "/");
    let parent = Path::new(&relative)
        .parent()
        .map(|value| value.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default();

    Ok(ProjectFileEntry {
        name: path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("Untitled")
            .to_string(),
        path: path.to_string_lossy().to_string(),
        relative_path: relative.clone(),
        parent,
        extension: normalized_extension(path),
        size: metadata.len(),
        modified_ms: metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
            .map(|value| value.as_millis() as u64),
        category: categorize_path(&relative).to_string(),
    })
}

fn compare_entries(left: &ProjectFileEntry, right: &ProjectFileEntry) -> Ordering {
    category_rank(&left.category)
        .cmp(&category_rank(&right.category))
        .then_with(|| {
            left.relative_path
                .to_lowercase()
                .cmp(&right.relative_path.to_lowercase())
        })
}

fn category_rank(category: &str) -> u8 {
    match category {
        "workspace" => 0,
        "asset" => 1,
        "internal" => 2,
        _ => 3,
    }
}

fn categorize_path(relative_path: &str) -> &'static str {
    if relative_path.starts_with("assets/") {
        "asset"
    } else if relative_path.starts_with(".flo/")
        || relative_path.starts_with("history/")
        || matches!(
            relative_path,
            "meta.json" | "cards.json" | "edges.json" | "viewport.json"
        )
    {
        "internal"
    } else {
        "workspace"
    }
}

fn normalized_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
}

fn mime_type_for_extension(extension: Option<&str>) -> Option<String> {
    let mime = match extension {
        Some("md") | Some("txt") | Some("rs") | Some("ts") | Some("tsx") | Some("js")
        | Some("jsx") | Some("json") | Some("css") | Some("html") | Some("yml") | Some("yaml")
        | Some("toml") | Some("csv") => "text/plain",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("pdf") => "application/pdf",
        _ => return None,
    };

    Some(mime.to_string())
}

fn is_image_extension(extension: Option<&str>) -> bool {
    matches!(
        extension,
        Some("png")
            | Some("jpg")
            | Some("jpeg")
            | Some("gif")
            | Some("webp")
            | Some("bmp")
            | Some("svg")
    )
}

fn resolve_relative_path(base: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let mut resolved = base.to_path_buf();
    for component in Path::new(relative_path).components() {
        match component {
            Component::Normal(part) => resolved.push(part),
            Component::CurDir => {}
            _ => return Err("Invalid path".to_string()),
        }
    }
    Ok(resolved)
}

fn unique_destination(directory: &Path, file_name: &str) -> PathBuf {
    let candidate = directory.join(file_name);
    if !candidate.exists() {
        return candidate;
    }

    let source_path = Path::new(file_name);
    let stem = source_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("imported-file");
    let extension = source_path.extension().and_then(|value| value.to_str());

    let mut counter = 2;
    loop {
        let next_name = match extension {
            Some(ext) => format!("{stem}-{counter}.{ext}"),
            None => format!("{stem}-{counter}"),
        };
        let next_path = directory.join(next_name);
        if !next_path.exists() {
            return next_path;
        }
        counter += 1;
    }
}
