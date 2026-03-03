import React from 'react'
import type { NavigationStep } from '../../types/pipeline'
import { CollapsibleContent } from './CollapsibleContent'
import { MessageBubble } from '../message/MessageBubble'

interface StepViewProps {
  step: NavigationStep
  expandedState: { user: boolean; assistant: boolean }
  onToggleExpand: (role: 'user' | 'assistant') => void
  toolUseMap: Map<string, { name: string; input: Record<string, unknown> }>
}

/**
 * Renders a single navigation step as a vertical layout: user message on top,
 * assistant message below. This is the "slide" in the slideshow.
 *
 * Both user and assistant sections are wrapped in CollapsibleContent.
 * Claude's response starts collapsed by default (3-line preview).
 * User messages start collapsed with 2-line preview.
 *
 * The .presentation-mode class enables 20px base font for screen-sharing
 * readability (per 03-03 decision).
 */
export function StepView({
  step,
  expandedState,
  onToggleExpand,
  toolUseMap
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
        <CollapsibleContent
          isExpanded={expandedState.user}
          onToggle={() => onToggleExpand('user')}
          previewLines={2}
          role="user"
        >
          <MessageBubble
            message={step.userMessage}
            showPlumbing={false}
            toolUseMap={toolUseMap}
          />
        </CollapsibleContent>
      )}

      {/* Assistant message section */}
      {step.assistantMessage && (
        <CollapsibleContent
          isExpanded={expandedState.assistant}
          onToggle={() => onToggleExpand('assistant')}
          previewLines={3}
          role="assistant"
        >
          <MessageBubble
            message={step.assistantMessage}
            showPlumbing={false}
            toolUseMap={toolUseMap}
            followUpMessages={step.followUpMessages}
          />
        </CollapsibleContent>
      )}

      {/* Follow-up messages — suppress results for specialized tool blocks (displayed inline) */}
      {step.followUpMessages.length > 0 &&
        step.followUpMessages
          .filter((msg) => {
            const toolResultBlocks = msg.contentBlocks.filter((b) => b.type === 'tool_result')
            if (toolResultBlocks.length === 0) return true
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
              toolUseMap={toolUseMap}
            />
          ))}
    </div>
  )
}
