// Presentation utility functions: auto-naming, chronological sorting,
// and presentation creation from session metadata.

import type { SessionMetadata } from '../types/pipeline'
import type { Presentation, PresentationSection, SessionRef } from '../types/presentation'

// ---------------------------------------------------------------------------
// Session Display Name Generation
// ---------------------------------------------------------------------------

/**
 * Generate a friendly display name for a session from its metadata.
 *
 * Priority:
 * 1. GSD command: "/gsd:plan-phase 3" -> "Plan Phase 3"
 * 2. Other slash command: "/command args" -> "Command: args"
 * 3. Plain user message: truncated to 60 chars
 * 4. Fallback (no firstUserMessage): "Session <short-id>"
 */
export function generateSessionDisplayName(meta: SessionMetadata): string {
  const snippet = meta.firstUserMessage

  if (!snippet) {
    return `Session ${meta.sessionId.slice(0, 8)}`
  }

  // GSD command pattern: /gsd:verb-noun [args]
  const gsdMatch = snippet.match(/^\/gsd:(\S+)\s*(.*)$/)
  if (gsdMatch) {
    const command = gsdMatch[1] // e.g., "plan-phase"
    const args = gsdMatch[2].trim() // e.g., "3"
    // Convert kebab-case to title case: "plan-phase" -> "Plan Phase"
    const title = command
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    return args ? `${title} ${args}` : title
  }

  // Other slash commands: /command args
  const cmdMatch = snippet.match(/^\/(\S+)\s*(.*)$/)
  if (cmdMatch) {
    const cmd = cmdMatch[1]
    const args = cmdMatch[2].trim()
    const title = cmd.charAt(0).toUpperCase() + cmd.slice(1)
    return args ? `${title}: ${args}` : title
  }

  // Plain user message: truncate to reasonable length
  return snippet.length > 60 ? snippet.slice(0, 57) + '...' : snippet
}

// ---------------------------------------------------------------------------
// Presentation Name Generation
// ---------------------------------------------------------------------------

/**
 * Generate a default presentation name from the sessions being added.
 *
 * Format: "{project} - {date}" for single-project presentations,
 * or "Presentation - {date}" for mixed-project presentations.
 */
export function generatePresentationName(sessions: SessionMetadata[]): string {
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const projects = new Set(sessions.map((s) => s.projectFolder))
  if (projects.size === 1) {
    const projectName = sessions[0].projectFolder
    return `${projectName} - ${date}`
  }

  return `Presentation - ${date}`
}

// ---------------------------------------------------------------------------
// Chronological Sorting
// ---------------------------------------------------------------------------

/**
 * Sort session references chronologically by sortKey (ISO timestamp string).
 * Missing sortKeys sort last. Returns a new array (no mutation).
 */
export function sortSessionRefsChronologically(refs: SessionRef[]): SessionRef[] {
  return [...refs].sort((a, b) => {
    if (!a.sortKey && !b.sortKey) return 0
    if (!a.sortKey) return 1 // Missing timestamps sort last
    if (!b.sortKey) return -1
    return a.sortKey.localeCompare(b.sortKey) // ISO strings compare lexicographically
  })
}

// ---------------------------------------------------------------------------
// Presentation Creation
// ---------------------------------------------------------------------------

/**
 * Create a full Presentation object from selected sessions.
 *
 * Each session gets its own section. Sections are sorted chronologically
 * by the session's firstTimestamp. IDs generated via crypto.randomUUID().
 */
export function createPresentationFromSessions(sessions: SessionMetadata[]): Presentation {
  const sections: PresentationSection[] = sessions
    .map((session): PresentationSection => {
      const displayName = generateSessionDisplayName(session)
      return {
        id: crypto.randomUUID(),
        name: displayName,
        sessionRefs: [
          {
            sessionId: session.sessionId,
            displayName,
            sortKey: session.firstTimestamp ?? ''
          }
        ]
      }
    })
    // Sort sections chronologically by their session's timestamp
    .sort((a, b) => {
      const keyA = a.sessionRefs[0]?.sortKey ?? ''
      const keyB = b.sessionRefs[0]?.sortKey ?? ''
      if (!keyA && !keyB) return 0
      if (!keyA) return 1
      if (!keyB) return -1
      return keyA.localeCompare(keyB)
    })

  return {
    id: crypto.randomUUID(),
    name: generatePresentationName(sessions),
    sections,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}
