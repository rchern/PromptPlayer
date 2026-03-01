import { useState } from 'react'
import { ChevronRight, CircleHelp } from 'lucide-react'
import { parseUserAnswerPairs } from './cleanUserText'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AskUserQuestionBlockProps {
  input: Record<string, unknown>
  toolUseId: string
  answerText: string | null // Paired tool_result content, or null if no answer yet
}

interface QuestionOption {
  label: string
  description?: string
}

interface QuestionItem {
  question: string
  header?: string
  options: QuestionOption[]
  multiSelect: boolean
}

// ---------------------------------------------------------------------------
// Style constants (module-level to avoid re-creation per render)
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  background: 'var(--color-bg-tertiary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
  margin: 'var(--space-2) 0'
}

const headerTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3em',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-accent)',
  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
  padding: '0.15em 0.5em',
  borderRadius: 'var(--radius-sm)',
  marginBottom: 'var(--space-2)'
}

const questionTextStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-primary)',
  fontWeight: 500,
  marginBottom: 'var(--space-2)'
}

const optionBaseStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-secondary)',
  background: 'var(--color-bg-secondary)',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-2)'
}

const selectedOptionStyle: React.CSSProperties = {
  ...optionBaseStyle,
  border: '1px solid var(--color-accent)',
  background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-secondary))',
  color: 'var(--color-text-primary)',
  fontWeight: 500
}

const expandButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  color: 'var(--color-text-muted)',
  flexShrink: 0,
  marginTop: '0.1em'
}

const descriptionStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  lineHeight: 1.5,
  marginTop: 'var(--space-1)',
  paddingLeft: 'calc(14px + var(--space-2))'
}

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border-subtle)',
  margin: 'var(--space-3) 0'
}

const freeTextAnswerStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-secondary)',
  fontStyle: 'italic',
  padding: 'var(--space-2) var(--space-3)',
  borderLeft: '2px solid var(--color-accent)',
  marginTop: 'var(--space-2)',
  background: 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
}

const userNotesStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  fontStyle: 'italic',
  marginTop: 'var(--space-2)',
  paddingTop: 'var(--space-2)',
  borderTop: '1px solid var(--color-border-subtle)'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely parse questions array from tool input */
function parseQuestions(input: Record<string, unknown>): QuestionItem[] | null {
  const questions = Array.isArray(input.questions) ? input.questions : []
  if (questions.length === 0) return null

  const parsed: QuestionItem[] = []
  for (const q of questions) {
    if (!q || typeof q !== 'object') continue
    const item = q as Record<string, unknown>
    const question = typeof item.question === 'string' ? item.question : ''
    if (!question) continue

    const header = typeof item.header === 'string' ? item.header : undefined
    const multiSelect = item.multiSelect === true

    const options: QuestionOption[] = []
    if (Array.isArray(item.options)) {
      for (const opt of item.options as Array<Record<string, unknown>>) {
        if (!opt || typeof opt !== 'object') continue
        const label = typeof opt.label === 'string' ? opt.label : ''
        if (!label) continue
        const description = typeof opt.description === 'string' ? opt.description : undefined
        options.push({ label, description })
      }
    }

    parsed.push({ question, header, options, multiSelect })
  }

  return parsed.length > 0 ? parsed : null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Rich renderer for AskUserQuestion tool calls.
 * Shows header label tag, question text, expandable option descriptions,
 * and highlights the user's selected answer(s).
 *
 * Returns null for unparseable input (caller falls back to generic ToolCallBlock).
 */
export function AskUserQuestionBlock({
  input,
  answerText
}: AskUserQuestionBlockProps): React.JSX.Element | null {
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set())

  const questions = parseQuestions(input)
  if (!questions) return null

  // Parse answer pairs from the tool_result content
  const answerData = answerText ? parseUserAnswerPairs(answerText) : null

  function toggleOption(key: string): void {
    setExpandedOptions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div style={containerStyle}>
      {questions.map((q, qIndex) => {
        // Find the matching answer for this question
        const matchedPair = answerData?.pairs.find((p) => p.question === q.question)
        const selectedAnswers = matchedPair
          ? matchedPair.answer.split(',').map((a) => a.trim()).filter(Boolean)
          : []

        // Check if the answer is a free-text "other" answer (doesn't match any option)
        const hasFreeTextAnswer =
          selectedAnswers.length > 0 &&
          selectedAnswers.every(
            (ans) => !q.options.some((opt) => opt.label === ans)
          )

        return (
          <div key={qIndex}>
            {/* Divider between questions */}
            {qIndex > 0 && <div style={dividerStyle} />}

            {/* Header tag */}
            {q.header && (
              <div style={headerTagStyle}>
                <CircleHelp size={12} style={{ flexShrink: 0 }} />
                {q.header}
              </div>
            )}

            {/* Question text */}
            <div style={questionTextStyle}>{q.question}</div>

            {/* Options list */}
            {q.options.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                {q.options.map((opt, optIndex) => {
                  const isSelected = selectedAnswers.includes(opt.label)
                  const optionKey = `${qIndex}-${optIndex}`
                  const isExpanded = expandedOptions.has(optionKey)

                  return (
                    <div key={optIndex}>
                      <div style={isSelected ? selectedOptionStyle : optionBaseStyle}>
                        {/* Expand/collapse toggle for description */}
                        {opt.description ? (
                          <button
                            type="button"
                            onClick={() => toggleOption(optionKey)}
                            style={expandButtonStyle}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} description for ${opt.label}`}
                          >
                            <ChevronRight
                              size={14}
                              style={{
                                transition: 'transform 0.15s ease',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                              }}
                            />
                          </button>
                        ) : (
                          <span style={{ width: 14, flexShrink: 0 }} />
                        )}

                        {/* Option label */}
                        <span>{opt.label}</span>

                        {/* Selected indicator */}
                        {isSelected && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--color-accent)',
                              fontWeight: 600,
                              flexShrink: 0
                            }}
                          >
                            Selected
                          </span>
                        )}
                      </div>

                      {/* Expanded description */}
                      {opt.description && isExpanded && (
                        <div style={descriptionStyle}>{opt.description}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Free-text answer (doesn't match any option) */}
            {hasFreeTextAnswer && (
              <div style={freeTextAnswerStyle}>
                {selectedAnswers.join(', ')}
              </div>
            )}
          </div>
        )
      })}

      {/* User notes */}
      {answerData?.userNotes && (
        <div style={userNotesStyle}>
          Note: {answerData.userNotes}
        </div>
      )}
    </div>
  )
}
