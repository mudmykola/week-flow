import { isToday, isYesterday, startOfDay } from 'date-fns'
import type { ActivityGroup, ActivitySourceItem } from './taskActivity'
import { groupTaskActivity } from './taskActivity'

export interface ActivityFeedItem extends ActivitySourceItem {
  entityType: string
  entityId: string
  entityTitle: string | null
  actorAvatar: string | null
  projectName: string | null
  projectColor: string | null
}

export type ActivityScope = 'mine' | 'team' | 'all'
export type ActivityImportance = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

export interface ActivitySummary {
  attention: number
  completed: number
  moved: number
  conversations: number
}

export interface ActivityDateGroup {
  key: string
  date: number
  items: ActivityGroup<ActivityFeedItem>[]
}

export function groupActivityByDate(items: ActivityFeedItem[]): ActivityDateGroup[] {
  const groups = new Map<string, ActivityDateGroup>()
  for (const item of groupTaskActivity(items)) {
    const date = startOfDay(item.createdAt).getTime()
    const key = String(date)
    const group = groups.get(key) ?? { key, date, items: [] }
    group.items.push(item)
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => b.date - a.date)
}

export function activityDateKey(value: number) {
  const date = new Date(value)
  if (isToday(date)) return 'today'
  if (isYesterday(date)) return 'yesterday'
  return 'date'
}

export function activityIcon(action: string) {
  if (action === 'task.created') return 'i-lucide-circle-plus'
  if (action === 'task.deleted') return 'i-lucide-trash-2'
  if (action === 'subtask.created') return 'i-lucide-list-plus'
  if (action === 'subtask.completed') return 'i-lucide-list-checks'
  if (action === 'subtask.updated') return 'i-lucide-list-restart'
  if (action === 'comment.created') return 'i-lucide-message-square-more'
  if (action === 'goal.created') return 'i-lucide-target'
  if (action === 'goal.progress_updated') return 'i-lucide-trending-up'
  if (action === 'goal.project_linked') return 'i-lucide-link'
  if (action === 'goal.project_unlinked') return 'i-lucide-link-2-off'
  return 'i-lucide-pencil-line'
}

export function activityTone(action: string) {
  if (
    action === 'task.created' ||
    action === 'subtask.created' ||
    action === 'subtask.completed' ||
    action === 'goal.created'
  )
    return 'success'
  if (action === 'task.deleted') return 'danger'
  if (action === 'comment.created') return 'info'
  return 'accent'
}

export function activityImportance(item: Pick<ActivityFeedItem, 'action' | 'metadata'>): ActivityImportance {
  if (item.action === 'task.deleted' || item.metadata.blocked || item.metadata.status === 'blocked') return 'danger'
  if (isActivityMove(item)) return 'warning'
  if (['task.created', 'subtask.created', 'subtask.completed', 'goal.created'].includes(item.action)) return 'success'
  if (item.action === 'comment.created') return 'info'
  return 'neutral'
}

export function isActivityMove(item: Pick<ActivityFeedItem, 'action' | 'metadata'>) {
  return Boolean(
    (item.action === 'task.updated' || item.action === 'subtask.updated') &&
    ('previousPlannedDate' in item.metadata || 'plannedDate' in item.metadata)
  )
}

export function activityNeedsAttention(item: Pick<ActivityFeedItem, 'action' | 'metadata'>) {
  return activityImportance(item) === 'danger' || Boolean(item.metadata.mentioned)
}

export function summarizeActivity(items: ActivityFeedItem[]): ActivitySummary {
  return {
    attention: items.filter(activityNeedsAttention).length,
    completed: items.filter((item) => item.action === 'subtask.completed' || item.metadata.status === 'done').length,
    moved: items.filter(isActivityMove).length,
    conversations: items.filter((item) => item.action === 'comment.created' || item.metadata.mentioned).length
  }
}
