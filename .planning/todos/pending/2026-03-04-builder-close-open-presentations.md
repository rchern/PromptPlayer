---
created: 2026-03-04T06:10:00Z
title: Add close button for open presentations in Builder
area: ui
files:
  - src/renderer/src/components/builder/PresentationsPane.tsx
---

## Problem

In the Builder's presentations pane, once a presentation is opened for editing there is no way to close it. Open presentations accumulate with no way to dismiss them. Users need a way to close/remove presentations from the open list without deleting the file.

## Solution

Add a close action (X icon or right-click context menu) on each open presentation entry in the pane. Closing should remove it from the open list but not delete the .promptplay file. If the closed presentation had unsaved changes, consider prompting to save first.
