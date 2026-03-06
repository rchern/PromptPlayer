---
phase: 10-packaging-and-release
plan: 02
subsystem: electron-main
tags: [single-instance, file-association, auto-updater, electron-updater, ipc]

# Dependency graph
requires:
  - phase: 08-player-multi-session-playback
    provides: playbackStore with loadPresentation action and multi-session playback
  - phase: 10-packaging-and-release-01
    provides: electron-builder and electron-updater dependencies
provides:
  - Single-instance lock enforcement via requestSingleInstanceLock
  - OS file association handler (.promptplay -> open-file IPC -> Player)
  - Auto-updater module with silent background update checking
  - presentation:readFile IPC handler for path-based .promptplay reading
  - update:installAndRestart IPC handler for renderer-triggered restarts
affects: [packaging, installer, file-association-registry]

# Tech tracking
tech-stack:
  added: [electron-updater]
  patterns: [single-instance-lock, argv-extraction, cold-warm-file-opening]

key-files:
  created:
    - src/main/autoUpdater.ts
  modified:
    - src/main/index.ts
    - src/preload/index.ts
    - src/renderer/src/types/electron.d.ts
    - src/renderer/src/App.tsx

key-decisions:
  - "autoUpdater.autoDownload=true and autoInstallOnAppQuit=true for VS Code-like silent update UX"
  - "extractPromptPlayPath helper shared for both cold-start (process.argv) and warm-start (second-instance commandLine)"
  - "presentation:readFile is a separate IPC handler from presentation:import (no dialog, path-only)"
  - "No update notification UI in this plan -- infrastructure wired, autoInstallOnAppQuit handles the rest"

patterns-established:
  - "Single-instance lock: requestSingleInstanceLock wraps all app lifecycle, gotTheLock guard at top level"
  - "File opening: main sends open-file IPC, preload bridges to renderer, App-level effect handles navigation"
  - "Auto-updater: dev-mode guard via is.dev, 3-second delayed check, silent error handling"

requirements-completed: [SHELL-03]

# Metrics
duration: 9min
completed: 2026-03-02
---

# Phase 10 Plan 02: Single-Instance Lock & Auto-Updater Summary

**Single-instance enforcement with .promptplay file opening via OS association and silent auto-updater using electron-updater**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-02T03:25:05Z
- **Completed:** 2026-03-02T03:34:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Main process restructured with single-instance lock -- second app launch dispatches file path to existing window
- Cold-start and warm-start .promptplay file opening via extractPromptPlayPath helper and open-file IPC
- Auto-updater module silently checks for updates 3s after launch, downloads in background, installs on quit
- Full IPC chain wired: main -> preload (onOpenFile, readPromptPlayFile) -> renderer (App.tsx effect navigates to /player)

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure main process with single-instance lock, file opening, and auto-updater** - `3d82ea5` (feat)
2. **Task 2: Wire open-file and update events through preload to renderer** - `0ab9ae9` (feat)

## Files Created/Modified
- `src/main/autoUpdater.ts` - Auto-update setup module with silent background checking and IPC notifications
- `src/main/index.ts` - Restructured with single-instance lock, argv extraction, open-file IPC dispatch, readFile handler
- `src/preload/index.ts` - Added onOpenFile, readPromptPlayFile, onUpdateReady, installUpdate bridges
- `src/renderer/src/types/electron.d.ts` - Updated ElectronAPI with file opening and auto-update method types
- `src/renderer/src/App.tsx` - RootLayout gains onOpenFile effect that reads file, loads playback store, navigates to /player

## Decisions Made
- autoUpdater.autoDownload=true and autoInstallOnAppQuit=true for VS Code-like silent update UX -- no user interruption
- extractPromptPlayPath helper shared for both cold-start (process.argv) and warm-start (second-instance commandLine)
- presentation:readFile is a separate IPC handler from presentation:import (no dialog, reads by path only)
- No update notification UI in this plan -- infrastructure is wired, autoInstallOnAppQuit handles the rest silently
- mainWindow promoted to module-scope variable (from local in createWindow) for second-instance access

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed electron-updater dependency**
- **Found during:** Task 1 (auto-updater module creation)
- **Issue:** electron-updater package was not yet installed in node_modules
- **Fix:** Ran `npm install electron-updater` to add the dependency
- **Files modified:** package.json, package-lock.json
- **Verification:** Import succeeds, TypeScript compiles cleanly
- **Committed in:** 3d82ea5 (Task 1 commit)

**2. [Rule 3 - Blocking] Restored corrupted node_modules after npm dependency resolution conflict**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** npm install electron-updater removed 265 packages including typescript due to dependency resolution; subsequent npm install failed with ENOTEMPTY and EPERM errors
- **Fix:** Removed corrupt node_modules directory and performed fresh npm install
- **Files modified:** node_modules/ (not committed)
- **Verification:** TypeScript compiler available and both tsconfig targets compile

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary to complete execution. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in TaskUpdateBlock.tsx and Builder.tsx (unrelated to plan changes) -- verified identical before and after changes, not addressed per scope boundary rules

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Single-instance lock and file opening infrastructure complete
- Plan 03 (electron-builder config, NSIS installer, file association registry) can now wire the OS-level .promptplay file type to this handler
- Auto-updater infrastructure ready; publish config (GitHub Releases) needed in build pipeline

## Self-Check: PASSED

All 6 files verified present. Both task commits (3d82ea5, 0ab9ae9) verified in git log.

---
*Phase: 10-packaging-and-release*
*Completed: 2026-03-02*
