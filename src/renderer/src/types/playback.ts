// Playback data layer types for multi-session presentation playback.
// These types define the unified step array that transforms a Presentation
// with multiple StoredSessions into a flat, navigable sequence of steps.

import type { NavigationStep } from './pipeline'

// ---------------------------------------------------------------------------
// PlaybackStep Discriminated Union
// ---------------------------------------------------------------------------

/** Title slide at index 0 — shown when a .promptplay file is first loaded. */
export interface OverviewStep {
  type: 'overview'
}

/** Chapter title card — introduces a section with aggregate stats. */
export interface SectionSeparatorStep {
  type: 'section-separator'
  sectionId: string
  sectionName: string
  sessionCount: number
  totalSteps: number // Navigation steps only (excludes separator cards)
}

/** Session transition card — introduces a session within a section. */
export interface SessionSeparatorStep {
  type: 'session-separator'
  sessionId: string
  sessionName: string
  sectionId: string
  sectionName: string
  stepCount: number // Navigation steps in this session
  messageCount: number // Raw message count from StoredSession
}

/** Wraps an existing NavigationStep with session/section context for cross-session navigation. */
export interface NavigationPlaybackStep {
  type: 'navigation'
  step: NavigationStep
  sessionId: string
  sectionId: string
}

/**
 * Discriminated union of all playback step types.
 * Discriminate on the `type` field to determine rendering behavior.
 */
export type PlaybackStep =
  | OverviewStep
  | SectionSeparatorStep
  | SessionSeparatorStep
  | NavigationPlaybackStep

// ---------------------------------------------------------------------------
// Section Progress
// ---------------------------------------------------------------------------

/**
 * Progress info for a single section — used by the segmented progress bar.
 * Separator cards do NOT count in completed or total (per Pitfall 2 from research).
 */
export interface SectionProgressInfo {
  sectionId: string
  sectionName: string
  completed: number // Navigation steps with global index <= currentStepIndex
  total: number // Total navigation steps in this section
}
