# PromptPlayer

## What This Is

A two-mode desktop app (Builder + Player) that turns Claude Code sessions into step-through presentation demos. The Builder imports JSONL conversation files, lets the presenter curate and configure a multi-session walkthrough, and exports a self-contained `.promptplay` file. The Player opens that file and provides a clean, distraction-free step-through experience — showing what the user sent, what Claude responded, and key interactive moments like AskUserQuestion prompts and task management.

## Core Value

Enable a presenter to walk their team through a real Claude Code / GSD workflow from idea to implementation, step by step, without having to narrate from memory or scroll through raw JSON.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Two-mode architecture: Builder for curation/configuration, Player for presentation
- [ ] Builder: Import Claude Code JSONL conversation files from `.claude/projects/` into app-local storage
- [ ] Builder: Browse/search/preview imported sessions to select which to include
- [ ] Builder: Assemble an ordered session chain forming a complete workflow
- [ ] Builder: Define named sections/chapters across the session chain
- [ ] Builder: Configure tool call visibility (which tool types to show/hide)
- [ ] Builder: Export a self-contained `.promptplay` presentation artifact
- [ ] Player: Open `.promptplay` files
- [ ] Player: Step through messages manually (forward/back) with keyboard or click
- [ ] Player: Display user messages clearly distinguished from Claude responses
- [ ] Player: Render Claude's markdown responses with proper formatting and syntax highlighting
- [ ] Player: Show AskUserQuestion tool calls with the options presented and the user's selection
- [ ] Player: Show Task management tool calls (TaskCreate, TaskUpdate, TaskList) inline
- [ ] Player: Hide "plumbing" tool calls by default (Read, Grep, Glob, Write, Edit, Bash, etc.)
- [ ] Player: Transition seamlessly between sessions in a chain
- [ ] Player: Show current position (which section, which session, which step, progress)
- [ ] Player: Display timestamps / elapsed time between steps
- [ ] Player: Support light and dark themes (optimized for projector and screen share)
- [ ] Run on Windows 10/11

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

- Claude Code stores conversations as JSONL in the user's `.claude/projects/` directory, but Claude Code may clean up old sessions — app must import/copy conversation data into its own storage to prevent data loss
- A typical GSD workflow spans multiple conversations (user runs `/clear` between GSD commands), so a single demo requires chaining 5-15+ separate session files
- The JSONL format uses UUID-based threading (parentUuid chains), message types (user, assistant, progress, file-history-snapshot), content blocks (text, thinking, tool_use, tool_result), and metadata (isSidechain, isMeta)
- The primary demo scenario is walking a dev team through how GSD takes a feature idea from description → questioning → research → requirements → roadmap → planning → execution
- Audience is primarily developers who might adopt Claude Code / GSD, but could include PMs or BAs
- The presenter is a senior developer / manager explaining their workflow

## Constraints

- **Platform**: Must run on Windows 10/11
- **Data source**: Must parse Claude Code's native JSONL conversation format; imports into app-local storage to avoid dependency on volatile `.claude/projects/` directory
- **Presentation context**: Optimized for screen sharing / projector — needs to be readable at a distance
- **Tech stack**: Electron + React + TypeScript (determined by research phase)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Two-mode architecture (Builder + Player) | Builder handles complexity (import, curate, configure); Player stays simple (render, navigate) | — Pending |
| Same app, two modes | Builder preview shares rendering with Player; one app to maintain | — Pending |
| Self-contained .promptplay export | Portable, survives Claude Code cleanup, could enable sharing later | — Pending |
| Manual stepping as primary navigation | Presenter needs control over pacing, especially with variable-length responses | — Pending |
| Session chain via ordered manifest | GSD workflows span multiple conversations; need a way to sequence them | — Pending |
| Show only "narrative" tool calls | AskUserQuestion and Task management tell the story; file reads/greps are noise | — Pending |
| Electron + React + TypeScript | Best markdown rendering (web engine), desktop shell for presentation, familiar ecosystem | — Pending |
| Import conversations into app-local storage | Claude Code may clean up `.claude/projects/`; demos must persist independently | — Pending |

---
*Last updated: 2026-02-20 after Builder/Player architecture decision*
