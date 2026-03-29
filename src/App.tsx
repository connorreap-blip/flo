import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { EditorBubble } from "./components/EditorBubble";
import { useCanvasStore } from "./store/canvas-store";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";

export default function App() {
  const openEditors = useCanvasStore((s) => s.openEditors);

  useKeyboardShortcuts();

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
    </div>
  );
}
