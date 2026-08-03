import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../db'
import { workflowStages } from '../../../db/schema'
import { requireProjectAccess } from '../../../utils/projectAccess'

const schema = z.object({
  stages: z
    .array(z.object({ id: z.string().uuid(), position: z.number().int().min(0) }))
    .min(1)
    .max(100)
})
export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')!
  await requireProjectAccess(event, projectId, true)
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb(event)
  const updates = body.stages.map((item) =>
    db
      .update(workflowStages)
      .set({ position: item.position })
      .where(and(eq(workflowStages.id, item.id), eq(workflowStages.projectId, projectId)))
  )
  await db.batch(updates as [any, ...any[]])
  return { ok: true, count: body.stages.length }
})
