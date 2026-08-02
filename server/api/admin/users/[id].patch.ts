import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { users } from '../../../db/schema'
import { adminAccountPatchSchema } from '../../../utils/adminValidators'
import { isAdmin, requireAppUser } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const actor = await requireAppUser(event)
  if (!isAdmin(actor)) throw createError({ statusCode: 403 })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, adminAccountPatchSchema.parse)
  if (id === actor.id && (body.role === 'user' || body.role === 'pm' || body.disabled))
    throw createError({ statusCode: 400, statusMessage: 'Cannot remove own admin access' })
  const db = useDb(event)
  const [account] = await db.select().from(users).where(eq(users.id, id))
  if (!account) throw createError({ statusCode: 404 })
  const disabledAt = body.disabled === undefined ? undefined : body.disabled ? Date.now() : null
  await db.update(users).set({ role: body.role, disabledAt, updatedAt: Date.now() }).where(eq(users.id, id))
  await logActivity(event, {
    ownerId: id,
    actorId: actor.id,
    action: body.role ? 'admin_role_changed' : body.disabled ? 'admin_user_blocked' : 'admin_user_activated',
    entityType: 'user',
    entityId: id,
    metadata: {
      reason: body.reason ?? null,
      previousRole: account.role,
      role: body.role ?? account.role,
      previousDisabledAt: account.disabledAt,
      disabledAt
    }
  })
  return { ok: true }
})
