import { desc, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { inboxItems } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  return useDb(event)
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.ownerId, user.id))
    .orderBy(desc(inboxItems.createdAt))
})
