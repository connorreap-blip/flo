import type { Card, Edge, SummarySourcePreference } from "./types";
import type { CardType } from "./constants";
import {
  DEFAULT_CARD_SUMMARY_MAX_LENGTH,
  DEFAULT_SUGGESTION_KEYWORD_AGGRESSIVENESS,
  DEFAULT_SUGGESTION_MIN_DOC_WORDS,
  DEFAULT_SUMMARY_SOURCE_PREFERENCE,
} from "./native-settings";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtmlToBlocks(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractHeadings(html: string): string[] {
  const headings = [...html.matchAll(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gsi)]
    .map((match) => normalizeWhitespace(match[1].replace(/<[^>]+>/g, " ")))
    .filter(Boolean);

  return [...new Set(headings)];
}

function extractParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean);
}

function firstMeaningfulSentence(text: string): string | null {
  const cleaned = normalizeWhitespace(text);
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

function countWords(value: string): number {
  return normalizeWhitespace(value).split(/\s+/).filter(Boolean).length;
}

function cleanCandidate(candidate: string, cardTitle: string): string | null {
  const cleaned = normalizeWhitespace(candidate);
  if (!cleaned) {
    return null;
  }

  const normalizedTitle = normalizeWhitespace(cardTitle).toLowerCase();
  if (cleaned.toLowerCase() === normalizedTitle) {
    return null;
  }

  return cleaned;
}

function scoreCandidate(text: string): number {
  const words = countWords(text);
  const punctuationBonus = /[:,-]/.test(text) ? 3 : 0;
  return Math.min(words, 24) + punctuationBonus;
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
  options?: {
    maxLength?: number;
    minDocWords?: number;
    preference?: SummarySourcePreference;
  }
): string | null {
  if (!card.hasDoc || !card.docContent.trim()) {
    return null;
  }

  const plainText = stripHtmlToBlocks(card.docContent);
  const docWordCount = countWords(plainText);
  const minDocWords = options?.minDocWords ?? DEFAULT_SUGGESTION_MIN_DOC_WORDS;
  if (docWordCount < minDocWords) {
    return null;
  }

  const headings = extractHeadings(card.docContent);
  const paragraphs = extractParagraphs(plainText);
  const leadSentence = firstMeaningfulSentence(paragraphs[0] ?? plainText);
  const preferredSource = options?.preference ?? DEFAULT_SUMMARY_SOURCE_PREFERENCE;

  const candidatesBySource: Record<SummarySourcePreference, string[]> = {
    title: headings,
    headings,
    lead: leadSentence ? [leadSentence] : [],
  };

  const fallbackOrder = [...new Set<SummarySourcePreference>([preferredSource, "lead", "headings", "title"])];

  const normalizedBody = normalizeWhitespace(card.body).toLowerCase();

  for (const source of fallbackOrder) {
    const best = candidatesBySource[source]
      .map((candidate) => cleanCandidate(candidate, card.title))
      .filter(Boolean)
      .sort((a, b) => scoreCandidate(b!) - scoreCandidate(a!))[0];

    if (!best) {
      continue;
    }

    if (best.toLowerCase() === normalizedBody) {
      continue;
    }

    return truncate(best, options?.maxLength ?? DEFAULT_CARD_SUMMARY_MAX_LENGTH);
  }

  return null;
}

function countByType(cards: Card[]): Record<CardType, number> {
  return cards.reduce<Record<CardType, number>>(
    (counts, card) => {
      counts[card.type] += 1;
      return counts;
    },
    {
      project: 0,
      process: 0,
      reference: 0,
      brainstorm: 0,
    }
  );
}

function extractFocusKeywords(cards: Card[], aggressiveness: number): string[] {
  const keywordCounts = new Map<string, number>();
  const limit = aggressiveness === 1 ? 2 : aggressiveness === 2 ? 4 : 6;

  for (const card of cards) {
    const weightedText = `${card.title} ${card.title} ${card.body} ${(card.tags ?? []).join(" ")}`;
    const tokens = weightedText
      .toLowerCase()
      .match(/[a-z0-9][a-z0-9-]{2,}/g)
      ?.filter((token) => !STOP_WORDS.has(token)) ?? [];

    for (const token of tokens) {
      keywordCounts.set(token, (keywordCounts.get(token) ?? 0) + 1);
    }
  }

  return [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function formatKeywordTail(keywords: string[]): string {
  if (keywords.length === 0) {
    return "";
  }

  if (keywords.length === 1) {
    return ` Focus on ${keywords[0]}.`;
  }

  if (keywords.length === 2) {
    return ` Focus on ${keywords[0]} and ${keywords[1]}.`;
  }

  return ` Focus on ${keywords.slice(0, -1).join(", ")}, and ${keywords[keywords.length - 1]}.`;
}

function resolveLeadCard(cards: Card[], edges: Edge[], projectName: string): string {
  if (cards.length === 0) {
    return projectName;
  }

  const edgeCounts = new Map<string, number>();
  for (const edge of edges) {
    edgeCounts.set(edge.source, (edgeCounts.get(edge.source) ?? 0) + 1);
    edgeCounts.set(edge.target, (edgeCounts.get(edge.target) ?? 0) + 1);
  }

  const leadCard = [...cards].sort((a, b) => {
    const edgeDelta = (edgeCounts.get(b.id) ?? 0) - (edgeCounts.get(a.id) ?? 0);
    if (edgeDelta !== 0) {
      return edgeDelta;
    }

    return b.title.trim().length - a.title.trim().length;
  })[0];

  return leadCard?.title.trim() || projectName;
}

export function suggestProjectGoal(
  projectName: string,
  cards: Card[],
  edges: Edge[],
  options?: { keywordAggressiveness?: number }
): string {
  const counts = countByType(cards);
  const leadTitle = resolveLeadCard(cards, edges, projectName);
  const keywords = extractFocusKeywords(
    cards,
    options?.keywordAggressiveness ?? DEFAULT_SUGGESTION_KEYWORD_AGGRESSIVENESS
  );
  const keywordTail = formatKeywordTail(keywords);

  if (counts.process > 0 && counts.reference > 0) {
    return `Clarify how ${leadTitle} should work by mapping the execution flow, critical dependencies, and the supporting references across ${projectName}.${keywordTail}`;
  }

  if (counts.process > 0) {
    return `Turn ${projectName} into a usable implementation map by outlining the core steps, ownership boundaries, and next decisions for ${leadTitle}.${keywordTail}`;
  }

  if (counts.reference > 0) {
    return `Organize the source material in ${projectName} so the strongest references around ${leadTitle} are easy to review, compare, and reuse.${keywordTail}`;
  }

  if (counts.brainstorm > 0) {
    return `Distill the brainstorm in ${projectName} into a structured plan around ${leadTitle}, keeping the strongest ideas, likely paths, and open questions visible.${keywordTail}`;
  }

  if (edges.length > 0) {
    return `Refine ${projectName} into a readable map that explains the current structure, major relationships, and the next layer of detail around ${leadTitle}.${keywordTail}`;
  }

  return `Define the structure and intent of ${projectName} so the workspace can guide review, implementation, and supporting context around ${leadTitle}.${keywordTail}`;
}
