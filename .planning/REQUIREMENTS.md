# Requirements: PromptPlayer

**Defined:** 2026-02-20
**Core Value:** Enable a presenter to walk their team through a real Claude Code / GSD workflow step by step

## v1 Requirements

### Data Pipeline

- [x] **DATA-01**: App can import JSONL conversation files from `.claude/projects/` directory
- [x] **DATA-02**: Imported conversations are stored in app-local storage independent of source files
- [x] **DATA-03**: JSONL parser correctly extracts message sequence from parentUuid chain
- [x] **DATA-04**: Parser filters out sidechain messages (isSidechain = true)
- [x] **DATA-05**: Parser handles malformed or incomplete JSONL lines gracefully (skip, don't crash)
- [x] **DATA-06**: Parser extracts content blocks from messages (text, thinking, tool_use, tool_result)
- [x] **DATA-07**: Parser extracts timestamps from each message

### Builder

- [x] **BLDR-01**: Builder mode provides a list of imported conversation sessions
- [x] **BLDR-02**: User can preview a conversation session before adding it to a presentation
- [x] **BLDR-03**: User can search/filter imported sessions (by date, content, or project)
- [x] **BLDR-04**: User can create a new presentation by selecting and ordering sessions
- [x] **BLDR-05**: User can reorder sessions within a presentation via drag-and-drop or similar
- [x] **BLDR-06**: User can define named sections/chapters that group sessions (e.g., "Questioning", "Research", "Execution")
- [x] **BLDR-07**: User can rename sections and sessions with display-friendly labels
- [x] **BLDR-08**: User can configure which tool call types are visible vs hidden per presentation
- [x] **BLDR-09**: User can toggle timestamp display on/off per presentation
- [x] **BLDR-10**: User can select light or dark theme for the presentation
- [x] **BLDR-11**: User can export a self-contained `.promptplay` file containing all presentation data
- [x] **BLDR-12**: User can open and edit previously saved `.promptplay` files

### Player

- [x] **PLAY-01**: Player opens `.promptplay` files and renders the presentation
- [ ] **PLAY-02**: User can step forward through messages with right arrow, spacebar, or click
- [ ] **PLAY-03**: User can step backward through messages with left arrow
- [ ] **PLAY-04**: User messages are visually distinct from Claude responses (different styling/layout)
- [ ] **PLAY-05**: Claude's markdown responses render with proper formatting (headings, lists, bold, italic, links, tables)
- [ ] **PLAY-06**: Code blocks render with syntax highlighting appropriate to the language
- [x] **PLAY-07**: AskUserQuestion tool calls display as interactive-looking prompts showing the question, options, and the user's selection
- [ ] **PLAY-08**: Task management tool calls (TaskCreate, TaskUpdate, TaskList) display inline with meaningful formatting
- [ ] **PLAY-09**: Plumbing tool calls (Read, Grep, Glob, Write, Edit, Bash, etc.) are hidden by default
- [x] **PLAY-10**: Player transitions seamlessly between sessions in the chain (no jarring reloads)
- [ ] **PLAY-11**: Progress indicator shows current position: section name, step N of M, overall progress bar
- [x] **PLAY-12**: Section/chapter markers are visible; user can jump to a section
- [ ] **PLAY-13**: Timestamps display between steps when enabled (showing original time and/or elapsed time)
- [ ] **PLAY-14**: Light and dark theme applied based on presentation config
- [ ] **PLAY-15**: Typography is optimized for screen sharing / projector readability (large fonts, good contrast)

### App Shell

- [x] **SHELL-01**: Electron app runs on Windows 10/11
- [x] **SHELL-02**: App opens to a home screen where user can choose Builder or Player mode
- [ ] **SHELL-03**: App can open `.promptplay` files directly (double-click or "Open with")
- [x] **SHELL-04**: App persists imported sessions and saved presentations between launches

## v2 Requirements

### Presenter Tools

- **PRES-01**: User can add per-step presenter notes visible only in a notes panel
- **PRES-02**: Dual-screen presenter mode (presentation window + presenter notes/controls window)
- **PRES-03**: Collapsible/expandable tool call details (expand to show full parameters/results)

### Advanced Navigation

- **NAV-01**: Search within loaded conversation content (Ctrl+F), jump to matching step
- **NAV-02**: Deep link to a specific step via URL fragment (e.g., `#section-2/step-15`)
- **NAV-03**: Animated/typewriter message reveal for dramatic pacing

### Playback

- **PBCK-01**: Auto-play mode with dynamic timer based on message length/word count
- **PBCK-02**: Adjustable speed multiplier for auto-play
- **PBCK-03**: Pause/resume during auto-play

### Advanced Display

- **DISP-01**: Code diff view for Edit tool calls (show old_string -> new_string as highlighted diff)
- **DISP-02**: File tree / artifact summary panel showing files created/modified during the conversation
- **DISP-03**: Static HTML export for async sharing without the app

### Session Discovery

- **DISC-01**: Search interface to find sessions by content (e.g., all chats using `/gsd:*` commands)
- **DISC-02**: Auto-detect related sessions (same project, similar timeframe)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Conversation editing | Authenticity is the value proposition |
| Live Claude API integration | Replay tool, not an IDE |
| Real-time collaboration | Single presenter tool |
| Mobile support | Desktop presentation tool only |
| Plugin / extension system | Premature abstraction; scope is well-defined |
| Built-in video/audio recording | OBS/Loom do this better; separate concern |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 2 | Complete |
| DATA-05 | Phase 2 | Complete |
| DATA-06 | Phase 2 | Complete |
| DATA-07 | Phase 2 | Complete |
| BLDR-01 | Phase 5 | Complete |
| BLDR-02 | Phase 5 | Complete |
| BLDR-03 | Phase 5 | Complete |
| BLDR-04 | Phase 6 | Complete |
| BLDR-05 | Phase 6 | Complete |
| BLDR-06 | Phase 6 | Complete |
| BLDR-07 | Phase 6 | Complete |
| BLDR-08 | Phase 7 | Complete |
| BLDR-09 | Phase 7 | Complete |
| BLDR-10 | Phase 7 | Complete |
| BLDR-11 | Phase 7 | Complete |
| BLDR-12 | Phase 7 | Complete |
| PLAY-01 | Phase 8 | Complete |
| PLAY-02 | Phase 4 | Complete |
| PLAY-03 | Phase 4 | Complete |
| PLAY-04 | Phase 3 | Complete |
| PLAY-05 | Phase 3 | Complete |
| PLAY-06 | Phase 3 | Complete |
| PLAY-07 | Phase 9 | Complete |
| PLAY-08 | Phase 9 | Pending |
| PLAY-09 | Phase 3 | Complete |
| PLAY-10 | Phase 8 | Complete |
| PLAY-11 | Phase 4 | Complete |
| PLAY-12 | Phase 8 | Complete |
| PLAY-13 | Phase 11 | Pending |
| PLAY-14 | Phase 11 | Pending |
| PLAY-15 | Phase 3 | Complete |
| SHELL-01 | Phase 1 | Complete |
| SHELL-02 | Phase 1 | Complete |
| SHELL-03 | Phase 10 (Packaging) | Pending |
| SHELL-04 | Phase 2 | Complete |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-24 -- Phase 6 complete*
