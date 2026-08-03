import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../db'
import { automationRules, tasks } from '../../../db/schema'
import { requireAppUser } from '../../../utils/auth'
import { previewAutomation } from '../../../utils/automations'
import { requireProjectAccess } from '../../../utils/projectAccess'

export default defineEventHandler(async (event) => {
  await requireAppUser(event)
  const id = getRouterParam(event, 'id')!
  const { taskId } = await readValidatedBody(event, z.object({ taskId: z.string().uuid() }).parse)
  const db = useDb(event)
  const [rule] = await db.select().from(automationRules).where(eq(automationRules.id, id))
  if (!rule) throw createError({ statusCode: 404 })
  await requireProjectAccess(event, rule.projectId)
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.projectId, rule.projectId)))
  if (!task) throw createError({ statusCode: 404 })
  return previewAutomation(rule, task)
})
