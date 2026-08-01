import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { goals } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  return useDb(event).select().from(goals).where(eq(goals.assigneeId, user.id)).orderBy(goals.createdAt)
})
