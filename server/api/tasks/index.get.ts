import { and, count, eq, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm'
import { useDb } from '../../db'
import { comments, projectMembers, subtasks, tasks } from '../../db/schema'
import { dateSchema, weekSchema } from '../../utils/validators'
import { isAdmin, requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const memberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, user.id))
  const sharedProjectIds = memberships.map((item) => item.projectId)
  const query = getQuery(event)
  const week = query.week ? weekSchema.parse(query.week) : undefined
  const projectId = typeof query.project === 'string' ? query.project : undefined
  const scope = query.scope
  const date = scope === 'today' ? dateSchema.parse(query.date) : undefined

  const conditions = [
    isAdmin(user)
      ? undefined
      : sharedProjectIds.length
        ? or(eq(tasks.ownerId, user.id), eq(tasks.assigneeId, user.id), inArray(tasks.projectId, sharedProjectIds))
        : or(eq(tasks.ownerId, user.id), eq(tasks.assigneeId, user.id)),
    week ? eq(tasks.week, week) : undefined,
    projectId ? eq(tasks.projectId, projectId) : undefined,
    scope === 'inbox'
      ? and(isNull(tasks.projectId), isNull(tasks.dueDate), ne(tasks.status, 'done'), isNull(tasks.archivedAt))
      : scope === 'today'
        ? and(eq(tasks.plannedDate, date!), ne(tasks.status, 'done'), isNull(tasks.archivedAt))
        : scope === 'due'
          ? and(isNotNull(tasks.dueDate), isNull(tasks.archivedAt))
          : scope === 'archived'
            ? isNotNull(tasks.archivedAt)
            : undefined
  ].filter((c) => c !== undefined)

  const result = await db
    .select()
    .from(tasks)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(tasks.sort)
  if (!result.length) return result
  const ids = result.map((task) => task.id)
  const [subtaskCounts, commentCounts] = await Promise.all([
    db
      .select({
        taskId: subtasks.taskId,
        total: count(),
        completed: sql<number>`sum(case when ${subtasks.done} = 1 then 1 else 0 end)`
      })
      .from(subtasks)
      .where(inArray(subtasks.taskId, ids))
      .groupBy(subtasks.taskId),
    db
      .select({ taskId: comments.taskId, total: count() })
      .from(comments)
      .where(inArray(comments.taskId, ids))
      .groupBy(comments.taskId)
  ])
  return result.map((task) => ({
    ...task,
    subtaskCount: subtaskCounts.find((item) => item.taskId === task.id)?.total ?? 0,
    completedSubtaskCount: subtaskCounts.find((item) => item.taskId === task.id)?.completed ?? 0,
    commentCount: commentCounts.find((item) => item.taskId === task.id)?.total ?? 0
  }))
})
