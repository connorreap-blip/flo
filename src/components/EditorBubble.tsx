import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { buildDocSlashItems } from "../lib/workspace-search";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";
import { useAssetStore } from "../store/asset-store";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { Wikilink } from "../lib/tiptap-wikilink";
import { FileRef } from "../lib/tiptap-file-ref";
import { CardComments } from "./CardComments";
import {
  createAttachmentFromFile,
  extractCardReferencesFromHtml,
  resolveWorkspaceFilePath,
} from "../lib/doc-links";

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: { keepMarks: true, keepAttributes: false },
    orderedList: { keepMarks: true, keepAttributes: false },
    listItem: {},
  }),
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Wikilink,
  FileRef,
];

interface Props {
  cardId: string;
  initialPosition: { x: number; y: number };
}

export function EditorBubble({ cardId, initialPosition }: Props) {
  const cards = useCanvasStore((s) => s.cards);
  const card = useCanvasStore((s) => s.cards.find((c) => c.id === cardId));
  const updateCard = useCanvasStore((s) => s.updateCard);
  const closeEditor = useCanvasStore((s) => s.closeEditor);
  const openEditor = useCanvasStore((s) => s.openEditor);
  const spellCheck = useCanvasStore((s) => s.spellCheck);
  const showWordCount = useCanvasStore((s) => s.showWordCount);
  const files = useAssetStore((s) => s.files);
  const loadFiles = useAssetStore((s) => s.loadFiles);
  const dirPath = useProjectStore((s) => s.project.dirPath);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const setActiveView = useProjectStore((s) => s.setActiveView);

  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ top: number; left: number } | null>(null);
  const [showBacklinks, setShowBacklinks] = useState(true);
  const [showAttachments, setShowAttachments] = useState(() => (card?.attachments?.length ?? 0) > 0);
  const [showAgentHint, setShowAgentHint] = useState(() => Boolean(card?.agentHint?.trim()));
  const [showComments, setShowComments] = useState(() => (card?.comments?.length ?? 0) > 0);
  const [dragOver, setDragOver] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const backlinks = useMemo(() => {
    if (!card) {
      return [];
    }

    return cards.filter((candidate) => {
      if (candidate.id === cardId) {
        return false;
      }

      return extractCardReferencesFromHtml(candidate.docContent).some((reference) => {
        if (reference.cardId) {
          return reference.cardId === card.id;
        }

        return Boolean(card.title) && reference.title === card.title;
      });
    });
  }, [card, cardId, cards]);
  const docWordCount = useMemo(() => {
    const plainText = (card?.docContent ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!plainText) {
      return 0;
    }

    return plainText.split(" ").length;
  }, [card?.docContent]);

  const cardAttachments = card?.attachments ?? [];

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: card?.docContent || "",
    onUpdate: ({ editor }) => {
      updateCard(cardId, { docContent: editor.getHTML() });
    },
  });

  const focusCard = useCallback(
    (targetId: string, openDocument = false) => {
      const target = cards.find((entry) => entry.id === targetId);
      if (!target) {
        return;
      }

      setActiveTab("layers");
      setActiveView("canvas");

      if (openDocument || target.hasDoc) {
        openEditor(target.id, { x: 120, y: 120 });
      }

      window.requestAnimationFrame(() => {
        window.dispatchEvent(
          new CustomEvent("flo:focus-card", { detail: { cardId: target.id } })
        );
      });
    },
    [cards, openEditor, setActiveTab, setActiveView]
  );

  const attachFileToCurrentCard = useCallback(
    (entry: (typeof files)[number]) => {
      if (!card) {
        return;
      }

      const nextAttachment = createAttachmentFromFile(entry);
      const existingAttachments = card.attachments ?? [];

      if (existingAttachments.some((attachment) => attachment.relativePath === entry.relative_path)) {
        return;
      }

      updateCard(card.id, {
        attachments: [...existingAttachments, nextAttachment],
      });
    },
    [card, files, updateCard]
  );

  const openAttachment = useCallback(
    async (relativePath: string) => {
      const resolvedPath = resolveWorkspaceFilePath(dirPath, relativePath);
      if (!resolvedPath) {
        return;
      }

      await openPath(resolvedPath);
    },
    [dirPath]
  );

  const revealAttachment = useCallback(
    async (relativePath: string) => {
      const resolvedPath = resolveWorkspaceFilePath(dirPath, relativePath);
      if (!resolvedPath) {
        return;
      }

      await revealItemInDir(resolvedPath);
    },
    [dirPath]
  );

  const removeAttachment = useCallback(
    (relativePath: string) => {
      if (!card) {
        return;
      }

      updateCard(card.id, {
        attachments: (card.attachments ?? []).filter((attachment) => attachment.relativePath !== relativePath),
      });
    },
    [card, updateCard]
  );

  const editorContainerRef = useRef<HTMLDivElement>(null);

  const importFile = useCallback(
    async (filePath: string) => {
      setImportError(null);
      try {
        const text = await invoke<string>("extract_file_text", { filePath });
        if (editor && text.trim()) {
          const paragraphs = text
            .split(/\n{2,}/)
            .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
            .join("");
          editor.chain().focus().insertContent(paragraphs).run();
        }
      } catch (err) {
        setImportError(typeof err === "string" ? err : "Failed to extract text from file.");
      }
    },
    [editor]
  );

  // Tauri native drag-drop: gives us actual file paths
  useEffect(() => {
    if (!dirPath || files.length > 0) {
      return;
    }

    void loadFiles(dirPath);
  }, [dirPath, files.length, loadFiles]);

  useEffect(() => {
    if ((card?.attachments?.length ?? 0) > 0) {
      setShowAttachments(true);
    }
  }, [card?.attachments?.length]);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let cancelled = false;

    const unlistenPromise = appWindow.onDragDropEvent((event) => {
      if (cancelled) return;
      const container = editorContainerRef.current;
      if (!container) return;

      if (event.payload.type === "over") {
        const { x, y } = event.payload.position;
        const rect = container.getBoundingClientRect();
        const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        setDragOver(inside);
      }

      if (event.payload.type === "leave") {
        setDragOver(false);
      }

      if (event.payload.type === "drop") {
        setDragOver(false);
        const { x, y } = event.payload.position;
        const rect = container.getBoundingClientRect();
        const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        if (inside && event.payload.paths.length > 0) {
          void importFile(event.payload.paths[0]);
        }
      }
    });

    return () => {
      cancelled = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [importFile]);

  const insertCardReference = useCallback(
    (targetCardId: string, title: string) => {
      editor
        ?.chain()
        .focus()
        .insertContent([
          {
            type: "wikilink",
            attrs: {
              title,
              cardId: targetCardId,
            },
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run();
    },
    [editor]
  );

  const insertFileReference = useCallback(
    (entry: (typeof files)[number]) => {
      attachFileToCurrentCard(entry);
      editor
        ?.chain()
        .focus()
        .insertContent([
          {
            type: "fileRef",
            attrs: {
              relativePath: entry.relative_path,
              name: entry.name,
            },
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run();
    },
    [attachFileToCurrentCard, editor, files]
  );

  const slashItems = useMemo(
    () =>
      buildDocSlashItems({
        cards,
        files,
        insertCardReference,
        insertFileReference,
      }),
    [cards, files, insertCardReference, insertFileReference]
  );

  // Listen for "/" key to open slash command menu
  useEffect(() => {
    if (!editor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !slashMenu) {
        // Get cursor position for menu placement (viewport coords)
        const { view } = editor;
        const coords = view.coordsAtPos(view.state.selection.from);
        // Let the "/" character be inserted, then position the menu
        // The menu will clean up the "/" when a command is selected
        requestAnimationFrame(() => {
          setSlashMenu({ top: coords.bottom + 4, left: coords.left });
        });
      }
    };
    const editorEl = editor.view.dom;
    editorEl.addEventListener("keydown", handleKeyDown);
    return () => editorEl.removeEventListener("keydown", handleKeyDown);
  }, [editor, slashMenu]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.view.dom.setAttribute("spellcheck", String(spellCheck));
  }, [editor, spellCheck]);

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

  const toolbarBtnStyle = (active: boolean) => ({
    color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
    background: active ? "var(--color-surface-high)" : "transparent",
  });

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
          style={toolbarBtnStyle(editor?.isActive("bold") ?? false)}
        >
          B
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className="px-2 py-1 text-xs italic"
          style={toolbarBtnStyle(editor?.isActive("italic") ?? false)}
        >
          I
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className="px-2 py-1 text-xs underline"
          style={toolbarBtnStyle(editor?.isActive("underline") ?? false)}
        >
          U
        </button>
        <div style={{ width: 1, height: 16, background: "var(--color-card-border)", margin: "0 4px" }} />
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive("heading", { level: 1 }) ?? false)}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive("heading", { level: 2 }) ?? false)}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive("heading", { level: 3 }) ?? false)}
          title="Heading 3"
        >
          H3
        </button>
        <div style={{ width: 1, height: 16, background: "var(--color-card-border)", margin: "0 4px" }} />
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive("bulletList") ?? false)}
          title="Bullet list"
        >
          •—
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive("orderedList") ?? false)}
          title="Numbered list"
        >
          1—
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive("blockquote") ?? false)}
          title="Quote"
        >
          "
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive("codeBlock") ?? false)}
          title="Code block"
        >
          &lt;&gt;
        </button>
        <button
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(false)}
          title="Divider"
        >
          HR
        </button>
        <div style={{ width: 1, height: 16, background: "var(--color-card-border)", margin: "0 4px" }} />
        <button
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive({ textAlign: "left" }) ?? false)}
          title="Align left"
        >
          ⫷
        </button>
        <button
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive({ textAlign: "center" }) ?? false)}
          title="Align center"
        >
          ⫿
        </button>
        <button
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          className="px-2 py-1 text-xs"
          style={toolbarBtnStyle(editor?.isActive({ textAlign: "right" }) ?? false)}
          title="Align right"
        >
          ⫸
        </button>
      </div>

      {/* Editor content */}
      <div
        ref={editorContainerRef}
        className="flex-1 overflow-y-auto relative"
      >
        {dragOver && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", border: "2px dashed var(--color-text-primary)" }}
          >
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Drop file to import content
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                .txt, .md, .docx, .pdf supported
              </p>
            </div>
          </div>
        )}
        {importError && (
          <div
            className="mx-3 mt-2 border px-3 py-2 text-xs"
            style={{
              borderColor: "var(--color-accent-error)",
              background: "var(--color-surface-low)",
              color: "var(--color-accent-error)",
            }}
          >
            {importError}
            <button
              className="ml-2 underline"
              onClick={() => setImportError(null)}
              style={{ color: "var(--color-text-muted)" }}
            >
              dismiss
            </button>
          </div>
        )}
        <div
          className="h-full"
          onClick={(event) => {
            const target = event.target as HTMLElement;
            const fileRef = target.closest<HTMLElement>("[data-file-ref]");
            if (fileRef) {
              const relativePath = fileRef.dataset.fileRef;
              if (!relativePath) {
                return;
              }

              event.preventDefault();
              void openAttachment(relativePath);
              return;
            }

            const wikilink = target.closest("[data-wikilink]");

            if (!wikilink) {
              return;
            }

            const cardId = wikilink.getAttribute("data-card-id");
            const title = wikilink.getAttribute("data-wikilink");
            const linkedCard = cards.find((entry) => entry.id === cardId) ?? cards.find((entry) => entry.title === title);
            if (!linkedCard) {
              return;
            }

            event.preventDefault();
            focusCard(linkedCard.id, linkedCard.hasDoc);
          }}
        >
          <EditorContent editor={editor} className="h-full" />
        </div>
        {slashMenu && editor && (
          <SlashCommandMenu
            editor={editor}
            position={slashMenu}
            items={slashItems}
            onClose={() => setSlashMenu(null)}
          />
        )}
      </div>
      {showWordCount ? (
        <div
          className="border-t px-3 py-1.5 text-[10px]"
          style={{
            borderColor: "var(--color-card-border)",
            background: "var(--color-surface-lowest)",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {docWordCount.toLocaleString()} words
        </div>
      ) : null}

      <div
        className="border-t px-3 py-2"
        style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-low)" }}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowAttachments((current) => !current)}
        >
          <span className="text-xs font-semibold">Attachments</span>
          <span
            className="text-[10px]"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
          >
            {showAttachments ? "HIDE" : "SHOW"} {cardAttachments.length > 0 ? `(${cardAttachments.length})` : ""}
          </span>
        </button>

        {showAttachments ? (
          cardAttachments.length > 0 ? (
            <div className="mt-2 space-y-2">
              {cardAttachments.map((attachment) => (
                <div
                  key={attachment.relativePath}
                  className="border px-3 py-2"
                  style={{
                    borderColor: "var(--color-card-border)",
                    background: "var(--color-surface-lowest)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{attachment.name}</div>
                      <div
                        className="mt-1 text-[10px]"
                        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                      >
                        {attachment.relativePath}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[10px]" style={{ fontFamily: "var(--font-mono)" }}>
                      <button
                        type="button"
                        style={{ color: "var(--color-text-secondary)" }}
                        onClick={() => void openAttachment(attachment.relativePath)}
                      >
                        OPEN
                      </button>
                      <button
                        type="button"
                        style={{ color: "var(--color-text-secondary)" }}
                        onClick={() => void revealAttachment(attachment.relativePath)}
                      >
                        REVEAL
                      </button>
                      <button
                        type="button"
                        style={{ color: "var(--color-accent-error)" }}
                        onClick={() => removeAttachment(attachment.relativePath)}
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              No attachments yet. Add imported files from the Files tab or by typing `/`.
            </p>
          )
        ) : null}
      </div>

      <div
        className="border-t px-3 py-2"
        style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-low)" }}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowAgentHint((current) => !current)}
        >
          <span className="text-xs font-semibold">Agent Hint</span>
          <span
            className="text-[10px]"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
          >
            {showAgentHint ? "HIDE" : "SHOW"} {card.agentHint?.trim() ? "(SET)" : ""}
          </span>
        </button>

        {showAgentHint ? (
          <div className="mt-2 space-y-2">
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Optional instruction for agents. This is exported inline with the card in `context.md`.
            </p>
            <textarea
              value={card.agentHint ?? ""}
              onChange={(event) =>
                updateCard(cardId, {
                  agentHint: event.target.value.trim() ? event.target.value : undefined,
                })
              }
              placeholder="Example: Focus on migration risk and surface the quickest safe rollout."
              className="min-h-24 w-full resize-y border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--color-card-border)",
                background: "var(--color-surface-lowest)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
        ) : null}
      </div>

      <div
        className="border-t px-3 py-2"
        style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-low)" }}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowComments((current) => !current)}
        >
          <span className="text-xs font-semibold">Comments</span>
          <span
            className="text-[10px]"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
          >
            {showComments ? "HIDE" : "SHOW"} {card.comments?.length ? `(${card.comments.length})` : ""}
          </span>
        </button>

        {showComments ? (
          <div className="mt-2">
            <CardComments cardId={cardId} comments={card.comments} />
          </div>
        ) : null}
      </div>

      <div
        className="border-t px-3 py-2"
        style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-low)" }}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowBacklinks((current) => !current)}
        >
          <span className="text-xs font-semibold">Referenced by</span>
          <span
            className="text-[10px]"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
          >
            {showBacklinks ? "HIDE" : "SHOW"} {backlinks.length > 0 ? `(${backlinks.length})` : ""}
          </span>
        </button>

        {showBacklinks ? (
          backlinks.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {backlinks.map((backlink) => (
                <button
                  key={backlink.id}
                  type="button"
                  className="border px-2 py-1 text-[10px] transition-colors"
                  style={{
                    borderColor: "var(--color-card-border)",
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-mono)",
                  }}
                  onClick={() => focusCard(backlink.id, backlink.hasDoc)}
                >
                  {backlink.title || "Untitled"}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              No incoming references yet.
            </p>
          )
        ) : null}
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
