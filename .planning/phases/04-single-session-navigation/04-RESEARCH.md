# Phase 4: Single-Session Navigation - Research

**Researched:** 2026-02-21
**Domain:** React slideshow-style navigation with keyboard controls, Zustand state management, CSS transitions
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Step granularity
- Each step = one user+Claude message pair (not individual messages)
- Claude's response starts in a collapsed preview state by default
- Expanding/collapsing a response is a manual UI toggle, NOT a navigation step
- Forward/backward always move between pairs regardless of expand/collapse state
- Both user messages and Claude responses are collapsible (long user messages with pasted code, etc.)
- Expand/collapse state is remembered -- if you expand a response, step away, and come back, it stays expanded

#### Navigation feel
- Slideshow-style: only the current message pair is visible at any time (not a growing chat log)
- Previous messages are NOT visible -- current step only
- Transition animation and overflow behavior: Claude's discretion

#### Progress indicator
- Style, position, visibility, and interactivity: Claude's discretion
- Must show current step N of M within the session (per success criteria)

#### Step controls
- Keyboard: right arrow and spacebar for forward, left arrow for back
- Home key jumps to first step, End key jumps to last step
- On-screen buttons: subtle forward/back buttons (placement at Claude's discretion)
- Click behavior for forward navigation: Claude's discretion (must not conflict with expand/collapse)

### Claude's Discretion
- Collapsed preview content (what to show in the collapsed state)
- Transition animation between steps (instant, fade, slide -- whatever feels right)
- Overflow handling for expanded long content (scroll within or grow page)
- Progress indicator style (counter, bar, dots), position, visibility, and whether it's clickable
- On-screen button placement (edge arrows, bottom bar, etc.)
- Click-to-advance target area (must coexist with expand/collapse clicks)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Summary

This phase transforms the existing message rendering components into a slideshow-style navigation experience. The core challenge is converting the flat list of `ParsedMessage[]` into paired user+assistant "steps," managing navigation state through a Zustand store, binding keyboard/mouse controls, and implementing a collapse/expand system with a progress indicator.

The existing codebase already has the heavy lifting done: the data pipeline (Parser -> Stitcher -> Classifier) produces ordered, classified messages, and the rendering components (MessageBubble, ContentBlockRenderer, MarkdownRenderer, etc.) handle visual output. Phase 4 builds a Navigation Controller layer on top. The existing `filterVisibleMessages` function already filters plumbing messages, which directly feeds the "narrative-only steps" requirement.

The architecture follows the original ARCHITECTURE.md vision: the Navigation Controller tracks `currentIndex` within the step array and tells the Presentation Engine what to render. This phase implements it for single-session only; Phase 8 extends it for multi-session.

**Primary recommendation:** Build a `useNavigationStore` Zustand store that holds the step array (derived from message pairing), current step index, and expand/collapse state per step. A `useKeyboardNavigation` hook handles DOM keydown events. The Player route renders one step at a time with a fade transition.

## Standard Stack

No new dependencies are required. This phase uses only what is already installed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.11 | Navigation state (currentIndex, steps, expand/collapse) | Already used for sessionStore and appStore; consistent pattern |
| react | ^19.0.0 | Component rendering, hooks (useEffect, useCallback, useMemo) | Already the framework |
| tailwindcss | ^4.2.0 | Utility classes for layout, line-clamp, transitions | Already installed, has built-in line-clamp-* |
| lucide-react | ^0.575.0 | Icons for nav buttons (ChevronLeft, ChevronRight) | Already installed for Builder icons |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router | ^7.13.0 | Route params to pass session ID to Player | Already installed; Player route may need params |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom useKeyboardNavigation hook | arrow-keys-react npm package | Package is overkill for 5 key bindings; custom hook is simpler, zero-dep |
| CSS opacity transition | react-transition-group | Library adds complexity for a single fade; CSS transitions are sufficient |
| Custom collapse | react-collapsed | Library is for variable-height animations; our collapsed state is simpler (line-clamp + toggle) |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/
  stores/
    navigationStore.ts         # NEW: Zustand store for navigation state
  hooks/
    useKeyboardNavigation.ts   # NEW: Keyboard event listener hook
  components/
    player/
      StepView.tsx             # NEW: Single step (user+assistant pair) with collapse/expand
      ProgressIndicator.tsx    # NEW: Step N of M display
      NavigationControls.tsx   # NEW: On-screen forward/back buttons
      CollapsibleContent.tsx   # NEW: Wrapper for collapsible message content
  routes/
    Player.tsx                 # MODIFIED: Full player implementation replacing placeholder
  types/
    pipeline.ts                # MODIFIED: Add NavigationStep type
```

### Pattern 1: Message Pairing into Steps
**What:** Transform the flat `ParsedMessage[]` from the pipeline into an array of `NavigationStep` objects, where each step is a user+assistant message pair.
**When to use:** After `filterVisibleMessages` has been applied to remove plumbing messages.
**Confidence:** HIGH -- this is a pure data transformation function, testable without UI.

```typescript
// Source: Application architecture (derived from existing pipeline types)
interface NavigationStep {
  index: number
  userMessage: ParsedMessage       // The user's prompt
  assistantMessage: ParsedMessage | null  // Claude's response (null for last unpaired user msg)
}

/**
 * Pair visible messages into navigation steps.
 * Each step = one user message + the following assistant message.
 *
 * Handles edge cases:
 * - Assistant message with no preceding user message (first msg is assistant):
 *   create step with null userMessage
 * - User message with no following assistant message (conversation ends):
 *   create step with null assistantMessage
 * - Consecutive user messages (possible after filtering): each gets its own step
 * - Consecutive assistant messages (possible after filtering): group with preceding user
 */
function buildNavigationSteps(visibleMessages: ParsedMessage[]): NavigationStep[] {
  const steps: NavigationStep[] = []
  let i = 0

  while (i < visibleMessages.length) {
    const msg = visibleMessages[i]

    if (msg.role === 'user') {
      // Check if next message is assistant
      const next = visibleMessages[i + 1]
      if (next && next.role === 'assistant') {
        steps.push({ index: steps.length, userMessage: msg, assistantMessage: next })
        i += 2
      } else {
        // User message without a following assistant response
        steps.push({ index: steps.length, userMessage: msg, assistantMessage: null })
        i += 1
      }
    } else {
      // Assistant message without preceding user message
      steps.push({ index: steps.length, userMessage: msg, assistantMessage: null })
      i += 1
    }
  }

  return steps
}
```

**Key design note:** The step type uses `userMessage` + `assistantMessage` rather than a generic pair, because the rendering differs by role (user messages show as plain text, assistant messages as markdown). Keeping them explicitly typed avoids runtime role checks.

### Pattern 2: Zustand Navigation Store
**What:** Centralized state for current step index, expand/collapse per step, and derived step count.
**When to use:** As the single source of truth for the Player's navigation state.
**Confidence:** HIGH -- follows same Zustand patterns already established in sessionStore and appStore.

```typescript
// Source: Zustand patterns from existing stores + official docs
interface NavigationState {
  // Step data
  steps: NavigationStep[]
  currentStepIndex: number

  // Expand/collapse state (keyed by step index)
  // Tracks which part of each step is expanded
  expandedSteps: Record<number, { user: boolean; assistant: boolean }>

  // Actions
  initializeSteps: (messages: ParsedMessage[]) => void
  goToStep: (index: number) => void
  nextStep: () => void
  prevStep: () => void
  goToFirst: () => void
  goToLast: () => void
  toggleExpand: (stepIndex: number, role: 'user' | 'assistant') => void

  // Derived (computed inline, not stored)
  // totalSteps: number  -> steps.length
  // canGoForward: boolean -> currentStepIndex < steps.length - 1
  // canGoBack: boolean -> currentStepIndex > 0
}
```

### Pattern 3: Keyboard Navigation Hook
**What:** A custom React hook that attaches keydown listeners to `window` and dispatches navigation actions.
**When to use:** In the Player route component, active whenever the Player is mounted.
**Confidence:** HIGH -- standard DOM event listener pattern in React.

```typescript
// Source: Standard React pattern + Electron renderer keyboard handling docs
function useKeyboardNavigation(): void {
  const { nextStep, prevStep, goToFirst, goToLast } = useNavigationStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't capture when focus is in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowRight':
        case ' ':  // spacebar
          e.preventDefault()  // prevent page scroll on spacebar
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

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextStep, prevStep, goToFirst, goToLast])
}
```

**Important:** Use DOM `window.addEventListener('keydown', ...)` in the renderer process, NOT Electron's `globalShortcut` (which is main-process and works even when the app is unfocused -- wrong behavior for presentation controls). The Electron docs explicitly recommend DOM event listeners for in-window keyboard shortcuts.

### Pattern 4: Collapsed Content with Line-Clamp
**What:** Both user messages and assistant responses start collapsed, showing a preview via CSS `line-clamp`. Clicking expands to full content.
**When to use:** Default state for assistant responses; also for long user messages.
**Confidence:** HIGH -- CSS line-clamp is well-supported and Tailwind v4 has built-in `line-clamp-*` utility classes.

```typescript
// CollapsibleContent component pattern
interface CollapsibleContentProps {
  children: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  previewLines?: number  // default 3-4 lines
}

// CSS approach using Tailwind's built-in line-clamp:
// Collapsed: line-clamp-3 (or line-clamp-4)
// Expanded: line-clamp-none
// Toggle: click handler on the container or a "Show more" button
```

**Collapsed preview recommendation:** For the collapsed state, show 3-4 lines of the content via CSS `line-clamp-3` or `line-clamp-4`. This provides enough context for the presenter to know what the response contains without overwhelming the audience. The first few lines of Claude's response typically contain the summary/introduction. For user messages, 2-3 lines is sufficient since they tend to be shorter.

### Pattern 5: Fade Transition Between Steps
**What:** A subtle opacity crossfade when navigating between steps.
**When to use:** On every step change (forward, backward, jump).
**Confidence:** HIGH -- pure CSS transitions, no library needed.

```css
/* Fade transition for step changes */
.step-container {
  transition: opacity 150ms ease-in-out;
}

.step-enter {
  opacity: 0;
}

.step-visible {
  opacity: 1;
}
```

**Implementation approach:** Use a brief (150ms) opacity fade. This is fast enough to feel responsive but smooth enough to signal a change. Longer animations (300ms+) would make repeated spacebar presses feel sluggish. The presenter will often tap forward quickly through steps.

**Alternative considered:** CSS `translateX` slide animations. These feel more "directional" (forward vs backward) but add complexity and can feel disorienting for rapid navigation. A fade is more neutral and PowerPoint-like.

### Anti-Patterns to Avoid
- **Anti-pattern: Re-rendering the entire message list on each step.** The Player should render only the current step's messages, not maintain a hidden list of all messages. This is a slideshow, not a chat log.
- **Anti-pattern: Using Electron globalShortcut for navigation keys.** Arrow keys should only navigate when the Player window is focused. globalShortcut would intercept arrows system-wide.
- **Anti-pattern: Storing expand/collapse state in component state.** This state must survive step navigation (requirement: "expand a response, step away, come back, it stays expanded"). Use the Zustand store, not component `useState`.
- **Anti-pattern: Deriving steps on every render.** The `buildNavigationSteps` function should run once when messages are loaded (in `initializeSteps`), not on every render. The step array is immutable once built.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line-clamped text preview | Custom JS truncation with character counting | CSS `line-clamp` via Tailwind `line-clamp-3` | CSS is faster, handles font rendering correctly, avoids orphaned words |
| Keyboard event handling | Manual `document.onkeydown` assignment | `window.addEventListener` in `useEffect` with cleanup | Proper React lifecycle management, supports multiple listeners |
| Icon rendering | Custom SVG components | `lucide-react` (already installed) | Consistent iconography, tree-shakeable |
| State management | React Context + useReducer | Zustand (already installed) | Consistent with existing stores, simpler API, works outside React components |

**Key insight:** This phase is primarily a "wiring" phase -- connecting existing rendering components to new navigation state. The rendering is already built (Phase 3). The data pipeline is already built (Phase 2). Phase 4 adds the Controller layer on top.

## Common Pitfalls

### Pitfall 1: Stale Closures in Keyboard Event Handler
**What goes wrong:** The keydown handler captures the initial `currentStepIndex` value in a closure and never updates.
**Why it happens:** `useEffect` with an empty dependency array creates the handler once; it closes over the initial state values.
**How to avoid:** Read state from the Zustand store inside the handler using `useNavigationStore.getState()`, OR include the navigation actions (which are stable references in Zustand) in the dependency array. The recommended approach: depend on the Zustand action functions (they are stable -- Zustand creates them once), not on the state values.
**Warning signs:** Navigation works once then stops, or always jumps to step 1.

### Pitfall 2: Spacebar Scrolls the Page
**What goes wrong:** Pressing spacebar to advance the step also scrolls the page down (browser default).
**Why it happens:** The spacebar's default behavior in browsers is "scroll down."
**How to avoid:** Call `e.preventDefault()` in the keydown handler for spacebar. This is critical since the app is in a scrollable container.
**Warning signs:** Page jumps on spacebar press; content shifts unexpectedly.

### Pitfall 3: Message Pairing Edge Cases
**What goes wrong:** Steps are incorrectly paired when filtering removes messages mid-conversation.
**Why it happens:** After `filterVisibleMessages` removes plumbing messages, the remaining messages may have consecutive user messages or consecutive assistant messages that don't form clean pairs.
**How to avoid:** The pairing algorithm must handle: (a) consecutive user messages (each becomes its own step), (b) assistant messages with no preceding user message (becomes a solo step), (c) the last user message with no response yet.
**Warning signs:** Missing messages, doubled messages, or empty steps.

### Pitfall 4: Expand/Collapse State Lost on Navigation
**What goes wrong:** User expands a response, navigates away, comes back -- the response is collapsed again.
**Why it happens:** Expand/collapse stored in component `useState` is destroyed when the component unmounts (which happens when navigating to a different step in slideshow mode since only one step is rendered at a time).
**How to avoid:** Store expand/collapse state in the Zustand store, keyed by step index. The store persists across step changes.
**Warning signs:** User complains that expanded content keeps collapsing.

### Pitfall 5: Click-to-Advance Conflicts with Expand/Collapse
**What goes wrong:** Clicking to expand a collapsed response also advances to the next step.
**Why it happens:** Both click handlers fire on the same element or overlapping elements.
**How to avoid:** Use separate click targets. The expand/collapse toggle should be a specific button or clickable region within the message content area. Click-to-advance should be on a different target (e.g., the background/margins, a dedicated forward zone, or only the on-screen button). Use `e.stopPropagation()` on the expand/collapse toggle.
**Warning signs:** Clicking on content always advances; impossible to expand without navigating.

### Pitfall 6: CSS line-clamp Not Working on Markdown-Rendered Content
**What goes wrong:** The line-clamp shows nothing, or clamps incorrectly because the inner elements have their own display/overflow properties.
**Why it happens:** CSS line-clamp requires `display: -webkit-box` and `overflow: hidden` on the container, but markdown-rendered HTML inside it (headings, paragraphs, lists) can override these with block-level display.
**How to avoid:** Apply the line-clamp to a wrapper `div` that contains the rendered content. The inner content's block elements will be clipped by the outer container's overflow:hidden. Test with real markdown content (headings, code blocks, lists) not just plain text.
**Warning signs:** Collapsed preview shows full content or shows nothing at all.

## Code Examples

### Navigation Store (Complete Pattern)

```typescript
// Source: Application architecture + Zustand v5 patterns from existing stores
import { create } from 'zustand'
import type { ParsedMessage } from '../types/pipeline'

export interface NavigationStep {
  index: number
  userMessage: ParsedMessage
  assistantMessage: ParsedMessage | null
}

interface ExpandState {
  user: boolean
  assistant: boolean
}

interface NavigationState {
  steps: NavigationStep[]
  currentStepIndex: number
  expandedSteps: Record<number, ExpandState>

  initializeSteps: (messages: ParsedMessage[]) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  goToFirst: () => void
  goToLast: () => void
  toggleExpand: (stepIndex: number, role: 'user' | 'assistant') => void
  reset: () => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  steps: [],
  currentStepIndex: 0,
  expandedSteps: {},

  initializeSteps: (messages: ParsedMessage[]): void => {
    const steps = buildNavigationSteps(
      filterVisibleMessages(messages, false)
    )
    set({ steps, currentStepIndex: 0, expandedSteps: {} })
  },

  nextStep: (): void => {
    const { currentStepIndex, steps } = get()
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 })
    }
  },

  prevStep: (): void => {
    const { currentStepIndex } = get()
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 })
    }
  },

  goToStep: (index: number): void => {
    const { steps } = get()
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index })
    }
  },

  goToFirst: (): void => set({ currentStepIndex: 0 }),

  goToLast: (): void => {
    const { steps } = get()
    if (steps.length > 0) {
      set({ currentStepIndex: steps.length - 1 })
    }
  },

  toggleExpand: (stepIndex: number, role: 'user' | 'assistant'): void => {
    const { expandedSteps } = get()
    const current = expandedSteps[stepIndex] ?? { user: false, assistant: false }
    set({
      expandedSteps: {
        ...expandedSteps,
        [stepIndex]: {
          ...current,
          [role]: !current[role]
        }
      }
    })
  },

  reset: (): void => set({ steps: [], currentStepIndex: 0, expandedSteps: {} })
}))
```

### Keyboard Navigation Hook

```typescript
// Source: Standard React pattern + Electron renderer keyboard docs
import { useEffect } from 'react'
import { useNavigationStore } from '../stores/navigationStore'

export function useKeyboardNavigation(): void {
  const nextStep = useNavigationStore((s) => s.nextStep)
  const prevStep = useNavigationStore((s) => s.prevStep)
  const goToFirst = useNavigationStore((s) => s.goToFirst)
  const goToLast = useNavigationStore((s) => s.goToLast)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't intercept when user is typing in an input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

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

    window.addEventListener('keydown', handleKeyDown)
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [nextStep, prevStep, goToFirst, goToLast])
}
```

### Progress Indicator (Minimal Counter)

```typescript
// Source: Application design (Claude's discretion: counter style, bottom-right position)
import { useNavigationStore } from '../../stores/navigationStore'

export function ProgressIndicator(): React.JSX.Element {
  const currentStepIndex = useNavigationStore((s) => s.currentStepIndex)
  const totalSteps = useNavigationStore((s) => s.steps.length)

  return (
    <div style={{
      position: 'fixed',
      bottom: 'var(--space-4)',
      right: 'var(--space-6)',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-text-muted)',
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      userSelect: 'none'
    }}>
      {currentStepIndex + 1} / {totalSteps}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `event.keyCode` for key detection | `event.key` string comparison | ES2015+ (long established) | Use `'ArrowRight'`, `' '`, `'Home'` etc. |
| `@tailwindcss/line-clamp` plugin | Built-in `line-clamp-*` utilities | Tailwind v3.3+ (2023), native in v4 | No plugin needed, just use `line-clamp-3` class |
| react-transition-group for fades | CSS `transition: opacity` | Always available, but React 19 also adds ViewTransition | For simple fades, CSS transitions are preferred over libraries |
| Redux for navigation state | Zustand | Project decision (Phase 1) | Consistent with existing stores |

**Deprecated/outdated:**
- `event.keyCode`: Deprecated. Use `event.key` string values.
- `@tailwindcss/line-clamp` plugin: Unnecessary since Tailwind v3.3+; built into core.

## Discretion Recommendations

Based on the research and the "PowerPoint/Keynote mental model" guidance, here are recommendations for the areas left to Claude's discretion:

### Collapsed Preview Content
**Recommendation:** Show 3-4 lines via CSS `line-clamp-3` for assistant responses, `line-clamp-2` for user messages. The first few lines of Claude's response typically contain a summary. Add a subtle "Click to expand" affordance (small chevron or ellipsis indicator).

### Transition Animation
**Recommendation:** 150ms opacity crossfade. Fast enough for rapid clicking, smooth enough to signal a change. No directional slide -- it would add complexity without proportional benefit, and rapid forward/backward presses would look chaotic with sliding.

### Overflow Handling (Expanded Content)
**Recommendation:** Scroll within the step container. When a user expands a long response, the step container becomes scrollable. The page itself does not grow (the progress indicator and navigation buttons stay pinned). This matches the PowerPoint mental model -- you don't scroll the whole slide deck, you scroll within a slide.

### Progress Indicator
**Recommendation:** A minimal counter in the bottom-right corner showing "Step N / M" in a monospace font. Fixed position, semi-transparent, does not interfere with content. NOT clickable (clicking specific steps is a Phase 8 / multi-session concern). A thin progress bar along the bottom edge of the viewport provides at-a-glance progress without text.

### On-Screen Button Placement
**Recommendation:** Semi-transparent arrow buttons on the left and right edges of the viewport, vertically centered. They appear on hover (opacity 0 -> 0.6 on hover) and fade when not hovered. This matches the PowerPoint presentation overlay pattern. Buttons should have enough padding to be easy click targets but not obscure content.

### Click-to-Advance Target
**Recommendation:** Do NOT make the entire slide area clickable-to-advance. This conflicts too heavily with text selection, link clicking, and expand/collapse. Instead, rely on keyboard (right arrow, spacebar) as the primary advance mechanism, with the on-screen arrow buttons as the mouse alternative. This cleanly separates "navigate" (arrows/spacebar/nav buttons) from "interact" (click to expand/collapse, text selection, links).

## Open Questions

1. **How should the Player receive its session data?**
   - What we know: Currently, the Builder parses sessions and stores them in `sessionStore.activeSession`. The Player route is a separate page (`/player`).
   - What's unclear: Should the Player reuse `sessionStore.activeSession`, receive a session ID via URL param and re-parse, or get data passed through route state?
   - Recommendation: For Phase 4, reuse `sessionStore.activeSession` directly. The Player is navigated to from the Builder after a session is parsed. In Phase 8, when `.promptplay` files are loaded, a different data source will be used. Keep it simple now.

2. **Should filterVisibleMessages be extracted from MessageList?**
   - What we know: `filterVisibleMessages` is currently defined inside `MessageList.tsx`. Phase 4 needs it in the navigation store's `initializeSteps`.
   - What's unclear: Should it be moved to a shared utility, or should the navigation store import from the component?
   - Recommendation: Extract `filterVisibleMessages` (and `isEmptyAfterCleaning`) into a shared utility file (e.g., `src/renderer/src/utils/messageFiltering.ts`). Both `MessageList` and `navigationStore` import from there. This is a clean separation -- the function is pure logic, not a rendering concern.

3. **Edge case: Sessions with only assistant messages (no user prompts)**
   - What we know: Some JSONL sessions might start with assistant messages if the conversation started mid-thread.
   - What's unclear: Should a solo assistant message become its own step?
   - Recommendation: Yes. A solo assistant message (no preceding user message) becomes a step with only the assistant content shown. The user message area is simply omitted. This is the simplest handling and preserves all content.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `sessionStore.ts`, `MessageList.tsx`, `pipeline/types.ts`, `pipeline/classifier.ts` -- direct code inspection
- Electron docs: [Keyboard Shortcuts](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts) -- confirmed DOM event listener approach for renderer-process
- Tailwind CSS docs: [line-clamp](https://tailwindcss.com/docs/line-clamp) -- built-in v4 utility, no plugin needed
- Zustand: [GitHub](https://github.com/pmndrs/zustand) -- store patterns consistent with existing codebase

### Secondary (MEDIUM confidence)
- MDN: [CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transitions/Using) -- opacity transition pattern verified
- React docs: [useEffect cleanup](https://react.dev/reference/react/useEffect) -- event listener cleanup pattern
- Multiple sources: Keyboard event handling pattern with `event.key` strings -- consistent across all references

### Tertiary (LOW confidence)
- None -- all patterns verified through official documentation or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns verified in existing codebase
- Architecture: HIGH -- follows ARCHITECTURE.md Navigation Controller design, data types verified in code
- Pitfalls: HIGH -- based on direct code analysis (stale closures, spacebar scroll, expand/collapse conflicts are well-documented React patterns)
- Discretion recommendations: MEDIUM -- subjective design choices informed by PowerPoint/Keynote mental model and common slideshow patterns

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (30 days -- stable domain, no fast-moving dependencies)
