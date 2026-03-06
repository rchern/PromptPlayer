# Debug Session: Close Button Flicker on Presentation Tabs

**Bug:** Clicking the close (X) button on a presentation tab causes a UI flicker but does not actually close/deselect the presentation.
**UAT Test:** #2 in `.planning/phases/12-ux-polish/12-UAT.md`
**Status:** Root cause identified

## Root Cause

**Event propagation race between `onMouseDown` (close button) and `onClick` (parent tab button).**

The close button (`<span>` at line 110-132 of `PresentationList.tsx`) uses `onMouseDown` to call `handleClose()`, which calls `setActivePresentation(null)`. However, the parent `<button>` element (line 55-158) uses `onClick` to call `setActivePresentation(p.id)`.

The DOM event sequence for a click is: `mousedown` -> `mouseup` -> `click`. So when the user clicks the X button:

1. **`mousedown` fires on the close `<span>`** -- `handleClose` runs, calls `e.stopPropagation()`, and sets `activePresentationId` to `null`. The tab visually deselects.
2. **`mouseup` fires** -- no handler, but this is still within the parent `<button>`.
3. **`click` fires on the parent `<button>`** -- `e.stopPropagation()` on the `mousedown` event does NOT prevent the `click` event from firing on the parent. `stopPropagation` only prevents the `mousedown` event itself from bubbling. The `click` is a separate, new event synthesized by the browser after mouseup. The parent's `onClick={() => setActivePresentation(p.id)}` fires, re-setting the active presentation back to the tab's ID.

The result is a rapid `null` -> `p.id` state toggle within a single frame or across two frames, producing the "flicker" the user observed.

## Evidence

### PresentationList.tsx (lines 19-30): handleClose uses e.stopPropagation()
```tsx
const handleClose = (e: React.MouseEvent, id: string, name: string): void => {
    e.stopPropagation()  // Only stops mousedown from bubbling, NOT the subsequent click
    const presentation = presentations.find((p) => p.id === id)
    if (presentation && !presentation.sourceFilePath) {
      if (!window.confirm(`"${name}" has not been saved. Close without saving?`)) {
        return
      }
    }
    if (activePresentationId === id) {
      setActivePresentation(null)  // Step 1: deselects
    }
  }
```

### PresentationList.tsx (lines 55-57): Parent button uses onClick
```tsx
<button
    key={p.id}
    onClick={() => setActivePresentation(p.id)}  // Step 3: re-selects
```

### PresentationList.tsx (line 112): Close button uses onMouseDown
```tsx
onMouseDown={(e) => handleClose(e, p.id, p.name)}  // Step 1: fires first
```

### presentationStore.ts (lines 142-144): setActivePresentation is a simple setter
```tsx
setActivePresentation: (id: string | null): void => {
    set({ activePresentationId: id })
},
```

The store confirms there is no debouncing, guarding, or idempotency logic -- each call immediately overwrites `activePresentationId`.

## Why stopPropagation Doesn't Help

`e.stopPropagation()` on the `mousedown` event prevents that specific `mousedown` event from bubbling up the DOM tree. It does NOT prevent the browser from later synthesizing a `click` event on the parent `<button>`. The `click` event is generated independently by the browser when it detects a `mousedown` + `mouseup` sequence on the same element (or a common ancestor). Since the close `<span>` is inside the `<button>`, the `<button>` also receives the `click`.

## Files Involved

| File | Issue |
|------|-------|
| `src/renderer/src/components/builder/PresentationList.tsx` (line 112) | Close button uses `onMouseDown` -- the wrong event for stopping parent click |
| `src/renderer/src/components/builder/PresentationList.tsx` (line 57) | Parent tab uses `onClick` which fires after mousedown regardless of stopPropagation |

## Suggested Fix Direction

Switch the close button from `onMouseDown` to `onClick` and use `e.stopPropagation()` there. When both the child and parent use `onClick`, `stopPropagation()` on the child's `click` event WILL prevent it from reaching the parent's `click` handler. The same fix should be applied to the delete button (`onMouseDown` at line 137).

Alternatively, call `e.preventDefault()` in the `onMouseDown` handler to suppress the subsequent `click` event synthesis, though switching to `onClick` is the more conventional and readable approach.
