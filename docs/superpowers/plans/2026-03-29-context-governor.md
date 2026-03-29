# Context Governor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add semantic edge types, reference scoping, a Claude-grounded context governor, inline helpers, and a structured `context.md` export to flo.

**Architecture:** Edges gain an `edgeType` field (`hierarchy` | `flow` | `reference`) and reference edges gain a `referenceScope` field that controls how much context gets exported. A governor module validates the graph before save/export, producing actionable warnings. The export pipeline generates a flat `context.md` following Claude's optimal reading pattern: rules first, structure second, workflows third, references last.

**Tech Stack:** React 19, TypeScript, Zustand, React Flow, TipTap, Tauri v2, shadcn/ui (radix-nova), Tailwind CSS v4

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/lib/governor.ts` | Context governor rules engine: validates graph, returns typed warnings |
| `src/lib/export-context.ts` | Generates `context.md` from cards + edges with scoped references |
| `src/components/ReferenceScopeDialog.tsx` | Scope picker shown when creating a reference edge |
| `src/components/HealthCheckDialog.tsx` | Pre-save context health check UI |
| `src/components/HelperToast.tsx` | Inline coaching toast that appears at decision moments |
| `src/components/KanbanView.tsx` | Kanban layout derived from hierarchy edges |

### Modified files

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `edgeType`, `referenceScope`, `referenceSectionHint` to Edge. Add `GovernorWarning`, `ReferenceScope` types. |
| `src/lib/constants.ts` | Add `EDGE_TYPES`, `EDGE_TYPE_STYLES`, `REFERENCE_SCOPES` constants |
| `src/store/canvas-store.ts` | Update `addEdge` signature for edge type + scope. Add `dismissedHelpers`, `activeView`, helper management methods. |
| `src/components/CardEdge.tsx` | Render different stroke styles per `edgeType` (dashed for reference, bold for flow) |
| `src/components/FloatingToolbar.tsx` | Replace arrow-direction picker with edge-type picker. Add view toggle button. |
| `src/components/Canvas.tsx` | Intercept `onConnect` to show scope dialog for reference edges. Pass `edgeType` data. |
| `src/components/Toolbar.tsx` | Add export and health-check buttons |
| `src/lib/file-ops.ts` | Add `exportContext()` function. Update save/load to persist new edge fields. |
| `src/App.tsx` | Add `activeView` switch between Canvas and Kanban |
| `src/hooks/use-keyboard-shortcuts.ts` | Add Cmd+1/Cmd+2 for view switching, Cmd+E for export |

---

## Task 1: Edge Type and Reference Scope Types

**Files:**
- Modify: `src/lib/types.ts:17-23`
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Update Edge interface in types.ts**

Replace lines 17-23 of `src/lib/types.ts`:

```typescript
export type EdgeType = "hierarchy" | "flow" | "reference";
export type ReferenceScope = "title" | "summary" | "section" | "full";

export interface Edge {
  id: string;
  source: string;
  target: string;
  edgeType: EdgeType;
  sourceArrow?: boolean;
  targetArrow?: boolean;
  referenceScope?: ReferenceScope;
  referenceSectionHint?: string;
}

export interface GovernorWarning {
  id: string;
  severity: "error" | "warning" | "info";
  cardId?: string;
  edgeId?: string;
  message: string;
  detail: string;
  fix?: { label: string; action: "set-scope" | "remove-edge" | "convert-type" | "merge-cards" };
}
```

- [ ] **Step 2: Add edge type constants to constants.ts**

Append to `src/lib/constants.ts`:

```typescript
export const EDGE_TYPES = ["hierarchy", "flow", "reference"] as const;

export const EDGE_TYPE_LABELS: Record<string, string> = {
  hierarchy: "OWNS",
  flow: "THEN",
  reference: "REF",
};

export const EDGE_TYPE_STYLES: Record<string, {
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
  defaultSourceArrow: boolean;
  defaultTargetArrow: boolean;
}> = {
  hierarchy: {
    stroke: "#444444",
    strokeWidth: 1.5,
    defaultSourceArrow: false,
    defaultTargetArrow: true,
  },
  flow: {
    stroke: "#FFFFFF",
    strokeWidth: 1.5,
    defaultSourceArrow: false,
    defaultTargetArrow: true,
  },
  reference: {
    stroke: "#555555",
    strokeWidth: 1,
    dashArray: "4 4",
    defaultSourceArrow: false,
    defaultTargetArrow: false,
  },
};

export const REFERENCE_SCOPES = ["title", "summary", "section", "full"] as const;

export const REFERENCE_SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  title: { label: "Title only", description: "Just the card name in a 'See also' list" },
  summary: { label: "Summary", description: "Card title + body text (the card face)" },
  section: { label: "Specific section", description: "A specific heading from the card's document" },
  full: { label: "Full card", description: "Complete card including full document" },
};
```

- [ ] **Step 3: Verify types compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: No errors (store will have errors — that's fine, Task 2 fixes those)

Note: The store will show type errors because `addEdge` still uses the old signature. That's expected and fixed in Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: add edge type and reference scope types"
```

---

## Task 2: Update Store for Edge Types

**Files:**
- Modify: `src/store/canvas-store.ts:19-22,88-102`

- [ ] **Step 1: Update store interface and addEdge signature**

In `src/store/canvas-store.ts`, replace the Edges section of the interface (lines 19-22):

```typescript
  // Edges
  edges: Edge[];
  addEdge: (source: string, target: string, edgeType?: import("../lib/types").EdgeType, referenceScope?: import("../lib/types").ReferenceScope, referenceSectionHint?: string) => void;
  removeEdge: (id: string) => void;
  updateEdge: (id: string, updates: Partial<Edge>) => void;
```

Add view and helper state to the interface, after the `isDirty` / `markClean` lines:

```typescript
  // View
  activeView: "canvas" | "kanban";
  setActiveView: (view: "canvas" | "kanban") => void;

  // Helpers
  dismissedHelpers: string[];
  dismissHelper: (helperId: string) => void;
  resetHelpers: () => void;
```

- [ ] **Step 2: Update addEdge implementation**

Replace the `addEdge` implementation (lines 89-91):

```typescript
  addEdge: (source, target, edgeType = "hierarchy", referenceScope, referenceSectionHint) => {
    const id = uuid();
    const edge: Edge = {
      id,
      source,
      target,
      edgeType,
      sourceArrow: edgeType === "reference" ? false : undefined,
      targetArrow: edgeType === "reference" ? false : true,
      referenceScope: edgeType === "reference" ? (referenceScope ?? "summary") : undefined,
      referenceSectionHint: edgeType === "reference" ? referenceSectionHint : undefined,
    };
    set((s) => ({ edges: [...s.edges, edge], isDirty: true }));
  },
```

- [ ] **Step 3: Add view and helper state implementations**

After `markClean`, add:

```typescript
  activeView: "canvas",
  setActiveView: (view) => set({ activeView: view }),

  dismissedHelpers: [],
  dismissHelper: (helperId) =>
    set((s) => ({
      dismissedHelpers: [...s.dismissedHelpers, helperId],
    })),
  resetHelpers: () => set({ dismissedHelpers: [] }),
```

Also update `clearAll` to reset view and helpers:

```typescript
  clearAll: () =>
    set({
      cards: [],
      edges: [],
      openEditors: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      isDirty: false,
      project: { name: "Untitled Map", dirPath: null },
      activeView: "canvas",
      dismissedHelpers: [],
    }),
```

- [ ] **Step 4: Verify types compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: Errors in Canvas.tsx `onConnect` and file-ops.ts because they call `addEdge` with old args. These are expected and fixed in Tasks 4 and 6.

- [ ] **Step 5: Commit**

```bash
git add src/store/canvas-store.ts
git commit -m "feat: store supports edge types, reference scope, view state, helpers"
```

---

## Task 3: Visual Edge Rendering by Type

**Files:**
- Modify: `src/components/CardEdge.tsx`

- [ ] **Step 1: Rewrite CardEdge to render by edgeType**

Replace the entire contents of `src/components/CardEdge.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify no type errors in this file**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit 2>&1 | grep -c "CardEdge"`
Expected: 0 (no errors in CardEdge)

- [ ] **Step 3: Commit**

```bash
git add src/components/CardEdge.tsx
git commit -m "feat: render edges visually by type (hierarchy/flow/reference)"
```

---

## Task 4: Reference Scope Dialog + Canvas Wiring

**Files:**
- Create: `src/components/ReferenceScopeDialog.tsx`
- Modify: `src/components/Canvas.tsx:66-79,103-109`
- Modify: `src/components/FloatingToolbar.tsx`

- [ ] **Step 1: Create ReferenceScopeDialog**

Create `src/components/ReferenceScopeDialog.tsx`:

```tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCanvasStore } from "../store/canvas-store";
import { REFERENCE_SCOPES, REFERENCE_SCOPE_LABELS } from "../lib/constants";
import type { ReferenceScope } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  sourceId: string;
  targetId: string;
}

export function ReferenceScopeDialog({ open, onClose, sourceId, targetId }: Props) {
  const [scope, setScope] = useState<ReferenceScope>("summary");
  const [sectionHint, setSectionHint] = useState("");
  const addEdge = useCanvasStore((s) => s.addEdge);
  const targetCard = useCanvasStore((s) => s.cards.find((c) => c.id === targetId));

  const handleCreate = () => {
    addEdge(sourceId, targetId, "reference", scope, scope === "section" ? sectionHint : undefined);
    setScope("summary");
    setSectionHint("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm border"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-sm uppercase tracking-wider"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Reference Scope
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Referencing: <strong style={{ color: "var(--color-text-primary)" }}>{targetCard?.title || "Untitled"}</strong>
        </p>
        <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          What context does the agent need from this card?
        </p>
        <div className="space-y-2 pt-2">
          {REFERENCE_SCOPES.map((s) => {
            const { label, description } = REFERENCE_SCOPE_LABELS[s];
            return (
              <button
                key={s}
                onClick={() => setScope(s)}
                className="w-full text-left px-3 py-2 border flex flex-col gap-0.5"
                style={{
                  background: scope === s ? "var(--color-surface-high)" : "var(--color-surface-low)",
                  borderColor: scope === s ? "#FFFFFF" : "var(--color-card-border)",
                  color: "var(--color-text-primary)",
                }}
              >
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{description}</span>
              </button>
            );
          })}
          {scope === "section" && (
            <Input
              value={sectionHint}
              onChange={(e) => setSectionHint(e.target.value)}
              placeholder='e.g. "auth endpoints"'
              className="border mt-2"
              style={{
                background: "var(--color-surface-low)",
                borderColor: "var(--color-card-border)",
                color: "var(--color-text-primary)",
              }}
              autoFocus
            />
          )}
        </div>
        <Button
          onClick={handleCreate}
          className="w-full bg-white text-black font-bold hover:opacity-90 mt-2"
        >
          Link
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update Canvas.tsx to pass edgeType data and intercept reference connections**

Replace the `rfEdges` memo (lines 66-79) in `src/components/Canvas.tsx`:

```tsx
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
```

Add state for pending reference connection and the scope dialog. After the `selectedEdgeIds` state line add:

```tsx
  const [pendingRef, setPendingRef] = useState<{ source: string; target: string } | null>(null);
```

Replace the `onConnect` callback (lines 103-109):

```tsx
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // Default new connections to hierarchy. User can change type from toolbar.
        storeAddEdge(connection.source, connection.target, "hierarchy");
      }
    },
    [storeAddEdge]
  );
```

At the bottom of the Canvas return JSX, after `<FloatingToolbar .../>`, add:

```tsx
      {pendingRef && (
        <ReferenceScopeDialog
          open={true}
          onClose={() => setPendingRef(null)}
          sourceId={pendingRef.source}
          targetId={pendingRef.target}
        />
      )}
```

Add the import at the top of Canvas.tsx:

```tsx
import { ReferenceScopeDialog } from "./ReferenceScopeDialog";
```

- [ ] **Step 3: Update FloatingToolbar with edge type picker**

Replace the entire contents of `src/components/FloatingToolbar.tsx`:

```tsx
import { useCanvasStore } from "../store/canvas-store";
import { EDGE_TYPE_LABELS } from "../lib/constants";
import type { EdgeType } from "../lib/types";

interface Props {
  selectedEdgeIds: string[];
}

const EDGE_TYPES: EdgeType[] = ["hierarchy", "flow", "reference"];

export function FloatingToolbar({ selectedEdgeIds }: Props) {
  const editorMode = useCanvasStore((s) => s.editorMode);
  const setEditorMode = useCanvasStore((s) => s.setEditorMode);
  const edges = useCanvasStore((s) => s.edges);
  const updateEdge = useCanvasStore((s) => s.updateEdge);
  const activeView = useCanvasStore((s) => s.activeView);
  const setActiveView = useCanvasStore((s) => s.setActiveView);

  const selectedEdge = selectedEdgeIds.length === 1
    ? edges.find((e) => e.id === selectedEdgeIds[0])
    : undefined;

  const modeBtn = (mode: "select" | "pan" | "delete", label: string, title: string) => (
    <button
      key={mode}
      onClick={() => setEditorMode(mode)}
      title={title}
      className="px-2 py-1 text-[10px] transition-colors"
      style={{
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.05em",
        color: editorMode === mode ? "#FFFFFF" : "var(--color-text-muted)",
        background: editorMode === mode ? "var(--color-surface-high)" : "transparent",
        borderBottom: editorMode === mode ? "1px solid #FFFFFF" : "1px solid transparent",
      }}
    >
      {label}
    </button>
  );

  const handleEdgeTypeChange = (newType: EdgeType) => {
    if (!selectedEdge) return;
    const isRef = newType === "reference";
    updateEdge(selectedEdge.id, {
      edgeType: newType,
      sourceArrow: isRef ? false : selectedEdge.sourceArrow,
      targetArrow: isRef ? false : (selectedEdge.targetArrow ?? true),
      referenceScope: isRef ? (selectedEdge.referenceScope ?? "summary") : undefined,
    });
  };

  return (
    <div
      className="absolute bottom-4 left-4 z-50 flex items-center pixel-border"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-card-border)",
      }}
    >
      {/* Mode controls */}
      <div className="flex items-center px-1 py-0.5 gap-0.5">
        {modeBtn("select", "SEL", "Select / move")}
        {modeBtn("pan", "PAN", "Pan canvas")}
        {modeBtn("delete", "DEL", "Click to delete")}
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-card-border)" }} />

      {/* Edge type picker — when edge selected */}
      <div className="flex items-center px-1 py-0.5 gap-0.5">
        <span
          className="text-[9px] px-1"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
        >
          {selectedEdge ? "EDGE:" : "EDGE"}
        </span>
        {EDGE_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => handleEdgeTypeChange(t)}
            title={`Set edge to ${t}`}
            disabled={!selectedEdge}
            className="px-2 py-1 text-[10px] transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
              color: !selectedEdge
                ? "var(--color-text-muted)"
                : selectedEdge.edgeType === t
                ? "#FFFFFF"
                : "var(--color-text-muted)",
              background: selectedEdge?.edgeType === t ? "var(--color-surface-high)" : "transparent",
              opacity: !selectedEdge ? 0.4 : 1,
              cursor: !selectedEdge ? "default" : "pointer",
            }}
          >
            {EDGE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-card-border)" }} />

      {/* View toggle */}
      <div className="flex items-center px-1 py-0.5 gap-0.5">
        <button
          onClick={() => setActiveView("canvas")}
          title="Canvas view (Cmd+1)"
          className="px-2 py-1 text-[10px] transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
            color: activeView === "canvas" ? "#FFFFFF" : "var(--color-text-muted)",
            background: activeView === "canvas" ? "var(--color-surface-high)" : "transparent",
          }}
        >
          MAP
        </button>
        <button
          onClick={() => setActiveView("kanban")}
          title="Kanban view (Cmd+2)"
          className="px-2 py-1 text-[10px] transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
            color: activeView === "kanban" ? "#FFFFFF" : "var(--color-text-muted)",
            background: activeView === "kanban" ? "var(--color-surface-high)" : "transparent",
          }}
        >
          LIST
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify types compile (expect some remaining errors from NewCardDialog/file-ops)**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit 2>&1 | head -20`
Expected: Errors only in `NewCardDialog.tsx` (calls `addEdge` with old 2-arg form) and `file-ops.ts`. These are fixed in steps 5 and 6.

- [ ] **Step 5: Fix NewCardDialog to pass edgeType**

In `src/components/NewCardDialog.tsx`, replace line 49:

```tsx
      addEdge(parentCardId, newId);
```

with:

```tsx
      addEdge(parentCardId, newId, "hierarchy");
```

- [ ] **Step 6: Fix file-ops.ts edge loading**

In `src/lib/file-ops.ts`, update the edges type in the `invoke` result (line 68):

```tsx
      edges: Array<{ id: string; source: string; target: string; edgeType?: string; sourceArrow?: boolean; targetArrow?: boolean; referenceScope?: string; referenceSectionHint?: string }>;
```

And update `loadState` call (line 86) to map edges properly:

```tsx
  const mappedEdges = result.canvas.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    edgeType: (e.edgeType ?? "hierarchy") as import("../lib/types").EdgeType,
    sourceArrow: e.sourceArrow,
    targetArrow: e.targetArrow,
    referenceScope: e.referenceScope as import("../lib/types").ReferenceScope | undefined,
    referenceSectionHint: e.referenceSectionHint,
  }));
  store.loadState(cards, mappedEdges, result.canvas.viewport);
```

Also update `saveProject` to persist new edge fields. Replace the edges line in the `state` object (line 37):

```tsx
      edges: store.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        edge_type: e.edgeType,
        source_arrow: e.sourceArrow,
        target_arrow: e.targetArrow,
        reference_scope: e.referenceScope,
        reference_section_hint: e.referenceSectionHint,
      })),
```

- [ ] **Step 7: Verify clean compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add src/components/ReferenceScopeDialog.tsx src/components/Canvas.tsx src/components/FloatingToolbar.tsx src/components/NewCardDialog.tsx src/lib/file-ops.ts
git commit -m "feat: reference scope dialog, edge type picker, updated save/load"
```

---

## Task 5: Context Governor Rules Engine

**Files:**
- Create: `src/lib/governor.ts`

- [ ] **Step 1: Create the governor module**

Create `src/lib/governor.ts`:

```typescript
import type { Card, Edge, GovernorWarning } from "./types";
import { v4 as uuid } from "uuid";

/**
 * Governor rules grounded in how Claude reads context:
 *
 * 1. BODY_LENGTH: Card body > 3 lines should move detail to doc.
 *    Why: Claude body text is always exported. Long bodies bloat the always-on context.
 *
 * 2. UNSCOPED_REFERENCE: Reference edge with no scope or "full" scope.
 *    Why: Agent reads entire referenced card. Most references only need summary.
 *
 * 3. CIRCULAR_REFERENCE: A→B→...→A creates infinite context expansion.
 *    Why: Agent follows references recursively. Loops duplicate context.
 *
 * 4. HIERARCHY_DEPTH: Nesting > 3 levels deep.
 *    Why: Claude's optimal structure is 2-3 levels. Deeper nesting loses signal.
 *
 * 5. REDUNDANT_BODY: Two cards with >60% word overlap in body text.
 *    Why: Redundant rules confuse Claude when wording diverges slightly.
 *
 * 6. BRAINSTORM_REFERENCED: A non-brainstorm card references a brainstorm card.
 *    Why: Brainstorm cards are excluded from export. The reference is invisible to agents.
 *
 * 7. DEEP_REFERENCE_CHAIN: Reference chain > 3 hops.
 *    Why: Agent follows A→B→C→D, reading all four. Direct references are cheaper.
 *
 * 8. ORPHAN_CARD: Card with no edges at all.
 *    Why: May be forgotten context that should be connected or removed.
 */

export function runGovernor(cards: Card[], edges: Edge[]): GovernorWarning[] {
  const warnings: GovernorWarning[] = [];

  // Rule 1: Body length
  for (const card of cards) {
    const lineCount = card.body.split("\n").filter((l) => l.trim()).length;
    if (lineCount > 3) {
      warnings.push({
        id: uuid(),
        severity: "info",
        cardId: card.id,
        message: `"${card.title}" has a long body (${lineCount} lines)`,
        detail: "Card bodies are always included in agent context. Move detailed content to the card's document — the body should be a short statement of purpose.",
      });
    }
  }

  // Rule 2: Unscoped reference
  for (const edge of edges) {
    if (edge.edgeType === "reference" && (edge.referenceScope === "full" || !edge.referenceScope)) {
      const source = cards.find((c) => c.id === edge.source);
      const target = cards.find((c) => c.id === edge.target);
      const targetWordCount = (target?.body || "").split(/\s+/).length +
        (target?.docContent || "").split(/\s+/).length;
      warnings.push({
        id: uuid(),
        severity: "warning",
        edgeId: edge.id,
        cardId: edge.source,
        message: `${source?.title || "Card"} references ${target?.title || "Card"} with no scope`,
        detail: `Agent will read all ~${targetWordCount} words of ${target?.title || "the card"}'s content. Set a scope to control what the agent sees.`,
        fix: { label: "Set to summary", action: "set-scope" },
      });
    }
  }

  // Rule 3: Circular references
  const refEdges = edges.filter((e) => e.edgeType === "reference");
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function detectCycle(nodeId: string, path: string[]): string[] | null {
    if (inStack.has(nodeId)) return [...path, nodeId];
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const edge of refEdges) {
      if (edge.source === nodeId) {
        const cycle = detectCycle(edge.target, [...path, nodeId]);
        if (cycle) return cycle;
      }
    }
    inStack.delete(nodeId);
    return null;
  }

  const cycleChecked = new Set<string>();
  for (const card of cards) {
    if (!cycleChecked.has(card.id)) {
      visited.clear();
      inStack.clear();
      const cycle = detectCycle(card.id, []);
      if (cycle) {
        cycle.forEach((id) => cycleChecked.add(id));
        const names = cycle.map((id) => cards.find((c) => c.id === id)?.title || "?").join(" -> ");
        warnings.push({
          id: uuid(),
          severity: "error",
          message: `Circular reference detected`,
          detail: `${names}. Agent may re-read the same context multiple times.`,
        });
      }
    }
  }

  // Rule 4: Hierarchy depth
  const hierarchyEdges = edges.filter((e) => e.edgeType === "hierarchy");
  const parentMap = new Map<string, string>();
  for (const edge of hierarchyEdges) {
    parentMap.set(edge.target, edge.source);
  }

  function getDepth(cardId: string): number {
    let depth = 0;
    let current = cardId;
    const seen = new Set<string>();
    while (parentMap.has(current) && !seen.has(current)) {
      seen.add(current);
      current = parentMap.get(current)!;
      depth++;
    }
    return depth;
  }

  for (const card of cards) {
    const depth = getDepth(card.id);
    if (depth >= 4) {
      warnings.push({
        id: uuid(),
        severity: "warning",
        cardId: card.id,
        message: `"${card.title}" is nested ${depth} levels deep`,
        detail: "Claude works best with 2-3 levels of hierarchy. Deep nesting dilutes the relationship between this card and its root.",
      });
    }
  }

  // Rule 5: Redundant body text
  const cardBodies = cards
    .filter((c) => c.body.trim().length > 20)
    .map((c) => ({ id: c.id, title: c.title, words: new Set(c.body.toLowerCase().split(/\s+/)) }));

  for (let i = 0; i < cardBodies.length; i++) {
    for (let j = i + 1; j < cardBodies.length; j++) {
      const a = cardBodies[i];
      const b = cardBodies[j];
      const intersection = [...a.words].filter((w) => b.words.has(w)).length;
      const union = new Set([...a.words, ...b.words]).size;
      const overlap = union > 0 ? intersection / union : 0;
      if (overlap > 0.6) {
        warnings.push({
          id: uuid(),
          severity: "warning",
          cardId: a.id,
          message: `"${a.title}" and "${b.title}" have similar body text`,
          detail: "Redundant rules can confuse agents when wording differs. Keep the rule in one card and reference it from the other.",
          fix: { label: "Review", action: "merge-cards" },
        });
      }
    }
  }

  // Rule 6: Brainstorm referenced by non-brainstorm
  for (const edge of refEdges) {
    const source = cards.find((c) => c.id === edge.source);
    const target = cards.find((c) => c.id === edge.target);
    if (source && target && source.type !== "brainstorm" && target.type === "brainstorm") {
      warnings.push({
        id: uuid(),
        severity: "warning",
        edgeId: edge.id,
        cardId: edge.source,
        message: `"${source.title}" references brainstorm card "${target.title}"`,
        detail: "Brainstorm cards are excluded from agent context. This reference will be invisible to agents. Convert the brainstorm to a Process or Reference card if the idea has been decided.",
        fix: { label: "Convert to reference", action: "convert-type" },
      });
    }
  }

  // Rule 7: Deep reference chains
  function getRefChainDepth(cardId: string, seen: Set<string>): number {
    if (seen.has(cardId)) return 0;
    seen.add(cardId);
    let maxDepth = 0;
    for (const edge of refEdges) {
      if (edge.source === cardId) {
        maxDepth = Math.max(maxDepth, 1 + getRefChainDepth(edge.target, seen));
      }
    }
    return maxDepth;
  }

  for (const card of cards) {
    const chainDepth = getRefChainDepth(card.id, new Set());
    if (chainDepth >= 3) {
      warnings.push({
        id: uuid(),
        severity: "info",
        cardId: card.id,
        message: `"${card.title}" starts a reference chain ${chainDepth} levels deep`,
        detail: "Agent follows all references recursively. Consider direct references instead of chains.",
      });
    }
  }

  // Rule 8: Orphan cards
  const connectedIds = new Set(edges.flatMap((e) => [e.source, e.target]));
  for (const card of cards) {
    if (!connectedIds.has(card.id) && cards.length > 1) {
      warnings.push({
        id: uuid(),
        severity: "info",
        cardId: card.id,
        message: `"${card.title}" has no connections`,
        detail: "This card is isolated. Is it intentional, or should it be connected to the project?",
      });
    }
  }

  return warnings;
}

/**
 * Estimate the word count that would be included in a context.md export
 * for a given card, following its scoped references.
 */
export function estimateContextWords(card: Card, cards: Card[], edges: Edge[]): number {
  let words = (card.title + " " + card.body).split(/\s+/).length;

  // Hierarchy children — always full
  const children = edges
    .filter((e) => e.edgeType === "hierarchy" && e.source === card.id)
    .map((e) => cards.find((c) => c.id === e.target))
    .filter(Boolean) as Card[];

  for (const child of children) {
    words += (child.title + " " + child.body + " " + child.docContent).split(/\s+/).length;
  }

  // References — scoped
  const refs = edges.filter((e) => e.edgeType === "reference" && e.source === card.id);
  for (const ref of refs) {
    const target = cards.find((c) => c.id === ref.target);
    if (!target) continue;
    switch (ref.referenceScope) {
      case "title":
        words += target.title.split(/\s+/).length;
        break;
      case "summary":
        words += (target.title + " " + target.body).split(/\s+/).length;
        break;
      case "section":
        words += Math.min(
          (target.docContent || "").split(/\s+/).length,
          200 // estimate: section is ~200 words max
        );
        break;
      case "full":
      default:
        words += (target.title + " " + target.body + " " + (target.docContent || "")).split(/\s+/).length;
        break;
    }
  }

  return words;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/governor.ts
git commit -m "feat: context governor rules engine with 8 Claude-grounded rules"
```

---

## Task 6: Health Check Dialog

**Files:**
- Create: `src/components/HealthCheckDialog.tsx`
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: Create HealthCheckDialog**

Create `src/components/HealthCheckDialog.tsx`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "../store/canvas-store";
import { runGovernor, estimateContextWords } from "../lib/governor";
import type { GovernorWarning } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function HealthCheckDialog({ open, onClose, onSave }: Props) {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const updateEdge = useCanvasStore((s) => s.updateEdge);
  const updateCard = useCanvasStore((s) => s.updateCard);

  const warnings = runGovernor(cards, edges);
  const errors = warnings.filter((w) => w.severity === "error");
  const warns = warnings.filter((w) => w.severity === "warning");
  const infos = warnings.filter((w) => w.severity === "info");

  const totalWords = cards
    .filter((c) => c.type !== "brainstorm")
    .reduce((sum, c) => sum + estimateContextWords(c, cards, edges), 0);

  const contextLevel =
    totalWords < 2000 ? "Lean" : totalWords < 5000 ? "Standard" : totalWords < 10000 ? "Rich" : "Heavy";
  const contextColor =
    totalWords < 2000 ? "#44FF44" : totalWords < 5000 ? "#FFFFFF" : totalWords < 10000 ? "#FFAA00" : "#FF4444";

  const handleFix = (warning: GovernorWarning) => {
    if (warning.fix?.action === "set-scope" && warning.edgeId) {
      updateEdge(warning.edgeId, { referenceScope: "summary" });
    }
    if (warning.fix?.action === "convert-type" && warning.cardId) {
      const targetEdge = edges.find((e) => e.id === warning.edgeId);
      if (targetEdge) {
        const targetCard = cards.find((c) => c.id === targetEdge.target);
        if (targetCard) updateCard(targetCard.id, { type: "reference" });
      }
    }
  };

  const renderWarning = (w: GovernorWarning) => {
    const icon = w.severity === "error" ? "x" : w.severity === "warning" ? "!" : "i";
    const color = w.severity === "error" ? "#FF4444" : w.severity === "warning" ? "#FFAA00" : "var(--color-text-muted)";
    return (
      <div key={w.id} className="flex gap-2 py-2 border-b" style={{ borderColor: "var(--color-card-border)" }}>
        <span className="text-[10px] font-bold shrink-0 w-4 text-center" style={{ color, fontFamily: "var(--font-mono)" }}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs" style={{ color: "var(--color-text-primary)" }}>{w.message}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{w.detail}</p>
          {w.fix && (
            <button
              onClick={() => handleFix(w)}
              className="text-[10px] mt-1 px-2 py-0.5 border"
              style={{
                color: "#FFFFFF",
                borderColor: "var(--color-card-border)",
                background: "var(--color-surface-high)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {w.fix.label}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md border max-h-[80vh] overflow-y-auto"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-sm uppercase tracking-wider flex items-center justify-between"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            <span>Context Health</span>
            <span className="text-[10px] font-normal" style={{ color: "var(--color-text-muted)" }}>
              {warnings.length} {warnings.length === 1 ? "issue" : "issues"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Context estimate */}
        <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--color-card-border)" }}>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
            EXPORT ESTIMATE
          </span>
          <span className="text-xs font-semibold" style={{ color: contextColor, fontFamily: "var(--font-mono)" }}>
            ~{totalWords.toLocaleString()} words ({contextLevel})
          </span>
        </div>

        {/* Warnings */}
        <div className="space-y-0">
          {errors.map(renderWarning)}
          {warns.map(renderWarning)}
          {infos.map(renderWarning)}
        </div>

        {warnings.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--color-text-muted)" }}>
            All clear. Context is well-structured.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 text-xs border"
            style={{
              background: "var(--color-surface-high)",
              borderColor: "var(--color-card-border)",
              color: "var(--color-text-primary)",
            }}
          >
            Close
          </Button>
          <Button
            onClick={() => { onSave(); onClose(); }}
            className="flex-1 text-xs bg-white text-black font-bold hover:opacity-90"
          >
            {errors.length > 0 ? "Save anyway" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add health check button to Toolbar**

In `src/components/Toolbar.tsx`, add import at top:

```tsx
import { useState } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { NewCardDialog } from "./NewCardDialog";
import { HealthCheckDialog } from "./HealthCheckDialog";
import { saveProject, loadProject } from "../lib/file-ops";
```

Add state after `editingName`:

```tsx
  const [showHealthCheck, setShowHealthCheck] = useState(false);
```

Add a button before the Save button (between the Open and Save buttons):

```tsx
          <button
            onClick={() => setShowHealthCheck(true)}
            className="text-xs px-3 py-1.5 border"
            style={{
              background: "var(--color-surface-high)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-card-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Check
          </button>
```

At the bottom of the component, before the closing `</>`, add:

```tsx
      <HealthCheckDialog
        open={showHealthCheck}
        onClose={() => setShowHealthCheck(false)}
        onSave={() => saveProject()}
      />
```

- [ ] **Step 3: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/HealthCheckDialog.tsx src/components/Toolbar.tsx
git commit -m "feat: health check dialog with governor warnings and context estimate"
```

---

## Task 7: Context Export Pipeline

**Files:**
- Create: `src/lib/export-context.ts`
- Modify: `src/lib/file-ops.ts`
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: Create export-context.ts**

Create `src/lib/export-context.ts`:

```typescript
import type { Card, Edge } from "./types";
import { CARD_TYPE_LABELS } from "./constants";

/**
 * Generate context.md following Claude's optimal reading pattern:
 * 1. Rules first (highest value per word — top of context gets most attention)
 * 2. Structure second (orientation)
 * 3. Workflows third (sequences)
 * 4. Data/References last (supplementary)
 *
 * Brainstorm cards are always excluded.
 * Reference edges are resolved at their specified scope.
 */
export function generateContextMd(
  projectName: string,
  cards: Card[],
  edges: Edge[]
): string {
  const activeCards = cards.filter((c) => c.type !== "brainstorm");
  const hierarchyEdges = edges.filter((e) => e.edgeType === "hierarchy");
  const flowEdges = edges.filter((e) => e.edgeType === "flow");
  const refEdges = edges.filter((e) => e.edgeType === "reference");

  const lines: string[] = [];

  lines.push(`# ${projectName}`);
  lines.push("");
  lines.push(`> Generated by flo from ${activeCards.length} cards and ${edges.length} connections.`);
  lines.push("");

  // --- Section 1: Rules ---
  // Extract constraint-style content from project and process card bodies.
  const ruleCards = activeCards.filter(
    (c) => (c.type === "project" || c.type === "process") && c.body.trim()
  );
  if (ruleCards.length > 0) {
    lines.push("## Rules");
    lines.push("");
    for (const card of ruleCards) {
      const bodyLines = card.body.split("\n").filter((l) => l.trim());
      for (const line of bodyLines) {
        lines.push(`- ${line.trim()}`);
      }
    }
    lines.push("");
  }

  // --- Section 2: Structure ---
  // Build tree from hierarchy edges.
  const roots = activeCards.filter(
    (c) => !hierarchyEdges.some((e) => e.target === c.id)
  );
  const childrenOf = (parentId: string): Card[] =>
    hierarchyEdges
      .filter((e) => e.source === parentId)
      .map((e) => activeCards.find((c) => c.id === e.target))
      .filter(Boolean) as Card[];

  if (hierarchyEdges.length > 0) {
    lines.push("## Structure");
    lines.push("");
    function renderTree(card: Card, indent: number) {
      const prefix = "  ".repeat(indent) + "- ";
      const tag = `[${CARD_TYPE_LABELS[card.type]}]`;
      lines.push(`${prefix}${tag} ${card.title}${card.body ? ": " + card.body.split("\n")[0] : ""}`);
      for (const child of childrenOf(card.id)) {
        renderTree(child, indent + 1);
      }
    }
    for (const root of roots) {
      renderTree(root, 0);
    }
    lines.push("");
  }

  // --- Section 3: Workflows ---
  // Follow flow edges to build ordered sequences.
  if (flowEdges.length > 0) {
    lines.push("## Workflows");
    lines.push("");

    // Find flow chain starts (source not a target of any flow edge)
    const flowTargets = new Set(flowEdges.map((e) => e.target));
    const flowStarts = flowEdges
      .filter((e) => !flowTargets.has(e.source))
      .map((e) => e.source);
    const uniqueStarts = [...new Set(flowStarts)];

    for (const startId of uniqueStarts) {
      let current: string | undefined = startId;
      let step = 1;
      const visited = new Set<string>();
      while (current && !visited.has(current)) {
        visited.add(current);
        const card = activeCards.find((c) => c.id === current);
        if (card) {
          lines.push(`${step}. **${card.title}**${card.body ? " — " + card.body.split("\n")[0] : ""}`);
          step++;
        }
        const next = flowEdges.find((e) => e.source === current);
        current = next?.target;
      }
      lines.push("");
    }
  }

  // --- Section 4: Context References ---
  // Resolve reference edges at their scoped level.
  if (refEdges.length > 0) {
    lines.push("## Context References");
    lines.push("");

    for (const ref of refEdges) {
      const source = activeCards.find((c) => c.id === ref.source);
      const target = activeCards.find((c) => c.id === ref.target);
      if (!source || !target) continue;

      switch (ref.referenceScope) {
        case "title":
          lines.push(`- When working on ${source.title}, see also: ${target.title}`);
          break;
        case "summary":
          lines.push(`- When working on ${source.title}, see: **${target.title}** — ${target.body || "(no description)"}`);
          break;
        case "section":
          lines.push(`- When working on ${source.title}, see: **${target.title}** > ${ref.referenceSectionHint || "relevant section"}`);
          break;
        case "full":
        default:
          lines.push(`- When working on ${source.title}, see: **${target.title}** (full context)`);
          if (target.body) lines.push(`  ${target.body}`);
          break;
      }
    }
    lines.push("");
  }

  // --- Section 5: Card Documents ---
  // Include full docs for hierarchy root cards and any "full" scoped references.
  const fullDocCards = activeCards.filter(
    (c) => c.hasDoc && c.docContent.trim()
  );
  const fullRefTargets = new Set(
    refEdges.filter((e) => e.referenceScope === "full").map((e) => e.target)
  );
  const docsToInclude = fullDocCards.filter(
    (c) =>
      !hierarchyEdges.some((e) => e.target === c.id) || // root cards
      fullRefTargets.has(c.id) // full-scope referenced
  );

  if (docsToInclude.length > 0) {
    lines.push("## Detailed Documents");
    lines.push("");
    for (const card of docsToInclude) {
      lines.push(`### ${card.title}`);
      lines.push("");
      // Strip HTML tags from docContent for plain markdown
      const plainText = card.docContent
        .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
        .replace(/<em>(.*?)<\/em>/g, "*$1*")
        .replace(/<p><\/p>/g, "\n")
        .replace(/<p>(.*?)<\/p>/g, "$1\n")
        .replace(/<li>(.*?)<\/li>/g, "- $1\n")
        .replace(/<[^>]+>/g, "")
        .trim();
      lines.push(plainText);
      lines.push("");
    }
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Add exportContext to file-ops.ts**

Add at the bottom of `src/lib/file-ops.ts`:

```typescript
import { generateContextMd } from "./export-context";

export async function exportContext(): Promise<void> {
  const store = useCanvasStore.getState();
  const contextMd = generateContextMd(store.project.name, store.cards, store.edges);

  const selected = await save({
    title: "Export context.md",
    defaultPath: "context.md",
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!selected) return;

  await invoke("write_file", { path: selected, content: contextMd });
}
```

Note: This requires a `write_file` Tauri command. If it doesn't exist yet, we'll use the `@tauri-apps/plugin-fs` `writeTextFile` instead:

```typescript
import { writeTextFile } from "@tauri-apps/plugin-fs";

export async function exportContext(): Promise<void> {
  const store = useCanvasStore.getState();
  const contextMd = generateContextMd(store.project.name, store.cards, store.edges);

  const selected = await save({
    title: "Export context.md",
    defaultPath: "context.md",
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!selected) return;

  await writeTextFile(selected, contextMd);
}
```

- [ ] **Step 3: Add Export button to Toolbar**

In `src/components/Toolbar.tsx`, add import:

```tsx
import { saveProject, loadProject, exportContext } from "../lib/file-ops";
```

Add an Export button after the Check button:

```tsx
          <button
            onClick={() => exportContext()}
            className="text-xs px-3 py-1.5 border"
            style={{
              background: "var(--color-surface-high)",
              color: "var(--color-text-primary)",
              borderColor: "var(--color-card-border)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Export
          </button>
```

- [ ] **Step 4: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/export-context.ts src/lib/file-ops.ts src/components/Toolbar.tsx
git commit -m "feat: context.md export pipeline with Claude-optimal structure"
```

---

## Task 8: Inline Helper Toast

**Files:**
- Create: `src/components/HelperToast.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create HelperToast component**

Create `src/components/HelperToast.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store";

interface HelperMessage {
  id: string;
  message: string;
  detail: string;
  fixLabel?: string;
  fixAction?: () => void;
}

/**
 * Proactive inline coach. Shows contextual tips based on user actions.
 * Each helper ID is dismissible permanently via the store.
 * Tips appear at the moment of decision and auto-dismiss after 8s.
 */
export function HelperToast() {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const dismissedHelpers = useCanvasStore((s) => s.dismissedHelpers);
  const dismissHelper = useCanvasStore((s) => s.dismissHelper);
  const [activeHelper, setActiveHelper] = useState<HelperMessage | null>(null);
  const [prevCounts, setPrevCounts] = useState({ cards: 0, edges: 0 });

  useEffect(() => {
    // Check for helper triggers when cards/edges change
    const unscopedRefCount = edges.filter(
      (e) => e.edgeType === "reference" && (e.referenceScope === "full" || !e.referenceScope)
    ).length;

    // Helper: first reference edge created
    if (
      edges.filter((e) => e.edgeType === "reference").length === 1 &&
      prevCounts.edges < edges.length &&
      !dismissedHelpers.includes("first-reference")
    ) {
      setActiveHelper({
        id: "first-reference",
        message: "References let agents see related cards.",
        detail: "You can scope what they see — a summary is usually enough. Select the edge and change its type in the toolbar.",
      });
    }

    // Helper: 5+ unscoped references
    if (
      unscopedRefCount >= 5 &&
      !dismissedHelpers.includes("many-unscoped") &&
      !activeHelper
    ) {
      setActiveHelper({
        id: "many-unscoped",
        message: `${unscopedRefCount} references have no scope set.`,
        detail: "Each unscoped reference includes the full card content. Consider scoping them to 'summary' to keep agent context focused.",
      });
    }

    // Helper: long card body
    const longBodyCard = cards.find(
      (c) => c.body.split("\n").filter((l) => l.trim()).length > 3
    );
    if (
      longBodyCard &&
      prevCounts.cards <= cards.length &&
      !dismissedHelpers.includes("long-body") &&
      !activeHelper
    ) {
      setActiveHelper({
        id: "long-body",
        message: "Card bodies should be short statements.",
        detail: "Body text is always included in agent context. Move detailed content to the card's document — click the DOC button to add one.",
      });
    }

    setPrevCounts({ cards: cards.length, edges: edges.length });
  }, [cards.length, edges.length]);

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!activeHelper) return;
    const timer = setTimeout(() => setActiveHelper(null), 8000);
    return () => clearTimeout(timer);
  }, [activeHelper]);

  if (!activeHelper) return null;

  return (
    <div
      className="fixed bottom-16 left-4 z-[100] max-w-sm pixel-border p-3 flex flex-col gap-1"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-card-border)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {activeHelper.message}
        </p>
        <button
          onClick={() => {
            dismissHelper(activeHelper.id);
            setActiveHelper(null);
          }}
          className="text-[10px] shrink-0 px-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          x
        </button>
      </div>
      <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
        {activeHelper.detail}
      </p>
      <button
        onClick={() => {
          dismissHelper(activeHelper.id);
          setActiveHelper(null);
        }}
        className="text-[10px] self-end mt-1 px-2 py-0.5"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        GOT IT
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add HelperToast to App.tsx**

In `src/App.tsx`, add import:

```tsx
import { HelperToast } from "./components/HelperToast";
```

Add `<HelperToast />` inside the main app div, after the footer:

```tsx
      <HelperToast />
```

- [ ] **Step 3: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/HelperToast.tsx src/App.tsx
git commit -m "feat: inline helper toast with dismissible contextual coaching"
```

---

## Task 9: Kanban View

**Files:**
- Create: `src/components/KanbanView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create KanbanView component**

Create `src/components/KanbanView.tsx`:

```tsx
import { useMemo } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { CARD_TYPE_LABELS, CARD_TYPE_STYLES } from "../lib/constants";
import { estimateContextWords } from "../lib/governor";
import { FloatingToolbar } from "./FloatingToolbar";
import type { Card } from "../lib/types";

export function KanbanView() {
  const cards = useCanvasStore((s) => s.cards);
  const edges = useCanvasStore((s) => s.edges);
  const openEditor = useCanvasStore((s) => s.openEditor);
  const updateCard = useCanvasStore((s) => s.updateCard);

  // Build columns from hierarchy edges.
  // Root cards (no hierarchy parent) become column headers.
  // Children nest beneath their parent.
  const columns = useMemo(() => {
    const hierarchyEdges = edges.filter((e) => e.edgeType === "hierarchy");
    const childTargets = new Set(hierarchyEdges.map((e) => e.target));

    // Root cards: not a hierarchy child
    const roots = cards.filter((c) => !childTargets.has(c.id));

    // Cards that are children of a root
    const getChildren = (parentId: string): Card[] =>
      hierarchyEdges
        .filter((e) => e.source === parentId)
        .map((e) => cards.find((c) => c.id === e.target))
        .filter(Boolean) as Card[];

    // Cards not connected to any hierarchy at all
    const allHierarchyIds = new Set(hierarchyEdges.flatMap((e) => [e.source, e.target]));
    const orphans = cards.filter(
      (c) => !allHierarchyIds.has(c.id) && roots.indexOf(c) === -1
    );

    const cols: { header: Card | null; children: Card[] }[] = [];

    for (const root of roots) {
      const allChildren: Card[] = [];
      function collectChildren(parentId: string, depth: number) {
        for (const child of getChildren(parentId)) {
          (child as Card & { _depth?: number })._depth = depth;
          allChildren.push(child);
          collectChildren(child.id, depth + 1);
        }
      }
      collectChildren(root.id, 0);
      cols.push({ header: root, children: allChildren });
    }

    if (orphans.length > 0) {
      cols.push({ header: null, children: orphans });
    }

    return cols;
  }, [cards, edges]);

  const renderCard = (card: Card, depth = 0) => {
    const typeStyle = CARD_TYPE_STYLES[card.type];
    const words = estimateContextWords(card, cards, edges);
    const _depth = (card as Card & { _depth?: number })._depth ?? depth;

    return (
      <div
        key={card.id}
        className="pixel-border px-3 py-2 flex flex-col gap-1 cursor-pointer hover:opacity-90"
        style={{
          background: "var(--color-card-bg)",
          marginLeft: _depth * 16,
        }}
        onClick={() => {
          if (card.hasDoc) openEditor(card.id, { x: 100, y: 100 });
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold truncate"
            style={{ color: card.type === "project" ? "#C9A84C" : "var(--color-text-primary)" }}
          >
            {card.title || "Untitled"}
          </span>
          <span
            className="px-1.5 py-0.5 text-[9px] shrink-0"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              letterSpacing: "0.05em",
              backgroundColor: typeStyle.bg,
              color: typeStyle.text,
              border: `1px solid ${typeStyle.text}40`,
            }}
          >
            {CARD_TYPE_LABELS[card.type]}
          </span>
        </div>
        {card.body && (
          <p className="text-[10px] line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
            {card.body}
          </p>
        )}
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[9px]" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
            ~{words}w
          </span>
          {card.hasDoc && (
            <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>
              📄
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-hidden relative" style={{ background: "var(--color-canvas-bg)" }}>
      <div className="flex gap-4 p-4 h-full items-start" style={{ minWidth: "max-content" }}>
        {columns.map((col, i) => (
          <div
            key={col.header?.id ?? `orphan-${i}`}
            className="w-64 shrink-0 flex flex-col gap-2"
          >
            {/* Column header */}
            <div
              className="pixel-border px-3 py-2"
              style={{
                background: col.header ? "var(--color-surface-high)" : "var(--color-surface)",
                borderColor: "var(--color-card-border)",
              }}
            >
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{
                  color: col.header?.type === "project" ? "#C9A84C" : "var(--color-text-primary)",
                  fontFamily: "var(--font-headline)",
                }}
              >
                {col.header?.title ?? "Uncategorized"}
              </span>
              {col.header && (
                <span className="text-[9px] ml-2" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                  {col.children.length}
                </span>
              )}
            </div>

            {/* Column body */}
            <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pb-4">
              {col.header && renderCard(col.header)}
              {col.children.map((child) => renderCard(child))}
            </div>
          </div>
        ))}
      </div>
      <FloatingToolbar selectedEdgeIds={[]} />
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to switch between Canvas and Kanban views**

In `src/App.tsx`, add imports:

```tsx
import { KanbanView } from "./components/KanbanView";
```

Add store selector:

```tsx
  const activeView = useCanvasStore((s) => s.activeView);
```

Replace the `<div className="flex-1 relative">` section (the canvas area) with a view switch:

```tsx
      <div className="flex-1 relative">
        {activeView === "canvas" ? (
          <>
            <ReactFlowProvider>
              <Canvas />
            </ReactFlowProvider>
            {openEditors.map((editor) => (
              <EditorBubble key={editor.cardId} cardId={editor.cardId} initialPosition={editor.position} />
            ))}
          </>
        ) : (
          <>
            <KanbanView />
            {openEditors.map((editor) => (
              <EditorBubble key={editor.cardId} cardId={editor.cardId} initialPosition={editor.position} />
            ))}
          </>
        )}
      </div>
```

- [ ] **Step 3: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/KanbanView.tsx src/App.tsx
git commit -m "feat: kanban view with hierarchy columns and context word counts"
```

---

## Task 10: Keyboard Shortcuts for Views and Export

**Files:**
- Modify: `src/hooks/use-keyboard-shortcuts.ts`

- [ ] **Step 1: Add view toggle and export shortcuts**

Replace the contents of `src/hooks/use-keyboard-shortcuts.ts`:

```typescript
import { useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { saveProject, loadProject, exportContext } from "../lib/file-ops";

export function useKeyboardShortcuts() {
  const toggleShowGrid = useCanvasStore((s) => s.toggleShowGrid);
  const toggleMinimap = useCanvasStore((s) => s.toggleMinimap);
  const setActiveView = useCanvasStore((s) => s.setActiveView);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+S — Save
      if (meta && e.key === "s") {
        e.preventDefault();
        saveProject();
      }

      // Cmd+O — Open
      if (meta && e.key === "o") {
        e.preventDefault();
        loadProject();
      }

      // Cmd+E — Export context.md
      if (meta && e.key === "e") {
        e.preventDefault();
        exportContext();
      }

      // Cmd+G — Toggle grid
      if (meta && e.key === "g") {
        e.preventDefault();
        toggleShowGrid();
      }

      // Cmd+M — Toggle minimap
      if (meta && e.key === "m") {
        e.preventDefault();
        toggleMinimap();
      }

      // Cmd+1 — Canvas view
      if (meta && e.key === "1") {
        e.preventDefault();
        setActiveView("canvas");
      }

      // Cmd+2 — Kanban view
      if (meta && e.key === "2") {
        e.preventDefault();
        setActiveView("kanban");
      }

      // Escape — Close all editors
      if (e.key === "Escape") {
        const store = useCanvasStore.getState();
        store.openEditors.forEach((ed) => store.closeEditor(ed.cardId));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleShowGrid, toggleMinimap, setActiveView]);
}
```

- [ ] **Step 2: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-keyboard-shortcuts.ts
git commit -m "feat: keyboard shortcuts for view toggle (Cmd+1/2) and export (Cmd+E)"
```

---

## Self-Review Checklist

### Spec coverage
- [x] Edge types: hierarchy, flow, reference — Task 1 (types), Task 3 (rendering), Task 4 (toolbar)
- [x] Reference scoping: title/summary/section/full — Task 1 (types), Task 4 (dialog)
- [x] Governor rules: 8 rules grounded in Claude behavior — Task 5
- [x] Health check dialog with context estimate — Task 6
- [x] Context.md export following Claude reading pattern — Task 7
- [x] Inline helpers at decision moments — Task 8
- [x] Kanban view from hierarchy edges — Task 9
- [x] View switching Cmd+1/2 — Task 10
- [x] Export shortcut Cmd+E — Task 10
- [x] Brainstorm cards excluded from export — Task 7 (export-context.ts)
- [x] Store persistence for new edge fields — Task 4 (file-ops.ts)

### Type consistency
- [x] `EdgeType` used consistently: `"hierarchy" | "flow" | "reference"` in types.ts, governor.ts, export-context.ts, FloatingToolbar.tsx, Canvas.tsx, CardEdge.tsx
- [x] `ReferenceScope` used consistently: `"title" | "summary" | "section" | "full"` in types.ts, governor.ts, export-context.ts, ReferenceScopeDialog.tsx
- [x] `GovernorWarning` used in governor.ts and HealthCheckDialog.tsx with matching fields
- [x] `addEdge` signature updated in store, NewCardDialog, Canvas, ReferenceScopeDialog
- [x] `Edge` interface consistent across types.ts, store, file-ops save/load

### Placeholder scan
- [x] No TBD/TODO/implement-later found
- [x] All code blocks are complete implementations
- [x] All commands include expected output
