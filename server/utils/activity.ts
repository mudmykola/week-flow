import type { H3Event } from 'h3'
import { and, desc, eq, gt } from 'drizzle-orm'
import { activityLogs } from '../db/schema'
import { useDb } from '../db'

export async function logActivity(
  event: H3Event,
  input: {
    ownerId: string
    actorId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Record<string, unknown>
    coalesceMs?: number
  }
) {
  const db = useDb(event)
  const now = Date.now()
  if (input.coalesceMs) {
    const [recent] = await db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.ownerId, input.ownerId),
          eq(activityLogs.actorId, input.actorId),
          eq(activityLogs.action, input.action),
          eq(activityLogs.entityType, input.entityType),
          eq(activityLogs.entityId, input.entityId),
          gt(activityLogs.createdAt, now - input.coalesceMs)
        )
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(1)
    if (recent) {
      return db
        .update(activityLogs)
        .set({ metadata: { ...(recent.metadata ?? {}), ...(input.metadata ?? {}) }, createdAt: now })
        .where(eq(activityLogs.id, recent.id))
    }
  }
  const { coalesceMs: _coalesceMs, ...values } = input
  return db.insert(activityLogs).values({
    id: crypto.randomUUID(),
    ...values,
    metadata: input.metadata ?? {},
    createdAt: now
  })
}
