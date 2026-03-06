# Phase 6: Builder Presentation Assembly - Research

**Researched:** 2026-02-22
**Domain:** Presentation data modeling, hierarchical state management, inline editing, multi-document UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Creation flow
- User starts by selecting sessions from the session library, then clicks "Create presentation from selected"
- Sessions can come from any project -- presentations are not scoped to a single project
- Sessions are references, not copies -- the same session can appear in multiple presentations
- User can work on multiple presentations (tabs or list to switch between them)
- Adding more sessions after initial creation: Claude's discretion on approach (return to library vs side panel vs other)

#### Organization model
- One level of nesting: top-level sections contain sessions inside them
- Each session auto-gets its own section when added (named after the session)
- User can merge sections to group related sessions (e.g., pause-work/resume-work splits of the same logical step)
- Auto-grouping suggestion when adding multiple sessions: Claude's discretion on whether to include in v1 or defer -- if deferred, note for future (detect GSD phase patterns from command metadata to suggest section grouping)

#### Reordering
- Sessions auto-sort chronologically -- no manual reordering in v1
- Sort key: Claude's discretion based on available metadata from Phase 2/5
- Manual reordering (drag-and-drop or up/down buttons) noted as future enhancement

#### Naming & labeling
- Presentations auto-named on creation (e.g., project name + date), user renames inline later
- Sessions labeled with auto-generated friendly names derived from metadata (not raw command strings)
- Both section names and session names use inline click-to-edit (click text, it becomes editable, confirm with Enter or blur)
- Consistent interaction pattern across all nameable elements

### Claude's Discretion
- How to add more sessions after initial creation (UI approach)
- Whether smart auto-grouping by GSD phase pattern is feasible for v1 or deferred
- Chronological sort key (session start time, first message timestamp, etc.)
- Auto-generated friendly name format for sessions
- Auto-name format for new presentations
</user_constraints>

### Deferred Ideas (OUT OF SCOPE)
- Manual reordering (drag-and-drop or up/down buttons) -- future enhancement if chronological isn't sufficient
- Smart auto-grouping by GSD phase pattern detection -- if not included in v1, capture for future
- Multi-.promptplay file playback (playing multiple presentation files together, e.g., one per milestone) -- future capability
- Smart Player playback (Player being intelligent about what to emphasize vs skim through) -- Phase 8 territory

## Summary

Phase 6 introduces the core presentation assembly workflow: creating, organizing, and naming multi-session presentations. The user selects sessions from the existing session library (Phase 5), creates a presentation, and organizes it into a hierarchical structure of sections containing sessions. Sessions auto-sort chronologically and auto-generate friendly names from metadata. The user can merge sections to group related sessions and rename any element via inline click-to-edit.

The architecture extends the existing Zustand + JSON persistence pattern established in Phases 1-5. A new `presentationStore` manages the active presentation(s) and provides actions for creation, section manipulation, and renaming. A new `presentations.json` file on the main process (alongside the existing `sessions.json`) persists presentation data. The presentation data model uses session references (sessionId strings) rather than copies, linking to the already-stored `StoredSession` objects. The Builder route gets a new "assembly" view alongside the existing "session browser" view, with a UI that shows the presentation outline (sections with sessions) and allows section merging and inline renaming.

No new npm dependencies are needed. The inline edit component is simple enough to build with native React hooks (useState, useRef, useEffect) -- ~30 lines of code. ID generation uses the browser-native `crypto.randomUUID()` available in Electron 40's Chromium. Nested state updates in Zustand use the manual spread pattern consistent with the existing codebase (Immer is not installed and would be an unnecessary addition for this level of nesting).

**Primary recommendation:** Build a new `presentationStore` Zustand store with a flat presentation model (sections array containing session reference arrays), a corresponding main-process JSON persistence layer (`presentations.json`), and extend the Builder route with a two-panel assembly view showing the session library on one side and the presentation outline on the other.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.11 | Presentation state management (new presentationStore) | Already in project, established pattern from sessionStore |
| React (hooks) | 19.0.0 | useState/useRef for inline edit, useMemo for derived state | Already in project |
| lucide-react | 0.575.0 | Icons for sections, sessions, merge, edit actions | Already in project |
| Node.js `fs` | built-in | JSON file persistence for presentations.json | Established pattern from sessionStore.ts |
| `crypto.randomUUID()` | Web API | Generate unique IDs for presentations and sections | Available in Electron 40's Chromium, no dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TailwindCSS | 4.2.0 | Layout utilities for assembly view | Already in project |
| React Router | 7.13.0 | Hash router (existing) | No changes needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual spread for nested state | Zustand Immer middleware | Would require installing `immer` as new dependency; nesting is only 2 levels deep (presentation -> sections -> sessionRefs), manageable with spreads |
| Custom InlineEdit component | react-click-edit or react-contenteditable | Adds dependency for ~30 lines of simple code; project pattern is to minimize dependencies |
| crypto.randomUUID() | nanoid | nanoid produces shorter IDs but requires new dependency; UUIDs are fine for internal IDs |

**Installation:**
```bash
# No new dependencies required -- all capabilities already available
```

## Architecture Patterns

### Recommended Project Structure (Phase 6 additions)
```
src/
├── main/
│   ├── index.ts                              # MODIFIED: new IPC handlers for presentation CRUD
│   └── storage/
│       ├── sessionStore.ts                   # EXISTING (unchanged)
│       └── presentationStore.ts              # NEW: presentation JSON persistence
├── preload/
│   └── index.ts                              # MODIFIED: expose presentation IPC methods
└── renderer/src/
    ├── components/builder/
    │   ├── SessionList.tsx                   # MODIFIED: add selection checkboxes
    │   ├── SessionCard.tsx                   # MODIFIED: add selectable state
    │   ├── PresentationOutline.tsx           # NEW: hierarchical section/session view
    │   ├── SectionHeader.tsx                 # NEW: section row with merge/rename actions
    │   ├── SessionEntry.tsx                  # NEW: session row within section (name, metadata)
    │   ├── InlineEdit.tsx                    # NEW: reusable click-to-edit text component
    │   └── PresentationList.tsx              # NEW: list of presentations (tab/switcher)
    ├── routes/
    │   └── Builder.tsx                       # MODIFIED: two-view mode (browse vs assembly)
    ├── stores/
    │   ├── sessionStore.ts                   # MODIFIED: add multi-select state for creation flow
    │   └── presentationStore.ts              # NEW: presentation CRUD, section manipulation
    ├── types/
    │   ├── electron.d.ts                     # MODIFIED: new IPC method types
    │   └── presentation.ts                   # NEW: Presentation, Section, SessionRef types
    └── utils/
        └── presentationUtils.ts              # NEW: auto-naming, chronological sorting, friendly name generation
```

### Pattern 1: Presentation Data Model
**What:** A flat, serializable data structure that represents a presentation as an ordered array of sections, each containing ordered session references. Sessions are referenced by ID, not copied.
**When to use:** All presentation state management and persistence.
**Example:**
```typescript
// types/presentation.ts
export interface SessionRef {
  sessionId: string           // References StoredSession.sessionId
  displayName: string         // User-editable friendly name
  sortKey: string             // ISO timestamp for chronological ordering
}

export interface PresentationSection {
  id: string                  // crypto.randomUUID()
  name: string                // User-editable section name
  sessionRefs: SessionRef[]   // Ordered by sortKey (chronological)
}

export interface Presentation {
  id: string                  // crypto.randomUUID()
  name: string                // User-editable presentation name
  sections: PresentationSection[]
  createdAt: number           // Date.now()
  updatedAt: number           // Date.now()
}
```

### Pattern 2: Presentation Store (Zustand)
**What:** A new Zustand store managing presentation CRUD operations, section manipulation, and active presentation tracking. Follows the existing `sessionStore` pattern of delegating persistence to main-process IPC.
**When to use:** All presentation state operations in the renderer.
**Example:**
```typescript
// stores/presentationStore.ts
import { create } from 'zustand'
import type { Presentation, PresentationSection } from '../types/presentation'

interface PresentationState {
  // State
  presentations: Presentation[]
  activePresentationId: string | null
  isLoading: boolean

  // CRUD
  loadPresentations: () => Promise<void>
  createPresentation: (sessionIds: string[]) => Promise<string>
  deletePresentation: (id: string) => Promise<void>
  setActivePresentation: (id: string | null) => void

  // Section manipulation
  mergeSections: (presentationId: string, sectionIds: string[]) => void
  renameSection: (presentationId: string, sectionId: string, name: string) => void

  // Session/presentation naming
  renamePresentation: (id: string, name: string) => void
  renameSession: (presentationId: string, sectionId: string, sessionId: string, name: string) => void

  // Add more sessions
  addSessions: (presentationId: string, sessionIds: string[]) => void
  removeSession: (presentationId: string, sectionId: string, sessionId: string) => void
}
```

### Pattern 3: Main-Process Presentation Persistence
**What:** A JSON file store for presentations, following the exact same pattern as `sessionStore.ts` (readFileSync/writeFileSync with JSON). Stores the presentation hierarchy; session data remains in `sessions.json`.
**When to use:** All presentation save/load operations.
**Example:**
```typescript
// main/storage/presentationStore.ts
import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const PRESENTATIONS_FILE = 'presentations.json'

function getPresentationsPath(): string {
  return join(app.getPath('userData'), PRESENTATIONS_FILE)
}

export function getPresentations(): Presentation[] {
  try {
    const data = readFileSync(getPresentationsPath(), 'utf-8')
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed as Presentation[]
  } catch {
    return []
  }
}

export function savePresentation(presentation: Presentation): void {
  const presentations = getPresentations()
  const idx = presentations.findIndex(p => p.id === presentation.id)
  if (idx >= 0) {
    presentations[idx] = presentation
  } else {
    presentations.push(presentation)
  }
  writePresentations(presentations)
}

export function deletePresentation(id: string): void {
  const presentations = getPresentations()
  writePresentations(presentations.filter(p => p.id !== id))
}

function writePresentations(presentations: Presentation[]): void {
  const storagePath = getPresentationsPath()
  mkdirSync(join(app.getPath('userData')), { recursive: true })
  writeFileSync(storagePath, JSON.stringify(presentations, null, 2), 'utf-8')
}
```

### Pattern 4: Inline Edit Component
**What:** A reusable component that displays text in a span, switches to an input on click, and confirms on Enter/blur. Used for presentation names, section names, and session names.
**When to use:** All user-editable text labels in the presentation assembly view.
**Example:**
```typescript
// components/builder/InlineEdit.tsx
import React, { useState, useRef, useEffect } from 'react'

interface InlineEditProps {
  value: string
  onSave: (newValue: string) => void
  className?: string
  style?: React.CSSProperties
}

export function InlineEdit({ value, onSave, className, style }: InlineEditProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes
  useEffect(() => {
    if (!isEditing) setEditValue(value)
  }, [value, isEditing])

  // Auto-focus and select all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = (): void => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      setEditValue(value) // Revert empty/unchanged
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={className}
        style={{
          ...style,
          background: 'transparent',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-sm)',
          outline: 'none',
          padding: '0 var(--space-1)',
          width: '100%'
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={className}
      title="Click to edit"
      style={{
        ...style,
        cursor: 'text',
        borderBottom: '1px dashed transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderBottomColor = 'var(--color-text-muted)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderBottomColor = 'transparent'
      }}
    >
      {value}
    </span>
  )
}
```

### Pattern 5: Multi-Select Session Creation Flow
**What:** The existing SessionCard/SessionList components gain a selectable mode (checkboxes) for the creation flow. When the user has selected sessions, a "Create Presentation" button appears. Clicking it creates a new presentation with one section per session, auto-sorted chronologically.
**When to use:** The initial creation flow when the user starts building a new presentation.
**Example:**
```typescript
// In sessionStore.ts -- add selection state
selectedSessionIds: Set<string>
toggleSessionSelection: (sessionId: string) => void
clearSelection: () => void
isSelecting: boolean
setSelecting: (selecting: boolean) => void

// Toggle a session's selected state
toggleSessionSelection: (sessionId: string) => {
  const { selectedSessionIds } = get()
  const next = new Set(selectedSessionIds)
  if (next.has(sessionId)) {
    next.delete(sessionId)
  } else {
    next.add(sessionId)
  }
  set({ selectedSessionIds: next })
}
```

### Pattern 6: Chronological Sort with Available Metadata
**What:** Sessions within a presentation are auto-sorted by `firstTimestamp` from `SessionMetadata`. This field is always populated (from Phase 2/5 metadata extraction) and represents when the session started. For sessions missing timestamps, sort them to the end.
**When to use:** Whenever sessions are added to a presentation or when rendering the presentation outline.
**Example:**
```typescript
// utils/presentationUtils.ts
import type { SessionRef } from '../types/presentation'

export function sortSessionRefsChronologically(refs: SessionRef[]): SessionRef[] {
  return [...refs].sort((a, b) => {
    if (!a.sortKey && !b.sortKey) return 0
    if (!a.sortKey) return 1  // Missing timestamps sort last
    if (!b.sortKey) return -1
    return a.sortKey.localeCompare(b.sortKey) // ISO strings compare lexicographically
  })
}
```

### Pattern 7: Auto-Generated Friendly Names
**What:** When a session is added to a presentation, its displayName is auto-generated from metadata. The GSD command metadata (already extracted as `firstUserMessage` in Phase 2) provides rich naming material.
**When to use:** Every time a session is added to a presentation.
**Example:**
```typescript
// utils/presentationUtils.ts

/**
 * Generate a friendly display name for a session from its metadata.
 *
 * Priority:
 * 1. GSD command: "/gsd:plan-phase 3" -> "Plan Phase 3"
 * 2. First user message: "Create a login component" -> "Create a login component"
 * 3. Fallback: "Session <short-id>"
 */
export function generateSessionDisplayName(meta: SessionMetadata): string {
  const snippet = meta.firstUserMessage

  if (!snippet) {
    return `Session ${meta.sessionId.slice(0, 8)}`
  }

  // GSD command pattern: /gsd:verb-noun [args]
  const gsdMatch = snippet.match(/^\/gsd:(\S+)\s*(.*)$/)
  if (gsdMatch) {
    const command = gsdMatch[1]          // e.g., "plan-phase"
    const args = gsdMatch[2].trim()      // e.g., "3"
    // Convert kebab-case to title case: "plan-phase" -> "Plan Phase"
    const title = command
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    return args ? `${title} ${args}` : title
  }

  // Other slash commands: /command args
  const cmdMatch = snippet.match(/^\/(\S+)\s*(.*)$/)
  if (cmdMatch) {
    const cmd = cmdMatch[1]
    const args = cmdMatch[2].trim()
    const title = cmd.charAt(0).toUpperCase() + cmd.slice(1)
    return args ? `${title}: ${args}` : title
  }

  // Plain user message: truncate to reasonable length
  return snippet.length > 60 ? snippet.slice(0, 57) + '...' : snippet
}

/**
 * Generate a default presentation name from the sessions being added.
 *
 * Format: "{project} - {date}" or "Presentation - {date}" if mixed projects.
 */
export function generatePresentationName(sessions: SessionMetadata[]): string {
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const projects = new Set(sessions.map(s => s.projectFolder))
  if (projects.size === 1) {
    const projectName = sessions[0].projectFolder
    return `${projectName} - ${date}`
  }

  return `Presentation - ${date}`
}
```

### Pattern 8: Section Merge Operation
**What:** The user selects two or more adjacent sections and merges them into one. The merged section contains all sessions from the source sections, sorted chronologically. The section name defaults to the first section's name.
**When to use:** When the user wants to group related sessions (e.g., discuss/plan/execute for one GSD phase).
**Example:**
```typescript
// In presentationStore
mergeSections: (presentationId: string, sectionIds: string[]): void => {
  const { presentations } = get()
  const pres = presentations.find(p => p.id === presentationId)
  if (!pres || sectionIds.length < 2) return

  const sectionsToMerge = pres.sections.filter(s => sectionIds.includes(s.id))
  if (sectionsToMerge.length < 2) return

  // Collect all session refs from sections being merged
  const allRefs = sectionsToMerge.flatMap(s => s.sessionRefs)
  const sortedRefs = sortSessionRefsChronologically(allRefs)

  // Create merged section using first section's name
  const mergedSection: PresentationSection = {
    id: sectionsToMerge[0].id,  // Keep first section's ID
    name: sectionsToMerge[0].name,
    sessionRefs: sortedRefs
  }

  // Replace sections: put merged section where first was, remove others
  const firstIdx = pres.sections.findIndex(s => s.id === sectionIds[0])
  const removeIds = new Set(sectionIds.slice(1))
  const newSections = pres.sections
    .filter(s => !removeIds.has(s.id))
    .map(s => s.id === sectionIds[0] ? mergedSection : s)

  // Update presentation
  const updated = {
    ...pres,
    sections: newSections,
    updatedAt: Date.now()
  }
  // ... persist via IPC
}
```

### Anti-Patterns to Avoid
- **Copying session data into presentations:** Sessions are references (sessionId), not copies. Presentations link to StoredSession objects. Duplicating message data would bloat the presentations.json file and create stale-data issues.
- **Putting presentation and session stores in one mega-store:** Keep `presentationStore` and `sessionStore` as separate Zustand stores. They have different concerns and update frequencies. Cross-store reads are fine (e.g., presentationStore reads sessionStore for metadata).
- **Using Immer just for this phase:** The nesting depth is Presentation -> Sections -> SessionRefs (2 levels). Manual spread operators handle this cleanly. Adding Immer for this alone adds unnecessary complexity.
- **Building drag-and-drop for v1:** Per locked decisions, sessions auto-sort chronologically. Drag-and-drop is explicitly deferred. Do not build any reordering infrastructure.
- **Using contentEditable for inline editing:** contentEditable has many edge cases (HTML entities, cursor management, paste behavior). A simple `<input>` that shows/hides is more reliable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique IDs | Custom ID counter or timestamp-based | `crypto.randomUUID()` | Collision-free, cryptographically random, built into Chromium |
| JSON persistence | Custom file format or SQLite | JSON readFileSync/writeFileSync | Established project pattern from Phase 1; data volumes are small (dozens of presentations, not thousands) |
| Date formatting | Custom date formatter | `Date.toLocaleDateString()` with options | Built-in internationalization; consistent format |
| Kebab-to-title conversion | Complex regex | Simple split('-').map().join(' ') | Straightforward string operation, no library needed |
| Multi-select state | External library | Set<string> in Zustand store | Native JS Set is perfect for toggle semantics |

**Key insight:** This phase is fundamentally about data modeling and UI composition. The technical operations (CRUD, rename, merge, sort) are all simple transformations on small data structures. The challenge is getting the UX flow right, not solving hard technical problems.

## Common Pitfalls

### Pitfall 1: Stale Session References After Deletion
**What goes wrong:** A presentation references a sessionId that no longer exists in `sessions.json` because the user deleted it from storage.
**Why it happens:** Presentations store sessionId references, not copies. If the referenced session is removed, the reference becomes dangling.
**How to avoid:** When loading a presentation, resolve each sessionId against the stored sessions. Display missing sessions with a warning indicator (similar to the existing "Source File Not Found" pattern in the Builder preview). Do not crash or silently omit them.
**Warning signs:** Empty session entries in the presentation outline, or errors when trying to play a presentation.

### Pitfall 2: Merge Creates Empty Sections
**What goes wrong:** After merging sections, the source sections should be removed. If only the session refs are moved but the empty source sections remain, the UI shows confusing empty sections.
**Why it happens:** Off-by-one logic in the merge operation -- moving refs without removing the now-empty source sections.
**How to avoid:** The merge operation must atomically: (1) combine refs into the target section, (2) remove all non-target source sections. Implement as a single state update, not sequential operations.
**Warning signs:** Empty sections appearing in the outline after a merge operation.

### Pitfall 3: InlineEdit onBlur Fires Before onClick on Adjacent Buttons
**What goes wrong:** When the user is editing a name and clicks a button (like "Merge" or "Delete"), the blur event fires first and saves the edit, but the button's click event may not fire because the DOM reflows.
**Why it happens:** React event ordering -- blur fires before click when focus changes.
**How to avoid:** Use `onMouseDown` with `e.preventDefault()` on action buttons that might conflict with blur saves. This prevents the blur from firing before the click handler executes. Alternatively, add a small timeout to the blur handler (50ms) to let click events fire first.
**Warning signs:** Action buttons near editable text fields that require double-clicking to work.

### Pitfall 4: Zustand State Mutation in Nested Updates
**What goes wrong:** Accidentally mutating the existing state object instead of creating new references, causing React to miss re-renders.
**Why it happens:** With nested objects (presentation -> sections -> sessionRefs), it's easy to forget a spread at one level.
**How to avoid:** Always create new arrays and objects at every level of nesting:
```typescript
// WRONG - mutates existing section
const section = pres.sections.find(s => s.id === sectionId)
section.name = newName  // Mutation!

// RIGHT - create new references at every level
const updated = {
  ...pres,
  sections: pres.sections.map(s =>
    s.id === sectionId ? { ...s, name: newName } : s
  ),
  updatedAt: Date.now()
}
```
**Warning signs:** State changes that don't trigger re-renders; components showing stale data.

### Pitfall 5: Multi-Select State Bleeding Between Views
**What goes wrong:** The session selection state (checkboxes) persists when the user navigates away from the selection flow and returns, showing stale selections.
**Why it happens:** Selection state is stored in the Zustand store which persists across route renders.
**How to avoid:** Clear selection state when entering/leaving the creation flow. The `isSelecting` boolean controls whether checkboxes are visible -- when it's set to false, also clear `selectedSessionIds`.
**Warning signs:** Unexpected checkboxes or pre-selected sessions when starting a new creation flow.

### Pitfall 6: Large Presentations (30+ Sessions) Performance
**What goes wrong:** With 30+ sessions spanning 11 GSD phases, the presentation outline becomes a long scrollable list that re-renders entirely on any state change.
**Why it happens:** React re-renders the entire list when any section or session name changes.
**How to avoid:** Use `React.memo` on `SectionHeader` and `SessionEntry` components to prevent unnecessary re-renders. Pass only the specific data each component needs (not the entire presentation object). Keep inline edit state local to the component, not in the global store.
**Warning signs:** Visible lag when typing in inline edit fields, or stuttering when scrolling the outline.

## Code Examples

### Example 1: IPC Bridge for Presentation Persistence
```typescript
// main/index.ts - new IPC handlers
import {
  getPresentations,
  savePresentation,
  deletePresentation
} from './storage/presentationStore'

// Inside createWindow():
ipcMain.handle('presentation:getAll', async () => {
  return getPresentations()
})

ipcMain.handle('presentation:save', async (_event, presentation) => {
  savePresentation(presentation)
})

ipcMain.handle('presentation:delete', async (_event, id: string) => {
  deletePresentation(id)
})
```

### Example 2: Preload Bridge Extensions
```typescript
// preload/index.ts - additions
// Presentation storage
getPresentations: (): Promise<unknown> =>
  ipcRenderer.invoke('presentation:getAll'),
savePresententation: (presentation: unknown): Promise<void> =>
  ipcRenderer.invoke('presentation:save', presentation),
deletePresentation: (id: string): Promise<void> =>
  ipcRenderer.invoke('presentation:delete', id)
```

### Example 3: Electron API Type Extensions
```typescript
// types/electron.d.ts - additions
import type { Presentation } from './presentation'

export interface ElectronAPI {
  // ... existing methods ...

  // Presentation storage
  getPresentations: () => Promise<Presentation[]>
  savePresentation: (presentation: Presentation) => Promise<void>
  deletePresentation: (id: string) => Promise<void>
}
```

### Example 4: Session Selection Enhancement for SessionCard
```typescript
// SessionCard gets an optional selectable mode
interface SessionCardProps {
  session: SessionMetadata
  onSelect: (session: SessionMetadata) => void
  isActive?: boolean
  showProject?: boolean
  // NEW for Phase 6
  selectable?: boolean
  isSelected?: boolean
  onToggleSelect?: (sessionId: string) => void
}

// In the render: show checkbox when selectable
{selectable && (
  <input
    type="checkbox"
    checked={isSelected}
    onChange={(e) => {
      e.stopPropagation()
      onToggleSelect?.(session.sessionId)
    }}
    style={{ accentColor: 'var(--color-accent)' }}
  />
)}
```

### Example 5: Presentation Creation from Selected Sessions
```typescript
// utils/presentationUtils.ts
import type { Presentation, PresentationSection, SessionRef } from '../types/presentation'
import type { SessionMetadata } from '../types/pipeline'

export function createPresentationFromSessions(
  sessions: SessionMetadata[]
): Presentation {
  const sections: PresentationSection[] = sessions
    .map((session): PresentationSection => ({
      id: crypto.randomUUID(),
      name: generateSessionDisplayName(session),
      sessionRefs: [{
        sessionId: session.sessionId,
        displayName: generateSessionDisplayName(session),
        sortKey: session.firstTimestamp ?? ''
      }]
    }))
    // Sort sections chronologically by their session's timestamp
    .sort((a, b) => {
      const keyA = a.sessionRefs[0]?.sortKey ?? ''
      const keyB = b.sessionRefs[0]?.sortKey ?? ''
      return keyA.localeCompare(keyB)
    })

  return {
    id: crypto.randomUUID(),
    name: generatePresentationName(sessions),
    sections,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}
```

### Example 6: Builder Two-View Mode
```typescript
// routes/Builder.tsx - conceptual structure
type BuilderView = 'browse' | 'assembly'

export function Builder(): React.JSX.Element {
  const [view, setView] = useState<BuilderView>('browse')

  if (view === 'assembly') {
    return (
      <div className="flex" style={{ height: '100%' }}>
        {/* Left: session library (compact, for adding more sessions) */}
        <div style={{ flex: '0 0 40%' }}>
          <SessionLibraryPanel />
        </div>
        {/* Right: presentation outline */}
        <div style={{ flex: '1 1 60%' }}>
          <PresentationOutline />
        </div>
      </div>
    )
  }

  // Existing browse view (current Builder implementation)
  return <SessionBrowserView onCreatePresentation={() => setView('assembly')} />
}
```

## Discretionary Recommendations

These address the areas marked as "Claude's Discretion" in CONTEXT.md:

### Adding More Sessions After Initial Creation: Side Panel Approach
**Recommendation:** When in the assembly view, the session library is already visible in the left panel. The user can browse/search/filter sessions there and click an "Add to Presentation" button on each session card. This is simpler than navigating back to a separate view.
**Rationale:** The two-panel layout naturally supports this workflow. The user doesn't lose context of their presentation structure while browsing for more sessions to add. This also avoids complex navigation state between "browse" and "assembly" views.

### Smart Auto-Grouping by GSD Phase: Defer to Future
**Recommendation:** Defer smart auto-grouping to a future enhancement. The auto-grouping would need to parse GSD command patterns from session metadata, detect phase numbers, and intelligently group discuss/plan/execute sessions for each phase. While the data is available (`firstUserMessage` contains `/gsd:discuss-phase 3` etc.), the implementation adds meaningful complexity:
1. Pattern matching for various GSD command formats
2. Grouping logic for partial phases (not every phase has all three sub-commands)
3. Section naming from phase metadata
4. Edge cases (multiple GSD milestones, non-GSD sessions mixed in)

The manual section merge feature gives users the same outcome with explicit control. Capture auto-grouping as a documented future enhancement.
**Note for future:** Session metadata `firstUserMessage` contains GSD commands like `/gsd:discuss-phase 3`, `/gsd:plan-phase 3`, `/gsd:execute-phase 3`. Pattern detection could group sessions with the same phase number into sections named "Phase 3: [phase name]".

### Chronological Sort Key: Use firstTimestamp
**Recommendation:** Use `SessionMetadata.firstTimestamp` (ISO 8601 string) as the sort key. This field:
- Is always populated by the Phase 2/5 metadata extraction
- Represents when the session started (first JSONL line timestamp)
- Is an ISO 8601 string that sorts correctly via `localeCompare()`
- Aligns with user's mental model of "when did I do this?"

ISO 8601 strings have the property of sorting lexicographically in chronological order, so `'2026-02-20T10:00:00Z'.localeCompare('2026-02-20T11:00:00Z') < 0` is true.

### Auto-Generated Friendly Name Format for Sessions
**Recommendation:** Derive names from `firstUserMessage` metadata:
- GSD commands: `/gsd:plan-phase 3` becomes "Plan Phase 3"
- Other commands: `/command args` becomes "Command: args"
- Plain messages: Truncated to 60 chars
- Fallback: "Session abc12345" (first 8 chars of UUID)

This produces natural-language names that match how the user thinks about their sessions. See Pattern 7 above for the implementation.

### Auto-Name Format for New Presentations
**Recommendation:** "{project} - {date}" when all sessions come from one project, or "Presentation - {date}" when mixed. Date format: "Feb 22, 2026" (using `toLocaleDateString` with month/day/year options).
**Rationale:** The project name provides context, the date provides uniqueness. Most presentations will focus on a single project's GSD milestone.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom UUID libraries | `crypto.randomUUID()` | Available since Chrome 92 / Node 19 | No dependency needed for UUID generation in Electron |
| Immer for all nested state | Manual spreads for shallow nesting, Immer for deep (3+) levels | Zustand community recommendation | 2-level nesting doesn't justify Immer dependency |
| contentEditable for inline edit | Input-based toggle pattern | React community best practice | Avoids contentEditable pitfalls (HTML entities, paste, cursor) |

**Deprecated/outdated:**
- None relevant to this phase.

## Open Questions

1. **Storing sessions when adding to a presentation**
   - What we know: Per CONTEXT.md, "Sessions are references, not copies." The current `StoredSession` system saves full session data to `sessions.json` when added to a presentation. The presentation stores sessionId references.
   - What's unclear: When should sessions be saved to `sessions.json`? Currently sessions are stored via `saveSessionToStorage` (Phase 2). Phase 6's "Create Presentation" flow needs to ensure selected sessions are stored before the presentation references them.
   - Recommendation: When creating a presentation, check if each selected session is already in `storedSessions`. If not, parse and store it first. This ensures the reference is always valid. The session library currently shows `discoveredSessions` (metadata only) -- the full parse + store step needs to happen at presentation creation time.

2. **Presentation list UI pattern (tabs vs list)**
   - What we know: User decision says "tabs or list to switch between them." Both are valid UI patterns.
   - What's unclear: How many presentations a user will typically have open simultaneously.
   - Recommendation: Use a simple list/sidebar approach rather than browser-style tabs. The typical use case is 1-3 presentations. A list is simpler to implement and scales better visually than tabs for the assembly view layout. Show the presentation list in a compact header area above the outline.

3. **Session removal from presentation vs session deletion from storage**
   - What we know: Removing a session from a presentation should just remove the reference. The session should remain in storage (it might be used in other presentations).
   - What's unclear: Whether there's a separate "remove from storage" action needed in Phase 6.
   - Recommendation: Phase 6 only handles removing session references from presentations. Storage cleanup (orphaned sessions not in any presentation) is a future concern, not Phase 6 scope.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `sessionStore.ts` (Zustand pattern), `storage/sessionStore.ts` (JSON persistence pattern), `pipeline/types.ts` and `types/pipeline.ts` (data model patterns), `discovery.ts` (metadata extraction including `firstUserMessage` and timestamp fields), `Builder.tsx` (current layout pattern)
- Zustand documentation: [Updating State guide](https://github.com/pmndrs/zustand/blob/main/docs/guides/updating-state.md) -- nested state update patterns verified
- MDN Web Docs: [crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) -- availability confirmed for Chromium-based environments

### Secondary (MEDIUM confidence)
- [Zustand Immer Middleware docs](https://zustand.docs.pmnd.rs/integrations/immer-middleware) -- confirmed `zustand/middleware/immer` import path and requirement for `immer` as direct dependency (not installed in project)
- [React inline edit patterns](https://www.emgoto.com/react-inline-edit/) -- confirmed input-based toggle approach as simpler than contentEditable
- [Synaptic Engineering: Multi-tab Zustand pattern](https://engineering.synaptic.com/managing-state-in-a-multi-tabbed-application-our-journey-from-redux-to-zustand-6d3932544300) -- confirmed separate stores for different domains is idiomatic

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns verified against existing codebase
- Architecture: HIGH -- extends proven Zustand + JSON persistence patterns from Phases 1-5
- Data model: HIGH -- presentation structure derived directly from user decisions in CONTEXT.md
- Inline editing: HIGH -- simple input-based pattern, well-established React pattern
- Auto-naming: HIGH -- based on verified `firstUserMessage` field format from codebase analysis
- Pitfalls: HIGH -- identified from codebase patterns and React/Zustand known issues
- Discretionary decisions: MEDIUM -- based on analysis of user requirements and codebase constraints; user may have different preferences

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable -- no fast-moving dependencies)
