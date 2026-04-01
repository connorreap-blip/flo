import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { NewCardDialog } from "./NewCardDialog";
import { useProjectStore } from "../store/project-store";

export function BottomActionBar() {
  const [showNewCard, setShowNewCard] = useState(false);
  const activeView = useProjectStore((s) => s.activeView);
  const setActiveView = useProjectStore((s) => s.setActiveView);

  return (
    <>
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center"
        style={{
          background: "var(--color-surface-high)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "12px",
          padding: "6px 8px",
        }}
      >
        {/* New Card + Search */}
        <button
          onClick={() => setShowNewCard(true)}
          className="flex items-center gap-2 px-4 py-2 transition-colors"
          style={{
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.05em",
          }}
          title="Create a new card"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)"; }}
        >
          <Plus size={14} style={{ background: "var(--color-surface)", padding: 2, borderRadius: 3 }} />
          NEW CARD
        </button>

        <div style={{ width: 1, height: 20, background: "var(--color-card-border)" }} />

        <button
          className="flex items-center gap-2 px-4 py-2 transition-colors"
          style={{
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.05em",
          }}
          title="Search cards (Cmd+F)"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)"; }}
        >
          <Search size={14} />
          SEARCH
        </button>

        <div style={{ width: 1, height: 20, background: "var(--color-card-border)" }} />

        {/* View toggle */}
        <div className="flex items-center px-2 gap-1">
          <button
            onClick={() => setActiveView("canvas")}
            title="Canvas view (Cmd+1)"
            className="px-3 py-1.5 transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.05em",
              color: activeView === "canvas" ? "var(--color-text-primary)" : "var(--color-text-muted)",
              background: activeView === "canvas" ? "var(--color-surface)" : "transparent",
              borderRadius: 6,
            }}
          >
            MAP
          </button>
          <button
            onClick={() => setActiveView("kanban")}
            title="Kanban view (Cmd+2)"
            className="px-3 py-1.5 transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.05em",
              color: activeView === "kanban" ? "var(--color-text-primary)" : "var(--color-text-muted)",
              background: activeView === "kanban" ? "var(--color-surface)" : "transparent",
              borderRadius: 6,
            }}
          >
            LIST
          </button>
        </div>
      </div>

      <NewCardDialog open={showNewCard} onClose={() => setShowNewCard(false)} />
    </>
  );
}
