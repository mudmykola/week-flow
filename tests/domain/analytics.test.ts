// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  analyticsWeeks,
  buildAnalyticsTrend,
  completionRate,
  countByStatus,
  filterAnalyticsTasks
} from '~/domain/services/analytics'
import { makeTask } from '../fixtures'

const tasks = [
  makeTask({ id: '1', week: '2026-W30', projectId: 'p1', assigneeId: 'u1', priority: 'high', status: 'done' }),
  makeTask({ id: '2', week: '2026-W31', projectId: 'p1', assigneeId: 'u2', priority: 'urgent', dueDate: '2026-07-20' }),
  makeTask({ id: '3', week: '2026-W31', projectId: 'p2', assigneeId: 'u1', priority: 'low', status: 'in_progress' }),
  makeTask({ id: '4', week: '2026-W31', projectId: 'p1', assigneeId: 'u1', priority: 'high', archivedAt: 1 })
]

describe('analytics domain service', () => {
  it('combines project, assignee and priority filters while excluding archived tasks', () => {
    expect(
      filterAnalyticsTasks(tasks, { projectId: 'p1', assigneeId: 'u1', priority: 'high' }).map((task) => task.id)
    ).toEqual(['1'])
  })

  it('builds a stable eight-week window and all-time weeks', () => {
    expect(analyticsWeeks(tasks, '2026-W31', '8w')).toHaveLength(8)
    expect(analyticsWeeks(tasks, '2026-W31', '8w').at(-1)).toBe('2026-W31')
    expect(analyticsWeeks(tasks, '2026-W31', 'all')).toEqual(['2026-W30', '2026-W31'])
  })

  it('calculates weekly throughput, overdue work and completion', () => {
    expect(
      buildAnalyticsTrend(
        tasks.filter((task) => !task.archivedAt),
        ['2026-W30', '2026-W31'],
        '2026-08-02'
      )
    ).toEqual([
      { week: '2026-W30', label: 'W30', created: 1, done: 1, overdue: 0, completion: 100 },
      { week: '2026-W31', label: 'W31', created: 2, done: 0, overdue: 1, completion: 0 }
    ])
  })

  it('summarizes statuses and completion rate', () => {
    const active = tasks.filter((task) => !task.archivedAt)
    expect(countByStatus(active)).toEqual({ todo: 1, in_progress: 1, done: 1 })
    expect(completionRate(active)).toBe(33)
    expect(completionRate([])).toBe(0)
  })
})
