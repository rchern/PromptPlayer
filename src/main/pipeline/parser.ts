// JSONL file parser with assistant turn reassembly
// Reads Claude Code JSONL files line-by-line, skips malformed lines,
// normalizes user content, and reassembles split assistant turns by requestId.

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

/**
 * Group assistant lines by requestId and merge their content blocks
 * into single ParsedMessage instances.
 *
 * Each assistant JSONL line contains exactly one content block in its
 * message.content array. Lines sharing the same requestId form one
 * logical assistant turn.
 */
function reassembleAssistantTurns(assistantLines: JsonlLine[]): ParsedMessage[] {
  const turnMap = new Map<string, JsonlLine[]>()

  for (const line of assistantLines) {
    const rid = line.requestId
    if (!rid) continue
    const existing = turnMap.get(rid)
    if (existing) {
      existing.push(line)
    } else {
      turnMap.set(rid, [line])
    }
  }

  const turns: ParsedMessage[] = []

  for (const group of turnMap.values()) {
    const first = group[0]
    const last = group[group.length - 1]

    // Merge content blocks from all lines in this turn
    const contentBlocks: ContentBlock[] = group.flatMap((line) => {
      if (!line.message) return []
      const content = line.message.content
      if (typeof content === 'string') {
        return [{ type: 'text' as const, text: content }]
      }
      return content
    })

    turns.push({
      uuid: last.uuid,
      parentUuid: first.parentUuid,
      role: 'assistant',
      contentBlocks,
      timestamp: first.timestamp,
      requestId: first.requestId,
      isMeta: false,
      isSidechain: first.isSidechain,
      toolVisibility: null
    })
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
  const assistantLines: JsonlLine[] = []

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

    // Skip non-message line types
    if (SKIP_TYPES.has(parsed.type)) continue

    // Only process user and assistant lines
    if (!MESSAGE_TYPES.has(parsed.type)) continue

    // Must have a message payload
    if (!parsed.message) continue

    if (parsed.type === 'user') {
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
      assistantLines.push(parsed)
    }
  }

  // Reassemble split assistant turns
  const assistantTurns = reassembleAssistantTurns(assistantLines)

  // Combine all messages (unordered -- stitcher will order them)
  const messages = [...userMessages, ...assistantTurns]

  return { messages, errors, totalLines: lineNumber }
}
