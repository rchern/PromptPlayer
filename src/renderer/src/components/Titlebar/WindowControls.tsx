import React, { useEffect, useState } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

export function WindowControls(): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.isMaximized().then(setIsMaximized)
    const cleanup = window.electronAPI.onMaximizeChange(setIsMaximized)
    return cleanup
  }, [])

  return (
    <div className="flex items-center">
      {/* Minimize */}
      <button
        onClick={() => window.electronAPI.minimize()}
        className="inline-flex items-center justify-center transition-colors duration-150"
        style={{
          width: 46,
          height: 32,
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

      {/* Maximize / Restore */}
      <button
        onClick={() => window.electronAPI.maximize()}
        className="inline-flex items-center justify-center transition-colors duration-150"
        style={{
          width: 46,
          height: 32,
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

      {/* Close */}
      <button
        onClick={() => window.electronAPI.close()}
        className="inline-flex items-center justify-center transition-colors duration-150"
        style={{
          width: 46,
          height: 32,
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
  )
}
