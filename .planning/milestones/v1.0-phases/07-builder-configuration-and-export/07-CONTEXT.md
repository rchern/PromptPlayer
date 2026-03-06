# Phase 7: Builder Configuration and Export - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure presentation display settings (tool visibility, timestamps, theme) and export/import self-contained `.promptplay` files. Users configure how their presentation will look in the Player, export it as a shareable file, and can re-open exported files for full editing.

</domain>

<decisions>
## Implementation Decisions

### Tool call visibility controls
- Two-level granularity: category groups (e.g., "File operations", "Search", "Shell") with expand-to-individual toggles per tool type
- Live preview in the message panel — toggling visibility immediately updates the rendered conversation
- Smart defaults from existing classifier: plumbing tools start hidden, narrative tools start visible
- Presentation-level setting only — one set of visibility rules applies to all sessions in the presentation

### .promptplay file format
- Fully embedded: all conversation data bundled inside the file (truly self-contained, no external dependencies)
- Save dialog with remembered last-used directory for export location
- No format version field for v1 — keep it simple

### Settings panel layout
- Settings changes auto-save on every toggle/selection — no explicit "Apply" button needed

### Re-edit workflow
- Prompt to save current work before loading a .promptplay file (protects work in progress)
- Full editing when re-opened: add/remove sessions, reorder, change settings, re-export
- Both Save (Ctrl+S, overwrites original) and Save As (Ctrl+Shift+S, new file) available after re-editing

### Claude's Discretion
- Internal file format choice (JSON vs compressed) — pick based on typical file sizes and trade-offs
- Settings panel placement in the Builder UI (sidebar, modal, or inline)
- Theme selector preview approach (live preview vs thumbnails)
- Timestamp toggle granularity (simple on/off vs multiple modes like "Time only" / "Time + elapsed")
- Handling of missing source JSONL files when re-opening exported files

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-builder-configuration-and-export*
*Context gathered: 2026-02-24*
