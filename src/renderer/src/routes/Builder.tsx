import React, { useEffect } from 'react'
import { RefreshCw, FolderOpen } from 'lucide-react'
import { useSessionStore } from '../stores/sessionStore'
import { SessionList } from '../components/builder/SessionList'

export function Builder(): React.JSX.Element {
  const {
    discoveredSessions,
    isDiscovering,
    discoveryError,
    activeSession,
    activeSessionId,
    isParsing,
    parseError,
    discover,
    browseAndDiscover,
    parseSession,
    clearActiveSession
  } = useSessionStore()

  // Auto-discover on mount
  useEffect(() => {
    discover()
  }, [])

  const handleSelectSession = (session: { filePath: string; sessionId: string }): void => {
    parseSession(session.filePath, session.sessionId)
  }

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100%',
        padding: 'var(--space-6) var(--space-8)',
        gap: 'var(--space-4)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 600,
            color: 'var(--color-text-primary)'
          }}
        >
          Session Browser
        </h2>
        <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
          <button
            onClick={() => discover()}
            disabled={isDiscovering}
            className="flex items-center cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              gap: 'var(--space-2)',
              transition: 'all 150ms ease',
              opacity: isDiscovering ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isDiscovering) {
                e.currentTarget.style.borderColor = 'var(--color-accent)'
                e.currentTarget.style.color = 'var(--color-text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }}
          >
            <RefreshCw size={14} style={isDiscovering ? { animation: 'spin 1s linear infinite' } : undefined} />
            Refresh
          </button>
          <button
            onClick={() => browseAndDiscover()}
            disabled={isDiscovering}
            className="flex items-center cursor-pointer"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              gap: 'var(--space-2)',
              transition: 'all 150ms ease',
              opacity: isDiscovering ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isDiscovering) {
                e.currentTarget.style.borderColor = 'var(--color-accent)'
                e.currentTarget.style.color = 'var(--color-text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }}
          >
            <FolderOpen size={14} />
            Browse Other Location
          </button>
        </div>
      </div>

      {/* Discovery error */}
      {discoveryError && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--text-sm)',
            color: '#ef4444'
          }}
        >
          Discovery error: {discoveryError}
        </div>
      )}

      {/* Main content area */}
      <div className="flex" style={{ flex: 1, gap: 'var(--space-4)', overflow: 'hidden', minHeight: 0 }}>
        {/* Session list */}
        <div
          style={{
            flex: activeSessionId ? '0 0 50%' : '1 1 100%',
            overflowY: 'auto',
            paddingRight: 'var(--space-2)',
            transition: 'flex 200ms ease'
          }}
        >
          <SessionList
            sessions={discoveredSessions}
            onSelectSession={handleSelectSession}
            isLoading={isDiscovering}
          />
        </div>

        {/* Detail panel */}
        {activeSessionId && (
          <div
            className="flex flex-col"
            style={{
              flex: '0 0 50%',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              gap: 'var(--space-3)',
              overflowY: 'auto'
            }}
          >
            {/* Detail header */}
            <div className="flex items-center justify-between">
              <h3
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)'
                }}
              >
                Session Details
              </h3>
              <button
                onClick={clearActiveSession}
                className="cursor-pointer"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-1) var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  transition: 'all 150ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-text-muted)'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text-muted)'
                }}
              >
                Close
              </button>
            </div>

            {/* Parsing state */}
            {isParsing && (
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-muted)',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              >
                Parsing session...
              </div>
            )}

            {/* Parse error */}
            {parseError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: 'var(--text-sm)',
                  color: '#ef4444'
                }}
              >
                Parse error: {parseError}
              </div>
            )}

            {/* Session details */}
            {activeSession && !isParsing && (
              <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
                {/* Session ID */}
                <div className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Session ID
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-mono)',
                      wordBreak: 'break-all'
                    }}
                  >
                    {activeSessionId}
                  </span>
                </div>

                {/* Stats */}
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--space-3)'
                  }}
                >
                  <StatCard label="Messages" value={activeSession.messages.length} />
                  <StatCard label="Orphaned" value={activeSession.orphanedCount} />
                  <StatCard label="Sidechains" value={activeSession.sidechainCount} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3)',
        gap: 'var(--space-1)'
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--color-accent)'
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        {label}
      </span>
    </div>
  )
}
