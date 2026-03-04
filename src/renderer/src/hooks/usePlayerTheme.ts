import { useEffect } from 'react'
import { usePlaybackStore } from '../stores/playbackStore'
import { useAppStore } from '../stores/appStore'

/**
 * Player-specific theme hook that applies the presentation's configured theme
 * (light, dark, or system-resolved) with support for an ephemeral runtime toggle.
 *
 * Resolves the effective theme from:
 *   1. themeOverride (set by toggle button) -- highest priority
 *   2. presentation.settings.theme -- file default
 *   3. appStore.isDarkMode -- used to resolve 'system' setting
 *
 * On mount and when effective theme changes: sets data-theme attribute on
 * document.documentElement.
 *
 * On cleanup (unmount): restores system theme by querying electronAPI.getTheme()
 * so that leaving the Player resumes system-following behavior.
 */
export function usePlayerTheme(): { effectiveTheme: 'light' | 'dark'; isDark: boolean } {
  const presentation = usePlaybackStore((s) => s.presentation)
  const themeOverride = usePlaybackStore((s) => s.themeOverride)
  const isDarkMode = useAppStore((s) => s.isDarkMode)

  // Resolve effective theme
  let effectiveTheme: 'light' | 'dark' = 'light'
  if (presentation) {
    if (themeOverride) {
      effectiveTheme = themeOverride
    } else if (presentation.settings.theme === 'system') {
      effectiveTheme = isDarkMode ? 'dark' : 'light'
    } else {
      effectiveTheme = presentation.settings.theme
    }
  }

  // Apply theme to document element
  useEffect(() => {
    if (!presentation) return

    document.documentElement.setAttribute('data-theme', effectiveTheme)

    // On cleanup: restore system theme
    return (): void => {
      window.electronAPI.getTheme().then((isDark) => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      })
    }
  }, [presentation, effectiveTheme])

  return { effectiveTheme, isDark: effectiveTheme === 'dark' }
}
