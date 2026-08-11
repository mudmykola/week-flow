import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { inboxItems } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  await useDb(event)
    .delete(inboxItems)
    .where(and(eq(inboxItems.id, getRouterParam(event, 'id')!), eq(inboxItems.ownerId, user.id)))
  return { ok: true as const }
})
