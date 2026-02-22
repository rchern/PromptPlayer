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
}

/** Extract AskUserQuestion options for richer display */
function extractAskOptions(input: Record<string, unknown>): { question: string; options: string[] } | null {
  const questions = Array.isArray(input.questions) ? input.questions : []
  if (questions.length === 0) return null
  const first = questions[0] as Record<string, unknown>
  const question = typeof first.question === 'string' ? first.question : ''
  const opts = Array.isArray(first.options)
    ? (first.options as Array<Record<string, unknown>>)
        .map((o) => (typeof o.label === 'string' ? o.label : ''))
        .filter(Boolean)
    : []
  if (!question) return null
  return { question, options: opts }
}

/**
 * Compact card showing a tool call's name and a brief input summary.
 * Rendered for narrative/unknown tools; plumbing tools are filtered upstream.
 */
export function ToolCallBlock({ name, input }: ToolCallBlockProps): React.JSX.Element {
  // Rich rendering for AskUserQuestion
  if (name === 'AskUserQuestion') {
    const ask = extractAskOptions(input)
    if (ask) {
      return (
        <div
          style={{
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            margin: 'var(--space-2) 0'
          }}
        >
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
            {ask.question}
          </div>
          {ask.options.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {ask.options.map((opt, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 'var(--text-sm)',
                    padding: '0.2em 0.6em',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-muted)',
                    background: 'var(--color-bg-secondary)'
                  }}
                >
                  {opt}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    }
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
