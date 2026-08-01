import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { goals, teamMembers } from '../../db/schema'
import { requireManagedTeam } from '../../utils/teamAccess'

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  teamId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)
  const { manager, team } = await requireManagedTeam(event, body.teamId)
  const db = useDb(event)
  if (body.assigneeId) {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, body.assigneeId)))
    if (!member) throw createError({ statusCode: 400, statusMessage: 'Assignee is not a team member' })
  }
  const now = Date.now()
  const goal = {
    id: crypto.randomUUID(),
    teamId: team.id,
    assigneeId: body.assigneeId ?? null,
    title: body.title,
    description: body.description ?? null,
    progress: 0,
    status: 'active' as const,
    dueDate: body.dueDate ?? null,
    createdBy: manager.id,
    createdAt: now,
    updatedAt: now
  }
  await db.insert(goals).values(goal)
  return goal
})
