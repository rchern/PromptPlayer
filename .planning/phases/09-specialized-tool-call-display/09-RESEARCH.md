# Phase 9: Specialized Tool Call Display - Research

**Researched:** 2026-02-28
**Domain:** React component architecture for specialized data rendering (tool call display)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- AskUserQuestion: Show the header label (e.g., "Discuss", "Auth method") as a tag/label above the question text
- AskUserQuestion: Option descriptions should be expandable — show labels by default, expand for full descriptions
- AskUserQuestion: Must show which option(s) the user selected (success criterion #1)
- TaskUpdate: Status changes most prominent (pending -> in_progress -> completed)
- TaskUpdate: Other field changes (subject, description, dependencies) quieter/secondary
- TaskList: Formatted summary (checklist, table, or similar)
- Specialized blocks should be visually coherent with the existing app style

### Claude's Discretion
- AskUserQuestion: Visual form style (radio/checkbox vs pill selection vs other)
- AskUserQuestion: Multi-select vs single-select visual distinction
- AskUserQuestion: Multi-question layout (stacked in one block vs separate blocks)
- AskUserQuestion: "Other" (free-text) answer display format
- TaskCreate: Display format (card vs inline announcement vs other)
- TaskUpdate: Display format and how non-status fields render
- TaskList: Format (checklist, mini table, or other)
- Status color-coding approach (if any)
- Prominence level of specialized blocks vs surrounding markdown
- Icons/emoji per tool type (or text labels only)
- TaskList collapsibility for long lists
- Animation/transitions during playback

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLAY-07 | AskUserQuestion tool calls display as interactive-looking prompts showing the question, options, and the user's selection | AskUserQuestion renderer with header tag, expandable options, selected-answer highlighting; data schema verified from 80 real examples |
| PLAY-08 | Task management tool calls (TaskCreate, TaskUpdate, TaskList) display inline with meaningful formatting | Three specialized renderers (TaskCreateBlock, TaskUpdateBlock, TaskListBlock); schemas verified from real JSONL data and system prompts |
</phase_requirements>

## Summary

This phase replaces the existing generic one-line ToolCallBlock rendering for four narrative tools (AskUserQuestion, TaskCreate, TaskUpdate, TaskList) with specialized, presentation-quality display components. The current ToolCallBlock.tsx already has a basic AskUserQuestion renderer (question text + option chips), but it lacks the header label, expandable descriptions, and selected-answer highlighting that the requirements specify. Task tools have no specialized rendering at all — they fall through to the generic `summarizeToolInput` path.

The architecture is straightforward: this is a pure React component refactoring problem within the existing rendering pipeline. No new libraries are needed. The data flows through the existing ContentBlockRenderer -> ToolCallBlock dispatch chain. The tool_use block contains the structured input (questions array, task fields), and the paired tool_result block contains the response (user's selected answers, task creation confirmation). The key challenge is pairing tool_use inputs with their tool_result outputs for display — the AskUserQuestion question block needs to show which option the user selected, which comes from a different message.

**Primary recommendation:** Create four specialized renderer components in `src/renderer/src/components/message/` that are dispatched from ToolCallBlock by tool name. Use the existing toolUseMap + followUpMessages pipeline to pair tool_use inputs with tool_result outputs. No new dependencies required — use existing CSS custom properties, lucide-react icons, and inline styles consistent with the codebase.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.0.0 | Component rendering | Already installed; all renderers are React function components |
| lucide-react | ^0.575.0 | Icons for tool type labels and status indicators | Already installed; used throughout the app (ChevronRight, ChevronDown, PanelLeftOpen, etc.) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | — | No new libraries needed for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline styles (current pattern) | CSS modules or Tailwind classes | The entire codebase uses inline styles with CSS custom properties. Switching to CSS modules would be inconsistent. **Continue with inline styles.** |
| Custom expand/collapse | Radix UI Collapsible or headless UI | Adding a new UI library for one expand/collapse component is overkill. ThinkingBlock already demonstrates the pattern with local state + ChevronRight rotation. **Use the existing pattern.** |
| Status color via CSS classes | Semantic color tokens in theme.css | Adding new theme tokens would be cleaner long-term, but the existing codebase uses inline color values (e.g., `rgba(239, 68, 68, 0.8)` for errors). **Use inline color values for consistency, but define them as constants in the component file for maintainability.** |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/renderer/src/
  components/
    message/
      ToolCallBlock.tsx           # Existing — add dispatch to specialized renderers
      AskUserQuestionBlock.tsx    # NEW — rich question/answer display
      TaskCreateBlock.tsx         # NEW — task creation card
      TaskUpdateBlock.tsx         # NEW — status change + field updates
      TaskListBlock.tsx           # NEW — formatted task summary
      ContentBlockRenderer.tsx    # Existing — no changes needed
      MessageBubble.tsx           # Existing — minor changes for answer pairing
      cleanUserText.ts            # Existing — parseUserAnswer already handles AskUserQuestion results
```

### Pattern 1: Discriminated Dispatch in ToolCallBlock
**What:** ToolCallBlock checks the tool `name` prop and dispatches to a specialized renderer component before falling through to the generic display. This is the same pattern already used for AskUserQuestion — extend it to TaskCreate, TaskUpdate, and TaskList.
**When to use:** Every tool_use content block passes through ToolCallBlock. Specialized tools get rich rendering; everything else gets the existing generic card.
**Confidence:** HIGH — this pattern already exists in the codebase.

```typescript
// ToolCallBlock.tsx — dispatch pattern (already exists for AskUserQuestion)
export function ToolCallBlock({ name, input, toolUseId }: ToolCallBlockProps): React.JSX.Element {
  // Specialized renderers by tool name
  if (name === 'AskUserQuestion') {
    return <AskUserQuestionBlock input={input} toolUseId={toolUseId} />
  }
  if (name === 'TaskCreate') {
    return <TaskCreateBlock input={input} />
  }
  if (name === 'TaskUpdate') {
    return <TaskUpdateBlock input={input} />
  }
  if (name === 'TaskList') {
    return <TaskListBlock input={input} />
  }

  // Generic fallback (existing code)
  const summary = summarizeToolInput(name, input)
  return ( /* existing generic card */ )
}
```

### Pattern 2: Answer Pairing via toolUseMap + followUpMessages
**What:** AskUserQuestion's selected answer comes from a tool_result in a followUpMessage (a user message that's tool_result-only, folded into the step). The answer text is already parsed by `parseUserAnswer()` in `cleanUserText.ts`. The tool_use_id on the tool_result links back to the AskUserQuestion tool_use block.
**When to use:** AskUserQuestionBlock needs to display which option the user selected.
**Confidence:** HIGH — the pairing mechanism already exists and works (MessageBubble already renders answer chips from followUpMessages).

**Current data flow:**
1. Assistant message contains `tool_use` block with `name: "AskUserQuestion"`, `id: "toolu_xxx"`, `input: { questions: [...] }`
2. User message (followUp) contains `tool_result` block with `tool_use_id: "toolu_xxx"`, `content: "User has answered your questions: \"Q\"=\"A\". You can now continue..."`
3. `parseUserAnswer()` extracts the answer string(s) from the tool_result content
4. StepView renders followUpMessages after the assistant message

**Key insight:** The answer display currently happens in MessageBubble for followUp messages (accent-colored chips). With the Phase 9 upgrade, the answer should be shown WITHIN the AskUserQuestionBlock itself (question + options + selected answer all together). This means:
- The AskUserQuestionBlock needs access to the matched tool_result content
- Either pass the answer data down as a prop, OR keep the current pattern where the followUpMessage renders separately below the question

**Recommended approach:** Pass a `selectedAnswer` prop to AskUserQuestionBlock. The parent (ToolCallBlock or MessageBubble) can look up the paired tool_result from the toolUseMap or followUpMessages. This keeps the question and answer visually unified in one block.

### Pattern 3: Expand/Collapse for Option Descriptions
**What:** AskUserQuestion options show labels by default with expandable descriptions. Use the same expand/collapse pattern as ThinkingBlock: local `useState`, ChevronRight icon with rotation transform, conditional content render.
**When to use:** Each option description is independently expandable (user decided: "show labels by default, expand for full descriptions").
**Confidence:** HIGH — ThinkingBlock.tsx demonstrates this exact pattern.

```typescript
// Per-option expand/collapse (following ThinkingBlock pattern)
const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set())

function toggleOption(index: number): void {
  setExpandedOptions(prev => {
    const next = new Set(prev)
    next.has(index) ? next.delete(index) : next.add(index)
    return next
  })
}
```

### Pattern 4: Status Color Constants
**What:** TaskUpdate status changes use semantic colors. Define them as component-level constants (not theme tokens) to stay consistent with the existing codebase pattern.
**When to use:** TaskUpdate and TaskList status rendering.
**Confidence:** HIGH — follows existing pattern of inline color values used in ToolCallBlock and MessageBubble.

```typescript
const STATUS_COLORS = {
  pending: 'var(--color-text-muted)',        // gray/muted
  in_progress: '#f59e0b',                     // amber/yellow
  completed: '#10b981',                       // green
  deleted: 'rgba(239, 68, 68, 0.8)'          // red (matches existing error color)
} as const
```

### Anti-Patterns to Avoid
- **Prop drilling answer data through MessageList -> MessageBubble -> ContentBlockRenderer -> ToolCallBlock:** Instead, compute the answer at the ToolCallBlock level using the toolUseId to look up the paired result. The toolUseMap is already available via props.
- **Global state for expand/collapse:** Option expansion is local UI state, not application state. Use local `useState` (same as ThinkingBlock), not Zustand.
- **Parsing tool_result content inside the renderer:** Use the existing `parseUserAnswer()` utility. Do not duplicate parsing logic.
- **Creating CSS class-based styling:** The entire codebase uses inline styles with CSS custom properties. Do not introduce `.ask-user-question { }` CSS classes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon rendering | Custom SVG components | `lucide-react` (already installed) | Consistent sizing, tree-shakeable, matches existing usage |
| Expand/collapse animation | Custom animation system | CSS `transform: rotate()` + `transition` on ChevronRight | ThinkingBlock already demonstrates this exact pattern |
| Answer parsing | New regex for tool_result content | `parseUserAnswer()` from `cleanUserText.ts` | Already handles single-answer, multi-answer, and "user notes" formats |
| Tool rejection detection | New rejection parser | `parseToolRejection()` from `cleanUserText.ts` | Already handles the exact format |
| Tool result content normalization | New normalizer | `normalizeToolResultContent()` from `ToolCallBlock.tsx` | Already handles string, array, and null cases |

**Key insight:** The parsing and normalization infrastructure for these tools already exists. Phase 3 built `parseUserAnswer`, `parseToolRejection`, and `normalizeToolResultContent`. This phase only builds display components that consume their output.

## Common Pitfalls

### Pitfall 1: Answer Appears Twice (in question block AND as follow-up message)
**What goes wrong:** AskUserQuestionBlock shows the selected answer within its card, AND the followUpMessage still renders the same answer as accent chips below.
**Why it happens:** The current architecture renders followUpMessages in StepView separately from the assistant message's tool_use blocks. If AskUserQuestionBlock now shows the answer internally, the followUp rendering creates duplication.
**How to avoid:** When AskUserQuestionBlock successfully displays the answer, suppress the follow-up message rendering for that specific tool_use_id. This can be done by filtering followUpMessages in StepView or by having MessageBubble skip tool_result blocks whose tool_use_id maps to a tool that has its own answer display.
**Warning signs:** During visual testing, the same answer text appears twice on screen.

### Pitfall 2: Multi-Question Answer Parsing Fails
**What goes wrong:** Multi-question AskUserQuestion calls (2-4 questions in one tool_use) have a combined answer format in the tool_result: `"Q1"="A1", "Q2"="A2"`. The current `parseUserAnswer()` only extracts the first question's answer.
**Why it happens:** The regex in `parseUserAnswer` matches `"question"="answer"` but only captures one pair. Real data shows: `"Which model?"="Quality", "Spawn Researcher?"="Yes"`.
**How to avoid:** Enhance `parseUserAnswer()` to return an array of `{ question, answers }` pairs, not just a flat `answers` array. Match all `"Q"="A"` pairs in the result string.
**Warning signs:** Multi-question AskUserQuestion blocks show only the first answer or show all answers combined without question association.

### Pitfall 3: TaskList Has No Real Data in Test Files
**What goes wrong:** TaskList rendering code cannot be visually verified with the existing `.promptplay` test data because no sessions in the test file contain TaskList tool_use blocks.
**Why it happens:** The test data (PromptPlayerInitialPhases.promptplay) was built from GSD workflow sessions that used AskUserQuestion heavily but TaskList sparingly (or not at all in the captured sessions).
**How to avoid:** Create a minimal test fixture or use a real JSONL session that contains TaskCreate/TaskUpdate/TaskList calls. The file `53a9b40c-0e2e-483a-9b12-0a313117a6d8.jsonl` in the projects directory has 5 TaskCreate and 1 TaskUpdate calls.
**Warning signs:** Unable to verify TaskList rendering during development; only unit tests (if any) cover it.

### Pitfall 4: Inline Style Objects Re-created Every Render
**What goes wrong:** Large inline style objects defined inside JSX cause unnecessary re-renders and garbage collection pressure.
**Why it happens:** Each render creates new object references for style props.
**How to avoid:** Extract static style objects as module-level constants (same pattern used in MarkdownRenderer.tsx with `STABLE_REMARK_PLUGINS` and `STABLE_REHYPE_PLUGINS`). Only use inline styles for dynamic values (e.g., selected state).
**Warning signs:** React DevTools Profiler shows unnecessary re-renders of specialized blocks.

### Pitfall 5: AskUserQuestion input.questions Can Be Malformed
**What goes wrong:** The renderer crashes or shows empty content for edge-case AskUserQuestion inputs.
**Why it happens:** Real data shows: (1) questions array with >4 items triggers a validation error (the tool returns an error tool_result instead of answers), (2) some AskUserQuestion calls may have malformed questions arrays, (3) tool rejections have entirely different content format.
**How to avoid:** Defensive parsing: always check for array existence, handle empty arrays, handle missing fields. Fall back to the generic ToolCallBlock display for unparseable inputs. The existing `extractAskOptions()` function already handles some of this — extend its defensive checks.
**Warning signs:** Blank or errored specialized blocks where the generic fallback would have shown something useful.

### Pitfall 6: TaskUpdate input Has Many Optional Fields
**What goes wrong:** TaskUpdate renderer assumes all fields are present but most are optional.
**Why it happens:** TaskUpdate can update any combination of: taskId, status, subject, description, activeForm, owner, metadata, addBlocks, addBlockedBy. Real data shows most TaskUpdate calls only change status or description.
**How to avoid:** Render only the fields that are present in the input. Status change is the most common and most prominent (per user decision). Other fields render as secondary items only when they exist.
**Warning signs:** Blank space, "undefined" text, or layout gaps when optional fields are missing.

## Code Examples

Verified patterns from the existing codebase:

### AskUserQuestion Data Schema (from 80 real examples)
```typescript
// tool_use input schema (verified from real JSONL data)
interface AskUserQuestionInput {
  questions: Array<{
    question: string            // The question text
    header?: string             // Label/tag above question (e.g., "Discuss", "Layout")
    options: Array<{
      label: string             // Short option text (always shown)
      description?: string      // Longer description (expandable)
    }>
    multiSelect: boolean        // true = checkboxes, false = radio
  }>
}

// tool_result content format (verified from real JSONL data)
// Single question:
//   'User has answered your questions: "Question text?"="Selected option". You can now continue...'
// Multi-question:
//   'User has answered your questions: "Q1"="A1", "Q2"="A2". You can now continue...'
// With user notes:
//   '... "Q"="A" user notes: free text here. You can now continue...'
// Rejection (is_error: true):
//   "The user doesn't want to proceed with this tool use..."
```

### TaskCreate Data Schema (from 5 real examples)
```typescript
// tool_use input schema (verified from real JSONL data)
interface TaskCreateInput {
  subject: string              // Brief imperative title (e.g., "Fix session separator layout")
  description: string          // Detailed description with context
  activeForm?: string          // Present continuous form (e.g., "Fixing session separator layout")
  metadata?: Record<string, unknown>  // Arbitrary key-value pairs
}

// tool_result content format:
//   "Task #1 created successfully: [subject text]"
```

### TaskUpdate Data Schema (from 1 real example + system prompt)
```typescript
// tool_use input schema (verified from system prompt + real data)
interface TaskUpdateInput {
  taskId: string               // Always present
  status?: 'pending' | 'in_progress' | 'completed' | 'deleted'
  subject?: string             // New title
  description?: string         // New description
  activeForm?: string          // New spinner text
  owner?: string               // Agent name
  metadata?: Record<string, unknown>
  addBlocks?: string[]         // Task IDs this blocks
  addBlockedBy?: string[]      // Task IDs blocking this
}

// tool_result content format:
//   "Updated task #2 description"
//   "Updated task #3 status to completed"
```

### TaskList Data Schema (from system prompt — no real examples available)
```typescript
// tool_use input schema (no parameters — empty object)
interface TaskListInput {
  // No parameters — TaskList takes no input
}

// tool_result content format (from system prompt documentation):
// Returns summary of each task:
//   id, subject, status, owner, blockedBy
// Exact format: likely structured text or markdown table
// Confidence: MEDIUM — no real JSONL examples to verify exact format
```

### Existing Answer Parsing (from cleanUserText.ts)
```typescript
// Source: src/renderer/src/components/message/cleanUserText.ts
export function parseUserAnswer(text: string): { answers: string[] } | null {
  let raw = text.match(
    /User has answered your questions?\s*"[^"]*?"="([^"]*?)"/
  )
  if (!raw) {
    const stripped = text.replace(/<[^>]*>/g, ' ').trim()
    raw = stripped.match(
      /User has answered your questions?\s*"[^"]*?"="([^"]*?)"/
    )
  }
  if (!raw) return null
  const answerStr = raw[1]
  const answers = answerStr.split(',').map((a) => a.trim()).filter(Boolean)
  return { answers }
}
```

### Existing Expand/Collapse Pattern (from ThinkingBlock.tsx)
```typescript
// Source: src/renderer/src/components/message/ThinkingBlock.tsx
const [isExpanded, setIsExpanded] = useState(false)

<button onClick={() => setIsExpanded(prev => !prev)}>
  <ChevronRight
    size={14}
    style={{
      transition: 'transform 0.15s ease',
      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
      flexShrink: 0
    }}
  />
</button>

{isExpanded && (
  <div style={{ /* expanded content */ }}>
    {content}
  </div>
)}
```

### Existing Tool Call Container Style (from ToolCallBlock.tsx)
```typescript
// Source: src/renderer/src/components/message/ToolCallBlock.tsx
// Standard container for tool call display blocks
const containerStyle = {
  background: 'var(--color-bg-tertiary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
  margin: 'var(--space-2) 0'
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic one-line tool summary for all tools | Discriminated dispatch to specialized renderers by tool name | Phase 3 started this (AskUserQuestion basic renderer) | Phase 9 extends to remaining narrative tools |
| Flat answer chips in followUp messages | Integrated question+answer display in single block | Phase 9 (this phase) | Answer context is visible alongside the question and options |

**Deprecated/outdated:**
- The current AskUserQuestion renderer in ToolCallBlock.tsx (lines 46-105) will be replaced by the new AskUserQuestionBlock component. The existing `extractAskOptions()` helper can be reused or adapted.

## Open Questions

1. **Multi-question answer pairing**
   - What we know: Multi-question results combine all answers in one tool_result string: `"Q1"="A1", "Q2"="A2"`.
   - What's unclear: The current `parseUserAnswer()` regex only captures the first answer. Does it need to return all question-answer pairs for proper display?
   - Recommendation: Enhance `parseUserAnswer()` to extract ALL `"question"="answer"` pairs with a global regex match. Return `{ pairs: Array<{ question: string, answers: string[] }> }` instead of flat `{ answers: string[] }`. This is a minor utility change.

2. **TaskList tool_result format**
   - What we know: TaskList has no parameters (empty input). The result is a summary of all tasks with id, subject, status, owner, blockedBy.
   - What's unclear: The exact text format of the tool_result content. No real JSONL examples exist in the test data.
   - Recommendation: Build a flexible parser that handles both structured text (markdown table) and plain text listing. Fall back to displaying raw text if format is unrecognized. LOW confidence on exact format — verify with a real session containing TaskList calls.

3. **Suppressing duplicate answer display**
   - What we know: Currently, AskUserQuestion answers appear as followUpMessages rendered by MessageBubble. If AskUserQuestionBlock now shows answers internally, they'll appear twice.
   - What's unclear: Whether to suppress the followUpMessage entirely, or keep both (question block shows "selected" state, followUp shows "user response" context).
   - Recommendation: Suppress the followUpMessage when the AskUserQuestionBlock successfully displays the answer. This avoids visual duplication. Implement by filtering tool_result followUpMessages whose tool_use_id matches a specialized tool.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/renderer/src/components/message/ToolCallBlock.tsx` — existing AskUserQuestion renderer
- Codebase analysis: `src/renderer/src/components/message/cleanUserText.ts` — parseUserAnswer, parseToolRejection
- Codebase analysis: `src/renderer/src/components/message/MessageBubble.tsx` — answer chip rendering
- Codebase analysis: `src/renderer/src/components/message/ThinkingBlock.tsx` — expand/collapse pattern
- Codebase analysis: `src/renderer/src/components/player/StepView.tsx` — followUpMessages rendering
- Codebase analysis: `src/renderer/src/types/pipeline.ts` — ContentBlock, ToolUseBlock, ToolResultBlock types
- Codebase analysis: `src/main/pipeline/classifier.ts` — NARRATIVE_TOOLS classification
- Real JSONL data: 80 AskUserQuestion examples, 5 TaskCreate examples, 1 TaskUpdate example from project sessions
- Real `.promptplay` data: `test-data/PromptPlayerInitialPhases.promptplay` — verified AskUserQuestion data formats

### Secondary (MEDIUM confidence)
- [Lucide icons for task management](https://lucide.dev/icons/list-todo) — ListTodo, CircleCheck, ListChecks icons
- [Lucide icons for questions](https://lucide.dev/icons/message-circle-question-mark) — MessageCircleQuestion, CircleHelp icons
- [Claude Code system prompts — TaskCreate schema](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-taskcreate.md) — TaskCreate parameters and behavior
- [Task Management documentation](https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/8-task-management) — TaskCreate, TaskUpdate, TaskList schemas

### Tertiary (LOW confidence)
- TaskList tool_result format — no real JSONL examples available; format inferred from system prompt documentation only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing
- Architecture: HIGH — extends existing dispatch pattern already proven in codebase
- Data schemas: HIGH for AskUserQuestion (80 examples), MEDIUM for TaskCreate (5 examples), LOW for TaskList (0 examples)
- Pitfalls: HIGH — identified from real data analysis and existing code review

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable — internal component architecture, no external API dependencies)
