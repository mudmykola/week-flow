import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm'
import { buildDailyReview } from '../../../app/domain/services/dailyReview'
import { useDb } from '../../db'
import { activityLogs, focusSessions, projects, reviewProgressEntries, subtasks, tasks } from '../../db/schema'
import { dateSchema } from '../../utils/validators'
import { resolveReviewUser } from '../../utils/reviewAccess'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const date = dateSchema.parse(query.date)
  const dayStart = Number(query.start)
  const dayEnd = Number(query.end)
  if (
    !Number.isSafeInteger(dayStart) ||
    !Number.isSafeInteger(dayEnd) ||
    dayEnd <= dayStart ||
    dayEnd - dayStart > 90_000_000
  )
    throw createError({ statusCode: 400, statusMessage: 'Invalid local day range' })
  const { target } = await resolveReviewUser(event, typeof query.user === 'string' ? query.user : undefined)
  const db = useDb(event)
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      note: tasks.note,
      status: tasks.status,
      projectId: tasks.projectId,
      week: tasks.week,
      sort: tasks.sort,
      createdAt: tasks.createdAt,
      doneAt: tasks.doneAt,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      plannedDate: tasks.plannedDate,
      plannedTime: tasks.plannedTime,
      estimateMinutes: tasks.estimateMinutes,
      dayRank: tasks.dayRank,
      weekRank: tasks.weekRank,
      blockedByTaskId: tasks.blockedByTaskId,
      tags: tasks.tags,
      recurrence: tasks.recurrence,
      archivedAt: tasks.archivedAt,
      assigneeId: tasks.assigneeId,
      stageId: tasks.stageId,
      ownerId: tasks.ownerId,
      workState: tasks.workState,
      waitingFor: tasks.waitingFor,
      waitingUntil: tasks.waitingUntil,
      reviewerId: tasks.reviewerId,
      reviewNote: tasks.reviewNote,
      reviewRequestedAt: tasks.reviewRequestedAt,
      approvedAt: tasks.approvedAt,
      actualMinutes: tasks.actualMinutes,
      carryoverReason: tasks.carryoverReason,
      rescheduleCount: tasks.rescheduleCount,
      originalPlannedDate: tasks.originalPlannedDate,
      readyCriteria: tasks.readyCriteria,
      doneCriteria: tasks.doneCriteria,
      reminderAt: tasks.reminderAt,
      projectName: projects.name,
      projectColor: projects.color
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(isNull(tasks.archivedAt), or(eq(tasks.ownerId, target.id), eq(tasks.assigneeId, target.id))))

  const taskIds = rows.map((item) => item.id)
  const historyStart = new Date(`${date}T12:00:00`)
  historyStart.setDate(historyStart.getDate() - 30)
  const historyStartDate = historyStart.toISOString().slice(0, 10)
  const [activity, progressHistory, completedSubtasks, focus, progressEntries, taskSubtasks] = await Promise.all([
    taskIds.length
      ? db
          .select({
            id: activityLogs.id,
            entityId: activityLogs.entityId,
            action: activityLogs.action,
            metadata: activityLogs.metadata,
            createdAt: activityLogs.createdAt
          })
          .from(activityLogs)
          .where(
            and(
              eq(activityLogs.ownerId, target.id),
              eq(activityLogs.entityType, 'task'),
              inArray(activityLogs.entityId, taskIds),
              gte(activityLogs.createdAt, dayStart),
              lte(activityLogs.createdAt, dayEnd)
            )
          )
      : [],
    taskIds.length
      ? db
          .select({
            id: reviewProgressEntries.id,
            ownerId: reviewProgressEntries.ownerId,
            taskId: reviewProgressEntries.taskId,
            subtaskId: reviewProgressEntries.subtaskId,
            subtaskTitle: subtasks.title,
            workDate: reviewProgressEntries.workDate,
            kind: reviewProgressEntries.kind,
            note: reviewProgressEntries.note,
            minutes: reviewProgressEntries.minutes,
            nextStep: reviewProgressEntries.nextStep,
            createdAt: reviewProgressEntries.createdAt,
            updatedAt: reviewProgressEntries.updatedAt
          })
          .from(reviewProgressEntries)
          .leftJoin(subtasks, eq(subtasks.id, reviewProgressEntries.subtaskId))
          .where(
            and(
              eq(reviewProgressEntries.ownerId, target.id),
              gte(reviewProgressEntries.workDate, historyStartDate),
              lte(reviewProgressEntries.workDate, date),
              inArray(reviewProgressEntries.taskId, taskIds)
            )
          )
      : [],
    taskIds.length
      ? db
          .select({ id: subtasks.id, taskId: subtasks.taskId, title: subtasks.title, doneAt: subtasks.doneAt })
          .from(subtasks)
          .where(and(inArray(subtasks.taskId, taskIds), gte(subtasks.doneAt, dayStart), lte(subtasks.doneAt, dayEnd)))
      : [],
    db
      .select({ taskId: focusSessions.taskId, elapsedSeconds: focusSessions.elapsedSeconds })
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.ownerId, target.id),
          eq(focusSessions.kind, 'focus'),
          eq(focusSessions.status, 'completed'),
          gte(focusSessions.startedAt, dayStart),
          lte(focusSessions.startedAt, dayEnd)
        )
      ),
    taskIds.length
      ? db
          .select({
            id: reviewProgressEntries.id,
            ownerId: reviewProgressEntries.ownerId,
            taskId: reviewProgressEntries.taskId,
            subtaskId: reviewProgressEntries.subtaskId,
            subtaskTitle: subtasks.title,
            workDate: reviewProgressEntries.workDate,
            kind: reviewProgressEntries.kind,
            note: reviewProgressEntries.note,
            minutes: reviewProgressEntries.minutes,
            nextStep: reviewProgressEntries.nextStep,
            createdAt: reviewProgressEntries.createdAt,
            updatedAt: reviewProgressEntries.updatedAt
          })
          .from(reviewProgressEntries)
          .leftJoin(subtasks, eq(subtasks.id, reviewProgressEntries.subtaskId))
          .where(
            and(
              eq(reviewProgressEntries.ownerId, target.id),
              eq(reviewProgressEntries.workDate, date),
              inArray(reviewProgressEntries.taskId, taskIds)
            )
          )
      : [],
    taskIds.length
      ? db
          .select({
            id: subtasks.id,
            taskId: subtasks.taskId,
            title: subtasks.title,
            status: subtasks.status,
            plannedDate: subtasks.plannedDate,
            rescheduleCount: subtasks.rescheduleCount
          })
          .from(subtasks)
          .where(inArray(subtasks.taskId, taskIds))
      : []
  ])
  return buildDailyReview({
    date,
    user: target,
    tasks: rows,
    workedTaskIds: [
      ...new Set([
        ...activity.map((item) => item.entityId),
        ...progressEntries.map((item) => item.taskId),
        ...completedSubtasks.map((item) => item.taskId),
        ...focus.map((item) => item.taskId).filter((item): item is string => Boolean(item))
      ])
    ],
    activityEvents: activity.map((item) => ({
      id: item.id,
      taskId: item.entityId,
      action: item.action,
      metadata: item.metadata,
      createdAt: item.createdAt
    })),
    completedSubtasks: completedSubtasks
      .filter((item) => item.doneAt !== null)
      .map((item) => ({ ...item, doneAt: item.doneAt! })),
    focusMinutes: Math.round(focus.reduce((sum, item) => sum + item.elapsedSeconds, 0) / 60),
    focusByTask: focus
      .filter((item): item is typeof item & { taskId: string } => Boolean(item.taskId))
      .map((item) => ({ taskId: item.taskId, minutes: Math.round(item.elapsedSeconds / 60) })),
    progressEntries,
    progressHistory,
    taskSubtasks,
    dayStart,
    dayEnd
  })
})
