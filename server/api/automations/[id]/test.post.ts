import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../db'
import { automationRules } from '../../../db/schema'
import { previewAutomation } from '../../../utils/automations'
import { requireProjectAccess } from '../../../utils/projectAccess'
import { requireTaskAccess } from '../../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { taskId } = await readValidatedBody(event, z.object({ taskId: z.string().uuid() }).parse)
  const db = useDb(event)
  const [rule] = await db.select().from(automationRules).where(eq(automationRules.id, id))
  if (!rule) throw createError({ statusCode: 404 })
  await requireProjectAccess(event, rule.projectId)
  const { task } = await requireTaskAccess(event, taskId)
  if (task.projectId !== rule.projectId) throw createError({ statusCode: 404 })
  return previewAutomation(rule, task)
})
