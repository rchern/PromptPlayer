import React from 'react'
import { formatElapsed } from '../../utils/formatElapsed'

// Module-level style constants (per project convention — avoid re-creation on render)

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: '0 var(--space-6)'
}

const lineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: 'var(--color-border)'
}

const pillStyle: React.CSSProperties = {
  padding: '2px var(--space-3)',
  fontSize: 'var(--text-xs)',
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--color-text-muted)',
  background: 'var(--color-bg-tertiary)',
  borderRadius: 999, // Full pill shape
  whiteSpace: 'nowrap'
}

interface ElapsedTimeMarkerProps {
  elapsedMs: number
}

/**
 * Pill-on-rule elapsed time divider rendered between consecutive navigation steps.
 *
 * Displays a thin horizontal line with a centered pill showing the formatted
 * elapsed time (e.g., "2m 30s"). The caller gates rendering on showTimestamps
 * and non-null elapsedMs — this component always receives a valid positive number.
 */
export function ElapsedTimeMarker({ elapsedMs }: ElapsedTimeMarkerProps): React.JSX.Element {
  return (
    <div style={containerStyle}>
      <div style={lineStyle} />
      <span style={pillStyle}>{formatElapsed(elapsedMs)}</span>
      <div style={lineStyle} />
    </div>
  )
}
