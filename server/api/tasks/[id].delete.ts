import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { tasks } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { logActivity } from '../../utils/activity'
import { requireTaskAccess } from '../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const { task } = await requireTaskAccess(event, id, { write: true })
  const access = eq(tasks.id, id)
  const result = await db.delete(tasks).where(access)
  if (!result.meta.changes) throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  await logActivity(event, {
    ownerId: task.assigneeId ?? task.ownerId!,
    actorId: user.id,
    action: 'task.deleted',
    entityType: 'task',
    entityId: id,
    metadata: { title: task.title }
  })
  return { ok: true }
})
