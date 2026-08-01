import { desc, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { stickyNotes } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  return useDb(event)
    .select()
    .from(stickyNotes)
    .where(eq(stickyNotes.ownerId, user.id))
    .orderBy(desc(stickyNotes.updatedAt))
})
