---
phase: 02-data-pipeline
plan: 01
subsystem: pipeline
tags: [typescript, jsonl, parser, stitcher, classifier, parentUuid, requestId]

# Dependency graph
requires:
  - phase: 01-app-shell
    provides: Electron + TypeScript project structure with tsconfig.node.json
provides:
  - Shared TypeScript interfaces for entire data pipeline (types.ts)
  - JSONL streaming parser with assistant turn reassembly (parser.ts)
  - parentUuid chain stitcher with sidechain filtering and orphan recovery (stitcher.ts)
  - Tool call classifier with plumbing/narrative/unknown visibility (classifier.ts)
affects: [02-data-pipeline plans 02-04, 03-message-rendering, 07-builder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Streaming JSONL parse via Node.js readline + createReadStream"
    - "Assistant turn reassembly by requestId grouping"
    - "parentUuid chain walking for conversation ordering"
    - "Orphan recovery via timestamp fallback sort"
    - "Tool classification lookup tables (Set-based)"
    - "tool_result inherits paired tool_use classification"

key-files:
  created:
    - src/main/pipeline/types.ts
    - src/main/pipeline/parser.ts
    - src/main/pipeline/stitcher.ts
    - src/main/pipeline/classifier.ts
  modified: []

key-decisions:
  - "Thinking-only messages classified as plumbing (hidden by default)"
  - "Unknown tools default to 'unknown' visibility (shown by default -- safe behavior)"
  - "Parser returns unordered messages; ordering is stitcher's responsibility"
  - "pairToolResults runs post-stitch so tool_use always precedes tool_result"

patterns-established:
  - "Pipeline module pattern: pure functions, no side effects beyond file I/O in parser"
  - "ContentBlock normalization: always convert string content to TextBlock array early"
  - "Map-based lookups for uuid chains and requestId grouping"

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 2 Plan 1: Core Data Pipeline Logic Summary

**Streaming JSONL parser with requestId-based assistant turn reassembly, parentUuid chain stitcher with orphan recovery, and plumbing/narrative tool classifier**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-21T13:47:23Z
- **Completed:** 2026-02-21T13:50:50Z
- **Tasks:** 3
- **Files created:** 4

## Accomplishments
- Complete TypeScript type system for the entire data pipeline (JsonlLine, ParsedMessage, ContentBlock, etc.)
- Streaming JSONL parser that handles malformed lines, normalizes user content formats, and reassembles split assistant turns by shared requestId
- parentUuid chain stitcher that walks from root, excludes sidechains, and recovers orphaned messages by timestamp
- Tool call classifier with exact plumbing/narrative mappings per locked decisions, including tool_result pairing

## Task Commits

Each task was committed atomically:

1. **Task 1: Pipeline TypeScript types** - `a91581f` (feat)
2. **Task 2: JSONL parser with assistant turn reassembly** - `cc2783c` (feat)
3. **Task 3: Stitcher and Classifier** - `6c34363` (feat)

## Files Created/Modified
- `src/main/pipeline/types.ts` - All shared interfaces: JsonlLine, ContentBlock (5 variants), ParsedMessage, ToolVisibility, ParseResult, StitchedSession, SessionMetadata
- `src/main/pipeline/parser.ts` - parseJSONLFile: streaming readline parser with assistant turn reassembly by requestId
- `src/main/pipeline/classifier.ts` - classifyToolCall, classifyMessage, pairToolResults: tool visibility classification
- `src/main/pipeline/stitcher.ts` - stitchConversation: parentUuid chain walking, sidechain filtering, orphan recovery, classification integration

## Decisions Made
- Thinking-only assistant messages classified as 'plumbing' (hidden by default per locked decision)
- Unknown/unrecognized tools get 'unknown' visibility (shown by default as safe behavior)
- Parser produces unordered messages; conversation ordering is exclusively the stitcher's responsibility
- pairToolResults executes post-stitch to ensure tool_use blocks are always encountered before their tool_result counterparts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All four pipeline modules compile cleanly and export documented functions
- Ready for Plan 02 (discovery), Plan 03 (IPC bridge), and Plan 04 (session store)
- Types are shared across all pipeline modules via imports from types.ts

## Self-Check: PASSED

---
*Phase: 02-data-pipeline*
*Completed: 2026-02-21*
