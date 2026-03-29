# flō — Positioning Analysis

**Product:** flō v0.1
**Date:** 2026-03-29
**Author:** Generated from product analysis

---

## 1. Product Summary

**flō** is a Mac desktop application that merges spatial canvas-based thinking with an agent-native file system. Users create lightweight text cards on an infinite canvas, connect them with typed arrows to establish hierarchies and relationships, optionally attach markdown documents for depth, and export the entire structure as agent-readable context — all persisted to the local file system with zero database overhead.

**One-line pitch:** A canvas-based knowledge architect where spatial thinking meets agent-native file hierarchy — cards for humans, markdown for agents.

**Tagline:** reach flōstate

---

## 2. Feature Matrix

### Core Canvas

| Feature | Description | Status |
|---------|-------------|--------|
| Infinite canvas | Pan/zoom from 25%–400% with snap-to-grid (20px) | Alpha |
| Card nodes | Lightweight text nodes with title, body, type badge, doc icon | Alpha |
| Typed connections | 3 edge types: Hierarchy (OWNS), Flow (THEN), Reference (REF) | Alpha |
| Multi-select | Shift+click, drag-select rectangle, Cmd+A | Alpha |
| Minimap | Toggleable bird's-eye navigator (Cmd+M) | Alpha |
| Grid toggle | Show/hide dot grid background (Cmd+G) | Alpha |
| Viewport persistence | Canvas position and zoom saved/restored across sessions | Alpha |

### Card System

| Feature | Description | Status |
|---------|-------------|--------|
| 4 card types | Project [PRJ], Process [PRC], Reference [REF], Brainstorm [BRN] | Alpha |
| Inline editing | Double-click to edit title and body directly on the card | Alpha |
| Collapse/expand | Single-line compact view with type badge and doc indicator | Alpha |
| Branch button | [+] creates new connected child or links to existing card | Alpha |
| Context menu | Right-click: change type, collapse, attach/detach doc, delete | Alpha |
| Type-based styling | Each type has distinct background, text color, and border treatment | Alpha |

### Connection System

| Feature | Description | Status |
|---------|-------------|--------|
| Hierarchy edges | Parent-child ownership (OWNS) — gray solid arrows | Alpha |
| Flow edges | Sequential process chains (THEN) — white solid arrows | Alpha |
| Reference edges | Cross-links with scoped context (REF) — gray dashed lines | Alpha |
| 4 reference scopes | Title only, Summary, Specific section, Full card | Alpha |
| Arrow direction control | Configure source/target arrow independently per edge | Alpha |
| Floating edge toolbar | Select any edge to modify type, scope, or arrows | Alpha |

### Document Editor

| Feature | Description | Status |
|---------|-------------|--------|
| Floating bubble editor | Draggable, resizable rich-text editor per card | Alpha |
| TipTap rich text | Bold, italic, underline, bullet/numbered lists, font size | Alpha |
| YAML frontmatter | Auto-generated metadata (id, title, type, path, timestamps) | Alpha |
| Auto-updated references | Connected cards and hierarchy path injected into document | Alpha |
| Multi-editor support | Open multiple editors simultaneously on the canvas | Alpha |
| Markdown output | Documents persist as standard .md files on disk | Alpha |

### Context Governance

| Feature | Description | Status |
|---------|-------------|--------|
| Health Check dialog | Analyze map structure against 8 validation rules | Alpha |
| Body length warnings | Cards with >3 lines flagged to move content to documents | Alpha |
| Unscoped reference detection | Reference edges without explicit scope flagged | Alpha |
| Circular reference detection | A→B→...→A cycles flagged as errors | Alpha |
| Hierarchy depth warnings | Nesting >3 levels flagged for review | Alpha |
| Redundant body detection | >60% text overlap between cards flagged | Alpha |
| Orphan card detection | Cards with no connections flagged | Alpha |
| Context word estimation | Total words calculated with tier labels: Lean/Standard/Rich/Heavy | Alpha |
| Auto-fix suggestions | One-click fixes: set scope, remove edge, convert type, merge | Alpha |

### Export & Persistence

| Feature | Description | Status |
|---------|-------------|--------|
| context.md export | Full map exported as structured markdown for Claude | Alpha |
| 5-section export format | Rules, Structure, Workflows, Context References, Documents | Alpha |
| File system persistence | JSON + markdown files — no database required | Alpha |
| Directory structure | Auto-creates .flo/, projects/, processes/, references/, brainstorms/ | Alpha |
| Human-browsable output | Folder structure navigable in Finder without the app | Alpha |
| Agent-readable output | Any AI agent can read the file tree directly | Alpha |

### Views & Navigation

| Feature | Description | Status |
|---------|-------------|--------|
| Canvas view | Spatial graph layout (default) | Alpha |
| Kanban view | Hierarchical column layout with root cards as headers | Alpha |
| View switching | Toggle with buttons or Cmd+1/Cmd+2 | Alpha |
| Keyboard shortcuts | Full shortcut set: save, open, export, grid, minimap, views | Alpha |
| Home screen | New Map / Open Existing launch screen | Alpha |

---

## 3. Competitive Landscape

| Capability | flō | Obsidian Canvas | Miro | Notion | FigJam |
|-----------|-----|----------------|------|--------|--------|
| Spatial canvas | Yes | Yes | Yes | No | Yes |
| Typed card nodes | 4 types with semantic meaning | Generic nodes | Sticky notes | Database rows | Sticky notes |
| Typed connections | 3 types (OWNS/THEN/REF) | Untyped arrows | Untyped arrows | Relations (flat) | Untyped arrows |
| Scoped references | 4 granularity levels | No | No | No | No |
| Agent-native file output | Yes — designed for it | Partial (vault files) | No | No | No |
| Context governance | 8 validation rules + word estimation | No | No | No | No |
| Context export | Optimized context.md | No | No | No | No |
| Local-first / no database | Yes — file system only | Yes (vault) | No (cloud) | No (cloud) | No (cloud) |
| Markdown documents | Attached per card, YAML frontmatter | Separate notes | No | Inline blocks | No |
| Lightweight footprint | ~10MB (Tauri) | ~200MB (Electron) | Browser | Browser | Browser |
| Self-documenting hierarchy | Every file includes its own context path | No | No | No | No |
| Brainstorm isolation | BRN cards excluded from agent exports | No | No | No | No |
| Offline-first | 100% local | 100% local | No | No | No |
| Price | Free (local app) | Free (core) + $50/yr | $8-16/mo | $8-15/mo | Free (limited) |

### Where flō Wins

1. **Context control** — No other tool lets you scope exactly how much of a card's content an AI agent sees (title vs. summary vs. section vs. full). This is the #1 differentiator.
2. **Agent-native architecture** — The file system IS the interface for agents. No API, no export step, no intermediary. Agents read files directly.
3. **Governance** — Built-in quality validation prevents context bloat before it happens. No other canvas tool has this.
4. **Semantic connections** — Three edge types with distinct meanings vs. generic arrows everywhere else.
5. **Lightweight** — 10MB native app vs. 200MB+ Electron or browser-only alternatives.

### Where Others Win

1. **Collaboration** — Miro, Notion, and FigJam all support real-time multi-user editing. flō is single-player.
2. **Ecosystem** — Obsidian has 1000+ plugins. Notion has databases, views, and integrations. flō is focused.
3. **General-purpose** — Miro and FigJam support many creative use cases. flō is purpose-built for knowledge architecture + agent context.

---

## 4. Value Proposition Statements

### For AI Engineers & Prompt Engineers

**flō gives AI engineers precision control over the context their agents consume.** Instead of dumping entire knowledge bases into a prompt, flō lets you map information spatially, define exactly what each reference includes (title only? summary? full document?), and export a clean, structured context.md that fits your agent's context window — no bloat, no noise. Your agent reads the file system directly. No API required.

**Key benefits:**
- Scoped references prevent context window overflow
- Governor validates structure before export
- Word count estimation maps to token budgets
- File system is the agent interface — zero integration overhead
- Brainstorm cards are automatically excluded from agent exports

---

### For Product Strategists & Business Planners

**flō turns strategic thinking into structured, actionable knowledge maps.** When you're planning initiatives that span multiple workstreams, flō's typed card system (Projects, Processes, References, Brainstorms) gives every node semantic meaning. The hierarchy (OWNS), flow (THEN), and reference (REF) connections make relationships explicit — not just lines on a board. When it's time to brief your team or hand off to an AI assistant, export the full structure as a single document that preserves every relationship.

**Key benefits:**
- 4 card types map to how strategists actually think (initiatives, processes, reference material, ideation)
- Typed connections distinguish ownership from sequence from cross-reference
- Kanban view shows the same data as hierarchical columns
- Context health check prevents tangled, unreadable structures
- Documents attached to cards keep detail close to the decision

---

### For Technical Architects & System Designers

**flō is a lightweight architecture canvas that produces agent-readable documentation as a side effect.** Map your system components spatially, define ownership hierarchies and data flows with typed edges, attach design documents to any node, and get a self-documenting file structure that any AI coding assistant can traverse without the app. No vendor lock-in — it's just folders, JSON, and markdown.

**Key benefits:**
- Hierarchy edges model ownership and containment
- Flow edges model data pipelines and process sequences
- Reference edges with scoped context model cross-cutting concerns
- File system output mirrors the architecture itself
- 10MB native app — no Electron bloat, no browser dependency
- Sharp corners, monotone palette — designed for focused work

---

### For Developers Working with Claude & AI Agents

**flō is the missing layer between your thinking and your agent's context.** You sketch the structure spatially — fast, visual, intuitive. flō translates that into a file hierarchy that Claude (or any agent) reads natively. Every markdown file auto-includes its position in the hierarchy, its connections, and its reference chains. An agent reading a single file understands the full structure without ever opening the app.

**Key benefits:**
- `context.md` export is optimized for Claude's context window
- File system is the database — agents read files, not APIs
- YAML frontmatter in every document provides machine-readable metadata
- Reference chains are auto-maintained across all connected documents
- Governor prevents the context bloat that kills agent performance
- Local-first, offline-first — works on planes, in cafes, anywhere

---

### For Knowledge Workers & Researchers

**flō replaces the gap between "thinking on a whiteboard" and "writing in a document editor."** Most spatial tools are great for brainstorming but terrible for producing structured output. Most document tools are great for depth but terrible for seeing the big picture. flō bridges both: sketch fast on the canvas, attach documents only where depth is needed, and the structure stays in sync automatically. No copy-paste between tools. No lost context.

**Key benefits:**
- Cards are fast to create — just a title and type
- Documents are optional — only add depth where it matters
- The canvas IS the outline, and the outline IS the file system
- Switch between spatial (canvas) and hierarchical (kanban) views
- Everything saved locally — your knowledge stays on your machine
- Standard formats (JSON + markdown) — no vendor lock-in, ever

---

## 5. Positioning Statement

**For knowledge workers and AI engineers** who need to structure complex information for both human understanding and agent consumption, **flō is a spatial knowledge architect** that combines infinite canvas thinking with agent-native file system organization. **Unlike** Obsidian Canvas, Miro, or Notion, **flō provides** typed connections with scoped context control, built-in governance validation, and a file system output that AI agents can read directly — making it the only tool where the visual map and the agent's context are the same thing.

---

## 6. Messaging Hierarchy

### Primary Message
**"Spatial thinking meets agent-native structure."**

### Supporting Messages
1. **Context control** — "Every reference has a scope. Your agent sees exactly what it needs."
2. **Zero-friction architecture** — "Cards for fast thinking. Documents for depth. Arrows for relationships."
3. **File system = database** — "No API. No export step. Agents read the files directly."
4. **Built-in quality** — "The Governor catches context bloat before your agent does."
5. **Lightweight & local** — "10MB. No cloud. No account. Your knowledge stays on your machine."

### Proof Points
- 4 card types with semantic meaning (not generic sticky notes)
- 3 edge types with distinct behavior (not generic arrows)
- 4 reference scopes from title-only to full document
- 8 governance rules with auto-fix suggestions
- Word count estimation with Lean/Standard/Rich/Heavy tiers
- ~10MB app footprint (Tauri) vs. 200MB+ (Electron)
- Zero database overhead — JSON + markdown on disk
