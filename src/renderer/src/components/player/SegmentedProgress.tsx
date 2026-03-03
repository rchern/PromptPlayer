import React, { useMemo } from 'react'
import { usePlaybackStore } from '../../stores/playbackStore'
import { computeSectionProgress } from '../../stores/playbackStore'

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 'var(--space-3)',
  left: 'var(--space-4)',
  right: 'var(--space-4)',
  zIndex: 10,
  userSelect: 'none',
  pointerEvents: 'none'
}

const textStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
  marginBottom: 'var(--space-1)'
}

const barContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  height: 4
}

const segmentTrackStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 2,
  background: 'var(--color-bg-tertiary)',
  overflow: 'hidden'
}

const segmentFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 2,
  background: 'var(--color-accent)',
  transition: 'width 150ms ease'
}

/**
 * Multi-segment progress bar at the bottom of the playback content area.
 *
 * Shows a text row with section name + local/global progress, and a
 * segmented bar where each segment represents a section with proportional
 * width and fill based on completion.
 *
 * Replaces the simple ProgressIndicator from Plan 02.
 */
export function SegmentedProgress(): React.JSX.Element {
  const steps = usePlaybackStore((s) => s.steps)
  const currentStepIndex = usePlaybackStore((s) => s.currentStepIndex)
  const presentation = usePlaybackStore((s) => s.presentation)

  // Compute per-section progress
  const sectionProgress = useMemo(() => {
    if (!presentation) return []
    return computeSectionProgress(steps, currentStepIndex, presentation.sections)
  }, [steps, currentStepIndex, presentation])

  // Total content steps across all sections (for proportional widths)
  const totalContentSteps = useMemo(() => {
    return sectionProgress.reduce((sum, sp) => sum + sp.total, 0)
  }, [sectionProgress])

  // Determine current section info for the text display
  const { sectionName, localStep, localTotal } = useMemo(() => {
    if (steps.length === 0 || currentStepIndex < 0) {
      return { sectionName: null, localStep: 0, localTotal: 0 }
    }
    const currentStep = steps[currentStepIndex]
    if (currentStep.type === 'overview') {
      return { sectionName: null, localStep: 0, localTotal: 0 }
    }
    const sectionId = 'sectionId' in currentStep ? currentStep.sectionId : null
    if (!sectionId) {
      return { sectionName: null, localStep: 0, localTotal: 0 }
    }

    const sp = sectionProgress.find((s) => s.sectionId === sectionId)
    if (!sp) {
      return { sectionName: null, localStep: 0, localTotal: 0 }
    }

    return {
      sectionName: sp.sectionName,
      localStep: sp.completed,
      localTotal: sp.total
    }
  }, [steps, currentStepIndex, sectionProgress])

  // Global progress: current step index (1-based) out of total steps
  const globalStep = currentStepIndex
  const globalTotal = steps.length > 0 ? steps.length - 1 : 0 // Exclude overview from count display

  if (!presentation || sectionProgress.length === 0) {
    return <div />
  }

  // Progress text
  const progressText =
    sectionName === null
      ? `Overview \u2014 0 of ${globalTotal} overall`
      : `${sectionName} (${localStep}/${localTotal}) \u2014 ${globalStep} of ${globalTotal} overall`

  return (
    <div style={containerStyle}>
      {/* Text row */}
      <div style={textStyle}>{progressText}</div>

      {/* Segmented bar */}
      <div style={barContainerStyle}>
        {sectionProgress.map((sp) => {
          const widthPercent =
            totalContentSteps > 0 ? (sp.total / totalContentSteps) * 100 : 0
          const fillPercent = sp.total > 0 ? (sp.completed / sp.total) * 100 : 0

          return (
            <div
              key={sp.sectionId}
              style={{
                ...segmentTrackStyle,
                flex: `0 0 ${widthPercent}%`
              }}
            >
              <div
                style={{
                  ...segmentFillStyle,
                  width: `${fillPercent}%`
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
