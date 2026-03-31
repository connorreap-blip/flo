import { v4 as uuid } from "uuid";
import { CARD_DEFAULTS, CARD_TYPE_LABELS, type CardType } from "./constants";
import type { Card, Edge } from "./types";

const LABEL_TO_TYPE = Object.fromEntries(
  Object.entries(CARD_TYPE_LABELS).map(([type, label]) => [label, type as CardType])
) as Record<string, CardType>;

interface RawStructureItem {
  commentId?: string;
  indent: number;
  type: CardType;
  title: string;
  body: string;
  tags: string[];
  agentHint?: string;
}

interface ResolvedStructureItem extends RawStructureItem {
  id: string;
  matched?: Card;
  parentId?: string;
}

export interface ContextParseResult {
  added: Card[];
  modified: Array<{ id: string; updates: Partial<Card> }>;
  removed: string[];
  nextCards: Card[];
  nextEdges: Edge[];
  summary: string[];
}

export function parseContextMd(
  markdown: string,
  existingCards: Card[],
  existingEdges: Edge[]
): ContextParseResult {
  const rawItems = parseStructureSection(markdown);
  if (rawItems.length === 0) {
    return {
      added: [],
      modified: [],
      removed: [],
      nextCards: existingCards,
      nextEdges: existingEdges,
      summary: ["No parsable structure section was found in context.md."],
    };
  }

  const activeCards = existingCards.filter((card) => card.type !== "brainstorm");
  const cardById = new Map(activeCards.map((card) => [card.id, card]));
  const titleBuckets = new Map<string, Card[]>();
  for (const card of activeCards) {
    const key = normalizeTitle(card.title);
    const bucket = titleBuckets.get(key);
    if (bucket) {
      bucket.push(card);
    } else {
      titleBuckets.set(key, [card]);
    }
  }

  const usedIds = new Set<string>();
  const resolvedItems: ResolvedStructureItem[] = rawItems.map((item) => {
    let matched: Card | undefined;

    if (item.commentId) {
      matched = cardById.get(item.commentId);
    }

    if (!matched) {
      const candidates = titleBuckets.get(normalizeTitle(item.title)) ?? [];
      matched = candidates.find((candidate) => !usedIds.has(candidate.id));
    }

    const id = matched?.id ?? item.commentId ?? uuid();
    usedIds.add(id);

    return {
      ...item,
      id,
      matched,
    };
  });

  const parentStack: Array<string | undefined> = [];
  for (const item of resolvedItems) {
    while (parentStack.length > item.indent) {
      parentStack.pop();
    }

    item.parentId = item.indent > 0 ? parentStack[item.indent - 1] : undefined;
    parentStack[item.indent] = item.id;
  }

  const nextActiveCards = resolvedItems.map((item, index) => buildCardFromStructure(item, index));
  const nextCardIds = new Set(nextActiveCards.map((card) => card.id));
  const removed = activeCards
    .filter((card) => !nextCardIds.has(card.id))
    .map((card) => card.id);

  const added = nextActiveCards.filter((card) => !cardById.has(card.id));
  const modified = resolvedItems
    .map((item, index) => {
      if (!item.matched) {
        return null;
      }

      const nextCard = nextActiveCards[index];
      const updates: Partial<Card> = {};

      if (item.matched.type !== nextCard.type) updates.type = nextCard.type;
      if (item.matched.title !== nextCard.title) updates.title = nextCard.title;
      if (item.matched.body !== nextCard.body) updates.body = nextCard.body;
      if (!stringArrayEquals(item.matched.tags, nextCard.tags)) updates.tags = nextCard.tags;
      if ((item.matched.agentHint ?? "") !== (nextCard.agentHint ?? "")) {
        updates.agentHint = nextCard.agentHint;
      }

      if (Object.keys(updates).length === 0) {
        return null;
      }

      return { id: item.id, updates };
    })
    .filter(Boolean) as ContextParseResult["modified"];

  const nonHierarchyEdges = existingEdges.filter((edge) => edge.edgeType !== "hierarchy");
  const existingHierarchyIds = new Map(
    existingEdges
      .filter((edge) => edge.edgeType === "hierarchy")
      .map((edge) => [`${edge.source}:${edge.target}`, edge.id])
  );

  const nextHierarchyEdges: Edge[] = resolvedItems
    .filter((item) => item.parentId)
    .map((item) => ({
      id: existingHierarchyIds.get(`${item.parentId}:${item.id}`) ?? uuid(),
      source: item.parentId!,
      target: item.id,
      edgeType: "hierarchy" as const,
      sourceArrow: false,
      targetArrow: true,
    }));

  const nextCards = [
    ...existingCards.filter((card) => card.type === "brainstorm"),
    ...nextActiveCards,
  ];
  const nextEdges = [...nonHierarchyEdges, ...nextHierarchyEdges];

  return {
    added,
    modified,
    removed,
    nextCards,
    nextEdges,
    summary: [
      `${added.length} added`,
      `${modified.length} modified`,
      `${removed.length} removed`,
      `${nextHierarchyEdges.length} hierarchy edges rebuilt`,
    ],
  };
}

function parseStructureSection(markdown: string): RawStructureItem[] {
  const lines = markdown.split(/\r?\n/);
  const sectionLines: string[] = [];
  let inStructure = false;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (line.trim() === "## Structure") {
        inStructure = true;
        continue;
      }

      if (inStructure) {
        break;
      }
    }

    if (inStructure) {
      sectionLines.push(line);
    }
  }

  const items: RawStructureItem[] = [];
  let pendingId: string | undefined;
  let current: RawStructureItem | null = null;

  for (const line of sectionLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const commentMatch = trimmed.match(/^<!--\s*flo-card:([A-Za-z0-9-]+)\s*-->$/);
    if (commentMatch) {
      pendingId = commentMatch[1];
      continue;
    }

    const bulletMatch = line.match(/^(\s*)-\s\[(\w+)\]\s(.+)$/);
    if (bulletMatch) {
      const [, indentWhitespace, label, rawTitle] = bulletMatch;
      const type = LABEL_TO_TYPE[label];
      if (!type) {
        current = null;
        pendingId = undefined;
        continue;
      }

      current = {
        commentId: pendingId,
        indent: Math.floor(indentWhitespace.length / 2),
        type,
        title: rawTitle.trim(),
        body: "",
        tags: [],
      };
      items.push(current);
      pendingId = undefined;
      continue;
    }

    if (!current) {
      continue;
    }

    if (trimmed.startsWith("Summary: ")) {
      current.body = trimmed.slice("Summary: ".length).trim();
      continue;
    }

    if (trimmed.startsWith("Tags: ")) {
      current.tags = extractTags(trimmed.slice("Tags: ".length));
      continue;
    }

    if (trimmed.startsWith("Agent: ")) {
      const agentHint = trimmed.slice("Agent: ".length).trim();
      current.agentHint = agentHint || undefined;
      continue;
    }
  }

  return items;
}

function buildCardFromStructure(item: ResolvedStructureItem, index: number): Card {
  if (item.matched) {
    return {
      ...item.matched,
      type: item.type,
      title: item.title,
      body: item.body,
      tags: item.tags.length > 0 ? item.tags : undefined,
      agentHint: item.agentHint?.trim() ? item.agentHint.trim() : undefined,
    };
  }

  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    position: {
      x: item.indent * (CARD_DEFAULTS.width + 80),
      y: index * (CARD_DEFAULTS.height + 48),
    },
    width: CARD_DEFAULTS.width,
    height: CARD_DEFAULTS.height,
    tags: item.tags.length > 0 ? item.tags : undefined,
    collapsed: false,
    hasDoc: false,
    docContent: "",
    agentHint: item.agentHint?.trim() ? item.agentHint.trim() : undefined,
    comments: [],
  };
}

function extractTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => value.replace(/^#/, "").toLowerCase())
    )
  );
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function stringArrayEquals(a?: string[], b?: string[]): boolean {
  const left = [...(a ?? [])].sort();
  const right = [...(b ?? [])].sort();

  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}
