# Native UX Parameter Priority

## Goal

Rank the next user-facing native settings additions so `flo` improves real behavior instead of growing more display-only controls.

This assumes the current native-foundation constraint still applies:

- prefer settings that wire cleanly into existing runtime behavior
- avoid adding knobs that need broader persistence architecture before they are trustworthy
- bias toward settings that reduce user surprise in core save/export/governor flows

## Recommended Order

### 1. Snapshot retention policy

Ship first.

Why:

- `maxSnapshots` already exists in the settings panel and store
- retention was display-only, which creates immediate trust debt
- this affects on-disk growth and user confidence in save/history behavior

Scope:

- enforce `maxSnapshots` after each snapshot write
- keep the setting bounded and clearly described in the UI

### 2. Context warning bands

Ship next.

Why:

- the app already exposes context budget thresholds and uses them in health checks
- splitting them into soft-warning vs hard-warning bands is a natural extension of existing logic
- this improves clarity without requiring a brand-new interaction model

Suggested shape:

- `softWarningWords`
- `hardWarningWords`
- optional copy update so `Lean / Standard / Rich / Heavy` becomes advisory, while soft/hard bands drive warning tone

### 3. Reference creation defaults

Ship after warning bands.

Why:

- there is already a `defaultReferenceScope` setting and a reference-scope dialog
- the next useful defaults are tightly adjacent to current behavior
- these settings would reduce repeated clicks in a high-frequency workflow

Suggested shape:

- preferred edge type on drag-connect
- whether to always prompt for reference scope on creation or only when the edge is a reference

### 4. Save/export defaults

Good candidate once settings persistence is stronger.

Why:

- `include brainstorm cards` and `include docs` already exist as runtime toggles
- export filename patterns and `Save As` preferences are useful, but they matter most when preferences survive reloads
- otherwise users will experience them as unreliable

Suggested shape:

- export filename pattern
- include brainstorm cards by default
- include docs by default
- `Save As` behavior preference

### 5. Suggestion heuristics

Useful, but ship after the higher-trust workflow settings.

Why:

- these controls tune heuristics rather than deterministic behavior
- the underlying suggestion quality still needs improvement first
- exposing aggressiveness controls too early risks making weak heuristics look more configurable than they are

Suggested shape:

- minimum source doc length
- keyword extraction aggressiveness
- summary preference: title, lead sentence, section headings

### 6. Helper cadence controls

Defer until the helper system has a stronger event model.

Why:

- cooldown and minimum edit distance need a better notion of user progress than the current card/edge count checks
- dismiss-for-session behavior partly exists already through helper dismissal state
- adding knobs before improving the helper trigger model will create brittle behavior

Suggested shape:

- cooldown duration
- minimum edit delta before re-prompt
- dismiss for session

### 7. Dashboard density and view defaults

Defer.

Why:

- these are valuable polish controls, but lower leverage than save/export/governor/reference settings
- they are mostly presentation preferences, not trust or workflow correctness issues
- they should likely land together with broader dashboard state persistence

Suggested shape:

- default kanban grouping
- collapsed section behavior
- preview truncation lengths

## Decision Rule

Add a new native parameter only when all three are true:

1. There is already a real runtime behavior to control.
2. The chosen default is defensible for first-run users.
3. The setting can be persisted or, at minimum, behave truthfully for the full active session.
