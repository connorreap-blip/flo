export const GRID_SIZE = 20;

export const CARD_DEFAULTS = {
  width: 240,
  height: 120,
  collapsedHeight: 40,
} as const;

export const CARD_TYPES = ["project", "process", "reference", "brainstorm"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  project: "PRJ",
  process: "PRC",
  reference: "REF",
  brainstorm: "BRN",
};

export const CARD_TYPE_STYLES: Record<
  CardType,
  { bg: string; text: string; borderStyle: string }
> = {
  project: { bg: "#000000", text: "#FFFFFF", borderStyle: "solid" },
  process: { bg: "#1E1E1E", text: "#888888", borderStyle: "solid" },
  reference: { bg: "#2A2A2A", text: "#AAAAAA", borderStyle: "solid" },
  brainstorm: { bg: "#2A2A2A", text: "#FFFFFF", borderStyle: "dashed" },
};

export const EDGE_TYPES = ["hierarchy", "flow", "reference"] as const;

export const EDGE_TYPE_LABELS: Record<string, string> = {
  hierarchy: "OWNS",
  flow: "THEN",
  reference: "REF",
};

export const EDGE_TYPE_STYLES: Record<string, {
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
  defaultSourceArrow: boolean;
  defaultTargetArrow: boolean;
}> = {
  hierarchy: {
    stroke: "#444444",
    strokeWidth: 1.5,
    defaultSourceArrow: false,
    defaultTargetArrow: true,
  },
  flow: {
    stroke: "#FFFFFF",
    strokeWidth: 1.5,
    defaultSourceArrow: false,
    defaultTargetArrow: true,
  },
  reference: {
    stroke: "#555555",
    strokeWidth: 1,
    dashArray: "4 4",
    defaultSourceArrow: false,
    defaultTargetArrow: false,
  },
};

export const REFERENCE_SCOPES = ["title", "summary", "section", "full"] as const;

export const REFERENCE_SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  title: { label: "Title only", description: "Just the card name in a 'See also' list" },
  summary: { label: "Summary", description: "Card title + body text (the card face)" },
  section: { label: "Specific section", description: "A specific heading from the card's document" },
  full: { label: "Full card", description: "Complete card including full document" },
};
