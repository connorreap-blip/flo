import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "../store/canvas-store";
import { runGovernor, estimateContextWords } from "../lib/governor";
import type { GovernorWarning } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function HealthCheckDialog({ open, onClose, onSave }: Props) {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const updateEdge = useCanvasStore((s) => s.updateEdge);
  const updateCard = useCanvasStore((s) => s.updateCard);

  const warnings = runGovernor(cards, edges);
  const errors = warnings.filter((w) => w.severity === "error");
  const warns = warnings.filter((w) => w.severity === "warning");
  const infos = warnings.filter((w) => w.severity === "info");

  const totalWords = cards
    .filter((c) => c.type !== "brainstorm")
    .reduce((sum, c) => sum + estimateContextWords(c, cards, edges), 0);

  const contextLevel =
    totalWords < 2000 ? "Lean" : totalWords < 5000 ? "Standard" : totalWords < 10000 ? "Rich" : "Heavy";
  const contextColor =
    totalWords < 2000 ? "#44FF44" : totalWords < 5000 ? "#FFFFFF" : totalWords < 10000 ? "#FFAA00" : "#FF4444";

  const handleFix = (warning: GovernorWarning) => {
    if (warning.fix?.action === "set-scope" && warning.edgeId) {
      updateEdge(warning.edgeId, { referenceScope: "summary" });
    }
    if (warning.fix?.action === "convert-type" && warning.cardId) {
      const targetEdge = edges.find((e) => e.id === warning.edgeId);
      if (targetEdge) {
        const targetCard = cards.find((c) => c.id === targetEdge.target);
        if (targetCard) updateCard(targetCard.id, { type: "reference" });
      }
    }
  };

  const renderWarning = (w: GovernorWarning) => {
    const icon = w.severity === "error" ? "x" : w.severity === "warning" ? "!" : "i";
    const color = w.severity === "error" ? "#FF4444" : w.severity === "warning" ? "#FFAA00" : "var(--color-text-muted)";
    return (
      <div key={w.id} className="flex gap-2 py-2 border-b" style={{ borderColor: "var(--color-card-border)" }}>
        <span className="text-[10px] font-bold shrink-0 w-4 text-center" style={{ color, fontFamily: "var(--font-mono)" }}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs" style={{ color: "var(--color-text-primary)" }}>{w.message}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{w.detail}</p>
          {w.fix && (
            <button
              onClick={() => handleFix(w)}
              className="text-[10px] mt-1 px-2 py-0.5 border"
              style={{
                color: "#FFFFFF",
                borderColor: "var(--color-card-border)",
                background: "var(--color-surface-high)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {w.fix.label}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md border max-h-[80vh] overflow-y-auto"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-sm uppercase tracking-wider flex items-center justify-between"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            <span>Context Health</span>
            <span className="text-[10px] font-normal" style={{ color: "var(--color-text-muted)" }}>
              {warnings.length} {warnings.length === 1 ? "issue" : "issues"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--color-card-border)" }}>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
            EXPORT ESTIMATE
          </span>
          <span className="text-xs font-semibold" style={{ color: contextColor, fontFamily: "var(--font-mono)" }}>
            ~{totalWords.toLocaleString()} words ({contextLevel})
          </span>
        </div>

        <div className="space-y-0">
          {errors.map(renderWarning)}
          {warns.map(renderWarning)}
          {infos.map(renderWarning)}
        </div>

        {warnings.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--color-text-muted)" }}>
            All clear. Context is well-structured.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 text-xs border"
            style={{
              background: "var(--color-surface-high)",
              borderColor: "var(--color-card-border)",
              color: "var(--color-text-primary)",
            }}
          >
            Close
          </Button>
          <Button
            onClick={() => { onSave(); onClose(); }}
            className="flex-1 text-xs bg-white text-black font-bold hover:opacity-90"
          >
            {errors.length > 0 ? "Save anyway" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
