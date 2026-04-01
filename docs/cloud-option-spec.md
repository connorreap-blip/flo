# Cloud Option Spec for flo

## Purpose

Define what is required to add a cloud-based option to `flo` without removing the current local-first desktop workflow.

Recommended product definition:

- Keep **Local Workspace** mode for users who want direct folder-based storage.
- Add **Cloud Workspace** mode for authenticated users who want hosted storage, multi-device access, and eventual collaboration.
- Preserve export/import compatibility with the current on-disk workspace format.

## Assumptions

- Current product is a Tauri desktop app with React + Zustand on the client and Rust Tauri commands for filesystem operations.
- Current canonical storage is a local workspace folder containing `meta.json`, `cards.json`, `edges.json`, `viewport.json`, `context.md`, `history/*.json`, `assets/*`, and per-card markdown docs under typed folders.
- A "cloud option" means more than syncing files to Dropbox/iCloud. It means flo owns the persistence, identity, sync, versioning, and file services.
- Recommended v1 scope is **single-user cloud workspaces with offline-capable desktop access**.
- Recommended v1.5 scope is **browser access** using the same backend.
- Recommended v2 scope is **real-time multi-user collaboration**.

## Current-State Constraints

The existing app is tightly coupled to local filesystem concepts:

- Workspace identity is a local directory path.
- Open/save flows use native folder pickers.
- Autosave writes full workspace snapshots to disk.
- History is stored as JSON snapshot files under `history/`.
- Assets are copied into `assets/`.
- File browsing recursively walks the workspace folder.
- External changes are detected with a filesystem watcher.
- `context.md` is stored as a generated file.
- Card docs are duplicated: structured JSON state plus exported markdown files.

These assumptions must be abstracted before cloud mode can be added cleanly.

## Product Goals

### Primary goals

- Let users create and open cloud-backed workspaces.
- Make a cloud workspace available across devices after sign-in.
- Preserve the current canvas, card, asset, export, and history experience as much as possible.
- Support offline editing on desktop with deferred sync.
- Provide import/export between local and cloud modes.

### Secondary goals

- Make future browser support straightforward.
- Prepare for workspace sharing and real-time collaboration.
- Enable usage-based billing and hosted operations.

### Non-goals for v1

- Full CRDT-based multiplayer editing.
- End-to-end encryption with zero server visibility.
- Enterprise admin features.
- Arbitrary folder mirroring between a cloud workspace and a live local folder.

## Target User Experience

### Workspace modes

- `Local`: current behavior, folder-backed, no account required.
- `Cloud`: hosted by flo, requires sign-in, identified by `workspace_id`, optionally cached locally.

### Home screen changes

- Add authentication entry points: sign in, sign out, account status.
- Split "Recent Workspaces" into local and cloud sections.
- Add create flow:
  - `New Local Workspace`
  - `New Cloud Workspace`
- Add "Import local workspace to cloud".
- Add "Export cloud workspace to local folder / zip".

### In-workspace changes

- Add sync status indicator: `Saved`, `Syncing`, `Offline`, `Conflict`, `Read-only`.
- Add account/workspace metadata in settings.
- Replace folder-path-centric UI with mode-aware labels:
  - local: show folder path
  - cloud: show owner, region, last sync, storage usage
- Change save semantics:
  - local: same as today
  - cloud: autosave locally and sync remotely; manual save becomes "Sync now" or disappears
- Add offline and reconnect banners.
- Add restore/conflict dialogs for cloud revision mismatches.

### Files and assets

- Keep import/upload UX on desktop.
- For cloud workspaces, upload imported files to managed object storage.
- Preserve preview behavior for text and images.
- Add download/open/reveal equivalents where possible:
  - desktop cloud mode: download temp copy or open cached file
  - web mode: download or preview in browser

### History

- Preserve snapshot browsing and restore.
- Move snapshot persistence from local JSON files to a versioned backend service.
- Show whether a restore creates a new head revision or rewinds current state.

## Core Architectural Changes

## 1. Introduce a persistence abstraction

Create a client-side repository layer so UI/store code stops calling Tauri filesystem commands directly.

Required interfaces:

- `WorkspaceRepository`
  - `createWorkspace`
  - `loadWorkspace`
  - `saveWorkspace`
  - `listRecentWorkspaces`
  - `watchWorkspaceChanges`
  - `exportWorkspace`
- `AssetRepository`
  - `listFiles`
  - `getPreview`
  - `importFiles`
  - `downloadFile`
- `HistoryRepository`
  - `listVersions`
  - `getVersion`
  - `restoreVersion`
- `AuthRepository`
  - `getSession`
  - `signIn`
  - `signOut`
  - `refreshSession`

Implementations:

- `LocalRepository`: wraps current Tauri commands.
- `CloudRepository`: talks to HTTP/WebSocket APIs and local cache.
- Optional `HybridRepository`: cloud workspace + local export cache.

This is the single most important codebase change.

## 2. Stop using `dirPath` as workspace identity

Replace current path-based identity with a richer workspace model:

```ts
type WorkspaceMode = "local" | "cloud";

interface WorkspaceRef {
  id: string;
  mode: WorkspaceMode;
  name: string;
  localPath?: string | null;
  ownerId?: string;
  remoteRevision?: number;
  syncStatus?: "idle" | "dirty" | "syncing" | "offline" | "conflict" | "error";
  goal?: string;
}
```

Required downstream changes:

- project store
- recent workspaces model
- save/load flows
- history store
- asset store
- command palette actions
- toolbar labels
- home screen cards

## 3. Separate canonical data from exported artifacts

Cloud mode should not treat `context.md`, typed markdown doc folders, or local JSON files as canonical storage.

Recommended canonical model:

- workspace metadata
- workspace state document
  - cards
  - edges
  - shared workspace settings
- workspace assets
- workspace versions
- derived exports

Derived/generated only:

- `context.md`
- `.zip` export bundles
- per-card markdown files
- local caches

## 4. Split shared state from per-user state

Some currently persisted values should not remain shared in cloud mode.

Move to **shared workspace state**:

- cards
- edges
- card documents
- tags
- comments
- workspace goal

Move to **per-user workspace state**:

- viewport
- active tab/view
- local editor preferences
- recent workspace ordering
- dismissed helper banners

Recommendation:

- Keep current local behavior unchanged for local workspaces.
- For cloud workspaces, persist viewport in `workspace_user_state` instead of global workspace state.

## Backend Platform Requirements

## 1. Identity and auth

Required:

- user accounts
- verified email flow
- session management
- refresh tokens / session rotation
- device/session revoke
- password reset if using password auth

Recommended auth options:

- magic link
- Google OAuth
- GitHub OAuth

Required client work:

- auth screens
- guarded cloud routes/actions
- session bootstrap on app start
- account menu

## 2. API layer

Need a hosted API for:

- auth
- workspace CRUD
- workspace state sync
- asset upload/download
- version history
- export jobs
- invites/permissions if collaboration is supported
- billing state and plan enforcement

Recommended transport:

- HTTP/JSON for CRUD and downloads
- WebSocket or SSE for remote invalidation, presence, and future live updates

## 3. Database

Recommended primary database: Postgres.

Minimum tables:

- `users`
- `sessions`
- `workspaces`
- `workspace_members`
- `workspace_state_heads`
- `workspace_versions`
- `workspace_user_state`
- `assets`
- `asset_previews`
- `exports`
- `jobs`
- `audit_logs`
- `subscriptions`
- `usage_counters`

Recommended data shape:

- Store current workspace graph as JSONB for fast implementation parity with the current app.
- Also store revision metadata separately for versioning and conflict detection.
- Store denormalized search material if cross-workspace search is added later.

## 4. Object storage

Need managed blob storage for:

- uploaded assets
- generated previews if cached server-side
- export bundles
- historical snapshot blobs if large

Required capabilities:

- signed upload URLs
- signed download URLs
- content-type validation
- storage quotas
- lifecycle rules
- delete propagation

Recommended providers:

- S3
- Cloudflare R2
- GCS

## 5. Background jobs

Need asynchronous workers for:

- PDF/DOCX text extraction
- preview generation
- virus/malware scanning
- export generation
- snapshot compaction / retention
- usage aggregation
- email delivery

## Sync and Offline Model

## Recommended v1 sync model

Use **revisioned workspace documents**, not CRDTs.

Behavior:

- Client keeps a local cache of the last synced workspace snapshot.
- Local edits mark workspace dirty immediately.
- Background sync sends either:
  - full workspace document, or
  - incremental patch payloads against a `base_revision`
- Server accepts write only if `base_revision == current_revision`.
- On success:
  - server stores new version
  - server increments revision
  - client marks clean
- On mismatch:
  - client enters `conflict`
  - client fetches latest head
  - user chooses merge/overwrite/duplicate-copy flow

Why this is the right v1 tradeoff:

- matches current whole-workspace save behavior
- much faster to ship than CRDTs
- good enough for single-user multi-device access
- compatible with later evolution toward finer-grained sync

## Offline requirements

- Cloud workspaces must open from a local cache if previously opened on the device.
- Edits made offline must queue for sync.
- Asset uploads created offline must queue until reconnect.
- User must see last-sync timestamp and pending-change count.
- App must handle revoked sessions while offline.

## Conflict handling

Required v1 conflict UX:

- detect remote head changed before save
- fetch server head and local dirty draft
- show diff summary:
  - cards added/removed/edited
  - edges added/removed/edited
  - card docs changed
- offer actions:
  - apply local over remote
  - accept remote
  - duplicate local as new workspace copy

Not required for v1:

- live character-level collaborative merges

## API Surface

Suggested minimum endpoints:

### Auth

- `POST /v1/auth/magic-link/request`
- `POST /v1/auth/magic-link/verify`
- `POST /v1/auth/oauth/google`
- `POST /v1/auth/logout`
- `POST /v1/auth/refresh`
- `GET /v1/me`

### Workspaces

- `GET /v1/workspaces`
- `POST /v1/workspaces`
- `GET /v1/workspaces/:workspaceId`
- `PATCH /v1/workspaces/:workspaceId`
- `DELETE /v1/workspaces/:workspaceId`
- `POST /v1/workspaces/:workspaceId/archive`
- `POST /v1/workspaces/:workspaceId/duplicate`

### Workspace state

- `GET /v1/workspaces/:workspaceId/state`
- `PUT /v1/workspaces/:workspaceId/state`
- `POST /v1/workspaces/:workspaceId/state/sync`
- `GET /v1/workspaces/:workspaceId/revisions`
- `GET /v1/workspaces/:workspaceId/revisions/:revisionId`
- `POST /v1/workspaces/:workspaceId/revisions/:revisionId/restore`

### Assets

- `GET /v1/workspaces/:workspaceId/assets`
- `POST /v1/workspaces/:workspaceId/assets/upload-init`
- `POST /v1/workspaces/:workspaceId/assets/complete`
- `GET /v1/workspaces/:workspaceId/assets/:assetId`
- `GET /v1/workspaces/:workspaceId/assets/:assetId/preview`
- `DELETE /v1/workspaces/:workspaceId/assets/:assetId`

### Exports

- `POST /v1/workspaces/:workspaceId/exports/context`
- `POST /v1/workspaces/:workspaceId/exports/package`
- `GET /v1/workspaces/:workspaceId/exports/:exportId`

### Membership and sharing

- `GET /v1/workspaces/:workspaceId/members`
- `POST /v1/workspaces/:workspaceId/members/invite`
- `PATCH /v1/workspaces/:workspaceId/members/:memberId`
- `DELETE /v1/workspaces/:workspaceId/members/:memberId`

### Billing and usage

- `GET /v1/billing/subscription`
- `POST /v1/billing/checkout`
- `POST /v1/billing/portal`
- `GET /v1/usage`

## Data Model Changes

## Workspace state document

Recommended head document:

```ts
interface WorkspaceStateHead {
  workspaceId: string;
  revision: number;
  updatedAt: string;
  updatedBy: string;
  graph: {
    cards: Card[];
    edges: Edge[];
  };
  settings: {
    goal?: string;
    exportIncludeBrainstorm: boolean;
    exportIncludeCardDocs: boolean;
    exportIncludeAgentHints: boolean;
    agentHintExportMode: "inline" | "section" | "hidden";
    exportGoalOverride: "auto" | "implementation" | "review" | "brainstorm";
    excludedTags: string[];
    disabledGovernorRules: string[];
  };
}
```

Important model changes:

- `viewport` should move out of shared head.
- `created` should not be rewritten on every save.
- comments should remain nested or move to first-class entities if collaboration expands.
- card docs should remain canonical in structured state, with markdown export derived from it.

## Asset model

Need metadata for:

- asset id
- workspace id
- original filename
- content type
- byte size
- checksum
- uploaded by
- uploaded at
- storage key
- extraction status
- preview status

## Version model

Need:

- immutable revision id
- workspace id
- revision number
- parent revision
- created by
- created at
- summary
- snapshot payload or patch payload

## Client Application Changes

## 1. State management

Update Zustand stores to be provider-agnostic:

- `project-store`
  - replace `dirPath`-only metadata
  - add workspace mode, remote id, sync status, account owner, usage
- `canvas-store`
  - add cloud dirty/sync/conflict state
  - stop assuming a manual save is the only persistence trigger
- `asset-store`
  - use asset ids instead of relative file paths in cloud mode
- `history-store`
  - operate on revision ids instead of filenames in cloud mode

## 2. Persistence flow

Refactor `file-ops` into mode-aware services:

- `local-workspace-service.ts`
- `cloud-workspace-service.ts`
- `workspace-service.ts`

Current responsibilities that must be reworked:

- open folder dialog
- save folder dialog
- Tauri invoke calls
- recent project persistence
- snapshot creation
- `context.md` export

## 3. File watching replacement

Current local mode uses a filesystem watcher for external edits.

Cloud mode needs equivalent remote change handling:

- WebSocket/SSE invalidation
- polling fallback
- remote-change banner
- compare latest remote revision with local cache

## 4. UI additions

Required new UI:

- auth modal / auth routes
- account menu
- cloud workspace picker
- sync status badge
- offline badge
- conflict resolution dialog
- import-to-cloud wizard
- export-from-cloud wizard
- storage/quota panel
- billing panel if monetized
- share dialog if workspace sharing is included

## 5. Browser compatibility work

If web access is part of the cloud option, isolate Tauri-only APIs now.

Required:

- wrap dialog APIs
- wrap filesystem APIs
- wrap opener APIs
- replace Rust extraction dependency with backend extraction for web uploads
- ensure no UI paths depend on native-only capabilities

## Local Cache Requirements

For cloud workspaces on desktop, add a managed cache directory.

Cache contents:

- latest workspace head
- pending local operations or unsynced snapshot
- downloaded asset previews
- temp downloads
- auth/session bootstrap data if safe

Required cache behavior:

- encrypted at rest if platform keychain integration is available
- bounded cache size
- cache clear option
- corrupted cache recovery

## Import / Export Requirements

## Import local workspace to cloud

Required flow:

1. User selects a valid existing local workspace folder.
2. Client loads current local data.
3. Client uploads workspace head, assets, and optional history.
4. Server creates cloud workspace.
5. Client stores new workspace reference.

Edge cases:

- invalid/missing files
- duplicate asset names
- oversized assets
- malformed history snapshots
- unsupported legacy workspace versions

## Export cloud workspace to local

Required outputs:

- full folder export compatible with current local format
- optional `context.md` export only
- optional zip package

Important requirement:

- exported workspace must be re-openable in local mode by the current app

## Version History Requirements

- Every accepted cloud save should create a version entry or patchable audit record.
- Retention policy must be plan-aware.
- Restores should create a new head revision, not mutate historical versions.
- History list should remain fast for large workspaces.
- Diff summaries should be server-generated or client-generated from snapshots.

## Collaboration and Permissions

Minimum schema should be invite-ready even if v1 is single-user.

Roles to plan for:

- owner
- editor
- viewer

Future collaboration requirements:

- per-workspace membership
- invite links or email invites
- presence indicators
- revision attribution by user
- audit trail

If collaboration is explicitly out of v1, still build:

- `workspace_members` table
- role-aware authorization middleware
- ownership transfer path

## Search and Derived Services

Current command palette search is local and in-memory.

For cloud mode:

- workspace-local search can stay client-side after load
- cross-workspace search requires server indexing later
- extracted text from PDFs/DOCX should be stored for future search and agent export features

## Security Requirements

- TLS everywhere
- encrypted object storage
- hashed/rotating refresh tokens
- RBAC on every workspace endpoint
- signed asset URLs with expiry
- rate limiting
- abuse detection
- CSRF protection for web
- secure desktop token storage via keychain/credential manager
- malware scanning on uploads
- audit logging for destructive actions

Security review areas specific to this app:

- imported file handling
- PDF/DOCX extraction
- HTML in card docs
- local cache exposure
- export bundle access control

## Compliance and Legal

Need updates for:

- Terms of Service
- Privacy Policy
- Data Processing Addendum if selling to teams
- cookie consent if web app uses non-essential cookies
- account deletion flow
- data export flow
- data retention and backup policy

Plan for but possibly defer:

- SOC 2
- GDPR/UK GDPR workflows
- regional data residency

## Billing and Commercial Requirements

Cloud mode introduces ongoing infrastructure cost. A pricing model is required.

Need:

- plan definitions
- workspace/storage/version quotas
- billing integration, likely Stripe
- subscription enforcement in API
- billing portal
- failed payment handling
- downgrade behavior

Potential packaging:

- free local-only tier
- free cloud trial with limited storage/history
- paid personal cloud tier
- paid team tier later

## Operations and Reliability

Need production operations for:

- API hosting
- Postgres
- object storage
- worker queue
- email provider
- error tracking
- logging
- metrics
- tracing
- backups
- disaster recovery

Minimum SLOs to define:

- API availability
- sync success rate
- upload success rate
- restore success rate

Required observability metrics:

- daily active cloud users
- workspace create/import/export counts
- sync latency
- sync conflict rate
- asset upload failure rate
- extraction job failure rate
- history restore failure rate
- storage by workspace

## Deployment and Environments

Need at least:

- local dev
- preview/staging
- production

Required environment setup:

- auth secrets
- database URL
- object storage credentials
- email provider keys
- billing keys
- CORS origins
- desktop deep-link callback URLs

## QA and Test Requirements

Need automated coverage for:

- auth lifecycle
- workspace CRUD
- sync success/failure/conflict
- offline edit and reconnect
- asset upload/download/preview
- import local to cloud
- export cloud to local
- history restore
- permission enforcement
- subscription quota enforcement

Need manual QA matrices for:

- macOS desktop
- Windows desktop
- Linux desktop if supported
- browser clients if shipped
- poor network conditions
- large workspaces

## Migration Plan

### Phase 0: prep the codebase

- add repository abstraction
- remove direct persistence logic from UI components
- separate shared vs per-user state
- stop treating exported files as canonical

### Phase 1: single-user cloud on desktop

- auth
- cloud workspace CRUD
- local cache
- revisioned sync
- asset upload/download
- cloud history
- import/export

### Phase 2: browser client

- web auth flows
- browser-safe file handling
- backend extraction path
- hosted landing + app shell integration

### Phase 3: collaboration

- workspace members
- invites
- presence
- finer-grained sync/merge

## Concrete Code Areas Impacted

Frontend:

- `src/lib/file-ops.ts`
- `src/store/project-store.ts`
- `src/store/asset-store.ts`
- `src/store/history-store.ts`
- `src/store/canvas-store.ts`
- `src/App.tsx`
- `src/components/HomeScreen.tsx`
- `src/components/FilesTab.tsx`
- `src/components/HistoryTab.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/CommandPalette.tsx`

Desktop backend:

- `src-tauri/src/commands/save.rs`
- `src-tauri/src/commands/load.rs`
- `src-tauri/src/commands/history.rs`
- `src-tauri/src/commands/files.rs`
- `src-tauri/src/commands/watcher.rs`
- `src-tauri/src/commands/extract.rs`
- `src-tauri/src/lib.rs`

New likely packages/services:

- client auth/session module
- client repository layer
- sync engine
- backend API service
- backend worker service
- shared API/types package

## Open Product Decisions

These must be answered before implementation starts:

1. Is browser access part of the first cloud release, or desktop-only first?
2. Is v1 single-user only, or does shared workspace editing ship immediately?
3. Should cloud workspaces support true offline editing, or read-only offline open?
4. Should history from imported local workspaces be preserved in cloud?
5. What asset/file size limits are acceptable?
6. Will cloud customers pay immediately, or is there a free hosted tier?
7. Is client-side encryption a requirement?
8. Are comments and future collaboration features in scope for the first hosted release?

## Recommended Delivery Strategy

Ship in this order:

1. Persistence abstraction and workspace identity refactor.
2. Auth + cloud workspace CRUD + server persistence.
3. Desktop local cache and revisioned sync.
4. Assets, history, import/export parity.
5. Billing, quotas, observability, hardening.
6. Browser client.
7. Real-time collaboration.

## Bottom Line

This is not a small feature. It is a product and architecture expansion that requires:

- a hosted backend
- auth and account systems
- a sync engine
- object storage
- new UX for workspace mode, sync, and conflicts
- migration between local and cloud formats
- billing, security, legal, and operations work

The fastest credible path is:

- preserve local mode
- ship single-user cloud workspaces first
- use revision-based sync instead of CRDTs
- build the client persistence abstraction before any backend feature work
