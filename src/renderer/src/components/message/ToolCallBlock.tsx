/**
 * Summarize tool input into a short display string.
 * Picks the most informative field from the tool's input object.
 */
function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  // Special case: AskUserQuestion shows the question
  if (name === 'AskUserQuestion' && typeof input.question === 'string') {
    return truncate(input.question, 100)
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

/**
 * Compact card showing a tool call's name and a brief input summary.
 * Rendered for narrative/unknown tools; plumbing tools are filtered upstream.
 */
export function ToolCallBlock({ name, input }: ToolCallBlockProps): React.JSX.Element {
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
  content: string
  isError: boolean
}

/**
 * Subdued display of a tool result, truncated to a few lines.
 * Returns null for empty content.
 */
export function ToolResultBlock({ content, isError }: ToolResultBlockProps): React.JSX.Element | null {
  if (!content) return null

  // Truncate to first 3 lines or 200 chars, whichever is shorter
  const lines = content.split('\n').slice(0, 3)
  let display = lines.join('\n')
  if (display.length > 200) {
    display = display.slice(0, 200) + '...'
  } else if (content.split('\n').length > 3) {
    display += '...'
  }

  return (
    <div
      style={{
        fontSize: 'var(--text-sm)',
        color: isError ? 'rgba(239, 68, 68, 0.8)' : 'var(--color-text-secondary)',
        fontFamily: 'var(--font-mono)',
        padding: 'var(--space-2)',
        maxHeight: '4em',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.4
      }}
    >
      {display}
    </div>
  )
}
