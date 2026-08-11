import { describe, expect, it } from 'vitest'
import type { Task } from '../../app/domain/entities/task'
import {
  buildSmartSchedule,
  calendarMinutes,
  calendarTaskSummary,
  conflictingTaskIds,
  filterCalendarTasks,
  taskCalendarDate
} from '../../app/domain/services/calendar'

const task = (patch: Partial<Task>) =>
  ({
    id: crypto.randomUUID(),
    dueDate: '2026-08-10',
    archivedAt: null,
    projectId: 'project-a',
    priority: 'medium',
    status: 'todo',
    assigneeId: null,
    plannedDate: null,
    plannedTime: null,
    estimateMinutes: null,
    blockedByTaskId: null,
    ...patch
  }) as Task

describe('calendar services', () => {
  it('filters visible deadlines by project, priority and status', () => {
    const tasks = [task({}), task({ projectId: 'project-b' }), task({ priority: 'urgent' }), task({ archivedAt: 1 })]
    expect(filterCalendarTasks(tasks, { projectId: 'project-a', priority: 'medium', status: 'todo' })).toHaveLength(1)
  })

  it('summarizes the visible month and overdue open work', () => {
    const tasks = [
      task({ dueDate: '2026-08-01' }),
      task({ dueDate: '2026-08-02', status: 'done' }),
      task({ dueDate: '2026-07-01' })
    ]
    expect(calendarTaskSummary(tasks, '2026-08', '2026-08-05')).toEqual({ total: 2, open: 1, done: 1, overdue: 2 })
  })

  it('uses the planned day before the deadline and filters by assignee', () => {
    const planned = task({ plannedDate: '2026-08-12', dueDate: '2026-08-15', assigneeId: 'user-a' })
    expect(taskCalendarDate(planned)).toBe('2026-08-12')
    expect(
      filterCalendarTasks([planned, task({ assigneeId: 'user-b' })], {
        projectId: null,
        priority: null,
        status: null,
        assigneeId: 'user-a'
      })
    ).toEqual([planned])
  })

  it('calculates workload and detects overlaps only for the same assignee', () => {
    const first = task({ id: 'first', plannedTime: '09:00', estimateMinutes: 60, assigneeId: 'user-a' })
    const second = task({ id: 'second', plannedTime: '09:30', estimateMinutes: 30, assigneeId: 'user-a' })
    const other = task({ id: 'other', plannedTime: '09:30', estimateMinutes: 30, assigneeId: 'user-b' })
    expect(calendarMinutes([first, second, task({ status: 'done' })])).toBe(90)
    expect([...conflictingTaskIds([first, second, other])].sort()).toEqual(['first', 'second'])
  })

  it('builds a priority-aware plan within daily capacity and skips blocked work', () => {
    const tasks = [
      task({ id: 'medium', dueDate: '2026-08-14', estimateMinutes: 60 }),
      task({ id: 'urgent', dueDate: null, priority: 'urgent', estimateMinutes: 90 }),
      task({ id: 'blocked', priority: 'urgent', blockedByTaskId: 'urgent' })
    ]
    expect(buildSmartSchedule(tasks, ['2026-08-12'], 150)).toEqual([
      { taskId: 'urgent', plannedDate: '2026-08-12', plannedTime: '09:00', estimateMinutes: 90 },
      { taskId: 'medium', plannedDate: '2026-08-12', plannedTime: '10:30', estimateMinutes: 60 }
    ])
  })
})
