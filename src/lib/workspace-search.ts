import type { Card } from "./types";

export type WorkspaceCommandCategory = "card" | "doc" | "action" | "setting";

export interface WorkspaceCommandItem {
  id: string;
  label: string;
  category: WorkspaceCommandCategory;
  keywords: string;
  hint?: string;
  insertValue?: string;
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
      keywords: [
        card.title,
        card.body,
        Array.isArray(card.tags) ? card.tags.join(" ") : "",
        card.type,
        "card",
      ]
        .filter(Boolean)
        .join(" "),
      hint: card.type,
      insertValue: `[[${label}]]`,
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
        keywords: [
          card.title,
          card.body,
          card.docContent,
          Array.isArray(card.tags) ? card.tags.join(" ") : "",
          card.type,
          "doc document notes",
        ]
          .filter(Boolean)
          .join(" "),
        hint: "document",
        insertValue: `[[${label}]]`,
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

export function filterWorkspaceCommandItems(items: WorkspaceCommandItem[], query: string): WorkspaceCommandItem[] {
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
