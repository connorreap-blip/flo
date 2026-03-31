import { useEffect, useCallback } from "react";
import { useHistoryStore } from "../store/history-store";
import { useProjectStore } from "../store/project-store";
import { useCanvasStore } from "../store/canvas-store";
import { SnapshotDiff, computeDiff } from "./SnapshotDiff";
import { deserializeMarkdown } from "../lib/markdown";
import type { Card, Edge, EdgeType, ReferenceScope } from "../lib/types";

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date}, ${time}`;
  } catch {
    return iso;
  }
}

export function HistoryTab() {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const dirPath = useProjectStore((s) => s.project.dirPath);
  const snapshots = useHistoryStore((s) => s.snapshots);
  const selectedFilename = useHistoryStore((s) => s.selectedFilename);
  const selectedSnapshot = useHistoryStore((s) => s.selectedSnapshot);
  const loading = useHistoryStore((s) => s.loading);
  const loadSnapshots = useHistoryStore((s) => s.loadSnapshots);
  const selectSnapshot = useHistoryStore((s) => s.selectSnapshot);
  const clearSelection = useHistoryStore((s) => s.clearSelection);

  const currentCards = useCanvasStore((s) => s.cards);
  const currentEdges = useCanvasStore((s) => s.edges);

  useEffect(() => {
    if (dirPath) {
      loadSnapshots(dirPath);
    }
  }, [dirPath, loadSnapshots]);

  const handleRestore = useCallback(() => {
    if (!selectedSnapshot) return;

    const cards: Card[] = selectedSnapshot.cards.map((c) => ({
      id: c.id,
      type: c.type as Card["type"],
      title: c.title,
      body: c.body,
      position: c.position,
      width: c.width ?? undefined,
      height: c.height ?? undefined,
      tags: c.tags ?? undefined,
      collapsed: c.collapsed,
      hasDoc: c.has_doc,
      docContent:
        c.has_doc && c.doc_content
          ? deserializeMarkdown(c.doc_content).htmlContent
          : "",
      agentHint: c.agent_hint ?? undefined,
      comments: c.comments ?? undefined,
    }));

    const edges: Edge[] = selectedSnapshot.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      edgeType: (e.edge_type ?? "hierarchy") as EdgeType,
      sourceArrow: e.source_arrow,
      targetArrow: e.target_arrow,
      referenceScope: e.reference_scope as ReferenceScope | undefined,
      referenceSectionHint: e.reference_section_hint,
      label: e.label,
    }));

    if (selectedSnapshot.meta) {
      setProject({
        ...project,
        name: selectedSnapshot.meta.name,
        goal: selectedSnapshot.meta.goal ?? undefined,
      });
    }

    useCanvasStore.getState().loadState(cards, edges, selectedSnapshot.viewport);
    clearSelection();
  }, [clearSelection, project, selectedSnapshot, setProject]);

  if (!dirPath) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ color: "var(--color-text-muted)" }}
      >
        <span
          className="text-[10px]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Save your project to start tracking history
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ color: "var(--color-text-muted)" }}
      >
        <span
          className="text-[10px]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Loading snapshots...
        </span>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ color: "var(--color-text-muted)" }}
      >
        <span
          className="text-[10px]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          No snapshots yet — save to create the first one
        </span>
      </div>
    );
  }

  const diff =
    selectedSnapshot
      ? computeDiff(
          selectedSnapshot.cards,
          selectedSnapshot.edges,
          currentCards,
          currentEdges
        )
      : null;

  return (
    <div className="w-full h-full flex" style={{ color: "var(--color-text-primary)" }}>
      {/* Snapshot list */}
      <div
        className="w-64 h-full overflow-y-auto border-r shrink-0"
        style={{ borderColor: "var(--color-card-border)" }}
      >
        <div
          className="px-3 py-2 text-[10px] uppercase tracking-widest border-b"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-muted)",
            borderColor: "var(--color-card-border)",
          }}
        >
          Snapshots ({snapshots.length})
        </div>
        {snapshots.map((snap) => (
          <button
            key={snap.filename}
            onClick={() => selectSnapshot(dirPath, snap.filename)}
            className="w-full text-left px-3 py-2 border-b transition-colors"
            style={{
              borderColor: "var(--color-card-border)",
              background:
                selectedFilename === snap.filename
                  ? "var(--color-surface-container)"
                  : "transparent",
              fontFamily: "var(--font-mono)",
            }}
          >
            <div
              className="text-[10px]"
              style={{ color: "var(--color-text-primary)" }}
            >
              {formatTimestamp(snap.timestamp)}
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              {snap.summary || `${snap.cardCount} cards, ${snap.edgeCount} edges`}
            </div>
          </button>
        ))}
      </div>

      {/* Detail / diff pane */}
      <div className="flex-1 h-full overflow-y-auto">
        {!selectedSnapshot ? (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            <span
              className="text-[10px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Select a snapshot to view changes
            </span>
          </div>
        ) : (
          <div>
            <div
              className="px-3 py-2 border-b flex items-center justify-between"
              style={{ borderColor: "var(--color-card-border)" }}
            >
              <div>
                <div
                  className="text-[10px] uppercase tracking-widest"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Changes since snapshot
                </div>
                <div
                  className="text-[10px] mt-0.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {formatTimestamp(selectedSnapshot.timestamp)}
                </div>
              </div>
              <button
                onClick={handleRestore}
                className="text-[10px] px-3 py-1 border transition-colors"
                style={{
                  fontFamily: "var(--font-mono)",
                  borderColor: "var(--color-card-border)",
                  color: "var(--color-text-primary)",
                  background: "var(--color-surface)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-surface-container)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--color-surface)";
                }}
              >
                Restore
              </button>
            </div>
            {diff && <SnapshotDiff diff={diff} />}
          </div>
        )}
      </div>
    </div>
  );
}
