# Roadmap: PromptPlayer

## Overview

PromptPlayer transforms Claude Code JSONL conversation files into curated, step-through presentation demos. The roadmap builds from the inside out: first the data pipeline that parses raw JSONL, then the rendering engine that makes it readable, then navigation that makes it steppable, then the Builder that lets presenters curate multi-session demos, and finally the Player features that make presentations polished and projector-ready. Eleven phases deliver all 38 v1 requirements through a sequence of coherent, verifiable capabilities.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: App Shell** - Electron scaffold with two-mode home screen
- [x] **Phase 2: Data Pipeline** - JSONL parsing, UUID stitching, content extraction, app-local storage
- [x] **Phase 3: Message Rendering** - Visual message display with markdown, syntax highlighting, and tool call filtering
- [x] **Phase 4: Single-Session Navigation** - Step forward/back through one conversation with progress tracking
- [x] **Phase 5: Builder Session Management** - Import, browse, search, and preview conversation sessions
- [x] **Phase 6: Builder Presentation Assembly** - Create and organize multi-session presentations with sections
- [x] **Phase 7: Builder Configuration and Export** - Configure display options, export .promptplay files, re-edit saved files (completed 2026-02-25)
- [x] **Phase 8: Player Multi-Session Playback** - Open .promptplay files, seamless session transitions, section navigation
- [ ] **Phase 9: Specialized Tool Call Display** - AskUserQuestion and Task management tool call rendering
- [ ] **Phase 10: Packaging and Release** - Windows installer, GitHub Actions CI/CD, .promptplay file association
- [ ] **Phase 11: Player Polish** - Timestamps and theme application

## Phase Details

### Phase 1: App Shell
**Goal**: A running Electron app on Windows with a home screen that routes to Builder or Player mode
**Depends on**: Nothing (first phase)
**Requirements**: SHELL-01, SHELL-02
**Success Criteria** (what must be TRUE):
  1. App launches on Windows 10/11 without errors
  2. User sees a home screen with clear options to enter Builder mode or Player mode
  3. Selecting Builder or Player navigates to the respective mode (placeholder content is fine)
  4. App window is resizable and has standard window controls (minimize, maximize, close)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Electron + React + TypeScript scaffold with electron-vite, frameless window, IPC, theme system, routing
- [x] 01-02-PLAN.md -- Home screen with Builder/Player mode cards, custom titlebar, recent files

### Phase 2: Data Pipeline
**Goal**: Raw JSONL conversation files are discovered, parsed into structured ordered message sequences with tool call classification, and browsable in Builder mode. Sessions added to presentations persist in app-local storage.
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, SHELL-04
**Success Criteria** (what must be TRUE):
  1. User can browse sessions discovered from ~/.claude/projects/ (or a custom directory)
  2. Imported conversations persist between app launches (stored in app-local storage)
  3. Messages appear in correct conversational order (parentUuid chain resolved), with sidechain messages excluded
  4. Malformed or incomplete JSONL lines are skipped without crashing the app
  5. Each parsed message has its content blocks (text, thinking, tool_use, tool_result) and timestamp extracted
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md -- Pipeline types, JSONL parser with assistant turn reassembly, stitcher, and classifier
- [x] 02-02-PLAN.md -- Session discovery with fast metadata scan and app-local storage layer
- [x] 02-03-PLAN.md -- IPC bridge (main handlers, preload, renderer types) and Zustand session store
- [x] 02-04-PLAN.md -- Builder session browse UI with end-to-end pipeline verification

### Phase 3: Message Rendering
**Goal**: Parsed messages render as a readable, visually distinct conversation optimized for screen sharing
**Depends on**: Phase 2
**Requirements**: PLAY-04, PLAY-05, PLAY-06, PLAY-09, PLAY-15
**Success Criteria** (what must be TRUE):
  1. User messages and Claude responses are visually distinct (different styling, layout, or color treatment)
  2. Claude's markdown responses render with proper headings, lists, bold, italic, links, and tables
  3. Code blocks render with syntax highlighting appropriate to the language specified
  4. Plumbing tool calls (Read, Grep, Glob, Write, Edit, Bash) are hidden by default in the rendered output
  5. Text is readable at screen-sharing distance (large base font, high contrast, clean layout)
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md -- Rendering infrastructure: install deps, MarkdownRenderer, CodeBlock, presentation CSS, shiki dual-theme CSS
- [x] 03-02-PLAN.md -- Message components: ThinkingBlock, ToolCallBlock, ContentBlockRenderer, MessageBubble, MessageList, visibility filtering
- [x] 03-03-PLAN.md -- Builder integration: wire MessageList into session detail panel, visual verification checkpoint

### Phase 4: Single-Session Navigation
**Goal**: User can step forward and backward through a single conversation using keyboard or mouse
**Depends on**: Phase 3
**Requirements**: PLAY-02, PLAY-03, PLAY-11
**Success Criteria** (what must be TRUE):
  1. User can step forward through messages with right arrow, spacebar, or click
  2. User can step backward through messages with left arrow
  3. Navigation skips hidden plumbing tool calls (only stops on narrative messages)
  4. Progress indicator displays current step N of M within the conversation
  5. Forward and backward are exact inverses (forward then back returns to the same message)
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md -- Navigation data layer: NavigationStep type, shared message filtering utility, step pairing logic, Zustand navigation store
- [x] 04-02-PLAN.md -- Player UI: keyboard/mouse navigation, collapsible step view, progress indicator, slideshow-style rendering

### Phase 5: Builder Session Management
**Goal**: User can import, browse, search, and preview conversation sessions in Builder mode
**Depends on**: Phase 4
**Requirements**: BLDR-01, BLDR-02, BLDR-03
**Success Criteria** (what must be TRUE):
  1. Builder mode displays a list of all imported conversation sessions with identifying information
  2. User can click a session to preview its conversation content before adding it to a presentation
  3. User can search or filter sessions by date, content keywords, or project
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md -- Data layer: lastTimestamp metadata, file import IPC, drag-drop path extraction, content search, filtering utilities
- [x] 05-02-PLAN.md -- UI: SearchFilterBar, ImportDropZone, enhanced SessionCard/List with view switching, Builder integration
- [x] 05-03-PLAN.md -- Preview: SessionPreviewHeader with summary stats, file-not-found handling, visual verification checkpoint

### Phase 6: Builder Presentation Assembly
**Goal**: User can create an ordered, sectioned presentation from selected conversation sessions
**Depends on**: Phase 5
**Requirements**: BLDR-04, BLDR-05, BLDR-06, BLDR-07
**Success Criteria** (what must be TRUE):
  1. User can create a new presentation by selecting sessions from the imported library
  2. User can reorder sessions within a presentation via drag-and-drop or equivalent interaction
  3. User can define named sections/chapters that group consecutive sessions (e.g., "Research", "Execution")
  4. User can rename sections and sessions with display-friendly labels
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md -- Presentation types, utility functions, main-process persistence, IPC bridge
- [x] 06-02-PLAN.md -- Presentation Zustand store, session selection state, selectable SessionCard/List
- [x] 06-03-PLAN.md -- Assembly UI: InlineEdit, outline components, PresentationList, two-view Builder

### Phase 7: Builder Configuration and Export
**Goal**: User can configure display options and export a self-contained .promptplay file
**Depends on**: Phase 6
**Requirements**: BLDR-08, BLDR-09, BLDR-10, BLDR-11, BLDR-12
**Success Criteria** (what must be TRUE):
  1. User can configure which tool call types are visible vs hidden for the presentation
  2. User can toggle timestamp display on/off for the presentation
  3. User can select light or dark theme for the presentation
  4. User can export the presentation as a self-contained .promptplay file containing all data
  5. User can open a previously exported .promptplay file in Builder mode and edit it
**Plans**: 6 plans

Plans:
- [x] 07-01-PLAN.md -- Types, tool categories, defaults, filterWithToolSettings, settings backfill
- [x] 07-02-PLAN.md -- Settings panel UI with tool visibility, timestamp toggle, theme selector, live preview
- [x] 07-03-PLAN.md -- Export/import IPC handlers, .promptplay file format, save/open dialogs
- [x] 07-04-PLAN.md -- Import workflow, re-edit capabilities, Ctrl+S/Ctrl+Shift+S keyboard shortcuts
- [ ] 07-05-PLAN.md -- Gap closure: parse and save sessions to storage during presentation creation (export data fix)
- [ ] 07-06-PLAN.md -- Gap closure: button overlap fix, visible Save/Save As buttons, click-to-preview in assembly

### Phase 8: Player Multi-Session Playback
**Goal**: Player opens .promptplay files and navigates seamlessly across session boundaries with section support
**Depends on**: Phase 7
**Requirements**: PLAY-01, PLAY-10, PLAY-12
**Success Criteria** (what must be TRUE):
  1. Player opens a .promptplay file and renders the first step of the presentation
  2. Navigation crosses session boundaries seamlessly (no jarring reload or gap between sessions)
  3. Section/chapter markers are visible during playback
  4. User can jump directly to any section from a section navigation control
  5. Progress indicator shows section name and overall progress across the full presentation
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md -- Playback types (PlaybackStep union) and Zustand playback store with buildPlaybackSteps, navigation, sidebar state
- [x] 08-02-PLAN.md -- PlaybackPlayer, PresentationOverview, SeparatorCard, playback keyboard hook, Player route multi-session dispatch
- [x] 08-03-PLAN.md -- SectionSidebar with jump navigation, SegmentedProgress bar, PlaybackPlayer integration

### Phase 9: Specialized Tool Call Display
**Goal**: Narrative tool calls (AskUserQuestion, Task management) render with meaningful, presentation-quality formatting
**Depends on**: Phase 8
**Requirements**: PLAY-07, PLAY-08
**Success Criteria** (what must be TRUE):
  1. AskUserQuestion tool calls display as interactive-looking prompts showing the question, available options, and which option the user selected
  2. TaskCreate tool calls display with the task description and any relevant metadata
  3. TaskUpdate tool calls display showing what changed (status updates, completions)
  4. TaskList tool calls display as a formatted task summary
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md -- AskUserQuestionBlock with header labels, expandable options, selected answer highlighting, multi-question support
- [ ] 09-02-PLAN.md -- TaskCreateBlock, TaskUpdateBlock, TaskListBlock with status-aware formatting and dispatch wiring

### Phase 10: Packaging and Release
**Goal**: App is packaged as a distributable Windows installer with CI/CD pipeline and OS file association
**Depends on**: Phase 9
**Requirements**: SHELL-03
**Success Criteria** (what must be TRUE):
  1. electron-builder (or equivalent) produces a Windows installer (.exe) or portable executable
  2. GitHub Actions workflow builds the app on push/tag and publishes release artifacts
  3. Packaged app runs correctly (CSP, asset paths, shiki WASM bundling all work in production)
  4. User can double-click a .promptplay file in Windows Explorer to open it directly in the Player
**Plans**: TBD

Plans:
- [ ] 10-01: electron-builder configuration and Windows packaging
- [ ] 10-02: GitHub Actions CI/CD workflow (build, test, release)
- [ ] 10-03: .promptplay file association and OS integration (SHELL-03)

### Phase 11: Player Polish
**Goal**: Player delivers a fully polished presentation experience with timestamps and themes
**Depends on**: Phase 10
**Requirements**: PLAY-13, PLAY-14
**Success Criteria** (what must be TRUE):
  1. Timestamps display between steps when enabled, showing original time and/or elapsed time between messages
  2. Light and dark themes apply correctly based on the presentation's configured theme
**Plans**: TBD

Plans:
- [ ] 11-01: Timestamp display (original time and elapsed time between steps)
- [ ] 11-02: Theme engine (light and dark theme application from presentation config)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. App Shell | 2/2 | Complete | 2026-02-20 |
| 2. Data Pipeline | 4/4 | Complete | 2026-02-21 |
| 3. Message Rendering | 3/3 | Complete | 2026-02-22 |
| 4. Single-Session Navigation | 2/2 | Complete | 2026-02-22 |
| 5. Builder Session Management | 3/3 | Complete | 2026-02-22 |
| 6. Builder Presentation Assembly | 3/3 | Complete | 2026-02-24 |
| 7. Builder Configuration and Export | 0/4 | Complete    | 2026-02-25 |
| 8. Player Multi-Session Playback | 3/3 | Complete | - |
| 9. Specialized Tool Call Display | 1/2 | In progress | - |
| 10. Packaging and Release | 0/3 | Not started | - |
| 11. Player Polish | 0/2 | Not started | - |

---
*Roadmap created: 2026-02-20*
*Last updated: 2026-02-28 -- Phase 9 plan 01 complete (AskUserQuestionBlock)*
