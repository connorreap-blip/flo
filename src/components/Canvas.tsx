import { useCallback, useEffect, useMemo, useState } from "react";
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
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCanvasStore } from "../store/canvas-store";
import { CardNode } from "./CardNode";
import { CardEdge } from "./CardEdge";
import { ReferenceScopeDialog } from "./ReferenceScopeDialog";
import { GRID_SIZE } from "../lib/constants";

const nodeTypes: NodeTypes = { card: CardNode };
const edgeTypes: EdgeTypes = { card: CardEdge };

interface CanvasProps {
  selectedCardId?: string | null;
  onSelectedCardChange?: (cardId: string | null) => void;
}

export function Canvas({ selectedCardId = null, onSelectedCardChange }: CanvasProps) {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const showGrid = useCanvasStore((s) => s.showGrid);
  const showMinimap = useCanvasStore((s) => s.showMinimap);
  const snapToGrid = useCanvasStore((s) => s.snapToGrid);
  const updateCard = useCanvasStore((s) => s.updateCard);
  const storeAddEdge = useCanvasStore((s) => s.addEdge);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const { fitView } = useReactFlow();

  const [, setSelectedEdgeIds] = useState<string[]>([]);
  const [pendingRef, setPendingRef] = useState<{ source: string; target: string } | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const cardId = (event as CustomEvent<{ cardId?: string }>).detail?.cardId;
      if (!cardId) {
        return;
      }

      void fitView({
        nodes: [{ id: cardId }],
        duration: 250,
        padding: 0.35,
      });
    };

    window.addEventListener("flo:focus-card", handler as EventListener);
    return () => window.removeEventListener("flo:focus-card", handler as EventListener);
  }, [fitView]);

  useOnSelectionChange({
    onChange: ({ nodes: selNodes, edges: selEdges }) => {
      setSelectedEdgeIds(selEdges.map((e) => e.id));
      const nodeId = selNodes.length === 1 ? selNodes[0].id : null;
      onSelectedCardChange?.(nodeId);
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
        selected: selectedCardId === card.id,
        style: card.width ? { width: card.width, height: card.height } : undefined,
      })),
    [cards, selectedCardId]
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
          label: edge.label ?? "",
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

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        snapToGrid={snapToGrid}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.25}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        onMoveEnd={onMoveEnd}
        panOnDrag={true}
        selectionOnDrag={false}
        selectionKeyCode="Shift"
        nodesDraggable={true}
        nodesConnectable={true}
        className="canvas-grid-bg"
      >
        {showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={GRID_SIZE}
            size={1}
            color="var(--color-grid-dot)"
          />
        )}
        {showMinimap && (
          <MiniMap
            nodeColor="var(--color-card-border)"
            maskColor="rgba(0, 0, 0, 0.8)"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-card-border)",
            }}
          />
        )}
      </ReactFlow>
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
