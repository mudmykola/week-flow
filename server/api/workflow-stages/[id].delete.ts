import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { tasks, workflowStages } from '../../db/schema'
import { requireProjectAccess } from '../../utils/projectAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb(event)
  const [stage] = await db.select().from(workflowStages).where(eq(workflowStages.id, id))
  if (!stage) throw createError({ statusCode: 404 })
  await requireProjectAccess(event, stage.projectId, true)
  await db.update(tasks).set({ stageId: null }).where(eq(tasks.stageId, id))
  await db.delete(workflowStages).where(eq(workflowStages.id, id))
  return { ok: true }
})
