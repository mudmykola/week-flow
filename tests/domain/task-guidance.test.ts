import { describe, expect, it } from 'vitest'
import { taskHealth, taskNextAction, taskTimeProgress } from '../../app/domain/services/taskGuidance'
import { makeTask } from '../fixtures'

describe('task guidance service', () => {
  it('calculates task health from actionable data quality signals', () => {
    const result = taskHealth(
      makeTask({ note: null, assigneeId: null, dueDate: '2026-08-10', estimateMinutes: null }),
      [],
      '2026-08-12'
    )
    expect(result.issues).toEqual(
      expect.arrayContaining(['missingDescription', 'missingAssignee', 'missingEstimate', 'overdue'])
    )
    expect(result.score).toBeLessThan(100)
  })

  it('prioritizes review, waiting and the next unfinished subtask', () => {
    expect(taskNextAction(makeTask({ workState: 'review' })).kind).toBe('review')
    expect(taskNextAction(makeTask({ workState: 'waiting' })).kind).toBe('waiting')
    expect(
      taskNextAction(makeTask({ assigneeId: 'user-1', plannedDate: '2026-08-12' }), [
        {
          id: 'sub',
          taskId: 'task-1',
          title: 'Ship it',
          note: null,
          done: false,
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          assigneeId: null,
          sort: 0,
          createdAt: 1,
          doneAt: null
        }
      ]).kind
    ).toBe('subtask')
  })

  it('compares actual time with the estimate', () => {
    expect(taskTimeProgress(makeTask({ estimateMinutes: 30, actualMinutes: 45 }))).toMatchObject({
      actual: 45,
      estimate: 30,
      percent: 150,
      overrun: true
    })
  })

  it('covers healthy, oversized and frequently rescheduled task paths', () => {
    const healthy = makeTask({
      note: 'Clear scope',
      assigneeId: 'user-1',
      plannedDate: '2026-08-12',
      estimateMinutes: 30,
      readyCriteria: ['Ready'],
      doneCriteria: []
    })
    expect(taskHealth(healthy, [], '2026-08-12')).toEqual({ score: 100, issues: [] })
    const risky = taskHealth(
      makeTask({ ...healthy, blockedByTaskId: 'blocker', rescheduleCount: 3, estimateMinutes: 600 }),
      [],
      '2026-08-12'
    )
    expect(risky.issues).toEqual(expect.arrayContaining(['blocked', 'frequentlyRescheduled', 'tooLarge']))
  })

  it('returns planning, overdue, start, complete and done guidance', () => {
    const base = { note: 'Scope', assigneeId: 'user-1', estimateMinutes: 30 }
    expect(taskNextAction(makeTask(base), [], '2026-08-12').kind).toBe('plan')
    expect(
      taskNextAction(makeTask({ ...base, plannedDate: '2026-08-12', dueDate: '2026-08-11' }), [], '2026-08-12').kind
    ).toBe('overdue')
    expect(taskNextAction(makeTask({ ...base, plannedDate: '2026-08-12' })).kind).toBe('start')
    expect(taskNextAction(makeTask({ ...base, plannedDate: '2026-08-12', status: 'in_progress' })).kind).toBe(
      'complete'
    )
    expect(taskNextAction(makeTask({ ...base, status: 'done' })).kind).toBe('done')
    expect(taskTimeProgress(makeTask({ estimateMinutes: null, actualMinutes: null }), 25)).toEqual({
      actual: 25,
      estimate: 0,
      percent: 0,
      overrun: false
    })
  })
})
