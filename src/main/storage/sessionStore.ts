// App-local session storage -- persists sessions added to presentations.
//
// Follows the Phase 1 JSON file persistence pattern (readFileSync/writeFileSync)
// from src/main/index.ts. Data volumes are small (5-15 sessions per presentation),
// so a simple synchronous JSON file store is sufficient.
//
// Per locked decision: "Only sessions the user adds to a presentation get copied
// into app-local storage."

import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { ParsedMessage, SessionMetadata } from '../pipeline/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredSession {
  sessionId: string
  projectFolder: string
  originalFilePath: string
  messages: ParsedMessage[]
  metadata: SessionMetadata
  /** Date.now() timestamp when the session was added to a presentation */
  addedAt: number
}

// ---------------------------------------------------------------------------
// Storage path
// ---------------------------------------------------------------------------

const SESSIONS_FILE = 'sessions.json'

function getSessionsPath(): string {
  return join(app.getPath('userData'), SESSIONS_FILE)
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Load all stored sessions from app-local storage.
 * Returns an empty array if the file is missing, corrupt, or unreadable.
 */
export function getStoredSessions(): StoredSession[] {
  try {
    const data = readFileSync(getSessionsPath(), 'utf-8')
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed as StoredSession[]
  } catch {
    return []
  }
}

/**
 * Alias for getStoredSessions -- provides naming consistency with the
 * Phase 1 load/save pattern.
 */
export function loadStoredSessions(): StoredSession[] {
  return getStoredSessions()
}

/**
 * Save a session to app-local storage.
 * If a session with the same sessionId already exists, it is replaced.
 */
export function saveStoredSession(session: StoredSession): void {
  const sessions = getStoredSessions()
  const existingIndex = sessions.findIndex((s) => s.sessionId === session.sessionId)

  if (existingIndex >= 0) {
    sessions[existingIndex] = session
  } else {
    sessions.push(session)
  }

  writeSessions(sessions)
}

/**
 * Remove a session from app-local storage by sessionId.
 * No-op if the session doesn't exist.
 */
export function removeStoredSession(sessionId: string): void {
  const sessions = getStoredSessions()
  const filtered = sessions.filter((s) => s.sessionId !== sessionId)
  writeSessions(filtered)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function writeSessions(sessions: StoredSession[]): void {
  const storagePath = getSessionsPath()
  const storageDir = join(app.getPath('userData'))
  mkdirSync(storageDir, { recursive: true })
  writeFileSync(storagePath, JSON.stringify(sessions, null, 2), 'utf-8')
}
