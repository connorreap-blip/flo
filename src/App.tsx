import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { EditorBubble } from "./components/EditorBubble";
import { useCanvasStore } from "./store/canvas-store";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";

export default function App() {
  const openEditors = useCanvasStore((s) => s.openEditors);
  const cards = useCanvasStore((s) => s.cards);
  const isDirty = useCanvasStore((s) => s.isDirty);

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
