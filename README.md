# flo

`flo` is a local-first desktop app for mac, designed to turn messy notes, docs, and whiteboard thinking into structured context that coding agents can actually use.

It gives you a visual workspace with cards, relationships, document editing, file import, and AI-shaped export so your project structure stays visible all the way to handoff.

## What It Does

- Build workspaces from four card types: `Project`, `Process`, `Reference`, and `Brainstorm`.
- Connect cards with `Hierarchy`, `Flow`, and `Reference` edges.
- Write rich card documents with backlinks, file references, comments, and agent hints.
- Import workspace files into `assets/` and preview them inside the app.
- Generate `context.md` exports that preserve structure, workflows, scoped references, and optional agent hints.
- Save local workspace history snapshots for rollback and review.
- Start quickly from starter templates or a sample workspace.

## Install

### Prerequisites

- Node.js 20+
- npm 10+
- Rust stable toolchain
- Tauri system dependencies for your platform

### Local Development

```bash
npm install
npm run tauri dev
```

### Production Build

```bash
npm run build
cd src-tauri && cargo check
```

## How Workspaces Are Stored

When you save a workspace, flo writes a folder containing:

```text
<workspace>/
  meta.json
  cards.json
  edges.json
  viewport.json
  context.md
  assets/
  history/
```

`meta.json`, `cards.json`, `edges.json`, and `viewport.json` are the canonical workspace files. `context.md` is generated output for AI handoff.

## Core Workflow

1. Create a new workspace, open a recent one, or start from a template.
2. Add cards and connect them to show structure, sequence, and supporting references.
3. Open card documents to write details, attach files, and add optional agent hints.
4. Run `AI Check` to catch context-shape problems before export.
5. Save the workspace locally.
6. Export `context.md` or copy the generated context to the clipboard.

## Keyboard Shortcuts

- `Cmd/Ctrl+S`: Save
- `Cmd/Ctrl+Shift+S`: Save As
- `Cmd/Ctrl+O`: Open workspace
- `Cmd/Ctrl+E`: Export `context.md`
- `Cmd/Ctrl+Shift+C`: Copy exported context
- `Cmd/Ctrl+Shift+P`: Toggle Ghost Preview
- `Cmd/Ctrl+1`: Canvas view
- `Cmd/Ctrl+2`: Kanban view
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z`: Redo

## Public Docs

- [Product Guide](docs/help/product-guide.md)
- [Website Help Outline](docs/help/website-help-outline.md)
- [Privacy Policy Draft](docs/legal/privacy-policy.md)
- [Launch Readiness Review](docs/release/launch-readiness-2026-04-01.md)
- [Pre-Mortem](docs/release/PreMortem-flo-2026-04-01.md)
- [Security Policy](SECURITY.md)
- [Support Guide](SUPPORT.md)

## Release Notes

This repository is set up for GitHub release distribution, not npm package publishing. Keep `"private": true` in `package.json` unless you intentionally decide to ship a JS package in addition to the desktop app.
