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

// ---------------------------------------------------------------------------
// Presentation Types
// ---------------------------------------------------------------------------
// These mirror src/renderer/src/types/presentation.ts.
// Main and renderer cannot share imports due to electron-vite's separate
// build targets. Keep them in sync manually.

import type { StoredSession } from '../storage/sessionStore'

export interface SessionRef {
  sessionId: string // References StoredSession.sessionId
  displayName: string // User-editable friendly name
  sortKey: string // ISO timestamp for chronological ordering
}

export interface PresentationSection {
  id: string // crypto.randomUUID()
  name: string // User-editable section name
  sessionRefs: SessionRef[] // Ordered by sortKey (chronological)
}

// ---------------------------------------------------------------------------
// Tool Category Config (two-level visibility granularity)
// ---------------------------------------------------------------------------

export interface ToolCategoryConfig {
  categoryName: string // Display name: "File Operations", "Search", etc.
  tools: string[] // Tool names: ["Read", "Write", "Edit", "Glob"]
  defaultVisible: boolean // From classifier: false for plumbing, true for narrative
  visible: boolean // User's current category-level setting
  expanded: boolean // Whether individual tools are shown in the settings UI
  toolOverrides: Record<string, boolean> // Per-tool overrides when expanded
}

// ---------------------------------------------------------------------------
// Presentation Settings (configuration for display behavior)
// ---------------------------------------------------------------------------

export interface PresentationSettings {
  toolVisibility: ToolCategoryConfig[]
  showTimestamps: boolean // Simple on/off toggle
  theme: 'light' | 'dark' | 'system'
}

export interface Presentation {
  id: string // crypto.randomUUID()
  name: string // User-editable presentation name
  sections: PresentationSection[]
  settings: PresentationSettings // Tool visibility, timestamps, theme
  sourceFilePath?: string // Tracks .promptplay file path for Save overwrite
  createdAt: number // Date.now()
  updatedAt: number // Date.now()
}

// ---------------------------------------------------------------------------
// PromptPlay File Format (self-contained export)
// ---------------------------------------------------------------------------

export interface PromptPlayFile {
  presentation: Presentation
  sessions: StoredSession[]
}
