import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { clampFloatingPosition } from "../lib/floating-position";
import { filterWorkspaceCommandItems, type WorkspaceCommandItem } from "../lib/workspace-search";

interface SlashCommandMenuProps {
  editor: Editor;
  position: { top: number; left: number };
  items: WorkspaceCommandItem[];
  onClose: () => void;
}

function categoryIcon(item: WorkspaceCommandItem): string {
  switch (item.category) {
    case "card":
      return "[]";
    case "doc":
      return "DOC";
    case "action":
      return ">";
    case "setting":
      return "CFG";
    default:
      return "?";
  }
}

function executeCommand(editor: Editor, cmd: WorkspaceCommandItem, filterLen: number, onClose: () => void) {
  // Delete the "/" trigger and any filter text typed into the editor
  const from = editor.state.selection.from - filterLen - 1;
  const to = editor.state.selection.from;
  if (from >= 0) {
    editor.chain().focus().deleteRange({ from, to }).run();
  }
  if (cmd.insertValue) {
    editor.chain().focus().insertContent(cmd.insertValue).run();
  } else {
    void cmd.run();
  }
  onClose();
}

export function SlashCommandMenu({ editor, position, items, onClose }: SlashCommandMenuProps) {
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [displayPosition, setDisplayPosition] = useState(position);

  const filtered = filterWorkspaceCommandItems(items, filter);

  useLayoutEffect(() => {
    if (!ref.current) {
      setDisplayPosition(position);
      return;
    }

    const { offsetWidth, offsetHeight } = ref.current;
    setDisplayPosition(
      clampFloatingPosition({
        top: position.top,
        left: position.left,
        width: offsetWidth,
        height: offsetHeight,
      })
    );
  }, [filter, filtered.length, position]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-cmd-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Block all keystrokes from reaching the editor while menu is open
      e.stopPropagation();
      e.preventDefault();

      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        setSelectedIndex((i) => (filtered.length === 0 ? 0 : Math.min(i + 1, filtered.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        setSelectedIndex((i) => (filtered.length === 0 ? 0 : Math.max(i - 1, 0)));
        return;
      }
      if (e.key === "Enter") {
        const selected = filtered[selectedIndex];
        if (selected) {
          executeCommand(editor, selected, filter.length, onClose);
        }
        return;
      }
      if (e.key === "Backspace") {
        if (filter.length === 0) {
          onClose();
        } else {
          setFilter((f) => f.slice(0, -1));
          // Also delete the last filter char from the editor
          const pos = editor.state.selection.from;
          if (pos > 0) {
            editor.chain().deleteRange({ from: pos - 1, to: pos }).run();
          }
        }
        return;
      }
      if (e.key === "Tab") return;
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        setFilter((f) => f + e.key);
        // Insert the character into the editor so it can be cleaned up on selection
        editor.chain().insertContent(e.key).run();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [editor, filtered, selectedIndex, filter, onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[200] flex max-h-[min(20rem,calc(100vh-1.5rem))] w-[280px] flex-col shadow-2xl"
      style={{
        top: displayPosition.top,
        left: displayPosition.left,
        background: "var(--color-surface)",
        border: "1px solid var(--color-card-border)",
        borderRadius: 8,
      }}
    >
      {/* Filter bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 text-xs border-b shrink-0"
        style={{
          borderColor: "var(--color-card-border)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-muted)",
        }}
      >
        <span style={{ color: "var(--color-text-secondary)" }}>/</span>
        {filter ? (
          <span style={{ color: "var(--color-text-primary)" }}>{filter}</span>
        ) : (
          <span>type to filter…</span>
        )}
      </div>

      {/* Items list */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-1">
        {filtered.map((cmd, i) => (
          <button
            key={cmd.id}
            data-cmd-item
            className="flex w-full items-center gap-2 px-2 py-1.5 text-xs text-left transition-colors"
            style={{
              color: i === selectedIndex ? "var(--color-text-primary)" : "var(--color-text-muted)",
              background: i === selectedIndex ? "var(--color-surface-high)" : "transparent",
              fontFamily: "var(--font-mono)",
              borderRadius: 4,
            }}
            onClick={() => executeCommand(editor, cmd, filter.length, onClose)}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            <span className="w-8 shrink-0 text-center text-[10px] uppercase">{categoryIcon(cmd)}</span>
            <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
            <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted)" }}>
              {cmd.category}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <span className="block px-2 py-2 text-xs" style={{ color: "var(--color-text-muted)" }}>No results</span>
        )}
      </div>
    </div>
  );
}
