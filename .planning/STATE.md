# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Enable a presenter to walk their team through a real Claude Code / GSD workflow step by step
**Current focus:** Phase 6 - Builder Presentation Assembly (plan 2 of 3 complete)

## Current Position

Phase: 6 of 11 (Builder Presentation Assembly)
Plan: 2 of 3 complete
Status: In progress
Last activity: 2026-02-22 - Completed 06-02-PLAN.md (presentation store and session selection)

Progress: [███████████████████████████████████████░░] 17/36 plans (~47%)

## Performance Metrics

**Velocity:**
- Total plans completed: 17
- Average duration: 7min
- Total execution time: 1.82 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. App Shell | 2/2 | 14min | 7min |
| 2. Data Pipeline | 4/4 | 18min | 4.5min |
| 3. Message Rendering | 3/3 | 36min | 12min |
| 4. Single-Session Nav | 2/2 | 42min | 21min |
| 5. Builder Session Mgmt | 3/3 | 12min | 4min |
| 6. Builder Presentation Assembly | 2/3 | 7min | 3.5min |

**Recent Trend:**
- Last 5 plans: 4min, 5min, 3min, 3min, 4min
- Trend: Data layer plans consistently fast (~3-4min)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Electron + React + TypeScript stack (from research phase)
- Roadmap: 5-stage pipeline architecture (Parser -> Stitcher -> Classifier -> Engine -> Controller)
- Roadmap: Builder and Player share rendering components (Phase 5 reuses Phase 3 renderers)
- 01-01: electron-vite 3.x (not 5.x) -- resolved from npm, works with Electron 40 + Vite 6
- 01-01: JSON file persistence instead of electron-store (ESM/CJS incompatibility)
- 01-01: React.JSX.Element return types for React 19 compatibility
- 01-01: moduleResolution: bundler in tsconfig.node.json for @tailwindcss/vite
- 01-02: RootLayout with Outlet for nested routing (Titlebar shared across all routes)
- 01-02: WindowControls extracted as separate component from Titlebar
- 02-01: Thinking-only messages classified as plumbing (hidden by default)
- 02-01: Unknown tools default to 'unknown' visibility (shown by default -- safe behavior)
- 02-01: Parser returns unordered messages; ordering is stitcher's responsibility
- 02-01: pairToolResults runs post-stitch so tool_use always precedes tool_result
- 02-02: Deferred app.getPath('userData') resolution via function instead of module-level constant (avoids crash before app.whenReady)
- 02-02: 50-line scan limit for fast metadata extraction (later increased to 150 in 02-04)
- 02-02: Error-as-data pattern (parseError field) instead of thrown exceptions for unreadable files
- 02-03: Preload uses unknown return types -- thin bridge, renderer types provide actual typing
- 02-03: pipeline:parseSession runs full pipeline in one IPC call (parse -> stitch+classify -> return)
- 02-03: Zustand store refreshes storedSessions after save/remove for consistency
- 02-04: Command name preferred over first user message for session identification (GSD sessions show /gsd:command instead of first reply)
- 02-04: Boring commands (/clear, /help, /compact, /init) skipped in snippet extraction
- 02-04: Project groups sorted by most recent session, not alphabetically
- 02-04: Metadata scan increased from 50 to 150 lines for better coverage
- 03-01: MarkdownHooks (not sync Markdown) for async @shikijs/rehype plugin compatibility
- 03-01: Module-level stable refs for plugin/component config to avoid re-creation
- 03-01: MutationObserver in CodeBlock for overflow detection after async shiki DOM mutation
- 03-02: User text rendered as pre-wrapped plain text, not markdown (shows what user actually typed)
- 03-02: ContentBlockRenderer plainText prop for user vs assistant rendering distinction
- 03-02: Mixed-content plumbing messages still shown -- text is valuable even when tool blocks hidden
- 03-02: filterVisibleMessages is a module-level pure function (testable, no re-creation)
- 03-03: wasm-unsafe-eval in CSP (not JS engine) for shiki — user chose accuracy over avoiding CSP change
- 03-03: Builder preview uses 14px base font; Player will use 20px via .presentation-mode CSS class
- 03-03: System XML cleaned from user messages (cleanUserText.ts utility)
- 03-03: AskUserQuestion rendered with question + option chips; user answers as accent-colored chips
- 03-03: Tool rejections parsed to show user's stated reason as italic text
- 03-03: tool_result.content must always be normalized (can be string OR array of objects)
- 03-03: Tool rejections classified as narrative (is_error + startsWith, not includes — prevents grep false positives)
- 03-03: Task, Skill, WebSearch, WebFetch, EnterPlanMode, etc. added to plumbing tools
- 03-03: [Request interrupted by user for tool use] stripped as system noise
- 04-01: NavigationStep uses explicit userMessage/assistantMessage fields (not generic pair) for role-specific rendering
- 04-01: Solo assistant messages produce { userMessage: null, assistantMessage: msg } -- never placed in userMessage field
- 04-01: Expand/collapse state stored in Zustand (persists across step navigation), not component state
- 04-01: initializeSteps filters with showPlumbing=false then builds steps (Player never shows plumbing)
- 04-01: filterVisibleMessages and buildToolUseMap extracted from MessageList to shared utils/messageFiltering.ts
- 05-01: extractLastTimestamp uses tail-read (last 4096 bytes via FileHandle) to avoid full-file scan
- 05-01: deriveProjectFolder uses basename(dirname(filePath)) as fallback project name for imported files
- 05-01: matchesSearch/matchesDateFilter kept module-private; only filterSessions, DatePreset, DateFilter exported
- 05-02: Import toast uses simple React state with 3s auto-dismiss (no toast library)
- 05-02: ImportDropZone filters for .jsonl at both File and path levels
- 05-02: Active session highlight uses accent-subtle bg + accent border from theme tokens
- 05-03: Preview header uses two-tier layout: compact stats row (Messages/Steps/Duration) + full-width rows (Project/Command)
- 05-03: SessionCard scrollIntoView on programmatic activation (import auto-select)
- 05-03: Import auto-selects first imported session even for duplicates (shows user where it is)
- 06-01: GSD commands use kebab-to-title-case conversion for display names (/gsd:plan-phase 3 -> "Plan Phase 3")
- 06-01: Missing sortKeys sort last in chronological ordering
- 06-01: Presentation IPC uses presentation:* namespace (distinct from pipeline:* for sessions)
- 06-02: persistPresentation helper encapsulates IPC save + local state update for all mutations
- 06-02: setSelecting(false) auto-clears selectedSessionIds to prevent stale selections
- 06-02: Selected cards reuse accent-subtle bg + accent border from active session highlight pattern

### Pending Todos

- Player UX feedback (5 items) — see `.planning/todos/pending/player-ux-feedback.md`
  - "Show more" button visible when nothing to expand
  - Broken box/border rendering (CHECKPOINT, HR patterns)
  - System-generated messages showing as "YOU"
  - Consecutive solo Claude steps could be combined
  - Step sequencing needs design thought
- Builder UX feedback (1 item) — see `.planning/todos/pending/builder-ux-feedback.md`
  - Date filter presets: "This Week"/"This Month" vs "Last 7 days"/"Last 30 days" naming

### Blockers/Concerns

- ~~Claude Code JSONL schema must be verified against real files before finalizing Parser (Phase 2)~~ RESOLVED: schema verified in 02-RESEARCH.md against 64 real files
- ~~npm package versions need verification before project scaffold (Phase 1)~~ RESOLVED: versions verified during 01-01 execution
- AskUserQuestion tool call schema assumed but unverified (Phase 9)
- electron-store v11 ESM-only incompatible with electron-vite 3.x CJS output -- using JSON file fallback
- npm audit reports 10 high severity vulnerabilities in eslint dependency chain -- review before packaging
- ~~Stitcher orphan count always equals message count~~ FIXED (16a2857): Root cause was assistant turn reassembly destroying intermediate UUIDs, not childOf overwrite. Fix splits reassembly at user-message boundaries and adds multi-child support to stitcher. 0 orphans across all 15 test sessions.
- Metadata scan message count differs from full parse count (expected: scan approximates, full parse does assistant turn reassembly). Not a bug, but worth documenting for users.
- Renderer bundle at 810KB includes all shiki grammars -- consider fine-grained bundling if size becomes a concern
- **Message filtering confidence**: User expressed partial confidence in visibility filtering. Some edge cases may remain — consecutive Claude messages with no visible user interaction look odd but are technically correct (all plumbing hidden). May need a "collapsed plumbing" indicator in future.
- **queue-operation messages not parsed**: User messages typed while agents are running are stored as queue-operation lines, not as type:"user" lines. These are currently lost in the parsed conversation. Needs parser change to extract enqueued content.

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 06-02-PLAN.md (presentation store and session selection)
Resume file: none
