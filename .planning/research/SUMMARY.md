# Project Research Summary

**Project:** PromptPlayer
**Domain:** Desktop presentation tool — JSONL conversation replay
**Researched:** 2026-02-20
**Confidence:** HIGH

## Executive Summary

PromptPlayer is a Windows desktop tool that reads Claude Code JSONL session files and replays them as curated, step-through presentations for developer audiences. The fundamental design challenge is that this is NOT a file viewer — it is a presentation instrument. Every architectural and UX decision must be evaluated through the lens of "does this help the presenter tell their story?" Research across comparable tools (reveal.js, Asciinema, Slidev, Jupyter nbviewer) shows that the difference between a usable presentation tool and a frustrating log dumper is intelligent filtering of noise, controlled narrative pacing, and projector-first visual design.

The recommended stack is Electron + React + TypeScript, scaffolded with electron-vite and packaged with Electron Forge. This is the clear winner because the web rendering engine is the best platform for the markdown-heavy, code-syntax-rich display this tool demands. The stack's well-known downsides (large bundle, higher memory) are irrelevant for a single-user presenter tool running on a modern machine. TypeScript is non-negotiable given the complexity of JSONL discriminated-union parsing and the risk of silent data errors.

The most consequential architectural decision is to build a clean pipeline with hard component boundaries: Parser → Stitcher → Classifier → Presentation Engine → Navigation Controller. The Classifier — which separates narrative tool calls (AskUserQuestion, TaskCreate) from plumbing tool calls (Read, Grep, Bash) — is simultaneously the most important technical component and the most likely to evolve. It must be configurable from day one. Getting this pipeline right in Phase 1 prevents painful refactors across all downstream phases.

---

## Key Findings

### Recommended Stack

Electron + React + TypeScript is the decisive recommendation. The browser rendering engine, accessed through Electron, gives access to the most mature markdown rendering ecosystem (`react-markdown` + `remark-gfm`), the best code syntax highlighting (`shiki` with VS Code themes), and full CSS control for presentation-quality typography. State management complexity is minimal — Zustand handles the two key state concerns (loaded sessions, current navigation index) with a fraction of Redux's boilerplate. Tailwind CSS v4 enables rapid iteration on the presentation layout.

Tauri v2 was the only serious alternative, but it loses because the developer would need to write Rust for filesystem access, WebView2 on Windows has subtle CSS rendering differences versus Electron's full Chromium, and Tauri's key advantages (small bundle, low memory) are irrelevant for this use case. WPF/MAUI would require embedding a WebView2 control anyway, at which point Electron is the simpler path for a TypeScript-familiar developer.

**Core technologies:**
- **Electron ^34**: Window management, filesystem access via Node.js, contextBridge IPC — no Rust required, full DevTools for debugging
- **React ^19 + TypeScript ^5.7**: Component model maps directly to the message rendering pipeline; TypeScript discriminated unions handle JSONL message type safety
- **electron-vite**: Unified build for main/preload/renderer processes; fastest HMR for development iteration
- **react-markdown + remark-gfm + shiki**: Markdown rendering with GFM extensions and VS Code-quality syntax highlighting
- **Zustand ^5**: Minimal state management for `currentIndex` + `loadedSessions` — zero boilerplate overhead
- **Tailwind CSS ^4**: Utility-first CSS for rapid presentation layout iteration
- **Electron Forge ^7.6**: Official packaging tool; produces SQUIRREL.WINDOWS installer

### Expected Features

All 10 table-stakes features are load-bearing — absent any one of them, the tool is not usable for its core purpose.

**Must have (table stakes):**
- JSONL conversation parsing (TS-3) — foundational data layer, everything depends on this
- Markdown rendering with syntax highlighting (TS-4, TS-5) — Claude responses are markdown; raw text is unreadable at screen-sharing distance
- Sequential forward/back navigation + keyboard shortcuts (TS-1, TS-2) — this IS the product; arrow keys/spacebar are reflexive presenter expectations
- Visual distinction between user and AI messages (TS-6) — audience cannot follow who said what without this
- Tool call visibility control — show narrative, hide plumbing (TS-7) — the primary differentiator over "just read the log"; filtering IS the value
- Multi-session sequencing (TS-8) — demos chain 5-15+ JSONL files; manual file switching during live demo is a failure mode
- Readable typography at screen-sharing distance (TS-9) — minimum 18-20px body, 16-18px code; design for projected/screenshared output, not local monitor
- Progress indicator (TS-10) — two-level: session X of Y + step N of M within session

**Should have (competitive differentiators, Phase 3+):**
- Demo manifest/playlist file (D-6) — makes demos repeatable, shareable, configurable; unlocks section markers and per-step notes storage
- Presenter notes/talking points (D-1) — turns replay into presentation; reveal.js speaker notes are its most-used feature
- Section/chapter markers (D-3) — essential for 5-15 session demos; enables Q&A jumping
- Theme/appearance customization including high-contrast light mode (D-5) — conference room projectors favor light backgrounds
- Elapsed timestamps (D-11) — time context powerfully demonstrates AI productivity
- Collapsible/expandable tool call details (D-4) — flexibility for audience questions ("what file did it edit?")

**Defer to v2+:**
- Dual-screen presenter mode (D-9) — high complexity multi-window coordination
- Animated typewriter message reveal (D-2) — technically tricky with markdown; design rendering pipeline to allow it later without building it now
- Code diff view for Edit tool calls (D-8) — high value but medium-high complexity
- Static HTML export (D-13) — high complexity; standalone async sharing
- File tree / artifact summary panel (D-12) — high complexity state tracking across steps
- Search within conversation (D-7) — useful for Q&A but not essential for initial presenting

**Explicitly do NOT build:**
- Real-time collaboration, conversation editing, auto-play, live Claude API integration, mobile-responsive design, video recording, plugin/extension system

### Architecture Approach

The architecture is a five-stage unidirectional pipeline with a single feedback loop. Data flows from raw JSONL files through four transformation stages before reaching the rendered UI; the only backwards feedback is the Navigation Controller changing the current index, which tells the Presentation Engine what to render. This separation makes each stage independently testable and isolates the Classifier (the most volatile component) from the rendering layer.

**Major components:**
1. **JSONL Parser** — Stream-parses `.jsonl` files line by line; produces `ParsedMessage[]` indexed by UUID; never loads full file into memory; wraps each line in try/catch
2. **Session Stitcher** — Reconstructs ordered conversation from `parentUuid` tree; resolves mainline path; filters `isSidechain: true` branches; merges multiple session files using explicit manifest ordering (NOT timestamp inference)
3. **Message Classifier** — Annotates each message with `displayCategory` and `defaultVisibility`; classifies content blocks within a single assistant message independently; rule set must be configurable, not hardcoded
4. **Presentation Engine** — Renders `ClassifiedMessage[]` to DOM using react-markdown + shiki; owns styling and visual hierarchy; caches rendered output per message; does NOT own navigation state
5. **Navigation Controller** — Owns `currentIndex` in Zustand store; navigation operates on filtered narrative steps only (plumbing messages skipped transparently); forward/back are exact inverses of each other

**Key data contracts:**
- Parser → Stitcher: `ParsedMessage[]` with `uuid`, `parentUuid`, `isSidechain`, `isMeta`
- Stitcher → Classifier: `StitchedConversation` (ordered, mainline-only)
- Classifier → Engine: `ClassifiedMessage[]` with `displayCategory`, `defaultVisibility`, `contentBlocks[]`
- Controller → Engine: `NavigationState` with `currentIndex`, `displayMode`, `expandedToolCalls`

### Critical Pitfalls

1. **Naive JSONL parsing crashes on real data** — Real session files can be 50MB+ with megabyte-sized individual lines (file contents embedded in Read tool results). Stream-parse line by line using Node.js `readline`; never load full file into memory; build UUID-indexed lookup; test with a corpus that includes large files, files with sidechains, and files from multiple Claude Code versions.

2. **Treating every message as an equal "step"** — A raw Claude Code session may have 200+ tool calls for a 15-step narrative. Step navigation must operate on the filtered narrative layer (post-Classifier), not raw message count. Forward and back must be exact inverses. This taxonomy must be designed before building navigation — it cannot be retrofitted.

3. **Markdown renderer that works on README files but breaks on real Claude output** — Claude responses contain box-drawing characters that break table parsers, deeply nested code blocks, very long code outputs, and GFM tables. Test against real Claude output from day one. Pre-process box-drawing content into `<pre>` blocks. Cap long code blocks with expandable "show more". Build a rendering test gallery early.

4. **Session chaining without explicit ordering** — Multi-session demos cannot rely on filename or timestamp sorting. Require an explicit manifest file that defines session sequence. Show a session transition indicator so the audience stays oriented. Use two-level progress display (session X of Y + step N of M).

5. **Building a file viewer instead of a presentation tool** — The gravitational pull is toward showing all data; the actual need is controlled narrative flow. Design for projector-first (18-20px base font, light high-contrast theme, relative units), focus mode by default (current step prominent, history minimal), and test via actual screen share as soon as basic navigation works.

---

## Implications for Roadmap

### Phase 1: Data Pipeline and Core Rendering (Foundation)

**Rationale:** Nothing else can be built without the data pipeline. The Classifier must exist before navigation can be defined, because navigation operates on classified steps. This phase also establishes the message taxonomy — getting it wrong here cascades into every downstream phase.

**Delivers:** Given one JSONL file, parse it, classify messages, and render a static page showing the full conversation. No navigation yet, but visually correct and readable.

**Addresses:** TS-3 (JSONL parsing), TS-4 (markdown rendering), TS-5 (syntax highlighting), TS-6 (user/AI distinction), TS-7 (tool call filtering), TS-9 (typography)

**Avoids:** Pitfall #1 (naive parsing), Pitfall #2 (flat message model), Pitfall #3 (markdown rendering), Pitfall #8 (hardcoded format), Pitfall #9 (tool call display)

**Architecture components built:** JSONL Parser, Session Stitcher (single session), Message Classifier, Presentation Engine (static)

**Research flag:** Needs deeper research — the Claude Code JSONL schema needs to be examined against real files before finalizing the Parser and Classifier implementations. The tool call pairing system (tool_use matched with tool_result by tool_use_id) requires careful design.

### Phase 2: Navigation (Makes It a Player)

**Rationale:** Once rendering is correct for a single session, navigation is the next load-bearing capability. This phase turns a static renderer into an actual step-through tool.

**Delivers:** Full keyboard-driven step navigation through a single conversation. The presenter can walk through one session end-to-end using arrow keys / spacebar.

**Addresses:** TS-1 (sequential navigation), TS-2 (keyboard navigation), TS-10 (progress indicator)

**Avoids:** Pitfall #6 (navigation mental model mismatch), Pitfall #7 (presentation context — focus mode, font size)

**Architecture components built:** Navigation Controller, Zustand store integration, keyboard shortcut bindings

**Research flag:** Standard patterns — keyboard shortcut binding in Electron is well-documented. Zustand state management is straightforward.

### Phase 3: Multi-Session Sequencing (Full Demo Capability)

**Rationale:** The project's core use case requires chaining 5-15+ session files. This phase unlocks presenting a complete GSD workflow demo end-to-end.

**Delivers:** Load a manifest file specifying ordered session files, navigate across session boundaries, display session transition indicators, show two-level progress (session X of Y + step N of M).

**Addresses:** TS-8 (multi-session sequencing)

**Avoids:** Pitfall #4 (session chaining without explicit ordering)

**Architecture components built:** Session Stitcher multi-session extension, manifest format/loader, session transition UI

**Research flag:** Needs design research — the manifest file schema is the primary user-created configuration artifact and will be the hardest thing to change later. Invest time in designing it right (YAML vs. JSON, required vs. optional fields, how section markers and per-step notes will integrate).

### Phase 4: Presentation Polish (Production-Ready Demo Tool)

**Rationale:** The tool is functional after Phase 3 but rough. This phase adds the features that separate a demo tool from a polished presentation instrument.

**Delivers:** Demo manifest with section markers and presenter notes; theme support (high-contrast light mode for projectors); elapsed timestamps; collapsible tool call details; font size controls.

**Addresses:** D-1 (presenter notes), D-3 (section markers), D-5 (themes), D-6 (manifest enhancements), D-11 (timestamps), D-4 (collapsible tool calls)

**Avoids:** Pitfall #7 (presentation context — projector-first design tested via screen share)

**Research flag:** Standard patterns — CSS theme system with custom properties is well-established. Keyboard shortcut for font size scaling is simple. No novel technical challenges.

### Phase 5: Advanced Features (Competitive Differentiators)

**Rationale:** Once the core presentation workflow is solid, these features significantly increase the tool's power for complex or repeated demos.

**Delivers:** Search within conversation for Q&A navigation; typewriter/progressive reveal animation; code diff view for Edit tool calls; deep-link URLs to specific steps.

**Addresses:** D-7 (search), D-2 (typewriter reveal), D-8 (code diff), D-10 (deep links)

**Research flag:** Needs research — typewriter reveal with markdown rendering requires careful design (cannot half-render a code block). Code diff reconstruction from Edit tool call parameters (old_string / new_string) needs a diffing library evaluation.

### Phase Ordering Rationale

- Parser before Stitcher before Classifier before Engine before Controller — the pipeline enforces this order; downstream components cannot be built without upstream data shapes being finalized
- Message taxonomy (Classifier rules) must be frozen before navigation is built — navigation's definition of "one step forward" depends on which messages are classified as narrative vs. plumbing
- Single-session navigation before multi-session — multi-session adds manifest loading and transition UI on top of working single-session navigation; building them together conflates two distinct problems
- Functional correctness before visual polish — test on real Claude JSONL files in Phase 1 to catch rendering edge cases before investing in theme and typography refinement
- Manifest schema must be designed early (Phase 3) even if presenter notes and section markers are not fully implemented until Phase 4 — retrofitting schema fields later is painful for any users who created manifests in Phase 3

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Electron + React is a well-trodden path with extensive documentation. Technology choices are conservative and proven. Version numbers need npm verification before project start (web search unavailable during research). |
| Features | HIGH | Feature set derived from analysis of multiple comparable tools (reveal.js, Asciinema, Slidev, ChatGPT share links). Table stakes features are unambiguous. Differentiator prioritization is well-reasoned. |
| Architecture | HIGH | Five-component pipeline is standard for ETL-style data transformation. Component responsibilities and data contracts are clearly defined. Build order follows hard dependencies. |
| Pitfalls | HIGH | Pitfalls are grounded in the actual Claude Code JSONL format characteristics (parentUuid threading, tool_use/tool_result pairing, isSidechain flags) and real rendering edge cases. |

**Overall confidence:** HIGH

### Gaps to Address

- **Claude Code JSONL schema validation against real files:** The parser and classifier designs assume specific field names (`uuid`, `parentUuid`, `isSidechain`, `isMeta`, `tool_use_id`). These must be verified against actual `.claude/projects/` session files before writing the Parser. Grab 5-10 real files of varying sizes and complexity.

- **npm package version verification:** All library versions in STACK.md are marked with (*) indicating they were estimated from pre-May 2025 knowledge. Run `npm view [package] version` for all key packages before creating `package.json`.

- **AskUserQuestion tool call schema:** The specific JSON schema for AskUserQuestion (question text, options array, selected option) is assumed but not verified. Inspect real conversation files containing AskUserQuestion calls before building the specialized renderer.

- **Manifest file schema design:** The format for the demo playlist manifest (session ordering, section markers, presenter notes) needs deliberate design in Phase 3. This is the user-facing configuration artifact and is the hardest thing to change after users adopt it. Consider investing in a short design spike before implementation.

- **Typewriter reveal feasibility with react-markdown:** Animating markdown rendering word-by-word requires either streaming character output into the markdown parser (fragile) or a two-phase approach (render full markdown, then progressively reveal with CSS animation). This needs a proof-of-concept before committing to D-2.

---

## Sources

### Primary (HIGH confidence)
- ARCHITECTURE.md research — Claude Code JSONL structure analysis, component pipeline design, data contracts
- FEATURES.md research — comparable tool feature analysis (reveal.js, Asciinema, Slidev, Jupyter nbviewer, ChatGPT share links)
- STACK.md research — Electron vs. Tauri vs. alternatives analysis, library recommendations with rationale
- PITFALLS.md research — 10 documented failure modes grounded in JSONL format specifics and presentation tool UX patterns

### Secondary (MEDIUM confidence)
- Electron official documentation patterns — contextBridge IPC, Electron Forge packaging
- react-markdown + remark ecosystem documentation — plugin architecture, GFM support
- reveal.js feature set — speaker notes, themes, fragments, hash navigation (used as feature benchmark)

### Tertiary (LOW confidence — verify before implementation)
- Specific npm package versions — estimated from knowledge through May 2025; must be verified with `npm view`
- Claude Code JSONL field names — inferred from architecture analysis; must be verified against actual session files
- AskUserQuestion tool call schema — assumed structure; must be verified against real conversation files

---
*Research completed: 2026-02-20*
*Ready for roadmap: yes*
