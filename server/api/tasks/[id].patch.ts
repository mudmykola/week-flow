import { and, eq, or } from 'drizzle-orm'
import { useDb } from '../../db'
import { projectMembers, projects, tasks } from '../../db/schema'
import { updateTaskSchema } from '../../utils/validators'
import { isAdmin, requireAppUser } from '../../utils/auth'
import { addDays, addMonths, addWeeks, format, getISOWeek, getISOWeekYear } from 'date-fns'
import { logActivity } from '../../utils/activity'
import { requireTaskAccess } from '../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, updateTaskSchema.parse)
  await requireTaskAccess(event, id, { write: true })
  const taskAccess = eq(tasks.id, id)

  const [existing] = await db.select().from(tasks).where(taskAccess)
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Task not found' })

  if (body.projectId) {
    const [project] = await db.select({ id: projects.id }).from(projects).leftJoin(
      projectMembers,
      and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, user.id))
    ).where(and(
      eq(projects.id, body.projectId),
      isAdmin(user) ? undefined : or(eq(projects.ownerId, user.id), eq(projectMembers.role, 'editor'))
    ))
    if (!project) throw createError({ statusCode: 400, statusMessage: 'Invalid project' })
  }

  const patch: Record<string, unknown> = { ...body }
  if (body.status === 'done') {
    patch.doneAt = Date.now()
  } else if (body.status) {
    patch.doneAt = null
  }

  await db.update(tasks).set(patch).where(taskAccess)

  const [task] = await db.select().from(tasks).where(taskAccess)
  if (!task) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }
  if (body.status === 'done' && existing.status !== 'done' && existing.recurrence && existing.dueDate) {
    const base = new Date(`${existing.dueDate}T12:00:00`)
    const nextDate = existing.recurrence === 'daily' ? addDays(base, 1) : existing.recurrence === 'weekly' ? addWeeks(base, 1) : addMonths(base, 1)
    const year = getISOWeekYear(nextDate)
    const week = `${year}-W${String(getISOWeek(nextDate)).padStart(2, '0')}`
    await db.insert(tasks).values({
      ...existing,
      id: crypto.randomUUID(),
      status: 'todo',
      week,
      dueDate: format(nextDate, 'yyyy-MM-dd'),
      doneAt: null,
      archivedAt: null,
      createdAt: Date.now()
    })
  }
  await logActivity(event, { ownerId: task.ownerId!, actorId: user.id, action: 'task.updated', entityType: 'task', entityId: task.id, metadata: body })
  return task
})
