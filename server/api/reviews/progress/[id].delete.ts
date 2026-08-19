import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { reviewProgressEntries } from '../../../db/schema'
import { requireAppUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const result = await useDb(event)
    .delete(reviewProgressEntries)
    .where(and(eq(reviewProgressEntries.id, id), eq(reviewProgressEntries.ownerId, user.id)))
  if (!result.meta.changes) throw createError({ statusCode: 404, statusMessage: 'Progress entry not found' })
  return { ok: true }
})
