import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";

const SETTINGS_SECTIONS = [
  "appearance",
  "shortcuts",
  "editor",
  "export",
  "agent",
  "tags",
  "governor",
  "history",
] as const;

type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const SECTION_LABELS: Record<SettingsSection, string> = {
  appearance: "Appearance",
  shortcuts: "Shortcuts",
  editor: "Editor",
  export: "Export",
  agent: "Agent",
  tags: "Tags",
  governor: "Governor",
  history: "History",
};

const PLACEHOLDER_COPY: Record<Exclude<SettingsSection, "appearance" | "shortcuts">, string> = {
  editor: "Default font size, formatting defaults, and editor behaviors will live here.",
  export: "Context export format controls and goal presets will live here.",
  agent: "Agent credentials and model-specific placeholders will live here.",
  tags: "Per-tag export visibility, naming rules, and colors will live here.",
  governor: "Rule tuning, warning severity thresholds, and policy presets will live here.",
  history: "Snapshot cadence and auto-save controls will live here.",
};

const SHORTCUTS = [
  { keys: "Cmd+S", description: "Save workspace" },
  { keys: "Cmd+O", description: "Open workspace folder" },
  { keys: "Cmd+E", description: "Export for AI" },
  { keys: "Cmd+G", description: "Toggle grid" },
  { keys: "Cmd+M", description: "Toggle minimap" },
  { keys: "Cmd+K", description: "Open command palette" },
  { keys: "Cmd+1", description: "Switch to canvas view" },
  { keys: "Cmd+2", description: "Switch to kanban view" },
  { keys: "Cmd+Z", description: "Undo" },
  { keys: "Cmd+Shift+Z", description: "Redo" },
  { keys: "Ctrl+Tab", description: "Cycle tabs" },
  { keys: "Escape", description: "Close active overlays/editors" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: Props) {
  const theme = useProjectStore((state) => state.theme);
  const setTheme = useProjectStore((state) => state.setTheme);
  const showGrid = useCanvasStore((state) => state.showGrid);
  const toggleShowGrid = useCanvasStore((state) => state.toggleShowGrid);
  const showMinimap = useCanvasStore((state) => state.showMinimap);
  const toggleMinimap = useCanvasStore((state) => state.toggleMinimap);
  const snapToGrid = useCanvasStore((state) => state.snapToGrid);
  const toggleSnapToGrid = useCanvasStore((state) => state.toggleSnapToGrid);

  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  const title = useMemo(() => SECTION_LABELS[activeSection], [activeSection]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="h-[min(52rem,calc(100dvh-2rem))] w-[min(96vw,72rem)] max-w-[72rem] overflow-hidden border p-0"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
          borderRadius: 0,
        }}
      >
        <div className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Adjust appearance, shortcuts, and future workspace preferences.</DialogDescription>
        </div>

        <div className="flex h-full min-h-0 flex-col md:flex-row">
          <aside
            className="shrink-0 border-b px-3 py-3 md:flex md:w-60 md:flex-col md:border-r md:border-b-0 md:overflow-y-auto"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-lowest)" }}
          >
            <div className="mb-3 px-2">
              <p className="text-xs font-semibold">Settings</p>
              <p
                className="mt-1 text-[10px]"
                style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              >
                Workspace controls
              </p>
            </div>

            <div className="-mx-1 overflow-x-auto pb-1 md:mx-0 md:overflow-x-visible md:pb-0">
              <div className="flex min-w-max gap-1 px-1 md:min-w-0 md:flex-col md:px-0">
                {SETTINGS_SECTIONS.map((section) => {
                  const selected = activeSection === section;
                  return (
                    <button
                      key={section}
                      type="button"
                      className="shrink-0 px-3 py-2 text-left text-sm transition-colors md:w-full md:px-2"
                      style={{
                        background: selected ? "var(--color-surface-high)" : "transparent",
                        color: selected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      }}
                      onClick={() => setActiveSection(section)}
                    >
                      {SECTION_LABELS[section]}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-headline)" }}>
                {title}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {activeSection === "appearance" && "Tune the canvas shell, density, and theme."}
                {activeSection === "shortcuts" && "Reference the current keyboard affordances across the app."}
                {activeSection !== "appearance" && activeSection !== "shortcuts"
                  ? "This section is reserved in Wave 2 and will be filled in a later pass."
                  : null}
              </p>
            </div>

            {activeSection === "appearance" ? (
              <div className="space-y-5">
                <section>
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold">Theme</h3>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Choose the contrast profile for the workspace shell.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SegmentButton active={theme === "dark"} onClick={() => setTheme("dark")}>
                      Dark
                    </SegmentButton>
                    <SegmentButton active={theme === "light"} onClick={() => setTheme("light")}>
                      Light
                    </SegmentButton>
                  </div>
                </section>

                <section className="grid gap-3 md:grid-cols-3">
                  <ToggleCard
                    title="Grid"
                    description="Show the dotted canvas backdrop."
                    active={showGrid}
                    onToggle={toggleShowGrid}
                  />
                  <ToggleCard
                    title="Minimap"
                    description="Keep the viewport overview visible."
                    active={showMinimap}
                    onToggle={toggleMinimap}
                  />
                  <ToggleCard
                    title="Snap to Grid"
                    description="Lock drag operations to the grid rhythm."
                    active={snapToGrid}
                    onToggle={toggleSnapToGrid}
                  />
                </section>
              </div>
            ) : null}

            {activeSection === "shortcuts" ? (
              <div className="grid gap-2">
                {SHORTCUTS.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between gap-3 border px-3 py-3"
                    style={{
                      borderColor: "var(--color-card-border)",
                      background: "var(--color-surface-low)",
                    }}
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd
                      className="border px-2 py-1 text-[10px]"
                      style={{
                        borderColor: "var(--color-card-border)",
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            ) : null}

            {activeSection !== "appearance" && activeSection !== "shortcuts" ? (
              <div
                className="pixel-border max-w-2xl px-4 py-5"
                style={{
                  background: "var(--color-surface-low)",
                  borderColor: "var(--color-card-border)",
                }}
              >
                <p className="text-sm font-semibold">Coming soon</p>
                <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {PLACEHOLDER_COPY[activeSection]}
                </p>
              </div>
            ) : null}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="border px-4 py-2 text-sm transition-colors"
      style={{
        background: active ? "var(--color-card-border-selected)" : "var(--color-surface-low)",
        color: active ? "var(--color-canvas-bg)" : "var(--color-text-primary)",
        borderColor: active ? "var(--color-card-border-selected)" : "var(--color-card-border)",
      }}
    >
      {children}
    </button>
  );
}

function ToggleCard({
  title,
  description,
  active,
  onToggle,
}: {
  title: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className="border px-4 py-4 text-left transition-colors"
      style={{
        borderColor: active ? "var(--color-card-border-selected)" : "var(--color-card-border)",
        background: active ? "var(--color-surface-high)" : "var(--color-surface-low)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{title}</span>
        <span
          className="text-[10px] uppercase"
          style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}
        >
          {active ? "On" : "Off"}
        </span>
      </div>
      <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {description}
      </p>
    </button>
  );
}
