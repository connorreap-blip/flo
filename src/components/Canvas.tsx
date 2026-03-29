import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  useOnSelectionChange,
  type Node,
  type Edge as RFEdge,
  type Connection,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  type EdgeTypes,
  type Viewport,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCanvasStore } from "../store/canvas-store";
import { CardNode } from "./CardNode";
import { CardEdge } from "./CardEdge";
import { FloatingToolbar } from "./FloatingToolbar";
import { ReferenceScopeDialog } from "./ReferenceScopeDialog";
import { GRID_SIZE } from "../lib/constants";

const nodeTypes: NodeTypes = { card: CardNode };
const edgeTypes: EdgeTypes = { card: CardEdge };

export function Canvas() {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const showGrid = useCanvasStore((s) => s.showGrid);
  const showMinimap = useCanvasStore((s) => s.showMinimap);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);
  const updateCard = useCanvasStore((s) => s.updateCard);
  const storeAddEdge = useCanvasStore((s) => s.addEdge);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const removeCard = useCanvasStore((s) => s.removeCard);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const editorMode = useCanvasStore((s) => s.editorMode);

  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [pendingRef, setPendingRef] = useState<{ source: string; target: string } | null>(null);

  useOnSelectionChange({
    onChange: ({ edges: selEdges }) => {
      setSelectedEdgeIds(selEdges.map((e) => e.id));
    },
  });

  const nodes: Node[] = useMemo(
    () =>
      cards.map((card) => ({
        id: card.id,
        type: "card",
        position: card.position,
        data: { ...card },
        width: card.width,
        height: card.height,
        style: card.width ? { width: card.width, height: card.height } : undefined,
      })),
    [cards]
  );

  const rfEdges: RFEdge[] = useMemo(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "card",
        data: {
          edgeType: edge.edgeType ?? "hierarchy",
          sourceArrow: edge.sourceArrow ?? false,
          targetArrow: edge.targetArrow ?? (edge.edgeType === "reference" ? false : true),
        },
      })),
    [edges]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          updateCard(change.id, { position: change.position });
        }
      }
    },
    [updateCard]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === "remove") {
          removeEdge(change.id);
        }
      }
    },
    [removeEdge]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        storeAddEdge(connection.source, connection.target, "hierarchy");
      }
    },
    [storeAddEdge]
  );

  const onMoveEnd = useCallback(
    (_: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (editorMode === "delete") removeCard(node.id);
    },
    [editorMode, removeCard]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      if (editorMode === "delete") removeEdge(edge.id);
    },
    [editorMode, removeEdge]
  );

  const isPanMode = editorMode === "pan";

  return (
    <div className="w-full h-full relative" style={{ cursor: editorMode === "delete" ? "crosshair" : undefined }}>
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={snapToGrid}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.25}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        onMoveEnd={onMoveEnd}
        panOnDrag={isPanMode ? true : [1, 2]}
        selectionOnDrag={!isPanMode}
        nodesDraggable={editorMode === "select"}
        nodesConnectable={editorMode === "select"}
        className="canvas-grid-bg"
      >
        {showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={GRID_SIZE}
            size={1}
            color="#1A1A1A"
          />
        )}
        {showMinimap && (
          <MiniMap
            nodeColor="#2A2A2A"
            maskColor="rgba(0, 0, 0, 0.8)"
            style={{
              backgroundColor: "#131313",
              border: "1px solid #2A2A2A",
            }}
          />
        )}
      </ReactFlow>
      <FloatingToolbar selectedEdgeIds={selectedEdgeIds} />
      {pendingRef && (
        <ReferenceScopeDialog
          open={true}
          onClose={() => setPendingRef(null)}
          sourceId={pendingRef.source}
          targetId={pendingRef.target}
        />
      )}
    </div>
  );
}
