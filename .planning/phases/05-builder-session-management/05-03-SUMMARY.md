---
phase: 05-builder-session-management
plan: 03
subsystem: builder-ui
tags: [preview, stats, file-not-found, checkpoint-feedback]

# Dependency graph
requires:
  - phase: 05-builder-session-management
    plan: 02
    provides: "SearchFilterBar, ImportDropZone, enhanced SessionCard/List, sessionStore with filter state"
provides:
  - "SessionPreviewHeader with Messages, Steps, Duration, Project, Command stats"
  - "File-not-found error state in preview panel"
  - "Project labels in chronological view"
  - "Import auto-select with scroll-into-view"

key-files:
  created:
    - src/renderer/src/components/builder/SessionPreviewHeader.tsx
  modified:
    - src/renderer/src/routes/Builder.tsx
    - src/renderer/src/components/builder/SessionCard.tsx
    - src/renderer/src/components/builder/SessionList.tsx
    - src/renderer/src/stores/sessionStore.ts
---

## Summary

Built SessionPreviewHeader component showing message count, step count, duration, project path, and command snippet in a two-tier layout (compact numeric stats row + full-width detail rows). Updated Builder.tsx preview panel to use the new header instead of raw parse stats. Added file-not-found error handling with distinct UI state.

### Checkpoint Feedback Applied

Three fixes applied during human verification:
1. **Preview header layout**: Project and Command moved to full-width rows below compact stats (prevents truncation)
2. **Chronological view context**: Each session card shows project name in accent color when in flat chronological mode
3. **Import auto-select + scroll**: Import always selects the first imported session (even re-imports) and scrolls it into view

### Deviations

- Preview header uses two-tier layout instead of single auto-fit grid (checkpoint feedback)
- SessionCard gained `showProject` prop and `scrollIntoView` on active (not in original plan, added per feedback)
- sessionStore gained `lastImportedIds` tracking (not in original plan, added for import UX)

## Duration

~5 min (including checkpoint feedback fixes)

## Commits

| Hash | Description |
|------|-------------|
| `82f4b20` | feat(05-03): add SessionPreviewHeader and file-not-found handling |
| `a8f2ac6` | fix(05-03): checkpoint feedback - preview layout, chronological project labels, import auto-select |
| `1d0c92d` | fix(05-03): import always selects session and scrolls into view |

## Self-Check: PASSED
