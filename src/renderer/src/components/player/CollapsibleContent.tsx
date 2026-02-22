import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleContentProps {
  children: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  previewLines?: number
  role: 'user' | 'assistant'
}

/**
 * Content wrapper with line-clamp collapse/expand toggle.
 *
 * When collapsed, content is truncated to `previewLines` using CSS line-clamp.
 * When expanded, content renders fully with scrolling for long content.
 *
 * The entire content area is clickable to toggle, plus a dedicated toggle
 * affordance at the bottom. Both use e.stopPropagation() to prevent bubbling
 * to any parent click-to-advance handlers.
 */
export function CollapsibleContent({
  children,
  isExpanded,
  onToggle,
  previewLines,
  role
}: CollapsibleContentProps): React.JSX.Element {
  const lines = previewLines ?? (role === 'user' ? 2 : 3)

  function handleContentClick(e: React.MouseEvent): void {
    e.stopPropagation()
    onToggle()
  }

  function handleToggleClick(e: React.MouseEvent): void {
    e.stopPropagation()
    onToggle()
  }

  return (
    <div>
      {/* Content area -- clickable to toggle */}
      <div
        onClick={handleContentClick}
        style={{
          cursor: 'pointer',
          ...(isExpanded
            ? {
                overflowY: 'auto' as const,
                maxHeight: 'calc(100vh - 200px)'
              }
            : {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical' as const,
                WebkitLineClamp: lines,
                overflow: 'hidden'
              })
        }}
      >
        {children}
      </div>

      {/* Toggle affordance */}
      <div
        onClick={handleToggleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-1)',
          padding: 'var(--space-1) 0',
          cursor: 'pointer',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          userSelect: 'none',
          transition: 'color 150ms ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-text-secondary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-muted)'
        }}
      >
        {isExpanded ? (
          <>
            <ChevronUp size={14} />
            <span>Show less</span>
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            <span>Show more</span>
          </>
        )}
      </div>
    </div>
  )
}
