# Extended Design Plan — Implementation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the flo extended design plan — split stores, tab navigation, .flo/ directory migration, dashboard, outline sidebar, dark/light mode, editor upgrades, wikilinks, tags, history, settings, file watcher, ghost preview, goal-based context, and card comments.

**Architecture:** Tauri 2.0 desktop app. React 19 + TypeScript frontend with Zustand state management and ReactFlow canvas. Rust backend handles filesystem I/O via Tauri invoke commands. TipTap rich text editor. No test framework exists — verification is visual via `npm run tauri dev`.

**Tech Stack:** Tauri 2.0, React 19, TypeScript, Zustand 5 + zundo, ReactFlow 12, TipTap 3, Vite, Tailwind CSS, Rust (serde, serde_json, notify)

**Source:** `/Users/connorreap/Desktop/Claude_Code/flo/docs/extended-design-plan.md`

---

## Parallelization Map

Tasks are grouped into waves. **All tasks within a wave can run in parallel** — they touch disjoint file sets. A wave must complete before the next wave starts.

```
WAVE 1 (Foundation) — 3 parallel agents
├── Task 1: useProjectStore + Tab Navigation + File Ops + Theme Init
│   Owns: project-store.ts, canvas-store.ts, App.tsx, Toolbar.tsx,
│         file-ops.ts, use-keyboard-shortcuts.ts, types.ts, HomeScreen.tsx
├── Task 2: .flo/ Directory Format (Rust backend only)
│   Owns: src-tauri/src/types.rs, commands/save.rs, commands/load.rs
└── Task 3: Dark/Light Mode (CSS) + Editor Upgrades (TipTap)
    Owns: index.css, use-theme.ts, EditorBubble.tsx, SlashCommandMenu.tsx,
          markdown.ts, package.json

WAVE 1.5 (Integration) — 1 agent
└── Task 4: Wave 1 Integration
    Merges Tasks 1+2+3, connects new save payload shape in file-ops.ts
    to new Rust backend, wires useThemeInit into App.tsx

WAVE 2 (Core Experience) — 5 parallel agents
├── Task 5: Home Dashboard Tab
│   Owns: dashboard-store.ts, HomeDashboard.tsx
├── Task 6: Outline Sidebar (Layers tab)
│   Owns: OutlineSidebar.tsx
├── Task 7: Card Tags + Command Palette
│   Owns: CardNode.tsx tag UI, export-context.ts tag export,
│         CommandPalette.tsx
├── Task 8: Wikilink Autocomplete + Backlinks
│   Owns: tiptap-wikilink.ts, WikilinkSuggestion.tsx
└── Task 9: Settings Panel
    Owns: SettingsPanel.tsx

WAVE 2.5 (Integration) — 1 agent
└── Task 10: Wave 2 Integration
    Wires all Wave 2 components into App.tsx, canvas-store.ts,
    types.ts, file-ops.ts, Rust types.rs

WAVE 3 (History & Agent Layer) — 4 parallel agents
├── Task 11: History Tab (snapshots + UI)
├── Task 12: File Watcher + Bidirectional context.md
├── Task 13: Ghost Preview
└── Task 14: Goal-Based Context + Card Comments
```

### File Ownership Rules

To prevent merge conflicts, each task "owns" specific files. **Only the owning task may modify that file.** Cross-cutting changes (wiring new components into App.tsx, adding fields to types.ts, updating canvas-store.ts) are batched into integration tasks at the end of each wave.

**Shared files and their integration points:**
- `src/App.tsx` — modified only by Task 1 (Wave 1) and Task 10 (Wave 2.5 integration)
- `src/store/canvas-store.ts` — modified only by Task 1 (Wave 1) and Task 10 (Wave 2.5 integration)
- `src/lib/types.ts` — modified only by Task 1 (Wave 1) and Task 10 (Wave 2.5 integration)
- `src/lib/file-ops.ts` — modified only by Task 1 (Wave 1) and Task 4 (Wave 1.5 integration)
- `src-tauri/src/types.rs` — modified only by Task 2 (Wave 1) and Task 10 (Wave 2.5 integration)

**Critical: `partialize` in canvas-store.ts** — The zundo temporal middleware's `partialize` config (line 177-180) only tracks `{ cards, edges }`. This is correct — new fields like `focusCardId`, `ghostPreviewMode`, etc. should NOT be added to partialize. Card-level additions (tags, comments, agentHint) are automatically tracked because they live inside card objects. Any agent modifying canvas-store.ts MUST preserve the existing `partialize` config unchanged.

---

## Chunk 1: Wave 1 — Foundation

### Task 1: useProjectStore + Tab Navigation Shell

**Depends on:** Nothing
**Parallel-safe with:** Tasks 2, 3, 4

This task extracts project-level state from `useCanvasStore` into a new `useProjectStore`, creates a stub `useAssetStore`, adds horizontal tab navigation (Home / Layers / Assets / History) to the toolbar, updates all store imports in file-ops.ts, and initializes the theme system.

**Files:**
- Create: `src/store/project-store.ts`
- Create: `src/store/asset-store.ts` (minimal stub per spec §1.4)
- Modify: `src/store/canvas-store.ts` (remove project, activeView)
- Modify: `src/App.tsx` (tab-based routing, keep all tabs mounted, add useThemeInit)
- Modify: `src/components/Toolbar.tsx` (add tab buttons)
- Modify: `src/hooks/use-keyboard-shortcuts.ts` (Ctrl+Tab cycling, update imports)
- Modify: `src/components/HomeScreen.tsx` (update store import)
- Modify: `src/lib/file-ops.ts` (update ALL store imports — this task owns file-ops.ts for Wave 1)
- Modify: `src/lib/types.ts` (add goal to ProjectMeta)

**Context for the agent:**

The current `useCanvasStore` (at `src/store/canvas-store.ts`) owns everything — project metadata, cards, edges, viewport, view state. The design plan calls for splitting into domain stores. This task creates `useProjectStore` as the "router" store and a minimal `useAssetStore` stub.

**IMPORTANT:** This task owns `src/lib/file-ops.ts` for Wave 1. Update store imports here but do NOT change the save payload shape — that will be done in Task 4 (integration) after the Rust backend (Task 2) is ready. The save/load functions should continue to use the old `ProjectState` shape for now, just reading project data from `useProjectStore` instead of `useCanvasStore`.

**IMPORTANT:** This task owns `src/App.tsx` for Wave 1. Include the `useThemeInit()` call from `src/hooks/use-theme.ts` (created by Task 3) here. If Task 3 hasn't been merged yet, add a TODO comment and the import — the integration task (Task 4) will wire it.

Current `useCanvasStore` fields to MOVE to `useProjectStore`:
- `project: ProjectMeta` (name, dirPath) — line 9, 67-68
- `setProject` — line 10, 68
- `activeView: "canvas" | "kanban"` — line 51, 153

New fields to ADD in `useProjectStore`:
- `activeTab: "home" | "layers" | "assets" | "history"` (default: "layers")
- `setActiveTab: (tab) => void`
- `theme: "dark" | "light"` (default: "dark")

The `ProjectMeta` type (in `src/lib/types.ts:42-45`) needs a `goal` field added:
```ts
export interface ProjectMeta {
  name: string;
  dirPath: string | null;
  goal?: string; // map-level goal for context generation
}
```

**Steps:**

- [ ] **Step 1: Create `src/store/project-store.ts`**

```ts
import { create } from "zustand";
import type { ProjectMeta } from "../lib/types";

export type TabId = "home" | "layers" | "assets" | "history";

interface ProjectStore {
  project: ProjectMeta;
  setProject: (project: ProjectMeta) => void;

  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  activeView: "canvas" | "kanban";
  setActiveView: (view: "canvas" | "kanban") => void;

  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
}

export const useProjectStore = create<ProjectStore>()((set) => ({
  project: { name: "Untitled Map", dirPath: null },
  setProject: (project) => set({ project }),

  activeTab: "layers",
  setActiveTab: (tab) => set({ activeTab: tab }),

  activeView: "canvas",
  setActiveView: (view) => set({ activeView: view }),

  theme: "dark",
  setTheme: (theme) => set({ theme }),
}));
```

- [ ] **Step 2: Remove moved fields from `useCanvasStore`**

In `src/store/canvas-store.ts`:
- Remove `project`, `setProject` (lines 8-10, 67-68)
- Remove `activeView`, `setActiveView` (lines 51-52, 153-154)
- Remove `project` from `clearAll` (line 171)
- Keep everything else (cards, edges, viewport, editors, grid, dirty, helpers)

- [ ] **Step 3: Update `src/App.tsx` to use `useProjectStore` and tab routing**

Key changes:
- Import `useProjectStore` instead of getting `project`, `activeView` from `useCanvasStore`
- Add tab-based content rendering: all four tab contents are always mounted (hidden via CSS `display: none` when not active) so state is preserved
- The Layers tab contains the existing Canvas/Kanban view toggle
- Home, Assets, History tabs render placeholder components for now

```tsx
// Tab content routing — all tabs stay mounted for instant switching
<div className="flex-1 relative">
  <div style={{ display: activeTab === "layers" ? "contents" : "none" }}>
    {activeView === "canvas" ? (
      <ReactFlowProvider><Canvas /></ReactFlowProvider>
    ) : (
      <KanbanView />
    )}
    {openEditors.map((editor) => (
      <EditorBubble key={editor.cardId} cardId={editor.cardId} initialPosition={editor.position} />
    ))}
  </div>
  <div style={{ display: activeTab === "home" ? "contents" : "none" }}>
    <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
      <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>Home — coming soon</span>
    </div>
  </div>
  <div style={{ display: activeTab === "assets" ? "contents" : "none" }}>
    <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
      <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>Assets — coming soon</span>
    </div>
  </div>
  <div style={{ display: activeTab === "history" ? "contents" : "none" }}>
    <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
      <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>History — coming soon</span>
    </div>
  </div>
  <BottomActionBar />
</div>
```

- [ ] **Step 4: Update `src/components/Toolbar.tsx` — add tab buttons**

Add horizontal tab buttons between the logo/project-name area and the action buttons. Tabs: Home, Layers, Assets, History. Active tab gets a bottom border or inverted colors.

```tsx
// Tab navigation — between logo and action buttons
const TABS: { id: TabId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "layers", label: "Layers" },
  { id: "assets", label: "Assets" },
  { id: "history", label: "History" },
];

// In the header, between logo/name and buttons:
<div className="flex items-center gap-1">
  {TABS.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className="text-[10px] px-3 py-1 uppercase tracking-widest transition-colors"
      style={{
        fontFamily: "var(--font-mono)",
        color: activeTab === tab.id ? "var(--color-text-primary)" : "var(--color-text-muted)",
        borderBottom: activeTab === tab.id ? "1px solid var(--color-text-primary)" : "1px solid transparent",
      }}
    >
      {tab.label}
    </button>
  ))}
</div>
```

- [ ] **Step 5: Update `src/hooks/use-keyboard-shortcuts.ts`**

- Change imports: `useProjectStore` for `setActiveView`
- Add `Ctrl+Tab` / `Ctrl+Shift+Tab` for cycling tabs
- `Cmd+1` / `Cmd+2` remain as canvas/kanban toggle within Layers tab (no change to behavior)

```ts
// Ctrl+Tab — next tab
if (e.ctrlKey && e.key === "Tab" && !e.shiftKey) {
  e.preventDefault();
  const tabs: TabId[] = ["home", "layers", "assets", "history"];
  const current = useProjectStore.getState().activeTab;
  const idx = tabs.indexOf(current);
  useProjectStore.getState().setActiveTab(tabs[(idx + 1) % tabs.length]);
}

// Ctrl+Shift+Tab — previous tab
if (e.ctrlKey && e.key === "Tab" && e.shiftKey) {
  e.preventDefault();
  const tabs: TabId[] = ["home", "layers", "assets", "history"];
  const current = useProjectStore.getState().activeTab;
  const idx = tabs.indexOf(current);
  useProjectStore.getState().setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length]);
}
```

- [ ] **Step 6: Update `src/lib/file-ops.ts`**

- Import `useProjectStore` for `project` and `setProject`
- Replace all `useCanvasStore.getState().project` with `useProjectStore.getState().project`
- Replace `store.setProject(...)` with `useProjectStore.getState().setProject(...)`

- [ ] **Step 7: Update `src/components/HomeScreen.tsx`**

- Import `useProjectStore` for the `loadProject` function reference (no store usage in HomeScreen currently, just verify the flow still works)

- [ ] **Step 8: Update `useCanvasStore.clearAll`**

- Remove `project` and `activeView` from `clearAll` since they moved
- Add a `clearAll` to `useProjectStore` or call both stores' clearAll from file-ops

- [ ] **Step 9: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`
Expected: No TypeScript errors

- [ ] **Step 10: Commit**

```bash
git add src/store/project-store.ts src/store/canvas-store.ts src/App.tsx src/components/Toolbar.tsx src/hooks/use-keyboard-shortcuts.ts src/lib/file-ops.ts src/lib/types.ts src/components/HomeScreen.tsx
git commit -m "feat: extract useProjectStore, add tab navigation shell (Home/Layers/Assets/History)"
```

---

### Task 2: .flo/ Directory Format Migration (Rust Backend Only)

**Depends on:** Nothing
**Parallel-safe with:** Tasks 1, 3

This task migrates the Rust backend from writing a single `canvas.json` to the new split format: `meta.json`, `cards.json`, `edges.json`, `viewport.json`, and receives `context.md` content to write on every save. **This task ONLY touches Rust files.** The frontend `file-ops.ts` changes to use the new payload shape are done in Task 4 (integration).

**Files:**
- Modify: `src-tauri/src/types.rs` (new struct shapes + keep old for backward compat)
- Modify: `src-tauri/src/commands/save.rs` (new save_project_v2 command)
- Modify: `src-tauri/src/commands/load.rs` (new load that reads split files, fallback to old .flo/canvas.json)
- Modify: `src-tauri/src/lib.rs` (register new commands)

**Context for the agent:**

Current state: The Rust backend (`src-tauri/src/commands/save.rs`) receives a `ProjectState` with a nested `CanvasState` (map_name, viewport, cards[], edges[]) and writes it all to `.flo/canvas.json`. Loading reads from `.flo/canvas.json`.

**IMPORTANT — Directory structure migration:** Old format nests files under a `.flo/` subdirectory inside the user-chosen directory. New format writes files directly into the project directory (which IS the `.flo` folder — e.g., `my-project.flo/meta.json`). The load command must handle both layouts for backward compatibility.

Target state: Save writes 4 separate files:
```
project.flo/
├── meta.json          # { name, created, formatVersion, goal }
├── cards.json         # Array of card objects
├── edges.json         # Array of edge objects
├── viewport.json      # { x, y, zoom }
├── context.md         # Auto-generated on save
├── assets/            # Empty dir for now
└── history/           # Empty dir for now
```

The `context.md` auto-generation on save should call the same logic as the frontend's `generateContextMd()` function, but since it's simpler to do this on the frontend side, the save flow should:
1. Frontend calls `generateContextMd()` and passes it as a field in the save payload
2. Rust writes it to `context.md`

**Steps:**

- [ ] **Step 1: Update `src-tauri/src/types.rs`**

Add new structs for the split format. Keep old `CanvasState` for backward compatibility loading.

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectMeta {
    pub name: String,
    pub created: String,
    pub format_version: u32,
    pub goal: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SavePayload {
    pub dir_path: String,
    pub meta: ProjectMeta,
    pub cards: Vec<CardData>,
    pub edges: Vec<EdgeData>,
    pub viewport: Viewport,
    pub context_md: String,
}
```

Update `EdgeData` to include all edge fields (currently missing edge_type, arrows, reference fields):

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EdgeData {
    pub id: String,
    pub source: String,
    pub target: String,
    pub edge_type: Option<String>,
    pub source_arrow: Option<bool>,
    pub target_arrow: Option<bool>,
    pub reference_scope: Option<String>,
    pub reference_section_hint: Option<String>,
    pub label: Option<String>,
}
```

- [ ] **Step 2: Rewrite `src-tauri/src/commands/save.rs`**

```rust
use std::fs;
use std::path::Path;
use crate::types::{SavePayload, CardData};

#[tauri::command]
pub fn save_project(state: SavePayload) -> Result<(), String> {
    let base = Path::new(&state.dir_path);
    fs::create_dir_all(base).map_err(|e| e.to_string())?;

    // Create subdirectories
    fs::create_dir_all(base.join("assets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(base.join("history")).map_err(|e| e.to_string())?;

    // Write meta.json
    let meta_json = serde_json::to_string_pretty(&state.meta)
        .map_err(|e| e.to_string())?;
    fs::write(base.join("meta.json"), meta_json).map_err(|e| e.to_string())?;

    // Write cards.json
    let cards_json = serde_json::to_string_pretty(&state.cards)
        .map_err(|e| e.to_string())?;
    fs::write(base.join("cards.json"), cards_json).map_err(|e| e.to_string())?;

    // Write edges.json
    let edges_json = serde_json::to_string_pretty(&state.edges)
        .map_err(|e| e.to_string())?;
    fs::write(base.join("edges.json"), edges_json).map_err(|e| e.to_string())?;

    // Write viewport.json
    let viewport_json = serde_json::to_string_pretty(&state.viewport)
        .map_err(|e| e.to_string())?;
    fs::write(base.join("viewport.json"), viewport_json).map_err(|e| e.to_string())?;

    // Write context.md
    fs::write(base.join("context.md"), &state.context_md).map_err(|e| e.to_string())?;

    // Write markdown files for cards with docs (preserve existing behavior)
    for card in &state.cards {
        if card.has_doc && !card.doc_content.is_empty() {
            write_card_markdown(base, card)?;
        }
    }

    Ok(())
}

// Keep write_card_markdown and slugify unchanged
```

- [ ] **Step 3: Rewrite `src-tauri/src/commands/load.rs` with backward compatibility**

Add a `LoadResult` struct to `types.rs`:

```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct LoadResult {
    pub dir_path: String,
    pub meta: ProjectMeta,
    pub cards: Vec<CardData>,
    pub edges: Vec<EdgeData>,
    pub viewport: Viewport,
}
```

Full load implementation with new format detection and legacy fallback:

```rust
use std::fs;
use std::path::Path;
use crate::types::{CanvasState, LoadResult, ProjectMeta, CardData, EdgeData, Viewport};

#[tauri::command]
pub fn load_project(dir_path: String) -> Result<LoadResult, String> {
    let base = Path::new(&dir_path);

    // Try new format first: meta.json at project root
    let meta_path = base.join("meta.json");
    if meta_path.exists() {
        let meta: ProjectMeta = serde_json::from_str(
            &fs::read_to_string(&meta_path).map_err(|e| e.to_string())?
        ).map_err(|e| e.to_string())?;

        let cards: Vec<CardData> = serde_json::from_str(
            &fs::read_to_string(base.join("cards.json")).map_err(|e| e.to_string())?
        ).map_err(|e| e.to_string())?;

        let edges: Vec<EdgeData> = serde_json::from_str(
            &fs::read_to_string(base.join("edges.json")).map_err(|e| e.to_string())?
        ).map_err(|e| e.to_string())?;

        let viewport: Viewport = serde_json::from_str(
            &fs::read_to_string(base.join("viewport.json")).map_err(|e| e.to_string())?
        ).map_err(|e| e.to_string())?;

        return Ok(LoadResult { dir_path, meta, cards, edges, viewport });
    }

    // Fallback: old format with .flo/canvas.json inside the selected directory
    let canvas_path = base.join(".flo").join("canvas.json");
    if canvas_path.exists() {
        let canvas: CanvasState = serde_json::from_str(
            &fs::read_to_string(&canvas_path).map_err(|e| e.to_string())?
        ).map_err(|e| e.to_string())?;

        let meta = ProjectMeta {
            name: canvas.map_name,
            created: String::new(),
            format_version: 1,
            goal: None,
        };

        return Ok(LoadResult {
            dir_path,
            meta,
            cards: canvas.cards,
            edges: canvas.edges,
            viewport: canvas.viewport,
        });
    }

    Err("No flo project found in selected directory".to_string())
}
```

- [ ] **Step 4: Register the new `save_project_v2` command in `src-tauri/src/lib.rs`**

Keep the old `save_project` command registered (for backward compat during development) and add `save_project_v2`. The integration task (Task 4) will switch the frontend to call v2.

- [ ] **Step 5: Verify the Rust build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga/src-tauri && cargo check`

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/types.rs src-tauri/src/commands/save.rs src-tauri/src/commands/load.rs src-tauri/src/lib.rs
git commit -m "feat: Rust backend for split .flo/ format (meta/cards/edges/viewport.json + context.md)"
```

---

### Task 3: Dark/Light Mode + Editor Upgrades

**Depends on:** Nothing
**Parallel-safe with:** Tasks 1, 2

This task combines two independent UI improvements that share file ownership (`src/index.css`, `src/components/EditorBubble.tsx`). It adds a light theme with CSS custom properties, and extends the TipTap editor with headings, alignment, slash command menu, and new block types.

**Files:**
- Modify: `src/index.css` (add light theme variables + TipTap heading/block styles)
- Create: `src/hooks/use-theme.ts` (theme hook that reads `prefers-color-scheme` and stores preference)

**Context for the agent:**

The current theme variables are defined in `src/index.css` under the `@theme` block (lines 133-167). All components use these variables via inline styles (e.g., `style={{ background: "var(--color-canvas-bg)" }}`). The app is dark-only right now.

The design plan says:
- CSS custom properties approach
- Manual toggle in toolbar or Settings
- Ship dark (current default) and light
- Respect `prefers-color-scheme` for initial default, allow manual override

Implementation approach: Use a `[data-theme="light"]` attribute on `<html>` to switch themes. The `@theme` block defines dark values by default. A `[data-theme="light"]` selector overrides them.

Note: Task 1 adds `theme` to `useProjectStore`. If Task 1 hasn't landed yet, create a standalone hook. The integration point is small — just reading/writing a string.

**Steps:**

- [ ] **Step 1: Add light theme variables to `src/index.css`**

After the existing `@theme` block (line 167), add:

```css
[data-theme="light"] {
  --color-canvas-bg: #F5F5F5;
  --color-grid-dot: #E0E0E0;
  --color-card-bg: #FFFFFF;
  --color-card-border: #D4D4D4;
  --color-card-border-hover: #B0B0B0;
  --color-card-border-selected: #000000;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #555555;
  --color-text-muted: #999999;
  --color-badge-bg: #F0F0F0;
  --color-badge-text: #555555;
  --color-surface: #EBEBEB;
  --color-surface-container: #E0E0E0;
  --color-surface-low: #F0F0F0;
  --color-surface-lowest: #FAFAFA;
  --color-surface-high: #D4D4D4;
  --color-surface-highest: #C0C0C0;
  --color-accent-error: #DC2626;
}

[data-theme="light"] body {
  background: var(--color-canvas-bg);
  color: var(--color-text-primary);
}
```

- [ ] **Step 2: Create `src/hooks/use-theme.ts`**

```ts
import { useEffect } from "react";

const THEME_KEY = "flo-theme";

export type Theme = "dark" | "light";

export function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function useThemeInit() {
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);
}
```

- [ ] **Step 3: DO NOT modify `src/App.tsx`** — Task 1 owns App.tsx. The `useThemeInit()` call will be added by Task 1 or the integration task (Task 4).

- [ ] **Step 4: Update ReactFlow components that hardcode dark colors**

**IMPORTANT:** The flo color variables are defined inside a Tailwind CSS 4 `@theme` block, which registers them as design tokens. A `[data-theme="light"]` selector outside `@theme` may not override them due to CSS layer specificity. If the overrides don't work, move the flo color definitions from `@theme` into a `:root` block (keeping the shadcn tokens in `@theme`) and use `[data-theme="light"]` to override `:root`.

In `src/components/Canvas.tsx`, the Background color is hardcoded `"#1A1A1A"` (line 152), MiniMap uses hardcoded colors (lines 157-163). Replace with CSS variable references or conditional values.

Similarly check `src/components/CardNode.tsx` for hardcoded colors like `"#FFFFFF"`, `"#C9A84C"` — these should use CSS variables or remain as accent colors that work on both themes.

- [ ] **Step 5: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/hooks/use-theme.ts
git commit -m "feat: add light theme with CSS custom properties, auto-detect prefers-color-scheme"
```

**--- Editor Upgrades (continuation of Task 3) ---**

This section extends the TipTap editor with heading support (H1-H3), text alignment, and a `/` slash command for content blocks.

**Depends on:** Nothing
**Parallel-safe with:** Tasks 1, 2, 3

This task extends the TipTap editor with heading support (H1-H3), text alignment, and a `+` icon on empty lines for block insertion. The `/` slash command for content blocks is also added here.

**Files:**
- Modify: `src/components/EditorBubble.tsx` (add extensions, heading/alignment toolbar buttons, + icon, / command)
- Modify: `src/index.css` (TipTap heading styles)
- Create: `src/components/SlashCommandMenu.tsx` (dropdown menu for / command)

**Context for the agent:**

The current EditorBubble (`src/components/EditorBubble.tsx`) uses:
- `StarterKit` (includes headings but they're not exposed in the toolbar)
- `Underline` extension
- Toolbar buttons: B, I, U, bullet list, ordered list

The design plan calls for:
- Headings H1-H3 (via `/` command or markdown shortcuts `#`, `##`, `###`) — StarterKit already includes the Heading extension
- Text alignment (left, center, right) — needs `@tiptap/extension-text-align`
- `+` icon on empty lines — shows on hover, opens `/` menu
- `/` command — opens dropdown with content block types

First install the text-align extension:
```bash
npm install @tiptap/extension-text-align
```

**Steps:**

- [ ] **Step 1: Install `@tiptap/extension-text-align`**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm install @tiptap/extension-text-align`

- [ ] **Step 2: Create `src/components/SlashCommandMenu.tsx`**

A dropdown component that appears when the user types `/` in the editor. Shows block types: Heading 1, Heading 2, Heading 3, Bullet List, Numbered List, Blockquote, Code Block, Divider.

```tsx
import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";

interface SlashCommandMenuProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
}

const COMMANDS = [
  { label: "Heading 1", icon: "H1", action: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", icon: "H2", action: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", icon: "H3", action: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Bullet List", icon: "•", action: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered List", icon: "1.", action: (e: Editor) => e.chain().focus().toggleOrderedList().run() },
  { label: "Quote", icon: "❝", action: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
  { label: "Code Block", icon: "<>", action: (e: Editor) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Divider", icon: "—", action: (e: Editor) => e.chain().focus().setHorizontalRule().run() },
];

export function SlashCommandMenu({ editor, position, onClose }: SlashCommandMenuProps) {
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          // Delete the "/" character first
          editor.chain().focus().deleteRange({
            from: editor.state.selection.from - filter.length - 1,
            to: editor.state.selection.from,
          }).run();
          filtered[selectedIndex].action(editor);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [editor, filtered, selectedIndex, filter, onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 flex flex-col gap-0.5 p-1 min-w-[180px]"
      style={{
        top: position.top,
        left: position.left,
        background: "var(--color-surface)",
        border: "1px solid var(--color-card-border)",
      }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-left transition-colors"
          style={{
            color: i === selectedIndex ? "var(--color-text-primary)" : "var(--color-text-muted)",
            background: i === selectedIndex ? "var(--color-surface-high)" : "transparent",
            fontFamily: "var(--font-mono)",
          }}
          onClick={() => {
            editor.chain().focus().deleteRange({
              from: editor.state.selection.from - filter.length - 1,
              to: editor.state.selection.from,
            }).run();
            cmd.action(editor);
            onClose();
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="w-6 text-center">{cmd.icon}</span>
          {cmd.label}
        </button>
      ))}
      {filtered.length === 0 && (
        <span className="px-2 py-1 text-xs" style={{ color: "var(--color-text-muted)" }}>No results</span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `src/components/EditorBubble.tsx`**

- Add `TextAlign` extension to the extensions array
- Add heading buttons (H1, H2, H3) and alignment buttons (left, center, right) to the formatting toolbar
- Add a listener for `/` key to show the SlashCommandMenu
- Add the `+` icon that appears on empty lines (shows on hover, click opens slash menu)

For the extensions:
```ts
import TextAlign from "@tiptap/extension-text-align";

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: { keepMarks: true, keepAttributes: false },
    orderedList: { keepMarks: true, keepAttributes: false },
    listItem: {},
  }),
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];
```

Add H1/H2/H3 and alignment buttons to the toolbar div (after the existing B/I/U buttons).

- [ ] **Step 4: Add TipTap heading styles to `src/index.css`**

```css
.tiptap h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75em 0 0.25em; font-family: var(--font-headline); }
.tiptap h2 { font-size: 1.25rem; font-weight: 600; margin: 0.6em 0 0.2em; font-family: var(--font-headline); }
.tiptap h3 { font-size: 1.1rem; font-weight: 600; margin: 0.5em 0 0.15em; font-family: var(--font-headline); }
.tiptap blockquote {
  border-left: 2px solid var(--color-card-border);
  padding-left: 1rem;
  margin: 0.5em 0;
  color: var(--color-text-secondary);
}
.tiptap pre {
  background: var(--color-surface);
  padding: 0.75rem;
  margin: 0.5em 0;
  font-family: var(--font-mono);
  font-size: 13px;
  overflow-x: auto;
}
.tiptap code {
  background: var(--color-surface-high);
  padding: 0.1em 0.3em;
  font-family: var(--font-mono);
  font-size: 0.9em;
}
.tiptap hr {
  border: none;
  border-top: 1px solid var(--color-card-border);
  margin: 1em 0;
}
```

- [ ] **Step 5: Update `src/lib/markdown.ts` — handle headings in serialization**

The `htmlToMarkdown` function needs to convert `<h1>`, `<h2>`, `<h3>` tags to markdown headings. The `markdownToHtml` function needs the reverse.

Add to `htmlToMarkdown`:
```ts
.replace(/<h1>(.*?)<\/h1>/g, "# $1\n")
.replace(/<h2>(.*?)<\/h2>/g, "## $1\n")
.replace(/<h3>(.*?)<\/h3>/g, "### $1\n")
.replace(/<blockquote><p>(.*?)<\/p><\/blockquote>/g, "> $1\n")
.replace(/<pre><code>(.*?)<\/code><\/pre>/gs, "```\n$1\n```\n")
```

Add to `markdownToHtml` (before paragraph wrapping):
```ts
// Handle headings
.replace(/^### (.*$)/gm, "<h3>$1</h3>")
.replace(/^## (.*$)/gm, "<h2>$1</h2>")
.replace(/^# (.*$)/gm, "<h1>$1</h1>")
```

- [ ] **Step 6: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/components/EditorBubble.tsx src/components/SlashCommandMenu.tsx src/index.css src/lib/markdown.ts package.json package-lock.json
git commit -m "feat: editor upgrades — headings, alignment, slash command menu, blockquote/code/divider"
```

---

### Task 4: Wave 1 Integration

**Depends on:** Tasks 1, 2, 3 (all of Wave 1)
**Parallel-safe with:** Nothing — this is a sequential integration step

This task merges the outputs of Wave 1 and wires them together: connects the new Rust save/load backend to the frontend file-ops, adds `useThemeInit()` to App.tsx, ensures all imports compile.

**Files:**
- Modify: `src/lib/file-ops.ts` (rewrite saveProject/loadProject to use new Rust payload shape)
- Modify: `src/App.tsx` (add useThemeInit if not already present)
- Verify: all files from Tasks 1, 2, 3 compile together

**Steps:**

- [ ] **Step 1: Rewrite `saveProject()` in `src/lib/file-ops.ts` to use new Rust payload**

The function now reads from `useProjectStore` (Task 1) and builds the `SavePayload` shape expected by the new Rust `save_project_v2` command (Task 2). It also auto-generates `context.md` and includes it in the payload.

```ts
export async function saveProject(): Promise<void> {
  const canvasStore = useCanvasStore.getState();
  const projectStore = useProjectStore.getState();
  let dirPath = projectStore.project.dirPath;

  if (!dirPath) {
    const selected = await save({
      title: "Save flo Project",
      defaultPath: projectStore.project.name + ".flo",
    });
    if (!selected) return;
    dirPath = selected;
    projectStore.setProject({ ...projectStore.project, dirPath });
  }

  const cardsForSave = canvasStore.cards.map((card) => ({
    id: card.id,
    type: card.type,
    title: card.title,
    body: card.body,
    position: card.position,
    collapsed: card.collapsed,
    has_doc: card.hasDoc,
    doc_content: card.hasDoc ? serializeCardToMarkdown(card) : "",
  }));

  const edgesForSave = canvasStore.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    edge_type: e.edgeType,
    source_arrow: e.sourceArrow,
    target_arrow: e.targetArrow,
    reference_scope: e.referenceScope,
    reference_section_hint: e.referenceSectionHint,
    label: e.label,
  }));

  const contextMd = generateContextMd(
    projectStore.project.name,
    canvasStore.cards,
    canvasStore.edges
  );

  const payload = {
    dir_path: dirPath,
    meta: {
      name: projectStore.project.name,
      created: new Date().toISOString(),
      format_version: 2,
      goal: projectStore.project.goal ?? null,
    },
    cards: cardsForSave,
    edges: edgesForSave,
    viewport: canvasStore.viewport,
    context_md: contextMd,
  };

  await invoke("save_project_v2", { state: payload });
  canvasStore.markClean();
}
```

- [ ] **Step 2: Rewrite `loadProject()` in `src/lib/file-ops.ts` for new LoadResult shape**

```ts
export async function loadProject(): Promise<void> {
  const selected = await open({
    title: "Open flo Project",
    directory: true,
  });
  if (!selected) return;

  const result = await invoke<{
    dir_path: string;
    meta: { name: string; created: string; format_version: number; goal?: string };
    cards: Array<{
      id: string; type: string; title: string; body: string;
      position: { x: number; y: number }; collapsed: boolean;
      has_doc: boolean; doc_content: string;
    }>;
    edges: Array<{
      id: string; source: string; target: string;
      edge_type?: string; source_arrow?: boolean; target_arrow?: boolean;
      reference_scope?: string; reference_section_hint?: string; label?: string;
    }>;
    viewport: { x: number; y: number; zoom: number };
  }>("load_project", { dirPath: selected });

  const cards = result.cards.map((c) => ({
    id: c.id,
    type: c.type as "project" | "process" | "reference" | "brainstorm",
    title: c.title,
    body: c.body,
    position: c.position,
    collapsed: c.collapsed,
    hasDoc: c.has_doc,
    docContent: c.has_doc && c.doc_content ? deserializeMarkdown(c.doc_content).htmlContent : "",
    tags: [] as string[],
  }));

  const edges = result.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    edgeType: (e.edge_type ?? "hierarchy") as import("../lib/types").EdgeType,
    sourceArrow: e.source_arrow,
    targetArrow: e.target_arrow,
    referenceScope: e.reference_scope as import("../lib/types").ReferenceScope | undefined,
    referenceSectionHint: e.reference_section_hint,
  }));

  useProjectStore.getState().setProject({
    name: result.meta.name,
    dirPath: result.dir_path,
    goal: result.meta.goal,
  });
  useCanvasStore.getState().loadState(cards, edges, result.viewport);
}
```

- [ ] **Step 3: Wire `useThemeInit()` into App.tsx**

If Task 3's `src/hooks/use-theme.ts` is available, add `import { useThemeInit } from "./hooks/use-theme"` and call `useThemeInit()` at the top of the `App` component.

- [ ] **Step 4: Full build verification**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build && cd src-tauri && cargo check`
Expected: Zero errors from both frontend and backend.

- [ ] **Step 5: Commit**

```bash
git add src/lib/file-ops.ts src/App.tsx
git commit -m "feat: wire Wave 1 together — new save/load payload, theme init, full integration"
```

---

## Chunk 2: Wave 2 — Core Experience

### Task 5: Home Dashboard Tab

**Depends on:** Wave 1 complete (Task 4 integration)
**Parallel-safe with:** Tasks 6, 7, 8, 9

This task implements the Home tab content — a read-only dashboard showing project stats, a minimap thumbnail, and an activity feed.

**Files:**
- Create: `src/store/dashboard-store.ts`
- Create: `src/components/HomeDashboard.tsx`
- Modify: `src/App.tsx` (replace Home placeholder with HomeDashboard)

**Context for the agent:**

The Home tab should show:
- Project name + editable description field
- Card count by type, edge count, total word count
- Context tier from the Governor (current health status)
- Last-edited timestamp
- Non-interactive minimap thumbnail of the canvas
- Activity feed showing recent changes

The `useDashboardStore` subscribes to `useCanvasStore` changes to compute derived stats.

**Steps:**

- [ ] **Step 1: Create `src/store/dashboard-store.ts`**

```ts
import { create } from "zustand";
import { useCanvasStore } from "./canvas-store";
import type { CardType } from "../lib/constants";

interface ActivityEntry {
  id: string;
  timestamp: number;
  action: "add" | "edit" | "delete";
  cardTitle: string;
  cardType: CardType;
}

interface DashboardStore {
  cardCountByType: Record<CardType, number>;
  edgeCount: number;
  totalWordCount: number;
  activityLog: ActivityEntry[];
  addActivity: (entry: Omit<ActivityEntry, "id" | "timestamp">) => void;
  recompute: () => void;
}

export const useDashboardStore = create<DashboardStore>()((set, get) => ({
  cardCountByType: { project: 0, process: 0, reference: 0, brainstorm: 0 },
  edgeCount: 0,
  totalWordCount: 0,
  activityLog: [],

  addActivity: (entry) =>
    set((s) => ({
      activityLog: [
        { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
        ...s.activityLog,
      ].slice(0, 50),
    })),

  recompute: () => {
    const { cards, edges } = useCanvasStore.getState();
    const counts: Record<string, number> = { project: 0, process: 0, reference: 0, brainstorm: 0 };
    let wordCount = 0;
    for (const card of cards) {
      counts[card.type] = (counts[card.type] || 0) + 1;
      wordCount += (card.title + " " + card.body + " " + card.docContent).split(/\s+/).filter(Boolean).length;
    }
    set({
      cardCountByType: counts as Record<CardType, number>,
      edgeCount: edges.length,
      totalWordCount: wordCount,
    });
  },
}));

// Subscribe to canvas store changes
useCanvasStore.subscribe(
  (state) => [state.cards, state.edges],
  () => useDashboardStore.getState().recompute(),
  { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] }
);
```

**Use the simple subscribe approach** (the selector-based `subscribe` requires `subscribeWithSelector` middleware which is not configured on the existing store):
```ts
// At module level, after store creation:
useCanvasStore.subscribe(() => {
  useDashboardStore.getState().recompute();
});
```

- [ ] **Step 2: Create `src/components/HomeDashboard.tsx`**

A full-height panel showing stats in a clean grid layout. Use the flo design language (mono font for data, headline font for labels, pixel borders).

Stats grid:
- 4 card-type counts (PRJ, PRC, REF, BRN)
- Edge count
- Total word count
- Governor warnings count (call `runGovernor()`)

Activity feed: vertical list of recent actions with timestamps.

Minimap: Use a simplified canvas renderer — iterate over cards and draw colored rectangles proportionally. This is a static SVG, not an interactive ReactFlow instance.

- [ ] **Step 3: Replace Home placeholder in `src/App.tsx`**

Import `HomeDashboard` and replace the placeholder div.

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/store/dashboard-store.ts src/components/HomeDashboard.tsx src/App.tsx
git commit -m "feat: Home dashboard tab with stats, minimap thumbnail, activity feed"
```

---

### Task 6: Outline Sidebar (Layers Tab)

**Depends on:** Wave 1 complete
**Parallel-safe with:** Tasks 5, 7, 8, 9

This task creates the outline sidebar component. Wiring it into App.tsx and adding `focusCardId` to canvas-store happens in Task 10 (Wave 2.5 integration).

**Files:**
- Create: `src/components/OutlineSidebar.tsx`

**Context for the agent:**

The sidebar shows a tree of cards mirroring hierarchy edges. Root cards (no incoming hierarchy edge) are top-level. Children nest beneath parents. Clicking a card selects it on the canvas and pans to it. The sidebar is collapsible (toggle button or keyboard shortcut).

The hierarchy edges already exist in `useCanvasStore.edges` filtered by `edgeType === "hierarchy"`. The pattern for finding roots and children is already used in `KanbanView.tsx` (lines 13-23) and `export-context.ts` (lines 48-71).

Tree items show:
- Card type badge (same style as CardNode)
- Card title
- Expand/collapse arrow for cards with children
- Drag-to-reorder creates/modifies hierarchy edges (stretch goal — skip for v1)

**Steps:**

- [ ] **Step 1: Create `src/components/OutlineSidebar.tsx`**

A left sidebar component with:
- Toggle button (chevron or sidebar icon)
- Tree view built from hierarchy edges
- Each tree node: type badge + title, clickable
- Click handler that:
  1. Selects the node in ReactFlow (needs access to ReactFlow instance)
  2. Calls `fitView` or `setCenter` to pan to the card

Width: 240px when open, 0 when collapsed. Animate with CSS transition.

For panning to a card: The Canvas component uses ReactFlow. To pan from the sidebar, use a shared callback or a store-based approach:
- Add `focusCardId: string | null` and `setFocusCard: (id: string | null) => void` to `useCanvasStore`
- Canvas listens for `focusCardId` changes and calls `reactFlowInstance.fitView({ nodes: [{ id: focusCardId }] })`

```tsx
// Tree node component
function TreeNode({ card, children, depth, onSelect }: {
  card: Card;
  children: Card[];
  depth: number;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const typeStyle = CARD_TYPE_STYLES[card.type];

  return (
    <div>
      <button
        className="flex items-center gap-1.5 w-full px-2 py-1 text-left hover:bg-[var(--color-surface-high)] transition-colors"
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => onSelect(card.id)}
      >
        {children.length > 0 && (
          <span
            className="text-[10px] cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? "▼" : "▶"}
          </span>
        )}
        <span
          className="text-[9px] px-1 py-0.5"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            backgroundColor: typeStyle.bg,
            color: typeStyle.text,
            border: `1px solid ${typeStyle.text}40`,
          }}
        >
          {CARD_TYPE_LABELS[card.type]}
        </span>
        <span className="text-xs truncate" style={{ color: "var(--color-text-primary)" }}>
          {card.title || "Untitled"}
        </span>
      </button>
      {expanded && children.length > 0 && (
        <div>{/* render children recursively */}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

The component should compile standalone. It imports from `useCanvasStore` to read cards/edges (read-only).

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/OutlineSidebar.tsx
git commit -m "feat: outline sidebar component with hierarchy tree"
```

**Note:** The following are deferred to Task 10 (Wave 2.5 integration):
- Adding `focusCardId` / `setFocusCard` to `useCanvasStore`
- Adding `useEffect` in Canvas.tsx to handle focus/pan
- Wrapping the Layers tab in App.tsx with sidebar layout
- Wiring the sidebar's `onSelect` to `setFocusCard`

---

### Task 7: Card Tags + Command Palette (Cmd+K)

**Depends on:** Wave 1 complete
**Parallel-safe with:** Tasks 5, 6, 8, 9

This task adds tag support to cards and implements the Command Palette (Cmd+K) — both are UI features that create new components without modifying shared files (shared file updates happen in Task 10 integration).

**Files:**
- Create: `src/components/CommandPalette.tsx` (Cmd+K command palette)
- Modify: `src/components/CardNode.tsx` (render tags, add tag input)
- Modify: `src/lib/export-context.ts` (include tags in context.md)

**Note:** Changes to `src/lib/types.ts` (add `tags` to Card), `src/store/canvas-store.ts` (update addCard), `src/lib/file-ops.ts` (save/load tags), and `src-tauri/src/types.rs` are deferred to Task 10 (Wave 2.5 integration) to avoid merge conflicts.

**Context for the agent:**

The `Card` interface (`src/lib/types.ts:4-15`) will get a `tags: string[]` field in the integration step. For now, build the CardNode tag UI to read `data.tags` (it will be `undefined` until integration, so use `data.tags ?? []`). Build the CommandPalette as a standalone modal.

**Command Palette (Cmd+K):** A modal overlay with fuzzy search across: cards (navigate to), actions (save, export, toggle grid, etc.), and settings. Opens with Cmd+K, closes with Escape. Fuzzy match with keyboard navigation (up/down/enter).

Per the design plan: each tag has an "export" toggle (exported vs. private). For v1, all tags are exported by default. The per-tag configuration can live in a future Settings panel.

**Steps:**

- [ ] **Step 1: Update `CardNode.tsx` — render tags and add tag input**

Below the body section of the expanded card, add a tag row. Use `data.tags ?? []` since the `tags` field won't exist on Card until the integration task adds it to `types.ts`.

```tsx
{/* Tags */}
<div className="px-3 pb-2 flex flex-wrap gap-1 items-center">
  {(data.tags ?? []).map((tag: string) => (
    <span
      key={tag}
      className="text-[9px] px-1.5 py-0.5"
      style={{
        fontFamily: "var(--font-mono)",
        background: "var(--color-surface-high)",
        color: "var(--color-text-secondary)",
        border: "1px solid var(--color-card-border)",
      }}
    >
      #{tag}
    </span>
  ))}
</div>
```

Add a mechanism to add tags (double-click on tag area opens a small input, Enter adds the tag via `updateCard(id, { tags: [...(data.tags ?? []), newTag] })`).

- [ ] **Step 2: Update `export-context.ts` — include tags**

In the Structure section tree rendering (line 63), append tags:
```ts
const tagStr = card.tags?.length ? ` [${card.tags.map((t: string) => "#" + t).join(", ")}]` : "";
lines.push(`${prefix}${tag} ${card.title}${card.body ? ": " + card.body.split("\n")[0] : ""}${tagStr}`);
```

- [ ] **Step 3: Create `src/components/CommandPalette.tsx`**

A modal overlay that opens with Cmd+K. Features:
- Full-width search input at the top
- Fuzzy-filtered results grouped by category: Cards, Actions, Settings
- Keyboard navigation (up/down arrows, Enter to select, Escape to close)
- Card results: clicking navigates to the card (sets `focusCardId` in canvas store)
- Action results: Save, Export, Toggle Grid, Toggle Minimap, etc.

```tsx
import { useState, useEffect, useMemo } from "react";
import { useCanvasStore } from "../store/canvas-store";

const ACTIONS = [
  { id: "save", label: "Save Project", category: "action" },
  { id: "export", label: "Export context.md", category: "action" },
  { id: "grid", label: "Toggle Grid", category: "setting" },
  { id: "minimap", label: "Toggle Minimap", category: "setting" },
  { id: "snap", label: "Toggle Snap to Grid", category: "setting" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const cards = useCanvasStore((s) => s.cards);

  // Build searchable items from cards + actions
  const items = useMemo(() => {
    const cardItems = cards.map((c) => ({
      id: c.id,
      label: c.title || "Untitled",
      category: "card" as const,
    }));
    return [...cardItems, ...ACTIONS];
  }, [cards]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => { if (open) setQuery(""); }, [open]);

  if (!open) return null;

  // Render modal with backdrop, search input, results list
  // Handle Enter/Escape/ArrowUp/ArrowDown in a keydown handler
  // ...
}
```

The full implementation should include the action execution (dispatch save/export/toggle) and card navigation (set focusCardId).

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/CardNode.tsx src/lib/export-context.ts src/components/CommandPalette.tsx
git commit -m "feat: card tags UI, tag export in context.md, Cmd+K command palette"
```

---

### Task 8: Wikilink Autocomplete + Backlinks

**Depends on:** Nothing directly (uses existing TipTap editor)
**Parallel-safe with:** Tasks 5, 6, 7, 9

This task adds `[[` wikilink autocomplete in the TipTap editor and a "Referenced by" backlinks section in each card's editor.

**Files:**
- Create: `src/components/WikilinkSuggestion.tsx` (autocomplete dropdown)
- Create: `src/lib/tiptap-wikilink.ts` (custom TipTap extension for `[[` trigger)
- Modify: `src/components/EditorBubble.tsx` (add wikilink extension, show backlinks)
- Modify: `src/index.css` (wikilink styling)

**Context for the agent:**

When a user types `[[` in the TipTap editor, an autocomplete dropdown appears with fuzzy-matched card titles from the current map. Selecting a card inserts `[[Card Title]]` as a styled inline element (rendered as a link-like span).

Backlinks: For each card, scan all other cards' `docContent` for `[[This Card's Title]]` references. Display a "Referenced by" section at the bottom of the editor showing incoming links.

TipTap custom extensions: Create a `Mention`-like extension that triggers on `[[` instead of `@`. TipTap's `@tiptap/extension-mention` could be adapted, or build a custom `InputRule` + `Suggestion` extension.

The simplest approach: Use `@tiptap/suggestion` (comes with StarterKit dependencies) to build a `[[` triggered suggestion.

Install: `npm install @tiptap/suggestion`

**Steps:**

- [ ] **Step 1: Install `@tiptap/suggestion`**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm install @tiptap/suggestion`

- [ ] **Step 2: Create `src/lib/tiptap-wikilink.ts`**

A TipTap `Node` extension that:
- Renders as an inline span with wikilink styling
- Stores the referenced card title as an attribute
- Is triggered by `[[` via the Suggestion plugin

```ts
import { Node, mergeAttributes } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

export const Wikilink = Node.create({
  name: "wikilink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      title: { default: null },
      cardId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wikilink]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, {
      "data-wikilink": "",
      class: "wikilink",
    }), `[[${HTMLAttributes.title}]]`];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "[[",
        // ... suggestion config
      }),
    ];
  },
});
```

- [ ] **Step 3: Create `src/components/WikilinkSuggestion.tsx`**

Autocomplete dropdown that appears when `[[` is typed. Reads card titles from `useCanvasStore`.

- [ ] **Step 4: Add wikilink extension to `EditorBubble.tsx`**

Add the `Wikilink` extension to the `EDITOR_EXTENSIONS` array.

- [ ] **Step 5: Add backlinks section to `EditorBubble.tsx`**

Below the editor content area, add a collapsible "Referenced by" section:
```tsx
const backlinks = useMemo(() => {
  return cards.filter((c) =>
    c.id !== cardId && c.docContent.includes(`[[${card?.title}]]`)
  );
}, [cards, cardId, card?.title]);
```

- [ ] **Step 6: Add wikilink CSS to `src/index.css`**

```css
.tiptap .wikilink {
  color: #6B9BFF;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.9em;
}
.tiptap .wikilink:hover {
  text-decoration: underline;
}
```

- [ ] **Step 7: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`

- [ ] **Step 8: Commit**

```bash
git add src/lib/tiptap-wikilink.ts src/components/WikilinkSuggestion.tsx src/components/EditorBubble.tsx src/index.css package.json package-lock.json
git commit -m "feat: [[ wikilink autocomplete and backlinks in editor"
```

---

### Task 9: Settings Panel

**Depends on:** Wave 1 complete
**Parallel-safe with:** Tasks 5, 6, 7, 8

This task creates a full settings panel accessible from the toolbar.

**Files:**
- Create: `src/components/SettingsPanel.tsx`
- Modify: `src/components/Toolbar.tsx` (add Settings button)

**Context for the agent:**

The settings panel is a modal dialog (using the existing `Dialog` component from `src/components/ui/dialog.tsx`). It has sections organized as a sidebar nav within the dialog.

Sections from the design plan:
- **Appearance:** Theme toggle (dark/light), grid visibility, minimap toggle, snap-to-grid
- **Editor:** Default font size, formatting defaults
- **Shortcuts:** View keybindings (read-only for v1)
- **Export:** context.md format options, goal presets
- **Agent:** API key config (placeholder)
- **Tags:** Manage tags, per-tag export toggles, tag colors (placeholder)
- **Governor:** Rule configuration, severity thresholds (placeholder)
- **History:** Snapshot frequency, auto-save interval (placeholder)

For v1, implement Appearance and Shortcuts sections fully. Others can be placeholder sections.

The Appearance section reads from stores:
- Theme: `useProjectStore.theme` / `setTheme` (or `use-theme.ts` hook)
- Grid: `useCanvasStore.showGrid` / `toggleShowGrid`
- Minimap: `useCanvasStore.showMinimap` / `toggleMinimap`
- Snap: `useCanvasStore.snapToGrid` / `toggleSnapToGrid`

**Steps:**

- [ ] **Step 1: Create `src/components/SettingsPanel.tsx`**

Use the `Dialog` component from `src/components/ui/dialog.tsx`. Left sidebar with section names, right content area.

- [ ] **Step 2: Add Settings button to `src/components/Toolbar.tsx`**

Add a gear icon button next to the existing action buttons. Use `Settings` icon from `lucide-react`.

- [ ] **Step 3: Implement Appearance section**

Toggle switches for theme, grid, minimap, snap-to-grid. Use simple styled checkboxes or toggle buttons matching the flo aesthetic.

- [ ] **Step 4: Implement Shortcuts section**

Read-only list of keyboard shortcuts. Render from a static array of `{ keys: string, description: string }` objects.

- [ ] **Step 5: Add placeholder sections for remaining settings**

Each section shows a "Coming soon" message with the section description from the design plan.

- [ ] **Step 6: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/components/SettingsPanel.tsx src/components/Toolbar.tsx
git commit -m "feat: settings panel with appearance, shortcuts, and placeholder sections"
```

---

### Task 10: Wave 2 Integration

**Depends on:** Tasks 5, 6, 7, 8, 9 (all of Wave 2)
**Parallel-safe with:** Nothing — sequential integration step

This task wires all Wave 2 components into the shared files and adds deferred field changes.

**Files:**
- Modify: `src/lib/types.ts` (add `tags`, `agentHint`, `comments` to Card)
- Modify: `src/store/canvas-store.ts` (add `tags: []` to addCard, add `focusCardId`/`setFocusCard`)
- Modify: `src/App.tsx` (wire HomeDashboard, OutlineSidebar, CommandPalette, Settings button)
- Modify: `src/components/Canvas.tsx` (add focusCardId effect)
- Modify: `src/components/Toolbar.tsx` (add Settings button)
- Modify: `src/lib/file-ops.ts` (add tags to save/load serialization)
- Modify: `src-tauri/src/types.rs` (add tags to CardData)
- Modify: `src/hooks/use-keyboard-shortcuts.ts` (add Cmd+K for command palette)

**Steps:**

- [ ] **Step 1: Update `src/lib/types.ts`**

Add to Card interface:
```ts
tags: string[];
agentHint?: string;
comments?: Array<{ id: string; text: string; timestamp: number; author?: string }>;
```

- [ ] **Step 2: Update `src/store/canvas-store.ts`**

- Add `tags: []` to the card creation in `addCard`
- Add `focusCardId: string | null` and `setFocusCard: (id: string | null) => void`
- Do NOT modify the `partialize` config — `focusCardId` is transient state

- [ ] **Step 3: Update `src/App.tsx`**

- Import and render `HomeDashboard` in the Home tab (replacing placeholder)
- Wrap Layers tab content with `<OutlineSidebar />` in a flex layout
- Import and render `CommandPalette` (controlled by state, toggled by Cmd+K)
- Import `SettingsPanel` and add open/close state

- [ ] **Step 4: Update `src/components/Canvas.tsx`**

Add focusCardId effect:
```ts
const focusCardId = useCanvasStore((s) => s.focusCardId);
const { fitView } = useReactFlow();

useEffect(() => {
  if (focusCardId) {
    fitView({ nodes: [{ id: focusCardId }], duration: 300, padding: 0.5 });
    useCanvasStore.getState().setFocusCard(null);
  }
}, [focusCardId, fitView]);
```

- [ ] **Step 5: Update `src/lib/file-ops.ts`**

Add `tags: card.tags ?? []` to the card serialization in `saveProject()`.
Add `tags: (c.tags ?? []) as string[]` to the card deserialization in `loadProject()`.

- [ ] **Step 6: Update `src-tauri/src/types.rs`**

Add `pub tags: Option<Vec<String>>` to `CardData`.

- [ ] **Step 7: Update `src/hooks/use-keyboard-shortcuts.ts`**

Add Cmd+K handler that toggles CommandPalette visibility (emit a custom event or use a store field).

- [ ] **Step 8: Full build verification**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build && cd src-tauri && cargo check`

- [ ] **Step 9: Commit**

```bash
git add src/lib/types.ts src/store/canvas-store.ts src/App.tsx src/components/Canvas.tsx src/lib/file-ops.ts src-tauri/src/types.rs src/hooks/use-keyboard-shortcuts.ts src/components/Toolbar.tsx
git commit -m "feat: Wave 2 integration — wire dashboard, sidebar, tags, palette, settings into app shell"
```

---

## Chunk 3: Wave 3 — History & Agent Layer

### Task 11: History Tab (Snapshots + UI)

**Depends on:** Wave 2 complete (Task 10 integration)
**Parallel-safe with:** Tasks 12, 13, 14

This task implements the History tab with JSON snapshot files, a snapshot list, diff view, and restore functionality.

**Files:**
- Create: `src/store/history-store.ts`
- Create: `src/components/HistoryTab.tsx`
- Create: `src/components/SnapshotDiff.tsx`
- Modify: `src-tauri/src/commands/mod.rs` (add history module)
- Create: `src-tauri/src/commands/history.rs` (snapshot CRUD)
- Modify: `src-tauri/src/lib.rs` (register new commands)
- Modify: `src/App.tsx` (replace History placeholder)
- Modify: `src/lib/file-ops.ts` (auto-snapshot on save)

**Context for the agent:**

Snapshots are JSON files in the `.flo/history/` (or `project.flo/history/`) directory. Each save writes a timestamped snapshot containing the full project state. Format: `YYYY-MM-DDTHH-MM-SS.json`.

Snapshot content:
```json
{
  "timestamp": "2026-03-30T12:00:00Z",
  "cards": [...],
  "edges": [...],
  "viewport": {...},
  "summary": "Added 2 cards, modified 1 edge"
}
```

The summary is auto-generated by diffing against the previous snapshot.

UI: vertical list of snapshots with timestamps and summaries. Click a snapshot to see a diff view (cards added/removed/changed highlighted). "Restore" button reverts to that snapshot state.

**Steps:**

- [ ] **Step 1: Create `src-tauri/src/commands/history.rs`**

Rust commands:
- `save_snapshot(dir_path: String, snapshot: SnapshotData) -> Result<String, String>` — writes to history/ dir
- `list_snapshots(dir_path: String) -> Result<Vec<SnapshotMeta>, String>` — lists history/ files
- `load_snapshot(dir_path: String, filename: String) -> Result<SnapshotData, String>` — reads one snapshot

- [ ] **Step 2: Register commands in `src-tauri/src/lib.rs`**

Add `commands::history::save_snapshot`, `commands::history::list_snapshots`, `commands::history::load_snapshot` to the `generate_handler!` macro.

- [ ] **Step 3: Create `src/store/history-store.ts`**

```ts
interface SnapshotMeta {
  filename: string;
  timestamp: string;
  summary: string;
  cardCount: number;
  edgeCount: number;
}

interface HistoryStore {
  snapshots: SnapshotMeta[];
  activeSnapshotId: string | null;
  scrubMode: boolean;
  loadSnapshots: (dirPath: string) => Promise<void>;
  setActiveSnapshot: (id: string | null) => void;
  toggleScrubMode: () => void;
}
```

- [ ] **Step 4: Create `src/components/HistoryTab.tsx`**

Snapshot list view with:
- Vertical timeline of snapshots
- Each entry shows: timestamp, summary, card/edge count
- Click to select → shows diff in right pane
- "Restore" button

- [ ] **Step 5: Create `src/components/SnapshotDiff.tsx`**

Shows differences between selected snapshot and current state:
- Cards added (green)
- Cards removed (red)
- Cards modified (yellow)
- Edge changes

- [ ] **Step 6: Auto-snapshot on save in `src/lib/file-ops.ts`**

After the main save completes, invoke `save_snapshot` with current state.

- [ ] **Step 7: Replace History placeholder in `src/App.tsx`**

- [ ] **Step 8: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build && cd src-tauri && cargo check`

- [ ] **Step 9: Commit**

```bash
git add src/store/history-store.ts src/components/HistoryTab.tsx src/components/SnapshotDiff.tsx src-tauri/src/commands/history.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs src/App.tsx src/lib/file-ops.ts
git commit -m "feat: History tab with JSON snapshots, diff view, and restore"
```

---

### Task 12: File Watcher + Bidirectional context.md

**Depends on:** Wave 2 complete (Task 10 integration)
**Parallel-safe with:** Tasks 11, 13, 14

This task adds a Tauri file watcher on the project directory and implements bidirectional parsing of `context.md` — agents can write to context.md and flo will parse the changes back into cards/edges.

**PREREQUISITE:** Before bidirectional parsing can work, `generateContextMd()` in `export-context.ts` must include card IDs in its output so the parser can match edited content back to existing cards. This task must first update the context.md format to embed card IDs (e.g., `<!-- id:uuid -->` comments or `[PRJ|abc123] Card Title` format).

**Files:**
- Create: `src-tauri/src/commands/watcher.rs` (file watcher setup)
- Create: `src/lib/context-parser.ts` (parse modified context.md back to cards/edges)
- Modify: `src-tauri/src/lib.rs` (register watcher commands)
- Modify: `src-tauri/Cargo.toml` (add `notify` crate for file watching)
- Modify: `src/App.tsx` (start watcher on project load)

**Context for the agent:**

The file watcher uses the `notify` Rust crate to watch the project directory. When changes are detected:
1. Debounce rapid changes (200ms window)
2. Identify which file changed (cards.json, edges.json, context.md, etc.)
3. Emit a Tauri event to the frontend
4. Frontend processes the change

For `context.md` bidirectional parsing:
- The parser reads the modified context.md
- Uses card IDs or stable identifiers to match content back to existing cards
- New cards (no matching ID) are created
- Modified card content is updated
- The parser uses section delimiters (`## Cards`, card headings with IDs) for deterministic parsing

The merge prompt (§2.4 of design doc) shows when external changes conflict with unsaved in-app edits. For v1, prompt for ALL external changes (simplified conflict resolution).

**Steps:**

- [ ] **Step 1: Add `notify` crate to `src-tauri/Cargo.toml`**

```toml
[dependencies]
notify = "7"
```

- [ ] **Step 2: Create `src-tauri/src/commands/watcher.rs`**

Set up a file watcher using `notify::RecommendedWatcher`. Emit Tauri events (`file-changed`) when files in the project directory are modified.

```rust
use notify::{Watcher, RecursiveMode, Event, EventKind};
use tauri::{AppHandle, Emitter};
use std::sync::Mutex;

static WATCHER: Mutex<Option<notify::RecommendedWatcher>> = Mutex::new(None);

#[tauri::command]
pub fn start_watching(app: AppHandle, dir_path: String) -> Result<(), String> {
    let app_clone = app.clone();
    let mut watcher = notify::recommended_watcher(move |res: Result<Event, _>| {
        if let Ok(event) = res {
            if matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) {
                for path in &event.paths {
                    let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let _ = app_clone.emit("file-changed", filename);
                }
            }
        }
    }).map_err(|e| e.to_string())?;

    watcher.watch(std::path::Path::new(&dir_path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *WATCHER.lock().unwrap() = Some(watcher);
    Ok(())
}

#[tauri::command]
pub fn stop_watching() -> Result<(), String> {
    *WATCHER.lock().unwrap() = None;
    Ok(())
}
```

- [ ] **Step 3: Create `src/lib/context-parser.ts`**

Parse a modified `context.md` back into card/edge updates. This is the write path.

The parser:
1. Reads the markdown structure
2. Matches `## Structure` section items to existing cards by title
3. Detects new items (cards that don't match any existing card)
4. Returns a list of changes: `{ added: Card[], modified: { id, updates }[], removed: string[] }`

- [ ] **Step 4: Listen for Tauri events in the frontend**

In `src/App.tsx` or a dedicated hook, listen for `file-changed` events:
```ts
import { listen } from "@tauri-apps/api/event";

useEffect(() => {
  const unlisten = listen<string>("file-changed", (event) => {
    const filename = event.payload;
    if (filename === "context.md") {
      // Read context.md, parse, show merge prompt
    } else if (filename === "cards.json") {
      // Reload cards from disk
    }
  });
  return () => { unlisten.then((f) => f()); };
}, []);
```

- [ ] **Step 5: Create merge prompt dialog**

A dialog that shows when external changes are detected. Options: "Accept External", "Keep Mine", "Review Diff".

- [ ] **Step 6: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build && cd src-tauri && cargo check`

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/commands/watcher.rs src/lib/context-parser.ts src-tauri/Cargo.toml src-tauri/src/lib.rs src/App.tsx
git commit -m "feat: file watcher on project directory, bidirectional context.md parsing"
```

---

### Task 13: Ghost Preview

**Depends on:** Wave 2 complete (Task 10 integration)
**Parallel-safe with:** Tasks 11, 12, 14

This task implements the Ghost Preview overlay (Cmd+Shift+P) — two modes: Read View (renders context.md as markdown overlay) and Cost View (token cost heatmap).

**Files:**
- Create: `src/components/GhostPreview.tsx`
- Modify: `src/hooks/use-keyboard-shortcuts.ts` (Cmd+Shift+P toggle)
- Modify: `src/store/canvas-store.ts` (add ghostPreviewMode state)
- Modify: `src/App.tsx` (render GhostPreview overlay)

**Context for the agent:**

Ghost Preview is an overlay on top of the canvas:

**Read View:** Cards dim to ~20% opacity. A floating panel renders the full `context.md` content as formatted markdown. This shows exactly what an agent would read.

**Cost View:** Each card gets a heatmap overlay based on its token cost contribution. Color intensity (cold blue → hot red) maps to word/token count. Uses the `estimateContextWords` function from `src/lib/governor.ts:209-246`.

Toggle between modes with a sub-control in the Ghost Preview toolbar (a small floating bar at the top of the overlay).

**Steps:**

- [ ] **Step 1: Add ghost preview state to `useCanvasStore`**

```ts
ghostPreviewMode: null | "read" | "cost";
setGhostPreviewMode: (mode: null | "read" | "cost") => void;
```

- [ ] **Step 2: Create `src/components/GhostPreview.tsx`**

Two sub-components:
- `ReadView`: Renders the full context.md output in a scrollable overlay panel
- `CostView`: Renders colored overlays on each card position based on word count

The component receives the current canvas cards/edges and generates the context.md on-the-fly using `generateContextMd()`.

For the cost heatmap, calculate word counts per card using `estimateContextWords()` and normalize to a color scale.

- [ ] **Step 3: Add Cmd+Shift+P shortcut in `use-keyboard-shortcuts.ts`**

```ts
if (meta && e.shiftKey && e.key === "p") {
  e.preventDefault();
  const current = useCanvasStore.getState().ghostPreviewMode;
  useCanvasStore.getState().setGhostPreviewMode(current ? null : "read");
}
```

- [ ] **Step 4: Render GhostPreview in `src/App.tsx`**

Conditionally render the overlay when `ghostPreviewMode` is not null, positioned over the Layers tab content.

- [ ] **Step 5: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/components/GhostPreview.tsx src/store/canvas-store.ts src/hooks/use-keyboard-shortcuts.ts src/App.tsx
git commit -m "feat: Ghost Preview overlay — read view (context.md) and cost view (token heatmap)"
```

---

### Task 14: Goal-Based Context + Card Comments

**Depends on:** Wave 2 complete (Task 10 integration)
**Parallel-safe with:** Tasks 11, 12, 13

This task adds map-level goals and card-level agent hints to shape context.md generation, plus a basic card comment system.

**Files:**
- Modify: `src/lib/types.ts` (add `agentHint` to Card, ensure `goal` on ProjectMeta)
- Modify: `src/lib/export-context.ts` (use goal to shape context, include agent hints)
- Modify: `src/components/EditorBubble.tsx` (add agent hint field, add comments section)
- Create: `src/components/CardComments.tsx` (threaded comments component)
- Modify: `src/store/canvas-store.ts` (add comment actions)

**Context for the agent:**

**Goal-based context:** The project has a configurable `goal` field in `meta.json`. When generating `context.md`, the goal shapes the export:
- Different goals emphasize different card types
- A system prompt is prepended based on the goal
- Example goals: "Write implementation plan", "Review architecture", "Brainstorm features"

The `generateContextMd()` function (`src/lib/export-context.ts`) needs to accept the goal and adjust output accordingly.

**Card-level agent hints:** Each card has an optional `agentHint` string (hidden from the main card UI, visible in a metadata section of the editor). Hints are included in context.md as inline instructions for agents.

**Card comments:** Threaded comment system on individual cards. Comments are excluded from context.md export. Stored as an array on the card object.

**Steps:**

- [ ] **Step 1: Update `src/lib/types.ts`**

Add to `Card` interface:
```ts
agentHint?: string;
comments?: Array<{
  id: string;
  text: string;
  timestamp: number;
  author?: string;
}>;
```

Ensure `ProjectMeta` has `goal?: string` (may already be added by Task 1).

- [ ] **Step 2: Update `generateContextMd()` in `src/lib/export-context.ts`**

- Accept `goal` parameter
- Prepend a goal-based system prompt at the top of context.md
- Include agent hints inline with card entries in the Structure section
- Adjust card emphasis based on goal

```ts
export function generateContextMd(
  projectName: string,
  cards: Card[],
  edges: Edge[],
  goal?: string,
): string {
  // ... existing code ...

  // Add goal-based preamble
  if (goal) {
    lines.push(`> **Goal:** ${goal}`);
    lines.push("");
  }

  // In structure section, include agent hints:
  // ${card.agentHint ? ` *(Agent: ${card.agentHint})*` : ""}
}
```

- [ ] **Step 3: Create `src/components/CardComments.tsx`**

A collapsible section that shows threaded comments for a card. Each comment has text, timestamp, and an optional author name. Add/delete comments.

- [ ] **Step 4: Add comments and agent hint UI to `src/components/EditorBubble.tsx`**

Below the editor content:
1. A collapsible "Agent Hint" section with a small textarea for the hint text
2. A collapsible "Comments" section using `CardComments`

- [ ] **Step 5: Update save/load serialization**

Ensure `agentHint` and `comments` are included in the card serialization.

- [ ] **Step 6: Verify the build compiles**

Run: `cd /Users/connorreap/conductor/workspaces/flo/riga && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/export-context.ts src/components/CardComments.tsx src/components/EditorBubble.tsx src/store/canvas-store.ts
git commit -m "feat: goal-based context shaping, card agent hints, and threaded comments"
```

---

## Integration Notes

### After All Waves Complete

1. **Integration pass:** Run a full build (`npm run build && cd src-tauri && cargo check`) and resolve any cross-task type conflicts
2. **Store import audit:** Grep for any remaining `useCanvasStore` references that should now use `useProjectStore`
3. **Save/load round-trip test:** Create a project, add cards/edges/tags/comments, save, close, reopen — verify all data survives
4. **context.md validation:** Save a project and verify `context.md` includes tags, agent hints, and goal-based preamble
5. **Theme test:** Toggle dark/light mode and verify all components look correct in both
6. **Tab navigation test:** Verify Ctrl+Tab cycles through all tabs, state is preserved when switching

### Merge Strategy

If running tasks in parallel via git worktrees or branches:
- Each task creates a feature branch from the same base commit
- Merge in wave order: all Wave 1 tasks first, then Wave 2, then Wave 3
- Within a wave, merge in task number order to make conflict resolution predictable
- The most conflict-prone files are `src/App.tsx`, `src/lib/types.ts`, and `src/store/canvas-store.ts`
