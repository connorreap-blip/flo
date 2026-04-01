import { create } from "zustand";
import { temporal } from "zundo";
import { v4 as uuid } from "uuid";
import type { Card, Edge, CanvasViewport, EditorState } from "../lib/types";
import type { CardType } from "../lib/constants";

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
  disabledGovernorRules: string[];
  toggleGovernorRule: (rule: string) => void;

  // Settings — History
  autoSnapshot: boolean;
  toggleAutoSnapshot: () => void;
  maxSnapshots: number;
  setMaxSnapshots: (n: number) => void;

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
    const card: Card = {
      id,
      type,
      title,
      body: "",
      position,
      collapsed: false,
      hasDoc: false,
      docContent: "",
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
    const edge: Edge = {
      id,
      source,
      target,
      edgeType,
      sourceArrow: edgeType === "reference" ? false : undefined,
      targetArrow: edgeType === "reference" ? false : true,
      referenceScope: edgeType === "reference" ? (referenceScope ?? "summary") : undefined,
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

  // Settings — History
  autoSnapshot: true,
  toggleAutoSnapshot: () => set((s) => ({ autoSnapshot: !s.autoSnapshot })),
  maxSnapshots: 50,
  setMaxSnapshots: (n) => set({ maxSnapshots: n }),

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
