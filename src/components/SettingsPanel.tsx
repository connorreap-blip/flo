import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { useCanvasStore, type AgentHintExportMode, type ExportGoalOverride } from "../store/canvas-store";
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

const SECTION_DESCRIPTIONS: Record<SettingsSection, string> = {
  appearance: "Tune the canvas shell, density, and theme.",
  shortcuts: "Reference the current keyboard affordances across the app.",
  editor: "Configure the document editor defaults.",
  export: "Control how context is exported for AI consumption.",
  agent: "Manage agent hint defaults and export behavior.",
  tags: "Control which tags appear in exported context.",
  governor: "Tune governor rule sensitivity and thresholds.",
  history: "Configure snapshot and auto-save behavior.",
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

const FONT_SIZES = [12, 14, 16, 18] as const;

const GOVERNOR_RULES = [
  { id: "orphan-cards", label: "Orphan cards", description: "Cards with no edges" },
  { id: "large-body", label: "Large card body", description: "Card body text exceeding ~300 words" },
  { id: "deep-nesting", label: "Deep nesting", description: "Hierarchy depth exceeding 4 levels" },
  { id: "missing-doc", label: "Missing docs", description: "Non-brainstorm cards without documents" },
  { id: "circular-ref", label: "Circular references", description: "Reference loops in the graph" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: Props) {
  const theme = useProjectStore((s) => s.theme);
  const setTheme = useProjectStore((s) => s.setTheme);
  const showGrid = useCanvasStore((s) => s.showGrid);
  const toggleShowGrid = useCanvasStore((s) => s.toggleShowGrid);
  const showMinimap = useCanvasStore((s) => s.showMinimap);
  const toggleMinimap = useCanvasStore((s) => s.toggleMinimap);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);
  const toggleSnapToGrid = useCanvasStore((s) => s.toggleSnapToGrid);

  // Editor settings
  const editorFontSize = useCanvasStore((s) => s.editorFontSize);
  const setEditorFontSize = useCanvasStore((s) => s.setEditorFontSize);
  const spellCheck = useCanvasStore((s) => s.spellCheck);
  const toggleSpellCheck = useCanvasStore((s) => s.toggleSpellCheck);
  const autoSave = useCanvasStore((s) => s.autoSave);
  const toggleAutoSave = useCanvasStore((s) => s.toggleAutoSave);
  const showWordCount = useCanvasStore((s) => s.showWordCount);
  const toggleShowWordCount = useCanvasStore((s) => s.toggleShowWordCount);

  // Export settings
  const exportIncludeBrainstorm = useCanvasStore((s) => s.exportIncludeBrainstorm);
  const toggleExportIncludeBrainstorm = useCanvasStore((s) => s.toggleExportIncludeBrainstorm);
  const exportIncludeCardDocs = useCanvasStore((s) => s.exportIncludeCardDocs);
  const toggleExportIncludeCardDocs = useCanvasStore((s) => s.toggleExportIncludeCardDocs);
  const exportIncludeAgentHints = useCanvasStore((s) => s.exportIncludeAgentHints);
  const toggleExportIncludeAgentHints = useCanvasStore((s) => s.toggleExportIncludeAgentHints);
  const exportGoalOverride = useCanvasStore((s) => s.exportGoalOverride);
  const setExportGoalOverride = useCanvasStore((s) => s.setExportGoalOverride);

  // Agent settings
  const defaultAgentHint = useCanvasStore((s) => s.defaultAgentHint);
  const setDefaultAgentHint = useCanvasStore((s) => s.setDefaultAgentHint);
  const agentHintExportMode = useCanvasStore((s) => s.agentHintExportMode);
  const setAgentHintExportMode = useCanvasStore((s) => s.setAgentHintExportMode);

  // Tags
  const cards = useCanvasStore((s) => s.cards);
  const excludedTags = useCanvasStore((s) => s.excludedTags);
  const toggleTagExclusion = useCanvasStore((s) => s.toggleTagExclusion);

  // Governor
  const disabledGovernorRules = useCanvasStore((s) => s.disabledGovernorRules);
  const toggleGovernorRule = useCanvasStore((s) => s.toggleGovernorRule);

  // History
  const autoSnapshot = useCanvasStore((s) => s.autoSnapshot);
  const toggleAutoSnapshot = useCanvasStore((s) => s.toggleAutoSnapshot);
  const maxSnapshots = useCanvasStore((s) => s.maxSnapshots);
  const setMaxSnapshots = useCanvasStore((s) => s.setMaxSnapshots);

  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const card of cards) {
      if (Array.isArray(card.tags)) {
        for (const tag of card.tags) {
          if (typeof tag === "string" && tag.trim()) tagSet.add(tag.trim());
        }
      }
    }
    return [...tagSet].sort();
  }, [cards]);

  const title = SECTION_LABELS[activeSection];
  const description = SECTION_DESCRIPTIONS[activeSection];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="h-[min(52rem,calc(100dvh-2rem))] w-[min(96vw,72rem)] max-w-[72rem] sm:max-w-[72rem] overflow-hidden border p-0"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
          borderRadius: 0,
        }}
      >
        <div className="sr-only">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Adjust workspace preferences.</DialogDescription>
        </div>

        <div className="flex h-full min-h-0 flex-col md:flex-row">
          <aside
            className="shrink-0 border-b px-3 py-3 md:flex md:w-56 md:flex-col md:border-r md:border-b-0 md:overflow-y-auto"
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

          <main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-headline)" }}>
                {title}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {description}
              </p>
            </div>

            <div className="max-w-3xl space-y-6">
              {/* ─── Appearance ─── */}
              {activeSection === "appearance" && (
                <>
                  <SettingsGroup title="Theme" description="Choose the contrast profile for the workspace shell.">
                    <div className="flex flex-wrap gap-2">
                      <SegmentButton active={theme === "dark"} onClick={() => setTheme("dark")}>Dark</SegmentButton>
                      <SegmentButton active={theme === "light"} onClick={() => setTheme("light")}>Light</SegmentButton>
                    </div>
                  </SettingsGroup>
                  <SettingsGroup title="Canvas" description="Toggle canvas display features.">
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                      <ToggleCard title="Grid" description="Show the dotted canvas backdrop." active={showGrid} onToggle={toggleShowGrid} />
                      <ToggleCard title="Minimap" description="Keep the viewport overview visible." active={showMinimap} onToggle={toggleMinimap} />
                      <ToggleCard title="Snap to Grid" description="Lock drag operations to the grid rhythm." active={snapToGrid} onToggle={toggleSnapToGrid} />
                    </div>
                  </SettingsGroup>
                </>
              )}

              {/* ─── Shortcuts ─── */}
              {activeSection === "shortcuts" && (
                <div className="grid gap-2">
                  {SHORTCUTS.map((shortcut) => (
                    <div
                      key={shortcut.keys}
                      className="flex items-center justify-between gap-3 border px-3 py-3"
                      style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-low)" }}
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <kbd
                        className="border px-2 py-1 text-[10px]"
                        style={{ borderColor: "var(--color-card-border)", fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}
                      >
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              )}

              {/* ─── Editor ─── */}
              {activeSection === "editor" && (
                <>
                  <SettingsGroup title="Font Size" description="Default text size in the document editor.">
                    <div className="flex flex-wrap gap-2">
                      {FONT_SIZES.map((size) => (
                        <SegmentButton key={size} active={editorFontSize === size} onClick={() => setEditorFontSize(size)}>
                          {size}px
                        </SegmentButton>
                      ))}
                    </div>
                  </SettingsGroup>
                  <SettingsGroup title="Behavior" description="Editor defaults for all card documents.">
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                      <ToggleCard title="Spell Check" description="Browser spell-check in the editor." active={spellCheck} onToggle={toggleSpellCheck} />
                      <ToggleCard title="Auto-save" description="Automatically save after edits." active={autoSave} onToggle={toggleAutoSave} />
                      <ToggleCard title="Word Count" description="Show live word count in the editor footer." active={showWordCount} onToggle={toggleShowWordCount} />
                    </div>
                  </SettingsGroup>
                </>
              )}

              {/* ─── Export ─── */}
              {activeSection === "export" && (
                <>
                  <SettingsGroup title="Content Inclusion" description="Choose what gets included when exporting context for AI.">
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                      <ToggleCard title="Brainstorm Cards" description="Include brainstorm-type cards in export." active={exportIncludeBrainstorm} onToggle={toggleExportIncludeBrainstorm} />
                      <ToggleCard title="Card Documents" description="Include full card documents in export." active={exportIncludeCardDocs} onToggle={toggleExportIncludeCardDocs} />
                      <ToggleCard title="Agent Hints" description="Include agent hint annotations." active={exportIncludeAgentHints} onToggle={toggleExportIncludeAgentHints} />
                    </div>
                  </SettingsGroup>
                  <SettingsGroup title="Goal Profile" description="Override automatic goal detection for the export ordering.">
                    <div className="flex flex-wrap gap-2">
                      {(["auto", "implementation", "review", "brainstorm"] as ExportGoalOverride[]).map((mode) => (
                        <SegmentButton key={mode} active={exportGoalOverride === mode} onClick={() => setExportGoalOverride(mode)}>
                          {mode === "auto" ? "Auto" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </SegmentButton>
                      ))}
                    </div>
                  </SettingsGroup>
                </>
              )}

              {/* ─── Agent ─── */}
              {activeSection === "agent" && (
                <>
                  <SettingsGroup title="Default Hint Template" description="Pre-fill new cards with this agent hint. Leave empty to start blank.">
                    <textarea
                      value={defaultAgentHint}
                      onChange={(e) => setDefaultAgentHint(e.target.value)}
                      placeholder="Example: Focus on migration risk and surface the quickest safe rollout."
                      className="min-h-24 w-full resize-y border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: "var(--color-card-border)",
                        background: "var(--color-surface-lowest)",
                        color: "var(--color-text-primary)",
                      }}
                    />
                  </SettingsGroup>
                  <SettingsGroup title="Hint Export Mode" description="How agent hints appear in the exported context.md.">
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: "inline" as AgentHintExportMode, label: "Inline with card" },
                        { value: "section" as AgentHintExportMode, label: "Separate section" },
                        { value: "hidden" as AgentHintExportMode, label: "Hidden" },
                      ]).map((opt) => (
                        <SegmentButton key={opt.value} active={agentHintExportMode === opt.value} onClick={() => setAgentHintExportMode(opt.value)}>
                          {opt.label}
                        </SegmentButton>
                      ))}
                    </div>
                    <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <strong>Inline:</strong> Agent hints appear next to each card in the structure tree.{" "}
                      <strong>Separate section:</strong> All hints are collected into their own export section.{" "}
                      <strong>Hidden:</strong> Hints are stored but not exported.
                    </p>
                  </SettingsGroup>
                </>
              )}

              {/* ─── Tags ─── */}
              {activeSection === "tags" && (
                <SettingsGroup title="Tag Export Visibility" description="Toggle which tags are included in exported context. Excluded tags won't appear in context.md.">
                  {allTags.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      No tags in use yet. Add tags to cards and they'll appear here.
                    </p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {allTags.map((tag) => (
                        <ToggleCard
                          key={tag}
                          title={`#${tag}`}
                          description={excludedTags.includes(tag) ? "Excluded from export" : "Included in export"}
                          active={!excludedTags.includes(tag)}
                          onToggle={() => toggleTagExclusion(tag)}
                        />
                      ))}
                    </div>
                  )}
                </SettingsGroup>
              )}

              {/* ─── Governor ─── */}
              {activeSection === "governor" && (
                <>
                  <SettingsGroup title="Governor Rules" description="Enable or disable individual structural checks the governor runs.">
                    <div className="grid gap-2">
                      {GOVERNOR_RULES.map((rule) => (
                        <ToggleCard
                          key={rule.id}
                          title={rule.label}
                          description={rule.description}
                          active={!disabledGovernorRules.includes(rule.id)}
                          onToggle={() => toggleGovernorRule(rule.id)}
                        />
                      ))}
                    </div>
                  </SettingsGroup>
                  <SettingsGroup title="About the Governor" description="">
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      The governor analyzes your workspace structure and flags potential issues
                      like orphan cards, overly deep hierarchies, and missing documentation.
                      Warnings appear on the Overview dashboard and in the AI Health Check dialog.
                    </p>
                  </SettingsGroup>
                </>
              )}

              {/* ─── History ─── */}
              {activeSection === "history" && (
                <>
                  <SettingsGroup title="Snapshots" description="Configure automatic history snapshots.">
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                      <ToggleCard title="Auto-snapshot on Save" description="Create a snapshot every time the workspace is saved." active={autoSnapshot} onToggle={toggleAutoSnapshot} />
                    </div>
                  </SettingsGroup>
                  <SettingsGroup title="Retention" description="Maximum number of history snapshots to keep.">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={5}
                        max={500}
                        value={maxSnapshots}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!isNaN(n) && n >= 5 && n <= 500) setMaxSnapshots(n);
                        }}
                        className="w-24 border px-3 py-2 text-sm outline-none"
                        style={{
                          borderColor: "var(--color-card-border)",
                          background: "var(--color-surface-lowest)",
                          color: "var(--color-text-primary)",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        snapshots
                      </span>
                    </div>
                  </SettingsGroup>
                </>
              )}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
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
