import type { SessionMetadata, StitchedSession, StoredSession } from './pipeline'
import type { Presentation } from './presentation'

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
  importFromPaths: (filePaths: string[]) => Promise<SessionMetadata[]>
  searchSessionContent: (filePath: string, query: string) => Promise<boolean>

  // Pipeline - Storage
  getStoredSessions: () => Promise<StoredSession[]>
  saveStoredSession: (session: StoredSession) => Promise<void>
  removeStoredSession: (sessionId: string) => Promise<void>

  // Presentation storage
  getPresentations: () => Promise<Presentation[]>
  savePresentation: (presentation: Presentation) => Promise<void>
  deletePresentation: (id: string) => Promise<void>

  // Presentation export/import
  exportPresentation: (
    presentationId: string
  ) => Promise<{ filePath: string; canceled: false } | { canceled: true }>
  importPresentation: () => Promise<{
    presentation: Presentation
    sessions: StoredSession[]
    filePath: string
  } | null>
  saveToPath: (presentationId: string, filePath: string) => Promise<{ success: boolean }>

  // Menu events
  onMenuSave: (callback: () => void) => () => void
  onMenuSaveAs: (callback: () => void) => () => void

  // File opening (OS file association)
  onOpenFile: (callback: (filePath: string) => void) => () => void
  readPromptPlayFile: (filePath: string) => Promise<{
    presentation: Presentation
    sessions: StoredSession[]
  }>

  // Auto-update
  onUpdateReady: (callback: (version: string) => void) => () => void
  installUpdate: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
