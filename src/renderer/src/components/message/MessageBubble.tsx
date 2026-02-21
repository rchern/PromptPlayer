import type { ParsedMessage } from '../../types/pipeline'
import { ContentBlockRenderer } from './ContentBlockRenderer'

interface MessageBubbleProps {
  message: ParsedMessage
  showPlumbing: boolean
}

/**
 * Full-width message container with role-aware styling.
 *
 * - User messages: tinted background (bg-tertiary), "You" label
 * - Assistant messages: default background (bg-primary), "Claude" label
 *
 * Content blocks are rendered via ContentBlockRenderer which handles
 * block-level plumbing filtering and type dispatch.
 */
export function MessageBubble({ message, showPlumbing }: MessageBubbleProps): React.JSX.Element {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        background: isUser ? 'var(--color-bg-tertiary)' : 'var(--color-bg-primary)',
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--color-border-subtle)'
      }}
    >
      {/* Role label */}
      <div
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: isUser ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-3)'
        }}
      >
        {isUser ? 'You' : 'Claude'}
      </div>

      {/* Content blocks */}
      <div>
        {message.contentBlocks.map((block, index) => (
          <ContentBlockRenderer
            key={index}
            block={block}
            toolVisibility={message.toolVisibility}
            showPlumbing={showPlumbing}
            plainText={isUser && block.type === 'text'}
          />
        ))}
      </div>
    </div>
  )
}
