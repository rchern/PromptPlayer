import { useEffect } from 'react'
import { useNavigationStore } from '../stores/navigationStore'

/**
 * Keyboard navigation hook for the Player route.
 *
 * Binds ArrowRight/Space (forward), ArrowLeft (back), Home (first), End (last)
 * to the navigation store actions. Uses window.addEventListener (not Electron
 * globalShortcut) so bindings are scoped to the renderer window.
 *
 * Skips key handling when focus is inside text inputs to avoid capturing typing.
 */
export function useKeyboardNavigation(): void {
  const nextStep = useNavigationStore((s) => s.nextStep)
  const prevStep = useNavigationStore((s) => s.prevStep)
  const goToFirst = useNavigationStore((s) => s.goToFirst)
  const goToLast = useNavigationStore((s) => s.goToLast)

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      // Don't capture keys when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

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
  }, [nextStep, prevStep, goToFirst, goToLast])
}
