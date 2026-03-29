import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCanvasStore } from "../store/canvas-store";
import { CARD_TYPES, CARD_TYPE_LABELS, type CardType } from "../lib/constants";

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the new card will be connected to this card and positioned below it */
  parentCardId?: string;
  parentPosition?: { x: number; y: number };
}

export function NewCardDialog({ open, onClose, parentCardId, parentPosition }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CardType>("process");
  const addCard = useCanvasStore((s) => s.addCard);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const viewport = useCanvasStore((s) => s.viewport);

  const handleCreate = () => {
    if (!title.trim()) return;
    let x: number;
    let y: number;
    if (parentPosition) {
      // Place below the parent card
      x = parentPosition.x;
      y = parentPosition.y + 160;
    } else {
      // Place near center of current viewport
      x = -viewport.x / viewport.zoom + 400;
      y = -viewport.y / viewport.zoom + 300;
    }
    const newId = addCard(type, title.trim(), { x, y });
    if (parentCardId) {
      addEdge(parentCardId, newId, "hierarchy");
    }
    setTitle("");
    setType("process");
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
            {parentCardId ? "Branch Card" : "New Card"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title..."
            className="border"
            style={{
              background: "var(--color-surface-low)",
              borderColor: "var(--color-card-border)",
              color: "var(--color-text-primary)",
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <Select value={type} onValueChange={(v) => setType(v as CardType)}>
            <SelectTrigger
              className="border"
              style={{
                background: "var(--color-surface-low)",
                borderColor: "var(--color-card-border)",
                color: "var(--color-text-primary)",
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-card-border)",
              }}
            >
              {CARD_TYPES.map((t) => (
                <SelectItem key={t} value={t} style={{ color: "var(--color-text-primary)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.05em", marginRight: "0.5rem" }}>
                    [{CARD_TYPE_LABELS[t]}]
                  </span>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCreate}
            className="w-full bg-white text-black font-bold hover:opacity-90"
            disabled={!title.trim()}
          >
            {parentCardId ? "Branch" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
