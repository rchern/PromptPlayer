// Tool call classifier -- determines visibility of tool calls and thinking blocks
// Classification follows locked decisions from CONTEXT.md:
//   Plumbing (hidden by default): Read, Grep, Glob, Write, Edit, Bash
//   Narrative (shown by default):  AskUserQuestion, TaskCreate, TaskUpdate, TaskList
//   Thinking blocks: hidden by default (classified as plumbing)
//   tool_result inherits its paired tool_use classification

import type { ParsedMessage, ToolVisibility } from './types'

// ---------------------------------------------------------------------------
// Classification lookup tables
// ---------------------------------------------------------------------------

/** Tools whose invocations are plumbing -- hidden by default in presentation */
const PLUMBING_TOOLS = new Set([
  'Read',
  'Grep',
  'Glob',
  'Write',
  'Edit',
  'Bash'
])

/** Tools whose invocations are narrative -- shown by default in presentation */
const NARRATIVE_TOOLS = new Set([
  'AskUserQuestion',
  'TaskCreate',
  'TaskUpdate',
  'TaskList'
])

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a single tool call by name.
 * Unknown tools default to 'unknown' (shown by default -- safe behavior).
 */
export function classifyToolCall(toolName: string): ToolVisibility {
  if (PLUMBING_TOOLS.has(toolName)) return 'plumbing'
  if (NARRATIVE_TOOLS.has(toolName)) return 'narrative'
  return 'unknown'
}

/**
 * Classify a message based on its content blocks.
 *
 * Rules:
 * - Messages with only text blocks: toolVisibility stays null (always shown)
 * - Messages with tool_use blocks: classified by the tool's name
 * - Messages with only thinking blocks: classified as 'plumbing' (hidden by default)
 * - Messages with both text and tool_use: gets the tool's classification
 *   (text portion visibility handled by renderer -- text is always shown)
 * - tool_result blocks: left as null here; paired in pairToolResults()
 *
 * Returns a new ParsedMessage with updated toolVisibility (does not mutate).
 */
export function classifyMessage(message: ParsedMessage): ParsedMessage {
  const blocks = message.contentBlocks

  // Check for tool_use blocks -- their classification takes precedence
  for (const block of blocks) {
    if (block.type === 'tool_use') {
      return { ...message, toolVisibility: classifyToolCall(block.name) }
    }
  }

  // Check for thinking-only blocks (no text, no tool_use)
  const hasThinking = blocks.some((b) => b.type === 'thinking')
  const hasText = blocks.some((b) => b.type === 'text')

  if (hasThinking && !hasText) {
    return { ...message, toolVisibility: 'plumbing' }
  }

  // Messages with tool_result but no tool_use: leave null (paired later)
  // Messages with only text: leave null (always shown)
  return message
}

/**
 * Pair tool_result messages with their corresponding tool_use messages
 * and copy the classification.
 *
 * Must be called AFTER messages are ordered (post-stitch) so that
 * tool_use always precedes its tool_result in the array.
 *
 * Per locked decision: "tool_result inherits the same classification
 * as its paired tool_use."
 */
export function pairToolResults(messages: ParsedMessage[]): ParsedMessage[] {
  // Build a lookup: tool_use block id -> ToolVisibility
  const toolUseVisibility = new Map<string, ToolVisibility>()

  for (const msg of messages) {
    for (const block of msg.contentBlocks) {
      if (block.type === 'tool_use' && msg.toolVisibility) {
        toolUseVisibility.set(block.id, msg.toolVisibility)
      }
    }
  }

  // Apply classification to tool_result messages
  return messages.map((msg) => {
    // Only process messages that have tool_result blocks and no classification yet
    if (msg.toolVisibility !== null) return msg

    for (const block of msg.contentBlocks) {
      if (block.type === 'tool_result') {
        const visibility = toolUseVisibility.get(block.tool_use_id)
        if (visibility) {
          return { ...msg, toolVisibility: visibility }
        }
      }
    }

    return msg
  })
}
