import type { Card, Edge } from "./types";
import type { CardType } from "./constants";
import { DEFAULT_CARD_SUMMARY_MAX_LENGTH } from "./native-settings";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMeaningfulSentence(text: string): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return null;
  }

  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  return sentence || cleaned;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const clipped = text.slice(0, maxLength).replace(/[,\s]+$/, "");
  return `${clipped}...`;
}

export function resolveDefaultCardType(edgeType: Edge["edgeType"]): CardType {
  if (edgeType === "reference") {
    return "reference";
  }

  if (edgeType === "flow") {
    return "process";
  }

  return "process";
}

export function suggestCardSummary(
  card: Pick<Card, "title" | "body" | "docContent" | "hasDoc">,
  options?: { maxLength?: number }
): string | null {
  if (!card.hasDoc || !card.docContent.trim()) {
    return null;
  }

  const plainText = stripHtml(card.docContent);
  const lead = firstMeaningfulSentence(plainText);
  if (!lead) {
    return null;
  }

  const normalizedLead = lead.replace(/\s+/g, " ").trim();
  if (normalizedLead.toLowerCase() === (card.body ?? "").trim().toLowerCase()) {
    return null;
  }

  return truncate(normalizedLead, options?.maxLength ?? DEFAULT_CARD_SUMMARY_MAX_LENGTH);
}

function countByType(cards: Card[]): Record<CardType, number> {
  return cards.reduce<Record<CardType, number>>(
    (acc, card) => {
      acc[card.type] += 1;
      return acc;
    },
    {
      project: 0,
      process: 0,
      reference: 0,
      brainstorm: 0,
    }
  );
}

export function suggestProjectGoal(projectName: string, cards: Card[], edges: Edge[]): string {
  const counts = countByType(cards);
  const namedCards = cards.filter((card) => card.title.trim());
  const topTitles = namedCards.slice(0, 3).map((card) => card.title.trim());
  const leadTitle = topTitles[0] ?? projectName;

  if (counts.process > 0 && counts.reference > 0) {
    return `Clarify how ${leadTitle} works by mapping the core process flow, major dependencies, and supporting references in ${projectName}.`;
  }

  if (counts.process > 0) {
    return `Turn ${projectName} into a clear implementation map by outlining the key process steps, ownership boundaries, and next decisions.`;
  }

  if (counts.reference > 0) {
    return `Organize the source material for ${projectName} so the most relevant references and their relationships are easy to review and reuse.`;
  }

  if (counts.brainstorm > 0) {
    return `Distill the brainstorm for ${projectName} into a structured map with the strongest ideas, likely paths, and open questions.`;
  }

  if (edges.length > 0) {
    return `Refine ${projectName} into a readable map that explains the current structure, major links, and what needs detail next.`;
  }

  return `Define the structure and intent of ${projectName} so the map can guide review, implementation, and supporting context.`;
}
