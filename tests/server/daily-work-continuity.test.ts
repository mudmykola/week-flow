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
const dayPlans = read('app/presentation/components/task/TaskDayPlans.vue')
const dayPlanApi = read('server/api/tasks/[id]/day-plans/index.post.ts')
const dayPlanPatchApi = read('server/api/task-day-plans/[id].patch.ts')
const migration = read('server/db/migrations/0023_task_day_plans.sql')

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
    expect(workLog).toContain('nextStep')
    expect(workLog).toContain('kind')
  })

  it('stores one immutable planning record per task and day', () => {
    expect(schema).toContain('export const taskDayPlans = sqliteTable(')
    expect(migration).toContain('CREATE TABLE `task_day_plans`')
    expect(migration).toContain('CREATE UNIQUE INDEX `task_day_plans_task_date_idx`')
    expect(taskOverview).toContain('<TaskDayPlans')
    expect(dayPlans).toContain('fetchTaskDayPlans')
    expect(dayPlans).toContain('carryoverReason')
  })

  it('guards every day-plan mutation through task access', () => {
    expect(dayPlanApi).toContain('requireTaskAccess(event, taskId, { write: true })')
    expect(dayPlanPatchApi).toContain('requireTaskAccess(event, existing.taskId, { write: true })')
  })
})
