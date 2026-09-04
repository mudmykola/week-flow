import { eq, or } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../../db'
import { users } from '../../db/schema'
import { ADMIN_EMAIL } from '../../utils/auth'
import { createRequestLog } from '../../utils/observability'
import { isValidOAuthState } from '../../utils/requestSecurity'

const OAUTH_STATE_COOKIE = 'weekflow-oauth-state'

const googleOAuthHandler = defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: googleUser }) {
    try {
      if (!googleUser.email) throw createError({ statusCode: 400, statusMessage: 'Google email is required' })
      const email = googleUser.email.toLowerCase()
      const db = useDb(event)
      const now = Date.now()
      const defaultRole: 'user' | 'admin' = email === ADMIN_EMAIL ? 'admin' : 'user'
      const name = googleUser.name || email.split('@')[0]!

      const [existing] = await db
        .select()
        .from(users)
        .where(or(eq(users.googleId, googleUser.sub), eq(users.email, email)))
      const user = existing
        ? {
            ...existing,
            googleId: googleUser.sub,
            email,
            name,
            avatarUrl: googleUser.picture ?? null,
            role: email === ADMIN_EMAIL ? ('admin' as const) : existing.role
          }
        : {
            id: crypto.randomUUID(),
            googleId: googleUser.sub,
            email,
            name,
            avatarUrl: googleUser.picture ?? null,
            role: defaultRole,
            createdAt: now,
            updatedAt: now
          }

      if (existing) {
        await db
          .update(users)
          .set({
            googleId: googleUser.sub,
            email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            role: user.role,
            updatedAt: now
          })
          .where(eq(users.id, existing.id))
      } else {
        await db.insert(users).values(user)
      }

      await setUserSession(event, {
        user: { id: user.id, email, name: user.name, avatarUrl: user.avatarUrl, role: user.role }
      })
      return sendRedirect(event, '/')
    } catch (error) {
      logOAuthFailure(event, error)
      return sendRedirect(event, '/login?error=oauth')
    }
  },
  onError(event, error) {
    logOAuthFailure(event, error)
    return sendRedirect(event, '/login?error=oauth')
  }
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const isCallback = typeof query.code === 'string' || typeof query.error === 'string'

  if (!isCallback && typeof query.state !== 'string') {
    const state = crypto.randomUUID()
    setCookie(event, OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: getRequestURL(event).protocol === 'https:',
      path: '/auth/google',
      maxAge: 600
    })
    return sendRedirect(event, `/auth/google?state=${encodeURIComponent(state)}`)
  }

  if (isCallback) {
    const expectedState = getCookie(event, OAUTH_STATE_COOKIE)
    deleteCookie(event, OAUTH_STATE_COOKIE, { path: '/auth/google' })
    if (!isValidOAuthState(query.state, expectedState)) {
      logOAuthFailure(event, createError({ statusCode: 403, statusMessage: 'Invalid OAuth state' }))
      return sendRedirect(event, '/login?error=oauth')
    }
    if (typeof query.error === 'string') {
      logOAuthFailure(event, createError({ statusCode: 400, statusMessage: query.error }))
      return sendRedirect(event, '/login?error=oauth')
    }
  }

  return googleOAuthHandler(event)
})

function logOAuthFailure(event: H3Event, error: unknown) {
  const value = error as { statusCode?: number; statusMessage?: string; message?: string }
  console.error(
    JSON.stringify(
      createRequestLog({
        level: 'error',
        requestId: event.context.requestId || crypto.randomUUID(),
        method: event.method,
        path: '/auth/google',
        status: value.statusCode || 500,
        durationMs: Date.now() - (event.context.requestStartedAt || Date.now()),
        error: value.statusMessage || value.message || 'oauth_error'
      })
    )
  )
}
