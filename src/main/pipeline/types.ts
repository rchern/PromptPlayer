// Pipeline type definitions -- pure types, no runtime logic
// These interfaces model the Claude Code JSONL conversation format
// and the pipeline's intermediate/output data structures.

// ---------------------------------------------------------------------------
// JSONL Line Types
// ---------------------------------------------------------------------------

/** All possible JSONL line type discriminators */
export type JsonlLineType =
  | 'user'
  | 'assistant'
  | 'system'
  | 'progress'
  | 'file-history-snapshot'
  | 'queue-operation'

// ---------------------------------------------------------------------------
// Content Block Types (union of all block variants)
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

/** Discriminated union of all content block types */
export type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock
  | ImageBlock

// ---------------------------------------------------------------------------
// Raw JSONL Line (as parsed directly from file)
// ---------------------------------------------------------------------------

export interface JsonlLine {
  type: JsonlLineType
  uuid: string
  parentUuid: string | null
  isSidechain: boolean
  sessionId: string
  timestamp: string
  cwd: string
  version: string
  gitBranch: string
  userType: string
  message?: {
    role: 'user' | 'assistant'
    content: string | ContentBlock[]
  }
  requestId?: string
  isMeta?: boolean
  permissionMode?: string
  toolUseResult?: unknown
  sourceToolAssistantUUID?: string
}

// ---------------------------------------------------------------------------
// Tool Classification
// ---------------------------------------------------------------------------

/** Visibility classification for tool calls */
export type ToolVisibility = 'plumbing' | 'narrative' | 'unknown'

// ---------------------------------------------------------------------------
// Parsed Message (unified model after reassembly)
// ---------------------------------------------------------------------------

export interface ParsedMessage {
  /** Last line's uuid for assistant turns, line uuid for user messages */
  uuid: string
  /** First line's parentUuid for assistant turns, line parentUuid for user */
  parentUuid: string | null
  role: 'user' | 'assistant'
  contentBlocks: ContentBlock[]
  timestamp: string
  requestId: string | undefined
  isMeta: boolean
  isSidechain: boolean
  /** null for non-tool messages; set by classifier for tool-bearing messages */
  toolVisibility: ToolVisibility | null
}

// ---------------------------------------------------------------------------
// Parse Result
// ---------------------------------------------------------------------------

export interface ParseError {
  lineNumber: number
  error: string
}

export interface ParseResult {
  messages: ParsedMessage[]
  errors: ParseError[]
  totalLines: number
  /** Maps filtered-out line UUIDs to their parentUuids, so the stitcher can resolve through gaps */
  filteredUuidRedirects: Map<string, string | null>
}

// ---------------------------------------------------------------------------
// Stitched Session (ordered, classified output)
// ---------------------------------------------------------------------------

export interface StitchedSession {
  messages: ParsedMessage[]
  orphanedCount: number
  sidechainCount: number
}

// ---------------------------------------------------------------------------
// Session Metadata (for browse list display)
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
