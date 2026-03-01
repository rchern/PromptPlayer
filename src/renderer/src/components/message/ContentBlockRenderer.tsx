import type { ContentBlock, ToolVisibility } from '../../types/pipeline'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolCallBlock, ToolResultBlock } from './ToolCallBlock'

interface ContentBlockRendererProps {
  block: ContentBlock
  toolVisibility: ToolVisibility | null
  showPlumbing: boolean
  /** If true, render text as plain pre-wrapped text instead of markdown */
  plainText?: boolean
  /** Paired tool_result content for AskUserQuestion answer display */
  answerText?: string | null
}

/**
 * Dispatches a single content block to the appropriate renderer.
 *
 * - text -> MarkdownRenderer (or plain div for user messages)
 * - thinking -> ThinkingBlock (collapsed toggle)
 * - tool_use -> ToolCallBlock (hidden if plumbing and !showPlumbing)
 * - tool_result -> ToolResultBlock (hidden if plumbing and !showPlumbing)
 * - image -> null (not rendered in v1)
 */
export function ContentBlockRenderer({
  block,
  toolVisibility,
  showPlumbing,
  plainText = false,
  answerText
}: ContentBlockRendererProps): React.JSX.Element | null {
  switch (block.type) {
    case 'text':
      if (plainText) {
        return (
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {block.text}
          </div>
        )
      }
      return <MarkdownRenderer content={block.text} />

    case 'thinking':
      return <ThinkingBlock content={block.thinking} />

    case 'tool_use':
      if (toolVisibility === 'plumbing' && !showPlumbing) return null
      return (
        <ToolCallBlock
          name={block.name}
          input={block.input}
          toolUseId={block.id}
          answerText={answerText}
        />
      )

    case 'tool_result':
      if (toolVisibility === 'plumbing' && !showPlumbing) return null
      return (
        <ToolResultBlock
          content={block.content}
          isError={block.is_error}
        />
      )

    case 'image':
      return null

    default:
      return null
  }
}
