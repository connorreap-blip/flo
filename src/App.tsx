import { useState, useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { EditorBubble } from "./components/EditorBubble";
import { HomeScreen } from "./components/HomeScreen";
import { useCanvasStore } from "./store/canvas-store";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";

export default function App() {
  const project = useCanvasStore((s) => s.project);
  const cards = useCanvasStore((s) => s.cards);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const openEditors = useCanvasStore((s) => s.openEditors);
  const setProject = useCanvasStore((s) => s.setProject);

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
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
        {openEditors.map((editor) => (
          <EditorBubble key={editor.cardId} cardId={editor.cardId} initialPosition={editor.position} />
        ))}
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
    </div>
  );
}
