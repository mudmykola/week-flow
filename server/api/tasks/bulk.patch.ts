import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { tasks } from '../../db/schema'
import { bulkTaskSchema } from '../../utils/validators'
import { requireTaskAccess } from '../../utils/taskAccess'
import { requireAssignableUser } from '../../utils/assigneeAccess'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const body = await readValidatedBody(event, bulkTaskSchema.parse)
  if (body.patch.blockedByTaskId) {
    if (body.ids.includes(body.patch.blockedByTaskId)) {
      throw createError({ statusCode: 400, statusMessage: 'Task cannot block itself' })
    }
    await requireTaskAccess(event, body.patch.blockedByTaskId)
  }
  await requireAssignableUser(event, body.patch.assigneeId)
  const updated = []
  for (const id of body.ids) {
    await requireTaskAccess(event, id, { write: true })
    await db
      .update(tasks)
      .set({
        ...body.patch,
        ...(body.patch.status ? { doneAt: body.patch.status === 'done' ? Date.now() : null } : {})
      })
      .where(eq(tasks.id, id))
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id))
    if (task) updated.push(task)
  }
  return updated
})
