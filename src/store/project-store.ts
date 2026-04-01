import { create } from "zustand";
import type { ProjectMeta } from "../lib/types";

export type TabId = "home" | "layers" | "assets" | "history";

export interface RecentProject {
  name: string;
  dirPath: string;
  lastOpened: string;
}

const RECENT_PROJECTS_KEY = "flo:recent-projects";
const MAX_RECENT = 10;

function loadRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistRecentProjects(projects: RecentProject[]) {
  try {
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // localStorage may be unavailable
  }
}

interface ProjectStore {
  project: ProjectMeta;
  setProject: (project: ProjectMeta) => void;

  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  activeView: "canvas" | "kanban";
  setActiveView: (view: "canvas" | "kanban") => void;

  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;

  recentProjects: RecentProject[];
  addRecentProject: (name: string, dirPath: string) => void;
  removeRecentProject: (dirPath: string) => void;

  clearAll: () => void;
}

export const useProjectStore = create<ProjectStore>()((set) => ({
  project: { name: "Untitled Workspace", dirPath: null },
  setProject: (project) => set({ project }),

  activeTab: "layers",
  setActiveTab: (tab) => set({ activeTab: tab }),

  activeView: "canvas",
  setActiveView: (view) => set({ activeView: view }),

  theme: "dark",
  setTheme: (theme) => set({ theme }),

  recentProjects: loadRecentProjects(),
  addRecentProject: (name, dirPath) =>
    set((s) => {
      const filtered = s.recentProjects.filter((p) => p.dirPath !== dirPath);
      const updated = [{ name, dirPath, lastOpened: new Date().toISOString() }, ...filtered].slice(0, MAX_RECENT);
      persistRecentProjects(updated);
      return { recentProjects: updated };
    }),
  removeRecentProject: (dirPath) =>
    set((s) => {
      const updated = s.recentProjects.filter((p) => p.dirPath !== dirPath);
      persistRecentProjects(updated);
      return { recentProjects: updated };
    }),

  clearAll: () =>
    set({
      project: { name: "Untitled Workspace", dirPath: null },
      activeTab: "layers",
      activeView: "canvas",
    }),
}));
