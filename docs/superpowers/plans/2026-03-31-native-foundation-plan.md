# Native Foundation Plan

## Goal

Ship the strongest possible version of flo's governor, hints, suggestions, and save workflow without relying on any AI provider.

This plan assumes:

- no hosted model integration
- no local model integration
- no assistant/chat surface

It focuses on making current product promises true through deterministic logic, stronger heuristics, and complete UX wiring.

## Scope

### In scope

- governor rule execution and settings wiring
- reference-scope creation and editing flow
- native goal and summary suggestion improvements
- export settings wiring and preview accuracy
- save, save as, snapshot toggle, and retention behavior
- dashboard drill-in and warning action consistency

### Out of scope

- semantic generation
- model-backed summarization
- chat or copilot features
- API-key management
- provider abstraction implementation

## Current Gaps

1. Governor settings are UI-only and do not affect `runGovernor()`.
2. Reference-scope UI exists but is not reachable from the active canvas flow.
3. Suggestion flows exist, but they are thin heuristics and do not cover the expected UX consistently.
4. Several export, editor, and history settings are stored but not consumed.
5. Save and snapshot behavior does not honor the settings model.

## Phase 1: Governor Truthfulness

Objective: make governor controls and warnings match actual behavior.

Primary files:

- `src/lib/governor.ts`
- `src/components/SettingsPanel.tsx`
- `src/components/HealthCheckDialog.tsx`
- `src/components/HomeDashboard.tsx`
- `src/store/canvas-store.ts`

Work:

- Pass governor config into `runGovernor()` instead of hardcoding all rules on.
- Normalize rule identifiers so settings and engine use the same vocabulary.
- Either implement or remove misleading settings rows such as `missing-doc`.
- Add support for more fix actions where the UI already implies actionability.
- Keep warning severity, message text, and settings descriptions aligned.

Exit criteria:

- turning a governor rule off actually suppresses that rule
- settings only expose rules the engine can execute
- dashboard and health-check counts match the configured governor output

## Phase 2: Reference Scope Completion

Objective: make reference scoping a real user-facing workflow.

Primary files:

- `src/components/Canvas.tsx`
- `src/components/CardEdge.tsx`
- `src/components/ReferenceScopeDialog.tsx`
- `src/lib/export-context.ts`

Work:

- route reference-edge creation through `ReferenceScopeDialog`
- make `pendingRef` reachable from the active connection flow
- allow editing scope after edge creation, not only at creation time
- preserve scope and section-hint state when edge type changes
- ensure exported reference text reflects the selected scope accurately

Exit criteria:

- users can choose `title`, `summary`, `section`, or `full` when creating a reference
- users can inspect and change scope later
- health-check warnings around unscoped references are still valid and fixable

## Phase 3: Native Suggestion Quality

Objective: ship useful non-AI suggestions that are clearly heuristic and reviewable.

Primary files:

- `src/lib/suggestions.ts`
- `src/components/CardNode.tsx`
- `src/components/HomeDashboard.tsx`
- `src/components/EditorBubble.tsx`

Work:

- improve card summary suggestion beyond "first sentence":
  - prefer headings or first complete paragraph
  - strip boilerplate and repeated titles
  - score candidate sentences by length and information density
- improve project goal suggestion using:
  - dominant card types
  - edge composition
  - top linked cards
  - tag and title frequency
- keep suggestions non-destructive with explicit preview, apply, and dismiss actions
- label these flows as suggestions, not AI generation

Exit criteria:

- summary and goal suggestions feel materially better than template-only output
- suggestions never overwrite user content without confirmation
- empty or low-signal workspaces fall back to simple templates instead of nonsense

## Phase 4: Settings-to-Behavior Wiring

Objective: make stored settings affect runtime behavior.

Primary files:

- `src/store/canvas-store.ts`
- `src/lib/file-ops.ts`
- `src/lib/export-context.ts`
- `src/components/GhostPreview.tsx`
- `src/components/EditorBubble.tsx`

Work:

- wire `exportIncludeAgentHints` into export generation
- wire `exportGoalOverride` into goal-profile selection
- apply `defaultAgentHint` when creating new cards
- either wire `spellCheck`, `showWordCount`, and `autoSave` into the editor or remove them from settings until ready
- align ghost preview and health-check estimates with actual export settings

Exit criteria:

- every visible setting in this area changes real behavior
- preview surfaces reflect the actual export payload closely enough to trust
- no settings row remains as dead state

## Phase 5: Save and History Reliability

Objective: make persistence behavior match the visible product model.

Primary files:

- `src/lib/file-ops.ts`
- `src-tauri/src/commands/history.rs`
- `src/components/Toolbar.tsx`
- `src/components/SettingsPanel.tsx`

Work:

- add `Save As`
- add explicit save success and failure feedback
- honor `autoSnapshot`
- enforce `maxSnapshots` retention in the history backend or save workflow
- keep save, export, and history summaries deterministic when no AI layer exists

Exit criteria:

- users can tell whether save succeeded and where data went
- snapshot creation respects settings
- snapshot retention does not grow unbounded

## Suggested Execution Order

1. Phase 1: governor truthfulness
2. Phase 2: reference scope completion
3. Phase 4: settings-to-behavior wiring
4. Phase 5: save and history reliability
5. Phase 3: native suggestion quality

Rationale:

- governor and scope issues are core trust problems
- settings wiring should land before more settings are added
- save/history reliability affects every workflow
- suggestion quality can improve after the product state is truthful

## Verification Checklist

- Do settings panels describe behavior that actually exists?
- Can a user create and later edit a properly scoped reference?
- Do dashboard, health check, and export preview agree on what the app will export?
- Do save and snapshot controls behave according to their toggles?
- Are native suggestions obviously helpful without pretending to be AI?

## Follow-on AI Work

Once the native foundation is complete, AI work can attach to the same surfaces:

- replace native goal suggestion internals with provider-backed synthesis
- replace native summary extraction with provider-backed summarization
- add change-summary generation for saves and exports
- keep the preview/apply UX unchanged so only the backend of suggestion generation changes
