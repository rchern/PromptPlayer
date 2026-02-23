// Presentation data model types.
// These MIRROR the main process types in src/main/pipeline/types.ts.
// They are separate because electron-vite compiles main and renderer as
// independent build targets -- they cannot share imports directly.
// Keep them in sync manually.

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
// Presentation (top-level document)
// ---------------------------------------------------------------------------

export interface Presentation {
  id: string // crypto.randomUUID()
  name: string // User-editable presentation name
  sections: PresentationSection[]
  createdAt: number // Date.now()
  updatedAt: number // Date.now()
}
