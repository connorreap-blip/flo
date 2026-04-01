import { CARD_DEFAULTS, type CardType } from "../lib/constants";
import { useCanvasStore } from "../store/canvas-store";

type QuickAddOption = {
  label: string;
  title: string;
  type: CardType;
  offset: { x: number; y: number };
};

const QUICK_ADD_OPTIONS: QuickAddOption[] = [
  {
    label: "Add a task",
    title: "New Task",
    type: "process",
    offset: { x: CARD_DEFAULTS.width + 80, y: 0 },
  },
  {
    label: "Add a reference",
    title: "Reference Doc",
    type: "reference",
    offset: { x: CARD_DEFAULTS.width + 80, y: CARD_DEFAULTS.height + 40 },
  },
  {
    label: "Add a subtask",
    title: "Subtask",
    type: "process",
    offset: { x: 0, y: CARD_DEFAULTS.height + 72 },
  },
  {
    label: "Add a brainstorm note",
    title: "Ideas",
    type: "brainstorm",
    offset: { x: -(CARD_DEFAULTS.width + 80), y: CARD_DEFAULTS.height + 40 },
  },
];

export function EmptyCanvasPrompt() {
  const cards = useCanvasStore((state) => state.cards);
  const viewport = useCanvasStore((state) => state.viewport);
  const addCard = useCanvasStore((state) => state.addCard);

  if (cards.length > 1) {
    return null;
  }

  const anchorCard = cards.find((card) => card.type === "project") ?? cards[0];
  const basePosition = anchorCard
    ? anchorCard.position
    : {
        x: -viewport.x / viewport.zoom + 240,
        y: -viewport.y / viewport.zoom + 160,
      };

  const handleQuickAdd = (option: QuickAddOption) => {
    const cardId = addCard(option.type, option.title, {
      x: basePosition.x + option.offset.x,
      y: basePosition.y + option.offset.y,
    });

    window.dispatchEvent(new CustomEvent("flo:focus-card", { detail: { cardId } }));
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center px-4">
      <div
        className="pointer-events-auto max-w-2xl border px-4 py-4 backdrop-blur-sm"
        style={{
          borderColor: "var(--color-card-border)",
          background: "linear-gradient(180deg, var(--color-surface-high) 0%, var(--color-surface) 100%)",
          boxShadow: "0 18px 50px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-lg space-y-1">
            <div
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            >
              Quick Start
            </div>
            <p className="text-sm leading-6" style={{ color: "var(--color-text-primary)" }}>
              Start shaping the map with a few cards. Add structure first, then fill in the details.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_ADD_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleQuickAdd(option)}
                className="min-h-11 border px-3 py-2 text-left text-[11px] uppercase tracking-[0.2em] transition-colors"
                style={{
                  borderColor: "var(--color-card-border)",
                  color: "var(--color-text-primary)",
                  background: "var(--color-surface-lowest)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
