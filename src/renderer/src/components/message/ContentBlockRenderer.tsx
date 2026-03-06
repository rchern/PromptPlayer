import type { ContentBlock, ToolVisibility } from '../../types/pipeline'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolCallBlock, ToolResultBlock } from './ToolCallBlock'

interface ContentBlockRendererProps {
  block: ContentBlock
  toolVisibility: ToolVisibility | null
  showPlumbing: boolean
  /** Per-tool visibility map from presentation settings (takes precedence over showPlumbing) */
  toolVisibilityMap?: Map<string, boolean>
  /** Map from tool_use_id to tool info, used to look up tool names for tool_result blocks */
  toolUseMap?: Map<string, { name: string; input: Record<string, unknown> }>
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
  toolVisibilityMap,
  toolUseMap,
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
      if (toolVisibility === 'plumbing') {
        if (toolVisibilityMap) {
          // Per-tool check: only show if this specific tool is enabled
          if (!toolVisibilityMap.get(block.name)) return null
        } else if (!showPlumbing) {
          return null
        }
      }
      return (
        <ToolCallBlock
          name={block.name}
          input={block.input}
          toolUseId={block.id}
          answerText={answerText}
        />
      )

    case 'tool_result':
      if (toolVisibility === 'plumbing') {
        if (toolVisibilityMap && toolUseMap) {
          const toolInfo = toolUseMap.get(block.tool_use_id)
          if (toolInfo && !toolVisibilityMap.get(toolInfo.name)) return null
        } else if (!showPlumbing) {
          return null
        }
      }
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
