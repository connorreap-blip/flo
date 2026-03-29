import { useMemo } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { CARD_TYPE_LABELS, CARD_TYPE_STYLES } from "../lib/constants";
import { estimateContextWords } from "../lib/governor";
import { FloatingToolbar } from "./FloatingToolbar";
import type { Card } from "../lib/types";

export function KanbanView() {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const openEditor = useCanvasStore((s) => s.openEditor);

  const columns = useMemo(() => {
    const hierarchyEdges = edges.filter((e) => e.edgeType === "hierarchy");
    const childTargets = new Set(hierarchyEdges.map((e) => e.target));

    const roots = cards.filter((c) => !childTargets.has(c.id));

    const getChildren = (parentId: string): Card[] =>
      hierarchyEdges
        .filter((e) => e.source === parentId)
        .map((e) => cards.find((c) => c.id === e.target))
        .filter(Boolean) as Card[];

    const allHierarchyIds = new Set(hierarchyEdges.flatMap((e) => [e.source, e.target]));
    const orphans = cards.filter(
      (c) => !allHierarchyIds.has(c.id) && roots.indexOf(c) === -1
    );

    const cols: { header: Card | null; children: { card: Card; depth: number }[] }[] = [];

    for (const root of roots) {
      const allChildren: { card: Card; depth: number }[] = [];
      function collectChildren(parentId: string, depth: number) {
        for (const child of getChildren(parentId)) {
          allChildren.push({ card: child, depth });
          collectChildren(child.id, depth + 1);
        }
      }
      collectChildren(root.id, 0);
      cols.push({ header: root, children: allChildren });
    }

    if (orphans.length > 0) {
      cols.push({ header: null, children: orphans.map((c) => ({ card: c, depth: 0 })) });
    }

    return cols;
  }, [cards, edges]);

  const renderCard = (card: Card, depth: number) => {
    const typeStyle = CARD_TYPE_STYLES[card.type];
    const words = estimateContextWords(card, cards, edges);

    return (
      <div
        key={card.id}
        className="pixel-border px-3 py-2 flex flex-col gap-1 cursor-pointer hover:opacity-90"
        style={{
          background: "var(--color-card-bg)",
          marginLeft: depth * 16,
        }}
        onClick={() => {
          if (card.hasDoc) openEditor(card.id, { x: 100, y: 100 });
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold truncate"
            style={{ color: card.type === "project" ? "#C9A84C" : "var(--color-text-primary)" }}
          >
            {card.title || "Untitled"}
          </span>
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
            {CARD_TYPE_LABELS[card.type]}
          </span>
        </div>
        {card.body && (
          <p className="text-[10px] line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
            {card.body}
          </p>
        )}
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[9px]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
            ~{words}w
          </span>
          {card.hasDoc && (
            <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>
              doc
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-hidden relative" style={{ background: "var(--color-canvas-bg)" }}>
      <div className="flex gap-4 p-4 h-full items-start" style={{ minWidth: "max-content" }}>
        {columns.map((col, i) => (
          <div
            key={col.header?.id ?? `orphan-${i}`}
            className="w-64 shrink-0 flex flex-col gap-2"
          >
            <div
              className="pixel-border px-3 py-2"
              style={{
                background: col.header ? "var(--color-surface-high)" : "var(--color-surface)",
                borderColor: "var(--color-card-border)",
              }}
            >
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{
                  color: col.header?.type === "project" ? "#C9A84C" : "var(--color-text-primary)",
                  fontFamily: "var(--font-headline)",
                }}
              >
                {col.header?.title ?? "Uncategorized"}
              </span>
              {col.header && (
                <span className="text-[9px] ml-2" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                  {col.children.length}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pb-4">
              {col.header && renderCard(col.header, 0)}
              {col.children.map(({ card, depth }) => renderCard(card, depth))}
            </div>
          </div>
        ))}
      </div>
      <FloatingToolbar selectedEdgeIds={[]} />
    </div>
  );
}
