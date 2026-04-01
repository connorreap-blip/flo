import { useCallback, useMemo, useState } from "react";
import { CARD_DEFAULTS, CARD_TYPE_LABELS, CARD_TYPE_STYLES } from "../lib/constants";
import { saveProject } from "../lib/file-ops";
import { runGovernor } from "../lib/governor";
import { suggestProjectGoal } from "../lib/suggestions";
import type { Card, Edge, GovernorWarning } from "../lib/types";
import { HealthCheckDialog } from "./HealthCheckDialog";
import { useCanvasStore } from "../store/canvas-store";
import { useDashboardStore, type ActivityEntry } from "../store/dashboard-store";
import { useProjectStore } from "../store/project-store";

type GovernorHealth = {
  label: string;
  detail: string;
  tone: string;
};

type MinimapModel = {
  viewBox: string;
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    dashArray?: string;
  }>;
  edges: Array<{
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    dashed: boolean;
  }>;
};

const EDGE_TYPE_LABELS = {
  hierarchy: "Hierarchy",
  flow: "Flow",
  reference: "Reference",
} as const;

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) {
    return "No edits yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = timestamp - Date.now();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }

  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }

  return rtf.format(Math.round(diffMs / day), "day");
}

function resolveGovernorHealth(warnings: GovernorWarning[]): GovernorHealth {
  const errors = warnings.filter((warning) => warning.severity === "error").length;
  const warningsCount = warnings.filter((warning) => warning.severity === "warning").length;
  const infoCount = warnings.filter((warning) => warning.severity === "info").length;

  if (errors > 0) {
    return {
      label: "Critical",
      detail: `${errors} blocking issue${errors === 1 ? "" : "s"} need cleanup`,
      tone: "var(--color-accent-error)",
    };
  }

  if (warningsCount > 0 || infoCount >= 4) {
    return {
      label: "Watch",
      detail: `${warningsCount + infoCount} signal${warningsCount + infoCount === 1 ? "" : "s"} worth reviewing`,
      tone: "#C9A84C",
    };
  }

  return {
    label: "Clear",
    detail: "Context structure is currently lean",
    tone: "var(--color-text-primary)",
  };
}

function buildMinimap(cards: Card[], edges: Edge[]): MinimapModel | null {
  if (cards.length === 0) {
    return null;
  }

  const bounds = cards.reduce(
    (acc, card) => {
      const width = card.width ?? CARD_DEFAULTS.width;
      const height = card.collapsed ? CARD_DEFAULTS.collapsedHeight : (card.height ?? CARD_DEFAULTS.height);
      acc.minX = Math.min(acc.minX, card.position.x);
      acc.minY = Math.min(acc.minY, card.position.y);
      acc.maxX = Math.max(acc.maxX, card.position.x + width);
      acc.maxY = Math.max(acc.maxY, card.position.y + height);
      return acc;
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  );

  const padding = 80;
  const cardMap = new Map(cards.map((card) => [card.id, card]));

  return {
    viewBox: `${bounds.minX - padding} ${bounds.minY - padding} ${Math.max(bounds.maxX - bounds.minX + padding * 2, 1)} ${Math.max(bounds.maxY - bounds.minY + padding * 2, 1)}`,
    nodes: cards.map((card) => {
      const style = CARD_TYPE_STYLES[card.type];
      return {
        id: card.id,
        x: card.position.x,
        y: card.position.y,
        width: card.width ?? CARD_DEFAULTS.width,
        height: card.collapsed ? CARD_DEFAULTS.collapsedHeight : (card.height ?? CARD_DEFAULTS.height),
        fill: style.bg,
        stroke: style.text,
        dashArray: card.type === "brainstorm" ? "10 6" : undefined,
      };
    }),
    edges: edges
      .map((edge) => {
        const source = cardMap.get(edge.source);
        const target = cardMap.get(edge.target);
        if (!source || !target) {
          return null;
        }

        const sourceWidth = source.width ?? CARD_DEFAULTS.width;
        const sourceHeight = source.collapsed ? CARD_DEFAULTS.collapsedHeight : (source.height ?? CARD_DEFAULTS.height);
        const targetWidth = target.width ?? CARD_DEFAULTS.width;
        const targetHeight = target.collapsed ? CARD_DEFAULTS.collapsedHeight : (target.height ?? CARD_DEFAULTS.height);

        return {
          id: edge.id,
          x1: source.position.x + sourceWidth / 2,
          y1: source.position.y + sourceHeight / 2,
          x2: target.position.x + targetWidth / 2,
          y2: target.position.y + targetHeight / 2,
          dashed: edge.edgeType === "reference",
        };
      })
      .filter(Boolean) as MinimapModel["edges"],
  };
}

function getActivityBadge(entry: ActivityEntry): { label: string; style: { backgroundColor: string; color: string; border: string } } {
  if (entry.subject === "card") {
    const typeStyle = CARD_TYPE_STYLES[entry.cardType];
    return {
      label: CARD_TYPE_LABELS[entry.cardType],
      style: {
        backgroundColor: typeStyle.bg,
        color: typeStyle.text,
        border: `1px solid ${typeStyle.text}40`,
      },
    };
  }

  return {
    label: EDGE_TYPE_LABELS[entry.edgeType],
    style: {
      backgroundColor: "var(--color-surface-high)",
      color: "var(--color-text-primary)",
      border: "1px solid var(--color-card-border)",
    },
  };
}

function getActivityTitle(entry: ActivityEntry): string {
  if (entry.subject === "card") {
    return entry.cardTitle;
  }

  return `${entry.sourceTitle} -> ${entry.targetTitle}`;
}

function getActivityDetail(entry: ActivityEntry): string | null {
  if (entry.subject === "card") {
    return null;
  }

  return `${EDGE_TYPE_LABELS[entry.edgeType]} link`;
}

function StatCard({
  label,
  value,
  tone,
  caption,
  onClick,
}: {
  label: string;
  value: string;
  tone?: string;
  caption?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span
        className="text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        {label}
      </span>
      <div className="space-y-1">
        <div
          className="text-2xl font-semibold"
          style={{
            color: tone ?? "var(--color-text-primary)",
            fontFamily: "var(--font-headline)",
          }}
        >
          {value}
        </div>
        {caption ? (
          <div className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
            {caption}
          </div>
        ) : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="pixel-border flex min-h-24 flex-col justify-between px-3 py-3 text-left transition-colors"
        style={{
          background: "linear-gradient(180deg, var(--color-surface-high) 0%, var(--color-surface) 100%)",
          cursor: "pointer",
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className="pixel-border flex min-h-24 flex-col justify-between px-3 py-3 text-left transition-colors"
      style={{
        background: "linear-gradient(180deg, var(--color-surface-high) 0%, var(--color-surface) 100%)",
      }}
    >
      {content}
    </div>
  );
}

function MetricRibbon({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="pixel-border flex items-center justify-between px-3 py-2"
      style={{ background: "var(--color-surface-lowest)" }}
    >
      <span
        className="text-[10px] uppercase tracking-[0.28em]"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        {label}
      </span>
      <span
        className="text-[11px]"
        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}
      >
        {value}
      </span>
    </div>
  );
}

export function HomeDashboard() {
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [goalSuggestion, setGoalSuggestion] = useState<string | null>(null);
  const project = useProjectStore((state) => state.project);
  const setProject = useProjectStore((state) => state.setProject);
  const cards = useCanvasStore((state) => state.cards);
  const edges = useCanvasStore((state) => state.edges);
  const cardCountByType = useDashboardStore((state) => state.cardCountByType);
  const edgeCount = useDashboardStore((state) => state.edgeCount);
  const totalWordCount = useDashboardStore((state) => state.totalWordCount);
  const activityLog = useDashboardStore((state) => state.activityLog);
  const lastEditedAt = useDashboardStore((state) => state.lastEditedAt);
  const disabledGovernorRules = useCanvasStore((state) => state.disabledGovernorRules);
  const governorBodyLineThreshold = useCanvasStore((state) => state.governorBodyLineThreshold);
  const governorHierarchyDepthThreshold = useCanvasStore((state) => state.governorHierarchyDepthThreshold);
  const governorReferenceChainDepthThreshold = useCanvasStore((state) => state.governorReferenceChainDepthThreshold);
  const governorRedundantOverlapThreshold = useCanvasStore((state) => state.governorRedundantOverlapThreshold);

  const warnings = useMemo(
    () =>
      runGovernor(cards, edges, {
        disabledRules: disabledGovernorRules,
        bodyLineThreshold: governorBodyLineThreshold,
        hierarchyDepthThreshold: governorHierarchyDepthThreshold,
        referenceChainDepthThreshold: governorReferenceChainDepthThreshold,
        redundantBodyOverlapThreshold: governorRedundantOverlapThreshold,
      }),
    [
      cards,
      disabledGovernorRules,
      edges,
      governorBodyLineThreshold,
      governorHierarchyDepthThreshold,
      governorRedundantOverlapThreshold,
      governorReferenceChainDepthThreshold,
    ]
  );
  const governorHealth = useMemo(() => resolveGovernorHealth(warnings), [warnings]);
  const minimap = useMemo(() => buildMinimap(cards, edges), [cards, edges]);
  const openHealthCheck = useCallback(() => setShowHealthCheck(true), []);
  const generateGoalSuggestion = useCallback(() => {
    setGoalSuggestion(suggestProjectGoal(project.name, cards, edges));
  }, [cards, edges, project.name]);

  const statCards = useMemo(
    () =>
      [
        { label: "PRJ", value: formatCount(cardCountByType.project), caption: "Project cards" },
        { label: "PRC", value: formatCount(cardCountByType.process), caption: "Process cards" },
        { label: "REF", value: formatCount(cardCountByType.reference), caption: "Reference cards" },
        { label: "BRN", value: formatCount(cardCountByType.brainstorm), caption: "Brainstorm cards" },
        { label: "Edges", value: formatCount(edgeCount), caption: "Total links" },
        { label: "Words", value: formatCount(totalWordCount), caption: "Face + docs" },
        {
          label: "Warnings",
          value: formatCount(warnings.length),
          caption: warnings.length === 0 ? "No governor findings" : "Governor findings",
          tone: warnings.length > 0 ? governorHealth.tone : undefined,
          onClick: openHealthCheck,
        },
      ] satisfies Array<{ label: string; value: string; caption: string; tone?: string; onClick?: () => void }>,
    [cardCountByType, edgeCount, governorHealth.tone, openHealthCheck, totalWordCount, warnings.length]
  );

  return (
    <div
      className="min-h-full px-4 py-4 sm:px-6"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 32%), var(--color-canvas-bg)",
      }}
    >
      <div className="mx-auto grid max-w-7xl gap-4 pb-20 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
        <section className="flex flex-col gap-4">
          <div
            className="pixel-border overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, var(--color-surface-high) 0%, var(--color-surface-lowest) 100%)",
            }}
          >
            <div className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1.1fr)_220px]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div
                    className="text-[10px] uppercase tracking-[0.32em]"
                    style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                  >
                    Home Dashboard
                  </div>
                  <div
                    className="text-3xl font-semibold leading-none"
                    style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-headline)" }}
                  >
                    {project.name}
                  </div>
                </div>

                <label className="block space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-[10px] uppercase tracking-[0.28em]"
                      style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                    >
                      Project Goal
                    </span>
                    <button
                      type="button"
                      className="border px-2 py-1 text-[10px] uppercase tracking-[0.22em]"
                      style={{
                        borderColor: "var(--color-card-border)",
                        color: "var(--color-text-secondary)",
                        background: "var(--color-surface-low)",
                        fontFamily: "var(--font-mono)",
                      }}
                      onClick={generateGoalSuggestion}
                    >
                      Suggest Goal
                    </button>
                  </div>
                  <textarea
                    value={project.goal ?? ""}
                    onChange={(event) =>
                      setProject({
                        ...project,
                        goal: event.target.value,
                      })
                    }
                    placeholder="Describe the workspace in one sentence so exported context stays focused."
                    className="min-h-28 w-full resize-none border px-3 py-3 text-sm outline-none transition-colors"
                    style={{
                      background: "var(--color-surface-lowest)",
                      color: "var(--color-text-primary)",
                      borderColor: "var(--color-card-border)",
                      fontFamily: "var(--font-body)",
                    }}
                  />
                  {goalSuggestion ? (
                    <div
                      className="space-y-3 border px-3 py-3"
                      style={{
                        borderColor: "var(--color-card-border)",
                        background: "var(--color-surface-low)",
                      }}
                    >
                      <div
                        className="text-[10px] uppercase tracking-[0.24em]"
                        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                      >
                        Suggested Goal
                      </div>
                      <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                        {goalSuggestion}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="border px-3 py-2 text-[10px] uppercase tracking-[0.22em]"
                          style={{
                            borderColor: "var(--color-card-border)",
                            color: "var(--color-text-secondary)",
                            fontFamily: "var(--font-mono)",
                          }}
                          onClick={() => setGoalSuggestion(null)}
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          className="border px-3 py-2 text-[10px] uppercase tracking-[0.22em]"
                          style={{
                            borderColor: "var(--color-text-primary)",
                            background: "var(--color-surface-high)",
                            color: "var(--color-text-primary)",
                            fontFamily: "var(--font-mono)",
                          }}
                          onClick={() => {
                            setProject({
                              ...project,
                              goal: goalSuggestion,
                            });
                            setGoalSuggestion(null);
                          }}
                        >
                          Apply Suggestion
                        </button>
                      </div>
                    </div>
                  ) : null}
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <MetricRibbon label="Last Edited" value={formatTimestamp(lastEditedAt)} />
                <MetricRibbon label="Cards" value={formatCount(cards.length)} />
                <MetricRibbon label="Hierarchy" value={edges.filter((edge) => edge.edgeType === "hierarchy").length.toString()} />
                <MetricRibbon label="References" value={edges.filter((edge) => edge.edgeType === "reference").length.toString()} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
            <StatCard
              label="Governor"
              value={governorHealth.label}
              tone={governorHealth.tone}
              caption={governorHealth.detail}
              onClick={openHealthCheck}
            />
          </div>

          <div
            className="pixel-border overflow-hidden"
            style={{ background: "linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-lowest) 100%)" }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--color-card-border)" }}>
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                >
                  Canvas Thumbnail
                </div>
                <div
                  className="mt-1 text-lg font-semibold"
                  style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-headline)" }}
                >
                  Structure at a glance
                </div>
              </div>
              <span
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              >
                Read only
              </span>
            </div>

            <div className="px-4 py-4">
              <div
                className="pixel-border aspect-[16/9] overflow-hidden"
                style={{
                  background:
                    "radial-gradient(circle at center, var(--color-surface-high) 0%, var(--color-surface-lowest) 72%)",
                }}
              >
                {minimap ? (
                  <svg className="h-full w-full" viewBox={minimap.viewBox} role="img" aria-label="Canvas minimap">
                    <rect
                      x={Number.parseFloat(minimap.viewBox.split(" ")[0])}
                      y={Number.parseFloat(minimap.viewBox.split(" ")[1])}
                      width={Number.parseFloat(minimap.viewBox.split(" ")[2])}
                      height={Number.parseFloat(minimap.viewBox.split(" ")[3])}
                      fill="transparent"
                    />
                    {minimap.edges.map((edge) => (
                      <line
                        key={edge.id}
                        x1={edge.x1}
                        y1={edge.y1}
                        x2={edge.x2}
                        y2={edge.y2}
                        stroke="var(--color-text-muted)"
                        strokeWidth="6"
                        strokeDasharray={edge.dashed ? "20 12" : undefined}
                        opacity="0.55"
                      />
                    ))}
                    {minimap.nodes.map((node) => (
                      <rect
                        key={node.id}
                        x={node.x}
                        y={node.y}
                        width={node.width}
                        height={node.height}
                        fill={node.fill}
                        stroke={node.stroke}
                        strokeWidth="6"
                        strokeDasharray={node.dashArray}
                      />
                    ))}
                  </svg>
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="space-y-2">
                      <div
                        className="text-sm"
                        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-headline)" }}
                      >
                        No canvas structure yet
                      </div>
                      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        Add items in Workspace and this thumbnail will mirror the structure.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-4">
          <div
            className="pixel-border overflow-hidden"
            style={{ background: "linear-gradient(180deg, var(--color-surface-high) 0%, var(--color-surface-lowest) 100%)" }}
          >
            <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-card-border)" }}>
              <div
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              >
                Context Tier
              </div>
              <button
                type="button"
                className="mt-1 text-left text-xl font-semibold"
                style={{ color: governorHealth.tone, fontFamily: "var(--font-headline)" }}
                onClick={openHealthCheck}
              >
                {governorHealth.label}
              </button>
              <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {governorHealth.detail}
              </p>
            </div>
            <div className="grid gap-px" style={{ background: "var(--color-card-border)" }}>
              {warnings.slice(0, 4).map((warning) => (
                <button
                  key={warning.id}
                  type="button"
                  className="px-4 py-3 text-left transition-colors"
                  style={{ background: "var(--color-surface-lowest)" }}
                  onClick={openHealthCheck}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-[10px] uppercase tracking-[0.25em]"
                      style={{
                        color:
                          warning.severity === "error"
                            ? "var(--color-accent-error)"
                            : warning.severity === "warning"
                              ? "#C9A84C"
                              : "var(--color-text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {warning.severity}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                      {warning.cardId ? "card" : "graph"}
                    </span>
                  </div>
                  <div className="mt-2 text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {warning.message}
                  </div>
                </button>
              ))}
              {warnings.length === 0 ? (
                <button
                  type="button"
                  className="px-4 py-4 text-left text-sm"
                  style={{ background: "var(--color-surface-lowest)", color: "var(--color-text-secondary)" }}
                  onClick={openHealthCheck}
                >
                  Governor is quiet. No structural warnings at the moment.
                </button>
              ) : null}
            </div>
          </div>

          <div
            className="pixel-border flex min-h-0 flex-1 flex-col overflow-hidden"
            style={{ background: "linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-lowest) 100%)" }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--color-card-border)" }}>
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                >
                  Activity Feed
                </div>
                <div
                  className="mt-1 text-lg font-semibold"
                  style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-headline)" }}
                >
                  Recent canvas changes
                </div>
              </div>
              {activityLog.length > 0 ? (
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                  {formatRelativeTime(activityLog[0].timestamp)}
                </span>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {activityLog.length === 0 ? (
                <div className="px-4 py-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Changes will appear here after cards or links are added, edited, or removed.
                </div>
              ) : (
                <div className="grid gap-px" style={{ background: "var(--color-card-border)" }}>
                  {activityLog.map((entry) => {
                    const badge = getActivityBadge(entry);
                    const detail = getActivityDetail(entry);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between gap-3 px-4 py-3"
                        style={{ background: "var(--color-surface-lowest)" }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.5 text-[9px]"
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontWeight: 600,
                                letterSpacing: "0.05em",
                                ...badge.style,
                              }}
                            >
                              {badge.label}
                            </span>
                            <span
                              className="text-[10px] uppercase tracking-[0.22em]"
                              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                            >
                              {entry.action}
                            </span>
                          </div>
                          <div className="mt-2 truncate text-sm" style={{ color: "var(--color-text-primary)" }}>
                            {getActivityTitle(entry)}
                          </div>
                          {detail ? (
                            <div className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              {detail}
                            </div>
                          ) : null}
                        </div>
                        <span
                          className="shrink-0 text-[10px]"
                          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
                        >
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
      <HealthCheckDialog open={showHealthCheck} onClose={() => setShowHealthCheck(false)} onSave={saveProject} />
    </div>
  );
}
