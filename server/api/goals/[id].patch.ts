import { eq, getTableColumns } from 'drizzle-orm'
import { useDb } from '../../db'
import { goals, projects } from '../../db/schema'
import { logActivity } from '../../utils/activity'
import { requireGoalAccess, requireGoalAssignee } from '../../utils/goalAccess'
import { withComputedProgress } from '../../utils/goals'
import { requireProjectAccess } from '../../utils/projectAccess'
import { goalPatchSchema } from '../../utils/goalValidators'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, goalPatchSchema.parse)
  const db = useDb(event)
  const { user, goal, canManage } = await requireGoalAccess(event, id)
  const structuralChange = ['title', 'description', 'assigneeId', 'dueDate', 'priority', 'labels', 'projectId'].some(
    (key) => key in body
  )
  if (structuralChange && !canManage) throw createError({ statusCode: 403 })
  await requireGoalAssignee(event, goal.teamId, body.assigneeId)
  if (body.projectId) await requireProjectAccess(event, body.projectId, true)

  const linkingProject = body.projectId !== undefined && body.projectId !== goal.projectId
  const nextProjectId = body.projectId !== undefined ? body.projectId : goal.projectId
  if (body.progress !== undefined && nextProjectId)
    throw createError({ statusCode: 400, statusMessage: 'This goal derives progress from its linked project' })

  const progress =
    body.status === 'done'
      ? 100
      : body.status === 'active' && goal.status === 'done' && body.progress === undefined
        ? 0
        : (body.progress ?? goal.progress)
  const status = body.status ?? (progress === 100 ? 'done' : goal.status)
  const ownerId = body.assigneeId ?? goal.assigneeId ?? goal.createdBy

  await db
    .update(goals)
    .set({
      ...body,
      labels: body.labels ? [...new Set(body.labels.map((label) => label.toLocaleLowerCase()))] : undefined,
      progress,
      status,
      projectId: nextProjectId,
      updatedAt: Date.now()
    })
    .where(eq(goals.id, id))

  if (body.progress !== undefined || body.status !== undefined) {
    await logActivity(event, {
      ownerId,
      actorId: user.id,
      action: 'goal.progress_updated',
      entityType: 'goal',
      entityId: id,
      metadata: { progress, title: body.title ?? goal.title },
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
      metadata: { projectId: nextProjectId, title: body.title ?? goal.title }
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
