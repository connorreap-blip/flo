# Save, Export, and Export Commit Implementation Plan

## Goal

Implement a clean split between:

- local workspace `Save`
- explicit `Export Bundle`
- git-like `Commit Export`
- optional `Apply Export Commit to Workspace`

without breaking the existing local workspace model.

This plan is aligned to the current system design:

- local workspace format remains folder-backed
- local workspace format remains:

```text
<workspace>.flo/
  meta.json
  cards.json
  edges.json
  viewport.json
  context.md
  assets/
  history/
```

- v2 save should not create new typed sidecar folders such as:
  - `projects/`
  - `processes/`
  - `references/`
  - `brainstorms/`

The export bundle is a separate structure and should not replace the normal workspace hierarchy.

## Design Check

### What matches the system design

These parts are already consistent with the designed system:

- folder-backed workspace save/load
- root-level split JSON files
- root-level `context.md`
- `assets/`
- `history/`
- watcher support for `context.md`

### What must be corrected relative to the current implementation

- v2 save still writes typed per-card markdown sidecars
- first-save UX is still ambiguous because Save uses a save dialog while Open uses a folder picker
- there is no `Save As`
- export is still only a single `context.md`
- there is no export-bundle or commit model

### Important design guardrail

Do not remove `context.md` from the local workspace format in this implementation. That would conflict with:

- `docs/superpowers/plans/2026-03-30-extended-design-impl.md`
- `docs/cloud-option-spec.md`
- current watcher and ghost-preview behavior

## Target End State

### 1. Local workspace save

Normal Save and Save As produce:

```text
<workspace>.flo/
  meta.json
  cards.json
  edges.json
  viewport.json
  context.md
  assets/
  history/
    <timestamp>.json
```

Properties:

- canonical data is loaded from the JSON files
- `context.md` remains generated and saved alongside the workspace
- no new typed doc folders are created by v2 save
- legacy sidecar folders remain tolerated but are no longer generated

### 2. Export bundle

Explicit export produces:

```text
<export-name>.flo-export/
  export.json
  manifest.json
  context.md
  project/
    project.md
    export-options.json
  cards/
    project/
      <card-id>--<slug>.md
    process/
      <card-id>--<slug>.md
    reference/
      <card-id>--<slug>.md
    brainstorm/
      <card-id>--<slug>.md
  graph/
    hierarchy.json
    flows.json
    references.json
  assets/
  .flo-export/
    HEAD
    commits/
      000001-initial/
        commit.json
        manifest.json
```

Properties:

- bundle is human-browsable
- bundle is diffable
- bundle is tracked independently of the workspace
- bundle can later be merged back into the workspace

### 3. Export commit model

Users can:

- reopen an export bundle
- detect dirty exported files
- review changes
- create a named commit
- inspect commit history
- apply a commit back into the workspace

## Non-Goals

- replacing workspace save with git
- changing cloud-mode architecture
- implementing real git integration in v1
- making export bundles directly loadable as normal workspaces

## Architecture Changes

### Client-side

Add an explicit persistence/export layer instead of keeping all logic in `src/lib/file-ops.ts`.

Recommended modules:

- `src/lib/workspace-ops.ts`
  - `saveWorkspace`
  - `saveWorkspaceAs`
  - `loadWorkspace`
  - `loadWorkspaceFromPath`
- `src/lib/export-bundle.ts`
  - `exportBundle`
  - `loadExportBundle`
  - `scanExportBundleChanges`
  - `commitExportBundle`
  - `applyExportCommitToWorkspace`
- `src/lib/export-manifest.ts`
  - manifest generation and hashing
- `src/lib/export-parse.ts`
  - parse bundle files back into semantic changes

Keep `src/lib/file-ops.ts` as a thin compatibility layer initially, then shrink or replace it.

### Backend-side

Add Tauri commands for:

- workspace save/load cleanup
- export bundle write/read
- manifest/hash support if done in Rust
- bundle commit write/read

Recommended command areas:

- `src-tauri/src/commands/save.rs`
- `src-tauri/src/commands/load.rs`
- `src-tauri/src/commands/files.rs`
- new `src-tauri/src/commands/export.rs`

## Data Contract Changes

### Workspace metadata

Update local workspace metadata shape.

Current issue:

- `created` is rewritten on every save

Target:

```json
{
  "workspace_id": "uuid",
  "name": "Workspace Name",
  "created_at": "2026-03-31T12:00:00.000Z",
  "updated_at": "2026-03-31T12:15:00.000Z",
  "format_version": 3,
  "goal": "..."
}
```

Compatibility:

- support older `created`
- write new keys going forward

### Export bundle metadata

Add:

- `export.json`
- `manifest.json`
- `commit.json`

Suggested `export.json`:

```json
{
  "export_id": "uuid",
  "workspace_id": "uuid",
  "base_workspace_revision": "save:2026-03-31T12:15:00.000Z",
  "profile": "ai-handoff-v1",
  "created_at": "2026-03-31T12:16:00.000Z"
}
```

Suggested `manifest.json`:

```json
{
  "version": 1,
  "files": {
    "context.md": "sha256:...",
    "project/project.md": "sha256:...",
    "cards/process/abc--title.md": "sha256:..."
  }
}
```

Suggested `commit.json`:

```json
{
  "commit_id": "000002-followup",
  "parent_commit_id": "000001-initial",
  "message": "Clarify onboarding flow",
  "author": "local-user",
  "created_at": "2026-03-31T12:30:00.000Z",
  "source": "manual",
  "changed_files": [
    "cards/process/abc--title.md",
    "graph/flows.json",
    "context.md"
  ],
  "workspace_merge_status": "not_applied"
}
```

## File-by-File Implementation Plan

### `src/lib/file-ops.ts`

Changes:

- split current responsibilities into workspace save/load and export-only paths
- add `saveWorkspaceAs()`
- preserve existing `exportContext()` temporarily as legacy export
- stop dispatching save watcher ignore entries for files that will no longer be written
- add explicit return payloads with saved path and timestamp

Expected result:

- `Save`
- `Save As`
- `Export Context.md` legacy path
- `Export Bundle...` new path

### `src-tauri/src/commands/save.rs`

Changes:

- remove `write_card_docs()` from `save_project_v2`
- keep writing:
  - `meta.json`
  - `cards.json`
  - `edges.json`
  - `viewport.json`
  - `context.md`
  - `assets/`
  - `history/`
- preserve legacy `save_project` behavior only for backward compatibility if still needed

Expected result:

- v2 save matches the designed workspace hierarchy exactly

### `src-tauri/src/commands/load.rs`

Changes:

- keep current root-level v2 load path
- keep legacy `.flo/canvas.json` fallback
- normalize metadata keys
- ignore export-bundle folders when loading a normal workspace

Expected result:

- existing workspaces still load
- future workspaces load cleanly after metadata upgrades

### `src-tauri/src/types.rs`

Changes:

- extend `ProjectMeta`
- add export bundle structs
- add commit structs
- keep backward-compatible serde defaults

### `src/App.tsx`

Changes:

- keep workspace watcher behavior for:
  - `context.md`
  - `meta.json`
  - `cards.json`
  - `edges.json`
  - `viewport.json`
- do not assume export bundle files belong to the normal workspace
- add a separate export-review surface later for bundle changes

### `src/components/Toolbar.tsx`

Changes:

- add `Save As`
- add visible current workspace path
- add `Export Bundle...`
- keep `Export for AI` only if the single-file export still has product value
- add export bundle actions:
  - `Open Export Bundle...`
  - `Commit Export Changes`
  - `Apply Export Commit`

### `src/hooks/use-keyboard-shortcuts.ts`

Changes:

- add shortcut for `Save As`
- preserve `Cmd+S` for Save
- decide whether `Cmd+E` remains legacy single-file export or becomes bundle export

Recommendation:

- keep `Cmd+E` as legacy `context.md` export for one release
- add a new discoverable command-palette action for `Export Bundle...`

### `src/components/FilesTab.tsx`

Changes:

- keep showing normal workspace files
- distinguish workspace files from export bundles
- optionally surface an `Exports` section later if export bundles are saved under the workspace root

Recommendation:

- do not save export bundles inside the workspace root by default
- let users choose a separate destination

### New frontend modules

Recommended additions:

- `src/components/ExportBundleDialog.tsx`
- `src/components/ExportCommitDialog.tsx`
- `src/components/ExportDiffView.tsx`
- `src/store/export-store.ts`
- `src/lib/export-bundle.ts`
- `src/lib/export-manifest.ts`
- `src/lib/export-parse.ts`

### New backend modules

Recommended additions:

- `src-tauri/src/commands/export.rs`

Commands:

- `export_bundle`
- `load_export_bundle`
- `scan_export_bundle_changes`
- `commit_export_bundle`
- `read_export_commit`
- `list_export_commits`

## Sequenced Implementation Phases

### Phase 1: Save workflow correction

Objective:

- make Save match the designed local workspace hierarchy

Scope:

- add `Save As`
- expose current workspace path
- normalize metadata fields
- stop v2 sidecar generation

Frontend files:

- `src/lib/file-ops.ts`
- `src/components/Toolbar.tsx`
- `src/hooks/use-keyboard-shortcuts.ts`
- `src/store/project-store.ts`

Backend files:

- `src-tauri/src/commands/save.rs`
- `src-tauri/src/commands/load.rs`
- `src-tauri/src/types.rs`

Verification:

- new saves create:
  - `meta.json`
  - `cards.json`
  - `edges.json`
  - `viewport.json`
  - `context.md`
  - `assets/`
  - `history/`
- no new typed sidecar folders are created
- old workspaces still load

### Phase 2: Workspace persistence cleanup

Objective:

- separate workspace operations from export operations

Scope:

- extract workspace save/load logic from `file-ops.ts`
- make return payloads explicit
- improve save success/failure UX

Verification:

- save errors are surfaced
- save success is surfaced with path/timestamp
- `Save`, `Save As`, and `Open` all operate on the same folder abstraction

### Phase 3: Export bundle generation

Objective:

- add a real folder-based export product

Scope:

- add `Export Bundle...`
- write bundle hierarchy
- include per-card markdown and graph files
- generate `context.md`
- write initial manifest and initial commit

Frontend files:

- `src/lib/export-bundle.ts`
- `src/components/Toolbar.tsx`
- `src/components/CommandPalette.tsx`

Backend files:

- new `src-tauri/src/commands/export.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/types.rs`

Verification:

- export bundle directory matches the spec exactly
- initial export creates `000001-initial`
- reopening the bundle reads `HEAD` correctly

### Phase 4: Export dirty-state detection

Objective:

- detect working-tree changes inside an export bundle

Scope:

- hash tracked files against `manifest.json`
- detect added, removed, and modified files
- surface a review UI

Verification:

- editing a tracked file marks the bundle dirty
- changing only whitespace still shows deterministic file change behavior
- deleting a tracked file is reported

### Phase 5: Export commit workflow

Objective:

- let users create history inside the export bundle

Scope:

- review diff
- enter commit message
- write commit folder
- update `HEAD`
- browse commit history

Verification:

- multiple commits chain correctly
- `HEAD` moves to the latest commit
- commit history is readable after restart

### Phase 6: Semantic parse and merge-back

Objective:

- apply export changes back into the canonical workspace

Scope:

- parse per-card markdown into:
  - title
  - summary/body
  - doc content
  - tags
  - agent hints
- parse graph files into:
  - hierarchy edges
  - flow edges
  - reference edges
- compare against current workspace head
- apply via a reviewable diff flow

Verification:

- export edits can update cards and edges correctly
- conflicts are detected when the workspace changed after export
- applying a commit creates a normal workspace save and snapshot

### Phase 7: UX hardening and cleanup

Objective:

- make the new model understandable in the product

Scope:

- rename buttons and labels for clarity
- document difference between Save and Export
- update Files tab language
- add help text in dialogs
- decide whether legacy single-file export stays

Verification:

- users can explain the difference between Save and Export from the UI alone
- the product no longer suggests that generated files are canonical editable source

## Migration and Compatibility Rules

### Local workspace compatibility

- load current v2 workspaces
- load legacy `.flo/canvas.json`
- do not delete old typed sidecar folders automatically
- stop writing new sidecar folders in v2 save

### Export bundle compatibility

- no backward compatibility required initially because the feature is new
- version all bundle metadata from day one

## Testing Plan

### Manual tests

1. Create new unsaved workspace, then Save.
2. Save again to same location.
3. Save As to a new location.
4. Reopen both saved workspaces.
5. Confirm no sidecar folders were newly created.
6. Confirm `context.md` still exists in the workspace root.
7. Export a bundle.
8. Edit bundle card markdown and graph files externally.
9. Reopen bundle, review changes, commit them.
10. Apply committed changes back into the workspace.
11. Verify snapshot creation after merge-back save.

### Automated tests

Recommended coverage:

- Rust save/load unit tests for hierarchy creation
- Rust load compatibility tests for legacy format
- frontend serialization tests for metadata normalization
- export manifest hashing tests
- export commit read/write tests
- parser tests for bundle card markdown and graph files
- merge conflict detection tests

## Risks

### Risk 1: Confusing two folder types

Users may confuse:

- workspace folder
- export bundle folder

Mitigation:

- different suffixes:
  - `.flo`
  - `.flo-export`
- different toolbar verbs:
  - `Save`
  - `Export Bundle`

### Risk 2: Divergent parsers

The bundle parser could drift from the workspace serializer.

Mitigation:

- centralize serialization contracts
- add round-trip fixture tests

### Risk 3: Bundle merge overwrites workspace state

Mitigation:

- compare against `base_workspace_revision`
- require review for conflicts
- never auto-apply conflicting changes

## Acceptance Criteria

- Save and Save As produce the designed local workspace hierarchy.
- New v2 saves do not create typed per-card sidecar folders.
- Export Bundle produces the specified bundle hierarchy.
- An export bundle supports dirty-state detection and named commits.
- A committed export change can be merged back into the workspace through a review flow.
- The implementation preserves current workspace compatibility and does not break `context.md` watcher behavior.

## Recommended Build Order

1. Save As plus workspace hierarchy correction.
2. Remove v2 sidecar generation.
3. Metadata normalization.
4. Workspace/export code split.
5. Export bundle generation.
6. Export dirty detection.
7. Export commits.
8. Merge-back.
9. UX cleanup and documentation.
