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
  // Pattern: User has answered your questions: "question"="answer". You can now continue...
  const match = text.match(
    /User has answered your questions?:\s*"([^"]*)"="([^"]*)"\.\s*You can now continue/
  )
  if (match) {
    const answers = match[2]
    return answers
  }
  return text
}

/**
 * Parse a "User has answered" message into structured data for rich rendering.
 * Returns null if the text doesn't match the pattern.
 */
/**
 * Parse a tool use rejection message. Returns the user's stated reason,
 * or "Declined" if no reason given.
 */
export function parseToolRejection(text: string): string | null {
  if (!text.includes("doesn't want to proceed with this tool use")) return null
  // Extract what the user said after "the user said:"
  const saidMatch = text.match(/the user said:\s*([\s\S]*?)(?:\.\s*This means|$)/)
  if (saidMatch && saidMatch[1].trim()) {
    return saidMatch[1].trim()
  }
  return 'Declined'
}

export function parseUserAnswer(text: string): { answers: string[] } | null {
  // Try matching directly first (tool_result content is clean)
  let raw = text.match(
    /User has answered your questions?:\s*"[^"]*?"="([^"]*?)"/
  )
  // If no match, strip XML tags and retry (text blocks may have tags mixed in)
  if (!raw) {
    const stripped = text.replace(/<[^>]*>/g, ' ').trim()
    raw = stripped.match(
      /User has answered your questions?:\s*"[^"]*?"="([^"]*?)"/
    )
  }
  if (!raw) return null
  const answerStr = raw[1]
  // Split by comma, handling "option1, option2" format
  const answers = answerStr.split(',').map((a) => a.trim()).filter(Boolean)
  return { answers }
}
