import { useDb } from '../../../db'
import { workflowStages } from '../../../db/schema'
import { requireProjectAccess } from '../../../utils/projectAccess'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  category: z.enum(['todo', 'in_progress', 'done']),
  position: z.number().int().min(0),
  wipLimit: z.number().int().positive().nullable().optional(),
  wipPolicy: z.enum(['warn', 'block']).optional().default('warn')
})
export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')!
  await requireProjectAccess(event, projectId, true)
  const body = await readValidatedBody(event, schema.parse)
  const stage = { id: crypto.randomUUID(), projectId, ...body, wipLimit: body.wipLimit ?? null, createdAt: Date.now() }
  await useDb(event).insert(workflowStages).values(stage)
  return stage
})
