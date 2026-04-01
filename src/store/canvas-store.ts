import { create } from "zustand";
import { temporal } from "zundo";
import { v4 as uuid } from "uuid";
import type { Card, Edge, CanvasViewport, EditorState, ReferenceScope } from "../lib/types";
import type { CardType } from "../lib/constants";
import type { GovernorRuleId } from "../lib/native-settings";
import {
  DEFAULT_CARD_SUMMARY_MAX_LENGTH,
  DEFAULT_CONTEXT_LEAN_WORD_THRESHOLD,
  DEFAULT_CONTEXT_RICH_WORD_THRESHOLD,
  DEFAULT_CONTEXT_STANDARD_WORD_THRESHOLD,
  DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD,
  DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD,
  DEFAULT_GOVERNOR_REDUNDANT_OVERLAP_THRESHOLD,
  DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD,
  DEFAULT_HELPER_UNSCOPED_REFERENCE_THRESHOLD,
  DEFAULT_REFERENCE_SCOPE,
  DEFAULT_SECTION_REFERENCE_WORD_CAP,
  clampFloat,
  clampInteger,
} from "../lib/native-settings";

export type AgentHintExportMode = "inline" | "section" | "hidden";
export type ExportGoalOverride = "auto" | "implementation" | "review" | "brainstorm";

interface CanvasStore {
  // Cards
  cards: Card[];
  addCard: (type: CardType, title: string, position: { x: number; y: number }) => string;
  updateCard: (id: string, updates: Partial<Card>) => void;
  removeCard: (id: string) => void;
  getCard: (id: string) => Card | undefined;

  // Edges
  edges: Edge[];
  addEdge: (source: string, target: string, edgeType?: import("../lib/types").EdgeType, referenceScope?: import("../lib/types").ReferenceScope, referenceSectionHint?: string) => void;
  removeEdge: (id: string) => void;
  updateEdge: (id: string, updates: Partial<Edge>) => void;

  // Editor mode
  editorMode: "select" | "pan";
  setEditorMode: (mode: "select" | "pan") => void;

  // Editor
  openEditors: EditorState[];
  openEditor: (cardId: string, position: { x: number; y: number }) => void;
  closeEditor: (cardId: string) => void;
  ghostPreviewMode: null | "read" | "cost";
  setGhostPreviewMode: (mode: null | "read" | "cost") => void;

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

  // Helpers
  dismissedHelpers: string[];
  dismissHelper: (helperId: string) => void;
  resetHelpers: () => void;
  addComment: (cardId: string, text: string, author?: string) => void;
  removeComment: (cardId: string, commentId: string) => void;

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
  setExportGoalOverride: (v: ExportGoalOverride) => void;

  // Settings — Agent
  defaultAgentHint: string;
  setDefaultAgentHint: (v: string) => void;
  agentHintExportMode: AgentHintExportMode;
  setAgentHintExportMode: (v: AgentHintExportMode) => void;

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
  setMaxSnapshots: (n: number) => void;

  // Settings — Native UX
  defaultReferenceScope: ReferenceScope;
  setDefaultReferenceScope: (scope: ReferenceScope) => void;
  sectionReferenceWordCap: number;
  setSectionReferenceWordCap: (value: number) => void;
  contextLeanWordThreshold: number;
  setContextLeanWordThreshold: (value: number) => void;
  contextStandardWordThreshold: number;
  setContextStandardWordThreshold: (value: number) => void;
  contextRichWordThreshold: number;
  setContextRichWordThreshold: (value: number) => void;
  cardSummaryMaxLength: number;
  setCardSummaryMaxLength: (value: number) => void;
  helperUnscopedReferenceThreshold: number;
  setHelperUnscopedReferenceThreshold: (value: number) => void;

  // Bulk load (for loading from disk)
  loadState: (cards: Card[], edges: Edge[], viewport: CanvasViewport) => void;
  clearAll: () => void;
}

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
    set((s) => ({ cards: [...s.cards, card], isDirty: true }));
    return id;
  },
  updateCard: (id, updates) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      isDirty: true,
    })),
  removeCard: (id) =>
    set((s) => ({
      cards: s.cards.filter((c) => c.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      openEditors: s.openEditors.filter((e) => e.cardId !== id),
      isDirty: true,
    })),
  getCard: (id) => get().cards.find((c) => c.id === id),

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
    set((s) => ({ edges: [...s.edges, edge], isDirty: true }));
  },
  removeEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      isDirty: true,
    })),
  updateEdge: (id, updates) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      isDirty: true,
    })),

  editorMode: "select",
  setEditorMode: (mode) => set({ editorMode: mode }),

  openEditors: [],
  openEditor: (cardId, position) =>
    set((s) => {
      if (s.openEditors.some((e) => e.cardId === cardId)) return s;
      return { openEditors: [...s.openEditors, { cardId, position }] };
    }),
  closeEditor: (cardId) =>
    set((s) => ({
      openEditors: s.openEditors.filter((e) => e.cardId !== cardId),
    })),
  ghostPreviewMode: null,
  setGhostPreviewMode: (mode) => set({ ghostPreviewMode: mode }),

  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (viewport) => set({ viewport }),

  snapToGrid: true,
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  showGrid: true,
  toggleShowGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  showMinimap: true,
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),

  isDirty: false,
  markClean: () => set({ isDirty: false }),

  // Settings — Editor
  editorFontSize: 14,
  setEditorFontSize: (size) => set({ editorFontSize: size }),
  spellCheck: true,
  toggleSpellCheck: () => set((s) => ({ spellCheck: !s.spellCheck })),
  autoSave: true,
  toggleAutoSave: () => set((s) => ({ autoSave: !s.autoSave })),
  showWordCount: false,
  toggleShowWordCount: () => set((s) => ({ showWordCount: !s.showWordCount })),

  // Settings — Export
  exportIncludeBrainstorm: false,
  toggleExportIncludeBrainstorm: () => set((s) => ({ exportIncludeBrainstorm: !s.exportIncludeBrainstorm })),
  exportIncludeCardDocs: true,
  toggleExportIncludeCardDocs: () => set((s) => ({ exportIncludeCardDocs: !s.exportIncludeCardDocs })),
  exportIncludeAgentHints: true,
  toggleExportIncludeAgentHints: () => set((s) => ({ exportIncludeAgentHints: !s.exportIncludeAgentHints })),
  exportGoalOverride: "auto",
  setExportGoalOverride: (v) => set({ exportGoalOverride: v }),

  // Settings — Agent
  defaultAgentHint: "",
  setDefaultAgentHint: (v) => set({ defaultAgentHint: v }),
  agentHintExportMode: "inline",
  setAgentHintExportMode: (v) => set({ agentHintExportMode: v }),

  // Settings — Tags
  excludedTags: [],
  toggleTagExclusion: (tag) =>
    set((s) => ({
      excludedTags: s.excludedTags.includes(tag)
        ? s.excludedTags.filter((t) => t !== tag)
        : [...s.excludedTags, tag],
    })),

  // Settings — Governor
  disabledGovernorRules: [],
  toggleGovernorRule: (rule) =>
    set((s) => ({
      disabledGovernorRules: s.disabledGovernorRules.includes(rule)
        ? s.disabledGovernorRules.filter((r) => r !== rule)
        : [...s.disabledGovernorRules, rule],
    })),
  governorBodyLineThreshold: DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD,
  setGovernorBodyLineThreshold: (value) =>
    set({
      governorBodyLineThreshold: clampInteger(
        value,
        1,
        12,
        DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD
      ),
    }),
  governorHierarchyDepthThreshold: DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD,
  setGovernorHierarchyDepthThreshold: (value) =>
    set({
      governorHierarchyDepthThreshold: clampInteger(
        value,
        2,
        8,
        DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD
      ),
    }),
  governorReferenceChainDepthThreshold: DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD,
  setGovernorReferenceChainDepthThreshold: (value) =>
    set({
      governorReferenceChainDepthThreshold: clampInteger(
        value,
        2,
        8,
        DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD
      ),
    }),
  governorRedundantOverlapThreshold: DEFAULT_GOVERNOR_REDUNDANT_OVERLAP_THRESHOLD,
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
  autoSnapshot: true,
  toggleAutoSnapshot: () => set((s) => ({ autoSnapshot: !s.autoSnapshot })),
  maxSnapshots: 50,
  setMaxSnapshots: (n) => set({ maxSnapshots: n }),

  // Settings — Native UX
  defaultReferenceScope: DEFAULT_REFERENCE_SCOPE,
  setDefaultReferenceScope: (scope) => set({ defaultReferenceScope: scope }),
  sectionReferenceWordCap: DEFAULT_SECTION_REFERENCE_WORD_CAP,
  setSectionReferenceWordCap: (value) =>
    set({
      sectionReferenceWordCap: clampInteger(
        value,
        50,
        1000,
        DEFAULT_SECTION_REFERENCE_WORD_CAP
      ),
    }),
  contextLeanWordThreshold: DEFAULT_CONTEXT_LEAN_WORD_THRESHOLD,
  setContextLeanWordThreshold: (value) =>
    set({
      contextLeanWordThreshold: clampInteger(
        value,
        500,
        20000,
        DEFAULT_CONTEXT_LEAN_WORD_THRESHOLD
      ),
    }),
  contextStandardWordThreshold: DEFAULT_CONTEXT_STANDARD_WORD_THRESHOLD,
  setContextStandardWordThreshold: (value) =>
    set({
      contextStandardWordThreshold: clampInteger(
        value,
        1000,
        30000,
        DEFAULT_CONTEXT_STANDARD_WORD_THRESHOLD
      ),
    }),
  contextRichWordThreshold: DEFAULT_CONTEXT_RICH_WORD_THRESHOLD,
  setContextRichWordThreshold: (value) =>
    set({
      contextRichWordThreshold: clampInteger(
        value,
        1500,
        40000,
        DEFAULT_CONTEXT_RICH_WORD_THRESHOLD
      ),
    }),
  cardSummaryMaxLength: DEFAULT_CARD_SUMMARY_MAX_LENGTH,
  setCardSummaryMaxLength: (value) =>
    set({
      cardSummaryMaxLength: clampInteger(
        value,
        80,
        400,
        DEFAULT_CARD_SUMMARY_MAX_LENGTH
      ),
    }),
  helperUnscopedReferenceThreshold: DEFAULT_HELPER_UNSCOPED_REFERENCE_THRESHOLD,
  setHelperUnscopedReferenceThreshold: (value) =>
    set({
      helperUnscopedReferenceThreshold: clampInteger(
        value,
        1,
        20,
        DEFAULT_HELPER_UNSCOPED_REFERENCE_THRESHOLD
      ),
    }),

  dismissedHelpers: [],
  dismissHelper: (helperId) =>
    set((s) => ({
      dismissedHelpers: [...s.dismissedHelpers, helperId],
    })),
  resetHelpers: () => set({ dismissedHelpers: [] }),
  addComment: (cardId, text, author) =>
    set((s) => ({
      cards: s.cards.map((card) =>
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
    })),
  removeComment: (cardId, commentId) =>
    set((s) => ({
      cards: s.cards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              comments: (card.comments ?? []).filter((comment) => comment.id !== commentId),
            }
          : card
      ),
      isDirty: true,
    })),

  loadState: (cards, edges, viewport) =>
    set({
      cards,
      edges,
      viewport,
      openEditors: [],
      ghostPreviewMode: null,
      isDirty: false,
    }),
  clearAll: () =>
    set({
      cards: [],
      edges: [],
      openEditors: [],
      ghostPreviewMode: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      isDirty: false,
      dismissedHelpers: [],
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
