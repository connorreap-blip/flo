import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";

interface SlashCommandMenuProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
}

const COMMANDS = [
  { label: "Heading 1", icon: "H1", action: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", icon: "H2", action: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", icon: "H3", action: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Bullet List", icon: "\u2022", action: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered List", icon: "1.", action: (e: Editor) => e.chain().focus().toggleOrderedList().run() },
  { label: "Quote", icon: "\u275D", action: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
  { label: "Code Block", icon: "<>", action: (e: Editor) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Divider", icon: "\u2014", action: (e: Editor) => e.chain().focus().setHorizontalRule().run() },
];

export function SlashCommandMenu({ editor, position, onClose }: SlashCommandMenuProps) {
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          editor.chain().focus().deleteRange({
            from: editor.state.selection.from - filter.length - 1,
            to: editor.state.selection.from,
          }).run();
          filtered[selectedIndex].action(editor);
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
      className="absolute z-50 flex flex-col gap-0.5 p-1 min-w-[180px]"
      style={{
        top: position.top,
        left: position.left,
        background: "var(--color-surface)",
        border: "1px solid var(--color-card-border)",
      }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
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
            cmd.action(editor);
            onClose();
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="w-6 text-center">{cmd.icon}</span>
          {cmd.label}
        </button>
      ))}
      {filtered.length === 0 && (
        <span className="px-2 py-1 text-xs" style={{ color: "var(--color-text-muted)" }}>No results</span>
      )}
    </div>
  );
}
