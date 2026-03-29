import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  type Node,
  type Edge as RFEdge,
  type Connection,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCanvasStore } from "../store/canvas-store";
import { CardNode } from "./CardNode";
import { CardEdge } from "./CardEdge";
import { GRID_SIZE } from "../lib/constants";

const nodeTypes: NodeTypes = {
  card: CardNode,
};

const edgeTypes: EdgeTypes = {
  card: CardEdge,
};

export function Canvas() {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const showGrid = useCanvasStore((s) => s.showGrid);
  const showMinimap = useCanvasStore((s) => s.showMinimap);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);
  const updateCard = useCanvasStore((s) => s.updateCard);
  const storeAddEdge = useCanvasStore((s) => s.addEdge);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const setViewport = useCanvasStore((s) => s.setViewport);

  const nodes: Node[] = useMemo(
    () =>
      cards.map((card) => ({
        id: card.id,
        type: "card",
        position: card.position,
        data: { ...card },
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
        storeAddEdge(connection.source, connection.target);
      }
    },
    [storeAddEdge]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        snapToGrid={snapToGrid}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.25}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        onMoveEnd={(_, viewport) => setViewport(viewport)}
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
    </div>
  );
}
