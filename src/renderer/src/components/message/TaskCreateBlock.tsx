import { useState } from 'react'
import { ListPlus, ChevronRight } from 'lucide-react'

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
  borderRadius: 'var(--radius-sm)',
  marginBottom: 'var(--space-2)'
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

const expandButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25em',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  color: 'var(--color-text-muted)',
  fontSize: 'var(--text-xs)',
  marginTop: 'var(--space-1)'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TaskCreateBlockProps {
  input: Record<string, unknown>
}

const DESCRIPTION_TRUNCATE_LENGTH = 200

/**
 * Specialized renderer for TaskCreate tool calls.
 * Shows the task subject prominently and description in secondary style.
 * Long descriptions are truncated with an expand/collapse toggle.
 *
 * Returns null if input.subject is not a string (last-resort safety net;
 * primary guard is in ToolCallBlock dispatcher).
 */
export function TaskCreateBlock({ input }: TaskCreateBlockProps): React.JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false)

  if (typeof input.subject !== 'string') return null

  const subject = input.subject
  const description = typeof input.description === 'string' ? input.description : null
  const activeForm = typeof input.activeForm === 'string' ? input.activeForm : null

  const isLongDescription = description !== null && description.length > DESCRIPTION_TRUNCATE_LENGTH
  const displayDescription =
    description !== null && isLongDescription && !isExpanded
      ? description.slice(0, DESCRIPTION_TRUNCATE_LENGTH) + '...'
      : description

  return (
    <div style={containerStyle}>
      {/* Header tag */}
      <div style={headerStyle}>
        <ListPlus size={12} style={{ flexShrink: 0 }} />
        Task Created
      </div>

      {/* Subject line */}
      <div style={subjectStyle}>{subject}</div>

      {/* Description */}
      {displayDescription && (
        <div style={descriptionStyle}>{displayDescription}</div>
      )}

      {/* Expand/collapse for long descriptions */}
      {isLongDescription && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          style={expandButtonStyle}
          aria-expanded={isExpanded}
        >
          <ChevronRight
            size={12}
            style={{
              transition: 'transform 0.15s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}
          />
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {/* Active form note */}
      {activeForm && (
        <div style={activeFormStyle}>Spinner text: {activeForm}</div>
      )}
    </div>
  )
}
