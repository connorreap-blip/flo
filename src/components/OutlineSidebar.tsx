import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { CARD_TYPE_LABELS, CARD_TYPE_STYLES } from "../lib/constants";
import type { Card } from "../lib/types";
import { useCanvasStore } from "../store/canvas-store";

type OutlineNode = {
  card: Card;
  children: OutlineNode[];
};

interface OutlineSidebarProps {
  selectedCardId?: string | null;
  defaultOpen?: boolean;
  onSelect?: (cardId: string) => void;
}

function buildOutline(cards: Card[], hierarchyEdges: Array<{ source: string; target: string }>): OutlineNode[] {
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const childrenMap = new Map<string, Card[]>();
  const childIds = new Set<string>();

  for (const edge of hierarchyEdges) {
    const source = cardMap.get(edge.source);
    const target = cardMap.get(edge.target);
    if (!source || !target) {
      continue;
    }

    childIds.add(target.id);
    const children = childrenMap.get(source.id) ?? [];
    children.push(target);
    childrenMap.set(source.id, children);
  }

  const visited = new Set<string>();

  const buildNode = (card: Card, lineage = new Set<string>()): OutlineNode => {
    visited.add(card.id);
    const nextLineage = new Set(lineage);
    nextLineage.add(card.id);

    return {
      card,
      children: (childrenMap.get(card.id) ?? [])
        .filter((child) => !nextLineage.has(child.id))
        .map((child) => buildNode(child, nextLineage)),
    };
  };

  const rootCards = cards.filter((card) => !childIds.has(card.id));
  const roots = rootCards.map((card) => buildNode(card));

  for (const card of cards) {
    if (!visited.has(card.id)) {
      roots.push(buildNode(card));
    }
  }

  return roots;
}

function collectExpandableIds(nodes: OutlineNode[]): Set<string> {
  const ids = new Set<string>();

  function walk(node: OutlineNode) {
    if (node.children.length > 0) {
      ids.add(node.card.id);
      node.children.forEach(walk);
    }
  }

  nodes.forEach(walk);
  return ids;
}

function OutlineTreeNode({
  node,
  depth,
  expandedIds,
  onToggle,
  onSelect,
  selectedCardId,
}: {
  node: OutlineNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  selectedCardId: string | null;
}) {
  const typeStyle = CARD_TYPE_STYLES[node.card.type];
  const isExpanded = expandedIds.has(node.card.id);
  const isSelected = selectedCardId === node.card.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div className="flex items-center pr-2">
        <div style={{ width: 8 + depth * 14 }} />
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? "Collapse branch" : "Expand branch"}
            aria-expanded={isExpanded}
            onClick={() => onToggle(node.card.id)}
            className="mr-1 flex h-5 w-5 items-center justify-center border transition-colors"
            style={{
              background: "var(--color-surface-lowest)",
              borderColor: "var(--color-card-border)",
              color: "var(--color-text-muted)",
            }}
          >
            <ChevronDown
              size={12}
              style={{
                transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                transition: "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </button>
        ) : (
          <div className="mr-1 h-5 w-5 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.card.id)}
          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left transition-colors"
          style={{
            background: isSelected ? "var(--color-surface-high)" : "transparent",
            color: "var(--color-text-primary)",
          }}
        >
          <span
            className="px-1.5 py-0.5 text-[9px] shrink-0"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              letterSpacing: "0.05em",
              backgroundColor: typeStyle.bg,
              color: typeStyle.text,
              border: `1px solid ${typeStyle.text}40`,
            }}
          >
            {CARD_TYPE_LABELS[node.card.type]}
          </span>
          <span className="truncate text-xs">{node.card.title || "Untitled"}</span>
          {node.children.length > 0 ? (
            <span
              className="ml-auto shrink-0 text-[10px]"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              {node.children.length}
            </span>
          ) : null}
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <div>
          {node.children.map((child) => (
            <OutlineTreeNode
              key={child.card.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedCardId={selectedCardId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OutlineSidebar({
  selectedCardId = null,
  defaultOpen = true,
  onSelect,
}: OutlineSidebarProps) {
  const cards = useCanvasStore((state) => state.cards);
  const edges = useCanvasStore((state) => state.edges);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isVisible, setIsVisible] = useState(defaultOpen);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const closeTimerRef = useRef<number | null>(null);

  const outline = useMemo(
    () => buildOutline(cards, edges.filter((edge) => edge.edgeType === "hierarchy")),
    [cards, edges]
  );
  const expandableIds = useMemo(() => collectExpandableIds(outline), [outline]);

  useEffect(() => {
    setExpandedIds((current) => {
      if (current.size === 0) {
        return new Set(expandableIds);
      }

      return new Set([...current].filter((id) => expandableIds.has(id)));
    });
  }, [expandableIds]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const toggleOpen = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isOpen) {
      setIsVisible(false);
      closeTimerRef.current = window.setTimeout(() => {
        setIsOpen(false);
        closeTimerRef.current = null;
      }, 180);
      return;
    }

    setIsOpen(true);
    window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
  };

  return (
    <div className="relative h-full shrink-0 overflow-visible" style={{ width: isOpen ? 240 : 0 }}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Collapse outline sidebar" : "Expand outline sidebar"}
        className="absolute top-3 z-30 flex h-8 w-8 items-center justify-center border transition-transform"
        style={{
          transform: `translateX(${isOpen ? 248 : 8}px)`,
          transition: "transform 220ms cubic-bezier(0.25, 1, 0.5, 1), background-color 180ms ease, color 180ms ease",
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
        }}
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {isOpen ? (
        <aside
          className="absolute inset-y-0 left-0 flex w-60 flex-col border-r"
          style={{
            background: "linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-lowest) 100%)",
            borderColor: "var(--color-card-border)",
            transform: isVisible ? "translateX(0)" : "translateX(-18px)",
            opacity: isVisible ? 1 : 0,
            transition: "transform 220ms cubic-bezier(0.25, 1, 0.5, 1), opacity 180ms ease-out",
          }}
        >
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-card-border)" }}>
            <div
              className="text-[10px] uppercase tracking-[0.28em]"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              Layers
            </div>
            <div
              className="mt-1 text-lg font-semibold"
              style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-headline)" }}
            >
              Outline
            </div>
            <div className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Hierarchy tree for the current canvas.
            </div>
          </div>

          <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: "var(--color-card-border)" }}>
            <span
              className="text-[10px] uppercase tracking-[0.24em]"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              {cards.length} cards
            </span>
            <button
              type="button"
              onClick={() => setExpandedIds(new Set(expandableIds))}
              className="text-[10px] uppercase tracking-[0.24em]"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              Expand all
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {outline.length === 0 ? (
              <div className="px-4 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Add hierarchy edges to see the canvas structure here.
              </div>
            ) : (
              outline.map((node) => (
                <OutlineTreeNode
                  key={node.card.id}
                  node={node}
                  depth={0}
                  expandedIds={expandedIds}
                  onToggle={(id) =>
                    setExpandedIds((current) => {
                      const next = new Set(current);
                      if (next.has(id)) {
                        next.delete(id);
                      } else {
                        next.add(id);
                      }
                      return next;
                    })
                  }
                  onSelect={(cardId) => onSelect?.(cardId)}
                  selectedCardId={selectedCardId}
                />
              ))
            )}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
