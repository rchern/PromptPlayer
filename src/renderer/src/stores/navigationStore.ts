import { create } from 'zustand'
import type { ParsedMessage, NavigationStep } from '../types/pipeline'
import { filterVisibleMessages, buildNavigationSteps } from '../utils/messageFiltering'

interface NavigationState {
  steps: NavigationStep[]
  currentStepIndex: number
  expandedSteps: Record<number, { user: boolean; assistant: boolean }>

  initializeSteps: (messages: ParsedMessage[]) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  goToFirst: () => void
  goToLast: () => void
  toggleExpand: (stepIndex: number, role: 'user' | 'assistant') => void
  reset: () => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  // Initial state
  steps: [],
  currentStepIndex: 0,
  expandedSteps: {},

  // Actions

  initializeSteps: (messages: ParsedMessage[]): void => {
    const visible = filterVisibleMessages(messages, false)
    const steps = buildNavigationSteps(visible)
    set({ steps, currentStepIndex: 0, expandedSteps: {} })
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

  reset: (): void => {
    set({ steps: [], currentStepIndex: 0, expandedSteps: {} })
  }
}))
