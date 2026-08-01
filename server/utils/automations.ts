import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../db'
import { automationRules, tasks } from '../db/schema'

export async function runTaskAutomations(
  event: H3Event,
  task: typeof tasks.$inferSelect,
  trigger: 'task_created' | 'status_changed'
) {
  if (!task.projectId) return task
  const db = useDb(event)
  const rules = await db
    .select()
    .from(automationRules)
    .where(
      and(
        eq(automationRules.projectId, task.projectId),
        eq(automationRules.trigger, trigger),
        eq(automationRules.enabled, true)
      )
    )
  const patch: Record<string, unknown> = {}
  for (const rule of rules) {
    if (rule.triggerValue && rule.triggerValue !== task.status) continue
    if (rule.action === 'set_priority' && ['low', 'medium', 'high', 'urgent'].includes(rule.actionValue))
      patch.priority = rule.actionValue
    if (rule.action === 'assign_user') patch.assigneeId = rule.actionValue
    if (rule.action === 'add_tag') patch.tags = [...new Set([...(task.tags ?? []), rule.actionValue])].slice(0, 10)
  }
  if (!Object.keys(patch).length) return task
  await db.update(tasks).set(patch).where(eq(tasks.id, task.id))
  return { ...task, ...patch }
}
