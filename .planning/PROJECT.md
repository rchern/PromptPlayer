# PromptPlayer

## What This Is

A conversation replayer that turns Claude Code sessions into step-through demos. It loads one or more Claude Code conversation files (stored in `.claude/projects/`), sequences them into a cohesive walkthrough, and lets the presenter manually advance through messages — showing what the user sent, what Claude responded, and key interactive moments like AskUserQuestion prompts and task management.

## Core Value

Enable a presenter to walk their team through a real Claude Code / GSD workflow from idea to implementation, step by step, without having to narrate from memory or scroll through raw JSON.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Load Claude Code conversation files from `.claude/projects/` storage
- [ ] Define a session chain — an ordered list of conversation IDs that form a complete workflow
- [ ] Step through messages manually (forward/back) with keyboard or click
- [ ] Display user messages clearly distinguished from Claude responses
- [ ] Render Claude's markdown responses with proper formatting
- [ ] Show AskUserQuestion tool calls with the options presented and the user's selection
- [ ] Show Task management tool calls (TaskCreate, TaskUpdate, TaskList) inline
- [ ] Hide "plumbing" tool calls by default (Read, Grep, Glob, Write, Edit, Bash, etc.)
- [ ] Transition seamlessly between sessions in a chain
- [ ] Show current position in the overall session chain (which session, which step)
- [ ] Run on Windows 10/11

### Out of Scope

- Auto-play / timed playback — manual stepping is the primary mode, auto-play deferred
- Session search/discovery interface — v2 feature for finding conversations by content (e.g., `/gsd:*` commands)
- Presenter notes / annotations — nice-to-have, not v1
- Editing / skipping steps — nice-to-have, not v1
- Distribution to team members — presenter runs it on their own machine
- Mobile support — Windows desktop only

## Context

- Claude Code stores conversations as JSON in the user's `.claude/projects/` directory
- A typical GSD workflow spans multiple conversations (user runs `/clear` between GSD commands), so a single demo requires chaining 5-15+ separate session files
- The primary demo scenario is walking a dev team through how GSD takes a feature idea from description → questioning → research → requirements → roadmap → planning → execution
- Audience is primarily developers who might adopt Claude Code / GSD, but could include PMs or BAs
- The presenter is a senior developer / manager explaining their workflow

## Constraints

- **Platform**: Must run on Windows 10/11
- **Data source**: Must read Claude Code's native conversation storage format (JSON in `.claude/projects/`)
- **Presentation context**: Optimized for screen sharing / projector — needs to be readable at a distance

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manual stepping as primary navigation | Presenter needs control over pacing, especially with variable-length responses | — Pending |
| Session chain via ordered file/list | GSD workflows span multiple conversations; need a way to sequence them | — Pending |
| Show only "narrative" tool calls | AskUserQuestion and Task management tell the story; file reads/greps are noise | — Pending |
| Tech stack TBD | Will be determined by research phase | — Pending |

---
*Last updated: 2026-02-20 after initialization*
