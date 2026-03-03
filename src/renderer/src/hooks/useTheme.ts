import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

export function useTheme(): void {
  const setDarkMode = useAppStore((state) => state.setDarkMode)

  useEffect(() => {
    // Get initial system theme
    window.electronAPI.getTheme().then((isDark) => {
      setDarkMode(isDark)
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    })

    // Listen for system theme changes
    const cleanup = window.electronAPI.onThemeChange((isDark) => {
      setDarkMode(isDark)
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    })

    return cleanup
  }, [setDarkMode])
}
