import { describe, expect, it } from 'vitest'
import { createCommentSchema, createInvitationSchema, createProjectSchema, createSubtaskSchema, createTaskSchema, moveWeekSchema, updateSettingsSchema, updateSubtaskSchema, updateTaskSchema } from '../../server/utils/validators'

describe('server validators', () => {
  it('applies safe defaults to new tasks', () => {
    expect(createTaskSchema.parse({ title: 'Plan', week: '2026-W31' })).toMatchObject({ status: 'todo', sort: 0, priority: 'medium', tags: [] })
  })

  it.each([
    [{ title: '', week: '2026-W31' }, 'empty title'],
    [{ title: 'Task', week: '31-2026' }, 'invalid week'],
    [{ title: 'Task', week: '2026-W31', dueDate: '01.08.2026' }, 'invalid date'],
    [{ title: 'Task', week: '2026-W31', projectId: 'invalid' }, 'invalid project'],
    [{ title: 'Task', week: '2026-W31', tags: Array(11).fill('tag') }, 'too many tags']
  ])('rejects invalid task input: %s (%s)', (input) => expect(createTaskSchema.safeParse(input).success).toBe(false))

  it('validates task patches and archive timestamps', () => {
    expect(updateTaskSchema.safeParse({ status: 'done', archivedAt: Date.now() }).success).toBe(true)
    expect(updateTaskSchema.safeParse({ priority: 'critical' }).success).toBe(false)
  })

  it('validates supporting entities and settings', () => {
    expect(createProjectSchema.safeParse({ name: 'Work', color: '#AABBCC' }).success).toBe(true)
    expect(createProjectSchema.safeParse({ name: 'Work', color: 'orange' }).success).toBe(false)
    expect(createInvitationSchema.parse({ email: 'user@example.com' }).role).toBe('viewer')
    expect(createInvitationSchema.safeParse({ email: 'bad' }).success).toBe(false)
    expect(createSubtaskSchema.safeParse({ title: ' Step ' }).success).toBe(true)
    expect(updateSubtaskSchema.safeParse({ done: true }).success).toBe(true)
    expect(createCommentSchema.safeParse({ body: '  ' }).success).toBe(false)
    expect(updateSettingsSchema.safeParse({ theme: 'dark', locale: 'uk', weekStartsOn: 1, notifications: true }).success).toBe(true)
    expect(updateSettingsSchema.safeParse({ weekStartsOn: 7 }).success).toBe(false)
    expect(moveWeekSchema.safeParse({ fromWeek: '2026-W31', toWeek: '2026-W32' }).success).toBe(true)
  })
})
