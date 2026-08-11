import { describe, expect, it } from 'vitest'
import { parseQuickTask } from '~/domain/services/quickTaskParser'

describe('quick task parser', () => {
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
})
