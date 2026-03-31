import { MousePointer2, Hand } from "lucide-react";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";

interface Props {
  selectedEdgeIds: string[];
}

export function FloatingToolbar({ selectedEdgeIds: _selectedEdgeIds }: Props) {
  const editorMode = useCanvasStore((s) => s.editorMode);
  const setEditorMode = useCanvasStore((s) => s.setEditorMode);
  const activeView = useProjectStore((s) => s.activeView);
  const setActiveView = useProjectStore((s) => s.setActiveView);

  return (
    <div
      className="absolute bottom-4 left-4 z-50 flex items-center pixel-border"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-card-border)",
      }}
    >
      {/* Mode controls */}
      <div className="flex items-center px-1.5 py-1 gap-1">
        <button
          onClick={() => setEditorMode("select")}
          title="Select / move (V)"
          className="p-1.5 transition-colors"
          style={{
            color: editorMode === "select" ? "var(--color-text-primary)" : "var(--color-text-muted)",
            background: editorMode === "select" ? "var(--color-surface-high)" : "transparent",
          }}
        >
          <MousePointer2 size={14} />
        </button>
        <button
          onClick={() => setEditorMode("pan")}
          title="Pan canvas (H)"
          className="p-1.5 transition-colors"
          style={{
            color: editorMode === "pan" ? "var(--color-text-primary)" : "var(--color-text-muted)",
            background: editorMode === "pan" ? "var(--color-surface-high)" : "transparent",
          }}
        >
          <Hand size={14} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-card-border)" }} />

      {/* View toggle */}
      <div className="flex items-center px-1.5 py-1 gap-1">
        <button
          onClick={() => setActiveView("canvas")}
          title="Canvas view (Cmd+1)"
          className="px-2 py-1 text-[10px] transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
            color: activeView === "canvas" ? "var(--color-text-primary)" : "var(--color-text-muted)",
            background: activeView === "canvas" ? "var(--color-surface-high)" : "transparent",
          }}
        >
          MAP
        </button>
        <button
          onClick={() => setActiveView("kanban")}
          title="Kanban view (Cmd+2)"
          className="px-2 py-1 text-[10px] transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
            color: activeView === "kanban" ? "var(--color-text-primary)" : "var(--color-text-muted)",
            background: activeView === "kanban" ? "var(--color-surface-high)" : "transparent",
          }}
        >
          LIST
        </button>
      </div>
    </div>
  );
}
