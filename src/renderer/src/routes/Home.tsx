import React from 'react'
import { useNavigate } from 'react-router'

export function Home(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        gap: 'var(--space-8)',
        padding: 'var(--space-8)'
      }}
    >
      <h1 style={{ fontSize: 'var(--text-3xl)', color: 'var(--color-text-primary)' }}>
        PromptPlayer
      </h1>
      <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
        Walk your team through real Claude Code workflows step by step
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
        <button
          onClick={() => navigate('/builder')}
          style={{
            padding: 'var(--space-4) var(--space-8)',
            backgroundColor: 'var(--color-accent)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-lg)',
            cursor: 'pointer'
          }}
        >
          Builder
        </button>
        <button
          onClick={() => navigate('/player')}
          style={{
            padding: 'var(--space-4) var(--space-8)',
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-lg)',
            cursor: 'pointer'
          }}
        >
          Player
        </button>
      </div>
    </div>
  )
}
