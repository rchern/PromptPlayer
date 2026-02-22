import { create } from 'zustand'
import type {
  SessionMetadata,
  StitchedSession,
  StoredSession
} from '../types/pipeline'
import type { DateFilter } from '../utils/sessionFiltering'

interface SessionState {
  // Discovery
  discoveredSessions: SessionMetadata[]
  isDiscovering: boolean
  discoveryError: string | null

  // Active session (full parse)
  activeSession: StitchedSession | null
  activeSessionId: string | null
  isParsing: boolean
  parseError: string | null

  // Stored sessions (for presentations)
  storedSessions: StoredSession[]

  // Filter/search state
  searchQuery: string
  dateFilter: DateFilter
  viewMode: 'grouped' | 'chronological'

  // Import state
  isImporting: boolean
  importCount: number
  lastImportedIds: string[]

  // Deep search state
  deepSearchMatchIds: string[]
  isDeepSearching: boolean

  // Actions
  discover: (baseDir?: string) => Promise<void>
  browseAndDiscover: () => Promise<void>
  parseSession: (filePath: string, sessionId: string) => Promise<void>
  loadStoredSessions: () => Promise<void>
  saveSessionToStorage: (session: StoredSession) => Promise<void>
  removeSessionFromStorage: (sessionId: string) => Promise<void>
  clearActiveSession: () => void

  // Filter/search actions
  setSearchQuery: (query: string) => void
  setDateFilter: (filter: DateFilter) => void
  setViewMode: (mode: 'grouped' | 'chronological') => void

  // Import actions
  importFiles: () => Promise<void>
  importDroppedFiles: (filePaths: string[]) => Promise<void>

  // Deep search
  deepSearch: (query: string) => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  discoveredSessions: [],
  isDiscovering: false,
  discoveryError: null,

  activeSession: null,
  activeSessionId: null,
  isParsing: false,
  parseError: null,

  storedSessions: [],

  // Filter/search state
  searchQuery: '',
  dateFilter: { preset: 'all' },
  viewMode: 'grouped',

  // Import state
  isImporting: false,
  importCount: 0,
  lastImportedIds: [],

  // Deep search state
  deepSearchMatchIds: [],
  isDeepSearching: false,

  // Actions

  discover: async (baseDir?: string): Promise<void> => {
    set({ isDiscovering: true, discoveryError: null })
    try {
      const sessions = await window.electronAPI.discoverSessions(baseDir)
      set({ discoveredSessions: sessions, isDiscovering: false })
    } catch (err) {
      set({
        discoveryError: err instanceof Error ? err.message : String(err),
        isDiscovering: false
      })
    }
  },

  browseAndDiscover: async (): Promise<void> => {
    const selected = await window.electronAPI.browseDirectory()
    if (selected === null) return
    await get().discover(selected)
  },

  parseSession: async (filePath: string, sessionId: string): Promise<void> => {
    set({ isParsing: true, parseError: null, activeSessionId: sessionId })
    try {
      const session = await window.electronAPI.parseSession(filePath)
      set({ activeSession: session, isParsing: false })
    } catch (err) {
      set({
        parseError: err instanceof Error ? err.message : String(err),
        isParsing: false,
        activeSession: null
      })
    }
  },

  loadStoredSessions: async (): Promise<void> => {
    const sessions = await window.electronAPI.getStoredSessions()
    set({ storedSessions: sessions })
  },

  saveSessionToStorage: async (session: StoredSession): Promise<void> => {
    await window.electronAPI.saveStoredSession(session)
    await get().loadStoredSessions()
  },

  removeSessionFromStorage: async (sessionId: string): Promise<void> => {
    await window.electronAPI.removeStoredSession(sessionId)
    await get().loadStoredSessions()
  },

  clearActiveSession: (): void => {
    set({ activeSession: null, activeSessionId: null, parseError: null })
  },

  // Filter/search actions

  setSearchQuery: (query: string): void => {
    set({ searchQuery: query })
  },

  setDateFilter: (filter: DateFilter): void => {
    set({ dateFilter: filter })
  },

  setViewMode: (mode: 'grouped' | 'chronological'): void => {
    set({ viewMode: mode })
  },

  // Import actions

  importFiles: async (): Promise<void> => {
    set({ isImporting: true })
    try {
      const newSessions = await window.electronAPI.importFiles()
      if (!Array.isArray(newSessions) || newSessions.length === 0) {
        set({ isImporting: false, importCount: 0, lastImportedIds: [] })
        return
      }
      const existing = get().discoveredSessions
      const existingIds = new Set(existing.map((s) => s.sessionId))
      const unique = newSessions.filter((s) => !existingIds.has(s.sessionId))
      const uniqueIds = unique.map((s) => s.sessionId)
      set({
        discoveredSessions: [...existing, ...unique],
        importCount: unique.length,
        lastImportedIds: uniqueIds,
        isImporting: false
      })
      // Auto-select first imported session
      if (unique.length > 0) {
        get().parseSession(unique[0].filePath, unique[0].sessionId)
      }
    } catch {
      set({ isImporting: false, importCount: 0, lastImportedIds: [] })
    }
  },

  importDroppedFiles: async (filePaths: string[]): Promise<void> => {
    if (filePaths.length === 0) return
    set({ isImporting: true })
    try {
      const newSessions = await window.electronAPI.importFromPaths(filePaths)
      const existing = get().discoveredSessions
      const existingIds = new Set(existing.map((s) => s.sessionId))
      const unique = newSessions.filter((s) => !existingIds.has(s.sessionId))
      const uniqueIds = unique.map((s) => s.sessionId)
      set({
        discoveredSessions: [...existing, ...unique],
        importCount: unique.length,
        lastImportedIds: uniqueIds,
        isImporting: false
      })
      // Auto-select first imported session
      if (unique.length > 0) {
        get().parseSession(unique[0].filePath, unique[0].sessionId)
      }
    } catch {
      set({ isImporting: false, importCount: 0, lastImportedIds: [] })
    }
  },

  // Deep search

  deepSearch: async (query: string): Promise<void> => {
    if (!query.trim()) {
      set({ deepSearchMatchIds: [], isDeepSearching: false })
      return
    }

    set({ isDeepSearching: true })
    try {
      const sessions = get().discoveredSessions
      const q = query.toLowerCase()

      // Skip sessions that already match metadata search
      const needsDeepSearch = sessions.filter((s) => {
        const matchesMeta =
          (s.firstUserMessage?.toLowerCase().includes(q) ?? false) ||
          s.projectFolder.toLowerCase().includes(q) ||
          s.sessionId.toLowerCase().includes(q)
        return !matchesMeta
      })

      const results = await Promise.all(
        needsDeepSearch.map(async (s) => {
          const matches = await window.electronAPI.searchSessionContent(s.filePath, query)
          return matches ? s.sessionId : null
        })
      )

      set({
        deepSearchMatchIds: results.filter((id): id is string => id !== null),
        isDeepSearching: false
      })
    } catch {
      set({ deepSearchMatchIds: [], isDeepSearching: false })
    }
  }
}))
