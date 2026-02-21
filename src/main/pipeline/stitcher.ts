// Conversation stitcher -- resolves parentUuid chain into ordered message sequence
// Handles sidechain filtering, orphaned message recovery, and classification.
//
// The parentUuid chain is the backbone of conversation ordering in Claude Code
// JSONL files. Each message's parentUuid points to the previous message's uuid,
// forming a linked list from root (parentUuid === null) to the latest message.

import type { ParsedMessage, StitchedSession } from './types'
import { classifyMessage, pairToolResults } from './classifier'

/**
 * Stitch a flat array of parsed messages into an ordered conversation.
 *
 * Steps:
 * 1. Build uuid -> message and parentUuid -> child lookup maps
 * 2. Find root message (parentUuid === null)
 * 3. Walk the chain from root, skipping sidechain messages
 * 4. Recover orphaned messages (broken chain) by timestamp
 * 5. Classify all messages and pair tool_results
 *
 * If no root is found, falls back to ordering all messages by timestamp.
 */
export function stitchConversation(
  messages: ParsedMessage[],
  filteredUuidRedirects?: Map<string, string | null>
): StitchedSession {
  if (messages.length === 0) {
    return { messages: [], orphanedCount: 0, sidechainCount: 0 }
  }

  // Build uuid lookup for parsed messages
  const byUuid = new Map<string, ParsedMessage>()
  for (const msg of messages) {
    byUuid.set(msg.uuid, msg)
  }

  // Resolve parentUuids through filtered-out lines (system, progress, etc.)
  // Chain: user → assistant → [system] → user  — the system line is filtered,
  // so the second user's parentUuid points to a UUID not in our set.
  // Walk the redirect chain until we find a UUID that IS in our set (or null).
  if (filteredUuidRedirects && filteredUuidRedirects.size > 0) {
    for (const msg of messages) {
      let parent = msg.parentUuid
      let hops = 0
      while (parent !== null && !byUuid.has(parent) && filteredUuidRedirects.has(parent) && hops < 20) {
        parent = filteredUuidRedirects.get(parent) ?? null
        hops++
      }
      msg.parentUuid = parent
    }
  }

  // Build child lookup (parentUuid -> child message)
  const childOf = new Map<string, ParsedMessage>()
  for (const msg of messages) {
    if (msg.parentUuid !== null) {
      childOf.set(msg.parentUuid, msg)
    }
  }

  // Find root: null parentUuid, or parentUuid references a message not in our set
  const root = messages.find(
    (m) => m.parentUuid === null || !byUuid.has(m.parentUuid as string)
  )

  let sidechainCount = 0
  const visited = new Set<string>()
  const ordered: ParsedMessage[] = []

  if (root) {
    // Walk the chain from root
    let current: ParsedMessage | undefined = root
    while (current) {
      visited.add(current.uuid)

      if (current.isSidechain) {
        sidechainCount++
      } else {
        ordered.push(current)
      }

      current = childOf.get(current.uuid)
    }
  }

  // Identify orphaned messages (not visited during chain walk)
  const orphans: ParsedMessage[] = []
  for (const msg of messages) {
    if (!visited.has(msg.uuid)) {
      if (msg.isSidechain) {
        sidechainCount++
      } else {
        orphans.push(msg)
      }
    }
  }

  // Sort orphans by timestamp and append
  orphans.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  ordered.push(...orphans)

  // If no root was found, we only have orphans -- the entire conversation
  // is already sorted by timestamp above via the orphans array.
  // If root was found but no chain walked (shouldn't happen), fallback is fine.

  // Classify all messages
  const classified = ordered.map(classifyMessage)

  // Pair tool_results with their tool_use classifications
  const paired = pairToolResults(classified)

  return {
    messages: paired,
    orphanedCount: orphans.length,
    sidechainCount
  }
}
