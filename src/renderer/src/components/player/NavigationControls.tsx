import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface NavigationControlsProps {
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
}

/** Shared styles for both left and right arrow buttons */
const buttonBase: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 48,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--color-bg-elevated)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  opacity: 0.3,
  transition: 'opacity 200ms ease',
  zIndex: 10,
  padding: 0,
  color: 'var(--color-text-primary)'
}

/**
 * Semi-transparent arrow buttons on the left and right edges of the viewport,
 * vertically centered. Hidden by default, revealed on hover.
 *
 * At the first step the back button is dimmed (max opacity 0.2).
 * At the last step the forward button is dimmed.
 */
export function NavigationControls({
  canGoBack,
  canGoForward,
  onBack,
  onForward
}: NavigationControlsProps): React.JSX.Element {
  function handleHover(e: React.MouseEvent<HTMLButtonElement>, enabled: boolean): void {
    e.currentTarget.style.opacity = enabled ? '0.7' : '0.15'
  }

  function handleLeave(e: React.MouseEvent<HTMLButtonElement>, enabled: boolean): void {
    e.currentTarget.style.opacity = enabled ? '0.3' : '0.15'
  }

  return (
    <>
      {/* Back button -- left edge */}
      <button
        onClick={canGoBack ? onBack : undefined}
        aria-label="Previous step"
        style={{
          ...buttonBase,
          left: 'var(--space-3)',
          opacity: canGoBack ? 0.3 : 0.15
        }}
        onMouseEnter={(e) => handleHover(e, canGoBack)}
        onMouseLeave={(e) => handleLeave(e, canGoBack)}
      >
        <ChevronLeft size={28} />
      </button>

      {/* Forward button -- right edge */}
      <button
        onClick={canGoForward ? onForward : undefined}
        aria-label="Next step"
        style={{
          ...buttonBase,
          right: 'var(--space-3)',
          opacity: canGoForward ? 0.3 : 0.15
        }}
        onMouseEnter={(e) => handleHover(e, canGoForward)}
        onMouseLeave={(e) => handleLeave(e, canGoForward)}
      >
        <ChevronRight size={28} />
      </button>
    </>
  )
}
