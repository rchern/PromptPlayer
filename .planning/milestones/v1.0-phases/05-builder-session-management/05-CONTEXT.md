# Phase 5: Builder Session Management - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Import, browse, search, and preview conversation sessions in Builder mode. Users can find sessions from auto-discovery or manual import, filter/search across them, and preview conversation content before adding to a presentation. Creating presentations and assembling session order are separate phases (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Session list presentation
- Switchable views: project-grouped (default) and flat chronological — toggle between them
- Each session item shows: date/time, message count, command/snippet preview, duration
- Project-grouped view collapses sessions under project path headers

### Search and filtering
- Keyword search matches against: session title/command, full message content, project name/path
- Date filtering: quick presets (Today, This week, This month, Older) plus custom date range picker
- Both search and filter controls always visible (not hidden behind a button)

### Session preview
- Clicking a session shows a summary header + full scrollable conversation below
- Summary header includes: message/step count, session duration, project path
- Preview hides plumbing tool calls (same as Player — narrative messages only)

### Import and discovery flow
- Three import methods: auto-discover from ~/.claude, manual file picker (Import button), drag-and-drop JSONL files
- Auto-scan runs on Builder open + manual refresh button for picking up new sessions
- Files referenced in-place (path stored, not copied) — .promptplay export (Phase 7) handles self-contained bundling
- Scanning shows a progress indicator with count of sessions found

### Claude's Discretion
- Session list visual density (compact rows vs cards) — pick based on metadata volume
- Search/filter control layout (separate bar vs combined token bar)
- Project filter implementation (dedicated dropdown vs part of search)
- Preview panel layout (side-by-side split vs full overlay)
- Whether key commands appear in preview summary header

</decisions>

<specifics>
## Specific Ideas

- Project-grouped view should feel familiar from the existing home screen browse UI (Phase 2)
- Preview should reuse Phase 3 rendering components for conversation display
- "File not found" state needed for referenced sessions whose source file has been moved/deleted

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-builder-session-management*
*Context gathered: 2026-02-22*
