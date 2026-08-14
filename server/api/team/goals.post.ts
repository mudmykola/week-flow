import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { goals, teamMembers } from '../../db/schema'
import { requireManagedTeam } from '../../utils/teamAccess'
import { logActivity } from '../../utils/activity'

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  labels: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
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
  if (body.assigneeId && body.assigneeId !== manager.id) {
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
    priority: body.priority,
    labels: [...new Set(body.labels.map((label) => label.toLocaleLowerCase()))],
    progress: 0,
    status: 'active' as const,
    dueDate: body.dueDate ?? null,
    projectId: null,
    createdBy: manager.id,
    createdAt: now,
    updatedAt: now
  }
  await db.insert(goals).values(goal)
  await logActivity(event, {
    ownerId: body.assigneeId ?? manager.id,
    actorId: manager.id,
    action: 'goal.created',
    entityType: 'goal',
    entityId: goal.id,
    metadata: { title: goal.title }
  })
  return goal
})
