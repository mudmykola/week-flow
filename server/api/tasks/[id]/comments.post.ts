import { useDb } from '../../../db'
import { comments } from '../../../db/schema'
import { createCommentSchema } from '../../../utils/validators'
import { requireTaskAccess } from '../../../utils/taskAccess'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'id')!
  const { user, task } = await requireTaskAccess(event, taskId, { write: true })
  const body = await readValidatedBody(event, createCommentSchema.parse)
  const comment = { id: crypto.randomUUID(), taskId, authorId: user.id, body: body.body, createdAt: Date.now() }
  await useDb(event).insert(comments).values(comment)
  await logActivity(event, {
    ownerId: task.ownerId!,
    actorId: user.id,
    action: 'comment.created',
    entityType: 'task',
    entityId: taskId
  })
  return comment
})
