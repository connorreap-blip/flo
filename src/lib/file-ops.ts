import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";
import { serializeCardToMarkdown, deserializeMarkdown } from "./markdown";
import { generateContextMd } from "./export-context";

export async function saveProject(): Promise<void> {
  const canvasStore = useCanvasStore.getState();
  const projectStore = useProjectStore.getState();
  let dirPath = projectStore.project.dirPath;

  if (!dirPath) {
    const selected = await save({
      title: "Save flo Project",
      defaultPath: `${projectStore.project.name}.flo`,
    });
    if (!selected) return;
    dirPath = selected;
    projectStore.setProject({ ...projectStore.project, dirPath });
  }

  const cardsForSave = canvasStore.cards.map((card) => ({
    id: card.id,
    type: card.type,
    title: card.title,
    body: card.body,
    position: card.position,
    collapsed: card.collapsed,
    has_doc: card.hasDoc,
    doc_content: card.hasDoc ? serializeCardToMarkdown(card) : "",
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
    canvasStore.edges
  );

  const payload = {
    dir_path: dirPath,
    meta: {
      name: projectStore.project.name,
      created: new Date().toISOString(),
      format_version: 2,
      goal: projectStore.project.goal ?? null,
    },
    cards: cardsForSave,
    edges: edgesForSave,
    viewport: canvasStore.viewport,
    context_md: contextMd,
  };

  await invoke("save_project_v2", { state: payload });
  canvasStore.markClean();
}

export async function loadProject(): Promise<void> {
  const selected = await open({
    title: "Open flo Project",
    directory: true,
  });
  if (!selected) return;

  const result = await invoke<{
    dir_path: string;
    meta: { name: string; created: string; format_version: number; goal?: string | null };
    cards: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      position: { x: number; y: number };
      collapsed: boolean;
      has_doc: boolean;
      doc_content: string;
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
  }>("load_project_v2", { dirPath: selected });

  const cards = result.cards.map((c) => ({
    id: c.id,
    type: c.type as "project" | "process" | "reference" | "brainstorm",
    title: c.title,
    body: c.body,
    position: c.position,
    collapsed: c.collapsed,
    hasDoc: c.has_doc,
    docContent: c.has_doc && c.doc_content ? deserializeMarkdown(c.doc_content).htmlContent : "",
  }));

  const mappedEdges = result.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    edgeType: (e.edge_type ?? "hierarchy") as import("../lib/types").EdgeType,
    sourceArrow: e.source_arrow,
    targetArrow: e.target_arrow,
    referenceScope: e.reference_scope as import("../lib/types").ReferenceScope | undefined,
    referenceSectionHint: e.reference_section_hint,
    label: e.label,
  }));

  useProjectStore.getState().setProject({
    name: result.meta.name,
    dirPath: result.dir_path,
    goal: result.meta.goal ?? undefined,
  });
  useCanvasStore.getState().loadState(cards, mappedEdges, result.viewport);
}

export async function exportContext(): Promise<void> {
  const projectStore = useProjectStore.getState();
  const store = useCanvasStore.getState();
  const contextMd = generateContextMd(projectStore.project.name, store.cards, store.edges);

  const selected = await save({
    title: "Export context.md",
    defaultPath: "context.md",
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!selected) return;

  await writeTextFile(selected, contextMd);
}
