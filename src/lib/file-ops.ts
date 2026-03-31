import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";
import { serializeCardToMarkdown, deserializeMarkdown } from "./markdown";
import { generateContextMd } from "./export-context";

export async function saveProject(): Promise<void> {
  const projectStore = useProjectStore.getState();
  const store = useCanvasStore.getState();
  let dirPath = projectStore.project.dirPath;

  if (!dirPath) {
    const selected = await save({
      title: "Save flo Project",
      defaultPath: projectStore.project.name,
    });
    if (!selected) return;
    dirPath = selected;
    projectStore.setProject({ ...projectStore.project, dirPath });
  }

  // Prepare cards — serialize doc content to markdown for cards with docs
  const cardsForSave = store.cards.map((card) => ({
    id: card.id,
    type: card.type,
    title: card.title,
    body: card.body,
    position: card.position,
    collapsed: card.collapsed,
    has_doc: card.hasDoc,
    doc_content: card.hasDoc ? serializeCardToMarkdown(card) : "",
  }));

  const state = {
    canvas: {
      map_name: projectStore.project.name,
      viewport: store.viewport,
      cards: cardsForSave,
      edges: store.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        edge_type: e.edgeType,
        source_arrow: e.sourceArrow,
        target_arrow: e.targetArrow,
        reference_scope: e.referenceScope,
        reference_section_hint: e.referenceSectionHint,
      })),
    },
    dir_path: dirPath,
  };

  await invoke("save_project", { state });
  store.markClean();
}

export async function loadProject(): Promise<void> {
  const selected = await open({
    title: "Open flo Project",
    directory: true,
  });
  if (!selected) return;

  const result = await invoke<{
    canvas: {
      map_name: string;
      viewport: { x: number; y: number; zoom: number };
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
      edges: Array<{ id: string; source: string; target: string; edgeType?: string; sourceArrow?: boolean; targetArrow?: boolean; referenceScope?: string; referenceSectionHint?: string }>;
    };
    dir_path: string;
  }>("load_project", { dirPath: selected });

  const canvasStore = useCanvasStore.getState();

  const cards = result.canvas.cards.map((c) => ({
    id: c.id,
    type: c.type as "project" | "process" | "reference" | "brainstorm",
    title: c.title,
    body: c.body,
    position: c.position,
    collapsed: c.collapsed,
    hasDoc: c.has_doc,
    docContent: c.has_doc && c.doc_content ? deserializeMarkdown(c.doc_content).htmlContent : "",
  }));

  const mappedEdges = result.canvas.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    edgeType: (e.edgeType ?? "hierarchy") as import("../lib/types").EdgeType,
    sourceArrow: e.sourceArrow,
    targetArrow: e.targetArrow,
    referenceScope: e.referenceScope as import("../lib/types").ReferenceScope | undefined,
    referenceSectionHint: e.referenceSectionHint,
  }));

  useProjectStore.getState().setProject({ name: result.canvas.map_name, dirPath: result.dir_path });
  canvasStore.loadState(cards, mappedEdges, result.canvas.viewport);
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
