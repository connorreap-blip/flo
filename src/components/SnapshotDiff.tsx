import type { Card, Edge } from "../lib/types";

interface DiffResult {
  added: Card[];
  removed: Card[];
  modified: Array<{ id: string; title: string; changes: string[] }>;
  edgesAdded: number;
  edgesRemoved: number;
}

export function computeDiff(
  snapshotCards: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    position: { x: number; y: number };
    width?: number | null;
    height?: number | null;
    tags?: string[] | null;
    collapsed: boolean;
    has_doc?: boolean;
    doc_content?: string;
    agent_hint?: string | null;
    comments?: Array<{ id: string; text: string; timestamp: number; author?: string }> | null;
  }>,
  snapshotEdges: Array<{ id: string; source: string; target: string }>,
  currentCards: Card[],
  currentEdges: Edge[]
): DiffResult {
  const snapCardMap = new Map(snapshotCards.map((c) => [c.id, c]));
  const currentCardMap = new Map(currentCards.map((c) => [c.id, c]));

  const added = currentCards.filter((c) => !snapCardMap.has(c.id));
  const removed = snapshotCards
    .filter((c) => !currentCardMap.has(c.id))
    .map((c) => ({ ...c, hasDoc: false, docContent: "", collapsed: c.collapsed }) as Card);

  const modified: DiffResult["modified"] = [];
  for (const [id, snapCard] of snapCardMap) {
    const current = currentCardMap.get(id);
    if (!current) continue;
    const changes: string[] = [];
    if (snapCard.title !== current.title) changes.push("title");
    if (snapCard.body !== current.body) changes.push("body");
    if (snapCard.type !== current.type) changes.push("type");
    if ((snapCard.width ?? null) !== (current.width ?? null)) changes.push("width");
    if ((snapCard.height ?? null) !== (current.height ?? null)) changes.push("height");
    if ((snapCard.has_doc ?? false) !== current.hasDoc) changes.push("document");
    if ((snapCard.doc_content ?? "") !== current.docContent) changes.push("doc content");
    if ((snapCard.agent_hint ?? "") !== (current.agentHint ?? "")) changes.push("agent hint");
    if (JSON.stringify(snapCard.tags ?? []) !== JSON.stringify(current.tags ?? [])) changes.push("tags");
    if (JSON.stringify(snapCard.comments ?? []) !== JSON.stringify(current.comments ?? [])) changes.push("comments");
    if (
      snapCard.position.x !== current.position.x ||
      snapCard.position.y !== current.position.y
    )
      changes.push("position");
    if (changes.length > 0) {
      modified.push({ id, title: current.title, changes });
    }
  }

  const snapEdgeIds = new Set(snapshotEdges.map((e) => e.id));
  const currentEdgeIds = new Set(currentEdges.map((e) => e.id));
  const edgesAdded = currentEdges.filter((e) => !snapEdgeIds.has(e.id)).length;
  const edgesRemoved = snapshotEdges.filter((e) => !currentEdgeIds.has(e.id)).length;

  return { added, removed, modified, edgesAdded, edgesRemoved };
}

interface SnapshotDiffProps {
  diff: DiffResult;
}

export function SnapshotDiff({ diff }: SnapshotDiffProps) {
  const hasChanges =
    diff.added.length > 0 ||
    diff.removed.length > 0 ||
    diff.modified.length > 0 ||
    diff.edgesAdded > 0 ||
    diff.edgesRemoved > 0;

  if (!hasChanges) {
    return (
      <div
        className="text-[10px] px-3 py-2"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        No changes since this snapshot
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2 text-[10px]" style={{ fontFamily: "var(--font-mono)" }}>
      {diff.added.length > 0 && (
        <div>
          <div className="uppercase tracking-widest mb-1" style={{ color: "#4ade80" }}>
            + {diff.added.length} card{diff.added.length > 1 ? "s" : ""} added
          </div>
          {diff.added.map((c) => (
            <div key={c.id} className="pl-2" style={{ color: "#4ade80" }}>
              {c.title || "Untitled"}
            </div>
          ))}
        </div>
      )}

      {diff.removed.length > 0 && (
        <div>
          <div className="uppercase tracking-widest mb-1" style={{ color: "#f87171" }}>
            - {diff.removed.length} card{diff.removed.length > 1 ? "s" : ""} removed
          </div>
          {diff.removed.map((c) => (
            <div key={c.id} className="pl-2" style={{ color: "#f87171" }}>
              {c.title || "Untitled"}
            </div>
          ))}
        </div>
      )}

      {diff.modified.length > 0 && (
        <div>
          <div className="uppercase tracking-widest mb-1" style={{ color: "#facc15" }}>
            ~ {diff.modified.length} card{diff.modified.length > 1 ? "s" : ""} modified
          </div>
          {diff.modified.map((c) => (
            <div key={c.id} className="pl-2" style={{ color: "#facc15" }}>
              {c.title || "Untitled"}{" "}
              <span style={{ color: "var(--color-text-muted)" }}>({c.changes.join(", ")})</span>
            </div>
          ))}
        </div>
      )}

      {(diff.edgesAdded > 0 || diff.edgesRemoved > 0) && (
        <div style={{ color: "var(--color-text-muted)" }}>
          Edges: {diff.edgesAdded > 0 && `+${diff.edgesAdded}`}
          {diff.edgesAdded > 0 && diff.edgesRemoved > 0 && " / "}
          {diff.edgesRemoved > 0 && `-${diff.edgesRemoved}`}
        </div>
      )}
    </div>
  );
}
