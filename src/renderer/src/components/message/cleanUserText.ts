/**
 * Clean system-injected XML from Claude Code user message text.
 *
 * Claude Code injects XML protocol tags into user messages sent to the API.
 * This function strips system noise and transforms command tags into
 * readable `/command args` format.
 */
export function cleanUserText(text: string): string {
  let cleaned = text

  // Extract slash command before stripping
  const commandName = extractTag(cleaned, 'command-name')
  const commandArgs = extractTag(cleaned, 'command-args')

  // Strip all known system XML tags and their content
  const noiseTags = [
    'local-command-caveat',
    'system-reminder',
    'command-name',
    'command-message',
    'command-args',
    'local-command-stdout',
    'task-notification',
    'task-id',
    'tool-use-id',
    'output-file',
    'status',
    'summary',
    'fast_mode_info',
    'context',
    'objective',
    'execution_context',
    'process',
    'offer_next',
    'wave_execution',
    'checkpoint_handling',
    'deviation_rules',
    'commit_rules',
    'success_criteria',
    'ui_patterns',
  ]

  for (const tag of noiseTags) {
    cleaned = removeTag(cleaned, tag)
  }

  // Anthropic internal tags (antml:*)
  cleaned = cleaned.replace(/<\/?antml:[^>]*>/g, '')
  // Any remaining self-closing XML-style tags
  cleaned = cleaned.replace(/<[a-z_-]+\/>/gi, '')

  // Transform "User has answered your questions: ..." into clean answer display
  cleaned = cleanAskUserAnswer(cleaned)

  // Strip system-generated interruption notices (redundant with rejection display)
  cleaned = cleaned.replace(/\[Request interrupted by user for tool use\]/g, '')

  // Trim what's left
  cleaned = cleaned.trim()

  // If we extracted a command, prepend it as a readable slash command
  if (commandName) {
    const prefix = commandName.startsWith('/') ? '' : '/'
    const cmd = prefix + commandName + (commandArgs ? ' ' + commandArgs : '')
    cleaned = cleaned ? cmd + '\n\n' + cleaned : cmd
  }

  return cleaned
}

/** Extract text content from a tag, or return empty string if not found */
function extractTag(text: string, tagName: string): string {
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'g')
  const match = re.exec(text)
  return match ? match[1].trim() : ''
}

/** Remove a tag and its content from text */
function removeTag(text: string, tagName: string): string {
  const re = new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`, 'g')
  return text.replace(re, '')
}

/**
 * Transform "User has answered your questions: ..." internal protocol
 * into a clean answer display. Returns original text if no match.
 */
function cleanAskUserAnswer(text: string): string {
  // Check if text contains the answer protocol
  if (!text.match(/User has answered your questions?:/)) return text
  if (!text.includes('. You can now continue')) return text

  // Extract pairs using the "="-split parser and return all answers joined
  const parsed = parseUserAnswerPairs(text)
  if (!parsed || parsed.pairs.length === 0) return text

  return parsed.pairs.map((p) => p.answer).join(', ')
}

/**
 * Detect system-generated user messages that should not display as "You".
 *
 * These are messages injected by Claude Code's orchestration layer into the
 * user role, not typed by the actual human user. Detection is conservative:
 * false negatives (showing system as "You") are preferred over false positives
 * (hiding real user input).
 *
 * Checks RAW text (before cleanUserText processing) so system XML tags
 * like <task-notification> are still present for detection.
 */
export function isSystemMessage(text: string): boolean {
  const trimmed = text.trim()
  const patterns = [
    // TaskOutput read result injections
    /^Read the output file to retrieve the result:/,
    // Tool output task completions
    /^The tool has completed/,
    // Agent task output notifications
    /^<task-notification>/,
    // Task result notifications (agent spawning)
    /^<task-result>/,
    // Background task output
    /^<output-file>/,
  ]
  return patterns.some((p) => p.test(trimmed))
}

/**
 * Parse a tool use rejection message. Returns the user's stated reason,
 * or "Declined" if no reason given.
 */
export function parseToolRejection(text: string): string | null {
  if (!text.startsWith("The user doesn't want to proceed with this tool use")) return null
  // Extract what the user said after "the user said:"
  const saidMatch = text.match(/the user said:\s*([\s\S]*?)(?:\.\s*This means|$)/)
  if (saidMatch && saidMatch[1].trim()) {
    return saidMatch[1].trim()
  }
  return 'Declined'
}

export function parseUserAnswer(text: string): { answers: string[] } | null {
  // Delegate to parseUserAnswerPairs which handles embedded quotes correctly
  const parsed = parseUserAnswerPairs(text)
  if (!parsed || parsed.pairs.length === 0) return null

  // Collect all answers from all pairs
  const answers: string[] = []
  for (const pair of parsed.pairs) {
    // Split by comma for multi-select answers (e.g., "option1, option2")
    const parts = pair.answer.split(',').map((a) => a.trim()).filter(Boolean)
    answers.push(...parts)
  }
  return { answers }
}

/**
 * Parse ALL question-answer pairs from a "User has answered" tool_result content string.
 * Handles single and multi-question formats:
 *   Single: 'User has answered your questions: "Q1"="A1". You can now continue...'
 *   Multi:  'User has answered your questions: "Q1"="A1", "Q2"="A2". You can now continue...'
 *   With notes: '... "Q"="A" user notes: free text here. You can now continue...'
 *
 * Uses "=" as the primary delimiter (protocol-specific, never appears in natural text)
 * rather than [^"]*? regex which breaks when question/answer text contains embedded quotes.
 *
 * Returns null if the text doesn't match the expected format.
 */
export function parseUserAnswerPairs(text: string): {
  pairs: Array<{ question: string; answer: string }>
  userNotes: string | null
} | null {
  // Try raw text first, then strip XML tags and retry
  let source = text
  if (!source.match(/User has answered your questions?:/)) {
    source = text.replace(/<[^>]*>/g, ' ').trim()
  }
  if (!source.match(/User has answered your questions?:/)) return null

  // Extract everything after "User has answered your question(s): "
  const prefixMatch = source.match(/User has answered your questions?:\s*/)
  if (!prefixMatch) return null
  const afterPrefix = source.slice(prefixMatch.index! + prefixMatch[0].length)

  // Remove trailing ". You can now continue..." suffix
  let body = afterPrefix
  const suffixIdx = body.indexOf('. You can now continue')
  if (suffixIdx !== -1) {
    body = body.slice(0, suffixIdx)
  }

  // Split on "=" — the protocol delimiter between question and answer.
  // This is unambiguous because "=" never appears in natural language text.
  // Format: "Q1"="A1", "Q2"="A2", ...
  const delimiter = '"="'
  const segments = body.split(delimiter)

  if (segments.length < 2) return null // Need at least one Q/A pair

  const pairs: Array<{ question: string; answer: string }> = []
  let userNotes: string | null = null

  /** Strip " user notes: ..." from an answer string if present */
  function extractNotes(answer: string): { answer: string; notes: string | null } {
    const notesIdx = answer.indexOf(' user notes: ')
    if (notesIdx === -1) return { answer, notes: null }
    return {
      // Strip trailing " — it's the protocol closing quote before " user notes:"
      answer: answer.slice(0, notesIdx).replace(/"$/, ''),
      notes: answer.slice(notesIdx + ' user notes: '.length)
    }
  }

  if (segments.length === 2) {
    // Single pair: segments are ["Q1] and [A1"]
    const question = segments[0].replace(/^"/, '')
    const rawAnswer = segments[1].replace(/"$/, '')
    const extracted = extractNotes(rawAnswer)
    pairs.push({ question, answer: extracted.answer })
    if (extracted.notes) userNotes = extracted.notes
  } else {
    // Multiple pairs. After splitting on "=":
    //   Segment 0: "Q1         (opening " + question text)
    //   Segment 1: A1", "Q2    (answer + pair separator + next question)
    //   Segment N: AN"         (last answer + closing ")
    let currentQuestion = segments[0].replace(/^"/, '')

    for (let i = 1; i < segments.length; i++) {
      if (i < segments.length - 1) {
        // Middle segment: ANSWER", "QUESTION
        // Split on LAST '", "' to separate answer from next question.
        // Using last occurrence handles answers containing ", " (e.g., multi-select values).
        const seg = segments[i]
        const lastSepIdx = seg.lastIndexOf('", "')

        if (lastSepIdx === -1) {
          // No separator found — answer may contain "user notes:" that absorbed the separator.
          // Treat entire segment as the answer.
          const extracted = extractNotes(seg.replace(/"$/, ''))
          pairs.push({ question: currentQuestion, answer: extracted.answer })
          if (extracted.notes) userNotes = extracted.notes
          currentQuestion = ''
        } else {
          const rawAnswer = seg.slice(0, lastSepIdx)
          const nextQuestion = seg.slice(lastSepIdx + 4) // Skip '", "'
          const extracted = extractNotes(rawAnswer)
          pairs.push({ question: currentQuestion, answer: extracted.answer })
          if (extracted.notes) userNotes = extracted.notes
          currentQuestion = nextQuestion
        }
      } else {
        // Last segment: ANSWER"
        const rawAnswer = segments[i].replace(/"$/, '')
        const extracted = extractNotes(rawAnswer)
        pairs.push({ question: currentQuestion, answer: extracted.answer })
        if (extracted.notes) userNotes = extracted.notes
      }
    }
  }

  if (pairs.length === 0) return null

  return { pairs, userNotes }
}
