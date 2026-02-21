import React from 'react'
import { AlertCircle } from 'lucide-react'
import type { SessionMetadata } from '../../types/pipeline'

interface SessionCardProps {
  session: SessionMetadata
  onSelect: (session: SessionMetadata) => void
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

export function SessionCard({ session, onSelect }: SessionCardProps): React.JSX.Element {
  const hasError = session.parseError !== null

  return (
    <button
      onClick={() => onSelect(session)}
      className="flex flex-col w-full text-left cursor-pointer"
      style={{
        backgroundColor: hasError ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-bg-elevated)',
        border: `1px solid ${hasError ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        gap: 'var(--space-2)',
        transition: 'all 150ms ease',
        outline: 'none'
      }}
      onMouseEnter={(e) => {
        if (hasError) {
          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
        } else {
          e.currentTarget.style.borderColor = 'var(--color-accent)'
        }
        e.currentTarget.style.backgroundColor = hasError
          ? 'rgba(239, 68, 68, 0.08)'
          : 'var(--color-bg-tertiary)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = hasError
          ? 'rgba(239, 68, 68, 0.3)'
          : 'var(--color-border)'
        e.currentTarget.style.backgroundColor = hasError
          ? 'rgba(239, 68, 68, 0.05)'
          : 'var(--color-bg-elevated)'
      }}
    >
      {/* Top row: date and message count / error badge */}
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
