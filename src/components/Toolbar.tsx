import { useEffect, useState } from "react";
import { Search, Settings, ChevronDown } from "lucide-react";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore, type TabId } from "../store/project-store";
import { HealthCheckDialog } from "./HealthCheckDialog";
import { saveProject, saveProjectAs, loadProject, loadProjectFromPath, copyContextToClipboard, exportContextToTarget } from "../lib/file-ops";
import { CommandPalette } from "./CommandPalette";
import { SettingsPanel } from "./SettingsPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "Overview" },
  { id: "layers", label: "Workspace" },
  { id: "assets", label: "Files" },
  { id: "history", label: "History" },
];

function formatWorkspacePath(dirPath: string | null): string {
  if (!dirPath) {
    return "Unsaved workspace";
  }

  return dirPath.replace(/^\/Users\/[^/]+/, "~");
}

export function Toolbar() {
  const [editingName, setEditingName] = useState(false);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const activeTab = useProjectStore((s) => s.activeTab);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const recentProjects = useProjectStore((s) => s.recentProjects);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta || event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      setShowCommandPalette((current) => !current);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header
        className="min-h-14 flex items-center justify-between gap-4 px-4 py-2 shrink-0 z-50 border-b"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
        }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="text-lg font-bold tracking-tighter text-white"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            flo
          </span>
          <div className="min-w-0">
            {editingName ? (
              <input
                className="bg-transparent text-xs outline-none border-b"
                style={{
                  color: "var(--color-text-muted)",
                  borderColor: "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                  width: "140px",
                }}
                defaultValue={project.name}
                autoFocus
                onBlur={(e) => {
                  setProject({ ...project, name: e.target.value.trim() || project.name });
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                }}
              />
            ) : (
              <span
                className="block text-xs cursor-pointer hover:opacity-70"
                style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                onClick={() => setEditingName(true)}
                title="Click to rename"
              >
                {project.name}{isDirty && " *"}
              </span>
            )}
            <div
              className="max-w-[260px] truncate text-[10px]"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              title={project.dirPath ?? "Unsaved workspace"}
            >
              {formatWorkspacePath(project.dirPath)}
            </div>
          </div>
          <div className="ml-2 flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="text-[10px] px-3 py-1 uppercase tracking-widest transition-colors"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: activeTab === tab.id ? "var(--color-text-primary)" : "var(--color-text-muted)",
                  borderBottom: activeTab === tab.id ? "1px solid var(--color-text-primary)" : "1px solid transparent",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {/* File operations group */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 text-xs px-3 py-1.5 border"
                  style={{
                    background: "var(--color-surface-high)",
                    color: "var(--color-text-primary)",
                    borderColor: "var(--color-card-border)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Open
                  <ChevronDown size={10} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-[220px]"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-card-border)",
                }}
              >
                <DropdownMenuItem
                  onClick={() => loadProject()}
                  className="text-xs"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Open Folder...
                </DropdownMenuItem>
                {recentProjects.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <div
                      className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em]"
                      style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                    >
                      Recent
                    </div>
                    {recentProjects.slice(0, 5).map((rp) => (
                      <DropdownMenuItem
                        key={rp.dirPath}
                        onClick={() => loadProjectFromPath(rp.dirPath)}
                        className="flex flex-col items-start gap-0.5 text-xs"
                      >
                        <span style={{ color: "var(--color-text-primary)" }}>{rp.name}</span>
                        <span
                          className="text-[10px] truncate max-w-[200px]"
                          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                        >
                          {rp.dirPath}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={() => saveProject()}
              className="text-xs font-bold px-3 py-1.5 uppercase tracking-wider bg-white text-black hover:opacity-90"
              style={{ fontFamily: "var(--font-headline)" }}
            >
              Save
            </button>
            <button
              onClick={() => saveProjectAs()}
              className="text-xs px-2 py-1.5 border"
              style={{
                background: "var(--color-surface-high)",
                color: "var(--color-text-muted)",
                borderColor: "var(--color-card-border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Save As
            </button>
          </div>

          {/* Separator */}
          <div className="h-5 w-px mx-1" style={{ background: "var(--color-card-border)" }} />

          {/* AI operations group */}
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                const success = await copyContextToClipboard();
                if (success) {
                  setCopyFeedback(true);
                  setTimeout(() => setCopyFeedback(false), 1800);
                }
              }}
              className="text-xs px-3 py-1.5 border"
              style={{
                background: copyFeedback ? "var(--color-text-primary)" : "var(--color-surface-high)",
                color: copyFeedback ? "var(--color-canvas-bg)" : "var(--color-text-primary)",
                borderColor: copyFeedback ? "var(--color-text-primary)" : "var(--color-card-border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {copyFeedback ? "COPIED!" : "Copy for AI"}
            </button>
            <button
              onClick={() => exportContextToTarget()}
              className="text-xs px-3 py-1.5 border"
              style={{
                background: "var(--color-surface-high)",
                color: "var(--color-text-muted)",
                borderColor: "var(--color-card-border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Export
            </button>
            <button
              onClick={() => setShowHealthCheck(true)}
              className="text-xs px-3 py-1.5 border"
              style={{
                background: "var(--color-surface-high)",
                color: "var(--color-text-muted)",
                borderColor: "var(--color-card-border)",
                fontFamily: "var(--font-mono)",
              }}
            >
              AI Check
            </button>
          </div>

          {/* Separator */}
          <div className="h-5 w-px mx-1" style={{ background: "var(--color-card-border)" }} />

          {/* Navigation group */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 text-xs px-3 py-1.5 border"
              style={{
                background: "var(--color-surface-high)",
                color: "var(--color-text-primary)",
                borderColor: "var(--color-card-border)",
                fontFamily: "var(--font-mono)",
              }}
              title="Search work and actions"
            >
              <Search size={12} />
              <span style={{ color: "var(--color-text-muted)" }}>Cmd+K</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center text-xs p-1.5 border"
              style={{
                background: "var(--color-surface-high)",
                color: "var(--color-text-muted)",
                borderColor: "var(--color-card-border)",
              }}
              title="Open settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      </header>
      <HealthCheckDialog
        open={showHealthCheck}
        onClose={() => setShowHealthCheck(false)}
        onSave={() => saveProject()}
      />
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}
