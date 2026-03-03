import React, { useEffect, useRef } from 'react'
import { AlertCircle, Clock } from 'lucide-react'
import type { SessionMetadata } from '../../types/pipeline'
import { formatSessionDuration } from '../../types/pipeline'

interface SessionCardProps {
  session: SessionMetadata
  onSelect: (session: SessionMetadata) => void
  isActive?: boolean
  showProject?: boolean
  selectable?: boolean
  isSelected?: boolean
  onToggleSelect?: (sessionId: string) => void
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'Unknown date'
  const date = new Date(timestamp)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

function truncateSnippet(text: string | null, maxLength: number = 100): string {
  if (!text) return 'No preview available'
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function SessionCard({
  session,
  onSelect,
  isActive = false,
  showProject = false,
  selectable = false,
  isSelected = false,
  onToggleSelect
}: SessionCardProps): React.JSX.Element {
  const ref = useRef<HTMLButtonElement>(null)
  const hasError = session.parseError !== null
  const duration = formatSessionDuration(session)
  const showDuration = duration !== 'Unknown'

  // Scroll into view when programmatically selected (e.g. after import)
  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isActive])

  const getBorderColor = (): string => {
    if (isSelected) return 'var(--color-accent)'
    if (isActive) return 'var(--color-accent)'
    if (hasError) return 'rgba(239, 68, 68, 0.3)'
    return 'var(--color-border)'
  }

  const getBgColor = (): string => {
    if (isSelected) return 'var(--color-accent-subtle)'
    if (isActive) return 'var(--color-accent-subtle)'
    if (hasError) return 'rgba(239, 68, 68, 0.05)'
    return 'var(--color-bg-elevated)'
  }

  return (
    <button
      ref={ref}
      onClick={() => {
        if (selectable) {
          onToggleSelect?.(session.sessionId)
        } else {
          onSelect(session)
        }
      }}
      className="flex flex-col w-full text-left cursor-pointer"
      style={{
        backgroundColor: getBgColor(),
        border: `1px solid ${getBorderColor()}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        paddingRight: selectable ? 'var(--space-10)' : 'var(--space-4)',
        gap: 'var(--space-2)',
        transition: 'all 150ms ease',
        outline: 'none',
        position: selectable ? 'relative' : undefined
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          if (hasError) {
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
          } else {
            e.currentTarget.style.borderColor = 'var(--color-accent)'
          }
          e.currentTarget.style.backgroundColor = hasError
            ? 'rgba(239, 68, 68, 0.08)'
            : 'var(--color-bg-tertiary)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = hasError
            ? 'rgba(239, 68, 68, 0.3)'
            : 'var(--color-border)'
          e.currentTarget.style.backgroundColor = hasError
            ? 'rgba(239, 68, 68, 0.05)'
            : 'var(--color-bg-elevated)'
        }
      }}
    >
      {/* Selection checkbox (selectable mode only) */}
      {selectable && (
        <div
          className="flex items-center"
          style={{ position: 'absolute', top: 'var(--space-3)', right: 'var(--space-3)' }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelect?.(session.sessionId)
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ accentColor: 'var(--color-accent)', width: '16px', height: '16px', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Top row: date, duration, message count, error badge */}
      <div className="flex items-center justify-between" style={{ gap: 'var(--space-2)' }}>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {formatTimestamp(session.firstTimestamp)}
        </span>
        <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
          {showDuration && (
            <span
              className="flex items-center"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                gap: '3px'
              }}
            >
              <Clock size={11} />
              {duration}
            </span>
          )}
          {session.messageCount > 0 && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)'
              }}
            >
              {session.messageCount} msgs
            </span>
          )}
          {hasError && (
            <span
              className="flex items-center"
              style={{
                fontSize: 'var(--text-xs)',
                color: '#ef4444',
                gap: 'var(--space-1)',
                fontWeight: 600
              }}
            >
              <AlertCircle size={12} />
              Error
            </span>
          )}
        </div>
      </div>

      {/* Project label (chronological view) */}
      {showProject && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-accent)',
            fontWeight: 500
          }}
        >
          {session.projectFolder}
        </span>
      )}

      {/* Snippet */}
      <span
        style={{
          fontSize: 'var(--text-sm)',
          color: hasError ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          lineHeight: 1.4
        }}
      >
        {hasError ? session.parseError : truncateSnippet(session.firstUserMessage)}
      </span>
    </button>
  )
}
