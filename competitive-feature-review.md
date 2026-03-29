# flo — Competitive Feature Review & Gap Analysis

**Date:** 2026-03-29
**Method:** Competitor Analysis + Product Discovery Brainstorm + Customer Journey Map
**Sources:** Web research across 30+ competitor profiles, market reports, and user feedback

---

## Part 1: Competitive Landscape Analysis

### Market Definition

flo operates at the intersection of three converging markets:

1. **Visual knowledge management** — Infinite canvas tools for spatial thinking (Heptabase, Scrintal, Obsidian Canvas, Miro)
2. **AI context engineering** — Tools for structuring and optimizing information that AI agents consume (emerging category, no clear leader)
3. **Personal knowledge management (PKM)** — Note-taking and knowledge organization (Obsidian, Notion, Logseq)

The unique intersection — **spatial canvas + agent-native output** — is unoccupied. This is flo's strategic opportunity.

### Competitive Set (5 Direct Competitors)

---

#### 1. Heptabase — Visual Knowledge System

| Attribute | Detail |
|-----------|--------|
| **Founded** | 2021, Taiwan. $2.4M seed round. |
| **Pricing** | $8.99/mo Pro, $17.99/mo Premium (annual) |
| **Users** | 100K+ estimated |
| **Position** | Premium visual PKM for researchers and deep thinkers |

**Strengths:**
- Reusable cards that appear on multiple whiteboards (change once, update everywhere)
- Deep PDF/video annotation — highlights, OCR, transcriptions
- Native AI ("Neuron") for note synthesis, research, and learning assistance
- Multiple views: whiteboard, mind map, table, Kanban
- Tag system + bi-directional linking
- Journal integration for daily capture
- Polished UX with strong onboarding

**Weaknesses:**
- No typed connections (all arrows are generic)
- No context scoping or governance
- No agent-native file output
- Cloud-only (no local-first option)
- No export optimized for AI consumption
- $108-216/year is expensive for individual users
- No free tier

**Threat to flo:** Heptabase is the closest competitor in the "visual knowledge synthesis" space. If they add AI agent export features, they become a direct threat.

---

#### 2. Obsidian Canvas + Neuron AI

| Attribute | Detail |
|-----------|--------|
| **Founded** | 2020, Canada. Bootstrapped, profitable. |
| **Pricing** | Free (core), $50/yr Sync, $50/yr Publish |
| **Users** | 5M+ estimated |
| **Position** | Developer-beloved local-first PKM with massive plugin ecosystem |

**Strengths:**
- Local-first vault = markdown files on disk (similar to flo's philosophy)
- 1500+ community plugins including Advanced Canvas, Augmented Canvas (AI)
- Canvas now has labeled/styled arrows and enhanced node types (2026)
- "Neuron" AI toolkit for note synthesis (privacy-first, local models)
- obsidian-skills project enables AI agents to read vaults and JSON Canvas
- Presentation mode for Canvas
- Massive community, extensive documentation
- Free core product

**Weaknesses:**
- Canvas is a feature, not the core product — secondary to note-taking
- No semantic card types (everything is a generic node)
- No reference scoping on connections
- No context governance or word estimation
- No structured agent context export (agents must parse raw vault)
- ~200MB Electron app
- Plugin quality varies wildly
- Canvas bidirectional links don't work with note links

**Threat to flo:** The obsidian-skills project is a direct competitive move into flo's territory. However, it retrofits agent capabilities onto an existing system rather than designing for it from the ground up.

---

#### 3. Flowith — AI Canvas Workspace

| Attribute | Detail |
|-----------|--------|
| **Founded** | 2024, China. VC-backed. |
| **Pricing** | Free (1K credits), $15/mo Pro, $30/mo Ultimate |
| **Users** | 1M+ (Product Hunt #1, June 2025) |
| **Position** | AI-first infinite canvas where conversations are visual nodes |

**Strengths:**
- 40+ AI models accessible from one canvas
- Agent Neo with 10M token context and 1000+ inference steps
- Conversations as visual nodes you can branch, merge, rearrange
- Knowledge Garden for persistent document/note storage
- Cross-model comparison on the same canvas
- Growing fast (1M+ users in under 2 years)
- Web-based, no install needed

**Weaknesses:**
- AI-first, not knowledge-first — canvas is a chat interface, not a knowledge map
- No semantic card types or typed connections
- No file system output (cloud-only)
- No context governance
- No local-first option
- Credit-based pricing creates usage anxiety
- No structured hierarchy or ownership model
- Conversations are ephemeral, not architectural

**Threat to flo:** Flowith captures the "AI + canvas" search intent, but solves a different problem (AI chat UI) than flo (knowledge architecture for agents). Low direct threat, high brand confusion risk.

---

#### 4. Scrintal — Visual Note-Taking Canvas

| Attribute | Detail |
|-----------|--------|
| **Founded** | 2021, Germany. Seed-funded. |
| **Pricing** | Free (limited), $9.99/mo Pro |
| **Users** | ~50K estimated |
| **Position** | Research-focused visual note-taking between PKM and whiteboard |

**Strengths:**
- Infinite canvas with bi-directional linking (visual connection lines)
- Floating tabs — read PDFs/watch videos while taking notes
- Multiple views (canvas, list, board)
- Clean, focused UX
- AI integration (drag-and-drop AI responses onto canvas)
- Real-time collaboration
- Web clipper for research capture

**Weaknesses:**
- No typed connections (all links are generic)
- No card type semantics
- No agent-native output
- No context governance
- Cloud-only, no local files
- Smaller team, slower feature velocity
- No export for AI consumption

**Threat to flo:** Low. Scrintal targets researchers doing traditional note-taking. No agent-native capabilities.

---

#### 5. Kosmik — AI-Powered Infinite Canvas

| Attribute | Detail |
|-----------|--------|
| **Founded** | 2022, France. Seed-funded. |
| **Pricing** | Free (limited), Pro pricing TBD |
| **Users** | ~30K estimated |
| **Position** | Visual canvas with built-in browser and AI-powered discovery |

**Strengths:**
- Infinite canvas with built-in web browser
- AI auto-tagging and smart search across 200+ items
- AI Asset Finder discovers related content from web sources
- Drag anything in — images, PDFs, videos, articles
- Real-time collaboration
- Scales to large collections with AI organization

**Weaknesses:**
- Visual/mood-board focused, not knowledge architecture
- No typed connections, no semantic cards
- No file system output
- No context governance
- No agent integration
- Early stage, small team
- More creative tool than knowledge tool

**Threat to flo:** Minimal. Different target audience (designers, creatives) and different core job.

---

### Competitive Gap Summary

| Capability | flo | Heptabase | Obsidian | Flowith | Scrintal | Kosmik |
|-----------|-----|-----------|----------|---------|----------|--------|
| Semantic card types | 4 types | Generic | Generic | Chat nodes | Generic | Generic |
| Typed connections | 3 types | Generic | Labeled (2026) | None | Bi-directional | None |
| Reference scoping | 4 levels | None | None | None | None | None |
| Context governance | 8 rules | None | None | None | None | None |
| Agent-native export | context.md | None | obsidian-skills | None | None | None |
| Local-first files | Yes | No | Yes | No | No | No |
| Native AI assist | No | Neuron | Neuron | 40+ models | Basic | Auto-tag |
| Multi-view | Canvas + Kanban | 4 views | 2 views | Canvas | 3 views | Canvas |
| Collaboration | No | Yes | Yes (2026) | Yes | Yes | Yes |
| PDF/media embed | No | Yes | Yes | Yes | Yes | Yes |
| Command palette | No | Yes | Yes | No | No | No |
| Search | No | Yes | Yes | Yes | Yes | Yes |
| Templates | No | Yes | Yes | No | No | No |
| Mobile | No | Yes | Yes | Yes (web) | Yes (web) | Yes (web) |

---

## Part 2: Customer Journey Map

**Persona:** Alex, senior AI engineer at a startup. Uses Claude for code generation and architecture review. Manages complex multi-system projects. Frustrated that dumping entire docs into prompts produces mediocre results.

| Stage | Touchpoint | User Action | Emotion | Pain Point | Opportunity |
|-------|-----------|-------------|---------|------------|-------------|
| **Awareness** | Twitter/HN post, word-of-mouth | Sees "agent-native knowledge map" and is intrigued | Curious | "Another canvas tool?" — fatigue from tool overload | Sharp positioning: "Not a whiteboard. Not a note app. A context architect." |
| **Consideration** | Landing page, GitHub | Reads positioning, watches demo, compares to Obsidian | Interested but skeptical | No live demo to try. How is this different from Obsidian Canvas? | Interactive demo on the website showing card→connection→export flow |
| **Acquisition** | Download .dmg | Downloads, installs, opens | Hopeful | Mac-only limits reach. No sign-up friction (good). | Keep zero-friction. Add "What to build first" prompt. |
| **Onboarding** | Home screen | Creates first map, stares at blank canvas | Lost, overwhelmed | Blank canvas paralysis — "What do I do first?" | Starter template / guided first-map wizard |
| **First Value** | Creates 3-4 cards, connects them | Sees hierarchy form, types a body, exports context.md | Surprised, delighted | Export is the "aha" — but user must discover it themselves | Auto-suggest export after 5+ cards connected. Show word count live. |
| **Engagement** | Daily use, multiple maps | Builds project maps, exports for Claude sessions | Productive, in flow | No search across maps. No quick-capture. Must open app to add ideas. | Global search, quick-add hotkey, menu bar widget |
| **Retention** | Weekly habit | Returns to update maps before AI work sessions | Committed but friction grows | Maps grow unwieldy. No way to filter/focus. No version history. | Focus mode, card filtering, undo history, auto-save |
| **Advocacy** | Shares with team/Twitter | Screenshots canvas, shares context.md output | Proud | No shareable link. Can't easily demo to others. | Export as image/PDF, shareable read-only view |

**Critical Moments:**
- **Aha moment:** First `context.md` export → pasting it into Claude → getting dramatically better results
- **Moment of truth:** 3rd session — do they return, or forget about the tool?
- **Churn trigger:** Map grows past ~30 cards and becomes hard to navigate without search/filter

---

## Part 3: Product Discovery Brainstorm

### Objective
Identify features that make flo more competitive and useful, with emphasis on powerful UX.

### PM Perspective (Business Value & Strategic Impact)

1. **Command Palette (Cmd+K)** — Universal fuzzy search over cards, actions, and commands. Every power user expects this. It's the gateway to productivity.

2. **Starter Templates** — Pre-built maps for common use cases (Product Strategy, System Architecture, Research Project, Sprint Planning). Reduces blank-canvas paralysis and shows value immediately.

3. **Quick Capture Menu Bar Widget** — macOS menu bar icon. Click or global hotkey (e.g., Cmd+Shift+F) opens a tiny card creator. Type a title, pick a type, assign to a map. Close. Never leave your current workflow.

4. **Map Gallery / Dashboard** — Replace the simple Home Screen with a visual gallery of all maps showing card count, last modified, context size tier, and thumbnail previews. Makes multi-map workflows feel organized.

5. **Shareable Context Export** — Export context.md as a GitHub Gist, clipboard-ready markdown, or a temporary shareable link. Removes friction from the core agent workflow.

### Designer Perspective (UX, Delight & Usability)

1. **Spotlight Search (Cmd+F in canvas)** — Search across all cards in the current map. Highlights matches, pans to them. Essential once maps grow past 15 cards.

2. **Focus Mode** — Click a card and press F to "focus" — dims everything except the selected card and its direct connections. Perfect for deep work on a specific branch.

3. **Drag-to-Connect** — Instead of the [+] button workflow, drag from a card's edge handle directly to another card (or to empty space to create a new card). This is the interaction model users expect from every node-based editor (Figma, Blender, Unreal).

4. **Smart Auto-Layout** — One-click button to auto-arrange cards into a clean hierarchy tree, flow diagram, or radial layout. Messy canvases become organized instantly. Users can always manually adjust after.

5. **Animated Transitions** — Smooth pan/zoom animations when navigating between cards, using Focus Mode, or switching views. The canvas should feel alive and spatial, not static. Spring physics on card drag would add physicality.

6. **Card Preview on Hover** — Hovering over a connection line shows a tooltip preview of the target card (title + body). Hovering over a card with a doc shows a preview of the first few lines. Reduces clicks.

7. **Undo/Redo Stack (Cmd+Z / Cmd+Shift+Z)** — Essential safety net. Currently missing. Users will not trust a tool with their knowledge architecture if they can't undo mistakes.

### Engineer Perspective (Technical Leverage & Scalability)

1. **File Watcher + Hot Reload** — Watch the .flo/ directory for external changes. If an agent (or the user in VS Code) edits a markdown file, the canvas updates live. This is the bidirectional bridge that makes flo truly agent-native.

2. **Local API Server (localhost)** — Expose a REST API on localhost that agents can call to read/write cards, create connections, and trigger exports. Transforms flo from a read-only file system to a live agent workspace.

3. **Plugin / Extension System** — Allow users to add custom card types, edge types, export formats, and governor rules. Start with a simple JSON manifest + script system. This is how Obsidian built its moat.

4. **Cross-Map References** — Already in the product outline but not yet built. Cards in one map can reference cards in another map. Essential for users with 3+ maps. Enables project-of-projects architecture.

5. **Version History / Snapshots** — Auto-snapshot the map state every N saves. Show a timeline slider to browse past states. Git-friendly: since everything is JSON + markdown, leverage git for history.

---

## Part 4: Prioritized Feature Recommendations

### Tier 1 — Critical (Ship before public launch)

These features close the biggest gaps vs. competitors and prevent churn at the journey's most fragile moments.

| # | Feature | Impact | Effort | Why Now |
|---|---------|--------|--------|---------|
| 1 | **Undo/Redo (Cmd+Z)** | High | Medium | Trust killer. Users will not commit knowledge to a tool without undo. Every competitor has this. |
| 2 | **Command Palette (Cmd+K)** | High | Medium | Universal expectation in desktop tools. Gateway to every action. Obsidian, VS Code, Raycast all train users to expect this. |
| 3 | **Spotlight Search (Cmd+F)** | High | Low | Maps become unusable past 15 cards without search. Direct cause of churn. |
| 4 | **Drag-to-Connect** | High | Medium | The [+] button flow has too many steps. Drag-from-handle is the standard interaction model. Removes friction from the core loop. |
| 5 | **Starter Templates** | Medium | Low | Blank canvas paralysis is the #1 onboarding failure mode. 3-4 templates fix it instantly. |

### Tier 2 — Competitive (Ship within 3 months)

These features match competitor capabilities and unlock engagement loops.

| # | Feature | Impact | Effort | Why |
|---|---------|--------|--------|-----|
| 6 | **Auto-Layout** | Medium | Medium | One-click clean-up prevents canvas entropy. Heptabase and Miro both offer this. |
| 7 | **Focus Mode** | Medium | Low | Unique UX differentiator. No competitor does this well. High delight, low effort. |
| 8 | **Card Preview on Hover** | Medium | Low | Reduces clicks, increases spatial awareness. Standard in node-based editors. |
| 9 | **Map Gallery Dashboard** | Medium | Medium | Multi-map users need orientation. Current Home Screen is too basic for power users. |
| 10 | **Animated Transitions** | Medium | Low | Makes the canvas feel spatial and alive. Spring physics on drag, smooth zoom, staggered card reveals. |
| 11 | **File Watcher + Hot Reload** | High | High | The killer feature that makes flo truly bidirectional with agents. Agent writes file → canvas updates. |
| 12 | **Cross-Map References** | Medium | High | Already planned. Essential for users with multiple knowledge domains. |

### Tier 3 — Moat (Ship within 6 months)

These features build defensibility and expand the addressable market.

| # | Feature | Impact | Effort | Why |
|---|---------|--------|--------|-----|
| 13 | **Local API Server** | Very High | High | Transforms flo into a live agent workspace. Agents don't just read — they write. This is the "platform" play. |
| 14 | **Quick Capture Widget** | Medium | Medium | Menu bar quick-add keeps flo in the daily workflow even when the app isn't foregrounded. |
| 15 | **Version History / Snapshots** | Medium | Medium | Safety net for large maps. Git-native since everything is JSON + markdown. |
| 16 | **Plugin System** | Very High | Very High | How Obsidian built a 5M+ user moat. Custom card types, edge types, export formats, governor rules. |
| 17 | **Shareable Export** | Medium | Low | Gist, clipboard, or temporary link for context.md. Enables advocacy and team adoption. |
| 18 | **PDF/Image Embed in Cards** | Medium | Medium | Heptabase, Obsidian, and Scrintal all support this. Research users expect it. |

---

## Part 5: UX Power Moves (High-Impact, Distinctive)

These aren't just features — they're UX signatures that make flo feel unlike anything else.

### 1. "The Governor Bar" — Live Context Meter

A persistent thin bar at the bottom of the canvas that shows **real-time word count and context tier** (Lean / Standard / Rich / Heavy) as you build. It pulses green→yellow→orange→red as context grows. No other tool has this. It's the equivalent of a fuel gauge for AI context — you always know how full your agent's tank is.

### 2. "Ghost Preview" — See What the Agent Sees

Press a hotkey (Cmd+Shift+P) to toggle "Agent View" — the canvas dims and only shows what would appear in `context.md`. Brainstorm cards fade out. Reference edges show their scoped content inline. Flow edges show numbered steps. You see your map the way your agent reads it. This is the most powerful trust-building feature you could ship.

### 3. "Zen Mode" — Single Card Deep Focus

Double-click any card's document icon to enter Zen Mode — the canvas fades to black, the editor bubble expands to fill the screen, and you're in a distraction-free markdown editor. Press Escape to return to the canvas with a smooth zoom-out animation. This bridges the gap between "spatial thinker" and "deep writer" modes.

### 4. "Snap Hierarchy" — Structure from Chaos

Select multiple cards, right-click → "Auto-Hierarchy." flo analyzes card titles, bodies, and existing connections to suggest a hierarchy. Project cards become parents, processes become children, references link to relevant nodes. One click to accept or reject. Turns a brainstorm dump into a structured map.

### 5. "Context Diff" — Before/After Export Comparison

After making changes to a map, press Cmd+D to see a diff of how `context.md` changed. Added lines in green, removed in red. This gives users confidence that their structural changes had the intended effect on agent context.

---

## Summary: The Strategic Play

flo's competitive position is strong because no one else occupies the "spatial canvas → agent context" niche. But the tool is vulnerable at the edges:

- **Obsidian** is moving toward agent-native with obsidian-skills
- **Heptabase** has the best visual PKM UX and could add agent export
- **Flowith** captures the "AI + canvas" search intent

**The defensible moat is the Governor + Scoping + Agent View.** No competitor has context governance. No competitor lets you scope individual references. No competitor shows you what the agent sees. These three capabilities should be flo's marketing pillars.

**The immediate risk is UX polish.** Missing undo, search, and command palette will cause churn before users ever discover flo's unique capabilities. Ship Tier 1 before anything else.

---

## Sources

- [Obsidian Skills: AI Agent Integration](https://aitoolly.com/ai-news/article/2026-03-25-obsidian-skills-empowering-ai-agents-with-markdown-bases-and-json-canvas-integration)
- [Obsidian 2026 Features](https://eathealthy365.com/obsidian-2026-all-the-new-features-you-need-to-know/)
- [Best Visual Thinking Tools 2026](https://storyflow.so/blog/best-visual-thinking-tools-2026)
- [Heptabase Pricing](https://heptabase.com/pricing)
- [Heptabase Review & Pricing 2026](https://www.sollmannkann.com/project-management-and-notes/best-heptabase-review/)
- [Flowith Review 2026](https://dupple.com/tools/flowith)
- [Flowith AI Review](https://max-productive.ai/ai-tools/flowith/)
- [Scrintal — Visual Note-Taking](https://scrintal.com/)
- [Kosmik — AI Infinite Canvas](https://www.kosmik.app/)
- [Infinite Canvas App Gallery](https://infinitecanvas.tools/gallery/)
- [Context Engineering for AI Agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Context Management: The Missing Piece for Agentic AI](https://datahub.com/blog/context-management/)
- [Tauri Template: Menu System & Shortcuts](https://deepwiki.com/dannysmith/tauri-template/4.3-menu-system-and-keyboard-shortcuts)
- [Obsidian Advanced Canvas Plugin](https://github.com/Developer-Mike/obsidian-advanced-canvas)
- [Obsidian Augmented Canvas Plugin](https://github.com/MetaCorp/obsidian-augmented-canvas)
