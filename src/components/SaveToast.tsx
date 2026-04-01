import { useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store";

export function SaveToast() {
  const message = useCanvasStore((s) => s.toastMessage);
  const dismiss = useCanvasStore((s) => s.dismissToast);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(dismiss, 2400);
    return () => window.clearTimeout(timer);
  }, [message, dismiss]);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-14 left-1/2 z-[200] -translate-x-1/2 border px-4 py-2 text-sm"
      style={{
        background: "var(--color-surface-high)",
        borderColor: "var(--color-card-border)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-mono)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {message}
    </div>
  );
}
