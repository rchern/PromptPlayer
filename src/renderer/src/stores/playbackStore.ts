import { create } from 'zustand'
import type { NavigationStep, StoredSession } from '../types/pipeline'
import type { Presentation, PresentationSection } from '../types/presentation'
import type { PlaybackStep, SectionProgressInfo } from '../types/playback'
import { filterWithToolSettings, buildNavigationSteps } from '../utils/messageFiltering'

// ---------------------------------------------------------------------------
// Pure Functions (exported for independent testing)
// ---------------------------------------------------------------------------

/**
 * Build a unified flat array of playback steps from a Presentation and its sessions.
 *
 * The array starts with an overview step (index 0), followed by alternating
 * separator cards and navigation steps in section/session order.
 *
 * Uses filterWithToolSettings to respect the Builder's per-tool visibility config,
 * then buildNavigationSteps to produce NavigationStep[] per session.
 *
 * Missing sessions are skipped gracefully with a console warning.
 */
export function buildPlaybackSteps(
  presentation: Presentation,
  sessionsMap: Map<string, StoredSession>
): PlaybackStep[] {
  const toolVisibility = presentation.settings.toolVisibility
  const steps: PlaybackStep[] = [{ type: 'overview' }]

  for (const section of presentation.sections) {
    // Pre-compute navigation steps for each session to get section totals
    let sectionTotalSteps = 0
    const sessionData: { ref: (typeof section.sessionRefs)[0]; navSteps: NavigationStep[]; session: StoredSession }[] = []

    for (const ref of section.sessionRefs) {
      const session = sessionsMap.get(ref.sessionId)
      if (!session) {
        console.warn(
          `Playback: session "${ref.sessionId}" (${ref.displayName}) not found in sessions map — skipping`
        )
        continue
      }
      const filtered = filterWithToolSettings(session.messages, toolVisibility)
      const navSteps = buildNavigationSteps(filtered)
      sectionTotalSteps += navSteps.length
      sessionData.push({ ref, navSteps, session })
    }

    // Section separator card
    steps.push({
      type: 'section-separator',
      sectionId: section.id,
      sectionName: section.name,
      sessionCount: section.sessionRefs.length,
      totalSteps: sectionTotalSteps
    })

    // Sessions within this section
    for (const { ref, navSteps, session } of sessionData) {
      // Session separator card
      steps.push({
        type: 'session-separator',
        sessionId: ref.sessionId,
        sessionName: ref.displayName,
        sectionId: section.id,
        sectionName: section.name,
        stepCount: navSteps.length,
        messageCount: session.messages.length
      })

      // Wrapped navigation steps
      for (const navStep of navSteps) {
        steps.push({
          type: 'navigation',
          step: navStep,
          sessionId: ref.sessionId,
          sectionId: section.id
        })
      }
    }
  }

  return steps
}

/**
 * Compute section-aware progress from the step array and current index.
 *
 * Returns one SectionProgressInfo per section. Only navigation steps count
 * toward progress (separator cards are excluded from both numerator and
 * denominator, per Pitfall 2 from research).
 *
 * A navigation step is "completed" if its global index in the steps array
 * is <= currentStepIndex.
 */
export function computeSectionProgress(
  steps: PlaybackStep[],
  currentStepIndex: number,
  sections: PresentationSection[]
): SectionProgressInfo[] {
  return sections.map((section) => {
    let total = 0
    let completed = 0

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (step.type === 'navigation' && step.sectionId === section.id) {
        total++
        if (i <= currentStepIndex) {
          completed++
        }
      }
    }

    return {
      sectionId: section.id,
      sectionName: section.name,
      completed,
      total
    }
  })
}

// ---------------------------------------------------------------------------
// Playback Store (Zustand)
// ---------------------------------------------------------------------------

interface PlaybackState {
  // Core state
  presentation: Presentation | null
  sessions: Map<string, StoredSession>
  steps: PlaybackStep[]
  currentStepIndex: number
  expandedSteps: Record<number, { user: boolean; assistant: boolean }>

  // Sidebar state
  sidebarOpen: boolean
  expandedSections: Set<string> // Section IDs expanded in sidebar tree

  // Actions
  loadPresentation: (presentation: Presentation, sessions: StoredSession[]) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  goToFirst: () => void
  goToLast: () => void
  jumpToSection: (sectionId: string) => void
  jumpToSession: (sessionId: string) => void
  toggleExpand: (stepIndex: number, role: 'user' | 'assistant') => void
  toggleSidebar: () => void
  toggleSidebarSection: (sectionId: string) => void
  reset: () => void
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  // Initial state
  presentation: null,
  sessions: new Map(),
  steps: [],
  currentStepIndex: 0,
  expandedSteps: {},
  sidebarOpen: false,
  expandedSections: new Set(),

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  loadPresentation: (presentation: Presentation, sessionsList: StoredSession[]): void => {
    const sessionsMap = new Map(sessionsList.map((s) => [s.sessionId, s]))
    const steps = buildPlaybackSteps(presentation, sessionsMap)
    // Auto-expand all sections in sidebar initially
    const expandedSections = new Set(presentation.sections.map((s) => s.id))
    set({
      presentation,
      sessions: sessionsMap,
      steps,
      currentStepIndex: 0,
      expandedSteps: {},
      sidebarOpen: false,
      expandedSections
    })
  },

  nextStep: (): void => {
    const { currentStepIndex, steps } = get()
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 })
    }
  },

  prevStep: (): void => {
    const { currentStepIndex } = get()
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 })
    }
  },

  goToStep: (index: number): void => {
    const { steps } = get()
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index })
    }
  },

  goToFirst: (): void => {
    set({ currentStepIndex: 0 })
  },

  goToLast: (): void => {
    const { steps } = get()
    if (steps.length > 0) {
      set({ currentStepIndex: steps.length - 1 })
    }
  },

  jumpToSection: (sectionId: string): void => {
    const { steps } = get()
    const idx = steps.findIndex(
      (s) => s.type === 'section-separator' && s.sectionId === sectionId
    )
    if (idx >= 0) {
      set({ currentStepIndex: idx })
    }
  },

  jumpToSession: (sessionId: string): void => {
    const { steps } = get()
    const idx = steps.findIndex(
      (s) => s.type === 'session-separator' && s.sessionId === sessionId
    )
    if (idx >= 0) {
      set({ currentStepIndex: idx })
    }
  },

  toggleExpand: (stepIndex: number, role: 'user' | 'assistant'): void => {
    const { expandedSteps } = get()
    const current = expandedSteps[stepIndex] ?? { user: false, assistant: false }
    set({
      expandedSteps: {
        ...expandedSteps,
        [stepIndex]: {
          ...current,
          [role]: !current[role]
        }
      }
    })
  },

  toggleSidebar: (): void => {
    set((s) => ({ sidebarOpen: !s.sidebarOpen }))
  },

  toggleSidebarSection: (sectionId: string): void => {
    const { expandedSections } = get()
    const next = new Set(expandedSections)
    if (next.has(sectionId)) {
      next.delete(sectionId)
    } else {
      next.add(sectionId)
    }
    set({ expandedSections: next })
  },

  reset: (): void => {
    set({
      presentation: null,
      sessions: new Map(),
      steps: [],
      currentStepIndex: 0,
      expandedSteps: {},
      sidebarOpen: false,
      expandedSections: new Set()
    })
  }
}))
