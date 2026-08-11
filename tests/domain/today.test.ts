import { describe, expect, it } from 'vitest'
import { filterTodayTasks, localDateKey, nextWorkday, todayProgress, todaySections } from '~/domain/services/today'
import { makeTask } from '../fixtures'

describe('today planning', () => {
  it('uses the local calendar date instead of UTC', () => {
    expect(localDateKey(new Date(2026, 7, 11, 0, 10))).toBe('2026-08-11')
    expect(localDateKey(new Date('2026-08-10T22:30:00.000Z'))).toBe('2026-08-11')
  })

  it('groups overdue, top, active, planned and done tasks without duplicates', () => {
    const tasks = [
      makeTask({ id: 'overdue', dueDate: '2026-08-10' }),
      makeTask({ id: 'top', plannedDate: '2026-08-11', dayRank: 1 }),
      makeTask({ id: 'active', plannedDate: '2026-08-11', status: 'in_progress' }),
      makeTask({ id: 'planned', plannedDate: '2026-08-11' }),
      makeTask({ id: 'done', plannedDate: '2026-08-11', status: 'done' })
    ]
    const sections = todaySections(tasks, '2026-08-11')
    expect(
      Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.map((task) => task.id)]))
    ).toEqual({
      overdue: ['overdue'],
      top: ['top'],
      inProgress: ['active'],
      planned: ['planned'],
      done: ['done']
    })
  })

  it('filters the day and calculates progress', () => {
    const tasks = [
      makeTask({ id: 'one', title: 'Client brief', plannedDate: '2026-08-11', dayRank: 1 }),
      makeTask({ id: 'two', title: 'Internal', plannedDate: '2026-08-11', status: 'done' })
    ]
    expect(
      filterTodayTasks(tasks, {
        search: 'client',
        projectId: null,
        priority: null,
        status: null,
        assigneeId: null,
        topOnly: true
      }).map((task) => task.id)
    ).toEqual(['one'])
    expect(todayProgress(tasks, '2026-08-11')).toEqual({ total: 2, done: 1, percent: 50 })
  })

  it('skips weekends for the next workday', () => {
    expect(nextWorkday(new Date(2026, 7, 14))).toBe('2026-08-17')
  })
})
