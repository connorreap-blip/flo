import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../store/canvas-store";
import { CARD_TYPE_LABELS, CARD_TYPE_STYLES } from "../lib/constants";
import type { Card } from "../lib/types";

type CardNodeData = Card & { selected?: boolean };

function CardNodeComponent({ data, id }: NodeProps) {
  const d = data as unknown as CardNodeData;
  const updateCard = useCanvasStore((s) => s.updateCard);
  const openEditor = useCanvasStore((s) => s.openEditor);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const typeStyle = CARD_TYPE_STYLES[d.type];
  const typeLabel = CARD_TYPE_LABELS[d.type];

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingBody && bodyRef.current) bodyRef.current.focus();
  }, [editingBody]);

  const handleDocClick = useCallback(() => {
    if (!d.hasDoc) {
      updateCard(id, { hasDoc: true });
    }
    openEditor(id, { x: 100, y: 100 });
  }, [id, d.hasDoc, updateCard, openEditor]);

  if (d.collapsed) {
    return (
      <div
        className="pixel-border bg-[var(--color-card-bg)] px-3 py-2 flex items-center justify-between gap-2 min-w-[200px]"
        style={{
          borderColor: d.selected ? "#FFFFFF" : undefined,
        }}
      >
        <Handle type="target" position={Position.Top} className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
        <span className="text-[var(--color-text-primary)] text-xs truncate flex-1">{d.title || "Untitled"}</span>
        <span
          className="text-[7px] px-1.5 py-0.5 tracking-wider"
          style={{
            fontFamily: "var(--font-pixel)",
            backgroundColor: typeStyle.bg,
            color: typeStyle.text,
            borderStyle: typeStyle.borderStyle,
            borderWidth: "1px",
            borderColor: typeStyle.text + "40",
          }}
        >
          {typeLabel}
        </span>
        {d.hasDoc && <span className="text-[var(--color-text-secondary)] text-[10px]">📄</span>}
        <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
      </div>
    );
  }

  return (
    <div
      className="pixel-border bg-[var(--color-card-bg)] min-w-[200px] max-w-[300px] select-none"
      style={{
        borderColor: d.selected ? "#FFFFFF" : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-card-border)]">
        <button
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xs w-5 h-5 flex items-center justify-center"
          style={{ fontFamily: "var(--font-pixel)" }}
          title="Branch"
        >
          +
        </button>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[7px] px-1.5 py-0.5 tracking-wider"
            style={{
              fontFamily: "var(--font-pixel)",
              backgroundColor: typeStyle.bg,
              color: typeStyle.text,
              borderStyle: typeStyle.borderStyle,
              borderWidth: "1px",
              borderColor: typeStyle.text + "40",
            }}
          >
            {typeLabel}
          </span>
          <button
            onClick={handleDocClick}
            className="text-[10px] hover:opacity-80"
            title={d.hasDoc ? "Open document" : "Create document"}
          >
            {d.hasDoc ? (
              <span className="text-[var(--color-text-primary)]">📄</span>
            ) : (
              <span className="text-[var(--color-text-muted)]">🗎</span>
            )}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-3 pt-2">
        {editingTitle ? (
          <input
            ref={titleRef}
            className="bg-transparent text-[var(--color-text-primary)] text-sm font-semibold w-full outline-none border-b border-[var(--color-text-muted)] pb-0.5"
            value={d.title}
            onChange={(e) => updateCard(id, { title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false);
            }}
          />
        ) : (
          <div
            className="text-[var(--color-text-primary)] text-sm font-semibold cursor-text truncate"
            onDoubleClick={() => setEditingTitle(true)}
          >
            {d.title || "Untitled"}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {editingBody ? (
          <textarea
            ref={bodyRef}
            className="bg-transparent text-[var(--color-text-secondary)] text-xs w-full outline-none resize-none"
            rows={3}
            value={d.body}
            onChange={(e) => updateCard(id, { body: e.target.value })}
            onBlur={() => setEditingBody(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditingBody(false);
            }}
          />
        ) : (
          <div
            className="text-[var(--color-text-secondary)] text-xs cursor-text min-h-[2rem] line-clamp-3"
            onDoubleClick={() => setEditingBody(true)}
          >
            {d.body || "Double-click to add text..."}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
    </div>
  );
}

export const CardNode = memo(CardNodeComponent);
