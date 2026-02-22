import type { ParsedMessage, NavigationStep } from '../types/pipeline'
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
 * Build navigation steps from already-filtered visible messages.
 *
 * Each step pairs a user message with its following assistant message.
 * Edge cases:
 * - Solo assistant message (no preceding user): { userMessage: null, assistantMessage: msg }
 * - Solo user message at end (no following assistant): { userMessage: msg, assistantMessage: null }
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
      // Check if next message is assistant
      const next = i + 1 < visibleMessages.length ? visibleMessages[i + 1] : null
      if (next && next.role === 'assistant') {
        // Paired step: user + assistant
        steps.push({
          index: steps.length,
          userMessage: msg,
          assistantMessage: next
        })
        i += 2
      } else {
        // Unpaired user message (no assistant follows)
        steps.push({
          index: steps.length,
          userMessage: msg,
          assistantMessage: null
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
        assistantMessage: msg
      })
      i += 1
    }
  }

  return steps
}
