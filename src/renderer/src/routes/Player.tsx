import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { useNavigationStore } from '../stores/navigationStore'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { buildToolUseMap } from '../utils/messageFiltering'
import { StepView } from '../components/player/StepView'
import { NavigationControls } from '../components/player/NavigationControls'
import { ProgressIndicator } from '../components/player/ProgressIndicator'

/**
 * Player route: slideshow-style single-session navigation.
 *
 * Shows one user+Claude message pair at a time with keyboard and mouse
 * navigation. Content starts collapsed by default and can be expanded.
 * Expand/collapse state is remembered across step navigation.
 *
 * Data flow:
 *   sessionStore.activeSession -> navigationStore.initializeSteps -> steps[]
 *   steps[currentStepIndex] -> StepView -> CollapsibleContent -> MessageBubble
 */
export function Player(): React.JSX.Element {
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
      return () => clearTimeout(timer)
    }
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
