import { inArray } from 'drizzle-orm'
import { useDb } from '../../db'
import { subtasks } from '../../db/schema'
import { bulkSubtaskSchema } from '../../utils/validators'
import { requireTaskAccess } from '../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bulkSubtaskSchema.parse)
  const db = useDb(event)
  const existing = await db.select().from(subtasks).where(inArray(subtasks.id, body.ids))
  if (existing.length !== body.ids.length) throw createError({ statusCode: 404, statusMessage: 'Subtask not found' })
  await Promise.all(
    [...new Set(existing.map((item) => item.taskId))].map((taskId) => requireTaskAccess(event, taskId, { write: true }))
  )
  const patch = { ...body.patch }
  if (body.patch.done !== undefined) patch.status = body.patch.done ? 'done' : 'todo'
  if (body.patch.status !== undefined) patch.done = body.patch.status === 'done'
  await db.update(subtasks).set(patch).where(inArray(subtasks.id, body.ids))
  return db.select().from(subtasks).where(inArray(subtasks.id, body.ids))
})
