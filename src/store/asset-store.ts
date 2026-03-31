import { create } from "zustand";

interface AssetStore {
  assets: string[];
}

export const useAssetStore = create<AssetStore>()(() => ({
  assets: [],
}));
