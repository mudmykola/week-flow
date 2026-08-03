import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { focusSessions } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { updateFocusSessionSchema } from '../../utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateFocusSessionSchema.parse)
  const patch = { ...body, endedAt: body.status && body.status !== 'active' ? Date.now() : undefined }
  const result = await useDb(event)
    .update(focusSessions)
    .set(patch)
    .where(and(eq(focusSessions.id, id), eq(focusSessions.ownerId, user.id)))
  if (!result.meta.changes) throw createError({ statusCode: 404 })
  return { ok: true }
})
