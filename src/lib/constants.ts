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
