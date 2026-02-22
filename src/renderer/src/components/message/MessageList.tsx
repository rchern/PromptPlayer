import type { ParsedMessage } from '../../types/pipeline'
import { MessageBubble } from './MessageBubble'
import { filterVisibleMessages, buildToolUseMap } from '../../utils/messageFiltering'

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
  const toolUseMap = buildToolUseMap(messages)

  return (
    <div
      className="message-view"
      style={{
        overflowY: 'auto',
        height: '100%'
      }}
    >
      {visible.map((msg) => (
        <MessageBubble key={msg.uuid} message={msg} showPlumbing={showPlumbing} toolUseMap={toolUseMap} />
      ))}
    </div>
  )
}
