import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCanvasStore } from "../store/canvas-store";
import { REFERENCE_SCOPES, REFERENCE_SCOPE_LABELS } from "../lib/constants";
import type { ReferenceScope } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  sourceId: string;
  targetId: string;
}

export function ReferenceScopeDialog({ open, onClose, sourceId, targetId }: Props) {
  const defaultReferenceScope = useCanvasStore((s) => s.defaultReferenceScope);
  const [scope, setScope] = useState<ReferenceScope>(defaultReferenceScope);
  const [sectionHint, setSectionHint] = useState("");
  const addEdge = useCanvasStore((s) => s.addEdge);
  const targetCard = useCanvasStore((s) => s.cards.find((c) => c.id === targetId));

  useEffect(() => {
    if (!open) {
      return;
    }

    setScope(defaultReferenceScope);
  }, [defaultReferenceScope, open]);

  const handleCreate = () => {
    addEdge(sourceId, targetId, "reference", scope, scope === "section" ? sectionHint : undefined);
    setScope(defaultReferenceScope);
    setSectionHint("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm border"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-sm uppercase tracking-wider"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Reference Scope
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Referencing: <strong style={{ color: "var(--color-text-primary)" }}>{targetCard?.title || "Untitled"}</strong>
        </p>
        <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          What context does the agent need from this card?
        </p>
        <div className="space-y-2 pt-2">
          {REFERENCE_SCOPES.map((s) => {
            const { label, description } = REFERENCE_SCOPE_LABELS[s];
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                className="w-full text-left px-3 py-2 border flex flex-col gap-0.5"
                style={{
                  background: scope === s ? "var(--color-surface-high)" : "var(--color-surface-low)",
                  borderColor: scope === s ? "#FFFFFF" : "var(--color-card-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{description}</span>
              </button>
            );
          })}
          {scope === "section" && (
            <Input
              value={sectionHint}
              onChange={(e) => setSectionHint(e.target.value)}
              placeholder='e.g. "auth endpoints"'
              className="border mt-2"
              style={{
                background: "var(--color-surface-low)",
                borderColor: "var(--color-card-border)",
                color: "var(--color-text-primary)",
              }}
              autoFocus
            />
          )}
        </div>
        <Button
          onClick={handleCreate}
          className="w-full bg-white text-black font-bold hover:opacity-90 mt-2"
        >
          Link
        </Button>
      </DialogContent>
    </Dialog>
  );
}
