import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface ProjectFileEntry {
  name: string;
  path: string;
  relative_path: string;
  parent: string;
  extension?: string | null;
  size: number;
  modified_ms?: number | null;
  category: "workspace" | "asset" | "internal" | string;
}

export interface ProjectFilePreview {
  relative_path: string;
  kind: "text" | "image" | "unsupported" | string;
  mime_type?: string | null;
  content?: string | null;
  data_url?: string | null;
  truncated: boolean;
  size: number;
}

interface AssetStore {
  files: ProjectFileEntry[];
  selectedRelativePath: string | null;
  preview: ProjectFilePreview | null;
  loading: boolean;
  previewLoading: boolean;
  error: string | null;
  loadFiles: (dirPath: string) => Promise<void>;
  selectFile: (dirPath: string, relativePath: string | null) => Promise<void>;
  importFiles: (dirPath: string, filePaths: string[]) => Promise<ProjectFileEntry[]>;
  clear: () => void;
}

export const useAssetStore = create<AssetStore>()((set, get) => ({
  files: [],
  selectedRelativePath: null,
  preview: null,
  loading: false,
  previewLoading: false,
  error: null,

  loadFiles: async (dirPath) => {
    set({ loading: true, error: null });
    try {
      const files = await invoke<ProjectFileEntry[]>("list_project_files", { dirPath });
      const selectedRelativePath = get().selectedRelativePath;
      const selectedStillExists =
        selectedRelativePath && files.some((entry) => entry.relative_path === selectedRelativePath);

      set({
        files,
        loading: false,
        selectedRelativePath: selectedStillExists ? selectedRelativePath : null,
        preview: selectedStillExists ? get().preview : null,
      });
    } catch (error) {
      set({
        files: [],
        loading: false,
        selectedRelativePath: null,
        preview: null,
        error: error instanceof Error ? error.message : "Unable to load files.",
      });
    }
  },

  selectFile: async (dirPath, relativePath) => {
    if (!relativePath) {
      set({ selectedRelativePath: null, preview: null, previewLoading: false });
      return;
    }

    set({ selectedRelativePath: relativePath, previewLoading: true, error: null });
    try {
      const preview = await invoke<ProjectFilePreview>("read_project_file_preview", {
        dirPath,
        relativePath,
      });
      set({ preview, previewLoading: false });
    } catch (error) {
      set({
        preview: null,
        previewLoading: false,
        error: error instanceof Error ? error.message : "Unable to preview file.",
      });
    }
  },

  importFiles: async (dirPath, filePaths) => {
    if (filePaths.length === 0) {
      return [];
    }

    set({ loading: true, error: null });
    try {
      const imported = await invoke<ProjectFileEntry[]>("import_project_files", {
        dirPath,
        filePaths,
      });
      const files = await invoke<ProjectFileEntry[]>("list_project_files", { dirPath });
      set({ files, loading: false });
      return imported;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to import files.",
      });
      return [];
    }
  },

  clear: () =>
    set({
      files: [],
      selectedRelativePath: null,
      preview: null,
      loading: false,
      previewLoading: false,
      error: null,
    }),
}));
