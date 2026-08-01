import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { savedViews } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  return useDb(event).select().from(savedViews).where(eq(savedViews.ownerId, user.id))
})
