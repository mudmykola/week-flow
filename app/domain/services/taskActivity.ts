export interface ActivitySourceItem {
  id: string
  action: string
  metadata: Record<string, unknown>
  actorName: string
  createdAt: number
}

export type ActivityGroup<T extends ActivitySourceItem = ActivitySourceItem> = T & {
  count: number
  changedFields: string[]
  ids: string[]
}

export function groupTaskActivity<T extends ActivitySourceItem>(items: T[], windowMs = 120_000): ActivityGroup<T>[] {
  const groups: ActivityGroup<T>[] = []
  for (const item of [...items].sort((a, b) => b.createdAt - a.createdAt)) {
    const previous = groups.at(-1)
    const sameBurst =
      previous &&
      previous.action === item.action &&
      previous.actorName === item.actorName &&
      (!('entityId' in previous) || !('entityId' in item) || previous.entityId === item.entityId) &&
      previous.createdAt - item.createdAt <= windowMs
    const fields = Object.keys(item.metadata ?? {}).filter((key) => !['id', 'updatedAt'].includes(key))
    if (sameBurst) {
      previous.count += 1
      previous.ids.push(item.id)
      previous.changedFields = [...new Set([...previous.changedFields, ...fields])]
      continue
    }
    groups.push({ ...item, count: 1, ids: [item.id], changedFields: fields })
  }
  return groups
}
