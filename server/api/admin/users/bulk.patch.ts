import { inArray } from 'drizzle-orm'
import { useDb } from '../../../db'
import { users } from '../../../db/schema'
import { adminBulkAccountSchema } from '../../../utils/adminValidators'
import { isAdmin, requireAppUser } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const actor = await requireAppUser(event)
  if (!isAdmin(actor)) throw createError({ statusCode: 403 })
  const body = await readValidatedBody(event, adminBulkAccountSchema.parse)
  if (
    body.ids.includes(actor.id) &&
    ((body.patch.role !== undefined && body.patch.role !== 'admin') || body.patch.disabled === true)
  )
    throw createError({ statusCode: 400, statusMessage: 'Cannot remove own admin access' })
  const db = useDb(event)
  const accounts = await db.select().from(users).where(inArray(users.id, body.ids))
  await db
    .update(users)
    .set({
      role: body.patch.role,
      disabledAt: body.patch.disabled === undefined ? undefined : body.patch.disabled ? Date.now() : null,
      updatedAt: Date.now()
    })
    .where(inArray(users.id, body.ids))
  await Promise.all(
    accounts.map((account) =>
      logActivity(event, {
        ownerId: account.id,
        actorId: actor.id,
        action: 'admin_bulk_update',
        entityType: 'user',
        entityId: account.id,
        metadata: { reason: body.reason ?? null, previousRole: account.role, ...body.patch }
      })
    )
  )
  return { updated: accounts.length }
})
