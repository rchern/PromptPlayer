# Phase 12: UX Polish - Research

**Researched:** 2026-03-04
**Domain:** Electron + React UX refinement across Builder and Player
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Player "Show more" overflow:** Hide expand/collapse button when content fits without scrolling; check scrollHeight vs clientHeight
- **Player box/border rendering:** Claude's discretion on approach -- investigate CHECKPOINT box patterns and horizontal-rule-with-text sequences
- **Player system messages:** Claude's discretion -- investigate data patterns (TaskOutput read results, queue-operation injections) and classify or filter appropriately
- **Player step combining:** Combine adjacent steps where userMessage is null into a single step showing all assistant content; show per-original-step elapsed times within group
- **Builder close presentations:** Add close action (X icon) on each open presentation entry in PresentationList; prompt "Save changes?" dialog when closing with unsaved changes
- **Builder live preview reactivity:** Preview subscribes to settings store and re-renders immediately on any change
- **Builder date filter presets:** Rename to relative: "Today", "Last 7 days", "Last 30 days", "Older"
- **Builder checkbox + split-to-section:** Claude's discretion on positioning improvement and split-to-new-section action
- **Elapsed time for assistant-only steps:** Show step-to-step elapsed with different visual treatment (dimmer pill, different label)
- **Auto-update notification UI:** Non-intrusive toast/banner with "Restart Now" button, auto-dismiss ~30s with reminder indicator

### Claude's Discretion
- Box/border rendering fix approach
- System message classification strategy
- Checkbox layout and split-to-section implementation
- Elapsed marker placement for solo steps
- Auto-update banner placement and reminder indicator design
- Player "Open File" action for switching presentations

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

Phase 12 addresses 12 distinct UX polish items accumulated across Builder and Player during prior phase testing. These are all refinements to existing components -- no new architectural patterns, no new libraries. Every item touches existing React components and Zustand stores that are well-understood from prior phases.

The primary technical domains are: (1) DOM measurement for overflow detection, (2) Zustand store subscription patterns for reactive preview, (3) step-combining logic in the playback pipeline, (4) IPC event forwarding for auto-update notifications, and (5) UI component additions (close buttons, toast banners, filter label renaming). All items use the established project patterns: module-level style constants, Zustand with getState() for event callbacks, data-theme scoping, and React.memo for list items.

**Primary recommendation:** Organize work by isolation -- items that touch the same file should be grouped into the same plan. Most items are independent and low-risk. The step-combining logic (Player) and live preview reactivity (Builder) are the most complex and should each get focused plans.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | 19 | UI components | Already in use |
| Zustand | 5.x | State management | All stores already use this |
| lucide-react | latest | Icon library | X, RefreshCw, etc. already used |
| electron-updater | latest | Auto-update | autoUpdater already wired in main process |

### Supporting (No New Dependencies)
This phase requires zero new npm packages. Every item uses existing libraries and patterns.

### Alternatives Considered
None -- this is polish work on an existing codebase. No architectural decisions to make.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Approach: Isolated Component Edits

This phase is a collection of independent UX fixes. The key architectural pattern is: each item modifies 1-3 existing files with minimal cross-item coupling. Group by file overlap, not by conceptual theme.

### Pattern 1: Overflow Detection (CollapsibleContent.tsx)
**What:** The existing CollapsibleContent already measures scrollHeight vs threshold. The "show more" button already only renders when `overflows` is true. The current code at line 41 already checks `el.scrollHeight > threshold + 4`.
**Current behavior:** Works correctly -- the button only appears when content exceeds the viewport threshold.
**Investigation finding:** The existing implementation IS correct. The CONTEXT.md says "Hide the expand/collapse button when content fits without scrolling" and the code already does this via the `overflows` state and `{overflows && (...)}` gate at line 102. The original bug report from Phase 4 testing may have been a transient rendering issue or has been fixed in a subsequent phase. Need to verify at runtime, but the code logic is sound.
**Confidence:** HIGH -- code analysis confirms the pattern is already implemented.

### Pattern 2: Step Combining in buildPlaybackSteps (playbackStore.ts)
**What:** After `buildNavigationSteps` produces individual steps, a post-processing pass combines consecutive steps where `userMessage === null` into a single "combined" step.
**Where:** The combining must happen in `buildPlaybackSteps()` in `playbackStore.ts`, after `buildNavigationSteps()` returns per-session navigation steps (line 63).
**How:**
1. After getting `navSteps` from `buildNavigationSteps`, iterate and detect runs of consecutive steps where `step.userMessage === null`
2. Combine runs into a single NavigationStep that holds all the assistant messages
3. The combined step needs a new data structure to hold multiple assistant messages with their individual elapsed times
4. The `NavigationStep` type will need extension (e.g., `combinedAssistantMessages?: ParsedMessage[]`) or a new `CombinedNavigationStep` type
5. `StepView` must detect combined steps and render all assistant messages in sequence with per-original-step elapsed indicators between them

**Key constraints from CONTEXT.md:**
- Combined steps show per-original-step elapsed times within the group (small indicators)
- Should feel like a filmstrip of Claude's continuous work
- Reduces click-through fatigue in autonomous sequences

**Confidence:** HIGH -- the combining logic is straightforward array manipulation in an existing pure function.

### Pattern 3: Reactive Preview via Zustand Store Subscription (Builder)
**What:** The Builder assembly view preview already uses `filterWithToolSettings` and `resolvedTheme` derived from the active presentation's settings. The useMemo dependencies already include `activePresentation?.settings`.
**Investigation finding:** Looking at Builder.tsx lines 254-266, `filteredMessages` already depends on `activePresentation?.settings` and `resolvedTheme` already depends on `activePresentation?.settings?.theme`. The `usePresentationStore` hook already triggers re-renders when the store updates. The `persistPresentation` helper in the store calls `set()` which triggers Zustand subscribers.
**Current behavior:** When `updateSettings` is called (e.g., toggling timestamps, changing theme), the store updates, Builder re-renders, and the preview should reflect the change.
**Potential issue:** The `getActivePresentation()` call on line 251 uses `get()` internally -- this is a Zustand getter, not a subscriber selector. If it doesn't trigger re-renders, that's the bug. Need to check if `getActivePresentation` is used as `usePresentationStore((s) => s.getActivePresentation())` (reactive) vs `getActivePresentation()` (not reactive from component perspective).
**Fix:** Looking at line 251: `const activePresentation = getActivePresentation()` -- this is called directly as a destructured function, which means it calls `get()` inside the store at render time. It WILL re-render because `usePresentationStore` at the top of the component (line 73-81) selects multiple values, and when `persistPresentation` calls `set()`, the entire component re-renders. However, `getActivePresentation` does a `presentations.find()` on each render, and the `presentations` array is already subscribed. So re-renders should propagate.
**True root cause:** The `filteredMessages` useMemo on line 254 depends on `activePresentation?.settings`. But `activePresentation` comes from `getActivePresentation()` which is called on each render. When settings change, `persistPresentation` calls `set()` updating `presentations`, the component re-renders, `getActivePresentation()` returns the updated presentation, and `filteredMessages` recomputes. This should work. The bug may be more subtle -- perhaps the `useMemo` dependency check uses referential equality and `activePresentation?.settings` creates a new reference each time. Need runtime verification.
**Confidence:** MEDIUM -- the reactive chain looks correct in theory but the bug was observed in practice. May need to change the dependency from `activePresentation?.settings` to individual setting values for proper memoization invalidation.

### Pattern 4: Auto-Update Toast Component
**What:** Listen for `update:ready` IPC event in the renderer and show a toast/banner.
**Existing IPC wiring:**
- Main process: `autoUpdater.on('update-downloaded', ...)` sends `update:ready` with version string (autoUpdater.ts line 25)
- Preload: `onUpdateReady(callback)` listener already exists (preload/index.ts line 89-94)
- Preload: `installUpdate()` already sends `update:installAndRestart` (preload/index.ts line 95)
- Main process: `ipcMain.on('update:installAndRestart', ...)` calls `autoUpdater.quitAndInstall()` (index.ts line 390)
**Missing:** Only the renderer UI. No toast component exists yet.
**Pattern to follow:** Reuse the ImportDropZone toast pattern from Builder -- simple React state with auto-dismiss timer.
**Placement:** The toast should be global (visible regardless of route). Best location: `RootLayout.tsx` or the `App.tsx` component that wraps all routes. Listen for `onUpdateReady` in a top-level useEffect, set state, render the banner.
**Confidence:** HIGH -- IPC is fully wired, just need the UI component.

### Pattern 5: Date Filter Preset Relabeling
**What:** Rename preset labels and adjust filter logic from calendar-based to relative.
**Current:** `SearchFilterBar.tsx` has `DATE_PRESETS` array with labels "All", "Today", "This Week", "This Month", "Older", "Custom".
**Current logic:** `sessionFiltering.ts` `matchesDateFilter` uses `startOfWeek` (Sunday-based) for "this-week" and `startOfMonth` for "this-month".
**Change needed:**
1. Rename labels: "This Week" -> "Last 7 days", "This Month" -> "Last 30 days"
2. Update `DatePreset` type: `'this-week'` -> `'last-7-days'`, `'this-month'` -> `'last-30-days'`
3. Update `matchesDateFilter` logic: use `Date.now() - 7 * 86400000` instead of `startOfWeek`, `Date.now() - 30 * 86400000` instead of `startOfMonth`
4. Update "Older" to mean "older than 30 days" (currently means "before start of month")
**Confidence:** HIGH -- simple string/logic changes in 2 files.

### Pattern 6: Close Open Presentations (PresentationList.tsx)
**What:** Add an X close button on each presentation tab.
**Current:** PresentationList.tsx already has delete buttons (Trash2 icon, hover-revealed). Need a close action that doesn't delete, just deactivates.
**Approach:** Add X icon next to each tab. On click: if presentation has unsaved changes, show confirm dialog. Then `setActivePresentation(null)`.
**Unsaved changes detection:** Compare `presentation.updatedAt` against the last save time. Currently no explicit "dirty" tracking exists. Could track `sourceFilePath` existence + `updatedAt` vs a saved-at timestamp, or simpler: always prompt on close (user can choose "Don't Save").
**Confidence:** HIGH -- straightforward UI addition to existing component.

### Pattern 7: System Message Classification (cleanUserText.ts / messageFiltering.ts)
**What:** Certain user messages are system-generated (TaskOutput results, tool result injections) and should not appear as "YOU" bubbles.
**Current behavior:** All messages with `role: 'user'` render with the "You" label in MessageBubble.
**Data patterns to detect:**
1. Messages containing "Read the output file to retrieve the result:" -- these are TaskOutput injections
2. Messages that are purely `tool_result` blocks with no user-typed text (already folded as followUpMessages by `isToolResultOnly`)
3. queue-operation injected messages (already noted as an unresolved blocker in STATE.md)
**Approach options:**
- Option A: Extend `cleanUserText` to return a flag `isSystemGenerated` when the text matches system patterns
- Option B: Add classification in the pipeline (parser/stitcher level) to tag messages as system-generated
- Option C: In `MessageBubble`, detect system patterns and change the label from "You" to "System" or hide entirely
**Recommendation:** Option C is simplest for this polish phase. In MessageBubble, add detection for known system message patterns in user text blocks. When detected, change the role label and styling. This avoids pipeline changes.
**Confidence:** MEDIUM -- pattern detection needs testing against real data to ensure no false positives.

### Pattern 8: Checkbox Positioning + Split-to-Section (PresentationOutline)
**What:** Improve checkbox alignment in SectionHeader and optionally add a "Split to new section" action on SessionEntry.
**Current checkbox:** SectionHeader.tsx line 33-43 renders an `<input type="checkbox">` as the first flex child, 15x15px with accent color.
**Improvement:** Move checkbox to a consistent left column. Could use a fixed-width left gutter (e.g., 24px) with the checkbox centered within it.
**Split-to-section:** Add a context action on SessionEntry (e.g., right-click menu or hover button) that calls `removeSession(sectionId, sessionId)` then creates a new section with just that session. The presentationStore would need a `splitToNewSection(sectionId, sessionId)` action.
**Confidence:** HIGH -- UI layout adjustment + one new store action.

### Pattern 9: Elapsed Time for Solo Assistant Steps
**What:** Currently `ElapsedTimeMarker` only renders between user and assistant messages (StepView.tsx line 63: `step.userMessage && showTimestamps && elapsedMs != null`). Solo assistant steps (`userMessage === null`) skip the marker entirely.
**Change needed:** For solo assistant steps, compute elapsed between the previous step's last timestamp and this step's assistant timestamp. Render with a different visual style (dimmer, different label like "~2s between responses").
**Where:** The elapsed computation needs to happen in `buildPlaybackSteps` where adjacent step timestamps are available. Currently `elapsedMs` is computed as user->assistant within the same step (line 113-117). For solo steps, need to compute from the previous step's last timestamp to this step's assistant timestamp.
**New marker variant:** A dimmer version of ElapsedTimeMarker with a "between responses" label instead of just the time. Could be a variant prop on the existing component.
**Interaction with step combining:** If solo assistant steps get combined (Pattern 2), the inter-step elapsed becomes intra-combined-step elapsed shown between messages within the combined block. These two features are deeply related and should be planned together.
**Confidence:** HIGH -- extends existing elapsed computation pattern.

### Pattern 10: Player "Open File" Action
**What:** Allow opening a different .promptplay file when one is already loaded in the Player.
**Current:** Player.tsx auto-imports on mount only when no presentation is loaded (line 37-45, guarded by `if (presentation || activeSession || importTriggered.current) return`).
**Approach:** Add an "Open File" button in the Player UI (e.g., in the top bar or sidebar) that calls `window.electronAPI.importPresentation()` then `loadPresentation()`. Also make Home screen RecentFiles items clickable -- they currently render as div elements with cursor:pointer but no onClick handler (RecentFiles.tsx line 38-56).
**Confidence:** HIGH -- reuses existing IPC and store patterns.

### Anti-Patterns to Avoid
- **Mixing step combining with elapsed computation:** These two features are coupled. Don't implement solo-step elapsed markers separately from step combining -- the combined view needs to show per-original-step times.
- **Adding "dirty" tracking with a separate state field:** For the close-presentation feature, avoid adding a complex dirty-tracking system. The simpler approach is to always prompt on close or check `updatedAt > savedAt`.
- **Modifying pipeline types for system message detection:** Avoid adding new fields to ParsedMessage for this polish phase. Handle system message detection at the rendering layer.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | Simple React state + setTimeout | Project already uses this pattern (ImportDropZone, export toast) |
| Unsaved changes dialog | Custom modal component | window.confirm() or native dialog | Consistent with existing delete confirmation pattern |
| Relative date computation | Date math library | Simple `Date.now() - N * 86400000` | Only need "last N days", not complex relative dates |

**Key insight:** This phase is explicitly about polish, not new infrastructure. Reuse existing patterns everywhere.

## Common Pitfalls

### Pitfall 1: Step Combining Breaks Step Index References
**What goes wrong:** The playback store uses `currentStepIndex` to index into the `steps` array. If combining changes the array length, all index-based features (progress bar, sidebar highlights, jump-to-section) could break.
**Why it happens:** The combining changes the shape of NavigationStep[] before it enters the PlaybackStep[] array.
**How to avoid:** Do the combining inside `buildPlaybackSteps` BEFORE the steps are numbered. The combining reduces the count of 'navigation' type steps, and `computeSectionProgress` will automatically use the new count. Ensure jump-to-section/session still targets separator cards (which are not affected by combining).
**Warning signs:** Progress bar showing wrong percentages, sidebar highlights on wrong steps.

### Pitfall 2: Zustand Referential Equality and useMemo Dependencies
**What goes wrong:** The Builder preview doesn't update when settings change even though the store updated.
**Why it happens:** `useMemo` compares dependencies by reference. If `activePresentation?.settings` creates a new object reference on every render (it does, because `getActivePresentation()` calls `find()` which returns the same object from the array -- but after `persistPresentation`, the array element IS a new object), the memo should invalidate. But if the memo dependency is too coarse or too fine, updates may be missed.
**How to avoid:** Use granular selectors: subscribe to `settings.toolVisibility`, `settings.theme`, `settings.showTimestamps` individually rather than the entire presentation object.
**Warning signs:** Preview shows stale data after toggling settings.

### Pitfall 3: Auto-Update Toast Renders on Every Route
**What goes wrong:** Toast appears and disappears on route transitions, or shows multiple times.
**Why it happens:** If the toast state lives in a route component, route changes unmount and remount it.
**How to avoid:** Put the auto-update listener and toast in the RootLayout component (shared across all routes). Use a ref to track if the toast has been shown.
**Warning signs:** Toast flickering on navigation, duplicate toast banners.

### Pitfall 4: Module-Level Style Constants
**What goes wrong:** Inline styles cause unnecessary re-renders.
**Why it happens:** Forgetting the project convention of extracting static styles to module-level constants.
**How to avoid:** Follow the established pattern from Phase 9 -- all new static styles should be module-level `const` objects.
**Warning signs:** Code review finding inline style objects in render functions.

### Pitfall 5: Date Filter Type Change Breaks Existing Presentations
**What goes wrong:** Saved date filter state uses old preset values ('this-week', 'this-month') that no longer match the type.
**Why it happens:** If any component persists the date filter preset value.
**How to avoid:** Check that date filter state is purely ephemeral (component state, not persisted). Looking at the code: `dateFilter` lives in `sessionStore` as component-level state, not persisted to disk. Safe to rename.
**Warning signs:** TypeScript errors on preset value comparisons.

## Code Examples

### Example 1: Step Combining Logic
```typescript
// In buildPlaybackSteps, after getting navSteps from buildNavigationSteps:
function combineConsecutiveSoloSteps(navSteps: NavigationStep[]): NavigationStep[] {
  const result: NavigationStep[] = []
  let i = 0
  while (i < navSteps.length) {
    const step = navSteps[i]
    // If this is a solo assistant step, check for consecutive ones
    if (step.userMessage === null && step.assistantMessage) {
      const combinedAssistantMessages: ParsedMessage[] = [step.assistantMessage]
      let j = i + 1
      while (j < navSteps.length && navSteps[j].userMessage === null && navSteps[j].assistantMessage) {
        combinedAssistantMessages.push(navSteps[j].assistantMessage!)
        j++
      }
      if (combinedAssistantMessages.length > 1) {
        // Create combined step -- structure TBD based on type extension
        result.push({
          index: result.length,
          userMessage: null,
          assistantMessage: combinedAssistantMessages[0], // Primary message
          followUpMessages: [],
          // New field for combined content:
          // combinedMessages: combinedAssistantMessages
        })
      } else {
        result.push({ ...step, index: result.length })
      }
      i = j
    } else {
      result.push({ ...step, index: result.length })
      i++
    }
  }
  return result
}
```

### Example 2: Auto-Update Toast in RootLayout
```typescript
// In RootLayout or App component:
const [updateVersion, setUpdateVersion] = useState<string | null>(null)
const [updateDismissed, setUpdateDismissed] = useState(false)

useEffect(() => {
  const cleanup = window.electronAPI.onUpdateReady((version) => {
    setUpdateVersion(version)
    // Auto-dismiss after 30s
    const timer = setTimeout(() => setUpdateDismissed(true), 30_000)
    return () => clearTimeout(timer)
  })
  return cleanup
}, [])

// Render banner when update is ready and not dismissed
{updateVersion && !updateDismissed && (
  <div style={updateBannerStyle}>
    Update {updateVersion} ready — restart to apply
    <button onClick={() => window.electronAPI.installUpdate()}>
      Restart Now
    </button>
    <button onClick={() => setUpdateDismissed(true)}>Dismiss</button>
  </div>
)}
// Reminder indicator when dismissed
{updateVersion && updateDismissed && (
  <button onClick={() => setUpdateDismissed(false)} style={reminderStyle}>
    Update available
  </button>
)}
```

### Example 3: Date Filter Preset Rename
```typescript
// sessionFiltering.ts -- updated type and logic:
export type DatePreset = 'all' | 'today' | 'last-7-days' | 'last-30-days' | 'older' | 'custom'

// matchesDateFilter:
case 'last-7-days': {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return sessionDate >= sevenDaysAgo
}
case 'last-30-days': {
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return sessionDate >= thirtyDaysAgo
}
```

### Example 4: Close Presentation with Save Prompt
```typescript
// In PresentationList.tsx:
const handleClose = (e: React.MouseEvent, id: string): void => {
  e.stopPropagation()
  // Simple approach: always prompt (avoids dirty tracking complexity)
  const presentation = presentations.find(p => p.id === id)
  if (!presentation) return
  if (presentation.sourceFilePath) {
    // Already saved to disk at least once -- just close
    if (id === activePresentationId) setActivePresentation(null)
  } else {
    // Never saved -- prompt
    const choice = window.confirm(`"${presentation.name}" has not been saved. Close without saving?`)
    if (!choice) return
    if (id === activePresentationId) setActivePresentation(null)
  }
}
```

### Example 5: Split Session to New Section
```typescript
// New store action in presentationStore.ts:
splitToNewSection: (sectionId: string, sessionId: string): void => {
  const active = get().getActivePresentation()
  if (!active) return

  const section = active.sections.find(s => s.id === sectionId)
  if (!section) return
  const sessionRef = section.sessionRefs.find(r => r.sessionId === sessionId)
  if (!sessionRef) return

  // Remove from current section
  const updatedSections = active.sections
    .map(s => s.id === sectionId
      ? { ...s, sessionRefs: s.sessionRefs.filter(r => r.sessionId !== sessionId) }
      : s
    )
    .filter(s => s.sessionRefs.length > 0) // Remove emptied sections

  // Create new section with just this session
  const newSection: PresentationSection = {
    id: crypto.randomUUID(),
    name: sessionRef.displayName,
    sessionRefs: [sessionRef]
  }

  // Insert new section after the original section's position
  const originalIndex = updatedSections.findIndex(s => s.id === sectionId)
  const insertAt = originalIndex >= 0 ? originalIndex + 1 : updatedSections.length
  updatedSections.splice(insertAt, 0, newSection)

  const updated: Presentation = { ...active, sections: updatedSections, updatedAt: Date.now() }
  persistPresentation(updated)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Calendar-based date presets | Relative date presets | This phase | More intuitive, no Sunday confusion |
| Individual solo assistant steps | Combined consecutive assistant steps | This phase | Fewer clicks in autonomous sequences |
| No close button on presentations | Explicit close with save prompt | This phase | Standard editor workflow |
| Silent auto-updates | Toast notification with restart option | This phase | User knows update is available |

## Open Questions

1. **"Show more" button -- is it actually broken?**
   - What we know: CollapsibleContent.tsx code already implements overflow detection correctly (scrollHeight > threshold check, button only renders when `overflows` is true)
   - What's unclear: The Phase 4 bug report says the button shows when nothing to expand. This may have been fixed in subsequent phases, or it may be a race condition where the measure callback runs before content fully renders.
   - Recommendation: Verify at runtime before implementing a fix. If the bug persists, the issue is likely timing-related -- the `useLayoutEffect` runs before async content (shiki syntax highlighting) finishes rendering, so scrollHeight is measured on pre-highlighted content. Fix would be to re-measure after shiki completes (MutationObserver, which CodeBlock.tsx already uses).

2. **Box/border rendering -- what exactly breaks?**
   - What we know: CONTEXT.md mentions "CHECKPOINT box patterns and horizontal-rule-with-text sequences" having broken/misaligned borders
   - What's unclear: The exact markdown patterns that produce broken rendering. CHECKPOINT boxes in Claude Code output typically use Unicode box-drawing characters (e.g., `---`, `===`, or styled `##` headers) that markdown parsers may not handle gracefully.
   - Recommendation: Capture representative markdown strings from real JSONL files during implementation. The fix will likely be CSS for horizontal rules (already styled in message.css line 145-149) plus potentially a custom remark plugin or post-processing for box-drawing character sequences.

3. **System message false positive risk**
   - What we know: Pattern "Read the output file to retrieve the result:" is a known system injection. queue-operation messages are a known unresolved issue (noted in STATE.md blockers).
   - What's unclear: Full set of system message patterns. May need to analyze multiple JSONL files.
   - Recommendation: Start with the known pattern, add a configurable detection function, and iterate. Err on the side of showing messages as "You" rather than incorrectly hiding real user input.

4. **Combined step type extension**
   - What we know: NavigationStep currently has single `userMessage` and `assistantMessage` fields. Combining needs to hold multiple assistant messages.
   - What's unclear: Whether to extend NavigationStep with an optional `combinedMessages` array, or create a separate type in the PlaybackStep union.
   - Recommendation: Extend NavigationStep with `combinedAssistantMessages?: ParsedMessage[]`. When present, StepView renders all of them in sequence. This keeps the type extension minimal and backward-compatible. Alternatively, handle combining at the PlaybackStep level by adding a `CombinedNavigationPlaybackStep` to the union -- this avoids modifying the shared NavigationStep type but adds a new step type to handle in rendering.

## File Impact Analysis

### Files to Modify (by item)

| Item | Files | Complexity |
|------|-------|------------|
| "Show more" overflow | CollapsibleContent.tsx | LOW (verify, possibly no change needed) |
| Box/border rendering | message.css, possibly MarkdownRenderer.tsx | MEDIUM (CSS + investigation) |
| System messages | MessageBubble.tsx, cleanUserText.ts | MEDIUM (pattern detection) |
| Step combining | playbackStore.ts, pipeline.ts (type), StepView.tsx, PlaybackPlayer.tsx | HIGH (new logic + rendering) |
| Close presentations | PresentationList.tsx | LOW (add button + handler) |
| Live preview reactivity | Builder.tsx (memo deps) | LOW (fix dependency chain) |
| Date filter presets | SearchFilterBar.tsx, sessionFiltering.ts | LOW (rename + logic change) |
| Checkbox + split | SectionHeader.tsx, SessionEntry.tsx, PresentationOutline.tsx, presentationStore.ts | MEDIUM (layout + new action) |
| Solo step elapsed | playbackStore.ts, ElapsedTimeMarker.tsx, StepView.tsx | MEDIUM (ties into step combining) |
| Auto-update UI | New component or RootLayout.tsx, preload/index.ts | MEDIUM (new UI + IPC listener) |
| Open File in Player | Player.tsx or PlaybackPlayer.tsx, RecentFiles.tsx | LOW (button + existing IPC) |

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all referenced files (CollapsibleContent.tsx, playbackStore.ts, autoUpdater.ts, preload/index.ts, sessionFiltering.ts, PresentationList.tsx, StepView.tsx, MessageBubble.tsx, cleanUserText.ts, Builder.tsx, SectionHeader.tsx, SessionEntry.tsx, PresentationOutline.tsx, presentationStore.ts, ElapsedTimeMarker.tsx, MarkdownRenderer.tsx, message.css, Player.tsx, PlaybackPlayer.tsx, RecentFiles.tsx, Home.tsx)
- Phase 12 CONTEXT.md user decisions
- STATE.md accumulated decisions from all prior phases

### Secondary (MEDIUM confidence)
- Phase 4 and Phase 6 testing feedback (player-ux-feedback.md, builder-ux-feedback.md)

### Tertiary (LOW confidence)
- None -- all findings based on direct code analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies needed, all existing patterns
- Architecture: HIGH -- all items are modifications to existing, well-understood components
- Pitfalls: HIGH -- identified from codebase analysis and prior phase decision history
- Step combining: MEDIUM -- most complex item, type extension approach needs decision during planning
- System message detection: MEDIUM -- pattern set not exhaustively known

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable -- no external library changes)
