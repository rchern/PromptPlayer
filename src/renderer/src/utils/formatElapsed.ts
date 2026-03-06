/**
 * Format a duration in milliseconds to a smart relative string.
 * Adapts to magnitude: <1s, 12s, 2m 30s, 1h 5m.
 * Drops smaller unit when larger is big enough (no "1h 0m 12s").
 */
export function formatElapsed(ms: number): string {
  if (ms < 0) return '<1s' // Guard: negative durations treated as <1s
  if (ms < 1000) return '<1s'
  if (ms < 60_000) {
    return `${Math.floor(ms / 1000)}s`
  }
  if (ms < 3_600_000) {
    const mins = Math.floor(ms / 60_000)
    const secs = Math.floor((ms % 60_000) / 1000)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  const hours = Math.floor(ms / 3_600_000)
  const mins = Math.floor((ms % 3_600_000) / 60_000)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Compute elapsed milliseconds between two ISO timestamp strings.
 * Returns null if either timestamp is missing, empty, or unparseable.
 */
export function computeElapsedMs(
  prevTimestamp: string | null | undefined,
  currTimestamp: string | null | undefined
): number | null {
  if (!prevTimestamp || !currTimestamp) return null
  const prev = new Date(prevTimestamp).getTime()
  const curr = new Date(currTimestamp).getTime()
  if (Number.isNaN(prev) || Number.isNaN(curr)) return null
  return curr - prev
}
