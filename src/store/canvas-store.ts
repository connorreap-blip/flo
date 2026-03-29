import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { Card, Edge, CanvasViewport, ProjectMeta, EditorState } from "../lib/types";
import type { CardType } from "../lib/constants";

interface CanvasStore {
  // Project
  project: ProjectMeta;
  setProject: (project: ProjectMeta) => void;

  // Cards
  cards: Card[];
  addCard: (type: CardType, title: string, position: { x: number; y: number }) => string;
  updateCard: (id: string, updates: Partial<Card>) => void;
  removeCard: (id: string) => void;
  getCard: (id: string) => Card | undefined;

  // Edges
  edges: Edge[];
  addEdge: (source: string, target: string) => void;
  removeEdge: (id: string) => void;

  // Editor
  openEditors: EditorState[];
  openEditor: (cardId: string, position: { x: number; y: number }) => void;
  closeEditor: (cardId: string) => void;

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

  // Bulk load (for loading from disk)
  loadState: (cards: Card[], edges: Edge[], viewport: CanvasViewport) => void;
  clearAll: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  project: { name: "Untitled Map", dirPath: null },
  setProject: (project) => set({ project }),

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
  addEdge: (source, target) => {
    const id = uuid();
    set((s) => ({ edges: [...s.edges, { id, source, target }], isDirty: true }));
  },
  removeEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      isDirty: true,
    })),

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

  loadState: (cards, edges, viewport) => set({ cards, edges, viewport, isDirty: false }),
  clearAll: () =>
    set({
      cards: [],
      edges: [],
      openEditors: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      isDirty: false,
      project: { name: "Untitled Map", dirPath: null },
    }),
}));
