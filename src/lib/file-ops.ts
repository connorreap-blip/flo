import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useCanvasStore } from "../store/canvas-store";
import { serializeCardToMarkdown } from "./markdown";

export async function saveProject(): Promise<void> {
  const store = useCanvasStore.getState();
  let dirPath = store.project.dirPath;

  if (!dirPath) {
    const selected = await save({
      title: "Save flo Project",
      defaultPath: store.project.name,
    });
    if (!selected) return;
    dirPath = selected;
    store.setProject({ ...store.project, dirPath });
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
      map_name: store.project.name,
      viewport: store.viewport,
      cards: cardsForSave,
      edges: store.edges,
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
      edges: Array<{ id: string; source: string; target: string }>;
    };
    dir_path: string;
  }>("load_project", { dirPath: selected });

  const store = useCanvasStore.getState();

  const cards = result.canvas.cards.map((c) => ({
    id: c.id,
    type: c.type as "project" | "process" | "reference" | "brainstorm",
    title: c.title,
    body: c.body,
    position: c.position,
    collapsed: c.collapsed,
    hasDoc: c.has_doc,
    docContent: c.doc_content,
  }));

  store.setProject({ name: result.canvas.map_name, dirPath: result.dir_path });
  store.loadState(cards, result.canvas.edges, result.canvas.viewport);
}
