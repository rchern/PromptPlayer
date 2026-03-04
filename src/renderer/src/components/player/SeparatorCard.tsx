import React from 'react'
import type { PlaybackStep } from '../../types/playback'
import { formatElapsed } from '../../utils/formatElapsed'

interface SeparatorCardProps {
  step: Extract<PlaybackStep, { type: 'section-separator' | 'session-separator' }>
  showTimestamps?: boolean
}

/**
 * Renders section separator and session separator cards.
 *
 * Section separators are large, centered "chapter title pages" with the section
 * name in accent color and aggregate stats.
 *
 * Session separators are smaller, left-aligned "topic transitions" with a
 * section breadcrumb above and session-specific stats.
 *
 * Both fill the full viewport height with flexbox centering and use
 * .presentation-mode for 20px base font (per 03-03 decision).
 */
export function SeparatorCard({ step, showTimestamps }: SeparatorCardProps): React.JSX.Element {
  if (step.type === 'section-separator') {
    return (
      <div
        className="presentation-mode"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 'var(--space-4)',
          textAlign: 'center',
          padding: 'var(--space-8)',
          fontSize: '20px'
        }}
      >
        {/* Top divider */}
        <hr
          style={{
            width: 80,
            border: 'none',
            borderTop: '2px solid var(--color-border)',
            margin: 0
          }}
        />

        {/* Section name as chapter heading */}
        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--color-accent)',
            margin: 0
          }}
        >
          {step.sectionName}
        </h2>

        {/* Section stats */}
        <div
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-base)'
          }}
        >
          {step.sessionCount} {step.sessionCount === 1 ? 'session' : 'sessions'},{' '}
          {step.totalSteps} {step.totalSteps === 1 ? 'step' : 'steps'}
          {showTimestamps && step.durationMs != null && `, ${formatElapsed(step.durationMs)}`}
        </div>

        {/* Bottom divider */}
        <hr
          style={{
            width: 80,
            border: 'none',
            borderTop: '2px solid var(--color-border)',
            margin: 0
          }}
        />
      </div>
    )
  }

  // Session separator: smaller, left-aligned
  return (
    <div
      className="presentation-mode"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--space-3)',
        padding: 'var(--space-8)',
        paddingLeft: 'var(--space-12)',
        fontSize: '20px'
      }}
    >
      {/* Section breadcrumb */}
      <div
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        {step.sectionName}
      </div>

      {/* Session name */}
      <h3
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: 0
        }}
      >
        {step.sessionName}
      </h3>

      {/* Session stats */}
      <div
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)'
        }}
      >
        {step.stepCount} {step.stepCount === 1 ? 'step' : 'steps'},{' '}
        {step.messageCount} {step.messageCount === 1 ? 'message' : 'messages'}
        {showTimestamps && step.durationMs != null && `, ${formatElapsed(step.durationMs)}`}
      </div>
    </div>
  )
}
