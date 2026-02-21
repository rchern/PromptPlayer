# Architecture Research: PromptPlayer

> **Dimension:** Architecture
> **Question:** How should a JSONL conversation replay tool be architected?
> **Date:** 2026-02-20

---

## Summary

PromptPlayer is a conversation replayer that turns Claude Code JSONL sessions into step-through presentation demos. The architecture decomposes into five major components: **JSONL Parser**, **Session Stitcher**, **Message Classifier**, **Presentation Engine**, and **Navigation Controller**. Data flows left-to-right from raw files through transformation layers to rendered output. The build order follows data-flow direction — you cannot render what you have not parsed.

---

## 1. Component Map

### 1.1 JSONL Parser
**Responsibility:** Read raw `.jsonl` files and produce typed, validated message objects.

- Reads one or more `.jsonl` files from `.claude/projects/[project-name]/[session-id].jsonl`
- Deserializes each line into a typed message object
- Validates required fields: `type`, `uuid`, `parentUuid`, `timestamp`, `message`
- Discards malformed lines with logged warnings (don't crash on bad data)
- Outputs: `ParsedMessage[]` — a flat, unordered collection of validated message objects

**Boundary:** This component knows nothing about ordering, filtering, or display. It is a pure I/O-to-data layer.

### 1.2 Session Stitcher
**Responsibility:** Reconstruct the correct message sequence from one or more sessions.

- Receives `ParsedMessage[]` from the parser (potentially from multiple session files)
- Builds a tree/graph from `uuid` → `parentUuid` relationships
- Resolves the **mainline path** by walking the parent chain and excluding `isSidechain: true` branches
- Handles multi-session chains: sessions are linked when a later session references a `parentUuid` from an earlier session, or by chronological `timestamp` ordering when explicit links are absent
- Filters out `isMeta: true` system-injected messages (skill expansions, tool injection metadata) unless a display flag overrides this
- Outputs: `StitchedConversation` — an ordered, linear sequence of messages representing the canonical conversation flow

**Boundary:** This component owns ordering and threading logic. It does NOT classify message importance or decide what to show/hide — that is the Classifier's job.

### 1.3 Message Classifier
**Responsibility:** Categorize each message for display treatment.

- Receives `StitchedConversation` from the Stitcher
- Classifies each message into display categories:

| Category | Examples | Default Display |
|---|---|---|
| **User prompt** | `type: "user"` | Always show |
| **Assistant narrative** | Text/thinking blocks in assistant messages | Always show |
| **Narrative tool calls** | `AskUserQuestion`, `TaskCreate`, `TaskUpdate`, `TodoWrite` | Show (these carry storyline) |
| **Plumbing tool calls** | `Read`, `Grep`, `Glob`, `Bash`, `Write`, `Edit` | Hide by default, expandable |
| **Tool results** | `tool_result` content blocks | Collapse into parent tool call |
| **Progress indicators** | `type: "progress"` | Hide by default |
| **File snapshots** | `type: "file-history-snapshot"` | Hide (metadata only) |

- Handles `message.content` being either a plain string or an array of content blocks (text, thinking, tool_use, tool_result) — must iterate and classify each block independently within a single assistant message
- Outputs: `ClassifiedMessage[]` — each message annotated with `displayCategory` and `defaultVisibility`

**Boundary:** Classification rules are the most likely thing to change as users discover what they want visible. This component should be configurable (rule set, not hardcoded logic). It does NOT render anything.

### 1.4 Presentation Engine
**Responsibility:** Render classified messages into presentation-quality HTML/UI.

- Receives `ClassifiedMessage[]` from the Classifier
- Renders each message according to its type and category:
  - **Markdown rendering** with syntax highlighting for code blocks
  - **User messages** styled distinctly from assistant messages (visual separation)
  - **Thinking blocks** rendered in a collapsible/distinct style (italic, muted, or togglable)
  - **Tool calls** rendered as compact summaries when collapsed, full detail when expanded
  - **Large content handling** — truncation with "show more" for very long outputs (e.g., large Bash results)
- Applies presentation-mode styling: large fonts, high contrast, readable at screen-sharing distance
- Supports a "current message" highlight for the step-through focus point

**Boundary:** This component owns rendering and styling. It does NOT own navigation state or which message is "current" — that is the Controller's job.

### 1.5 Navigation Controller
**Responsibility:** Manage step-through state and user interaction.

- Tracks `currentIndex` within the `ClassifiedMessage[]` array
- Provides navigation actions: **Next**, **Previous**, **Jump to N**, **Go to Start/End**
- Controls which messages are visible based on the step position (progressive reveal — messages 0 through currentIndex are shown, or only currentIndex is shown, depending on mode)
- Keyboard shortcuts: arrow keys, spacebar, escape
- Optional: **auto-play** mode with configurable timing
- Coordinates with the Presentation Engine to scroll to and highlight the current message

**Boundary:** This component owns state and user input. It tells the Presentation Engine *what* to show, not *how* to show it.

---

## 2. Data Flow

```
                        ┌─────────────┐
  .jsonl files ────────>│ JSONL Parser │
  (1 or more)           └──────┬──────┘
                               │
                        ParsedMessage[]
                        (flat, unordered)
                               │
                               v
                      ┌────────────────┐
                      │Session Stitcher│
                      └───────┬────────┘
                              │
                       StitchedConversation
                       (ordered, linear)
                              │
                              v
                    ┌───────────────────┐
                    │Message Classifier │
                    └────────┬──────────┘
                             │
                      ClassifiedMessage[]
                      (annotated with visibility)
                             │
                             v
                   ┌─────────────────────┐
                   │Presentation Engine  │<────── Navigation Controller
                   │(renders to DOM)     │         (state + user input)
                   └─────────────────────┘              ^
                             │                          │
                             v                          │
                        Rendered UI ──── keyboard/click events
```

**Data flows one direction** (top to bottom) through the transformation pipeline. The Navigation Controller is the only component that introduces a feedback loop — user input changes state, which tells the Presentation Engine to update.

### Data Contracts Between Components

| From → To | Data Shape | Key Fields |
|---|---|---|
| Parser → Stitcher | `ParsedMessage[]` | `uuid`, `parentUuid`, `type`, `timestamp`, `message`, `isSidechain`, `isMeta` |
| Stitcher → Classifier | `StitchedConversation` | `messages: OrderedMessage[]` (sequential, mainline only) |
| Classifier → Engine | `ClassifiedMessage[]` | Original message + `displayCategory`, `defaultVisibility`, `contentBlocks[]` (each block classified) |
| Controller → Engine | `NavigationState` | `currentIndex`, `displayMode` ("progressive" or "single"), `expandedToolCalls: Set<uuid>` |

---

## 3. Cross-Cutting Concerns

### 3.1 Multi-Session Handling
Multiple session files form a single demo. The Session Stitcher must:
1. Accept an ordered list of session file paths (user provides the sequence)
2. Parse each independently, then merge into one `ParsedMessage[]`
3. Resolve cross-session `parentUuid` references
4. Fall back to timestamp ordering when cross-references are missing

**Design decision:** Session ordering should be explicit (user provides a playlist/manifest), not inferred. Inference from timestamps alone is fragile if sessions overlap or clocks drift.

### 3.2 Content Block Decomposition
A single assistant message can contain multiple content blocks:
```json
{
  "message": {
    "role": "assistant",
    "content": [
      { "type": "thinking", "thinking": "..." },
      { "type": "text", "text": "Here's what I found..." },
      { "type": "tool_use", "name": "Read", "input": { "file_path": "..." } },
      { "type": "text", "text": "Based on that file..." }
    ]
  }
}
```
The Classifier must process each block independently. The Presentation Engine renders blocks in sequence within a single message container. The Navigation Controller may optionally support sub-message stepping (advance through blocks within one message) as a future enhancement.

### 3.3 Error Handling Strategy
- **Parser:** Warn and skip malformed lines; don't abort the entire file
- **Stitcher:** Warn on orphaned messages (parentUuid points to nothing); append at end by timestamp
- **Classifier:** Default unknown types to "hidden" with a development-mode warning
- **Engine:** Gracefully handle missing or unexpected content (empty blocks, null fields)

---

## 4. Technology Considerations

Given this is a presentation/replay tool with rich markdown rendering needs:

| Concern | Recommendation | Rationale |
|---|---|---|
| **Runtime** | Browser-based (HTML/CSS/JS or TS) | Markdown rendering, syntax highlighting, and presentation-quality styling are native browser strengths |
| **Framework** | Lightweight — vanilla TS, or a small framework (Svelte, Preact, or even plain DOM) | This is a single-view app, not a complex SPA. Heavy frameworks add unnecessary overhead. |
| **Markdown** | `marked` or `markdown-it` | Mature, extensible, handles GFM |
| **Syntax highlighting** | `highlight.js` or `Prism` | Both work well; highlight.js has broader language support out of the box |
| **Bundler** | Vite | Fast dev server, simple config, good TS support |
| **JSONL parsing** | Native — split by newline, `JSON.parse` each line | No library needed; JSONL is trivially parseable |

**Note on electron vs. browser:** A plain browser app (opened via `file://` or a simple local server) is sufficient for v1. Electron adds complexity with no clear benefit for a read-only replay tool. If file-system access is needed (to browse `.jsonl` files), a thin Node.js server or Electron wrapper can be added later.

---

## 5. Suggested Build Order

Build order follows data-flow dependencies. You cannot build downstream components without upstream data.

### Phase 1: Data Pipeline (foundation — everything depends on this)
1. **JSONL Parser** — Can be built and tested independently with sample `.jsonl` files
2. **Session Stitcher** — Depends on Parser output; start with single-session, add multi-session later

**Deliverable:** Given a `.jsonl` file path, produce an ordered array of messages. Testable from the command line / Node.js without any UI.

### Phase 2: Classification (intelligence layer)
3. **Message Classifier** — Depends on Stitcher output; start with hardcoded rules, extract to config later

**Deliverable:** Given an ordered conversation, produce an annotated array where each message has a display category and visibility flag. Still no UI needed — unit-testable.

### Phase 3: Rendering (first visible output)
4. **Presentation Engine** — Depends on Classifier output; start with basic markdown rendering, iterate on styling

**Deliverable:** A static HTML page that renders a full classified conversation (all messages visible, no navigation). This is the first time you see your tool working visually.

### Phase 4: Interaction (makes it a "player")
5. **Navigation Controller** — Depends on Presentation Engine; adds step-through, keyboard controls

**Deliverable:** The complete step-through experience. Forward/back through the conversation with keyboard shortcuts.

### Phase 5: Polish & Extension
6. Multi-session playlist/manifest support
7. Presentation-mode styling refinements (font size, contrast, layout for screen sharing)
8. Auto-play mode
9. Optional: thinking block toggle, tool call expand/collapse

---

## 6. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Pipeline vs. monolith** | Separate pipeline stages with clear data contracts | Each stage is independently testable; classification rules will change frequently |
| **Sidechain handling** | Filter at Stitcher layer, not at render time | Sidechains are a data concern, not a display concern |
| **Tool call classification** | Configurable rule set in Classifier | What counts as "narrative" vs "plumbing" is subjective and will evolve |
| **Session ordering** | Explicit manifest/playlist | Timestamp inference is fragile; explicit is reliable |
| **Sub-message stepping** | Deferred to Phase 5 | Assistant messages with mixed content blocks are complex; get message-level navigation working first |
| **State management** | Simple index-based (no Redux/stores) | Navigation state is a single integer plus a set of expanded IDs; no complex state needed |

---

## 7. Risks and Open Questions

| Risk / Question | Impact | Mitigation |
|---|---|---|
| **JSONL format may vary across Claude Code versions** | Parser breaks on unexpected fields or missing required fields | Defensive parsing with graceful fallbacks; version detection if needed |
| **Multi-session linking may lack explicit parentUuid cross-references** | Stitcher cannot determine correct order | Require explicit session ordering in manifest; use timestamps as tiebreaker only |
| **Large sessions (thousands of messages) may cause performance issues** | Browser rendering slows or crashes | Virtual scrolling for progressive-reveal mode; lazy rendering for off-screen messages |
| **Content block types may expand over time** | Classifier encounters unknown block types | Default to "hidden" for unknown types; log warnings; make classifier extensible |
| **"Narrative" vs "plumbing" distinction is subjective** | Users disagree about what should be visible | Make classification configurable; provide presets but allow override |

---

## Quality Gate Checklist

- [x] **Components clearly defined with boundaries** — Five components, each with explicit responsibility and what it does NOT own
- [x] **Data flow direction explicit** — Unidirectional pipeline with data contracts between each stage; feedback loop only from Navigation Controller
- [x] **Build order implications noted** — Five-phase build order following data-flow dependencies, with clear deliverables per phase
