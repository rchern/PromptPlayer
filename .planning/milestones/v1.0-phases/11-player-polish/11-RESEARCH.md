# Phase 11: Player Polish - Research

**Researched:** 2026-03-03
**Domain:** Elapsed-time markers + Theme application in Electron/React Player
**Confidence:** HIGH

## Summary

Phase 11 adds two features to the Player: elapsed-time markers between navigation steps (plus duration stats on separator cards), and theme application from the .promptplay file's settings with an ephemeral runtime toggle. Both features build on well-established infrastructure already in the codebase.

The elapsed-time feature requires a pure formatting utility, a small presentational component (the timeline marker pill), and injecting duration data into the existing `SeparatorCard` and `buildPlaybackSteps` pipeline. The theme feature requires modifying the existing `useTheme` hook to accept an override from presentation config, adding a toggle button to `SegmentedProgress`, and managing ephemeral state in the playback store.

**Primary recommendation:** This is a UI polish phase with no new libraries needed. Use the existing CSS custom property system, lucide-react icons (Sun/Moon), and Zustand store patterns. The only non-trivial logic is the elapsed-time formatting utility, which should be a pure function with exhaustive edge-case handling.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Show **elapsed time only** between navigation steps (not wall-clock time)
- Elapsed-time markers appear **between steps** as a centered pill on a thin horizontal rule (timeline marker style)
- Session separator cards show **session duration** as additional metadata alongside existing step/message counts
- Section separator cards show **section duration** alongside existing stats
- Inter-session gaps (breaks, overnights) get **no display**
- Elapsed time is calculated from the previous navigation step's timestamp to the current step's timestamp
- **Smart relative format**: <1s, 12s, 2m 30s, 1h 5m (drop smaller unit when larger is big enough)
- Same format for elapsed markers and session/section duration on separator cards
- **Missing timestamps**: hide the elapsed marker entirely (no placeholder, no error)
- **First step**: no marker (no previous step to measure from)
- Markers only appear when both previous and current step have valid timestamps
- Player **respects the .promptplay file's theme setting** as the default (light/dark/system)
- Player adds a **small sun/moon toggle** in the progress bar area for runtime override
- Toggle is ephemeral -- resets to file's default on next open
- `system` option stays in Builder (light/dark/system) -- means "follow OS preference unless toggled"
- When `system` is configured, Player resolves to OS preference at load time, then toggle overrides

### Claude's Discretion
- Exact pill/badge styling for the elapsed-time divider (colors, font size, padding)
- Toggle icon design and hover behavior in the progress bar
- How to resolve `system` theme on load (nativeTheme.shouldUseDarkColors or equivalent)
- Transition animation when toggling themes (instant vs smooth fade)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAY-13 | Timestamps display between steps when enabled (showing original time and/or elapsed time) | Elapsed-time marker component + formatElapsed utility + buildPlaybackSteps enrichment with timestamps + showTimestamps gating |
| PLAY-14 | Light and dark theme applied based on presentation config | useTheme hook modification to accept presentation override + Sun/Moon toggle in SegmentedProgress + ephemeral themeOverride in playbackStore |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.0.0 | UI rendering | Already the app framework |
| Zustand | ^5.0.11 | State management (playbackStore) | Already manages all playback state |
| lucide-react | ^0.575.0 | Sun/Moon icons for theme toggle | Already used across 23+ components |
| CSS Custom Properties | N/A | Theme switching via `[data-theme]` | Already the established theming pattern |
| Electron nativeTheme | N/A | OS dark mode detection | Already wired via `theme:get` IPC |

### Supporting
No additional libraries needed. All features are achievable with existing dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure CSS transitions for theme | React Spring / Framer Motion | Overkill for a single attribute change; CSS `transition` on custom properties is sufficient |
| Custom elapsed formatter | date-fns / dayjs | These are calendar-oriented; our format (<1s, 12s, 2m 30s) is simpler than any library provides |
| Zustand for theme override | React context | Zustand is already the state management pattern; adding a React context would break consistency |

**Installation:** None needed. All dependencies are already present.

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/
  components/player/
    PlaybackPlayer.tsx      # MODIFY: inject ElapsedTimeMarker between steps
    SeparatorCard.tsx        # MODIFY: add duration stat to cards
    SegmentedProgress.tsx    # MODIFY: add theme toggle button
    ElapsedTimeMarker.tsx    # NEW: pill-on-rule component
  hooks/
    useTheme.ts             # MODIFY: accept presentation theme override
    usePlayerTheme.ts       # NEW: Player-specific theme hook wrapping useTheme with override
  stores/
    playbackStore.ts        # MODIFY: add themeOverride state + enriched step data
  utils/
    formatElapsed.ts        # NEW: pure function for elapsed time formatting
  types/
    playback.ts             # MODIFY: add timestamp fields to step types
```

### Pattern 1: Pure Elapsed-Time Formatter
**What:** A pure function `formatElapsed(ms: number): string` that converts milliseconds to the smart relative format.
**When to use:** Every elapsed-time display (between steps, on separator cards).
**Why pure:** Easily testable, no React dependency, reusable across components.
**Example:**
```typescript
// src/renderer/src/utils/formatElapsed.ts
export function formatElapsed(ms: number): string {
  if (ms < 1000) return '<1s'
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`
  if (ms < 3_600_000) {
    const mins = Math.floor(ms / 60_000)
    const secs = Math.floor((ms % 60_000) / 1000)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  const hours = Math.floor(ms / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}
```

### Pattern 2: Timestamp Enrichment at Step-Build Time
**What:** Compute elapsed times during `buildPlaybackSteps()` and store them on the step objects, not during render.
**When to use:** Whenever derived data can be precomputed from immutable source data.
**Why:** Avoids recalculation on every render. The step array is built once when a presentation loads and never mutates.
**Example:**
```typescript
// In buildPlaybackSteps, after creating each navigation step:
// Look at the NavigationStep's userMessage?.timestamp or assistantMessage?.timestamp
// to determine the "step timestamp" (earliest non-null timestamp in the step).
// Then compute elapsed = current step timestamp - previous step timestamp.
```

### Pattern 3: Theme Override via Playback Store
**What:** Add `themeOverride: 'light' | 'dark' | null` to playbackStore. `null` means "use file default."
**When to use:** The Player theme toggle sets this; it resets on `loadPresentation` and `reset`.
**Why Zustand:** Consistent with existing state management. The toggle is ephemeral (reset on next load), which maps naturally to store state that reinitializes in `loadPresentation`.
**Example:**
```typescript
// In playbackStore:
interface PlaybackState {
  // ... existing fields
  themeOverride: 'light' | 'dark' | null
  toggleTheme: () => void
}

// toggleTheme flips between light/dark based on current resolved theme
```

### Pattern 4: Module-Level Style Constants
**What:** Extract static CSS-in-JS objects to module-level `const` declarations outside components.
**When to use:** Always, per established project convention (see 04-01, 09-01, 09-02 decisions in STATE.md).
**Why:** Prevents object re-creation on every render. Established pattern across all Player components.

### Anti-Patterns to Avoid
- **Computing elapsed time in render:** Pre-compute in `buildPlaybackSteps` instead of calling `formatElapsed` on raw timestamps during every render cycle.
- **Storing resolved theme in appStore:** The appStore's `isDarkMode` tracks system preference for Builder. The Player's theme override is ephemeral and belongs in playbackStore.
- **Using `document.documentElement.setAttribute` from components directly:** Route through the theme hook. Direct DOM manipulation from multiple places causes race conditions.
- **Putting the theme toggle on the Titlebar:** The toggle belongs in the progress bar area (SegmentedProgress) per the user's decision. Keep the Titlebar unchanged.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode detection | Custom media query listener | `window.electronAPI.getTheme()` + `onThemeChange()` | Already wired via Electron nativeTheme IPC; reliable cross-platform |
| Icon components | Custom SVG icons | `lucide-react` Sun/Moon | Already a dependency with consistent sizing/styling |
| State management for toggle | React useState + prop drilling | Zustand `playbackStore.themeOverride` | Consistent with all other playback state; no prop drilling needed |
| CSS theme switching | JavaScript style manipulation | `document.documentElement.setAttribute('data-theme', ...)` | Already the established pattern; all CSS custom properties respond to this attribute |

**Key insight:** This phase adds zero new dependencies. Every building block exists. The work is wiring existing infrastructure together with a small pure utility and two small presentational components.

## Common Pitfalls

### Pitfall 1: Theme Flicker on Load
**What goes wrong:** When a .promptplay file specifies `theme: 'dark'` but the system is light, there's a visible flash of light theme before dark applies.
**Why it happens:** `useTheme` runs after first paint. If the presentation theme isn't applied synchronously during `loadPresentation`, the first frame renders with the wrong theme.
**How to avoid:** Apply the presentation's theme in the same synchronous flow as `loadPresentation`. When `loadPresentation` is called (in Player.tsx `useEffect` or `onOpenFile`), resolve the effective theme immediately and set `data-theme` before the next paint.
**Warning signs:** Brief white flash when opening a dark-themed presentation from a light-themed system.

### Pitfall 2: Elapsed Time Across Session Boundaries
**What goes wrong:** Computing elapsed time between the last step of session A and the first step of session B produces absurd durations (hours, days).
**Why it happens:** Sessions may be recorded days apart. The user explicitly decided "inter-session gaps get no display."
**How to avoid:** Reset the elapsed calculation at session boundaries. When the previous step belongs to a different session (different `sessionId`), produce no elapsed marker for the first step of the new session. Separator cards (section-separator, session-separator) naturally break the chain.
**Warning signs:** "3d 14h" markers appearing between sessions.

### Pitfall 3: Theme Toggle Conflicting with useTheme Hook
**What goes wrong:** The Player's theme toggle sets `data-theme="dark"` but then the system useTheme hook fires `onThemeChange` and resets it to the system preference.
**Why it happens:** `useTheme` in `App.tsx` listens to `nativeTheme.on('updated')` and unconditionally sets `data-theme`.
**How to avoid:** When the Player is active with a presentation loaded, `useTheme` must defer to the presentation's resolved theme. The cleanest approach: modify `useTheme` to check if a presentation override is active (via playbackStore) before applying system theme changes. Alternatively, create a separate `usePlayerTheme` hook that overrides the base behavior.
**Warning signs:** Toggling the OS dark mode while the Player is open resets the Player's theme override.

### Pitfall 4: Elapsed Marker Appearing Before First Step
**What goes wrong:** An elapsed marker appears above the very first navigation step in a session.
**Why it happens:** The first navigation step has a timestamp but there's no "previous step" to compute elapsed from.
**How to avoid:** Only show elapsed markers when there IS a previous navigation step in the SAME session with a valid timestamp. The first navigation step after any separator card should have no marker.
**Warning signs:** Elapsed marker showing "<1s" or some duration above the first step.

### Pitfall 5: Null Timestamp Handling
**What goes wrong:** `new Date(null).getTime()` returns 0 (epoch), producing giant elapsed times.
**Why it happens:** `ParsedMessage.timestamp` is typed as `string` but could theoretically be empty or malformed.
**How to avoid:** The user decided: "markers only appear when both previous and current step have valid timestamps." Guard with explicit null/empty/NaN checks before computing elapsed. If either timestamp is missing, omit the marker entirely.
**Warning signs:** Extremely large elapsed values, or `NaN` in the UI.

### Pitfall 6: SegmentedProgress pointerEvents
**What goes wrong:** The theme toggle button in `SegmentedProgress` doesn't respond to clicks.
**Why it happens:** The container has `pointerEvents: 'none'` (line 13 of SegmentedProgress.tsx) to prevent the progress bar overlay from blocking interaction with the content area.
**How to avoid:** Set `pointerEvents: 'auto'` specifically on the theme toggle button, or on a wrapper around clickable elements within the progress bar.
**Warning signs:** Toggle button visible but unclickable.

### Pitfall 7: showTimestamps Setting Not Gated
**What goes wrong:** Elapsed markers appear even when the presentation has `showTimestamps: false`.
**Why it happens:** Forgetting to check `presentation.settings.showTimestamps` before rendering elapsed markers.
**How to avoid:** Gate ALL timestamp display (elapsed markers between steps AND duration on separator cards) on `presentation.settings.showTimestamps === true`. Check this at the component level, not deep in the formatting utility.
**Warning signs:** Timestamps appearing in a presentation where the Builder had "Show timestamps" unchecked.

## Code Examples

### Elapsed Time Formatter (Pure Function)
```typescript
// src/renderer/src/utils/formatElapsed.ts

/**
 * Format a duration in milliseconds to a smart relative string.
 * Adapts to magnitude: <1s, 12s, 2m 30s, 1h 5m.
 * Drops smaller unit when larger is big enough (no "1h 0m 12s").
 */
export function formatElapsed(ms: number): string {
  if (ms < 0) return '<1s' // Guard: negative durations treated as <1s
  if (ms < 1000) return '<1s'
  if (ms < 60_000) {
    return `${Math.floor(ms / 1000)}s`
  }
  if (ms < 3_600_000) {
    const mins = Math.floor(ms / 60_000)
    const secs = Math.floor((ms % 60_000) / 1000)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  const hours = Math.floor(ms / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Compute elapsed milliseconds between two ISO timestamp strings.
 * Returns null if either timestamp is missing, empty, or unparseable.
 */
export function computeElapsedMs(
  prevTimestamp: string | null | undefined,
  currTimestamp: string | null | undefined
): number | null {
  if (!prevTimestamp || !currTimestamp) return null
  const prev = new Date(prevTimestamp).getTime()
  const curr = new Date(currTimestamp).getTime()
  if (Number.isNaN(prev) || Number.isNaN(curr)) return null
  return curr - prev
}
```

### ElapsedTimeMarker Component
```typescript
// src/renderer/src/components/player/ElapsedTimeMarker.tsx
import React from 'react'
import { formatElapsed } from '../../utils/formatElapsed'

// Module-level style constants (per project convention)
const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: '0 var(--space-6)'
}

const lineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: 'var(--color-border)'
}

const pillStyle: React.CSSProperties = {
  padding: '2px var(--space-3)',
  fontSize: 'var(--text-xs)',
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--color-text-muted)',
  background: 'var(--color-bg-tertiary)',
  borderRadius: 999, // Full pill shape
  whiteSpace: 'nowrap'
}

interface ElapsedTimeMarkerProps {
  elapsedMs: number
}

export function ElapsedTimeMarker({ elapsedMs }: ElapsedTimeMarkerProps): React.JSX.Element {
  return (
    <div style={containerStyle}>
      <div style={lineStyle} />
      <span style={pillStyle}>{formatElapsed(elapsedMs)}</span>
      <div style={lineStyle} />
    </div>
  )
}
```

### Theme Toggle in SegmentedProgress
```typescript
// Addition to SegmentedProgress.tsx
import { Sun, Moon } from 'lucide-react'

// Module-level style for the toggle button
const themeToggleStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted)',
  opacity: 0.6,
  transition: 'opacity 150ms ease',
  pointerEvents: 'auto' // Override container's pointerEvents: none
}

// Inside SegmentedProgress, add to the text row:
// <button style={themeToggleStyle} onClick={toggleTheme}>
//   {isDark ? <Sun size={14} /> : <Moon size={14} />}
// </button>
```

### Theme Resolution Logic
```typescript
// Resolve the effective theme from presentation settings + system preference
function resolveTheme(
  settingsTheme: 'light' | 'dark' | 'system',
  systemIsDark: boolean
): 'light' | 'dark' {
  if (settingsTheme === 'system') {
    return systemIsDark ? 'dark' : 'light'
  }
  return settingsTheme
}
```

### Extracting Step Timestamp
```typescript
// Get the representative timestamp for a NavigationStep.
// Prefer userMessage timestamp; fall back to assistantMessage timestamp.
function getStepTimestamp(step: NavigationStep): string | null {
  return step.userMessage?.timestamp ?? step.assistantMessage?.timestamp ?? null
}
```

### Enriching PlaybackStep with Elapsed Data
```typescript
// In buildPlaybackSteps, add elapsedMs to NavigationPlaybackStep:
interface NavigationPlaybackStep {
  type: 'navigation'
  step: NavigationStep
  sessionId: string
  sectionId: string
  elapsedMs: number | null  // NEW: null = don't show marker
}

// During step building, track previous nav step per session:
let prevNavTimestamp: string | null = null
let prevNavSessionId: string | null = null

for (const navStep of navSteps) {
  const currTimestamp = getStepTimestamp(navStep)
  let elapsedMs: number | null = null

  // Only compute if same session and both timestamps valid
  if (prevNavSessionId === ref.sessionId && prevNavTimestamp && currTimestamp) {
    elapsedMs = computeElapsedMs(prevNavTimestamp, currTimestamp)
  }

  steps.push({
    type: 'navigation',
    step: navStep,
    sessionId: ref.sessionId,
    sectionId: section.id,
    elapsedMs
  })

  prevNavTimestamp = currTimestamp
  prevNavSessionId = ref.sessionId
}
```

### Session/Section Duration Computation
```typescript
// For session duration: compute from first nav step timestamp to last nav step timestamp
// within that session's navigation steps (NOT from SessionMetadata, which counts all messages).
// For section duration: sum all session durations in the section.
// Add these as fields to SectionSeparatorStep and SessionSeparatorStep.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useTheme` follows system unconditionally | Theme hook supports presentation override | This phase | Player respects .promptplay theme setting |
| No elapsed time display | Elapsed markers between steps | This phase | Viewers see pacing information |
| `formatSessionDuration` in pipeline types | New `formatElapsed` with different format spec | This phase | Different format: `<1s, 12s, 2m 30s` vs `<1 min, 5 min, 1h 5m` |

**Note:** The existing `formatSessionDuration` in `pipeline.ts` uses a different format (`<1 min`, `5 min`, `1h 5m`). The new `formatElapsed` uses the user's specified format (`<1s`, `12s`, `2m 30s`, `1h 5m`). These are intentionally different -- `formatSessionDuration` is used in Builder session cards and can remain as-is.

## Open Questions

1. **Step timestamp selection: userMessage vs assistantMessage**
   - What we know: NavigationStep has both `userMessage?.timestamp` and `assistantMessage?.timestamp`. The user sends a message, then Claude responds some time later.
   - What's unclear: Should elapsed time measure "time since previous user prompt" (user-to-user) or "time since previous assistant response" (response-to-prompt)?
   - Recommendation: Use the earliest timestamp in each step (userMessage preferred, assistantMessage as fallback). This measures the time the presenter waited between actions, which is the most natural "elapsed" interpretation for a presentation context.

2. **Duration computation for separator cards**
   - What we know: Session separator cards need "session duration." Section separator cards need "section duration."
   - What's unclear: Should duration come from SessionMetadata (firstTimestamp to lastTimestamp of ALL messages) or from only the filtered navigation steps?
   - Recommendation: Use the navigation steps' timestamp range (first nav step to last nav step). This is consistent with the elapsed markers and excludes plumbing messages that were filtered out. However, falling back to SessionMetadata.firstTimestamp/lastTimestamp is simpler and equally valid since the timestamps span the same conversation.

## Sources

### Primary (HIGH confidence)
- **Existing codebase analysis** -- All source files read directly:
  - `src/renderer/src/components/player/PlaybackPlayer.tsx` -- main playback renderer
  - `src/renderer/src/components/player/SeparatorCard.tsx` -- separator card component
  - `src/renderer/src/components/player/StepView.tsx` -- step rendering
  - `src/renderer/src/components/player/SegmentedProgress.tsx` -- progress bar (theme toggle target)
  - `src/renderer/src/hooks/useTheme.ts` -- current theme hook
  - `src/renderer/src/stores/playbackStore.ts` -- playback state management
  - `src/renderer/src/stores/appStore.ts` -- app-level state (isDarkMode)
  - `src/renderer/src/styles/theme.css` -- CSS custom property system
  - `src/renderer/src/types/playback.ts` -- PlaybackStep types
  - `src/renderer/src/types/presentation.ts` -- PresentationSettings type
  - `src/renderer/src/types/pipeline.ts` -- NavigationStep, ParsedMessage types
  - `src/renderer/src/types/electron.d.ts` -- ElectronAPI interface
  - `src/preload/index.ts` -- IPC bridge
  - `src/main/index.ts` -- nativeTheme IPC handlers
- **Project decisions** -- `.planning/STATE.md` accumulated decisions section

### Secondary (MEDIUM confidence)
- **Electron nativeTheme API** -- `nativeTheme.shouldUseDarkColors` is the standard API for OS dark mode detection in Electron (verified in main/index.ts line 171)
- **lucide-react Sun/Moon icons** -- lucide-react ^0.575.0 includes Sun and Moon icons (verified by checking existing lucide imports across 23+ project files)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies; everything exists in the codebase
- Architecture: HIGH - Patterns directly follow established project conventions (module-level styles, Zustand store, CSS custom properties)
- Pitfalls: HIGH - Derived from deep analysis of existing code (pointerEvents issue, useTheme conflict, session boundary gaps)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable -- no external dependencies to shift)
