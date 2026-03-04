---
created: 2026-03-04T05:49:48.103Z
title: Show elapsed timestamps for assistant-only steps
area: ui
files:
  - src/renderer/src/components/player/StepView.tsx
  - src/renderer/src/stores/playbackStore.ts
---

## Problem

When a presentation has long sequences of consecutive assistant-only steps (no user message), no elapsed time markers appear at all. This is by design — the marker represents user→Claude response time, which has no meaning without a user message.

However, it makes those sequences feel sparse and information-free. A common example is sessions captured from `/gsd:execute-phase`, where Claude runs autonomously for many steps without user input.

## Solution

Consider a fallback: when there's no user message, show step-to-step elapsed time (previous assistant response to current assistant response) instead. This gives the viewer a sense of pacing even in autonomous sequences. Could use a slightly different visual treatment (e.g., dimmer pill or different label like "~2s between responses") to distinguish from the primary user→Claude measurement.
