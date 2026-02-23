import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChange: (callback: (isMaximized: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean): void => callback(value)
    ipcRenderer.on('window:maximizeChanged', handler)
    return () => ipcRenderer.removeListener('window:maximizeChanged', handler)
  },

  // Theme
  getTheme: (): Promise<boolean> => ipcRenderer.invoke('theme:get'),
  onThemeChange: (callback: (isDark: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean): void => callback(value)
    ipcRenderer.on('theme:changed', handler)
    return () => ipcRenderer.removeListener('theme:changed', handler)
  },

  // Pipeline - Discovery
  discoverSessions: (baseDir?: string): Promise<unknown> =>
    ipcRenderer.invoke('pipeline:discoverSessions', baseDir),
  parseSession: (filePath: string): Promise<unknown> =>
    ipcRenderer.invoke('pipeline:parseSession', filePath),
  browseDirectory: (): Promise<unknown> =>
    ipcRenderer.invoke('pipeline:browseDirectory'),

  // Pipeline - Import
  getFilePaths: (files: FileList): string[] => {
    return Array.from(files).map((f) => webUtils.getPathForFile(f))
  },
  importFiles: (): Promise<unknown> =>
    ipcRenderer.invoke('pipeline:importFiles'),
  importFromPaths: (filePaths: string[]): Promise<unknown> =>
    ipcRenderer.invoke('pipeline:importFromPaths', filePaths),
  searchSessionContent: (filePath: string, query: string): Promise<unknown> =>
    ipcRenderer.invoke('pipeline:searchSessionContent', filePath, query),

  // Pipeline - Storage
  getStoredSessions: (): Promise<unknown> =>
    ipcRenderer.invoke('pipeline:getStoredSessions'),
  saveStoredSession: (session: unknown): Promise<void> =>
    ipcRenderer.invoke('pipeline:saveStoredSession', session),
  removeStoredSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('pipeline:removeStoredSession', sessionId),

  // Presentation storage
  getPresentations: (): Promise<unknown> =>
    ipcRenderer.invoke('presentation:getAll'),
  savePresentation: (presentation: unknown): Promise<void> =>
    ipcRenderer.invoke('presentation:save', presentation),
  deletePresentation: (id: string): Promise<void> =>
    ipcRenderer.invoke('presentation:delete', id)
})
