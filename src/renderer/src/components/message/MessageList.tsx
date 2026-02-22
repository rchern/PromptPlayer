import type { ParsedMessage } from '../../types/pipeline'
import { MessageBubble } from './MessageBubble'
import { cleanUserText } from './cleanUserText'

/**
 * Check if a user message is empty after cleaning system XML.
 * Messages that are purely system noise (empty local-command-stdout,
 * system-reminders with no user content) get filtered out.
 */
function isEmptyAfterCleaning(msg: ParsedMessage): boolean {
  if (msg.role !== 'user') return false
  const textBlocks = msg.contentBlocks.filter((b) => b.type === 'text')
  if (textBlocks.length === 0) return false
  // Clean all text blocks and check if anything meaningful remains
  return textBlocks.every(
    (b) => b.type === 'text' && cleanUserText(b.text).length === 0
  )
}

/**
 * Filter messages for display based on tool visibility and meta status.
 *
 * Rules:
 * - Skip meta messages (internal protocol, not conversation content)
 * - Skip user messages that are empty after stripping system XML
 * - Always show messages with toolVisibility null (pure text, user messages)
 * - Always show narrative and unknown visibility messages
 * - Show plumbing messages ONLY if showPlumbing is true
 * - Exception: plumbing messages that contain non-empty text blocks are
 *   still shown (the text is valuable). ContentBlockRenderer will hide
 *   the tool blocks but render the text.
 */
function filterVisibleMessages(
  messages: ParsedMessage[],
  showPlumbing: boolean
): ParsedMessage[] {
  return messages.filter((msg) => {
    // Skip internal meta messages
    if (msg.isMeta) return false

    // Skip user messages that become empty after cleaning system XML
    if (isEmptyAfterCleaning(msg)) return false

    // Non-tool messages, narrative, and unknown are always visible
    if (msg.toolVisibility === null) return true
    if (msg.toolVisibility === 'narrative') return true
    if (msg.toolVisibility === 'unknown') return true

    // Plumbing messages
    if (msg.toolVisibility === 'plumbing') {
      if (showPlumbing) return true

      // Check for mixed-content: plumbing message with text blocks
      // The text is still valuable even when tool blocks are hidden
      const hasText = msg.contentBlocks.some(
        (block) => block.type === 'text' && block.text.trim().length > 0
      )
      return hasText
    }

    return false
  })
}

interface MessageListProps {
  messages: ParsedMessage[]
  showPlumbing?: boolean
}

/**
 * Renders a filtered, scrollable list of messages.
 *
 * Applies plumbing visibility filtering at the message level,
 * then delegates each message to MessageBubble for rendering.
 */
export function MessageList({
  messages,
  showPlumbing = false
}: MessageListProps): React.JSX.Element {
  const visible = filterVisibleMessages(messages, showPlumbing)

  return (
    <div
      className="message-view"
      style={{
        overflowY: 'auto',
        height: '100%'
      }}
    >
      {visible.map((msg) => (
        <MessageBubble key={msg.uuid} message={msg} showPlumbing={showPlumbing} />
      ))}
    </div>
  )
}
