# UAT 2 Holistic Remediation Plan

## Goal

Review the UAT 2 feedback against the current codebase, identify where the app already has structure versus where it still has placeholders or mismatched behavior, and sequence the work so foundational changes land before feature work.

## Current-State Summary

The UAT document is mostly accurate. Several items are not isolated bugs; they point to a few shared architectural gaps:

1. The shell does not have a consistent overflow and scroll strategy.
2. The app has parallel discovery surfaces that are not unified:
   - global search via command palette
   - doc slash menu for formatting
   - governor warnings on the dashboard
   - no workspace file tree
3. Persistence exists, but the UX around persistence is incomplete:
   - save has no explicit success or failure feedback
   - there is no Save As flow
   - there is no visible project file browser
4. Wave 2 placeholders are still present in production-facing surfaces.

## UAT-to-Code Mapping

| UAT area | Current code state | Primary files | Notes |
| --- | --- | --- | --- |
| Home scrolling / overflow | Likely real shell constraint | `src/App.tsx`, `src/components/HomeDashboard.tsx` | Root shell is `overflow-hidden`, while inner panels selectively scroll. Any panel taller than the viewport can get clipped. |
| Home governor / warning tiles should open detail | Gap is real | `src/components/HomeDashboard.tsx`, `src/components/HealthCheckDialog.tsx` | Dashboard renders warning counts and warning snippets, but they are not interactive. |
| Project goal magic wand | Missing feature | `src/components/HomeDashboard.tsx`, `src/lib/export-context.ts` | Goal exists as editable text only. No suggestion or generation flow exists. |
| New connected card should default by relation | Gap is real | `src/components/CardNode.tsx`, `src/components/NewCardDialog.tsx` | Edge type is passed in, but the dialog still defaults card type to `process`. |
| New map should default to anchor project card name | Probably missing / depends on project-card creation flow | `src/components/HomeScreen.tsx`, `src/store/canvas-store.ts` | New map only sets project metadata; there is no guaranteed anchor project card creation path shown in current shell. |
| Slash command off-screen | Likely real positioning bug | `src/components/EditorBubble.tsx`, `src/components/SlashCommandMenu.tsx` | Menu uses raw cursor coordinates with no viewport clamping. |
| Card summary magic wand from doc | Missing feature | `src/components/CardNode.tsx`, `src/components/EditorBubble.tsx` | Cards support body summary plus document content, but there is no summary synthesis path. |
| Slash command should search cards/docs/skills instead of formatting | Foundational product shift | `src/components/EditorBubble.tsx`, `src/components/SlashCommandMenu.tsx`, `src/components/CommandPalette.tsx` | Current slash menu is formatting-only; global search already exists separately. |
| Move quote/code/divider to top doc menu | Gap is real if slash behavior changes | `src/components/EditorBubble.tsx` | These controls are not in the top toolbar today. |
| Assets says coming soon | Placeholder still present | `src/App.tsx`, `src/store/asset-store.ts` | Assets tab is a stub and the asset store only contains an empty string array. |
| Settings too thin / no scroll | Real layout issue | `src/components/SettingsPanel.tsx`, `src/components/ui/dialog.tsx` | Settings uses fixed width plus `overflow-hidden`; dense sections will clip instead of scroll. |
| Editor / Export / Agents / Tags / Governor / History blocked as Wave 2 | Placeholder still present | `src/components/SettingsPanel.tsx` | Those sections are explicitly marked “Coming soon”. |
| Save button does not seem to work | Needs runtime validation; code path exists | `src/components/Toolbar.tsx`, `src/lib/file-ops.ts`, `src-tauri/src/commands/save.rs` | Save handler exists end to end, but there is no visible success state, no surfaced errors, and first-save path semantics need verification. |
| Need Save As | Missing feature | `src/lib/file-ops.ts` | Only `saveProject()` and `loadProject()` exist. |
| Need file tree in left menu and open doc on canvas | Foundational missing surface | `src/App.tsx`, `src-tauri/src/lib.rs`, `src-tauri/src/commands/*` | No workspace file listing or file-open command exists today. |

## Foundational Shifts

These should not be implemented as isolated tickets because each one changes multiple UAT items at once.

### 1. Unify discovery and drill-in behavior

The product currently has:

- a dashboard with passive metrics
- a health check dialog with detailed warnings
- a global command palette
- a doc-local slash menu

The UAT feedback is pushing toward a single mental model: “search and inspect from anywhere.” The implementation should decide on one shared pattern instead of adding more separate overlays.

Recommended direction:

- Keep `Cmd+K` as the global workspace command/search entry point.
- Repurpose doc slash as scoped insertion/search for cards, docs, skills, and entities.
- Route dashboard governor and warning stats into a reusable detail surface instead of dead tiles.
- Add the workspace file tree as another searchable source, not a disconnected feature.

If this is not unified first, the app will accumulate three different search systems and two different “more info” patterns.

### 2. Normalize shell scrolling and floating-surface positioning

The same underlying layout problem shows up in multiple UAT items:

- Home content can clip.
- Settings content can clip.
- Slash command menus can render off-screen.

Recommended direction:

- Introduce a shell-level rule for what owns scrolling on each tab.
- Make dialogs and side panels internally scrollable rather than globally clipped.
- Add a shared floating-position clamp utility for slash menus, popovers, and future file menus.

This should land before more feature UI is added.

### 3. Treat persistence as a full workflow, not a single button

Save exists technically, but the user experience around it is incomplete.

Recommended direction:

- Split persistence into `Save`, `Save As`, `Open`, and visible current project path state.
- Add explicit success, failure, and “where did this save?” feedback.
- Add workspace file browsing on top of the same project directory abstraction.

This is the correct place to solve the UAT concerns around Save, Save As, and file browsing together.

## Implementation Plan

### Phase 0: Review and Reproduction

Objective: validate which UAT items are deterministic bugs, which are missing product work, and which are UX ambiguity.

Work:

- Run the app locally and reproduce each UAT item with a saved project and an unsaved project.
- Validate first-save behavior, repeat-save behavior, reopen behavior, and snapshot creation.
- Confirm whether the save dialog returns a directory-like path that the backend treats correctly across macOS.
- Check editor slash placement near all viewport edges.
- Confirm how “anchor project card” is expected to work in the current map creation flow.

Exit criteria:

- Every UAT item is tagged as `bug`, `missing feature`, `placeholder`, or `product decision`.
- The save issue is narrowed to either runtime failure or missing feedback.

#### Phase 0 Findings

Validation completed in this workspace:

- `npm ci`
- `npm run build`
- `cargo check` in `src-tauri`

Result: both frontend and backend compile cleanly after dependencies are installed. That means the current UAT list is primarily about runtime UX, missing product work, and placeholder surfaces rather than broken compilation.

Classification:

| UAT item | Phase 0 classification | Confidence | Notes |
| --- | --- | --- | --- |
| Home has no scroll / must expand window | `bug` | medium | The root shell is clipped at the app level, so this is structurally plausible. Exact breakpoints still need live-window confirmation. |
| Project goal needs magic wand | `missing feature` | high | No generation or suggestion path exists. |
| Governor / warning tiles should open more detail | `missing feature` | high | Dashboard cards are passive. |
| Branch-created card should default by selected relation | `bug` | high | `edgeType` is passed into `NewCardDialog`, but default card type remains `process`. |
| New map should default to anchor project card name | `product decision` plus `missing feature` | medium | Current new-map flow does not establish a guaranteed root project card contract. |
| Slash menu appears off-screen | `bug` | high | Menu uses raw editor coordinates with no viewport clamping. |
| Card summaries need magic wand from doc content | `missing feature` | high | No synthesis workflow exists. |
| Slash command should search cards/docs/skills instead of formatting | `product decision` / `foundational shift` | high | Current code intentionally uses slash for formatting and `Cmd+K` for global search. |
| Move quote / code block / divider to top doc menu | `dependent feature change` | high | Makes sense only if slash is repurposed. |
| Assets says coming soon | `placeholder` | high | Tab is a stub. |
| Settings screen too thin / no scroll | `bug` | high | The dialog and content pane currently favor clipping over scroll. |
| Editor / Export / Agents / Tags / Governor / History still blocked | `placeholder` | high | Confirmed by code. |
| Save button does not seem to work | `runtime UX issue` or `runtime bug` | low-to-medium | Save wiring exists end to end and both app layers compile. Remaining work is to verify whether the real problem is silent success, silent failure, or first-save path confusion. |
| Need Save As | `missing feature` | high | No separate Save As entry point exists. |
| Need file tree in left rail, opening docs on canvas | `missing feature` | high | No backend command or frontend surface exists for this yet. |

Remaining items that still benefit from a live GUI repro pass:

- exact scroll breakpoints for Home and Settings
- visual confirmation of slash-menu clipping at viewport edges
- first-save UX on macOS, including whether the saved path feels like a file or a project folder to the user
- whether “Save doesn’t work” is truly a failed write or only a missing success/failure affordance

### Phase 1: Shell and Layout Foundation

Objective: fix clipping and overflow before adding more surfaces.

Work:

- Refactor the top-level tab shell in `src/App.tsx` so each tab can own its own scroll container.
- Update settings dialog layout to support:
  - a wider desktop presentation
  - vertical scrolling in the content pane
  - a usable mobile/narrow-window mode
- Add shared viewport clamping for floating menus and apply it to the slash command menu first.

Dependencies:

- None. This is the foundation for the rest of the UI work.

Verification:

- Home, Settings, History, and editor overlays remain usable at smaller window sizes.
- Slash menus and other floating UI stay fully visible inside the viewport.

### Phase 2: Discovery, Detail, and Editor Command Model

Objective: align search and detail behavior across Home, Layers, and docs.

Work:

- Define one reusable detail surface for “more information” from:
  - governor summary
  - warning counts
  - future history and asset items
- Make dashboard warning/governor tiles actionable.
- Rework doc slash behavior from formatting-only to search/insert.
- Move quote, code block, and divider into the persistent editor toolbar or top doc menu.
- Decide whether doc slash should share the same data provider as the global command palette.

Dependencies:

- Phase 1 scroll and floating-surface fixes.

Verification:

- Users can reach the same card/doc/search targets from both the doc editor and the global search surface.
- Dashboard stats open useful drill-in detail instead of remaining static.

### Phase 3: Card-Creation and Content-Generation Workflow

Objective: fix semantic defaults and add assistive generation where the data model already supports it.

Work:

- Add an `edgeType -> default cardType` mapping to `NewCardDialog`:
  - `reference` -> `reference`
  - `flow` -> `process`
  - `hierarchy` -> likely `process`, unless product wants project-on-project branching
- Make the dialog respect the incoming default when opened from an existing card.
- Decide whether new-map creation should immediately create a root project card whose title mirrors the map name.
- Add a non-destructive “magic wand” suggestion flow for:
  - project goal from current map content
  - card summary from card document content

Dependencies:

- Discovery model from Phase 2, because generated suggestions should likely surface in the same command/detail framework instead of as isolated buttons.

Verification:

- Connected-card creation defaults correctly without extra clicks.
- Generated goal/summary content is previewable, user-confirmed, and never silently overwrites manual text.

### Phase 4: Persistence and Workspace Navigation

Objective: complete the project-file workflow end to end.

Work:

- Add `Save As` support in the frontend persistence layer.
- Expose current project path and last save state in the shell.
- Add explicit save success and save failure messaging.
- Add new Tauri commands for:
  - listing workspace files
  - reading supported files from the project directory
  - optionally filtering to saved project subfolders first
- Build a left-side workspace file tree that opens supported docs on the canvas.
- Decide whether canvas-opened docs are:
  - attached to cards only
  - standalone editor bubbles
  - or a shared doc surface that can later be linked to cards

Dependencies:

- This phase should follow the shared discovery model so file tree search and command palette search do not diverge.

Verification:

- Save, Save As, Open, file browsing, and doc opening all work against the same project directory.
- Users can understand where data is stored without leaving the app.

### Phase 5: Wave 2 Placeholder Retirement

Objective: replace “coming soon” surfaces with either functional MVPs or scoped temporary states that do not look incomplete.

Work:

- Replace the Assets placeholder with a real MVP, or remove the tab until it has one.
- Replace blocked settings sections with either:
  - minimal functional controls, or
  - a narrower information architecture that only exposes implemented sections.
- Audit the toolbar, tabs, and home dashboard so no primary navigation item lands on a dead-end placeholder.

Dependencies:

- Phase 4 for file and asset plumbing.

Verification:

- No primary nav item or settings section appears implemented while still being non-functional.

## Recommended Sequencing by UAT Item

Handle in this order:

1. Overflow, scroll, and positioning bugs.
2. Discovery and drill-in unification.
3. Connected-card defaults and new-map root-card behavior.
4. Save workflow hardening plus Save As.
5. Workspace file tree and canvas doc opening.
6. Magic-wand generation flows.
7. Assets and remaining Wave 2 placeholder retirement.

This ordering reduces rework. For example:

- solving slash behavior before discovery unification would likely be thrown away
- adding a file tree before the save workflow is clarified would risk binding to the wrong directory model
- adding more settings sections before dialog scrolling is fixed would create more clipped UI

## Review Checklist

Use this during implementation review and QA.

- Does every primary tab have a clear scroll owner?
- Can every floating menu stay on-screen at small window sizes?
- Do dashboard metrics that imply more detail actually open detail?
- Do doc slash, global search, and future file tree search share a coherent mental model?
- Does branching from a card preserve the user’s intent without requiring manual type correction?
- Can users tell where their project was saved and whether it succeeded?
- Is every item in Settings and top-level navigation functional, or intentionally hidden?

## Risks and Open Decisions

- The “anchor project card” requirement implies a stronger opinion about root-card creation than the current new-map flow shows.
- The file tree feature can become large quickly if it supports arbitrary workspace editing instead of just project-managed files.
- Magic-wand features need a source of generation logic and a clear approval step; they should not write directly into state without preview.
- If dashboard drill-in, command palette, and doc slash are built separately, the UX will fragment again immediately.

## Baseline Verification Notes

- Code inspection confirms several UAT items are true structural gaps, not tester error.
- After installing dependencies, `npm run build` passes.
- `cargo check` for the Tauri backend also passes.
- The remaining uncertainty is concentrated in live-window behavior and save UX, not compilation.
