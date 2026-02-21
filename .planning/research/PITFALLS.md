# Pitfalls: Conversation Replay/Presentation Tool

> Common mistakes and failure modes for building a JSONL conversation replayer targeting Claude Code sessions.

---

## Pitfall 1: Naive JSONL Parsing Assumes Clean, Small, Flat Data

### The Problem

Claude Code conversation files are not simple chat logs. Each JSONL file can contain thousands of lines, with deeply nested JSON structures: tool calls containing full file contents, thinking blocks with multi-paragraph reasoning, base64-encoded images, and UUID-based parent-child threading (`parentUuid` chains). Projects that treat this as "just read lines and JSON.parse each one" hit walls fast:

- **Memory blowout**: Loading an entire 50MB+ conversation file into memory as a single parsed array. Some tool call results embed full file contents (e.g., a 3,000-line source file read via the `Read` tool), meaning a single JSONL line can be megabytes.
- **Malformed line handling**: Real conversation files can have truncated lines (session crashed mid-write), empty lines, or lines with unexpected schemas (Claude Code's format evolves across versions).
- **Threading misunderstanding**: Treating the file as a flat sequential list when it is actually a tree. Messages reference `parentUuid` to form chains, and sidechain/branched conversations exist in the same file. Failing to reconstruct the tree means displaying orphaned messages or showing dead-end branches the user abandoned.

### Warning Signs

- You are using `JSON.parse(entireFileContents)` or reading the whole file into a single string before splitting.
- Your message display order is "whatever order they appear in the file" without resolving `parentUuid` chains.
- You have no test data containing sidechain messages or branched conversations.
- You encounter "out of memory" or UI freezes with real-world conversation files during early testing.

### Prevention Strategy

- **Stream-parse JSONL line by line**. Never load the full file into memory at once. Use a streaming reader (e.g., `readline` in Node.js, or a streaming JSONL parser) that processes one line at a time and builds an indexed lookup (`Map<uuid, message>`).
- **Build an explicit message tree** from `parentUuid` references, then linearize it by walking the main chain (the longest/primary path). Detect and filter sidechains early — a sidechain is a message whose `uuid` is never referenced as a `parentUuid` by the "chosen" continuation.
- **Validate each line defensively**: wrap individual line parsing in try/catch, log and skip malformed lines rather than crashing.
- **Create a test corpus** of real conversation files early, including at least: a small file (<100 messages), a large file (1,000+ messages), a file with sidechains, and a file with large tool call results (full file reads).

### Phase

**Foundation/Architecture phase** — this is load-bearing infrastructure. Getting the parsing model wrong early means refactoring everything downstream.

---

## Pitfall 2: Treating All Messages as Equal "Steps"

### The Problem

A Claude Code conversation is not a simple user/assistant alternation. Between each visible "turn," there may be dozens of tool calls: Read, Grep, Glob, Write, Edit, Bash, and more. A single Claude response might trigger 10+ tool calls before producing the visible reply. Projects that define a "step" as "one message in the JSONL" create an unusable presentation where the presenter clicks 47 times through file reads and grep results to get to the one meaningful response.

Conversely, collapsing everything between user messages into a single step loses the narrative tool calls (AskUserQuestion, TaskCreate, TaskUpdate) that are essential to the GSD story.

### Warning Signs

- Your step count for a real conversation is 200+ when the meaningful narrative is 15-20 exchanges.
- Presenters have to click through dozens of tool call results that show raw file contents.
- You have no concept of "message categories" or "display relevance" in your data model.
- AskUserQuestion prompts (which are critical interactive moments) are hidden in the same bucket as Bash calls.

### Prevention Strategy

- **Define a message taxonomy early**. At minimum:
  - **Narrative messages**: User messages, Claude's final text responses, AskUserQuestion tool calls (with the user's selection), TaskCreate/TaskUpdate/TaskList calls.
  - **Plumbing messages**: Read, Grep, Glob, Write, Edit, Bash, and other file/system tool calls.
  - **Meta messages**: System prompts, context injections, capability messages.
- **Default to showing only narrative messages** as steps. Plumbing messages should be hideable (collapsed or omitted entirely by default).
- **Make the taxonomy configurable** — what counts as "narrative" may vary by presentation. A demo about Claude's tool use might want to show some Bash calls.
- **Associate tool calls with their parent response**. A Claude response that triggers 5 tool calls should be one logical unit, not 6 separate steps.

### Phase

**Data model design phase** — must be decided before building navigation. This directly determines what the step counter means and how forward/back works.

---

## Pitfall 3: Markdown Rendering That Works for Simple Cases but Breaks on Real Content

### The Problem

Claude's responses contain rich, complex markdown: fenced code blocks with language hints, nested lists 3-4 levels deep, tables with aligned columns, inline code mixed with bold/italic, HTML entities, and GSD-specific formatting (box-drawing characters like `+---+`, progress bar visualizations, multi-column layouts using monospace formatting). Most markdown renderers handle "hello **world**" fine but produce broken output for real Claude responses.

Specific failure modes:
- **Code blocks inside lists**: Most renderers break indentation or exit the list context.
- **Box-drawing characters**: GSD uses characters like `|`, `+`, `-` to draw tables and boxes in plain text. A markdown renderer may interpret `|` as a table delimiter and produce garbled output.
- **Nested fenced blocks**: A Claude response may include a code block that itself contains markdown (e.g., showing the user what markdown to write). Triple-backtick nesting is notoriously fragile.
- **Very long code blocks**: A single code block might be 100+ lines. Without line capping or scrolling, this pushes all subsequent content off-screen.

### Warning Signs

- You chose a markdown renderer based on "it renders README files nicely" without testing against real Claude output.
- Box-drawing characters render as broken table fragments.
- Code blocks lose their syntax highlighting or break out of their containers.
- The presenter has to scroll past a 200-line code block to see the next sentence.

### Prevention Strategy

- **Test your renderer against real Claude output from day one**. Take 10+ real Claude responses of varying complexity (GSD roadmap output, code generation, table output, thinking blocks) and verify rendering.
- **Pre-process content before rendering**: Detect box-drawing character blocks and wrap them in `<pre>` tags or fenced code blocks before passing to the renderer. Detect and cap/truncate extremely long code blocks with an expandable "show more" control.
- **Use a battle-tested renderer** (e.g., `marked`, `markdown-it`, or `react-markdown`) and configure it with extensions for syntax highlighting (`highlight.js` or `prism`), table support, and HTML passthrough.
- **Build a "rendering test gallery"** — a page that shows 20+ real Claude response fragments rendered side by side, so you can visually QA rendering changes without regression.

### Phase

**Rendering phase** — but the test corpus should be assembled during the data model phase so it is ready when rendering begins.

---

## Pitfall 4: Session Chaining That Loses Context or Creates Jarring Transitions

### The Problem

A GSD workflow spans 5-15+ separate conversation files (the user runs `/clear` between GSD commands). Each file is an independent conversation with its own UUID tree. The tool must chain these into a seamless narrative. Projects commonly fail by:

- **No transition indicator**: The audience sees a sudden topic change with no indication that a new session started. "Why is it suddenly talking about research when it was just doing requirements?"
- **Session ordering errors**: Files are not inherently ordered. If you sort by filename or modification date, you may get the wrong sequence. The user must explicitly define the chain order.
- **Context discontinuity**: The end of session N and the start of session N+1 may overlap (the user restates context) or have gaps (the user did something off-camera between sessions). Neither case is handled gracefully.
- **Progress indicator confusion**: "Step 12 of 340" is meaningless. The presenter needs to know "Session 3 of 7, message 4 of 23."

### Warning Signs

- Your chain configuration is "drop files in a folder and they auto-sort."
- There is no visual distinction between a within-session step and a between-session transition.
- Your progress indicator is a single flat number across all sessions.
- You have not tested with the actual number of sessions a real GSD workflow produces.

### Prevention Strategy

- **Require explicit chain configuration**: A JSON/YAML manifest that lists session files in presentation order, with optional per-session metadata (title, description, what GSD phase this represents).
- **Design a session transition screen**: A brief interstitial that shows "Session 3: Research Phase" before diving into messages. This gives the presenter a natural pause point and gives the audience orientation.
- **Two-level progress indicator**: Show both "Session X of Y" and "Step N of M within this session." The presenter needs both to navigate confidently.
- **Support session-level navigation**: Let the presenter jump to the start of any session, not just step forward/back one message at a time.

### Phase

**Data model and navigation phase** — the chain manifest format must be defined early because it is the primary configuration the user creates. Navigation design depends on it.

---

## Pitfall 5: Performance Death by a Thousand Renders

### The Problem

Conversation replay tools accumulate content as the presenter advances. Each step adds content to the display. By step 50 of a long session, the DOM contains 50 rendered markdown blocks, potentially including syntax-highlighted code blocks, tables, and long text. Common performance pitfalls:

- **Re-rendering everything on each step**: Adding a new message causes the entire conversation history to re-render, triggering markdown parsing and syntax highlighting for all previous messages.
- **Unbounded DOM growth**: Keeping all rendered messages in the DOM across all sessions. By session 5, the DOM has hundreds of rendered blocks, and scrolling becomes laggy.
- **Syntax highlighting on the main thread**: Libraries like `highlight.js` can take 50-100ms per code block. With 20 code blocks visible, that is 1-2 seconds of jank.
- **Large base64 images in the DOM**: Some tool call results include base64-encoded screenshots. Each one is a multi-megabyte string in the DOM.

### Warning Signs

- Advancing a step takes visibly longer as you get deeper into a session.
- The browser's memory usage grows linearly and never stabilizes.
- The UI stutters when scrolling through rendered content.
- Profiling shows markdown parsing in the hot path of the step-advance handler.

### Prevention Strategy

- **Render once, cache forever**: When a message is rendered to HTML, cache the result. Never re-parse markdown for a message that has already been displayed.
- **Virtualize or paginate the conversation display**: Only keep the current visible window of messages in the DOM. Previous messages can be replaced with spacer elements of the correct height, or the view can be "current message + last N messages."
- **Offload syntax highlighting**: Use a web worker for syntax highlighting, or pre-highlight during the parsing phase rather than at render time.
- **Strip or thumbnail base64 images**: Convert base64 images to blob URLs on first encounter, or replace them with placeholder thumbnails that expand on click.
- **Clear previous session DOM on transition**: When moving to a new session, remove the previous session's rendered content from the DOM entirely.

### Phase

**Rendering and polish phase** — but architectural decisions (caching strategy, virtualization) must be made during initial rendering implementation. Retrofitting virtualization is painful.

---

## Pitfall 6: Navigation Model That Does Not Match Presenter Mental Model

### The Problem

The presenter thinks in terms of "what I said, what Claude said, what happened next." The data model thinks in terms of messages, tool calls, and tool results. If navigation does not align with the presenter's mental model, the tool becomes frustrating:

- **Forward goes to a tool result instead of the next meaningful exchange**: The presenter expects "next" to show Claude's response but instead sees a raw grep output.
- **Back does not go where expected**: If forward skipped 5 plumbing messages, does back also skip them? Or does it go to the last plumbing message?
- **No way to preview what is next**: The presenter does not know if the next step is a short acknowledgment or a 200-line response. They cannot pace their narration.
- **Keyboard shortcuts conflict**: If the tool runs in a browser, common presentation shortcuts (arrow keys, space, escape) may conflict with browser behavior or the presenter's other tools.

### Warning Signs

- The presenter has to click "next" multiple times to get past content they did not expect.
- The presenter loses their place and cannot easily recover.
- Testing reveals that "back" behavior is inconsistent or confusing.
- The presenter cannot tell what is coming next without actually advancing.

### Prevention Strategy

- **Define "forward" and "back" as operating on the filtered narrative steps**, not raw messages. Plumbing messages that are hidden should also be skipped by navigation.
- **Ensure back is the exact inverse of forward**: If forward jumped from step 5 to step 8 (skipping plumbing), back from step 8 should return to step 5, not step 7.
- **Provide a step preview**: Show a one-line preview of the next step's content (e.g., "User: Can you implement the parser?" or "Claude: [long response - 45 lines]") so the presenter can pace their narration.
- **Dedicate keyboard shortcuts and document them**: Arrow keys for step navigation, number keys for session jumping, Escape for overview. Test that these do not conflict with the presentation environment (browser, Electron, etc.).
- **Build a step outline/table of contents**: A sidebar or overlay showing all narrative steps with one-line summaries, so the presenter can jump to any point.

### Phase

**Navigation/UX phase** — but the step taxonomy from Pitfall 2 must be resolved first, because navigation is built on top of it.

---

## Pitfall 7: Ignoring the Presentation Context (Screen Sharing, Projector, Distance Reading)

### The Problem

This is not a personal reading tool — it is a presentation tool. The audience is watching via screen share or projector. Projects built as "conversation viewers" fail as presentation tools because:

- **Text is too small**: Default browser font sizes are unreadable on a projected screen or in a small video conferencing window.
- **Too much content visible**: Showing the full conversation history on screen means the audience is reading old content instead of focusing on the current step.
- **No visual hierarchy**: The current message does not stand out from previous messages. The audience cannot tell what is new.
- **Color contrast fails on projectors**: Syntax highlighting themes designed for monitors (dark themes with subtle color differences) wash out on projectors.
- **No "presenter mode" thinking**: The tool shows everything Claude outputs, including verbose tool results, thinking blocks, and system messages that confuse a non-technical audience.

### Warning Signs

- You are building and testing at your desk monitor and have never tested via screen share.
- Font sizes in your CSS are specified in pixels at 14-16px.
- There is no concept of "current step highlight" in your UI.
- You chose a dark syntax highlighting theme because it looks cool.
- You have no way to increase font size without breaking layout.

### Prevention Strategy

- **Design for projector-first**: Use relative font sizes (rem/em), default to large text (18-20px base minimum), and test at 1280x720 resolution — a common screen-share resolution.
- **Focus mode by default**: Show primarily the current step, with minimal context from previous steps. The presenter provides verbal context; the tool provides visual focus.
- **Strong visual hierarchy**: The current step should have clear visual distinction (size, background, border) from any visible history. New content should animate in or be highlighted.
- **Light theme with high contrast**: Projectors and screen sharing favor light backgrounds with dark text. Offer a light theme as the default presentation mode. Syntax highlighting should use bold, high-contrast colors.
- **Font size controls**: A simple keyboard shortcut (Ctrl+/Ctrl-) or a UI control to scale all text. This must work without breaking the layout.
- **Test via actual screen share**: Record a screen share of yourself using the tool. Watch the recording on a phone screen. If you cannot read it comfortably, the audience cannot either.

### Phase

**UI/UX design phase** — these constraints must inform the initial design, not be bolted on later. Retrofitting "presentation mode" onto a tool designed for personal use is a near-complete redesign.

---

## Pitfall 8: Hardcoding Claude Code's Message Format

### The Problem

Claude Code's conversation storage format is not a public, versioned API. It is an internal format that has changed across Claude Code versions and will likely continue to evolve. Projects that deeply couple their parsing to a specific schema version break silently when:

- **New message types are added**: Claude Code adds a new tool call type, a new message role, or a new metadata field. The parser ignores or crashes on unfamiliar types.
- **Field names or nesting changes**: A field moves from `message.content` to `message.content[0].text`, or `toolUse` becomes `tool_use`.
- **New content block types**: Claude introduces a new content block type (e.g., `thinking` blocks were added relatively recently). The renderer does not know how to display it and either crashes or shows raw JSON.

### Warning Signs

- Your parser uses hardcoded field access like `message.content[0].text` without checking the structure.
- You have no version detection or schema validation.
- You have never tested with conversation files from different Claude Code versions.
- Adding support for a new message type requires changes in 5+ places across the codebase.

### Prevention Strategy

- **Build a message normalization layer**: Parse raw JSONL into an internal canonical format. All downstream code works with the canonical format, never with raw data. When Claude Code's format changes, only the normalization layer needs updating.
- **Use defensive field access**: Check for field existence before accessing. Use optional chaining (`?.`) extensively. Log warnings for unrecognized message types rather than crashing.
- **Design an "unknown message" fallback renderer**: If the tool encounters a message type or content block it does not recognize, display it as a generic block (e.g., "Unknown content type: `server_tool_use`") rather than crashing or silently dropping it.
- **Collect conversation files from multiple Claude Code versions** for your test corpus. As Claude Code updates, grab new sample files.

### Phase

**Architecture/parsing phase** — the normalization layer is foundational and must be designed before any rendering or navigation code is written.

---

## Pitfall 9: Underestimating the Complexity of "Tool Call Display"

### The Problem

The project requirement says "show AskUserQuestion tool calls with the options presented and the user's selection." This sounds simple but involves significant complexity:

- **Tool calls are split across multiple messages**: The `tool_use` content block is in Claude's response, but the `tool_result` is in a separate subsequent message. You must pair them to show "Claude asked X, user answered Y."
- **Tool call results can be enormous**: A `Read` tool result contains the full contents of the file that was read. A `Bash` tool result contains the full stdout/stderr. Even for "narrative" tool calls, the result can be large.
- **AskUserQuestion has a specific interaction pattern**: It contains a question, a list of options, and the user's selection. Extracting and displaying this requires understanding the specific tool's schema.
- **Nested tool calls**: In Claude Code, a single assistant turn can contain multiple tool calls, and a tool result can trigger further tool calls. The nesting can be several levels deep.
- **TaskCreate/TaskUpdate have structured content**: Task management calls contain structured data (task IDs, status, descriptions) that should be rendered as a meaningful display, not raw JSON.

### Warning Signs

- Your renderer shows tool calls as raw JSON blobs.
- You can display `tool_use` but have no way to show the corresponding `tool_result` alongside it.
- AskUserQuestion displays as generic JSON rather than a clear "Question: ... Selected: ..." format.
- You have not mapped out the specific schema for each tool call type you want to display.

### Prevention Strategy

- **Build a tool call pairing system**: When parsing, match each `tool_use` with its corresponding `tool_result` (by `tool_use_id`). Store them as paired units so the renderer can display both together.
- **Create specific renderers for each "narrative" tool type**:
  - `AskUserQuestion`: Render as a styled prompt with the question text, the options as a list, and the selected option highlighted.
  - `TaskCreate`: Render as a task card showing the task description and initial status.
  - `TaskUpdate`: Render as a status change indicator.
  - `TaskList`: Render as a task summary table.
- **Truncate/collapse large tool results**: Even for displayed tool calls, if the result is over a threshold (e.g., 50 lines), show a truncated version with "expand" capability.
- **Design a generic tool call renderer** as a fallback for any tool type that does not have a specific renderer.

### Phase

**Rendering phase** — but the tool call pairing must be done during the parsing phase, and the list of "narrative" vs. "plumbing" tool types must be defined during data model design.

---

## Pitfall 10: Building a File Viewer Instead of a Presentation Tool

### The Problem

This is the meta-pitfall that encompasses several others. The gravitational pull in building this kind of tool is toward a "conversation file viewer" — a utility that loads a file and displays its contents. But the actual need is a **presentation instrument**: a tool that helps a presenter tell a story to an audience.

The difference is fundamental:
- A file viewer shows data. A presentation tool controls narrative flow.
- A file viewer loads one file. A presentation tool chains a curated sequence.
- A file viewer is feature-complete when all data renders correctly. A presentation tool is feature-complete when the presenter can deliver their talk confidently.

Projects that lose sight of the presentation purpose accumulate features that serve the developer (search, filtering, raw JSON view, multiple file tabs) while neglecting features that serve the presenter (focus mode, large text, session transitions, rehearsal support).

### Warning Signs

- Feature discussions center on "what data can we show?" rather than "what story does the presenter need to tell?"
- The UI looks like a developer tool (panels, tabs, JSON trees) rather than a presentation tool (clean, focused, high-contrast).
- There is no way to rehearse a presentation end-to-end without reloading.
- The presenter's primary complaint is not "it's missing data" but "I can't control the flow."

### Prevention Strategy

- **Define the presenter's workflow first**: Before building features, write out the exact sequence of actions a presenter takes from opening the tool to finishing their demo. Build to that workflow.
- **User-test with a real presentation early**: As soon as you have basic step-through working, do a real (or simulated) presentation. The gaps in the presentation experience will be immediately obvious — and they will be different from the gaps a developer notices when viewing files.
- **Bias toward removal**: If a feature does not help the presenter during a live presentation, it is a distraction. Default-hide or defer it.
- **Keep the "file viewer" mode separate**: If you want raw data inspection (useful for debugging), put it behind a developer toggle, not in the presentation UI.

### Phase

**All phases** — this is a design principle, not a feature. It should be the lens through which every decision is evaluated.

---

## Summary: Phase Mapping

| Phase | Pitfalls to Address |
|-------|-------------------|
| **Architecture/Data Model** | #1 (JSONL parsing), #2 (message taxonomy), #4 (session chaining), #8 (format normalization) |
| **Navigation/UX Design** | #6 (presenter mental model), #7 (presentation context), #10 (presentation vs. viewer) |
| **Rendering** | #3 (markdown rendering), #5 (performance), #9 (tool call display) |
| **Polish/Testing** | #5 (performance profiling), #7 (screen share testing), #10 (real presentation test) |

## Key Takeaway

The most dangerous pitfall is **#10 — building a file viewer instead of a presentation tool**. Every other pitfall either contributes to or can be mitigated by keeping the presenter's live demo experience as the primary design driver. When in doubt, ask: "Does this help the presenter tell their story to their audience?" If the answer is not a clear yes, defer it.

---
*Researched: 2026-02-20 | Project: PromptPlayer*
