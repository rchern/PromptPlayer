import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { useSessionStore } from '../stores/sessionStore'
import { useNavigationStore } from '../stores/navigationStore'
import { usePlaybackStore } from '../stores/playbackStore'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { buildToolUseMap } from '../utils/messageFiltering'
import { StepView } from '../components/player/StepView'
import { NavigationControls } from '../components/player/NavigationControls'
import { ProgressIndicator } from '../components/player/ProgressIndicator'
import { PlaybackPlayer } from '../components/player/PlaybackPlayer'

// ---------------------------------------------------------------------------
// Open File button styles (module-level constants)
// ---------------------------------------------------------------------------

const openFileButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-2) var(--space-4)',
  backgroundColor: 'var(--color-accent)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 'var(--space-4)',
}

const openFileMiniButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'var(--space-3)',
  right: 'var(--space-3)',
  zIndex: 15,
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 6,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-muted)',
  opacity: 0.5,
  transition: 'opacity 200ms ease',
}

/**
 * Player route: dispatches between single-session and multi-session modes.
 *
 * When a presentation is loaded in the playback store, renders PlaybackPlayer
 * for multi-session playback. Otherwise, falls through to the existing
 * single-session slideshow navigation via SingleSessionPlayer.
 *
 * The dispatch is a conditional render (not an early return with hooks after)
 * to comply with React's rules of hooks.
 *
 * Data flow (multi-session):
 *   playbackStore.presentation -> PlaybackPlayer
 *
 * Data flow (single-session):
 *   sessionStore.activeSession -> navigationStore.initializeSteps -> steps[]
 *   steps[currentStepIndex] -> StepView -> CollapsibleContent -> MessageBubble
 */
export function Player(): React.JSX.Element {
  const presentation = usePlaybackStore((s) => s.presentation)
  const loadPresentation = usePlaybackStore((s) => s.loadPresentation)
  const activeSession = useSessionStore((s) => s.activeSession)

  // Temporary dev import trigger: when player mounts with no session and no
  // presentation, prompt the user to open a .promptplay file for testing.
  const importTriggered = useRef(false)
  useEffect(() => {
    if (presentation || activeSession || importTriggered.current) return
    importTriggered.current = true
    window.electronAPI.importPresentation().then((result) => {
      if (result) {
        loadPresentation(result.presentation, result.sessions)
      }
    })
  }, [presentation, activeSession, loadPresentation])

  // Open a different .promptplay file via the system dialog
  const handleOpenFile = async (): Promise<void> => {
    const result = await window.electronAPI.importPresentation()
    if (result) {
      loadPresentation(result.presentation, result.sessions)
    }
  }

  // Dispatch: multi-session playback vs single-session preview
  if (presentation) {
    return (
      <div style={{ position: 'relative', height: '100%' }}>
        <PlaybackPlayer />
        {/* Open different file button - top right, subtle */}
        <button
          onClick={handleOpenFile}
          title="Open a different presentation"
          style={openFileMiniButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.5'
          }}
        >
          <FolderOpen size={16} />
        </button>
      </div>
    )
  }

  return <SingleSessionPlayer handleOpenFile={handleOpenFile} />
}

// ---------------------------------------------------------------------------
// Single-Session Player (extracted to its own component for hook safety)
// ---------------------------------------------------------------------------

/**
 * Original single-session slideshow player, extracted as a component so that
 * its hooks are not called conditionally after the presentation dispatch check.
 */
function SingleSessionPlayer({ handleOpenFile }: { handleOpenFile: () => Promise<void> }): React.JSX.Element {
  const activeSession = useSessionStore((s) => s.activeSession)

  const steps = useNavigationStore((s) => s.steps)
  const currentStepIndex = useNavigationStore((s) => s.currentStepIndex)
  const expandedSteps = useNavigationStore((s) => s.expandedSteps)
  const toggleExpand = useNavigationStore((s) => s.toggleExpand)
  const nextStep = useNavigationStore((s) => s.nextStep)
  const prevStep = useNavigationStore((s) => s.prevStep)
  const initializeSteps = useNavigationStore((s) => s.initializeSteps)
  const reset = useNavigationStore((s) => s.reset)

  // Activate keyboard bindings (ArrowRight/Space, ArrowLeft, Home, End)
  useKeyboardNavigation()

  // Fade transition state
  const [visible, setVisible] = useState(true)
  const prevIndexRef = useRef(currentStepIndex)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize navigation steps when activeSession changes
  useEffect(() => {
    if (activeSession) {
      initializeSteps(activeSession.messages)
    }
    return () => reset()
  }, [activeSession, initializeSteps, reset])

  // Fade transition and scroll reset on step change
  useEffect(() => {
    if (prevIndexRef.current !== currentStepIndex) {
      prevIndexRef.current = currentStepIndex
      setVisible(false)
      const timer = setTimeout(() => {
        setVisible(true)
        // Scroll container to top when arriving at a new step
        containerRef.current?.scrollTo(0, 0)
      }, 75)
      return (): void => { clearTimeout(timer) }
    }
    return undefined
  }, [currentStepIndex])

  // Build tool use map once for the active session (for rejection display)
  const toolUseMap = useMemo(() => {
    if (!activeSession) return new Map()
    return buildToolUseMap(activeSession.messages)
  }, [activeSession])

  // Empty state: no session loaded
  if (!activeSession || steps.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 'var(--space-3)',
          padding: 'var(--space-8)',
          color: 'var(--color-text-muted)',
          textAlign: 'center'
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 600,
            color: 'var(--color-text-secondary)'
          }}
        >
          No session loaded
        </h2>
        <p style={{ fontSize: 'var(--text-base)', maxWidth: 400 }}>
          Select a session in Builder mode to preview it here, or choose a saved
          presentation from the Home screen.
        </p>
        <button onClick={handleOpenFile} style={openFileButtonStyle}>
          <FolderOpen size={16} />
          Open Presentation
        </button>
      </div>
    )
  }

  const currentStep = steps[currentStepIndex]
  const expanded = expandedSteps[currentStepIndex] ?? { user: false, assistant: false }

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Step content area with fade transition */}
      <div
        ref={containerRef}
        style={{
          height: '100%',
          overflowY: 'auto',
          opacity: visible ? 1 : 0,
          transition: 'opacity 75ms ease-in-out'
        }}
      >
        <StepView
          step={currentStep}
          expandedState={expanded}
          onToggleExpand={(role) => toggleExpand(currentStepIndex, role)}
          toolUseMap={toolUseMap}
        />
      </div>

      {/* Navigation arrow buttons on viewport edges */}
      <NavigationControls
        canGoBack={currentStepIndex > 0}
        canGoForward={currentStepIndex < steps.length - 1}
        onBack={prevStep}
        onForward={nextStep}
      />

      {/* Step counter and progress bar */}
      <ProgressIndicator
        currentStep={currentStepIndex}
        totalSteps={steps.length}
      />
    </div>
  )
}
