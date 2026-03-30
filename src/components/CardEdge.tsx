import { memo, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { EDGE_TYPE_STYLES, EDGE_TYPE_LABELS } from "../lib/constants";
import { useCanvasStore } from "../store/canvas-store";
import type { EdgeType } from "../lib/types";

const EDGE_TYPES_LIST: EdgeType[] = ["hierarchy", "flow", "reference"];

function CardEdgeComponent(props: EdgeProps) {
  const data = props.data as Record<string, unknown> | undefined;
  const edgeType = (data?.edgeType as string) ?? "hierarchy";
  const sourceArrow = Boolean(data?.sourceArrow);
  const targetArrow = data?.targetArrow !== false;
  const edgeLabel = (data?.label as string) || "";
  const style = EDGE_TYPE_STYLES[edgeType] ?? EDGE_TYPE_STYLES.hierarchy;

  const updateEdge = useCanvasStore((s) => s.updateEdge);
  const [editingLabel, setEditingLabel] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    borderRadius: 0,
  });

  const strokeStyle: React.CSSProperties = {
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDasharray: style.dashArray,
  };

  const handleTypeChange = (newType: EdgeType) => {
    const isRef = newType === "reference";
    updateEdge(props.id, {
      edgeType: newType,
      sourceArrow: isRef ? false : undefined,
      targetArrow: isRef ? false : true,
      referenceScope: isRef ? "summary" : undefined,
    });
    setShowTypeMenu(false);
  };

  return (
    <>
      <BaseEdge id={props.id} path={edgePath} style={strokeStyle} />
      {/* Wide invisible path for easier click selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      <svg style={{ overflow: "visible", position: "absolute", top: 0, left: 0 }}>
        <defs>
          {targetArrow && (
            <marker
              id={`arrow-t-${props.id}`}
              viewBox="0 0 4 4"
              refX="4"
              refY="2"
              markerWidth="4"
              markerHeight="4"
              orient="auto"
            >
              <path d="M0,0 L4,2 L0,4 Z" fill={style.stroke} shapeRendering="crispEdges" />
            </marker>
          )}
          {sourceArrow && (
            <marker
              id={`arrow-s-${props.id}`}
              viewBox="0 0 4 4"
              refX="0"
              refY="2"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M4,0 L0,2 L4,4 Z" fill={style.stroke} shapeRendering="crispEdges" />
            </marker>
          )}
        </defs>
      </svg>
      {(targetArrow || sourceArrow) && (
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={style.strokeWidth}
          markerEnd={targetArrow ? `url(#arrow-t-${props.id})` : undefined}
          markerStart={sourceArrow ? `url(#arrow-s-${props.id})` : undefined}
        />
      )}
      {/* Edge label renderer — type badge + custom label */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {/* Type badge — clickable to change type */}
          {props.selected && (
            <div className="relative">
              <button
                onClick={() => setShowTypeMenu(!showTypeMenu)}
                className="px-1.5 py-0.5 text-[8px] transition-colors cursor-pointer"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  background: "var(--color-surface)",
                  color: style.stroke,
                  border: `1px solid ${style.stroke}60`,
                }}
                title="Click to change edge type"
              >
                {EDGE_TYPE_LABELS[edgeType] ?? edgeType}
              </button>
              {showTypeMenu && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col gap-0.5 p-1"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-card-border)",
                    borderRadius: "4px",
                    zIndex: 50,
                  }}
                >
                  {EDGE_TYPES_LIST.map((t) => (
                    <button
                      key={t}
                      onClick={() => handleTypeChange(t)}
                      className="px-2 py-1 text-[9px] whitespace-nowrap transition-colors hover:bg-[var(--color-surface-high)]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: edgeType === t ? "#FFFFFF" : "var(--color-text-muted)",
                        borderRadius: "3px",
                      }}
                    >
                      {EDGE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom label — double-click to edit */}
          {editingLabel ? (
            <input
              autoFocus
              className="bg-transparent text-[9px] text-center outline-none border-b px-1"
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
                width: 80,
              }}
              defaultValue={edgeLabel}
              onBlur={(e) => {
                updateEdge(props.id, { label: e.target.value.trim() });
                setEditingLabel(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur();
              }}
            />
          ) : edgeLabel ? (
            <span
              className="text-[9px] cursor-text px-1"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              onDoubleClick={() => setEditingLabel(true)}
            >
              {edgeLabel}
            </span>
          ) : props.selected ? (
            <span
              className="text-[8px] cursor-text px-1 opacity-40 italic"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              onDoubleClick={() => setEditingLabel(true)}
            >
              add label
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CardEdge = memo(CardEdgeComponent);
