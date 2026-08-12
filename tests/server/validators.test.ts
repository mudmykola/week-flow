// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  bulkTaskSchema,
  bulkSubtaskSchema,
  createCommentSchema,
  createInvitationSchema,
  createFocusSessionSchema,
  createProjectSchema,
  createStickyNoteSchema,
  createSubtaskSchema,
  createTaskSchema,
  moveWeekSchema,
  saveDailyReviewSchema,
  updateSettingsSchema,
  updateFocusSessionSchema,
  updateStickyNoteSchema,
  updateSubtaskSchema,
  updateTaskSchema
} from '../../server/utils/validators'

describe('server validators', () => {
  it('validates bounded focus session payloads', () => {
    expect(createFocusSessionSchema.parse({ kind: 'focus', plannedSeconds: 1500 })).toMatchObject({ kind: 'focus' })
    expect(() => createFocusSessionSchema.parse({ kind: 'focus', plannedSeconds: 10 })).toThrow()
    expect(updateFocusSessionSchema.parse({ status: 'completed', elapsedSeconds: 1499 })).toMatchObject({
      status: 'completed'
    })
  })
  it('applies safe defaults to new tasks', () => {
    expect(createTaskSchema.parse({ title: 'Plan', week: '2026-W31' })).toMatchObject({
      status: 'todo',
      sort: 0,
      priority: 'medium',
      tags: [],
      workState: 'active',
      readyCriteria: [],
      doneCriteria: []
    })
  })

  it.each([
    [{ title: '', week: '2026-W31' }, 'empty title'],
    [{ title: 'Task', week: '31-2026' }, 'invalid week'],
    [{ title: 'Task', week: '2026-W31', dueDate: '01.08.2026' }, 'invalid date'],
    [{ title: 'Task', week: '2026-W31', projectId: 'invalid' }, 'invalid project'],
    [{ title: 'Task', week: '2026-W31', tags: Array(11).fill('tag') }, 'too many tags']
  ])('rejects invalid task input: %s (%s)', (input) => expect(createTaskSchema.safeParse(input).success).toBe(false))

  it('validates task patches and archive timestamps', () => {
    expect(
      updateTaskSchema.safeParse({
        status: 'done',
        archivedAt: Date.now(),
        plannedDate: '2026-08-11',
        plannedTime: '09:30',
        estimateMinutes: 45,
        dayRank: 2,
        weekRank: 1,
        blockedByTaskId: '00000000-0000-4000-8000-000000000001',
        workState: 'review',
        reviewerId: '00000000-0000-4000-8000-000000000002',
        actualMinutes: 90,
        waitingUntil: '2026-08-12',
        readyCriteria: ['Scope accepted'],
        doneCriteria: ['Tests pass'],
        reminderAt: Date.now()
      }).success
    ).toBe(true)
    expect(updateTaskSchema.safeParse({ priority: 'critical' }).success).toBe(false)
    expect(updateTaskSchema.safeParse({ plannedTime: '25:00' }).success).toBe(false)
    expect(updateTaskSchema.safeParse({ estimateMinutes: 2 }).success).toBe(false)
    expect(updateTaskSchema.safeParse({ dayRank: 4 }).success).toBe(false)
    expect(updateTaskSchema.safeParse({ weekRank: 4 }).success).toBe(false)
    expect(updateTaskSchema.safeParse({ workState: 'blocked' }).success).toBe(false)
    expect(updateTaskSchema.safeParse({ actualMinutes: -1 }).success).toBe(false)
  })

  it('validates safe bulk task operations', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(
      bulkTaskSchema.safeParse({
        ids: [id],
        patch: { status: 'done', assigneeId: null, dueDate: '2026-08-07', plannedDate: '2026-08-08' }
      }).success
    ).toBe(true)
    expect(bulkTaskSchema.safeParse({ ids: [], patch: { status: 'done' } }).success).toBe(false)
    expect(bulkTaskSchema.safeParse({ ids: [id], patch: { title: 'not allowed' } }).success).toBe(false)
  })

  it('validates supporting entities and settings', () => {
    expect(createProjectSchema.safeParse({ name: 'Work', color: '#AABBCC' }).success).toBe(true)
    expect(createProjectSchema.safeParse({ name: 'Work', color: 'orange' }).success).toBe(false)
    expect(createInvitationSchema.parse({ email: 'user@example.com' }).role).toBe('viewer')
    expect(createInvitationSchema.safeParse({ email: 'bad' }).success).toBe(false)
    expect(createSubtaskSchema.safeParse({ title: ' Step ' }).success).toBe(true)
    expect(
      createSubtaskSchema.safeParse({
        title: 'Detailed step',
        note: 'Context',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-08-07',
        assigneeId: '00000000-0000-4000-8000-000000000001'
      }).success
    ).toBe(true)
    expect(updateSubtaskSchema.safeParse({ done: true }).success).toBe(true)
    expect(updateSubtaskSchema.safeParse({ status: 'blocked' }).success).toBe(false)
    expect(
      bulkSubtaskSchema.safeParse({
        ids: ['00000000-0000-4000-8000-000000000001'],
        patch: { done: true }
      }).success
    ).toBe(true)
    expect(createCommentSchema.safeParse({ body: '  ' }).success).toBe(false)
    expect(
      updateSettingsSchema.safeParse({ theme: 'dark', locale: 'uk', weekStartsOn: 1, notifications: true }).success
    ).toBe(true)
    expect(updateSettingsSchema.safeParse({ weekStartsOn: 7 }).success).toBe(false)
    expect(
      updateSettingsSchema.safeParse({
        daySchedule: {
          workStart: '09:00',
          morningEnd: '12:00',
          middayEnd: '15:00',
          workEnd: '18:00',
          lunchStart: '13:30',
          lunchMinutes: 60
        }
      }).success
    ).toBe(true)
    expect(
      updateSettingsSchema.safeParse({
        daySchedule: {
          workStart: '12:00',
          morningEnd: '09:00',
          middayEnd: '15:00',
          workEnd: '18:00',
          lunchStart: '13:00',
          lunchMinutes: 60
        }
      }).success
    ).toBe(false)
    expect(moveWeekSchema.safeParse({ fromWeek: '2026-W31', toWeek: '2026-W32' }).success).toBe(true)
  })

  it('validates sticky-note content, colors and positions', () => {
    expect(createStickyNoteSchema.parse({ content: ' Follow up ' })).toMatchObject({
      content: 'Follow up',
      color: 'yellow',
      positionX: 24,
      positionY: 24
    })
    expect(createStickyNoteSchema.safeParse({ content: '' }).success).toBe(false)
    expect(createStickyNoteSchema.safeParse({ content: 'Note', color: 'purple' }).success).toBe(false)
    expect(
      updateStickyNoteSchema.safeParse({ done: true, checkedItems: [0, 2], positionX: 240, positionY: 120 }).success
    ).toBe(true)
    expect(updateStickyNoteSchema.safeParse({ checkedItems: [-1] }).success).toBe(false)
    expect(updateStickyNoteSchema.safeParse({}).success).toBe(false)
  })

  it('validates bounded persisted daily reviews', () => {
    expect(saveDailyReviewSchema.parse({ reviewDate: '2026-08-12', content: 'Daily report' })).toMatchObject({
      status: 'draft',
      structuredContent: {},
      excludedTaskIds: []
    })
    expect(saveDailyReviewSchema.safeParse({ reviewDate: '12.08.2026', content: 'Invalid' }).success).toBe(false)
    expect(saveDailyReviewSchema.safeParse({ reviewDate: '2026-08-12', content: 'x'.repeat(20_001) }).success).toBe(
      false
    )
  })
})
