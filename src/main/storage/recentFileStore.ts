// Recent file persistence -- tracks .promptplay files opened by the user.
// Follows the Phase 1 JSON file persistence pattern (readFileSync/writeFileSync).

import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, basename } from 'path'

export interface RecentFileEntry {
  path: string
  name: string
  lastOpened: number // Date.now() timestamp
}

const RECENT_FILES_NAME = 'recent-files.json'
const MAX_RECENT = 10 // Keep at most 10 entries

function getFilePath(): string {
  return join(app.getPath('userData'), RECENT_FILES_NAME)
}

export function getRecentFiles(): RecentFileEntry[] {
  try {
    const data = readFileSync(getFilePath(), 'utf-8')
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed as RecentFileEntry[]
  } catch {
    return []
  }
}

export function addRecentFile(filePath: string): RecentFileEntry[] {
  const files = getRecentFiles()
  // Remove existing entry for this path (will re-add at top)
  const filtered = files.filter((f) => f.path !== filePath)
  // Prepend new entry
  const entry: RecentFileEntry = {
    path: filePath,
    name: basename(filePath, '.promptplay'),
    lastOpened: Date.now()
  }
  const updated = [entry, ...filtered].slice(0, MAX_RECENT)
  // Persist
  const storagePath = getFilePath()
  mkdirSync(join(app.getPath('userData')), { recursive: true })
  writeFileSync(storagePath, JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}
