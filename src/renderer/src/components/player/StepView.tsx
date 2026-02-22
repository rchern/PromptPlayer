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
          />
        </CollapsibleContent>
      )}

      {/* Follow-up messages (e.g. AskUserQuestion answers, tool rejections) */}
      {step.followUpMessages.length > 0 &&
        step.followUpMessages.map((msg, idx) => (
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
