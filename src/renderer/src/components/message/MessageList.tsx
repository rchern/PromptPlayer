import type { ParsedMessage } from '../../types/pipeline'
import { MessageBubble } from './MessageBubble'
import { filterVisibleMessages, buildToolUseMap } from '../../utils/messageFiltering'
import { ElapsedTimeMarker } from '../player/ElapsedTimeMarker'
import { computeElapsedMs } from '../../utils/formatElapsed'

interface MessageListProps {
  messages: ParsedMessage[]
  showPlumbing?: boolean
  showTimestamps?: boolean
}

/**
 * Renders a filtered, scrollable list of messages.
 *
 * Applies plumbing visibility filtering at the message level,
 * then delegates each message to MessageBubble for rendering.
 * Optionally renders elapsed time markers between consecutive messages.
 */
export function MessageList({
  messages,
  showPlumbing = false,
  showTimestamps = false
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
      {visible.map((msg, index) => {
        const elements: React.JSX.Element[] = []

        // Render elapsed time marker between consecutive messages
        if (showTimestamps && index > 0) {
          const prevMsg = visible[index - 1]
          const elapsedMs = computeElapsedMs(prevMsg.timestamp, msg.timestamp)
          if (elapsedMs !== null && elapsedMs >= 0) {
            elements.push(
              <ElapsedTimeMarker key={`elapsed-${msg.uuid}`} elapsedMs={elapsedMs} variant="default" />
            )
          }
        }

        elements.push(
          <MessageBubble key={msg.uuid} message={msg} showPlumbing={showPlumbing} toolUseMap={toolUseMap} />
        )

        return elements
      })}
    </div>
  )
}
