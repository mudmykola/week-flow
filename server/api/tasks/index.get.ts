import { and, count, desc, eq, inArray, isNotNull, isNull, like, lt, ne, or, sql } from 'drizzle-orm'
import { useDb } from '../../db'
import { comments, subtasks, tasks } from '../../db/schema'
import { dateSchema, taskListQuerySchema, weekSchema } from '../../utils/validators'
import { requireAppUser } from '../../utils/auth'
import { taskIsolationCondition } from '../../utils/taskIsolation'
import { decodeTaskCursor, encodeTaskCursor } from '../../utils/taskPagination'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const query = getQuery(event)
  const week = query.week ? weekSchema.parse(query.week) : undefined
  const projectId = typeof query.project === 'string' ? query.project : undefined
  const scope = query.scope
  const date = scope === 'today' ? dateSchema.parse(query.date) : undefined
  const paginated = query.paginated === '1'
  const pageQuery = paginated ? taskListQuerySchema.parse(query) : null
  const cursor = decodeTaskCursor(pageQuery?.cursor)

  const conditions = [
    taskIsolationCondition(user),
    week ? eq(tasks.week, week) : undefined,
    projectId ? eq(tasks.projectId, projectId) : undefined,
    pageQuery?.search ? like(tasks.title, `%${pageQuery.search}%`) : undefined,
    pageQuery?.status ? eq(tasks.status, pageQuery.status) : undefined,
    pageQuery?.priority ? eq(tasks.priority, pageQuery.priority) : undefined,
    pageQuery?.assignee ? eq(tasks.assigneeId, pageQuery.assignee) : undefined,
    cursor
      ? or(lt(tasks.createdAt, cursor.createdAt), and(eq(tasks.createdAt, cursor.createdAt), lt(tasks.id, cursor.id)))
      : undefined,
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

  const rows = await db
    .select()
    .from(tasks)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...(paginated ? [desc(tasks.createdAt), desc(tasks.id)] : [tasks.sort]))
    .limit(paginated ? pageQuery!.limit + 1 : 10_000)
  const hasNextPage = paginated && rows.length > pageQuery!.limit
  const result = hasNextPage ? rows.slice(0, pageQuery!.limit) : rows
  if (!result.length) return paginated ? { items: [], nextCursor: null } : result
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
  const enriched = result.map((task) => ({
    ...task,
    subtaskCount: subtaskCounts.find((item) => item.taskId === task.id)?.total ?? 0,
    completedSubtaskCount: subtaskCounts.find((item) => item.taskId === task.id)?.completed ?? 0,
    commentCount: commentCounts.find((item) => item.taskId === task.id)?.total ?? 0
  }))
  if (!paginated) return enriched
  const last = result.at(-1)
  return { items: enriched, nextCursor: hasNextPage && last ? encodeTaskCursor(last) : null }
})
