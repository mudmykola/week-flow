import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { stickyNotes } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const [note] = await useDb(event)
    .delete(stickyNotes)
    .where(and(eq(stickyNotes.id, id), eq(stickyNotes.ownerId, user.id)))
    .returning({ id: stickyNotes.id })
  if (!note) throw createError({ statusCode: 404, statusMessage: 'Sticky note not found' })
  return { ok: true }
})
