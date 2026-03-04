---
status: diagnosed
phase: 12-ux-polish
source: 12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md, 12-04-SUMMARY.md, 12-05-SUMMARY.md
started: 2026-03-04T15:00:00Z
updated: 2026-03-04T16:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Date Filter Presets Renamed to Relative
expected: In the Builder, open the date filter dropdown in the search/filter bar. The presets should read "Last 7 days" and "Last 30 days" (not "This Week" or "This Month"). Selecting "Last 7 days" should show sessions from the past 7 rolling days regardless of what day of the week it is.
result: pass

### 2. Close Button on Presentation Tabs
expected: In the Builder, hover over a presentation tab. An X (close) button should appear. Clicking it deactivates the presentation (tab deselects, outline clears). If the presentation was never saved, a confirmation prompt should appear before closing.
result: issue
reported: "I'm not sure the close is doing anything. the UI flickers like it's doing something, but the presentation is still there and the tab is selected"
severity: major

### 3. Live Preview Reactivity
expected: In the Builder with a presentation active and the preview visible, change a setting (e.g., toggle tool visibility or switch theme). The preview should update immediately without needing to click away or refresh.
result: issue
reported: "seems like a miss here too. I've changed the timestamps to on and the theme to light, but preview is still dark with no timestamps"
severity: major

### 4. Checkbox Alignment in Section Headers
expected: In the Builder's presentation outline, section header checkboxes should be consistently aligned in a fixed-width gutter column. They should not appear cramped against the section icon or name.
result: pass

### 5. Split-to-New-Section on Session Entries
expected: In the Builder's presentation outline, hover over a session entry within a section. A scissors icon button should appear. Clicking it creates a new section named after that session, inserted immediately after the current section. The session moves to the new section.
result: pass

### 6. Show-More Overflow Detection
expected: In the Player, short messages should NOT show a "Show more" button. Only messages whose content genuinely overflows the collapsed height should display the button. After code blocks finish syntax highlighting, the button should appear/disappear correctly.
result: pass

### 7. Blockquote and Box Styling
expected: In the Player, messages containing blockquotes (like CHECKPOINT patterns) should render with an accent-colored left border, subtle background tint, and rounded corners. Consecutive horizontal rules should collapse spacing. Tables should have row hover states.
result: skipped
reason: No test data files contain blockquote, table, or checkpoint markdown patterns

### 8. System Message Classification
expected: In the Player, system-generated user messages (like TaskOutput reads, task notifications, or messages containing XML-like tags) should display a "System" label with muted styling instead of "You". Regular user messages still show "You".
result: pass

### 9. Combined Consecutive Assistant Steps
expected: In the Player, when a session has multiple consecutive assistant-only steps (no user messages between them), they should be combined into a single navigable step rather than requiring separate clicks for each. The step count in the progress indicator should reflect the reduced number.
result: issue
reported: "sure they're on the same page, but are we expecting blank entries? Most combined assistant messages show just 'CLAUDE' with no content — only the last one has visible text. Tool-use-only messages render as empty."
severity: major

### 10. Elapsed Time Between Combined Responses
expected: Within a combined assistant step (filmstrip), elapsed time markers should appear between individual assistant responses showing approximately how long passed between them (e.g., "~5s between responses"). These markers should use a dimmer, less prominent style than the main elapsed time markers.
result: pass

### 11. Auto-Update Notification Banner
expected: When an update is downloaded and ready to install, a notification banner should appear at the bottom-right of the app with version info, "Restart Now" and "Later" buttons. After 30 seconds (or clicking Later), it should auto-dismiss to a small "Update available" reminder that re-expands on click. (Skip if no update available to test.)
result: skipped
reason: No update available to trigger the banner

### 12. Open File Button in Player
expected: In the Player with no presentation loaded (empty state), a full "Open File" button should be visible. When a presentation is loaded, a subtle mini folder icon button should appear on hover, allowing you to open a different file.
result: pass

### 13. Clickable Recent Files on Home Screen
expected: On the Home screen, recent files should be clickable. Clicking one should navigate to the Player with that file's presentation loaded automatically.
result: issue
reported: "opened files through the app but recent files list is empty on Home screen — nothing listed when going back to Home"
severity: major

## Summary

total: 13
passed: 6
issues: 4
pending: 0
skipped: 2

## Gaps

- truth: "Close button on presentation tab deactivates the presentation (tab deselects, outline clears)"
  status: failed
  reason: "User reported: I'm not sure the close is doing anything. the UI flickers like it's doing something, but the presentation is still there and the tab is selected"
  severity: major
  test: 2
  root_cause: "Event propagation race: close button uses onMouseDown with stopPropagation, but parent tab uses onClick. stopPropagation on mousedown does NOT prevent the browser from synthesizing a separate click event on the parent, which re-selects the tab immediately after deselection."
  artifacts:
    - path: "src/renderer/src/components/builder/PresentationList.tsx"
      issue: "Close button (line 112) uses onMouseDown; parent tab (line 57) uses onClick — different event types so stopPropagation doesn't work across them"
  missing:
    - "Change close and delete buttons from onMouseDown to onClick so stopPropagation prevents parent click"
  debug_session: ".planning/debug/close-button-flicker.md"
- truth: "Live preview updates immediately when settings (theme, timestamps, tool visibility) are changed"
  status: failed
  reason: "User reported: seems like a miss here too. I've changed the timestamps to on and the theme to light, but preview is still dark with no timestamps"
  severity: major
  test: 3
  root_cause: "Two missing implementations: (1) No [data-theme='light'] CSS rule in theme.css — light colors only exist as :root defaults, so dark mode variables cascade into preview div unopposed. (2) MessageList component has no showTimestamps prop — timestamps only exist in Player components (StepView, SeparatorCard, ElapsedTimeMarker)."
  artifacts:
    - path: "src/renderer/src/styles/theme.css"
      issue: "Missing [data-theme='light'] CSS rule; light colors only exist as :root defaults"
    - path: "src/renderer/src/components/message/MessageList.tsx"
      issue: "No showTimestamps prop; cannot render timestamps"
    - path: "src/renderer/src/routes/Builder.tsx"
      issue: "Sets data-theme={resolvedTheme} but no matching CSS rule for scoped override"
  missing:
    - "Add [data-theme='light'] CSS rule to theme.css that re-declares light color variables"
    - "Add timestamp support to MessageList or create preview-aware variant"
  debug_session: ".planning/debug/live-preview-reactivity.md"
- truth: "Combined consecutive assistant steps display meaningful content for each message in the filmstrip"
  status: failed
  reason: "User reported: most combined assistant messages show just 'CLAUDE' with no content — tool-use-only messages render as empty entries in the filmstrip"
  severity: major
  test: 9
  root_cause: "Two visibility systems disagree: filterWithToolSettings (message filter) includes plumbing tool messages when tool is enabled in settings, but ContentBlockRenderer unconditionally hides all plumbing tool_use blocks because showPlumbing is hardcoded to false in StepView.tsx. For assistant messages with ONLY tool_use blocks (no text), every block renders as null, leaving just the CLAUDE label."
  artifacts:
    - path: "src/renderer/src/components/player/StepView.tsx"
      issue: "Lines 57 and 108 hardcode showPlumbing={false}"
    - path: "src/renderer/src/components/message/ContentBlockRenderer.tsx"
      issue: "Line 47 suppresses all plumbing tool_use blocks regardless of per-tool settings"
    - path: "src/renderer/src/components/message/MessageBubble.tsx"
      issue: "CLAUDE label renders unconditionally even when all content blocks are null"
  missing:
    - "Pass per-tool visibility settings to ContentBlockRenderer instead of blanket showPlumbing boolean"
    - "Suppress CLAUDE role label when all content blocks resolve to null"
  debug_session: ".planning/debug/blank-combined-steps.md"
- truth: "Recent files on Home screen populate after opening files through the app and are clickable to navigate to Player"
  status: failed
  reason: "User reported: opened files through the app but recent files list is empty on Home screen — nothing listed when going back to Home"
  severity: major
  test: 13
  root_cause: "The write side of recent files was never implemented. setRecentFiles() in appStore.ts is defined but never called anywhere. No persistence layer exists (no main-process storage module, no IPC handler, no preload bridge). None of the three file-open callsites (App.tsx, Player.tsx x2) track opened files."
  artifacts:
    - path: "src/renderer/src/stores/appStore.ts"
      issue: "setRecentFiles defined but never invoked"
    - path: "src/renderer/src/App.tsx"
      issue: "Opens files via OS association without tracking"
    - path: "src/renderer/src/routes/Player.tsx"
      issue: "Opens files via dialog without tracking"
    - path: "src/main/storage/"
      issue: "Missing recentFileStore.ts entirely"
  missing:
    - "Create recentFileStore.ts in main process with JSON persistence"
    - "Add IPC handlers for recent files"
    - "Bridge through preload"
    - "Call addRecentFile at each file-open callsite"
    - "Load persisted recent files into Zustand store on app/Home mount"
  debug_session: ".planning/debug/empty-recent-files.md"
