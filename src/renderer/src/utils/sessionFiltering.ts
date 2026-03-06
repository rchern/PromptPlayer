// Pure client-side filtering functions for session metadata.
// Used by the Builder session list to filter by keyword and date range.

import type { SessionMetadata } from '../types/pipeline'

export type DatePreset = 'all' | 'today' | 'last-7-days' | 'last-30-days' | 'older' | 'custom'

export interface DateFilter {
  preset: DatePreset
  customStart?: string // ISO date string (YYYY-MM-DD)
  customEnd?: string // ISO date string (YYYY-MM-DD)
}

/**
 * Filter sessions by search query and date preset.
 * Both filters are AND-ed: a session must match both to be included.
 */
export function filterSessions(
  sessions: SessionMetadata[],
  searchQuery: string,
  dateFilter: DateFilter
): SessionMetadata[] {
  return sessions.filter((session) => {
    if (searchQuery && !matchesSearch(session, searchQuery)) return false
    if (dateFilter.preset !== 'all' && !matchesDateFilter(session, dateFilter)) return false
    return true
  })
}

function matchesSearch(session: SessionMetadata, query: string): boolean {
  const q = query.toLowerCase()
  return (
    (session.firstUserMessage?.toLowerCase().includes(q) ?? false) ||
    session.projectFolder.toLowerCase().includes(q) ||
    session.sessionId.toLowerCase().includes(q)
  )
}

function matchesDateFilter(session: SessionMetadata, filter: DateFilter): boolean {
  if (filter.preset === 'all') return true
  if (!session.firstTimestamp) return filter.preset === 'older'

  const sessionDate = new Date(session.firstTimestamp)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (filter.preset) {
    case 'today':
      return sessionDate >= startOfToday
    case 'last-7-days': {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return sessionDate >= sevenDaysAgo
    }
    case 'last-30-days': {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return sessionDate >= thirtyDaysAgo
    }
    case 'older': {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return sessionDate < thirtyDaysAgo
    }
    case 'custom': {
      if (filter.customStart && sessionDate < new Date(filter.customStart)) return false
      if (filter.customEnd) {
        const endDate = new Date(filter.customEnd)
        endDate.setDate(endDate.getDate() + 1)
        if (sessionDate >= endDate) return false
      }
      return true
    }
    default:
      return true
  }
}
