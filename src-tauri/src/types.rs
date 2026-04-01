use serde::{Deserialize, Serialize};

fn default_format_version() -> u32 {
    2
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CardComment {
    pub id: String,
    pub text: String,
    pub timestamp: i64,
    pub author: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CardAttachment {
    pub id: String,
    pub relative_path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size: Option<u64>,
    pub added_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CardData {
    pub id: String,
    #[serde(rename = "type")]
    pub card_type: String,
    pub title: String,
    pub body: String,
    pub position: Position,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub tags: Option<Vec<String>>,
    pub collapsed: bool,
    pub has_doc: bool,
    pub doc_content: String,
    pub agent_hint: Option<String>,
    pub comments: Option<Vec<CardComment>>,
    pub attachments: Option<Vec<CardAttachment>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EdgeData {
    pub id: String,
    pub source: String,
    pub target: String,
    pub edge_type: Option<String>,
    pub source_arrow: Option<bool>,
    pub target_arrow: Option<bool>,
    pub reference_scope: Option<String>,
    pub reference_section_hint: Option<String>,
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Viewport {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CanvasState {
    pub map_name: String,
    pub viewport: Viewport,
    pub cards: Vec<CardData>,
    pub edges: Vec<EdgeData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectState {
    pub canvas: CanvasState,
    pub dir_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectMeta {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub workspace_id: Option<String>,
    pub name: String,
    #[serde(default, alias = "created", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    #[serde(default = "default_format_version")]
    pub format_version: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub goal: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavePayload {
    pub dir_path: String,
    pub meta: ProjectMeta,
    pub cards: Vec<CardData>,
    pub edges: Vec<EdgeData>,
    pub viewport: Viewport,
    pub context_md: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoadResult {
    pub dir_path: String,
    pub meta: ProjectMeta,
    pub cards: Vec<CardData>,
    pub edges: Vec<EdgeData>,
    pub viewport: Viewport,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SnapshotData {
    pub timestamp: String,
    #[serde(default)]
    pub meta: Option<ProjectMeta>,
    pub cards: Vec<CardData>,
    pub edges: Vec<EdgeData>,
    pub viewport: Viewport,
    pub summary: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SnapshotMeta {
    pub filename: String,
    pub timestamp: String,
    pub summary: String,
    pub card_count: usize,
    pub edge_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectFileEntry {
    pub name: String,
    pub path: String,
    pub relative_path: String,
    pub parent: String,
    pub extension: Option<String>,
    pub size: u64,
    pub modified_ms: Option<u64>,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectFilePreview {
    pub relative_path: String,
    pub kind: String,
    pub mime_type: Option<String>,
    pub content: Option<String>,
    pub data_url: Option<String>,
    pub truncated: bool,
    pub size: u64,
}
