# Phase 13: Phase 3 & 4 Verification Gap Closure - Research

**Researched:** 2026-03-04
**Domain:** Documentation / verification gap closure (no code changes)
**Confidence:** HIGH

## Summary

Phase 13 is a pure documentation/verification phase. No code changes are required. The milestone audit (`v1.0-MILESTONE-AUDIT.md`) identified 8 orphaned requirements from Phases 3 and 4 where features are fully implemented and integration-confirmed, but VERIFICATION.md files were never created and REQUIREMENTS.md checkboxes were never checked. The root cause is that Phases 3 and 4 completed early in the project (2026-02-22) before VERIFICATION.md creation was consistently enforced.

The work consists of: (1) creating a VERIFICATION.md for Phase 3 covering PLAY-04, PLAY-05, PLAY-06, PLAY-09, PLAY-15, (2) creating a VERIFICATION.md for Phase 4 covering PLAY-02, PLAY-03, PLAY-11, (3) updating REQUIREMENTS.md to check all 8 boxes, and (4) confirming the re-audit would yield 38/38.

**Primary recommendation:** Use the established VERIFICATION.md format (matching Phases 8-12) with code-level evidence tracing each requirement to specific source files, lines, and implementation patterns. The verifier should read the actual source code and plans/summaries to build evidence rather than assuming anything.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAY-02 | User can step forward through messages with right arrow, spacebar, or click | Keyboard hooks (`useKeyboardNavigation.ts`, `usePlaybackKeyboardNavigation.ts`) handle ArrowRight and Space for forward. `NavigationControls.tsx` provides click-to-advance buttons. `navigationStore.ts` and `playbackStore.ts` provide `nextStep()` action. |
| PLAY-03 | User can step backward through messages with left arrow | Same keyboard hooks handle ArrowLeft for backward. `NavigationControls.tsx` provides back button. `prevStep()` action in both stores. |
| PLAY-04 | User messages are visually distinct from Claude responses (different styling/layout) | `MessageBubble.tsx` applies role-aware backgrounds: `bg-tertiary` for user, `bg-primary` for Claude, `bg-secondary` for system. Role labels ("You"/"Claude"/"System") with distinct colors (accent for user, text-secondary for Claude, text-muted for system). |
| PLAY-05 | Claude's markdown responses render with proper formatting (headings, lists, bold, italic, links, tables) | `MarkdownRenderer.tsx` uses `MarkdownHooks` from react-markdown with `remarkGfm` plugin. `message.css` provides comprehensive element styling for h1-h6, ul/ol, blockquotes, tables, links, bold, italic, hr. |
| PLAY-06 | Code blocks render with syntax highlighting appropriate to the language | `CodeBlock.tsx` with `@shikijs/rehype` dual-theme highlighting (github-light/github-dark). `code-highlight.css` for theme CSS. Language badge via `LANG_DISPLAY` map (20+ languages). |
| PLAY-09 | Plumbing tool calls (Read, Grep, Glob, Write, Edit, Bash, etc.) are hidden by default | `classifier.ts` classifies 12 tools as plumbing via `PLUMBING_TOOLS` Set. `filterVisibleMessages()` in `messageFiltering.ts` hides plumbing when `showPlumbing=false`. `initializeSteps()` calls `filterVisibleMessages(messages, false)`. Player always passes `false`. |
| PLAY-11 | Progress indicator shows current position: section name, step N of M, overall progress bar | `ProgressIndicator.tsx` for single-session (Step N / M with progress bar). `SegmentedProgress.tsx` for multi-session (section name, local N/M, global progress, proportional segmented bar). `SectionSidebar.tsx` for section navigation. |
| PLAY-15 | Typography is optimized for screen sharing / projector readability (large fonts, good contrast) | `message.css` defines `--text-presentation-base: 1.25rem` (20px) for Player, `--text-preview-base: 0.875rem` (14px) for Builder. `.presentation-mode` class applies 20px base with 1.7 line-height. Heading scale: 2rem/1.75rem/1.5rem/1.25rem. `900px` max-width for readability. |
</phase_requirements>

## Standard Stack

This phase requires no libraries, dependencies, or code changes. It is entirely documentation work.

### Core

| Tool | Purpose | Why Used |
|------|---------|----------|
| File system (Write tool) | Create VERIFICATION.md files | Standard GSD verification artifact |
| File system (Edit tool) | Update REQUIREMENTS.md checkboxes | Check `[ ]` to `[x]` for 8 requirements |

### Supporting

No supporting tools required.

### Alternatives Considered

Not applicable -- this is documentation work with a single correct approach.

## Architecture Patterns

### VERIFICATION.md Format

The project has 10 existing VERIFICATION.md files (Phases 1-2, 5-12) that establish a consistent format. Phase 13 MUST follow this format exactly.

**Standard structure (from Phases 8 and 9):**
```markdown
---
phase: {phase-name}
verified: {ISO timestamp}
status: passed
score: {N/N} must-haves verified
---

# Phase {N}: {Name} Verification Report

**Phase Goal:** {description}
**Verified:** {timestamp}
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| N | {truth statement} | VERIFIED | {specific code-level evidence with file paths and line numbers} |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| {path} | {what it should provide} | VERIFIED ({lines} lines) | {verification detail} |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| {source file} | {target file} | {import/call} | WIRED | {line numbers and context} |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| {REQ-ID} | {plan refs} | {description} | SATISFIED | {implementation evidence} |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|

### Human Verification Required

{numbered list of visual/UX checks that need human confirmation}

### Gaps Summary

{summary of findings}
```

### Evidence Source Map

The verifier needs to trace each requirement to concrete implementation evidence. Here is the mapping of where evidence lives:

**Phase 3 Requirements (PLAY-04, PLAY-05, PLAY-06, PLAY-09, PLAY-15):**

| Requirement | Primary Evidence Files | Plan Sources |
|-------------|----------------------|-------------|
| PLAY-04 (Visual distinction) | `src/renderer/src/components/message/MessageBubble.tsx` | 03-02-PLAN.md, 03-02-SUMMARY.md |
| PLAY-05 (Markdown rendering) | `src/renderer/src/components/message/MarkdownRenderer.tsx`, `src/renderer/src/styles/message.css` | 03-01-PLAN.md, 03-01-SUMMARY.md |
| PLAY-06 (Syntax highlighting) | `src/renderer/src/components/message/CodeBlock.tsx`, `src/renderer/src/styles/code-highlight.css` | 03-01-PLAN.md, 03-01-SUMMARY.md |
| PLAY-09 (Hide plumbing) | `src/main/pipeline/classifier.ts`, `src/renderer/src/utils/messageFiltering.ts`, `src/renderer/src/stores/navigationStore.ts` | 03-02-PLAN.md, 03-02-SUMMARY.md, 03-03-PLAN.md, 03-03-SUMMARY.md |
| PLAY-15 (Projector typography) | `src/renderer/src/styles/message.css` (`.message-view`, `.presentation-mode`) | 03-01-PLAN.md, 03-01-SUMMARY.md |

**Phase 4 Requirements (PLAY-02, PLAY-03, PLAY-11):**

| Requirement | Primary Evidence Files | Plan Sources |
|-------------|----------------------|-------------|
| PLAY-02 (Step forward) | `src/renderer/src/hooks/useKeyboardNavigation.ts`, `src/renderer/src/hooks/usePlaybackKeyboardNavigation.ts`, `src/renderer/src/components/player/NavigationControls.tsx`, `src/renderer/src/stores/navigationStore.ts`, `src/renderer/src/stores/playbackStore.ts` | 04-01-PLAN.md, 04-02-PLAN.md, 04-01-SUMMARY.md, 04-02-SUMMARY.md |
| PLAY-03 (Step backward) | Same files as PLAY-02 (backward navigation is symmetric) | Same plan sources |
| PLAY-11 (Progress indicator) | `src/renderer/src/components/player/ProgressIndicator.tsx`, `src/renderer/src/components/player/SegmentedProgress.tsx`, `src/renderer/src/components/player/SectionSidebar.tsx` | 04-02-PLAN.md, 04-02-SUMMARY.md |

### REQUIREMENTS.md Checkbox Update

The 8 requirements to change from `[ ]` to `[x]`:

| Line | Current | Target |
|------|---------|--------|
| PLAY-02 (line 37) | `- [ ] **PLAY-02**:` | `- [x] **PLAY-02**:` |
| PLAY-03 (line 38) | `- [ ] **PLAY-03**:` | `- [x] **PLAY-03**:` |
| PLAY-04 (line 39) | `- [ ] **PLAY-04**:` | `- [x] **PLAY-04**:` |
| PLAY-05 (line 40) | `- [ ] **PLAY-05**:` | `- [x] **PLAY-05**:` |
| PLAY-06 (line 41) | `- [ ] **PLAY-06**:` | `- [x] **PLAY-06**:` |
| PLAY-09 (line 43) | `- [ ] **PLAY-09**:` | `- [x] **PLAY-09**:` |
| PLAY-11 (line 45) | `- [ ] **PLAY-11**:` | `- [x] **PLAY-11**:` |
| PLAY-15 (line 49) | `- [ ] **PLAY-15**:` | `- [x] **PLAY-15**:` |

The traceability table should also be updated to change "Pending" to "Complete" for these 8 rows (lines 124-137).

### Anti-Patterns to Avoid

- **Verifying without reading source code:** Do NOT create VERIFICATION.md based only on plan/summary descriptions. Read the actual source files and confirm the implementation matches the requirement.
- **Copying evidence from other phases:** Each VERIFICATION.md must contain evidence specific to the phase's own source files and plan artifacts.
- **Incomplete coverage:** All requirements assigned to the phase MUST appear in the Requirements Coverage table. Missing even one defeats the purpose of gap closure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verification format | Custom format | Existing VERIFICATION.md template from Phases 8-12 | Consistency with the 10 existing verifications |
| Evidence gathering | Manual grep across codebase | Read specific files identified in Evidence Source Map above | The audit already confirmed all 8 requirements are implemented and wired |

**Key insight:** This phase is verifying work that was already done and confirmed by the milestone audit's integration checker. The risk is NOT that features are missing -- it's that the verification documentation is missing. The verifier must still read source code to write accurate evidence, but should not expect to find gaps in implementation.

## Common Pitfalls

### Pitfall 1: Creating VERIFICATION.md Without Reading Source
**What goes wrong:** Verifier writes VERIFICATION.md based on plan descriptions alone, producing inaccurate line numbers or missing implementation details.
**Why it happens:** The plans and summaries describe what was planned/built, but code may have changed in later phases (e.g., Phase 12 UX Polish refactored several Phase 3 components).
**How to avoid:** Always read the current source files listed in the Evidence Source Map. Use current line numbers.
**Warning signs:** Line numbers in VERIFICATION.md that don't match the actual file.

### Pitfall 2: Forgetting the Traceability Table Update
**What goes wrong:** REQUIREMENTS.md checkboxes get checked but the traceability table at the bottom still shows "Pending" for these requirements.
**Why it happens:** The checkboxes and traceability table are in different sections of the file.
**How to avoid:** Update BOTH the checkbox lines (lines 37-49) AND the traceability rows (lines 124-137). Also update the "Verified (checked)" count from 30/38 to 38/38.
**Warning signs:** Inconsistency between checkbox status and traceability status.

### Pitfall 3: Missing Post-Phase Changes
**What goes wrong:** VERIFICATION.md for Phase 3 only references the original Phase 3 code, missing improvements made in Phases 11 and 12 (e.g., system message detection, combined steps, theme-aware text color).
**Why it happens:** Later phases enhanced Phase 3 components (MessageBubble, message.css, etc.).
**How to avoid:** The requirement description is the test -- verify against what the requirement says, not what the original phase planned. If Phase 12 added `isSystemMessage` to MessageBubble, that's still evidence for PLAY-04 (visual distinction).
**Warning signs:** Evidence that references only original Phase 3 commits and ignores later enhancements.

### Pitfall 4: Not Accounting for Dual Navigation Paths
**What goes wrong:** PLAY-02, PLAY-03 verification only covers single-session navigation (Phase 4's `useKeyboardNavigation` + `navigationStore`) but misses the multi-session playback path (Phase 8's `usePlaybackKeyboardNavigation` + `playbackStore`).
**Why it happens:** Phase 4 originally implemented single-session navigation. Phase 8 added a parallel implementation for multi-session playback.
**How to avoid:** Verify BOTH navigation paths. The requirement says "User can step forward" -- this applies to both single-session and multi-session Player modes.
**Warning signs:** Only `navigationStore` referenced, no mention of `playbackStore`.

### Pitfall 5: PLAY-11 Progress Indicator Has Three Components
**What goes wrong:** Verification only mentions one progress indicator component.
**Why it happens:** PLAY-11 says "section name, step N of M, overall progress bar" which is satisfied by a combination of components across different modes.
**How to avoid:** Verify all three: `ProgressIndicator.tsx` (single-session: Step N/M + bar), `SegmentedProgress.tsx` (multi-session: section name + local/global + segmented bar), and `SectionSidebar.tsx` (section navigation for jump-to-section).
**Warning signs:** Only one progress component mentioned.

## Code Examples

No code examples needed -- this phase creates documentation files, not code.

## State of the Art

Not applicable -- documentation/verification patterns are project-internal conventions, not evolving technology.

## Open Questions

1. **Whether to create a Phase 13 VERIFICATION.md as well**
   - What we know: Phase 13 is a gap closure phase that creates VERIFICATION.md files for Phases 3 and 4
   - What's unclear: Does Phase 13 itself need a VERIFICATION.md?
   - Recommendation: The success criteria are checkable (files exist, boxes checked, 38/38 count). A brief Phase 13 VERIFICATION.md confirming all 4 success criteria would be consistent with the pattern, but is optional since the evidence is the existence of the Phase 3 and Phase 4 VERIFICATION.md files themselves.

2. **Traceability table Phase column updates**
   - What we know: The traceability table currently shows these requirements assigned to various original phases with "Complete" status, AND separately listed under Phase 13 as "Pending"
   - What's unclear: After gap closure, should the traceability table show the original phase or Phase 13?
   - Recommendation: Keep the current approach -- the REQUIREMENTS.md already shows "Phase 13 (gap closure)" as the phase and "Pending" as the status. Update status from "Pending" to "Complete".

## Sources

### Primary (HIGH confidence)
- `D:/Code/PromptPlayer/.planning/v1.0-MILESTONE-AUDIT.md` -- identifies all 8 gaps with root cause analysis
- `D:/Code/PromptPlayer/.planning/REQUIREMENTS.md` -- current checkbox and traceability state
- `D:/Code/PromptPlayer/.planning/ROADMAP.md` -- Phase 13 definition with success criteria
- Phase 3 summaries (03-01, 03-02, 03-03) -- what was built and verified at build time
- Phase 4 summaries (04-01, 04-02) -- what was built and verified at build time
- Existing VERIFICATION.md files (Phases 8, 9) -- format template

### Secondary (HIGH confidence)
- Source files for all 8 requirements (read during research) -- confirmed implementations exist
- `D:/Code/PromptPlayer/.planning/STATE.md` -- accumulated decisions that may have modified Phase 3/4 components

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no stack decisions needed; pure documentation
- Architecture: HIGH -- VERIFICATION.md format is well-established with 10 examples
- Pitfalls: HIGH -- identified from direct analysis of source files and audit report

**Research date:** 2026-03-04
**Valid until:** No expiry -- documentation conventions are stable
