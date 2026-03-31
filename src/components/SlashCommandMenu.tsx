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

export function SlashCommandMenu({ editor, position, items, onClose }: SlashCommandMenuProps) {
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (filtered.length === 0 ? 0 : Math.min(i + 1, filtered.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (filtered.length === 0 ? 0 : Math.max(i - 1, 0)));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          editor.chain().focus().deleteRange({
            from: editor.state.selection.from - filter.length - 1,
            to: editor.state.selection.from,
          }).run();

          if (selected.insertValue) {
            editor.chain().focus().insertContent(selected.insertValue).run();
          } else {
            void selected.run();
          }
          onClose();
        }
      }
      if (e.key === "Backspace") {
        if (filter.length === 0) {
          onClose();
        } else {
          setFilter((f) => f.slice(0, -1));
        }
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        setFilter((f) => f + e.key);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [editor, filtered, selectedIndex, filter, onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 flex max-h-[min(18rem,calc(100vh-1.5rem))] min-w-[220px] max-w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-0.5 overflow-y-auto p-1 shadow-2xl"
      style={{
        top: displayPosition.top,
        left: displayPosition.left,
        background: "var(--color-surface)",
        border: "1px solid var(--color-card-border)",
        borderRadius: 8,
      }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.id}
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-left transition-colors"
          style={{
            color: i === selectedIndex ? "var(--color-text-primary)" : "var(--color-text-muted)",
            background: i === selectedIndex ? "var(--color-surface-high)" : "transparent",
            fontFamily: "var(--font-mono)",
          }}
          onClick={() => {
            editor.chain().focus().deleteRange({
              from: editor.state.selection.from - filter.length - 1,
              to: editor.state.selection.from,
            }).run();

            if (cmd.insertValue) {
              editor.chain().focus().insertContent(cmd.insertValue).run();
            } else {
              void cmd.run();
            }
            onClose();
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="w-8 text-center text-[10px] uppercase">{categoryIcon(cmd)}</span>
          <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            {cmd.category}
          </span>
        </button>
      ))}
      {filtered.length === 0 && (
        <span className="px-2 py-1 text-xs" style={{ color: "var(--color-text-muted)" }}>No results</span>
      )}
    </div>
  );
}
