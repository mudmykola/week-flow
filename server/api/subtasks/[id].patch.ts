import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { subtasks } from '../../db/schema'
import { updateSubtaskSchema } from '../../utils/validators'
import { requireTaskAccess } from '../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const [existing] = await useDb(event).select().from(subtasks).where(eq(subtasks.id, id))
  if (!existing) throw createError({ statusCode: 404 })
  await requireTaskAccess(event, existing.taskId, { write: true })
  const body = await readValidatedBody(event, updateSubtaskSchema.parse)
  await useDb(event).update(subtasks).set(body).where(eq(subtasks.id, id))
  const [result] = await useDb(event).select().from(subtasks).where(eq(subtasks.id, id))
  if (!result) throw createError({ statusCode: 404 })
  return result
})
