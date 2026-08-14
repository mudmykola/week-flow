import { and, desc, eq, or } from 'drizzle-orm'
import { useDb } from '../../../db'
import { automationExecutions, automationRules, tasks } from '../../../db/schema'
import { isAdmin, requireAppUser } from '../../../utils/auth'
import { requireProjectAccess } from '../../../utils/projectAccess'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')!
  const user = await requireAppUser(event)
  await requireProjectAccess(event, projectId)
  return useDb(event)
    .select({
      id: automationExecutions.id,
      ruleId: automationExecutions.ruleId,
      ruleName: automationRules.name,
      taskId: automationExecutions.taskId,
      taskTitle: tasks.title,
      status: automationExecutions.status,
      trigger: automationExecutions.trigger,
      changes: automationExecutions.changes,
      error: automationExecutions.error,
      createdAt: automationExecutions.createdAt
    })
    .from(automationExecutions)
    .innerJoin(automationRules, eq(automationRules.id, automationExecutions.ruleId))
    .leftJoin(tasks, eq(tasks.id, automationExecutions.taskId))
    .where(
      and(
        eq(automationRules.projectId, projectId),
        isAdmin(user) ? undefined : or(eq(automationExecutions.ownerId, user.id), eq(tasks.assigneeId, user.id))
      )
    )
    .orderBy(desc(automationExecutions.createdAt))
    .limit(100)
})
