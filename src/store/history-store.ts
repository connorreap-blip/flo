import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { CardComment } from "../lib/types";

export interface SnapshotMeta {
  filename: string;
  timestamp: string;
  summary: string;
  cardCount: number;
  edgeCount: number;
}

export interface SnapshotData {
  timestamp: string;
  meta?: {
    name: string;
    created: string;
    format_version: number;
    goal?: string | null;
  } | null;
  cards: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    position: { x: number; y: number };
    width?: number | null;
    height?: number | null;
    tags?: string[] | null;
    collapsed: boolean;
    has_doc: boolean;
    doc_content: string;
    agent_hint?: string | null;
    comments?: CardComment[] | null;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    edge_type?: string;
    source_arrow?: boolean;
    target_arrow?: boolean;
    reference_scope?: string;
    reference_section_hint?: string;
    label?: string;
  }>;
  viewport: { x: number; y: number; zoom: number };
  summary: string;
}

interface HistoryStore {
  snapshots: SnapshotMeta[];
  selectedFilename: string | null;
  selectedSnapshot: SnapshotData | null;
  loading: boolean;

  loadSnapshots: (dirPath: string) => Promise<void>;
  selectSnapshot: (dirPath: string, filename: string | null) => Promise<void>;
  clearSelection: () => void;
}

export const useHistoryStore = create<HistoryStore>()((set) => ({
  snapshots: [],
  selectedFilename: null,
  selectedSnapshot: null,
  loading: false,

  loadSnapshots: async (dirPath: string) => {
    set({ loading: true });
    try {
      const result = await invoke<
        Array<{
          filename: string;
          timestamp: string;
          summary: string;
          card_count: number;
          edge_count: number;
        }>
      >("list_snapshots", { dirPath });

      const snapshots: SnapshotMeta[] = result.map((s) => ({
        filename: s.filename,
        timestamp: s.timestamp,
        summary: s.summary,
        cardCount: s.card_count,
        edgeCount: s.edge_count,
      }));

      set({ snapshots, loading: false });
    } catch {
      set({ snapshots: [], loading: false });
    }
  },

  selectSnapshot: async (dirPath: string, filename: string | null) => {
    if (!filename) {
      set({ selectedFilename: null, selectedSnapshot: null });
      return;
    }
    try {
      const data = await invoke<SnapshotData>("load_snapshot", {
        dirPath,
        filename,
      });
      set({ selectedFilename: filename, selectedSnapshot: data });
    } catch {
      set({ selectedFilename: null, selectedSnapshot: null });
    }
  },

  clearSelection: () =>
    set({ selectedFilename: null, selectedSnapshot: null }),
}));
