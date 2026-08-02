import { useDb } from '../../../db'
import { automationRules } from '../../../db/schema'
import { requireProjectAccess } from '../../../utils/projectAccess'
import { automationRuleSchema } from '../../../utils/workflowValidators'
export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')!
  await requireProjectAccess(event, projectId, true)
  const body = await readValidatedBody(event, automationRuleSchema.parse)
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
