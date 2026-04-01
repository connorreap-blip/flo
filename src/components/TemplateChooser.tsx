import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { starterTemplates, type WorkspaceTemplate } from "../lib/templates";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: WorkspaceTemplate) => void;
  templates?: WorkspaceTemplate[];
}

const TEMPLATE_ACCENTS: Record<string, { badge: string; border: string; tint: string; text: string }> = {
  "feature-implementation": {
    badge: "IMP",
    border: "rgba(255, 255, 255, 0.18)",
    tint: "rgba(255, 255, 255, 0.08)",
    text: "var(--color-text-primary)",
  },
  "system-architecture": {
    badge: "ARC",
    border: "rgba(140, 140, 140, 0.35)",
    tint: "rgba(140, 140, 140, 0.12)",
    text: "var(--color-text-primary)",
  },
  "bug-triage": {
    badge: "BUG",
    border: "rgba(200, 200, 200, 0.24)",
    tint: "rgba(200, 200, 200, 0.08)",
    text: "var(--color-text-primary)",
  },
  "product-discovery": {
    badge: "RSR",
    border: "rgba(170, 170, 170, 0.3)",
    tint: "rgba(170, 170, 170, 0.1)",
    text: "var(--color-text-primary)",
  },
};

function getAccent(templateId: string) {
  return (
    TEMPLATE_ACCENTS[templateId] ?? {
      badge: "MAP",
      border: "var(--color-card-border)",
      tint: "var(--color-surface-low)",
      text: "var(--color-text-primary)",
    }
  );
}

export function TemplateChooser({
  open,
  onOpenChange,
  onSelect,
  templates = starterTemplates,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(96vw,64rem)] max-w-[64rem] rounded-none border p-0 sm:max-w-[64rem]"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
        }}
      >
        <DialogHeader className="border-b px-5 py-4" style={{ borderColor: "var(--color-card-border)" }}>
          <DialogTitle style={{ fontFamily: "var(--font-headline)" }}>Start from a template</DialogTitle>
          <DialogDescription style={{ color: "var(--color-text-secondary)" }}>
            Pick a starter map, load it into the canvas, and adapt it to the work you want an agent to carry forward.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 p-4 md:grid-cols-2">
          {templates.map((template) => {
            const accent = getAccent(template.id);

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template)}
                className="group flex min-h-[12rem] flex-col justify-between border px-4 py-4 text-left transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2"
                style={{
                  background: "var(--color-surface-lowest)",
                  borderColor: "var(--color-card-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className="text-[10px] uppercase tracking-[0.28em]"
                        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                      >
                        {template.category}
                      </div>
                      <h3
                        className="mt-3 text-lg font-semibold leading-tight"
                        style={{ fontFamily: "var(--font-headline)" }}
                      >
                        {template.name}
                      </h3>
                    </div>
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center border text-[10px] font-semibold tracking-[0.24em]"
                      style={{
                        borderColor: accent.border,
                        background: accent.tint,
                        color: accent.text,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {accent.badge}
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                    {template.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div
                    className="text-[10px] uppercase tracking-[0.24em]"
                    style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {template.cards.length} cards / {template.edges.length} links
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-[0.28em] transition-opacity group-hover:opacity-100"
                    style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)", opacity: 0.7 }}
                  >
                    Load Template
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
