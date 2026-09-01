import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb } from '../db'
import { users } from '../db/schema'
import { createAsyncTtlCache } from './asyncTtlCache'

export const ADMIN_EMAIL = 'mykola.mud@gmail.com'
const accountCache = createAsyncTtlCache<{ disabledAt: number | null; role: 'user' | 'pm' | 'admin' } | undefined>(
  15_000
)

export async function requireAppUser(event: H3Event) {
  const session = await requireUserSession(event)
  const startedAt = performance.now()
  const account = await accountCache.get(session.user.id, async () => {
    const [row] = await useDb(event)
      .select({ disabledAt: users.disabledAt, role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
    return row
  })
  appendResponseHeader(event, 'server-timing', `auth;dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`)
  if (!account || account.disabledAt) {
    accountCache.delete(session.user.id)
    await clearUserSession(event)
    throw createError({ statusCode: 403, statusMessage: 'Account disabled' })
  }
  return { ...session.user, role: account.role }
}

export function isAdmin(user: { role: string }) {
  return user.role === 'admin'
}

export function isManager(user: { role: string }) {
  return user.role === 'pm' || user.role === 'admin'
}

export async function requireManager(event: H3Event) {
  const user = await requireAppUser(event)
  if (!isManager(user)) throw createError({ statusCode: 403, statusMessage: 'PM access required' })
  return user
}
