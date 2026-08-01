import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { automationRules } from '../../../db/schema'
import { requireProjectAccess } from '../../../utils/projectAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await requireProjectAccess(event, id)
  return useDb(event)
    .select()
    .from(automationRules)
    .where(eq(automationRules.projectId, id))
    .orderBy(automationRules.createdAt)
})
