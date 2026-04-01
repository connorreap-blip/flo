import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { useCanvasStore, type AgentHintExportMode, type ExportGoalOverride } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";
import { REFERENCE_SCOPES, REFERENCE_SCOPE_LABELS } from "../lib/constants";
import type { EdgeType, KanbanGrouping, SaveBehaviorPreference, SummarySourcePreference } from "../lib/types";
import { GOVERNOR_RULE_DEFINITIONS } from "../lib/native-settings";

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
  { keys: "Cmd+Shift+S", description: "Save workspace as" },
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
  const defaultReferenceScope = useCanvasStore((s) => s.defaultReferenceScope);
  const setDefaultReferenceScope = useCanvasStore((s) => s.setDefaultReferenceScope);
  const sectionReferenceWordCap = useCanvasStore((s) => s.sectionReferenceWordCap);
  const setSectionReferenceWordCap = useCanvasStore((s) => s.setSectionReferenceWordCap);
  const contextLeanWordThreshold = useCanvasStore((s) => s.contextLeanWordThreshold);
  const setContextLeanWordThreshold = useCanvasStore((s) => s.setContextLeanWordThreshold);
  const contextStandardWordThreshold = useCanvasStore((s) => s.contextStandardWordThreshold);
  const setContextStandardWordThreshold = useCanvasStore((s) => s.setContextStandardWordThreshold);
  const contextRichWordThreshold = useCanvasStore((s) => s.contextRichWordThreshold);
  const setContextRichWordThreshold = useCanvasStore((s) => s.setContextRichWordThreshold);
  const contextSoftWarningWordThreshold = useCanvasStore((s) => s.contextSoftWarningWordThreshold);
  const setContextSoftWarningWordThreshold = useCanvasStore((s) => s.setContextSoftWarningWordThreshold);
  const contextHardWarningWordThreshold = useCanvasStore((s) => s.contextHardWarningWordThreshold);
  const setContextHardWarningWordThreshold = useCanvasStore((s) => s.setContextHardWarningWordThreshold);
  const dragConnectEdgeType = useCanvasStore((s) => s.dragConnectEdgeType);
  const setDragConnectEdgeType = useCanvasStore((s) => s.setDragConnectEdgeType);
  const promptReferenceScopeOnCreate = useCanvasStore((s) => s.promptReferenceScopeOnCreate);
  const togglePromptReferenceScopeOnCreate = useCanvasStore((s) => s.togglePromptReferenceScopeOnCreate);
  const exportFileNamePattern = useCanvasStore((s) => s.exportFileNamePattern);
  const setExportFileNamePattern = useCanvasStore((s) => s.setExportFileNamePattern);
  const exportTargetPath = useCanvasStore((s) => s.exportTargetPath);
  const setExportTargetPath = useCanvasStore((s) => s.setExportTargetPath);
  const saveBehaviorPreference = useCanvasStore((s) => s.saveBehaviorPreference);
  const setSaveBehaviorPreference = useCanvasStore((s) => s.setSaveBehaviorPreference);

  // Agent settings
  const defaultAgentHint = useCanvasStore((s) => s.defaultAgentHint);
  const setDefaultAgentHint = useCanvasStore((s) => s.setDefaultAgentHint);
  const agentHintExportMode = useCanvasStore((s) => s.agentHintExportMode);
  const setAgentHintExportMode = useCanvasStore((s) => s.setAgentHintExportMode);
  const cardSummaryMaxLength = useCanvasStore((s) => s.cardSummaryMaxLength);
  const setCardSummaryMaxLength = useCanvasStore((s) => s.setCardSummaryMaxLength);
  const suggestionMinDocWords = useCanvasStore((s) => s.suggestionMinDocWords);
  const setSuggestionMinDocWords = useCanvasStore((s) => s.setSuggestionMinDocWords);
  const suggestionKeywordAggressiveness = useCanvasStore((s) => s.suggestionKeywordAggressiveness);
  const setSuggestionKeywordAggressiveness = useCanvasStore((s) => s.setSuggestionKeywordAggressiveness);
  const summarySourcePreference = useCanvasStore((s) => s.summarySourcePreference);
  const setSummarySourcePreference = useCanvasStore((s) => s.setSummarySourcePreference);
  const helperUnscopedReferenceThreshold = useCanvasStore((s) => s.helperUnscopedReferenceThreshold);
  const setHelperUnscopedReferenceThreshold = useCanvasStore((s) => s.setHelperUnscopedReferenceThreshold);
  const helperCooldownMs = useCanvasStore((s) => s.helperCooldownMs);
  const setHelperCooldownMs = useCanvasStore((s) => s.setHelperCooldownMs);
  const helperMinEditDistance = useCanvasStore((s) => s.helperMinEditDistance);
  const setHelperMinEditDistance = useCanvasStore((s) => s.setHelperMinEditDistance);
  const helperDismissForSession = useCanvasStore((s) => s.helperDismissForSession);
  const toggleHelperDismissForSession = useCanvasStore((s) => s.toggleHelperDismissForSession);
  const defaultKanbanGrouping = useCanvasStore((s) => s.defaultKanbanGrouping);
  const setDefaultKanbanGrouping = useCanvasStore((s) => s.setDefaultKanbanGrouping);
  const dashboardSectionsCollapsedByDefault = useCanvasStore((s) => s.dashboardSectionsCollapsedByDefault);
  const toggleDashboardSectionsCollapsedByDefault = useCanvasStore((s) => s.toggleDashboardSectionsCollapsedByDefault);
  const dashboardPreviewTruncationLength = useCanvasStore((s) => s.dashboardPreviewTruncationLength);
  const setDashboardPreviewTruncationLength = useCanvasStore((s) => s.setDashboardPreviewTruncationLength);

  // Tags
  const cards = useCanvasStore((s) => s.cards);
  const excludedTags = useCanvasStore((s) => s.excludedTags);
  const toggleTagExclusion = useCanvasStore((s) => s.toggleTagExclusion);

  // Governor
  const disabledGovernorRules = useCanvasStore((s) => s.disabledGovernorRules);
  const toggleGovernorRule = useCanvasStore((s) => s.toggleGovernorRule);
  const governorBodyLineThreshold = useCanvasStore((s) => s.governorBodyLineThreshold);
  const setGovernorBodyLineThreshold = useCanvasStore((s) => s.setGovernorBodyLineThreshold);
  const governorHierarchyDepthThreshold = useCanvasStore((s) => s.governorHierarchyDepthThreshold);
  const setGovernorHierarchyDepthThreshold = useCanvasStore((s) => s.setGovernorHierarchyDepthThreshold);
  const governorReferenceChainDepthThreshold = useCanvasStore((s) => s.governorReferenceChainDepthThreshold);
  const setGovernorReferenceChainDepthThreshold = useCanvasStore((s) => s.setGovernorReferenceChainDepthThreshold);
  const governorRedundantOverlapThreshold = useCanvasStore((s) => s.governorRedundantOverlapThreshold);
  const setGovernorRedundantOverlapThreshold = useCanvasStore((s) => s.setGovernorRedundantOverlapThreshold);

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
                  <SettingsGroup title="Dashboard Defaults" description="Choose how overview surfaces open and how much preview content they show.">
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                          Default Kanban Grouping
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { value: "hierarchy" as KanbanGrouping, label: "Hierarchy" },
                            { value: "type" as KanbanGrouping, label: "Type" },
                          ]).map((option) => (
                            <SegmentButton
                              key={option.value}
                              active={defaultKanbanGrouping === option.value}
                              onClick={() => setDefaultKanbanGrouping(option.value)}
                            >
                              {option.label}
                            </SegmentButton>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <ToggleCard
                          title="Start Sections Collapsed"
                          description="Open overview panels in a compact state by default."
                          active={dashboardSectionsCollapsedByDefault}
                          onToggle={toggleDashboardSectionsCollapsedByDefault}
                        />
                        <NumberSetting
                          label="Preview Truncation"
                          description="Maximum characters shown in dashboard and kanban previews before truncation."
                          value={dashboardPreviewTruncationLength}
                          min={60}
                          max={240}
                          step={10}
                          suffix="chars"
                          onChange={setDashboardPreviewTruncationLength}
                        />
                      </div>
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
                  <SettingsGroup title="Reference Defaults" description="Control how newly created reference edges behave in previews and exports.">
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                          Drag-Connect Edge Type
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { value: "hierarchy" as EdgeType, label: "Hierarchy" },
                            { value: "flow" as EdgeType, label: "Flow" },
                            { value: "reference" as EdgeType, label: "Reference" },
                          ]).map((option) => (
                            <SegmentButton
                              key={option.value}
                              active={dragConnectEdgeType === option.value}
                              onClick={() => setDragConnectEdgeType(option.value)}
                            >
                              {option.label}
                            </SegmentButton>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                          Default Reference Scope
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {REFERENCE_SCOPES.map((scope) => (
                            <SegmentButton
                              key={scope}
                              active={defaultReferenceScope === scope}
                              onClick={() => setDefaultReferenceScope(scope)}
                            >
                              {REFERENCE_SCOPE_LABELS[scope].label}
                            </SegmentButton>
                          ))}
                        </div>
                      </div>
                      <ToggleCard
                        title="Prompt for Scope"
                        description="When new reference edges are created by drag-connect, ask for the scope before linking."
                        active={promptReferenceScopeOnCreate}
                        onToggle={togglePromptReferenceScopeOnCreate}
                      />
                      <NumberSetting
                        label="Section Scope Word Cap"
                        description="Estimated words counted when a reference uses a section scope."
                        value={sectionReferenceWordCap}
                        min={50}
                        max={1000}
                        step={25}
                        suffix="words"
                        onChange={setSectionReferenceWordCap}
                      />
                    </div>
                  </SettingsGroup>
                  <SettingsGroup title="Context Budget" description="Tune the context-tier boundaries used in health checks and previews.">
                    <div className="grid gap-3 md:grid-cols-3">
                      <NumberSetting
                        label="Lean Max"
                        description="Upper bound for lean exports."
                        value={contextLeanWordThreshold}
                        min={500}
                        max={20000}
                        step={250}
                        suffix="words"
                        onChange={setContextLeanWordThreshold}
                      />
                      <NumberSetting
                        label="Standard Max"
                        description="Upper bound before exports become rich."
                        value={contextStandardWordThreshold}
                        min={1000}
                        max={30000}
                        step={250}
                        suffix="words"
                        onChange={setContextStandardWordThreshold}
                      />
                      <NumberSetting
                        label="Rich Max"
                        description="Upper bound before exports are considered heavy."
                        value={contextRichWordThreshold}
                        min={1500}
                        max={40000}
                        step={250}
                        suffix="words"
                        onChange={setContextRichWordThreshold}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <NumberSetting
                        label="Soft Warning"
                        description="Word count where previews and health checks start showing a warning band."
                        value={contextSoftWarningWordThreshold}
                        min={1000}
                        max={50000}
                        step={250}
                        suffix="words"
                        onChange={setContextSoftWarningWordThreshold}
                      />
                      <NumberSetting
                        label="Hard Warning"
                        description="Word count where context is treated as high-risk for export size."
                        value={contextHardWarningWordThreshold}
                        min={1500}
                        max={60000}
                        step={250}
                        suffix="words"
                        onChange={setContextHardWarningWordThreshold}
                      />
                    </div>
                  </SettingsGroup>
                  <SettingsGroup title="Save and Export Defaults" description="Set the default file naming and save-path behavior for repeated exports.">
                    <div className="space-y-4">
                      <TextSetting
                        label="Export Filename Pattern"
                        description="Available tokens: {project}, {date}, {time}, {datetime}."
                        value={exportFileNamePattern}
                        placeholder="{project}-context-{date}.md"
                        onChange={setExportFileNamePattern}
                      />
                      <TextSetting
                        label="Auto-export Path"
                        description="When set, 'Export for AI' writes directly to this file instead of prompting. e.g. /path/to/project/CLAUDE.md"
                        value={exportTargetPath}
                        placeholder="/path/to/project/CLAUDE.md"
                        onChange={setExportTargetPath}
                      />
                      <div>
                        <p className="mb-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                          Save Button Behavior
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { value: "update-current" as SaveBehaviorPreference, label: "Update Current" },
                            { value: "always-prompt" as SaveBehaviorPreference, label: "Always Prompt" },
                          ]).map((option) => (
                            <SegmentButton
                              key={option.value}
                              active={saveBehaviorPreference === option.value}
                              onClick={() => setSaveBehaviorPreference(option.value)}
                            >
                              {option.label}
                            </SegmentButton>
                          ))}
                        </div>
                      </div>
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
                  <SettingsGroup title="Native Suggestion Controls" description="Tune the non-AI heuristics used across the app.">
                    <div className="grid gap-3 md:grid-cols-2">
                      <NumberSetting
                        label="Summary Length"
                        description="Maximum length for document-to-summary suggestions."
                        value={cardSummaryMaxLength}
                        min={80}
                        max={400}
                        step={10}
                        suffix="chars"
                        onChange={setCardSummaryMaxLength}
                      />
                      <NumberSetting
                        label="Min Doc Length"
                        description="Minimum document word count before summary suggestions appear."
                        value={suggestionMinDocWords}
                        min={20}
                        max={400}
                        step={10}
                        suffix="words"
                        onChange={setSuggestionMinDocWords}
                      />
                      <NumberSetting
                        label="Keyword Aggressiveness"
                        description="How strongly project-goal suggestions pull recurring title and tag keywords."
                        value={suggestionKeywordAggressiveness}
                        min={1}
                        max={3}
                        step={1}
                        onChange={setSuggestionKeywordAggressiveness}
                      />
                      <div
                        className="border px-4 py-4"
                        style={{
                          borderColor: "var(--color-card-border)",
                          background: "var(--color-surface-low)",
                        }}
                      >
                        <div className="text-sm font-semibold">Summary Preference</div>
                        <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          Prefer document titles, lead sentences, or section headings when generating native summaries.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {([
                            { value: "title" as SummarySourcePreference, label: "Title" },
                            { value: "lead" as SummarySourcePreference, label: "Lead Sentence" },
                            { value: "headings" as SummarySourcePreference, label: "Section Headings" },
                          ]).map((option) => (
                            <SegmentButton
                              key={option.value}
                              active={summarySourcePreference === option.value}
                              onClick={() => setSummarySourcePreference(option.value)}
                            >
                              {option.label}
                            </SegmentButton>
                          ))}
                        </div>
                      </div>
                      <NumberSetting
                        label="Helper Trigger"
                        description="How many unscoped references trigger the helper toast."
                        value={helperUnscopedReferenceThreshold}
                        min={1}
                        max={20}
                        step={1}
                        suffix="refs"
                        onChange={setHelperUnscopedReferenceThreshold}
                      />
                    </div>
                  </SettingsGroup>
                  <SettingsGroup title="Helper Cadence" description="Control how often native helper toasts reappear while you edit.">
                    <div className="grid gap-3 md:grid-cols-2">
                      <NumberSetting
                        label="Cooldown"
                        description="Minimum wait between helper toasts."
                        value={Math.round(helperCooldownMs / 1000)}
                        min={10}
                        max={300}
                        step={5}
                        suffix="sec"
                        onChange={(value) => setHelperCooldownMs(value * 1000)}
                      />
                      <NumberSetting
                        label="Min Edit Distance"
                        description="Minimum number of structural edits before another helper can appear."
                        value={helperMinEditDistance}
                        min={1}
                        max={20}
                        step={1}
                        suffix="edits"
                        onChange={setHelperMinEditDistance}
                      />
                    </div>
                    <div className="mt-3">
                      <ToggleCard
                        title="Dismiss for Session"
                        description="When dismissed, suppress that helper until the session is reset."
                        active={helperDismissForSession}
                        onToggle={toggleHelperDismissForSession}
                      />
                    </div>
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
                      {GOVERNOR_RULE_DEFINITIONS.map((rule) => (
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
                  <SettingsGroup title="Governor Thresholds" description="Adjust how sensitive the native governor is before it warns.">
                    <div className="grid gap-3 md:grid-cols-2">
                      <NumberSetting
                        label="Body Lines"
                        description="Maximum summary lines before a body-length warning appears."
                        value={governorBodyLineThreshold}
                        min={1}
                        max={12}
                        step={1}
                        suffix="lines"
                        onChange={setGovernorBodyLineThreshold}
                      />
                      <NumberSetting
                        label="Hierarchy Depth"
                        description="Depth at which nesting warnings begin."
                        value={governorHierarchyDepthThreshold}
                        min={2}
                        max={8}
                        step={1}
                        suffix="levels"
                        onChange={setGovernorHierarchyDepthThreshold}
                      />
                      <NumberSetting
                        label="Reference Chain"
                        description="Depth at which reference-chain warnings begin."
                        value={governorReferenceChainDepthThreshold}
                        min={2}
                        max={8}
                        step={1}
                        suffix="hops"
                        onChange={setGovernorReferenceChainDepthThreshold}
                      />
                      <NumberSetting
                        label="Redundant Overlap"
                        description="Word-overlap ratio before two bodies are treated as redundant."
                        value={Math.round(governorRedundantOverlapThreshold * 100)}
                        min={20}
                        max={95}
                        step={5}
                        suffix="%"
                        onChange={(value) => setGovernorRedundantOverlapThreshold(value / 100)}
                      />
                    </div>
                  </SettingsGroup>
                  <SettingsGroup title="About the Governor" description="">
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      The governor analyzes your workspace structure and flags potential issues
                      like orphan cards, overly deep hierarchies, long card bodies, and costly reference patterns.
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
                          if (!isNaN(n)) setMaxSnapshots(n);
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
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Older snapshots are removed automatically after each save once this limit is exceeded.
                    </p>
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

function NumberSetting({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className="border px-4 py-4"
      style={{
        borderColor: "var(--color-card-border)",
        background: "var(--color-surface-low)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              if (!Number.isNaN(nextValue)) {
                onChange(nextValue);
              }
            }}
            className="w-24 border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "var(--color-card-border)",
              background: "var(--color-surface-lowest)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          />
          {suffix ? (
            <span className="text-xs" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
              {suffix}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TextSetting({
  label,
  description,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="border px-4 py-4"
      style={{
        borderColor: "var(--color-card-border)",
        background: "var(--color-surface-low)",
      }}
    >
      <div className="space-y-2">
        <div className="text-sm font-semibold">{label}</div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {description}
        </p>
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: "var(--color-card-border)",
            background: "var(--color-surface-lowest)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        />
      </div>
    </div>
  );
}
