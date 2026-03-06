# Debug Session: Blank Combined Assistant Steps

**Bug:** Most combined assistant messages show just "CLAUDE" with no content -- tool-use-only messages render as empty entries in the filmstrip.
**Test:** UAT Test 9 (Combined Consecutive Assistant Steps)
**Date:** 2026-03-04

## Root Cause

**Two independent visibility systems disagree on whether tool-use blocks should render.**

### System 1: Message-Level Filter (`filterWithToolSettings`)

Location: `src/renderer/src/utils/messageFiltering.ts`, lines 92-173

This filter decides which messages are included in the navigation step pipeline. It respects the presentation's per-tool visibility settings via `ToolCategoryConfig[]`. When a plumbing tool (e.g., Read, Bash, Edit) is explicitly enabled in the presentation settings, its messages pass the filter:

```typescript
// messageFiltering.ts lines 160-169
if (msg.toolVisibility === 'plumbing') {
  for (const block of msg.contentBlocks) {
    if (block.type === 'tool_use') {
      if (visibilityMap.get(block.name) === true) return true  // tool enabled in settings -> include
    }
  }
  return hasMeaningfulText(msg)  // fallback: only if has text
}
```

### System 2: Block-Level Renderer (`ContentBlockRenderer`)

Location: `src/renderer/src/components/message/ContentBlockRenderer.tsx`, line 47

This renderer decides whether each individual content block is visible. It uses a DIFFERENT, simpler check -- the message's `toolVisibility` field combined with a `showPlumbing` boolean prop:

```typescript
// ContentBlockRenderer.tsx line 47
case 'tool_use':
  if (toolVisibility === 'plumbing' && !showPlumbing) return null  // <-- always null in StepView
```

### The Disconnect

In `StepView.tsx` (lines 57 and 108), `showPlumbing` is **hardcoded to `false`**:

```typescript
<MessageBubble
  message={msg}
  showPlumbing={false}     // <-- always false
  toolUseMap={toolUseMap}
/>
```

`ContentBlockRenderer` has no access to the presentation's per-tool settings. It only knows whether plumbing is globally on or off, and in the Player it's always off.

### The Bug Flow

1. In an autonomous Claude sequence (e.g., GSD execute-phase), most assistant messages call plumbing tools (Read, Write, Bash, etc.) and have `toolVisibility: 'plumbing'`.
2. Many of these messages contain ONLY `tool_use` blocks with no `text` blocks (Claude calls a tool without any accompanying text explanation).
3. `filterWithToolSettings` includes these messages because the specific tool is enabled in presentation settings.
4. `combineConsecutiveSoloSteps` combines consecutive solo assistant steps into a single step with `combinedAssistantMessages`.
5. `StepView` renders each combined message via `MessageBubble` with `showPlumbing={false}`.
6. `MessageBubble` renders the "CLAUDE" role label, then iterates `contentBlocks`.
7. `ContentBlockRenderer` sees `toolVisibility === 'plumbing'` and `showPlumbing === false` -> returns `null` for every `tool_use` block.
8. Result: The "CLAUDE" label renders with empty content below it. Only messages that happen to include a `text` block alongside tool_use blocks show any content.

### Why the Last Message Often Has Content

The last message in a combined sequence often has text because Claude typically produces a text summary after completing a series of tool calls. These mixed-content messages (text + tool_use) render the text portion correctly -- `ContentBlockRenderer` passes text blocks through regardless of `toolVisibility`.

## Evidence

| File | Line(s) | Evidence |
|------|---------|----------|
| `src/renderer/src/components/player/StepView.tsx` | 57, 108 | `showPlumbing={false}` hardcoded in both single and combined rendering paths |
| `src/renderer/src/components/message/ContentBlockRenderer.tsx` | 47 | `if (toolVisibility === 'plumbing' && !showPlumbing) return null` -- blocks hidden unconditionally |
| `src/renderer/src/utils/messageFiltering.ts` | 160-169 | `filterWithToolSettings` includes plumbing messages when tool is enabled in settings |
| `src/renderer/src/stores/playbackStore.ts` | 119-121 | `filterWithToolSettings` is used (not `filterVisibleMessages`) for building playback steps |
| `src/main/pipeline/classifier.ts` | 15-32 | Read, Write, Bash, Edit, Grep, Glob are all classified as `plumbing` |
| `src/renderer/src/components/message/MessageBubble.tsx` | 107 | "Claude" label always renders regardless of content block visibility |

## Files Involved

- **`src/renderer/src/components/message/ContentBlockRenderer.tsx`**: Uses a simple `showPlumbing` boolean that doesn't respect per-tool presentation settings. This is the primary render-side culprit.
- **`src/renderer/src/components/player/StepView.tsx`**: Hardcodes `showPlumbing={false}`, providing no way for the presentation's tool settings to flow through to the renderer.
- **`src/renderer/src/utils/messageFiltering.ts`**: `filterWithToolSettings` correctly uses per-tool settings but the renderer downstream doesn't honor the same settings.
- **`src/renderer/src/components/message/MessageBubble.tsx`**: Renders the "CLAUDE" label unconditionally, contributing to the "label with no content" appearance.

## Suggested Fix Direction

The core fix should reconcile the two visibility systems. Two approaches:

**Option A (Preferred): Pass per-tool visibility settings through to `ContentBlockRenderer`.**
Instead of `showPlumbing: boolean`, pass the resolved tool visibility map (or the full `ToolCategoryConfig[]`) so that `ContentBlockRenderer` can check whether a specific tool_use block's tool is enabled in settings. This makes the renderer consistent with the filter.

**Option B: Don't include tool-use-only plumbing messages in combined steps unless they'll actually render.**
Add a post-filter step after `filterWithToolSettings` that strips messages whose content blocks would all be hidden by the renderer. This keeps the renderer simple but adds redundant logic.

Either way, `MessageBubble` should also suppress the "CLAUDE" role label when all content blocks resolve to null (empty assistant entries should not appear at all).
