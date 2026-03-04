import { describe, it, expect } from 'vitest'
import { formatElapsed, computeElapsedMs } from './formatElapsed'

describe('formatElapsed', () => {
  it('returns "<1s" for 0ms', () => {
    expect(formatElapsed(0)).toBe('<1s')
  })

  it('returns "<1s" for sub-second values', () => {
    expect(formatElapsed(500)).toBe('<1s')
  })

  it('returns "<1s" for negative values (guard)', () => {
    expect(formatElapsed(-100)).toBe('<1s')
  })

  it('returns "1s" for exactly 1000ms', () => {
    expect(formatElapsed(1000)).toBe('1s')
  })

  it('returns "12s" for 12000ms', () => {
    expect(formatElapsed(12000)).toBe('12s')
  })

  it('returns "59s" for 59999ms', () => {
    expect(formatElapsed(59999)).toBe('59s')
  })

  it('returns "1m" for exactly 60000ms', () => {
    expect(formatElapsed(60000)).toBe('1m')
  })

  it('returns "2m 30s" for 150000ms', () => {
    expect(formatElapsed(150000)).toBe('2m 30s')
  })

  it('returns "1h" for exactly 3600000ms', () => {
    expect(formatElapsed(3600000)).toBe('1h')
  })

  it('returns "1h 5m" for 3900000ms', () => {
    expect(formatElapsed(3900000)).toBe('1h 5m')
  })
})

describe('computeElapsedMs', () => {
  it('returns null when prevTimestamp is null', () => {
    expect(computeElapsedMs(null, '2024-01-01T00:00:00Z')).toBeNull()
  })

  it('returns null when currTimestamp is null', () => {
    expect(computeElapsedMs('2024-01-01T00:00:00Z', null)).toBeNull()
  })

  it('returns null when prevTimestamp is empty string', () => {
    expect(computeElapsedMs('', '2024-01-01T00:00:00Z')).toBeNull()
  })

  it('returns null when prevTimestamp is invalid', () => {
    expect(computeElapsedMs('invalid', '2024-01-01T00:00:00Z')).toBeNull()
  })

  it('computes positive elapsed for forward time', () => {
    expect(
      computeElapsedMs('2024-01-01T00:00:00Z', '2024-01-01T00:01:00Z')
    ).toBe(60000)
  })

  it('computes negative elapsed for backward time (caller handles)', () => {
    expect(
      computeElapsedMs('2024-01-01T00:01:00Z', '2024-01-01T00:00:00Z')
    ).toBe(-60000)
  })
})
