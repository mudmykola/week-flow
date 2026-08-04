import { and, eq, getTableColumns } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { goals, projects, teams } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { logActivity } from '../../utils/activity'
import { withComputedProgress } from '../../utils/goals'

const schema = z.object({
  progress: z.number().int().min(0).max(100).optional(),
  status: z.enum(['active', 'done']).optional(),
  projectId: z.string().nullable().optional()
})

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

  const linkingProject = body.projectId !== undefined && body.projectId !== goal.projectId
  if (linkingProject && !managedTeam)
    throw createError({ statusCode: 403, statusMessage: 'Only the team manager can link a goal to a project' })

  const nextProjectId = body.projectId !== undefined ? body.projectId : goal.projectId
  if (body.progress !== undefined && nextProjectId)
    throw createError({ statusCode: 400, statusMessage: 'This goal derives progress from its linked project' })

  const progress = body.status === 'done' ? 100 : (body.progress ?? goal.progress)
  const status = body.status ?? (progress === 100 ? 'done' : goal.status)
  const ownerId = goal.assigneeId ?? goal.createdBy

  await db
    .update(goals)
    .set({ progress, status, projectId: nextProjectId, updatedAt: Date.now() })
    .where(eq(goals.id, id))

  if (body.progress !== undefined || body.status !== undefined) {
    await logActivity(event, {
      ownerId,
      actorId: user.id,
      action: 'goal.progress_updated',
      entityType: 'goal',
      entityId: id,
      metadata: { progress, title: goal.title },
      coalesceMs: 2 * 60_000
    })
  }
  if (linkingProject) {
    await logActivity(event, {
      ownerId,
      actorId: user.id,
      action: nextProjectId ? 'goal.project_linked' : 'goal.project_unlinked',
      entityType: 'goal',
      entityId: id,
      metadata: { projectId: nextProjectId, title: goal.title }
    })
  }

  const [updated] = await db
    .select({ ...getTableColumns(goals), projectName: projects.name, projectColor: projects.color })
    .from(goals)
    .leftJoin(projects, eq(projects.id, goals.projectId))
    .where(eq(goals.id, id))
  const [result] = await withComputedProgress(db, [updated!])
  return result
})
