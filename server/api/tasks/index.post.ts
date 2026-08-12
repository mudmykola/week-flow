import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { projectMembers, projects, tasks } from '../../db/schema'
import { createTaskSchema } from '../../utils/validators'
import { isAdmin, requireAppUser } from '../../utils/auth'
import { logActivity } from '../../utils/activity'
import { runTaskAutomations } from '../../utils/automations'
import { requireAssignableUser } from '../../utils/assigneeAccess'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, createTaskSchema.parse)
  await requireAssignableUser(event, body.assigneeId)
  await requireAssignableUser(event, body.reviewerId)

  if (body.projectId) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        isAdmin(user)
          ? eq(projects.id, body.projectId)
          : and(eq(projects.id, body.projectId), eq(projects.ownerId, user.id))
      )
    if (!project) {
      const [member] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, body.projectId), eq(projectMembers.userId, user.id)))
      if (!member || member.role === 'viewer') throw createError({ statusCode: 400, statusMessage: 'Invalid project' })
    }
  }

  const task = {
    id: crypto.randomUUID(),
    title: body.title,
    note: body.note ?? null,
    status: body.status,
    projectId: body.projectId ?? null,
    week: body.week,
    sort: body.sort,
    createdAt: Date.now(),
    doneAt: body.status === 'done' ? Date.now() : null,
    ownerId: user.id,
    assigneeId: body.assigneeId ?? user.id,
    stageId: body.stageId ?? null,
    priority: body.priority,
    dueDate: body.dueDate ?? null,
    plannedDate: body.plannedDate ?? null,
    plannedTime: body.plannedTime ?? null,
    estimateMinutes: body.estimateMinutes ?? null,
    dayRank: body.dayRank ?? null,
    weekRank: body.weekRank ?? null,
    blockedByTaskId: body.blockedByTaskId ?? null,
    tags: body.tags,
    recurrence: body.recurrence ?? null,
    archivedAt: null,
    workState: body.workState,
    waitingFor: body.waitingFor ?? null,
    waitingUntil: body.waitingUntil ?? null,
    reviewerId: body.reviewerId ?? null,
    reviewNote: body.reviewNote ?? null,
    reviewRequestedAt: body.workState === 'review' ? Date.now() : null,
    approvedAt: null,
    actualMinutes: body.actualMinutes ?? null,
    carryoverReason: body.carryoverReason ?? null,
    rescheduleCount: 0,
    originalPlannedDate: body.plannedDate ?? null,
    readyCriteria: body.readyCriteria,
    doneCriteria: body.doneCriteria,
    reminderAt: body.reminderAt ?? null
  }

  await db.insert(tasks).values(task)
  await logActivity(event, {
    ownerId: task.assigneeId,
    actorId: user.id,
    action: 'task.created',
    entityType: 'task',
    entityId: task.id
  })
  return runTaskAutomations(event, task, 'task_created')
})
