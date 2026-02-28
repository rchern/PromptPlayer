import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { SectionProgressInfo } from '../../types/playback'
import type { PresentationSection } from '../../types/presentation'

interface SessionNameEntry {
  sessionId: string
  displayName: string
}

interface SectionSidebarEntryProps {
  section: PresentationSection
  isActive: boolean
  progress: SectionProgressInfo
  isExpanded: boolean
  sessionNames: SessionNameEntry[]
  activeSessionId: string | null
  onToggleExpand: () => void
  onJumpToSection: () => void
  onJumpToSession: (sessionId: string) => void
}

const sectionRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-2) var(--space-2)',
  borderRadius: 'var(--radius-sm)',
  userSelect: 'none'
}

const chevronButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 2,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted)',
  flexShrink: 0
}

const sectionNameButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: 'var(--text-sm)',
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}

const progressTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums',
  flexShrink: 0,
  whiteSpace: 'nowrap'
}

const sessionListStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: '0 0 0 var(--space-6)'
}

/**
 * Individual section row in the sidebar tree.
 *
 * Displays section name with expand/collapse chevron, per-section progress,
 * and an expandable list of session names. Active section and session are
 * highlighted with the accent-subtle pattern from SessionCard.
 */
function SectionSidebarEntryInner({
  section,
  isActive,
  progress,
  isExpanded,
  sessionNames,
  activeSessionId,
  onToggleExpand,
  onJumpToSection,
  onJumpToSession
}: SectionSidebarEntryProps): React.JSX.Element {
  return (
    <li role="treeitem" aria-expanded={isExpanded}>
      {/* Section header row */}
      <div
        style={{
          ...sectionRowStyle,
          backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'transparent'
        }}
      >
        {/* Chevron toggle */}
        <button
          onClick={onToggleExpand}
          aria-label={isExpanded ? `Collapse ${section.name}` : `Expand ${section.name}`}
          style={chevronButtonStyle}
        >
          <ChevronRight
            size={14}
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease'
            }}
          />
        </button>

        {/* Section name (clickable to jump) */}
        <button
          onClick={onJumpToSection}
          style={{
            ...sectionNameButtonStyle,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)'
          }}
          title={section.name}
        >
          {section.name}
        </button>

        {/* Progress text */}
        <span style={progressTextStyle}>
          {progress.completed}/{progress.total}
        </span>
      </div>

      {/* Expanded session list */}
      {isExpanded && sessionNames.length > 0 && (
        <ul style={sessionListStyle} role="group">
          {sessionNames.map((entry) => {
            const isActiveSession = entry.sessionId === activeSessionId
            return (
              <li key={entry.sessionId} role="treeitem">
                <button
                  onClick={() => onJumpToSession(entry.sessionId)}
                  title={entry.displayName}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: isActiveSession
                      ? 'var(--color-accent-subtle)'
                      : 'none',
                    border: 'none',
                    borderLeft: isActiveSession
                      ? '2px solid var(--color-accent)'
                      : '2px solid transparent',
                    padding: 'var(--space-1) var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: isActiveSession
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {entry.displayName}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

export const SectionSidebarEntry = React.memo(SectionSidebarEntryInner)
