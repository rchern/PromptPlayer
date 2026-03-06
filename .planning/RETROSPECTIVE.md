# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — PromptPlayer MVP

**Shipped:** 2026-03-05
**Phases:** 13 | **Plans:** 47 | **Requirements:** 38/38

### What Was Built
- Full two-mode Electron desktop app: Builder (import, curate, configure) + Player (step-through presentation)
- Complete JSONL data pipeline: parser with assistant turn reassembly, UUID stitcher, tool classifier
- Markdown rendering with shiki syntax highlighting, tool call filtering, presentation-optimized typography
- Multi-session playback with section navigation, segmented progress, seamless session transitions
- Self-contained `.promptplay` file format with export/import/re-edit workflow
- Specialized renderers for AskUserQuestion prompts and Task management tool calls
- Windows installer (NSIS), GitHub Actions CI/CD, file association, auto-updater
- Light/dark theme, elapsed time markers, combined assistant steps, system message detection

### What Worked
- **Wave-based parallel execution** — Plans in the same wave ran concurrently, cutting wall-clock time significantly (e.g., Phase 12's 10 plans across 4 waves)
- **Inside-out architecture** — Building data pipeline → rendering → navigation → Builder → Player meant each layer had a stable foundation
- **Checkpoint verification after each phase** — Caught integration issues early (e.g., Phase 7 checkpoint found 4 gap items that became plans 07-05 and 07-06)
- **UAT-driven gap closure** — Phases 11-12 used UAT rounds to surface real UX issues, which became targeted fix plans
- **Code reuse between modes** — Builder preview and Player share MessageBubble, MarkdownRenderer, CodeBlock, filtering utils

### What Was Inefficient
- **Phase 3/4 verification gap** — 8 requirements were implemented but never formally verified, requiring Phase 13 as pure documentation catch-up. Root cause: early phases didn't have the verification workflow established yet
- **Verifier agent (sonnet) struggles with new file creation** — Spiraled into bizarre workarounds when creating VERIFICATION.md files. Mitigated by overriding to opus
- **Some plans produced overly detailed summaries** — SUMMARY.md one-liner extraction failed for many plans because format wasn't consistent early on
- **4 debug sessions left open** — blank-combined-steps, close-button-flicker, empty-recent-files, live-preview-reactivity never fully resolved

### Patterns Established
- `filterVisibleMessages` as module-level pure function for testability
- Module-level style constants to avoid re-creation in render loops
- Error-as-data pattern (parseError fields) instead of thrown exceptions for file parsing
- JSON file persistence over electron-store (ESM/CJS compatibility workaround)
- MutationObserver pattern for measuring DOM after async rendering (CodeBlock, CollapsibleContent)
- Separator cards as real navigable steps for exact forward/back inverse guarantee

### Key Lessons
1. **Verify as you go** — Skipping formal verification early creates a documentation debt that requires its own phase to close
2. **Override model for verifier agents** — Sonnet struggles with file creation; opus handles it cleanly
3. **Checkpoint gates pay for themselves** — Every checkpoint that caught issues saved a full debug cycle later
4. **Bundle size deserves early attention** — 810KB shiki bundle was noted but never addressed; should be evaluated before it compounds
5. **gap_closure plans are cheap** — Small, focused fix plans (1-2 tasks) execute in 1-3 minutes and keep quality high

### Cost Observations
- Model mix: ~85% opus (executor, orchestrator), ~10% sonnet (verifier attempts), ~5% haiku (none used)
- Execution time: ~2.4 hours of agent execution across 47 plans
- Wall-clock: 13 calendar days (part-time development)
- Notable: Phase 12 (10 plans) executed faster than Phase 4 (2 plans) due to plan maturity and smaller scope per plan

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 13 | 47 | Established GSD workflow, wave parallelization, checkpoint verification |

### Cumulative Quality

| Milestone | Requirements | Verified | Gap Closure Plans |
|-----------|-------------|----------|-------------------|
| v1.0 | 38 | 38/38 | 9 (07-05, 07-06, 11-03, 11-04, 12-06..12-10) |

### Top Lessons (Verified Across Milestones)

1. Verify requirements as each phase completes — don't batch at end
2. Override verifier agent to opus for any task that creates new files
