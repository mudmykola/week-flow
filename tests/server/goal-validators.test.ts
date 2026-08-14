// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { goalBulkSchema, goalPatchSchema } from '../../server/utils/goalValidators'

describe('goal management validators', () => {
  it('accepts the complete editable goal payload', () => {
    expect(
      goalPatchSchema.parse({
        title: 'Complete the Anthropic course',
        description: 'Finish every module',
        assigneeId: 'user-1',
        dueDate: '2026-09-30',
        priority: 'high',
        labels: ['ai', 'course'],
        status: 'active',
        projectId: null
      })
    ).toMatchObject({ priority: 'high', labels: ['ai', 'course'] })
  })

  it('rejects invalid deadlines, excessive labels and empty bulk changes', () => {
    expect(goalPatchSchema.safeParse({ dueDate: '30.09.2026' }).success).toBe(false)
    expect(
      goalPatchSchema.safeParse({ labels: Array.from({ length: 9 }, (_, index) => `label-${index}`) }).success
    ).toBe(false)
    expect(goalBulkSchema.safeParse({ ids: ['goal-1'], patch: {} }).success).toBe(false)
  })

  it('bounds bulk operations and accepts reassignment', () => {
    expect(goalBulkSchema.parse({ ids: ['goal-1', 'goal-2'], patch: { assigneeId: 'user-2' } })).toEqual({
      ids: ['goal-1', 'goal-2'],
      patch: { assigneeId: 'user-2' }
    })
    expect(
      goalBulkSchema.safeParse({
        ids: Array.from({ length: 101 }, (_, index) => `goal-${index}`),
        patch: { status: 'done' }
      }).success
    ).toBe(false)
  })
})
