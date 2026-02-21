import React from 'react'
import { useNavigate } from 'react-router'
import type { LucideIcon } from 'lucide-react'

interface ModeCardProps {
  icon: LucideIcon
  title: string
  description: string
  to: string
}

export function ModeCard({ icon: Icon, title, description, to }: ModeCardProps): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(to)}
      className="flex flex-col items-center text-center cursor-pointer"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        padding: 'var(--space-12) var(--space-8)',
        minWidth: 260,
        maxWidth: 320,
        flex: '1 1 0',
        gap: 'var(--space-4)',
        transition: 'all 200ms ease',
        outline: 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-accent)'
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
        e.currentTarget.style.transform = 'scale(1.02)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-accent)'
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
    >
      <Icon size={48} style={{ color: 'var(--color-accent)' }} strokeWidth={1.5} />
      <span
        style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)'
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5
        }}
      >
        {description}
      </span>
    </button>
  )
}
