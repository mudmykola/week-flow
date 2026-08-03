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
  return 'i-lucide-pencil-line'
}

export function activityTone(action: string) {
  if (action === 'task.created' || action === 'subtask.created') return 'success'
  if (action === 'task.deleted') return 'danger'
  return 'accent'
}
