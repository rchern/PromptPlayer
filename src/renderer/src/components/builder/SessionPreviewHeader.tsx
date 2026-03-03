import React, { useMemo } from 'react'
import type { StitchedSession, SessionMetadata } from '../../types/pipeline'
import { formatSessionDuration } from '../../types/pipeline'
import { filterVisibleMessages, buildNavigationSteps } from '../../utils/messageFiltering'

interface SessionPreviewHeaderProps {
  session: StitchedSession
  metadata: SessionMetadata | null
}

/**
 * Summary stats header for the session preview panel.
 * Shows message count, step count, duration, project path,
 * and optional command snippet when the session starts with a /command.
 */
export function SessionPreviewHeader({
  session,
  metadata
}: SessionPreviewHeaderProps): React.JSX.Element {
  const stats = useMemo(() => {
    const visible = filterVisibleMessages(session.messages, false)
    const steps = buildNavigationSteps(visible)
    return { messageCount: visible.length, stepCount: steps.length }
  }, [session.messages])

  const duration = metadata ? formatSessionDuration(metadata) : 'Unknown'
  const projectPath = metadata?.projectFolder ?? 'Unknown'

  // Show command stat if the session starts with a /command
  const command =
    metadata?.firstUserMessage && metadata.firstUserMessage.startsWith('/')
      ? metadata.firstUserMessage
      : null

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        borderBottom: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)'
      }}
    >
      {/* Compact numeric stats row */}
      <div
        className="flex"
        style={{ gap: 'var(--space-6)' }}
      >
        <StatItem label="Messages" value={String(stats.messageCount)} />
        <StatItem label="Steps" value={String(stats.stepCount)} />
        <StatItem label="Duration" value={duration} />
      </div>

      {/* Full-width detail rows */}
      <FullWidthStat label="Project" value={projectPath} />
      {command && <FullWidthStat label="Command" value={command} />}
    </div>
  )
}

function StatItem({
  label,
  value
}: {
  label: string
  value: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col" style={{ gap: '2px', minWidth: 0 }}>
      <span
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--color-text-primary)'
        }}
      >
        {value}
      </span>
    </div>
  )
}

function FullWidthStat({
  label,
  value
}: {
  label: string
  value: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col" style={{ gap: '2px' }}>
      <span
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          wordBreak: 'break-word'
        }}
      >
        {value}
      </span>
    </div>
  )
}
