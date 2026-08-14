import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { goals } from '../../db/schema'
import { requireGoalAccess } from '../../utils/goalAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requireGoalAccess(event, id, true)
  const result = await useDb(event).delete(goals).where(eq(goals.id, id))
  if (!result.meta.changes) throw createError({ statusCode: 404, statusMessage: 'Goal not found' })
  return { ok: true }
})
