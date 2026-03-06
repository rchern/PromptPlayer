---
phase: 12-ux-polish
plan: 06
subsystem: ui
tags: [react, css, event-propagation, theme-override, elapsed-time]

# Dependency graph
requires:
  - phase: 12-ux-polish
    provides: Builder live preview with scoped theme and tool filtering
provides:
  - Working close/delete buttons on presentation tabs (no flicker)
  - Scoped [data-theme='light'] CSS rule for preview inside dark app
  - MessageList showTimestamps prop with ElapsedTimeMarker between messages
  - Builder live preview reflecting theme and timestamp settings immediately
affects: [builder, player, message-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onClick with stopPropagation for nested interactive elements (not onMouseDown)"
    - "[data-theme='light'] CSS attribute selector for scoped theme override"
    - "Elapsed time markers between messages in Builder preview (reusing ElapsedTimeMarker)"

key-files:
  created: []
  modified:
    - src/renderer/src/components/builder/PresentationList.tsx
    - src/renderer/src/styles/theme.css
    - src/renderer/src/components/message/MessageList.tsx
    - src/renderer/src/routes/Builder.tsx

key-decisions:
  - "onClick (not onMouseDown) for close/delete buttons -- stopPropagation on click prevents parent onClick from re-selecting"
  - "Light theme CSS rule mirrors :root color variables for scoped override via data-theme attribute"
  - "ElapsedTimeMarker reused from Player for Builder preview timestamp rendering"

patterns-established:
  - "onClick with stopPropagation for nested buttons inside clickable parents"
  - "Scoped theme override via [data-theme] CSS selector on wrapper div"

requirements-completed: [UX-POLISH-01, UX-POLISH-02]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 12 Plan 06: Close Button Fix and Live Preview Reactivity Summary

**Fixed presentation tab close/delete button flicker and added live theme + timestamp rendering to Builder preview**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T01:19:17Z
- **Completed:** 2026-03-05T01:21:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Close button on presentation tabs now properly deselects without flicker (onMouseDown to onClick fix)
- Delete button triggers confirmation dialog without parent re-selecting the tab
- Builder live preview reflects theme changes immediately via scoped [data-theme="light"] CSS rule
- Builder live preview shows elapsed time markers between messages when showTimestamps is enabled

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix close/delete button event propagation** - `611ab69` (fix)
2. **Task 2: Add light theme CSS override and timestamp support** - `9a605a5` (feat)

## Files Created/Modified
- `src/renderer/src/components/builder/PresentationList.tsx` - Changed close/delete buttons from onMouseDown to onClick
- `src/renderer/src/styles/theme.css` - Added [data-theme="light"] CSS rule with all light color variables
- `src/renderer/src/components/message/MessageList.tsx` - Added showTimestamps prop and ElapsedTimeMarker rendering between messages
- `src/renderer/src/routes/Builder.tsx` - Passes showTimestamps from presentation settings to MessageList

## Decisions Made
- onClick (not onMouseDown) for close/delete buttons -- stopPropagation on click prevents parent onClick from re-selecting the tab. onMouseDown stopPropagation only stops the mousedown event, not the subsequent click.
- Light theme CSS rule copies all color/shadow variables from :root into [data-theme="light"] for scoped override.
- Reused existing ElapsedTimeMarker and computeElapsedMs from Player for Builder preview consistency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT gaps 2 (close button flicker) and 3 (live preview reactivity) are closed
- Remaining gap closure plans (12-07, 12-08) can proceed independently

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 12-ux-polish*
*Completed: 2026-03-04*
