import { memo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

function CardEdgeComponent(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    borderRadius: 0,
  });

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        style={{
          stroke: "#555555",
          strokeWidth: 1.5,
        }}
      />
      {/* Pixel arrowhead at target */}
      <svg>
        <defs>
          <marker
            id={`arrow-${props.id}`}
            viewBox="0 0 4 4"
            refX="4"
            refY="2"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M0,0 L4,2 L0,4 Z" fill="#555555" shapeRendering="crispEdges" />
          </marker>
        </defs>
      </svg>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={1.5}
        markerEnd={`url(#arrow-${props.id})`}
      />
    </>
  );
}

export const CardEdge = memo(CardEdgeComponent);
