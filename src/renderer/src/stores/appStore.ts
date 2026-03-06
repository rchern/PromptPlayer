import { create } from 'zustand'

export interface RecentFile {
  path: string
  name: string
  lastOpened: number
}

interface AppState {
  isDarkMode: boolean
  recentFiles: RecentFile[]
  setDarkMode: (isDark: boolean) => void
  setRecentFiles: (files: RecentFile[]) => void
  addRecentFile: (filePath: string) => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: false,
  recentFiles: [],
  setDarkMode: (isDark): void => set({ isDarkMode: isDark }),
  setRecentFiles: (files): void => set({ recentFiles: files }),
  addRecentFile: async (filePath): Promise<void> => {
    const updated = await window.electronAPI.addRecentFile(filePath)
    set({ recentFiles: updated })
  }
}))
