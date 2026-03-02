# Auto-Update Notification UI

**Source:** Phase 10, Plan 10-02 (packaging and release)
**Priority:** Low
**Type:** Enhancement

## Description

Phase 10 wires the auto-update IPC infrastructure (`update:downloading`, `update:ready`, `installUpdate`) but intentionally skips the renderer UI. Updates install silently on next quit via `autoInstallOnAppQuit = true`.

## Future Work

- Add a banner/toast in the renderer when `onUpdateReady` fires (e.g., "Update ready — restart to apply")
- Add a "Restart Now" button that calls `window.electronAPI.installUpdate()`
- Consider showing download progress via `update:downloading` event

## Context

The IPC channels and preload API are already wired — this is purely a renderer UI task.
