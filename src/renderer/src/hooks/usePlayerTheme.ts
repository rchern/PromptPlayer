import { useEffect, useRef } from 'react'
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
 * Uses two separate effects to avoid a race condition in React StrictMode:
 *   Effect 1: Applies data-theme synchronously when effectiveTheme changes (no cleanup).
 *   Effect 2: Restores system theme on true unmount using a ref-based cancellation
 *             guard that distinguishes StrictMode remounts from real unmounts.
 */
export function usePlayerTheme(): { effectiveTheme: 'light' | 'dark'; isDark: boolean } {
  const presentation = usePlaybackStore((s) => s.presentation)
  const themeOverride = usePlaybackStore((s) => s.themeOverride)
  const isDarkMode = useAppStore((s) => s.isDarkMode)
  const isMountedRef = useRef(true)

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

  // Effect 1: Apply theme immediately when effectiveTheme changes (no cleanup)
  useEffect(() => {
    if (!presentation) return
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }, [presentation, effectiveTheme])

  // Effect 2: Restore system theme on unmount with cancellation guard
  useEffect(() => {
    isMountedRef.current = true

    return (): void => {
      isMountedRef.current = false
      // Use setTimeout(0) so that if this is a StrictMode remount, the
      // remount's isMountedRef.current = true runs before we check the flag.
      setTimeout(() => {
        if (!isMountedRef.current) {
          window.electronAPI.getTheme().then((isDark) => {
            // Double-check: guard against real unmount followed by quick remount
            if (!isMountedRef.current) {
              document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
            }
          })
        }
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { effectiveTheme, isDark: effectiveTheme === 'dark' }
}
