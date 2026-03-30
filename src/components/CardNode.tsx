import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { Plus, Pencil, Trash2, GitBranch, ArrowRight, Link } from "lucide-react";
import { useCanvasStore } from "../store/canvas-store";
import { CARD_TYPE_LABELS, CARD_TYPE_STYLES, CARD_TYPES } from "../lib/constants";
import type { CardNodeType, EdgeType } from "../lib/types";
import { NewCardDialog } from "./NewCardDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const CONNECT_OPTIONS: { type: EdgeType; Icon: typeof Link; label: string }[] = [
  { type: "hierarchy", Icon: GitBranch, label: "Owns" },
  { type: "flow", Icon: ArrowRight, label: "Then" },
  { type: "reference", Icon: Link, label: "Ref" },
];

function CardNodeComponent({ data, id, selected }: NodeProps<CardNodeType>) {
  const updateCard = useCanvasStore((s) => s.updateCard);
  const openEditor = useCanvasStore((s) => s.openEditor);
  const removeCard = useCanvasStore((s) => s.removeCard);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [showBranch, setShowBranch] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const [branchEdgeType, setBranchEdgeType] = useState<EdgeType>("hierarchy");
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

  const typeBadgeStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: "9px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    backgroundColor: typeStyle.bg,
    color: typeStyle.text,
    borderStyle: typeStyle.borderStyle,
    borderWidth: "1px",
    borderColor: typeStyle.text + "40",
  };

  const handles = (
    <>
      <Handle type="source" position={Position.Top} id="top" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
    </>
  );

  // Hover action menu — positioned top-right outside the card
  const hoverMenu = hovered && !editingTitle && !editingBody && (
    <div
      className="absolute flex flex-col gap-1 nodrag"
      style={{ top: 0, right: -40, zIndex: 10 }}
    >
      {/* + Connect button with submenu */}
      <div className="relative">
        <button
          onClick={() => setShowConnectMenu(!showConnectMenu)}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{
            background: "var(--color-surface-high)",
            color: showConnectMenu ? "#FFFFFF" : "var(--color-text-muted)",
            borderRadius: "6px",
          }}
          title="Connect — create linked card"
        >
          <Plus size={14} />
        </button>
        {showConnectMenu && (
          <div
            className="absolute right-0 top-9 flex flex-col gap-0.5 p-1"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-card-border)",
              borderRadius: "6px",
              zIndex: 20,
            }}
          >
            {CONNECT_OPTIONS.map(({ type, Icon, label }) => (
              <button
                key={type}
                onClick={() => {
                  setBranchEdgeType(type);
                  setShowConnectMenu(false);
                  setShowBranch(true);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] transition-colors whitespace-nowrap hover:bg-[var(--color-surface-high)]"
                style={{
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                  borderRadius: "4px",
                }}
                title={label}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)"; }}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit button */}
      <button
        onClick={handleDocClick}
        className="w-8 h-8 flex items-center justify-center transition-colors"
        style={{
          background: "var(--color-surface-high)",
          color: "var(--color-text-muted)",
          borderRadius: "6px",
        }}
        title={data.hasDoc ? "Open document" : "Add document"}
      >
        <Pencil size={13} />
      </button>

      {/* Delete button */}
      <button
        onClick={() => removeCard(id)}
        className="w-8 h-8 flex items-center justify-center transition-colors"
        style={{
          background: "var(--color-surface-high)",
          color: "var(--color-text-muted)",
          borderRadius: "6px",
        }}
        title="Delete card"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent-error)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)"; }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );

  const contextMenuContent = (
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
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 600, letterSpacing: "0.05em", marginRight: "0.5rem" }}>
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
  );

  if (data.collapsed) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowConnectMenu(false); }}
        className="relative"
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className="pixel-border bg-[var(--color-card-bg)] px-3 py-2 flex items-center justify-between gap-2 min-w-[200px]"
              style={{
                borderColor: selected ? "#FFFFFF" : undefined,
              }}
            >
              {handles}
              <span className="text-[var(--color-text-primary)] text-xs truncate flex-1">{data.title || "Untitled"}</span>
              <span className="px-1.5 py-0.5" style={typeBadgeStyle}>
                {typeLabel}
              </span>
            </div>
          </ContextMenuTrigger>
          {contextMenuContent}
        </ContextMenu>
        {hoverMenu}
        <NewCardDialog
          open={showBranch}
          onClose={() => setShowBranch(false)}
          parentCardId={id}
          parentPosition={data.position}
          edgeType={branchEdgeType}
        />
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowConnectMenu(false); }}
      className="relative"
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="pixel-border bg-[var(--color-card-bg)] select-none"
            style={{
              borderColor: selected ? "#FFFFFF" : undefined,
              minWidth: 200,
              maxWidth: data.width ? undefined : 300,
              width: data.width ? data.width : undefined,
              height: data.height ? data.height : undefined,
            }}
          >
            <NodeResizer
              minWidth={200}
              minHeight={80}
              isVisible={selected}
              onResize={(_, params) => updateCard(id, { width: params.width, height: params.height })}
              lineStyle={{ borderColor: "var(--color-text-muted)" }}
              handleStyle={{ borderColor: "var(--color-text-muted)", background: "var(--color-surface)" }}
            />
            {handles}

            {/* Top bar — type badge only */}
            <div className="flex items-center justify-end px-3 py-2 border-b border-[var(--color-card-border)]">
              <span className="px-1.5 py-0.5" style={typeBadgeStyle}>
                {typeLabel}
              </span>
            </div>

            {/* Title */}
            <div className="px-3 pt-2">
              {editingTitle ? (
                <input
                  ref={titleRef}
                  className="nodrag bg-transparent text-sm font-semibold w-full outline-none border-b border-[var(--color-text-muted)] pb-0.5"
                  style={{ color: data.type === "project" ? "#C9A84C" : "var(--color-text-primary)" }}
                  value={data.title}
                  onChange={(e) => updateCard(id, { title: e.target.value })}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="text-sm font-semibold cursor-text truncate"
                  style={{ color: data.type === "project" ? "#C9A84C" : "var(--color-text-primary)" }}
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
                  className="nodrag bg-transparent text-[var(--color-text-secondary)] text-xs w-full outline-none resize-none"
                  rows={3}
                  value={data.body}
                  onChange={(e) => updateCard(id, { body: e.target.value })}
                  onBlur={() => setEditingBody(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingBody(false);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="text-[var(--color-text-secondary)] text-xs cursor-text min-h-[2rem] line-clamp-3"
                  onDoubleClick={() => setEditingBody(true)}
                >
                  {data.body || <span className="opacity-30 italic">double-click to add notes</span>}
                </div>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        {contextMenuContent}
      </ContextMenu>

      {hoverMenu}

      <NewCardDialog
        open={showBranch}
        onClose={() => setShowBranch(false)}
        parentCardId={id}
        parentPosition={data.position}
        edgeType={branchEdgeType}
      />
    </div>
  );
}

export const CardNode = memo(CardNodeComponent);
