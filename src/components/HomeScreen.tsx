import { useState } from "react";
import { X } from "lucide-react";
import { loadProject, loadProjectFromPath } from "../lib/file-ops";
import { useProjectStore } from "../store/project-store";

interface Props {
  onNew: (name: string) => void;
}

export function HomeScreen({ onNew }: Props) {
  const [name, setName] = useState("");
  const recentProjects = useProjectStore((s) => s.recentProjects);
  const removeRecentProject = useProjectStore((s) => s.removeRecentProject);

  const handleNew = () => {
    const trimmed = name.trim() || "Untitled Workspace";
    onNew(trimmed);
  };

  const handleLoad = async () => {
    await loadProject();
  };

  const handleOpenRecent = async (dirPath: string) => {
    try {
      await loadProjectFromPath(dirPath);
    } catch {
      // Project may have been moved/deleted — remove from recents
      removeRecentProject(dirPath);
    }
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

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div className="flex flex-col gap-2 w-72">
          <span
            className="text-[10px] uppercase tracking-[0.3em] px-1"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
          >
            Recent Workspaces
          </span>
          <div className="flex flex-col gap-1">
            {recentProjects.map((project) => (
              <button
                key={project.dirPath}
                type="button"
                onClick={() => handleOpenRecent(project.dirPath)}
                className="group flex items-center justify-between gap-2 border px-3 py-2.5 text-left transition-colors hover:border-[var(--color-text-muted)]"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-card-border)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {project.name}
                  </div>
                  <div
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {project.dirPath}
                  </div>
                </div>
                <span
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentProject(project.dirPath);
                  }}
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
