import { count, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { subtasks } from '../../../db/schema'
import { createSubtaskSchema } from '../../../utils/validators'
import { requireTaskAccess } from '../../../utils/taskAccess'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'id')!
  const { user, task } = await requireTaskAccess(event, taskId, { write: true })
  const body = await readValidatedBody(event, createSubtaskSchema.parse)
  const db = useDb(event)
  const countRows = await db.select({ value: count() }).from(subtasks).where(eq(subtasks.taskId, taskId))
  const currentCount = countRows[0]?.value ?? 0
  const subtask = {
    id: crypto.randomUUID(),
    taskId,
    title: body.title,
    note: body.note ?? null,
    done: body.status === 'done',
    status: body.status,
    priority: body.priority,
    plannedDate: body.plannedDate ?? task.plannedDate ?? null,
    originalPlannedDate: body.plannedDate ?? task.plannedDate ?? null,
    rescheduleCount: 0,
    dueDate: body.dueDate ?? null,
    assigneeId: body.assigneeId ?? null,
    sort: body.sort ?? currentCount,
    createdAt: Date.now()
  }
  await db.insert(subtasks).values(subtask)
  await logActivity(event, {
    ownerId: task.assigneeId ?? task.ownerId!,
    actorId: user.id,
    action: 'subtask.created',
    entityType: 'task',
    entityId: taskId,
    metadata: { subtaskId: subtask.id, subtaskTitle: subtask.title, status: subtask.status }
  })
  return subtask
})
