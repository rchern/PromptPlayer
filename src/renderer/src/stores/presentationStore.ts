import { create } from 'zustand'
import type { SessionMetadata } from '../types/pipeline'
import type { Presentation, PresentationSection, SessionRef } from '../types/presentation'
import {
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
  removeSession: (sectionId: string, sessionId: string) => void

  // Add more sessions to active presentation
  addSessions: (sessions: SessionMetadata[]) => void

  // Naming
  renamePresentation: (id: string, name: string) => void
  renameSection: (sectionId: string, name: string) => void
  renameSessionRef: (sectionId: string, sessionId: string, name: string) => void
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
        const presentations = await window.electronAPI.getPresentations()
        set({ presentations, isLoading: false })
      } catch {
        set({ isLoading: false })
      }
    },

    createPresentation: async (sessions: SessionMetadata[]): Promise<string> => {
      const newPresentation = createPresentationFromSessions(sessions)
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

    addSessions: (sessions: SessionMetadata[]): void => {
      const active = get().getActivePresentation()
      if (!active) return

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
    }
  }
})
