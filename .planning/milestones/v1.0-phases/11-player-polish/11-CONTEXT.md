# Phase 11: Player Polish - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Player delivers a fully polished presentation experience with elapsed-time markers between steps and theme application from presentation config. Timestamps show pacing (elapsed time), not wall-clock time. Theme follows the .promptplay file's configured setting with a runtime toggle in the Player for on-the-fly adaptation.

</domain>

<decisions>
## Implementation Decisions

### Timestamp display
- Show **elapsed time only** between navigation steps (not wall-clock time)
- Elapsed-time markers appear **between steps** as a centered pill on a thin horizontal rule (timeline marker style: ——— 2m 30s ———)
- Session separator cards show **session duration** as additional metadata alongside existing step/message counts
- Section separator cards show **section duration** alongside existing stats
- Inter-session gaps (breaks, overnights) get **no display** — they hold no presentation value
- Elapsed time is calculated from the previous navigation step's timestamp to the current step's timestamp

### Timestamp formatting
- **Smart relative format** that adapts to magnitude:
  - `<1s` for sub-second (always shown, not hidden)
  - `12s` for seconds
  - `2m 30s` for minutes
  - `1h 5m` for hours
  - Drop smaller unit when larger is big enough (no `1h 0m 12s`)
- Same format used for both elapsed markers and session/section duration on separator cards
- Consistent formatting convention across all time displays

### Timestamp edge cases
- **Missing timestamps**: hide the elapsed marker entirely (no placeholder, no error)
- **First step**: no marker — there's no previous step to measure from
- Markers only appear when both the previous and current step have valid timestamps

### Theme application
- Player **respects the .promptplay file's theme setting** as the default (light/dark/system)
- Player adds a **small sun/moon toggle** in the progress bar area for runtime override
- Toggle is ephemeral — resets to the file's default on next open
- `system` option stays in Builder (light/dark/system) — means "follow OS preference unless toggled"
- When `system` is configured, Player resolves to OS preference at load time, then toggle overrides from there

### Claude's Discretion
- Exact pill/badge styling for the elapsed-time divider (colors, font size, padding)
- Toggle icon design and hover behavior in the progress bar
- How to resolve `system` theme on load (nativeTheme.shouldUseDarkColors or equivalent)
- Transition animation when toggling themes (instant vs smooth fade)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `theme.css`: Full light/dark CSS custom property system with `[data-theme="dark"]` selector — theme switching is just a DOM attribute change
- `useTheme.ts`: Hook that follows system theme via `electronAPI.getTheme()` and `onThemeChange()` — needs modification to check presentation config first
- `PlaybackPlayer.tsx`: Main playback renderer — has access to `presentation.settings` and `steps[]`
- `SeparatorCard.tsx`: Already renders session/section separator cards with stats — add duration here
- `StepView.tsx`: Renders individual navigation steps — elapsed marker goes above this
- `SegmentedProgress.tsx`: Bottom progress bar — theme toggle button goes here
- `playbackStore.ts`: Has access to all sessions, steps, and presentation config

### Established Patterns
- `ParsedMessage.timestamp`: ISO string on every message — source data for elapsed calculations
- `PresentationSettings.showTimestamps: boolean`: Already wired in Builder settings panel (simple on/off toggle)
- `PresentationSettings.theme: 'light' | 'dark' | 'system'`: Already in the data model
- `data-theme` attribute on `documentElement`: Established pattern for theme switching
- Module-level style constants: Used throughout Player components for static styles (per Pitfall 4 pattern)
- `NavigationPlaybackStep.step.userMessage.timestamp` / `assistantMessage.timestamp`: Timestamp access path

### Integration Points
- `PlaybackPlayer.tsx`: Inject elapsed-time component between step transitions
- `SeparatorCard.tsx`: Add duration stat to existing card layout
- `SegmentedProgress.tsx`: Add theme toggle button
- `playbackStore.ts`: May need to expose presentation settings for components to read
- `useTheme.ts`: Modify to accept an override theme from Player context

</code_context>

<specifics>
## Specific Ideas

- Elapsed-time divider should look like a timeline marker: thin line with a small pill centered on it
- Session/section duration is just another stat alongside the existing step count and message count on separator cards
- Theme toggle should be subtle and unobtrusive — the audience shouldn't notice it during a presentation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-player-polish*
*Context gathered: 2026-03-03*
