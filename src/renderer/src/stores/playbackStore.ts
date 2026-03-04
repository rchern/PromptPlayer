import { create } from 'zustand'
import type { NavigationStep, StoredSession } from '../types/pipeline'
import type { Presentation, PresentationSection } from '../types/presentation'
import type { PlaybackStep, SectionProgressInfo } from '../types/playback'
import { filterWithToolSettings, buildNavigationSteps } from '../utils/messageFiltering'
import { computeElapsedMs } from '../utils/formatElapsed'

// ---------------------------------------------------------------------------
// Pure Functions (exported for independent testing)
// ---------------------------------------------------------------------------

/** Earliest timestamp for a step (prefers user message as it comes first chronologically). */
function getStepFirstTimestamp(step: NavigationStep): string | null {
  return step.userMessage?.timestamp ?? step.assistantMessage?.timestamp ?? null
}

/** Latest timestamp for a step (prefers assistant message as it comes last chronologically). */
function getStepLastTimestamp(step: NavigationStep): string | null {
  // For combined steps, use the last combined message's timestamp
  if (step.combinedAssistantMessages && step.combinedAssistantMessages.length > 0) {
    return step.combinedAssistantMessages[step.combinedAssistantMessages.length - 1].timestamp
  }
  return step.assistantMessage?.timestamp ?? step.userMessage?.timestamp ?? null
}

/**
 * Combine consecutive solo assistant steps (userMessage === null) into single navigable steps.
 *
 * This reduces click-through fatigue in autonomous sequences (e.g., /gsd:execute-phase)
 * where Claude produces many consecutive assistant-only messages.
 *
 * A single solo assistant step is NOT combined (no combinedAssistantMessages).
 * Two or more consecutive solo assistant steps produce one combined step with
 * combinedAssistantMessages containing all messages for filmstrip rendering.
 */
function combineConsecutiveSoloSteps(navSteps: NavigationStep[]): NavigationStep[] {
  const result: NavigationStep[] = []
  let i = 0
  while (i < navSteps.length) {
    const step = navSteps[i]
    // If this is a solo assistant step (no user message), look for consecutive ones
    if (step.userMessage === null && step.assistantMessage) {
      const combinedMessages: import('../types/pipeline').ParsedMessage[] = [step.assistantMessage]
      const combinedFollowUps: import('../types/pipeline').ParsedMessage[] = [
        ...step.followUpMessages
      ]
      let j = i + 1
      while (
        j < navSteps.length &&
        navSteps[j].userMessage === null &&
        navSteps[j].assistantMessage
      ) {
        combinedMessages.push(navSteps[j].assistantMessage!)
        combinedFollowUps.push(...navSteps[j].followUpMessages)
        j++
      }
      if (combinedMessages.length > 1) {
        // Combined step: primary assistant is first, all messages stored for rendering
        result.push({
          index: result.length,
          userMessage: null,
          assistantMessage: combinedMessages[0],
          followUpMessages: combinedFollowUps,
          combinedAssistantMessages: combinedMessages
        })
      } else {
        // Single solo step (no combining needed)
        result.push({ ...step, index: result.length })
      }
      i = j
    } else {
      result.push({ ...step, index: result.length })
      i++
    }
  }
  return result
}

/**
 * Build a unified flat array of playback steps from a Presentation and its sessions.
 *
 * The array starts with an overview step (index 0), followed by alternating
 * separator cards and navigation steps in section/session order.
 *
 * Uses filterWithToolSettings to respect the Builder's per-tool visibility config,
 * then buildNavigationSteps to produce NavigationStep[] per session.
 *
 * Enriches steps with elapsed-time data:
 * - NavigationPlaybackStep.elapsedMs: Claude's response time within the step (user -> assistant)
 * - SessionSeparatorStep.durationMs: first user timestamp to last assistant timestamp span
 * - SectionSeparatorStep.durationMs: sum of session durations in the section
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
    const sessionData: {
      ref: (typeof section.sessionRefs)[0]
      navSteps: NavigationStep[]
      session: StoredSession
    }[] = []

    for (const ref of section.sessionRefs) {
      const session = sessionsMap.get(ref.sessionId)
      if (!session) {
        console.warn(
          `Playback: session "${ref.sessionId}" (${ref.displayName}) not found in sessions map — skipping`
        )
        continue
      }
      const filtered = filterWithToolSettings(session.messages, toolVisibility)
      const rawNavSteps = buildNavigationSteps(filtered)
      const navSteps = combineConsecutiveSoloSteps(rawNavSteps)
      sectionTotalSteps += navSteps.length
      sessionData.push({ ref, navSteps, session })
    }

    // Track section duration as sum of session durations
    let sectionDurationMs: number | null = null

    // Placeholder index for the section separator card (we'll fill durationMs after processing sessions)
    const sectionSeparatorIndex = steps.length
    steps.push({
      type: 'section-separator',
      sectionId: section.id,
      sectionName: section.name,
      sessionCount: section.sessionRefs.length,
      totalSteps: sectionTotalSteps,
      durationMs: null // Will be updated after sessions
    })

    // Sessions within this section
    for (const { ref, navSteps, session } of sessionData) {
      // Compute session duration from first/last nav step timestamps
      let sessionDurationMs: number | null = null
      if (navSteps.length > 0) {
        const firstTimestamp = getStepFirstTimestamp(navSteps[0])
        const lastTimestamp = getStepLastTimestamp(navSteps[navSteps.length - 1])
        if (navSteps.length > 1) {
          sessionDurationMs = computeElapsedMs(firstTimestamp, lastTimestamp)
        }
      }

      // Accumulate section duration
      if (sessionDurationMs !== null) {
        sectionDurationMs = (sectionDurationMs ?? 0) + sessionDurationMs
      }

      // Session separator card
      steps.push({
        type: 'session-separator',
        sessionId: ref.sessionId,
        sessionName: ref.displayName,
        sectionId: section.id,
        sectionName: section.name,
        stepCount: navSteps.length,
        messageCount: session.messages.length,
        durationMs: sessionDurationMs
      })

      // Navigation steps with elapsed computation
      // - Steps WITH a userMessage: within-step elapsed (user -> assistant)
      // - Solo assistant steps (userMessage === null): step-to-step elapsed from previous step's last timestamp
      let prevStepLastTimestamp: string | null = null
      for (const navStep of navSteps) {
        let elapsedMs: number | null = null
        if (navStep.userMessage) {
          // Within-step: user -> assistant
          elapsedMs = computeElapsedMs(
            navStep.userMessage.timestamp,
            navStep.assistantMessage?.timestamp ?? null
          )
        } else if (prevStepLastTimestamp && navStep.assistantMessage) {
          // Step-to-step: previous step's last timestamp -> this assistant
          elapsedMs = computeElapsedMs(prevStepLastTimestamp, navStep.assistantMessage.timestamp)
        }

        steps.push({
          type: 'navigation',
          step: navStep,
          sessionId: ref.sessionId,
          sectionId: section.id,
          elapsedMs
        })

        // Track last timestamp for next iteration
        const lastMsg = navStep.combinedAssistantMessages
          ? navStep.combinedAssistantMessages[navStep.combinedAssistantMessages.length - 1]
          : navStep.assistantMessage
        prevStepLastTimestamp =
          lastMsg?.timestamp ?? navStep.userMessage?.timestamp ?? prevStepLastTimestamp
      }
    }

    // Update section separator with computed duration
    const sectionStep = steps[sectionSeparatorIndex]
    if (sectionStep.type === 'section-separator') {
      sectionStep.durationMs = sectionDurationMs
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

  // Theme state
  themeOverride: 'light' | 'dark' | null // null = use file default

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
  toggleTheme: () => void
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
  themeOverride: null,
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
      themeOverride: null,
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

  toggleTheme: (): void => {
    const { presentation, themeOverride } = get()
    if (!presentation) return
    // Determine current effective theme
    const settingsTheme = presentation.settings.theme
    let current: 'light' | 'dark'
    if (themeOverride) {
      current = themeOverride
    } else if (settingsTheme === 'system') {
      current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    } else {
      current = settingsTheme
    }
    set({ themeOverride: current === 'dark' ? 'light' : 'dark' })
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
      themeOverride: null,
      sidebarOpen: false,
      expandedSections: new Set()
    })
  }
}))
