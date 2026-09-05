import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { taskDayPlans } from '../../db/schema'
import { requireTaskAccess } from '../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb(event)
  const [existing] = await db.select().from(taskDayPlans).where(eq(taskDayPlans.id, id))
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Task day plan not found' })
  await requireTaskAccess(event, existing.taskId, { write: true })
  await db.delete(taskDayPlans).where(eq(taskDayPlans.id, id))
  return { ok: true as const }
})
