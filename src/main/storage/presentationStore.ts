// Presentation persistence -- JSON file storage for presentation documents.
//
// Follows the same pattern as sessionStore.ts: synchronous JSON file
// read/write in the userData directory. Data volumes are small (dozens of
// presentations), so synchronous I/O is fine.

import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { Presentation } from '../pipeline/types'

// ---------------------------------------------------------------------------
// Storage path
// ---------------------------------------------------------------------------

const PRESENTATIONS_FILE = 'presentations.json'

function getPresentationsPath(): string {
  return join(app.getPath('userData'), PRESENTATIONS_FILE)
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Load all presentations from disk.
 * Returns an empty array if the file is missing, corrupt, or unreadable.
 */
export function getPresentations(): Presentation[] {
  try {
    const data = readFileSync(getPresentationsPath(), 'utf-8')
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed as Presentation[]
  } catch {
    return []
  }
}

/**
 * Save (upsert) a presentation to disk.
 * If a presentation with the same id exists, it is replaced; otherwise appended.
 */
export function savePresentation(presentation: Presentation): void {
  const presentations = getPresentations()
  const idx = presentations.findIndex((p) => p.id === presentation.id)
  if (idx >= 0) {
    presentations[idx] = presentation
  } else {
    presentations.push(presentation)
  }
  writePresentations(presentations)
}

/**
 * Delete a presentation by id.
 * No-op if the presentation doesn't exist.
 */
export function deletePresentation(id: string): void {
  const presentations = getPresentations()
  writePresentations(presentations.filter((p) => p.id !== id))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function writePresentations(presentations: Presentation[]): void {
  const storagePath = getPresentationsPath()
  mkdirSync(join(app.getPath('userData')), { recursive: true })
  writeFileSync(storagePath, JSON.stringify(presentations, null, 2), 'utf-8')
}
