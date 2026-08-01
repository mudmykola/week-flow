import { asc } from 'drizzle-orm'
import { useDb } from '../../db'
import { users } from '../../db/schema'
import { isAdmin, requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  if (!isAdmin(user)) throw createError({ statusCode: 403, statusMessage: 'Admin access required' })

  return useDb(event).select({
    id: users.id,
    email: users.email,
    name: users.name,
    avatarUrl: users.avatarUrl,
    role: users.role,
    disabledAt: users.disabledAt,
    createdAt: users.createdAt
  }).from(users).orderBy(asc(users.createdAt))
})
