import { useCanvasStore } from "../store/canvas-store";
import { EDGE_TYPE_LABELS } from "../lib/constants";
import type { EdgeType } from "../lib/types";

interface Props {
  selectedEdgeIds: string[];
}

const EDGE_TYPES: EdgeType[] = ["hierarchy", "flow", "reference"];

export function FloatingToolbar({ selectedEdgeIds }: Props) {
  const editorMode = useCanvasStore((s) => s.editorMode);
  const setEditorMode = useCanvasStore((s) => s.setEditorMode);
  const edges = useCanvasStore((s) => s.edges);
  const updateEdge = useCanvasStore((s) => s.updateEdge);
  const activeView = useCanvasStore((s) => s.activeView);
  const setActiveView = useCanvasStore((s) => s.setActiveView);

  const selectedEdge = selectedEdgeIds.length === 1
    ? edges.find((e) => e.id === selectedEdgeIds[0])
    : undefined;

  const modeBtn = (mode: "select" | "pan" | "delete", label: string, title: string) => (
    <button
      key={mode}
      onClick={() => setEditorMode(mode)}
      title={title}
      className="px-2 py-1 text-[10px] transition-colors"
      style={{
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.05em",
        color: editorMode === mode ? "#FFFFFF" : "var(--color-text-muted)",
        background: editorMode === mode ? "var(--color-surface-high)" : "transparent",
        borderBottom: editorMode === mode ? "1px solid #FFFFFF" : "1px solid transparent",
      }}
    >
      {label}
    </button>
  );

  const handleEdgeTypeChange = (newType: EdgeType) => {
    if (!selectedEdge) return;
    const isRef = newType === "reference";
    updateEdge(selectedEdge.id, {
      edgeType: newType,
      sourceArrow: isRef ? false : selectedEdge.sourceArrow,
      targetArrow: isRef ? false : (selectedEdge.targetArrow ?? true),
      referenceScope: isRef ? (selectedEdge.referenceScope ?? "summary") : undefined,
    });
  };

  return (
    <div
      className="absolute bottom-4 left-4 z-50 flex items-center pixel-border"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-card-border)",
      }}
    >
      <div className="flex items-center px-1 py-0.5 gap-0.5">
        {modeBtn("select", "SEL", "Select / move")}
        {modeBtn("pan", "PAN", "Pan canvas")}
        {modeBtn("delete", "DEL", "Click to delete")}
      </div>

      <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-card-border)" }} />

      <div className="flex items-center px-1 py-0.5 gap-0.5">
        <span
          className="text-[9px] px-1"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
        >
          {selectedEdge ? "EDGE:" : "EDGE"}
        </span>
        {EDGE_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => handleEdgeTypeChange(t)}
            title={`Set edge to ${t}`}
            disabled={!selectedEdge}
            className="px-2 py-1 text-[10px] transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
              color: !selectedEdge
                ? "var(--color-text-muted)"
                : selectedEdge.edgeType === t
                ? "#FFFFFF"
                : "var(--color-text-muted)",
              background: selectedEdge?.edgeType === t ? "var(--color-surface-high)" : "transparent",
              opacity: !selectedEdge ? 0.4 : 1,
              cursor: !selectedEdge ? "default" : "pointer",
            }}
          >
            {EDGE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-card-border)" }} />

      <div className="flex items-center px-1 py-0.5 gap-0.5">
        <button
          onClick={() => setActiveView("canvas")}
          title="Canvas view (Cmd+1)"
          className="px-2 py-1 text-[10px] transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
            color: activeView === "canvas" ? "#FFFFFF" : "var(--color-text-muted)",
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
            color: activeView === "kanban" ? "#FFFFFF" : "var(--color-text-muted)",
            background: activeView === "kanban" ? "var(--color-surface-high)" : "transparent",
          }}
        >
          LIST
        </button>
      </div>
    </div>
  );
}
