---
created: 2026-03-04T06:00:00Z
title: Builder live preview does not reflect settings changes
area: ui
files:
  - src/renderer/src/components/builder/BuilderPreview.tsx
---

## Problem

Changing presentation settings in the Builder (timestamps toggle, theme, tool display options) does not update the live preview panel. The preview continues showing the old state until the file is re-exported and reopened. Users expect the preview to react immediately to setting changes so they can see the effect before exporting.

## Solution

Ensure the Builder's preview component subscribes to the presentation settings store and re-renders when settings change. May need to pass current settings as props or use a reactive store subscription in the preview component.
