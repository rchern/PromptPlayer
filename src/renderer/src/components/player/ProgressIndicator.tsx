import React from 'react'

interface ProgressIndicatorProps {
  currentStep: number // 0-based index
  totalSteps: number
}

/**
 * Fixed bottom-right progress indicator showing "Step N / M" with a thin
 * progress bar underneath.
 *
 * Uses monospace font with tabular-nums for stable width as numbers change.
 * Not clickable (step selection is a Phase 8 concern).
 */
export function ProgressIndicator({
  currentStep,
  totalSteps
}: ProgressIndicatorProps): React.JSX.Element {
  const fillPercent = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--space-4)',
        right: 'var(--space-4)',
        zIndex: 10,
        userSelect: 'none',
        width: 120
      }}
    >
      {/* Step counter */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 'var(--space-1)'
        }}
      >
        Step {currentStep + 1} / {totalSteps}
      </div>

      {/* Progress bar track */}
      <div
        style={{
          width: '100%',
          height: 4,
          borderRadius: 2,
          background: 'var(--color-bg-tertiary)',
          overflow: 'hidden'
        }}
      >
        {/* Progress bar fill */}
        <div
          style={{
            width: `${fillPercent}%`,
            height: '100%',
            borderRadius: 2,
            background: 'var(--color-accent)',
            transition: 'width 150ms ease'
          }}
        />
      </div>
    </div>
  )
}
