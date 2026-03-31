import { useState } from "react";
import { loadProject } from "../lib/file-ops";

interface Props {
  onNew: (name: string) => void;
}

export function HomeScreen({ onNew }: Props) {
  const [name, setName] = useState("");

  const handleNew = () => {
    const trimmed = name.trim() || "Untitled Workspace";
    onNew(trimmed);
  };

  const handleLoad = async () => {
    await loadProject();
    // loadProject sets project in store, App detects it and shows canvas
  };

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center gap-8"
      style={{ background: "var(--color-canvas-bg)" }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <h1
          className="text-6xl font-bold tracking-tighter"
          style={{
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-headline)",
            letterSpacing: "-0.04em",
          }}
        >
          flō
        </h1>
        <p
          className="text-xs tracking-widest uppercase"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
        >
          organize work with ai
        </p>
      </div>

      {/* New map section */}
      <div className="flex flex-col gap-3 w-72">
        <input
          type="text"
          placeholder="Workspace name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNew()}
          autoFocus
          className="w-full px-4 py-2.5 text-sm outline-none border"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-card-border)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-body)",
          }}
        />
        <button
          onClick={handleNew}
          className="w-full py-2.5 text-sm font-semibold bg-white text-black hover:opacity-90 transition-opacity"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          New Workspace
        </button>
        <button
          onClick={handleLoad}
          className="w-full py-2.5 text-sm border hover:opacity-80 transition-opacity"
          style={{
            background: "transparent",
            borderColor: "var(--color-card-border)",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-headline)",
          }}
        >
          Open Folder
        </button>
      </div>
    </div>
  );
}
