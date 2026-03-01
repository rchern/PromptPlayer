import { AskUserQuestionBlock } from './AskUserQuestionBlock'

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
 * Dispatches to specialized renderers for supported tools (AskUserQuestion).
 * Rendered for narrative/unknown tools; plumbing tools are filtered upstream.
 */
export function ToolCallBlock({ name, input, toolUseId, answerText }: ToolCallBlockProps): React.JSX.Element {
  // Specialized rendering for AskUserQuestion
  if (name === 'AskUserQuestion') {
    const specialized = AskUserQuestionBlock({ input, toolUseId, answerText: answerText ?? null })
    if (specialized) return specialized
  }

  // Generic tool call display
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
