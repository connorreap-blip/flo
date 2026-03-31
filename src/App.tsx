import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { EditorBubble } from "./components/EditorBubble";
import { HomeScreen } from "./components/HomeScreen";
import { KanbanView } from "./components/KanbanView";
import { GhostPreview } from "./components/GhostPreview";
import { useCanvasStore } from "./store/canvas-store";
import { useProjectStore } from "./store/project-store";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import { useThemeInit } from "./hooks/use-theme";
import { HelperToast } from "./components/HelperToast";
import { BottomActionBar } from "./components/BottomActionBar";
import { HomeDashboard } from "./components/HomeDashboard";
import { parseContextMd } from "./lib/context-parser";
import { applyLoadedProject, type LoadedProjectPayload } from "./lib/file-ops";
import type { Card, Edge, ProjectMeta } from "./lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";

const PROJECT_FILE_NAMES = new Set(["meta.json", "cards.json", "edges.json", "viewport.json"]);

interface ExternalChangePrompt {
  title: string;
  description: string;
  details: string[];
  apply: () => Promise<void>;
}

function summarizeProjectReload(
  currentProject: ProjectMeta,
  currentCards: Card[],
  currentEdges: Edge[],
  nextProject: LoadedProjectPayload
): string[] {
  const details = [
    `Cards: ${currentCards.length} -> ${nextProject.cards.length}`,
    `Edges: ${currentEdges.length} -> ${nextProject.edges.length}`,
  ];

  if (currentProject.name !== nextProject.meta.name) {
    details.push(`Project name changed: ${currentProject.name} -> ${nextProject.meta.name}`);
  }

  if ((currentProject.goal ?? "") !== (nextProject.meta.goal ?? "")) {
    details.push("Project goal changed on disk.");
  }

  return details;
}

function normalizeExternalKey(filename: string): string {
  return PROJECT_FILE_NAMES.has(filename) ? "project-files" : filename;
}

function hierarchySignature(edges: Edge[]): string {
  return edges
    .filter((edge) => edge.edgeType === "hierarchy")
    .map((edge) => `${edge.source}:${edge.target}`)
    .sort()
    .join("|");
}
import { HistoryTab } from "./components/HistoryTab";

export default function App() {
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const activeTab = useProjectStore((s) => s.activeTab);
  const activeView = useProjectStore((s) => s.activeView);
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const openEditors = useCanvasStore((s) => s.openEditors);
  const loadState = useCanvasStore((s) => s.loadState);
  const ghostPreviewMode = useCanvasStore((s) => s.ghostPreviewMode);

  useThemeInit();
  useKeyboardShortcuts();

  const [started, setStarted] = useState(false);
  const [externalChange, setExternalChange] = useState<ExternalChangePrompt | null>(null);
  const [showExternalDiff, setShowExternalDiff] = useState(false);

  const externalSnapshotRef = useRef({
    project,
    cards,
    edges,
    viewport,
  });
  const ignoreExternalRef = useRef<{ until: number; files: Set<string> }>({
    until: 0,
    files: new Set(),
  });
  const lastExternalRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });

  useEffect(() => {
    externalSnapshotRef.current = { project, cards, edges, viewport };
  }, [project, cards, edges, viewport]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useCanvasStore.getState().isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    const savedHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ files?: string[] }>).detail;
      ignoreExternalRef.current = {
        until: Date.now() + 1500,
        files: new Set(detail?.files ?? []),
      };
    };

    window.addEventListener("flo:project-saved", savedHandler as EventListener);
    return () => window.removeEventListener("flo:project-saved", savedHandler as EventListener);
  }, []);

  useEffect(() => {
    if (!project.dirPath) {
      return;
    }

    void invoke("start_watching", { dirPath: project.dirPath }).catch((error) => {
      console.error("Failed to start file watcher", error);
    });

    return () => {
      void invoke("stop_watching").catch((error) => {
        console.error("Failed to stop file watcher", error);
      });
    };
  }, [project.dirPath]);

  useEffect(() => {
    let disposed = false;

    const unlistenPromise = listen<string>("file-changed", async (event) => {
      if (disposed || !project.dirPath || externalChange) {
        return;
      }

      const filename = event.payload;
      if (!filename) {
        return;
      }

      const ignored = ignoreExternalRef.current;
      if (Date.now() < ignored.until && ignored.files.has(filename)) {
        return;
      }

      const key = normalizeExternalKey(filename);
      if (lastExternalRef.current.key === key && Date.now() - lastExternalRef.current.at < 500) {
        return;
      }
      lastExternalRef.current = { key, at: Date.now() };

      const snapshot = externalSnapshotRef.current;

      if (key === "context.md") {
        try {
          const markdown = await readTextFile(`${project.dirPath}/context.md`);
          if (disposed) {
            return;
          }

          const parsed = parseContextMd(markdown, snapshot.cards, snapshot.edges);
          const hierarchyChanged = hierarchySignature(parsed.nextEdges) !== hierarchySignature(snapshot.edges);
          const hasChanges =
            parsed.added.length > 0 ||
            parsed.modified.length > 0 ||
            parsed.removed.length > 0 ||
            hierarchyChanged;

          if (!hasChanges) {
            return;
          }

          setShowExternalDiff(false);
          setExternalChange({
            title: "context.md changed outside flo",
            description: "An external edit changed the exported structure. You can accept the disk version or keep the current in-app state.",
            details: parsed.summary,
            apply: async () => {
              loadState(parsed.nextCards, parsed.nextEdges, snapshot.viewport);
            },
          });
        } catch (error) {
          console.error("Failed to process context.md change", error);
        }
        return;
      }

      if (key === "project-files") {
        try {
          const result = await invoke<LoadedProjectPayload>("load_project_v2", {
            dirPath: project.dirPath,
          });
          if (disposed) {
            return;
          }

          setShowExternalDiff(false);
          setExternalChange({
            title: "Project files changed on disk",
            description: "flo detected external changes to the saved project files. Accepting reloads the project from disk.",
            details: summarizeProjectReload(snapshot.project, snapshot.cards, snapshot.edges, result),
            apply: async () => {
              applyLoadedProject(result);
            },
          });
        } catch (error) {
          console.error("Failed to reload project after file change", error);
        }
      }
    });

    return () => {
      disposed = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [project.dirPath, externalChange, loadState]);

  const handleNewMap = (name: string) => {
    setProject({ name, dirPath: null });
    setStarted(true);
  };

  const hasProject = project.dirPath !== null || cards.length > 0;

  if (!started && !hasProject) {
    return <HomeScreen onNew={handleNewMap} />;
  }

  return (
    <>
      <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: "var(--color-canvas-bg)" }}>
        <Toolbar />
        <div className="flex-1 relative">
          <div style={{ display: activeTab === "layers" ? "contents" : "none" }}>
            {activeView === "canvas" ? (
              <ReactFlowProvider>
                <Canvas />
              </ReactFlowProvider>
            ) : (
              <KanbanView />
            )}
            {openEditors.map((editor) => (
              <EditorBubble key={editor.cardId} cardId={editor.cardId} initialPosition={editor.position} />
            ))}
            {ghostPreviewMode ? <GhostPreview /> : null}
          </div>
          <div style={{ display: activeTab === "home" ? "contents" : "none" }}>
            <HomeDashboard />
          </div>
          <div style={{ display: activeTab === "assets" ? "contents" : "none" }}>
            <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
              <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>Assets — coming soon</span>
            </div>
          </div>
          <div style={{ display: activeTab === "history" ? "contents" : "none" }}>
            <HistoryTab />
          </div>
          <BottomActionBar />
        </div>
        <footer
          className="h-6 flex items-center justify-between px-4 shrink-0 border-t text-[10px]"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-card-border)",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <span>{cards.length} cards</span>
          <span>{isDirty ? "unsaved" : "saved"}</span>
        </footer>
        <HelperToast />
      </div>

      <Dialog
        open={externalChange !== null}
        onOpenChange={(open) => {
          if (!open) {
            setExternalChange(null);
            setShowExternalDiff(false);
          }
        }}
      >
        <DialogContent
          className="max-w-xl rounded-none border p-0"
          showCloseButton={false}
          style={{
            borderColor: "var(--color-card-border)",
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
          }}
        >
          <DialogHeader className="border-b px-5 py-4" style={{ borderColor: "var(--color-card-border)" }}>
            <DialogTitle style={{ fontFamily: "var(--font-headline)" }}>
              {externalChange?.title ?? "External change detected"}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--color-text-secondary)" }}>
              {externalChange?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4">
            <div
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              Change Summary
            </div>
            <div className="mt-3 space-y-2">
              {externalChange?.details.map((detail) => (
                <div
                  key={detail}
                  className="border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--color-card-border)",
                    background: "var(--color-surface-lowest)",
                  }}
                >
                  {detail}
                </div>
              ))}
            </div>

            {showExternalDiff ? (
              <div
                className="mt-4 border px-3 py-3 text-sm"
                style={{
                  borderColor: "var(--color-card-border)",
                  background: "var(--color-surface-low)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Accept External reloads the changed disk state into flo. Keep Mine dismisses the prompt and leaves the current in-app state untouched.
              </div>
            ) : null}
          </div>

          <DialogFooter
            className="border-t px-5 py-4 sm:flex-row sm:justify-between"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-lowest)" }}
          >
            <button
              type="button"
              className="border px-3 py-2 text-[10px] uppercase tracking-[0.28em]"
              style={{
                borderColor: "var(--color-card-border)",
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
              onClick={() => setShowExternalDiff((current) => !current)}
            >
              {showExternalDiff ? "Hide Review" : "Review Diff"}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="border px-3 py-2 text-[10px] uppercase tracking-[0.28em]"
                style={{
                  borderColor: "var(--color-card-border)",
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
                onClick={() => {
                  setExternalChange(null);
                  setShowExternalDiff(false);
                }}
              >
                Keep Mine
              </button>
              <button
                type="button"
                className="border px-3 py-2 text-[10px] uppercase tracking-[0.28em]"
                style={{
                  borderColor: "var(--color-text-primary)",
                  background: "var(--color-surface-high)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-mono)",
                }}
                onClick={async () => {
                  if (!externalChange) {
                    return;
                  }

                  await externalChange.apply();
                  setExternalChange(null);
                  setShowExternalDiff(false);
                }}
              >
                Accept External
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
