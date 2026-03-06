---
phase: 07-builder-configuration-and-export
plan: 01
subsystem: presentation-settings
tags: [types, tool-categories, settings, filtering]
requires:
  - phase-02 (classifier tool names)
  - phase-03 (filterVisibleMessages pattern)
  - phase-06 (presentation types)
provides:
  - ToolCategoryConfig and PresentationSettings types (renderer + main)
  - TOOL_CATEGORIES constant with all classified tools
  - getDefaultSettings() factory for smart defaults
  - filterWithToolSettings() for per-tool visibility control
  - backfillSettings() for pre-Phase 7 presentation migration
  - PromptPlayFile type for export format
affects:
  - 07-02 (settings UI reads TOOL_CATEGORIES, uses PresentationSettings)
  - 07-03 (export uses PromptPlayFile type)
  - 07-04 (import uses PromptPlayFile type, backfillSettings)
tech-stack:
  added: []
  patterns:
    - Two-level tool visibility (category + per-tool overrides)
    - Settings backfill for backward compatibility
    - Coexisting filter functions (simple boolean vs granular settings)
key-files:
  created:
    - src/renderer/src/utils/toolCategories.ts
  modified:
    - src/renderer/src/types/presentation.ts
    - src/main/pipeline/types.ts
    - src/renderer/src/utils/messageFiltering.ts
    - src/renderer/src/utils/presentationUtils.ts
key-decisions:
  - Task Management category defaults to hidden (mixed plumbing/narrative, mostly plumbing)
  - "Other" catch-all category defaults to visible (unknown tools shown by default, per 02-01)
  - backfillSettings placed in presentationUtils.ts (colocated with creation functions)
  - hasMeaningfulText extracted as private helper for DRY mixed-content checks
duration: 6min
completed: 2026-02-25
---

# Phase 7 Plan 1: Type Definitions, Tool Categories, and Settings Foundation Summary

**JWT-style one-liner:** PresentationSettings type system with TOOL_CATEGORIES constant covering all 20 classified tools, getDefaultSettings() factory, filterWithToolSettings() with per-tool granularity, and backfillSettings() for backward compatibility.

## Performance

- **Duration:** 6 minutes
- **Tasks:** 2/2 complete
- **Approach:** Fully autonomous, no checkpoints needed

## Accomplishments

1. **Type system extension** -- Added ToolCategoryConfig, PresentationSettings, and PromptPlayFile interfaces to both renderer and main process type files. Extended Presentation with required `settings` field and optional `sourceFilePath` for Save overwrite tracking.

2. **Tool category constant** -- Created TOOL_CATEGORIES mapping all 20 tools from the classifier (16 plumbing + 4 narrative) into 7 user-friendly groups: File Operations, Search, Shell, Task Management, User Interaction, Planning, and Other (catch-all).

3. **Default settings factory** -- getDefaultSettings() generates PresentationSettings with plumbing categories hidden, User Interaction visible, Other visible, showTimestamps off, theme system.

4. **Granular message filter** -- filterWithToolSettings() respects per-category and per-tool overrides with mixed-content exceptions for all 4 toolVisibility states (null, narrative, unknown, plumbing). Coexists with existing filterVisibleMessages used by the Player.

5. **Backward compatibility** -- backfillSettings() handles pre-Phase 7 presentations that lack the settings field, applying smart defaults on load.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Type definitions and tool category constants | 0805322 | presentation.ts, types.ts, toolCategories.ts |
| 2 | filterWithToolSettings and settings backfill | d3dce17 | messageFiltering.ts, presentationUtils.ts |

## Files Created

- `src/renderer/src/utils/toolCategories.ts` -- TOOL_CATEGORIES constant and getDefaultSettings() factory

## Files Modified

- `src/renderer/src/types/presentation.ts` -- Added ToolCategoryConfig, PresentationSettings, PromptPlayFile types; extended Presentation
- `src/main/pipeline/types.ts` -- Mirrored all new types for main process
- `src/renderer/src/utils/messageFiltering.ts` -- Added filterWithToolSettings() and hasMeaningfulText() helper
- `src/renderer/src/utils/presentationUtils.ts` -- Updated createPresentationFromSessions with settings; added backfillSettings()

## Decisions Made

1. **Task Management category defaults to hidden** -- Groups both plumbing (Task, TaskOutput, TaskStop) and narrative (TaskCreate, TaskUpdate, TaskList) tools. Defaulting to hidden because the majority are plumbing. Users can expand the category and override individual tools.

2. **"Other" catch-all with empty tools array** -- The Other category has `tools: []` and `defaultVisible: true`, acting as a catch-all for unknown tools. This preserves the decision from 02-01 (unknown tools shown by default) while giving users the option to hide them.

3. **backfillSettings in presentationUtils.ts** -- Placed alongside createPresentationFromSessions rather than in toolCategories.ts, since it operates on Presentation objects and is logically part of presentation lifecycle management.

4. **hasMeaningfulText extracted as private helper** -- The mixed-content text check was duplicated across filterVisibleMessages and the new filterWithToolSettings. Extracted into a shared private function for DRY within messageFiltering.ts.

5. **Type-only circular import accepted** -- `src/main/pipeline/types.ts` imports StoredSession from sessionStore.ts, which imports ParsedMessage from types.ts. Both are `import type` statements erased at compile time, so no runtime circular dependency.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

- **Pre-existing TS7030 in Builder.tsx** -- `useEffect` callback at line 88 doesn't return on all code paths. This is from Phase 6 (commit 636a078) and unrelated to this plan's changes. Not blocking.

## Next Phase Readiness

All Phase 7 downstream plans can proceed:
- **07-02 (Settings Panel UI):** TOOL_CATEGORIES and PresentationSettings types are ready for the settings UI to render
- **07-03 (Export):** PromptPlayFile type defines the export format; Presentation.sourceFilePath tracks save location
- **07-04 (Import):** PromptPlayFile type and backfillSettings() handle re-opened files

No blockers. No unresolved concerns.

## Self-Check: PASSED
