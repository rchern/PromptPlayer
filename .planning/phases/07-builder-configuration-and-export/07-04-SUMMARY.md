# Phase 7 Plan 4: Import Workflow and Keyboard Shortcuts Summary

**One-liner:** Hidden menu keyboard accelerators (Ctrl+S/Ctrl+Shift+S), import hydration into stores, and export/open buttons in Builder UI -- checkpoint approved with 4 gap issues

---
phase: 07
plan: 04
subsystem: builder-export-workflow
tags: [electron-menu, keyboard-shortcuts, import, export, hydration, promptplay]
requires: [07-02, 07-03]
provides: [presentation-export-ui, presentation-import-ui, keyboard-save, import-hydration]
affects: [08, 09]

tech-stack:
  added: []
  patterns: [hidden-menu-accelerators, store-hydration-from-file, menu-event-forwarding]

key-files:
  created: []
  modified:
    - src/main/index.ts
    - src/renderer/src/routes/Builder.tsx
    - src/renderer/src/stores/presentationStore.ts

key-decisions:
  - Hidden menu with autoHideMenuBar for global keyboard accelerators without visible menu chrome
  - Import hydration saves sessions to app-local storage then refreshes session store (full re-editing capability)
  - Ctrl+S overwrites sourceFilePath when set, otherwise opens save dialog (same as Ctrl+Shift+S)
  - useEffect with usePresentationStore.getState() for menu callbacks (registered once, reads current state at invocation)
  - setSourceFilePath persisted after export so subsequent Ctrl+S overwrites

duration: 3min
completed: 2026-02-25
---

## Performance

- **Duration:** ~3 minutes
- **Tasks:** 2/2 auto tasks completed + checkpoint approved with issues
- **Deviations:** 0 (auto tasks executed as planned)

## Accomplishments

1. **Hidden application menu** with keyboard accelerators in `src/main/index.ts`:
   - Ctrl+S sends `menu:save` event to renderer via webContents.send
   - Ctrl+Shift+S sends `menu:saveAs` event to renderer
   - Menu is invisible (autoHideMenuBar already set on BrowserWindow) -- accelerators work globally

2. **Import hydration and Builder export/import workflow** in Builder.tsx and presentationStore.ts:
   - `importFromPromptPlay` action: saves imported sessions to app-local storage, sets sourceFilePath, refreshes session store, sets imported presentation as active
   - `setSourceFilePath` action: updates and persists sourceFilePath after export for future Ctrl+S overwrites
   - Export button in assembly view calls `exportPresentation` IPC, shows success toast
   - Open button calls `importPresentation` IPC, hydrates via `importFromPromptPlay`, switches to assembly view
   - Menu event handlers: `onMenuSave` (overwrite or export dialog) and `onMenuSaveAs` (always dialog)
   - Export success toast with 3s auto-dismiss (reuses import toast pattern)

## Task Commits

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Hidden menu with keyboard accelerators | b0274ee | Menu.buildFromTemplate with Ctrl+S/Ctrl+Shift+S in src/main/index.ts |
| 2 | Import hydration and Builder export/import workflow | c2c0cc9 | importFromPromptPlay action, Export/Open buttons, menu event handlers |
| 3 | Visual verification checkpoint | -- | Approved with issues (see below) |

## Files Modified

- **src/main/index.ts** -- Added hidden Menu with File submenu containing Save (Ctrl+S) and Save As (Ctrl+Shift+S) accelerators
- **src/renderer/src/routes/Builder.tsx** -- Added Export button, Open button, Ctrl+S/Ctrl+Shift+S handlers via useEffect, export success toast
- **src/renderer/src/stores/presentationStore.ts** -- Added importFromPromptPlay and setSourceFilePath actions with persistence

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Hidden menu for accelerators | autoHideMenuBar keeps chrome clean; Menu.buildFromTemplate registers global shortcuts without visible UI |
| Import saves sessions to local storage | Imported sessions become first-class -- user can add more discovered sessions, modify settings, re-export |
| getState() in menu callbacks | Callbacks registered once in useEffect; getState() reads current state at invocation time instead of stale closure |
| sourceFilePath set after export | Enables Ctrl+S to overwrite without dialog on subsequent saves |

## Deviations from Plan

None -- auto tasks executed exactly as written.

## Issues Encountered

Checkpoint was approved with 4 issues identified during visual verification:

### Issue 1: Create Presentation button covers last session checkbox
The "Create Presentation" button overlaps the last session's checkbox in the browse view. Needs a positioning or z-index fix to ensure the checkbox is always accessible.

### Issue 2: No message preview in assembly view
Clicking a session in the assembly outline does not show its messages filtered by current tool settings. Without this, tool visibility toggles, timestamp toggles, and theme selections appear to have no effect because there is no preview content to observe.

### Issue 3: Export does not embed parsed messages
The exported .promptplay file only contains session metadata (StoredSession objects), not the actual conversation content. Export needs to include either the raw JSONL data or pre-parsed messages so that the file is truly self-contained and portable.

### Issue 4: Add Save / Save As buttons
The Save and Save As operations are only accessible via Ctrl+S and Ctrl+Shift+S keyboard shortcuts. Visible buttons should be added alongside the Export and Open buttons so the functionality is discoverable.

## Next Phase Readiness

- **Phase 7 execution is complete** -- all 4 plans executed, but 4 gap issues were identified during final checkpoint
- **Gap closure needed** before Phase 7 can be considered fully delivered:
  - Issues 1 and 4 are straightforward UI fixes (button positioning, adding visible Save buttons)
  - Issue 2 (message preview in assembly) is a significant UX gap -- the settings panel has no visible effect without it
  - Issue 3 (export not embedding content) is a data completeness issue -- exported files are not truly portable
- These gaps should be addressed in a gap-closure plan before proceeding to Phase 8

## Self-Check: PASSED
