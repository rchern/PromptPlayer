import { useEffect } from 'react'
import { usePlaybackStore } from '../stores/playbackStore'

/**
 * Keyboard navigation hook for the Player route in playback mode.
 *
 * Extends the pattern from useKeyboardNavigation.ts but reads from
 * usePlaybackStore instead of useNavigationStore. Adds sidebar toggle
 * binding on 'S' key (no modifier) and Ctrl+B.
 *
 * Bindings:
 *   ArrowRight / Space  -> nextStep
 *   ArrowLeft           -> prevStep
 *   Home                -> goToFirst
 *   End                 -> goToLast
 *   S (no modifier)     -> toggleSidebar
 *   Ctrl+B / Cmd+B      -> toggleSidebar
 *
 * Skips key handling when focus is inside INPUT or TEXTAREA elements.
 */
export function usePlaybackKeyboardNavigation(): void {
  const nextStep = usePlaybackStore((s) => s.nextStep)
  const prevStep = usePlaybackStore((s) => s.prevStep)
  const goToFirst = usePlaybackStore((s) => s.goToFirst)
  const goToLast = usePlaybackStore((s) => s.goToLast)
  const toggleSidebar = usePlaybackStore((s) => s.toggleSidebar)

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      // Don't capture keys when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // Sidebar toggle: S key (no modifier) or Ctrl/Cmd+B
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        toggleSidebar()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevStep()
          break
        case 'Home':
          e.preventDefault()
          goToFirst()
          break
        case 'End':
          e.preventDefault()
          goToLast()
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nextStep, prevStep, goToFirst, goToLast, toggleSidebar])
}
