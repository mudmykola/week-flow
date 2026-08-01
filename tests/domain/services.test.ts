import { describe, expect, it, vi } from 'vitest'
import { buildGraph, projectNodeId, taskNodeId } from '~/domain/services/graph'
import { calculateProgress } from '~/domain/services/progress'
import { getNextStatus, getStatusLabel, TASK_STATUSES } from '~/domain/services/taskStatus'
import { getCurrentWeek, getNextWeek, getPrevWeek, getWeekLabel } from '~/domain/services/week'
import { makeProject, makeTask } from '../fixtures'

describe('domain services', () => {
  it('calculates rounded progress and handles an empty total', () => {
    expect(calculateProgress(0, 0)).toBe(0)
    expect(calculateProgress(2, 3)).toBe(67)
    expect(calculateProgress(3, 3)).toBe(100)
  })

  it('cycles every task status and provides Ukrainian labels', () => {
    expect(TASK_STATUSES).toEqual(['todo', 'in_progress', 'done'])
    expect(getNextStatus('todo')).toBe('in_progress')
    expect(getNextStatus('in_progress')).toBe('done')
    expect(getNextStatus('done')).toBe('todo')
    expect(getStatusLabel('in_progress')).toBe('В процесі')
  })

  it('navigates ISO week and year boundaries', () => {
    expect(getNextWeek('2025-W52')).toBe('2026-W01')
    expect(getPrevWeek('2026-W01')).toBe('2025-W52')
    expect(getWeekLabel('2026-W01')).toContain('2026')
  })

  it('uses the current system date for the current ISO week', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T10:00:00Z'))
    expect(getCurrentWeek()).toBe('2026-W31')
    vi.useRealTimers()
  })

  it('builds project/task nodes and only valid project edges', () => {
    const project = makeProject()
    const linked = makeTask({ projectId: project.id, status: 'done' })
    const standalone = makeTask({ id: 'task-2', projectId: null })
    const graph = buildGraph([project], [linked, standalone])
    expect(projectNodeId(project.id)).toBe('project:project-1')
    expect(taskNodeId(linked.id)).toBe('task:task-1')
    expect(graph.nodes).toHaveLength(3)
    expect(graph.edges).toEqual([{ source: 'project:project-1', target: 'task:task-1' }])
    expect(graph.nodes.find(node => node.id === 'task:task-1')).toMatchObject({ color: '#fe5011', status: 'done' })
  })
})
