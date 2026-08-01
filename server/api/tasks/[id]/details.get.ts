import { asc, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { comments, subtasks, users } from '../../../db/schema'
import { requireTaskAccess } from '../../../utils/taskAccess'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { task } = await requireTaskAccess(event, id)
  const db = useDb(event)
  const [taskSubtasks, taskComments] = await Promise.all([
    db.select().from(subtasks).where(eq(subtasks.taskId, id)).orderBy(asc(subtasks.sort)),
    db
      .select({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        authorName: users.name,
        authorAvatar: users.avatarUrl
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.taskId, id))
      .orderBy(asc(comments.createdAt))
  ])
  return { task, subtasks: taskSubtasks, comments: taskComments }
})
