import { v4 as uuid } from "uuid";
import { create } from "zustand";
import { CARD_TYPES, type CardType } from "../lib/constants";
import type { Card, EdgeType } from "../lib/types";
import { useCanvasStore } from "./canvas-store";

type ActivityAction = "add" | "edit" | "delete";

interface ActivityEntryBase {
  id: string;
  timestamp: number;
  action: ActivityAction;
}

export interface CardActivityEntry extends ActivityEntryBase {
  subject: "card";
  cardTitle: string;
  cardType: CardType;
}

export interface EdgeActivityEntry extends ActivityEntryBase {
  subject: "edge";
  edgeType: EdgeType;
  sourceTitle: string;
  targetTitle: string;
}

export type ActivityEntry = CardActivityEntry | EdgeActivityEntry;
type ActivityInput = Omit<CardActivityEntry, "id" | "timestamp"> | Omit<EdgeActivityEntry, "id" | "timestamp">;

interface DashboardStore {
  cardCountByType: Record<CardType, number>;
  edgeCount: number;
  totalWordCount: number;
  activityLog: ActivityEntry[];
  lastEditedAt: number | null;
  addActivity: (entry: ActivityInput) => void;
  recompute: () => void;
  touch: (timestamp?: number) => void;
}

function createEmptyCounts(): Record<CardType, number> {
  return CARD_TYPES.reduce((counts, type) => {
    counts[type] = 0;
    return counts;
  }, {} as Record<CardType, number>);
}

function countWords(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function getCardLabel(card: Card): string {
  return card.title.trim() || "Untitled";
}

function getCardLabelById(cardId: string, cards: Map<string, Card>): string {
  const card = cards.get(cardId);
  return card ? getCardLabel(card) : "Untitled";
}

function hasMeaningfulCardChange(previous: Card, next: Card): boolean {
  return (
    previous.title !== next.title ||
    previous.body !== next.body ||
    previous.docContent !== next.docContent ||
    previous.type !== next.type ||
    previous.hasDoc !== next.hasDoc
  );
}

export const useDashboardStore = create<DashboardStore>()((set) => ({
  cardCountByType: createEmptyCounts(),
  edgeCount: 0,
  totalWordCount: 0,
  activityLog: [],
  lastEditedAt: null,

  addActivity: (entry) =>
    set((state) => {
      const activity: ActivityEntry =
        entry.subject === "card"
          ? {
              ...entry,
              id: uuid(),
              timestamp: Date.now(),
            }
          : {
              ...entry,
              id: uuid(),
              timestamp: Date.now(),
            };

      return {
        activityLog: [activity, ...state.activityLog].slice(0, 50),
      };
    }),

  recompute: () => {
    const { cards, edges } = useCanvasStore.getState();
    const counts = createEmptyCounts();
    let totalWordCount = 0;

    for (const card of cards) {
      counts[card.type] += 1;
      totalWordCount += countWords(`${card.title} ${card.body} ${card.docContent}`);
    }

    set({
      cardCountByType: counts,
      edgeCount: edges.length,
      totalWordCount,
    });
  },

  touch: (timestamp = Date.now()) => set({ lastEditedAt: timestamp }),
}));

useDashboardStore.getState().recompute();

useCanvasStore.subscribe((state, previousState) => {
  if (state.cards === previousState.cards && state.edges === previousState.edges) {
    return;
  }

  const dashboard = useDashboardStore.getState();
  const previousCards = new Map(previousState.cards.map((card) => [card.id, card]));
  const nextCards = new Map(state.cards.map((card) => [card.id, card]));
  const previousEdges = new Map(previousState.edges.map((edge) => [edge.id, edge]));
  const nextEdges = new Map(state.edges.map((edge) => [edge.id, edge]));

  if (state.isDirty || previousState.isDirty) {
    for (const card of state.cards) {
      const previous = previousCards.get(card.id);
      if (!previous) {
        dashboard.addActivity({
          subject: "card",
          action: "add",
          cardTitle: getCardLabel(card),
          cardType: card.type,
        });
        continue;
      }

      if (hasMeaningfulCardChange(previous, card)) {
        dashboard.addActivity({
          subject: "card",
          action: "edit",
          cardTitle: getCardLabel(card),
          cardType: card.type,
        });
      }
    }

    for (const card of previousState.cards) {
      if (!nextCards.has(card.id)) {
        dashboard.addActivity({
          subject: "card",
          action: "delete",
          cardTitle: getCardLabel(card),
          cardType: card.type,
        });
      }
    }

    for (const edge of state.edges) {
      if (!previousEdges.has(edge.id)) {
        dashboard.addActivity({
          subject: "edge",
          action: "add",
          edgeType: edge.edgeType,
          sourceTitle: getCardLabelById(edge.source, nextCards),
          targetTitle: getCardLabelById(edge.target, nextCards),
        });
      }
    }

    for (const edge of previousState.edges) {
      if (!nextEdges.has(edge.id)) {
        dashboard.addActivity({
          subject: "edge",
          action: "delete",
          edgeType: edge.edgeType,
          sourceTitle: getCardLabelById(edge.source, previousCards),
          targetTitle: getCardLabelById(edge.target, previousCards),
        });
      }
    }

    dashboard.touch();
  }

  dashboard.recompute();
});
