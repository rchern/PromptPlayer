import React, { useCallback, useMemo } from 'react'
import { PanelLeftClose } from 'lucide-react'
import { usePlaybackStore } from '../../stores/playbackStore'
import { computeSectionProgress } from '../../stores/playbackStore'
import { SectionSidebarEntry } from './SectionSidebarEntry'

interface SectionSidebarProps {
  contentRef?: React.RefObject<HTMLDivElement | null>
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 'var(--space-3)'
}

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 4,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted)',
  borderRadius: 'var(--radius-sm)'
}

const treeStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)'
}

/**
 * Collapsible sidebar with section/session tree for presentation navigation.
 *
 * Reads from playbackStore to display all sections with expandable session
 * lists, active section/session highlighting, and per-section progress.
 * Jump actions navigate to the appropriate separator card and return focus
 * to the main content area (Pitfall 4 mitigation).
 */
export function SectionSidebar({ contentRef }: SectionSidebarProps): React.JSX.Element {
  const presentation = usePlaybackStore((s) => s.presentation)
  const steps = usePlaybackStore((s) => s.steps)
  const currentStepIndex = usePlaybackStore((s) => s.currentStepIndex)
  const expandedSections = usePlaybackStore((s) => s.expandedSections)
  const toggleSidebarSection = usePlaybackStore((s) => s.toggleSidebarSection)
  const jumpToSection = usePlaybackStore((s) => s.jumpToSection)
  const jumpToSession = usePlaybackStore((s) => s.jumpToSession)
  const toggleSidebar = usePlaybackStore((s) => s.toggleSidebar)

  // Determine which section and session the current step belongs to
  const { activeSectionId, activeSessionId } = useMemo(() => {
    if (steps.length === 0 || currentStepIndex < 0) {
      return { activeSectionId: null, activeSessionId: null }
    }
    const currentStep = steps[currentStepIndex]
    if (currentStep.type === 'overview') {
      return { activeSectionId: null, activeSessionId: null }
    }
    const sectionId = 'sectionId' in currentStep ? currentStep.sectionId : null
    const sessionId = 'sessionId' in currentStep ? currentStep.sessionId : null
    return {
      activeSectionId: sectionId ?? null,
      activeSessionId: sessionId ?? null
    }
  }, [steps, currentStepIndex])

  // Compute per-section progress
  const sectionProgress = useMemo(() => {
    if (!presentation) return []
    return computeSectionProgress(steps, currentStepIndex, presentation.sections)
  }, [steps, currentStepIndex, presentation])

  // Focus content area after jump (Pitfall 4: sidebar steals keyboard focus)
  const focusContent = useCallback(() => {
    requestAnimationFrame(() => {
      contentRef?.current?.focus()
    })
  }, [contentRef])

  const handleJumpToSection = useCallback(
    (sectionId: string) => {
      jumpToSection(sectionId)
      focusContent()
    },
    [jumpToSection, focusContent]
  )

  const handleJumpToSession = useCallback(
    (sessionId: string) => {
      jumpToSession(sessionId)
      focusContent()
    },
    [jumpToSession, focusContent]
  )

  if (!presentation) {
    return <div />
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={titleStyle}>Sections</span>
        <button
          onClick={toggleSidebar}
          aria-label="Close sidebar"
          style={closeButtonStyle}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* Section tree */}
      <ul
        role="tree"
        aria-label="Presentation sections"
        style={treeStyle}
      >
        {presentation.sections.map((section, idx) => {
          const progress = sectionProgress[idx] ?? {
            sectionId: section.id,
            sectionName: section.name,
            completed: 0,
            total: 0
          }
          const sessionNames = section.sessionRefs.map((ref) => ({
            sessionId: ref.sessionId,
            displayName: ref.displayName
          }))

          return (
            <SectionSidebarEntry
              key={section.id}
              section={section}
              isActive={section.id === activeSectionId}
              progress={progress}
              isExpanded={expandedSections.has(section.id)}
              sessionNames={sessionNames}
              activeSessionId={activeSessionId}
              onToggleExpand={() => toggleSidebarSection(section.id)}
              onJumpToSection={() => handleJumpToSection(section.id)}
              onJumpToSession={handleJumpToSession}
            />
          )
        })}
      </ul>
    </div>
  )
}
