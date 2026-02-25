# Phase 7: Builder Configuration and Export - Research

**Researched:** 2026-02-24
**Domain:** Presentation settings UI, file export/import, Electron dialog APIs, keyboard shortcuts
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Tool call visibility controls
- Two-level granularity: category groups (e.g., "File operations", "Search", "Shell") with expand-to-individual toggles per tool type
- Live preview in the message panel -- toggling visibility immediately updates the rendered conversation
- Smart defaults from existing classifier: plumbing tools start hidden, narrative tools start visible
- Presentation-level setting only -- one set of visibility rules applies to all sessions in the presentation

#### .promptplay file format
- Fully embedded: all conversation data bundled inside the file (truly self-contained, no external dependencies)
- Save dialog with remembered last-used directory for export location
- No format version field for v1 -- keep it simple

#### Settings panel layout
- Settings changes auto-save on every toggle/selection -- no explicit "Apply" button needed

#### Re-edit workflow
- Prompt to save current work before loading a .promptplay file (protects work in progress)
- Full editing when re-opened: add/remove sessions, reorder, change settings, re-export
- Both Save (Ctrl+S, overwrites original) and Save As (Ctrl+Shift+S, new file) available after re-editing

### Claude's Discretion
- Internal file format choice (JSON vs compressed) -- pick based on typical file sizes and trade-offs
- Settings panel placement in the Builder UI (sidebar, modal, or inline)
- Theme selector preview approach (live preview vs thumbnails)
- Timestamp toggle granularity (simple on/off vs multiple modes like "Time only" / "Time + elapsed")
- Handling of missing source JSONL files when re-opening exported files

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

Phase 7 adds two related capabilities to the Builder: (1) a configuration panel where users control presentation display settings (tool visibility, timestamps, theme), and (2) a file export/import system for self-contained `.promptplay` files. These are closely coupled because the configuration settings are embedded in the exported file.

The architecture extends the existing Zustand presentation store with new settings fields and adds new IPC handlers for file save/open dialogs and file I/O. The settings panel integrates into the Builder's assembly view. The live preview mechanism for tool visibility leverages the existing `filterVisibleMessages` function by passing a custom visibility filter derived from the user's per-category/per-tool toggle state, rather than the binary `showPlumbing` boolean currently used. The export produces a single JSON file containing the full Presentation object plus all referenced StoredSession data (messages, metadata). Re-import hydrates this back into the app's stores.

No new npm dependencies are needed. The file format is plain JSON (not compressed) -- typical presentation files will be 2-15 MB, well within acceptable limits for JSON serialization. Keyboard shortcuts (Ctrl+S, Ctrl+Shift+S) are best implemented via a hidden application menu with accelerators, which works even in the app's frameless window configuration.

**Primary recommendation:** Extend the Presentation type with a `settings` field containing `toolVisibility`, `showTimestamps`, and `theme` properties. Add a settings panel as a collapsible sidebar section within the assembly view. For export, bundle the Presentation object plus all StoredSession data into a single `.promptplay` JSON file via a new `presentation:export` IPC handler.

## Standard Stack

This phase uses no new libraries. Everything is built with the existing stack:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | ^5.0.11 | State management for presentation settings | Already used for all stores in app |
| Electron dialog | 40.x | Save/Open file dialogs | Native OS dialogs, built into Electron |
| Node.js fs | Built-in | File read/write for .promptplay files | Follows existing JSON persistence pattern |
| lucide-react | ^0.575.0 | Toggle/settings icons | Already used for all icons in app |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Electron Menu | 40.x | Hidden menu with keyboard accelerators | Ctrl+S / Ctrl+Shift+S shortcuts |
| crypto.randomUUID() | Browser API | ID generation | Already used throughout codebase |

### No New Dependencies
All functionality is achievable with the existing stack. Specifically:
- **No compression library needed** -- JSON is appropriate for the file sizes involved
- **No schema validation library needed** -- v1 format is simple enough for manual validation
- **No toast/notification library needed** -- existing pattern uses React state with auto-dismiss

## Architecture Patterns

### Presentation Settings Type Extension

The `Presentation` type needs a new `settings` field. This extends both the renderer and main process type definitions (kept in sync manually per the existing pattern).

```typescript
// New types to add

/** Tool visibility categories for the settings panel */
interface ToolCategoryConfig {
  categoryName: string         // Display name: "File Operations", "Search", "Shell", etc.
  tools: string[]              // Tool names in this category: ["Read", "Write", "Edit", "Glob"]
  defaultVisible: boolean      // From classifier: false for plumbing, true for narrative
  visible: boolean             // User's current setting
  expanded: boolean            // Whether individual tools are shown in the UI
  toolOverrides: Record<string, boolean>  // Per-tool overrides when expanded
}

interface PresentationSettings {
  toolVisibility: ToolCategoryConfig[]
  showTimestamps: boolean       // Simple on/off toggle
  theme: 'light' | 'dark' | 'system'
}

// Extended Presentation type
interface Presentation {
  id: string
  name: string
  sections: PresentationSection[]
  settings: PresentationSettings    // NEW
  sourceFilePath?: string           // NEW: tracks .promptplay file path for Save
  createdAt: number
  updatedAt: number
}
```

**Confidence: HIGH** -- follows existing type extension patterns, mirrors the existing `ToolVisibility` classifier output.

### Tool Category Groupings

Map existing tool names from the classifier to user-friendly categories:

```typescript
const TOOL_CATEGORIES: Array<{ name: string; tools: string[]; defaultVisible: boolean }> = [
  {
    name: 'File Operations',
    tools: ['Read', 'Write', 'Edit', 'Glob', 'NotebookEdit'],
    defaultVisible: false   // plumbing
  },
  {
    name: 'Search',
    tools: ['Grep', 'WebSearch', 'WebFetch'],
    defaultVisible: false   // plumbing
  },
  {
    name: 'Shell',
    tools: ['Bash'],
    defaultVisible: false   // plumbing
  },
  {
    name: 'Task Management',
    tools: ['Task', 'TaskOutput', 'TaskStop', 'TaskCreate', 'TaskUpdate', 'TaskList'],
    defaultVisible: false   // mixed, but mostly plumbing
  },
  {
    name: 'User Interaction',
    tools: ['AskUserQuestion'],
    defaultVisible: true    // narrative
  },
  {
    name: 'Planning',
    tools: ['Skill', 'EnterPlanMode', 'ExitPlanMode', 'EnterWorktree'],
    defaultVisible: false   // plumbing
  }
]
```

**Confidence: HIGH** -- derived directly from the existing `PLUMBING_TOOLS` and `NARRATIVE_TOOLS` sets in `src/main/pipeline/classifier.ts`.

### Live Preview Architecture

The current `filterVisibleMessages` takes a boolean `showPlumbing`. For the settings panel's live preview, we need a richer filter that respects per-category and per-tool overrides.

**Pattern: Create a new filter function that coexists with the existing one:**

```typescript
// New function in utils/messageFiltering.ts
export function filterWithToolSettings(
  messages: ParsedMessage[],
  toolVisibility: ToolCategoryConfig[]
): ParsedMessage[] {
  // Build a flat lookup: tool name -> visible (boolean)
  const visibilityMap = new Map<string, boolean>()
  for (const category of toolVisibility) {
    for (const tool of category.tools) {
      // Per-tool override takes precedence over category setting
      const toolOverride = category.toolOverrides[tool]
      visibilityMap.set(tool, toolOverride ?? category.visible)
    }
  }

  return messages.filter((msg) => {
    if (msg.isMeta) return false
    if (isEmptyAfterCleaning(msg)) return false
    if (msg.toolVisibility === null) return true       // pure text
    if (msg.toolVisibility === 'narrative') {
      // Check if the specific narrative tool is hidden
      // (user might hide AskUserQuestion)
      for (const block of msg.contentBlocks) {
        if (block.type === 'tool_use') {
          const isVisible = visibilityMap.get(block.name)
          if (isVisible === false) {
            // Still show if message has meaningful text
            const hasText = msg.contentBlocks.some(
              (b) => b.type === 'text' && b.text.trim().length > 0
            )
            return hasText
          }
        }
      }
      return true
    }
    if (msg.toolVisibility === 'unknown') {
      // Unknown tools visible unless in a configured-hidden category
      return true
    }
    if (msg.toolVisibility === 'plumbing') {
      // Check if specific tool is enabled
      for (const block of msg.contentBlocks) {
        if (block.type === 'tool_use') {
          if (visibilityMap.get(block.name) === true) return true
        }
      }
      // Mixed-content exception still applies
      const hasText = msg.contentBlocks.some(
        (b) => b.type === 'text' && b.text.trim().length > 0
      )
      return hasText
    }
    return false
  })
}
```

**Confidence: HIGH** -- directly extends the verified `filterVisibleMessages` logic with per-tool granularity.

### .promptplay File Format

**Recommendation: Plain JSON, not compressed.**

Rationale:
- Typical presentation: 5-20 sessions, each with 50-500 messages
- Estimated file size: 2-15 MB uncompressed JSON
- JSON is debuggable (users can inspect files in a text editor)
- No need for streaming -- entire file fits in memory easily
- Compression adds complexity (need zlib, need to handle decompression errors)
- Gzip would save 60-80% but the absolute size (0.5-3 MB) is not worth the complexity tradeoff for v1
- JSON.parse/JSON.stringify are fast enough for these sizes (sub-second)

File structure:

```typescript
interface PromptPlayFile {
  // Presentation metadata and structure
  presentation: Presentation  // includes settings

  // All session data embedded (self-contained)
  sessions: StoredSession[]   // full message data for every referenced session
}
```

The `.promptplay` extension is registered with the save/open dialogs via the `filters` option. No OS-level file association is needed for v1.

**Confidence: HIGH** -- JSON persistence is the established pattern. File sizes verified against typical session data (JSONL files are 50KB-3MB each).

### Keyboard Shortcuts (Save/Save As)

The app uses `frame: false` (frameless window) with a custom titlebar. Menu accelerators still work in frameless windows when a hidden application menu is set.

**Approach: Hidden Menu with Accelerators**

```typescript
// In main/index.ts, after createWindow:
const menu = Menu.buildFromTemplate([
  {
    label: 'File',
    submenu: [
      {
        label: 'Save',
        accelerator: 'CommandOrControl+S',
        click: () => mainWindow.webContents.send('menu:save')
      },
      {
        label: 'Save As',
        accelerator: 'CommandOrControl+Shift+S',
        click: () => mainWindow.webContents.send('menu:saveAs')
      }
    ]
  }
])
Menu.setApplicationMenu(menu)
```

The renderer listens for `menu:save` / `menu:saveAs` events via the preload bridge and triggers the appropriate save action.

**Why this over `before-input-event`:** Menu accelerators are the standard Electron pattern for application-level shortcuts. They work cross-platform, handle edge cases (focus, keyboard layouts), and don't require manual key matching.

**Why this over renderer `keydown`:** Ctrl+S needs to work regardless of focus state. A hidden application menu guarantees this and follows Electron best practices.

**Confidence: HIGH** -- Verified from official Electron keyboard shortcuts documentation. Menu accelerators work with hidden menus even in frameless windows.

### File Export/Import IPC

New IPC handlers following the existing `presentation:*` namespace:

```typescript
// Main process handlers
'presentation:export'     // Show save dialog, write .promptplay file
'presentation:import'     // Show open dialog, read .promptplay file
'presentation:saveToPath' // Save to known path (for Ctrl+S overwrite)
```

The save dialog uses `dialog.showSaveDialog` with:
- `filters: [{ name: 'PromptPlay Presentations', extensions: ['promptplay'] }]`
- `defaultPath`: remembered last-used directory (stored in a simple config value)
- Note: Electron's `showSaveDialog` already remembers the last-used directory when given just a filename (not a full path) as `defaultPath`

**Confidence: HIGH** -- Verified from official Electron dialog documentation.

### Settings Panel Placement

**Recommendation: Collapsible sidebar panel within the assembly view.**

Rationale:
- The assembly view already has a two-panel layout (session library + presentation outline)
- A settings section can sit above or below the presentation outline in the right panel
- Inline placement means settings are always visible and easily toggled
- A modal would hide the live preview; a separate route would lose context
- Collapsible to avoid crowding when not actively configuring

Layout: Settings controls appear as a collapsible section at the top of the right panel in the assembly view, above the presentation outline. When expanded, it shows tool visibility toggles, timestamp toggle, and theme selector. When collapsed, it shows a one-line summary ("5 tool types hidden, timestamps on, dark theme").

**Confidence: MEDIUM** -- Design recommendation based on established layout patterns. Could also work as a dedicated tab alongside the outline.

### Theme Selector Approach

**Recommendation: Live preview with a dropdown/radio group (not thumbnails).**

Rationale:
- Only 3 options: Light, Dark, System
- The existing theme system uses `data-theme` attribute on `document.documentElement`
- Live preview is trivial: changing `data-theme` immediately updates all CSS variables
- Thumbnails require maintaining preview images and don't add value for 3 options
- "System" option follows the OS preference (existing `nativeTheme.shouldUseDarkColors` integration)
- The setting overrides the system theme for the presentation only (in Builder, the user sees the effect immediately)

**Important architectural note:** The current theme system (`useTheme` hook) sets `data-theme` globally based on the OS. The presentation theme setting needs to override this when the Builder is in assembly/preview mode. The cleanest approach is to add a `presentationThemeOverride` to the app store that, when set, takes precedence over the system theme. The `useTheme` hook can check for this override.

**Confidence: MEDIUM** -- Theme override pattern is straightforward but needs careful integration with existing theme hook.

### Timestamp Toggle

**Recommendation: Simple on/off toggle.**

Rationale:
- Current codebase has timestamps in `ParsedMessage.timestamp` (ISO strings)
- "Time only" vs "Time + elapsed" adds UI complexity for marginal value
- The Player and Builder message renderers don't currently show timestamps at all -- this feature adds them
- Simple on/off is consistent with the "auto-save every toggle" decision
- Future enhancement could add granularity if users request it

Implementation: When `showTimestamps` is true, render a small timestamp badge above or below each message bubble. Use `Intl.DateTimeFormat` for locale-aware formatting.

**Confidence: HIGH** -- Simplest approach that meets the requirement. Extensible later.

### Handling Missing Source JSONL Files (Re-opened .promptplay)

**Recommendation: No special handling needed -- the `.promptplay` file IS the source.**

When re-opening a `.promptplay` file:
1. The file contains ALL session data (messages, metadata) embedded inside it
2. There is no need to reference external JSONL files
3. The data gets loaded into the session and presentation stores
4. The user can edit, add new sessions (from discovered JSONL files), and re-export

The only scenario where this matters: if the user adds NEW sessions from discovered JSONL files to a re-opened presentation, those new sessions reference JSONL files on disk. If those JSONL files are later deleted, the existing `FileNotFoundState` component in the Builder already handles this gracefully.

For the re-opened sessions from the `.promptplay` file: they have `originalFilePath` in `StoredSession` pointing to the original JSONL location. Since we have the full message data embedded, we can simply skip re-parsing -- use the embedded data directly.

**Confidence: HIGH** -- The fully-embedded format explicitly eliminates the missing-file problem for re-opened presentations.

### Recommended Project Structure for New Files

```
src/
├── main/
│   └── index.ts                          # Add: export/import IPC handlers, Menu with accelerators
├── preload/
│   └── index.ts                          # Add: new IPC bridges for export/import/menu events
├── renderer/src/
│   ├── types/
│   │   ├── presentation.ts               # Extend: PresentationSettings, ToolCategoryConfig
│   │   └── electron.d.ts                 # Extend: new IPC method types
│   ├── stores/
│   │   └── presentationStore.ts          # Extend: settings actions, sourceFilePath tracking
│   ├── utils/
│   │   ├── messageFiltering.ts           # Add: filterWithToolSettings function
│   │   └── toolCategories.ts             # NEW: tool category definitions, defaults generator
│   ├── components/builder/
│   │   ├── SettingsPanel.tsx             # NEW: collapsible settings section
│   │   ├── ToolVisibilityPanel.tsx       # NEW: category/tool toggle grid
│   │   └── PresentationOutline.tsx       # Existing: no changes expected
│   ├── hooks/
│   │   └── useTheme.ts                   # Modify: support presentation theme override
│   └── routes/
│       └── Builder.tsx                    # Modify: integrate settings panel, save shortcuts
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File save/open dialogs | Custom file picker UI | `dialog.showSaveDialog` / `dialog.showOpenDialog` | Native OS dialogs, remembers directories, handles permissions |
| Keyboard shortcuts | Manual `keydown` listeners for Ctrl+S | `Menu.buildFromTemplate` with `accelerator` | Cross-platform, handles keyboard layouts, works with frameless windows |
| UUID generation | Custom ID generation | `crypto.randomUUID()` | Browser-native, already used throughout codebase |
| JSON serialization | Custom file format parser | `JSON.stringify` / `JSON.parse` | File sizes are small enough, debuggable, no streaming needed |
| Directory memory for save dialog | Custom localStorage tracking | Electron's built-in behavior + `defaultPath` | `showSaveDialog` remembers last directory when given just a filename |

**Key insight:** This phase is primarily about wiring up existing Electron APIs (dialog, Menu) and extending existing app patterns (Zustand store, IPC, type extensions). The complexity is in the UI design of the settings panel and the data flow for live preview, not in the underlying technology.

## Common Pitfalls

### Pitfall 1: Stale Theme Override After Leaving Builder
**What goes wrong:** Setting a presentation theme override in the Builder persists after navigating to Home or Player, causing the whole app to show the "wrong" theme.
**Why it happens:** The theme override is set in a global store but only makes sense in the context of the Builder assembly view.
**How to avoid:** Clear the `presentationThemeOverride` in the app store when navigating away from the Builder, or scope the override to only apply within the Builder's message preview area (via a wrapper div with `data-theme` rather than setting it on `documentElement`).
**Warning signs:** Theme doesn't revert when going back to Home screen.

### Pitfall 2: IPC Serialization of Large Session Data
**What goes wrong:** Sending all session message data through IPC for export is slow or fails.
**Why it happens:** IPC uses structured clone serialization. Very large objects (50MB+) can cause noticeable delays.
**How to avoid:** The main process should assemble the export data directly from its own stores (`sessionStore.ts`, `presentationStore.ts`) rather than receiving it from the renderer. The renderer sends the presentation ID, and the main process reads sessions from `sessions.json` and writes the `.promptplay` file.
**Warning signs:** Export taking >1 second for typical presentations.

### Pitfall 3: Circular References in Export Data
**What goes wrong:** `JSON.stringify` throws if there are circular references in the session data.
**Why it happens:** Though unlikely with the current `ParsedMessage` structure, deep nesting or future type changes could introduce cycles.
**How to avoid:** Keep the export data structure flat and well-defined. The `StoredSession` type is already designed for serialization (it's already stored as JSON in `sessions.json`).
**Warning signs:** Export fails silently or throws in main process.

### Pitfall 4: Overwriting Without Confirmation
**What goes wrong:** Ctrl+S overwrites a `.promptplay` file without warning when the file was just opened (user expected "save current work to app storage" not "overwrite the file").
**Why it happens:** Save semantics are ambiguous when a presentation exists both in app storage and in a `.promptplay` file.
**How to avoid:** Ctrl+S only performs file overwrite when `sourceFilePath` is set on the presentation (meaning it was opened from or previously exported to a `.promptplay` file). Otherwise, Ctrl+S saves to app storage (the existing `persistPresentation` behavior). Show the save-as dialog for Ctrl+S if `sourceFilePath` is not set.
**Warning signs:** User loses work by accidentally overwriting.

### Pitfall 5: Type Sync Between Main and Renderer
**What goes wrong:** The `PresentationSettings` type gets added to one side but not the other, causing runtime errors.
**Why it happens:** The project mirrors types between `src/main/pipeline/types.ts` and `src/renderer/src/types/presentation.ts` manually.
**How to avoid:** Always update BOTH type files in the same task. The planner should make this explicit in the task description.
**Warning signs:** TypeScript errors only on one side, or runtime `undefined` for settings fields.

### Pitfall 6: Missing Default Settings on Old Presentations
**What goes wrong:** Presentations created before Phase 7 don't have a `settings` field, causing `undefined` errors.
**Why it happens:** Existing presentations in `presentations.json` were created without settings.
**How to avoid:** Add a `getDefaultSettings()` factory function and apply it as a fallback wherever `presentation.settings` is accessed. When loading presentations, backfill missing settings with defaults.
**Warning signs:** App crashes when switching to a pre-existing presentation in assembly view.

### Pitfall 7: Theme Override Scope
**What goes wrong:** Setting `data-theme` on `documentElement` for the presentation theme affects the entire UI including the settings panel, titlebar, etc.
**Why it happens:** CSS variables cascade from the root. Setting dark theme on the root makes everything dark.
**How to avoid:** Apply the theme override ONLY to the message preview area using a scoped `data-theme` attribute on a wrapper div. The Builder UI itself should remain in the system theme so the user can see settings clearly.
**Warning signs:** Builder controls become hard to read because they're in the presentation's theme instead of the system theme.

## Code Examples

### Save Dialog with File Filter

```typescript
// Source: Electron dialog API docs (https://www.electronjs.org/docs/latest/api/dialog)
const result = await dialog.showSaveDialog(mainWindow, {
  title: 'Export Presentation',
  defaultPath: 'presentation.promptplay',
  filters: [
    { name: 'PromptPlay Presentations', extensions: ['promptplay'] },
    { name: 'All Files', extensions: ['*'] }
  ]
})

if (!result.canceled && result.filePath) {
  // Write the file
  writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
}
```

### Open Dialog for .promptplay Files

```typescript
// Source: Electron dialog API docs
const result = await dialog.showOpenDialog(mainWindow, {
  title: 'Open Presentation',
  filters: [
    { name: 'PromptPlay Presentations', extensions: ['promptplay'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  properties: ['openFile']
})

if (!result.canceled && result.filePaths.length > 0) {
  const data = readFileSync(result.filePaths[0], 'utf-8')
  const promptPlayFile = JSON.parse(data) as PromptPlayFile
  return { ...promptPlayFile, filePath: result.filePaths[0] }
}
```

### Hidden Menu with Keyboard Accelerators

```typescript
// Source: Electron keyboard shortcuts tutorial
// (https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)
import { Menu } from 'electron'

const menu = Menu.buildFromTemplate([
  {
    label: 'File',
    submenu: [
      {
        label: 'Save',
        accelerator: 'CommandOrControl+S',
        click: () => mainWindow.webContents.send('menu:save')
      },
      {
        label: 'Save As...',
        accelerator: 'CommandOrControl+Shift+S',
        click: () => mainWindow.webContents.send('menu:saveAs')
      }
    ]
  }
])
Menu.setApplicationMenu(menu)
```

### Scoped Theme Override (Preview Area Only)

```typescript
// Apply theme to preview area only, not the entire app
function MessagePreview({ messages, theme }: {
  messages: ParsedMessage[]
  theme: 'light' | 'dark' | 'system'
}): React.JSX.Element {
  const isDarkMode = useAppStore((s) => s.isDarkMode)

  // Resolve 'system' to actual value
  const resolvedTheme = theme === 'system'
    ? (isDarkMode ? 'dark' : 'light')
    : theme

  return (
    <div data-theme={resolvedTheme} style={{ flex: 1, overflow: 'auto' }}>
      <MessageList messages={messages} />
    </div>
  )
}
```

### Default Settings Factory

```typescript
// Generate default PresentationSettings from the TOOL_CATEGORIES constant
function getDefaultSettings(): PresentationSettings {
  return {
    toolVisibility: TOOL_CATEGORIES.map((cat) => ({
      categoryName: cat.name,
      tools: cat.tools,
      defaultVisible: cat.defaultVisible,
      visible: cat.defaultVisible,
      expanded: false,
      toolOverrides: {}
    })),
    showTimestamps: false,
    theme: 'system'
  }
}
```

### Settings Auto-Save Pattern

```typescript
// In the presentation store: settings update triggers persistPresentation
updateSettings: (patch: Partial<PresentationSettings>): void => {
  const active = get().getActivePresentation()
  if (!active) return

  const updated: Presentation = {
    ...active,
    settings: { ...active.settings, ...patch },
    updatedAt: Date.now()
  }

  persistPresentation(updated)
}

updateToolCategoryVisibility: (categoryName: string, visible: boolean): void => {
  const active = get().getActivePresentation()
  if (!active) return

  const updated: Presentation = {
    ...active,
    settings: {
      ...active.settings,
      toolVisibility: active.settings.toolVisibility.map((cat) =>
        cat.categoryName === categoryName ? { ...cat, visible } : cat
      )
    },
    updatedAt: Date.now()
  }

  persistPresentation(updated)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `electron-store` for config | JSON file persistence | Phase 1 (ESM/CJS issue) | .promptplay files follow same JSON pattern |
| Binary `showPlumbing` filter | Per-tool visibility settings | Phase 7 (this phase) | More granular control, needs new filter function |
| System theme only | Presentation theme override | Phase 7 (this phase) | Scoped theme setting per presentation |

**Deprecated/outdated:**
- `electron-store` v11: Still ESM-only incompatible with electron-vite 3.x CJS output. Continue using JSON file fallback.

## Open Questions

1. **Should unknown tools follow a visibility setting or always show?**
   - What we know: Unknown tools currently default to 'unknown' visibility (shown by default -- safe behavior, per decision 02-01)
   - What's unclear: Should there be an "Other/Unknown tools" toggle in the settings panel?
   - Recommendation: Add a catch-all "Other" category that defaults to visible. Users can hide unknown tools if they want. This is a minor UI addition.

2. **Save confirmation wording when opening .promptplay over current work**
   - What we know: User decided to prompt before loading. The standard pattern is "You have unsaved changes. Save before opening?"
   - What's unclear: What counts as "unsaved"? If auto-save is on, everything is already saved to app storage. The prompt is really "Switch to a different presentation?"
   - Recommendation: The prompt should be "Load this presentation file? Your current presentation will remain available in the presentation list." -- since auto-save means nothing is lost.

3. **Export from main process or renderer?**
   - What we know: The main process has direct access to `sessions.json` and `presentations.json`. The renderer has the in-memory state.
   - What's unclear: Which process should assemble the export data?
   - Recommendation: **Main process** assembles the export. Renderer sends `presentation:export` with the presentation ID. Main process reads the presentation from `presentations.json`, looks up all referenced sessions from `sessions.json`, bundles them, and writes the file. This avoids sending large data over IPC.

## Sources

### Primary (HIGH confidence)
- Electron dialog API: https://www.electronjs.org/docs/latest/api/dialog -- showSaveDialog/showOpenDialog options, filters, defaultPath behavior
- Electron keyboard shortcuts: https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts -- Menu accelerators work with hidden menus in frameless windows
- Existing codebase: `src/main/pipeline/classifier.ts` -- tool classification source of truth
- Existing codebase: `src/renderer/src/utils/messageFiltering.ts` -- filter logic to extend
- Existing codebase: `src/main/storage/presentationStore.ts` -- JSON persistence pattern
- Existing codebase: `src/main/storage/sessionStore.ts` -- StoredSession structure

### Secondary (MEDIUM confidence)
- JSON compression ratios: Multiple sources agree 60-90% reduction, but absolute sizes (2-15 MB) make compression unnecessary for v1

### Tertiary (LOW confidence)
- None -- all findings verified against official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing patterns
- Architecture: HIGH -- extends proven Zustand + IPC + JSON persistence pattern
- Settings UI: MEDIUM -- layout recommendation is design judgment, could be refined
- File format: HIGH -- JSON is the right choice for these file sizes
- Keyboard shortcuts: HIGH -- verified from official Electron docs
- Pitfalls: HIGH -- identified from direct codebase analysis

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30 days -- stable stack, no external dependencies)
