import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'
import { usePlaybackStore } from '../stores/playbackStore'

export function useTheme(): void {
  const setDarkMode = useAppStore((state) => state.setDarkMode)

  useEffect(() => {
    // Get initial system theme
    window.electronAPI.getTheme().then((isDark) => {
      setDarkMode(isDark)
      // Only set data-theme when no presentation is loaded (Player manages its own theme)
      if (!usePlaybackStore.getState().presentation) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      }
    })

    // Listen for system theme changes
    const cleanup = window.electronAPI.onThemeChange((isDark) => {
      // Always update appStore so the resolved 'system' value stays current
      setDarkMode(isDark)
      // Only set data-theme when no presentation is loaded (Player's usePlayerTheme manages it)
      if (!usePlaybackStore.getState().presentation) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      }
    })

    return cleanup
  }, [setDarkMode])
}
