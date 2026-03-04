// Renderer-side pipeline type definitions.
// These MIRROR the main process types in src/main/pipeline/types.ts and
// src/main/storage/sessionStore.ts. They are separate because electron-vite
// compiles main and renderer as independent build targets -- they cannot
// share imports directly. Keep them in sync manually.

// ---------------------------------------------------------------------------
// Tool Classification
// ---------------------------------------------------------------------------

export type ToolVisibility = 'plumbing' | 'narrative' | 'unknown'

// ---------------------------------------------------------------------------
// Content Block Types
// ---------------------------------------------------------------------------

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  signature?: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  caller?: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error: boolean
}

export interface ImageBlock {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock
  | ImageBlock

// ---------------------------------------------------------------------------
// Parsed Message
// ---------------------------------------------------------------------------

export interface ParsedMessage {
  uuid: string
  parentUuid: string | null
  role: 'user' | 'assistant'
  contentBlocks: ContentBlock[]
  timestamp: string
  requestId: string | undefined
  isMeta: boolean
  isSidechain: boolean
  toolVisibility: ToolVisibility | null
}

// ---------------------------------------------------------------------------
// Stitched Session
// ---------------------------------------------------------------------------

export interface StitchedSession {
  messages: ParsedMessage[]
  orphanedCount: number
  sidechainCount: number
}

// ---------------------------------------------------------------------------
// Navigation Step (user+assistant pair for Player navigation)
// ---------------------------------------------------------------------------

export interface NavigationStep {
  index: number
  userMessage: ParsedMessage | null // null when first message is assistant-only
  assistantMessage: ParsedMessage | null // null for unpaired user message at end
  followUpMessages: ParsedMessage[] // tool_result-only user messages folded into this step (e.g. AskUserQuestion answers)
  /** When present, this step is a combined view of multiple consecutive solo assistant messages.
   *  assistantMessage is the first; this array includes ALL (including first) for rendering. */
  combinedAssistantMessages?: ParsedMessage[]
}

// ---------------------------------------------------------------------------
// Session Metadata
// ---------------------------------------------------------------------------

export interface SessionMetadata {
  sessionId: string
  projectFolder: string
  filePath: string
  firstTimestamp: string | null
  lastTimestamp: string | null
  firstUserMessage: string | null
  messageCount: number
  parseError: string | null
}

/**
 * Format the duration of a session as a human-readable string.
 * Returns 'Unknown' if either timestamp is missing.
 */
export function formatSessionDuration(meta: SessionMetadata): string {
  if (!meta.firstTimestamp || !meta.lastTimestamp) return 'Unknown'
  const startMs = new Date(meta.firstTimestamp).getTime()
  const endMs = new Date(meta.lastTimestamp).getTime()
  const diffMs = endMs - startMs
  if (diffMs < 60_000) return '<1 min'
  if (diffMs < 3_600_000) return `${Math.round(diffMs / 60_000)} min`
  const hours = Math.floor(diffMs / 3_600_000)
  const mins = Math.round((diffMs % 3_600_000) / 60_000)
  return `${hours}h ${mins}m`
}

// ---------------------------------------------------------------------------
// Stored Session
// ---------------------------------------------------------------------------

export interface StoredSession {
  sessionId: string
  projectFolder: string
  originalFilePath: string
  messages: ParsedMessage[]
  metadata: SessionMetadata
  /** Date.now() timestamp when the session was added to a presentation */
  addedAt: number
}
