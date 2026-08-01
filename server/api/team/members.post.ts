import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { teamMembers, users } from '../../db/schema'
import { requireManagedTeam } from '../../utils/teamAccess'

const schema = z.object({ email: z.string().trim().email(), teamId: z.string().optional() })

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)
  const { team } = await requireManagedTeam(event, body.teamId)
  const db = useDb(event)
  const [account] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase()))
  if (!account) throw createError({ statusCode: 404, statusMessage: 'User must sign in to WeekFlow first' })
  const [existing] = await db.select().from(teamMembers).where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, account.id)))
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Already a team member' })
  await db.insert(teamMembers).values({ teamId: team.id, userId: account.id, createdAt: Date.now() })
  return { ok: true }
})
