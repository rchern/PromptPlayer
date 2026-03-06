# Phase 2: Data Pipeline - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Parse raw JSONL conversation files from ~/.claude/projects/ into structured, ordered, classified message sequences. Sessions are browsed directly from source files — only sessions added to a presentation get persisted into app-local storage. This phase builds the parsing, stitching, classification, and storage layers.

</domain>

<decisions>
## Implementation Decisions

### Import experience
- No bulk "import" step — app reads JSONL files directly from ~/.claude/projects/ for browsing
- Auto-discover from ~/.claude/projects/ on app launch and on manual refresh
- "Browse other location" fallback for files from other machines or backups
- Only sessions the user adds to a presentation get copied into app-local storage
- Sessions are browsed/previewed from source files without copying

### Session identity & metadata
- Browse list shows: project folder name, date, and a snippet of the first user message
- Sessions grouped by project, sorted by date within each group
- Show all sessions regardless of length (no filtering of short/false-start sessions)

### Tool call classification
- Default classification applied at parse time — Builder (Phase 7) allows overrides per-type or per-instance
- **Plumbing (hidden by default):** Read, Grep, Glob, Write, Edit, Bash
- **Narrative (shown by default):** AskUserQuestion, TaskCreate, TaskUpdate, TaskList
- **Thinking blocks:** hidden by default
- tool_result inherits the same classification as its paired tool_use (always classified together)
- When a Claude response contains both text and tool calls, the text portion is still shown even when tool calls are hidden

### Error handling
- Unparseable JSONL files appear in browse list with an error badge (not silently excluded)
- Orphaned messages (broken parentUuid chain) included via best-effort ordering (by timestamp)
- Sidechains excluded from the linear thread, but branch points are marked with a subtle indicator
- Malformed individual JSONL lines within a parseable file: skipped (handling details at Claude's discretion)

### Claude's Discretion
- Import feedback UX (progress indicator style during scanning)
- Whether to show message count per session in browse list
- Malformed line handling (silent skip vs subtle warning)
- Exact error badge design for unparseable files

</decisions>

<specifics>
## Specific Ideas

- The mental model is "browse from source, persist on use" — the app is a lens on ~/.claude/projects/, not a separate database
- Auto-discover on launch keeps the session list fresh without manual intervention

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-data-pipeline*
*Context gathered: 2026-02-21*
