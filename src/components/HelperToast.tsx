import { useState, useEffect, useRef } from "react";
import { useCanvasStore } from "../store/canvas-store";

interface HelperMessage {
  id: string;
  message: string;
  detail: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function HelperToast() {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const dismissedHelpers = useCanvasStore((s) => s.dismissedHelpers);
  const dismissHelper = useCanvasStore((s) => s.dismissHelper);
  const helperUnscopedReferenceThreshold = useCanvasStore((s) => s.helperUnscopedReferenceThreshold);
  const governorBodyLineThreshold = useCanvasStore((s) => s.governorBodyLineThreshold);
  const helperCooldownMs = useCanvasStore((s) => s.helperCooldownMs);
  const helperMinEditDistance = useCanvasStore((s) => s.helperMinEditDistance);
  const helperDismissForSession = useCanvasStore((s) => s.helperDismissForSession);
  const editVersion = useCanvasStore((s) => s.editVersion);
  const ghostPreviewMode = useCanvasStore((s) => s.ghostPreviewMode);
  const setGhostPreviewMode = useCanvasStore((s) => s.setGhostPreviewMode);
  const [activeHelper, setActiveHelper] = useState<HelperMessage | null>(null);
  const [prevCounts, setPrevCounts] = useState({ cards: 0, edges: 0 });
  const lastPromptAtRef = useRef(0);
  const lastPromptEditVersionRef = useRef(0);

  // Keep a stable ref so the effect reads the latest value without re-running
  const activeHelperRef = useRef(activeHelper);
  useEffect(() => {
    activeHelperRef.current = activeHelper;
  }, [activeHelper]);

  const showHelper = (message: HelperMessage) => {
    const now = Date.now();
    if (activeHelperRef.current) {
      return;
    }
    const hasShownBefore = lastPromptAtRef.current > 0;
    if (hasShownBefore && now - lastPromptAtRef.current < helperCooldownMs) {
      return;
    }
    if (hasShownBefore && editVersion - lastPromptEditVersionRef.current < helperMinEditDistance) {
      return;
    }

    lastPromptAtRef.current = now;
    lastPromptEditVersionRef.current = editVersion;
    setActiveHelper(message);
  };

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
      showHelper({
        id: "first-reference",
        message: "References let agents see related cards.",
        detail:
          "You can scope what they see — a summary is usually enough. Select the edge and change its type in the toolbar.",
      });
    }

    // Helper: configurable unscoped-reference threshold (only if nothing already showing)
    if (
      unscopedRefCount >= helperUnscopedReferenceThreshold &&
      !dismissedHelpers.includes("many-unscoped") &&
      !activeHelperRef.current
    ) {
      showHelper({
        id: "many-unscoped",
        message: `${unscopedRefCount} references have no scope set.`,
        detail:
          "Each unscoped reference includes the full card content. Consider scoping them to 'summary' to keep agent context focused.",
      });
    }

    // Helper: long card body (only if nothing already showing)
    const longBodyCard = cards.find(
      (c) => c.body.split("\n").filter((l) => l.trim()).length > governorBodyLineThreshold
    );
    if (
      longBodyCard &&
      prevCounts.cards <= cards.length &&
      !dismissedHelpers.includes("long-body") &&
      !activeHelperRef.current
    ) {
      showHelper({
        id: "long-body",
        message: "Card bodies should be short statements.",
        detail:
          "Body text is always included in agent context. Move detailed content to the card's document — click the DOC button to add one.",
      });
    }

    if (prevCounts.cards !== cards.length || prevCounts.edges !== edges.length) {
      setPrevCounts({ cards: cards.length, edges: edges.length });
    }
  }, [
    cards,
    dismissedHelpers,
    editVersion,
    edges,
    governorBodyLineThreshold,
    helperCooldownMs,
    helperDismissForSession,
    helperMinEditDistance,
    helperUnscopedReferenceThreshold,
  ]);

  useEffect(() => {
    if (
      cards.length >= 3 &&
      ghostPreviewMode === null &&
      !dismissedHelpers.includes("ghost-preview-nudge") &&
      !activeHelperRef.current
    ) {
      showHelper({
        id: "ghost-preview-nudge",
        message: "See what your agent reads — try Ghost Preview",
        detail: "Open the read view to inspect the exact context before you export or hand off the workspace.",
        action: {
          label: "OPEN PREVIEW",
          onClick: () => {
            dismissHelper("ghost-preview-nudge");
            setGhostPreviewMode("read");
          },
        },
      });
    }
  }, [cards.length, dismissHelper, dismissedHelpers, editVersion, ghostPreviewMode, setGhostPreviewMode]);

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
          type="button"
          onClick={() => {
            if (helperDismissForSession) {
              dismissHelper(activeHelper.id);
            }
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
      <div className="mt-1 flex items-center justify-end gap-2">
        {activeHelper.action ? (
          <button
            type="button"
            onClick={() => {
              activeHelper.action?.onClick();
              setActiveHelper(null);
            }}
            className="border px-2 py-1 text-[10px] uppercase tracking-[0.24em]"
            style={{
              borderColor: "var(--color-card-border)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {activeHelper.action.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (helperDismissForSession) {
              dismissHelper(activeHelper.id);
            }
            setActiveHelper(null);
          }}
          className="text-[10px] px-2 py-0.5"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}
