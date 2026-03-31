import type { Node } from "@xyflow/react";
import type { CardType } from "./constants";

export interface Card extends Record<string, unknown> {
  id: string;
  type: CardType;
  title: string;
  body: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  collapsed: boolean;
  hasDoc: boolean;
  docContent: string;
}

export type EdgeType = "hierarchy" | "flow" | "reference";
export type ReferenceScope = "title" | "summary" | "section" | "full";

export interface Edge {
  id: string;
  source: string;
  target: string;
  edgeType: EdgeType;
  sourceArrow?: boolean;
  targetArrow?: boolean;
  referenceScope?: ReferenceScope;
  referenceSectionHint?: string;
  label?: string;
}

export interface GovernorWarning {
  id: string;
  severity: "error" | "warning" | "info";
  cardId?: string;
  edgeId?: string;
  message: string;
  detail: string;
  fix?: { label: string; action: "set-scope" | "remove-edge" | "convert-type" | "merge-cards" };
}

export interface ProjectMeta {
  name: string;
  dirPath: string | null;
  goal?: string;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface EditorState {
  cardId: string;
  position: { x: number; y: number };
}

export type CardNodeType = Node<Card, "card">;
