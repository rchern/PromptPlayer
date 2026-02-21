import React, { useEffect, useState } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

export function Titlebar(): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.isMaximized().then(setIsMaximized)
    const cleanup = window.electronAPI.onMaximizeChange(setIsMaximized)
    return cleanup
  }, [])

  return (
    <div
      className="titlebar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 'var(--titlebar-height)',
        backgroundColor: 'var(--color-titlebar-bg)',
        color: 'var(--color-titlebar-text)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 var(--space-2)',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      {/* Left: App brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          paddingLeft: 'var(--space-2)'
        }}
      >
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
      <div style={{ flex: 1 }} />

      {/* Right: window controls */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => window.electronAPI.minimize()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 46,
            height: 'var(--titlebar-height)',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-titlebar-text)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-titlebar-btn-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.electronAPI.maximize()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 46,
            height: 'var(--titlebar-height)',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-titlebar-text)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-titlebar-btn-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy size={14} /> : <Square size={14} />}
        </button>
        <button
          onClick={() => window.electronAPI.close()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 46,
            height: 'var(--titlebar-height)',
            border: 'none',
            background: 'transparent',
            color: 'var(--color-titlebar-text)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-titlebar-close-hover)'
            e.currentTarget.style.color = 'var(--color-titlebar-close-text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--color-titlebar-text)'
          }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
