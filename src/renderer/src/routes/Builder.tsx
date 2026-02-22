import React, { useEffect, useMemo, useState } from 'react'
import { RefreshCw, FolderOpen, FileUp } from 'lucide-react'
import { useSessionStore } from '../stores/sessionStore'
import { SessionList } from '../components/builder/SessionList'
import { SearchFilterBar } from '../components/builder/SearchFilterBar'
import { ImportDropZone } from '../components/builder/ImportDropZone'
import { MessageList } from '../components/message'
import { filterSessions } from '../utils/sessionFiltering'

export function Builder(): React.JSX.Element {
  const {
    discoveredSessions,
    isDiscovering,
    discoveryError,
    activeSession,
    activeSessionId,
    isParsing,
    parseError,
    searchQuery,
    dateFilter,
    viewMode,
    isImporting,
    importCount,
    discover,
    browseAndDiscover,
    parseSession,
    clearActiveSession,
    setSearchQuery,
    setDateFilter,
    setViewMode,
    importFiles,
    importDroppedFiles
  } = useSessionStore()

  // Auto-discover on mount
  useEffect(() => {
    discover()
  }, [])

  // Import success toast
  const [showImportToast, setShowImportToast] = useState(false)
  const [toastCount, setToastCount] = useState(0)

  useEffect(() => {
    if (importCount > 0 && !isImporting) {
      setToastCount(importCount)
      setShowImportToast(true)
      const timer = setTimeout(() => setShowImportToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [importCount, isImporting])

  // Derive filtered sessions
  const filteredSessions = useMemo(
    () => filterSessions(discoveredSessions, searchQuery, dateFilter),
    [discoveredSessions, searchQuery, dateFilter]
  )

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
          {isImporting && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            >
              Importing...
            </span>
          )}
          <button
            onClick={() => importFiles()}
            disabled={isImporting}
            className="flex items-center cursor-pointer"
            title="Import JSONL files"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              gap: 'var(--space-2)',
              transition: 'all 150ms ease',
              opacity: isImporting ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isImporting) {
                e.currentTarget.style.borderColor = 'var(--color-accent)'
                e.currentTarget.style.color = 'var(--color-text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }}
          >
            <FileUp size={14} />
            Import
          </button>
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

      {/* Search/Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={discoveredSessions.length}
        filteredCount={filteredSessions.length}
      />

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

      {/* Import success toast */}
      {showImportToast && (
        <div
          style={{
            backgroundColor: 'var(--color-accent-subtle)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-accent)',
            transition: 'opacity 300ms ease'
          }}
        >
          {toastCount} new session{toastCount !== 1 ? 's' : ''} imported
        </div>
      )}

      {/* Main content area wrapped in drop zone */}
      <ImportDropZone onImportFiles={importDroppedFiles}>
        <div className="flex" style={{ flex: 1, gap: 'var(--space-4)', overflow: 'hidden', minHeight: 0, height: '100%' }}>
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
              sessions={filteredSessions}
              onSelectSession={handleSelectSession}
              isLoading={isDiscovering}
              viewMode={viewMode}
              activeSessionId={activeSessionId}
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
                overflow: 'hidden'
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
                <>
                  {/* Fixed header area: Session ID + Stats */}
                  <div className="flex flex-col" style={{ gap: 'var(--space-3)', flexShrink: 0 }}>
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

                  {/* Conversation Preview label */}
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginTop: 'var(--space-4)',
                      flexShrink: 0
                    }}
                  >
                    Conversation Preview
                  </span>

                  {/* MessageList fills remaining space with its own scroll */}
                  <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <MessageList messages={activeSession.messages} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </ImportDropZone>
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
