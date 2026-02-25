// Presentation data model types.
// These MIRROR the main process types in src/main/pipeline/types.ts.
// They are separate because electron-vite compiles main and renderer as
// independent build targets -- they cannot share imports directly.
// Keep them in sync manually.

import type { StoredSession } from './pipeline'

// ---------------------------------------------------------------------------
// Session Reference (links a presentation to a stored session)
// ---------------------------------------------------------------------------

export interface SessionRef {
  sessionId: string // References StoredSession.sessionId
  displayName: string // User-editable friendly name
  sortKey: string // ISO timestamp for chronological ordering (from SessionMetadata.firstTimestamp)
}

// ---------------------------------------------------------------------------
// Presentation Section (groups of session references)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Presentation (top-level document)
// ---------------------------------------------------------------------------

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
