// @vitest-environment node

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const schema = read('server/db/schema.ts')
const taskPatch = read('server/api/tasks/[id].patch.ts')
const subtaskPatch = read('server/api/subtasks/[id].patch.ts')
const workLog = read('app/presentation/components/task/TaskWorkLogComposer.vue')
const taskOverview = read('app/presentation/components/task/TaskOverview.vue')

describe('daily work continuity contract', () => {
  it('keeps independent planning and carry-over metadata for subtasks', () => {
    expect(schema).toContain("plannedDate: text('planned_date')")
    expect(schema).toContain("originalPlannedDate: text('original_planned_date')")
    expect(schema).toContain("rescheduleCount: integer('reschedule_count')")
    expect(schema).toContain("index('subtasks_planned_date_idx')")
  })

  it('records both sides of task and subtask rescheduling', () => {
    for (const source of [taskPatch, subtaskPatch]) {
      expect(source).toContain('previousPlannedDate')
      expect(source).toContain('plannedDate: body.plannedDate')
    }
    expect(taskPatch).toContain('? undefined : 120_000')
  })

  it('allows actual daily work to be recorded without completing or duplicating a task', () => {
    expect(taskOverview).toContain('<TaskWorkLogComposer')
    expect(workLog).toContain('createReviewProgress')
    expect(workLog).toContain('localDateKey()')
    expect(workLog).toContain('subtaskId')
  })
})
