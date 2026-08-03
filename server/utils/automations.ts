import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getNextWeek } from '../../app/domain/services/week'
import { useDb } from '../db'
import { automationExecutions, automationRules, comments, subtasks, tasks } from '../db/schema'

type Rule = typeof automationRules.$inferSelect
type Task = typeof tasks.$inferSelect

export function previewAutomation(rule: Rule, task: Task) {
  const matches = (rule.conditions ?? []).every((condition) => {
    const actual = condition.field === 'tag' ? task.tags : task[condition.field as keyof Task]
    if (condition.operator === 'contains') return Array.isArray(actual) && actual.includes(condition.value)
    if (condition.operator === 'not_equals') return String(actual ?? '') !== condition.value
    return String(actual ?? '') === condition.value
  })
  const actions = rule.actions?.length ? rule.actions : [{ type: rule.action, value: rule.actionValue }]
  const changes: Record<string, unknown> = {}
  const sideEffects: Array<{ type: string; value: string }> = []
  for (const action of actions) {
    if (action.type === 'set_priority') changes.priority = action.value
    else if (action.type === 'assign_user') changes.assigneeId = action.value
    else if (action.type === 'add_tag') changes.tags = [...new Set([...(task.tags ?? []), action.value])].slice(0, 10)
    else if (action.type === 'remove_tag') changes.tags = (task.tags ?? []).filter((tag) => tag !== action.value)
    else if (action.type === 'set_status') changes.status = action.value
    else if (action.type === 'set_stage') changes.stageId = action.value
    else if (action.type === 'move_week') changes.week = action.value === 'next' ? getNextWeek(task.week) : action.value
    else sideEffects.push(action)
  }
  return { matches, changes, sideEffects }
}

export async function runTaskAutomations(event: H3Event, task: Task, trigger: 'task_created' | 'status_changed') {
  if (!task.projectId || !task.ownerId) return task
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
  const combined: Record<string, unknown> = {}
  for (const rule of rules) {
    if (rule.triggerValue && rule.triggerValue !== task.status) continue
    const preview = previewAutomation(rule, { ...task, ...combined })
    if (!preview.matches) {
      await db.insert(automationExecutions).values({
        id: crypto.randomUUID(),
        ownerId: task.ownerId,
        ruleId: rule.id,
        taskId: task.id,
        status: 'skipped',
        trigger,
        changes: {},
        error: null,
        createdAt: Date.now()
      })
      continue
    }
    try {
      Object.assign(combined, preview.changes)
      for (const effect of preview.sideEffects) {
        if (effect.type === 'add_comment')
          await db.insert(comments).values({
            id: crypto.randomUUID(),
            taskId: task.id,
            authorId: task.ownerId,
            body: effect.value,
            createdAt: Date.now()
          })
        if (effect.type === 'create_subtask')
          await db.insert(subtasks).values({
            id: crypto.randomUUID(),
            taskId: task.id,
            title: effect.value,
            note: null,
            done: false,
            status: 'todo',
            priority: 'medium',
            dueDate: null,
            assigneeId: null,
            sort: 0,
            createdAt: Date.now()
          })
      }
      await db.insert(automationExecutions).values({
        id: crypto.randomUUID(),
        ownerId: task.ownerId,
        ruleId: rule.id,
        taskId: task.id,
        status: 'success',
        trigger,
        changes: preview.changes,
        error: null,
        createdAt: Date.now()
      })
    } catch (cause) {
      await db.insert(automationExecutions).values({
        id: crypto.randomUUID(),
        ownerId: task.ownerId,
        ruleId: rule.id,
        taskId: task.id,
        status: 'failed',
        trigger,
        changes: {},
        error: cause instanceof Error ? cause.message : 'Automation failed',
        createdAt: Date.now()
      })
    }
  }
  if (!Object.keys(combined).length) return task
  await db.update(tasks).set(combined).where(eq(tasks.id, task.id))
  return { ...task, ...combined }
}
