import type { ParsedMessage } from '../../types/pipeline'
import { ContentBlockRenderer } from './ContentBlockRenderer'
import { cleanUserText, parseUserAnswer, parseToolRejection } from './cleanUserText'

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
        {message.contentBlocks.map((block, index) => {
          // Check tool_result blocks for AskUserQuestion answer or rejection
          if (isUser && block.type === 'tool_result') {
            // Normalize content — can be string, array of {type:"text", text:"..."}, or other
            const rawContent = block.content as unknown
            const content =
              typeof rawContent === 'string'
                ? rawContent
                : Array.isArray(rawContent)
                  ? (rawContent as Array<Record<string, unknown>>)
                      .map((item) => (typeof item === 'string' ? item : typeof item?.text === 'string' ? item.text : ''))
                      .filter(Boolean)
                      .join('\n')
                  : rawContent != null ? String(rawContent) : ''
            const answer = parseUserAnswer(content)
            if (answer) {
              return (
                <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {answer.answers.map((ans, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 'var(--text-sm)',
                        padding: '0.2em 0.6em',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-accent)',
                        color: 'var(--color-accent)',
                        background: 'var(--color-bg-secondary)',
                        fontWeight: 500
                      }}
                    >
                      {ans}
                    </span>
                  ))}
                </div>
              )
            }
            // Check for tool rejection (user declined a tool use)
            const rejection = parseToolRejection(content)
            if (rejection) {
              return (
                <div key={index} style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                  fontStyle: 'italic',
                  padding: 'var(--space-2) 0'
                }}>
                  {rejection}
                </div>
              )
            }
          }

          // Clean system XML from user text blocks
          if (isUser && block.type === 'text') {
            const cleaned = cleanUserText(block.text)
            if (!cleaned.trim()) return null
            return (
              <ContentBlockRenderer
                key={index}
                block={{ ...block, text: cleaned }}
                toolVisibility={message.toolVisibility}
                showPlumbing={showPlumbing}
                plainText
              />
            )
          }

          return (
            <ContentBlockRenderer
              key={index}
              block={block}
              toolVisibility={message.toolVisibility}
              showPlumbing={showPlumbing}
            />
          )
        })}
      </div>
    </div>
  )
}
