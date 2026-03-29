use std::fs;
use std::path::Path;
use crate::types::{ProjectState, CardData};

#[tauri::command]
pub fn save_project(state: ProjectState) -> Result<(), String> {
    let base = Path::new(&state.dir_path);

    // Create directory structure
    let flo_dir = base.join(".flo");
    fs::create_dir_all(&flo_dir).map_err(|e| e.to_string())?;

    // Write canvas.json
    let canvas_json = serde_json::to_string_pretty(&state.canvas)
        .map_err(|e| e.to_string())?;
    fs::write(flo_dir.join("canvas.json"), canvas_json)
        .map_err(|e| e.to_string())?;

    // Write markdown files for cards with docs
    for card in &state.canvas.cards {
        if card.has_doc && !card.doc_content.is_empty() {
            write_card_markdown(base, card)?;
        }
    }

    Ok(())
}

fn write_card_markdown(base: &Path, card: &CardData) -> Result<(), String> {
    let subfolder = match card.card_type.as_str() {
        "project" => "projects",
        "process" => "processes",
        "reference" => "references",
        "brainstorm" => "brainstorms",
        _ => "processes",
    };

    let dir = base.join(subfolder);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let filename = slugify(&card.title) + ".md";
    let filepath = dir.join(&filename);

    fs::write(&filepath, &card.doc_content).map_err(|e| e.to_string())?;

    Ok(())
}

fn slugify(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}
