import { AskUserQuestionBlock } from './AskUserQuestionBlock'
import { TaskCreateBlock } from './TaskCreateBlock'
import { TaskUpdateBlock } from './TaskUpdateBlock'
import { TaskListBlock } from './TaskListBlock'

/**
 * Summarize tool input into a short display string.
 * Picks the most informative field from the tool's input object.
 */
function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  // Special case: AskUserQuestion — input has `questions` array, not `question` string
  if (name === 'AskUserQuestion') {
    if (typeof input.question === 'string') return truncate(input.question, 100)
    if (Array.isArray(input.questions) && input.questions.length > 0) {
      const first = input.questions[0] as Record<string, unknown>
      if (typeof first.question === 'string') return truncate(first.question, 100)
    }
  }

  // Common informative fields in priority order
  if (typeof input.description === 'string') return truncate(input.description, 100)
  if (typeof input.command === 'string') return truncate(input.command, 80)
  if (typeof input.file_path === 'string') return input.file_path
  if (typeof input.path === 'string') return input.path

  // Fallback: first string value
  for (const value of Object.values(input)) {
    if (typeof value === 'string' && value.length > 0) {
      return truncate(value, 80)
    }
  }

  return ''
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

// ---------------------------------------------------------------------------
// ToolCallBlock
// ---------------------------------------------------------------------------

interface ToolCallBlockProps {
  name: string
  input: Record<string, unknown>
  toolUseId: string
  answerText?: string | null
}

/**
 * Compact card showing a tool call's name and a brief input summary.
 * Dispatches to specialized renderers for supported tools:
 *   1. AskUserQuestion -> AskUserQuestionBlock
 *   2. TaskCreate -> TaskCreateBlock
 *   3. TaskUpdate -> TaskUpdateBlock
 *   4. TaskList -> TaskListBlock
 *   5. Generic fallback (all other tools)
 *
 * Input shape is validated in the dispatcher before rendering specialized
 * components via JSX (never called as plain functions to avoid React hooks violations).
 * Rendered for narrative/unknown tools; plumbing tools are filtered upstream.
 */
export function ToolCallBlock({ name, input, toolUseId, answerText }: ToolCallBlockProps): React.JSX.Element {
  // 1. AskUserQuestion — validate that input.questions is an array
  if (name === 'AskUserQuestion' && Array.isArray(input.questions)) {
    return <AskUserQuestionBlock input={input} toolUseId={toolUseId} answerText={answerText ?? null} />
  }

  // 2. TaskCreate — validate that input.subject is a string
  if (name === 'TaskCreate' && typeof input.subject === 'string') {
    return <TaskCreateBlock input={input} resultText={answerText ?? null} />
  }

  // 3. TaskUpdate — validate that input.taskId is a string
  if (name === 'TaskUpdate' && typeof input.taskId === 'string') {
    return <TaskUpdateBlock input={input} resultText={answerText ?? null} />
  }

  // 4. TaskList — no input validation needed (empty input is normal)
  if (name === 'TaskList') {
    return <TaskListBlock input={input} resultText={answerText ?? null} />
  }

  // 5. Generic fallback for all other tools
  const summary = summarizeToolInput(name, input)

  return (
    <div
      style={{
        background: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        margin: 'var(--space-2) 0'
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-accent)',
          fontWeight: 600,
          fontSize: 'var(--text-sm)'
        }}
      >
        {name}
      </span>
      {summary && (
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 'var(--space-1)'
          }}
        >
          {summary}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ToolResultBlock
// ---------------------------------------------------------------------------

interface ToolResultBlockProps {
  content: unknown
  isError: boolean
}

/**
 * Coerce tool_result content to a string.
 * In the JSONL data, content can be a string, an array of {type:"text", text:"..."} blocks,
 * or other unexpected shapes. Normalize to string for display.
 */
function normalizeToolResultContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
          return item.text
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  if (content == null) return ''
  return String(content)
}

/**
 * Subdued display of a tool result, truncated to a few lines.
 * Returns null for empty content.
 */
export function ToolResultBlock({ content, isError }: ToolResultBlockProps): React.JSX.Element | null {
  const text = normalizeToolResultContent(content)
  if (!text) return null

  // Truncate to first 6 lines or 400 chars, whichever is shorter
  const lines = text.split('\n').slice(0, 6)
  let display = lines.join('\n')
  if (display.length > 400) {
    display = display.slice(0, 400) + '...'
  } else if (text.split('\n').length > 6) {
    display += '...'
  }

  return (
    <div
      style={{
        fontSize: 'var(--text-sm)',
        color: isError ? 'rgba(239, 68, 68, 0.8)' : 'var(--color-text-secondary)',
        fontFamily: 'var(--font-mono)',
        padding: 'var(--space-2)',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.4
      }}
    >
      {display}
    </div>
  )
}
