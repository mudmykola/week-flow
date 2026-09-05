// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { saveTaskDayPlanSchema, updateTaskDayPlanSchema } from '../../server/utils/taskDayPlanValidators'

describe('task day plan validators', () => {
  it('accepts a bounded daily plan and carry-over reason', () => {
    expect(
      saveTaskDayPlanSchema.parse({
        plannedDate: '2026-09-05',
        plannedTime: '09:30',
        plannedMinutes: 90,
        status: 'moved',
        carryoverReason: 'Continued tomorrow'
      })
    ).toMatchObject({ plannedMinutes: 90, status: 'moved' })
  })

  it('rejects invalid dates, times, durations and empty patches', () => {
    expect(saveTaskDayPlanSchema.safeParse({ plannedDate: '05.09.2026' }).success).toBe(false)
    expect(saveTaskDayPlanSchema.safeParse({ plannedDate: '2026-09-05', plannedTime: '25:00' }).success).toBe(false)
    expect(saveTaskDayPlanSchema.safeParse({ plannedDate: '2026-09-05', plannedMinutes: 0 }).success).toBe(false)
    expect(updateTaskDayPlanSchema.safeParse({}).success).toBe(false)
  })
})
