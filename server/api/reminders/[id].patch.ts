import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { reminderDeliveries } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

const patchSchema = z.object({ action: z.enum(['read', 'dismiss']) })

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const { action } = patchSchema.parse(await readBody(event))
  const now = Date.now()
  await useDb(event)
    .update(reminderDeliveries)
    .set(action === 'read' ? { readAt: now } : { dismissedAt: now, readAt: now })
    .where(and(eq(reminderDeliveries.id, id), eq(reminderDeliveries.ownerId, user.id)))
  return { ok: true }
})
