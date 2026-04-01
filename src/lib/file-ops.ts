import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { CardType } from "./constants";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";
import { serializeCardToMarkdown, deserializeMarkdown } from "./markdown";
import { generateContextMd } from "./export-context";
import type { CardComment, EdgeType, ProjectMeta, ReferenceScope } from "./types";

export interface LoadedProjectPayload {
  dir_path: string;
  meta: {
    name: string;
    workspace_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    format_version: number;
    goal?: string | null;
  };
  cards: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    position: { x: number; y: number };
    width?: number | null;
    height?: number | null;
    tags?: string[] | null;
    collapsed: boolean;
    has_doc: boolean;
    doc_content: string;
    agent_hint?: string | null;
    comments?: CardComment[] | null;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    edge_type?: string;
    source_arrow?: boolean;
    target_arrow?: boolean;
    reference_scope?: string;
    reference_section_hint?: string;
    label?: string;
  }>;
  viewport: { x: number; y: number; zoom: number };
}

function getDefaultWorkspacePath(projectName: string, dirPath: string | null): string {
  return dirPath ?? `${projectName}.flo`;
}

async function chooseWorkspacePath(projectName: string, dirPath: string | null): Promise<string | null> {
  const selected = await save({
    title: "Save flo Workspace",
    defaultPath: getDefaultWorkspacePath(projectName, dirPath),
  });

  return typeof selected === "string" ? selected : null;
}

function buildProjectMeta(project: ProjectMeta, savedAt: string): LoadedProjectPayload["meta"] {
  return {
    name: project.name,
    workspace_id: project.workspaceId ?? crypto.randomUUID(),
    created_at: project.createdAt ?? project.updatedAt ?? savedAt,
    updated_at: savedAt,
    format_version: 3,
    goal: project.goal ?? null,
  };
}

async function saveProjectInternal(forcePrompt: boolean): Promise<void> {
  const canvasStore = useCanvasStore.getState();
  const projectStore = useProjectStore.getState();
  const dirPath =
    forcePrompt || !projectStore.project.dirPath
      ? await chooseWorkspacePath(projectStore.project.name, projectStore.project.dirPath)
      : projectStore.project.dirPath;
  if (!dirPath) return;

  const savedAt = new Date().toISOString();
  const meta = buildProjectMeta(projectStore.project, savedAt);
  const nextProject: ProjectMeta = {
    ...projectStore.project,
    dirPath,
    workspaceId: meta.workspace_id ?? undefined,
    createdAt: meta.created_at ?? undefined,
    updatedAt: meta.updated_at ?? undefined,
  };

  const cardsForSave = canvasStore.cards.map((card) => ({
    id: card.id,
    type: card.type,
    title: card.title,
    body: card.body,
    position: card.position,
    width: card.width ?? null,
    height: card.height ?? null,
    tags: Array.isArray(card.tags) ? card.tags : null,
    collapsed: card.collapsed,
    has_doc: card.hasDoc,
    doc_content: card.hasDoc ? serializeCardToMarkdown(card) : "",
    agent_hint: card.agentHint ?? null,
    comments: Array.isArray(card.comments) ? card.comments : null,
  }));

  const edgesForSave = canvasStore.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    edge_type: edge.edgeType,
    source_arrow: edge.sourceArrow,
    target_arrow: edge.targetArrow,
    reference_scope: edge.referenceScope,
    reference_section_hint: edge.referenceSectionHint,
    label: edge.label,
  }));

  const contextMd = generateContextMd(
    projectStore.project.name,
    canvasStore.cards,
    canvasStore.edges,
    projectStore.project.goal,
    {
      agentHintExportMode: canvasStore.agentHintExportMode,
      includeAgentHints: canvasStore.exportIncludeAgentHints,
      includeBrainstorm: canvasStore.exportIncludeBrainstorm,
      includeCardDocs: canvasStore.exportIncludeCardDocs,
      excludedTags: canvasStore.excludedTags,
      goalOverride: canvasStore.exportGoalOverride,
    }
  );

  const payload = {
    dir_path: dirPath,
    meta,
    cards: cardsForSave,
    edges: edgesForSave,
    viewport: canvasStore.viewport,
    context_md: contextMd,
  };

  await invoke("save_project_v2", { state: payload });
  projectStore.setProject(nextProject);
  projectStore.addRecentProject(nextProject.name, dirPath);

  // Auto-snapshot after save
  if (canvasStore.autoSnapshot) {
    try {
      const prevSnapshots = await invoke<
        Array<{ filename: string; timestamp: string; summary: string; card_count: number; edge_count: number }>
      >("list_snapshots", { dirPath });

      let summary = `${payload.cards.length} cards, ${payload.edges.length} edges`;
      if (prevSnapshots.length > 0) {
        const prev = await invoke<{
          cards: Array<{ id: string }>;
          edges: Array<{ id: string }>;
        }>("load_snapshot", { dirPath, filename: prevSnapshots[0].filename });

        const prevCardIds = new Set(prev.cards.map((c) => c.id));
        const currCardIds = new Set(payload.cards.map((c) => c.id));
        const added = payload.cards.filter((c) => !prevCardIds.has(c.id)).length;
        const removed = prev.cards.filter((c) => !currCardIds.has(c.id)).length;
        const parts: string[] = [];
        if (added > 0) parts.push(`+${added} card${added > 1 ? "s" : ""}`);
        if (removed > 0) parts.push(`-${removed} card${removed > 1 ? "s" : ""}`);
        const modified = payload.cards.filter((c) => prevCardIds.has(c.id)).length;
        if (modified > 0 && added === 0 && removed === 0) parts.push(`${modified} cards unchanged`);
        if (parts.length > 0) summary = parts.join(", ");
      }

      await invoke("save_snapshot", {
        dirPath,
        snapshot: {
          timestamp: savedAt,
          meta: payload.meta,
          cards: payload.cards,
          edges: payload.edges,
          viewport: payload.viewport,
          summary,
        },
      });
    } catch {
      // Snapshot failure should not block save
    }
  }

  canvasStore.markClean();
  window.dispatchEvent(
    new CustomEvent("flo:project-saved", {
      detail: {
        dirPath,
        files: ["meta.json", "cards.json", "edges.json", "viewport.json", "context.md"],
      },
    })
  );
}

export async function saveProject(): Promise<void> {
  await saveProjectInternal(false);
}

export async function saveProjectAs(): Promise<void> {
  await saveProjectInternal(true);
}

export async function loadProject(): Promise<void> {
  const selected = await open({
    title: "Open flo Workspace Folder",
    directory: true,
  });
  if (!selected) return;

  const result = await invoke<LoadedProjectPayload>("load_project_v2", { dirPath: selected });
  applyLoadedProject(result);
  useProjectStore.getState().addRecentProject(result.meta.name, result.dir_path);
}

export async function loadProjectFromPath(dirPath: string): Promise<void> {
  const result = await invoke<LoadedProjectPayload>("load_project_v2", { dirPath });
  applyLoadedProject(result);
  useProjectStore.getState().addRecentProject(result.meta.name, result.dir_path);
}

export function applyLoadedProject(result: LoadedProjectPayload): void {
  const cards = result.cards.map((c) => ({
    id: c.id,
    type: c.type as CardType,
    title: c.title,
    body: c.body,
    position: c.position,
    width: c.width ?? undefined,
    height: c.height ?? undefined,
    tags: c.tags ?? undefined,
    collapsed: c.collapsed,
    hasDoc: c.has_doc,
    docContent: c.has_doc && c.doc_content ? deserializeMarkdown(c.doc_content).htmlContent : "",
    agentHint: c.agent_hint ?? undefined,
    comments: c.comments ?? undefined,
  }));

  const mappedEdges = result.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    edgeType: (e.edge_type ?? "hierarchy") as EdgeType,
    sourceArrow: e.source_arrow,
    targetArrow: e.target_arrow,
    referenceScope: e.reference_scope as ReferenceScope | undefined,
    referenceSectionHint: e.reference_section_hint,
    label: e.label,
  }));

  useProjectStore.getState().setProject({
    name: result.meta.name,
    dirPath: result.dir_path,
    goal: result.meta.goal ?? undefined,
    workspaceId: result.meta.workspace_id ?? undefined,
    createdAt: result.meta.created_at ?? undefined,
    updatedAt: result.meta.updated_at ?? undefined,
  });
  useCanvasStore.getState().loadState(cards, mappedEdges, result.viewport);
}

export async function exportContext(): Promise<void> {
  const projectStore = useProjectStore.getState();
  const store = useCanvasStore.getState();
  const contextMd = generateContextMd(
    projectStore.project.name,
    store.cards,
    store.edges,
    projectStore.project.goal,
    {
      agentHintExportMode: store.agentHintExportMode,
      includeAgentHints: store.exportIncludeAgentHints,
      includeBrainstorm: store.exportIncludeBrainstorm,
      includeCardDocs: store.exportIncludeCardDocs,
      excludedTags: store.excludedTags,
      goalOverride: store.exportGoalOverride,
    }
  );

  const selected = await save({
    title: "Export for AI",
    defaultPath: "context.md",
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!selected) return;

  await writeTextFile(selected, contextMd);
}
