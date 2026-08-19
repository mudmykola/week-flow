import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  activityDateKey,
  activityIcon,
  activityImportance,
  activityNeedsAttention,
  activityTone,
  groupActivityByDate,
  isActivityMove,
  summarizeActivity,
  type ActivityFeedItem
} from '~/domain/services/activityFeed'

function activity(overrides: Partial<ActivityFeedItem>): ActivityFeedItem {
  return {
    id: 'activity-1',
    action: 'task.updated',
    entityType: 'task',
    entityId: 'task-1',
    entityTitle: 'Prepare report',
    metadata: {},
    actorName: 'Mykola',
    actorAvatar: null,
    projectName: null,
    projectColor: null,
    createdAt: Date.now(),
    ...overrides
  }
}

describe('activity feed presentation', () => {
  afterEach(() => vi.useRealTimers())

  it('groups autosave bursts inside date sections', () => {
    const groups = groupActivityByDate([
      activity({ id: '2', metadata: { note: 'B' }, createdAt: 200_000 }),
      activity({ id: '1', metadata: { title: 'A' }, createdAt: 150_000 })
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.items[0]).toMatchObject({ count: 2, entityTitle: 'Prepare report' })
    expect(groups[0]?.items[0]?.changedFields).toEqual(['note', 'title'])
  })

  it('separates calendar days and sorts newest first', () => {
    const groups = groupActivityByDate([
      activity({ id: 'old', createdAt: new Date('2026-08-01T10:00:00Z').getTime() }),
      activity({ id: 'new', createdAt: new Date('2026-08-02T10:00:00Z').getTime() })
    ])
    expect(groups.map((group) => group.items[0]?.id)).toEqual(['new', 'old'])
  })

  it('provides localized date categories and semantic action visuals', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-04T12:00:00Z'))
    expect(activityDateKey(new Date('2026-08-04T08:00:00Z').getTime())).toBe('today')
    expect(activityDateKey(new Date('2026-08-03T08:00:00Z').getTime())).toBe('yesterday')
    expect(activityDateKey(new Date('2026-08-01T08:00:00Z').getTime())).toBe('date')
    expect(activityIcon('task.created')).toBe('i-lucide-circle-plus')
    expect(activityTone('task.deleted')).toBe('danger')
    expect(activityTone('task.updated')).toBe('accent')
  })

  it('maps every known action to its icon and falls back for unknown actions', () => {
    expect(activityIcon('task.deleted')).toBe('i-lucide-trash-2')
    expect(activityIcon('subtask.created')).toBe('i-lucide-list-plus')
    expect(activityIcon('goal.created')).toBe('i-lucide-target')
    expect(activityIcon('goal.progress_updated')).toBe('i-lucide-trending-up')
    expect(activityIcon('goal.project_linked')).toBe('i-lucide-link')
    expect(activityIcon('goal.project_unlinked')).toBe('i-lucide-link-2-off')
    expect(activityIcon('task.updated')).toBe('i-lucide-pencil-line')
    expect(activityTone('subtask.created')).toBe('success')
    expect(activityTone('goal.created')).toBe('success')
  })

  it('classifies operational signals and builds the compact summary', () => {
    const moved = activity({ id: 'moved', metadata: { previousPlannedDate: '2026-08-18', plannedDate: '2026-08-19' } })
    const blocked = activity({ id: 'blocked', metadata: { blocked: true } })
    const completed = activity({ id: 'done', action: 'subtask.completed' })
    const comment = activity({ id: 'comment', action: 'comment.created' })

    expect(isActivityMove(moved)).toBe(true)
    expect(activityImportance(moved)).toBe('warning')
    expect(activityNeedsAttention(blocked)).toBe(true)
    expect(summarizeActivity([moved, blocked, completed, comment])).toEqual({
      attention: 1,
      completed: 1,
      moved: 1,
      conversations: 1
    })
  })
})
