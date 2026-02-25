import React, { useEffect, useMemo, useState } from 'react'
import { RefreshCw, FolderOpen, FileUp, AlertTriangle, CheckSquare, ArrowLeft, Plus, Download } from 'lucide-react'
import { useSessionStore } from '../stores/sessionStore'
import { usePresentationStore } from '../stores/presentationStore'
import { useAppStore } from '../stores/appStore'
import { SessionList } from '../components/builder/SessionList'
import { SearchFilterBar } from '../components/builder/SearchFilterBar'
import { ImportDropZone } from '../components/builder/ImportDropZone'
import { SessionPreviewHeader } from '../components/builder/SessionPreviewHeader'
import { PresentationOutline } from '../components/builder/PresentationOutline'
import { PresentationList } from '../components/builder/PresentationList'
import { SettingsPanel } from '../components/builder/SettingsPanel'
import { MessageList } from '../components/message'
import { filterSessions } from '../utils/sessionFiltering'
import { filterWithToolSettings } from '../utils/messageFiltering'

type BuilderView = 'browse' | 'assembly'

// Shared button style base (reused across header buttons)
const headerButtonStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-tertiary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-2) var(--space-3)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-secondary)',
  gap: 'var(--space-2)',
  transition: 'all 150ms ease'
}

function headerButtonHover(e: React.MouseEvent<HTMLButtonElement>): void {
  e.currentTarget.style.borderColor = 'var(--color-accent)'
  e.currentTarget.style.color = 'var(--color-text-primary)'
}

function headerButtonLeave(e: React.MouseEvent<HTMLButtonElement>): void {
  e.currentTarget.style.borderColor = 'var(--color-border)'
  e.currentTarget.style.color = 'var(--color-text-secondary)'
}

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
    selectedSessionIds,
    isSelecting,
    discover,
    browseAndDiscover,
    parseSession,
    clearActiveSession,
    setSearchQuery,
    setDateFilter,
    setViewMode,
    importFiles,
    importDroppedFiles,
    toggleSessionSelection,
    clearSelection,
    setSelecting
  } = useSessionStore()

  const {
    loadPresentations,
    createPresentation,
    presentations,
    activePresentationId,
    addSessions,
    getActivePresentation,
    importFromPromptPlay,
    setSourceFilePath
  } = usePresentationStore()

  const isDarkMode = useAppStore((s) => s.isDarkMode)

  const [view, setView] = useState<BuilderView>('browse')

  // Auto-discover and load presentations on mount
  useEffect(() => {
    discover()
    loadPresentations()
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

  // Export success toast
  const [showExportToast, setShowExportToast] = useState(false)
  const [exportToastMessage, setExportToastMessage] = useState('')

  const showExportSuccess = (filename: string): void => {
    setExportToastMessage(`Saved to ${filename}`)
    setShowExportToast(true)
    setTimeout(() => setShowExportToast(false), 3000)
  }

  // Export handler (reused by button and keyboard shortcuts)
  const handleExport = async (): Promise<void> => {
    const active = usePresentationStore.getState().getActivePresentation()
    if (!active) return
    const result = await window.electronAPI.exportPresentation(active.id)
    if (!result.canceled) {
      usePresentationStore.getState().setSourceFilePath(active.id, result.filePath)
      const filename = result.filePath.split(/[/\\]/).pop() ?? result.filePath
      showExportSuccess(filename)
    }
  }

  // Open/import .promptplay handler
  const handleOpenPromptPlay = async (): Promise<void> => {
    const result = await window.electronAPI.importPresentation()
    if (result) {
      await importFromPromptPlay(result.presentation, result.sessions, result.filePath)
      setView('assembly')
    }
  }

  // Keyboard shortcut handlers (Ctrl+S / Ctrl+Shift+S)
  useEffect(() => {
    const cleanupSave = window.electronAPI.onMenuSave(() => {
      const active = usePresentationStore.getState().getActivePresentation()
      if (!active) return
      if (active.sourceFilePath) {
        window.electronAPI.saveToPath(active.id, active.sourceFilePath).then(() => {
          const filename = active.sourceFilePath!.split(/[/\\]/).pop() ?? active.sourceFilePath!
          showExportSuccess(filename)
        })
      } else {
        window.electronAPI.exportPresentation(active.id).then((result) => {
          if (!result.canceled) {
            usePresentationStore.getState().setSourceFilePath(active.id, result.filePath)
            const filename = result.filePath.split(/[/\\]/).pop() ?? result.filePath
            showExportSuccess(filename)
          }
        })
      }
    })

    const cleanupSaveAs = window.electronAPI.onMenuSaveAs(() => {
      const active = usePresentationStore.getState().getActivePresentation()
      if (!active) return
      window.electronAPI.exportPresentation(active.id).then((result) => {
        if (!result.canceled) {
          usePresentationStore.getState().setSourceFilePath(active.id, result.filePath)
          const filename = result.filePath.split(/[/\\]/).pop() ?? result.filePath
          showExportSuccess(filename)
        }
      })
    })

    return () => {
      cleanupSave()
      cleanupSaveAs()
    }
  }, [])

  // Derive filtered sessions
  const filteredSessions = useMemo(
    () => filterSessions(discoveredSessions, searchQuery, dateFilter),
    [discoveredSessions, searchQuery, dateFilter]
  )

  // Find metadata for the active session
  const activeMetadata = useMemo(
    () => discoveredSessions.find((s) => s.sessionId === activeSessionId) ?? null,
    [discoveredSessions, activeSessionId]
  )

  const handleSelectSession = (session: { filePath: string; sessionId: string }): void => {
    parseSession(session.filePath, session.sessionId)
  }

  // Create presentation from selected sessions, then switch to assembly view
  const handleCreatePresentation = async (): Promise<void> => {
    const selectedMeta = discoveredSessions.filter((s) => selectedSessionIds.has(s.sessionId))
    if (selectedMeta.length === 0) return
    await createPresentation(selectedMeta)
    clearSelection()
    setView('assembly')
  }

  // Add selected sessions to active presentation (assembly left panel)
  const handleAddSessions = (): void => {
    const selectedMeta = discoveredSessions.filter((s) => selectedSessionIds.has(s.sessionId))
    if (selectedMeta.length === 0) return
    addSessions(selectedMeta)
    clearSelection()
  }

  // "New Presentation" from PresentationList: switch to browse view in selection mode
  const handleNewPresentation = (): void => {
    setSelecting(true)
    setView('browse')
  }

  // Active presentation (for assembly view live preview)
  const activePresentation = getActivePresentation()

  // Filter messages using presentation tool visibility settings (assembly view live preview)
  const filteredMessages = useMemo(() => {
    if (!activeSession || !activePresentation?.settings) return activeSession?.messages ?? []
    return filterWithToolSettings(activeSession.messages, activePresentation.settings.toolVisibility)
  }, [activeSession, activePresentation?.settings])

  // Resolve scoped theme for the message preview area (assembly view only)
  // 'system' => undefined (inherit system theme), 'light'/'dark' => override
  const resolvedTheme = useMemo(() => {
    if (!activePresentation?.settings) return undefined
    const t = activePresentation.settings.theme
    if (t === 'system') return isDarkMode ? 'dark' : 'light'
    return t
  }, [activePresentation?.settings?.theme, isDarkMode])

  // =========================================================================
  // ASSEMBLY VIEW
  // =========================================================================
  if (view === 'assembly') {
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
        <div className="flex" style={{ flex: 1, gap: 'var(--space-4)', overflow: 'hidden', minHeight: 0 }}>
          {/* Left panel: compact session library for adding sessions */}
          <div
            className="flex flex-col"
            style={{
              flex: '0 0 40%',
              overflow: 'hidden',
              borderRight: '1px solid var(--color-border)',
              paddingRight: 'var(--space-4)'
            }}
          >
            {/* Left panel header */}
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 'var(--space-3)', flexShrink: 0 }}
            >
              <h3
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)'
                }}
              >
                Add Sessions
              </h3>
              <button
                onClick={() => {
                  setView('browse')
                  clearSelection()
                }}
                className="flex items-center cursor-pointer"
                style={headerButtonStyle}
                onMouseEnter={headerButtonHover}
                onMouseLeave={headerButtonLeave}
              >
                <ArrowLeft size={14} />
                Back to Browser
              </button>
            </div>

            {/* Search/filter bar (compact) */}
            <div style={{ flexShrink: 0, marginBottom: 'var(--space-2)' }}>
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
            </div>

            {/* Session list in selectable mode */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <SessionList
                sessions={filteredSessions}
                onSelectSession={handleSelectSession}
                isLoading={isDiscovering}
                viewMode={viewMode}
                activeSessionId={null}
                selectable={true}
                selectedSessionIds={selectedSessionIds}
                onToggleSelect={toggleSessionSelection}
              />
            </div>

            {/* "Add to Presentation" action bar */}
            {selectedSessionIds.size > 0 && (
              <div
                className="flex items-center justify-between"
                style={{
                  flexShrink: 0,
                  padding: 'var(--space-3)',
                  marginTop: 'var(--space-2)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  {selectedSessionIds.size} selected
                </span>
                <button
                  onClick={handleAddSessions}
                  disabled={!activePresentationId}
                  className="flex items-center cursor-pointer"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    border: '1px solid var(--color-accent)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-3)',
                    fontSize: 'var(--text-sm)',
                    color: 'white',
                    gap: 'var(--space-2)',
                    transition: 'all 150ms ease',
                    fontWeight: 500
                  }}
                >
                  <Plus size={14} />
                  Add to Presentation
                </button>
              </div>
            )}
          </div>

          {/* Right panel: settings + presentation outline + preview */}
          <div
            className="flex flex-col"
            style={{ flex: '1 1 60%', overflow: 'hidden' }}
          >
            <PresentationList onNewPresentation={handleNewPresentation} />

            {/* Export / Open action bar */}
            {activePresentationId && (
              <div
                className="flex items-center"
                style={{
                  gap: 'var(--space-2)',
                  flexShrink: 0,
                  marginBottom: 'var(--space-2)'
                }}
              >
                <button
                  onClick={handleExport}
                  className="flex items-center cursor-pointer"
                  style={headerButtonStyle}
                  onMouseEnter={headerButtonHover}
                  onMouseLeave={headerButtonLeave}
                >
                  <Download size={14} />
                  Export
                </button>
                <button
                  onClick={handleOpenPromptPlay}
                  className="flex items-center cursor-pointer"
                  style={headerButtonStyle}
                  onMouseEnter={headerButtonHover}
                  onMouseLeave={headerButtonLeave}
                >
                  <FolderOpen size={14} />
                  Open
                </button>
              </div>
            )}

            {/* Export success toast */}
            {showExportToast && (
              <div
                style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  border: '1px solid var(--color-accent)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-accent)',
                  flexShrink: 0,
                  marginBottom: 'var(--space-2)',
                  transition: 'opacity 300ms ease'
                }}
              >
                {exportToastMessage}
              </div>
            )}

            {activePresentationId && <SettingsPanel />}
            <PresentationOutline />

            {/* Session preview with live filtering + scoped theme */}
            {activeSession && !isParsing && (
              <div
                className="flex flex-col"
                style={{
                  flex: 1,
                  minHeight: '200px',
                  marginTop: 'var(--space-3)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden'
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderBottom: '1px solid var(--color-border)',
                    flexShrink: 0
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Live Preview
                  </span>
                  <button
                    onClick={clearActiveSession}
                    className="cursor-pointer"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px var(--space-2)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-text-muted)',
                      transition: 'all 150ms ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-text-muted)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                    }}
                  >
                    Close
                  </button>
                </div>
                {/* Scoped theme wrapper: data-theme only affects this preview area */}
                <div
                  data-theme={resolvedTheme}
                  style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
                >
                  <MessageList messages={filteredMessages} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // BROWSE VIEW (existing, with selection mode additions)
  // =========================================================================
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

          {/* Selection mode toggle */}
          {isSelecting ? (
            <button
              onClick={() => setSelecting(false)}
              className="flex items-center cursor-pointer"
              style={{
                ...headerButtonStyle,
                backgroundColor: 'var(--color-accent-subtle)',
                borderColor: 'var(--color-accent)',
                color: 'var(--color-accent)'
              }}
            >
              <CheckSquare size={14} />
              Cancel Selection
            </button>
          ) : (
            <button
              onClick={() => setSelecting(true)}
              className="flex items-center cursor-pointer"
              style={headerButtonStyle}
              onMouseEnter={headerButtonHover}
              onMouseLeave={headerButtonLeave}
            >
              <CheckSquare size={14} />
              Select for Presentation
            </button>
          )}

          {/* Go to assembly view (only if presentations exist) */}
          {presentations.length > 0 && !isSelecting && (
            <button
              onClick={() => setView('assembly')}
              className="flex items-center cursor-pointer"
              style={headerButtonStyle}
              onMouseEnter={headerButtonHover}
              onMouseLeave={headerButtonLeave}
            >
              Presentations ({presentations.length})
            </button>
          )}

          <button
            onClick={() => importFiles()}
            disabled={isImporting}
            className="flex items-center cursor-pointer"
            title="Import JSONL files"
            style={{
              ...headerButtonStyle,
              opacity: isImporting ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isImporting) headerButtonHover(e)
            }}
            onMouseLeave={headerButtonLeave}
          >
            <FileUp size={14} />
            Import
          </button>
          <button
            onClick={() => discover()}
            disabled={isDiscovering}
            className="flex items-center cursor-pointer"
            style={{
              ...headerButtonStyle,
              opacity: isDiscovering ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isDiscovering) headerButtonHover(e)
            }}
            onMouseLeave={headerButtonLeave}
          >
            <RefreshCw size={14} style={isDiscovering ? { animation: 'spin 1s linear infinite' } : undefined} />
            Refresh
          </button>
          <button
            onClick={() => browseAndDiscover()}
            disabled={isDiscovering}
            className="flex items-center cursor-pointer"
            style={{
              ...headerButtonStyle,
              opacity: isDiscovering ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isDiscovering) headerButtonHover(e)
            }}
            onMouseLeave={headerButtonLeave}
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
        <div className="flex flex-col" style={{ flex: 1, overflow: 'hidden', minHeight: 0, height: '100%', position: 'relative' }}>
          <div className="flex" style={{ flex: 1, gap: 'var(--space-4)', overflow: 'hidden', minHeight: 0, height: '100%' }}>
            {/* Session list */}
            <div
              style={{
                flex: activeSessionId && !isSelecting ? '0 0 50%' : '1 1 100%',
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
                activeSessionId={isSelecting ? null : activeSessionId}
                selectable={isSelecting}
                selectedSessionIds={selectedSessionIds}
                onToggleSelect={toggleSessionSelection}
              />
            </div>

            {/* Detail panel (only in non-selection mode) */}
            {activeSessionId && !isSelecting && (
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
                {/* Detail header with close button */}
                <div className="flex items-center justify-between" style={{ flexShrink: 0 }}>
                  <h3
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    Session Preview
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

                {/* Parse error: file-not-found vs generic */}
                {parseError && (
                  isFileNotFound(parseError) ? (
                    <FileNotFoundState
                      filePath={activeMetadata?.filePath ?? null}
                    />
                  ) : (
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
                  )
                )}

                {/* Session content with summary header + conversation */}
                {activeSession && !isParsing && (
                  <>
                    {/* Summary header */}
                    <SessionPreviewHeader
                      session={activeSession}
                      metadata={activeMetadata}
                    />

                    {/* Conversation Preview label */}
                    <span
                      style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
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

          {/* Floating action bar for selection mode */}
          {isSelecting && (
            <div
              className="flex items-center justify-between"
              style={{
                position: 'absolute',
                bottom: 'var(--space-4)',
                left: 'var(--space-4)',
                right: 'var(--space-4)',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
                boxShadow: '0 -2px 12px rgba(0,0,0,0.15)'
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500
                }}
              >
                {selectedSessionIds.size} session{selectedSessionIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleCreatePresentation}
                disabled={selectedSessionIds.size === 0}
                className="flex items-center cursor-pointer"
                style={{
                  backgroundColor: selectedSessionIds.size > 0 ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                  border: '1px solid ' + (selectedSessionIds.size > 0 ? 'var(--color-accent)' : 'var(--color-border)'),
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 'var(--text-sm)',
                  color: selectedSessionIds.size > 0 ? 'white' : 'var(--color-text-muted)',
                  gap: 'var(--space-2)',
                  transition: 'all 150ms ease',
                  fontWeight: 600,
                  opacity: selectedSessionIds.size === 0 ? 0.6 : 1
                }}
              >
                Create Presentation
              </button>
            </div>
          )}
        </div>
      </ImportDropZone>
    </div>
  )
}

/** Check if a parse error indicates a missing source file */
function isFileNotFound(error: string): boolean {
  const lower = error.toLowerCase()
  return (
    lower.includes('enoent') ||
    lower.includes('no such file') ||
    lower.includes('not found') ||
    lower.includes('does not exist')
  )
}

/** Distinct error state for missing source files */
function FileNotFoundState({ filePath }: { filePath: string | null }): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        flex: 1,
        justifyContent: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-8)',
        textAlign: 'center'
      }}
    >
      <AlertTriangle size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
      <h4
        style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 600,
          color: 'var(--color-text-primary)'
        }}
      >
        Source File Not Found
      </h4>
      {filePath && (
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            wordBreak: 'break-all',
            maxWidth: '400px'
          }}
        >
          {filePath}
        </span>
      )}
      <p
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-muted)',
          maxWidth: '300px'
        }}
      >
        The JSONL source file may have been moved or deleted.
      </p>
    </div>
  )
}
