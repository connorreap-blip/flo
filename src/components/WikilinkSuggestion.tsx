import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

export interface WikilinkSuggestionItem {
  id: string;
  title: string;
}

export interface WikilinkSuggestionHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export interface WikilinkSuggestionProps {
  items: WikilinkSuggestionItem[];
  query: string;
  clientRect?: (() => DOMRect | null) | null;
  command: (item: WikilinkSuggestionItem) => void;
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

export const WikilinkSuggestion = forwardRef<WikilinkSuggestionHandle, WikilinkSuggestionProps>(
  function WikilinkSuggestion({ items, query, clientRect, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredItems = useMemo(() => {
      if (!query.trim()) {
        return items.slice(0, 8);
      }

      return items
        .map((item) => ({ item, score: fuzzyScore(item.title, query) }))
        .filter((entry) => entry.score >= 0)
        .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title))
        .map((entry) => entry.item)
        .slice(0, 8);
    }, [items, query]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [query, items]);

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex((current) =>
              filteredItems.length === 0 ? 0 : (current + 1) % filteredItems.length
            );
            return true;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex((current) =>
              filteredItems.length === 0
                ? 0
                : (current - 1 + filteredItems.length) % filteredItems.length
            );
            return true;
          }

          if (event.key === "Enter") {
            const item = filteredItems[selectedIndex];
            if (!item) {
              return false;
            }
            event.preventDefault();
            command(item);
            return true;
          }

          return false;
        },
      }),
      [command, filteredItems, selectedIndex]
    );

    const rect = clientRect?.();
    if (!rect) {
      return null;
    }

    return (
      <div
        className="wikilink-suggestion pixel-border"
        style={{
          top: rect.bottom + 8,
          left: rect.left,
          minWidth: 220,
          maxWidth: 320,
        }}
      >
        {filteredItems.length === 0 ? (
          <div className="px-3 py-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            No matching cards
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const selected = index === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                style={{
                  background: selected ? "var(--color-surface-high)" : "transparent",
                  color: selected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  command(item);
                }}
              >
                <span className="truncate text-xs">{item.title}</span>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                >
                  [[ ]]
                </span>
              </button>
            );
          })
        )}
      </div>
    );
  }
);
