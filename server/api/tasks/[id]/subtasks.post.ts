import { useDb } from '../../../db'
import { subtasks } from '../../../db/schema'
import { createSubtaskSchema } from '../../../utils/validators'
import { requireTaskAccess } from '../../../utils/taskAccess'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'id')!
  const { user, task } = await requireTaskAccess(event, taskId, { write: true })
  const body = await readValidatedBody(event, createSubtaskSchema.parse)
  const subtask = { id: crypto.randomUUID(), taskId, title: body.title, done: false, sort: 0, createdAt: Date.now() }
  await useDb(event).insert(subtasks).values(subtask)
  await logActivity(event, { ownerId: task.ownerId!, actorId: user.id, action: 'subtask.created', entityType: 'task', entityId: taskId })
  return subtask
})
