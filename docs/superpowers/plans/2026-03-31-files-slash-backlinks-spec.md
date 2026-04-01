# Files, Slash Reference, and Backlinks Spec

## Goal

Turn three feedback items into one coherent change set:

1. Imported files can be added to cards.
2. Doc slash commands are reference-first, not app-command-first.
3. `Referenced by` works reliably for reference docs.

This spec is grounded in the current codebase as of March 31, 2026.

## Feedback Items

1. Need to be able to add imported files to cards in Files UI and slash command reference.
2. `/command` should not include actions or settings.
3. Check `Referenced by` is working for reference docs.

## Current-State Findings

### 1. Files UI is a browser, not a card-association surface

Current implementation:

- [`src/components/FilesTab.tsx`](/Users/connorreap/conductor/workspaces/flo/lahore/src/components/FilesTab.tsx) supports:
  - file import into `assets/`
  - file search
  - preview
  - reveal in Finder
  - open in default app
- [`src/store/asset-store.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/store/asset-store.ts) only tracks file listing and preview state.
- [`src/lib/types.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/types.ts) has no card-level file attachment model.

Result:

- Imported files exist in the workspace, but cannot be attached or referenced from a specific card in structured state.

### 2. Doc slash menu mixes reference insertion with imperative workspace commands

Current implementation:

- [`src/components/EditorBubble.tsx`](/Users/connorreap/conductor/workspaces/flo/lahore/src/components/EditorBubble.tsx) opens `/` inside the document editor.
- [`src/lib/workspace-search.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/workspace-search.ts) builds one list containing:
  - cards
  - docs
  - actions like save/open/export
  - settings like grid/minimap/snap
- [`src/components/SlashCommandMenu.tsx`](/Users/connorreap/conductor/workspaces/flo/lahore/src/components/SlashCommandMenu.tsx) renders all of those categories together.

Result:

- `/` behaves like a mixed workspace command palette, not a doc-local reference/insertion tool.
- The user feedback is correct: actions and settings do not belong in this menu.

### 3. `Referenced by` is title-based and not durable

Current implementation:

- [`src/components/EditorBubble.tsx`](/Users/connorreap/conductor/workspaces/flo/lahore/src/components/EditorBubble.tsx) computes backlinks by searching `candidate.docContent.includes("[[Title]]")`.
- Wikilinks are created in [`src/lib/tiptap-wikilink.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/tiptap-wikilink.ts) with both `title` and `cardId` attrs in-editor.
- On save/load, [`src/lib/markdown.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/markdown.ts) serializes wikilinks as plain `[[Title]]`, which drops stable card identity.
- Click navigation in [`src/components/EditorBubble.tsx`](/Users/connorreap/conductor/workspaces/flo/lahore/src/components/EditorBubble.tsx) resolves links by title, not by `cardId`.

Result:

- Renaming a referenced card can break forward navigation and backlinks.
- Reloading a workspace loses link identity.
- `Referenced by` can look correct only while titles remain unchanged.
- This is especially risky for reference docs because they are likely to be cited broadly and renamed during editing.

## Product Decisions

### 1. Imported files become card attachments, not free-floating editor text imports

V1 scope:

- Only imported files under `assets/` are attachable from the Files UI.
- Attaching a file to a card creates structured card metadata.
- Attaching a file does not duplicate the file.
- Removing an attachment from a card does not delete the underlying file from `assets/`.

Reasoning:

- Imported files are managed by flo and have stable relative paths.
- Arbitrary workspace files can be supported later, but they are less stable and need different lifecycle rules.

### 2. `/` inside docs is a reference and insertion surface only

Allowed categories:

- `card`
- `doc`
- `file`

Disallowed categories:

- `action`
- `setting`

Command palette ownership:

- `Cmd+K` remains the global workspace command/search surface for save, open, export, settings, and toggles.
- `/` becomes doc-local and content-oriented.

### 3. Backlinks and doc references must resolve by stable card id

Definition:

- `Referenced by` should be based on parsed wikilink targets, not raw title text search.
- Display text may use a title.
- Identity must use card id whenever the reference originated inside flo.

Fallback:

- Legacy title-only references should still work as a best-effort fallback until migrated.

## Proposed UX

## A. Add Imported File to Card

### Files tab flow

When the selected file is in `assets/`, show:

- `Add to Card`
- `Open in Default App`
- `Show in Folder`

`Add to Card` opens a lightweight picker:

- searchable list of cards
- optional quick filter: `Recent`, `Open`, `Reference docs`
- multi-select not required in v1

On confirm:

- attach file to chosen card
- show success toast with card title
- optionally offer `Open Card`

### Card editor surface

Each card editor gets an `Attachments` section showing:

- filename
- file type or extension
- size
- open action
- reveal action
- remove-from-card action

Reference cards and process/project cards use the same attachment UI.

### Slash insertion flow

Typing `/` in a doc can return imported files.

Selecting a file:

- inserts a file reference token into the doc
- ensures the file is attached to the current card

Suggested display:

- inline chip or compact block labeled with filename

V1 requirement:

- clicking the inserted file reference opens the file or focuses it in the attachments section

## B. Slash Command Scope

### New behavior

The doc slash menu is for content insertion and referencing only.

Suggested item set:

- cards: insert wikilink to card
- docs: insert wikilink and optionally open doc preview metadata in result row
- files: insert file reference and attach if needed
- formatting blocks only if the team explicitly still wants them in slash

Recommended choice:

- remove actions/settings immediately
- keep formatting in the top toolbar only

This keeps `/` consistent: every result inserts or references something in the current doc.

### Result row labeling

Use explicit categories:

- `CARD`
- `DOC`
- `FILE`

Do not show:

- `ACTION`
- `SETTING`

## C. `Referenced by` for Reference Docs

### Desired behavior

For any card with a doc, including `reference` cards:

- `Referenced by` lists every other card whose doc contains a wikilink targeting this card
- link counts survive save/load
- link counts survive target-card rename
- clicking a backlink focuses the source card and opens its doc if present

### Empty state

When there are no inbound references:

- show `No incoming references yet.`

This wording is better than `No incoming wikilinks yet.` once file references and id-based parsing exist.

## Data Model Changes

## 1. Card attachments

Extend [`src/lib/types.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/types.ts):

```ts
export interface CardAttachment {
  id: string;
  relativePath: string;
  name: string;
  extension?: string;
  size?: number;
  addedAt: number;
}
```

Add to `Card`:

```ts
attachments?: CardAttachment[];
```

Persist through:

- [`src/lib/file-ops.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/file-ops.ts)
- [`src-tauri/src/types.rs`](/Users/connorreap/conductor/workspaces/flo/lahore/src-tauri/src/types.rs)
- [`src-tauri/src/commands/save.rs`](/Users/connorreap/conductor/workspaces/flo/lahore/src-tauri/src/commands/save.rs)
- [`src-tauri/src/commands/load.rs`](/Users/connorreap/conductor/workspaces/flo/lahore/src-tauri/src/commands/load.rs)

## 2. Stable wikilink serialization

Introduce a durable markdown form for flo-authored card references.

Recommended format:

```md
[[Card Title]]<!-- flo-link:card-id -->
```

Why this shape:

- stays readable in markdown
- preserves title for humans
- preserves card id for round-trip
- minimal disruption to existing markdown export

Load behavior:

- parse comment metadata and restore `cardId`
- if metadata is absent, fall back to title-only reference

Save behavior:

- write metadata for all flo-authored wikilinks with known card ids

This same pattern can be used later for file references if needed.

## 3. File reference node

Add a new TipTap inline atom, separate from `wikilink`, for file references.

Suggested attrs:

```ts
{
  relativePath: string;
  name: string;
}
```

This avoids overloading card wikilinks with file semantics.

## Implementation Outline

## 1. Files to cards

Frontend:

- [`src/components/FilesTab.tsx`](/Users/connorreap/conductor/workspaces/flo/lahore/src/components/FilesTab.tsx)
  - add `Add to Card` CTA for imported files
  - open card picker dialog
- [`src/store/canvas-store.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/store/canvas-store.ts)
  - add `attachFileToCard`
  - add `removeAttachmentFromCard`
- [`src/components/EditorBubble.tsx`](/Users/connorreap/conductor/workspaces/flo/lahore/src/components/EditorBubble.tsx)
  - render attachments section

Backend/persistence:

- [`src/lib/file-ops.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/file-ops.ts)
- [`src-tauri/src/types.rs`](/Users/connorreap/conductor/workspaces/flo/lahore/src-tauri/src/types.rs)

## 2. Slash command cleanup

Refactor [`src/lib/workspace-search.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/workspace-search.ts) into:

- one builder for global command palette items
- one builder for doc slash reference items

Doc slash builder returns only:

- card items
- doc items
- file items

Global command palette keeps:

- save/open/export
- settings/toggles
- any future workspace actions

## 3. Backlinks hardening

Update:

- [`src/lib/tiptap-wikilink.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/tiptap-wikilink.ts)
- [`src/lib/markdown.ts`](/Users/connorreap/conductor/workspaces/flo/lahore/src/lib/markdown.ts)
- [`src/components/EditorBubble.tsx`](/Users/connorreap/conductor/workspaces/flo/lahore/src/components/EditorBubble.tsx)

Required changes:

- resolve clicks by `cardId` first, then title fallback
- compute backlinks by parsing stored link metadata, not `includes("[[Title]]")`
- preserve `cardId` across save/load
- keep legacy title-only references functional

## Migration and Compatibility

No explicit one-time migration is required for v1.

Rules:

- existing title-only wikilinks still load
- newly inserted wikilinks save with id metadata
- old docs gradually become more reliable as users touch and resave them

Optional follow-up:

- add a one-click `Normalize references` maintenance action later if the team wants full-link hydration across old workspaces

## Acceptance Criteria

### Files

- Imported file in `assets/` can be attached to a card from the Files tab.
- Attached file is visible in that card’s editor.
- Attached file survives save/load.
- Removing attachment from a card does not remove the file from `assets/`.

### Slash

- `/` no longer shows save/open/export/settings/toggles.
- `/` can return cards, docs, and imported files.
- Selecting a file from `/` inserts a file reference and attaches it to the current card.

### Backlinks

- `Referenced by` works for `reference` cards the same way it works for other doc cards.
- Renaming a referenced card does not break existing flo-authored doc references.
- Save/load does not break flo-authored backlinks.
- Legacy title-only references still appear when title matching is still possible.

## Risks

1. Attachment UI without a clear reference rendering model could create two parallel concepts: attached file versus referenced file. The implementation should make selecting a file from `/` attach it automatically to avoid divergence.
2. If stable card-id metadata is added only in memory and not in markdown serialization, the backlink problem will remain unsolved after reload.
3. If slash and global command search keep sharing one mixed item builder, actions/settings will regress back into `/`.

## Recommended Sequence

1. Split slash-item providers from global command providers.
2. Add stable wikilink serialization and id-based backlink parsing.
3. Add card attachment model and Files-tab attachment flow.
4. Add file-reference insertion to doc slash.

This order reduces churn because the slash-menu cleanup and backlink fix are both prerequisites for a clean file-reference experience.
