# Phase 8: Player Multi-Session Playback - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Player opens .promptplay files and navigates seamlessly across session boundaries with section support. This phase delivers multi-session playback: file loading, cross-session navigation, section-aware progress, and section jump navigation. Presentation configuration, export format, and theme application are handled in other phases (7 and 11).

</domain>

<decisions>
## Implementation Decisions

### Session transitions
- Separator card appears between sessions when stepping from one session's last step to the next session's first step
- Separator card shows: session name, section it belongs to, and brief stats (step count, message count)
- Separator card is its own navigable step — presenter lands on it and presses forward to continue
- Backward navigation also lands on the separator card (consistent with forward — forward/back are exact inverses)

### Section navigation UI
- Persistent collapsible sidebar showing all sections and sessions
- Keyboard shortcut to toggle sidebar visibility (in addition to clickable toggle)
- Each section entry shows: section name, expandable list of session names, and per-section progress indicator
- Clicking a section jumps to a section separator card (distinct from session separator cards) that introduces the section
- Clicking an individual session within a section jumps to that session's separator card — granular navigation supported

### Progress indicator design
- Combined display: segmented progress bar + text information
- Text shows section name with both local and global progress, e.g., "Research (4/12) — 12 of 47 overall"
- Segmented bar visually divides progress across the presentation

### Claude's Discretion
- Progress indicator position (top vs bottom bar) — pick what works best with sidebar and content layout
- Segmented bar granularity (segments per section vs per session) — pick based on visual clarity
- Section separator card design (can differ from session separator cards or share a template)
- Error handling for corrupt/unparseable sessions in .promptplay files — pick the most presenter-friendly approach

### File loading experience
- Opening a .promptplay file shows a presentation overview first, not the first step
- Overview shows: presentation title, total steps, estimated duration, and section names
- Playback starts via any navigation action (spacebar, right arrow, click) — no explicit "Begin" button needed

</decisions>

<specifics>
## Specific Ideas

- Separator cards should give the presenter a natural pause point to orient the audience ("Now we're moving into the execution phase...")
- The sidebar is analogous to a PowerPoint slide sorter — always available, shows where you are and what's coming
- Overview screen serves as a "title slide" equivalent — the presenter can leave it up while introducing the demo

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-player-multi-session-playback*
*Context gathered: 2026-02-24*
