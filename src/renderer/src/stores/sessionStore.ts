import { create } from 'zustand'
import type {
  SessionMetadata,
  StitchedSession,
  StoredSession
} from '../types/pipeline'

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

  // Actions
  discover: (baseDir?: string) => Promise<void>
  browseAndDiscover: () => Promise<void>
  parseSession: (filePath: string, sessionId: string) => Promise<void>
  loadStoredSessions: () => Promise<void>
  saveSessionToStorage: (session: StoredSession) => Promise<void>
  removeSessionFromStorage: (sessionId: string) => Promise<void>
  clearActiveSession: () => void
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
  }
}))
