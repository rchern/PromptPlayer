import { create } from 'zustand'
import type { SessionMetadata, StitchedSession, StoredSession } from '../types/pipeline'
import type {
  Presentation,
  PresentationSection,
  PresentationSettings,
  SessionRef
} from '../types/presentation'
import {
  backfillSettings,
  createPresentationFromSessions,
  generateSessionDisplayName,
  sortSessionRefsChronologically
} from '../utils/presentationUtils'

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface PresentationState {
  // State
  presentations: Presentation[]
  activePresentationId: string | null
  isLoading: boolean

  // Computed helpers
  getActivePresentation: () => Presentation | null

  // CRUD
  loadPresentations: () => Promise<void>
  createPresentation: (sessions: SessionMetadata[]) => Promise<string>
  deletePresentation: (id: string) => Promise<void>
  setActivePresentation: (id: string | null) => void

  // Section manipulation
  mergeSections: (sectionIds: string[]) => void
  splitToNewSection: (sectionId: string, sessionId: string) => void
  removeSession: (sectionId: string, sessionId: string) => void

  // Add more sessions to active presentation
  addSessions: (sessions: SessionMetadata[]) => Promise<void>

  // Naming
  renamePresentation: (id: string, name: string) => void
  renameSection: (sectionId: string, name: string) => void
  renameSessionRef: (sectionId: string, sessionId: string, name: string) => void

  // Settings
  updateSettings: (patch: Partial<PresentationSettings>) => void
  updateToolCategoryVisibility: (categoryName: string, visible: boolean) => void
  updateToolOverride: (categoryName: string, toolName: string, visible: boolean) => void
  toggleToolCategoryExpanded: (categoryName: string) => void

  // Import/Export
  importFromPromptPlay: (presentation: Presentation, sessions: StoredSession[], filePath: string) => Promise<void>
  setSourceFilePath: (presentationId: string, filePath: string) => void
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const usePresentationStore = create<PresentationState>((set, get) => {
  // Private helper: persist a presentation via IPC and update local state immutably
  const persistPresentation = async (presentation: Presentation): Promise<void> => {
    await window.electronAPI.savePresentation(presentation)
    set((state) => ({
      presentations: state.presentations.map((p) =>
        p.id === presentation.id ? presentation : p
      )
    }))
  }

  return {
    // Initial state
    presentations: [],
    activePresentationId: null,
    isLoading: false,

    // Computed
    getActivePresentation: (): Presentation | null => {
      const { presentations, activePresentationId } = get()
      return presentations.find((p) => p.id === activePresentationId) ?? null
    },

    // -----------------------------------------------------------------------
    // CRUD
    // -----------------------------------------------------------------------

    loadPresentations: async (): Promise<void> => {
      set({ isLoading: true })
      try {
        const raw = await window.electronAPI.getPresentations()
        // Backfill settings for pre-Phase 7 presentations that lack them
        const presentations = raw.map(backfillSettings)
        set({ presentations, isLoading: false })
      } catch {
        set({ isLoading: false })
      }
    },

    createPresentation: async (sessions: SessionMetadata[]): Promise<string> => {
      const newPresentation = createPresentationFromSessions(sessions)

      // Parse each session's JSONL file and save as StoredSession for export
      for (const session of sessions) {
        try {
          const stitched: StitchedSession = await window.electronAPI.parseSession(session.filePath)
          const storedSession: StoredSession = {
            sessionId: session.sessionId,
            projectFolder: session.projectFolder,
            originalFilePath: session.filePath,
            messages: stitched.messages,
            metadata: session,
            addedAt: Date.now()
          }
          await window.electronAPI.saveStoredSession(storedSession)
        } catch (err) {
          console.warn(
            `Failed to parse session ${session.sessionId} (${session.filePath}):`,
            err
          )
        }
      }

      await window.electronAPI.savePresentation(newPresentation)
      set((state) => ({
        presentations: [...state.presentations, newPresentation],
        activePresentationId: newPresentation.id
      }))
      return newPresentation.id
    },

    deletePresentation: async (id: string): Promise<void> => {
      await window.electronAPI.deletePresentation(id)
      set((state) => ({
        presentations: state.presentations.filter((p) => p.id !== id),
        activePresentationId: state.activePresentationId === id ? null : state.activePresentationId
      }))
    },

    setActivePresentation: (id: string | null): void => {
      set({ activePresentationId: id })
    },

    // -----------------------------------------------------------------------
    // Section Manipulation
    // -----------------------------------------------------------------------

    mergeSections: (sectionIds: string[]): void => {
      if (sectionIds.length < 2) return

      const active = get().getActivePresentation()
      if (!active) return

      const sectionIdSet = new Set(sectionIds)

      // Collect all sessionRefs from sections to merge
      const mergedRefs: SessionRef[] = []
      let firstIndex = -1
      let firstName = ''

      for (let i = 0; i < active.sections.length; i++) {
        const section = active.sections[i]
        if (sectionIdSet.has(section.id)) {
          mergedRefs.push(...section.sessionRefs)
          if (firstIndex === -1) {
            firstIndex = i
            firstName = section.name
          }
        }
      }

      if (firstIndex === -1) return

      // Sort merged refs chronologically
      const sortedRefs = sortSessionRefsChronologically(mergedRefs)

      // Build merged section using first section's ID and name
      const mergedSection: PresentationSection = {
        id: active.sections[firstIndex].id,
        name: firstName,
        sessionRefs: sortedRefs
      }

      // Build new sections array: merged at first index, others filtered out
      const newSections: PresentationSection[] = []
      let mergedInserted = false

      for (const section of active.sections) {
        if (sectionIdSet.has(section.id)) {
          if (!mergedInserted) {
            newSections.push(mergedSection)
            mergedInserted = true
          }
          // Skip other merged sections
        } else {
          newSections.push(section)
        }
      }

      const updated: Presentation = {
        ...active,
        sections: newSections,
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    splitToNewSection: (sectionId: string, sessionId: string): void => {
      const active = get().getActivePresentation()
      if (!active) return

      // Find the source section
      const sourceIndex = active.sections.findIndex((s) => s.id === sectionId)
      if (sourceIndex === -1) return

      const sourceSection = active.sections[sourceIndex]
      const sessionRef = sourceSection.sessionRefs.find((r) => r.sessionId === sessionId)
      if (!sessionRef) return

      // Remove session from source section
      const updatedSource: PresentationSection = {
        ...sourceSection,
        sessionRefs: sourceSection.sessionRefs.filter((r) => r.sessionId !== sessionId)
      }

      // Create new section named after the session
      const newSection: PresentationSection = {
        id: crypto.randomUUID(),
        name: sessionRef.displayName,
        sessionRefs: [sessionRef]
      }

      // Build new sections array: insert new section immediately after source
      const newSections: PresentationSection[] = []
      for (let i = 0; i < active.sections.length; i++) {
        if (i === sourceIndex) {
          // Only keep source section if it still has sessions
          if (updatedSource.sessionRefs.length > 0) {
            newSections.push(updatedSource)
          }
          // Insert new section right after source position
          newSections.push(newSection)
        } else {
          newSections.push(active.sections[i])
        }
      }

      const updated: Presentation = {
        ...active,
        sections: newSections,
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    removeSession: (sectionId: string, sessionId: string): void => {
      const active = get().getActivePresentation()
      if (!active) return

      const newSections = active.sections
        .map((section) => {
          if (section.id !== sectionId) return section
          return {
            ...section,
            sessionRefs: section.sessionRefs.filter((ref) => ref.sessionId !== sessionId)
          }
        })
        // Remove sections that became empty
        .filter((section) => section.sessionRefs.length > 0)

      const updated: Presentation = {
        ...active,
        sections: newSections,
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    // -----------------------------------------------------------------------
    // Add Sessions
    // -----------------------------------------------------------------------

    addSessions: async (sessions: SessionMetadata[]): Promise<void> => {
      const active = get().getActivePresentation()
      if (!active) return

      // Parse each session's JSONL file and save as StoredSession for export
      for (const session of sessions) {
        try {
          const stitched: StitchedSession = await window.electronAPI.parseSession(session.filePath)
          const storedSession: StoredSession = {
            sessionId: session.sessionId,
            projectFolder: session.projectFolder,
            originalFilePath: session.filePath,
            messages: stitched.messages,
            metadata: session,
            addedAt: Date.now()
          }
          await window.electronAPI.saveStoredSession(storedSession)
        } catch (err) {
          console.warn(
            `Failed to parse session ${session.sessionId} (${session.filePath}):`,
            err
          )
        }
      }

      // Create new sections (one per session, matching creation flow)
      const newSections: PresentationSection[] = sessions.map((session) => {
        const displayName = generateSessionDisplayName(session)
        return {
          id: crypto.randomUUID(),
          name: displayName,
          sessionRefs: [
            {
              sessionId: session.sessionId,
              displayName,
              sortKey: session.firstTimestamp ?? ''
            }
          ]
        }
      })

      // Combine existing + new sections, then sort chronologically by earliest session sortKey
      const allSections = [...active.sections, ...newSections].sort((a, b) => {
        const keyA = a.sessionRefs[0]?.sortKey ?? ''
        const keyB = b.sessionRefs[0]?.sortKey ?? ''
        if (!keyA && !keyB) return 0
        if (!keyA) return 1
        if (!keyB) return -1
        return keyA.localeCompare(keyB)
      })

      const updated: Presentation = {
        ...active,
        sections: allSections,
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    // -----------------------------------------------------------------------
    // Naming
    // -----------------------------------------------------------------------

    renamePresentation: (id: string, name: string): void => {
      const presentation = get().presentations.find((p) => p.id === id)
      if (!presentation) return

      const updated: Presentation = {
        ...presentation,
        name,
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    renameSection: (sectionId: string, name: string): void => {
      const active = get().getActivePresentation()
      if (!active) return

      const updated: Presentation = {
        ...active,
        sections: active.sections.map((section) =>
          section.id === sectionId ? { ...section, name } : section
        ),
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    renameSessionRef: (sectionId: string, sessionId: string, name: string): void => {
      const active = get().getActivePresentation()
      if (!active) return

      const updated: Presentation = {
        ...active,
        sections: active.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                sessionRefs: section.sessionRefs.map((ref) =>
                  ref.sessionId === sessionId ? { ...ref, displayName: name } : ref
                )
              }
            : section
        ),
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    // -----------------------------------------------------------------------
    // Settings
    // -----------------------------------------------------------------------

    updateSettings: (patch: Partial<PresentationSettings>): void => {
      const active = get().getActivePresentation()
      if (!active) return

      const updated: Presentation = {
        ...active,
        settings: { ...active.settings, ...patch },
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    updateToolCategoryVisibility: (categoryName: string, visible: boolean): void => {
      const active = get().getActivePresentation()
      if (!active) return

      const updated: Presentation = {
        ...active,
        settings: {
          ...active.settings,
          toolVisibility: active.settings.toolVisibility.map((cat) =>
            cat.categoryName === categoryName
              ? { ...cat, visible, toolOverrides: {} } // Reset per-tool overrides when category changes
              : cat
          )
        },
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    updateToolOverride: (categoryName: string, toolName: string, visible: boolean): void => {
      const active = get().getActivePresentation()
      if (!active) return

      const updated: Presentation = {
        ...active,
        settings: {
          ...active.settings,
          toolVisibility: active.settings.toolVisibility.map((cat) =>
            cat.categoryName === categoryName
              ? { ...cat, toolOverrides: { ...cat.toolOverrides, [toolName]: visible } }
              : cat
          )
        },
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    toggleToolCategoryExpanded: (categoryName: string): void => {
      const active = get().getActivePresentation()
      if (!active) return

      const updated: Presentation = {
        ...active,
        settings: {
          ...active.settings,
          toolVisibility: active.settings.toolVisibility.map((cat) =>
            cat.categoryName === categoryName
              ? { ...cat, expanded: !cat.expanded }
              : cat
          )
        },
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    },

    // -----------------------------------------------------------------------
    // Import/Export
    // -----------------------------------------------------------------------

    importFromPromptPlay: async (
      presentation: Presentation,
      sessions: StoredSession[],
      filePath: string
    ): Promise<void> => {
      // 1. Save each session to app-local storage
      for (const session of sessions) {
        await window.electronAPI.saveStoredSession(session)
      }

      // 2. Set sourceFilePath on the presentation
      presentation.sourceFilePath = filePath

      // 3. Save the presentation via IPC
      await window.electronAPI.savePresentation(presentation)

      // 4. Update local state: add or replace presentation
      set((state) => {
        const existing = state.presentations.findIndex((p) => p.id === presentation.id)
        let updated: Presentation[]
        if (existing >= 0) {
          updated = state.presentations.map((p) =>
            p.id === presentation.id ? presentation : p
          )
        } else {
          updated = [...state.presentations, presentation]
        }
        return {
          presentations: updated,
          activePresentationId: presentation.id
        }
      })
    },

    setSourceFilePath: (presentationId: string, filePath: string): void => {
      const presentation = get().presentations.find((p) => p.id === presentationId)
      if (!presentation) return

      const updated: Presentation = {
        ...presentation,
        sourceFilePath: filePath,
        updatedAt: Date.now()
      }

      persistPresentation(updated)
    }
  }
})
