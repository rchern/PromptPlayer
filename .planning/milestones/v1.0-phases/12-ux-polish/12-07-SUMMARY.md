---
phase: 12-ux-polish
plan: 07
subsystem: ui
tags: [react, tool-visibility, filmstrip, player, presentation-settings]

requires:
  - phase: 12-ux-polish
    provides: Combined solo assistant steps filmstrip rendering (12-04)
  - phase: 07-builder-config-export
    provides: ToolCategoryConfig and per-tool visibility settings
provides:
  - Per-tool visibility map flow from presentation settings to ContentBlockRenderer
  - MessageBubble null suppression when all content blocks are hidden
  - Backward-compatible toolVisibilityMap optional prop alongside showPlumbing
affects: [player, builder, message-rendering]

tech-stack:
  added: []
  patterns: [dual-visibility-system-reconciliation, optional-prop-override-pattern]

key-files:
  created: []
  modified:
    - src/renderer/src/components/message/ContentBlockRenderer.tsx
    - src/renderer/src/components/message/MessageBubble.tsx
    - src/renderer/src/components/player/StepView.tsx
    - src/renderer/src/components/player/PlaybackPlayer.tsx

key-decisions:
  - "toolVisibilityMap takes precedence over showPlumbing when provided, preserving backward compatibility for Builder's MessageList"
  - "MessageBubble returns null when all content blocks resolve to hidden, suppressing empty CLAUDE labels"
  - "toolVisibilityMap computed once in PlaybackPlayer via useMemo, passed through StepView to MessageBubble"

patterns-established:
  - "Optional override prop pattern: new prop (toolVisibilityMap) overrides old prop (showPlumbing) when provided, old prop continues to work for existing callers"

requirements-completed: [UX-POLISH-03]

duration: 4min
completed: 2026-03-04
---

# Phase 12 Plan 07: Fix Blank Combined Steps Summary

**Per-tool visibility map from presentation settings to ContentBlockRenderer, suppressing empty CLAUDE labels in combined filmstrip steps**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T01:19:28Z
- **Completed:** 2026-03-05T01:23:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ContentBlockRenderer now checks per-tool visibility via toolVisibilityMap for tool_use and tool_result blocks, instead of blanket showPlumbing boolean
- MessageBubble suppresses rendering (returns null) when all content blocks would resolve to null, eliminating empty "CLAUDE" labels
- PlaybackPlayer computes toolVisibilityMap from presentation.settings.toolVisibility and passes it through StepView to all MessageBubble instances
- Backward compatibility maintained: Builder's MessageList continues using showPlumbing-only path unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace showPlumbing boolean with per-tool visibility map in ContentBlockRenderer and MessageBubble** - `78efce0` (feat)
2. **Task 2: Wire per-tool visibility map through StepView from playback store** - `0d7b51a` (feat)

## Files Created/Modified
- `src/renderer/src/components/message/ContentBlockRenderer.tsx` - Added toolVisibilityMap and toolUseMap optional props; per-tool visibility check in tool_use and tool_result cases
- `src/renderer/src/components/message/MessageBubble.tsx` - Added toolVisibilityMap prop, hasVisibleContent pre-render check, passes both maps to ContentBlockRenderer
- `src/renderer/src/components/player/StepView.tsx` - Added toolVisibilityMap optional prop, passed to all four MessageBubble call sites
- `src/renderer/src/components/player/PlaybackPlayer.tsx` - Computes toolVisibilityMap from presentation.settings.toolVisibility via useMemo, passes to StepView

## Decisions Made
- toolVisibilityMap takes precedence over showPlumbing when provided, preserving backward compatibility for Builder's MessageList
- MessageBubble returns null (not empty div) when all content blocks resolve to hidden -- this suppresses both the CLAUDE label and the empty bubble
- toolVisibilityMap computed once in PlaybackPlayer via useMemo and threaded through StepView, rather than computed in each MessageBubble

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Combined filmstrip steps now correctly render tool call content for enabled tools
- The dual visibility system (message-level filter + block-level renderer) is now reconciled
- Ready for remaining gap closure plans (12-08)

## Self-Check: PASSED

All 4 modified files verified present. Both task commits (78efce0, 0d7b51a) verified in git log.

---
*Phase: 12-ux-polish*
*Completed: 2026-03-04*
