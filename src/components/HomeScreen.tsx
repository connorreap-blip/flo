import { useState } from "react";
import { X } from "lucide-react";
import { loadProject, loadProjectFromPath } from "../lib/file-ops";
import { useProjectStore } from "../store/project-store";

interface Props {
  onNew: (name: string) => void;
  onOpenSample: () => void;
  onOpenTemplates: () => void;
}

export function HomeScreen({ onNew, onOpenSample, onOpenTemplates }: Props) {
  const [name, setName] = useState("");
  const [showNewWorkspaceForm, setShowNewWorkspaceForm] = useState(false);
  const recentProjects = useProjectStore((s) => s.recentProjects);
  const isFirstRun = useProjectStore((s) => s.isFirstRun);
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
      className="flex min-h-screen w-screen items-center justify-center overflow-y-auto px-6 py-10"
      style={{
        background: [
          "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 34%)",
          "linear-gradient(180deg, var(--color-surface-lowest) 0%, var(--color-canvas-bg) 55%)",
        ].join(", "),
      }}
    >
      <div className="w-full max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-start">
          <section className="max-w-2xl">
            <div className="flex flex-col gap-4">
              <div
                className="inline-flex w-fit items-center border px-3 py-1 text-[10px] uppercase tracking-[0.32em]"
                style={{
                  borderColor: "var(--color-card-border)",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                flō workspace
              </div>

              <div>
                <h1
                  className="text-5xl font-semibold tracking-[-0.05em] sm:text-6xl"
                  style={{
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-headline)",
                  }}
                >
                  Map your project so your coding agent stops guessing.
                </h1>
                <p
                  className="mt-4 max-w-xl text-base leading-7 sm:text-lg"
                  style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-body)" }}
                >
                  A local-first workspace for structuring goals, flows, references, and docs into clean
                  agent-ready context.
                </p>
              </div>

              <div
                className="border px-4 py-4 text-sm leading-6"
                style={{
                  borderColor: "var(--color-card-border)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {isFirstRun
                  ? "Start with the sample workspace to see the full loop, then reuse a template or begin from a blank map."
                  : "Jump into a sample or template when you need structure fast, or start from an empty workspace if you already know the shape."}
              </div>
            </div>
          </section>

          <section
            className="border p-4"
            style={{
              borderColor: "var(--color-card-border)",
              background: "var(--color-surface)",
            }}
          >
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onOpenSample}
                className="w-full border px-4 py-3 text-left text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: "#FFFFFF",
                  borderColor: "#FFFFFF",
                  color: "#000000",
                  fontFamily: "var(--font-headline)",
                }}
              >
                Explore Sample
              </button>

              <button
                type="button"
                onClick={onOpenTemplates}
                className="w-full border px-4 py-3 text-left text-sm transition-colors hover:opacity-90"
                style={{
                  background: "transparent",
                  borderColor: "var(--color-card-border)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-headline)",
                }}
              >
                Start from Template
              </button>

              <button
                type="button"
                onClick={() => setShowNewWorkspaceForm((current) => !current)}
                className="w-full px-1 py-2 text-left text-[11px] uppercase tracking-[0.28em] transition-opacity hover:opacity-80"
                style={{
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                New Empty Workspace
              </button>

              {showNewWorkspaceForm ? (
                <div className="border px-3 py-3" style={{ borderColor: "var(--color-card-border)" }}>
                  <label
                    htmlFor="workspace-name"
                    className="block text-[10px] uppercase tracking-[0.28em]"
                    style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                  >
                    Workspace Name
                  </label>
                  <input
                    id="workspace-name"
                    type="text"
                    placeholder="Untitled Workspace"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNew()}
                    autoFocus
                    className="mt-2 w-full border px-3 py-2.5 text-sm outline-none"
                    style={{
                      background: "var(--color-surface-lowest)",
                      borderColor: "var(--color-card-border)",
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-body)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleNew}
                    className="mt-3 w-full border px-4 py-2.5 text-left text-sm transition-opacity hover:opacity-90"
                    style={{
                      background: "var(--color-surface-high)",
                      borderColor: "var(--color-card-border)",
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-headline)",
                    }}
                  >
                    Create Empty Workspace
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleLoad}
                className="w-full px-1 py-2 text-left text-[11px] uppercase tracking-[0.28em] transition-opacity hover:opacity-80"
                style={{
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Open Existing Folder
              </button>
            </div>
          </section>
        </div>

        {recentProjects.length > 0 ? (
          <section className="mt-10 max-w-3xl">
            <div
              className="mb-3 text-[10px] uppercase tracking-[0.32em]"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              Recent Workspaces
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {recentProjects.map((project) => (
                <button
                  key={project.dirPath}
                  type="button"
                  onClick={() => handleOpenRecent(project.dirPath)}
                  className="group flex items-start justify-between gap-3 border px-3 py-3 text-left transition-colors hover:border-[var(--color-text-muted)]"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderColor: "var(--color-card-border)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm" style={{ color: "var(--color-text-primary)" }}>
                      {project.name}
                    </div>
                    <div
                      className="mt-1 truncate text-[10px]"
                      style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                    >
                      {project.dirPath}
                    </div>
                  </div>
                  <span
                    className="shrink-0 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
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
          </section>
        ) : null}
      </div>
    </div>
  );
}
