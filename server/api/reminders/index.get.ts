import { and, desc, eq, isNull } from 'drizzle-orm'
import { useDb } from '../../db'
import { reminderDeliveries, tasks } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  return useDb(event)
    .select({
      id: reminderDeliveries.id,
      taskId: reminderDeliveries.taskId,
      title: tasks.title,
      scheduledAt: reminderDeliveries.scheduledAt,
      deliveredAt: reminderDeliveries.deliveredAt,
      readAt: reminderDeliveries.readAt
    })
    .from(reminderDeliveries)
    .innerJoin(tasks, eq(tasks.id, reminderDeliveries.taskId))
    .where(and(eq(reminderDeliveries.ownerId, user.id), isNull(reminderDeliveries.dismissedAt)))
    .orderBy(desc(reminderDeliveries.deliveredAt))
    .limit(50)
})
