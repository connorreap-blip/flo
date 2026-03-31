# Review Gap Remediation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if available) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the gaps identified in the repo-vs-plan review: preserve full snapshot fidelity, wire the outline sidebar into Layers, record edge activity on the Home dashboard, add per-tag export controls, and align the v2 save format with the extended design contract.

**Architecture:** The repo already has the main shell in place: `useProjectStore`, split persistence via `save_project_v2`, `HistoryTab`, `OutlineSidebar`, and `SettingsPanel`. The remaining work is mostly corrective integration. The main sequencing constraint is persistence overlap: history fidelity and tag export settings both need coordinated changes in frontend save/load code and Rust types/commands, so they should not modify the same files in parallel.

**Tech Stack:** Tauri 2, React 19, TypeScript, Zustand, React Flow, TipTap, Rust serde JSON persistence

**Source inputs:**
- Review target repo: `/Users/connorreap/conductor/workspaces/flo/kabul`
- Implementation checklist: `/Users/connorreap/conductor/workspaces/flo/kabul/docs/superpowers/plans/2026-03-30-extended-design-impl.md`
- Attached design: `/Users/connorreap/conductor/workspaces/flo/kabul/.context/attachments/extended-design-plan-v1.md`

---

## Parallelization Map

Tasks are grouped into waves. All tasks within a wave are safe to run in parallel because they own disjoint files. Finish a wave before starting the next one.

```text
WAVE 1 — 3 parallel agents
├── Task 1: History snapshot fidelity + restore correctness
├── Task 2: Layers tab outline integration
└── Task 3: Dashboard activity feed edge logging

WAVE 2 — 1 agent
└── Task 4: Tag export controls + save format cleanup

WAVE 3 — 1 agent
└── Task 5: Integration verification and regression sweep
```

### File Ownership Rules

To avoid merge conflicts, each task owns a fixed set of files.

- `src/lib/file-ops.ts` is owned only by Task 1 in Wave 1 and Task 4 in Wave 2.
- `src-tauri/src/types.rs` is owned only by Task 1 in Wave 1 and Task 4 in Wave 2.
- `src-tauri/src/commands/save.rs` is owned only by Task 4.
- `src-tauri/src/commands/load.rs` is owned only by Task 4 unless Task 1 absolutely needs a snapshot compatibility helper there.
- `src/App.tsx` is owned only by Task 2.
- `src/store/dashboard-store.ts` is owned only by Task 3.

If a task discovers a required edit in a file owned by a later integration task, leave a clear TODO comment or note it in the task handoff instead of editing the file.

---

## Wave 1

### Task 1: History Snapshot Fidelity + Restore Correctness

**Depends on:** Nothing
**Parallel-safe with:** Tasks 2, 3

The current snapshot flow loses project metadata and strips several card fields on restore. This task makes snapshots faithful to the saved project state and keeps backward compatibility with older snapshot files.

**Files:**
- Modify: `src-tauri/src/types.rs`
- Modify: `src-tauri/src/commands/history.rs`
- Modify: `src/lib/file-ops.ts`
- Modify: `src/store/history-store.ts`
- Modify: `src/components/HistoryTab.tsx`
- Modify: `src/components/SnapshotDiff.tsx`

**Required behavior:**
- Snapshot payload includes `meta` with at least `name`, `goal`, `format_version`, and `created` if available.
- Snapshot cards preserve `width`, `height`, `tags`, `agent_hint`, and `comments`.
- Restoring a snapshot reapplies project metadata through `useProjectStore`.
- Older snapshots without the new fields still load cleanly.
- Diff UI remains functional when older snapshots omit optional fields.

**Steps:**

- [ ] **Step 1: Extend snapshot Rust types**

Update `SnapshotData` in `src-tauri/src/types.rs` to include `meta: ProjectMeta` and keep all existing card fields available through `CardData`.

- [ ] **Step 2: Write richer snapshots**

Update `src/lib/file-ops.ts` so `save_snapshot` receives:
- `meta` from `useProjectStore`
- full `cards` payload matching normal save
- full `edges` payload
- `viewport`
- generated summary

- [ ] **Step 3: Make snapshot loading backward-compatible**

In `src/store/history-store.ts`, expand `SnapshotData` so new fields are present but optional where needed for legacy files. Avoid breaking JSON decode for old snapshot files.

- [ ] **Step 4: Restore full project state**

In `src/components/HistoryTab.tsx`, map all preserved card fields back into the canvas store and restore project metadata into `useProjectStore`.

- [ ] **Step 5: Keep diff rendering stable**

Update `src/components/SnapshotDiff.tsx` only if needed so optional fields from legacy snapshots do not break diff calculation.

- [ ] **Step 6: Verify history flow**

Manual verification:
- Save a project with goal, tags, comments, agent hint, and resized cards.
- Create a second save after edits.
- Restore the first snapshot.
- Confirm name/goal/card fields fully return.

---

### Task 2: Layers Tab Outline Integration

**Depends on:** Nothing
**Parallel-safe with:** Tasks 1, 3

The outline component exists but is not mounted in the live Layers tab. This task integrates it into the Layers shell and wires selection/focus behavior.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Canvas.tsx`
- Modify: `src/components/OutlineSidebar.tsx`

**Required behavior:**
- Layers tab shows the collapsible outline beside the canvas.
- Clicking an outline item focuses the card on the canvas.
- The selected card is reflected in the outline highlight.
- Kanban mode remains accessible within Layers.
- Do not implement drag-to-reorder in this task.

**Steps:**

- [ ] **Step 1: Add selected card state in Layers shell**

In `src/App.tsx`, wrap the Layers tab in a layout that can render the outline and the active canvas/kanban panel together. Keep the tab mounted behavior unchanged.

- [ ] **Step 2: Wire canvas focus and selection**

In `src/components/Canvas.tsx`, expose selection changes to the parent or emit selection events so the outline can track the current card, not just focus it.

- [ ] **Step 3: Connect outline callbacks**

Update `src/components/OutlineSidebar.tsx` props only as needed so clicking a node both selects and focuses the matching card.

- [ ] **Step 4: Verify Layers behavior**

Manual verification:
- Open Layers in canvas mode and confirm outline is visible.
- Click outline items and confirm pan/focus.
- Select cards on canvas and confirm outline highlight updates.
- Switch to kanban and back without losing open/closed outline state.

---

### Task 3: Dashboard Activity Feed Edge Logging

**Depends on:** Nothing
**Parallel-safe with:** Tasks 1, 2

The Home dashboard currently logs card events only. This task adds edge activity so the feed matches the design intent.

**Files:**
- Modify: `src/store/dashboard-store.ts`
- Modify: `src/components/HomeDashboard.tsx` only if display copy or labels need adjustment

**Required behavior:**
- Activity feed includes edge add/remove events.
- Edge changes should not spam duplicates during bulk loads, snapshot restore, or initial hydration.
- Existing card activity behavior remains intact.

**Steps:**

- [ ] **Step 1: Expand activity model**

Add edge-focused activity entries to the dashboard store model. Include useful human-readable context, for example source and target card titles.

- [ ] **Step 2: Detect edge deltas**

Enhance the `useCanvasStore.subscribe` logic in `src/store/dashboard-store.ts` to compare previous and next edge sets and append activity entries for add/remove changes.

- [ ] **Step 3: Guard against noisy bulk updates**

Ensure `loadState`-driven changes do not flood the activity log. Use the existing dirty-state behavior or an explicit heuristic if needed.

- [ ] **Step 4: Verify dashboard feed**

Manual verification:
- Add an edge.
- Remove an edge.
- Save and restore a snapshot.
- Confirm only user-meaningful edge events appear.

---

## Wave 2

### Task 4: Tag Export Controls + Save Format Cleanup

**Depends on:** Task 1 complete
**Parallel-safe with:** None

This task implements the design’s per-tag export visibility and stops writing new sidecar markdown files in the v2 save path. It intentionally runs after Task 1 because both tasks touch save/load contracts.

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/store/project-store.ts`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/lib/export-context.ts`
- Modify: `src/lib/file-ops.ts`
- Modify: `src-tauri/src/types.rs`
- Modify: `src-tauri/src/commands/save.rs`
- Modify: `src-tauri/src/commands/load.rs` only if metadata load needs normalization

**Schema decision:**
- Store tag configuration in `ProjectMeta`, not a separate store file.
- Recommended shape:

```ts
type TagConfig = Record<string, { export: boolean }>;
```

**Required behavior:**
- `ProjectMeta` persists tag export preferences in `meta.json`.
- Settings includes a functional Tags section listing discovered tags.
- Unknown tags default to `export: true`.
- `generateContextMd()` only exports tags enabled for export.
- `save_project_v2` stops writing per-card markdown sidecar files.
- Legacy projects and legacy sidecar folders remain loadable; do not delete old files automatically.

**Steps:**

- [ ] **Step 1: Extend project metadata**

Add tag export configuration to frontend and Rust `ProjectMeta` types. Keep it optional for backward compatibility.

- [ ] **Step 2: Build functional Settings > Tags**

Replace the placeholder Tags section with a real editor that:
- derives the tag list from cards
- shows each tag with an export toggle
- persists changes into `useProjectStore`

- [ ] **Step 3: Respect export preferences**

Update `src/lib/export-context.ts` so tag lines include only exported tags.

- [ ] **Step 4: Persist config on save/load**

Update `src/lib/file-ops.ts` and Rust save/load code so tag config round-trips through `meta.json`.

- [ ] **Step 5: Stop writing new sidecar markdown files**

In `src-tauri/src/commands/save.rs`, remove sidecar markdown writes from `save_project_v2` only. Leave legacy `save_project` untouched.

- [ ] **Step 6: Verify tag/export behavior**

Manual verification:
- Mark one tag private and one exported.
- Save, reload, and export `context.md`.
- Confirm only the exported tag appears.
- Confirm no new `projects/`, `processes/`, `references/`, or `brainstorms/` folders are created by v2 save.

---

## Wave 3

### Task 5: Integration Verification and Regression Sweep

**Depends on:** Tasks 1, 2, 3, 4
**Parallel-safe with:** None

This task is a final integration pass. Prefer fixing small fallout in-place; if a large cross-cutting problem appears, open a follow-up plan instead of broadening scope mid-stream.

**Files:**
- No owned product files by default
- May touch small integration points only if required by completed tasks

**Steps:**

- [ ] **Step 1: Build verification**

Run:

```bash
cd /Users/connorreap/conductor/workspaces/flo/kabul && npm run build
cd /Users/connorreap/conductor/workspaces/flo/kabul/src-tauri && cargo check
```

- [ ] **Step 2: Manual smoke test**

Run `npm run tauri dev` and verify:
- Layers shows outline + canvas integration
- Outline click focuses and highlights cards
- Home dashboard logs card and edge activity
- Settings tag toggles persist across save/load
- `context.md` respects tag export visibility
- Save creates v2 project files without new sidecar markdown files
- History snapshots preserve name, goal, tags, comments, agent hint, and resized card dimensions
- Restoring old and new snapshots does not crash

- [ ] **Step 3: Record residual risks**

If anything remains intentionally deferred, document it in the final handoff. Likely acceptable deferment:
- outline drag-to-reorder
- history scrub timeline
- richer snapshot summaries

---

## Recommended Execution Order

1. Start Task 1, Task 2, and Task 3 in parallel.
2. Merge Task 1 before starting Task 4.
3. Run Task 4 alone because it shares persistence files with Task 1.
4. Finish with Task 5 for full-system verification.

## Acceptance Criteria

- History restore is no longer lossy.
- Layers visibly includes the outline sidebar.
- Dashboard activity reflects edge changes.
- Tag export visibility is user-configurable and persisted.
- The v2 save path matches the design contract more closely by keeping doc content inline and not writing new sidecar markdown files.
