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
  const [menuHovered, setMenuHovered] = useState(false);
  const [showConnectMenu, setShowConnectMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [branchEdgeType, setBranchEdgeType] = useState<EdgeType>("hierarchy");
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);

  const typeStyle = CARD_TYPE_STYLES[data.type];
  const typeLabel = CARD_TYPE_LABELS[data.type];
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((value): value is string => typeof value === "string")
    : [];

  // Show menu if card OR menu is hovered
  const showHoverMenu = (hovered || menuHovered) && !editingTitle && !editingBody;

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingBody && bodyRef.current) bodyRef.current.focus();
  }, [editingBody]);

  useEffect(() => {
    if (editingTags && tagRef.current) tagRef.current.focus();
  }, [editingTags]);

  // Close dropdowns on any click outside
  useEffect(() => {
    if (!showConnectMenu) return;
    const handler = () => setShowConnectMenu(false);
    const timer = setTimeout(() => window.addEventListener("click", handler), 0);
    return () => { clearTimeout(timer); window.removeEventListener("click", handler); };
  }, [showConnectMenu]);

  useEffect(() => {
    if (!showTypeMenu) return;
    const handler = () => setShowTypeMenu(false);
    // Delay to avoid closing immediately from the click that opened it
    const timer = setTimeout(() => window.addEventListener("click", handler), 0);
    return () => { clearTimeout(timer); window.removeEventListener("click", handler); };
  }, [showTypeMenu]);

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

  const commitTag = useCallback(() => {
    const nextTag = tagInput.trim().replace(/^#/, "").toLowerCase();
    if (!nextTag) {
      setTagInput("");
      setEditingTags(false);
      return;
    }

    if (!tags.includes(nextTag)) {
      updateCard(id, { tags: [...tags, nextTag] });
    }

    setTagInput("");
    setEditingTags(false);
  }, [id, tagInput, tags, updateCard]);

  const handles = (
    <>
      <Handle type="source" position={Position.Top} id="top" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" />
    </>
  );

  // Hover action menu — positioned top-right, bridged to card via padding
  const hoverMenu = showHoverMenu && (
    <div
      className="absolute flex flex-col gap-1 nodrag"
      style={{ top: 0, right: -44, zIndex: 10, paddingLeft: 12 }}
      onMouseEnter={() => setMenuHovered(true)}
      onMouseLeave={() => { setMenuHovered(false); setShowConnectMenu(false); }}
    >
      {/* + Connect button with submenu */}
      <div className="relative">
        <button
          onClick={() => setShowConnectMenu(!showConnectMenu)}
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{
            background: "var(--color-surface-high)",
            color: showConnectMenu ? "var(--color-text-primary)" : "var(--color-text-muted)",
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
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)"; }}
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
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)"; }}
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

  // Type badge dropdown for inline type changing
  const typeBadgeWithDropdown = (
    <div className="relative">
      <button
        className="px-1.5 py-0.5 nodrag cursor-pointer hover:opacity-80"
        style={typeBadgeStyle}
        onClick={() => setShowTypeMenu(!showTypeMenu)}
        title="Click to change type"
      >
        {typeLabel}
      </button>
      {showTypeMenu && (
        <div
          className="absolute right-0 top-7 flex flex-col gap-0.5 p-1 nodrag"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-card-border)",
            borderRadius: "4px",
            zIndex: 30,
          }}
        >
          {CARD_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { updateCard(id, { type: t }); setShowTypeMenu(false); }}
              className="flex items-center gap-2 px-2 py-1 text-[10px] transition-colors whitespace-nowrap hover:bg-[var(--color-surface-high)]"
              style={{
                color: data.type === t ? "var(--color-text-primary)" : "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
                borderRadius: "3px",
              }}
            >
              [{CARD_TYPE_LABELS[t]}] {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (data.collapsed) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); if (!menuHovered) setShowConnectMenu(false); }}
        className="relative"
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className="pixel-border bg-[var(--color-card-bg)] px-3 py-2 flex items-center justify-between gap-2 min-w-[200px]"
              style={{ borderColor: selected ? "var(--color-card-border-selected)" : undefined }}
            >
              {handles}
              <span className="text-[var(--color-text-primary)] text-xs truncate flex-1">{data.title || "Untitled"}</span>
              {typeBadgeWithDropdown}
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
      onMouseLeave={() => { setHovered(false); if (!menuHovered) setShowConnectMenu(false); }}
      className="relative"
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="pixel-border bg-[var(--color-card-bg)] select-none"
            style={{
              borderColor: selected ? "var(--color-card-border-selected)" : undefined,
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

            {/* Top bar — clickable type badge */}
            <div className="flex items-center justify-end px-3 py-2 border-b border-[var(--color-card-border)]">
              {typeBadgeWithDropdown}
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
                  {data.body || <span className="opacity-30 italic">double-click to add summary</span>}
                </div>
              )}
            </div>

            <div
              className="px-3 pb-3 pt-1 nodrag"
              onDoubleClick={(event) => {
                event.stopPropagation();
                setEditingTags(true);
              }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-0.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: "var(--color-surface-high)",
                      color: "var(--color-text-secondary)",
                      border: "1px solid var(--color-card-border)",
                    }}
                  >
                    #{tag}
                  </span>
                ))}

                {editingTags ? (
                  <input
                    ref={tagRef}
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onBlur={commitTag}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitTag();
                      }

                      if (event.key === "Escape") {
                        setEditingTags(false);
                        setTagInput("");
                      }
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    className="min-w-[88px] bg-transparent text-[10px] outline-none"
                    style={{
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                    placeholder="tag"
                  />
                ) : null}

                {!editingTags && tags.length === 0 ? (
                  <span
                    className="text-[9px]"
                    style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                  >
                    double-click to tag
                  </span>
                ) : null}
              </div>
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
