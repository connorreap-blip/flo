# flo Product Guide

## Overview

`flo` is a local-first workspace for shaping project context before you hand it to AI. It combines a visual map, structured documents, file import, and export controls so the resulting context is organized instead of flattened.

## Core Concepts

### Workspace

A workspace is a saved folder containing canonical project files plus generated export output.

### Cards

- `Project`: goals, constraints, decisions, and requirements
- `Process`: ordered steps or operational workflow
- `Reference`: supporting information, evidence, and source material
- `Brainstorm`: rough thinking that stays out of export by default

### Connections

- `Hierarchy`: parent-child structure
- `Flow`: ordered sequence
- `Reference`: supporting context between cards

### Card Documents

Each card can hold a rich document. Documents support headings, lists, wikilinks, file references, comments, and optional agent hints.

### Agent Hints

Agent hints are short instructions attached to a card. They can be:

- shown inline in exported context
- collected into a separate `Agent Hints` section
- hidden from export

## Main Areas Of The App

### Overview

The overview screen summarizes workspace health, activity, context size, and onboarding progress.

### Workspace

The workspace tab is the main canvas. Use it to place cards, edit structure, and switch between canvas and kanban views.

### Files

The files tab lets you:

- inspect workspace files
- import source files into `assets/`
- preview text and image files
- attach imported files to cards

### History

History shows saved snapshots so you can compare or restore earlier states.

## Recommended Workflow

1. Start from a blank workspace, template, or sample.
2. Create the core `Project` and `Process` cards first.
3. Add supporting `Reference` cards only where they improve downstream execution.
4. Keep `Brainstorm` cards for rough thinking, but leave them excluded from export.
5. Open the rich document editor for the cards that need more than a summary.
6. Add agent hints only where a card benefits from extra instruction.
7. Run `AI Check` to catch export-shape problems.
8. Save locally, then export `context.md` or copy it to the clipboard.

## Import And Export

### File Import

There are two distinct import flows:

- `Import Files` in the Files tab copies files into `assets/`
- drag-and-drop in a card document extracts readable text from supported files and inserts it into the document

Document text extraction currently supports plain text formats, `DOCX`, and `PDF`.

### Export

Export generates a single `context.md` file. The export preserves:

- rules and constraints
- hierarchy
- workflows
- scoped references
- optional agent hints
- optional detailed documents

## Keyboard Shortcuts

- `Cmd/Ctrl+S`: Save
- `Cmd/Ctrl+Shift+S`: Save As
- `Cmd/Ctrl+O`: Open workspace
- `Cmd/Ctrl+E`: Export `context.md`
- `Cmd/Ctrl+Shift+C`: Copy exported context
- `Cmd/Ctrl+Shift+P`: Ghost Preview
- `Cmd/Ctrl+1`: Canvas view
- `Cmd/Ctrl+2`: Kanban view
- `Cmd/Ctrl+Z`: Undo
- `Cmd/Ctrl+Shift+Z`: Redo

## Current Limits

- canonical reload is JSON-based, not markdown-sidecar-based
- explicit export is markdown-only, not a multi-file bundle
- there is no built-in cloud sync or collaboration
- launch distribution and auto-update still need release automation
