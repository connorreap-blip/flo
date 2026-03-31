import { useState, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { EditorBubble } from "./components/EditorBubble";
import { HomeScreen } from "./components/HomeScreen";
import { KanbanView } from "./components/KanbanView";
import { useCanvasStore } from "./store/canvas-store";
import { useProjectStore } from "./store/project-store";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useThemeInit } from "./hooks/use-theme";
import { HelperToast } from "./components/HelperToast";
import { BottomActionBar } from "./components/BottomActionBar";
import { HomeDashboard } from "./components/HomeDashboard";

export default function App() {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const activeTab = useProjectStore((s) => s.activeTab);
  const activeView = useProjectStore((s) => s.activeView);
  const cards = useCanvasStore((s) => s.cards);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const openEditors = useCanvasStore((s) => s.openEditors);

  useThemeInit();

  // Show home screen until user starts a map
  const [started, setStarted] = useState(false);

  // If a project was loaded (has dirPath or cards), auto-start
  const hasProject = project.dirPath !== null || cards.length > 0;

  useKeyboardShortcuts();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useCanvasStore.getState().isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleNewMap = (name: string) => {
    setProject({ name, dirPath: null });
    setStarted(true);
  };

  if (!started && !hasProject) {
    return <HomeScreen onNew={handleNewMap} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: "var(--color-canvas-bg)" }}>
      <Toolbar />
      <div className="flex-1 relative">
        <div style={{ display: activeTab === "layers" ? "contents" : "none" }}>
          {activeView === "canvas" ? (
            <ReactFlowProvider>
              <Canvas />
            </ReactFlowProvider>
          ) : (
            <KanbanView />
          )}
          {openEditors.map((editor) => (
            <EditorBubble key={editor.cardId} cardId={editor.cardId} initialPosition={editor.position} />
          ))}
        </div>
        <div style={{ display: activeTab === "home" ? "contents" : "none" }}>
          <HomeDashboard />
        </div>
        <div style={{ display: activeTab === "assets" ? "contents" : "none" }}>
          <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
            <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>Assets — coming soon</span>
          </div>
        </div>
        <div style={{ display: activeTab === "history" ? "contents" : "none" }}>
          <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
            <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>History — coming soon</span>
          </div>
        </div>
        <BottomActionBar />
      </div>
      <footer
        className="h-6 flex items-center justify-between px-4 shrink-0 border-t text-[10px]"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>{cards.length} cards</span>
        <span>{isDirty ? "unsaved" : "saved"}</span>
      </footer>
      <HelperToast />
    </div>
  );
}
