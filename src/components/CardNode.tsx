import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../store/canvas-store";
import { CARD_TYPE_LABELS, CARD_TYPE_STYLES, CARD_TYPES } from "../lib/constants";
import type { CardNodeType } from "../lib/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

function CardNodeComponent({ data, id, selected }: NodeProps<CardNodeType>) {
  const updateCard = useCanvasStore((s) => s.updateCard);
  const openEditor = useCanvasStore((s) => s.openEditor);
  const removeCard = useCanvasStore((s) => s.removeCard);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const typeStyle = CARD_TYPE_STYLES[data.type];
  const typeLabel = CARD_TYPE_LABELS[data.type];

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingBody && bodyRef.current) bodyRef.current.focus();
  }, [editingBody]);

  const handleDocClick = useCallback(() => {
    if (!data.hasDoc) {
      updateCard(id, { hasDoc: true });
    }
    openEditor(id, { x: 100, y: 100 });
  }, [id, data.hasDoc, updateCard, openEditor]);

  if (data.collapsed) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="pixel-border bg-[var(--color-card-bg)] px-3 py-2 flex items-center justify-between gap-2 min-w-[200px]"
            style={{
              borderColor: selected ? "#FFFFFF" : undefined,
            }}
          >
            <Handle type="target" position={Position.Top} className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
            <span className="text-[var(--color-text-primary)] text-xs truncate flex-1">{data.title || "Untitled"}</span>
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
              title={data.hasDoc ? "Open document" : "Create document"}
            >
              {data.hasDoc ? (
                <span className="text-[var(--color-text-primary)]">📄</span>
              ) : (
                <span className="text-[var(--color-text-muted)]">🗎</span>
              )}
            </button>
            <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-card-border)",
            color: "var(--color-text-primary)",
          }}
        >
          <ContextMenuItem
            onClick={() => updateCard(id, { collapsed: !data.collapsed })}
            className="text-xs"
            style={{ color: "var(--color-text-primary)" }}
          >
            {data.collapsed ? "Expand" : "Collapse"}
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger
              className="text-xs"
              style={{ color: "var(--color-text-primary)" }}
            >
              Change Type
            </ContextMenuSubTrigger>
            <ContextMenuSubContent
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-card-border)",
              }}
            >
              {CARD_TYPES.map((t) => (
                <ContextMenuItem
                  key={t}
                  onClick={() => updateCard(id, { type: t })}
                  className="text-xs"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  <span style={{ fontFamily: "var(--font-pixel)", fontSize: "7px", marginRight: "0.5rem" }}>
                    [{CARD_TYPE_LABELS[t]}]
                  </span>
                  {t}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem
            onClick={() => removeCard(id)}
            className="text-xs"
            style={{ color: "var(--color-accent-error)" }}
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="pixel-border bg-[var(--color-card-bg)] min-w-[200px] max-w-[300px] select-none"
          style={{
            borderColor: selected ? "#FFFFFF" : undefined,
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
                title={data.hasDoc ? "Open document" : "Create document"}
              >
                {data.hasDoc ? (
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
                value={data.title}
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
                {data.title || "Untitled"}
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
                value={data.body}
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
                {data.body || "Double-click to add text..."}
              </div>
            )}
          </div>

          <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
        }}
      >
        <ContextMenuItem
          onClick={() => updateCard(id, { collapsed: !data.collapsed })}
          className="text-xs"
          style={{ color: "var(--color-text-primary)" }}
        >
          {data.collapsed ? "Expand" : "Collapse"}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger
            className="text-xs"
            style={{ color: "var(--color-text-primary)" }}
          >
            Change Type
          </ContextMenuSubTrigger>
          <ContextMenuSubContent
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-card-border)",
            }}
          >
            {CARD_TYPES.map((t) => (
              <ContextMenuItem
                key={t}
                onClick={() => updateCard(id, { type: t })}
                className="text-xs"
                style={{ color: "var(--color-text-primary)" }}
              >
                <span style={{ fontFamily: "var(--font-pixel)", fontSize: "7px", marginRight: "0.5rem" }}>
                  [{CARD_TYPE_LABELS[t]}]
                </span>
                {t}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem
          onClick={() => removeCard(id)}
          className="text-xs"
          style={{ color: "var(--color-accent-error)" }}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export const CardNode = memo(CardNodeComponent);
