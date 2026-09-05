import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { taskDayPlans } from '../../db/schema'
import { requireTaskAccess } from '../../utils/taskAccess'
import { updateTaskDayPlanSchema } from '../../utils/taskDayPlanValidators'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb(event)
  const [existing] = await db.select().from(taskDayPlans).where(eq(taskDayPlans.id, id))
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Task day plan not found' })
  await requireTaskAccess(event, existing.taskId, { write: true })
  const body = await readValidatedBody(event, updateTaskDayPlanSchema.parse)
  await db
    .update(taskDayPlans)
    .set({ ...body, updatedAt: Date.now() })
    .where(eq(taskDayPlans.id, id))
  const [plan] = await db.select().from(taskDayPlans).where(eq(taskDayPlans.id, id))
  return plan
})
