import { useEffect, useState } from "react";
import { useCanvasStore } from "../store/canvas-store";

export function UndoToast() {
  const [message, setMessage] = useState<string | null>(null);
  const editVersion = useCanvasStore((s) => s.editVersion);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ action: string }>).detail;
      setMessage(detail.action === "undo" ? "Undo" : "Redo");
    };

    window.addEventListener("flo:undo-redo", handler as EventListener);
    return () => window.removeEventListener("flo:undo-redo", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 1200);
    return () => window.clearTimeout(timer);
  }, [message, editVersion]);

  if (!message) return null;

  return (
    <div
      className="fixed top-16 left-1/2 z-[200] -translate-x-1/2 border px-3 py-1.5 text-xs"
      style={{
        background: "var(--color-surface-high)",
        borderColor: "var(--color-card-border)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {message}
    </div>
  );
}
