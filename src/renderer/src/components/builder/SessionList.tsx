import React from 'react'
import type { SessionMetadata } from '../../types/pipeline'
import { SessionCard } from './SessionCard'

interface SessionListProps {
  sessions: SessionMetadata[]
  onSelectSession: (session: SessionMetadata) => void
  isLoading: boolean
  viewMode: 'grouped' | 'chronological'
  activeSessionId: string | null
  selectable?: boolean
  selectedSessionIds?: Set<string>
  onToggleSelect?: (sessionId: string) => void
}

/** Group sessions by projectFolder, sort groups by most recent session, sort sessions within each group by date descending */
function groupAndSort(
  sessions: SessionMetadata[]
): { projectFolder: string; sessions: SessionMetadata[] }[] {
  const groups = new Map<string, SessionMetadata[]>()

  for (const session of sessions) {
    const key = session.projectFolder
    const existing = groups.get(key)
    if (existing) {
      existing.push(session)
    } else {
      groups.set(key, [session])
    }
  }

  // Sort each group's sessions by firstTimestamp descending (newest first)
  for (const [, groupSessions] of groups) {
    groupSessions.sort((a, b) => {
      const timeA = a.firstTimestamp ? new Date(a.firstTimestamp).getTime() : 0
      const timeB = b.firstTimestamp ? new Date(b.firstTimestamp).getTime() : 0
      return timeB - timeA
    })
  }

  // Sort groups by most recent session (newest group first)
  const entries = Array.from(groups.entries()).map(([key, groupSessions]) => ({
    projectFolder: key,
    sessions: groupSessions,
    newestTimestamp: groupSessions[0]?.firstTimestamp
      ? new Date(groupSessions[0].firstTimestamp).getTime()
      : 0
  }))

  entries.sort((a, b) => b.newestTimestamp - a.newestTimestamp)

  return entries.map(({ projectFolder, sessions: s }) => ({
    projectFolder,
    sessions: s
  }))
}

/** Sort sessions by firstTimestamp descending (newest first) for chronological view */
function sortChronological(sessions: SessionMetadata[]): SessionMetadata[] {
  return [...sessions].sort((a, b) => {
    const timeA = a.firstTimestamp ? new Date(a.firstTimestamp).getTime() : 0
    const timeB = b.firstTimestamp ? new Date(b.firstTimestamp).getTime() : 0
    return timeB - timeA
  })
}

export function SessionList({
  sessions,
  onSelectSession,
  isLoading,
  viewMode,
  activeSessionId,
  selectable = false,
  selectedSessionIds,
  onToggleSelect
}: SessionListProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ padding: 'var(--space-16) 0' }}
      >
        <span
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-muted)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        >
          Discovering sessions...
        </span>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ padding: 'var(--space-16) 0', gap: 'var(--space-2)' }}
      >
        <span
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)'
          }}
        >
          No sessions found
        </span>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)'
          }}
        >
          Check the default path or use "Browse Other Location" to select a directory
        </span>
      </div>
    )
  }

  // Chronological view: flat list sorted by time
  if (viewMode === 'chronological') {
    const sorted = sortChronological(sessions)
    return (
      <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
        {sorted.map((session) => (
          <SessionCard
            key={session.sessionId}
            session={session}
            onSelect={onSelectSession}
            isActive={session.sessionId === activeSessionId}
            showProject
            selectable={selectable}
            isSelected={selectedSessionIds?.has(session.sessionId) ?? false}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    )
  }

  // Grouped view: project groups with headers
  const grouped = groupAndSort(sessions)

  return (
    <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
      {grouped.map((group) => (
        <div key={group.projectFolder} className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
          {/* Project group header */}
          <h3
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '0 var(--space-1)',
              marginBottom: 'var(--space-1)'
            }}
          >
            {group.projectFolder}
          </h3>

          {/* Session cards */}
          {group.sessions.map((session) => (
            <SessionCard
              key={session.sessionId}
              session={session}
              onSelect={onSelectSession}
              isActive={session.sessionId === activeSessionId}
              selectable={selectable}
              isSelected={selectedSessionIds?.has(session.sessionId) ?? false}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
