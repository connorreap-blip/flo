# Flo Adoption Gap Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the product gaps identified in the adoption review that will cause drop-off and prevent repeat usage — organized into 4 phases where tasks within each phase can run as parallel agents.

**Architecture:** Each phase groups independent, non-conflicting changes that can be dispatched to separate agents simultaneously. Phases are sequential (Phase 2 starts after Phase 1 completes) because later phases sometimes build on files changed in earlier ones. Within each phase, tasks touch distinct files and can safely run in parallel.

**Tech Stack:** React 19, TypeScript, Zustand, Tauri 2, @xyflow/react, TipTap, Tailwind CSS 4, Lucide icons

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/file-ops.ts` | Save/load/export orchestration |
| `src/lib/export-context.ts` | `generateContextMd()` — the core export engine |
| `src/lib/constants.ts` | Card type definitions, colors, styles |
| `src/store/canvas-store.ts` | Canvas state (cards, edges, settings, dirty flag) |
| `src/store/project-store.ts` | Project metadata, tabs, theme, recents |
| `src/hooks/use-keyboard-shortcuts.ts` | Global keyboard shortcut handler |
| `src/components/Toolbar.tsx` | Top toolbar with all action buttons |
| `src/components/CardNode.tsx` | Card rendering on canvas |
| `src/components/BottomActionBar.tsx` | Floating bottom bar (New Card, Search, View toggle) |
| `src/components/GhostPreview.tsx` | "What the agent reads" overlay |
| `src/components/HomeScreen.tsx` | Landing / start screen |
| `src/components/HomeDashboard.tsx` | In-project dashboard tab |
| `src/components/KanbanView.tsx` | List/kanban view of cards |
| `src/components/OnboardingChecklist.tsx` | First-run guided checklist |
| `src/components/SaveToast.tsx` | **NEW** — Toast notification for save/export feedback |
| `src/components/UndoToast.tsx` | **NEW** — Toast notification for undo/redo feedback |
| `src/index.css` | Global styles, CSS custom properties, theme tokens |

---

## Phase 1: Close the Core Loop (4 parallel agents)

These are the quick wins that close the gap between "build map" and "hand to agent." Each task touches a distinct set of files.

---

### Task 1: Copy context to clipboard

**Files:**
- Modify: `src/lib/file-ops.ts`
- Modify: `src/components/Toolbar.tsx`

This is the single highest-impact change. Users currently must: Export → find file → open agent → paste. "Copy to clipboard" makes it one click.

- [ ] **Step 1: Add `copyContextToClipboard()` to file-ops.ts**

Add this function after the existing `exportContext` function at the bottom of `src/lib/file-ops.ts`:

```typescript
export async function copyContextToClipboard(): Promise<boolean> {
  const projectStore = useProjectStore.getState();
  const store = useCanvasStore.getState();
  const contextMd = generateContextMd(
    projectStore.project.name,
    store.cards,
    store.edges,
    projectStore.project.goal,
    {
      agentHintExportMode: store.agentHintExportMode,
      includeAgentHints: store.exportIncludeAgentHints,
      includeBrainstorm: store.exportIncludeBrainstorm,
      includeCardDocs: store.exportIncludeCardDocs,
      excludedTags: store.excludedTags,
      goalOverride: store.exportGoalOverride,
    }
  );

  try {
    await navigator.clipboard.writeText(contextMd);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Add "Copy for AI" button to Toolbar**

In `src/components/Toolbar.tsx`, import the new function:

```typescript
import { saveProject, saveProjectAs, loadProject, loadProjectFromPath, exportContext, copyContextToClipboard } from "../lib/file-ops";
```

Add a new state for copy feedback at the top of the `Toolbar` component, alongside the existing state variables:

```typescript
const [copyFeedback, setCopyFeedback] = useState(false);
```

Add this button right before the existing "Export for AI" button (around line 209):

```tsx
<button
  onClick={async () => {
    const success = await copyContextToClipboard();
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1800);
    }
  }}
  className="text-xs px-3 py-1.5 border"
  style={{
    background: copyFeedback ? "var(--color-text-primary)" : "var(--color-surface-high)",
    color: copyFeedback ? "var(--color-canvas-bg)" : "var(--color-text-primary)",
    borderColor: copyFeedback ? "var(--color-text-primary)" : "var(--color-card-border)",
    fontFamily: "var(--font-mono)",
  }}
>
  {copyFeedback ? "COPIED!" : "Copy for AI"}
</button>
```

- [ ] **Step 3: Add Cmd+Shift+C keyboard shortcut**

In `src/hooks/use-keyboard-shortcuts.ts`, import `copyContextToClipboard`:

```typescript
import { saveProject, saveProjectAs, loadProject, exportContext, copyContextToClipboard } from "../lib/file-ops";
```

Add this block after the `Cmd+E` handler (after line 49):

```typescript
// Cmd+Shift+C — Copy context to clipboard
if (meta && e.shiftKey && e.key.toLowerCase() === "c") {
  e.preventDefault();
  copyContextToClipboard();
}
```

- [ ] **Step 4: Verify manually**

Open the app, create a few cards, press Cmd+Shift+C. Paste into a text editor and confirm the context.md content appears.

- [ ] **Step 5: Commit**

```bash
git add src/lib/file-ops.ts src/components/Toolbar.tsx src/hooks/use-keyboard-shortcuts.ts
git commit -m "feat: add copy-to-clipboard for context export (Cmd+Shift+C)"
```

---

### Task 2: Save/export feedback toasts

**Files:**
- Create: `src/components/SaveToast.tsx`
- Modify: `src/store/canvas-store.ts`
- Modify: `src/App.tsx`

The 10px footer "saved" text is invisible. Users need confident feedback that their work was captured.

- [ ] **Step 1: Add toast state to canvas store**

In `src/store/canvas-store.ts`, add to the `CanvasStore` interface (in the "Helpers" section around line 109):

```typescript
toastMessage: string | null;
showToast: (message: string) => void;
dismissToast: () => void;
```

Add to the store implementation (in the corresponding section of the `create` call):

```typescript
toastMessage: null,
showToast: (message) => set({ toastMessage: message }),
dismissToast: () => set({ toastMessage: null }),
```

- [ ] **Step 2: Create SaveToast component**

Create `src/components/SaveToast.tsx`:

```tsx
import { useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store";

export function SaveToast() {
  const message = useCanvasStore((s) => s.toastMessage);
  const dismiss = useCanvasStore((s) => s.dismissToast);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(dismiss, 2400);
    return () => window.clearTimeout(timer);
  }, [message, dismiss]);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-14 left-1/2 z-[200] -translate-x-1/2 border px-4 py-2 text-sm"
      style={{
        background: "var(--color-surface-high)",
        borderColor: "var(--color-card-border)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-mono)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 3: Wire toast into save and export flows**

In `src/lib/file-ops.ts`, after `canvasStore.markClean();` (line 231 in `saveProjectInternal`), add:

```typescript
canvasStore.showToast("Workspace saved");
```

In the `exportContext` function, after `await writeTextFile(selected, contextMd);` (line 333), add:

```typescript
useCanvasStore.getState().showToast("Context exported");
```

- [ ] **Step 4: Mount SaveToast in App**

In `src/App.tsx`, import and render `SaveToast` inside the main layout div, after `<HelperToast />` (line 431):

```tsx
import { SaveToast } from "./components/SaveToast";
// ...
<HelperToast />
<SaveToast />
```

- [ ] **Step 5: Commit**

```bash
git add src/components/SaveToast.tsx src/store/canvas-store.ts src/lib/file-ops.ts src/App.tsx
git commit -m "feat: add toast notifications for save and export actions"
```

---

### Task 3: Delete confirmation and undo toast

**Files:**
- Create: `src/components/UndoToast.tsx`
- Modify: `src/components/CardNode.tsx`
- Modify: `src/hooks/use-keyboard-shortcuts.ts`

Deleting a card instantly removes it with all docs and connections — no confirmation, no undo feedback.

- [ ] **Step 1: Add delete confirmation to CardNode**

In `src/components/CardNode.tsx`, replace the delete button's direct `onClick={() => removeCard(id)}` (around line 237) with a confirmation:

```typescript
onClick={() => {
  if (window.confirm(`Delete "${data.title || "Untitled"}" and all its connections?`)) {
    removeCard(id);
  }
}}
```

Do the same for the context menu delete item (around line 289):

```typescript
onClick={() => {
  if (window.confirm(`Delete "${data.title || "Untitled"}" and all its connections?`)) {
    removeCard(id);
  }
}}
```

- [ ] **Step 2: Create UndoToast component**

Create `src/components/UndoToast.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useCanvasStore } from "../store/canvas-store";

export function UndoToast() {
  const [message, setMessage] = useState<string | null>(null);
  const editVersion = useCanvasStore((s) => s.editVersion);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ action: string }>).detail;
      setMessage(detail.action === "undo" ? "Undo" : "Redo");
    };

    window.addEventListener("flo:undo-redo", handler as EventListener);
    return () => window.removeEventListener("flo:undo-redo", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 1200);
    return () => window.clearTimeout(timer);
  }, [message, editVersion]);

  if (!message) return null;

  return (
    <div
      className="fixed top-16 left-1/2 z-[200] -translate-x-1/2 border px-3 py-1.5 text-xs"
      style={{
        background: "var(--color-surface-high)",
        borderColor: "var(--color-card-border)",
        color: "var(--color-text-primary)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 3: Dispatch undo/redo events from keyboard shortcuts**

In `src/hooks/use-keyboard-shortcuts.ts`, update the undo handler (around line 34) to dispatch an event after the action:

```typescript
// Cmd+Z — Undo
if (meta && e.key === "z" && !e.shiftKey) {
  e.preventDefault();
  useCanvasStore.temporal.getState().undo();
  window.dispatchEvent(new CustomEvent("flo:undo-redo", { detail: { action: "undo" } }));
}

// Cmd+Shift+Z — Redo
if (meta && e.key === "z" && e.shiftKey) {
  e.preventDefault();
  useCanvasStore.temporal.getState().redo();
  window.dispatchEvent(new CustomEvent("flo:undo-redo", { detail: { action: "redo" } }));
}
```

- [ ] **Step 4: Mount UndoToast in App**

In `src/App.tsx`, import and render alongside SaveToast:

```tsx
import { UndoToast } from "./components/UndoToast";
// ...
<SaveToast />
<UndoToast />
```

- [ ] **Step 5: Commit**

```bash
git add src/components/UndoToast.tsx src/components/CardNode.tsx src/hooks/use-keyboard-shortcuts.ts src/App.tsx
git commit -m "feat: add delete confirmation dialog and undo/redo toast feedback"
```

---

### Task 4: Ghost Preview escape key + onboarding trigger

**Files:**
- Modify: `src/hooks/use-keyboard-shortcuts.ts`
- Modify: `src/components/OnboardingChecklist.tsx`

Ghost Preview is flo's most differentiating feature but has no Escape key support and no onboarding moment.

- [ ] **Step 1: Add Escape key to close Ghost Preview**

In `src/hooks/use-keyboard-shortcuts.ts`, modify the existing Escape handler (around line 101) to check ghost preview first:

```typescript
// Escape — Close ghost preview first, then close all editors
if (e.key === "Escape") {
  const store = useCanvasStore.getState();
  if (store.ghostPreviewMode) {
    store.setGhostPreviewMode(null);
  } else {
    store.openEditors.forEach((ed) => store.closeEditor(ed.cardId));
  }
}
```

- [ ] **Step 2: Make onboarding checklist items include Ghost Preview shortcut hint**

In `src/components/OnboardingChecklist.tsx`, update the ghost-preview checklist item detail text (around line 57):

```typescript
{
  id: "ghost-preview",
  label: "Preview what your agent will read",
  detail: "Open Ghost Preview to inspect exported context. Try Cmd+Shift+P now.",
  complete: hasUsedGhostPreview,
},
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-keyboard-shortcuts.ts src/components/OnboardingChecklist.tsx
git commit -m "feat: add Escape to close Ghost Preview, improve onboarding hint"
```

---

## Phase 2: Visual Differentiation & Canvas UX (4 parallel agents)

These changes make the canvas scannable and card interactions discoverable.

---

### Task 5: Card type visual differentiation

**Files:**
- Modify: `src/lib/constants.ts`
- Modify: `src/index.css`

All card types currently look like near-identical dark rectangles. The canvas needs to support rapid visual scanning.

- [ ] **Step 1: Update card type styles with distinct colors**

In `src/lib/constants.ts`, replace the `CARD_TYPE_STYLES` object (lines 19-27):

```typescript
export const CARD_TYPE_STYLES: Record<
  CardType,
  { bg: string; text: string; borderStyle: string }
> = {
  project: { bg: "#1A1400", text: "#C9A84C", borderStyle: "solid" },
  process: { bg: "#0A1A1A", text: "#5AADAD", borderStyle: "solid" },
  reference: { bg: "#1A0A1A", text: "#A88ABF", borderStyle: "solid" },
  brainstorm: { bg: "#1A1A0A", text: "#8A8A5A", borderStyle: "dashed" },
};
```

- [ ] **Step 2: Add light-mode card type overrides to CSS**

In `src/index.css`, add after the `[data-theme="light"]` block (after line 190), a comment and CSS custom properties for light-mode card type awareness. Note: the card type styles in constants.ts are used directly — no CSS override needed. The background colors above are subtle enough for both themes. Verify visually.

- [ ] **Step 3: Verify manually**

Open the app, create one of each card type (project, process, reference, brainstorm). Confirm each type has a visually distinct tint. Confirm the brainstorm card still has dashed borders.

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add distinct color tints for each card type"
```

---

### Task 6: Single-click edit affordance on cards

**Files:**
- Modify: `src/components/CardNode.tsx`

Double-click to edit is undiscoverable. Add a visible pencil icon on hover for the title, and make the body area feel editable.

- [ ] **Step 1: Add click-to-edit for title instead of double-click**

In `src/components/CardNode.tsx`, find the title rendering (around line 416-425). Replace the `onDoubleClick` with `onClick`, and add a hover pencil indicator:

```tsx
{/* Title */}
<div className="px-3 pt-2">
  {editingTitle ? (
    <input
      ref={titleRef}
      className="nodrag bg-transparent text-sm font-semibold w-full outline-none border-b border-[var(--color-text-muted)] pb-0.5"
      style={{ color: data.type === "project" ? "#C9A84C" : "var(--color-text-primary)" }}
      value={data.title}
      onChange={(e) => updateCard(id, { title: e.target.value })}
      onBlur={() => setEditingTitle(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    />
  ) : (
    <div
      className="group/title flex items-center gap-1.5 cursor-text"
      onClick={() => setEditingTitle(true)}
    >
      <span
        className="text-sm font-semibold truncate flex-1"
        style={{ color: data.type === "project" ? "#C9A84C" : "var(--color-text-primary)" }}
      >
        {data.title || "Untitled"}
      </span>
      <Pencil
        size={10}
        className="shrink-0 opacity-0 group-hover/title:opacity-40 transition-opacity nodrag"
        style={{ color: "var(--color-text-muted)" }}
      />
    </div>
  )}
</div>
```

- [ ] **Step 2: Add click-to-edit for body instead of double-click**

Find the body rendering (around line 465-471). Replace `onDoubleClick` with `onClick`:

```tsx
<div
  className="text-[var(--color-text-secondary)] text-xs cursor-text min-h-[2rem] line-clamp-3 hover:opacity-80 transition-opacity"
  onClick={() => setEditingBody(true)}
>
  {data.body || <span className="opacity-30 italic">click to add summary</span>}
</div>
```

- [ ] **Step 3: Update tag hint text**

Find the tag placeholder (around line 572-576). Change the text:

```tsx
<span
  className="text-[9px] cursor-pointer hover:opacity-60"
  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
  onClick={() => setEditingTags(true)}
>
  + add tag
</span>
```

And change the tag area's `onDoubleClick` to `onClick` as well (around line 521):

```tsx
<div
  className="px-3 pb-3 pt-1 nodrag"
  onClick={(event) => {
    if (tags.length === 0) {
      event.stopPropagation();
      setEditingTags(true);
    }
  }}
>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CardNode.tsx
git commit -m "feat: replace double-click-to-edit with single-click and visible affordances"
```

---

### Task 7: Wire bottom action bar search button

**Files:**
- Modify: `src/components/BottomActionBar.tsx`

The SEARCH button in the floating bottom bar has no onClick handler. It renders as an active button that does nothing.

- [ ] **Step 1: Wire search to command palette**

In `src/components/BottomActionBar.tsx`, add a dispatch to open the command palette. Replace the search button (around lines 42-56):

```tsx
<button
  onClick={() => {
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    }));
  }}
  className="flex items-center gap-2 px-4 py-2 transition-colors"
  style={{
    color: "var(--color-text-muted)",
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    letterSpacing: "0.05em",
  }}
  title="Search cards (Cmd+K)"
  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)"; }}
  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)"; }}
>
  <Search size={14} />
  SEARCH
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomActionBar.tsx
git commit -m "fix: wire bottom bar search button to open command palette"
```

---

### Task 8: Kanban view click behavior for non-doc cards

**Files:**
- Modify: `src/components/KanbanView.tsx`

Cards in kanban view are only clickable if `hasDoc` is true. Non-doc cards are dead ends.

- [ ] **Step 1: Make all kanban cards clickable**

In `src/components/KanbanView.tsx`, update the card click handler (around lines 73-76):

```tsx
onClick={() => {
  if (card.hasDoc) {
    openEditor(card.id, { x: 100, y: 100 });
  } else {
    // Switch to canvas and focus this card
    useProjectStore.getState().setActiveView("canvas");
    useProjectStore.getState().setActiveTab("layers");
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("flo:focus-card", { detail: { cardId: card.id } }));
    });
  }
}}
```

Add the import at the top:

```typescript
import { useProjectStore } from "../store/project-store";
```

- [ ] **Step 2: Commit**

```bash
git add src/components/KanbanView.tsx
git commit -m "fix: make non-doc kanban cards navigate to canvas on click"
```

---

## Phase 3: Toolbar & Navigation Cleanup (3 parallel agents)

These changes improve information hierarchy in the toolbar and fill empty states.

---

### Task 9: Toolbar button grouping

**Files:**
- Modify: `src/components/Toolbar.tsx`

8 identical buttons in one row with no grouping. Users can't find what they need.

- [ ] **Step 1: Group toolbar buttons semantically**

In `src/components/Toolbar.tsx`, replace the button section (the `<div className="flex flex-wrap items-center justify-end gap-2">` block, lines 130-261) with grouped buttons:

```tsx
<div className="flex flex-wrap items-center justify-end gap-1">
  {/* File operations group */}
  <div className="flex items-center gap-1">
    <DropdownMenu>
      {/* ... existing Open dropdown, unchanged ... */}
    </DropdownMenu>
    <button
      onClick={() => saveProject()}
      className="text-xs font-bold px-3 py-1.5 uppercase tracking-wider bg-white text-black hover:opacity-90"
      style={{ fontFamily: "var(--font-headline)" }}
    >
      Save
    </button>
    <button
      onClick={() => saveProjectAs()}
      className="text-xs px-2 py-1.5 border"
      style={{
        background: "var(--color-surface-high)",
        color: "var(--color-text-muted)",
        borderColor: "var(--color-card-border)",
        fontFamily: "var(--font-mono)",
      }}
    >
      Save As
    </button>
  </div>

  {/* Separator */}
  <div className="h-5 w-px mx-1" style={{ background: "var(--color-card-border)" }} />

  {/* AI operations group */}
  <div className="flex items-center gap-1">
    <button
      onClick={async () => {
        const success = await copyContextToClipboard();
        if (success) {
          setCopyFeedback(true);
          setTimeout(() => setCopyFeedback(false), 1800);
        }
      }}
      className="text-xs px-3 py-1.5 border"
      style={{
        background: copyFeedback ? "var(--color-text-primary)" : "var(--color-surface-high)",
        color: copyFeedback ? "var(--color-canvas-bg)" : "var(--color-text-primary)",
        borderColor: copyFeedback ? "var(--color-text-primary)" : "var(--color-card-border)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {copyFeedback ? "COPIED!" : "Copy for AI"}
    </button>
    <button
      onClick={() => exportContext()}
      className="text-xs px-3 py-1.5 border"
      style={{
        background: "var(--color-surface-high)",
        color: "var(--color-text-muted)",
        borderColor: "var(--color-card-border)",
        fontFamily: "var(--font-mono)",
      }}
    >
      Export
    </button>
    <button
      onClick={() => setShowHealthCheck(true)}
      className="text-xs px-3 py-1.5 border"
      style={{
        background: "var(--color-surface-high)",
        color: "var(--color-text-muted)",
        borderColor: "var(--color-card-border)",
        fontFamily: "var(--font-mono)",
      }}
    >
      AI Check
    </button>
  </div>

  {/* Separator */}
  <div className="h-5 w-px mx-1" style={{ background: "var(--color-card-border)" }} />

  {/* Navigation group */}
  <div className="flex items-center gap-1">
    <button
      onClick={() => setShowCommandPalette(true)}
      className="flex items-center gap-2 text-xs px-3 py-1.5 border"
      style={{
        background: "var(--color-surface-high)",
        color: "var(--color-text-primary)",
        borderColor: "var(--color-card-border)",
        fontFamily: "var(--font-mono)",
      }}
      title="Search work and actions"
    >
      <Search size={12} />
      <span style={{ color: "var(--color-text-muted)" }}>Cmd+K</span>
    </button>
    <button
      onClick={() => setShowSettings(true)}
      className="flex items-center text-xs p-1.5 border"
      style={{
        background: "var(--color-surface-high)",
        color: "var(--color-text-muted)",
        borderColor: "var(--color-card-border)",
      }}
      title="Open settings"
    >
      <Settings size={14} />
    </button>
  </div>
</div>
```

Note: The Copy for AI button depends on Phase 1 Task 1 being complete. If running this before Phase 1, omit the Copy for AI button and add it when merging.

- [ ] **Step 2: Commit**

```bash
git add src/components/Toolbar.tsx
git commit -m "refactor: group toolbar buttons by function with visual separators"
```

---

### Task 10: Home screen action hierarchy

**Files:**
- Modify: `src/components/HomeScreen.tsx`

"New Empty Workspace" is styled as tertiary text, but it's the most common action for returning users.

- [ ] **Step 1: Reorder home screen actions for returning users**

In `src/components/HomeScreen.tsx`, update the button section. The key change: when `isFirstRun` is false, swap the visual weight so "New Empty Workspace" and "Start from Template" are primary, and "Explore Sample" becomes secondary:

Replace the button group inside the `<section>` (lines 104-197) with:

```tsx
<div className="flex flex-col gap-3">
  {isFirstRun ? (
    <>
      <button
        type="button"
        onClick={onOpenSample}
        className="w-full border px-4 py-3 text-left text-sm font-semibold transition-opacity hover:opacity-90"
        style={{
          background: "#FFFFFF",
          borderColor: "#FFFFFF",
          color: "#000000",
          fontFamily: "var(--font-headline)",
        }}
      >
        Explore Sample
      </button>

      <button
        type="button"
        onClick={onOpenTemplates}
        className="w-full border px-4 py-3 text-left text-sm transition-colors hover:opacity-90"
        style={{
          background: "transparent",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-headline)",
        }}
      >
        Start from Template
      </button>
    </>
  ) : (
    <>
      <button
        type="button"
        onClick={() => setShowNewWorkspaceForm(true)}
        className="w-full border px-4 py-3 text-left text-sm font-semibold transition-opacity hover:opacity-90"
        style={{
          background: "#FFFFFF",
          borderColor: "#FFFFFF",
          color: "#000000",
          fontFamily: "var(--font-headline)",
        }}
      >
        New Workspace
      </button>

      <button
        type="button"
        onClick={onOpenTemplates}
        className="w-full border px-4 py-3 text-left text-sm transition-colors hover:opacity-90"
        style={{
          background: "transparent",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-headline)",
        }}
      >
        Start from Template
      </button>
    </>
  )}

  {showNewWorkspaceForm ? (
    <div className="border px-3 py-3" style={{ borderColor: "var(--color-card-border)" }}>
      <label
        htmlFor="workspace-name"
        className="block text-[10px] uppercase tracking-[0.28em]"
        style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
      >
        Workspace Name
      </label>
      <input
        id="workspace-name"
        type="text"
        placeholder="Untitled Workspace"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleNew()}
        autoFocus
        className="mt-2 w-full border px-3 py-2.5 text-sm outline-none"
        style={{
          background: "var(--color-surface-lowest)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-body)",
        }}
      />
      <button
        type="button"
        onClick={handleNew}
        className="mt-3 w-full border px-4 py-2.5 text-left text-sm transition-opacity hover:opacity-90"
        style={{
          background: "var(--color-surface-high)",
          borderColor: "var(--color-card-border)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-headline)",
        }}
      >
        Create
      </button>
    </div>
  ) : null}

  <div className="flex items-center gap-3">
    {!isFirstRun ? (
      <button
        type="button"
        onClick={onOpenSample}
        className="px-1 py-2 text-left text-[11px] uppercase tracking-[0.28em] transition-opacity hover:opacity-80"
        style={{
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-mono)",
        }}
      >
        Explore Sample
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setShowNewWorkspaceForm((current) => !current)}
        className="px-1 py-2 text-left text-[11px] uppercase tracking-[0.28em] transition-opacity hover:opacity-80"
        style={{
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-mono)",
        }}
      >
        New Empty Workspace
      </button>
    )}
    <button
      type="button"
      onClick={handleLoad}
      className="px-1 py-2 text-left text-[11px] uppercase tracking-[0.28em] transition-opacity hover:opacity-80"
      style={{
        color: "var(--color-text-secondary)",
        fontFamily: "var(--font-mono)",
      }}
    >
      Open Existing
    </button>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/HomeScreen.tsx
git commit -m "feat: adapt home screen action hierarchy based on first-run vs returning user"
```

---

### Task 11: Actionable onboarding checklist items

**Files:**
- Modify: `src/components/OnboardingChecklist.tsx`

Checklist items are passive text. They should take the user to the relevant action.

- [ ] **Step 1: Add click handlers to checklist items**

In `src/components/OnboardingChecklist.tsx`, add imports:

```typescript
import { useProjectStore } from "../store/project-store";
import { saveProject } from "../lib/file-ops";
```

Add a callback map inside the component, after the `items` memo:

```typescript
const actions: Record<string, (() => void) | undefined> = {
  "first-card": () => {
    useProjectStore.getState().setActiveTab("layers");
    useProjectStore.getState().setActiveView("canvas");
  },
  "first-edge": () => {
    useProjectStore.getState().setActiveTab("layers");
    useProjectStore.getState().setActiveView("canvas");
  },
  "five-cards": () => {
    useProjectStore.getState().setActiveTab("layers");
    useProjectStore.getState().setActiveView("canvas");
  },
  "ghost-preview": () => {
    useProjectStore.getState().setActiveTab("layers");
    useProjectStore.getState().setActiveView("canvas");
    useCanvasStore.getState().setGhostPreviewMode("read");
  },
  "save-workspace": () => {
    saveProject();
  },
};
```

Update the checklist item rendering to be clickable when not complete. Replace the `<div key={item.id} ...>` block (lines 112-129):

```tsx
{items.map((item) => {
  const action = !item.complete ? actions[item.id] : undefined;
  const Wrapper = action ? "button" : "div";
  return (
    <Wrapper
      key={item.id}
      type={action ? "button" : undefined}
      className="flex items-start gap-3 px-4 py-3 text-left w-full transition-colors"
      style={{
        background: "var(--color-surface-lowest)",
        cursor: action ? "pointer" : "default",
      }}
      onClick={action}
    >
      <ChecklistIndicator complete={item.complete} />
      <div className="min-w-0 space-y-1">
        <div className="text-sm" style={{ color: "var(--color-text-primary)" }}>
          {item.label}
        </div>
        <div
          className="text-[11px] uppercase tracking-[0.18em]"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
        >
          {item.complete ? "Complete" : "Pending"} · {item.detail}
        </div>
      </div>
    </Wrapper>
  );
})}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OnboardingChecklist.tsx
git commit -m "feat: make onboarding checklist items clickable to navigate to relevant action"
```

---

## Phase 4: Agent Integration (2 parallel agents)

These are the medium-effort features that make flo invisible infrastructure rather than "another app to open."

---

### Task 12: Direct write to CLAUDE.md / .cursorrules

**Files:**
- Modify: `src/lib/file-ops.ts`
- Modify: `src/store/canvas-store.ts`
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/SettingsPanel.tsx`

Instead of exporting to a standalone file, write directly to where agents read: `CLAUDE.md`, `.cursorrules`, or a custom path.

- [ ] **Step 1: Add export target setting to canvas store**

In `src/store/canvas-store.ts`, add to the interface (in the Settings section):

```typescript
exportTargetPath: string;
setExportTargetPath: (path: string) => void;
```

Add to the store implementation:

```typescript
exportTargetPath: "",
setExportTargetPath: (path) => {
  set({ exportTargetPath: path, isDirty: true });
  persistSettings();
},
```

Add `exportTargetPath` to the settings persistence/restore logic (wherever `exportFileNamePattern` is saved/loaded — search for `CANVAS_SETTINGS_STORAGE_KEY`).

- [ ] **Step 2: Add `exportContextToTarget()` function**

In `src/lib/file-ops.ts`, add a new export function:

```typescript
export async function exportContextToTarget(): Promise<void> {
  const projectStore = useProjectStore.getState();
  const store = useCanvasStore.getState();
  const targetPath = store.exportTargetPath.trim();

  if (!targetPath) {
    // Fall back to regular export if no target configured
    return exportContext();
  }

  const contextMd = generateContextMd(
    projectStore.project.name,
    store.cards,
    store.edges,
    projectStore.project.goal,
    {
      agentHintExportMode: store.agentHintExportMode,
      includeAgentHints: store.exportIncludeAgentHints,
      includeBrainstorm: store.exportIncludeBrainstorm,
      includeCardDocs: store.exportIncludeCardDocs,
      excludedTags: store.excludedTags,
      goalOverride: store.exportGoalOverride,
    }
  );

  await writeTextFile(targetPath, contextMd);
  store.showToast(`Written to ${targetPath.split("/").pop()}`);
}
```

- [ ] **Step 3: Add export target config to SettingsPanel**

In `src/components/SettingsPanel.tsx`, find the export settings section and add a new field for the target path. Add an input field with label "Auto-export path" and placeholder "e.g. /path/to/project/CLAUDE.md". Wire it to `exportTargetPath` / `setExportTargetPath` from the canvas store. Add helper text: "When set, 'Export for AI' writes directly to this file instead of prompting."

The exact code depends on the SettingsPanel structure — read the file first and follow its existing patterns for adding a text input setting.

- [ ] **Step 4: Update Toolbar export button to use target**

In `src/components/Toolbar.tsx`, import the new function:

```typescript
import { saveProject, saveProjectAs, loadProject, loadProjectFromPath, exportContext, copyContextToClipboard, exportContextToTarget } from "../lib/file-ops";
```

Replace the Export button's `onClick` from `() => exportContext()` to `() => exportContextToTarget()`.

- [ ] **Step 5: Update auto-save to also write to target**

In `src/App.tsx`, in the auto-save `useEffect` (around line 194-206), after `saveProject()` succeeds, also write to the export target if configured:

```typescript
void saveProject().then(() => {
  const targetPath = useCanvasStore.getState().exportTargetPath.trim();
  if (targetPath) {
    exportContextToTarget().catch((error) => {
      console.error("Auto-export to target failed", error);
    });
  }
}).catch((error) => {
  console.error("Auto-save failed", error);
});
```

Import `exportContextToTarget` from `./lib/file-ops`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/file-ops.ts src/store/canvas-store.ts src/components/Toolbar.tsx src/components/SettingsPanel.tsx src/App.tsx
git commit -m "feat: add configurable export target path for direct CLAUDE.md / .cursorrules writes"
```

---

### Task 13: Export diff between versions

**Files:**
- Create: `src/lib/export-diff.ts`
- Modify: `src/components/GhostPreview.tsx`
- Modify: `src/store/canvas-store.ts`

Users export context.md, make edits, then export again. There's no way to see what changed between exports.

- [ ] **Step 1: Add last-exported snapshot to canvas store**

In `src/store/canvas-store.ts`, add to the interface:

```typescript
lastExportedContextMd: string | null;
setLastExportedContextMd: (md: string) => void;
```

Add to the store implementation:

```typescript
lastExportedContextMd: null,
setLastExportedContextMd: (md) => set({ lastExportedContextMd: md }),
```

- [ ] **Step 2: Save snapshot on every export**

In `src/lib/file-ops.ts`, in both `exportContext()` and `copyContextToClipboard()`, after generating `contextMd`, save it:

```typescript
useCanvasStore.getState().setLastExportedContextMd(contextMd);
```

- [ ] **Step 3: Create diff utility**

Create `src/lib/export-diff.ts`:

```typescript
export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
}

export function diffLines(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi < oldLines.length && ni < newLines.length && oldLines[oi] === newLines[ni]) {
      result.push({ type: "unchanged", text: oldLines[oi] });
      oi++;
      ni++;
    } else if (oi < oldLines.length && !newSet.has(oldLines[oi])) {
      result.push({ type: "removed", text: oldLines[oi] });
      oi++;
    } else if (ni < newLines.length && !oldSet.has(newLines[ni])) {
      result.push({ type: "added", text: newLines[ni] });
      ni++;
    } else if (oi < oldLines.length) {
      result.push({ type: "removed", text: oldLines[oi] });
      oi++;
    } else {
      result.push({ type: "added", text: newLines[ni] });
      ni++;
    }
  }

  return result;
}

export function summarizeDiff(diff: DiffLine[]): { added: number; removed: number; unchanged: number } {
  return diff.reduce(
    (acc, line) => {
      acc[line.type]++;
      return acc;
    },
    { added: 0, removed: 0, unchanged: 0 }
  );
}
```

- [ ] **Step 4: Add diff view toggle to GhostPreview**

In `src/components/GhostPreview.tsx`, import the diff utility and add a "diff" mode button in the Ghost Preview top bar alongside "Read View" and "Cost View":

```typescript
import { diffLines, summarizeDiff, type DiffLine } from "../lib/export-diff";
```

Add a diff mode state and compute the diff:

```typescript
const lastExported = useCanvasStore((state) => state.lastExportedContextMd);
const diff = useMemo(() => {
  if (!lastExported) return null;
  return diffLines(lastExported, contextMd);
}, [lastExported, contextMd]);
const diffSummary = useMemo(() => diff ? summarizeDiff(diff) : null, [diff]);
```

Add a "Diff" button in the top bar (only visible when `lastExported` is not null):

```tsx
{lastExported ? (
  <button
    type="button"
    className="border px-2 py-1 text-[10px] uppercase tracking-[0.24em]"
    aria-pressed={ghostPreviewMode === "diff" as any}
    style={modeButtonStyle(ghostPreviewMode === ("diff" as any))}
    onClick={() => setGhostPreviewMode("diff" as any)}
  >
    Diff {diffSummary ? `+${diffSummary.added} -${diffSummary.removed}` : ""}
  </button>
) : null}
```

Note: This requires updating the `ghostPreviewMode` type in the canvas store to include `"diff"`. Update the type from `null | "read" | "cost"` to `null | "read" | "cost" | "diff"` in the store interface and `setGhostPreviewMode`.

Add a diff panel renderer for when `ghostPreviewMode === "diff"`:

```tsx
{ghostPreviewMode === "diff" && diff ? (
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
          className="text-xs font-mono py-0.5 px-2"
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
) : null}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/export-diff.ts src/components/GhostPreview.tsx src/store/canvas-store.ts src/lib/file-ops.ts
git commit -m "feat: add export diff view showing changes since last export"
```

---

## Parallel Agent Dispatch Summary

| Phase | Tasks | Can Run In Parallel | Depends On |
|-------|-------|---------------------|------------|
| **Phase 1** | Task 1, 2, 3, 4 | All 4 in parallel | Nothing |
| **Phase 2** | Task 5, 6, 7, 8 | All 4 in parallel | Phase 1 (Task 7 bottom bar depends on Cmd+K handler from Toolbar.tsx existing, which it already does) |
| **Phase 3** | Task 9, 10, 11 | All 3 in parallel | Phase 1 (Task 9 uses Copy for AI from Task 1) |
| **Phase 4** | Task 12, 13 | Both in parallel | Phase 1 (Task 12 uses `showToast` from Task 2, Task 13 uses `copyContextToClipboard` snapshot from Task 12) |

**Total: 13 tasks across 4 phases, up to 4 agents running simultaneously per phase.**

**Merge strategy:** Each task commits to its own branch. After each phase, merge all branches into `main` and resolve any conflicts (conflicts will be minimal since tasks within a phase touch different files). Run the app and verify before proceeding to the next phase.
