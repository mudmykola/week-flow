import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../db'
import { projectMembers, tasks } from '../db/schema'
import { isAdmin, requireAppUser } from './auth'

export async function requireTaskAccess(event: H3Event, taskId: string, options: { write?: boolean } = {}) {
  const user = await requireAppUser(event)
  const db = useDb(event)
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId))
  if (!task) throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  if (!isAdmin(user) && task.ownerId !== user.id && task.assigneeId !== user.id) {
    if (!task.projectId) throw createError({ statusCode: 404, statusMessage: 'Task not found' })
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, task.projectId), eq(projectMembers.userId, user.id)))
    if (!member || (options.write && member.role === 'viewer'))
      throw createError({ statusCode: 403, statusMessage: 'Insufficient project access' })
  }
  return { user, task }
}
