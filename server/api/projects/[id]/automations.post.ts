import { z } from 'zod'
import { useDb } from '../../../db'
import { automationRules } from '../../../db/schema'
import { requireProjectAccess } from '../../../utils/projectAccess'

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  trigger: z.enum(['task_created', 'status_changed']),
  triggerValue: z.string().max(40).nullable().optional(),
  action: z.enum(['set_priority', 'assign_user', 'add_tag']),
  actionValue: z.string().trim().min(1).max(80),
  enabled: z.boolean().optional().default(true)
})
export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')!
  await requireProjectAccess(event, projectId, true)
  const body = await readValidatedBody(event, schema.parse)
  const rule = {
    id: crypto.randomUUID(),
    projectId,
    ...body,
    triggerValue: body.triggerValue ?? null,
    createdAt: Date.now()
  }
  await useDb(event).insert(automationRules).values(rule)
  return rule
})
