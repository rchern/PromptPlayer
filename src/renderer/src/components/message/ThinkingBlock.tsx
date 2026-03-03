import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

interface ThinkingBlockProps {
  content: string
}

/**
 * Collapsed/expandable thinking block.
 * Shows "Thinking..." by default; click to reveal full thinking text.
 * Thinking content is plain text (internal reasoning), NOT markdown.
 */
export function ThinkingBlock({ content }: ThinkingBlockProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)

  const charCount = content.length.toLocaleString()

  return (
    <div className="thinking-block">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          width: '100%',
          textAlign: 'left'
        }}
        aria-expanded={isExpanded}
      >
        <ChevronRight
          size={14}
          style={{
            transition: 'transform 0.15s ease',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0
          }}
        />
        <span style={{ fontStyle: 'italic' }}>Thinking...</span>
        <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>
          ({charCount} chars)
        </span>
      </button>

      {isExpanded && (
        <div
          style={{
            paddingLeft: 'var(--space-4)',
            color: 'var(--color-text-muted)',
            fontSize: '0.85em',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            borderLeft: '2px solid var(--color-border)',
            marginLeft: 'var(--space-3)',
            marginBottom: 'var(--space-2)'
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}
