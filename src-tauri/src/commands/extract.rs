use std::fs;
use std::io::Read;
use std::path::Path;

/// Extract readable text content from a file.
/// Supports: plain text (.txt, .md, .csv, etc.), DOCX, and basic fallback.
#[tauri::command]
pub fn extract_file_text(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.is_file() {
        return Err("Path is not a file".to_string());
    }

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .unwrap_or_default();

    match extension.as_str() {
        // Plain text formats — read directly
        "txt" | "md" | "markdown" | "csv" | "tsv" | "json" | "xml" | "html" | "htm" | "css"
        | "js" | "jsx" | "ts" | "tsx" | "rs" | "py" | "go" | "yaml" | "yml" | "toml" | "ini"
        | "cfg" | "log" | "sh" | "bash" | "zsh" | "sql" | "r" | "rb" | "java" | "kt"
        | "swift" | "c" | "cpp" | "h" | "hpp" | "cs" | "php" | "lua" | "dart" | "svelte"
        | "vue" | "astro" => {
            fs::read_to_string(path).map_err(|e| format!("Failed to read text file: {e}"))
        }

        // DOCX — zip containing word/document.xml
        "docx" => extract_docx(path),

        // PDF — not yet supported without heavy dependencies
        "pdf" => Err(
            "PDF text extraction is not yet supported. \
             Please copy-paste the PDF content manually or convert to .docx first."
                .to_string(),
        ),

        _ => {
            // Try reading as UTF-8 text as a fallback
            match fs::read_to_string(path) {
                Ok(text) => Ok(text),
                Err(_) => Err(format!(
                    "Cannot extract text from .{extension} files. \
                     Try converting to .txt, .md, or .docx first."
                )),
            }
        }
    }
}

/// Extract text from a .docx file by reading word/document.xml from the zip archive.
fn extract_docx(path: &Path) -> Result<String, String> {
    let file = fs::File::open(path).map_err(|e| format!("Failed to open DOCX: {e}"))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid DOCX archive: {e}"))?;

    let mut xml_content = String::new();
    {
        let mut document = archive
            .by_name("word/document.xml")
            .map_err(|_| "DOCX does not contain word/document.xml".to_string())?;
        document
            .read_to_string(&mut xml_content)
            .map_err(|e| format!("Failed to read document.xml: {e}"))?;
    }

    // Simple XML text extraction: pull text from <w:t> tags
    let mut result = String::new();
    let mut in_paragraph = false;
    let mut paragraph_text = String::new();

    // Very basic XML parser — extract text between <w:t> and </w:t> tags
    let mut pos = 0;
    let bytes = xml_content.as_bytes();

    while pos < bytes.len() {
        // Check for paragraph start <w:p or <w:p>
        if xml_content[pos..].starts_with("<w:p") {
            if in_paragraph && !paragraph_text.trim().is_empty() {
                result.push_str(paragraph_text.trim());
                result.push('\n');
            }
            paragraph_text.clear();
            in_paragraph = true;
            // Skip to end of tag
            if let Some(end) = xml_content[pos..].find('>') {
                pos += end + 1;
            } else {
                pos += 1;
            }
            continue;
        }

        // Check for text tag <w:t> or <w:t xml:space="preserve">
        if xml_content[pos..].starts_with("<w:t") {
            // Skip to end of opening tag
            if let Some(end) = xml_content[pos..].find('>') {
                let text_start = pos + end + 1;
                // Find closing </w:t>
                if let Some(close) = xml_content[text_start..].find("</w:t>") {
                    paragraph_text.push_str(&xml_content[text_start..text_start + close]);
                    pos = text_start + close + 6; // skip past </w:t>
                    continue;
                }
            }
        }

        // Check for tab
        if xml_content[pos..].starts_with("<w:tab") {
            paragraph_text.push('\t');
        }

        // Check for break
        if xml_content[pos..].starts_with("<w:br") {
            paragraph_text.push('\n');
        }

        pos += 1;
    }

    // Flush last paragraph
    if in_paragraph && !paragraph_text.trim().is_empty() {
        result.push_str(paragraph_text.trim());
        result.push('\n');
    }

    if result.trim().is_empty() {
        return Err("No readable text found in the DOCX file.".to_string());
    }

    Ok(result)
}
