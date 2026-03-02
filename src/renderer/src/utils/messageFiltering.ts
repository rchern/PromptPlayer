import type { ParsedMessage, NavigationStep } from '../types/pipeline'
import type { ToolCategoryConfig } from '../types/presentation'
import { cleanUserText } from '../components/message/cleanUserText'

/**
 * Check if a user message is empty after cleaning system XML.
 * Messages that are purely system noise (empty local-command-stdout,
 * system-reminders with no user content) get filtered out.
 */
export function isEmptyAfterCleaning(msg: ParsedMessage): boolean {
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
export function filterVisibleMessages(
  messages: ParsedMessage[],
  showPlumbing: boolean
): ParsedMessage[] {
  return messages.filter((msg) => {
    // Skip internal meta messages
    if (msg.isMeta) return false

    // Skip user messages that become empty after cleaning system XML
    if (isEmptyAfterCleaning(msg)) return false

    // Non-tool messages, narrative, and unknown are always visible
    // But skip assistant messages with no renderable content (empty text blocks)
    if (msg.toolVisibility === null || msg.toolVisibility === 'narrative' || msg.toolVisibility === 'unknown') {
      if (msg.role === 'assistant') {
        const hasContent = msg.contentBlocks.some((b) => {
          if (b.type === 'text' && b.text.trim().length > 0) return true
          if (b.type === 'thinking') return true
          if (b.type === 'tool_use') return msg.toolVisibility !== 'plumbing' || showPlumbing
          return false
        })
        return hasContent
      }
      return true
    }

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

/**
 * Filter messages using per-category and per-tool visibility settings.
 *
 * This coexists with filterVisibleMessages (which the Player uses with its
 * simple showPlumbing boolean). The Builder's settings panel uses this function
 * for granular control over which tool categories and individual tools are visible.
 *
 * Rules:
 * - Skip meta messages and empty-after-cleaning user messages (same as filterVisibleMessages)
 * - toolVisibility null: always show (pure text, no tool calls)
 * - toolVisibility 'narrative': check if the specific tool is hidden in settings.
 *   If hidden but message has meaningful text, still show (mixed-content exception).
 * - toolVisibility 'unknown': use the "Other" category's visible setting.
 *   If hidden but has text, still show.
 * - toolVisibility 'plumbing': check if the specific tool is enabled in settings.
 *   If enabled, show. If not but has meaningful text, still show (mixed-content exception).
 */
export function filterWithToolSettings(
  messages: ParsedMessage[],
  toolVisibility: ToolCategoryConfig[]
): ParsedMessage[] {
  // Build a flat lookup: tool name -> visible (boolean)
  // Per-tool override takes precedence over category-level setting
  const visibilityMap = new Map<string, boolean>()
  let otherCategoryVisible = true // default for unknown tools

  for (const category of toolVisibility) {
    if (category.tools.length === 0) {
      // "Other" catch-all category
      otherCategoryVisible = category.visible
      continue
    }
    for (const tool of category.tools) {
      const toolOverride = category.toolOverrides[tool]
      visibilityMap.set(tool, toolOverride ?? category.visible)
    }
  }

  // Block-level visibility check: would this block actually render?
  function isBlockVisible(block: ParsedMessage['contentBlocks'][0]): boolean {
    if (block.type === 'text' && block.text.trim().length > 0) return true
    if (block.type === 'thinking') return true
    if (block.type === 'tool_use') {
      const toolVisible = visibilityMap.get(block.name)
      // Explicit setting wins; if not in map, use "Other" category default
      return toolVisible ?? otherCategoryVisible
    }
    return false
  }

  return messages.filter((msg) => {
    // Skip internal meta messages
    if (msg.isMeta) return false

    // Skip user messages that become empty after cleaning system XML
    if (isEmptyAfterCleaning(msg)) return false

    // Non-tool messages are always visible
    if (msg.toolVisibility === null) return true

    // Narrative messages: check if the specific tool is hidden
    if (msg.toolVisibility === 'narrative') {
      for (const block of msg.contentBlocks) {
        if (block.type === 'tool_use') {
          const isVisible = visibilityMap.get(block.name)
          if (isVisible === false) {
            // Mixed-content exception: still show if message has meaningful text
            return hasMeaningfulText(msg)
          }
        }
      }
      // Final guard: verify at least one block would actually render
      if (msg.role === 'assistant' && !msg.contentBlocks.some(isBlockVisible)) return false
      return true
    }

    // Unknown tools: use the "Other" category's visible setting
    if (msg.toolVisibility === 'unknown') {
      if (!otherCategoryVisible) {
        return hasMeaningfulText(msg)
      }
      if (msg.role === 'assistant' && !msg.contentBlocks.some(isBlockVisible)) return false
      return true
    }

    // Plumbing messages: check if specific tool is enabled
    if (msg.toolVisibility === 'plumbing') {
      for (const block of msg.contentBlocks) {
        if (block.type === 'tool_use') {
          if (visibilityMap.get(block.name) === true) return true
        }
      }
      // Mixed-content exception: still show if message has meaningful text
      return hasMeaningfulText(msg)
    }

    return false
  })
}

/**
 * Check if a message has meaningful (non-empty) text content.
 * Used for the mixed-content exception: messages with tool blocks
 * that are hidden still show if they contain valuable text.
 */
function hasMeaningfulText(msg: ParsedMessage): boolean {
  return msg.contentBlocks.some(
    (block) => block.type === 'text' && block.text.trim().length > 0
  )
}

/**
 * Build a lookup from tool_use_id to tool name + input for rejection display.
 * Used by both Builder (MessageList) and Player (StepView) routes.
 */
export function buildToolUseMap(
  messages: ParsedMessage[]
): Map<string, { name: string; input: Record<string, unknown> }> {
  const map = new Map<string, { name: string; input: Record<string, unknown> }>()
  for (const msg of messages) {
    for (const block of msg.contentBlocks) {
      if (block.type === 'tool_use') {
        map.set(block.id, { name: block.name, input: block.input })
      }
    }
  }
  return map
}

/**
 * Check if a user message contains only tool_result blocks with no meaningful
 * user-typed text. These are API responses (e.g. AskUserQuestion answers,
 * tool rejections) that should be folded into the previous step rather than
 * creating a new navigation step.
 */
function isToolResultOnly(msg: ParsedMessage): boolean {
  if (msg.role !== 'user') return false
  // Must have at least one tool_result
  const hasToolResult = msg.contentBlocks.some((b) => b.type === 'tool_result')
  if (!hasToolResult) return false
  // Check if there's any meaningful text content
  const hasText = msg.contentBlocks.some(
    (b) => b.type === 'text' && cleanUserText(b.text).trim().length > 0
  )
  return !hasText
}

/**
 * Build navigation steps from already-filtered visible messages.
 *
 * Each step pairs a user message with its following assistant message.
 * Edge cases:
 * - Solo assistant message (no preceding user): { userMessage: null, assistantMessage: msg }
 * - Solo user message at end (no following assistant): { userMessage: msg, assistantMessage: null }
 * - Tool_result-only user messages (e.g. AskUserQuestion answers) are folded
 *   into the previous step's followUpMessages so question + answer appear together.
 *
 * IMPORTANT: This function takes ALREADY-FILTERED messages (filterVisibleMessages
 * has already run). It does NOT filter internally.
 */
export function buildNavigationSteps(visibleMessages: ParsedMessage[]): NavigationStep[] {
  const steps: NavigationStep[] = []
  let i = 0

  while (i < visibleMessages.length) {
    const msg = visibleMessages[i]

    if (msg.role === 'user') {
      // Tool_result-only user messages fold into the previous step
      if (isToolResultOnly(msg) && steps.length > 0) {
        steps[steps.length - 1].followUpMessages.push(msg)
        i += 1
        continue
      }

      // Check if next message is assistant
      const next = i + 1 < visibleMessages.length ? visibleMessages[i + 1] : null
      if (next && next.role === 'assistant') {
        // Paired step: user + assistant
        steps.push({
          index: steps.length,
          userMessage: msg,
          assistantMessage: next,
          followUpMessages: []
        })
        i += 2
      } else {
        // Unpaired user message (no assistant follows)
        steps.push({
          index: steps.length,
          userMessage: msg,
          assistantMessage: null,
          followUpMessages: []
        })
        i += 1
      }
    } else {
      // Assistant message without preceding user (e.g., conversation starts
      // with assistant, or consecutive assistant messages)
      // CRITICAL: Do NOT put assistant in userMessage field
      steps.push({
        index: steps.length,
        userMessage: null,
        assistantMessage: msg,
        followUpMessages: []
      })
      i += 1
    }

    // After creating a step with an assistant message, absorb any
    // immediately following tool_result-only user messages
    if (steps.length > 0 && steps[steps.length - 1].assistantMessage) {
      while (i < visibleMessages.length && isToolResultOnly(visibleMessages[i])) {
        steps[steps.length - 1].followUpMessages.push(visibleMessages[i])
        i++
      }
    }
  }

  return steps
}
