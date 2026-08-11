import { and, count, eq, gte, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm'
import { useDb } from '../../db'
import { comments, focusSessions, projectMembers, subtasks, tasks } from '../../db/schema'
import { isAdmin, requireAppUser } from '../../utils/auth'
import { dateSchema } from '../../utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const query = getQuery(event)
  const date = dateSchema.parse(query.date)
  const dayStart = Number(query.start)
  const dayEnd = Number(query.end)
  if (
    !Number.isSafeInteger(dayStart) ||
    !Number.isSafeInteger(dayEnd) ||
    dayEnd <= dayStart ||
    dayEnd - dayStart > 90_000_000
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid local day range' })
  }
  const db = useDb(event)
  const memberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, user.id))
  const sharedProjectIds = memberships.map((item) => item.projectId)
  const access = isAdmin(user)
    ? undefined
    : sharedProjectIds.length
      ? or(eq(tasks.ownerId, user.id), eq(tasks.assigneeId, user.id), inArray(tasks.projectId, sharedProjectIds))
      : or(eq(tasks.ownerId, user.id), eq(tasks.assigneeId, user.id))
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        access,
        isNull(tasks.archivedAt),
        or(eq(tasks.plannedDate, date), and(lte(tasks.dueDate, date), ne(tasks.status, 'done')))
      )
    )
    .orderBy(tasks.dayRank, tasks.plannedTime, tasks.sort)
  const ids = rows.map((item) => item.id)
  const [subtaskCounts, commentCounts, focus] = await Promise.all([
    ids.length
      ? db
          .select({
            taskId: subtasks.taskId,
            total: count(),
            completed: sql<number>`sum(case when ${subtasks.done} = 1 then 1 else 0 end)`
          })
          .from(subtasks)
          .where(inArray(subtasks.taskId, ids))
          .groupBy(subtasks.taskId)
      : [],
    ids.length
      ? db
          .select({ taskId: comments.taskId, total: count() })
          .from(comments)
          .where(inArray(comments.taskId, ids))
          .groupBy(comments.taskId)
      : [],
    db
      .select({
        elapsedSeconds: focusSessions.elapsedSeconds,
        plannedSeconds: focusSessions.plannedSeconds,
        status: focusSessions.status
      })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.ownerId, user.id),
          eq(focusSessions.kind, 'focus'),
          gte(focusSessions.startedAt, dayStart),
          lte(focusSessions.startedAt, dayEnd)
        )
      )
  ])
  return {
    date,
    tasks: rows.map((task) => ({
      ...task,
      subtaskCount: subtaskCounts.find((item) => item.taskId === task.id)?.total ?? 0,
      completedSubtaskCount: subtaskCounts.find((item) => item.taskId === task.id)?.completed ?? 0,
      commentCount: commentCounts.find((item) => item.taskId === task.id)?.total ?? 0
    })),
    focusMinutes: Math.round(
      focus.reduce((total, item) => total + (item.status === 'active' ? item.plannedSeconds : item.elapsedSeconds), 0) /
        60
    )
  }
})
