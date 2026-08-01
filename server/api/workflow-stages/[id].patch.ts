import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { workflowStages } from '../../db/schema'
import { requireProjectAccess } from '../../utils/projectAccess'

const schema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  category: z.enum(['todo', 'in_progress', 'done']).optional(),
  position: z.number().int().min(0).optional(),
  wipLimit: z.number().int().positive().nullable().optional()
})
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb(event)
  const [stage] = await db.select().from(workflowStages).where(eq(workflowStages.id, id))
  if (!stage) throw createError({ statusCode: 404 })
  await requireProjectAccess(event, stage.projectId, true)
  const body = await readValidatedBody(event, schema.parse)
  await db.update(workflowStages).set(body).where(eq(workflowStages.id, id))
  return { ...stage, ...body }
})
