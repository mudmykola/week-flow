import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { goals } from '../../db/schema'
import { requireGoalAccess, requireGoalAssignee } from '../../utils/goalAccess'
import { goalBulkSchema } from '../../utils/goalValidators'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, goalBulkSchema.parse)
  const db = useDb(event)
  const updated = []
  for (const id of [...new Set(body.ids)]) {
    const { goal } = await requireGoalAccess(event, id, true)
    await requireGoalAssignee(event, goal.teamId, body.patch.assigneeId)
    const progress = body.patch.status === 'done' ? 100 : body.patch.status === 'active' ? 0 : goal.progress
    await db
      .update(goals)
      .set({ ...body.patch, progress, updatedAt: Date.now() })
      .where(eq(goals.id, id))
    const [result] = await db.select().from(goals).where(eq(goals.id, id))
    if (result) updated.push(result)
  }
  return updated
})
