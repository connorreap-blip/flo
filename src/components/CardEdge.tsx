import { memo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { EDGE_TYPE_STYLES } from "../lib/constants";

function CardEdgeComponent(props: EdgeProps) {
  const data = props.data as Record<string, unknown> | undefined;
  const edgeType = (data?.edgeType as string) ?? "hierarchy";
  const sourceArrow = Boolean(data?.sourceArrow);
  const targetArrow = data?.targetArrow !== false;
  const style = EDGE_TYPE_STYLES[edgeType] ?? EDGE_TYPE_STYLES.hierarchy;

  const [edgePath] = getSmoothStepPath({
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

  return (
    <>
      <BaseEdge id={props.id} path={edgePath} style={strokeStyle} />
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
    </>
  );
}

export const CardEdge = memo(CardEdgeComponent);
