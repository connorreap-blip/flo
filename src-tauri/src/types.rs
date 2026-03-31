use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CardComment {
    pub id: String,
    pub text: String,
    pub timestamp: i64,
    pub author: Option<String>,
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
    pub name: String,
    pub created: String,
    pub format_version: u32,
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
