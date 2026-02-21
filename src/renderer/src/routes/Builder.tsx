import React from 'react'

export function Builder(): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        flex: 1,
        height: '100%',
        gap: 'var(--space-3)',
        padding: 'var(--space-8)'
      }}
    >
      <h2
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)'
        }}
      >
        Builder Mode
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-base)' }}>
        Coming in Phase 5
      </p>
    </div>
  )
}
