import { useState, useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useCanvasStore } from "../store/canvas-store";

const EDITOR_EXTENSIONS = [StarterKit, Underline];

interface Props {
  cardId: string;
  initialPosition: { x: number; y: number };
}

export function EditorBubble({ cardId, initialPosition }: Props) {
  const card = useCanvasStore((s) => s.cards.find((c) => c.id === cardId));
  const updateCard = useCanvasStore((s) => s.updateCard);
  const closeEditor = useCanvasStore((s) => s.closeEditor);

  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: card?.docContent || "",
    onUpdate: ({ editor }) => {
      updateCard(cardId, { docContent: editor.getHTML() });
    },
  });

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position]
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!resizing) return;
    const handleMove = (e: MouseEvent) => {
      setSize({
        width: Math.max(400, resizeStart.current.w + e.clientX - resizeStart.current.x),
        height: Math.max(300, resizeStart.current.h + e.clientY - resizeStart.current.y),
      });
    };
    const handleUp = () => setResizing(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [resizing]);

  if (!card) return null;

  return (
    <div
      className="absolute z-40 pixel-border shadow-2xl flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        opacity: 0.97,
        background: "var(--color-card-bg)",
      }}
    >
      {/* Title bar — draggable */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b cursor-move select-none shrink-0"
        style={{ borderColor: "var(--color-card-border)" }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold truncate max-w-[300px]"
            style={{ color: "var(--color-text-primary)" }}
          >
            {card.title || "Untitled"}
          </span>
          <span
            className="text-[7px]"
            style={{
              fontFamily: "var(--font-pixel)",
              color: "var(--color-text-muted)",
            }}
          >
            {card.type.toUpperCase()}
          </span>
        </div>
        <button
          onClick={() => closeEditor(cardId)}
          className="text-sm px-1"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--color-text-muted)";
          }}
        >
          ×
        </button>
      </div>

      {/* Formatting toolbar */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 border-b shrink-0"
        style={{ borderColor: "var(--color-card-border)" }}
      >
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className="px-2 py-1 text-xs font-bold"
          style={{
            color: editor?.isActive("bold")
              ? "var(--color-text-primary)"
              : "var(--color-text-muted)",
            background: editor?.isActive("bold")
              ? "var(--color-surface-high)"
              : "transparent",
          }}
        >
          B
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className="px-2 py-1 text-xs italic"
          style={{
            color: editor?.isActive("italic")
              ? "var(--color-text-primary)"
              : "var(--color-text-muted)",
            background: editor?.isActive("italic")
              ? "var(--color-surface-high)"
              : "transparent",
          }}
        >
          I
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className="px-2 py-1 text-xs underline"
          style={{
            color: editor?.isActive("underline")
              ? "var(--color-text-primary)"
              : "var(--color-text-muted)",
            background: editor?.isActive("underline")
              ? "var(--color-surface-high)"
              : "transparent",
          }}
        >
          U
        </button>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* Resize handle (bottom-right corner) */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          resizeStart.current = {
            x: e.clientX,
            y: e.clientY,
            w: size.width,
            h: size.height,
          };
          setResizing(true);
        }}
      >
        <svg
          width="12"
          height="12"
          className="m-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          <path
            d="M10,2 L2,10 M10,6 L6,10 M10,10 L10,10"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}
