import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { stickyNotes } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { updateStickyNoteSchema } from '../../utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateStickyNoteSchema.parse)
  const [note] = await useDb(event)
    .update(stickyNotes)
    .set({ ...body, updatedAt: Date.now() })
    .where(and(eq(stickyNotes.id, id), eq(stickyNotes.ownerId, user.id)))
    .returning()
  if (!note) throw createError({ statusCode: 404, statusMessage: 'Sticky note not found' })
  return note
})
