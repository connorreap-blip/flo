import { useMemo, useState } from "react";
import type { CardComment } from "../lib/types";
import { useCanvasStore } from "../store/canvas-store";

interface Props {
  cardId: string;
  comments?: CardComment[];
}

function formatCommentTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

export function CardComments({ cardId, comments }: Props) {
  const addComment = useCanvasStore((state) => state.addComment);
  const removeComment = useCanvasStore((state) => state.removeComment);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");

  const orderedComments = useMemo(
    () => [...(comments ?? [])].sort((a, b) => a.timestamp - b.timestamp),
    [comments]
  );

  return (
    <div className="space-y-3">
      {orderedComments.length > 0 ? (
        <div className="space-y-2">
          {orderedComments.map((comment) => (
            <div
              key={comment.id}
              className="border px-3 py-2"
              style={{
                borderColor: "var(--color-card-border)",
                background: "var(--color-surface-lowest)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div
                  className="text-[10px] uppercase tracking-[0.24em]"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                >
                  {comment.author?.trim() || "Anonymous"} · {formatCommentTimestamp(comment.timestamp)}
                </div>
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-[0.24em]"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                  onClick={() => removeComment(cardId, comment.id)}
                >
                  Delete
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: "var(--color-text-primary)" }}>
                {comment.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          No card comments yet.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
        <input
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Author"
          className="border px-2 py-2 text-xs outline-none"
          style={{
            borderColor: "var(--color-card-border)",
            background: "var(--color-surface-lowest)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Leave a comment tied to this card. Comments stay out of context.md."
          className="min-h-24 w-full resize-y border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: "var(--color-card-border)",
            background: "var(--color-surface-lowest)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          className="border px-3 py-1.5 text-[10px] uppercase tracking-[0.28em]"
          style={{
            borderColor: "var(--color-card-border)",
            color: text.trim() ? "var(--color-text-primary)" : "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
            background: "var(--color-surface-high)",
          }}
          disabled={!text.trim()}
          onClick={() => {
            if (!text.trim()) {
              return;
            }

            addComment(cardId, text.trim(), author);
            setText("");
          }}
        >
          Add Comment
        </button>
      </div>
    </div>
  );
}
