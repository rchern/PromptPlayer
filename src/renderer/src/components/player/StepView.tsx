import React from 'react'
import type { NavigationStep } from '../../types/pipeline'
import { ElapsedTimeMarker } from './ElapsedTimeMarker'
import { MessageBubble } from '../message/MessageBubble'
import { computeElapsedMs } from '../../utils/formatElapsed'

interface StepViewProps {
  step: NavigationStep
  toolUseMap: Map<string, { name: string; input: Record<string, unknown> }>
  /** Per-tool visibility map from presentation settings for granular tool rendering */
  toolVisibilityMap?: Map<string, boolean>
  elapsedMs?: number | null
  showTimestamps?: boolean
}

/**
 * Renders a single navigation step as a vertical layout: user message on top,
 * assistant message below. This is the "slide" in the slideshow.
 *
 * Content renders at full height (no collapsing) — the scrollable container
 * in PlaybackPlayer handles overflow.
 *
 * The .presentation-mode class enables 20px base font for screen-sharing
 * readability (per 03-03 decision).
 */
export function StepView({
  step,
  toolUseMap,
  toolVisibilityMap,
  elapsedMs,
  showTimestamps
}: StepViewProps): React.JSX.Element {
  return (
    <div
      className="presentation-mode"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-6)',
        fontSize: '20px'
      }}
    >
      {/* User message section */}
      {step.userMessage && (
        <MessageBubble
          message={step.userMessage}
          showPlumbing={false}
          toolVisibilityMap={toolVisibilityMap}
          toolUseMap={toolUseMap}
        />
      )}

      {/* Elapsed time marker */}
      {showTimestamps && elapsedMs != null && elapsedMs >= 0 && (
        <ElapsedTimeMarker
          elapsedMs={elapsedMs}
          variant={step.userMessage ? 'default' : 'between-responses'}
        />
      )}

      {/* Single assistant message (non-combined steps) */}
      {step.assistantMessage && !step.combinedAssistantMessages && (
        <MessageBubble
          message={step.assistantMessage}
          showPlumbing={false}
          toolVisibilityMap={toolVisibilityMap}
          toolUseMap={toolUseMap}
          followUpMessages={step.followUpMessages}
        />
      )}

      {/* Combined assistant messages (filmstrip view for autonomous sequences) */}
      {step.combinedAssistantMessages &&
        step.combinedAssistantMessages.length > 0 &&
        step.combinedAssistantMessages.map((msg, idx) => {
          const prevMsg = idx > 0 ? step.combinedAssistantMessages![idx - 1] : null
          const interElapsed = prevMsg ? computeElapsedMs(prevMsg.timestamp, msg.timestamp) : null

          return (
            <React.Fragment key={msg.uuid}>
              {idx > 0 && showTimestamps && interElapsed != null && interElapsed >= 0 && (
                <ElapsedTimeMarker elapsedMs={interElapsed} variant="between-responses" />
              )}
              <MessageBubble
                message={msg}
                showPlumbing={false}
                toolVisibilityMap={toolVisibilityMap}
                toolUseMap={toolUseMap}
                followUpMessages={step.followUpMessages}
              />
            </React.Fragment>
          )
        })}

      {/* Follow-up messages — suppress results for specialized tool blocks (displayed inline)
          and rejections (shown as their own step on the next slide) */}
      {step.followUpMessages.length > 0 &&
        step.followUpMessages
          .filter((msg) => {
            const toolResultBlocks = msg.contentBlocks.filter((b) => b.type === 'tool_result')
            if (toolResultBlocks.length === 0) return true
            // Suppress rejections — they create their own visible step
            const isRejection = toolResultBlocks.some(
              (b) =>
                b.type === 'tool_result' &&
                typeof b.content === 'string' &&
                b.content.startsWith("The user doesn't want to proceed with this tool use")
            )
            if (isRejection) return false
            const specializedTools = new Set(['AskUserQuestion', 'TaskCreate', 'TaskUpdate', 'TaskList'])
            const allSpecialized = toolResultBlocks.every((b) => {
              if (b.type !== 'tool_result') return false
              const toolInfo = toolUseMap.get(b.tool_use_id)
              return toolInfo?.name != null && specializedTools.has(toolInfo.name)
            })
            return !allSpecialized
          })
          .map((msg, idx) => (
            <MessageBubble
              key={`followup-${idx}`}
              message={msg}
              showPlumbing={false}
              toolVisibilityMap={toolVisibilityMap}
              toolUseMap={toolUseMap}
            />
          ))}
    </div>
  )
}
