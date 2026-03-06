# Phase 12: UX Polish - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Address accumulated UX feedback across Builder and Player. Close the todo backlog of rendering fixes, workflow improvements, and missing UI elements. This phase delivers no new capabilities — it polishes existing features to their intended quality level.

</domain>

<decisions>
## Implementation Decisions

### Player: "Show more" overflow button
- Hide the expand/collapse button when content fits without scrolling
- Check scrollHeight vs clientHeight to determine overflow
- Only show the button when there's actually more content to reveal

### Player: Broken box/border rendering
- Claude's discretion on approach — investigate CHECKPOINT box patterns and horizontal-rule-with-text sequences, then pick cleanest fix (styled callout components, code block wrapping, or CSS fix)

### Player: System-generated messages
- Claude's discretion — investigate data patterns (e.g., TaskOutput read results, queue-operation injections) and classify or filter appropriately. Goal: these should not show as "YOU" bubbles

### Player: Consecutive solo assistant step combining
- Combine adjacent steps where userMessage is null into a single step showing all assistant content
- Reduces click-through fatigue in autonomous sequences (e.g., /gsd:execute-phase)
- Combined steps show per-original-step elapsed times within the group (small indicators between each original assistant message)

### Builder: Close open presentations
- Add close action (X icon) on each open presentation entry in PresentationList
- Prompt "Save changes?" dialog (Save / Don't Save / Cancel) when closing a presentation with unsaved changes

### Builder: Live preview reactivity
- Preview subscribes to settings store and re-renders immediately on any change
- What you toggle (theme, timestamps, tool visibility) is what you see — instant, no "Apply" button
- May need to pass current settings as props or add reactive store subscription to preview component

### Builder: Date filter presets
- Rename from calendar-based to relative: "Today", "Last 7 days", "Last 30 days", "Older"
- Consistent regardless of day-of-week (no more "This Week = Today" on Sundays)

### Builder: Checkbox placement + split-to-section
- Claude's discretion on checkbox positioning improvement and whether to add split-to-new-section action
- Goal: cleaner alignment and natural complement to existing merge

### Elapsed time for assistant-only steps
- Show step-to-step elapsed (previous step's last timestamp to current step's timestamp)
- Use different visual treatment from user→Claude markers (dimmer pill, different label like "~2s between responses")
- Placement: Claude's discretion based on existing layout
- For combined steps: show per-original-step times within the combined block

### Auto-update notification UI
- Non-intrusive toast/banner when update is ready (no download progress shown)
- Banner includes "Update ready — restart to apply" message with "Restart Now" button
- Auto-dismiss after ~30s, leaving a small reminder indicator (icon/badge) so user can find it later
- Placement: Claude's discretion (avoiding conflicts with existing controls)
- IPC channels already wired: `update:downloading`, `update:ready`, `installUpdate`

### Claude's Discretion
- Box/border rendering fix approach
- System message classification strategy
- Checkbox layout and split-to-section implementation
- Elapsed marker placement for solo steps
- Auto-update banner placement and reminder indicator design
- Player "Open File" action for switching presentations (noted in player-ux-feedback item 6)

</decisions>

<specifics>
## Specific Ideas

- Combined assistant steps should still show per-original-step elapsed times — the combined view should feel like a filmstrip of Claude's continuous work
- Auto-update banner should feel like VS Code's update notification — present but not demanding
- Date filter presets should use language that always makes sense: "Last 7 days" not "This Week"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- CollapsibleContent.tsx (141 lines): Handles show/hide expansion — target for overflow fix
- ElapsedTimeMarker.tsx (49 lines): Existing elapsed marker component — extend for solo step variant
- ImportDropZone toast pattern: Simple React state with 3s auto-dismiss — reuse for update notification
- cleanUserText.ts (185 lines): Already strips system XML — could be extended for system message detection
- PresentationList.tsx (152 lines): Open presentations list — add close button here
- SearchFilterBar.tsx (235 lines): Date filter presets — rename preset labels

### Established Patterns
- Module-level style constants for all static styles (per Phase 9 convention)
- Zustand stores for state management with getState() for event callbacks
- data-theme scoping for preview theme isolation (Phase 7)
- React.memo for performance on list items (Phase 6)

### Integration Points
- playbackStore.ts buildPlaybackSteps: Where step combining logic would go (elapsed already precomputed here)
- presentationStore.ts: Settings changes need to propagate to preview
- autoUpdater.ts (37 lines): IPC events already wired, renderer needs UI listener
- StepView.tsx: Where combined step rendering and elapsed markers appear

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-ux-polish*
*Context gathered: 2026-03-04*
