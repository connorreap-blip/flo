import type { ProjectFileEntry } from "../store/asset-store";
import type { Card } from "./types";

export type WorkspaceCommandCategory = "card" | "doc" | "action" | "setting";
export type DocSlashCategory = "card" | "doc" | "file";

interface SearchableItem {
  id: string;
  label: string;
  keywords: string;
}

export interface WorkspaceCommandItem extends SearchableItem {
  category: WorkspaceCommandCategory;
  hint?: string;
  run: () => void | Promise<void>;
}

export interface DocSlashItem extends SearchableItem {
  category: DocSlashCategory;
  hint?: string;
  run: () => void | Promise<void>;
}

interface BuildWorkspaceCommandItemsArgs {
  cards: Card[];
  focusCard: (cardId: string) => void;
  openDocument: (cardId: string) => void;
  saveProject: () => void | Promise<void>;
  saveProjectAs: () => void | Promise<void>;
  loadProject: () => void | Promise<void>;
  exportContext: () => void | Promise<void>;
  toggleShowGrid: () => void;
  toggleMinimap: () => void;
  toggleSnapToGrid: () => void;
  openSettings?: () => void;
}

interface BuildDocSlashItemsArgs {
  cards: Card[];
  files: ProjectFileEntry[];
  insertCardReference: (cardId: string, title: string) => void;
  insertFileReference: (file: ProjectFileEntry) => void;
}

function buildCardKeywords(card: Card, includeDocContent: boolean): string {
  return [
    card.title,
    card.body,
    includeDocContent ? card.docContent : "",
    Array.isArray(card.tags) ? card.tags.join(" ") : "",
    card.type,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildWorkspaceCommandItems({
  cards,
  focusCard,
  openDocument,
  saveProject,
  saveProjectAs,
  loadProject,
  exportContext,
  toggleShowGrid,
  toggleMinimap,
  toggleSnapToGrid,
  openSettings,
}: BuildWorkspaceCommandItemsArgs): WorkspaceCommandItem[] {
  const cardItems = cards.map((card) => {
    const label = card.title || "Untitled";

    return {
      id: `card:${card.id}`,
      label,
      category: "card" as const,
      keywords: `${buildCardKeywords(card, false)} card`,
      hint: card.type,
      run: () => focusCard(card.id),
    };
  });

  const docItems = cards
    .filter((card) => card.hasDoc)
    .map((card) => {
      const label = card.title || "Untitled";

      return {
        id: `doc:${card.id}`,
        label,
        category: "doc" as const,
        keywords: `${buildCardKeywords(card, true)} doc document notes`,
        hint: "document",
        run: () => openDocument(card.id),
      };
    });

  return [
    ...cardItems,
    ...docItems,
    {
      id: "action:save",
      label: "Save Workspace",
      category: "action",
      keywords: "save workspace command",
      hint: "write files",
      run: () => saveProject(),
    },
    {
      id: "action:open",
      label: "Open Workspace Folder",
      category: "action",
      keywords: "open load workspace folder project",
      hint: "folder",
      run: () => loadProject(),
    },
    {
      id: "action:save-as",
      label: "Save Workspace As",
      category: "action",
      keywords: "save as workspace folder project duplicate",
      hint: "new path",
      run: () => saveProjectAs(),
    },
    {
      id: "action:export",
      label: "Export for AI",
      category: "action",
      keywords: "export ai context markdown",
      hint: "AI",
      run: () => exportContext(),
    },
    {
      id: "setting:grid",
      label: "Toggle Grid",
      category: "setting",
      keywords: "grid dots background",
      hint: "appearance",
      run: () => toggleShowGrid(),
    },
    {
      id: "setting:minimap",
      label: "Toggle Minimap",
      category: "setting",
      keywords: "minimap map overview",
      hint: "appearance",
      run: () => toggleMinimap(),
    },
    {
      id: "setting:snap",
      label: "Toggle Snap to Grid",
      category: "setting",
      keywords: "snap grid alignment",
      hint: "appearance",
      run: () => toggleSnapToGrid(),
    },
    {
      id: "setting:settings",
      label: "Open Settings",
      category: "setting",
      keywords: "settings preferences panel",
      hint: "workspace",
      run: () => openSettings?.(),
    },
  ];
}

export function buildDocSlashItems({
  cards,
  files,
  insertCardReference,
  insertFileReference,
}: BuildDocSlashItemsArgs): DocSlashItem[] {
  const cardItems = cards.map((card) => {
    const label = card.title || "Untitled";

    return {
      id: `card:${card.id}`,
      label,
      category: "card" as const,
      keywords: `${buildCardKeywords(card, false)} reference link`,
      hint: card.type,
      run: () => insertCardReference(card.id, label),
    };
  });

  const docItems = cards
    .filter((card) => card.hasDoc)
    .map((card) => {
      const label = card.title || "Untitled";

      return {
        id: `doc:${card.id}`,
        label,
        category: "doc" as const,
        keywords: `${buildCardKeywords(card, true)} doc document reference`,
        hint: "document",
        run: () => insertCardReference(card.id, label),
      };
    });

  const fileItems = files
    .filter((file) => file.category === "asset")
    .map((file) => ({
      id: `file:${file.relative_path}`,
      label: file.name,
      category: "file" as const,
      keywords: [
        file.name,
        file.relative_path,
        file.extension,
        "file attachment import asset",
      ]
        .filter(Boolean)
        .join(" "),
      hint: file.extension?.toUpperCase() ?? "file",
      run: () => insertFileReference(file),
    }));

  return [...cardItems, ...docItems, ...fileItems];
}

export function fuzzyScore(text: string, query: string) {
  const haystack = text.toLowerCase();
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return 0;
  }

  if (haystack.includes(needle)) {
    return needle.length * 10 - haystack.indexOf(needle);
  }

  let score = 0;
  let cursor = 0;

  for (const char of needle) {
    const nextIndex = haystack.indexOf(char, cursor);
    if (nextIndex === -1) {
      return -1;
    }
    score += 2;
    if (nextIndex === cursor) {
      score += 3;
    }
    cursor = nextIndex + 1;
  }

  return score;
}

function filterSearchItems<T extends SearchableItem>(items: T[], query: string): T[] {
  if (!query.trim()) {
    return items;
  }

  return items
    .map((item) => ({
      item,
      score: fuzzyScore(`${item.label} ${item.keywords}`, query),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score || left.item.label.localeCompare(right.item.label))
    .map((entry) => entry.item);
}

export function filterWorkspaceCommandItems(items: WorkspaceCommandItem[], query: string): WorkspaceCommandItem[] {
  return filterSearchItems(items, query);
}

export function filterDocSlashItems(items: DocSlashItem[], query: string): DocSlashItem[] {
  return filterSearchItems(items, query);
}
