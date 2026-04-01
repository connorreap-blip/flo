# flo — Backlog & Next Steps

---

## Distribution Architecture

**Status:** Not started
**Priority:** Pre-launch critical

flo is a Tauri v2 desktop app. Vercel hosts the website/landing page. Native binaries are built via GitHub Actions and distributed through GitHub Releases. Auto-update uses Tauri's built-in updater plugin.

### Pipeline

```
Vercel (website)          GitHub Releases (binaries)        User's machine
┌──────────────┐         ┌─────────────────────┐          ┌──────────────┐
│ Landing page │─────────│ .dmg (macOS)        │──install──│ flo.app      │
│ Download btn │  links  │ .msi (Windows)      │          │              │
│ update.json  │◄────────│ .AppImage (Linux)   │          │  checks for  │
│              │  served  │ latest.json         │          │  updates ───►│
└──────────────┘         └─────────────────────┘          └──────────────┘
                              ▲
                              │ GitHub Actions
                              │ on every git tag
                              │
                         git tag v0.1.0
```

### Steps to implement

1. **GitHub Actions release workflow** (`.github/workflows/release.yml`)
   - Triggers on `v*` tags
   - Matrix build: macOS (aarch64 + x86_64), Windows (x64), Linux (x86_64)
   - Uses `tauri-apps/tauri-action@v0` to build and upload to GitHub Release draft
   - Requires `TAURI_SIGNING_PRIVATE_KEY` secret for signed updates

2. **Tauri updater plugin config** (`src-tauri/tauri.conf.json`)
   - Add `plugins.updater` with endpoint URL pointing to Vercel or GitHub
   - Generate signing keypair: `npx tauri signer generate -w ~/.tauri/flo.key`
   - Public key goes in tauri.conf.json, private key goes in GitHub Secrets

3. **Vercel site serves two things**
   - Download page with links to latest GitHub Release assets
   - Update endpoint (API route or static JSON) that Tauri's updater polls

4. **Release workflow**
   - Bump version in `src-tauri/tauri.conf.json` + `package.json`
   - `git tag v0.x.0 && git push origin main --tags`
   - GitHub Actions builds, uploads draft release
   - Review draft, publish — users get auto-update

---

## Feature Backlog

### Delivery Split

The current app can deliver a meaningful native product without any AI provider, but the roadmap should separate deterministic product logic from true AI-assisted behavior.

#### Native-first work

These can and should ship without an AI plug-in or hosted model:

- governor rules, thresholds, and quick-fix actions
- reference scoping UX and export shaping
- agent hints, goal-based export ordering, and context previews
- heuristic suggestion helpers for summaries and goals
- dashboard drill-in, command/search unification, and file navigation
- save, save as, snapshots, retention, external-change merge flow, and status feedback

#### AI-dependent work

These should be treated as a separate workstream because they require a provider layer:

- semantic project-goal generation from workspace content
- semantic card-summary generation from document content
- version change summaries on save or export
- chat / copilot surfaces
- natural-language critique, rewrite, or synthesis features

### AI Workstream

#### Provider abstraction

Before adding more AI-facing UI, add one provider layer that owns model access and fallback behavior.

Light spec:

- frontend calls a single typed service such as `generateAiSuggestion()`
- service accepts structured inputs: `kind`, `project`, `cards`, `edges`, `selection`, and optional `instructions`
- service returns structured outputs: `text`, `title`, `bullets`, `warnings`, and `providerMeta`
- provider implementations can target hosted APIs or a future local model path
- when no provider is configured, AI actions must stay visible but degrade to native heuristics or a clear disabled state
- AI output must always be previewed and user-applied; it should never overwrite card or project state silently

#### Initial AI-backed feature targets

1. Project goal suggestion from full workspace structure and document content.
2. Card summary suggestion that synthesizes a short summary instead of taking the first sentence.
3. Save/export change summaries for history entries and release notes.

### Tier 1 — Critical (pre-launch)

| Feature | Notes |
|---------|-------|
| Command Palette (Cmd+K) | Fuzzy search over cards, actions, commands |
| Spotlight Search (Cmd+F) | Search cards in current map, highlight + pan to match |
| Starter Templates | 3-4 pre-built maps (Product Strategy, System Architecture, Research Project) |
| Drag-to-Connect with edge type | Drag from handle directly, edge type pre-selected from handle hover |
| Governor hardening | Wire settings to real rule execution, add actionable fixes, and make dashboard/governor drill-in consistent |
| Reference scope workflow | Make reference scope selectable at creation time and editable after creation |
| Save workflow completion | Add `Save As`, save feedback, snapshot toggle wiring, and snapshot retention |

### Tier 2 — Competitive (within 3 months)

| Feature | Notes |
|---------|-------|
| Auto-Layout (hierarchy tree) | One-click arrange cards into clean tree from hierarchy edges |
| Focus Mode | Click card + press F to dim everything except card and its connections |
| Card Preview on Hover | Hover connection line shows target card tooltip |
| Map Gallery Dashboard | Replace HomeScreen with visual gallery of all maps |
| Governor Bar | Persistent bottom bar showing real-time word count + context tier |
| Ghost Preview (Agent View) | Cmd+Shift+P toggles "what the agent sees" overlay |
| Native suggestion helpers | Improve summary and goal suggestions with better heuristics, keyword extraction, and graph-aware templates |
| Discovery unification | Align dashboard drill-in, command palette, slash menu, and future file tree around one search/detail model |

### Tier 3 — Moat (within 6 months)

| Feature | Notes |
|---------|-------|
| File Watcher + Hot Reload | Watch .flo/ dir, update canvas when agent edits files externally |
| Local API Server (localhost) | REST API for agents to read/write cards, create connections |
| Claude Chat Sidebar | Built-in chat panel with API key / subscription auth config; depends on provider abstraction |
| Version History / Snapshots | Auto-snapshot on save, timeline slider, git-native |
| Plugin / Extension System | Custom card types, edge types, export formats, governor rules; separate from AI provider plumbing |
| Cross-Map References | Cards in one map reference cards in another |
| Image / Attachment Support | Cards can hold images, PDFs, files |
| Card Tags | Tags addable to cards for filtering, categorization |
| Card Attachments | Attach files, images, PDFs to individual cards |
| Card Comments | Comment threads on cards — comments excluded from agent export (like brainstorm cards) |
| AI provider layer | Configurable provider service for suggestions, synthesis, and future assistant/chat features |

### UX Improvements (ongoing)

| Feature | Notes |
|---------|-------|
| Settings menu | Central config for all user preferences, helper toggles |
| Markdown assist in editor | Auto-format for non-brainstorm cards, section suggestions |
| Context Diff (Cmd+D) | Show diff of context.md changes before/after edits |
| Animated transitions | Spring physics on drag, smooth zoom, staggered card reveals |
| Version change summaries | Automated change notes on save/export (requires LLM) |
| AI suggestion preview pattern | Shared review/apply UI for goal, summary, and future AI-generated content |
| `[[` card picker in docs | TipTap extension for wikilink-style card references |
| Backlinks in EditorBubble | Show what other cards reference this one |

---

## Completed

### Batch A — UX Fixes
- Removed 8-bit font, fixed card drag while typing, gold project title, 4-sided handles

### Batch B — Home Screen + Naming
- HomeScreen with logo, project naming, inline-editable name in toolbar

### Batch C — Card Interactions
- Branch button (+), NodeResizer, doc button clarity, bullet/ordered list buttons

### Batch D — Anchors + Floating Toolbar
- Single handle per side, floating toolbar (SEL/PAN/DEL), arrow direction picker

### Context Governor (10 tasks)
- 3 edge types (hierarchy/flow/reference), reference scoping (4 levels)
- Governor rules engine (8 Claude-grounded rules), health check dialog
- context.md export pipeline, inline helper toasts, kanban view
- View switching (Cmd+1/2), export shortcut (Cmd+E)

### Batch E — UX Polish
- Undo/redo (zundo + Cmd+Z/Shift+Z), bullet list nesting fix
- Toolbar redesign (Lucide icons, DEL removed), handle hover edge type picker
- Zen Mode full-screen editor
