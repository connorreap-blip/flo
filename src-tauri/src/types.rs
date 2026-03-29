use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CardData {
    pub id: String,
    #[serde(rename = "type")]
    pub card_type: String,
    pub title: String,
    pub body: String,
    pub position: Position,
    pub collapsed: bool,
    pub has_doc: bool,
    pub doc_content: String,
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
