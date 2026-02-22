---
phase: 03-message-rendering
plan: 03
subsystem: ui
tags: [builder-integration, visual-verification, message-preview, tool-rejection, csp]

# Dependency graph
requires:
  - phase: 03-message-rendering
    plan: 01
    provides: "MarkdownRenderer, CodeBlock, presentation CSS, shiki dual-theme CSS"
  - phase: 03-message-rendering
    plan: 02
    provides: "MessageList, MessageBubble, ContentBlockRenderer, filtering"
  - phase: 02-data-pipeline
    provides: "ParsedMessage[], pipeline IPC, session store"
provides:
  - "Working conversation preview in Builder session detail panel"
  - "Visual verification of all Phase 3 rendering criteria"
  - "Tool rejection display (narrative classification, tool name, red styling)"
  - "Expanded plumbing tool list (Task, Skill, WebSearch, etc.)"
  - "System noise filtering ([Request interrupted], cleanUserText)"
affects: [05-builder-session-management, 09-rich-tool-rendering]

# Tech tracking
tech-stack:
  added: []
  patterns: [tool-use lookup map for rejection context, is_error+startsWith for rejection detection]

key-files:
  modified:
    - src/renderer/src/routes/Builder.tsx
    - src/main/pipeline/classifier.ts
    - src/renderer/src/components/message/MessageBubble.tsx
    - src/renderer/src/components/message/MessageList.tsx
    - src/renderer/src/components/message/cleanUserText.ts
  created:
    - test-data/test-project/rejection-test.jsonl

key-decisions:
  - "wasm-unsafe-eval in CSP for shiki WASM — user chose accuracy over avoiding CSP change"
  - "Builder preview uses 14px base font; Player will use 20px via .presentation-mode CSS class"
  - "System XML cleaned from user messages (cleanUserText.ts utility)"
  - "AskUserQuestion rendered with question + option chips; user answers as accent-colored chips"
  - "Tool rejections classified as narrative (not inherited plumbing) — user decisions are story-worthy"
  - "Rejection detection requires is_error:true AND content.startsWith() to avoid false positives from grep output"
  - "Tool rejections show tool name + command summary in red, user reason in italic"
  - "[Request interrupted by user for tool use] stripped as system noise (redundant with rejection display)"
  - "Task, Skill, WebSearch, WebFetch, EnterPlanMode, etc. added to plumbing tools"
  - "tool_result.content must always be normalized (can be string OR array of objects)"

patterns-established:
  - "Tool-use lookup map (tool_use_id -> name+input) built in MessageList, passed to MessageBubble"
  - "is_error + startsWith pattern for reliable rejection detection in classifier and renderer"

# Metrics
duration: ~30min (across two sessions, includes visual verification iterations)
completed: 2026-02-22
---

# Phase 3 Plan 3: Builder Integration & Visual Verification Summary

**Wire MessageList into Builder, visual verification of all rendering criteria, tool rejection display**

## Performance

- **Duration:** ~30 min (across two sessions)
- **Tasks:** 2 (auto + human verification checkpoint)
- **Files modified:** 6

## Accomplishments
- Integrated MessageList into Builder session detail panel with flex layout (stats at top, conversation scrolls below)
- Passed visual verification checkpoint for all 5 Phase 3 success criteria (PLAY-04, PLAY-05, PLAY-06, PLAY-09, PLAY-15)
- Fixed CSP to allow wasm-unsafe-eval for shiki WASM syntax highlighting
- Fixed tool_result content normalization (string OR array)
- Added AskUserQuestion rich rendering (question + option chips, answer display)
- Added tool rejection rendering: red text with tool name, command summary, user reason
- Classified tool rejections as narrative (override plumbing inheritance when is_error + rejection pattern)
- Expanded plumbing tool list: Task, TaskOutput, TaskStop, Skill, EnterPlanMode, ExitPlanMode, EnterWorktree, NotebookEdit, WebFetch, WebSearch
- Added system noise filtering: [Request interrupted by user for tool use]
- Created test-data/test-project/rejection-test.jsonl for rejection rendering verification

## Task Commits

1. **Task 1: Integrate MessageList into Builder** - `1845db4` (feat)
2. **Task 2: Visual verification fixes** - `937cf54` (fix)
3. **WIP checkpoint** - `1d3ca2a` (wip)
4. **Pending: rejection + filtering fixes** - uncommitted

## Decisions Made
- **wasm-unsafe-eval CSP:** Shiki uses WASM for syntax highlighting. User approved adding wasm-unsafe-eval to CSP rather than degrading highlighting quality.
- **Rejection as narrative:** Tool rejections are user decisions, not plumbing. Classified as 'narrative' in classifier when is_error===true AND content starts with rejection pattern.
- **False positive prevention:** Grep output containing rejection text was causing false matches. Fixed with is_error + startsWith instead of includes.
- **Expanded plumbing list:** Task, Skill, WebSearch, and other meta-tools produce noisy raw output unsuitable for presentation.

## Known Concerns
- User expressed partial confidence in filtering — some edge cases in message visibility may remain
- queue-operation messages (user input while agents run) are not parsed — queued messages are lost
- Orphan chain resolution still incomplete (Map overwrites from Phase 2)

## Self-Check: PASSED (with noted concerns)

---
*Phase: 03-message-rendering*
*Completed: 2026-02-22*
