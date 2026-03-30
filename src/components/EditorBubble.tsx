import { useState, useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useCanvasStore } from "../store/canvas-store";

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    bulletList: { keepMarks: true, keepAttributes: false },
    orderedList: { keepMarks: true, keepAttributes: false },
    listItem: {},
  }),
  Underline,
];

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
  const [fullscreen, setFullscreen] = useState(false);

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

  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [fullscreen]);

  if (!card) return null;

  return (
    <div
      className={`${fullscreen ? "fixed inset-0 z-[100]" : "absolute z-40 pixel-border shadow-2xl"} flex flex-col`}
      style={fullscreen ? {
        background: "var(--color-canvas-bg)",
      } : {
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
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "var(--color-text-muted)",
            }}
          >
            {card.type.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="text-[10px] px-1.5 py-0.5"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            title={fullscreen ? "Exit Zen Mode (Escape)" : "Zen Mode — full screen"}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
            }}
          >
            {fullscreen ? "EXIT" : "ZEN"}
          </button>
          <button
            onClick={() => closeEditor(cardId)}
            className="text-sm px-1"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
            }}
          >
            ×
          </button>
        </div>
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
        <div style={{ width: 1, height: 16, background: "var(--color-card-border)", margin: "0 4px" }} />
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className="px-2 py-1 text-xs"
          style={{
            color: editor?.isActive("bulletList")
              ? "var(--color-text-primary)"
              : "var(--color-text-muted)",
            background: editor?.isActive("bulletList")
              ? "var(--color-surface-high)"
              : "transparent",
          }}
          title="Bullet list"
        >
          •—
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className="px-2 py-1 text-xs"
          style={{
            color: editor?.isActive("orderedList")
              ? "var(--color-text-primary)"
              : "var(--color-text-muted)",
            background: editor?.isActive("orderedList")
              ? "var(--color-surface-high)"
              : "transparent",
          }}
          title="Numbered list"
        >
          1—
        </button>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* Resize handle (bottom-right corner) */}
      {!fullscreen && <div
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
      </div>}
    </div>
  );
}
