import { describe, expect, it } from 'vitest'
import type { Task } from '../../app/domain/entities/task'
import {
  normalizeAutomationTrigger,
  orderedWorkflowStages,
  workflowStageUsage
} from '../../app/domain/services/workflows'

describe('workflow services', () => {
  it('counts active project tasks by workflow stage', () => {
    const task = (stageId: string | null, projectId = 'project', archivedAt: number | null = null) =>
      ({ stageId, projectId, archivedAt, tags: [] }) as Task
    expect(
      workflowStageUsage(
        [task('todo'), task('todo'), task('done'), task('todo', 'other'), task('todo', 'project', 1)],
        'project'
      )
    ).toEqual({ todo: 2, done: 1 })
  })

  it('normalizes stage positions after drag and drop', () => {
    expect(
      orderedWorkflowStages([
        { id: 'b', position: 8 },
        { id: 'a', position: 2 }
      ])
    ).toEqual([
      { id: 'b', position: 0 },
      { id: 'a', position: 1 }
    ])
  })

  it('removes an irrelevant trigger value for task creation rules', () => {
    expect(normalizeAutomationTrigger('task_created', 'done')).toBeNull()
    expect(normalizeAutomationTrigger('status_changed', 'done')).toBe('done')
  })
})
