import type { SessionMetadata, StitchedSession, StoredSession } from './pipeline'

export interface ElectronAPI {
  // Window controls
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void

  // Theme
  getTheme: () => Promise<boolean>
  onThemeChange: (callback: (isDark: boolean) => void) => () => void

  // Pipeline - Discovery
  discoverSessions: (baseDir?: string) => Promise<SessionMetadata[]>
  parseSession: (filePath: string) => Promise<StitchedSession>
  browseDirectory: () => Promise<string | null>

  // Pipeline - Import
  getFilePaths: (files: FileList) => string[]
  importFiles: () => Promise<SessionMetadata[]>
  searchSessionContent: (filePath: string, query: string) => Promise<boolean>

  // Pipeline - Storage
  getStoredSessions: () => Promise<StoredSession[]>
  saveStoredSession: (session: StoredSession) => Promise<void>
  removeStoredSession: (sessionId: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
