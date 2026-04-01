import { useMemo } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";
import { saveProject } from "../lib/file-ops";

type ChecklistItem = {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
};

function ChecklistIndicator({ complete }: { complete: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="mt-1 inline-flex h-3.5 w-3.5 flex-shrink-0 rounded-full border"
      style={{
        borderColor: complete ? "var(--color-text-primary)" : "var(--color-card-border)",
        background: complete ? "var(--color-text-primary)" : "transparent",
      }}
    />
  );
}

export function OnboardingChecklist() {
  const cards = useCanvasStore((state) => state.cards);
  const edges = useCanvasStore((state) => state.edges);
  const hasUsedGhostPreview = useCanvasStore((state) => state.hasUsedGhostPreview);
  const isDirty = useCanvasStore((state) => state.isDirty);
  const dismissChecklist = useCanvasStore((state) => state.dismissChecklist);
  const projectDirPath = useProjectStore((state) => state.project.dirPath);

  const items = useMemo<ChecklistItem[]>(
    () => [
      {
        id: "first-card",
        label: "Create your first card",
        detail: "Start shaping the workspace with a single node.",
        complete: cards.length >= 1,
      },
      {
        id: "first-edge",
        label: "Connect cards with an edge",
        detail: "Link cards to show hierarchy, flow, or references.",
        complete: edges.length >= 1,
      },
      {
        id: "five-cards",
        label: "Add 5 cards to your workspace",
        detail: "A few connected cards are enough for the map to become useful.",
        complete: cards.length >= 5,
      },
      {
        id: "ghost-preview",
        label: "Preview what your agent will read",
        detail: "Open Ghost Preview to inspect exported context. Try Cmd+Shift+P now.",
        complete: hasUsedGhostPreview,
      },
      {
        id: "save-workspace",
        label: "Save your workspace",
        detail: "Write the current workspace to disk with no unsaved changes left.",
        complete: projectDirPath !== null && !isDirty,
      },
    ],
    [cards.length, edges.length, hasUsedGhostPreview, isDirty, projectDirPath]
  );

  const actions: Record<string, (() => void) | undefined> = {
    "first-card": () => {
      useProjectStore.getState().setActiveTab("layers");
      useProjectStore.getState().setActiveView("canvas");
    },
    "first-edge": () => {
      useProjectStore.getState().setActiveTab("layers");
      useProjectStore.getState().setActiveView("canvas");
    },
    "five-cards": () => {
      useProjectStore.getState().setActiveTab("layers");
      useProjectStore.getState().setActiveView("canvas");
    },
    "ghost-preview": () => {
      useProjectStore.getState().setActiveTab("layers");
      useProjectStore.getState().setActiveView("canvas");
      useCanvasStore.getState().setGhostPreviewMode("read");
    },
    "save-workspace": () => {
      saveProject();
    },
  };

  const completedCount = items.filter((item) => item.complete).length;
  const allComplete = completedCount === items.length;

  return (
    <section
      className="pixel-border overflow-hidden"
      style={{
        background: "linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-lowest) 100%)",
      }}
      aria-label="Onboarding checklist"
    >
      <div className="flex items-start justify-between gap-4 border-b px-4 py-3" style={{ borderColor: "var(--color-card-border)" }}>
        <div className="space-y-1">
          <div
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
          >
            Onboarding Checklist
          </div>
          <div
            className="text-lg font-semibold"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-headline)" }}
          >
            {allComplete ? "You're set up!" : `${completedCount} of ${items.length} complete`}
          </div>
        </div>

        <button
          type="button"
          className="border px-2 py-1 text-[10px] uppercase tracking-[0.24em]"
          style={{
            borderColor: "var(--color-card-border)",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-mono)",
          }}
          onClick={dismissChecklist}
        >
          Hide Checklist
        </button>
      </div>

      <div className="grid gap-px" style={{ background: "var(--color-card-border)" }}>
        {items.map((item) => {
          const action = !item.complete ? actions[item.id] : undefined;
          const Wrapper = action ? "button" : "div";
          return (
            <Wrapper
              key={item.id}
              type={action ? "button" : undefined}
              className="flex items-start gap-3 px-4 py-3 text-left w-full transition-colors"
              style={{
                background: "var(--color-surface-lowest)",
                cursor: action ? "pointer" : "default",
              }}
              onClick={action}
            >
              <ChecklistIndicator complete={item.complete} />
              <div className="min-w-0 space-y-1">
                <div className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                  {item.label}
                </div>
                <div
                  className="text-[11px] uppercase tracking-[0.18em]"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                >
                  {item.complete ? "Complete" : "Pending"} · {item.detail}
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
