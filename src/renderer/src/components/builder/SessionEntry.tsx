import React from 'react'
import { Scissors, X } from 'lucide-react'
import type { SessionRef } from '../../types/presentation'
import { InlineEdit } from './InlineEdit'

// Module-level style constants (per project convention)
const actionButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--color-text-muted)',
  padding: 'var(--space-1)',
  borderRadius: 'var(--radius-sm)',
  opacity: 0,
  transition: 'opacity 150ms ease, color 150ms ease',
  flexShrink: 0
}

interface SessionEntryProps {
  sessionRef: SessionRef
  sectionId: string
  onRename: (sectionId: string, sessionId: string, name: string) => void
  onRemove: (sectionId: string, sessionId: string) => void
  onSplit?: (sectionId: string, sessionId: string) => void
  onClick?: () => void
}

export const SessionEntry = React.memo(function SessionEntry({
  sessionRef,
  sectionId,
  onRename,
  onRemove,
  onSplit,
  onClick
}: SessionEntryProps): React.JSX.Element {
  const formattedDate = sessionRef.sortKey
    ? new Date(sessionRef.sortKey).toLocaleString()
    : null

  return (
    <div
      className="flex items-center"
      style={{
        padding: 'var(--space-2) var(--space-3)',
        paddingLeft: 'var(--space-8)',
        gap: 'var(--space-3)',
        borderRadius: 'var(--radius-sm)',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'background-color 150ms ease'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
        const btns = e.currentTarget.querySelectorAll<HTMLElement>('[data-remove-btn], [data-split-btn]')
        btns.forEach((btn) => { btn.style.opacity = '1' })
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        const btns = e.currentTarget.querySelectorAll<HTMLElement>('[data-remove-btn], [data-split-btn]')
        btns.forEach((btn) => { btn.style.opacity = '0' })
      }}
    >
      {/* Display name (editable) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <InlineEdit
          value={sessionRef.displayName}
          onSave={(name) => onRename(sectionId, sessionRef.sessionId, name)}
        />
      </div>

      {/* Compact metadata: date */}
      {formattedDate && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          {formattedDate}
        </span>
      )}

      {/* Split to new section button (appears on hover) */}
      {onSplit && (
        <button
          data-split-btn
          onMouseDown={(e) => {
            // Prevent InlineEdit blur conflict (same pattern as remove button)
            e.preventDefault()
            onSplit(sectionId, sessionRef.sessionId)
          }}
          className="flex items-center justify-center cursor-pointer"
          title="Split to new section"
          style={actionButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)'
          }}
        >
          <Scissors size={14} />
        </button>
      )}

      {/* Remove button (appears on hover) */}
      <button
        data-remove-btn
        onMouseDown={(e) => {
          // Prevent InlineEdit blur conflict (Research pitfall 3)
          e.preventDefault()
          onRemove(sectionId, sessionRef.sessionId)
        }}
        className="flex items-center justify-center cursor-pointer"
        title="Remove session"
        style={actionButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ef4444'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-muted)'
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
})
