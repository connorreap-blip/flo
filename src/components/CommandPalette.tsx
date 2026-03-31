import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { exportContext, loadProject, saveProject } from "../lib/file-ops";
import { buildWorkspaceCommandItems, filterWorkspaceCommandItems, type WorkspaceCommandItem } from "../lib/workspace-search";
import { useCanvasStore } from "../store/canvas-store";
import { useProjectStore } from "../store/project-store";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
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

  const focusCard = useCallback(
    (cardId: string, openDocument = false) => {
      const target = cards.find((entry) => entry.id === cardId);
      if (!target) {
        return;
      }

      setActiveTab("layers");
      setActiveView("canvas");

      if (openDocument || target.hasDoc) {
        openEditor(target.id, { x: 120, y: 120 });
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.dispatchEvent(
            new CustomEvent("flo:focus-card", { detail: { cardId: target.id } })
          );
        });
      });
    },
    [cards, openEditor, setActiveTab, setActiveView]
  );

  const items = useMemo<WorkspaceCommandItem[]>(
    () =>
      buildWorkspaceCommandItems({
        cards,
        focusCard: (cardId) => focusCard(cardId, false),
        openDocument: (cardId) => focusCard(cardId, true),
        saveProject,
        loadProject,
        exportContext,
        toggleShowGrid,
        toggleMinimap,
        toggleSnapToGrid,
        openSettings: onOpenSettings,
      }),
    [cards, focusCard, onOpenSettings, toggleMinimap, toggleShowGrid, toggleSnapToGrid]
  );

  const visibleItems = useMemo(() => filterWorkspaceCommandItems(items, query), [items, query]);

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

  const executeItem = (item: WorkspaceCommandItem) => {
    void item.run();
    onClose();
  };

  const cardItems = visibleItems.filter((item) => item.category === "card");
  const docItems = visibleItems.filter((item) => item.category === "doc");
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
            placeholder="Search cards, docs, commands, or settings..."
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
                title="Docs"
                items={docItems}
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
  items: WorkspaceCommandItem[];
  selectedIndex: number;
  visibleItems: WorkspaceCommandItem[];
  onHover: (index: number) => void;
  onSelect: (item: WorkspaceCommandItem) => void;
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
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{item.label}</div>
                {item.hint ? (
                  <div
                    className="mt-1 truncate text-[10px]"
                    style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                  >
                    {item.hint}
                  </div>
                ) : null}
              </div>
              <span
                className="ml-3 text-[10px] uppercase"
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
