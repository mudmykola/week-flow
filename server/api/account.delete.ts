import { requireAppUser } from '../utils/auth'
import { accountDeletionStatements, deleteAccountSchema } from '../utils/accountLifecycle'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const body = deleteAccountSchema.parse(await readBody(event))
  if (body.email.toLowerCase() !== user.email.toLowerCase()) {
    throw createError({ statusCode: 400, statusMessage: 'Confirmation email does not match' })
  }

  const d1 = event.context.cloudflare.env.DB
  const statements = accountDeletionStatements(user.id).map(({ sql, values }) => d1.prepare(sql).bind(...values))
  await d1.batch(statements)
  await clearUserSession(event)
  return { ok: true }
})
