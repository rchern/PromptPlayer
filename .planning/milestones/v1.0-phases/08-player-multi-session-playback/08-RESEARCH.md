# Phase 8: Player Multi-Session Playback - Research

**Researched:** 2026-02-25
**Domain:** Multi-session navigation state, section-aware UI, segmented progress, file loading in Electron+React+Zustand
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Session transitions
- Separator card appears between sessions when stepping from one session's last step to the next session's first step
- Separator card shows: session name, section it belongs to, and brief stats (step count, message count)
- Separator card is its own navigable step — presenter lands on it and presses forward to continue
- Backward navigation also lands on the separator card (consistent with forward — forward/back are exact inverses)

#### Section navigation UI
- Persistent collapsible sidebar showing all sections and sessions
- Keyboard shortcut to toggle sidebar visibility (in addition to clickable toggle)
- Each section entry shows: section name, expandable list of session names, and per-section progress indicator
- Clicking a section jumps to a section separator card (distinct from session separator cards) that introduces the section
- Clicking an individual session within a section jumps to that session's separator card — granular navigation supported

#### Progress indicator design
- Combined display: segmented progress bar + text information
- Text shows section name with both local and global progress, e.g., "Research (4/12) — 12 of 47 overall"
- Segmented bar visually divides progress across the presentation

#### File loading experience
- Opening a .promptplay file shows a presentation overview first, not the first step
- Overview shows: presentation title, total steps, estimated duration, and section names
- Playback starts via any navigation action (spacebar, right arrow, click) — no explicit "Begin" button needed

### Claude's Discretion
- Progress indicator position (top vs bottom bar) — pick what works best with sidebar and content layout
- Segmented bar granularity (segments per section vs per session) — pick based on visual clarity
- Section separator card design (can differ from session separator cards or share a template)
- Error handling for corrupt/unparseable sessions in .promptplay files — pick the most presenter-friendly approach

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAY-01 | Player opens `.promptplay` files and renders the presentation | File loading via existing IPC `presentation:import`, new playback store initialization, overview screen |
| PLAY-10 | Player transitions seamlessly between sessions in the chain (no jarring reloads) | Unified step array with separator cards, cross-session navigation in playback store |
| PLAY-12 | Section/chapter markers are visible; user can jump to a section | Sidebar navigator with section/session tree, section separator cards as jump targets |

</phase_requirements>

## Summary

Phase 8 extends the existing single-session Player (Phase 4) into a full multi-session presentation playback engine. The core challenge is transforming a `PromptPlayFile` (containing a `Presentation` with sections, session references, and multiple `StoredSession` objects) into a single unified navigation sequence that the presenter can step through seamlessly with forward/back controls.

The existing architecture provides strong foundations: the `navigationStore` already manages step index and expand/collapse state; `filterVisibleMessages` and `buildNavigationSteps` convert messages into `NavigationStep[]`; the `Player.tsx` route renders one step at a time with keyboard/mouse controls. Phase 8's job is to (a) build a higher-level "playback store" that composes multiple sessions into one flat step array with separator cards injected at boundaries, (b) add a section sidebar for jump navigation, (c) replace the simple progress indicator with a segmented section-aware version, and (d) add a presentation overview screen as the entry point.

No new npm dependencies are needed. The entire phase is achievable with Zustand (state), React (components), CSS custom properties (theming), and lucide-react (icons) — all already installed.

**Primary recommendation:** Create a new `playbackStore` that owns the multi-session unified step array, separate from the single-session `navigationStore`. The playback store flattens all sessions' steps into one array, injects separator cards (section separators and session separators) at boundaries, and provides computed helpers for section-aware progress. The existing `Player.tsx` route is extended to check for playback mode and delegate to the playback store when a presentation is loaded.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.11 | Playback state (unified steps, current index, sidebar state, section progress) | Already used for 4 stores; consistent Zustand-everywhere pattern |
| react | ^19.0.0 | Components (sidebar, progress bar, separator cards, overview) | Already the framework |
| lucide-react | ^0.575.0 | Icons (PanelLeftClose, PanelLeftOpen, Layers, ChevronRight, Play, Clock, BarChart3) | Already installed; tree-shakeable |
| tailwindcss | ^4.2.0 | Layout utilities, sidebar transitions, responsive spacing | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router | ^7.13.0 | Route navigation to/from player, potential query params for file path | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New playbackStore | Extend existing navigationStore | Extending would overload a simple store with multi-session complexity; cleaner to separate single-session (Builder preview) from multi-session (Player playback) |
| Custom segmented progress bar | npm progress bar library (e.g., react-multi-segment-progress) | Libraries add dependencies for trivial CSS flexbox; segmented bar is ~30 lines of CSS |
| Custom collapsible sidebar | react-pro-sidebar or shadcn sidebar | External libraries add bundle weight for a component that needs only a width transition and toggle; project already has custom collapsible patterns |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/
  stores/
    playbackStore.ts              # NEW: Multi-session playback state
    navigationStore.ts            # UNCHANGED: Single-session nav (Builder preview)
  components/
    player/
      PlaybackPlayer.tsx          # NEW: Multi-session player wrapper
      PresentationOverview.tsx    # NEW: Title slide / overview screen
      SectionSidebar.tsx          # NEW: Collapsible section navigator
      SectionSidebarEntry.tsx     # NEW: Section row with expandable sessions
      SegmentedProgress.tsx       # NEW: Section-aware segmented progress bar
      SeparatorCard.tsx           # NEW: Section/session separator card
      StepView.tsx                # UNCHANGED: Renders individual steps
      NavigationControls.tsx      # UNCHANGED: Arrow buttons
      CollapsibleContent.tsx      # UNCHANGED: Collapse/expand wrapper
      ProgressIndicator.tsx       # KEPT: Single-session fallback
  hooks/
    useKeyboardNavigation.ts     # MODIFIED: Support playback store + sidebar toggle
  routes/
    Player.tsx                    # MODIFIED: Dispatch to PlaybackPlayer or single-session
  types/
    playback.ts                   # NEW: PlaybackStep, SeparatorStep, SectionMap types
    pipeline.ts                   # UNCHANGED
    presentation.ts               # UNCHANGED
```

### Pattern 1: Unified Step Array with Separator Cards
**What:** Flatten all sessions from a presentation into one contiguous array of "playback steps" where each element is either a regular NavigationStep or a SeparatorCard (section intro or session transition).
**When to use:** When loading a .promptplay file for playback.
**Confidence:** HIGH — pure data transformation, analogous to Phase 4's `buildNavigationSteps`.

```typescript
// Types for the unified step array
type PlaybackStep =
  | { type: 'navigation'; step: NavigationStep; sessionId: string; sectionId: string }
  | { type: 'section-separator'; sectionId: string; sectionName: string; sessionCount: number; totalSteps: number }
  | { type: 'session-separator'; sessionId: string; sessionName: string; sectionId: string; sectionName: string; stepCount: number; messageCount: number }
  | { type: 'overview' }

// Build function: Presentation + StoredSession[] -> PlaybackStep[]
function buildPlaybackSteps(
  presentation: Presentation,
  sessions: Map<string, StoredSession>,
  toolVisibility: ToolCategoryConfig[]
): PlaybackStep[] {
  const steps: PlaybackStep[] = [{ type: 'overview' }]

  for (const section of presentation.sections) {
    // Section separator card
    const sectionStepCount = /* computed */ 0
    steps.push({
      type: 'section-separator',
      sectionId: section.id,
      sectionName: section.name,
      sessionCount: section.sessionRefs.length,
      totalSteps: sectionStepCount
    })

    for (const ref of section.sessionRefs) {
      const session = sessions.get(ref.sessionId)
      if (!session) continue // Skip missing sessions gracefully

      // Session separator card
      const navSteps = buildNavigationSteps(
        filterWithToolSettings(session.messages, toolVisibility)
      )
      steps.push({
        type: 'session-separator',
        sessionId: ref.sessionId,
        sessionName: ref.displayName,
        sectionId: section.id,
        sectionName: section.name,
        stepCount: navSteps.length,
        messageCount: session.messages.length
      })

      // Navigation steps for this session
      for (const navStep of navSteps) {
        steps.push({
          type: 'navigation',
          step: navStep,
          sessionId: ref.sessionId,
          sectionId: section.id
        })
      }
    }
  }

  return steps
}
```

**Key design decisions:**
- The overview screen is step index 0. Any navigation action from index 0 moves to index 1.
- Section separators appear before the first session in each section.
- Session separators appear before the first step of each session.
- Forward/back are exact inverses — separator cards are real steps with real indices.
- The `sessionId` and `sectionId` on each step enable progress computation without scanning.

### Pattern 2: Playback Store (Zustand)
**What:** A new Zustand store that manages the multi-session unified step array, current index, sidebar visibility, and derived section progress.
**When to use:** When the Player is in presentation playback mode (as opposed to single-session Builder preview mode).
**Confidence:** HIGH — follows established Zustand patterns from 4 existing stores.

```typescript
interface PlaybackState {
  // Core state
  presentation: Presentation | null
  sessions: Map<string, StoredSession>
  steps: PlaybackStep[]
  currentStepIndex: number
  expandedSteps: Record<number, { user: boolean; assistant: boolean }>

  // Sidebar
  sidebarOpen: boolean
  expandedSections: Set<string>  // Section IDs expanded in sidebar

  // Actions
  loadPresentation: (presentation: Presentation, sessions: StoredSession[]) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  goToFirst: () => void
  goToLast: () => void
  jumpToSection: (sectionId: string) => void
  jumpToSession: (sessionId: string) => void
  toggleExpand: (stepIndex: number, role: 'user' | 'assistant') => void
  toggleSidebar: () => void
  toggleSidebarSection: (sectionId: string) => void
  reset: () => void

  // Derived (computed via selectors, not stored)
  // getCurrentSection(): { id, name, localStep, localTotal }
  // getGlobalProgress(): { current, total }
  // getSectionProgress(sectionId): { completed, total }
}
```

**Important:** Use selector functions for derived state. Do NOT store computed progress values — compute them from `currentStepIndex` and the step array on each render. Zustand selectors are cheap and avoid stale state.

```typescript
// Selector examples (used in components)
const currentSection = usePlaybackStore((s) => {
  if (s.steps.length === 0) return null
  const step = s.steps[s.currentStepIndex]
  if (!step) return null
  // Walk backwards to find the section this step belongs to
  const sectionId = 'sectionId' in step ? step.sectionId : null
  if (!sectionId) return null
  const section = s.presentation?.sections.find(sec => sec.id === sectionId)
  return section ?? null
})
```

### Pattern 3: Section Sidebar Layout
**What:** A persistent collapsible sidebar on the left side showing the section/session tree.
**When to use:** During presentation playback. Toggle via keyboard shortcut (e.g., `S` key or `Ctrl+B`) and clickable toggle button.
**Confidence:** HIGH — CSS transition for width, standard React conditional rendering.

```typescript
// Layout pattern: sidebar + content in a flex container
<div style={{ display: 'flex', height: '100%' }}>
  {/* Sidebar */}
  <aside style={{
    width: sidebarOpen ? 280 : 0,
    transition: 'width 200ms ease',
    overflow: 'hidden',
    borderRight: sidebarOpen ? '1px solid var(--color-border)' : 'none',
    flexShrink: 0
  }}>
    <div style={{ width: 280, padding: 'var(--space-4)' }}>
      {/* Section tree */}
    </div>
  </aside>

  {/* Main content area */}
  <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
    {/* StepView, NavigationControls, SegmentedProgress */}
  </div>
</div>
```

**Accessibility:** The sidebar toggle button uses `aria-expanded` and `aria-label`. The sidebar has `role="navigation"` and `aria-label="Presentation sections"`. Section entries use `role="treeitem"` with `aria-expanded` for collapsible session lists.

### Pattern 4: Segmented Progress Bar
**What:** A multi-segment bar where each segment represents a section, with different fill levels showing progress through each section.
**When to use:** In the progress indicator area (bottom of the player).
**Confidence:** HIGH — pure CSS flexbox, no library needed.

```typescript
// Segmented bar: one flex child per section, width proportional to step count
<div style={{ display: 'flex', height: 4, gap: 2, borderRadius: 2 }}>
  {sections.map((section, i) => {
    const width = (section.stepCount / totalSteps) * 100
    const fill = section.completed / section.stepCount * 100
    return (
      <div key={section.id} style={{
        width: `${width}%`,
        height: '100%',
        background: 'var(--color-bg-tertiary)',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${fill}%`,
          height: '100%',
          background: 'var(--color-accent)',
          transition: 'width 150ms ease'
        }} />
      </div>
    )
  })}
</div>
```

**Discretion recommendation — segments per section:** Use one segment per section (not per session). With 3-6 sections this creates a clean, readable bar. Per-session would create too many tiny segments that are visually noisy. Each section segment's width is proportional to its step count, so large sections get larger visual segments.

**Discretion recommendation — position:** Bottom bar, spanning the full width below the content area. Text progress info sits above the segmented bar, right-aligned. This keeps it out of the way of the sidebar and content while remaining always visible.

### Pattern 5: Presentation Overview Screen
**What:** A title-slide equivalent shown when a .promptplay file is first loaded, before any navigation step.
**When to use:** Step index 0 (the first element in the playback steps array).
**Confidence:** HIGH — simple presentational component.

```typescript
// Overview screen shows presentation metadata
function PresentationOverview({ presentation, totalSteps, estimatedDuration }: Props) {
  return (
    <div className="presentation-mode" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 'var(--space-6)',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700 }}>
        {presentation.name}
      </h1>
      <div style={{ color: 'var(--color-text-secondary)' }}>
        {totalSteps} steps across {presentation.sections.length} sections
      </div>
      <div style={{ color: 'var(--color-text-muted)' }}>
        Estimated duration: {estimatedDuration}
      </div>
      {/* Section names as a visual outline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {presentation.sections.map(s => (
          <div key={s.id} style={{ color: 'var(--color-text-secondary)' }}>
            {s.name}
          </div>
        ))}
      </div>
      <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
        Press any key to begin
      </div>
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Anti-pattern: Re-parsing sessions on every navigation.** Build the unified step array once when the presentation loads. Navigation should be a simple index increment, not a data pipeline re-run.
- **Anti-pattern: Modifying the existing navigationStore for multi-session.** The navigationStore is simple by design — it handles single-session Builder preview. Adding multi-session complexity would break that simplicity. Use a separate playbackStore.
- **Anti-pattern: Storing progress percentages in state.** Derive progress from `currentStepIndex` and the step array. Stored percentages become stale if the step array changes (e.g., tool visibility settings change).
- **Anti-pattern: Animating sidebar with JavaScript.** Use CSS `transition: width 200ms ease` — smoother, no requestAnimationFrame needed, and does not block React rendering.
- **Anti-pattern: Making the overview screen a separate route.** The overview is step 0 in the unified array, not a separate page. This means forward navigation from the overview naturally goes to the first section separator, and back from the first separator returns to the overview.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Segmented progress bar | npm progress bar library | CSS flexbox with proportional widths | Trivial CSS (30 lines), no dependency needed |
| Collapsible sidebar | react-pro-sidebar or shadcn | CSS width transition + overflow:hidden | Project already has this pattern; sidebar is structurally simple |
| Section tree view | Tree view library (react-arborist etc.) | Nested div with expand/collapse | Only 2 levels deep (section -> sessions), no drag/drop needed |
| Keyboard shortcut binding | Hotkeys library (react-hotkeys-hook etc.) | Extend existing useKeyboardNavigation hook | Already have the pattern; adding 1-2 keys is trivial |
| Duration estimation | Complex ML-based estimation | Simple step count * ~30 seconds average | Rough estimate is fine; precision is unnecessary for a "title slide" |

**Key insight:** Phase 8 is a structural expansion phase, not a technology introduction phase. Every tool and library needed is already installed. The complexity is in the data transformation (sessions -> unified step array) and the state management (cross-session position tracking), not in new rendering or library integration.

## Common Pitfalls

### Pitfall 1: Forward/Back Asymmetry at Session Boundaries
**What goes wrong:** Forward navigation skips separator cards, or backward navigation doesn't return to them, breaking the "exact inverse" contract.
**Why it happens:** Developers special-case separator cards in navigation logic (e.g., auto-advancing past them) instead of treating them as regular steps.
**How to avoid:** Separator cards are entries in the step array with real indices. `nextStep()` increments by 1 regardless of step type. `prevStep()` decrements by 1 regardless of step type. No special-casing.
**Warning signs:** Going forward then backward doesn't return to the same step. Presenter misses separator cards when going backward.

### Pitfall 2: Section Progress Calculation Off-by-One
**What goes wrong:** Progress shows "4/12" when the presenter is actually on step 3 or 5 of the section.
**Why it happens:** Separator cards are counted or not counted inconsistently when computing local progress.
**How to avoid:** Define clearly whether separator cards count as "steps" in progress. Recommendation: separator cards do NOT count toward progress numerator or denominator. Progress text shows "Research (4/12)" meaning "on the 4th content step out of 12 content steps in this section." Separator cards are transitional, not content.
**Warning signs:** Progress numbers don't add up across sections. Jumping to a section shows non-zero progress.

### Pitfall 3: Stale Session Data After Tool Visibility Change
**What goes wrong:** Changing tool visibility settings in the Builder (Phase 7) doesn't update the Player's step array.
**Why it happens:** The unified step array was built once at load time with the old tool visibility settings.
**How to avoid:** If the presentation is loaded from app-local storage (not a .promptplay file), settings changes should trigger a rebuild of the unified step array. For .promptplay files opened directly, settings are embedded and immutable during playback. The playback store's `loadPresentation` should accept the current settings and rebuild steps if settings change.
**Warning signs:** Steps that should be hidden are still visible, or vice versa.

### Pitfall 4: Sidebar Steals Focus from Keyboard Navigation
**What goes wrong:** After clicking a section in the sidebar, arrow keys no longer advance the presentation because focus is trapped in the sidebar.
**Why it happens:** Clicking sidebar buttons moves DOM focus to the sidebar. The keyboard navigation handler checks `e.target.tagName` and may skip keys from button elements.
**How to avoid:** After a sidebar click triggers a `jumpToSection`, programmatically return focus to the main content area (e.g., `contentRef.current?.focus()`). The keyboard handler should skip only INPUT and TEXTAREA, not BUTTON elements.
**Warning signs:** After clicking in the sidebar, pressing spacebar or right arrow does nothing.

### Pitfall 5: Missing Sessions in .promptplay File
**What goes wrong:** A presentation references a session that doesn't exist in the .promptplay file's sessions array.
**Why it happens:** Export bug (Phase 7 gap: "Export does not embed parsed messages"), or manual file editing.
**How to avoid:** During `buildPlaybackSteps`, skip missing sessions gracefully with a console warning. Show a visual indicator on the separator card (e.g., "Session data not available"). Do NOT crash or show an error dialog — the presenter is likely in front of an audience.
**Warning signs:** Empty sections, missing session content, or app crash on file open.

### Pitfall 6: Overview Screen Advances on Any Click
**What goes wrong:** Clicking anywhere on the overview screen (to position the window, to copy text, etc.) advances to the first step.
**Why it happens:** Click-to-advance is too broadly scoped.
**How to avoid:** The overview screen should respond to keyboard navigation (spacebar, right arrow) but NOT to general clicks. Only an explicit "Begin" interaction or keyboard nav should advance. The CONTEXT says "Playback starts via any navigation action (spacebar, right arrow, click)" — interpret "click" as clicking the navigation arrows, not clicking anywhere on the screen.
**Warning signs:** Accidental advances while the presenter is setting up.

### Pitfall 7: Sidebar Width Causes Content Reflow Jank
**What goes wrong:** Opening/closing the sidebar causes the step content to reflow and re-render, creating visual jank during the animation.
**Why it happens:** The content area's width changes as the sidebar opens, triggering layout recalculation.
**How to avoid:** Use CSS `transition: width 200ms ease` on the sidebar. The content area uses `flex: 1` which smoothly absorbs the remaining space. Avoid setting explicit pixel widths on the content area. If content has max-width constraints, ensure they are percentage-based or use `min()`.
**Warning signs:** Text wrapping changes during sidebar animation; content jumps or flickers.

## Code Examples

### Playback Store (Key Parts)

```typescript
// Source: Application architecture + existing Zustand store patterns
import { create } from 'zustand'
import type { Presentation, PresentationSettings, ToolCategoryConfig } from '../types/presentation'
import type { StoredSession, NavigationStep, ParsedMessage } from '../types/pipeline'
import { filterWithToolSettings, buildNavigationSteps } from '../utils/messageFiltering'

// --- Types ---

export type PlaybackStep =
  | { type: 'overview' }
  | { type: 'section-separator'; sectionId: string; sectionName: string; sessionCount: number; totalSteps: number }
  | { type: 'session-separator'; sessionId: string; sessionName: string; sectionId: string; sectionName: string; stepCount: number; messageCount: number }
  | { type: 'navigation'; step: NavigationStep; sessionId: string; sectionId: string }

// --- Build function ---

export function buildPlaybackSteps(
  presentation: Presentation,
  sessionsMap: Map<string, StoredSession>
): PlaybackStep[] {
  const toolVisibility = presentation.settings.toolVisibility
  const steps: PlaybackStep[] = [{ type: 'overview' }]

  for (const section of presentation.sections) {
    // Count total content steps in section (for section separator card)
    let sectionTotalSteps = 0
    const sessionStepCounts: { ref: typeof section.sessionRefs[0]; navSteps: NavigationStep[] }[] = []

    for (const ref of section.sessionRefs) {
      const session = sessionsMap.get(ref.sessionId)
      if (!session) continue
      const filtered = filterWithToolSettings(session.messages, toolVisibility)
      const navSteps = buildNavigationSteps(filtered)
      sectionTotalSteps += navSteps.length
      sessionStepCounts.push({ ref, navSteps })
    }

    // Section separator
    steps.push({
      type: 'section-separator',
      sectionId: section.id,
      sectionName: section.name,
      sessionCount: section.sessionRefs.length,
      totalSteps: sectionTotalSteps
    })

    // Sessions within this section
    for (const { ref, navSteps } of sessionStepCounts) {
      const session = sessionsMap.get(ref.sessionId)!
      steps.push({
        type: 'session-separator',
        sessionId: ref.sessionId,
        sessionName: ref.displayName,
        sectionId: section.id,
        sectionName: section.name,
        stepCount: navSteps.length,
        messageCount: session.messages.length
      })

      for (const navStep of navSteps) {
        steps.push({
          type: 'navigation',
          step: navStep,
          sessionId: ref.sessionId,
          sectionId: section.id
        })
      }
    }
  }

  return steps
}

// --- Store ---

interface PlaybackState {
  presentation: Presentation | null
  sessions: Map<string, StoredSession>
  steps: PlaybackStep[]
  currentStepIndex: number
  expandedSteps: Record<number, { user: boolean; assistant: boolean }>
  sidebarOpen: boolean
  expandedSections: Set<string>

  loadPresentation: (presentation: Presentation, sessions: StoredSession[]) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  goToFirst: () => void
  goToLast: () => void
  jumpToSection: (sectionId: string) => void
  jumpToSession: (sessionId: string) => void
  toggleExpand: (stepIndex: number, role: 'user' | 'assistant') => void
  toggleSidebar: () => void
  toggleSidebarSection: (sectionId: string) => void
  reset: () => void
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  presentation: null,
  sessions: new Map(),
  steps: [],
  currentStepIndex: 0,
  expandedSteps: {},
  sidebarOpen: false,
  expandedSections: new Set(),

  loadPresentation: (presentation, sessionsList) => {
    const sessionsMap = new Map(sessionsList.map(s => [s.sessionId, s]))
    const steps = buildPlaybackSteps(presentation, sessionsMap)
    // Auto-expand all sections in sidebar initially
    const expandedSections = new Set(presentation.sections.map(s => s.id))
    set({
      presentation,
      sessions: sessionsMap,
      steps,
      currentStepIndex: 0,
      expandedSteps: {},
      sidebarOpen: false,
      expandedSections
    })
  },

  nextStep: () => {
    const { currentStepIndex, steps } = get()
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 })
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get()
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 })
    }
  },

  goToStep: (index) => {
    const { steps } = get()
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index })
    }
  },

  goToFirst: () => set({ currentStepIndex: 0 }),

  goToLast: () => {
    const { steps } = get()
    if (steps.length > 0) set({ currentStepIndex: steps.length - 1 })
  },

  jumpToSection: (sectionId) => {
    const { steps } = get()
    const idx = steps.findIndex(
      s => s.type === 'section-separator' && s.sectionId === sectionId
    )
    if (idx >= 0) set({ currentStepIndex: idx })
  },

  jumpToSession: (sessionId) => {
    const { steps } = get()
    const idx = steps.findIndex(
      s => s.type === 'session-separator' && s.sessionId === sessionId
    )
    if (idx >= 0) set({ currentStepIndex: idx })
  },

  toggleExpand: (stepIndex, role) => {
    const { expandedSteps } = get()
    const current = expandedSteps[stepIndex] ?? { user: false, assistant: false }
    set({
      expandedSteps: {
        ...expandedSteps,
        [stepIndex]: { ...current, [role]: !current[role] }
      }
    })
  },

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  toggleSidebarSection: (sectionId) => {
    const { expandedSections } = get()
    const next = new Set(expandedSections)
    if (next.has(sectionId)) next.delete(sectionId)
    else next.add(sectionId)
    set({ expandedSections: next })
  },

  reset: () => set({
    presentation: null,
    sessions: new Map(),
    steps: [],
    currentStepIndex: 0,
    expandedSteps: {},
    sidebarOpen: false,
    expandedSections: new Set()
  })
}))
```

### Section Progress Selector

```typescript
// Compute section-aware progress from the step array
// Used by SegmentedProgress and the progress text display
export function computeSectionProgress(
  steps: PlaybackStep[],
  currentStepIndex: number,
  sections: PresentationSection[]
): SectionProgressInfo[] {
  return sections.map(section => {
    const sectionSteps = steps.filter(
      s => s.type === 'navigation' && s.sectionId === section.id
    )
    const totalContentSteps = sectionSteps.length
    const completedSteps = sectionSteps.filter(
      (_, idx) => {
        const globalIdx = steps.indexOf(sectionSteps[idx])
        return globalIdx <= currentStepIndex
      }
    ).length

    return {
      sectionId: section.id,
      sectionName: section.name,
      completed: completedSteps,
      total: totalContentSteps
    }
  })
}
```

### Tool Use Map for Multi-Session

```typescript
// Build tool use map spanning all sessions in the presentation
// Needed for tool rejection display (AskUserQuestion answers reference tool_use_ids)
function buildMultiSessionToolUseMap(
  sessions: Map<string, StoredSession>
): Map<string, { name: string; input: Record<string, unknown> }> {
  const map = new Map<string, { name: string; input: Record<string, unknown> }>()
  for (const session of sessions.values()) {
    for (const msg of session.messages) {
      for (const block of msg.contentBlocks) {
        if (block.type === 'tool_use') {
          map.set(block.id, { name: block.name, input: block.input })
        }
      }
    }
  }
  return map
}
```

### Keyboard Navigation Extension

```typescript
// Extended keyboard handler for playback mode
// Adds: 'S' or 'Ctrl+B' to toggle sidebar
function usePlaybackKeyboardNavigation(): void {
  const nextStep = usePlaybackStore((s) => s.nextStep)
  const prevStep = usePlaybackStore((s) => s.prevStep)
  const goToFirst = usePlaybackStore((s) => s.goToFirst)
  const goToLast = usePlaybackStore((s) => s.goToLast)
  const toggleSidebar = usePlaybackStore((s) => s.toggleSidebar)

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // Sidebar toggle: S key (no modifier) or Ctrl+B
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        toggleSidebar()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevStep()
          break
        case 'Home':
          e.preventDefault()
          goToFirst()
          break
        case 'End':
          e.preventDefault()
          goToLast()
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nextStep, prevStep, goToFirst, goToLast, toggleSidebar])
}
```

## Discretion Recommendations

### Progress Indicator Position
**Recommendation:** Bottom bar spanning full width of the content area (excluding sidebar). The segmented bar is at the very bottom, and above it sits the text progress line. This placement mirrors PowerPoint's slide counter position and avoids competing with the titlebar or step content.

### Segmented Bar Granularity
**Recommendation:** One segment per section. With typical presentations having 3-6 sections, this creates a clear visual breakdown. Per-session segments would be too granular (10+ tiny segments) and hard to read. Each section segment's width is proportional to its content step count (not including separator cards in the count).

### Section Separator Card Design
**Recommendation:** Share a template with session separator cards but use visual differentiation. Section separators should be larger/more prominent (centered, larger font, section name as heading, session count and total steps as subtext). Session separators should be smaller (left-aligned, session name as heading, step/message count as subtext, section name shown as a breadcrumb above). This creates a visual hierarchy: section cards feel like "chapter title pages" while session cards feel like "topic transitions."

### Error Handling for Corrupt Sessions
**Recommendation:** Skip corrupt sessions silently during playback with a console warning. In the section sidebar, show the session name with a muted "(unavailable)" suffix. On the session's separator card, show "Session data could not be loaded" in muted text. Never show an error dialog during playback — the presenter is in front of an audience.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate stores per concern (Redux slices) | Zustand with multiple independent stores | Zustand v4+ (2023) | Simpler, no provider nesting, works outside React |
| CSS animation libraries for sidebar | CSS `transition` on width/transform | Always available, but CSS transitions are now universally smooth | No library needed; 200ms transition is production quality |
| Complex tree view libraries for section nav | Simple nested div with expand/collapse | Always available; tree libraries only needed for drag-drop, virtualization | 2-level trees don't need libraries |
| Progress bar npm packages | CSS flexbox segments | Always available | No dependency for proportional-width segments |

**Deprecated/outdated:**
- `react-transition-group` for sidebar animations: Overkill for a simple width transition. CSS transitions handle this natively.
- Storing computed/derived values in Zustand state: Zustand best practice is to derive via selectors. Stored computed values become stale.

## Open Questions

1. **How should the Player route know whether it's in single-session or multi-session mode?**
   - What we know: Currently `Player.tsx` reads from `sessionStore.activeSession`. In Phase 8, it may also need to read from `playbackStore`.
   - What's unclear: Should there be a mode flag, or should the Player check which store has data?
   - Recommendation: Check `playbackStore.presentation !== null` first. If a presentation is loaded, render `PlaybackPlayer`. Otherwise, fall back to the existing single-session behavior. This avoids a mode flag and keeps the routing simple.

2. **Should the existing `filterWithToolSettings` or `filterVisibleMessages` be used for playback?**
   - What we know: `filterWithToolSettings` uses per-category tool visibility from `PresentationSettings`. `filterVisibleMessages` uses a simple boolean.
   - What's unclear: A .promptplay file embeds `PresentationSettings.toolVisibility`. Should the Player use these settings?
   - Recommendation: Yes, use `filterWithToolSettings` with the presentation's embedded settings. This respects the Builder's configuration choices. The simple `filterVisibleMessages(messages, false)` is only for the Builder preview path.

3. **Should the playback store persist sidebar open/closed state?**
   - What we know: The sidebar is toggleable. Opening a new presentation should start with the sidebar closed.
   - What's unclear: Should sidebar state survive navigation away and back?
   - Recommendation: No. Reset sidebar state when a new presentation loads. The sidebar is a transient navigational aid, not a persistent preference. Start closed to maximize content area.

4. **Phase 7 gap: "Export does not embed parsed messages"**
   - What we know: STATE.md lists this as a known gap from Phase 7 verification.
   - What's unclear: Has this been fixed? If not, .promptplay files will have empty session data.
   - Recommendation: Phase 8 should assume .promptplay files contain session data (the contract is defined in the `PromptPlayFile` interface). If the Phase 7 gap is not fixed before Phase 8 execution, it should be fixed as the first task of Phase 8 (or as a prerequisite).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `navigationStore.ts`, `Player.tsx`, `playbackStore.ts`, `presentationStore.ts`, `messageFiltering.ts`, `pipeline/types.ts`, `presentation.ts` — direct code inspection of 15+ files
- Existing codebase: Phase 4 RESEARCH.md — architecture patterns, anti-patterns, and pitfalls for single-session navigation
- Existing codebase: ARCHITECTURE.md — Navigation Controller and Presentation Engine component boundaries
- Zustand GitHub: store patterns, selector best practices — consistent with project's existing 4 stores

### Secondary (MEDIUM confidence)
- Web search: Zustand slices pattern and computed state — multiple sources confirm selector-based derivation as best practice
- Web search: React collapsible sidebar patterns — WAI-ARIA disclosure pattern with aria-expanded for toggle
- Web search: CSS segmented progress bar — flexbox proportional segments pattern verified across multiple sources
- Electron docs: File association and open-file event handling for custom file types

### Tertiary (LOW confidence)
- None — all patterns are verified through existing codebase patterns or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all patterns verified in existing codebase
- Architecture: HIGH — unified step array is a natural extension of Phase 4's `buildNavigationSteps`; playback store follows established Zustand patterns
- Pitfalls: HIGH — based on direct code analysis of Phase 4 patterns and cross-session boundary edge cases
- Discretion recommendations: MEDIUM — subjective design choices informed by PowerPoint/Keynote mental model and existing codebase patterns

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days — stable domain, no fast-moving dependencies)
