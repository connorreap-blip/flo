import { Link, ArrowRight, GitBranch } from "lucide-react";
import type { EdgeType } from "../lib/types";

interface Props {
  position: { x: number; y: number };
  onSelect: (edgeType: EdgeType) => void;
  onClose: () => void;
}

const BUTTONS: { type: EdgeType; Icon: typeof Link; title: string }[] = [
  { type: "hierarchy", Icon: GitBranch, title: "Owns — parent/child structure" },
  { type: "flow", Icon: ArrowRight, title: "Then — step in a sequence" },
  { type: "reference", Icon: Link, title: "Ref — context link (no arrow)" },
];

export function HandleHover({ position, onSelect, onClose }: Props) {
  return (
    <div
      className="fixed z-[200] flex flex-col gap-0.5 pixel-border p-1"
      style={{
        left: position.x + 12,
        top: position.y - 28,
        background: "var(--color-surface)",
        borderColor: "var(--color-card-border)",
      }}
      onMouseLeave={onClose}
    >
      {BUTTONS.map(({ type, Icon, title }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          title={title}
          className="p-1.5 transition-colors hover:bg-[var(--color-surface-high)]"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
          }}
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
}
