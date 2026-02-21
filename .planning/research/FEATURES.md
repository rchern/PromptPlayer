# Feature Research: Conversation Replay & Presentation Tools

> **Research dimension:** Features
> **Project:** PromptPlayer — Step-through conversation replayer for Claude Code sessions
> **Date:** 2026-02-20

---

## Methodology

Analysis based on feature sets from established tools in adjacent categories:

- **Code presentation tools:** reveal.js, Spectacle, Slidev, carbon.now.sh
- **Chat/conversation replay:** Loom conversation replays, Slack thread viewers, chat log viewers, ChatGPT share links
- **Demo recording/playback:** Asciinema, VHS (charm.sh), TerminalReplay, ScriptReplay
- **Step-through tools:** Jupyter nbviewer, Observable notebooks, REPL-driven presentations
- **General presentation:** PowerPoint, Google Slides, Keynote (for baseline UX expectations)

---

## Table Stakes (Must Have or Users Leave)

These are non-negotiable. Without them, the tool is not functional for its core purpose.

### TS-1: Sequential Message Navigation (Forward/Back)

**What:** Presenter can advance forward and backward through conversation messages one step at a time.
**Why table stakes:** This IS the product. Without step-through navigation, it's just a static log viewer.
**Complexity:** Low
**Dependencies:** Requires message parsing (TS-3), message rendering (TS-4)

### TS-2: Keyboard Navigation

**What:** Arrow keys / spacebar / Page Up / Page Down to advance through steps. Standard presentation hotkeys.
**Why table stakes:** Every presentation tool supports keyboard nav. Presenters expect this reflexively. Clicking buttons during a live demo is slow and visually distracting.
**Complexity:** Low
**Dependencies:** TS-1

### TS-3: JSONL Conversation Parsing

**What:** Load and correctly parse Claude Code JSONL conversation files, extracting message roles, content, tool calls, and metadata.
**Why table stakes:** This is the data layer. Nothing works without it.
**Complexity:** Medium — JSONL structure may vary; tool call formats differ; need to handle malformed or incomplete sessions gracefully.
**Dependencies:** None (foundational)

### TS-4: Markdown Rendering

**What:** Render AI response content as formatted markdown — headings, bold/italic, lists, links, inline code.
**Why table stakes:** Claude responses are markdown. Displaying raw markdown text is unreadable at screen-sharing distance. Every chat viewer renders markdown.
**Complexity:** Low-Medium (use a library like marked/markdown-it + a sanitizer)
**Dependencies:** TS-3

### TS-5: Code Block Syntax Highlighting

**What:** Fenced code blocks render with language-appropriate syntax highlighting (C#, TypeScript, SQL, JSON, etc.).
**Why table stakes:** The audience is dev teams. Unhighlighted code is significantly harder to read, especially at screen-sharing distance. Every code presentation tool does this.
**Complexity:** Low (use Prism.js, highlight.js, or Shiki)
**Dependencies:** TS-4

### TS-6: Visual Distinction Between User and AI Messages

**What:** Clear visual differentiation between human prompts and AI responses — different background colors, alignment, labels, or styling.
**Why table stakes:** Without this, the audience cannot follow who said what. Every chat interface does this.
**Complexity:** Low
**Dependencies:** TS-4

### TS-7: Tool Call Visibility Control (Show Interactive, Hide Plumbing)

**What:** Show interactive/meaningful tool calls (AskUserQuestion, TaskCreate, TaskUpdate) as visible conversation steps. Hide plumbing tool calls (Read, Grep, Glob, Write, Edit, Bash) by default.
**Why table stakes:** This is a core differentiator of PromptPlayer vs. just reading a log file. Without filtering, the presenter must click through dozens of Read/Grep calls that add nothing to the narrative. The audience loses the thread.
**Complexity:** Medium — Need a classification system for tool call types; must be configurable (what counts as "plumbing" vs. "interesting" may vary by audience).
**Dependencies:** TS-3

### TS-8: Multi-Session Sequencing

**What:** Load multiple JSONL conversation files and present them as a single ordered walkthrough.
**Why table stakes (for this product):** The project context explicitly states demos chain 5-15+ separate conversation files. If the presenter has to manually open/close files, the tool fails its core use case.
**Complexity:** Medium-High — Need session ordering, transitions between sessions, possibly a playlist/manifest format.
**Dependencies:** TS-3, TS-1

### TS-9: Readable Typography at Screen-Sharing Distance

**What:** Font sizes, contrast ratios, and spacing designed for readability when projected or screen-shared (not just on a local monitor). Minimum effective body text ~18-20px, code ~16-18px.
**Why table stakes:** If the audience can't read it, the tool is useless. This is a presentation tool, not a personal reader.
**Complexity:** Low — Mostly CSS. But easy to get wrong if you design for local viewing only.
**Dependencies:** TS-4, TS-5

### TS-10: Progress Indicator

**What:** Show where the presenter is in the overall walkthrough — step N of M, or a progress bar, or session X of Y.
**Why table stakes:** Presenters need to know how far along they are. Audiences benefit from knowing scope. Every slideshow tool has this.
**Complexity:** Low
**Dependencies:** TS-1, TS-8

---

## Differentiators (Competitive Advantage)

These separate PromptPlayer from "just reading the log" or "just using slides." They are not required for v1 launch but provide significant value.

### D-1: Presenter Notes / Talking Points

**What:** Per-step annotations that only the presenter sees (on a second screen or in a notes panel). The presenter can add context, reminders, or narrative cues that aren't in the original conversation.
**Why differentiating:** Turns a replay tool into a presentation tool. reveal.js speaker notes are one of its most-used features. Without notes, the presenter must memorize their narrative or read off a separate document.
**Complexity:** Medium — Need a metadata/annotation layer that maps notes to conversation steps. Storage format decisions.
**Dependencies:** TS-1, TS-8

### D-2: Animated/Typewriter Message Reveal

**What:** AI responses appear progressively (word by word, line by line, or block by block) rather than showing the entire response at once.
**Why differentiating:** Creates dramatic pacing. Mimics the "watching Claude think" experience. Keeps audience attention focused on what's appearing NOW rather than scanning ahead. Asciinema and terminal replay tools do this to great effect.
**Complexity:** Medium-High — Need configurable speed, ability to skip/complete animation, interaction with markdown rendering (can't half-render a code block).
**Dependencies:** TS-4, TS-5

### D-3: Section / Chapter Markers

**What:** Group conversation steps into named sections (e.g., "Setup," "Feature Implementation," "Testing," "Refactoring"). Allow jumping to sections.
**Why differentiating:** Essential for longer demos (5-15+ sessions). Lets the presenter skip to relevant sections during Q&A or time-constrained presentations. Maps to how reveal.js uses vertical slides for sub-topics.
**Complexity:** Medium — Need section definition format, section navigation UI, integration with progress indicator.
**Dependencies:** TS-8, TS-10

### D-4: Collapsible/Expandable Tool Call Details

**What:** Tool calls that ARE shown (interactive ones) can be expanded to show full details (parameters, results) or collapsed to show just a summary. Plumbing tool calls that are hidden by default can be expanded on demand.
**Why differentiating:** Gives the presenter flexibility. During a high-level overview, keep things collapsed. When an audience member asks "what file did it edit?", expand on the spot.
**Complexity:** Medium
**Dependencies:** TS-7

### D-5: Theme / Appearance Customization

**What:** Dark mode / light mode toggle. Possibly branded themes (company colors). High-contrast mode for projectors in bright rooms.
**Why differentiating:** Presenters present in varied environments. A dark theme that looks great on a developer's monitor can be unreadable on a washed-out conference room projector. reveal.js ships multiple themes for this reason.
**Complexity:** Low-Medium (CSS custom properties / theme system)
**Dependencies:** TS-9

### D-6: Demo Manifest / Playlist File

**What:** A configuration file (YAML, JSON, or TOML) that defines: which JSONL files to load, their order, section names, which tool calls to show/hide, per-step notes, and presentation metadata.
**Why differentiating:** Makes demos repeatable and shareable. A presenter can hand their manifest to a colleague who can deliver the same demo. Without this, every demo requires manual setup.
**Complexity:** Medium — Schema design, validation, file picker vs. manifest loader UX.
**Dependencies:** TS-8, TS-7, D-1 (optional), D-3 (optional)

### D-7: Search Within Conversation

**What:** Cmd/Ctrl+F style search across all loaded conversation content. Jump to the step containing the search hit.
**Why differentiating:** During Q&A, a presenter may need to find a specific code snippet or message. Scrolling through 100+ steps is impractical.
**Complexity:** Medium
**Dependencies:** TS-3, TS-1

### D-8: Code Diff View for Edit Tool Calls

**What:** When a Write or Edit tool call is shown (either by default or when expanded), display the change as a syntax-highlighted diff rather than raw parameters.
**Why differentiating:** This is the "aha" moment for dev audiences — seeing exactly what Claude changed, in a familiar diff format. Much more informative than showing raw tool call JSON.
**Complexity:** Medium-High — Need to reconstruct before/after state, or parse Edit tool call old_string/new_string parameters into a diff.
**Dependencies:** TS-7, D-4, TS-5

### D-9: Presenter Mode + Audience Mode (Dual Screen)

**What:** Like PowerPoint Presenter View — one window shows the presentation, another shows presenter notes, upcoming steps, and navigation controls.
**Why differentiating:** Professional presenting capability. The presenter sees context the audience doesn't.
**Complexity:** High — Multi-window coordination, possibly via BroadcastChannel API or similar.
**Dependencies:** D-1, TS-1

### D-10: URL/Deep-Link to Specific Step

**What:** Each step has a unique URL fragment (e.g., `#session-2/step-15`). Shareable, bookmarkable.
**Why differentiating:** Useful for post-presentation reference ("go to this link to see the part where Claude refactored the service layer").
**Complexity:** Low-Medium
**Dependencies:** TS-1, TS-8

### D-11: Elapsed Time / Timestamp Display

**What:** Show the original timestamp of each message, and optionally the elapsed time between steps. Helps convey "this whole feature was built in 4 minutes."
**Why differentiating:** Time context is powerful for demonstrating AI productivity. The raw data is in the JSONL files.
**Complexity:** Low
**Dependencies:** TS-3

### D-12: File Tree / Artifact Summary Panel

**What:** A sidebar showing files that were created, modified, or read during the conversation. Updates as the presenter advances through steps.
**Why differentiating:** Gives the audience a sense of scope — "Claude touched 12 files across 3 projects to implement this feature." Provides spatial context that a linear chat log lacks.
**Complexity:** High — Need to parse tool calls to extract file paths, track state across steps, render a tree.
**Dependencies:** TS-3, TS-7

### D-13: Export to Static HTML

**What:** Export the current presentation (with all styling and content) as a self-contained HTML file that can be opened without running PromptPlayer.
**Why differentiating:** Enables async sharing. A presenter can email a demo to stakeholders who weren't in the meeting. reveal.js presentations work this way.
**Complexity:** High
**Dependencies:** All rendering features (TS-4, TS-5, TS-6, TS-9), TS-8

---

## Anti-Features (Deliberately Do NOT Build)

These are features that might seem obvious but would harm the product, distract from the core use case, or create maintenance burden disproportionate to value.

### AF-1: Real-Time Collaboration / Multi-User Editing

**Why not:** This is a presenter-driven tool, not a collaborative workspace. Adding real-time sync (CRDT, WebSockets, conflict resolution) is enormous complexity for a use case that doesn't exist. One person presents. Others watch.

### AF-2: Conversation Editing / Message Modification

**What to avoid:** Letting users edit the content of messages, rewrite AI responses, or fabricate conversation steps.
**Why not:** The value proposition is authenticity — "this is what actually happened." Editing undermines trust and creates a documentation/versioning nightmare. If the presenter wants to add context, that's what presenter notes (D-1) are for.

### AF-3: Auto-Play / Timed Advance

**What to avoid:** A "play" button that automatically advances through steps on a timer.
**Why not:** The project context explicitly says "presenter-driven." Auto-play removes the presenter's ability to pause, elaborate, respond to questions, or skip sections. It turns a presentation into a video — and if you want a video, just record a video.

### AF-4: Self-Serve / Public-Facing Viewer

**What to avoid:** Building for an audience that opens the tool directly (like a blog post or documentation site).
**Why not:** The project context says the audience is "dev teams, possibly PMs/BAs" and it's "presenter-driven (not self-serve)." Optimizing for self-serve changes every UX decision: you'd need onboarding, help text, mobile responsiveness, accessibility at a different level. Stay focused on the presenter use case.

### AF-5: Live Claude Integration / "Re-Run" Capability

**What to avoid:** Connecting to the Claude API to re-execute prompts or continue conversations from the replay.
**Why not:** This is a replay tool, not an IDE. Adding API integration means managing keys, handling costs, dealing with different model versions producing different outputs. Massive complexity, totally off-mission.

### AF-6: Mobile-First or Mobile-Responsive Design

**What to avoid:** Spending effort on mobile layouts, touch gestures, or responsive breakpoints for phone screens.
**Why not:** This is a screen-sharing/projection tool. The presenter uses a laptop or desktop. The audience sees a shared screen. Nobody is following along on their phone during a live demo. Responsive design for tablets might be nice-to-have eventually, but phone support is wasted effort.

### AF-7: Built-In Video/Audio Recording

**What to avoid:** Adding screen recording, webcam capture, or audio narration features.
**Why not:** OBS, Loom, and native OS tools do this far better. Building recording into a presentation tool is feature creep. The tool should be excellent at presentation; recording is a separate concern.

### AF-8: Plugin / Extension System

**What to avoid:** Building a plugin architecture, extension API, or marketplace.
**Why not:** Premature abstraction. The tool's scope is well-defined. A plugin system adds API surface area that must be maintained, documented, and supported. Build the features directly. If the tool becomes wildly successful and the community demands extensibility, reconsider then.

---

## Feature Dependency Map

```
TS-3 (JSONL Parsing) ─── foundational, everything depends on this
 ├── TS-7 (Tool Call Visibility)
 │    ├── D-4 (Collapsible Tool Details)
 │    ├── D-8 (Code Diff View)
 │    └── D-12 (File Tree Panel)
 ├── TS-4 (Markdown Rendering)
 │    ├── TS-5 (Syntax Highlighting)
 │    ├── TS-6 (User/AI Visual Distinction)
 │    ├── TS-9 (Readable Typography)
 │    │    └── D-5 (Themes)
 │    └── D-2 (Typewriter Reveal)
 ├── TS-1 (Sequential Navigation)
 │    ├── TS-2 (Keyboard Nav)
 │    ├── TS-10 (Progress Indicator)
 │    │    └── D-3 (Section Markers)
 │    ├── D-1 (Presenter Notes)
 │    │    └── D-9 (Dual Screen Presenter Mode)
 │    ├── D-7 (Search)
 │    └── D-10 (Deep Links)
 ├── TS-8 (Multi-Session Sequencing)
 │    ├── D-3 (Section Markers)
 │    └── D-6 (Demo Manifest)
 └── D-11 (Timestamps) — low dependency, just reads JSONL metadata
```

---

## Recommended Build Order

### Phase 1: Core Loop (MVP)
1. **TS-3** — JSONL Parsing
2. **TS-4** — Markdown Rendering
3. **TS-5** — Syntax Highlighting
4. **TS-6** — User/AI Distinction
5. **TS-1** — Sequential Navigation
6. **TS-2** — Keyboard Navigation
7. **TS-7** — Tool Call Filtering
8. **TS-9** — Readable Typography
9. **TS-10** — Progress Indicator

*At this point, you can present a single conversation file.*

### Phase 2: Multi-Session
10. **TS-8** — Multi-Session Sequencing

*At this point, you can present a full demo.*

### Phase 3: Presentation Polish
11. **D-1** — Presenter Notes
12. **D-3** — Section Markers
13. **D-6** — Demo Manifest
14. **D-5** — Themes
15. **D-11** — Timestamps

### Phase 4: Advanced Features
16. **D-4** — Collapsible Tool Details
17. **D-2** — Typewriter Reveal
18. **D-7** — Search
19. **D-8** — Code Diff View
20. **D-10** — Deep Links

### Phase 5: Professional Presenting
21. **D-9** — Dual Screen Presenter Mode
22. **D-12** — File Tree Panel
23. **D-13** — Static HTML Export

---

## Comparable Tools Reference

| Tool | Category | Key Features Relevant to PromptPlayer |
|------|----------|---------------------------------------|
| **reveal.js** | Code presentations | Keyboard nav, speaker notes, themes, vertical slides (sections), fragments (progressive reveal), PDF export, URL hash navigation |
| **Slidev** | Dev presentations | Markdown-driven, code highlighting, presenter mode, dark mode, recording, drawing |
| **Asciinema** | Terminal replay | Timestamped playback, speed control, pause/resume, embeddable, typewriter feel |
| **VHS (charm.sh)** | Terminal demo recording | Scripted demos, GIF/MP4 output, declarative format |
| **Jupyter nbviewer** | Notebook viewing | Cell-by-cell execution view, code + output pairing, markdown cells |
| **ChatGPT share links** | Conversation viewing | Message threading, markdown rendering, code blocks, copy buttons |
| **Loom** | Async video | Chapters, viewer analytics, speed control, comments at timestamps |

---

## Key Insights

1. **The filtering IS the product.** The single most important differentiator over "just open the JSONL in a text editor" is intelligent filtering of tool calls. A raw Claude Code session might have 200+ tool calls. The interesting narrative might be 20-30 steps. TS-7 is technically a table-stakes feature, but it's also the primary value proposition.

2. **Presentation tools converge on the same UX patterns.** Keyboard navigation, progress indicators, speaker notes, and themes appear in virtually every presentation tool. Users will unconsciously compare PromptPlayer to PowerPoint/reveal.js and expect these affordances.

3. **The manifest file (D-6) is a force multiplier.** It unlocks repeatability, shareability, and composition. It's also the natural place to store section markers, notes, and tool call overrides. Consider designing it early even if you don't build the full UI around it immediately.

4. **Progressive reveal (D-2) is the "wow factor."** When people see terminal replays (Asciinema) or typewriter effects, they lean in. But it's technically tricky with markdown rendering. Consider it a stretch goal but design the rendering pipeline so it's possible later.

5. **Anti-features protect scope ruthlessly.** For a greenfield project with a clear use case, the biggest risk is scope creep. The anti-features list is as important as the features list.
