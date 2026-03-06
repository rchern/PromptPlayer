# Debug Session: Empty Recent Files on Home Screen

**Bug:** Recent files list is always empty on Home screen after opening files through the app
**UAT Test:** 13 - Clickable Recent Files on Home Screen
**Date:** 2026-03-04

## Root Cause

The recent files feature is **scaffolded but never wired up**. The entire write-side of the data flow is missing:

1. **No code ever calls `setRecentFiles()`** -- The Zustand store (`appStore.ts`) defines `recentFiles: []` and a `setRecentFiles` setter, but **nothing in the entire codebase invokes that setter**. Grep for `setRecentFiles` returns only its own definition in the store.

2. **No persistence layer exists** -- There is no IPC handler, no main-process storage module, and no electron-store key for recent files. The main process has storage modules for sessions (`sessionStore.ts`) and presentations (`presentationStore.ts`), but nothing for recent files. The `window-state.json` file only stores window bounds.

3. **No tracking at any file-open callsite** -- Files are opened in three places, and none of them record the open to recent files:
   - `App.tsx` line 80-84: `onOpenFile` handler (OS file association / second-instance)
   - `Player.tsx` line 78-82: Auto-import on mount when no presentation loaded
   - `Player.tsx` line 87-90: `handleOpenFile` via system dialog
   - `Home.tsx` line 12-19: `handleRecentFileOpen` (reads from recent list -- but nothing populates it)

## Evidence

### appStore.ts -- setter defined, never called
```typescript
// Line 18-20: defined but zero callers
recentFiles: [],
setDarkMode: (isDark): void => set({ isDarkMode: isDark }),
setRecentFiles: (files): void => set({ recentFiles: files })
```

### Grep results confirming no callers
```
$ grep -r "setRecentFiles" src/
src/renderer/src/stores/appStore.ts:13:  setRecentFiles: (files: RecentFile[]) => void
src/renderer/src/stores/appStore.ts:20:  setRecentFiles: (files): void => set({ recentFiles: files })
```
Only the definition. No invocations anywhere.

### No main-process support
```
$ grep -ri "recent" src/main/
(no results)

$ grep -ri "recent" src/preload/
(no results)
```

### RecentFiles.tsx correctly reads from store -- the read side works
```typescript
const recentFiles = useAppStore((state) => state.recentFiles)
// Always [] because nothing ever writes to it
```

## Data Flow Diagram

```
Expected flow (not implemented):
  User opens file -> [MISSING: track file path/name/timestamp]
                  -> [MISSING: persist to electron-store or JSON file]
                  -> [MISSING: load persisted list on app startup]
                  -> appStore.setRecentFiles(loaded)
                  -> RecentFiles component re-renders with data

Actual flow:
  User opens file -> (nothing happens to recent files)
  Home screen mounts -> reads appStore.recentFiles -> always []
  -> "No recent files" displayed
```

## Files Involved

| File | Issue |
|------|-------|
| `src/renderer/src/stores/appStore.ts` | `setRecentFiles` defined but never called; no `addRecentFile` helper |
| `src/renderer/src/components/home/RecentFiles.tsx` | Read side is correct; display logic works -- just has no data |
| `src/renderer/src/routes/Home.tsx` | `handleRecentFileOpen` callback is correct but list is always empty |
| `src/renderer/src/App.tsx` | `onOpenFile` handler opens files but does not record to recent files |
| `src/renderer/src/routes/Player.tsx` | `handleOpenFile` and auto-import do not record to recent files |
| `src/main/index.ts` | No IPC handler for recent files persistence |
| `src/preload/index.ts` | No API bridge for recent files |
| `src/main/storage/` | No `recentFileStore.ts` exists |

## Suggested Fix Direction

Two things need to be built:

1. **Persistence layer (main process):** Create a `recentFileStore.ts` (similar to existing `sessionStore.ts` pattern) that reads/writes a JSON file in `userData`. Expose via IPC: `recentFiles:get` and `recentFiles:add`. Bridge through preload.

2. **Tracking at open callsites (renderer):** After every successful file open (in `App.tsx` onOpenFile, `Player.tsx` handleOpenFile, and `Home.tsx` handleRecentFileOpen), call `addRecentFile({ path, name, lastOpened })` which both updates the Zustand store and calls the IPC to persist. On app startup (or Home mount), load persisted recent files into the store via `setRecentFiles`.
