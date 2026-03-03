import { RefreshCw } from 'lucide-react'

// ---------------------------------------------------------------------------
// Status constants
// ---------------------------------------------------------------------------

const STATUS_COLORS = {
  pending: 'var(--color-text-muted)',
  in_progress: '#f59e0b',
  completed: '#10b981',
  deleted: 'rgba(239, 68, 68, 0.8)'
} as const

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  deleted: 'Deleted'
} as const

type TaskStatus = keyof typeof STATUS_COLORS

function isValidStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && value in STATUS_COLORS
}

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

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  marginBottom: 'var(--space-2)'
}

const headerTagStyle: React.CSSProperties = {
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

const taskIdStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)'
}

const secondaryFieldStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  lineHeight: 1.5,
  marginTop: 'var(--space-1)'
}

const secondaryLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginRight: '0.3em'
}

const secondarySectionStyle: React.CSSProperties = {
  marginTop: 'var(--space-2)',
  paddingTop: 'var(--space-2)',
  borderTop: '1px solid var(--color-border-subtle)'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const subjectStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)',
  fontWeight: 600,
  lineHeight: 1.4
}

interface TaskUpdateBlockProps {
  input: Record<string, unknown>
  resultText: string | null
}

/** Fields that can appear in a TaskUpdate besides taskId, status, and subject */
const SECONDARY_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'description', label: 'Description' },
  { key: 'activeForm', label: 'Spinner' },
  { key: 'owner', label: 'Owner' }
]

/** Try to extract subject from tool_result text (e.g., "Updated task #2 subject") */
function parseSubjectFromResult(resultText: string | null): string | null {
  if (!resultText) return null
  // Look for "subject: ..." or the task subject echoed in the result
  const match = resultText.match(/subject[:\s]+"([^"]+)"|subject[:\s]+(.+?)(?:\.|$)/i)
  return match ? (match[1] || match[2]?.trim()) || null : null
}

/**
 * Specialized renderer for TaskUpdate tool calls.
 * Status changes are the most prominent element (filled badge with status color).
 * Subject is shown prominently when available (from input or result text).
 * Other field changes render in a quieter secondary section.
 *
 * Returns null if input.taskId is not a string (last-resort safety net;
 * primary guard is in ToolCallBlock dispatcher).
 */
export function TaskUpdateBlock({ input, resultText }: TaskUpdateBlockProps): React.JSX.Element | null {
  if (typeof input.taskId !== 'string') return null

  const taskId = input.taskId
  const status: TaskStatus | null = isValidStatus(input.status) ? input.status : null

  // Subject: prefer from input (being changed), fall back to result text
  const subject = typeof input.subject === 'string' ? input.subject : parseSubjectFromResult(resultText)

  // Collect secondary field changes (only fields that are present, excluding subject which is shown prominently)
  const secondaryChanges: Array<{ label: string; value: string }> = []
  for (const field of SECONDARY_FIELDS) {
    const val = input[field.key]
    if (typeof val === 'string' && val.length > 0) {
      secondaryChanges.push({ label: field.label, value: val })
    }
  }

  // Array fields (addBlocks, addBlockedBy)
  if (Array.isArray(input.addBlocks) && input.addBlocks.length > 0) {
    secondaryChanges.push({ label: 'Blocks', value: input.addBlocks.join(', ') })
  }
  if (Array.isArray(input.addBlockedBy) && input.addBlockedBy.length > 0) {
    secondaryChanges.push({ label: 'Blocked by', value: input.addBlockedBy.join(', ') })
  }

  return (
    <div style={containerStyle}>
      {/* Header row: tag + task ID */}
      <div style={headerRowStyle}>
        <div style={headerTagStyle}>
          <RefreshCw size={12} style={{ flexShrink: 0 }} />
          Task Updated
        </div>
        <span style={taskIdStyle}>#{taskId}</span>
      </div>

      {/* Subject line (when available) */}
      {subject && <div style={subjectStyle}>{subject}</div>}

      {/* Status badge (primary element when present) */}
      {status && (
        <div
          style={{
            display: 'inline-block',
            padding: '0.25em 0.75em',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: '#fff',
            background: STATUS_COLORS[status]
          }}
        >
          {STATUS_LABELS[status]}
        </div>
      )}

      {/* Secondary field changes */}
      {secondaryChanges.length > 0 && (
        <div style={status ? secondarySectionStyle : undefined}>
          {secondaryChanges.map((change, i) => (
            <div key={i} style={secondaryFieldStyle}>
              <span style={secondaryLabelStyle}>{change.label}:</span>
              {change.value}
            </div>
          ))}
        </div>
      )}

      {/* Edge case: no status and no secondary changes — just show "Updated" */}
      {!status && secondaryChanges.length === 0 && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Updated
        </div>
      )}
    </div>
  )
}
