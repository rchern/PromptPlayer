---
phase: 09-specialized-tool-call-display
plan: 01
subsystem: ui
tags: [react, ask-user-question, tool-rendering, expand-collapse]

# Dependency graph
requires:
  - phase: 03-message-rendering
    provides: ThinkingBlock expand/collapse pattern, ToolCallBlock dispatch, cleanUserText utilities
  - phase: 04-single-session-navigation
    provides: StepView, NavigationStep with followUpMessages, toolUseMap
provides:
  - AskUserQuestionBlock with header labels, expandable option descriptions, selected-answer highlighting
  - parseUserAnswerPairs utility for multi-question answer extraction
  - answerText prop threading through ContentBlockRenderer and MessageBubble
  - followUp message suppression for AskUserQuestion answers
affects: [09-specialized-tool-call-display]

# Tech tracking
tech-stack:
  added: []
  patterns: [specialized tool dispatch by name, answer pairing via followUpMessages, module-level style constants]

key-files:
  created:
    - src/renderer/src/components/message/AskUserQuestionBlock.tsx
  modified:
    - src/renderer/src/components/message/cleanUserText.ts
    - src/renderer/src/components/message/ToolCallBlock.tsx
    - src/renderer/src/components/message/ContentBlockRenderer.tsx
    - src/renderer/src/components/message/MessageBubble.tsx
    - src/renderer/src/components/player/StepView.tsx

key-decisions:
  - "AskUserQuestionBlock uses function call instead of JSX for fallback-to-null pattern"
  - "followUpAnswerMap built in MessageBubble from followUpMessages prop, not prop-drilled from StepView"
  - "AskUserQuestion followUp messages filtered in StepView by checking all tool_result blocks against toolUseMap"
  - "Module-level style constants for all static styles to avoid re-creation per render"

patterns-established:
  - "Specialized tool dispatch: ToolCallBlock checks name and delegates to specialized component, falls back to generic"
  - "Answer pairing: followUpMessages passed to MessageBubble, which builds tool_use_id -> content map for answerText"
  - "Duplicate suppression: StepView filters followUp messages when all tool_result blocks belong to a specialized tool"

requirements-completed: [PLAY-07]

# Metrics
duration: 6min
completed: 2026-02-28
---

# Phase 9 Plan 01: AskUserQuestion Block Summary

**Rich AskUserQuestion renderer with header label tags, expandable option descriptions, selected-answer highlighting, and multi-question support via parseUserAnswerPairs utility**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T01:43:03Z
- **Completed:** 2026-03-01T01:48:54Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- AskUserQuestion tool calls now render with header label as a colored tag above the question text
- Option labels show by default with ChevronRight expand/collapse toggles for descriptions
- Selected answers are highlighted with accent-color border and background within the question block
- Multi-question inputs show each question with its own paired answer (via parseUserAnswerPairs)
- Duplicate answer display eliminated: answer appears only in the question block, not also as a followUp chip

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AskUserQuestionBlock component and enhance parseUserAnswer** - `75f3b94` (feat)
2. **Task 2: Wire dispatch and suppress duplicate followUp answers** - `af8b8c8` (feat)

## Files Created/Modified
- `src/renderer/src/components/message/AskUserQuestionBlock.tsx` - Rich AskUserQuestion renderer with header, expandable options, selected answer display
- `src/renderer/src/components/message/cleanUserText.ts` - Added parseUserAnswerPairs for multi-question answer extraction
- `src/renderer/src/components/message/ToolCallBlock.tsx` - Dispatch to AskUserQuestionBlock, removed old extractAskOptions
- `src/renderer/src/components/message/ContentBlockRenderer.tsx` - Added answerText prop passthrough
- `src/renderer/src/components/message/MessageBubble.tsx` - Built followUpAnswerMap, passes answerText to tool_use blocks
- `src/renderer/src/components/player/StepView.tsx` - Passes followUpMessages to assistant MessageBubble, filters AskUserQuestion answer duplicates

## Decisions Made
- AskUserQuestionBlock called as a function (not JSX) from ToolCallBlock so the null return triggers generic fallback rendering
- Answer map built in MessageBubble (not StepView) to keep component responsibility contained -- MessageBubble already handles tool_result rendering
- normalizeContent helper added to MessageBubble (extracted from existing inline normalization pattern) for reuse in followUpAnswerMap building
- Free-text answers (not matching any option label) displayed as a styled quoted block below options

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- AskUserQuestion specialized rendering complete and verified
- Ready for Plan 02 (TaskCreateBlock, TaskUpdateBlock, TaskListBlock) which extends the same dispatch pattern
- The answerText threading pattern established here can be extended for other tools that need paired tool_result data

## Self-Check: PASSED

- All 6 files verified present
- Commit 75f3b94 (Task 1) verified
- Commit af8b8c8 (Task 2) verified
- TypeScript compiles cleanly (npx tsc --noEmit)
- Full build succeeds (npm run build)

---
*Phase: 09-specialized-tool-call-display*
*Completed: 2026-02-28*
