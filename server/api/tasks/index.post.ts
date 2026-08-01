import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { projectMembers, projects, tasks } from '../../db/schema'
import { createTaskSchema } from '../../utils/validators'
import { isAdmin, requireAppUser } from '../../utils/auth'
import { logActivity } from '../../utils/activity'
import { runTaskAutomations } from '../../utils/automations'
import { requireAssignableUser } from '../../utils/assigneeAccess'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, createTaskSchema.parse)
  await requireAssignableUser(event, body.assigneeId)

  if (body.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        isAdmin(user)
          ? eq(projects.id, body.projectId)
          : and(eq(projects.id, body.projectId), eq(projects.ownerId, user.id))
      )
    if (!project) {
      const [member] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, body.projectId), eq(projectMembers.userId, user.id)))
      if (!member || member.role === 'viewer') throw createError({ statusCode: 400, statusMessage: 'Invalid project' })
    }
  }

  const task = {
    id: crypto.randomUUID(),
    title: body.title,
    note: body.note ?? null,
    status: body.status,
    projectId: body.projectId ?? null,
    week: body.week,
    sort: body.sort,
    createdAt: Date.now(),
    doneAt: body.status === 'done' ? Date.now() : null,
    ownerId: user.id,
    assigneeId: body.assigneeId ?? user.id,
    stageId: body.stageId ?? null,
    priority: body.priority,
    dueDate: body.dueDate ?? null,
    tags: body.tags,
    recurrence: body.recurrence ?? null,
    archivedAt: null
  }

  await db.insert(tasks).values(task)
  await logActivity(event, {
    ownerId: user.id,
    actorId: user.id,
    action: 'task.created',
    entityType: 'task',
    entityId: task.id
  })
  return runTaskAutomations(event, task, 'task_created')
})
