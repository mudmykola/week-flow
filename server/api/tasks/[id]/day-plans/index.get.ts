import { desc, eq } from 'drizzle-orm'
import { useDb } from '../../../../db'
import { taskDayPlans } from '../../../../db/schema'
import { requireTaskAccess } from '../../../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'id')!
  await requireTaskAccess(event, taskId)
  return useDb(event)
    .select()
    .from(taskDayPlans)
    .where(eq(taskDayPlans.taskId, taskId))
    .orderBy(desc(taskDayPlans.plannedDate), desc(taskDayPlans.createdAt))
})
