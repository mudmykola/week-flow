import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { subtasks } from '../../db/schema'
import { requireTaskAccess } from '../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb(event)
  const [existing] = await db.select().from(subtasks).where(eq(subtasks.id, id))
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Subtask not found' })
  await requireTaskAccess(event, existing.taskId, { write: true })
  await db.delete(subtasks).where(eq(subtasks.id, id))
  return { ok: true }
})
