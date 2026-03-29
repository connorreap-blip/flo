import { useState, useEffect, useRef } from "react";
import { useCanvasStore } from "../store/canvas-store";

interface HelperMessage {
  id: string;
  message: string;
  detail: string;
}

export function HelperToast() {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const dismissedHelpers = useCanvasStore((s) => s.dismissedHelpers);
  const dismissHelper = useCanvasStore((s) => s.dismissHelper);
  const [activeHelper, setActiveHelper] = useState<HelperMessage | null>(null);
  const [prevCounts, setPrevCounts] = useState({ cards: 0, edges: 0 });

  // Keep a stable ref so the effect reads the latest value without re-running
  const activeHelperRef = useRef(activeHelper);
  useEffect(() => {
    activeHelperRef.current = activeHelper;
  }, [activeHelper]);

  useEffect(() => {
    const unscopedRefCount = edges.filter(
      (e) => e.edgeType === "reference" && (e.referenceScope === "full" || !e.referenceScope)
    ).length;

    // Helper: first reference edge created
    if (
      edges.filter((e) => e.edgeType === "reference").length === 1 &&
      prevCounts.edges < edges.length &&
      !dismissedHelpers.includes("first-reference")
    ) {
      setActiveHelper({
        id: "first-reference",
        message: "References let agents see related cards.",
        detail:
          "You can scope what they see — a summary is usually enough. Select the edge and change its type in the toolbar.",
      });
    }

    // Helper: 5+ unscoped references (only if nothing already showing)
    if (
      unscopedRefCount >= 5 &&
      !dismissedHelpers.includes("many-unscoped") &&
      !activeHelperRef.current
    ) {
      setActiveHelper({
        id: "many-unscoped",
        message: `${unscopedRefCount} references have no scope set.`,
        detail:
          "Each unscoped reference includes the full card content. Consider scoping them to 'summary' to keep agent context focused.",
      });
    }

    // Helper: long card body (only if nothing already showing)
    const longBodyCard = cards.find(
      (c) => c.body.split("\n").filter((l) => l.trim()).length > 3
    );
    if (
      longBodyCard &&
      prevCounts.cards <= cards.length &&
      !dismissedHelpers.includes("long-body") &&
      !activeHelperRef.current
    ) {
      setActiveHelper({
        id: "long-body",
        message: "Card bodies should be short statements.",
        detail:
          "Body text is always included in agent context. Move detailed content to the card's document — click the DOC button to add one.",
      });
    }

    setPrevCounts({ cards: cards.length, edges: edges.length });
  }, [cards.length, edges.length, dismissedHelpers]);

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!activeHelper) return;
    const timer = setTimeout(() => setActiveHelper(null), 8000);
    return () => clearTimeout(timer);
  }, [activeHelper]);

  if (!activeHelper) return null;

  return (
    <div
      className="fixed bottom-16 left-4 z-[100] max-w-sm pixel-border p-3 flex flex-col gap-1"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-card-border)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {activeHelper.message}
        </p>
        <button
          onClick={() => {
            dismissHelper(activeHelper.id);
            setActiveHelper(null);
          }}
          className="text-[10px] shrink-0 px-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          x
        </button>
      </div>
      <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
        {activeHelper.detail}
      </p>
      <button
        onClick={() => {
          dismissHelper(activeHelper.id);
          setActiveHelper(null);
        }}
        className="text-[10px] self-end mt-1 px-2 py-0.5"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        GOT IT
      </button>
    </div>
  );
}
