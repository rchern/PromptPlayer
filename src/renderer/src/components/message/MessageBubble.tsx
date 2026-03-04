import type { ParsedMessage } from '../../types/pipeline'
import { ContentBlockRenderer } from './ContentBlockRenderer'
import { cleanUserText, parseUserAnswer, parseToolRejection, isSystemMessage } from './cleanUserText'

interface MessageBubbleProps {
  message: ParsedMessage
  showPlumbing: boolean
  toolUseMap?: Map<string, { name: string; input: Record<string, unknown> }>
  /** Follow-up messages (e.g. tool_result-only user messages with AskUserQuestion answers) */
  followUpMessages?: ParsedMessage[]
}

/** Summarize a tool's input for display (e.g., the command or file path) */
function summarizeToolInput(name: string, input: Record<string, unknown>): string {
  if (name === 'Bash' && typeof input.command === 'string') {
    const cmd = input.command
    return cmd.length > 80 ? cmd.slice(0, 77) + '...' : cmd
  }
  if ((name === 'Write' || name === 'Edit' || name === 'Read') && typeof input.file_path === 'string') {
    return input.file_path
  }
  if (name === 'Glob' && typeof input.pattern === 'string') {
    return input.pattern
  }
  if (name === 'Grep' && typeof input.pattern === 'string') {
    return input.pattern
  }
  return ''
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
/**
 * Normalize tool_result content to a plain string.
 * Content can be a string, array of {type:"text", text:"..."}, or other shapes.
 */
function normalizeContent(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    return (raw as Array<Record<string, unknown>>)
      .map((item) => (typeof item === 'string' ? item : typeof item?.text === 'string' ? item.text : ''))
      .filter(Boolean)
      .join('\n')
  }
  if (raw != null) return String(raw)
  return ''
}

export function MessageBubble({ message, showPlumbing, toolUseMap, followUpMessages }: MessageBubbleProps): React.JSX.Element {
  const isUser = message.role === 'user'

  // Detect system-generated user messages (should not display as "You")
  const isSystem = isUser && message.contentBlocks.some(
    (block) => block.type === 'text' && isSystemMessage(block.text)
  )

  // Build a lookup from tool_use_id -> answer text for AskUserQuestion answer pairing.
  // Only for assistant messages that have follow-up tool_result answers.
  const followUpAnswerMap = new Map<string, string>()
  if (!isUser && followUpMessages) {
    for (const fMsg of followUpMessages) {
      for (const block of fMsg.contentBlocks) {
        if (block.type === 'tool_result') {
          const content = normalizeContent(block.content)
          if (content) {
            followUpAnswerMap.set(block.tool_use_id, content)
          }
        }
      }
    }
  }

  return (
    <div
      style={{
        background: isSystem
          ? 'var(--color-bg-secondary)'
          : isUser
            ? 'var(--color-bg-tertiary)'
            : 'var(--color-bg-primary)',
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--color-border-subtle)'
      }}
    >
      {/* Role label */}
      <div
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: isSystem
            ? 'var(--color-text-muted)'
            : isUser
              ? 'var(--color-accent)'
              : 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-3)'
        }}
      >
        {isSystem ? 'System' : isUser ? 'You' : 'Claude'}
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
            const rejection = block.is_error ? parseToolRejection(content) : null
            if (rejection) {
              const toolInfo = toolUseMap?.get(block.tool_use_id)
              const toolName = toolInfo?.name ?? 'Tool'
              const toolSummary = toolInfo ? summarizeToolInput(toolInfo.name, toolInfo.input) : ''

              return (
                <div key={index} style={{
                  fontSize: 'var(--text-sm)',
                  color: 'rgba(239, 68, 68, 0.8)',
                  padding: 'var(--space-2) 0'
                }}>
                  <span style={{ fontWeight: 600 }}>
                    {toolName} declined
                  </span>
                  {toolSummary && (
                    <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 'var(--space-2)', opacity: 0.7, fontSize: 'var(--text-xs)' }}>
                      {toolSummary}
                    </span>
                  )}
                  {rejection !== 'Declined' && (
                    <div style={{ fontStyle: 'italic', marginTop: 'var(--space-1)' }}>
                      {rejection}
                    </div>
                  )}
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

          // For tool_use blocks, pass the paired answer text if available
          const blockAnswerText = block.type === 'tool_use'
            ? followUpAnswerMap.get(block.id) ?? null
            : null

          return (
            <ContentBlockRenderer
              key={index}
              block={block}
              toolVisibility={message.toolVisibility}
              showPlumbing={showPlumbing}
              answerText={blockAnswerText}
            />
          )
        })}
      </div>
    </div>
  )
}
