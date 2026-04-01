import type { ReferenceScope } from "./types";

export const GOVERNOR_RULE_DEFINITIONS = [
  {
    id: "body-length",
    label: "Large card body",
    description: "Warn when a card body exceeds the configured line limit.",
  },
  {
    id: "unscoped-reference",
    label: "Unscoped references",
    description: "Warn when a reference pulls full-card context by default.",
  },
  {
    id: "circular-reference",
    label: "Circular references",
    description: "Warn when reference loops can reintroduce the same context.",
  },
  {
    id: "hierarchy-depth",
    label: "Deep nesting",
    description: "Warn when hierarchy depth exceeds the configured threshold.",
  },
  {
    id: "redundant-body",
    label: "Redundant bodies",
    description: "Warn when two cards say nearly the same thing.",
  },
  {
    id: "brainstorm-referenced",
    label: "Brainstorm referenced",
    description: "Warn when agent-visible cards reference brainstorm-only content.",
  },
  {
    id: "deep-reference-chain",
    label: "Deep reference chains",
    description: "Warn when references chain through too many hops.",
  },
  {
    id: "orphan-card",
    label: "Orphan cards",
    description: "Warn when a card has no edges at all.",
  },
] as const;

export type GovernorRuleId = (typeof GOVERNOR_RULE_DEFINITIONS)[number]["id"];

export const DEFAULT_GOVERNOR_BODY_LINE_THRESHOLD = 3;
export const DEFAULT_GOVERNOR_HIERARCHY_DEPTH_THRESHOLD = 4;
export const DEFAULT_GOVERNOR_REFERENCE_CHAIN_THRESHOLD = 3;
export const DEFAULT_GOVERNOR_REDUNDANT_OVERLAP_THRESHOLD = 0.6;

export const DEFAULT_REFERENCE_SCOPE: ReferenceScope = "summary";
export const DEFAULT_SECTION_REFERENCE_WORD_CAP = 200;

export const DEFAULT_CONTEXT_LEAN_WORD_THRESHOLD = 2000;
export const DEFAULT_CONTEXT_STANDARD_WORD_THRESHOLD = 5000;
export const DEFAULT_CONTEXT_RICH_WORD_THRESHOLD = 10000;

export const DEFAULT_CARD_SUMMARY_MAX_LENGTH = 180;
export const DEFAULT_HELPER_UNSCOPED_REFERENCE_THRESHOLD = 5;

export function clampInteger(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampFloat(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

export function resolveContextTier(
  totalWords: number,
  thresholds: {
    lean: number;
    standard: number;
    rich: number;
  }
): {
  label: "Lean" | "Standard" | "Rich" | "Heavy";
  color: string;
} {
  const lean = thresholds.lean;
  const standard = Math.max(thresholds.standard, lean + 1);
  const rich = Math.max(thresholds.rich, standard + 1);

  if (totalWords < lean) {
    return { label: "Lean", color: "#44FF44" };
  }

  if (totalWords < standard) {
    return { label: "Standard", color: "#FFFFFF" };
  }

  if (totalWords < rich) {
    return { label: "Rich", color: "#FFAA00" };
  }

  return { label: "Heavy", color: "#FF4444" };
}
