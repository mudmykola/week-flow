import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../db'
import { tasks } from '../db/schema'
import { requireAppUser } from './auth'
import { canAccessTask } from './taskIsolation'

export async function requireTaskAccess(event: H3Event, taskId: string, _options: { write?: boolean } = {}) {
  const user = await requireAppUser(event)
  const db = useDb(event)
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId))
  if (!task) throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  if (!canAccessTask(user, task)) throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  return { user, task }
}
