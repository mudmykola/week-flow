import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { goals, teams } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

const schema = z.object({ progress: z.number().int().min(0).max(100), status: z.enum(['active', 'done']).optional() })

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb(event)
  const [goal] = await db.select().from(goals).where(eq(goals.id, id))
  if (!goal) throw createError({ statusCode: 404 })
  const [managedTeam] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, goal.teamId), eq(teams.managerId, user.id)))
  if (goal.assigneeId !== user.id && !managedTeam) throw createError({ statusCode: 403 })
  const progress = body.status === 'done' ? 100 : body.progress
  await db
    .update(goals)
    .set({ progress, status: body.status ?? (progress === 100 ? 'done' : 'active'), updatedAt: Date.now() })
    .where(eq(goals.id, id))
  return { ok: true, progress }
})
