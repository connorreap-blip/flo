import type { Card, Edge, GovernorWarning } from "./types";
import { v4 as uuid } from "uuid";
import type { GovernorRuleId } from "./native-settings";
import {
  DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD,
  DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD,
  DEFAULT_GOVERNOR_REDUNDANT_OVERLAP_THRESHOLD,
  DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD,
  DEFAULT_SECTION_REFERENCE_WORD_CAP,
} from "./native-settings";

/**
 * Governor rules grounded in how Claude reads context:
 *
 * 1. BODY_LENGTH: Card body > 3 lines should move detail to doc.
 * 2. UNSCOPED_REFERENCE: Reference edge with no scope or "full" scope.
 * 3. CIRCULAR_REFERENCE: A→B→...→A creates infinite context expansion.
 * 4. HIERARCHY_DEPTH: Nesting > 3 levels deep.
 * 5. REDUNDANT_BODY: Two cards with >60% word overlap in body text.
 * 6. BRAINSTORM_REFERENCED: A non-brainstorm card references a brainstorm card.
 * 7. DEEP_REFERENCE_CHAIN: Reference chain > 3 hops.
 * 8. ORPHAN_CARD: Card with no edges at all.
 */

type GovernorRunOptions = {
  disabledRules?: GovernorRuleId[];
  bodyLineThreshold?: number;
  hierarchyDepthThreshold?: number;
  referenceChainDepthThreshold?: number;
  redundantBodyOverlapThreshold?: number;
};

export function runGovernor(cards: Card[], edges: Edge[], options?: GovernorRunOptions): GovernorWarning[] {
  const warnings: GovernorWarning[] = [];
  const disabledRules = new Set(options?.disabledRules ?? []);
  const bodyLineThreshold = options?.bodyLineThreshold ?? DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD;
  const hierarchyDepthThreshold = options?.hierarchyDepthThreshold ?? DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD;
  const referenceChainDepthThreshold =
    options?.referenceChainDepthThreshold ?? DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD;
  const redundantBodyOverlapThreshold =
    options?.redundantBodyOverlapThreshold ?? DEFAULT_GOVERNOR_REDUNDANT_OVERLAP_THRESHOLD;

  // Rule 1: Body length
  if (!disabledRules.has("body-length")) {
    for (const card of cards) {
      const lineCount = card.body.split("\n").filter((l) => l.trim()).length;
      if (lineCount > bodyLineThreshold) {
        warnings.push({
          id: uuid(),
          severity: "info",
          cardId: card.id,
          message: `"${card.title}" has a long body (${lineCount} lines)`,
          detail: "Card bodies are always included in agent context. Move detailed content to the card's document — the body should be a short statement of purpose.",
        });
      }
    }
  }

  // Rule 2: Unscoped reference
  if (!disabledRules.has("unscoped-reference")) {
    for (const edge of edges) {
      if (edge.edgeType === "reference" && (edge.referenceScope === "full" || !edge.referenceScope)) {
        const source = cards.find((c) => c.id === edge.source);
        const target = cards.find((c) => c.id === edge.target);
        const targetWordCount = (target?.body || "").split(/\s+/).length +
          (target?.docContent || "").split(/\s+/).length;
        warnings.push({
          id: uuid(),
          severity: "warning",
          edgeId: edge.id,
          cardId: edge.source,
          message: `${source?.title || "Card"} references ${target?.title || "Card"} with no scope`,
          detail: `Agent will read all ~${targetWordCount} words of ${target?.title || "the card"}'s content. Set a scope to control what the agent sees.`,
          fix: { label: "Set to summary", action: "set-scope" },
        });
      }
    }
  }

  // Rule 3: Circular references
  const refEdges = edges.filter((e) => e.edgeType === "reference");
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function detectCycle(nodeId: string, path: string[]): string[] | null {
    if (inStack.has(nodeId)) return [...path, nodeId];
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const edge of refEdges) {
      if (edge.source === nodeId) {
        const cycle = detectCycle(edge.target, [...path, nodeId]);
        if (cycle) return cycle;
      }
    }
    inStack.delete(nodeId);
    return null;
  }

  if (!disabledRules.has("circular-reference")) {
    const cycleChecked = new Set<string>();
    for (const card of cards) {
      if (!cycleChecked.has(card.id)) {
        visited.clear();
        inStack.clear();
        const cycle = detectCycle(card.id, []);
        if (cycle) {
          cycle.forEach((id) => cycleChecked.add(id));
          const names = cycle.map((id) => cards.find((c) => c.id === id)?.title || "?").join(" -> ");
          warnings.push({
            id: uuid(),
            severity: "error",
            message: "Circular reference detected",
            detail: `${names}. Agent may re-read the same context multiple times.`,
          });
        }
      }
    }
  }

  // Rule 4: Hierarchy depth
  const hierarchyEdges = edges.filter((e) => e.edgeType === "hierarchy");
  const parentMap = new Map<string, string>();
  for (const edge of hierarchyEdges) {
    parentMap.set(edge.target, edge.source);
  }

  function getDepth(cardId: string): number {
    let depth = 0;
    let current = cardId;
    const seen = new Set<string>();
    while (parentMap.has(current) && !seen.has(current)) {
      seen.add(current);
      current = parentMap.get(current)!;
      depth++;
    }
    return depth;
  }

  if (!disabledRules.has("hierarchy-depth")) {
    for (const card of cards) {
      const depth = getDepth(card.id);
      if (depth >= hierarchyDepthThreshold) {
        warnings.push({
          id: uuid(),
          severity: "warning",
          cardId: card.id,
          message: `"${card.title}" is nested ${depth} levels deep`,
          detail: "Claude works best with 2-3 levels of hierarchy. Deep nesting dilutes the relationship between this card and its root.",
        });
      }
    }
  }

  // Rule 5: Redundant body text
  const cardBodies = cards
    .filter((c) => c.body.trim().length > 20)
    .map((c) => ({ id: c.id, title: c.title, words: new Set(c.body.toLowerCase().split(/\s+/)) }));

  if (!disabledRules.has("redundant-body")) {
    for (let i = 0; i < cardBodies.length; i++) {
      for (let j = i + 1; j < cardBodies.length; j++) {
        const a = cardBodies[i];
        const b = cardBodies[j];
        const intersection = [...a.words].filter((w) => b.words.has(w)).length;
        const union = new Set([...a.words, ...b.words]).size;
        const overlap = union > 0 ? intersection / union : 0;
        if (overlap > redundantBodyOverlapThreshold) {
          warnings.push({
            id: uuid(),
            severity: "warning",
            cardId: a.id,
            message: `"${a.title}" and "${b.title}" have similar body text`,
            detail: "Redundant rules can confuse agents when wording differs. Keep the rule in one card and reference it from the other.",
            fix: { label: "Review", action: "merge-cards" },
          });
        }
      }
    }
  }

  // Rule 6: Brainstorm referenced by non-brainstorm
  if (!disabledRules.has("brainstorm-referenced")) {
    for (const edge of refEdges) {
      const source = cards.find((c) => c.id === edge.source);
      const target = cards.find((c) => c.id === edge.target);
      if (source && target && source.type !== "brainstorm" && target.type === "brainstorm") {
        warnings.push({
          id: uuid(),
          severity: "warning",
          edgeId: edge.id,
          cardId: edge.source,
          message: `"${source.title}" references brainstorm card "${target.title}"`,
          detail: "Brainstorm cards are excluded from agent context. This reference will be invisible to agents. Convert the brainstorm to a Process or Reference card if the idea has been decided.",
          fix: { label: "Convert to reference", action: "convert-type" },
        });
      }
    }
  }

  // Rule 7: Deep reference chains
  function getRefChainDepth(cardId: string, seen: Set<string>): number {
    if (seen.has(cardId)) return 0;
    seen.add(cardId);
    let maxDepth = 0;
    for (const edge of refEdges) {
      if (edge.source === cardId) {
        maxDepth = Math.max(maxDepth, 1 + getRefChainDepth(edge.target, seen));
      }
    }
    return maxDepth;
  }

  if (!disabledRules.has("deep-reference-chain")) {
    for (const card of cards) {
      const chainDepth = getRefChainDepth(card.id, new Set());
      if (chainDepth >= referenceChainDepthThreshold) {
        warnings.push({
          id: uuid(),
          severity: "info",
          cardId: card.id,
          message: `"${card.title}" starts a reference chain ${chainDepth} levels deep`,
          detail: "Agent follows all references recursively. Consider direct references instead of chains.",
        });
      }
    }
  }

  // Rule 8: Orphan cards
  if (!disabledRules.has("orphan-card")) {
    const connectedIds = new Set(edges.flatMap((e) => [e.source, e.target]));
    for (const card of cards) {
      if (!connectedIds.has(card.id) && cards.length > 1) {
        warnings.push({
          id: uuid(),
          severity: "info",
          cardId: card.id,
          message: `"${card.title}" has no connections`,
          detail: "This card is isolated. Is it intentional, or should it be connected to the project?",
        });
      }
    }
  }

  return warnings;
}

export function estimateContextWords(
  card: Card,
  cards: Card[],
  edges: Edge[],
  options?: { sectionWordCap?: number }
): number {
  const sectionWordCap = options?.sectionWordCap ?? DEFAULT_SECTION_REFERENCE_WORD_CAP;
  let words = (card.title + " " + card.body).split(/\s+/).length;

  const children = edges
    .filter((e) => e.edgeType === "hierarchy" && e.source === card.id)
    .map((e) => cards.find((c) => c.id === e.target))
    .filter(Boolean) as Card[];

  for (const child of children) {
    words += (child.title + " " + child.body + " " + child.docContent).split(/\s+/).length;
  }

  const refs = edges.filter((e) => e.edgeType === "reference" && e.source === card.id);
  for (const ref of refs) {
    const target = cards.find((c) => c.id === ref.target);
    if (!target) continue;
    switch (ref.referenceScope) {
      case "title":
        words += target.title.split(/\s+/).length;
        break;
      case "summary":
        words += (target.title + " " + target.body).split(/\s+/).length;
        break;
      case "section":
        words += Math.min(
          (target.docContent || "").split(/\s+/).length,
          sectionWordCap
        );
        break;
      case "full":
      default:
        words += (target.title + " " + target.body + " " + (target.docContent || "")).split(/\s+/).length;
        break;
    }
  }

  return words;
}
