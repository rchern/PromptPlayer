# Requirements: PromptPlayer

**Defined:** 2026-02-20
**Core Value:** Enable a presenter to walk their team through a real Claude Code / GSD workflow step by step

## v1 Requirements

### Data Pipeline

- [ ] **DATA-01**: App can import JSONL conversation files from `.claude/projects/` directory
- [ ] **DATA-02**: Imported conversations are stored in app-local storage independent of source files
- [ ] **DATA-03**: JSONL parser correctly extracts message sequence from parentUuid chain
- [ ] **DATA-04**: Parser filters out sidechain messages (isSidechain = true)
- [ ] **DATA-05**: Parser handles malformed or incomplete JSONL lines gracefully (skip, don't crash)
- [ ] **DATA-06**: Parser extracts content blocks from messages (text, thinking, tool_use, tool_result)
- [ ] **DATA-07**: Parser extracts timestamps from each message

### Builder

- [ ] **BLDR-01**: Builder mode provides a list of imported conversation sessions
- [ ] **BLDR-02**: User can preview a conversation session before adding it to a presentation
- [ ] **BLDR-03**: User can search/filter imported sessions (by date, content, or project)
- [ ] **BLDR-04**: User can create a new presentation by selecting and ordering sessions
- [ ] **BLDR-05**: User can reorder sessions within a presentation via drag-and-drop or similar
- [ ] **BLDR-06**: User can define named sections/chapters that group sessions (e.g., "Questioning", "Research", "Execution")
- [ ] **BLDR-07**: User can rename sections and sessions with display-friendly labels
- [ ] **BLDR-08**: User can configure which tool call types are visible vs hidden per presentation
- [ ] **BLDR-09**: User can toggle timestamp display on/off per presentation
- [ ] **BLDR-10**: User can select light or dark theme for the presentation
- [ ] **BLDR-11**: User can export a self-contained `.promptplay` file containing all presentation data
- [ ] **BLDR-12**: User can open and edit previously saved `.promptplay` files

### Player

- [ ] **PLAY-01**: Player opens `.promptplay` files and renders the presentation
- [ ] **PLAY-02**: User can step forward through messages with right arrow, spacebar, or click
- [ ] **PLAY-03**: User can step backward through messages with left arrow
- [ ] **PLAY-04**: User messages are visually distinct from Claude responses (different styling/layout)
- [ ] **PLAY-05**: Claude's markdown responses render with proper formatting (headings, lists, bold, italic, links, tables)
- [ ] **PLAY-06**: Code blocks render with syntax highlighting appropriate to the language
- [ ] **PLAY-07**: AskUserQuestion tool calls display as interactive-looking prompts showing the question, options, and the user's selection
- [ ] **PLAY-08**: Task management tool calls (TaskCreate, TaskUpdate, TaskList) display inline with meaningful formatting
- [ ] **PLAY-09**: Plumbing tool calls (Read, Grep, Glob, Write, Edit, Bash, etc.) are hidden by default
- [ ] **PLAY-10**: Player transitions seamlessly between sessions in the chain (no jarring reloads)
- [ ] **PLAY-11**: Progress indicator shows current position: section name, step N of M, overall progress bar
- [ ] **PLAY-12**: Section/chapter markers are visible; user can jump to a section
- [ ] **PLAY-13**: Timestamps display between steps when enabled (showing original time and/or elapsed time)
- [ ] **PLAY-14**: Light and dark theme applied based on presentation config
- [ ] **PLAY-15**: Typography is optimized for screen sharing / projector readability (large fonts, good contrast)

### App Shell

- [ ] **SHELL-01**: Electron app runs on Windows 10/11
- [ ] **SHELL-02**: App opens to a home screen where user can choose Builder or Player mode
- [ ] **SHELL-03**: App can open `.promptplay` files directly (double-click or "Open with")
- [ ] **SHELL-04**: App persists imported sessions and saved presentations between launches

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

- **DISP-01**: Code diff view for Edit tool calls (show old_string → new_string as highlighted diff)
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
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| DATA-03 | TBD | Pending |
| DATA-04 | TBD | Pending |
| DATA-05 | TBD | Pending |
| DATA-06 | TBD | Pending |
| DATA-07 | TBD | Pending |
| BLDR-01 | TBD | Pending |
| BLDR-02 | TBD | Pending |
| BLDR-03 | TBD | Pending |
| BLDR-04 | TBD | Pending |
| BLDR-05 | TBD | Pending |
| BLDR-06 | TBD | Pending |
| BLDR-07 | TBD | Pending |
| BLDR-08 | TBD | Pending |
| BLDR-09 | TBD | Pending |
| BLDR-10 | TBD | Pending |
| BLDR-11 | TBD | Pending |
| BLDR-12 | TBD | Pending |
| PLAY-01 | TBD | Pending |
| PLAY-02 | TBD | Pending |
| PLAY-03 | TBD | Pending |
| PLAY-04 | TBD | Pending |
| PLAY-05 | TBD | Pending |
| PLAY-06 | TBD | Pending |
| PLAY-07 | TBD | Pending |
| PLAY-08 | TBD | Pending |
| PLAY-09 | TBD | Pending |
| PLAY-10 | TBD | Pending |
| PLAY-11 | TBD | Pending |
| PLAY-12 | TBD | Pending |
| PLAY-13 | TBD | Pending |
| PLAY-14 | TBD | Pending |
| PLAY-15 | TBD | Pending |
| SHELL-01 | TBD | Pending |
| SHELL-02 | TBD | Pending |
| SHELL-03 | TBD | Pending |
| SHELL-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 0
- Unmapped: 38 (pending roadmap)

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after initial definition*
