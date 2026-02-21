import React from 'react'
import { useAppStore } from '../../stores/appStore'

export function RecentFiles(): React.JSX.Element {
  const recentFiles = useAppStore((state) => state.recentFiles)

  if (recentFiles.length === 0) {
    return (
      <div className="flex justify-center" style={{ padding: 'var(--space-8) 0' }}>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)'
          }}
        >
          No recent files
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-2)', padding: 'var(--space-8) 0' }}>
      <h3
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-2)'
        }}
      >
        Recent Files
      </h3>
      {recentFiles.map((file) => (
        <div
          key={file.path}
          className="flex items-center justify-between"
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
            transition: 'background-color 150ms ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <span>{file.name}</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
            {new Date(file.lastOpened).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}
