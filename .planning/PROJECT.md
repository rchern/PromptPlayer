# PromptPlayer

## What This Is

A two-mode desktop app (Builder + Player) that turns Claude Code sessions into step-through presentation demos. The Builder imports JSONL conversation files, lets the presenter curate and configure a multi-session walkthrough, and exports a self-contained `.promptplay` file. The Player opens that file and provides a clean, distraction-free step-through experience — showing what the user sent, what Claude responded, and key interactive moments like AskUserQuestion prompts and task management.

## Core Value

Enable a presenter to walk their team through a real Claude Code / GSD workflow from idea to implementation, step by step, without having to narrate from memory or scroll through raw JSON.

## Requirements

### Validated

- ✓ Two-mode architecture: Builder for curation/configuration, Player for presentation — v1.0
- ✓ Builder: Import Claude Code JSONL conversation files from `.claude/projects/` into app-local storage — v1.0
- ✓ Builder: Browse/search/preview imported sessions to select which to include — v1.0
- ✓ Builder: Assemble an ordered session chain forming a complete workflow — v1.0
- ✓ Builder: Define named sections/chapters across the session chain — v1.0
- ✓ Builder: Configure tool call visibility (which tool types to show/hide) — v1.0
- ✓ Builder: Export a self-contained `.promptplay` presentation artifact — v1.0
- ✓ Player: Open `.promptplay` files — v1.0
- ✓ Player: Step through messages manually (forward/back) with keyboard or click — v1.0
- ✓ Player: Display user messages clearly distinguished from Claude responses — v1.0
- ✓ Player: Render Claude's markdown responses with proper formatting and syntax highlighting — v1.0
- ✓ Player: Show AskUserQuestion tool calls with the options presented and the user's selection — v1.0
- ✓ Player: Show Task management tool calls (TaskCreate, TaskUpdate, TaskList) inline — v1.0
- ✓ Player: Hide "plumbing" tool calls by default (Read, Grep, Glob, Write, Edit, Bash, etc.) — v1.0
- ✓ Player: Transition seamlessly between sessions in a chain — v1.0
- ✓ Player: Show current position (which section, which session, which step, progress) — v1.0
- ✓ Player: Display timestamps / elapsed time between steps — v1.0
- ✓ Player: Support light and dark themes (optimized for projector and screen share) — v1.0
- ✓ Run on Windows 10/11 — v1.0

### Active

(Fresh for next milestone — define with `/gsd:new-milestone`)

### Out of Scope

- Auto-play / timed playback — manual stepping is the primary mode, auto-play deferred
- Presenter notes / annotations — v2 feature
- Collapsible/expandable tool call details — v2 feature
- Search within conversation — v2 feature
- Typewriter / animated message reveal — v2 feature
- Code diff view for Edit tool calls — v2 feature
- Dual-screen presenter mode — v2 feature
- Deep links to specific steps — v2 feature
- File tree / artifact summary panel — v2 feature
- Static HTML export — v2 feature
- Distribution to team members — presenter runs it on their own machine
- Mobile support — Windows desktop only
- Real-time collaboration — single presenter tool
- Conversation editing / message modification — authenticity is the value prop
- Live Claude API integration — replay only, not an IDE

## Context

Shipped v1.0 with ~12,000 LOC TypeScript/TSX/CSS.
Tech stack: Electron 40 + React 19 + TypeScript + electron-vite 3.x + Zustand + shiki.
13 phases, 47 plans executed over 13 days (Feb 20 → Mar 5, 2026).
38/38 v1 requirements verified.

Known issues carried forward:
- Renderer bundle at 810KB includes all shiki grammars — consider fine-grained bundling if size becomes a concern
- queue-operation messages not parsed (user messages typed while agents run) — needs parser change
- npm audit reports 2 high severity vulnerabilities in eslint dependency chain
- AskUserQuestion tool call schema assumed but unverified (Phase 9)
- 4 debug sessions open (blank-combined-steps, close-button-flicker, empty-recent-files, live-preview-reactivity)

## Constraints

- **Platform**: Must run on Windows 10/11
- **Data source**: Must parse Claude Code's native JSONL conversation format; imports into app-local storage to avoid dependency on volatile `.claude/projects/` directory
- **Presentation context**: Optimized for screen sharing / projector — needs to be readable at a distance
- **Tech stack**: Electron 40 + React 19 + TypeScript + electron-vite 3.x

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Two-mode architecture (Builder + Player) | Builder handles complexity (import, curate, configure); Player stays simple (render, navigate) | ✓ Good — clean separation |
| Same app, two modes | Builder preview shares rendering with Player; one app to maintain | ✓ Good — significant code reuse |
| Self-contained .promptplay export | Portable, survives Claude Code cleanup, could enable sharing later | ✓ Good — works well |
| Manual stepping as primary navigation | Presenter needs control over pacing, especially with variable-length responses | ✓ Good — core UX |
| Session chain via ordered manifest | GSD workflows span multiple conversations; need a way to sequence them | ✓ Good — flexible |
| Show only "narrative" tool calls | AskUserQuestion and Task management tell the story; file reads/greps are noise | ✓ Good — cleaner presentations |
| Electron + React + TypeScript | Best markdown rendering (web engine), desktop shell for presentation, familiar ecosystem | ✓ Good |
| Import conversations into app-local storage | Claude Code may clean up `.claude/projects/`; demos must persist independently | ✓ Good — prevents data loss |
| JSON file persistence over electron-store | electron-store v11 ESM-only incompatible with electron-vite 3.x CJS output | ✓ Good — simple, works |
| Separator cards as real navigable steps | Ensures forward/back are exact inverses at session boundaries | ✓ Good — predictable UX |
| NSIS assisted installer (not oneClick) | Allows desktop shortcut opt-out, standard install experience | ✓ Good |
| shiki for syntax highlighting | Accurate language grammars, dual-theme support via CSS variables | ⚠️ Revisit — 810KB bundle |
| wasm-unsafe-eval in CSP for shiki | Required for WASM execution, no alternative for shiki's approach | ✓ Acceptable trade-off |

---
*Last updated: 2026-03-05 after v1.0 milestone*
