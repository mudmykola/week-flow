import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../db'
import { users } from '../../../db/schema'
import { isAdmin, requireAppUser } from '../../../utils/auth'

const schema = z.object({ role: z.enum(['user', 'admin']).optional(), disabled: z.boolean().optional() })

export default defineEventHandler(async (event) => {
  const actor = await requireAppUser(event)
  if (!isAdmin(actor)) throw createError({ statusCode: 403 })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)
  if (id === actor.id && (body.role === 'user' || body.disabled)) throw createError({ statusCode: 400, statusMessage: 'Cannot remove own admin access' })
  await useDb(event).update(users).set({ role: body.role, disabledAt: body.disabled === undefined ? undefined : body.disabled ? Date.now() : null, updatedAt: Date.now() }).where(eq(users.id, id))
  return { ok: true }
})
