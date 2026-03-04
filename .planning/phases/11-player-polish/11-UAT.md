---
status: diagnosed
phase: 11-player-polish
source: [11-01-SUMMARY.md, 11-02-SUMMARY.md]
started: 2026-03-04T02:20:00Z
updated: 2026-03-04T03:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Elapsed Time Markers Between Steps
expected: Open a .promptplay file with showTimestamps enabled. Navigate through steps in the Player. Between consecutive navigation steps within the same session, you should see a thin horizontal line with a centered pill showing elapsed time (e.g., "2m 30s", "12s", "<1s").
result: issue
reported: "The elapsed marker measures user-message-to-user-message (between steps), which includes the user's idle time. It should measure Claude's response time within each step (user timestamp to assistant timestamp). Nobody cares how long the human took to type their next message."
severity: major

### 2. Session Separator Duration
expected: When you reach a session separator card, it should show a duration stat alongside the existing step and message counts (e.g., "8 steps, 24 messages, 2m 15s").
result: pass

### 3. Section Separator Duration
expected: When you reach a section separator card, it should show total duration alongside the existing session and step counts (e.g., "2 sessions, 14 steps, 5m 30s").
result: pass

### 4. No Elapsed Marker on First Step
expected: The very first navigation step in a session should have no elapsed time marker above it — there's no previous step to measure from.
result: pass

### 5. showTimestamps Off Hides All
expected: Open a .promptplay file that has showTimestamps set to false (or toggle it off in the Builder before exporting). In the Player, no elapsed time markers should appear between steps and no duration stats on separator cards.
result: pass

### 6. Theme Applied on Load
expected: Open a .promptplay file configured with a specific theme (e.g., dark theme on a light system). The Player should load directly in that theme without any flash of the wrong theme first.
result: issue
reported: "Changed .promptplay from system to light but Player still shows dark (system theme). Theme from file config is not being applied."
severity: major

### 7. Sun/Moon Theme Toggle
expected: In the Player's progress bar area (bottom), you should see a small sun or moon icon. Clicking it instantly toggles between light and dark themes.
result: issue
reported: "Toggle icon is visible but clicking it does nothing — theme doesn't change."
severity: major

### 8. Toggle Resets on New File
expected: After using the toggle to switch themes, close and reopen the same .promptplay file. The theme should reset to the file's configured default, not the toggled state.
result: skipped
reason: Theme application and toggle both broken (tests 6, 7)

### 9. System Theme Doesn't Override Player
expected: While a presentation is loaded in the Player, change your OS dark/light mode setting. The Player's theme should NOT change — it stays on whatever the file config or toggle specified.
result: skipped
reason: Theme application and toggle both broken (tests 6, 7)

### 10. Leaving Player Restores System Theme
expected: After viewing a presentation that overrode your system theme (e.g., dark file on light system), navigate away from the Player (back to Home or Builder). The app should resume following your system theme preference.
result: skipped
reason: Theme application and toggle both broken (tests 6, 7)

## Summary

total: 10
passed: 4
issues: 3
pending: 0
skipped: 3
skipped: 0

## Gaps

- truth: "Elapsed-time markers show how long Claude took to respond between consecutive navigation steps"
  status: failed
  reason: "User reported: The elapsed marker measures user-message-to-user-message (between steps), which includes the user's idle time. It should measure Claude's response time within each step (user timestamp to assistant timestamp). Nobody cares how long the human took to type their next message."
  severity: major
  test: 1
  root_cause: "getStepTimestamp() returns userMessage timestamp. Elapsed computed as user[N].timestamp - user[N-1].timestamp across steps — includes user idle time. Should be assistantMessage.timestamp - userMessage.timestamp within each step. Session duration also affected: last timestamp should prefer assistantMessage."
  artifacts:
    - path: "src/renderer/src/stores/playbackStore.ts"
      issue: "getStepTimestamp returns user timestamp; elapsed loop compares across steps instead of within"
  missing:
    - "Compute elapsedMs as computeElapsedMs(navStep.userMessage?.timestamp, navStep.assistantMessage?.timestamp) within each step"
    - "Session duration lastTimestamp should prefer assistantMessage.timestamp over userMessage.timestamp"

- truth: "Player applies the .promptplay file's configured theme (light, dark, or system-resolved) on load without flash"
  status: failed
  reason: "User reported: Changed .promptplay from system to light but Player still shows dark (system theme). Theme from file config is not being applied."
  severity: major
  test: 6
  root_cause: "usePlayerTheme cleanup dispatches async getTheme() to restore system theme. In React StrictMode (mount→unmount→remount) or on effect re-runs, the async callback resolves AFTER the new effect sets the correct theme, overwriting it with system dark. The cleanup is never cancelled."
  artifacts:
    - path: "src/renderer/src/hooks/usePlayerTheme.ts"
      issue: "useEffect cleanup dispatches uncancellable async getTheme() that overwrites correct theme on re-run"
  missing:
    - "Separate theme application (useEffect with [effectiveTheme]) from unmount restoration (useEffect with [] dependency)"
    - "Use cancelled flag or ref to prevent stale async cleanup from overwriting theme"

- truth: "A small sun/moon toggle button in the progress bar area switches between light and dark themes at runtime"
  status: failed
  reason: "User reported: Toggle icon is visible but clicking it does nothing — theme doesn't change."
  severity: major
  test: 7
  root_cause: "Downstream symptom of Bug 1. toggleTheme correctly updates themeOverride in store, usePlayerTheme recomputes effectiveTheme and sets data-theme — but the async cleanup from the prior effect run resolves and clobbers it back to system theme."
  artifacts:
    - path: "src/renderer/src/hooks/usePlayerTheme.ts"
      issue: "Same async cleanup race as test 6 — toggle works but gets immediately overwritten"
  missing:
    - "Fix the usePlayerTheme cleanup race (same fix as test 6 resolves this)"
