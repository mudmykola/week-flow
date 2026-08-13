import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseQuickTask } from '~/domain/services/quickTaskParser'

describe('quick task parser', () => {
  afterEach(() => vi.useRealTimers())

  it('extracts project, assignee, priority, time and estimate', () => {
    const result = parseQuickTask(
      'Підготувати звіт завтра @Микола #Маркетинг !high 14:30 ~45m',
      [{ id: 'project-1', name: 'Маркетинг', color: '#fff', createdAt: 1, ownerId: 'owner' }],
      [{ id: 'user-1', name: 'Микола Мудь', email: 'm@example.com', avatarUrl: null }]
    )
    expect(result).toMatchObject({
      title: 'Підготувати звіт',
      projectId: 'project-1',
      assigneeId: 'user-1',
      priority: 'high',
      plannedTime: '14:30',
      estimateMinutes: 45,
      plannedDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it('resolves "сьогодні"/"today" to the current date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-12T09:00:00Z'))
    expect(parseQuickTask('Подзвонити клієнту сьогодні', [], []).plannedDate).toBe('2026-08-12')
    expect(parseQuickTask('Call the client today', [], []).plannedDate).toBe('2026-08-12')
  })

  it('skips non-matching projects and assignees before finding the right one', () => {
    const result = parseQuickTask(
      'Підготувати звіт #Продажі @Олена',
      [
        { id: 'project-1', name: 'Маркетинг', color: '#fff', createdAt: 1, ownerId: 'owner' },
        { id: 'project-2', name: 'Продажі', color: '#000', createdAt: 1, ownerId: 'owner' }
      ],
      [
        { id: 'user-1', name: 'Микола Мудь', email: 'm@example.com', avatarUrl: null },
        { id: 'user-2', name: 'Олена Ткач', email: 'o@example.com', avatarUrl: null }
      ]
    )
    expect(result).toMatchObject({ title: 'Підготувати звіт', projectId: 'project-2', assigneeId: 'user-2' })
  })
})
