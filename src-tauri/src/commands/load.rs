use serde::Serialize;
use std::fs;
use std::path::Path;

use crate::types::{CanvasState, CardData, EdgeData, LoadResult, ProjectMeta, Viewport};

#[tauri::command]
pub fn load_project(dir_path: String) -> Result<LegacyProjectState, String> {
    let loaded = load_project_data(dir_path)?;
    Ok(LegacyProjectState::from(loaded))
}

#[tauri::command]
pub fn load_project_v2(dir_path: String) -> Result<LoadResult, String> {
    load_project_data(dir_path)
}

fn load_project_data(dir_path: String) -> Result<LoadResult, String> {
    let base = Path::new(&dir_path);

    let meta_path = base.join("meta.json");
    if meta_path.exists() {
        let mut meta: ProjectMeta =
            serde_json::from_str(&fs::read_to_string(&meta_path).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
        normalize_project_meta(&mut meta);

        let cards: Vec<CardData> = serde_json::from_str(
            &fs::read_to_string(base.join("cards.json")).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;

        let edges: Vec<EdgeData> = serde_json::from_str(
            &fs::read_to_string(base.join("edges.json")).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;

        let viewport: Viewport = serde_json::from_str(
            &fs::read_to_string(base.join("viewport.json")).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;

        return Ok(LoadResult {
            dir_path,
            meta,
            cards,
            edges,
            viewport,
        });
    }

    let canvas_path = base.join(".flo").join("canvas.json");
    if canvas_path.exists() {
        let canvas: CanvasState =
            serde_json::from_str(&fs::read_to_string(&canvas_path).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;

        let meta = ProjectMeta {
            workspace_id: None,
            name: canvas.map_name,
            created_at: None,
            updated_at: None,
            format_version: 1,
            goal: None,
        };

        return Ok(LoadResult {
            dir_path,
            meta,
            cards: canvas.cards,
            edges: canvas.edges,
            viewport: canvas.viewport,
        });
    }

    Err("No flo project found in selected directory".to_string())
}

fn normalize_project_meta(meta: &mut ProjectMeta) {
    if meta.created_at.is_none() {
        meta.created_at = meta.updated_at.clone();
    }

    if meta.updated_at.is_none() {
        meta.updated_at = meta.created_at.clone();
    }
}

#[derive(Debug, Serialize)]
pub struct LegacyProjectState {
    pub canvas: LegacyCanvasState,
    pub dir_path: String,
}

#[derive(Debug, Serialize)]
pub struct LegacyCanvasState {
    pub map_name: String,
    pub viewport: Viewport,
    pub cards: Vec<CardData>,
    pub edges: Vec<LegacyEdgeData>,
}

#[derive(Debug, Serialize)]
pub struct LegacyEdgeData {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(rename = "edgeType", skip_serializing_if = "Option::is_none")]
    pub edge_type: Option<String>,
    #[serde(rename = "sourceArrow", skip_serializing_if = "Option::is_none")]
    pub source_arrow: Option<bool>,
    #[serde(rename = "targetArrow", skip_serializing_if = "Option::is_none")]
    pub target_arrow: Option<bool>,
    #[serde(rename = "referenceScope", skip_serializing_if = "Option::is_none")]
    pub reference_scope: Option<String>,
    #[serde(
        rename = "referenceSectionHint",
        skip_serializing_if = "Option::is_none"
    )]
    pub reference_section_hint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

impl From<LoadResult> for LegacyProjectState {
    fn from(value: LoadResult) -> Self {
        Self {
            canvas: LegacyCanvasState {
                map_name: value.meta.name,
                viewport: value.viewport,
                cards: value.cards,
                edges: value.edges.into_iter().map(LegacyEdgeData::from).collect(),
            },
            dir_path: value.dir_path,
        }
    }
}

impl From<EdgeData> for LegacyEdgeData {
    fn from(value: EdgeData) -> Self {
        Self {
            id: value.id,
            source: value.source,
            target: value.target,
            edge_type: value.edge_type,
            source_arrow: value.source_arrow,
            target_arrow: value.target_arrow,
            reference_scope: value.reference_scope,
            reference_section_hint: value.reference_section_hint,
            label: value.label,
        }
    }
}
