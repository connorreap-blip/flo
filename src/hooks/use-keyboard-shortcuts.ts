import { useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore, type TabId } from "../store/project-store";
import { saveProject, saveProjectAs, loadProject, exportContext, copyContextToClipboard } from "../lib/file-ops";

export function useKeyboardShortcuts() {
  const toggleShowGrid = useCanvasStore((s) => s.toggleShowGrid);
  const toggleMinimap = useCanvasStore((s) => s.toggleMinimap);
  const setActiveView = useProjectStore((s) => s.setActiveView);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+S — Save
      if (meta && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        saveProject();
      }

      // Cmd+Shift+S — Save As
      if (meta && e.key.toLowerCase() === "s" && e.shiftKey) {
        e.preventDefault();
        saveProjectAs();
      }

      // Cmd+O — Open
      if (meta && e.key === "o") {
        e.preventDefault();
        loadProject();
      }

      // Cmd+Z — Undo
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.temporal.getState().undo();
        window.dispatchEvent(new CustomEvent("flo:undo-redo", { detail: { action: "undo" } }));
      }

      // Cmd+Shift+Z — Redo
      if (meta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        useCanvasStore.temporal.getState().redo();
        window.dispatchEvent(new CustomEvent("flo:undo-redo", { detail: { action: "redo" } }));
      }

      // Cmd+E — Export context.md
      if (meta && e.key === "e") {
        e.preventDefault();
        exportContext();
      }

      // Cmd+Shift+C — Copy context to clipboard
      if (meta && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyContextToClipboard();
      }

      // Cmd+G — Toggle grid
      if (meta && e.key === "g") {
        e.preventDefault();
        toggleShowGrid();
      }

      // Cmd+M — Toggle minimap
      if (meta && e.key === "m") {
        e.preventDefault();
        toggleMinimap();
      }

      // Cmd+Shift+P — Ghost Preview
      if (meta && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        const current = useCanvasStore.getState().ghostPreviewMode;
        useCanvasStore.getState().setGhostPreviewMode(current ? null : "read");
      }

      // Cmd+1 — Canvas view
      if (meta && e.key === "1") {
        e.preventDefault();
        setActiveView("canvas");
      }

      // Cmd+2 — Kanban view
      if (meta && e.key === "2") {
        e.preventDefault();
        setActiveView("kanban");
      }

      // Ctrl+Tab — next tab
      if (e.ctrlKey && e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const tabs: TabId[] = ["home", "layers", "assets", "history"];
        const current = useProjectStore.getState().activeTab;
        const idx = tabs.indexOf(current);
        useProjectStore.getState().setActiveTab(tabs[(idx + 1) % tabs.length]);
      }

      // Ctrl+Shift+Tab — previous tab
      if (e.ctrlKey && e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        const tabs: TabId[] = ["home", "layers", "assets", "history"];
        const current = useProjectStore.getState().activeTab;
        const idx = tabs.indexOf(current);
        useProjectStore.getState().setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length]);
      }

      // Escape — Close ghost preview first, then close all editors
      if (e.key === "Escape") {
        const store = useCanvasStore.getState();
        if (store.ghostPreviewMode) {
          store.setGhostPreviewMode(null);
        } else {
          store.openEditors.forEach((ed) => store.closeEditor(ed.cardId));
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleShowGrid, toggleMinimap, setActiveView]);
}
