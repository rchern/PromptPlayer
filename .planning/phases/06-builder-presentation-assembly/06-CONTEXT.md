# Phase 6: Builder Presentation Assembly - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

User can create an ordered, sectioned presentation from selected conversation sessions. Sessions are assembled into a hierarchical structure (sections containing sessions), named with friendly labels, and auto-sorted chronologically. This phase covers the Builder assembly workflow only — Player playback, export format, and display configuration are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Creation flow
- User starts by selecting sessions from the session library, then clicks "Create presentation from selected"
- Sessions can come from any project — presentations are not scoped to a single project
- Sessions are references, not copies — the same session can appear in multiple presentations
- User can work on multiple presentations (tabs or list to switch between them)
- Adding more sessions after initial creation: Claude's discretion on approach (return to library vs side panel vs other)

### Organization model
- One level of nesting: top-level sections contain sessions inside them
- Each session auto-gets its own section when added (named after the session)
- User can merge sections to group related sessions (e.g., pause-work/resume-work splits of the same logical step)
- Auto-grouping suggestion when adding multiple sessions: Claude's discretion on whether to include in v1 or defer — if deferred, note for future (detect GSD phase patterns from command metadata to suggest section grouping)

### Reordering
- Sessions auto-sort chronologically — no manual reordering in v1
- Sort key: Claude's discretion based on available metadata from Phase 2/5
- Manual reordering (drag-and-drop or up/down buttons) noted as future enhancement

### Naming & labeling
- Presentations auto-named on creation (e.g., project name + date), user renames inline later
- Sessions labeled with auto-generated friendly names derived from metadata (not raw command strings)
- Both section names and session names use inline click-to-edit (click text, it becomes editable, confirm with Enter or blur)
- Consistent interaction pattern across all nameable elements

### Claude's Discretion
- How to add more sessions after initial creation (UI approach)
- Whether smart auto-grouping by GSD phase pattern is feasible for v1 or deferred
- Chronological sort key (session start time, first message timestamp, etc.)
- Auto-generated friendly name format for sessions
- Auto-name format for new presentations

</decisions>

<specifics>
## Specific Ideas

- "The ultimate goal is: here's the simple prompt I started with => here's how GSD guided me through creating a full feature"
- Presentations will commonly contain 30+ sessions spanning an entire GSD milestone (11 phases x ~3 sessions each)
- GSD command metadata (e.g., `/gsd:execute-phase 3`) is available in session metadata from Phase 2 — useful for smart naming/grouping
- Sections map naturally to GSD phases in the presenter's mental model ("Phase 3: Message Rendering" section containing discuss/plan/execute sessions)

</specifics>

<deferred>
## Deferred Ideas

- Manual reordering (drag-and-drop or up/down buttons) — future enhancement if chronological isn't sufficient
- Smart auto-grouping by GSD phase pattern detection — if not included in v1, capture for future
- Multi-.promptplay file playback (playing multiple presentation files together, e.g., one per milestone) — future capability
- Smart Player playback (Player being intelligent about what to emphasize vs skim through) — Phase 8 territory

</deferred>

---

*Phase: 06-builder-presentation-assembly*
*Context gathered: 2026-02-22*
