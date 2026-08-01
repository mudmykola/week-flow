import { desc, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { activityLogs } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  return useDb(event).select().from(activityLogs).where(eq(activityLogs.ownerId, user.id)).orderBy(desc(activityLogs.createdAt)).limit(100)
})
