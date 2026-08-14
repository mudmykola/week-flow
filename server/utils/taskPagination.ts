export function decodeTaskCursor(cursor?: string) {
  if (!cursor) return null
  const separator = cursor.indexOf('_')
  const createdAt = Number(cursor.slice(0, separator))
  const id = cursor.slice(separator + 1)
  if (separator < 1 || !Number.isSafeInteger(createdAt) || createdAt < 0 || !id) return null
  return { createdAt, id }
}

export function encodeTaskCursor(task: { createdAt: number; id: string }) {
  return `${task.createdAt}_${task.id}`
}
