import { useState } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore, type TabId } from "../store/project-store";
import { HealthCheckDialog } from "./HealthCheckDialog";
import { saveProject, loadProject, exportContext } from "../lib/file-ops";

const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "layers", label: "Layers" },
  { id: "assets", label: "Assets" },
  { id: "history", label: "History" },
];

export function Toolbar() {
  const [editingName, setEditingName] = useState(false);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const activeTab = useProjectStore((s) => s.activeTab);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const isDirty = useCanvasStore((s) => s.isDirty);

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
          <button
            onClick={() => loadProject()}
            className="text-xs px-3 py-1.5 border"
            style={{
              background: "var(--color-surface-high)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-card-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Open
          </button>
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
            Check
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
            Export
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
    </>
  );
}
