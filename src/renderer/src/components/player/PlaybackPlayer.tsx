import React, { useEffect, useMemo, useRef, useState } from 'react'
import { usePlaybackStore } from '../../stores/playbackStore'
import { usePlaybackKeyboardNavigation } from '../../hooks/usePlaybackKeyboardNavigation'
import { PresentationOverview } from './PresentationOverview'
import { SeparatorCard } from './SeparatorCard'
import { StepView } from './StepView'
import { NavigationControls } from './NavigationControls'
import { ProgressIndicator } from './ProgressIndicator'

/**
 * Multi-session playback wrapper component.
 *
 * Renders the correct component for each step type in the unified playback
 * step array: overview, section-separator, session-separator, and navigation
 * steps. Includes sidebar placeholder (Plan 03), fade transitions, keyboard
 * navigation, and progress indicator.
 *
 * Data flow:
 *   playbackStore.steps -> PlaybackStep[] -> type-discriminated rendering
 *   playbackStore.sessions -> multi-session toolUseMap for rejection display
 */
export function PlaybackPlayer(): React.JSX.Element {
  const presentation = usePlaybackStore((s) => s.presentation)
  const steps = usePlaybackStore((s) => s.steps)
  const currentStepIndex = usePlaybackStore((s) => s.currentStepIndex)
  const expandedSteps = usePlaybackStore((s) => s.expandedSteps)
  const sidebarOpen = usePlaybackStore((s) => s.sidebarOpen)
  const sessions = usePlaybackStore((s) => s.sessions)
  const nextStep = usePlaybackStore((s) => s.nextStep)
  const prevStep = usePlaybackStore((s) => s.prevStep)
  const toggleExpand = usePlaybackStore((s) => s.toggleExpand)

  // Activate playback keyboard bindings (arrows, Home/End, S sidebar toggle)
  usePlaybackKeyboardNavigation()

  // Fade transition state
  const [visible, setVisible] = useState(true)
  const prevIndexRef = useRef(currentStepIndex)
  const containerRef = useRef<HTMLDivElement>(null)

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
      return (): void => {
        clearTimeout(timer)
      }
    }
    return undefined
  }, [currentStepIndex])

  // Build tool use map spanning ALL sessions for rejection display
  const toolUseMap = useMemo(() => {
    const map = new Map<string, { name: string; input: Record<string, unknown> }>()
    for (const session of sessions.values()) {
      for (const msg of session.messages) {
        for (const block of msg.contentBlocks) {
          if (block.type === 'tool_use') {
            map.set(block.id, { name: block.name, input: block.input })
          }
        }
      }
    }
    return map
  }, [sessions])

  // Compute total navigation steps (excluding separators/overview) for overview display
  const totalNavigationSteps = useMemo(() => {
    return steps.filter((s) => s.type === 'navigation').length
  }, [steps])

  if (!presentation || steps.length === 0) {
    return <div />
  }

  const currentStep = steps[currentStepIndex]
  const expanded = expandedSteps[currentStepIndex] ?? { user: false, assistant: false }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar placeholder -- Plan 03 will add SectionSidebar here */}
      <aside
        style={{
          width: sidebarOpen ? 280 : 0,
          transition: 'width 200ms ease',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        <div style={{ width: 280, padding: 'var(--space-4)' }}>
          {/* Plan 03 will add SectionSidebar here */}
        </div>
      </aside>

      {/* Main content area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Step content with fade transition */}
        <div
          ref={containerRef}
          style={{
            height: '100%',
            overflowY: 'auto',
            opacity: visible ? 1 : 0,
            transition: 'opacity 75ms ease-in-out'
          }}
        >
          {currentStep.type === 'overview' && (
            <PresentationOverview
              presentation={presentation}
              totalSteps={totalNavigationSteps}
            />
          )}

          {(currentStep.type === 'section-separator' ||
            currentStep.type === 'session-separator') && (
            <SeparatorCard step={currentStep} />
          )}

          {currentStep.type === 'navigation' && (
            <StepView
              step={currentStep.step}
              expandedState={expanded}
              onToggleExpand={(role) => toggleExpand(currentStepIndex, role)}
              toolUseMap={toolUseMap}
            />
          )}
        </div>

        {/* Navigation arrow buttons on viewport edges */}
        <NavigationControls
          canGoBack={currentStepIndex > 0}
          canGoForward={currentStepIndex < steps.length - 1}
          onBack={prevStep}
          onForward={nextStep}
        />

        {/* Progress placeholder -- Plan 03 will replace with SegmentedProgress */}
        <ProgressIndicator
          currentStep={currentStepIndex}
          totalSteps={steps.length}
        />
      </div>
    </div>
  )
}
