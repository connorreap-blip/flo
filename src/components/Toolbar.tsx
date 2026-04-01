import { useEffect, useState } from "react";
import { Search, Settings, ChevronDown } from "lucide-react";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore, type TabId } from "../store/project-store";
import { HealthCheckDialog } from "./HealthCheckDialog";
import { saveProject, loadProject, loadProjectFromPath, exportContext } from "../lib/file-ops";
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

export function Toolbar() {
  const [editingName, setEditingName] = useState(false);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
        className="h-12 flex items-center justify-between px-4 shrink-0 z-50 border-b"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
        }}
      >
        <div className="flex items-center gap-4">
          <span
            className="text-lg font-bold tracking-tighter text-white"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            flo
          </span>
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
              className="text-xs cursor-pointer hover:opacity-70"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {project.name}{isDirty && " *"}
            </span>
          )}
          <div className="flex items-center gap-1 ml-2">
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
        <div className="flex items-center gap-2">
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
            onClick={() => setShowHealthCheck(true)}
            className="text-xs px-3 py-1.5 border"
            style={{
              background: "var(--color-surface-high)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-card-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            AI Check
          </button>
          <button
            onClick={() => exportContext()}
            className="text-xs px-3 py-1.5 border"
            style={{
              background: "var(--color-surface-high)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-card-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Export for AI
          </button>
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
            <span>Search</span>
            <span style={{ color: "var(--color-text-muted)" }}>Cmd+K</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 border"
            style={{
              background: "var(--color-surface-high)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-card-border)",
              fontFamily: "var(--font-mono)",
            }}
            title="Open settings"
          >
            <Settings size={12} />
            <span>Settings</span>
          </button>
          <button
            onClick={() => saveProject()}
            className="text-xs font-bold px-3 py-1.5 uppercase tracking-wider bg-white text-black hover:opacity-90"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Save
          </button>
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
