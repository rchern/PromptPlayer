import { ListPlus } from 'lucide-react'

// ---------------------------------------------------------------------------
// Style constants (module-level to avoid re-creation per render)
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  background: 'var(--color-bg-tertiary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
  margin: 'var(--space-2) 0'
}

const headerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3em',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-accent)',
  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
  padding: '0.15em 0.5em',
  borderRadius: 'var(--radius-sm)'
}

const subjectStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)',
  fontWeight: 600,
  lineHeight: 1.4
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.5,
  marginTop: 'var(--space-2)'
}

const activeFormStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  fontStyle: 'italic',
  marginTop: 'var(--space-2)'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const taskIdStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)'
}

interface TaskCreateBlockProps {
  input: Record<string, unknown>
  resultText: string | null
}

/** Try to extract task ID from tool_result text (e.g., "Task created with id: 1") */
function parseTaskId(resultText: string | null): string | null {
  if (!resultText) return null
  const match = resultText.match(/#(\d+)|id[:\s]+(\d+)/i)
  return match ? (match[1] || match[2]) : null
}

/**
 * Specialized renderer for TaskCreate tool calls.
 * Shows the task subject prominently and description in secondary style.
 *
 * Returns null if input.subject is not a string (last-resort safety net;
 * primary guard is in ToolCallBlock dispatcher).
 */
export function TaskCreateBlock({ input, resultText }: TaskCreateBlockProps): React.JSX.Element | null {
  if (typeof input.subject !== 'string') return null

  const subject = input.subject
  const description = typeof input.description === 'string' ? input.description : null
  const activeForm = typeof input.activeForm === 'string' ? input.activeForm : null
  const taskId = parseTaskId(resultText)

  return (
    <div style={containerStyle}>
      {/* Header row: tag + task ID */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        <div style={headerStyle}>
          <ListPlus size={12} style={{ flexShrink: 0 }} />
          Task Created
        </div>
        {taskId && <span style={taskIdStyle}>#{taskId}</span>}
      </div>

      {/* Subject line */}
      <div style={subjectStyle}>{subject}</div>

      {/* Description */}
      {description && (
        <div style={descriptionStyle}>{description}</div>
      )}

      {/* Active form note */}
      {activeForm && (
        <div style={activeFormStyle}>Spinner text: {activeForm}</div>
      )}
    </div>
  )
}
