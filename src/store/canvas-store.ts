import { create } from "zustand";
import { temporal } from "zundo";
import { v4 as uuid } from "uuid";
import type {
  Card,
  CanvasViewport,
  Edge,
  EdgeType,
  EditorState,
  KanbanGrouping,
  ReferenceScope,
  SaveBehaviorPreference,
  SummarySourcePreference,
} from "../lib/types";
import type { CardType } from "../lib/constants";
import type { GovernorRuleId } from "../lib/native-settings";
import {
  DEFAULT_CARD_SUMMARY_MAX_LENGTH,
  DEFAULT_CONTEXT_HARD_WARNING_THRESHOLD,
  DEFAULT_CONTEXT_LEAN_WORD_THRESHOLD,
  DEFAULT_CONTEXT_RICH_WORD_THRESHOLD,
  DEFAULT_CONTEXT_SOFT_WARNING_THRESHOLD,
  DEFAULT_CONTEXT_STANDARD_WORD_THRESHOLD,
  DEFAULT_DASHBOARD_PREVIEW_TRUNCATION_LENGTH,
  DEFAULT_DASHBOARD_SECTIONS_COLLAPSED,
  DEFAULT_DRAG_CONNECT_EDGE_TYPE,
  DEFAULT_EXPORT_FILENAME_PATTERN,
  DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD,
  DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD,
  DEFAULT_GOVERNOR_REDUNDANT_OVERLAP_THRESHOLD,
  DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD,
  DEFAULT_HELPER_COOLDOWN_MS,
  DEFAULT_HELPER_DISMISS_FOR_SESSION,
  DEFAULT_HELPER_MIN_EDIT_DISTANCE,
  DEFAULT_HELPER_UNSCOPED_REFERENCE_THRESHOLD,
  DEFAULT_KANBAN_GROUPING,
  DEFAULT_MAX_SNAPSHOTS,
  DEFAULT_PROMPT_REFERENCE_SCOPE_ON_CREATE,
  DEFAULT_REFERENCE_SCOPE,
  DEFAULT_SAVE_BEHAVIOR_PREFERENCE,
  DEFAULT_SECTION_REFERENCE_WORD_CAP,
  DEFAULT_SUGGESTION_KEYWORD_AGGRESSIVENESS,
  DEFAULT_SUGGESTION_MIN_DOC_WORDS,
  DEFAULT_SUMMARY_SOURCE_PREFERENCE,
  clampFloat,
  clampInteger,
} from "../lib/native-settings";

export type AgentHintExportMode = "inline" | "section" | "hidden";
export type ExportGoalOverride = "auto" | "implementation" | "review" | "brainstorm";

const CANVAS_SETTINGS_STORAGE_KEY = "flo:canvas-settings:v1";
const EXPORT_GOAL_OVERRIDES: ExportGoalOverride[] = ["auto", "implementation", "review", "brainstorm"];
const AGENT_HINT_EXPORT_MODES: AgentHintExportMode[] = ["inline", "section", "hidden"];
const SAVE_BEHAVIOR_PREFERENCES: SaveBehaviorPreference[] = ["update-current", "always-prompt"];
const SUMMARY_SOURCE_PREFERENCES: SummarySourcePreference[] = ["title", "lead", "headings"];
const KANBAN_GROUPINGS: KanbanGrouping[] = ["hierarchy", "type"];
const EDGE_TYPES: EdgeType[] = ["hierarchy", "flow", "reference"];

interface CanvasStore {
  // Cards
  cards: Card[];
  addCard: (type: CardType, title: string, position: { x: number; y: number }) => string;
  updateCard: (id: string, updates: Partial<Card>) => void;
  removeCard: (id: string) => void;
  getCard: (id: string) => Card | undefined;

  // Edges
  edges: Edge[];
  addEdge: (
    source: string,
    target: string,
    edgeType?: EdgeType,
    referenceScope?: ReferenceScope,
    referenceSectionHint?: string
  ) => void;
  removeEdge: (id: string) => void;
  updateEdge: (id: string, updates: Partial<Edge>) => void;

  // Editor mode
  editorMode: "select" | "pan";
  setEditorMode: (mode: "select" | "pan") => void;

  // Editor
  openEditors: EditorState[];
  openEditor: (cardId: string, position: { x: number; y: number }) => void;
  closeEditor: (cardId: string) => void;
  ghostPreviewMode: null | "read" | "cost" | "diff";
  setGhostPreviewMode: (mode: null | "read" | "cost" | "diff") => void;
  hasUsedGhostPreview: boolean;

  // Viewport
  viewport: CanvasViewport;
  setViewport: (viewport: CanvasViewport) => void;

  // Grid
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
  showGrid: boolean;
  toggleShowGrid: () => void;
  showMinimap: boolean;
  toggleMinimap: () => void;

  // Dirty flag
  isDirty: boolean;
  markClean: () => void;
  editVersion: number;

  // Helpers
  dismissedHelpers: string[];
  dismissHelper: (helperId: string) => void;
  resetHelpers: () => void;
  checklistDismissed: boolean;
  dismissChecklist: () => void;
  lastExportedContextMd: string | null;
  setLastExportedContextMd: (md: string) => void;
  addComment: (cardId: string, text: string, author?: string) => void;
  removeComment: (cardId: string, commentId: string) => void;
  toastMessage: string | null;
  showToast: (message: string) => void;
  dismissToast: () => void;

  // Settings — Editor
  editorFontSize: number;
  setEditorFontSize: (size: number) => void;
  spellCheck: boolean;
  toggleSpellCheck: () => void;
  autoSave: boolean;
  toggleAutoSave: () => void;
  showWordCount: boolean;
  toggleShowWordCount: () => void;

  // Settings — Export
  exportIncludeBrainstorm: boolean;
  toggleExportIncludeBrainstorm: () => void;
  exportIncludeCardDocs: boolean;
  toggleExportIncludeCardDocs: () => void;
  exportIncludeAgentHints: boolean;
  toggleExportIncludeAgentHints: () => void;
  exportGoalOverride: ExportGoalOverride;
  setExportGoalOverride: (value: ExportGoalOverride) => void;
  exportFileNamePattern: string;
  setExportFileNamePattern: (value: string) => void;
  exportTargetPath: string;
  setExportTargetPath: (path: string) => void;
  saveBehaviorPreference: SaveBehaviorPreference;
  setSaveBehaviorPreference: (value: SaveBehaviorPreference) => void;

  // Settings — Agent
  defaultAgentHint: string;
  setDefaultAgentHint: (value: string) => void;
  agentHintExportMode: AgentHintExportMode;
  setAgentHintExportMode: (value: AgentHintExportMode) => void;
  suggestionMinDocWords: number;
  setSuggestionMinDocWords: (value: number) => void;
  suggestionKeywordAggressiveness: number;
  setSuggestionKeywordAggressiveness: (value: number) => void;
  summarySourcePreference: SummarySourcePreference;
  setSummarySourcePreference: (value: SummarySourcePreference) => void;

  // Settings — Tags
  excludedTags: string[];
  toggleTagExclusion: (tag: string) => void;

  // Settings — Governor
  disabledGovernorRules: GovernorRuleId[];
  toggleGovernorRule: (rule: GovernorRuleId) => void;
  governorBodyLineThreshold: number;
  setGovernorBodyLineThreshold: (value: number) => void;
  governorHierarchyDepthThreshold: number;
  setGovernorHierarchyDepthThreshold: (value: number) => void;
  governorReferenceChainDepthThreshold: number;
  setGovernorReferenceChainDepthThreshold: (value: number) => void;
  governorRedundantOverlapThreshold: number;
  setGovernorRedundantOverlapThreshold: (value: number) => void;

  // Settings — History
  autoSnapshot: boolean;
  toggleAutoSnapshot: () => void;
  maxSnapshots: number;
  setMaxSnapshots: (value: number) => void;

  // Settings — Native UX
  defaultReferenceScope: ReferenceScope;
  setDefaultReferenceScope: (scope: ReferenceScope) => void;
  dragConnectEdgeType: EdgeType;
  setDragConnectEdgeType: (value: EdgeType) => void;
  promptReferenceScopeOnCreate: boolean;
  togglePromptReferenceScopeOnCreate: () => void;
  sectionReferenceWordCap: number;
  setSectionReferenceWordCap: (value: number) => void;
  contextLeanWordThreshold: number;
  setContextLeanWordThreshold: (value: number) => void;
  contextStandardWordThreshold: number;
  setContextStandardWordThreshold: (value: number) => void;
  contextRichWordThreshold: number;
  setContextRichWordThreshold: (value: number) => void;
  contextSoftWarningWordThreshold: number;
  setContextSoftWarningWordThreshold: (value: number) => void;
  contextHardWarningWordThreshold: number;
  setContextHardWarningWordThreshold: (value: number) => void;
  cardSummaryMaxLength: number;
  setCardSummaryMaxLength: (value: number) => void;
  helperUnscopedReferenceThreshold: number;
  setHelperUnscopedReferenceThreshold: (value: number) => void;
  helperCooldownMs: number;
  setHelperCooldownMs: (value: number) => void;
  helperMinEditDistance: number;
  setHelperMinEditDistance: (value: number) => void;
  helperDismissForSession: boolean;
  toggleHelperDismissForSession: () => void;
  defaultKanbanGrouping: KanbanGrouping;
  setDefaultKanbanGrouping: (value: KanbanGrouping) => void;
  dashboardSectionsCollapsedByDefault: boolean;
  toggleDashboardSectionsCollapsedByDefault: () => void;
  dashboardPreviewTruncationLength: number;
  setDashboardPreviewTruncationLength: (value: number) => void;

  // Bulk load (for loading from disk)
  loadState: (cards: Card[], edges: Edge[], viewport: CanvasViewport) => void;
  clearAll: () => void;
}

type PersistedCanvasSettings = Pick<
  CanvasStore,
  | "editorFontSize"
  | "spellCheck"
  | "autoSave"
  | "showWordCount"
  | "exportIncludeBrainstorm"
  | "exportIncludeCardDocs"
  | "exportIncludeAgentHints"
  | "exportGoalOverride"
  | "exportFileNamePattern"
  | "exportTargetPath"
  | "saveBehaviorPreference"
  | "defaultAgentHint"
  | "agentHintExportMode"
  | "suggestionMinDocWords"
  | "suggestionKeywordAggressiveness"
  | "summarySourcePreference"
  | "excludedTags"
  | "disabledGovernorRules"
  | "governorBodyLineThreshold"
  | "governorHierarchyDepthThreshold"
  | "governorReferenceChainDepthThreshold"
  | "governorRedundantOverlapThreshold"
  | "autoSnapshot"
  | "maxSnapshots"
  | "defaultReferenceScope"
  | "dragConnectEdgeType"
  | "promptReferenceScopeOnCreate"
  | "sectionReferenceWordCap"
  | "contextLeanWordThreshold"
  | "contextStandardWordThreshold"
  | "contextRichWordThreshold"
  | "contextSoftWarningWordThreshold"
  | "contextHardWarningWordThreshold"
  | "cardSummaryMaxLength"
  | "helperUnscopedReferenceThreshold"
  | "helperCooldownMs"
  | "helperMinEditDistance"
  | "helperDismissForSession"
  | "defaultKanbanGrouping"
  | "dashboardSectionsCollapsedByDefault"
  | "dashboardPreviewTruncationLength"
  | "checklistDismissed"
>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function parseStoredSettings(): Partial<PersistedCanvasSettings> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(CANVAS_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!isObject(parsed)) {
      return {};
    }

    const settings: Partial<PersistedCanvasSettings> = {};

    if (typeof parsed.editorFontSize === "number") {
      settings.editorFontSize = clampInteger(parsed.editorFontSize, 12, 18, 14);
    }
    if (typeof parsed.spellCheck === "boolean") {
      settings.spellCheck = parsed.spellCheck;
    }
    if (typeof parsed.autoSave === "boolean") {
      settings.autoSave = parsed.autoSave;
    }
    if (typeof parsed.showWordCount === "boolean") {
      settings.showWordCount = parsed.showWordCount;
    }
    if (typeof parsed.exportIncludeBrainstorm === "boolean") {
      settings.exportIncludeBrainstorm = parsed.exportIncludeBrainstorm;
    }
    if (typeof parsed.exportIncludeCardDocs === "boolean") {
      settings.exportIncludeCardDocs = parsed.exportIncludeCardDocs;
    }
    if (typeof parsed.exportIncludeAgentHints === "boolean") {
      settings.exportIncludeAgentHints = parsed.exportIncludeAgentHints;
    }
    if (EXPORT_GOAL_OVERRIDES.includes(parsed.exportGoalOverride as ExportGoalOverride)) {
      settings.exportGoalOverride = parsed.exportGoalOverride as ExportGoalOverride;
    }
    if (typeof parsed.exportFileNamePattern === "string") {
      settings.exportFileNamePattern = parsed.exportFileNamePattern.trim() || DEFAULT_EXPORT_FILENAME_PATTERN;
    }
    if (typeof parsed.exportTargetPath === "string") {
      settings.exportTargetPath = parsed.exportTargetPath;
    }
    if (SAVE_BEHAVIOR_PREFERENCES.includes(parsed.saveBehaviorPreference as SaveBehaviorPreference)) {
      settings.saveBehaviorPreference = parsed.saveBehaviorPreference as SaveBehaviorPreference;
    }
    if (typeof parsed.defaultAgentHint === "string") {
      settings.defaultAgentHint = parsed.defaultAgentHint;
    }
    if (AGENT_HINT_EXPORT_MODES.includes(parsed.agentHintExportMode as AgentHintExportMode)) {
      settings.agentHintExportMode = parsed.agentHintExportMode as AgentHintExportMode;
    }
    if (typeof parsed.suggestionMinDocWords === "number") {
      settings.suggestionMinDocWords = clampInteger(parsed.suggestionMinDocWords, 20, 400, DEFAULT_SUGGESTION_MIN_DOC_WORDS);
    }
    if (typeof parsed.suggestionKeywordAggressiveness === "number") {
      settings.suggestionKeywordAggressiveness = clampInteger(
        parsed.suggestionKeywordAggressiveness,
        1,
        3,
        DEFAULT_SUGGESTION_KEYWORD_AGGRESSIVENESS
      );
    }
    if (SUMMARY_SOURCE_PREFERENCES.includes(parsed.summarySourcePreference as SummarySourcePreference)) {
      settings.summarySourcePreference = parsed.summarySourcePreference as SummarySourcePreference;
    }
    if (isStringArray(parsed.excludedTags)) {
      settings.excludedTags = parsed.excludedTags;
    }
    if (isStringArray(parsed.disabledGovernorRules)) {
      settings.disabledGovernorRules = parsed.disabledGovernorRules as GovernorRuleId[];
    }
    if (typeof parsed.governorBodyLineThreshold === "number") {
      settings.governorBodyLineThreshold = clampInteger(
        parsed.governorBodyLineThreshold,
        1,
        12,
        DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD
      );
    }
    if (typeof parsed.governorHierarchyDepthThreshold === "number") {
      settings.governorHierarchyDepthThreshold = clampInteger(
        parsed.governorHierarchyDepthThreshold,
        2,
        8,
        DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD
      );
    }
    if (typeof parsed.governorReferenceChainDepthThreshold === "number") {
      settings.governorReferenceChainDepthThreshold = clampInteger(
        parsed.governorReferenceChainDepthThreshold,
        2,
        8,
        DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD
      );
    }
    if (typeof parsed.governorRedundantOverlapThreshold === "number") {
      settings.governorRedundantOverlapThreshold = clampFloat(
        parsed.governorRedundantOverlapThreshold,
        0.2,
        0.95,
        DEFAULT_GOVERNOR_REDUNDANT_OVERLAP_THRESHOLD
      );
    }
    if (typeof parsed.autoSnapshot === "boolean") {
      settings.autoSnapshot = parsed.autoSnapshot;
    }
    if (typeof parsed.maxSnapshots === "number") {
      settings.maxSnapshots = clampInteger(parsed.maxSnapshots, 5, 500, DEFAULT_MAX_SNAPSHOTS);
    }
    if (["title", "summary", "section", "full"].includes(parsed.defaultReferenceScope as string)) {
      settings.defaultReferenceScope = parsed.defaultReferenceScope as ReferenceScope;
    }
    if (EDGE_TYPES.includes(parsed.dragConnectEdgeType as EdgeType)) {
      settings.dragConnectEdgeType = parsed.dragConnectEdgeType as EdgeType;
    }
    if (typeof parsed.promptReferenceScopeOnCreate === "boolean") {
      settings.promptReferenceScopeOnCreate = parsed.promptReferenceScopeOnCreate;
    }
    if (typeof parsed.sectionReferenceWordCap === "number") {
      settings.sectionReferenceWordCap = clampInteger(
        parsed.sectionReferenceWordCap,
        50,
        1000,
        DEFAULT_SECTION_REFERENCE_WORD_CAP
      );
    }
    if (typeof parsed.contextLeanWordThreshold === "number") {
      settings.contextLeanWordThreshold = clampInteger(
        parsed.contextLeanWordThreshold,
        500,
        20000,
        DEFAULT_CONTEXT_LEAN_WORD_THRESHOLD
      );
    }
    if (typeof parsed.contextStandardWordThreshold === "number") {
      settings.contextStandardWordThreshold = clampInteger(
        parsed.contextStandardWordThreshold,
        1000,
        30000,
        DEFAULT_CONTEXT_STANDARD_WORD_THRESHOLD
      );
    }
    if (typeof parsed.contextRichWordThreshold === "number") {
      settings.contextRichWordThreshold = clampInteger(
        parsed.contextRichWordThreshold,
        1500,
        40000,
        DEFAULT_CONTEXT_RICH_WORD_THRESHOLD
      );
    }
    if (typeof parsed.contextSoftWarningWordThreshold === "number") {
      settings.contextSoftWarningWordThreshold = clampInteger(
        parsed.contextSoftWarningWordThreshold,
        1000,
        50000,
        DEFAULT_CONTEXT_SOFT_WARNING_THRESHOLD
      );
    }
    if (typeof parsed.contextHardWarningWordThreshold === "number") {
      settings.contextHardWarningWordThreshold = clampInteger(
        parsed.contextHardWarningWordThreshold,
        1500,
        60000,
        DEFAULT_CONTEXT_HARD_WARNING_THRESHOLD
      );
    }
    if (typeof parsed.cardSummaryMaxLength === "number") {
      settings.cardSummaryMaxLength = clampInteger(parsed.cardSummaryMaxLength, 80, 400, DEFAULT_CARD_SUMMARY_MAX_LENGTH);
    }
    if (typeof parsed.helperUnscopedReferenceThreshold === "number") {
      settings.helperUnscopedReferenceThreshold = clampInteger(
        parsed.helperUnscopedReferenceThreshold,
        1,
        20,
        DEFAULT_HELPER_UNSCOPED_REFERENCE_THRESHOLD
      );
    }
    if (typeof parsed.helperCooldownMs === "number") {
      settings.helperCooldownMs = clampInteger(parsed.helperCooldownMs, 10000, 300000, DEFAULT_HELPER_COOLDOWN_MS);
    }
    if (typeof parsed.helperMinEditDistance === "number") {
      settings.helperMinEditDistance = clampInteger(
        parsed.helperMinEditDistance,
        1,
        20,
        DEFAULT_HELPER_MIN_EDIT_DISTANCE
      );
    }
    if (typeof parsed.helperDismissForSession === "boolean") {
      settings.helperDismissForSession = parsed.helperDismissForSession;
    }
    if (KANBAN_GROUPINGS.includes(parsed.defaultKanbanGrouping as KanbanGrouping)) {
      settings.defaultKanbanGrouping = parsed.defaultKanbanGrouping as KanbanGrouping;
    }
    if (typeof parsed.dashboardSectionsCollapsedByDefault === "boolean") {
      settings.dashboardSectionsCollapsedByDefault = parsed.dashboardSectionsCollapsedByDefault;
    }
    if (typeof parsed.dashboardPreviewTruncationLength === "number") {
      settings.dashboardPreviewTruncationLength = clampInteger(
        parsed.dashboardPreviewTruncationLength,
        60,
        240,
        DEFAULT_DASHBOARD_PREVIEW_TRUNCATION_LENGTH
      );
    }
    if (typeof parsed.checklistDismissed === "boolean") {
      settings.checklistDismissed = parsed.checklistDismissed;
    }

    if (
      typeof settings.contextSoftWarningWordThreshold === "number" &&
      typeof settings.contextHardWarningWordThreshold === "number" &&
      settings.contextSoftWarningWordThreshold >= settings.contextHardWarningWordThreshold
    ) {
      settings.contextHardWarningWordThreshold = settings.contextSoftWarningWordThreshold + 250;
    }

    return settings;
  } catch {
    return {};
  }
}

function extractPersistedCanvasSettings(state: CanvasStore): PersistedCanvasSettings {
  return {
    editorFontSize: state.editorFontSize,
    spellCheck: state.spellCheck,
    autoSave: state.autoSave,
    showWordCount: state.showWordCount,
    exportIncludeBrainstorm: state.exportIncludeBrainstorm,
    exportIncludeCardDocs: state.exportIncludeCardDocs,
    exportIncludeAgentHints: state.exportIncludeAgentHints,
    exportGoalOverride: state.exportGoalOverride,
    exportFileNamePattern: state.exportFileNamePattern,
    exportTargetPath: state.exportTargetPath,
    saveBehaviorPreference: state.saveBehaviorPreference,
    defaultAgentHint: state.defaultAgentHint,
    agentHintExportMode: state.agentHintExportMode,
    suggestionMinDocWords: state.suggestionMinDocWords,
    suggestionKeywordAggressiveness: state.suggestionKeywordAggressiveness,
    summarySourcePreference: state.summarySourcePreference,
    excludedTags: state.excludedTags,
    disabledGovernorRules: state.disabledGovernorRules,
    governorBodyLineThreshold: state.governorBodyLineThreshold,
    governorHierarchyDepthThreshold: state.governorHierarchyDepthThreshold,
    governorReferenceChainDepthThreshold: state.governorReferenceChainDepthThreshold,
    governorRedundantOverlapThreshold: state.governorRedundantOverlapThreshold,
    autoSnapshot: state.autoSnapshot,
    maxSnapshots: state.maxSnapshots,
    defaultReferenceScope: state.defaultReferenceScope,
    dragConnectEdgeType: state.dragConnectEdgeType,
    promptReferenceScopeOnCreate: state.promptReferenceScopeOnCreate,
    sectionReferenceWordCap: state.sectionReferenceWordCap,
    contextLeanWordThreshold: state.contextLeanWordThreshold,
    contextStandardWordThreshold: state.contextStandardWordThreshold,
    contextRichWordThreshold: state.contextRichWordThreshold,
    contextSoftWarningWordThreshold: state.contextSoftWarningWordThreshold,
    contextHardWarningWordThreshold: state.contextHardWarningWordThreshold,
    cardSummaryMaxLength: state.cardSummaryMaxLength,
    helperUnscopedReferenceThreshold: state.helperUnscopedReferenceThreshold,
    helperCooldownMs: state.helperCooldownMs,
    helperMinEditDistance: state.helperMinEditDistance,
    helperDismissForSession: state.helperDismissForSession,
    defaultKanbanGrouping: state.defaultKanbanGrouping,
    dashboardSectionsCollapsedByDefault: state.dashboardSectionsCollapsedByDefault,
    dashboardPreviewTruncationLength: state.dashboardPreviewTruncationLength,
    checklistDismissed: state.checklistDismissed,
  };
}

function persistCanvasSettings(state: CanvasStore) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      CANVAS_SETTINGS_STORAGE_KEY,
      JSON.stringify(extractPersistedCanvasSettings(state))
    );
  } catch {
    // localStorage may be unavailable
  }
}

function sanitizeExportFileNamePattern(value: string): string {
  const trimmed = value.trim().replace(/[\\/]+/g, "-");
  return trimmed ? trimmed : DEFAULT_EXPORT_FILENAME_PATTERN;
}

const persistedSettings = parseStoredSettings();

export const useCanvasStore = create<CanvasStore>()(
  temporal(
    (set, get) => ({
      cards: [],
      addCard: (type, title, position) => {
        const id = uuid();
        const defaultAgentHint = get().defaultAgentHint.trim();
        const card: Card = {
          id,
          type,
          title,
          body: "",
          position,
          collapsed: false,
          hasDoc: false,
          docContent: "",
          agentHint: defaultAgentHint ? defaultAgentHint : undefined,
        };
        set((state) => ({
          cards: [...state.cards, card],
          isDirty: true,
          editVersion: state.editVersion + 1,
        }));
        return id;
      },
      updateCard: (id, updates) =>
        set((state) => ({
          cards: state.cards.map((card) => (card.id === id ? { ...card, ...updates } : card)),
          isDirty: true,
          editVersion: state.editVersion + 1,
        })),
      removeCard: (id) =>
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== id),
          edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
          openEditors: state.openEditors.filter((editor) => editor.cardId !== id),
          isDirty: true,
          editVersion: state.editVersion + 1,
        })),
      getCard: (id) => get().cards.find((card) => card.id === id),

      edges: [],
      addEdge: (source, target, edgeType = "hierarchy", referenceScope, referenceSectionHint) => {
        const id = uuid();
        const defaultReferenceScope = get().defaultReferenceScope;
        const edge: Edge = {
          id,
          source,
          target,
          edgeType,
          sourceArrow: edgeType === "reference" ? false : undefined,
          targetArrow: edgeType === "reference" ? false : true,
          referenceScope: edgeType === "reference" ? (referenceScope ?? defaultReferenceScope) : undefined,
          referenceSectionHint: edgeType === "reference" ? referenceSectionHint : undefined,
        };
        set((state) => ({
          edges: [...state.edges, edge],
          isDirty: true,
          editVersion: state.editVersion + 1,
        }));
      },
      removeEdge: (id) =>
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== id),
          isDirty: true,
          editVersion: state.editVersion + 1,
        })),
      updateEdge: (id, updates) =>
        set((state) => ({
          edges: state.edges.map((edge) => (edge.id === id ? { ...edge, ...updates } : edge)),
          isDirty: true,
          editVersion: state.editVersion + 1,
        })),

      editorMode: "select",
      setEditorMode: (mode) => set({ editorMode: mode }),

      openEditors: [],
      openEditor: (cardId, position) =>
        set((state) => {
          if (state.openEditors.some((editor) => editor.cardId === cardId)) {
            return state;
          }

          return { openEditors: [...state.openEditors, { cardId, position }] };
        }),
      closeEditor: (cardId) =>
        set((state) => ({
          openEditors: state.openEditors.filter((editor) => editor.cardId !== cardId),
        })),
      ghostPreviewMode: null,
      setGhostPreviewMode: (mode) =>
        set((state) => ({
          ghostPreviewMode: mode,
          hasUsedGhostPreview: mode === null ? state.hasUsedGhostPreview : true,
        })),
      hasUsedGhostPreview: false,

      viewport: { x: 0, y: 0, zoom: 1 },
      setViewport: (viewport) => set({ viewport }),

      snapToGrid: true,
      toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
      showGrid: true,
      toggleShowGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      showMinimap: true,
      toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),

      isDirty: false,
      markClean: () => set({ isDirty: false }),
      editVersion: 0,

      dismissedHelpers: [],
      dismissHelper: (helperId) =>
        set((state) => ({
          dismissedHelpers: state.dismissedHelpers.includes(helperId)
            ? state.dismissedHelpers
            : [...state.dismissedHelpers, helperId],
        })),
      resetHelpers: () => set({ dismissedHelpers: [] }),
      checklistDismissed: persistedSettings.checklistDismissed ?? false,
      dismissChecklist: () => set({ checklistDismissed: true }),
      lastExportedContextMd: null,
      setLastExportedContextMd: (md) => set({ lastExportedContextMd: md }),
      addComment: (cardId, text, author) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  comments: [
                    ...(Array.isArray(card.comments) ? card.comments : []),
                    {
                      id: uuid(),
                      text,
                      timestamp: Date.now(),
                      author: author?.trim() ? author.trim() : undefined,
                    },
                  ],
                }
              : card
          ),
          isDirty: true,
          editVersion: state.editVersion + 1,
        })),
      removeComment: (cardId, commentId) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  comments: (card.comments ?? []).filter((comment) => comment.id !== commentId),
                }
              : card
          ),
          isDirty: true,
          editVersion: state.editVersion + 1,
        })),
      toastMessage: null,
      showToast: (message) => set({ toastMessage: message }),
      dismissToast: () => set({ toastMessage: null }),

      // Settings — Editor
      editorFontSize: persistedSettings.editorFontSize ?? 14,
      setEditorFontSize: (size) =>
        set({
          editorFontSize: clampInteger(size, 12, 18, 14),
        }),
      spellCheck: persistedSettings.spellCheck ?? true,
      toggleSpellCheck: () => set((state) => ({ spellCheck: !state.spellCheck })),
      autoSave: persistedSettings.autoSave ?? true,
      toggleAutoSave: () => set((state) => ({ autoSave: !state.autoSave })),
      showWordCount: persistedSettings.showWordCount ?? false,
      toggleShowWordCount: () => set((state) => ({ showWordCount: !state.showWordCount })),

      // Settings — Export
      exportIncludeBrainstorm: persistedSettings.exportIncludeBrainstorm ?? false,
      toggleExportIncludeBrainstorm: () =>
        set((state) => ({ exportIncludeBrainstorm: !state.exportIncludeBrainstorm })),
      exportIncludeCardDocs: persistedSettings.exportIncludeCardDocs ?? true,
      toggleExportIncludeCardDocs: () =>
        set((state) => ({ exportIncludeCardDocs: !state.exportIncludeCardDocs })),
      exportIncludeAgentHints: persistedSettings.exportIncludeAgentHints ?? true,
      toggleExportIncludeAgentHints: () =>
        set((state) => ({ exportIncludeAgentHints: !state.exportIncludeAgentHints })),
      exportGoalOverride: persistedSettings.exportGoalOverride ?? "auto",
      setExportGoalOverride: (value) => set({ exportGoalOverride: value }),
      exportFileNamePattern: persistedSettings.exportFileNamePattern ?? DEFAULT_EXPORT_FILENAME_PATTERN,
      setExportFileNamePattern: (value) =>
        set({
          exportFileNamePattern: sanitizeExportFileNamePattern(value),
        }),
      exportTargetPath: persistedSettings.exportTargetPath ?? "",
      setExportTargetPath: (path) => set({ exportTargetPath: path }),
      saveBehaviorPreference: persistedSettings.saveBehaviorPreference ?? DEFAULT_SAVE_BEHAVIOR_PREFERENCE,
      setSaveBehaviorPreference: (value) => set({ saveBehaviorPreference: value }),

      // Settings — Agent
      defaultAgentHint: persistedSettings.defaultAgentHint ?? "",
      setDefaultAgentHint: (value) => set({ defaultAgentHint: value }),
      agentHintExportMode: persistedSettings.agentHintExportMode ?? "inline",
      setAgentHintExportMode: (value) => set({ agentHintExportMode: value }),
      suggestionMinDocWords: persistedSettings.suggestionMinDocWords ?? DEFAULT_SUGGESTION_MIN_DOC_WORDS,
      setSuggestionMinDocWords: (value) =>
        set({
          suggestionMinDocWords: clampInteger(value, 20, 400, DEFAULT_SUGGESTION_MIN_DOC_WORDS),
        }),
      suggestionKeywordAggressiveness:
        persistedSettings.suggestionKeywordAggressiveness ?? DEFAULT_SUGGESTION_KEYWORD_AGGRESSIVENESS,
      setSuggestionKeywordAggressiveness: (value) =>
        set({
          suggestionKeywordAggressiveness: clampInteger(
            value,
            1,
            3,
            DEFAULT_SUGGESTION_KEYWORD_AGGRESSIVENESS
          ),
        }),
      summarySourcePreference: persistedSettings.summarySourcePreference ?? DEFAULT_SUMMARY_SOURCE_PREFERENCE,
      setSummarySourcePreference: (value) => set({ summarySourcePreference: value }),

      // Settings — Tags
      excludedTags: persistedSettings.excludedTags ?? [],
      toggleTagExclusion: (tag) =>
        set((state) => ({
          excludedTags: state.excludedTags.includes(tag)
            ? state.excludedTags.filter((value) => value !== tag)
            : [...state.excludedTags, tag],
        })),

      // Settings — Governor
      disabledGovernorRules: persistedSettings.disabledGovernorRules ?? [],
      toggleGovernorRule: (rule) =>
        set((state) => ({
          disabledGovernorRules: state.disabledGovernorRules.includes(rule)
            ? state.disabledGovernorRules.filter((value) => value !== rule)
            : [...state.disabledGovernorRules, rule],
        })),
      governorBodyLineThreshold:
        persistedSettings.governorBodyLineThreshold ?? DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD,
      setGovernorBodyLineThreshold: (value) =>
        set({
          governorBodyLineThreshold: clampInteger(value, 1, 12, DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD),
        }),
      governorHierarchyDepthThreshold:
        persistedSettings.governorHierarchyDepthThreshold ?? DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD,
      setGovernorHierarchyDepthThreshold: (value) =>
        set({
          governorHierarchyDepthThreshold: clampInteger(
            value,
            2,
            8,
            DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD
          ),
        }),
      governorReferenceChainDepthThreshold:
        persistedSettings.governorReferenceChainDepthThreshold ?? DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD,
      setGovernorReferenceChainDepthThreshold: (value) =>
        set({
          governorReferenceChainDepthThreshold: clampInteger(
            value,
            2,
            8,
            DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD
          ),
        }),
      governorRedundantOverlapThreshold:
        persistedSettings.governorRedundantOverlapThreshold ?? DEFAULT_GOVERNOR_REDUNDANT_OVERLAP_THRESHOLD,
      setGovernorRedundantOverlapThreshold: (value) =>
        set({
          governorRedundantOverlapThreshold: clampFloat(
            value,
            0.2,
            0.95,
            DEFAULT_GOVERNOR_REDUNDANT_OVERLAP_THRESHOLD
          ),
        }),

      // Settings — History
      autoSnapshot: persistedSettings.autoSnapshot ?? true,
      toggleAutoSnapshot: () => set((state) => ({ autoSnapshot: !state.autoSnapshot })),
      maxSnapshots: persistedSettings.maxSnapshots ?? DEFAULT_MAX_SNAPSHOTS,
      setMaxSnapshots: (value) =>
        set({
          maxSnapshots: clampInteger(value, 5, 500, DEFAULT_MAX_SNAPSHOTS),
        }),

      // Settings — Native UX
      defaultReferenceScope: persistedSettings.defaultReferenceScope ?? DEFAULT_REFERENCE_SCOPE,
      setDefaultReferenceScope: (scope) => set({ defaultReferenceScope: scope }),
      dragConnectEdgeType: persistedSettings.dragConnectEdgeType ?? DEFAULT_DRAG_CONNECT_EDGE_TYPE,
      setDragConnectEdgeType: (value) => set({ dragConnectEdgeType: value }),
      promptReferenceScopeOnCreate:
        persistedSettings.promptReferenceScopeOnCreate ?? DEFAULT_PROMPT_REFERENCE_SCOPE_ON_CREATE,
      togglePromptReferenceScopeOnCreate: () =>
        set((state) => ({ promptReferenceScopeOnCreate: !state.promptReferenceScopeOnCreate })),
      sectionReferenceWordCap: persistedSettings.sectionReferenceWordCap ?? DEFAULT_SECTION_REFERENCE_WORD_CAP,
      setSectionReferenceWordCap: (value) =>
        set({
          sectionReferenceWordCap: clampInteger(value, 50, 1000, DEFAULT_SECTION_REFERENCE_WORD_CAP),
        }),
      contextLeanWordThreshold:
        persistedSettings.contextLeanWordThreshold ?? DEFAULT_CONTEXT_LEAN_WORD_THRESHOLD,
      setContextLeanWordThreshold: (value) =>
        set({
          contextLeanWordThreshold: clampInteger(value, 500, 20000, DEFAULT_CONTEXT_LEAN_WORD_THRESHOLD),
        }),
      contextStandardWordThreshold:
        persistedSettings.contextStandardWordThreshold ?? DEFAULT_CONTEXT_STANDARD_WORD_THRESHOLD,
      setContextStandardWordThreshold: (value) =>
        set({
          contextStandardWordThreshold: clampInteger(
            value,
            1000,
            30000,
            DEFAULT_CONTEXT_STANDARD_WORD_THRESHOLD
          ),
        }),
      contextRichWordThreshold:
        persistedSettings.contextRichWordThreshold ?? DEFAULT_CONTEXT_RICH_WORD_THRESHOLD,
      setContextRichWordThreshold: (value) =>
        set({
          contextRichWordThreshold: clampInteger(value, 1500, 40000, DEFAULT_CONTEXT_RICH_WORD_THRESHOLD),
        }),
      contextSoftWarningWordThreshold:
        persistedSettings.contextSoftWarningWordThreshold ?? DEFAULT_CONTEXT_SOFT_WARNING_THRESHOLD,
      setContextSoftWarningWordThreshold: (value) =>
        set((state) => {
          const nextValue = clampInteger(value, 1000, 50000, DEFAULT_CONTEXT_SOFT_WARNING_THRESHOLD);
          return {
            contextSoftWarningWordThreshold: Math.min(nextValue, state.contextHardWarningWordThreshold - 250),
          };
        }),
      contextHardWarningWordThreshold:
        persistedSettings.contextHardWarningWordThreshold ?? DEFAULT_CONTEXT_HARD_WARNING_THRESHOLD,
      setContextHardWarningWordThreshold: (value) =>
        set((state) => {
          const nextValue = clampInteger(value, 1500, 60000, DEFAULT_CONTEXT_HARD_WARNING_THRESHOLD);
          return {
            contextHardWarningWordThreshold: Math.max(nextValue, state.contextSoftWarningWordThreshold + 250),
          };
        }),
      cardSummaryMaxLength: persistedSettings.cardSummaryMaxLength ?? DEFAULT_CARD_SUMMARY_MAX_LENGTH,
      setCardSummaryMaxLength: (value) =>
        set({
          cardSummaryMaxLength: clampInteger(value, 80, 400, DEFAULT_CARD_SUMMARY_MAX_LENGTH),
        }),
      helperUnscopedReferenceThreshold:
        persistedSettings.helperUnscopedReferenceThreshold ?? DEFAULT_HELPER_UNSCOPED_REFERENCE_THRESHOLD,
      setHelperUnscopedReferenceThreshold: (value) =>
        set({
          helperUnscopedReferenceThreshold: clampInteger(
            value,
            1,
            20,
            DEFAULT_HELPER_UNSCOPED_REFERENCE_THRESHOLD
          ),
        }),
      helperCooldownMs: persistedSettings.helperCooldownMs ?? DEFAULT_HELPER_COOLDOWN_MS,
      setHelperCooldownMs: (value) =>
        set({
          helperCooldownMs: clampInteger(value, 10000, 300000, DEFAULT_HELPER_COOLDOWN_MS),
        }),
      helperMinEditDistance: persistedSettings.helperMinEditDistance ?? DEFAULT_HELPER_MIN_EDIT_DISTANCE,
      setHelperMinEditDistance: (value) =>
        set({
          helperMinEditDistance: clampInteger(value, 1, 20, DEFAULT_HELPER_MIN_EDIT_DISTANCE),
        }),
      helperDismissForSession:
        persistedSettings.helperDismissForSession ?? DEFAULT_HELPER_DISMISS_FOR_SESSION,
      toggleHelperDismissForSession: () =>
        set((state) => ({ helperDismissForSession: !state.helperDismissForSession })),
      defaultKanbanGrouping: persistedSettings.defaultKanbanGrouping ?? DEFAULT_KANBAN_GROUPING,
      setDefaultKanbanGrouping: (value) => set({ defaultKanbanGrouping: value }),
      dashboardSectionsCollapsedByDefault:
        persistedSettings.dashboardSectionsCollapsedByDefault ?? DEFAULT_DASHBOARD_SECTIONS_COLLAPSED,
      toggleDashboardSectionsCollapsedByDefault: () =>
        set((state) => ({
          dashboardSectionsCollapsedByDefault: !state.dashboardSectionsCollapsedByDefault,
        })),
      dashboardPreviewTruncationLength:
        persistedSettings.dashboardPreviewTruncationLength ?? DEFAULT_DASHBOARD_PREVIEW_TRUNCATION_LENGTH,
      setDashboardPreviewTruncationLength: (value) =>
        set({
          dashboardPreviewTruncationLength: clampInteger(
            value,
            60,
            240,
            DEFAULT_DASHBOARD_PREVIEW_TRUNCATION_LENGTH
          ),
        }),

      loadState: (cards, edges, viewport) =>
        set({
          cards,
          edges,
          viewport,
          openEditors: [],
          ghostPreviewMode: null,
          hasUsedGhostPreview: false,
          isDirty: false,
          dismissedHelpers: [],
          editVersion: 0,
        }),
      clearAll: () =>
        set({
          cards: [],
          edges: [],
          openEditors: [],
          ghostPreviewMode: null,
          hasUsedGhostPreview: false,
          viewport: { x: 0, y: 0, zoom: 1 },
          isDirty: false,
          dismissedHelpers: [],
          editVersion: 0,
        }),
    }),
    {
      partialize: (state) => ({
        cards: state.cards,
        edges: state.edges,
      }),
      limit: 50,
    }
  )
);

useCanvasStore.subscribe((state) => {
  persistCanvasSettings(state);
});
