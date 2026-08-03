import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { subtasks, tasks } from '../../../db/schema'
import { requireTaskAccess } from '../../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDb(event)
  const [subtask] = await db.select().from(subtasks).where(eq(subtasks.id, id))
  if (!subtask) throw createError({ statusCode: 404, statusMessage: 'Subtask not found' })
  const { task: parent } = await requireTaskAccess(event, subtask.taskId, { write: true })
  const task = {
    id: crypto.randomUUID(),
    title: subtask.title,
    note: subtask.note,
    status: subtask.status,
    projectId: parent.projectId,
    week: parent.week,
    sort: parent.sort + 1,
    createdAt: Date.now(),
    doneAt: subtask.status === 'done' ? Date.now() : null,
    ownerId: parent.ownerId,
    assigneeId: subtask.assigneeId,
    stageId: null,
    priority: subtask.priority,
    dueDate: subtask.dueDate,
    tags: parent.tags,
    recurrence: null,
    archivedAt: null
  }
  await db.insert(tasks).values(task)
  await db.delete(subtasks).where(eq(subtasks.id, id))
  return task
})
