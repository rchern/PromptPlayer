# Phase 9: Specialized Tool Call Display - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Narrative tool calls (AskUserQuestion, TaskCreate, TaskUpdate, TaskList) render with meaningful, presentation-quality formatting instead of generic one-line summaries. This phase upgrades existing basic rendering for AskUserQuestion and creates new renderers for Task management tools.

Out of scope: Plumbing tool renderers, new tool classifications, playback controls, animation systems.

</domain>

<decisions>
## Implementation Decisions

### AskUserQuestion Display
- Show the header label (e.g., "Discuss", "Auth method") as a tag/label above the question text
- Option descriptions should be expandable — show labels by default, expand for full descriptions
- Must show which option(s) the user selected (success criterion #1)

### Claude's Discretion: AskUserQuestion
- Visual form style (radio/checkbox vs pill selection vs other) — pick what fits the existing design language
- Multi-select vs single-select visual distinction — pick based on clarity
- Multi-question layout (stacked in one block vs separate blocks)
- "Other" (free-text) answer display format

### Task Management Display
- TaskUpdate should prominently highlight status changes (pending → in_progress → completed)
- Other TaskUpdate field changes (subject, description, dependencies) can be quieter/secondary
- TaskList should display tasks as a formatted summary (checklist, table, or similar)

### Claude's Discretion: Task Management
- TaskCreate display format (card vs inline announcement vs other)
- TaskUpdate display format and how non-status fields render
- TaskList format (checklist, mini table, or other)
- Status color-coding approach (if any)

### Visual Density & Polish
- Specialized blocks should be visually coherent with the existing app style

### Claude's Discretion: Visual Density
- Prominence level of specialized blocks vs surrounding markdown
- Icons/emoji per tool type (or text labels only)
- TaskList collapsibility for long lists
- Animation/transitions during playback

</decisions>

<specifics>
## Specific Ideas

- User wants status changes to be the most prominent part of TaskUpdate — "I like highlighting that the status has changed, but I dunno how much I care about the other stuff"
- Option descriptions should be expandable (labels by default) — user explicitly chose this over always-show or labels-only
- Header labels should be shown — user explicitly chose this over question-only

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-specialized-tool-call-display*
*Context gathered: 2026-02-28*
