import type { Node } from "@xyflow/react";
import type { CardType } from "./constants";

export interface Card extends Record<string, unknown> {
  id: string;
  type: CardType;
  title: string;
  body: string;
  position: { x: number; y: number };
  collapsed: boolean;
  hasDoc: boolean;
  docContent: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface ProjectMeta {
  name: string;
  dirPath: string | null;
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
