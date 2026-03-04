# Debug Session: Live Preview Reactivity

**Bug:** Live preview does not update when settings (theme, timestamps, tool visibility) are changed
**Test:** UAT Test 3
**Reporter:** User observed "changed timestamps to on and theme to light, but preview is still dark with no timestamps"

---

## Root Cause

**Two distinct root causes found, both structural (not reactivity):**

### Root Cause 1: Theme scoping has no CSS rule for `[data-theme="light"]`

The Builder's live preview uses a scoped `data-theme` attribute on an inner `<div>` to override the global app theme (Builder.tsx line 535-541):

```tsx
<div data-theme={resolvedTheme} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
  <MessageList messages={filteredMessages} />
</div>
```

The CSS in `theme.css` defines light colors as `:root` defaults (lines 5-64) and dark colors as `[data-theme="dark"]` overrides (lines 67-94). There is **no `[data-theme="light"]` CSS rule** anywhere in the codebase.

**Effect:** When the app is in dark mode globally (system dark theme), setting `data-theme="light"` on the preview div does nothing -- the dark CSS variables inherited from `:root[data-theme="dark"]` cascade down unchanged because no CSS rule for `[data-theme="light"]` exists to override them. The scoped theme approach is structurally incomplete.

**Evidence:**
- `theme.css` only has `:root { ... }` (light defaults) and `[data-theme="dark"] { ... }` (dark overrides)
- Grep for `data-theme.*light` across all CSS files returns zero matches
- The light theme values are only reachable when `[data-theme="dark"]` is NOT on any ancestor -- but in dark mode, the root element always has it

### Root Cause 2: `MessageList` component does not support timestamps

The Builder's live preview renders messages via `<MessageList>` (Builder.tsx line 540). The `MessageList` component interface only accepts:

```ts
interface MessageListProps {
  messages: ParsedMessage[]
  showPlumbing?: boolean
}
```

It has **no `showTimestamps` prop** and no timestamp rendering logic. Timestamps are exclusively a Player feature, implemented in `PlaybackPlayer.tsx`, `StepView.tsx`, `SeparatorCard.tsx`, and `ElapsedTimeMarker.tsx`. The Builder's live preview was never wired to show timestamps.

**Effect:** Toggling "Show timestamps" in settings correctly persists to the store, but the live preview has no code path to render timestamps regardless of the setting value.

---

## Reactivity Chain Analysis

The Zustand reactivity chain itself is **correct** -- it was not the problem:

1. `SettingsPanel` calls `updateSettings({ showTimestamps: true })` or `updateSettings({ theme: 'light' })`
2. `updateSettings` in `presentationStore.ts` (line 406-417) creates an updated presentation and calls `persistPresentation(updated)`
3. `persistPresentation` (line 65-72) awaits the IPC save, then calls `set()` to replace the presentation in the array
4. Builder.tsx's reactive selector (line 85-88) returns the new presentation object (different reference)
5. `resolvedTheme` (line 263-268) and `filteredMessages` (line 256-259) correctly recalculate via `useMemo`

The store updates propagate correctly. The component re-renders with new values. The problem is that the new values have no visible effect:
- `data-theme="light"` has no matching CSS rule
- `showTimestamps` is not consumed by `MessageList`

---

## Files Involved

| File | Issue |
|------|-------|
| `src/renderer/src/styles/theme.css` | Missing `[data-theme="light"]` CSS rule -- light colors are only `:root` defaults, not selectable by attribute |
| `src/renderer/src/routes/Builder.tsx` (line 537) | Sets `data-theme={resolvedTheme}` on preview div, but scoped theme override cannot work without matching CSS rules |
| `src/renderer/src/components/message/MessageList.tsx` | No `showTimestamps` prop; component cannot render timestamps |
| `src/renderer/src/components/builder/SettingsPanel.tsx` (line 17) | Minor: uses `s.getActivePresentation()` (function call via `get()`) instead of inline reactive selector; works but is a Zustand anti-pattern that could cause subtle issues |

---

## Suggested Fix Direction

### Theme (Root Cause 1)
Add an explicit `[data-theme="light"]` CSS rule to `theme.css` that re-declares all the light theme color variables. This allows a child `<div data-theme="light">` to override dark variables inherited from the root. The rule should mirror the `:root` defaults but scoped to the attribute selector.

### Timestamps (Root Cause 2)
Either:
- (a) Pass `showTimestamps` into `MessageList` and add basic timestamp rendering between messages (elapsed time markers), or
- (b) Accept that the Builder preview is a simplified view and remove the "Show timestamps" toggle from affecting the preview (document it as Player-only), or
- (c) Create a `PreviewMessageList` variant that supports a subset of Player rendering features including timestamps

Option (a) is the most consistent with user expectations since the settings panel implies it affects the preview.

### SettingsPanel selector (minor)
Replace `usePresentationStore((s) => s.getActivePresentation())` with an inline selector that directly accesses `s.presentations` and `s.activePresentationId`, matching the pattern used in Builder.tsx. This is a best-practice improvement, not a strict bug.

---

## Summary

The live preview correctly receives updated settings via the reactive Zustand chain. The bug is not a reactivity failure -- it is two missing implementation pieces:
1. No `[data-theme="light"]` CSS rule exists, so scoped theme overrides from dark-to-light are impossible
2. `MessageList` does not support timestamp rendering; it is a feature only implemented in the Player's `StepView`/`SeparatorCard` components
