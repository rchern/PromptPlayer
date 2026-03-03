import React, { useRef, useState, useLayoutEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleContentProps {
  children: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  previewLines?: number
  role: 'user' | 'assistant'
}

/**
 * Content wrapper that only collapses when content genuinely overflows.
 *
 * Uses a max-height threshold (percentage of viewport) instead of line-clamp,
 * which works correctly with complex nested children (tool call cards, etc.).
 *
 * When content fits within the threshold, it renders fully with no toggle.
 * When content overflows, it clips with a "Show more" toggle.
 */
export function CollapsibleContent({
  children,
  isExpanded,
  onToggle,
  role
}: CollapsibleContentProps): React.JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)

  // Max height when collapsed: generous so short content is never clipped
  const collapsedMaxHeight = role === 'user' ? '20vh' : '45vh'

  const measure = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    // Check if natural height exceeds the collapsed max-height
    const threshold =
      role === 'user'
        ? window.innerHeight * 0.2
        : window.innerHeight * 0.45
    setOverflows(el.scrollHeight > threshold + 4) // 4px tolerance
  }, [role])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, children])

  const needsCollapse = overflows && !isExpanded

  function handleContentClick(e: React.MouseEvent): void {
    if (!overflows) return // no-op when content fits
    e.stopPropagation()
    onToggle()
  }

  function handleToggleClick(e: React.MouseEvent): void {
    e.stopPropagation()
    onToggle()
  }

  return (
    <div>
      {/* Content area */}
      <div
        ref={contentRef}
        onClick={handleContentClick}
        style={{
          cursor: overflows ? 'pointer' : 'default',
          ...(needsCollapse
            ? {
                maxHeight: collapsedMaxHeight,
                overflow: 'hidden'
              }
            : isExpanded
              ? {
                  overflowY: 'auto' as const,
                  maxHeight: 'calc(100vh - 200px)'
                }
              : {})
        }}
      >
        {children}
      </div>

      {/* Fade-out gradient when clipped */}
      {needsCollapse && (
        <div
          style={{
            height: 32,
            marginTop: -32,
            background: 'linear-gradient(transparent, var(--color-bg-primary))',
            pointerEvents: 'none',
            position: 'relative',
            zIndex: 1
          }}
        />
      )}

      {/* Toggle affordance — only when content actually overflows */}
      {overflows && (
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
            transition: 'color 150ms ease',
            position: 'relative',
            zIndex: 2
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
      )}
    </div>
  )
}
