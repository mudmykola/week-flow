// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { createReviewProgressSchema, updateReviewProgressSchema } from '../../server/utils/reviewProgressValidators'

describe('review progress validators', () => {
  it('accepts a bounded task or subtask progress entry', () => {
    expect(
      createReviewProgressSchema.parse({
        taskId: 'task-1',
        subtaskId: 'subtask-1',
        workDate: '2026-08-19',
        kind: 'progress',
        note: 'Completed module two',
        minutes: 45,
        nextStep: 'Start module three'
      })
    ).toMatchObject({ kind: 'progress', minutes: 45 })
  })

  it('rejects invalid dates, empty notes and excessive minutes', () => {
    expect(createReviewProgressSchema.safeParse({ taskId: 'task', workDate: '19.08.2026', note: 'Done' }).success).toBe(
      false
    )
    expect(createReviewProgressSchema.safeParse({ taskId: 'task', workDate: '2026-08-19', note: '' }).success).toBe(
      false
    )
    expect(
      createReviewProgressSchema.safeParse({ taskId: 'task', workDate: '2026-08-19', note: 'Done', minutes: 1500 })
        .success
    ).toBe(false)
  })

  it('requires at least one editable field for updates', () => {
    expect(updateReviewProgressSchema.safeParse({}).success).toBe(false)
    expect(updateReviewProgressSchema.parse({ note: 'Clarified the API contract' })).toEqual({
      note: 'Clarified the API contract'
    })
  })
})
