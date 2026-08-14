import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { users } from '../../db/schema'

const testSessionSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().trim().min(1).max(100),
  role: z.enum(['user', 'pm', 'admin'])
})

export default defineEventHandler(async (event) => {
  const cloudflareEnv = event.context.cloudflare?.env as unknown as Record<string, string | undefined> | undefined
  const config = useRuntimeConfig(event)
  const enabled = cloudflareEnv?.NUXT_TEST_AUTH_ENABLED === 'true' || config.testAuthEnabled === true
  const secret = cloudflareEnv?.NUXT_TEST_AUTH_SECRET || config.testAuthSecret
  const suppliedSecret = getHeader(event, 'x-weekflow-test-auth')

  if (!enabled || typeof secret !== 'string' || secret.length < 32 || suppliedSecret !== secret) {
    throw createError({ statusCode: 404 })
  }

  const body = await readValidatedBody(event, testSessionSchema.parse)
  const db = useDb(event)
  const now = Date.now()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, body.id))
  if (existing) {
    await db
      .update(users)
      .set({ email: body.email, name: body.name, role: body.role, disabledAt: null, updatedAt: now })
      .where(eq(users.id, body.id))
  } else {
    await db.insert(users).values({
      ...body,
      googleId: `e2e:${body.id}`,
      avatarUrl: null,
      disabledAt: null,
      createdAt: now,
      updatedAt: now
    })
  }
  await setUserSession(event, { user: { ...body, avatarUrl: null } })
  return { ok: true }
})
