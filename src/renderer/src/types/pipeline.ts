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
// Session Metadata
// ---------------------------------------------------------------------------

export interface SessionMetadata {
  sessionId: string
  projectFolder: string
  filePath: string
  firstTimestamp: string | null
  firstUserMessage: string | null
  messageCount: number
  parseError: string | null
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
