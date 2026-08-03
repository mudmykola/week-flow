import { describe, expect, it } from 'vitest'
import { focusRemaining, focusStats, type FocusSession } from '~/domain/services/focus'

const session = (overrides: Partial<FocusSession>): FocusSession => ({
  id: crypto.randomUUID(),
  taskId: null,
  kind: 'focus',
  status: 'completed',
  plannedSeconds: 1500,
  elapsedSeconds: 1500,
  note: null,
  result: null,
  startedAt: Date.now(),
  endedAt: Date.now(),
  ...overrides
})

describe('focus domain', () => {
  it('derives timer state from timestamps without background drift', () => {
    expect(focusRemaining(1_000, 100, 31_000, true)).toBe(70)
    expect(focusRemaining(1_000, 100, 999_000, true)).toBe(0)
    expect(focusRemaining(1_000, 100, 999_000, false)).toBe(100)
  })

  it('calculates daily minutes, completed sessions, streak and seven day series', () => {
    const now = new Date('2026-08-04T12:00:00Z').getTime()
    const summary = focusStats(
      [
        session({ startedAt: new Date('2026-08-04T08:00:00Z').getTime(), elapsedSeconds: 1500 }),
        session({ startedAt: new Date('2026-08-03T08:00:00Z').getTime(), elapsedSeconds: 900 }),
        session({ kind: 'short_break', startedAt: now, elapsedSeconds: 300 })
      ],
      now
    )
    expect(summary).toMatchObject({ minutesToday: 25, completedToday: 1, streak: 2 })
    expect(summary.week).toHaveLength(7)
  })
})
