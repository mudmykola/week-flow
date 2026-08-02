import { desc, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { activityLogs, users } from '../../db/schema'
import { isAdmin, requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAppUser(event)
  if (!isAdmin(actor)) throw createError({ statusCode: 403 })
  const db = useDb(event)
  const logs = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.entityType, 'user'))
    .orderBy(desc(activityLogs.createdAt))
    .limit(100)
  const accounts = await db.select({ id: users.id, name: users.name, email: users.email }).from(users)
  return logs.map((log) => ({
    ...log,
    actor: accounts.find((account) => account.id === log.actorId) ?? null,
    target: accounts.find((account) => account.id === log.entityId) ?? null
  }))
})
