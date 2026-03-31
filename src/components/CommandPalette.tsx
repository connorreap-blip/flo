import { useEffect, useMemo, useRef, useState } from "react";
import { exportContext, loadProject, saveProject } from "../lib/file-ops";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";

type CommandCategory = "card" | "action" | "setting";

interface CommandItem {
  id: string;
  label: string;
  category: CommandCategory;
  keywords: string;
  run: () => void | Promise<void>;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

function fuzzyScore(text: string, query: string) {
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

export function CommandPalette({ open, onClose, onOpenSettings }: Props) {
  const cards = useCanvasStore((state) => state.cards);
  const toggleShowGrid = useCanvasStore((state) => state.toggleShowGrid);
  const toggleMinimap = useCanvasStore((state) => state.toggleMinimap);
  const toggleSnapToGrid = useCanvasStore((state) => state.toggleSnapToGrid);
  const openEditor = useCanvasStore((state) => state.openEditor);
  const setActiveTab = useProjectStore((state) => state.setActiveTab);
  const setActiveView = useProjectStore((state) => state.setActiveView);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<CommandItem[]>(() => {
    const cardItems = cards.map((card) => ({
      id: `card:${card.id}`,
      label: card.title || "Untitled",
      category: "card" as const,
      keywords: [
        card.title,
        card.body,
        Array.isArray(card.tags) ? card.tags.join(" ") : "",
        card.type,
      ]
        .filter(Boolean)
        .join(" "),
      run: () => {
        setActiveTab("layers");
        setActiveView("canvas");
        if (card.hasDoc) {
          openEditor(card.id, { x: 120, y: 120 });
        }
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            window.dispatchEvent(
              new CustomEvent("flo:focus-card", { detail: { cardId: card.id } })
            );
          });
        });
      },
    }));

    return [
      ...cardItems,
      {
        id: "action:save",
        label: "Save Project",
        category: "action",
        keywords: "save project command",
        run: () => saveProject(),
      },
      {
        id: "action:open",
        label: "Open Project",
        category: "action",
        keywords: "open load project",
        run: () => loadProject(),
      },
      {
        id: "action:export",
        label: "Export context.md",
        category: "action",
        keywords: "export context markdown",
        run: () => exportContext(),
      },
      {
        id: "setting:grid",
        label: "Toggle Grid",
        category: "setting",
        keywords: "grid dots background",
        run: () => toggleShowGrid(),
      },
      {
        id: "setting:minimap",
        label: "Toggle Minimap",
        category: "setting",
        keywords: "minimap map overview",
        run: () => toggleMinimap(),
      },
      {
        id: "setting:snap",
        label: "Toggle Snap to Grid",
        category: "setting",
        keywords: "snap grid alignment",
        run: () => toggleSnapToGrid(),
      },
      {
        id: "setting:settings",
        label: "Open Settings",
        category: "setting",
        keywords: "settings preferences panel",
        run: () => onOpenSettings?.(),
      },
    ];
  }, [
    cards,
    onOpenSettings,
    openEditor,
    setActiveTab,
    setActiveView,
    toggleMinimap,
    toggleShowGrid,
    toggleSnapToGrid,
  ]);

  const visibleItems = useMemo(() => {
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
  }, [items, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");
    setSelectedIndex(0);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (selectedIndex <= visibleItems.length - 1) {
      return;
    }
    setSelectedIndex(Math.max(visibleItems.length - 1, 0));
  }, [selectedIndex, visibleItems.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => (visibleItems.length === 0 ? 0 : (current + 1) % visibleItems.length));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) =>
          visibleItems.length === 0 ? 0 : (current - 1 + visibleItems.length) % visibleItems.length
        );
        return;
      }

      if (event.key === "Enter") {
        const selected = visibleItems[selectedIndex];
        if (!selected) {
          return;
        }
        event.preventDefault();
        void selected.run();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, open, selectedIndex, visibleItems]);

  if (!open) {
    return null;
  }

  const executeItem = (item: CommandItem) => {
    void item.run();
    onClose();
  };

  const cardItems = visibleItems.filter((item) => item.category === "card");
  const actionItems = visibleItems.filter((item) => item.category === "action");
  const settingItems = visibleItems.filter((item) => item.category === "setting");

  return (
    <div
      className="fixed inset-0 z-[140] flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{ background: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="pixel-border w-full max-w-3xl overflow-hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border-selected)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
        }}
      >
        <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-card-border)" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search cards, commands, or settings..."
            className="w-full bg-transparent text-sm outline-none"
            style={{
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {visibleItems.length === 0 ? (
            <div
              className="px-3 py-8 text-center text-xs"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              No matches for "{query}".
            </div>
          ) : (
            <>
              <Section
                title="Cards"
                items={cardItems}
                selectedIndex={selectedIndex}
                visibleItems={visibleItems}
                onHover={setSelectedIndex}
                onSelect={executeItem}
              />
              <Section
                title="Actions"
                items={actionItems}
                selectedIndex={selectedIndex}
                visibleItems={visibleItems}
                onHover={setSelectedIndex}
                onSelect={executeItem}
              />
              <Section
                title="Settings"
                items={settingItems}
                selectedIndex={selectedIndex}
                visibleItems={visibleItems}
                onHover={setSelectedIndex}
                onSelect={executeItem}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  selectedIndex,
  visibleItems,
  onHover,
  onSelect,
}: {
  title: string;
  items: CommandItem[];
  selectedIndex: number;
  visibleItems: CommandItem[];
  onHover: (index: number) => void;
  onSelect: (item: CommandItem) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 last:mb-0">
      <div
        className="px-3 py-2 text-[10px] uppercase tracking-[0.24em]"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const itemIndex = visibleItems.findIndex((entry) => entry.id === item.id);
          const selected = itemIndex === selectedIndex;

          return (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors"
              style={{
                background: selected ? "var(--color-surface-high)" : "transparent",
                color: selected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              }}
              onMouseEnter={() => onHover(itemIndex)}
              onClick={() => onSelect(item)}
            >
              <span className="text-sm">{item.label}</span>
              <span
                className="text-[10px] uppercase"
                style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}
              >
                {item.category}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
