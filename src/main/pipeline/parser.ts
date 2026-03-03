// JSONL file parser with assistant turn reassembly
// Reads Claude Code JSONL files line-by-line, skips malformed lines,
// normalizes user content, and reassembles split assistant turns by requestId.
//
// Key subtlety: a single requestId can span multiple tool-call rounds
// (assistant tool_use → user tool_result → assistant continues, all same requestId).
// Reassembly must split at user-message boundaries so tool_result messages
// can chain correctly to their preceding assistant turn's UUID.

import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import type {
  JsonlLine,
  ContentBlock,
  ParsedMessage,
  ParseError,
  ParseResult
} from './types'

// ---------------------------------------------------------------------------
// Line type filters
// ---------------------------------------------------------------------------

/** Line types that carry conversation messages */
const MESSAGE_TYPES = new Set(['user', 'assistant'])

/** Line types to skip entirely (non-message metadata) */
const SKIP_TYPES = new Set(['file-history-snapshot', 'queue-operation', 'progress', 'system'])

// ---------------------------------------------------------------------------
// Content normalization
// ---------------------------------------------------------------------------

/**
 * Normalize user message content to a ContentBlock array.
 * User messages can have content as a plain string or an array of blocks.
 */
function normalizeContent(content: string | ContentBlock[]): ContentBlock[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  return content
}

// ---------------------------------------------------------------------------
// Assistant turn reassembly
// ---------------------------------------------------------------------------

/** Assistant line annotated with its position in the JSONL file */
interface OrderedAssistantLine {
  line: JsonlLine
  fileOrder: number
}

/**
 * Merge a contiguous sub-group of assistant lines into a single ParsedMessage.
 * Uses the last line's UUID and the first line's parentUuid.
 *
 * Also registers intermediate UUIDs (non-last lines) in the redirects map
 * so tool_result messages referencing them can resolve to the sub-group's UUID.
 * This handles parallel tool calls where each tool_result's parentUuid points
 * to the specific assistant line that contained the corresponding tool_use.
 */
function mergeAssistantSubGroup(
  group: OrderedAssistantLine[],
  redirects: Map<string, string | null>
): ParsedMessage {
  const first = group[0].line
  const last = group[group.length - 1].line

  // Register intermediate UUIDs as redirects to the sub-group's UUID
  for (let i = 0; i < group.length - 1; i++) {
    redirects.set(group[i].line.uuid, last.uuid)
  }

  const contentBlocks: ContentBlock[] = group.flatMap(({ line }) => {
    if (!line.message) return []
    const content = line.message.content
    if (typeof content === 'string') {
      return [{ type: 'text' as const, text: content }]
    }
    return content
  })

  return {
    uuid: last.uuid,
    parentUuid: first.parentUuid,
    role: 'assistant',
    contentBlocks,
    timestamp: first.timestamp,
    requestId: first.requestId,
    isMeta: false,
    isSidechain: first.isSidechain,
    toolVisibility: null
  }
}

/**
 * Group assistant lines by requestId and merge their content blocks
 * into ParsedMessage instances, splitting at user-message boundaries.
 *
 * A single requestId can span multiple tool-call rounds:
 *   assistant(tool_use) → user(tool_result) → assistant(continues) — same requestId
 *
 * If we merge all lines in the same requestId into one message, the
 * intermediate UUIDs vanish from the message set, orphaning the user
 * tool_result messages whose parentUuid pointed to those intermediates.
 *
 * Fix: split each requestId group into contiguous sub-groups wherever
 * a user message appears in between. Each sub-group becomes its own
 * reassembled turn with a valid UUID chain.
 */
function reassembleAssistantTurns(
  orderedAssistantLines: OrderedAssistantLine[],
  userFileOrders: Set<number>,
  intermediateRedirects: Map<string, string | null>
): ParsedMessage[] {
  // Group by requestId, preserving file order
  const turnMap = new Map<string, OrderedAssistantLine[]>()

  for (const entry of orderedAssistantLines) {
    const rid = entry.line.requestId
    if (!rid) continue
    const existing = turnMap.get(rid)
    if (existing) {
      existing.push(entry)
    } else {
      turnMap.set(rid, [entry])
    }
  }

  const turns: ParsedMessage[] = []

  for (const group of turnMap.values()) {
    // Sort by file order (should already be in order, but be safe)
    group.sort((a, b) => a.fileOrder - b.fileOrder)

    // Split into sub-groups at user-message boundaries
    const subGroups: OrderedAssistantLine[][] = [[]]

    for (let i = 0; i < group.length; i++) {
      if (i > 0) {
        // Check if any user message appeared between the previous
        // assistant line and this one in the original file
        const prevOrder = group[i - 1].fileOrder
        const curOrder = group[i].fileOrder
        let hasUserBetween = false
        for (let pos = prevOrder + 1; pos < curOrder; pos++) {
          if (userFileOrders.has(pos)) {
            hasUserBetween = true
            break
          }
        }
        if (hasUserBetween) {
          subGroups.push([])
        }
      }
      subGroups[subGroups.length - 1].push(group[i])
    }

    // Reassemble each sub-group into its own turn
    for (const sg of subGroups) {
      if (sg.length > 0) {
        turns.push(mergeAssistantSubGroup(sg, intermediateRedirects))
      }
    }
  }

  return turns
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a Claude Code JSONL file into a ParseResult.
 *
 * - Reads the file line-by-line via streaming (memory-safe for large files)
 * - Skips empty and malformed lines, recording errors for malformed ones
 * - Filters out non-message line types (progress, file-history-snapshot, etc.)
 * - Normalizes user message content to ContentBlock arrays
 * - Reassembles split assistant turns by shared requestId
 *
 * Does NOT order messages -- that is the stitcher's responsibility.
 */
export async function parseJSONLFile(filePath: string): Promise<ParseResult> {
  const errors: ParseError[] = []
  const userMessages: ParsedMessage[] = []
  const orderedAssistantLines: OrderedAssistantLine[] = []
  const userFileOrders = new Set<number>()
  const filteredUuidRedirects = new Map<string, string | null>()

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  })

  let lineNumber = 0

  for await (const rawLine of rl) {
    lineNumber++

    // Skip empty/whitespace-only lines
    if (!rawLine.trim()) continue

    // Parse JSON
    let parsed: JsonlLine
    try {
      parsed = JSON.parse(rawLine)
    } catch (err) {
      errors.push({ lineNumber, error: String(err) })
      continue
    }

    // Skip non-message line types but record their uuid→parentUuid for chain resolution
    if (SKIP_TYPES.has(parsed.type)) {
      if (parsed.uuid) {
        filteredUuidRedirects.set(parsed.uuid, parsed.parentUuid)
      }
      continue
    }

    // Only process user and assistant lines
    if (!MESSAGE_TYPES.has(parsed.type)) continue

    // Must have a message payload
    if (!parsed.message) continue

    if (parsed.type === 'user') {
      userFileOrders.add(lineNumber)
      userMessages.push({
        uuid: parsed.uuid,
        parentUuid: parsed.parentUuid,
        role: 'user',
        contentBlocks: normalizeContent(parsed.message.content),
        timestamp: parsed.timestamp,
        requestId: parsed.requestId,
        isMeta: parsed.isMeta ?? false,
        isSidechain: parsed.isSidechain,
        toolVisibility: null
      })
    } else if (parsed.type === 'assistant') {
      orderedAssistantLines.push({ line: parsed, fileOrder: lineNumber })
    }
  }

  // Reassemble split assistant turns, breaking at user-message boundaries.
  // Intermediate assistant UUIDs (from parallel tool calls within a sub-group)
  // are added to filteredUuidRedirects so tool_result messages can resolve to
  // the sub-group's UUID.
  const assistantTurns = reassembleAssistantTurns(
    orderedAssistantLines,
    userFileOrders,
    filteredUuidRedirects
  )

  // Combine all messages (unordered -- stitcher will order them)
  const messages = [...userMessages, ...assistantTurns]

  return { messages, errors, totalLines: lineNumber, filteredUuidRedirects }
}
