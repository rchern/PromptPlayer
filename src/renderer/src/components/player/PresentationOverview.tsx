import React from 'react'
import type { Presentation } from '../../types/presentation'

interface PresentationOverviewProps {
  presentation: Presentation
  totalSteps: number
}

/**
 * Title slide shown at step index 0 when a .promptplay file is loaded.
 *
 * Displays presentation name, step/section counts, estimated duration,
 * and section names. Centered vertically and horizontally in the viewport.
 *
 * Uses .presentation-mode class for 20px base font (per 03-03 decision).
 * Navigation starts via keyboard (spacebar/arrow) or navigation arrows.
 */
export function PresentationOverview({
  presentation,
  totalSteps
}: PresentationOverviewProps): React.JSX.Element {
  const sectionCount = presentation.sections.length

  // Estimate duration: ~30 seconds per navigation step
  const totalSeconds = totalSteps * 30
  const minutes = Math.round(totalSeconds / 60)
  const durationText = minutes <= 1 ? '~1 minute' : `~${minutes} minutes`

  return (
    <div
      className="presentation-mode"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--space-6)',
        textAlign: 'center',
        padding: 'var(--space-8)',
        fontSize: '20px'
      }}
    >
      {/* Presentation title */}
      <h1
        style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: 0
        }}
      >
        {presentation.name}
      </h1>

      {/* Step and section summary */}
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)' }}>
        {totalSteps} steps across {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
      </div>

      {/* Estimated duration */}
      <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-base)' }}>
        Estimated duration: {durationText}
      </div>

      {/* Section names listed vertically */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          marginTop: 'var(--space-4)'
        }}
      >
        {presentation.sections.map((section) => (
          <div
            key={section.id}
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-base)'
            }}
          >
            {section.name}
          </div>
        ))}
      </div>

      {/* Begin hint */}
      <div
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
          marginTop: 'var(--space-8)'
        }}
      >
        Press any key to begin
      </div>
    </div>
  )
}
