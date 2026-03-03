import { ListChecks, Circle, CheckCircle2, Loader } from 'lucide-react'

// ---------------------------------------------------------------------------
// Status constants
// ---------------------------------------------------------------------------

const STATUS_COLORS = {
  pending: 'var(--color-text-muted)',
  in_progress: '#f59e0b',
  completed: '#10b981',
  deleted: 'rgba(239, 68, 68, 0.8)'
} as const

type TaskStatus = keyof typeof STATUS_COLORS

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
  borderRadius: 'var(--radius-sm)',
  marginBottom: 'var(--space-2)'
}

const taskItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-2)',
  padding: 'var(--space-1) 0',
  fontSize: 'var(--text-sm)',
  lineHeight: 1.4
}

const taskSubjectStyle: React.CSSProperties = {
  color: 'var(--color-text-primary)',
  flex: 1
}

const fallbackStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-mono)',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.4,
  marginTop: 'var(--space-1)'
}

const emptyStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-muted)',
  fontStyle: 'italic'
}

// ---------------------------------------------------------------------------
// Task line parsing
// ---------------------------------------------------------------------------

interface ParsedTask {
  id: string | null
  subject: string
  status: TaskStatus | null
}

/**
 * Attempt to parse resultText into structured task entries.
 * Handles common patterns:
 * - "- **subject**: status"
 * - "#N | subject | status"
 * - "#N subject (status)"
 * - "Task #N: subject [status]"
 * Returns null if text does not match any known structured pattern.
 */
function parseTaskLines(text: string): ParsedTask[] | null {
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return null

  const tasks: ParsedTask[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Pattern: "- **subject**: status" or "- subject: status"
    const dashMatch = trimmed.match(/^[-*]\s+(?:\*\*(.+?)\*\*|(.+?)):\s+(\w+)/)
    if (dashMatch) {
      const subject = dashMatch[1] || dashMatch[2]
      const status = normalizeStatus(dashMatch[3])
      tasks.push({ id: null, subject, status })
      continue
    }

    // Pattern: "#N | subject | status" or "N | subject | status"
    const pipeMatch = trimmed.match(/^#?(\d+)\s*\|\s*(.+?)\s*\|\s*(\w+)/)
    if (pipeMatch) {
      tasks.push({ id: pipeMatch[1], subject: pipeMatch[2], status: normalizeStatus(pipeMatch[3]) })
      continue
    }

    // Pattern: "Task #N: subject [status]" or "#N subject (status)"
    const taskMatch = trimmed.match(/(?:Task\s+)?#(\d+)[:\s]+(.+?)\s*[\[(](\w+)[\])]/)
    if (taskMatch) {
      tasks.push({ id: taskMatch[1], subject: taskMatch[2], status: normalizeStatus(taskMatch[3]) })
      continue
    }

    // Pattern: "#N: subject - status"
    const hashDashMatch = trimmed.match(/^#(\d+)[:\s]+(.+?)\s+-\s+(\w+)\s*$/)
    if (hashDashMatch) {
      tasks.push({
        id: hashDashMatch[1],
        subject: hashDashMatch[2],
        status: normalizeStatus(hashDashMatch[3])
      })
      continue
    }
  }

  // Only return parsed tasks if we found at least one
  return tasks.length > 0 ? tasks : null
}

function normalizeStatus(raw: string): TaskStatus | null {
  const lower = raw.toLowerCase()
  if (lower === 'pending') return 'pending'
  if (lower === 'in_progress' || lower === 'in-progress' || lower === 'inprogress') return 'in_progress'
  if (lower === 'completed' || lower === 'complete' || lower === 'done') return 'completed'
  if (lower === 'deleted') return 'deleted'
  return null
}

// ---------------------------------------------------------------------------
// Status icon helper
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: TaskStatus | null }): React.JSX.Element {
  if (status === 'completed') {
    return <CheckCircle2 size={14} color={STATUS_COLORS.completed} style={{ flexShrink: 0, marginTop: '0.15em' }} />
  }
  if (status === 'in_progress') {
    return <Loader size={14} color={STATUS_COLORS.in_progress} style={{ flexShrink: 0, marginTop: '0.15em' }} />
  }
  if (status === 'deleted') {
    return (
      <Circle
        size={14}
        color={STATUS_COLORS.deleted}
        style={{ flexShrink: 0, marginTop: '0.15em', opacity: 0.5 }}
      />
    )
  }
  // pending or unknown
  return (
    <Circle
      size={14}
      color={STATUS_COLORS.pending}
      style={{ flexShrink: 0, marginTop: '0.15em' }}
    />
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TaskListBlockProps {
  input: Record<string, unknown>
  resultText: string | null
}

/**
 * Specialized renderer for TaskList tool calls.
 * Attempts to parse the tool_result into a structured task checklist.
 * Falls back to monospace pre-wrapped text if parsing fails.
 * Shows a "No tasks" placeholder if resultText is null/empty.
 */
export function TaskListBlock({ resultText }: TaskListBlockProps): React.JSX.Element {
  const parsedTasks = resultText ? parseTaskLines(resultText) : null

  return (
    <div style={containerStyle}>
      {/* Header tag */}
      <div style={headerTagStyle}>
        <ListChecks size={12} style={{ flexShrink: 0 }} />
        Task Summary
      </div>

      {/* Parsed task checklist */}
      {parsedTasks && parsedTasks.length > 0 && (
        <div>
          {parsedTasks.map((task, i) => (
            <div key={i} style={taskItemStyle}>
              <StatusIcon status={task.status} />
              <span style={taskSubjectStyle}>
                {task.id && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      marginRight: '0.4em'
                    }}
                  >
                    #{task.id}
                  </span>
                )}
                {task.subject}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Fallback: raw text when parsing fails */}
      {!parsedTasks && resultText && (
        <div style={fallbackStyle}>{resultText}</div>
      )}

      {/* Empty state */}
      {!resultText && (
        <div style={emptyStyle}>No tasks</div>
      )}
    </div>
  )
}
