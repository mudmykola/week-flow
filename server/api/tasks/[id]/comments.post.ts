import { useDb } from '../../../db'
import { comments } from '../../../db/schema'
import { createCommentSchema } from '../../../utils/validators'
import { requireTaskAccess } from '../../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'id')!
  const { user } = await requireTaskAccess(event, taskId, { write: true })
  const body = await readValidatedBody(event, createCommentSchema.parse)
  const comment = { id: crypto.randomUUID(), taskId, authorId: user.id, body: body.body, createdAt: Date.now() }
  await useDb(event).insert(comments).values(comment)
  return comment
})
