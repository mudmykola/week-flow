// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { backlogTasks, buildCapacityDays, buildCapacityPlan } from '../../app/domain/services/planning'
import { makeTask } from '../fixtures'

describe('planning workspaces', () => {
  it('keeps actionable unplanned tasks in priority and due-date order', () => {
    const result = backlogTasks([
      makeTask({ id: 'planned', plannedDate: '2026-09-07' }),
      makeTask({ id: 'low', priority: 'low' }),
      makeTask({ id: 'later', priority: 'high', dueDate: '2026-09-20' }),
      makeTask({ id: 'sooner', priority: 'high', dueDate: '2026-09-10' }),
      makeTask({ id: 'done', status: 'done' })
    ])

    expect(result.map((task) => task.id)).toEqual(['sooner', 'later', 'low'])
  })

  it('builds weekday capacity with actual time for completed work', () => {
    const days = buildCapacityDays(
      [
        makeTask({ plannedDate: '2026-08-31', estimateMinutes: 60 }),
        makeTask({ plannedDate: '2026-08-31', status: 'done', estimateMinutes: 30, actualMinutes: 45 }),
        makeTask({ plannedDate: '2026-09-01', estimateMinutes: null })
      ],
      '2026-W36',
      90
    )

    expect(days).toHaveLength(5)
    expect(days[0]).toMatchObject({ date: '2026-08-31', plannedMinutes: 105, overloaded: true })
    expect(days[1]).toMatchObject({ unknownEstimates: 1, utilization: 0 })
  })

  it('fills only future days with enough remaining capacity', () => {
    const tasks = backlogTasks([
      makeTask({ id: 'large', priority: 'urgent', estimateMinutes: 90 }),
      makeTask({ id: 'small', priority: 'high', estimateMinutes: 30 }),
      makeTask({ id: 'unknown', estimateMinutes: null })
    ])
    const days = buildCapacityDays([makeTask({ plannedDate: '2026-09-01', estimateMinutes: 60 })], '2026-W36', 90)

    expect(buildCapacityPlan(tasks, days, '2026-09-01')).toEqual([
      { taskId: 'large', plannedDate: '2026-09-02' },
      { taskId: 'small', plannedDate: '2026-09-01' }
    ])
  })
})
