import type { H3Event } from 'h3'
import { activityLogs } from '../db/schema'
import { useDb } from '../db'

export function logActivity(
  event: H3Event,
  input: {
    ownerId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Record<string, unknown>
  }
) {
  return useDb(event)
    .insert(activityLogs)
    .values({
      id: crypto.randomUUID(),
      ...input,
      metadata: input.metadata ?? {},
      createdAt: Date.now()
    })
}
