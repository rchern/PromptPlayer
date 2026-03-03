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
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: false,
  recentFiles: [],
  setDarkMode: (isDark): void => set({ isDarkMode: isDark }),
  setRecentFiles: (files): void => set({ recentFiles: files })
}))
