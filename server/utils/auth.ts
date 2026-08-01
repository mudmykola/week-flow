import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb } from '../db'
import { users } from '../db/schema'

export const ADMIN_EMAIL = 'mykola.mud@gmail.com'

export async function requireAppUser(event: H3Event) {
  const session = await requireUserSession(event)
  const [account] = await useDb(event).select({ disabledAt: users.disabledAt, role: users.role }).from(users).where(eq(users.id, session.user.id))
  if (!account || account.disabledAt) {
    await clearUserSession(event)
    throw createError({ statusCode: 403, statusMessage: 'Account disabled' })
  }
  return { ...session.user, role: account.role }
}

export function isAdmin(user: { role: string }) {
  return user.role === 'admin'
}
