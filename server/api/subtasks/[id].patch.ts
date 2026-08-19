import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { subtasks } from '../../db/schema'
import { updateSubtaskSchema } from '../../utils/validators'
import { requireTaskAccess } from '../../utils/taskAccess'
import { logActivity } from '../../utils/activity'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const [existing] = await useDb(event).select().from(subtasks).where(eq(subtasks.id, id))
  if (!existing) throw createError({ statusCode: 404 })
  const { user, task } = await requireTaskAccess(event, existing.taskId, { write: true })
  const body = await readValidatedBody(event, updateSubtaskSchema.parse)
  const patch = { ...body }
  if (body.done !== undefined) patch.status = body.done ? 'done' : 'todo'
  if (body.status !== undefined) patch.done = body.status === 'done'
  if (body.done !== undefined || body.status !== undefined) {
    Object.assign(patch, { doneAt: patch.status === 'done' ? Date.now() : null })
  }
  if (body.plannedDate !== undefined && body.plannedDate !== existing.plannedDate) {
    Object.assign(patch, {
      originalPlannedDate: existing.originalPlannedDate ?? existing.plannedDate ?? body.plannedDate,
      rescheduleCount: existing.plannedDate ? existing.rescheduleCount + 1 : existing.rescheduleCount
    })
  }
  await useDb(event).update(subtasks).set(patch).where(eq(subtasks.id, id))
  const [result] = await useDb(event).select().from(subtasks).where(eq(subtasks.id, id))
  if (!result) throw createError({ statusCode: 404 })
  await logActivity(event, {
    ownerId: task.assigneeId ?? task.ownerId!,
    actorId: user.id,
    action: result.status === 'done' && existing.status !== 'done' ? 'subtask.completed' : 'subtask.updated',
    entityType: 'task',
    entityId: existing.taskId,
    metadata: {
      subtaskId: result.id,
      subtaskTitle: result.title,
      status: result.status,
      changedFields: Object.keys(body),
      ...(body.plannedDate !== undefined && body.plannedDate !== existing.plannedDate
        ? { previousPlannedDate: existing.plannedDate, plannedDate: body.plannedDate }
        : {})
    }
  })
  return result
})
