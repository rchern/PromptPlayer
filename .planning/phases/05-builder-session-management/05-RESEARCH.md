# Phase 5: Builder Session Management - Research

**Researched:** 2026-02-22
**Domain:** Electron file import (drag-drop, file picker), client-side search/filter, React list views, session preview
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Session list presentation
- Switchable views: project-grouped (default) and flat chronological -- toggle between them
- Each session item shows: date/time, message count, command/snippet preview, duration
- Project-grouped view collapses sessions under project path headers

#### Search and filtering
- Keyword search matches against: session title/command, full message content, project name/path
- Date filtering: quick presets (Today, This week, This month, Older) plus custom date range picker
- Both search and filter controls always visible (not hidden behind a button)

#### Session preview
- Clicking a session shows a summary header + full scrollable conversation below
- Summary header includes: message/step count, session duration, project path
- Preview hides plumbing tool calls (same as Player -- narrative messages only)

#### Import and discovery flow
- Three import methods: auto-discover from ~/.claude, manual file picker (Import button), drag-and-drop JSONL files
- Auto-scan runs on Builder open + manual refresh button for picking up new sessions
- Files referenced in-place (path stored, not copied) -- .promptplay export (Phase 7) handles self-contained bundling
- Scanning shows a progress indicator with count of sessions found

### Claude's Discretion
- Session list visual density (compact rows vs cards) -- pick based on metadata volume
- Search/filter control layout (separate bar vs combined token bar)
- Project filter implementation (dedicated dropdown vs part of search)
- Preview panel layout (side-by-side split vs full overlay)
- Whether key commands appear in preview summary header

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Summary

Phase 5 transforms the existing Builder session browse UI (built in Phase 2, plan 02-04) into a full session management experience. The existing codebase already has session discovery, metadata extraction, full parsing, and a basic project-grouped list with a detail panel. Phase 5 enhances this with: (1) switchable views (project-grouped vs flat chronological), (2) keyword search and date filtering, (3) drag-and-drop JSONL import alongside the existing auto-discover and browse, (4) an enriched session preview reusing Phase 3 rendering components, and (5) enriched metadata including session duration.

The architecture builds on established patterns. The existing `useSessionStore` Zustand store manages discovery state and active session parsing. Search/filter state can be added to this store or kept in a separate store. The existing `SessionList` and `SessionCard` components get enhanced with new metadata fields and view-switching logic. The preview panel already exists in `Builder.tsx` -- it needs a summary header and should reuse `MessageList` with `showPlumbing=false` (already the default). The key new infrastructure is: (1) extending `SessionMetadata` with `lastTimestamp` for duration calculation, (2) new IPC for file-picker import of individual JSONL files, (3) drag-and-drop support via `webUtils.getPathForFile()` in the preload, and (4) client-side filtering logic.

**Primary recommendation:** Extend the existing Builder architecture incrementally. Add metadata fields (lastTimestamp/duration) to the data layer, add drag-and-drop + file import IPC, then enhance the UI with search/filter controls, switchable views, and an enriched preview panel. No new dependencies needed -- use native HTML date inputs, existing lucide-react icons, and plain string matching for search.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.11 | State management (search, filter, view mode) | Already in project, established pattern |
| lucide-react | 0.575.0 | Icons for view toggle, search, filter, import | Already in project |
| React (hooks) | 19.0.0 | useMemo for filtered results, useCallback for handlers | Already in project |
| Electron `webUtils` | Electron 40 | `getPathForFile()` for drag-and-drop file paths | Built into Electron 40, replaces deprecated `File.path` |
| Electron `dialog` | Electron 40 | `showOpenDialog` for JSONL file picker import | Already used for directory browse |
| Node.js `fs` | built-in | Read last bytes of file for lastTimestamp extraction | Already used in discovery |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TailwindCSS | 4.2.0 | Utility classes for layout | Already in project, used throughout |
| React Router | 7.13.0 | Hash router (existing) | No changes needed for Phase 5 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="date">` | react-datepicker or react-day-picker | Adds dependency weight; native inputs are sufficient for date range filtering in a desktop app |
| Plain string `.includes()` search | Fuse.js or flexsearch | Fuzzy search adds complexity; exact substring match is appropriate for session browsing |
| Separate filter store | Combined with sessionStore | Keeping filter state in sessionStore is simpler -- avoids cross-store synchronization |

**Installation:**
```bash
# No new dependencies required -- all capabilities already available
```

## Architecture Patterns

### Component Structure (Phase 5 additions/modifications)
```
src/
├── main/
│   ├── index.ts                          # NEW: IPC handlers for file import, drag-drop paths
│   └── pipeline/
│       ├── discovery.ts                  # MODIFIED: extract lastTimestamp for duration
│       └── types.ts                      # MODIFIED: SessionMetadata gets lastTimestamp
├── preload/
│   └── index.ts                          # MODIFIED: expose getFilePaths (webUtils), importFiles IPC
└── renderer/src/
    ├── components/builder/
    │   ├── SessionList.tsx               # MODIFIED: view switching (grouped vs flat), filtering
    │   ├── SessionCard.tsx               # MODIFIED: enhanced metadata (duration, command snippet)
    │   ├── SearchFilterBar.tsx           # NEW: search input + date filter controls
    │   ├── SessionPreviewHeader.tsx      # NEW: summary stats header for preview panel
    │   └── ImportDropZone.tsx            # NEW: drag-and-drop visual feedback zone
    ├── routes/
    │   └── Builder.tsx                   # MODIFIED: integrate search/filter, import, preview header
    ├── stores/
    │   └── sessionStore.ts              # MODIFIED: add filter state, view mode, import actions
    ├── types/
    │   ├── electron.d.ts                # MODIFIED: new IPC method types
    │   └── pipeline.ts                  # MODIFIED: SessionMetadata gets lastTimestamp
    └── utils/
        └── sessionFiltering.ts          # NEW: pure functions for search/date filtering
```

### Pattern 1: View Mode Toggle (Project-Grouped vs Flat Chronological)
**What:** A toggle in the session list header switches between two layouts. The grouped view is the existing `groupAndSort()` function in `SessionList.tsx`. The flat view sorts all sessions by timestamp descending without grouping.
**When to use:** When the user wants to see sessions across projects chronologically (e.g., "what did I work on today?")
**Example:**
```typescript
// In sessionStore or as component state
type ViewMode = 'grouped' | 'chronological'

// In SessionList.tsx
function SessionList({ sessions, viewMode, ... }) {
  if (viewMode === 'grouped') {
    const grouped = groupAndSort(filteredSessions)
    return /* existing grouped rendering */
  } else {
    const sorted = [...filteredSessions].sort((a, b) => {
      const timeA = a.firstTimestamp ? new Date(a.firstTimestamp).getTime() : 0
      const timeB = b.firstTimestamp ? new Date(b.firstTimestamp).getTime() : 0
      return timeB - timeA
    })
    return /* flat list rendering */
  }
}
```

### Pattern 2: Client-Side Search Filtering
**What:** Search text and date filters applied to `discoveredSessions` in the renderer before display. Filtering is a pure function, memoized with `useMemo` to avoid recalculation on every render.
**When to use:** Always -- search/filter happens in the renderer because the full metadata is already loaded.
**Example:**
```typescript
// utils/sessionFiltering.ts
export function filterSessions(
  sessions: SessionMetadata[],
  searchQuery: string,
  dateFilter: DateFilter
): SessionMetadata[] {
  return sessions.filter(session => {
    // Keyword search: matches against snippet, project, sessionId
    if (searchQuery && !matchesSearch(session, searchQuery)) return false
    // Date filter: matches against firstTimestamp
    if (dateFilter !== 'all' && !matchesDateFilter(session, dateFilter)) return false
    return true
  })
}

function matchesSearch(session: SessionMetadata, query: string): boolean {
  const q = query.toLowerCase()
  return (
    (session.firstUserMessage?.toLowerCase().includes(q) ?? false) ||
    session.projectFolder.toLowerCase().includes(q) ||
    session.sessionId.toLowerCase().includes(q)
  )
}
```

### Pattern 3: Drag-and-Drop Import via Preload Bridge
**What:** Files dropped onto the Builder are sent through the preload bridge which uses `webUtils.getPathForFile()` to extract file paths, then passes them to the main process for metadata extraction.
**When to use:** When the user drags JSONL files from Explorer onto the app.
**Example:**
```typescript
// preload/index.ts
import { webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods ...
  getFilePaths: (files: File[]): string[] => {
    return files.map(f => webUtils.getPathForFile(f))
  }
})

// renderer: ImportDropZone.tsx
function handleDrop(e: React.DragEvent) {
  e.preventDefault()
  const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.jsonl'))
  const paths = window.electronAPI.getFilePaths(files)
  // Import each file via discovery/metadata extraction
  onImportFiles(paths)
}
```

### Pattern 4: File Picker Import (Individual JSONL Files)
**What:** An "Import" button opens Electron's native file dialog filtered to `.jsonl` files. Selected files are added to the discovered sessions list via metadata extraction.
**When to use:** When the user wants to import specific JSONL files from arbitrary locations.
**Example:**
```typescript
// main/index.ts
ipcMain.handle('pipeline:importFiles', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'JSONL Files', extensions: ['jsonl'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    title: 'Import Session Files'
  })
  if (result.canceled || result.filePaths.length === 0) return []
  // Extract metadata for each selected file
  const sessions = await Promise.all(
    result.filePaths.map(fp => extractSessionMetadata(fp, deriveProjectFolder(fp)))
  )
  return sessions
})
```

### Pattern 5: Session Duration from Metadata Scan
**What:** Extend the metadata scan to also track the last timestamp seen, then compute duration as `lastTimestamp - firstTimestamp`. For short sessions (< 150 lines), this is exact. For long sessions, the metadata scan only reads 150 lines, so we also read the last ~4KB of the file to find the true last timestamp.
**When to use:** Always -- duration is shown on every session card.
**Example:**
```typescript
// discovery.ts - read last few lines for lastTimestamp
async function extractLastTimestamp(filePath: string): Promise<string | null> {
  const stats = await stat(filePath)
  const bufferSize = Math.min(4096, stats.size)
  const buffer = Buffer.alloc(bufferSize)
  const fd = await open(filePath, 'r')
  await read(fd, buffer, 0, bufferSize, stats.size - bufferSize)
  await close(fd)

  const tail = buffer.toString('utf-8')
  const lines = tail.split('\n').filter(l => l.trim())
  let lastTs: string | null = null
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      if (typeof parsed.timestamp === 'string') lastTs = parsed.timestamp
    } catch { /* skip malformed */ }
  }
  return lastTs
}
```

### Pattern 6: Full-Content Search via IPC
**What:** Keyword search that matches against full message content requires parsing the entire session, which is expensive. The approach is: (1) search metadata fields first (snippet, project name) which is instant, (2) for "deep search" that includes full message content, run an IPC call that streams through the JSONL file searching for the query string without full parsing.
**When to use:** When the user searches for keywords that might appear in message bodies, not just session snippets.
**Example:**
```typescript
// main process: lightweight content search
ipcMain.handle('pipeline:searchSessionContent', async (_event, filePath: string, query: string) => {
  const rl = createInterface({ input: createReadStream(filePath, { encoding: 'utf-8' }) })
  const q = query.toLowerCase()
  for await (const line of rl) {
    if (line.toLowerCase().includes(q)) {
      rl.close()
      return true  // This session contains the query
    }
  }
  return false
})
```

### Anti-Patterns to Avoid
- **Full-parsing all sessions for search:** Never parse all sessions through the full pipeline just to search. Use lightweight line-by-line string matching for content search.
- **Filtering in the store action:** Keep filter logic as pure functions outside the store. The store holds the filter parameters; derived state (filtered list) is computed with `useMemo` in the component.
- **Storing filtered results in state:** Do not store `filteredSessions` in Zustand. Store `searchQuery` and `dateFilter` as inputs, compute the output via `useMemo`. This prevents stale state.
- **Blocking the renderer on deep search:** Full-content search across many files should be async with visual feedback, not blocking.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File path from drag-and-drop | Manual File.path access | `webUtils.getPathForFile()` | File.path is deprecated in Electron 36+; webUtils is the official replacement |
| Date parsing/comparison | Custom date math | Native `Date` constructor + `getTime()` | ISO 8601 timestamps parse correctly with `new Date()`, no library needed |
| File dialog | Custom file browser UI | `dialog.showOpenDialog()` with filters | Native OS dialog is more familiar and handles edge cases |
| Icon library | SVG icons or custom components | `lucide-react` (already installed) | Consistent icon style, already used throughout the app |
| View mode state | localStorage or component state | Zustand store | Consistent with existing state management pattern |

## Common Pitfalls

### Pitfall 1: webUtils.getPathForFile Must Be Called in Preload
**What goes wrong:** Calling `webUtils.getPathForFile()` in the renderer process fails silently or throws. It only works in the preload script where `electron` modules are available.
**Why it happens:** The renderer runs in a sandboxed context without access to Electron's native modules. `webUtils` is an Electron API, not a web API.
**How to avoid:** Expose a helper function via `contextBridge` in the preload that accepts File objects and returns paths. The renderer passes File objects from the drop event to this preload-bridged function.
**Warning signs:** Empty strings returned from `getPathForFile()`, or "webUtils is not defined" errors.

### Pitfall 2: Metadata Duration is Approximate for Long Sessions
**What goes wrong:** The 150-line metadata scan doesn't reach the end of long sessions, so `lastTimestamp` from the scan window underestimates session duration.
**Why it happens:** The scan was designed for fast metadata extraction, not full file analysis.
**How to avoid:** Read the last ~4KB of the file separately to find the true last timestamp. Most JSONL lines are under 1KB, so 4KB captures the last several lines reliably.
**Warning signs:** Very short durations shown for sessions that actually ran for hours.

### Pitfall 3: Search Against Full Message Content is Expensive
**What goes wrong:** Searching all session files for a keyword takes noticeable time (100ms+ per file x many files = multi-second delay).
**Why it happens:** Each file must be read from disk and scanned line-by-line.
**How to avoid:** Two-tier search: (1) instant metadata search against cached `SessionMetadata` fields, (2) async deep search via IPC with a loading indicator. Debounce the search input (300ms) to avoid firing on every keystroke.
**Warning signs:** UI freezing during search, especially with many sessions.

### Pitfall 4: Drag-and-Drop Default Behavior Must Be Prevented
**What goes wrong:** Without `e.preventDefault()` on both `dragover` and `drop` events, Electron/Chromium navigates to the dropped file, replacing the app with raw file contents.
**Why it happens:** The browser default for file drops is to open/display the file.
**How to avoid:** Always call `e.preventDefault()` and `e.stopPropagation()` on both `dragover` and `drop` handlers. Apply this globally or on the specific drop zone container.
**Warning signs:** App content replaced by raw JSONL text when a file is dropped.

### Pitfall 5: Importing Files Outside ~/.claude Lacks Project Folder Context
**What goes wrong:** Files imported via drag-and-drop or file picker don't have a natural `projectFolder` since they're not in the `~/.claude/projects/{project}/` structure.
**Why it happens:** The existing discovery derives `projectFolder` from the directory structure. Imported files could be anywhere.
**How to avoid:** Derive a project folder name from the file's parent directory path, or use "Imported" as a fallback group name. The `extractSessionMetadata` function already takes `projectFolder` as a parameter, so the caller just needs to compute it.
**Warning signs:** Sessions showing with empty or undefined project names.

### Pitfall 6: File Not Found State for Moved/Deleted Source Files
**What goes wrong:** Sessions reference files by path (per locked decision: "files referenced in-place"). If the source JSONL file is moved or deleted, clicking the session for preview will fail.
**Why it happens:** Files are not copied into app storage. The user may reorganize their filesystem.
**How to avoid:** When parsing fails with a file-not-found error, show a clear "Source file not found" state in the preview panel with the original path displayed. The session card in the list should also get an indicator (similar to the existing error badge pattern).
**Warning signs:** Cryptic error messages or blank preview panels.

## Code Examples

### Example 1: Extended SessionMetadata Type
```typescript
// src/main/pipeline/types.ts and src/renderer/src/types/pipeline.ts
export interface SessionMetadata {
  sessionId: string
  projectFolder: string
  filePath: string
  firstTimestamp: string | null
  lastTimestamp: string | null        // NEW: for duration calculation
  firstUserMessage: string | null
  messageCount: number
  parseError: string | null
}

// Derived duration helper (renderer-side)
export function formatSessionDuration(meta: SessionMetadata): string {
  if (!meta.firstTimestamp || !meta.lastTimestamp) return 'Unknown'
  const startMs = new Date(meta.firstTimestamp).getTime()
  const endMs = new Date(meta.lastTimestamp).getTime()
  const diffMs = endMs - startMs
  if (diffMs < 60_000) return '<1 min'
  if (diffMs < 3_600_000) return `${Math.round(diffMs / 60_000)} min`
  const hours = Math.floor(diffMs / 3_600_000)
  const mins = Math.round((diffMs % 3_600_000) / 60_000)
  return `${hours}h ${mins}m`
}
```

### Example 2: Date Filter Types and Logic
```typescript
// utils/sessionFiltering.ts
export type DatePreset = 'all' | 'today' | 'this-week' | 'this-month' | 'older' | 'custom'

export interface DateFilter {
  preset: DatePreset
  customStart?: string  // ISO date string
  customEnd?: string    // ISO date string
}

function matchesDateFilter(session: SessionMetadata, filter: DateFilter): boolean {
  if (filter.preset === 'all') return true
  if (!session.firstTimestamp) return filter.preset === 'older'

  const sessionDate = new Date(session.firstTimestamp)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (filter.preset) {
    case 'today':
      return sessionDate >= startOfToday
    case 'this-week': {
      const startOfWeek = new Date(startOfToday)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      return sessionDate >= startOfWeek
    }
    case 'this-month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return sessionDate >= startOfMonth
    }
    case 'older': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return sessionDate < startOfMonth
    }
    case 'custom': {
      if (filter.customStart && sessionDate < new Date(filter.customStart)) return false
      if (filter.customEnd) {
        const endDate = new Date(filter.customEnd)
        endDate.setDate(endDate.getDate() + 1)  // Include the end date
        if (sessionDate >= endDate) return false
      }
      return true
    }
    default:
      return true
  }
}
```

### Example 3: Drag-and-Drop Zone Component
```typescript
// components/builder/ImportDropZone.tsx
import React, { useState, useCallback } from 'react'
import { Upload } from 'lucide-react'

interface ImportDropZoneProps {
  onImportFiles: (filePaths: string[]) => void
  children: React.ReactNode
}

export function ImportDropZone({ onImportFiles, children }: ImportDropZoneProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.jsonl'))
    if (files.length === 0) return

    const paths = window.electronAPI.getFilePaths(files)
    onImportFiles(paths.filter(p => p.length > 0))
  }, [onImportFiles])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        height: '100%'
      }}
    >
      {children}
      {isDragOver && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(13, 148, 136, 0.08)',
          border: '2px dashed var(--color-accent)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}>
          <div style={{ textAlign: 'center', color: 'var(--color-accent)' }}>
            <Upload size={32} />
            <p>Drop JSONL files to import</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Example 4: Preload webUtils Integration
```typescript
// preload/index.ts (additions)
import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods ...

  // Drag-and-drop: extract file paths from dropped File objects
  getFilePaths: (files: File[]): string[] => {
    return files.map(f => webUtils.getPathForFile(f))
  },

  // Import: open file picker for JSONL files
  importFiles: (): Promise<unknown> =>
    ipcRenderer.invoke('pipeline:importFiles'),

  // Deep search: check if a session file contains a query string
  searchSessionContent: (filePath: string, query: string): Promise<boolean> =>
    ipcRenderer.invoke('pipeline:searchSessionContent', filePath, query)
})
```

### Example 5: Search/Filter Bar Component Structure
```typescript
// components/builder/SearchFilterBar.tsx
import React from 'react'
import { Search, Calendar, List, LayoutGrid } from 'lucide-react'
import type { DateFilter, DatePreset } from '../../utils/sessionFiltering'

interface SearchFilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  dateFilter: DateFilter
  onDateFilterChange: (filter: DateFilter) => void
  viewMode: 'grouped' | 'chronological'
  onViewModeChange: (mode: 'grouped' | 'chronological') => void
  sessionCount: number
  filteredCount: number
}

// Layout: [Search input] [Date preset buttons] [Custom date range] [View toggle] [Count]
// All controls always visible (per locked decision)
```

### Example 6: Preview Summary Header
```typescript
// components/builder/SessionPreviewHeader.tsx
import React from 'react'
import type { StitchedSession, SessionMetadata } from '../../types/pipeline'
import { filterVisibleMessages } from '../../utils/messageFiltering'

interface SessionPreviewHeaderProps {
  session: StitchedSession
  metadata: SessionMetadata | null
}

export function SessionPreviewHeader({ session, metadata }: SessionPreviewHeaderProps): React.JSX.Element {
  const visibleMessages = filterVisibleMessages(session.messages, false)
  const narrativeCount = visibleMessages.length
  // Build steps to get step count (reuse existing utility)
  // Duration from metadata timestamps
  // Project path from metadata

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      backgroundColor: 'var(--color-bg-tertiary)',
      borderRadius: 'var(--radius-md)',
      borderBottom: '1px solid var(--color-border)'
    }}>
      {/* Stat cards: Messages, Steps, Duration, Project */}
    </div>
  )
}
```

## Discretionary Recommendations

These address the areas marked as "Claude's Discretion" in CONTEXT.md:

### Session List Visual Density: Compact Rows
**Recommendation:** Use compact rows (not cards) for the session list. Each session item is decided to show 4 pieces of metadata (date/time, message count, command/snippet, duration). This fits well in a single-row compact layout without needing card-style spacing. The existing `SessionCard` component already uses a compact button-style layout -- refine it slightly rather than switching to large cards.
**Rationale:** The session list is a browsing/filtering tool, not a showcase. Higher density means more sessions visible without scrolling, which aids scanning and selection. The existing UI already uses this pattern.

### Search/Filter Control Layout: Separate Bar
**Recommendation:** A dedicated search/filter bar above the session list with three distinct sections: (1) search input on the left (largest), (2) date preset buttons in the center, (3) view mode toggle on the right. Custom date range inputs appear conditionally below the presets when "Custom" is selected.
**Rationale:** Separating search from filters makes each control discoverable. A combined "token bar" (like Gmail's search chips) is powerful but requires more UI sophistication than needed here. The simple layout matches the existing app's straightforward style.

### Project Filter Implementation: Part of Search
**Recommendation:** Do not add a separate project dropdown. Project names are already searchable via keyword search (the `matchesSearch` function checks `projectFolder`). Adding a dedicated dropdown adds UI complexity for marginal benefit -- users can type the project name to filter.
**Rationale:** The project-grouped view already provides project-level organization. A search query like "PromptPlayer" already filters to that project. A dropdown would require populating a unique project list and adding another control.

### Preview Panel Layout: Side-by-Side Split
**Recommendation:** Keep the existing side-by-side split layout from `Builder.tsx` (session list 50% / preview 50%). The preview panel already works this way in the current codebase. Add the summary header at the top of the preview panel, then the scrollable conversation below.
**Rationale:** Side-by-side allows the user to see the session list and preview simultaneously, enabling quick comparison between sessions. A full overlay would require dismissing the preview to select another session, which is slower.

### Key Commands in Preview Summary: Yes, Include Them
**Recommendation:** If the session's snippet is a command (starts with `/`), show it prominently in the preview summary header alongside the stats. This gives immediate context for what the session was about.
**Rationale:** Command names like `/gsd:plan-phase` are highly informative and compact. Showing them in the preview header saves the user from scrolling to find the first message.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `File.path` for drag-drop paths | `webUtils.getPathForFile()` | Electron 29+ (deprecated), Electron 36+ (removed) | Must use preload bridge for drag-drop file paths |
| Store filtered results in state | Compute filtered results with `useMemo` | React best practice | Prevents stale derived state, simpler mental model |
| Full-parse for search | Line-by-line string search via IPC | Performance optimization | Avoids parsing overhead for simple text matching |

**Deprecated/outdated:**
- `File.path` property: Removed in recent Electron versions. Use `webUtils.getPathForFile()` instead.

## Open Questions

1. **Full-content search performance with many sessions**
   - What we know: Line-by-line search of a single file is fast (~10-50ms). But searching across 50+ session files could take 1-2 seconds.
   - What's unclear: Whether users will have enough sessions for this to be noticeable. The auto-discover from `~/.claude` typically finds 10-50 sessions.
   - Recommendation: Implement metadata-only search first. Add deep content search as a follow-up if users report that metadata search is insufficient. If implemented, debounce input (300ms) and show a "Searching..." indicator.

2. **Approximate vs exact message count**
   - What we know: The metadata scan reads only 150 lines, so `messageCount` is approximate for long sessions. The full parse gives exact counts.
   - What's unclear: Whether users will notice the discrepancy between the list count and the preview panel count.
   - Recommendation: Accept the approximation for the list view. The preview panel shows the exact count from the full parse. Consider adding a "~" prefix to the count in the list view for transparency (e.g., "~42 msgs").

3. **Session deduplication when importing**
   - What we know: The same session could be discovered via auto-scan AND imported via drag-and-drop, creating duplicates.
   - What's unclear: How common this scenario is.
   - Recommendation: Deduplicate by `sessionId` (UUID from filename). If a session with the same ID already exists in the discovered list, skip it or update its metadata. The `sessionId` is unique per session.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/main/pipeline/discovery.ts`, `src/renderer/src/stores/sessionStore.ts`, `src/renderer/src/components/builder/SessionList.tsx`, `src/renderer/src/routes/Builder.tsx` -- verified all existing patterns
- [Electron webUtils API documentation](https://www.electronjs.org/docs/latest/api/web-utils) -- `getPathForFile()` method and usage
- [Electron dialog API documentation](https://www.electronjs.org/docs/latest/api/dialog) -- `showOpenDialog` with file filters

### Secondary (MEDIUM confidence)
- [Electron drag-and-drop file paths tutorial (2025)](https://jiaopucun.com/2025/04/04/drag-drop-files-electron-file-paths/) -- confirmed `webUtils.getPathForFile()` pattern for preload bridge
- [Zustand selector patterns](https://github.com/pmndrs/zustand/discussions/387) -- derived state best practices
- [Electron File.path deprecation issue](https://github.com/electron/electron/issues/47284) -- confirmed File.path no longer available

### Tertiary (LOW confidence)
- None -- all findings verified against official docs or codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns verified against existing codebase
- Architecture: HIGH -- extends proven patterns from Phase 2 (discovery, IPC, Zustand) and Phase 4 (message filtering, preview)
- Pitfalls: HIGH -- verified Electron API changes against official docs; file handling patterns tested
- Search/filter: MEDIUM -- performance characteristics of full-content search across many files estimated but not benchmarked

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable -- no fast-moving dependencies)
