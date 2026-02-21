# Phase 3: Message Rendering - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Parsed messages render as a readable, visually distinct conversation optimized for screen sharing. This phase delivers markdown rendering, syntax highlighting, and tool call visibility filtering. Navigation (stepping through messages) is Phase 4. Specialized tool call renderers (AskUserQuestion, Task tools) are Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Message layout & visual distinction
- **Claude's Discretion** — Claude picks the layout approach (chat bubbles vs full-width blocks), role indicators (labels, icons, color), and visual distinction strategy
- Must be optimized for projector readability — clear at 10+ feet
- Must also work well for screen share (Teams/Zoom viewers on their own monitors)

### Long messages and thinking blocks
- **Claude's Discretion** — Claude decides how to handle very long Claude responses (truncation vs full render vs scroll) and whether thinking blocks are hidden entirely or available as a collapsed toggle
- Priority: presentation-friendly, not overwhelming for the audience

### Markdown & code block presentation
- **Claude's Discretion** — Claude picks markdown fidelity level (standard GFM features vs extended), code block styling (line numbers, language badges, copy buttons), file path treatment, and long code block handling (max height + scroll vs full render)
- Must look clean and professional for a demo audience

### Tool call display
- **Claude's Discretion** — Claude determines:
  - How hidden plumbing tools (Read, Grep, Glob, Write, Edit, Bash) appear — completely invisible, collapsed summary, or dimmed
  - How visible/non-plumbing tool calls render — tool name + summary, minimal badge, etc.
  - Whether runtime toggle of plumbing visibility is worth implementing in Phase 3 vs deferring to Phase 7 (Builder config)
  - How much of tool results to show for visible tool calls
- The classifier from Phase 2 already categorizes tools as plumbing/narrative/unknown — this phase consumes that classification

### Presentation typography
- **Projector-first design** — primary viewing context is conference room / large screen at 10+ feet, but must also be readable for screen share viewers on their own monitors
- **Claude's Discretion** — Claude picks:
  - Font choices (system defaults vs bundled presentation fonts)
  - Content density and spacing
  - Content width (max-width column vs full width)
  - Base font size and scale
- Priority: readable at distance, high contrast, clean layout

### Claude's Discretion (summary)
The user gave Claude broad discretion across all areas. Key constraint: **projector-first, screen-share-compatible**. All visual decisions should optimize for:
1. Readability at distance (large fonts, high contrast, clear visual hierarchy)
2. Clean presentation aesthetic (not a developer tool — a demo viewer)
3. Sensible defaults that work without configuration

</decisions>

<specifics>
## Specific Ideas

- Primary audience is developers who might adopt Claude Code / GSD, but could include PMs or BAs
- The presenter is a senior developer explaining their workflow — the tool should make them look polished
- Viewing context: "Definitely projector/large screen, but I could see screen share happening too"
- Phase 2 already provides: message role, content blocks (text, thinking, tool_use, tool_result), tool classification (plumbing/narrative/unknown), timestamps

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-message-rendering*
*Context gathered: 2026-02-21*
