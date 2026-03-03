---
phase: 04-single-session-navigation
plan: 01
subsystem: ui
tags: [zustand, navigation, message-filtering, typescript, state-management]

# Dependency graph
requires:
  - phase: 03-message-rendering
    provides: MessageList component with filterVisibleMessages and buildToolUseMap logic
provides:
  - NavigationStep type definition for user+assistant message pairing
  - Shared messageFiltering utility (filterVisibleMessages, isEmptyAfterCleaning, buildNavigationSteps, buildToolUseMap)
  - Zustand navigation store (useNavigationStore) with step management and expand/collapse state
affects: [04-02 Player UI, 05-presentation-mode]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared utility extraction from components, navigation step pairing pattern, per-step expand/collapse state]

key-files:
  created:
    - src/renderer/src/utils/messageFiltering.ts
    - src/renderer/src/stores/navigationStore.ts
  modified:
    - src/renderer/src/types/pipeline.ts
    - src/renderer/src/components/message/MessageList.tsx

key-decisions:
  - "NavigationStep uses explicit userMessage/assistantMessage fields (not generic pair) for role-specific rendering"
  - "Solo assistant messages produce { userMessage: null, assistantMessage: msg } -- never placed in userMessage field"
  - "Expand/collapse state stored in Zustand (persists across step navigation), not component state"
  - "initializeSteps filters with showPlumbing=false then builds steps (Player never shows plumbing)"

patterns-established:
  - "Shared utils pattern: pure functions extracted from components to src/renderer/src/utils/ for cross-route reuse"
  - "Navigation step pairing: user+assistant grouped as atomic navigation units"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Phase 4 Plan 1: Navigation Data Layer Summary

**NavigationStep type with user+assistant pairing, shared message filtering utility, and Zustand navigation store with step/expand state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-22T03:47:50Z
- **Completed:** 2026-02-22T03:49:58Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Defined NavigationStep interface pairing user+assistant messages as atomic navigation units
- Extracted filterVisibleMessages, isEmptyAfterCleaning, buildToolUseMap to shared utility for cross-route reuse
- Implemented buildNavigationSteps with correct handling of solo assistant messages (userMessage=null, not misplaced)
- Created Zustand navigation store with full step navigation (next/prev/goTo/first/last) and per-step expand/collapse tracking

## Task Commits

Each task was committed atomically:

1. **Task 1: Add NavigationStep type, extract message filtering and buildToolUseMap, implement buildNavigationSteps** - `4e6aa2c` (feat)
2. **Task 2: Create Zustand navigation store with step management and expand/collapse state** - `050f9e8` (feat)

## Files Created/Modified
- `src/renderer/src/types/pipeline.ts` - Added NavigationStep interface after StitchedSession
- `src/renderer/src/utils/messageFiltering.ts` - New shared utility with filterVisibleMessages, isEmptyAfterCleaning, buildToolUseMap, buildNavigationSteps
- `src/renderer/src/stores/navigationStore.ts` - New Zustand store with step array, currentStepIndex, expandedSteps, and all navigation actions
- `src/renderer/src/components/message/MessageList.tsx` - Refactored to import from shared utility instead of local definitions

## Decisions Made
- **NavigationStep field naming:** Used explicit `userMessage`/`assistantMessage` instead of generic `pair[0]`/`pair[1]` because rendering differs by role and the type should be self-documenting
- **Solo assistant handling:** Assistant messages without preceding user create `{ userMessage: null, assistantMessage: msg }` -- the CRITICAL invariant that prevents assistant content from rendering with user styling
- **Expand/collapse in Zustand:** Stored in the navigation store rather than component state so expand/collapse persists when navigating between steps
- **initializeSteps always hides plumbing:** Calls `filterVisibleMessages(messages, false)` because the Player route never shows plumbing tool calls
- **buildToolUseMap extracted alongside filtering:** Both Builder and Player need the tool use lookup for rejection display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Navigation data layer complete and ready for Player UI consumption (Plan 02)
- useNavigationStore.initializeSteps() accepts raw ParsedMessage[] and handles all filtering/pairing internally
- Plan 02 can call initializeSteps() then read steps/currentStepIndex to render the StepView component
- buildToolUseMap available from shared utility for rejection display in StepView

## Self-Check: PASSED

---
*Phase: 04-single-session-navigation*
*Completed: 2026-02-22*
