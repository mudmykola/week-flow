import { describe, expect, it } from 'vitest'
import type { Task } from '../../app/domain/entities/task'
import { calendarTaskSummary, filterCalendarTasks } from '../../app/domain/services/calendar'

const task = (patch: Partial<Task>) =>
  ({
    id: crypto.randomUUID(),
    dueDate: '2026-08-10',
    archivedAt: null,
    projectId: 'project-a',
    priority: 'medium',
    status: 'todo',
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
})
