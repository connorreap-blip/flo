import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CARD_DEFAULTS } from "../lib/constants";
import { generateContextMd } from "../lib/export-context";
import { estimateContextWords } from "../lib/governor";
import { useProjectStore } from "../store/project-store";
import { useCanvasStore } from "../store/canvas-store";
import { diffLines, summarizeDiff } from "../lib/export-diff";

const AGENT_PROMPTS = [
  {
    id: "claude",
    label: "Claude / Claude Code",
    prompt: "Read the attached context.md and implement the next task in the plan.",
  },
  {
    id: "codex",
    label: "Codex",
    prompt: "Use context.md as your project map. Start with the highest-priority incomplete task.",
  },
  {
    id: "general",
    label: "General",
    prompt: "I've attached my project context. Review the structure and suggest what to work on next.",
  },
] as const;

function estimateTokenCount(words: number): number {
  return Math.max(1, Math.round(words * 1.3));
}

function getHeatColor(ratio: number): string {
  if (ratio <= 0.5) {
    const blend = ratio / 0.5;
    const red = Math.round(42 + (201 - 42) * blend);
    const green = Math.round(94 + (168 - 94) * blend);
    const blue = Math.round(170 - 94 * blend);
    return `rgba(${red}, ${green}, ${blue}, 0.34)`;
  }

  const blend = (ratio - 0.5) / 0.5;
  const red = Math.round(201 + (255 - 201) * blend);
  const green = Math.round(168 - 100 * blend);
  const blue = Math.round(76 - 32 * blend);
  return `rgba(${red}, ${green}, ${blue}, 0.38)`;
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        if (!line.trim()) {
          return <div key={index} className="h-2" />;
        }

        if (line.startsWith("### ")) {
          return (
            <h3 key={index} className="text-sm font-semibold" style={{ fontFamily: "var(--font-headline)" }}>
              {line.slice(4)}
            </h3>
          );
        }

        if (line.startsWith("## ")) {
          return (
            <h2
              key={index}
              className="border-t pt-3 text-base font-semibold"
              style={{ borderColor: "var(--color-card-border)", fontFamily: "var(--font-headline)" }}
            >
              {line.slice(3)}
            </h2>
          );
        }

        if (line.startsWith("# ")) {
          return (
            <h1 key={index} className="text-xl font-semibold" style={{ fontFamily: "var(--font-headline)" }}>
              {line.slice(2)}
            </h1>
          );
        }

        if (line.startsWith("> ")) {
          return (
            <p
              key={index}
              className="border-l pl-3 text-sm"
              style={{ borderColor: "var(--color-card-border)", color: "var(--color-text-secondary)" }}
            >
              {line.slice(2)}
            </p>
          );
        }

        if (/^\s*-\s/.test(line)) {
          const indent = Math.floor((line.match(/^(\s*)/)?.[1].length ?? 0) / 2);
          return (
            <p
              key={index}
              className="text-sm"
              style={{
                paddingLeft: `${indent * 1.2}rem`,
                color: "var(--color-text-primary)",
                fontFamily: line.includes("[") ? "var(--font-mono)" : "var(--font-body)",
              }}
            >
              {line.trim()}
            </p>
          );
        }

        if (/^\d+\.\s/.test(line)) {
          return (
            <p key={index} className="text-sm" style={{ color: "var(--color-text-primary)" }}>
              {line}
            </p>
          );
        }

        if (line.startsWith("<!-- ")) {
          return null;
        }

        return (
          <p key={index} className="text-sm leading-6" style={{ color: "var(--color-text-primary)" }}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function GhostPreview() {
  const project = useProjectStore((state) => state.project);
  const cards = useCanvasStore((state) => state.cards);
  const edges = useCanvasStore((state) => state.edges);
  const viewport = useCanvasStore((state) => state.viewport);
  const ghostPreviewMode = useCanvasStore((state) => state.ghostPreviewMode);
  const setGhostPreviewMode = useCanvasStore((state) => state.setGhostPreviewMode);

  const agentHintExportMode = useCanvasStore((state) => state.agentHintExportMode);
  const exportIncludeAgentHints = useCanvasStore((state) => state.exportIncludeAgentHints);
  const exportIncludeBrainstorm = useCanvasStore((state) => state.exportIncludeBrainstorm);
  const exportIncludeCardDocs = useCanvasStore((state) => state.exportIncludeCardDocs);
  const exportGoalOverride = useCanvasStore((state) => state.exportGoalOverride);
  const excludedTags = useCanvasStore((state) => state.excludedTags);
  const sectionReferenceWordCap = useCanvasStore((state) => state.sectionReferenceWordCap);
  const [showAgentPrompts, setShowAgentPrompts] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const lastExported = useCanvasStore((state) => state.lastExportedContextMd);

  const contextMd = useMemo(
    () => generateContextMd(project.name, cards, edges, project.goal, {
      agentHintExportMode,
      includeAgentHints: exportIncludeAgentHints,
      includeBrainstorm: exportIncludeBrainstorm,
      includeCardDocs: exportIncludeCardDocs,
      excludedTags,
      goalOverride: exportGoalOverride,
    }),
    [
      agentHintExportMode,
      cards,
      edges,
      excludedTags,
      exportGoalOverride,
      exportIncludeAgentHints,
      exportIncludeBrainstorm,
      exportIncludeCardDocs,
      project.goal,
      project.name,
    ]
  );

  const diff = useMemo(() => {
    if (!lastExported) return null;
    return diffLines(lastExported, contextMd);
  }, [lastExported, contextMd]);
  const diffSummary = useMemo(() => diff ? summarizeDiff(diff) : null, [diff]);

  const cardCosts = useMemo(() => {
    const costs = cards.map((card) => ({
      id: card.id,
      title: card.title,
      words: estimateContextWords(card, cards, edges, { sectionWordCap: sectionReferenceWordCap }),
      position: card.position,
      width: card.width ?? CARD_DEFAULTS.width,
      height: card.collapsed ? CARD_DEFAULTS.collapsedHeight : (card.height ?? CARD_DEFAULTS.height),
    }));
    const maxWords = Math.max(...costs.map((cost) => cost.words), 1);
    return {
      maxWords,
      items: costs.map((cost) => ({
        ...cost,
        ratio: cost.words / maxWords,
      })),
      totalWords: costs.reduce((sum, cost) => sum + cost.words, 0),
    };
  }, [cards, edges, sectionReferenceWordCap]);

  useEffect(() => {
    if (!copiedPromptId) {
      return;
    }

    const timer = window.setTimeout(() => setCopiedPromptId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedPromptId]);

  if (!ghostPreviewMode) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[60]">
      <div className="absolute inset-0" style={{ background: "rgba(6, 6, 6, 0.78)" }} />

      <div className="pointer-events-auto absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 border px-2 py-2" style={{
        borderColor: "var(--color-card-border)",
        background: "rgba(14, 14, 14, 0.92)",
        backdropFilter: "blur(10px)",
      }}>
        <span
          className="px-2 text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
        >
          Ghost Preview
        </span>
        <button
          type="button"
          className="border px-2 py-1 text-[10px] uppercase tracking-[0.24em]"
          aria-pressed={ghostPreviewMode === "read"}
          style={modeButtonStyle(ghostPreviewMode === "read")}
          onClick={() => setGhostPreviewMode("read")}
        >
          Read View
        </button>
        <button
          type="button"
          className="border px-2 py-1 text-[10px] uppercase tracking-[0.24em]"
          aria-pressed={ghostPreviewMode === "cost"}
          style={modeButtonStyle(ghostPreviewMode === "cost")}
          onClick={() => setGhostPreviewMode("cost")}
        >
          Cost View
        </button>
        {lastExported ? (
          <button
            type="button"
            className="border px-2 py-1 text-[10px] uppercase tracking-[0.24em]"
            aria-pressed={ghostPreviewMode === "diff"}
            style={modeButtonStyle(ghostPreviewMode === "diff")}
            onClick={() => setGhostPreviewMode("diff")}
          >
            Diff {diffSummary ? `+${diffSummary.added} -${diffSummary.removed}` : ""}
          </button>
        ) : null}
        <div
          className="px-2 text-[10px] uppercase tracking-[0.24em]"
          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}
        >
          {cardCosts.totalWords} words · ~{estimateTokenCount(cardCosts.totalWords)} tokens
        </div>
        <button
          type="button"
          className="border px-2 py-1 text-[10px] uppercase tracking-[0.24em]"
          style={modeButtonStyle(false)}
          onClick={() => setGhostPreviewMode(null)}
        >
          Close
        </button>
      </div>

      {ghostPreviewMode === "read" ? (
        <div
          className="pointer-events-auto absolute overflow-hidden border"
          style={{
            top: 72,
            right: 24,
            bottom: 24,
            width: "min(42rem, calc(100% - 3rem))",
            borderColor: "var(--color-card-border)",
            background: "rgba(12, 12, 12, 0.96)",
            boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div
            className="border-b px-4 py-3"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-lowest)" }}
          >
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
              What the agent reads
            </div>
          </div>
          <div className="h-full overflow-y-auto px-5 py-4">
            <MarkdownPreview markdown={contextMd} />
            <section
              className="mt-6 border-t pt-4"
              style={{ borderColor: "var(--color-card-border)" }}
              aria-label="Use with your agent"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 border px-3 py-3 text-left"
                aria-expanded={showAgentPrompts}
                onClick={() => setShowAgentPrompts((current) => !current)}
                style={{
                  borderColor: "var(--color-card-border)",
                  background: "var(--color-surface-lowest)",
                }}
              >
                <div>
                  <div
                    className="text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                  >
                    Use with your agent
                  </div>
                  <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    Copy a starter prompt for your handoff message.
                  </p>
                </div>
                {showAgentPrompts ? (
                  <ChevronDown size={16} style={{ color: "var(--color-text-muted)" }} />
                ) : (
                  <ChevronRight size={16} style={{ color: "var(--color-text-muted)" }} />
                )}
              </button>

              {showAgentPrompts ? (
                <div className="mt-3 space-y-3">
                  {AGENT_PROMPTS.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="border p-3"
                      style={{ borderColor: "var(--color-card-border)", background: "rgba(255,255,255,0.02)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div
                            className="text-[10px] uppercase tracking-[0.28em]"
                            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                          >
                            {prompt.label}
                          </div>
                          <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-primary)" }}>
                            {prompt.prompt}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 border px-3 py-2 text-[10px] uppercase tracking-[0.24em]"
                          onClick={async () => {
                            if (!navigator.clipboard) {
                              return;
                            }

                            try {
                              await navigator.clipboard.writeText(prompt.prompt);
                              setCopiedPromptId(prompt.id);
                            } catch {
                              setCopiedPromptId(null);
                            }
                          }}
                          style={{
                            borderColor: "var(--color-card-border)",
                            color:
                              copiedPromptId === prompt.id
                                ? "var(--color-text-primary)"
                                : "var(--color-text-muted)",
                            fontFamily: "var(--font-mono)",
                            background:
                              copiedPromptId === prompt.id
                                ? "var(--color-surface-high)"
                                : "transparent",
                          }}
                        >
                          {copiedPromptId === prompt.id ? "COPIED!" : "COPY"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : ghostPreviewMode === "diff" && diff ? (
        <div
          className="pointer-events-auto absolute overflow-hidden border"
          style={{
            top: 72,
            right: 24,
            bottom: 24,
            width: "min(42rem, calc(100% - 3rem))",
            borderColor: "var(--color-card-border)",
            background: "rgba(12, 12, 12, 0.96)",
            boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div
            className="border-b px-4 py-3"
            style={{ borderColor: "var(--color-card-border)", background: "var(--color-surface-lowest)" }}
          >
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
              Changes since last export
            </div>
          </div>
          <div className="h-full overflow-y-auto px-5 py-4 space-y-0">
            {diff.filter((line) => line.type !== "unchanged").map((line, i) => (
              <div
                key={i}
                className="text-xs py-0.5 px-2"
                style={{
                  background: line.type === "added" ? "rgba(74, 222, 128, 0.1)" : "rgba(248, 113, 113, 0.1)",
                  color: line.type === "added" ? "#4ade80" : "#f87171",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {line.type === "added" ? "+ " : "- "}{line.text}
              </div>
            ))}
            {diff.every((line) => line.type === "unchanged") ? (
              <div className="text-sm py-8 text-center" style={{ color: "var(--color-text-secondary)" }}>
                No changes since last export.
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="absolute inset-0" style={{ opacity: 0.18 }} />
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {cardCosts.items.map((cost) => (
              <div
                key={cost.id}
                className="absolute border"
                style={{
                  left: cost.position.x,
                  top: cost.position.y,
                  width: cost.width,
                  height: cost.height,
                  borderColor: getHeatColor(Math.min(cost.ratio + 0.1, 1)),
                  background: getHeatColor(cost.ratio),
                  boxShadow: `0 0 0 1px ${getHeatColor(cost.ratio)}, 0 0 30px ${getHeatColor(cost.ratio)}`,
                }}
              >
                <div
                  className="absolute left-2 top-2 inline-flex items-center gap-2 border px-2 py-1 text-[10px]"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    background: "rgba(8, 8, 8, 0.72)",
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span>{cost.words}w</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>~{estimateTokenCount(cost.words)}t</span>
                </div>
              </div>
            ))}
          </div>
          <div
            className="pointer-events-auto absolute bottom-6 left-6 max-w-sm border px-4 py-3"
            style={{
              borderColor: "var(--color-card-border)",
              background: "rgba(10, 10, 10, 0.94)",
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
              Estimated context cost
            </div>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-primary)" }}>
              Hotter cards contribute more words to exported context. Use this view to trim oversized summaries,
              documents, or full-scope references before handing the map to an agent.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function modeButtonStyle(active: boolean) {
  return {
    borderColor: active ? "var(--color-text-primary)" : "var(--color-card-border)",
    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    background: active ? "var(--color-surface-high)" : "transparent",
    fontFamily: "var(--font-mono)",
  };
}
