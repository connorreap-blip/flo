import { create } from "zustand";
import type { ProjectMeta } from "../lib/types";

export type TabId = "home" | "layers" | "assets" | "history";

interface ProjectStore {
  project: ProjectMeta;
  setProject: (project: ProjectMeta) => void;

  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  activeView: "canvas" | "kanban";
  setActiveView: (view: "canvas" | "kanban") => void;

  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;

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

  clearAll: () =>
    set({
      project: { name: "Untitled Workspace", dirPath: null },
      activeTab: "layers",
      activeView: "canvas",
    }),
}));
