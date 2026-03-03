import React from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Home } from 'lucide-react'
import { WindowControls } from './WindowControls'

export function Titlebar(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  return (
    <div
      className="titlebar flex items-center justify-between shrink-0 select-none"
      style={{
        height: 'var(--titlebar-height)',
        backgroundColor: 'var(--color-titlebar-bg)',
        color: 'var(--color-titlebar-text)',
        borderBottom: '1px solid var(--color-border-subtle)',
        padding: '0 var(--space-2)'
      }}
    >
      {/* Left: Brand + optional home button */}
      <div className="flex items-center" style={{ gap: 'var(--space-2)', paddingLeft: 'var(--space-2)' }}>
        {!isHome && (
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center transition-colors duration-150"
            style={{
              width: 28,
              height: 24,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-titlebar-text)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-titlebar-btn-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            title="Home"
          >
            <Home size={14} />
          </button>
        )}
        <span
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-titlebar-text)',
            letterSpacing: '-0.01em'
          }}
        >
          PromptPlayer
        </span>
      </div>

      {/* Center: drag region spacer */}
      <div className="flex-1" />

      {/* Right: window controls */}
      <WindowControls />
    </div>
  )
}
