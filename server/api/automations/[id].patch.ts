import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { automationRules } from '../../db/schema'
import { requireProjectAccess } from '../../utils/projectAccess'
import { automationRulePatchSchema } from '../../utils/workflowValidators'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb(event)
  const [rule] = await db.select().from(automationRules).where(eq(automationRules.id, id))
  if (!rule) throw createError({ statusCode: 404 })
  await requireProjectAccess(event, rule.projectId, true)
  const body = await readValidatedBody(event, automationRulePatchSchema.parse)
  await db.update(automationRules).set(body).where(eq(automationRules.id, id))
  return { ...rule, ...body }
})
