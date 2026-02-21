import React from 'react'
import { useNavigate } from 'react-router'

export function Player(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 'var(--space-4)',
        padding: 'var(--space-8)'
      }}
    >
      <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--color-text-primary)' }}>
        Player Mode
      </h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Step through curated Claude Code presentations.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-2) var(--space-4)',
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer'
        }}
      >
        Back to Home
      </button>
    </div>
  )
}
