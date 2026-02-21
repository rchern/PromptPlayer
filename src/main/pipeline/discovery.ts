// Session discovery -- scans ~/.claude/projects/ for JSONL session files
// and extracts fast metadata (first ~50 lines) for browse list display.

import { readdir, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { join, basename } from 'path'
import { homedir } from 'os'
import type { SessionMetadata } from './types'

/**
 * Discover all JSONL session files from the Claude projects directory.
 *
 * Scans each project folder (one level deep) for `.jsonl` files at the root
 * level only -- does NOT recurse into subdirectories like `subagents/`.
 *
 * @param baseDir - Override the default `~/.claude/projects/` path
 * @returns Array of session metadata (includes entries with parseError for unreadable files)
 */
export async function discoverSessions(baseDir?: string): Promise<SessionMetadata[]> {
  const projectsDir = baseDir ?? join(homedir(), '.claude', 'projects')

  let entries: string[]
  try {
    entries = await readdir(projectsDir)
  } catch {
    // Directory doesn't exist or isn't readable -- not an error, just no sessions
    return []
  }

  const sessions: SessionMetadata[] = []

  for (const entry of entries) {
    const entryPath = join(projectsDir, entry)

    let entryStat
    try {
      entryStat = await stat(entryPath)
    } catch {
      // Can't stat this entry -- skip it
      continue
    }

    if (!entryStat.isDirectory()) continue

    // This is a project folder (e.g., "D--Code-PromptPlayer")
    const projectFolder = entry

    let files: string[]
    try {
      files = await readdir(entryPath)
    } catch {
      // Can't read project folder -- skip it
      continue
    }

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue

      const filePath = join(entryPath, file)

      // Only include files, not directories (some sessions have a UUID-named
      // directory alongside the UUID-named .jsonl file)
      let fileStat
      try {
        fileStat = await stat(filePath)
      } catch {
        // Can't stat file -- include with parseError
        sessions.push({
          sessionId: basename(file, '.jsonl'),
          projectFolder,
          filePath,
          firstTimestamp: null,
          firstUserMessage: null,
          messageCount: 0,
          parseError: `Unable to stat file: ${filePath}`
        })
        continue
      }

      if (!fileStat.isFile()) continue

      const metadata = await extractSessionMetadata(filePath, projectFolder)
      sessions.push(metadata)
    }
  }

  return sessions
}

/**
 * Extract session metadata by reading only the first ~50 lines of a JSONL file.
 *
 * This is a FAST scan designed for the browse list -- it extracts:
 * - `firstTimestamp`: earliest ISO timestamp found
 * - `firstUserMessage`: snippet of the first meaningful (non-meta, non-command) user message
 * - `messageCount`: approximate count of user + assistant lines in the first 50 lines
 *
 * On any read error, returns metadata with `parseError` set rather than throwing.
 * Per locked decision: "Unparseable JSONL files appear in browse list with an error badge."
 *
 * @param filePath - Absolute path to the .jsonl file
 * @param projectFolder - Name of the parent project folder
 */
export async function extractSessionMetadata(
  filePath: string,
  projectFolder: string
): Promise<SessionMetadata> {
  const sessionId = basename(filePath, '.jsonl')
  let firstTimestamp: string | null = null
  let firstUserMessage: string | null = null
  let firstCommandSnippet: string | null = null
  let messageCount = 0

  try {
    const rl = createInterface({
      input: createReadStream(filePath, { encoding: 'utf-8' }),
      crlfDelay: Infinity
    })

    let lineCount = 0
    const MAX_LINES = 150

    for await (const line of rl) {
      if (!line.trim()) continue

      lineCount++
      if (lineCount > MAX_LINES) {
        rl.close()
        break
      }

      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(line)
      } catch {
        // Malformed line -- skip
        continue
      }

      // Track earliest timestamp
      if (typeof parsed.timestamp === 'string') {
        if (!firstTimestamp || parsed.timestamp < firstTimestamp) {
          firstTimestamp = parsed.timestamp
        }
      }

      // Count presentation-relevant messages (approximate for first 50 lines)
      if (parsed.type === 'user' || parsed.type === 'assistant') {
        messageCount++
      }

      // Find first meaningful user message for snippet
      if (
        !firstUserMessage &&
        parsed.type === 'user' &&
        !parsed.isMeta
      ) {
        const message = parsed.message as { content?: string | Array<{ type: string; text?: string }> } | undefined
        const content = message?.content

        const rawText =
          typeof content === 'string'
            ? content
            : Array.isArray(content)
              ? (content.find((b: { type: string; text?: string }) => b.type === 'text' && typeof b.text === 'string') as { text: string } | undefined)?.text ?? ''
              : ''

        if (typeof content === 'string') {
          if (isCleanUserContent(content)) {
            firstUserMessage = content.slice(0, 150)
          }
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (
              block.type === 'text' &&
              typeof block.text === 'string' &&
              isCleanUserContent(block.text)
            ) {
              firstUserMessage = block.text.slice(0, 150)
              break
            }
          }
        }

        // Fallback: extract command name from command messages (e.g., GSD sessions)
        // Keep searching until we find a meaningful command (skip /clear, /help, etc.)
        if (!firstUserMessage && rawText) {
          const cmdMatch = rawText.match(/<command-message>([^<]+)<\/command-message>/)
          if (cmdMatch) {
            const cmdName = cmdMatch[1].trim()
            const isBoringCommand = ['clear', 'help', 'compact', 'init'].includes(cmdName)
            if (!isBoringCommand && !firstCommandSnippet) {
              firstCommandSnippet = '/' + cmdName
              const argsMatch = rawText.match(/<command-args>([^<]+)<\/command-args>/)
              if (argsMatch && argsMatch[1].trim()) {
                firstCommandSnippet += ' ' + argsMatch[1].trim()
              }
            }
          }
        }
      }
    }

    return {
      sessionId,
      projectFolder,
      filePath,
      firstTimestamp,
      firstUserMessage: firstCommandSnippet ?? firstUserMessage,
      messageCount,
      parseError: null
    }
  } catch (err) {
    return {
      sessionId,
      projectFolder,
      filePath,
      firstTimestamp: null,
      firstUserMessage: null,
      messageCount: 0,
      parseError: String(err)
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** XML prefixes that indicate system-generated content, not human-authored messages */
const SYSTEM_CONTENT_PREFIXES = [
  '<command-name>',
  '<command-',
  '<local-command',
  '<command-message>',
  '<execution_context>',
  '<objective>'
]

/**
 * Returns true if the content looks like a real human-authored message,
 * not a system-generated command or meta injection.
 */
function isCleanUserContent(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return !SYSTEM_CONTENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
}
