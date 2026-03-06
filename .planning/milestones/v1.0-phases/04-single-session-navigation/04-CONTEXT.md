# Phase 4: Single-Session Navigation - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Step forward and backward through a single conversation using keyboard or mouse, with progress tracking. Navigation operates on narrative messages only (plumbing tool calls are skipped). This phase covers one session — multi-session playback is Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Step granularity
- Each step = one user+Claude message pair (not individual messages)
- Claude's response starts in a collapsed preview state by default
- Expanding/collapsing a response is a manual UI toggle, NOT a navigation step
- Forward/backward always move between pairs regardless of expand/collapse state
- Both user messages and Claude responses are collapsible (long user messages with pasted code, etc.)
- Expand/collapse state is remembered — if you expand a response, step away, and come back, it stays expanded

### Navigation feel
- Slideshow-style: only the current message pair is visible at any time (not a growing chat log)
- Previous messages are NOT visible — current step only
- Transition animation and overflow behavior: Claude's discretion

### Progress indicator
- Style, position, visibility, and interactivity: Claude's discretion
- Must show current step N of M within the session (per success criteria)

### Step controls
- Keyboard: right arrow and spacebar for forward, left arrow for back
- Home key jumps to first step, End key jumps to last step
- On-screen buttons: subtle forward/back buttons (placement at Claude's discretion)
- Click behavior for forward navigation: Claude's discretion (must not conflict with expand/collapse)

### Claude's Discretion
- Collapsed preview content (what to show in the collapsed state)
- Transition animation between steps (instant, fade, slide — whatever feels right)
- Overflow handling for expanded long content (scroll within or grow page)
- Progress indicator style (counter, bar, dots), position, visibility, and whether it's clickable
- On-screen button placement (edge arrows, bottom bar, etc.)
- Click-to-advance target area (must coexist with expand/collapse clicks)

</decisions>

<specifics>
## Specific Ideas

- Presentation tool mental model — this should feel like PowerPoint/Keynote, not a chat app
- The collapsed state is for the presenter's benefit — they can expand to show details when the audience needs to see them, or skip past when they don't

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-single-session-navigation*
*Context gathered: 2026-02-21*
