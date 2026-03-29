import { useState } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { NewCardDialog } from "./NewCardDialog";
import { saveProject, loadProject } from "../lib/file-ops";

export function Toolbar() {
  const [showNewCard, setShowNewCard] = useState(false);
  const project = useCanvasStore((s) => s.project);
  const isDirty = useCanvasStore((s) => s.isDirty);

  return (
    <>
      <header
        className="h-12 flex items-center justify-between px-4 shrink-0 z-50 border-b"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
        }}
      >
        <div className="flex items-center gap-4">
          <span
            className="text-lg font-bold tracking-tighter text-white"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            flo
          </span>
          <span
            className="text-xs"
            style={{
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {project.name}
            {isDirty && " *"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewCard(true)}
            className="text-xs px-3 py-1.5 border"
            style={{
              background: "var(--color-surface-high)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-card-border)",
              fontFamily: "var(--font-mono)",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = "var(--color-surface-highest)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "var(--color-surface-high)";
            }}
          >
            + NEW
          </button>
          <button
            onClick={() => loadProject()}
            className="text-xs px-3 py-1.5 border"
            style={{
              background: "var(--color-surface-high)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-card-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Open
          </button>
          <button
            onClick={() => saveProject()}
            className="text-xs font-bold px-3 py-1.5 uppercase tracking-wider bg-white text-black hover:opacity-90"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Save
          </button>
        </div>
      </header>
      <NewCardDialog open={showNewCard} onClose={() => setShowNewCard(false)} />
    </>
  );
}
