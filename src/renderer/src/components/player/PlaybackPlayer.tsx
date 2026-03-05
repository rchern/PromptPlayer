import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import { usePlaybackStore } from '../../stores/playbackStore'
import { usePlaybackKeyboardNavigation } from '../../hooks/usePlaybackKeyboardNavigation'
import { PresentationOverview } from './PresentationOverview'
import { SeparatorCard } from './SeparatorCard'
import { StepView } from './StepView'
import { NavigationControls } from './NavigationControls'
import { SectionSidebar } from './SectionSidebar'
import { SegmentedProgress } from './SegmentedProgress'
import { usePlayerTheme } from '../../hooks/usePlayerTheme'

/**
 * Multi-session playback wrapper component.
 *
 * Renders the correct component for each step type in the unified playback
 * step array: overview, section-separator, session-separator, and navigation
 * steps. Includes section sidebar, fade transitions, keyboard navigation,
 * and segmented progress bar.
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
  const toggleSidebar = usePlaybackStore((s) => s.toggleSidebar)

  // Apply presentation theme with ephemeral toggle support
  const { isDark } = usePlayerTheme()

  // Activate playback keyboard bindings (arrows, Home/End, S sidebar toggle)
  usePlaybackKeyboardNavigation()

  // Fade transition state
  const [visible, setVisible] = useState(true)
  const prevIndexRef = useRef(currentStepIndex)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

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

  // Build per-tool visibility map from presentation settings
  // This allows ContentBlockRenderer to show/hide individual plumbing tools
  // based on the presentation's tool visibility configuration
  const toolVisibilityMap = useMemo(() => {
    if (!presentation?.settings?.toolVisibility) return undefined
    const map = new Map<string, boolean>()
    for (const category of presentation.settings.toolVisibility) {
      for (const tool of category.tools) {
        const override = category.toolOverrides[tool]
        map.set(tool, override ?? category.visible)
      }
    }
    return map
  }, [presentation?.settings?.toolVisibility])

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
  const showTimestamps = presentation.settings.showTimestamps

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Section sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 280 : 0,
          transition: 'width 200ms ease',
          overflow: 'hidden',
          flexShrink: 0,
          borderRight: sidebarOpen ? '1px solid var(--color-border)' : 'none'
        }}
      >
        <div style={{ width: 280, padding: 'var(--space-4)', height: '100%' }}>
          <SectionSidebar contentRef={contentRef} />
        </div>
      </aside>

      {/* Main content area */}
      <div
        ref={contentRef}
        tabIndex={-1}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', outline: 'none' }}
      >
        {/* Sidebar toggle button (visible when sidebar is closed) */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            aria-label="Open sidebar"
            style={{
              position: 'absolute',
              top: 'var(--space-3)',
              left: 'var(--space-3)',
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
              transition: 'opacity 200ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.5'
            }}
          >
            <PanelLeftOpen size={18} />
          </button>
        )}

        {/* Step content with fade transition */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            minHeight: 0,
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
            <SeparatorCard step={currentStep} showTimestamps={showTimestamps} />
          )}

          {currentStep.type === 'navigation' && (
            <StepView
              step={currentStep.step}
              expandedState={expanded}
              onToggleExpand={(role) => toggleExpand(currentStepIndex, role)}
              toolUseMap={toolUseMap}
              toolVisibilityMap={toolVisibilityMap}
              elapsedMs={currentStep.elapsedMs}
              showTimestamps={showTimestamps}
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

        {/* Segmented section progress bar with theme toggle */}
        <SegmentedProgress isDark={isDark} />
      </div>
    </div>
  )
}
