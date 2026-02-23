import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { usePresentationStore } from '../../stores/presentationStore'

interface PresentationListProps {
  onNewPresentation: () => void
}

export function PresentationList({
  onNewPresentation
}: PresentationListProps): React.JSX.Element {
  const {
    presentations,
    activePresentationId,
    setActivePresentation,
    deletePresentation
  } = usePresentationStore()

  const handleDelete = (e: React.MouseEvent, id: string, name: string): void => {
    e.stopPropagation()
    if (window.confirm(`Delete "${name}"?`)) {
      deletePresentation(id)
    }
  }

  return (
    <div
      className="flex items-center"
      style={{
        gap: 'var(--space-2)',
        flexShrink: 0,
        marginBottom: 'var(--space-3)',
        overflowX: 'auto',
        paddingBottom: 'var(--space-1)'
      }}
    >
      {/* Presentation tabs */}
      {presentations.map((p) => {
        const isActive = p.id === activePresentationId
        const dateStr = new Date(p.createdAt).toLocaleDateString()
        return (
          <button
            key={p.id}
            onClick={() => setActivePresentation(p.id)}
            className="flex items-center cursor-pointer"
            style={{
              backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'var(--color-bg-elevated)',
              border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              gap: 'var(--space-2)',
              whiteSpace: 'nowrap',
              maxWidth: '200px',
              transition: 'all 150ms ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'var(--color-accent)'
              }
              const btn = e.currentTarget.querySelector<HTMLElement>('[data-delete-btn]')
              if (btn) btn.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'var(--color-border)'
              }
              const btn = e.currentTarget.querySelector<HTMLElement>('[data-delete-btn]')
              if (btn) btn.style.opacity = '0'
            }}
          >
            <div className="flex flex-col" style={{ overflow: 'hidden', minWidth: 0 }}>
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {p.name}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)'
                }}
              >
                {dateStr}
              </span>
            </div>

            {/* Delete button (appears on hover) */}
            <span
              data-delete-btn
              onMouseDown={(e) => handleDelete(e, p.id, p.name)}
              className="flex items-center justify-center"
              style={{
                opacity: 0,
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
                transition: 'opacity 150ms ease, color 150ms ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              <Trash2 size={12} />
            </span>
          </button>
        )
      })}

      {/* New Presentation button */}
      <button
        onClick={onNewPresentation}
        className="flex items-center cursor-pointer"
        title="Create new presentation"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2) var(--space-3)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          gap: 'var(--space-1)',
          transition: 'all 150ms ease',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent)'
          e.currentTarget.style.color = 'var(--color-text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.color = 'var(--color-text-secondary)'
        }}
      >
        <Plus size={14} />
        New
      </button>
    </div>
  )
}
