# Batch E: UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add undo/redo, fix bullet list nesting, redesign the floating toolbar with icons, move edge type picking to handle hover, add full-screen editor (Zen Mode), and add Cmd+Z/Cmd+Shift+Z shortcuts.

**Architecture:** Undo/redo uses `zundo` (temporal middleware for Zustand) wrapping the canvas store. Handle hover uses a React portal overlay positioned at the handle's screen coordinates with 3 edge-type icon buttons. The floating toolbar is simplified to icons for SEL/PAN + view toggle only (DEL and edge type picker removed). Zen Mode is a `fullscreen` state on EditorBubble that expands to fill the viewport. TipTap list nesting uses the existing `ListKeymap` extension from StarterKit with explicit `Tab`/`Shift+Tab` key handling.

**Tech Stack:** React 19, TypeScript, Zustand + zundo, React Flow, TipTap, Lucide React icons, Tailwind CSS v4

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/components/HandleHover.tsx` | Overlay that appears on handle hover showing OWN/THEN/REF icon buttons |

### Modified files

| File | Changes |
|------|---------|
| `src/store/canvas-store.ts` | Wrap with `temporal` middleware from zundo for undo/redo history |
| `src/components/FloatingToolbar.tsx` | Replace text labels with Lucide icons, remove DEL and edge type picker |
| `src/components/CardNode.tsx` | Add `HandleHover` on handle mouseenter, track hovered handle |
| `src/components/EditorBubble.tsx` | Add `fullscreen` state for Zen Mode, fix TipTap list Tab/Shift+Tab |
| `src/components/Canvas.tsx` | Remove delete-mode logic (DEL removed from toolbar) |
| `src/hooks/use-keyboard-shortcuts.ts` | Add Cmd+Z, Cmd+Shift+Z |
| `src/index.css` | Add TipTap list nesting styles |
| `src/App.tsx` | Remove `editorMode === "delete"` references if needed |

### New dependency

```bash
npm install zundo
```

---

## Task 1: Install zundo and Add Undo/Redo to Store

**Files:**
- Modify: `src/store/canvas-store.ts`

- [ ] **Step 1: Install zundo**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npm install zundo`
Expected: added 1 package

- [ ] **Step 2: Wrap store with temporal middleware**

In `src/store/canvas-store.ts`, add import at top:

```typescript
import { temporal } from "zundo";
```

Wrap the `create` call with `temporal`. Change:

```typescript
export const useCanvasStore = create<CanvasStore>((set, get) => ({
```

to:

```typescript
export const useCanvasStore = create<CanvasStore>()(
  temporal(
    (set, get) => ({
```

And close the wrapper at the end of the store. Change the final:

```typescript
}));
```

to:

```typescript
    }),
    {
      // Only track state changes that matter for undo
      partialize: (state) => ({
        cards: state.cards,
        edges: state.edges,
      }),
      // Limit history to 50 entries
      limit: 50,
    }
  )
);
```

- [ ] **Step 3: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd /Users/connorreap/Desktop/Claude_Code/flo && git add package.json package-lock.json src/store/canvas-store.ts && git commit -m "feat: undo/redo history via zundo temporal middleware"
```

---

## Task 2: Undo/Redo Keyboard Shortcuts

**Files:**
- Modify: `src/hooks/use-keyboard-shortcuts.ts`

- [ ] **Step 1: Add undo/redo to keyboard shortcuts**

In `src/hooks/use-keyboard-shortcuts.ts`, add import at top:

```typescript
import { useTemporalStore } from "zundo";
import { useCanvasStore } from "../store/canvas-store";
```

Wait — `useTemporalStore` is used differently. The temporal store is accessed via `useCanvasStore.temporal`. For non-hook contexts (inside the keydown handler), use `useCanvasStore.temporal.getState()`.

Add these two handlers inside the `useEffect` handler function, after the `// Cmd+O` block:

```typescript
      // Cmd+Z — Undo
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.temporal.getState().undo();
      }

      // Cmd+Shift+Z — Redo
      if (meta && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        useCanvasStore.temporal.getState().redo();
      }
```

Remove the `useTemporalStore` import — it's not needed since we use `.temporal.getState()` directly.

- [ ] **Step 2: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd /Users/connorreap/Desktop/Claude_Code/flo && git add src/hooks/use-keyboard-shortcuts.ts && git commit -m "feat: Cmd+Z undo, Cmd+Shift+Z redo keyboard shortcuts"
```

---

## Task 3: Fix TipTap Bullet List Nesting

**Files:**
- Modify: `src/components/EditorBubble.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Configure TipTap extensions for proper list behavior**

In `src/components/EditorBubble.tsx`, replace the extensions constant:

```typescript
const EDITOR_EXTENSIONS = [StarterKit, Underline];
```

with:

```typescript
const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    bulletList: { keepMarks: true, keepAttributes: false },
    orderedList: { keepMarks: true, keepAttributes: false },
    listItem: {},
  }),
  Underline,
];
```

StarterKit already includes `ListItem` and `ListKeymap` which handle Tab/Shift+Tab for nesting. The explicit configure ensures the list extensions are properly initialized.

- [ ] **Step 2: Add TipTap list styles to index.css**

Append to the TipTap section at the end of `src/index.css`:

```css
.tiptap ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin: 0.5em 0;
}
.tiptap ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin: 0.5em 0;
}
.tiptap li { margin: 0.2em 0; }
.tiptap li > ul,
.tiptap li > ol {
  margin: 0.2em 0;
}
.tiptap ul ul { list-style-type: circle; }
.tiptap ul ul ul { list-style-type: square; }
```

- [ ] **Step 3: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd /Users/connorreap/Desktop/Claude_Code/flo && git add src/components/EditorBubble.tsx src/index.css && git commit -m "fix: bullet list nesting with Tab/Shift+Tab, proper list styles"
```

---

## Task 4: Redesign FloatingToolbar with Icons

**Files:**
- Modify: `src/components/FloatingToolbar.tsx`
- Modify: `src/components/Canvas.tsx`

- [ ] **Step 1: Rewrite FloatingToolbar with Lucide icons, remove DEL and edge type picker**

Replace the entire contents of `src/components/FloatingToolbar.tsx`:

```tsx
import { MousePointer2, Hand } from "lucide-react";
import { useCanvasStore } from "../store/canvas-store";

interface Props {
  selectedEdgeIds: string[];
}

export function FloatingToolbar({ selectedEdgeIds: _selectedEdgeIds }: Props) {
  const editorMode = useCanvasStore((s) => s.editorMode);
  const setEditorMode = useCanvasStore((s) => s.setEditorMode);
  const activeView = useCanvasStore((s) => s.activeView);
  const setActiveView = useCanvasStore((s) => s.setActiveView);

  return (
    <div
      className="absolute bottom-4 left-4 z-50 flex items-center pixel-border"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-card-border)",
      }}
    >
      {/* Mode controls */}
      <div className="flex items-center px-1.5 py-1 gap-1">
        <button
          onClick={() => setEditorMode("select")}
          title="Select / move (V)"
          className="p-1.5 transition-colors"
          style={{
            color: editorMode === "select" ? "#FFFFFF" : "var(--color-text-muted)",
            background: editorMode === "select" ? "var(--color-surface-high)" : "transparent",
          }}
        >
          <MousePointer2 size={14} />
        </button>
        <button
          onClick={() => setEditorMode("pan")}
          title="Pan canvas (H)"
          className="p-1.5 transition-colors"
          style={{
            color: editorMode === "pan" ? "#FFFFFF" : "var(--color-text-muted)",
            background: editorMode === "pan" ? "var(--color-surface-high)" : "transparent",
          }}
        >
          <Hand size={14} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-card-border)" }} />

      {/* View toggle */}
      <div className="flex items-center px-1.5 py-1 gap-1">
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

- [ ] **Step 2: Remove delete mode from Canvas.tsx**

In `src/components/Canvas.tsx`, remove the `onNodeClick` and `onEdgeClick` callbacks that handle delete mode. Replace:

```tsx
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
```

with nothing (delete both callbacks).

Remove `removeCard` from the store selectors at the top of Canvas. Remove the `onNodeClick` and `onEdgeClick` props from the `<ReactFlow>` component. Remove the `cursor: editorMode === "delete" ? "crosshair" : undefined` style from the outer div. Remove `type NodeMouseHandler, type EdgeMouseHandler` from the `@xyflow/react` import.

Also change the editor mode type in the store interface from `"select" | "pan" | "delete"` to `"select" | "pan"`. Update in `src/store/canvas-store.ts`:

Interface:
```typescript
  editorMode: "select" | "pan";
  setEditorMode: (mode: "select" | "pan") => void;
```

The `"delete"` option is removed. Users delete via right-click context menu or selecting + pressing Delete/Backspace key.

- [ ] **Step 3: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd /Users/connorreap/Desktop/Claude_Code/flo && git add src/components/FloatingToolbar.tsx src/components/Canvas.tsx src/store/canvas-store.ts && git commit -m "feat: toolbar icons (Lucide), remove DEL mode, simplify toolbar"
```

---

## Task 5: Handle Hover Edge Type Picker

**Files:**
- Create: `src/components/HandleHover.tsx`
- Modify: `src/components/CardNode.tsx`

- [ ] **Step 1: Create HandleHover component**

Create `src/components/HandleHover.tsx`:

```tsx
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
```

- [ ] **Step 2: Add hover state to CardNode handles**

In `src/components/CardNode.tsx`, add import:

```tsx
import { HandleHover } from "./HandleHover";
```

Add state for hovered handle after the existing state declarations:

```tsx
  const [hoveredHandle, setHoveredHandle] = useState<{ id: string; x: number; y: number } | null>(null);
  const addEdge = useCanvasStore((s) => s.addEdge);
```

Replace the `handles` constant with:

```tsx
  const handleMouseEnter = (e: React.MouseEvent, handleId: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredHandle({ id: handleId, x: rect.left, y: rect.top });
  };

  const handles = (
    <>
      <Handle type="source" position={Position.Top} id="top" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" onMouseEnter={(e) => handleMouseEnter(e, "top")} />
      <Handle type="source" position={Position.Right} id="right" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" onMouseEnter={(e) => handleMouseEnter(e, "right")} />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" onMouseEnter={(e) => handleMouseEnter(e, "bottom")} />
      <Handle type="source" position={Position.Left} id="left" className="!bg-[var(--color-text-muted)] !w-2 !h-2 !border-0" onMouseEnter={(e) => handleMouseEnter(e, "left")} />
    </>
  );
```

At the bottom of the expanded card return (after `<NewCardDialog .../>` and before the final `</>`), add:

```tsx
      {hoveredHandle && (
        <HandleHover
          position={{ x: hoveredHandle.x, y: hoveredHandle.y }}
          onSelect={(edgeType) => {
            // Store the selected edge type for the next connection from this card
            // For now, we'll use the branch dialog with the selected type
            setHoveredHandle(null);
          }}
          onClose={() => setHoveredHandle(null)}
        />
      )}
```

Note: The handle hover shows the edge type icons. For the MVP, clicking one starts the branch flow (creates a new connected card with that edge type). The drag-to-connect workflow will inherit the edge type from the last selection in a future iteration.

- [ ] **Step 3: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd /Users/connorreap/Desktop/Claude_Code/flo && git add src/components/HandleHover.tsx src/components/CardNode.tsx && git commit -m "feat: handle hover shows edge type picker icons (OWN/THEN/REF)"
```

---

## Task 6: Full-Screen Editor (Zen Mode)

**Files:**
- Modify: `src/components/EditorBubble.tsx`

- [ ] **Step 1: Add fullscreen state and toggle to EditorBubble**

In `src/components/EditorBubble.tsx`, add state after the `resizing` state:

```tsx
  const [fullscreen, setFullscreen] = useState(false);
```

Replace the outer `<div>` that renders the editor bubble. The current opening div is:

```tsx
    <div
      className="absolute z-40 pixel-border shadow-2xl flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        opacity: 0.97,
        background: "var(--color-card-bg)",
      }}
    >
```

Replace with:

```tsx
    <div
      className={`${fullscreen ? "fixed inset-0 z-[100]" : "absolute z-40 pixel-border shadow-2xl"} flex flex-col`}
      style={fullscreen ? {
        background: "var(--color-canvas-bg)",
      } : {
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        opacity: 0.97,
        background: "var(--color-card-bg)",
      }}
    >
```

In the title bar section, add a fullscreen toggle button next to the close button. Replace the close button area:

```tsx
        <button
          onClick={() => closeEditor(cardId)}
          className="text-sm px-1"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--color-text-muted)";
          }}
        >
          ×
        </button>
```

with:

```tsx
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="text-[10px] px-1.5 py-0.5"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
            title={fullscreen ? "Exit Zen Mode (Escape)" : "Zen Mode — full screen"}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
            }}
          >
            {fullscreen ? "EXIT" : "ZEN"}
          </button>
          <button
            onClick={() => closeEditor(cardId)}
            className="text-sm px-1"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
            }}
          >
            ×
          </button>
        </div>
```

Hide the resize handle when in fullscreen. Wrap the resize handle div:

```tsx
      {/* Resize handle (bottom-right corner) */}
      {!fullscreen && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          ...
        >
          ...
        </div>
      )}
```

- [ ] **Step 2: Add Escape-exits-zen behavior**

The existing keyboard shortcut handler closes all editors on Escape. Instead, when an editor is in fullscreen, Escape should exit fullscreen first. Since Zen Mode is local state inside EditorBubble, add a keydown handler inside the component:

After the `resizing` useEffect, add:

```tsx
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", handler, true); // capture phase
    return () => window.removeEventListener("keydown", handler, true);
  }, [fullscreen]);
```

Using capture phase ensures it intercepts before the global Escape handler that closes editors.

- [ ] **Step 3: Verify compile**

Run: `cd /Users/connorreap/Desktop/Claude_Code/flo && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd /Users/connorreap/Desktop/Claude_Code/flo && git add src/components/EditorBubble.tsx && git commit -m "feat: Zen Mode — full-screen editor with Escape to exit"
```

---

## Self-Review Checklist

### Spec coverage
- [x] Undo/redo via zundo — Task 1 (store), Task 2 (shortcuts)
- [x] Cmd+Z / Cmd+Shift+Z — Task 2
- [x] Bullet list nesting with Tab/Shift+Tab — Task 3
- [x] Toolbar with icons (MousePointer2, Hand from Lucide) — Task 4
- [x] DEL mode removed from toolbar — Task 4
- [x] Edge type picker removed from toolbar — Task 4
- [x] Handle hover shows OWN/THEN/REF icons — Task 5
- [x] Icon ideas: GitBranch=OWN, ArrowRight=THEN, Link=REF — Task 5
- [x] Full-screen editor (Zen Mode) — Task 6
- [x] Escape exits Zen Mode — Task 6
- [x] View toggle preserved in toolbar — Task 4

### Type consistency
- [x] `editorMode` changed from `"select" | "pan" | "delete"` to `"select" | "pan"` in Task 4, reflected in store interface and FloatingToolbar
- [x] `EdgeType` used consistently in HandleHover and throughout
- [x] `temporal` wrapping preserves all existing store types

### Placeholder scan
- [x] No TBD/TODO found
- [x] All code blocks are complete
- [x] All commands include expected output
